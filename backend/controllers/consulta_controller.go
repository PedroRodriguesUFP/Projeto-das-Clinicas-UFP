package controllers

import (
	"errors"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"clinica-backend/config"
	"clinica-backend/models"
	"clinica-backend/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// consultaMu protege o bloco verificar-disponibilidade + criar/remarcar consulta
// contra race conditions entre pedidos concorrentes.
var consultaMu sync.Mutex

type CreateConsultaRequest struct {
	UtenteID          uint   `json:"utente_id"`
	TerapeutaID       uint   `json:"terapeuta_id"`
	SalaID            uint   `json:"sala_id"`
	AreaClinicaID     uint   `json:"area_clinica_id"`
	DataInicio        string `json:"data_inicio"`
	DataFim           string `json:"data_fim"`
	TipoConsulta      string `json:"tipo_consulta"`
	AtribuirTerapeuta bool   `json:"atribuir_terapeuta"`
}

type RemarcarConsultaRequest struct {
	DataInicio string `json:"data_inicio"`
	DataFim    string `json:"data_fim"`
}

type UpdateConsultaRequest struct {
	TerapeutaID   *uint   `json:"terapeuta_id"`
	SalaID        *uint   `json:"sala_id"`
	AreaClinicaID *uint   `json:"area_clinica_id"`
	DataInicio    *string `json:"data_inicio"`
	DataFim       *string `json:"data_fim"`
	TipoConsulta  *string `json:"tipo_consulta"`
}

type ConsultaDetailResponse struct {
	ID              uint   `json:"id"`
	UtenteID        uint   `json:"utente_id"`
	TerapeutaID     uint   `json:"terapeuta_id"`
	SalaID          *uint  `json:"sala_id"`
	AreaClinicaID   uint   `json:"area_clinica_id"`
	DataInicio      string `json:"data_inicio"`
	DataFim         string `json:"data_fim"`
	Estado          string `json:"estado"`
	TipoConsulta    string `json:"tipo_consulta"`
	CreatedBy       uint   `json:"created_by"`
	UtenteNome      string `json:"utente_nome"`
	TerapeutaNome   string `json:"terapeuta_nome"`
	SalaNome        string `json:"sala_nome"`
	AreaClinicaNome string `json:"area_clinica_nome"`
}

func parseDateTime(value string) (time.Time, error) {
	layouts := []string{"2006-01-02 15:04:05", "2006-01-02 15:04"}

	for _, layout := range layouts {
		parsed, err := time.ParseInLocation(layout, value, time.Local)
		if err == nil {
			// Discard timezone: preserve wall-clock hour as UTC so pgx stores the
			// literal value ("16:00") regardless of DST offset. DST-safe.
			return time.Date(parsed.Year(), parsed.Month(), parsed.Day(),
				parsed.Hour(), parsed.Minute(), parsed.Second(), 0, time.UTC), nil
		}
	}

	return time.Time{}, errors.New("formato de data inválido")
}

func parseHourMinuteOnDate(baseDate time.Time, hhmm string) (time.Time, error) {
	parsed, err := time.Parse("15:04", hhmm)
	if err != nil {
		return time.Time{}, err
	}

	return time.Date(
		baseDate.Year(),
		baseDate.Month(),
		baseDate.Day(),
		parsed.Hour(),
		parsed.Minute(),
		0,
		0,
		time.UTC,
	), nil
}

func getRandomAvailableSalaID(areaClinicaID uint, dataInicio time.Time, dataFim time.Time) (uint, error) {
	var salas []models.Sala

	err := config.DB.
		Table("salas").
		Joins("JOIN sala_area_clinica sac ON sac.sala_id = salas.id").
		Where("salas.ativa = ?", true).
		Where("sac.area_clinica_id = ?", areaClinicaID).
		Where("NOT EXISTS (SELECT 1 FROM consultas c WHERE c.sala_id = salas.id AND c.estado = 'agendada' AND c.data_inicio < ? AND c.data_fim > ?)", dataFim, dataInicio).
		Find(&salas).Error

	if err != nil {
		return 0, err
	}

	if len(salas) == 0 {
		return 0, errors.New("não existem salas disponíveis para este horário")
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	selected := salas[rng.Intn(len(salas))]

	return selected.ID, nil
}

func GetConsultas(c *gin.Context) {
	var consultas []models.Consulta

	userID, err := getAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	roleValue, exists := c.Get("userRole")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role não encontrada no contexto"})
		return
	}

	userRole, ok := roleValue.(string)
	if !ok || userRole == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role inválida no contexto"})
		return
	}

	query := config.DB.
		Preload("Utente").
		Preload("Terapeuta").
		Preload("Sala").
		Preload("AreaClinica").
		Preload("Documentos")

	switch userRole {
	case "terapeuta":
		var terapeuta models.Terapeuta
		if err := config.DB.Where("user_id = ?", userID).First(&terapeuta).Error; err == nil && terapeuta.Tipo == "aluno" {
			if terapeuta.SupervisorID != nil {
				// Aluno com supervisor: vê as suas + as do supervisor
				query = query.Where("terapeuta_id = ? OR terapeuta_id = ?", userID, *terapeuta.SupervisorID)
			} else {
				// Aluno sem supervisor: sem acesso a nenhuma consulta
				query = query.Where("1 = 0")
			}
		} else {
			// Professor ou terapeuta sem registo: vê só as suas
			query = query.Where("terapeuta_id = ?", userID)
		}
	case "utente":
		query = query.Where("utente_id = ?", userID)
	}

	err = query.Find(&consultas).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Converter para DTO
	var result []models.ConsultaDTO
	for _, consulta := range consultas {
		result = append(result, *consulta.ConvertToDTO())
	}

	c.JSON(http.StatusOK, result)
}

