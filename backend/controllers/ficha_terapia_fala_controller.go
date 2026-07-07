package controllers

import (
	"net/http"
	"time"

	"clinica-backend/config"
	"clinica-backend/models"

	"github.com/gin-gonic/gin"
)

type CreateFichaTerapiaFalaRequest struct {
	UtenteID               uint   `json:"utente_id"`
	ConsultaID             *uint  `json:"consulta_id"`
	NomeCompleto           string `json:"nome_completo"`
	NumeroProcesso         string `json:"numero_processo"`
	DataNascimento         string `json:"data_nascimento"`
	Sexo                   string `json:"sexo"`
	AvaliacaoSubjetiva     string `json:"avaliacao_subjetiva"`
	AvaliacaoObjetiva      string `json:"avaliacao_objetiva"`
	DiagnosticoTerapiaFala string `json:"diagnostico_terapia_fala"`
	ObjetivosPrognostico   string `json:"objetivos_prognostico"`
	PlanoTerapeutico       string `json:"plano_terapeutico"`
	PlanoProgressao        string `json:"plano_progressao"`
	EstudanteID            *uint  `json:"estudante_id"`
}

type UpdateFichaTerapiaFalaRequest struct {
	NomeCompleto           *string `json:"nome_completo"`
	NumeroProcesso         *string `json:"numero_processo"`
	DataNascimento         *string `json:"data_nascimento"`
	Sexo                   *string `json:"sexo"`
	AvaliacaoSubjetiva     *string `json:"avaliacao_subjetiva"`
	AvaliacaoObjetiva      *string `json:"avaliacao_objetiva"`
	DiagnosticoTerapiaFala *string `json:"diagnostico_terapia_fala"`
	ObjetivosPrognostico   *string `json:"objetivos_prognostico"`
	PlanoTerapeutico       *string `json:"plano_terapeutico"`
	PlanoProgressao        *string `json:"plano_progressao"`
	EstudanteID            *uint   `json:"estudante_id"`
}

func fillFichaTerapiaFalaFromUtenteData(ficha *models.FichaTerapiaFala) error {
	var info utenteFichaInfo

	err := config.DB.Table("utentes").
		Select("users.nome AS nome_completo, utentes.numero_processo, utentes.data_nascimento").
		Joins("JOIN users ON users.id = utentes.user_id").
		Where("utentes.user_id = ?", ficha.UtenteID).
		Take(&info).Error
	if err != nil {
		return err
	}

	if ficha.NomeCompleto == "" {
		ficha.NomeCompleto = info.NomeCompleto
	}

	if ficha.NumeroProcesso == "" {
		ficha.NumeroProcesso = info.NumeroProcesso
	}

	if ficha.DataNascimento == nil && info.DataNascimento != nil {
		ficha.DataNascimento = info.DataNascimento
	}

	return nil
}

func GetFichasTerapiaFala(c *gin.Context) {
	var fichas []models.FichaTerapiaFala
	query := config.DB

	if utenteID := c.Query("utente_id"); utenteID != "" {
		query = query.Where("utente_id = ?", utenteID)
	}

	userID, _ := getAuthenticatedUserID(c)
	roleValue, _ := c.Get("userRole")
	userRole, _ := roleValue.(string)
	if userRole == "utente" {
		query = query.Where("utente_id = ? AND estado = 'aprovada'", userID)
	} else if userRole == "terapeuta" {
		query = query.Where("created_by IN ?", getVisibleTerapeutaIDs(userID))
	}

	if err := query.
		Preload("Utente").
		Preload("Utente.User").
		Preload("Consulta").
		Preload("User").
		Order("id DESC").
		Find(&fichas).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for i := range fichas {
		if err := fillFichaTerapiaFalaFromUtenteData(&fichas[i]); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, fichas)
}

func GetFichaTerapiaFalaByID(c *gin.Context) {
	id := c.Param("id")
	var ficha models.FichaTerapiaFala

	if err := config.DB.
		Preload("Utente").
		Preload("Utente.User").
		Preload("Consulta").
		Preload("User").
		First(&ficha, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ficha não encontrada"})
		return
	}

	userID, _ := getAuthenticatedUserID(c)
	roleValue, _ := c.Get("userRole")
	if userRole, _ := roleValue.(string); userRole == "utente" {
		if ficha.UtenteID != userID || ficha.Estado != "aprovada" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão"})
			return
		}
	}

	if err := fillFichaTerapiaFalaFromUtenteData(&ficha); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ficha)
}

