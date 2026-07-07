package controllers

import (
	"net/http"
	"time"

	"clinica-backend/config"
	"clinica-backend/models"

	"github.com/gin-gonic/gin"
)

type utenteFichaInfo struct {
	NomeCompleto   string     `gorm:"column:nome_completo"`
	NumeroProcesso string     `gorm:"column:numero_processo"`
	DataNascimento *time.Time `gorm:"column:data_nascimento"`
}

func yearsFromBirthDate(birthDate time.Time) uint {
	now := time.Now()
	age := now.Year() - birthDate.Year()

	if now.Month() < birthDate.Month() || (now.Month() == birthDate.Month() && now.Day() < birthDate.Day()) {
		age--
	}

	if age < 0 {
		return 0
	}

	return uint(age)
}

func fillFichaFromUtenteData(ficha *models.FichaAvaliacao) error {
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

	if ficha.Idade == nil && ficha.DataNascimento != nil {
		calculatedAge := yearsFromBirthDate(*ficha.DataNascimento)
		ficha.Idade = &calculatedAge
	}

	if ficha.IMC == nil && ficha.PesoKg != nil && ficha.AlturaM != nil && *ficha.AlturaM > 0 {
		calculatedIMC := *ficha.PesoKg / (*ficha.AlturaM * *ficha.AlturaM)
		ficha.IMC = &calculatedIMC
	}

	return nil
}

type CreateFichaRequest struct {
	UtenteID                   uint     `json:"utente_id"`
	ConsultaID                 *uint    `json:"consulta_id"`
	NomeCompleto               string   `json:"nome_completo"`
	NumeroProcesso             string   `json:"numero_processo"`
	DataNascimento             string   `json:"data_nascimento"`
	Idade                      *uint    `json:"idade"`
	Sexo                       string   `json:"sexo"`
	PesoKg                     *float64 `json:"peso_kg"`
	AlturaM                    *float64 `json:"altura_m"`
	IMC                        *float64 `json:"imc"`
	DiagnosticoQueixaPrincipal string   `json:"diagnostico_queixa_principal"`
	TipoRegisto                string   `json:"tipo_registo"`
	AvaliacaoSubjetiva         string   `json:"avaliacao_subjetiva"`
	DiagnosticoFisioterapia    string   `json:"diagnostico_fisioterapia"`
	ObjetivosPrognostico       string   `json:"objetivos_prognostico"`
	PlanoTerapeutico           string   `json:"plano_terapeutico"`
	PlanoProgressao            string   `json:"plano_progressao"`
	HistoriaPessoal            string   `json:"historia_pessoal"`
	Perspetivas                string   `json:"perspetivas"`
	Limitacoes                 string   `json:"limitacoes"`
	MCD                        string   `json:"mcd"`
	HistoriaCondicao           string   `json:"historia_condicao"`
	Medicacao                  string   `json:"medicacao"`
	HistMedAtual               string   `json:"hist_med_atual"`
	HistMedAnterior            string   `json:"hist_med_anterior"`
	HistMedFamiliar            string   `json:"hist_med_familiar"`
	SINSS                      string   `json:"sinss"`
}

type UpdateFichaRequest struct {
	NomeCompleto               *string  `json:"nome_completo"`
	NumeroProcesso             *string  `json:"numero_processo"`
	DataNascimento             *string  `json:"data_nascimento"`
	Idade                      *uint    `json:"idade"`
	Sexo                       *string  `json:"sexo"`
	PesoKg                     *float64 `json:"peso_kg"`
	AlturaM                    *float64 `json:"altura_m"`
	IMC                        *float64 `json:"imc"`
	DiagnosticoQueixaPrincipal *string  `json:"diagnostico_queixa_principal"`
	TipoRegisto                *string  `json:"tipo_registo"`
	AvaliacaoSubjetiva         *string  `json:"avaliacao_subjetiva"`
	DiagnosticoFisioterapia    *string  `json:"diagnostico_fisioterapia"`
	ObjetivosPrognostico       *string  `json:"objetivos_prognostico"`
	PlanoTerapeutico           *string  `json:"plano_terapeutico"`
	PlanoProgressao            *string  `json:"plano_progressao"`
	HistoriaPessoal            *string  `json:"historia_pessoal"`
	Perspetivas                *string  `json:"perspetivas"`
	Limitacoes                 *string  `json:"limitacoes"`
	MCD                        *string  `json:"mcd"`
	HistoriaCondicao           *string  `json:"historia_condicao"`
	Medicacao                  *string  `json:"medicacao"`
	HistMedAtual               *string  `json:"hist_med_atual"`
	HistMedAnterior            *string  `json:"hist_med_anterior"`
	HistMedFamiliar            *string  `json:"hist_med_familiar"`
	SINSS                      *string  `json:"sinss"`
}