func GetConsultaByID(c *gin.Context) {
	id := c.Param("id")

	var consulta models.Consulta

	userID, err := getAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	roleValue, exists := c.Get("userRole")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role não encontrada no contexto"})
		return
	}

	userRole, ok := roleValue.(string)
	if !ok || userRole == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role inválida no contexto"})
		return
	}

	err = config.DB.
		Preload("Utente").
		Preload("Terapeuta").
		Preload("Sala").
		Preload("AreaClinica").
		Preload("Documentos").
		First(&consulta, id).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Consulta não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if userRole == "terapeuta" && !alunoIsLinkedToConsulta(userID, &consulta) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para aceder a esta consulta"})
		return
	}

	if userRole == "utente" && consulta.UtenteID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para aceder a esta consulta"})
		return
	}

	if userRole == "terapeuta" && isAlunoOutsideWindow(userID, &consulta) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acesso só disponível 2h antes e 2h após a consulta"})
		return
	}

	c.JSON(http.StatusOK, ConsultaDetailResponse{
		ID:              consulta.ID,
		UtenteID:        consulta.UtenteID,
		TerapeutaID:     consulta.TerapeutaID,
		SalaID:          consulta.SalaID,
		AreaClinicaID:   consulta.AreaClinicaID,
		DataInicio:      consulta.DataInicio.Format("2006-01-02T15:04:05"),
		DataFim:         consulta.DataFim.Format("2006-01-02T15:04:05"),
		Estado:          consulta.Estado,
		TipoConsulta:    consulta.TipoConsulta,
		CreatedBy:       consulta.CreatedBy,
		UtenteNome:      consulta.Utente.Nome,
		TerapeutaNome:   consulta.Terapeuta.Nome,
		SalaNome:        consulta.Sala.Nome,
		AreaClinicaNome: consulta.AreaClinica.Nome,
	})
}

type DisponibilidadeResponse struct {
	SalasIndisponiveis      []uint `json:"salas_indisponiveis"`
	TerapeutasIndisponiveis []uint `json:"terapeutas_indisponiveis"`
}

func CheckDisponibilidade(c *gin.Context) {
	dataInicio := c.Query("data_inicio")
	dataFim := c.Query("data_fim")

	if dataInicio == "" || dataFim == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "data_inicio e data_fim são obrigatórios"})
		return
	}

	// Parse das datas
	inicio, err := parseDateTime(dataInicio)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "data_inicio inválida"})
		return
	}

	fim, err := parseDateTime(dataFim)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "data_fim inválida"})
		return
	}

	// Buscar consultas que sobrepõem o horário (não canceladas)
	var consultas []models.Consulta
	config.DB.Where(
		"(data_inicio < ? AND data_fim > ?) AND estado != ?",
		fim, inicio, "cancelada",
	).Find(&consultas)

	// Extrair apenas IDs de salas indisponíveis (terapeutas podem ter múltiplas consultas simultâneas)
	salasMap := make(map[uint]bool)

	for _, consulta := range consultas {
		if consulta.SalaID != nil {
			salasMap[*consulta.SalaID] = true
		}
	}

	var salasIndisponiveis []uint
	for salaID := range salasMap {
		salasIndisponiveis = append(salasIndisponiveis, salaID)
	}

	c.JSON(http.StatusOK, DisponibilidadeResponse{
		SalasIndisponiveis:      salasIndisponiveis,
		TerapeutasIndisponiveis: []uint{},
	})
}

