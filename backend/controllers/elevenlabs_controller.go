package controllers

import (
	"log"
	"net/http"
	"strings"

	"clinica-backend/config"
	"clinica-backend/models"

	"github.com/gin-gonic/gin"
)

// AgenteConsultaRequest é o payload que o agente ElevenLabs envia.
type AgenteConsultaRequest struct {
	Nome          string `json:"nome"`
	Contacto      string `json:"contacto"`
	Especialidade string `json:"especialidade"`
	DataInicio    string `json:"data_inicio"` // formato: YYYY-MM-DD HH:MM
	DataFim       string `json:"data_fim"`    // formato: YYYY-MM-DD HH:MM
}

// CreateConsultaAgente é o endpoint público (protegido por secret, não por JWT)
// usado pelo agente de voz ElevenLabs para marcar consultas.
func CreateConsultaAgente(c *gin.Context) {
	// 1. Validar o secret partilhado (ElevenLabs não tem login/JWT de utilizador)
	secret := config.GetEnvOptional("ELEVENLABS_WEBHOOK_SECRET", "")
	if secret == "" || c.GetHeader("X-Agent-Secret") != secret {
		log.Println("ERRO: Tentativa de acesso sem secret válido ou X-Agent-Secret em falta.")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Não autorizado"})
		return
	}

	var req AgenteConsultaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("ERRO BIND JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos: " + err.Error()})
		return
	}

	log.Printf("DEBUG: Recebido payload da IA -> Nome: '%s', Contacto: '%s', Especialidade: '%s', Inicio: '%s', Fim: '%s'",
		req.Nome, req.Contacto, req.Especialidade, req.DataInicio, req.DataFim)

	if req.Nome == "" || req.Contacto == "" || req.Especialidade == "" || req.DataInicio == "" || req.DataFim == "" {
		log.Println("ERRO: Dados obrigatórios em falta no payload.")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados obrigatórios em falta (nome, contacto, especialidade, data_inicio, data_fim)"})
		return
	}

	dataInicio, err := parseDateTime(req.DataInicio)
	if err != nil {
		log.Printf("ERRO: Data de início inválida ('%s'): %v", req.DataInicio, err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data de início inválida. Use YYYY-MM-DD HH:MM"})
		return
	}

	dataFim, err := parseDateTime(req.DataFim)
	if err != nil {
		log.Printf("ERRO: Data de fim inválida ('%s'): %v", req.DataFim, err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data de fim inválida. Use YYYY-MM-DD HH:MM"})
		return
	}

	if !dataFim.After(dataInicio) {
		log.Println("ERRO: Data de fim anterior ou igual à data de início.")
		c.JSON(http.StatusBadRequest, gin.H{"error": "A data de fim deve ser posterior à data de início"})
		return
	}

	// 2. Mapear "especialidade" (ex: "Nutrição") para uma área clínica existente
	var area models.AreaClinica
	if err := config.DB.Where("LOWER(nome) = LOWER(?) AND ativa = ?", req.Especialidade, true).First(&area).Error; err != nil {
		log.Printf("ERRO 404: Especialidade não encontrada na BD: '%s'", req.Especialidade)
		c.JSON(http.StatusNotFound, gin.H{"error": "Especialidade não encontrada: " + req.Especialidade})
		return
	}

	// 3. Encontrar o utente pelo contacto (telefone). Assume-se que já está registado.
	var utente models.Utente
	if err := config.DB.Where("telefone = ?", req.Contacto).First(&utente).Error; err != nil {
		log.Printf("ERRO 404: Utente não encontrado com o contacto: '%s'", req.Contacto)
		c.JSON(http.StatusNotFound, gin.H{"error": "Não encontrámos nenhum utente registado com esse contacto"})
		return
	}

	// 4. Escolher um terapeuta ativo dessa área clínica
	var terapeuta models.Terapeuta
	err = config.DB.
		Joins("JOIN users ON users.id = terapeutas.user_id").
		Where("users.active = ?", true).
		Where("terapeutas.area_clinica_id = ?", area.ID).
		First(&terapeuta).Error
	if err != nil {
		log.Printf("ERRO 404: Sem terapeutas ativos para a área ID %d", area.ID)
		c.JSON(http.StatusNotFound, gin.H{"error": "Sem terapeutas disponíveis para esta especialidade"})
		return
	}

	// 5. Escolher sala disponível (reaproveita a lógica já usada em CreateConsulta)
	var salaPtr *uint
	if salaID, err := getRandomAvailableSalaID(area.ID, dataInicio, dataFim); err == nil {
		salaPtr = &salaID
	}

	consultaMu.Lock()
	defer consultaMu.Unlock()

	consulta := models.Consulta{
		UtenteID:        utente.UserID,
		TerapeutaID:     terapeuta.UserID,
		SalaID:          salaPtr,
		AreaClinicaID:   area.ID,
		DataInicio:      dataInicio,
		DataFim:         dataFim,
		Estado:          "agendada",
		TipoConsulta:    "individual",
		EstadoValidacao: "pendente", // fica a aguardar confirmação de um administrativo
		CreatedBy:       utente.UserID,
	}

	if err := config.DB.Create(&consulta).Error; err != nil {
		msg := strings.ToLower(err.Error())
		log.Printf("ERRO SQL AO CRIAR CONSULTA: %v", err)
		if strings.Contains(msg, "no_overlap") {
			c.JSON(http.StatusConflict, gin.H{"error": "Horário já ocupado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	log.Printf("SUCESSO: Consulta ID %d criada com sucesso via Agente!", consulta.ID)
	c.JSON(http.StatusOK, gin.H{
		"mensagem":    "Consulta agendada com sucesso, aguarda confirmação da clínica",
		"consulta_id": consulta.ID,
	})
}
