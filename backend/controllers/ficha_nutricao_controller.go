package controllers

import (
	"net/http"
	"time"

	"clinica-backend/config"
	"clinica-backend/models"

	"github.com/gin-gonic/gin"
)

type CreateFichaNutricaoRequest struct {
	UtenteID               uint     `json:"utente_id"`
	ConsultaID             *uint    `json:"consulta_id"`
	NomeCompleto           string   `json:"nome_completo"`
	NumeroProcesso         string   `json:"numero_processo"`
	DataNascimento         string   `json:"data_nascimento"`
	MotivoConsulta         string   `json:"motivo_consulta"`
	AntecedentesPessoais   string   `json:"antecedentes_pessoais"`
	AntecedentesFamiliares string   `json:"antecedentes_familiares"`
	MedicacaoHabitual      string   `json:"medicacao_habitual"`
	AlergiasIntolerancias  string   `json:"alergias_intolerancias"`
	AtividadeFisica        string   `json:"atividade_fisica"`
	HabitosTabacos         string   `json:"habitos_tabagicos"`
	HabitosAlcoolicos      string   `json:"habitos_alcoolicos"`
	DadosLaboratoriais     string   `json:"dados_laboratoriais"`
	EstadoApetite          string   `json:"estado_apetite"`
	EstadoMastigacao       string   `json:"estado_mastigacao"`
	EstadoDigestao         string   `json:"estado_digestao"`
	EstadoFuncaoGI         string   `json:"estado_funcao_gi"`
	ExameFisicoNutricao    string   `json:"exame_fisico_nutricao"`
	IngestaoAlimentarHabitual string `json:"ingestao_alimentar_habitual"`
	IngestaoHidrica           string `json:"ingestao_hidrica"`
	PesoKg                 *float64 `json:"peso_kg"`
	AlturaM                *float64 `json:"altura_m"`
	MassaGordaPct          *float64 `json:"massa_gorda_pct"`
	MassaMuscularKg        *float64 `json:"massa_muscular_kg"`
	PerimetroCintura       *float64 `json:"perimetro_cintura"`
	PerimetroGluteal       *float64 `json:"perimetro_gluteal"`
	PregasCutaneas         string   `json:"pregas_cutaneas"`
	EvolucaoPesoMin        *float64 `json:"evolucao_peso_min"`
	EvolucaoPesoMax        *float64 `json:"evolucao_peso_max"`
	IntervencaoNutricional string   `json:"intervencao_nutricional"`
	PlanoAlimentar         string   `json:"plano_alimentar"`
}

type UpdateFichaNutricaoRequest struct {
	NomeCompleto           *string  `json:"nome_completo"`
	NumeroProcesso         *string  `json:"numero_processo"`
	DataNascimento         *string  `json:"data_nascimento"`
	MotivoConsulta         *string  `json:"motivo_consulta"`
	AntecedentesPessoais   *string  `json:"antecedentes_pessoais"`
	AntecedentesFamiliares *string  `json:"antecedentes_familiares"`
	MedicacaoHabitual      *string  `json:"medicacao_habitual"`
	AlergiasIntolerancias  *string  `json:"alergias_intolerancias"`
	AtividadeFisica        *string  `json:"atividade_fisica"`
	HabitosTabacos         *string  `json:"habitos_tabagicos"`
	HabitosAlcoolicos      *string  `json:"habitos_alcoolicos"`
	DadosLaboratoriais     *string  `json:"dados_laboratoriais"`
	EstadoApetite          *string  `json:"estado_apetite"`
	EstadoMastigacao       *string  `json:"estado_mastigacao"`
	EstadoDigestao         *string  `json:"estado_digestao"`
	EstadoFuncaoGI         *string  `json:"estado_funcao_gi"`
	ExameFisicoNutricao    *string  `json:"exame_fisico_nutricao"`
	IngestaoAlimentarHabitual *string `json:"ingestao_alimentar_habitual"`
	IngestaoHidrica           *string `json:"ingestao_hidrica"`
	PesoKg                 *float64 `json:"peso_kg"`
	AlturaM                *float64 `json:"altura_m"`
	MassaGordaPct          *float64 `json:"massa_gorda_pct"`
	MassaMuscularKg        *float64 `json:"massa_muscular_kg"`
	PerimetroCintura       *float64 `json:"perimetro_cintura"`
	PerimetroGluteal       *float64 `json:"perimetro_gluteal"`
	PregasCutaneas         *string  `json:"pregas_cutaneas"`
	EvolucaoPesoMin        *float64 `json:"evolucao_peso_min"`
	EvolucaoPesoMax        *float64 `json:"evolucao_peso_max"`
	IntervencaoNutricional *string  `json:"intervencao_nutricional"`
	PlanoAlimentar         *string  `json:"plano_alimentar"`
}