func CreateConsulta(c *gin.Context) {
	var req CreateConsultaRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos: " + err.Error()})
		return
	}

	createdBy, err := getAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	roleValue, exists := c.Get("userRole")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role não encontrada no contexto"})
		return
	}

	userRole, ok := roleValue.(string)
	if !ok || userRole == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role inválida no contexto"})
		return
	}

	// Utentes só podem criar consultas para si próprios.
	if userRole == "utente" {
		req.UtenteID = createdBy
	}

	if req.UtenteID == 0 || req.TerapeutaID == 0 || req.AreaClinicaID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados obrigatórios em falta"})
		return
	}

	dataInicio, err := parseDateTime(req.DataInicio)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data de início inválida. Use YYYY-MM-DD HH:MM[:SS]"})
		return
	}

	dataFim, err := parseDateTime(req.DataFim)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data de fim inválida. Use YYYY-MM-DD HH:MM[:SS]"})
		return
	}

	if !dataFim.After(dataInicio) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "A data de fim deve ser posterior à data de início"})
		return
	}

	if !dataInicio.After(time.Now()) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Não é possível marcar consultas no passado"})
		return
	}

	consultaMu.Lock()
	defer consultaMu.Unlock()

	if userRole == "utente" {
		randomSalaID, err := getRandomAvailableSalaID(req.AreaClinicaID, dataInicio, dataFim)
		if err == nil {
			req.SalaID = randomSalaID
		}
	}

	tipoConsulta := "individual"
	if req.TipoConsulta == "grupo" {
		tipoConsulta = "grupo"
	}

	estadoValidacao := "aprovada"
	if userRole == "utente" {
		estadoValidacao = "pendente"
	}

	var salaPtr *uint
	if req.SalaID != 0 {
		salaPtr = &req.SalaID
	}

	consulta := models.Consulta{
		UtenteID:        req.UtenteID,
		TerapeutaID:     req.TerapeutaID,
		SalaID:          salaPtr,
		AreaClinicaID:   req.AreaClinicaID,
		DataInicio:      dataInicio,
		DataFim:         dataFim,
		Estado:          "agendada",
		TipoConsulta:    tipoConsulta,
		EstadoValidacao: estadoValidacao,
		CreatedBy:       createdBy,
	}

	err = config.DB.Create(&consulta).Error
	if err != nil {
		msg := strings.ToLower(err.Error())

		if strings.Contains(msg, "no_overlap") {
			c.JSON(http.StatusConflict, gin.H{"error": "Horário já ocupado"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ligarTerapeutaResponsavel(req.UtenteID, req.TerapeutaID)

	if req.AtribuirTerapeuta {
		config.DB.Exec(`
			INSERT INTO utente_terapeutas (utente_id, terapeuta_id, area_clinica_id)
			VALUES (?, ?, ?)
			ON CONFLICT (utente_id, area_clinica_id) DO NOTHING
		`, req.UtenteID, req.TerapeutaID, req.AreaClinicaID)
	}

	c.JSON(http.StatusCreated, consulta)
}

// ligarTerapeutaResponsavel define o terapeuta responsável no processo clínico
// na primeira consulta. Se o terapeuta for aluno, liga ao supervisor.
func ligarTerapeutaResponsavel(utenteID, terapeutaID uint) {
	var processo models.ProcessoClinico
	if err := config.DB.Where("utente_id = ?", utenteID).First(&processo).Error; err != nil {
		return
	}

	if processo.TerapeutaResponsavelID != nil {
		return
	}

	responsavelID := terapeutaID
	var terapeuta models.Terapeuta
	if err := config.DB.Where("user_id = ?", terapeutaID).First(&terapeuta).Error; err == nil {
		if terapeuta.Tipo == "aluno" && terapeuta.SupervisorID != nil {
			responsavelID = *terapeuta.SupervisorID
		}
	}

	config.DB.Model(&processo).Update("terapeuta_responsavel_id", responsavelID)
}

func CancelConsulta(c *gin.Context) {
	id := c.Param("id")

	userID, _ := getAuthenticatedUserID(c)
	roleValue, _ := c.Get("userRole")
	userRole, _ := roleValue.(string)

	var consulta models.Consulta
	err := config.DB.First(&consulta, id).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Consulta não encontrada"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if consulta.Estado == "cancelada" {
		c.JSON(http.StatusConflict, gin.H{"error": "Consulta já está cancelada"})
		return
	}

	if userRole == "terapeuta" && consulta.TerapeutaID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Só pode cancelar as suas próprias consultas"})
		return
	}

	if isAlunoOutsideWindow(userID, &consulta) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acesso só disponível 2h antes e 2h após a consulta"})
		return
	}

	consulta.Estado = "cancelada"

	if err := config.DB.Save(&consulta).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Consulta cancelada com sucesso"})
}