func GetFichasAvaliacao(c *gin.Context) {
	var fichas []models.FichaAvaliacao
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
		Preload("AvaliacoesObjetivas").
		Order("id DESC").
		Find(&fichas).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for i := range fichas {
		if err := fillFichaFromUtenteData(&fichas[i]); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, fichas)
}

func GetFichaAvaliacaoByID(c *gin.Context) {
	id := c.Param("id")
	var ficha models.FichaAvaliacao

	if err := config.DB.
		Preload("Utente").
		Preload("Utente.User").
		Preload("Consulta").
		Preload("User").
		Preload("AvaliacoesObjetivas").
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

	if err := fillFichaFromUtenteData(&ficha); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ficha)
}

func CreateFichaAvaliacao(c *gin.Context) {
	var req CreateFichaRequest
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

	ficha := models.FichaAvaliacao{
		UtenteID:                   req.UtenteID,
		ConsultaID:                 req.ConsultaID,
		NomeCompleto:               req.NomeCompleto,
		NumeroProcesso:             req.NumeroProcesso,
		DataNascimento:             dataNascimento,
		Idade:                      req.Idade,
		Sexo:                       req.Sexo,
		PesoKg:                     req.PesoKg,
		AlturaM:                    req.AlturaM,
		IMC:                        req.IMC,
		DiagnosticoQueixaPrincipal: req.DiagnosticoQueixaPrincipal,
		TipoRegisto:                req.TipoRegisto,
		AvaliacaoSubjetiva:         req.AvaliacaoSubjetiva,
		DiagnosticoFisioterapia:    req.DiagnosticoFisioterapia,
		ObjetivosPrognostico:       req.ObjetivosPrognostico,
		PlanoTerapeutico:           req.PlanoTerapeutico,
		PlanoProgressao:            req.PlanoProgressao,
		HistoriaPessoal:            req.HistoriaPessoal,
		Perspetivas:                req.Perspetivas,
		Limitacoes:                 req.Limitacoes,
		MCD:                        req.MCD,
		HistoriaCondicao:           req.HistoriaCondicao,
		Medicacao:                  req.Medicacao,
		HistMedAtual:               req.HistMedAtual,
		HistMedAnterior:            req.HistMedAnterior,
		HistMedFamiliar:            req.HistMedFamiliar,
		SINSS:                      req.SINSS,
		CreatedBy:                  createdBy,
		Estado:                     estadoSubmissao(createdBy),
	}

	if err := fillFichaFromUtenteData(&ficha); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Utente inválido ou dados do processo inexistentes"})
		return
	}

	if err := config.DB.Create(&ficha).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, ficha)
}

func UpdateFichaAvaliacao(c *gin.Context) {
	var req UpdateFichaRequest
	id := c.Param("id")

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	var ficha models.FichaAvaliacao
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
	if req.Idade != nil {
		ficha.Idade = req.Idade
	}
	if req.Sexo != nil {
		ficha.Sexo = *req.Sexo
	}
	if req.PesoKg != nil {
		ficha.PesoKg = req.PesoKg
	}
	if req.AlturaM != nil {
		ficha.AlturaM = req.AlturaM
	}
	if req.IMC != nil {
		ficha.IMC = req.IMC
	}
	if req.DiagnosticoQueixaPrincipal != nil {
		ficha.DiagnosticoQueixaPrincipal = *req.DiagnosticoQueixaPrincipal
	}
	if req.TipoRegisto != nil {
		ficha.TipoRegisto = *req.TipoRegisto
	}
	if req.AvaliacaoSubjetiva != nil {
		ficha.AvaliacaoSubjetiva = *req.AvaliacaoSubjetiva
	}
	if req.DiagnosticoFisioterapia != nil {
		ficha.DiagnosticoFisioterapia = *req.DiagnosticoFisioterapia
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
	if req.HistoriaPessoal != nil {
		ficha.HistoriaPessoal = *req.HistoriaPessoal
	}
	if req.Perspetivas != nil {
		ficha.Perspetivas = *req.Perspetivas
	}
	if req.Limitacoes != nil {
		ficha.Limitacoes = *req.Limitacoes
	}
	if req.MCD != nil {
		ficha.MCD = *req.MCD
	}
	if req.HistoriaCondicao != nil {
		ficha.HistoriaCondicao = *req.HistoriaCondicao
	}
	if req.Medicacao != nil {
		ficha.Medicacao = *req.Medicacao
	}
	if req.HistMedAtual != nil {
		ficha.HistMedAtual = *req.HistMedAtual
	}
	if req.HistMedAnterior != nil {
		ficha.HistMedAnterior = *req.HistMedAnterior
	}
	if req.HistMedFamiliar != nil {
		ficha.HistMedFamiliar = *req.HistMedFamiliar
	}
	if req.SINSS != nil {
		ficha.SINSS = *req.SINSS
	}

	if err := fillFichaFromUtenteData(&ficha); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := config.DB.Save(&ficha).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ficha)
}