func fillFichaNutricaoFromUtenteData(ficha *models.FichaNutricao) error {
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

func calcularIMC(peso, altura *float64) *float64 {
	if peso == nil || altura == nil || *altura <= 0 {
		return nil
	}
	imc := *peso / (*altura * *altura)
	return &imc
}

func GetFichasNutricao(c *gin.Context) {
	var fichas []models.FichaNutricao
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
		if err := fillFichaNutricaoFromUtenteData(&fichas[i]); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, fichas)
}

func GetFichaNutricaoByID(c *gin.Context) {
	id := c.Param("id")
	var ficha models.FichaNutricao

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

	if err := fillFichaNutricaoFromUtenteData(&ficha); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ficha)
}

func CreateFichaNutricao(c *gin.Context) {
	var req CreateFichaNutricaoRequest
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

	ficha := models.FichaNutricao{
		UtenteID:               req.UtenteID,
		ConsultaID:             req.ConsultaID,
		NomeCompleto:           req.NomeCompleto,
		NumeroProcesso:         req.NumeroProcesso,
		DataNascimento:         dataNascimento,
		MotivoConsulta:         req.MotivoConsulta,
		AntecedentesPessoais:   req.AntecedentesPessoais,
		AntecedentesFamiliares: req.AntecedentesFamiliares,
		MedicacaoHabitual:      req.MedicacaoHabitual,
		AlergiasIntolerancias:  req.AlergiasIntolerancias,
		AtividadeFisica:        req.AtividadeFisica,
		HabitosTabacos:         req.HabitosTabacos,
		HabitosAlcoolicos:      req.HabitosAlcoolicos,
		DadosLaboratoriais:     req.DadosLaboratoriais,
		EstadoApetite:          req.EstadoApetite,
		EstadoMastigacao:       req.EstadoMastigacao,
		EstadoDigestao:         req.EstadoDigestao,
		EstadoFuncaoGI:         req.EstadoFuncaoGI,
		ExameFisicoNutricao:    req.ExameFisicoNutricao,
		IngestaoAlimentarHabitual: req.IngestaoAlimentarHabitual,
		IngestaoHidrica:           req.IngestaoHidrica,
		PesoKg:                 req.PesoKg,
		AlturaM:                req.AlturaM,
		IMC:                    calcularIMC(req.PesoKg, req.AlturaM),
		MassaGordaPct:          req.MassaGordaPct,
		MassaMuscularKg:        req.MassaMuscularKg,
		PerimetroCintura:       req.PerimetroCintura,
		PerimetroGluteal:       req.PerimetroGluteal,
		PregasCutaneas:         req.PregasCutaneas,
		EvolucaoPesoMin:        req.EvolucaoPesoMin,
		EvolucaoPesoMax:        req.EvolucaoPesoMax,
		IntervencaoNutricional: req.IntervencaoNutricional,
		PlanoAlimentar:         req.PlanoAlimentar,
		CreatedBy:              createdBy,
		Estado:                 estadoSubmissao(createdBy),
	}

	if err := fillFichaNutricaoFromUtenteData(&ficha); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Utente inválido ou dados do processo inexistentes"})
		return
	}

	if err := config.DB.Create(&ficha).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, ficha)
}

