package controllers

import (
	"crypto/rand"
	"log"
	"net/http"
	"strings"
	"time"

	"clinica-backend/config"
	"clinica-backend/models"
	"clinica-backend/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
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

	// 3. Procurar o utente pelo contacto (telefone, normalizado). Se não existir, criar automaticamente.
	contactoNormalizado := normalizePhone(req.Contacto)
	var utente models.Utente
	if err := config.DB.Where("telefone = ?", contactoNormalizado).First(&utente).Error; err != nil {
		if err != gorm.ErrRecordNotFound {
			log.Printf("ERRO BD ao procurar utente pelo contacto '%s': %v", req.Contacto, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao procurar utente"})
			return
		}

		log.Printf("INFO: Contacto '%s' não registado, a criar novo utente '%s' automaticamente.", req.Contacto, req.Nome)

		// Password aleatória: esta conta é criada pelo agente de voz, não faz login pela app.
		randomBytes := make([]byte, 32)
		if _, err := rand.Read(randomBytes); err != nil {
			log.Printf("ERRO ao gerar password aleatória: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar utente"})
			return
		}
		passwordHash, err := bcrypt.GenerateFromPassword(randomBytes, bcrypt.DefaultCost)
		if err != nil {
			log.Printf("ERRO ao gerar hash de password: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar utente"})
			return
		}

		novoUser := models.User{
			Nome:          req.Nome,
			PasswordHash:  string(passwordHash),
			Role:          "utente",
			Active:        true,
			EmailVerified: true,
		}
		if err := config.DB.Create(&novoUser).Error; err != nil {
			log.Printf("ERRO ao criar User para novo utente (contacto '%s'): %v", req.Contacto, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar utente"})
			return
		}

		contacto := contactoNormalizado
		vazio := ""
		utente = models.Utente{
			UserID:         novoUser.ID,
			NumeroProcesso: &vazio,
			Telefone:       &contacto,
			Morada:         &vazio,
		}
		if err := config.DB.Create(&utente).Error; err != nil {
			log.Printf("ERRO ao criar Utente para novo user ID %d: %v", novoUser.ID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar utente"})
			return
		}

		processo := models.ProcessoClinico{UtenteID: novoUser.ID}
		if err := config.DB.Create(&processo).Error; err != nil {
			log.Printf("AVISO: Erro ao criar ProcessoClinico para novo utente %d: %v", novoUser.ID, err)
		}

		log.Printf("SUCESSO: Novo utente criado via Agente -> UserID %d, Nome '%s', Contacto '%s'", utente.UserID, req.Nome, req.Contacto)
	}

	// Recarregar com o User associado, para termos Nome/Email atualizados
	// independentemente de o utente já existir ou ter acabado de ser criado.
	if err := config.DB.Preload("User").First(&utente, utente.UserID).Error; err != nil {
		log.Printf("AVISO: não foi possível recarregar dados do utente %d: %v", utente.UserID, err)
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

	// 6. Validar disponibilidade ANTES de tentar criar a consulta, para devolver
	// uma resposta clara à IA em vez de deixar rebentar num erro genérico.
	if haConflitoHorario(terapeuta.UserID, salaPtr, dataInicio, dataFim) {
		log.Printf("CONFLITO: Horário já ocupado para terapeuta %d / sala %v (%s - %s)",
			terapeuta.UserID, salaPtr, dataInicio, dataFim)
		c.JSON(http.StatusConflict, gin.H{"erro": "Essa vaga já está ocupada, por favor escolha outro horário."})
		return
	}

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
		// Rede de segurança: mesmo com a verificação prévia acima, pode haver uma
		// corrida entre pedidos concorrentes apanhada apenas pela constraint da BD.
		if strings.Contains(msg, "no_overlap") {
			c.JSON(http.StatusConflict, gin.H{"erro": "Essa vaga já está ocupada, por favor escolha outro horário."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"erro": "Não foi possível agendar a consulta. Tente novamente mais tarde."})
		return
	}

	log.Printf("SUCESSO: Consulta ID %d criada com sucesso via Agente!", consulta.ID)

	// 7. Caminho feliz: enviar email de confirmação. Assíncrono para não atrasar
	// a resposta à IA, e sem falhar o pedido caso o envio dê erro.
	if utente.User.Email != "" {
		go func(email, nome, especialidade string, inicio, fim time.Time) {
			if err := utils.SendConsultaConfirmationEmail(email, nome, especialidade, inicio, fim); err != nil {
				log.Printf("AVISO: Falha ao enviar email de confirmação para %s: %v", email, err)
			}
		}(utente.User.Email, utente.User.Nome, area.Nome, dataInicio, dataFim)
	} else {
		log.Printf("INFO: Utente %d sem email registado — sem envio de confirmação.", utente.UserID)
	}

	c.JSON(http.StatusOK, gin.H{
		"mensagem":    "Consulta agendada com sucesso, aguarda confirmação da clínica",
		"consulta_id": consulta.ID,
	})
}