// ConsultaPendenteDTO representa uma marcação de utente à espera de validação
// pela rececão, incluindo um indicador de possíveis conflitos de agenda do terapeuta.
type ConsultaPendenteDTO struct {
	ID                 uint      `json:"id"`
	Utente             string    `json:"utente"`
	Terapeuta          string    `json:"terapeuta"`
	AreaClinica        string    `json:"area_clinica"`
	DataInicio         time.Time `json:"data_inicio"`
	DataFim            time.Time `json:"data_fim"`
	ConflitosTerapeuta int       `json:"conflitos_terapeuta"`
}

// GetConsultasPendentes devolve as marcações feitas por utentes que aguardam
// validação da rececão (admin/administrativo), com indicação de conflitos de
// horário do terapeuta para ajudar na decisão.
func GetConsultasPendentes(c *gin.Context) {
	var consultas []models.Consulta
	if err := config.DB.
		Preload("Utente").
		Preload("Terapeuta").
		Preload("AreaClinica").
		Where("estado_validacao = ?", "pendente").
		Order("data_inicio ASC").
		Find(&consultas).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := []ConsultaPendenteDTO{}
	for _, consulta := range consultas {
		var conflitos int64
		config.DB.Model(&models.Consulta{}).
			Where("terapeuta_id = ? AND id != ? AND estado != ? AND data_inicio < ? AND data_fim > ?",
				consulta.TerapeutaID, consulta.ID, "cancelada", consulta.DataFim, consulta.DataInicio,
			).Count(&conflitos)

		result = append(result, ConsultaPendenteDTO{
			ID:                 consulta.ID,
			Utente:             consulta.Utente.Nome,
			Terapeuta:          consulta.Terapeuta.Nome,
			AreaClinica:        consulta.AreaClinica.Nome,
			DataInicio:         consulta.DataInicio,
			DataFim:            consulta.DataFim,
			ConflitosTerapeuta: int(conflitos),
		})
	}

	c.JSON(http.StatusOK, result)
}