func DeleteFichaAvaliacao(c *gin.Context) {
	id := c.Param("id")

	// Eliminar a ficha diretamente por ID
	result := config.DB.Where("id = ?", id).Delete(&models.FichaAvaliacao{})
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

func ValidarFichaAvaliacao(c *gin.Context) {
	validarFicha(c, "avaliacao")
}

// validarFicha é o handler genérico partilhado pelos três tipos de ficha.
func validarFicha(c *gin.Context, tipo string) {
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

	roleValue, _ := c.Get("userRole")
	role, _ := roleValue.(string)

	// Verificar que a ficha pertence a um aluno supervisionado por este professor (ou é admin)
	var createdBy uint
	switch tipo {
	case "avaliacao":
		var f models.FichaAvaliacao
		if err := config.DB.Select("id, created_by").Where("id = ? AND estado = 'pendente'", id).First(&f).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ficha pendente não encontrada"})
			return
		}
		createdBy = f.CreatedBy
	case "psicologia":
		var f models.FichaPsicologia
		if err := config.DB.Select("id, created_by").Where("id = ? AND estado = 'pendente'", id).First(&f).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ficha pendente não encontrada"})
			return
		}
		createdBy = f.CreatedBy
	case "terapia-fala":
		var f models.FichaTerapiaFala
		if err := config.DB.Select("id, created_by").Where("id = ? AND estado = 'pendente'", id).First(&f).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ficha pendente não encontrada"})
			return
		}
		createdBy = f.CreatedBy
	case "nutricao":
		var f models.FichaNutricao
		if err := config.DB.Select("id, created_by").Where("id = ? AND estado = 'pendente'", id).First(&f).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ficha pendente não encontrada"})
			return
		}
		createdBy = f.CreatedBy
	}

	if role != "admin" {
		var supervisor models.Terapeuta
		if err := config.DB.Where("user_id = ? AND tipo = 'aluno' AND supervisor_id = ?", createdBy, userID).First(&supervisor).Error; err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para validar esta ficha"})
			return
		}
	}

	if body.Acao == "aprovar" {
		var dbErr error
		switch tipo {
		case "avaliacao":
			dbErr = config.DB.Model(&models.FichaAvaliacao{}).Where("id = ?", id).Update("estado", "aprovada").Error
		case "psicologia":
			dbErr = config.DB.Model(&models.FichaPsicologia{}).Where("id = ?", id).Update("estado", "aprovada").Error
		case "terapia-fala":
			dbErr = config.DB.Model(&models.FichaTerapiaFala{}).Where("id = ?", id).Update("estado", "aprovada").Error
		case "nutricao":
			dbErr = config.DB.Model(&models.FichaNutricao{}).Where("id = ?", id).Update("estado", "aprovada").Error
		}
		if dbErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao aprovar ficha"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Ficha aprovada"})
	} else {
		var dbErr error
		switch tipo {
		case "avaliacao":
			dbErr = config.DB.Where("id = ?", id).Delete(&models.FichaAvaliacao{}).Error
		case "psicologia":
			dbErr = config.DB.Where("id = ?", id).Delete(&models.FichaPsicologia{}).Error
		case "terapia-fala":
			dbErr = config.DB.Where("id = ?", id).Delete(&models.FichaTerapiaFala{}).Error
		case "nutricao":
			dbErr = config.DB.Where("id = ?", id).Delete(&models.FichaNutricao{}).Error
		}
		if dbErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao rejeitar ficha"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Ficha rejeitada e eliminada"})
	}
}