func UpdateFichaNutricao(c *gin.Context) {
	var req UpdateFichaNutricaoRequest
	id := c.Param("id")

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	var ficha models.FichaNutricao
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
	if req.MotivoConsulta != nil {
		ficha.MotivoConsulta = *req.MotivoConsulta
	}
	if req.AntecedentesPessoais != nil {
		ficha.AntecedentesPessoais = *req.AntecedentesPessoais
	}
	if req.AntecedentesFamiliares != nil {
		ficha.AntecedentesFamiliares = *req.AntecedentesFamiliares
	}
	if req.MedicacaoHabitual != nil {
		ficha.MedicacaoHabitual = *req.MedicacaoHabitual
	}
	if req.AlergiasIntolerancias != nil {
		ficha.AlergiasIntolerancias = *req.AlergiasIntolerancias
	}
	if req.AtividadeFisica != nil {
		ficha.AtividadeFisica = *req.AtividadeFisica
	}
	if req.HabitosTabacos != nil {
		ficha.HabitosTabacos = *req.HabitosTabacos
	}
	if req.HabitosAlcoolicos != nil {
		ficha.HabitosAlcoolicos = *req.HabitosAlcoolicos
	}
	if req.DadosLaboratoriais != nil {
		ficha.DadosLaboratoriais = *req.DadosLaboratoriais
	}
	if req.EstadoApetite != nil {
		ficha.EstadoApetite = *req.EstadoApetite
	}
	if req.EstadoMastigacao != nil {
		ficha.EstadoMastigacao = *req.EstadoMastigacao
	}
	if req.EstadoDigestao != nil {
		ficha.EstadoDigestao = *req.EstadoDigestao
	}
	if req.EstadoFuncaoGI != nil {
		ficha.EstadoFuncaoGI = *req.EstadoFuncaoGI
	}
	if req.ExameFisicoNutricao != nil {
		ficha.ExameFisicoNutricao = *req.ExameFisicoNutricao
	}
	if req.IngestaoAlimentarHabitual != nil {
		ficha.IngestaoAlimentarHabitual = *req.IngestaoAlimentarHabitual
	}
	if req.IngestaoHidrica != nil {
		ficha.IngestaoHidrica = *req.IngestaoHidrica
	}
	if req.PesoKg != nil {
		ficha.PesoKg = req.PesoKg
	}
	if req.AlturaM != nil {
		ficha.AlturaM = req.AlturaM
	}
	if req.PesoKg != nil || req.AlturaM != nil {
		ficha.IMC = calcularIMC(ficha.PesoKg, ficha.AlturaM)
	}
	if req.MassaGordaPct != nil {
		ficha.MassaGordaPct = req.MassaGordaPct
	}
	if req.MassaMuscularKg != nil {
		ficha.MassaMuscularKg = req.MassaMuscularKg
	}
	if req.PerimetroCintura != nil {
		ficha.PerimetroCintura = req.PerimetroCintura
	}
	if req.PerimetroGluteal != nil {
		ficha.PerimetroGluteal = req.PerimetroGluteal
	}
	if req.PregasCutaneas != nil {
		ficha.PregasCutaneas = *req.PregasCutaneas
	}
	if req.EvolucaoPesoMin != nil {
		ficha.EvolucaoPesoMin = req.EvolucaoPesoMin
	}
	if req.EvolucaoPesoMax != nil {
		ficha.EvolucaoPesoMax = req.EvolucaoPesoMax
	}
	if req.IntervencaoNutricional != nil {
		ficha.IntervencaoNutricional = *req.IntervencaoNutricional
	}
	if req.PlanoAlimentar != nil {
		ficha.PlanoAlimentar = *req.PlanoAlimentar
	}

	if err := config.DB.Save(&ficha).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ficha)
}

func DeleteFichaNutricao(c *gin.Context) {
	id := c.Param("id")

	result := config.DB.Where("id = ?", id).Delete(&models.FichaNutricao{})
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

func ValidarFichaNutricao(c *gin.Context) {
	validarFicha(c, "nutricao")
}