func CreateFichaTerapiaFala(c *gin.Context) {
	var req CreateFichaTerapiaFalaRequest
	var dataNascimento *time.Time

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	createdBy, err := getAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	if req.DataNascimento != "" {
		parsed, err := time.Parse("2006-01-02", req.DataNascimento)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data de nascimento inválida. Use o formato YYYY-MM-DD"})
			return
		}
		dataNascimento = &parsed
	}

	ficha := models.FichaTerapiaFala{
		UtenteID:               req.UtenteID,
		ConsultaID:             req.ConsultaID,
		NomeCompleto:           req.NomeCompleto,
		NumeroProcesso:         req.NumeroProcesso,
		DataNascimento:         dataNascimento,
		Sexo:                   req.Sexo,
		AvaliacaoSubjetiva:     req.AvaliacaoSubjetiva,
		AvaliacaoObjetiva:      req.AvaliacaoObjetiva,
		DiagnosticoTerapiaFala: req.DiagnosticoTerapiaFala,
		ObjetivosPrognostico:   req.ObjetivosPrognostico,
		PlanoTerapeutico:       req.PlanoTerapeutico,
		PlanoProgressao:        req.PlanoProgressao,
		CreatedBy:              createdBy,
		Estado:                 estadoSubmissao(createdBy),
		EstudanteID:            req.EstudanteID,
	}

	if err := fillFichaTerapiaFalaFromUtenteData(&ficha); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Utente inválido ou dados do processo inexistentes"})
		return
	}

	if err := config.DB.Create(&ficha).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, ficha)
}

func UpdateFichaTerapiaFala(c *gin.Context) {
	var req UpdateFichaTerapiaFalaRequest
	id := c.Param("id")

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	var ficha models.FichaTerapiaFala
	if err := config.DB.First(&ficha, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ficha não encontrada"})
		return
	}

	if req.NomeCompleto != nil {
		ficha.NomeCompleto = *req.NomeCompleto
	}
	if req.NumeroProcesso != nil {
		ficha.NumeroProcesso = *req.NumeroProcesso
	}
	if req.DataNascimento != nil {
		parsed, err := time.Parse("2006-01-02", *req.DataNascimento)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data de nascimento inválida. Use o formato YYYY-MM-DD"})
			return
		}
		ficha.DataNascimento = &parsed
	}
	if req.Sexo != nil {
		ficha.Sexo = *req.Sexo
	}
	if req.AvaliacaoSubjetiva != nil {
		ficha.AvaliacaoSubjetiva = *req.AvaliacaoSubjetiva
	}
	if req.AvaliacaoObjetiva != nil {
		ficha.AvaliacaoObjetiva = *req.AvaliacaoObjetiva
	}
	if req.DiagnosticoTerapiaFala != nil {
		ficha.DiagnosticoTerapiaFala = *req.DiagnosticoTerapiaFala
	}
	if req.ObjetivosPrognostico != nil {
		ficha.ObjetivosPrognostico = *req.ObjetivosPrognostico
	}
	if req.PlanoTerapeutico != nil {
		ficha.PlanoTerapeutico = *req.PlanoTerapeutico
	}
	if req.PlanoProgressao != nil {
		ficha.PlanoProgressao = *req.PlanoProgressao
	}
	if req.EstudanteID != nil {
		ficha.EstudanteID = req.EstudanteID
	}

	if err := config.DB.Save(&ficha).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ficha)
}

func DeleteFichaTerapiaFala(c *gin.Context) {
	id := c.Param("id")

	// Eliminar a ficha diretamente por ID
	result := config.DB.Where("id = ?", id).Delete(&models.FichaTerapiaFala{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao eliminar ficha: " + result.Error.Error()})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ficha não encontrada"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ficha eliminada com sucesso"})
}

func ValidarFichaTerapiaFala(c *gin.Context) {
	validarFicha(c, "terapia-fala")
}