// ValidarConsulta permite à rececão (admin/administrativo) aprovar ou rejeitar
// uma marcação de utente que ficou pendente de validação.
func ValidarConsulta(c *gin.Context) {
	id := c.Param("id")

	var body struct {
		Acao string `json:"acao"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || (body.Acao != "aprovar" && body.Acao != "rejeitar") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "acao deve ser 'aprovar' ou 'rejeitar'"})
		return
	}

	var consulta models.Consulta
	if err := config.DB.Where("id = ? AND estado_validacao = ?", id, "pendente").First(&consulta).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Consulta pendente não encontrada"})
		return
	}

	if body.Acao == "aprovar" {
		consulta.EstadoValidacao = "aprovada"
		if err := config.DB.Save(&consulta).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao aprovar consulta"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Consulta aprovada"})
		return
	}

	consulta.Estado = "cancelada"
	consulta.EstadoValidacao = "rejeitada"
	if err := config.DB.Save(&consulta).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao rejeitar consulta"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Consulta rejeitada"})
}

func RemarcarConsulta(c *gin.Context) {
	id := c.Param("id")
	var req RemarcarConsultaRequest
	var consulta models.Consulta

	userID, _ := getAuthenticatedUserID(c)
	roleValue, _ := c.Get("userRole")
	userRole, _ := roleValue.(string)

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	if err := config.DB.First(&consulta, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Consulta não encontrada"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if userRole == "terapeuta" && consulta.TerapeutaID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Só pode remarcar as suas próprias consultas"})
		return
	}

	if isAlunoOutsideWindow(userID, &consulta) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acesso só disponível 2h antes e 2h após a consulta"})
		return
	}

	dataInicio, err := parseDateTime(req.DataInicio)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data de início inválida. Use YYYY-MM-DD HH:MM[:SS]"})
		return
	}

	dataFim, err := parseDateTime(req.DataFim)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data de fim inválida. Use YYYY-MM-DD HH:MM[:SS]"})
		return
	}

	if !dataFim.After(dataInicio) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "A data de fim deve ser posterior à data de início"})
		return
	}

	if !dataInicio.After(time.Now()) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Não é possível remarcar consultas para o passado"})
		return
	}

	consulta.DataInicio = dataInicio
	consulta.DataFim = dataFim
	consulta.Estado = "agendada"

	consultaMu.Lock()
	defer consultaMu.Unlock()

	if err := config.DB.Save(&consulta).Error; err != nil {
		msg := strings.ToLower(err.Error())

		if strings.Contains(msg, "no_overlap") {
			c.JSON(http.StatusConflict, gin.H{"error": "Horário já ocupado"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Consulta remarcada com sucesso", "consulta": consulta})
}

func UpdateConsulta(c *gin.Context) {
	id := c.Param("id")
	var req UpdateConsultaRequest
	var consulta models.Consulta

	userID, err := getAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	roleValue, exists := c.Get("userRole")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role não encontrada no contexto"})
		return
	}

	userRole, ok := roleValue.(string)
	if !ok || userRole == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role inválida no contexto"})
		return
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	if err := config.DB.First(&consulta, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Consulta não encontrada"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if consulta.Estado == "cancelada" {
		c.JSON(http.StatusConflict, gin.H{"error": "Não é possível atualizar uma consulta cancelada"})
		return
	}

	if isAlunoOutsideWindow(userID, &consulta) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acesso só disponível 2h antes e 2h após a consulta"})
		return
	}

	// Verificar permissões: admin/administrativo podem editar tudo, terapeuta só pode editar sala
	isTerapeuta := userRole == "terapeuta"
	isAdmin := userRole == "admin" || userRole == "administrativo"

	if !isAdmin && !isTerapeuta {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para atualizar consultas"})
		return
	}

	// Se é terapeuta, verificar que é o responsável ou aluno ligado
	if isTerapeuta && !alunoIsLinkedToConsulta(userID, &consulta) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Você só pode editar suas próprias consultas"})
		return
	}

	// Se é terapeuta, só permitir editar sala
	if isTerapeuta {
		if req.TerapeutaID != nil || req.AreaClinicaID != nil || req.DataInicio != nil || req.DataFim != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Terapeutas só podem alterar a sala da consulta"})
			return
		}
	}

	if req.TerapeutaID != nil {
		consulta.TerapeutaID = *req.TerapeutaID
	}
	if req.SalaID != nil {
		consulta.SalaID = req.SalaID
	}
	if req.AreaClinicaID != nil {
		consulta.AreaClinicaID = *req.AreaClinicaID
	}
	if req.TipoConsulta != nil && (*req.TipoConsulta == "individual" || *req.TipoConsulta == "grupo") {
		consulta.TipoConsulta = *req.TipoConsulta
	}

	if req.DataInicio != nil || req.DataFim != nil {
		dataInicio := consulta.DataInicio
		dataFim := consulta.DataFim

		if req.DataInicio != nil {
			parsed, err := parseDateTime(*req.DataInicio)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Data de início inválida. Use YYYY-MM-DD HH:MM[:SS]"})
				return
			}
			dataInicio = parsed
		}

		if req.DataFim != nil {
			parsed, err := parseDateTime(*req.DataFim)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Data de fim inválida. Use YYYY-MM-DD HH:MM[:SS]"})
				return
			}
			dataFim = parsed
		}

		if !dataFim.After(dataInicio) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "A data de fim deve ser posterior à data de início"})
			return
		}

		if !dataInicio.After(time.Now()) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Não é possível atualizar consultas para o passado"})
			return
		}

		consulta.DataInicio = dataInicio
		consulta.DataFim = dataFim
	}

	consultaMu.Lock()
	defer consultaMu.Unlock()

	if err := config.DB.Save(&consulta).Error; err != nil {
		msg := strings.ToLower(err.Error())

		if strings.Contains(msg, "no_overlap") {
			c.JSON(http.StatusConflict, gin.H{"error": "Horário já ocupado"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, consulta)
}

func GetHorariosDisponiveis(c *gin.Context) {
	terapeutaIDParam := c.Param("terapeuta_id")
	terapeutaID, err := strconv.Atoi(terapeutaIDParam)
	if err != nil || terapeutaID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Terapeuta inválido"})
		return
	}

	data := c.Query("data")
	if data == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data é obrigatória (YYYY-MM-DD)"})
		return
	}

	selectedDate, err := time.Parse("2006-01-02", data)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data inválida. Use YYYY-MM-DD"})
		return
	}

	duracao := 60
	if duracaoParam := c.Query("duracao"); duracaoParam != "" {
		parsedDuracao, convErr := strconv.Atoi(duracaoParam)
		if convErr != nil || parsedDuracao <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Duração inválida"})
			return
		}
		duracao = parsedDuracao
	}

	areaClinicaID := 0
	if areaParam := c.Query("area_clinica_id"); areaParam != "" {
		parsedArea, convErr := strconv.Atoi(areaParam)
		if convErr != nil || parsedArea <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Área clínica inválida"})
			return
		}
		areaClinicaID = parsedArea
	}

	salaID := 0
	if salaParam := c.Query("sala_id"); salaParam != "" {
		parsedSala, convErr := strconv.Atoi(salaParam)
		if convErr != nil || parsedSala <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Sala inválida"})
			return
		}
		salaID = parsedSala
	}

	workStart, _ := parseHourMinuteOnDate(selectedDate, "09:00")
	workEnd, _ := parseHourMinuteOnDate(selectedDate, "18:00")

	areaHasSalas := false
	if areaClinicaID > 0 {
		var totalSalas int64
		config.DB.Table("salas").
			Joins("JOIN sala_area_clinica sac ON sac.sala_id = salas.id").
			Where("salas.ativa = ?", true).
			Where("sac.area_clinica_id = ?", areaClinicaID).
			Count(&totalSalas)
		areaHasSalas = totalSalas > 0
	}

	hasAvailableSala := func(slotStart time.Time, slotEnd time.Time) (bool, error) {
		if salaID > 0 {
			var count int64
			err := config.DB.
				Table("consultas").
				Where("sala_id = ?", salaID).
				Where("estado = ?", "agendada").
				Where("data_inicio < ? AND data_fim > ?", slotEnd, slotStart).
				Count(&count).Error
			if err != nil {
				return false, err
			}
			return count == 0, nil
		}

		if areaClinicaID <= 0 || !areaHasSalas {
			return true, nil
		}

		var count int64
		err := config.DB.
			Table("salas").
			Joins("JOIN sala_area_clinica sac ON sac.sala_id = salas.id").
			Where("salas.ativa = ?", true).
			Where("sac.area_clinica_id = ?", areaClinicaID).
			Where("NOT EXISTS (SELECT 1 FROM consultas c WHERE c.sala_id = salas.id AND c.estado = 'agendada' AND c.data_inicio < ? AND c.data_fim > ?)", slotEnd, slotStart).
			Count(&count).Error
		if err != nil {
			return false, err
		}

		return count > 0, nil
	}

	var available []string
	for slotStart := workStart; slotStart.Before(workEnd); slotStart = slotStart.Add(1 * time.Hour) {
		slotEnd := slotStart.Add(time.Duration(duracao) * time.Minute)
		if slotEnd.After(workEnd) {
			continue
		}

		roomAvailable, roomErr := hasAvailableSala(slotStart, slotEnd)
		if roomErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": roomErr.Error()})
			return
		}
		if roomAvailable {
			available = append(available, slotStart.Format("15:04"))
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"terapeuta_id":         terapeutaID,
		"data":                 data,
		"duracao":              duracao,
		"horarios_disponiveis": available,
	})
}

type UpdateEstadoConsultaRequest struct {
	Estado string `json:"estado" binding:"required"`
}

func UpdateEstadoConsulta(c *gin.Context) {
	consultaID := c.Param("id")

	userID, err := getAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	roleValue, exists := c.Get("userRole")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role não encontrada no contexto"})
		return
	}

	userRole, ok := roleValue.(string)
	if !ok || userRole == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role inválida no contexto"})
		return
	}

	var req UpdateEstadoConsultaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Estado é obrigatório"})
		return
	}

	// Validar estado
	estadosValidos := map[string]bool{
		"realizada":            true,
		"cancelada":            true,
		"faltou_injustificada": true,
		"faltou_justificada":   true,
	}

	if !estadosValidos[req.Estado] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Estado inválido. Valores permitidos: realizada, cancelada, faltou_injustificada, faltou_justificada"})
		return
	}

	var consulta models.Consulta
	if err := config.DB.First(&consulta, consultaID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Consulta não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if isAlunoOutsideWindow(userID, &consulta) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acesso só disponível 2h antes e 2h após a consulta"})
		return
	}

	// Verificar permissões: admin, administrativo ou o terapeuta da consulta
	if userRole != "admin" && userRole != "administrativo" {
		if userRole == "terapeuta" {
			if !alunoIsLinkedToConsulta(userID, &consulta) {
				c.JSON(http.StatusForbidden, gin.H{"error": "Você só pode atualizar o estado das suas próprias consultas"})
				return
			}
		} else {
			c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para atualizar o estado da consulta"})
			return
		}
	}

	// Não permitir atualizar se já está cancelada
	if consulta.Estado == "cancelada" && req.Estado != "cancelada" {
		c.JSON(http.StatusConflict, gin.H{"error": "Não é possível atualizar uma consulta já cancelada"})
		return
	}

	// Atualizar estado
	consulta.Estado = req.Estado

	if err := config.DB.Save(&consulta).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Estado da consulta atualizado com sucesso",
		"consulta_id":  consulta.ID,
		"novo_estado":  consulta.Estado,
		"utente_id":    consulta.UtenteID,
		"terapeuta_id": consulta.TerapeutaID,
		"data_inicio":  consulta.DataInicio.Format("2006-01-02T15:04:05"),
		"data_fim":     consulta.DataFim.Format("2006-01-02T15:04:05"),
	})
}

// UploadPdfConsulta uploads a PDF document to a consultation
func UploadPdfConsulta(c *gin.Context) {
	consultaIDStr := c.Param("id")
	consultaID, err := strconv.ParseUint(consultaIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID da consulta inválido"})
		return
	}

	// Verificar se a consulta existe
	var consulta models.Consulta
	if err := config.DB.First(&consulta, consultaID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Consulta não encontrada"})
		return
	}

	if uid, err := getAuthenticatedUserID(c); err == nil && isAlunoOutsideWindow(uid, &consulta) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acesso só disponível 2h antes e 2h após a consulta"})
		return
	}

	// Obter ficheiro do formulário
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ficheiro não fornecido"})
		return
	}

	// Validar que é PDF
	if !strings.HasSuffix(strings.ToLower(file.Filename), ".pdf") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Apenas ficheiros PDF são permitidos"})
		return
	}

	// Validar Content-Type
	if file.Header.Get("Content-Type") != "application/pdf" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tipo de ficheiro inválido: apenas application/pdf é permitido"})
		return
	}

	// Validar magic bytes — impede ficheiros disfarçados de PDF
	{
		src, err := file.Open()
		if err == nil {
			magic := make([]byte, 4)
			src.Read(magic)
			src.Close()
			if string(magic) != "%PDF" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Ficheiro inválido: não é um PDF real"})
				return
			}
		}
	}

	// Validar tamanho (máximo 50MB)
	const maxSize = 50 * 1024 * 1024
	if file.Size > maxSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ficheiro demasiado grande (máximo 50MB)"})
		return
	}

	// Sanitizar nome do ficheiro — remove qualquer componente de diretório (path traversal)
	safeFilename := filepath.Base(file.Filename)

	// Gerar nome único para o ficheiro
	timestamp := time.Now().Unix()
	randNum := rand.Intn(10000)
	newFilename := fmt.Sprintf("%d_%d-%d-%s", randNum, consultaID, timestamp, safeFilename)

	// Guardar ficheiro na pasta uploads
	uploadPath := filepath.Join("./uploads", newFilename)
	if err := c.SaveUploadedFile(file, uploadPath); err != nil {
		log.Printf("Erro ao guardar ficheiro: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao guardar ficheiro"})
		return
	}

	// Obter user ID do contexto
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User não identificado"})
		return
	}

	// Guardar informações do documento na BD
	documento := models.DocumentoConsulta{
		ConsultaID:  uint(consultaID),
		ArquivoURL:  fmt.Sprintf("/uploads/%s", newFilename),
		NomeArquivo: safeFilename,
		UploadedBy:  userID.(uint),
		Estado:      estadoSubmissao(userID.(uint)),
		CreatedAt:   time.Now(),
	}

	if err := config.DB.Create(&documento).Error; err != nil {
		log.Printf("Erro ao guardar documento na BD: %v", err)
		// Remover o ficheiro se não conseguir guardar na BD
		os.Remove(uploadPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao registar documento"})
		return
	}

	log.Printf("PDF carregado com sucesso: %s para consulta %d", newFilename, consultaID)

	c.JSON(http.StatusOK, gin.H{
		"message":      "Ficheiro carregado com sucesso",
		"documento_id": documento.ID,
		"consulta_id":  consultaID,
		"arquivo_url":  documento.ArquivoURL,
		"nome_arquivo": documento.NomeArquivo,
		"created_at":   documento.CreatedAt.Format("2006-01-02T15:04:05"),
	})
}

// ServeUploadedFile serve ficheiros de upload.
// Avatars (/uploads/avatars/...) são públicos. Tudo o resto requer JWT válido.
func ServeUploadedFile(c *gin.Context) {
	filePath := c.Param("filepath")

	cleanPath := filepath.Clean(filePath)
	if strings.Contains(cleanPath, "..") {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acesso negado"})
		return
	}

	isAvatar := strings.HasPrefix(cleanPath, "/avatars/") || strings.HasPrefix(cleanPath, "avatars/")

	if !isAvatar {
		authHeader := c.GetHeader("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Autenticação necessária"})
			return
		}
		token := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := utils.ValidateAppJWT(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token inválido"})
			return
		}
		// Alunos só acedem a ficheiros de consultas dentro da janela ±2h
		var doc models.DocumentoConsulta
		archiveURL := "/uploads" + cleanPath
		if config.DB.Where("arquivo_url = ?", archiveURL).First(&doc).Error == nil {
			var consulta models.Consulta
			if config.DB.First(&consulta, doc.ConsultaID).Error == nil {
				if isAlunoOutsideWindow(claims.UserID, &consulta) {
					c.JSON(http.StatusForbidden, gin.H{"error": "Acesso só disponível 2h antes e 2h após a consulta"})
					return
				}
			}
		}
	}

	fullPath := filepath.Join("./uploads", cleanPath)
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ficheiro não encontrado"})
		return
	}

	c.File(fullPath)
}

type DocumentoListResponse struct {
	ID           uint   `json:"id"`
	ConsultaID   uint   `json:"consulta_id"`
	NomeArquivo  string `json:"nome_arquivo"`
	ArquivoURL   string `json:"arquivo_url"`
	UtenteNome   string `json:"utente_nome"`
	DataConsulta string `json:"data_consulta"`
	CreatedAt    string `json:"created_at"`
}

func GetDocumentos(c *gin.Context) {
	userID, _ := getAuthenticatedUserID(c)
	roleValue, _ := c.Get("userRole")
	userRole, _ := roleValue.(string)

	var docs []models.DocumentoConsulta
	query := config.DB.Preload("UserUpload")

	if userRole == "terapeuta" {
		query = query.Where("uploaded_by IN ?", getVisibleTerapeutaIDs(userID))
	}

	if err := query.Order("created_at DESC").Find(&docs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Enriquecer com dados da consulta (utente + data)
	var result []DocumentoListResponse
	for _, d := range docs {
		entry := DocumentoListResponse{
			ID:          d.ID,
			ConsultaID:  d.ConsultaID,
			NomeArquivo: d.NomeArquivo,
			ArquivoURL:  d.ArquivoURL,
			CreatedAt:   d.CreatedAt.Format("2006-01-02"),
		}
		var consulta models.Consulta
		if config.DB.Preload("Utente").First(&consulta, d.ConsultaID).Error == nil {
			entry.UtenteNome = consulta.Utente.Nome
			entry.DataConsulta = consulta.DataInicio.Format("2006-01-02")
		}
		result = append(result, entry)
	}

	c.JSON(http.StatusOK, result)
}

func ValidarDocumento(c *gin.Context) {
	userID, err := getAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	if isUserAluno(userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Alunos não podem validar submissões"})
		return
	}

	id := c.Param("id")
	var body struct {
		Acao string `json:"acao"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || (body.Acao != "aprovar" && body.Acao != "rejeitar") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "acao deve ser 'aprovar' ou 'rejeitar'"})
		return
	}

	var doc models.DocumentoConsulta
	if err := config.DB.Where("id = ? AND estado = 'pendente'", id).First(&doc).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Documento pendente não encontrado"})
		return
	}

	roleValue, _ := c.Get("userRole")
	role, _ := roleValue.(string)
	if role != "admin" {
		var supervisor models.Terapeuta
		if err := config.DB.Where("user_id = ? AND tipo = 'aluno' AND supervisor_id = ?", doc.UploadedBy, userID).First(&supervisor).Error; err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para validar este documento"})
			return
		}
	}

	if body.Acao == "aprovar" {
		if err := config.DB.Model(&doc).Update("estado", "aprovada").Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao aprovar documento"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Documento aprovado"})
	} else {
		if err := config.DB.Delete(&doc).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao rejeitar documento"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Documento rejeitado e eliminado"})
	}
}
