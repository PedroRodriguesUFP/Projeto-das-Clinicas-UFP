package controllers

import (
	"net/http"
	"time"

	"clinica-backend/config"
	"clinica-backend/models"

	"github.com/gin-gonic/gin"
)

type CreateFichaPsicologiaRequest struct {
	UtenteID                  uint    `json:"utente_id" binding:"required"`
	ConsultaID                *uint   `json:"consulta_id"`
	DataContacto              *string `json:"data_contacto"`
	LocalContacto             string  `json:"local_contacto"`
	Modalidade                string  `json:"modalidade"`
	Contacto                  string  `json:"contacto"`
	ProfissionalResponsavel   string  `json:"profissional_responsavel"`
	OrigemContacto            string  `json:"origem_contacto"`
	EntidadeReferencia        string  `json:"entidade_referencia"`
	Enquadramento             string  `json:"enquadramento"`
	MotivoDescricao           string  `json:"motivo_descricao"`
	InicioProblema            string  `json:"inicio_problema"`
	DuracaoEvolucao           string  `json:"duracao_evolucao"`
	EventosPrecipitantes      string  `json:"eventos_precipitantes"`
	ImpactoFuncionamento      string  `json:"impacto_funcionamento"`
	ContextoElementos         string  `json:"contexto_elementos"`
	ContextoDescricao         string  `json:"contexto_descricao"`
	IndicadoresClinicos       string  `json:"indicadores_clinicos"`
	IndicadoresDescricao      string  `json:"indicadores_descricao"`
	EstadoMentalAparencia     string  `json:"estado_mental_aparencia"`
	EstadoMentalDiscurso      string  `json:"estado_mental_discurso"`
	EstadoMentalHumor         string  `json:"estado_mental_humor"`
	EstadoMentalPensamento    string  `json:"estado_mental_pensamento"`
	EstadoMentalOrientacao    string  `json:"estado_mental_orientacao"`
	EstadoMentalInsight       string  `json:"estado_mental_insight"`
	FuncionamentoPessoal      string  `json:"funcionamento_pessoal"`
	FuncionamentoSocial       string  `json:"funcionamento_social"`
	FuncionamentoProfissional string  `json:"funcionamento_profissional"`
	RedeSuporte               string  `json:"rede_suporte"`
	ExpectativasServico       string  `json:"expectativas_servico"`
	RepresentacoesPsicologo   string  `json:"representacoes_psicologo"`
	RiscoIndicadores          string  `json:"risco_indicadores"`
	RiscoDescricao            string  `json:"risco_descricao"`
	RiscoAcaoAdotada          string  `json:"risco_acao_adotada"`
	RiscoFundamentacao        string  `json:"risco_fundamentacao"`
	InfoEsclarecida           string  `json:"info_esclarecida"`
	InfoObservacoes           string  `json:"info_observacoes"`
	DecisaoTecnica            string  `json:"decisao_tecnica"`
	DecisaoJustificacao       string  `json:"decisao_justificacao"`
	ArticulacaoEntidades      string  `json:"articulacao_entidades"`
	ArticulacaoConsentimento  string  `json:"articulacao_consentimento"`
	ArticulacaoNotas          string  `json:"articulacao_notas"`
	ImpressaoDescritiva       string  `json:"impressao_descritiva"`
	DimensoesAprofundar       string  `json:"dimensoes_aprofundar"`
	SupervisaoDiscutido       bool    `json:"supervisao_discutido"`
	SupervisaoData            *string `json:"supervisao_data"`
	SupervisaoSintese         string  `json:"supervisao_sintese"`
}

type UpdateFichaPsicologiaRequest struct {
	DataContacto              *string `json:"data_contacto"`
	LocalContacto             *string `json:"local_contacto"`
	Modalidade                *string `json:"modalidade"`
	Contacto                  *string `json:"contacto"`
	ProfissionalResponsavel   *string `json:"profissional_responsavel"`
	OrigemContacto            *string `json:"origem_contacto"`
	EntidadeReferencia        *string `json:"entidade_referencia"`
	Enquadramento             *string `json:"enquadramento"`
	MotivoDescricao           *string `json:"motivo_descricao"`
	InicioProblema            *string `json:"inicio_problema"`
	DuracaoEvolucao           *string `json:"duracao_evolucao"`
	EventosPrecipitantes      *string `json:"eventos_precipitantes"`
	ImpactoFuncionamento      *string `json:"impacto_funcionamento"`
	ContextoElementos         *string `json:"contexto_elementos"`
	ContextoDescricao         *string `json:"contexto_descricao"`
	IndicadoresClinicos       *string `json:"indicadores_clinicos"`
	IndicadoresDescricao      *string `json:"indicadores_descricao"`
	EstadoMentalAparencia     *string `json:"estado_mental_aparencia"`
	EstadoMentalDiscurso      *string `json:"estado_mental_discurso"`
	EstadoMentalHumor         *string `json:"estado_mental_humor"`
	EstadoMentalPensamento    *string `json:"estado_mental_pensamento"`
	EstadoMentalOrientacao    *string `json:"estado_mental_orientacao"`
	EstadoMentalInsight       *string `json:"estado_mental_insight"`
	FuncionamentoPessoal      *string `json:"funcionamento_pessoal"`
	FuncionamentoSocial       *string `json:"funcionamento_social"`
	FuncionamentoProfissional *string `json:"funcionamento_profissional"`
	RedeSuporte               *string `json:"rede_suporte"`
	ExpectativasServico       *string `json:"expectativas_servico"`
	RepresentacoesPsicologo   *string `json:"representacoes_psicologo"`
	RiscoIndicadores          *string `json:"risco_indicadores"`
	RiscoDescricao            *string `json:"risco_descricao"`
	RiscoAcaoAdotada          *string `json:"risco_acao_adotada"`
	RiscoFundamentacao        *string `json:"risco_fundamentacao"`
	InfoEsclarecida           *string `json:"info_esclarecida"`
	InfoObservacoes           *string `json:"info_observacoes"`
	DecisaoTecnica            *string `json:"decisao_tecnica"`
	DecisaoJustificacao       *string `json:"decisao_justificacao"`
	ArticulacaoEntidades      *string `json:"articulacao_entidades"`
	ArticulacaoConsentimento  *string `json:"articulacao_consentimento"`
	ArticulacaoNotas          *string `json:"articulacao_notas"`
	ImpressaoDescritiva       *string `json:"impressao_descritiva"`
	DimensoesAprofundar       *string `json:"dimensoes_aprofundar"`
	SupervisaoDiscutido       *bool   `json:"supervisao_discutido"`
	SupervisaoData            *string `json:"supervisao_data"`
	SupervisaoSintese         *string `json:"supervisao_sintese"`
}

type utentePsicologiaInfo struct {
	NomeCompleto   string     `gorm:"column:nome_completo"`
	NumeroProcesso string     `gorm:"column:numero_processo"`
	DataNascimento *time.Time `gorm:"column:data_nascimento"`
}

func fillFichaPsicologiaFromUtenteData(ficha *models.FichaPsicologia) error {
	var info utentePsicologiaInfo

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

func GetFichasPsicologia(c *gin.Context) {
	var fichas []models.FichaPsicologia
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
		if err := fillFichaPsicologiaFromUtenteData(&fichas[i]); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, fichas)
}

func GetFichaPsicologiaByID(c *gin.Context) {
	id := c.Param("id")
	var ficha models.FichaPsicologia

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

	if err := fillFichaPsicologiaFromUtenteData(&ficha); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ficha)
}

func CreateFichaPsicologia(c *gin.Context) {
	var req CreateFichaPsicologiaRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	createdBy, err := getAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var dataContacto *time.Time
	if req.DataContacto != nil && *req.DataContacto != "" {
		parsed, err := time.Parse("2006-01-02", *req.DataContacto)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data de contacto inválida. Use o formato YYYY-MM-DD"})
			return
		}
		dataContacto = &parsed
	}

	var supervisaoData *time.Time
	if req.SupervisaoData != nil && *req.SupervisaoData != "" {
		parsed, err := time.Parse("2006-01-02", *req.SupervisaoData)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data de supervisão inválida. Use o formato YYYY-MM-DD"})
			return
		}
		supervisaoData = &parsed
	}

	ficha := models.FichaPsicologia{
		UtenteID:                  req.UtenteID,
		ConsultaID:                req.ConsultaID,
		DataContacto:              dataContacto,
		LocalContacto:             req.LocalContacto,
		Modalidade:                req.Modalidade,
		Contacto:                  req.Contacto,
		ProfissionalResponsavel:   req.ProfissionalResponsavel,
		OrigemContacto:            req.OrigemContacto,
		EntidadeReferencia:        req.EntidadeReferencia,
		Enquadramento:             req.Enquadramento,
		MotivoDescricao:           req.MotivoDescricao,
		InicioProblema:            req.InicioProblema,
		DuracaoEvolucao:           req.DuracaoEvolucao,
		EventosPrecipitantes:      req.EventosPrecipitantes,
		ImpactoFuncionamento:      req.ImpactoFuncionamento,
		ContextoElementos:         req.ContextoElementos,
		ContextoDescricao:         req.ContextoDescricao,
		IndicadoresClinicos:       req.IndicadoresClinicos,
		IndicadoresDescricao:      req.IndicadoresDescricao,
		EstadoMentalAparencia:     req.EstadoMentalAparencia,
		EstadoMentalDiscurso:      req.EstadoMentalDiscurso,
		EstadoMentalHumor:         req.EstadoMentalHumor,
		EstadoMentalPensamento:    req.EstadoMentalPensamento,
		EstadoMentalOrientacao:    req.EstadoMentalOrientacao,
		EstadoMentalInsight:       req.EstadoMentalInsight,
		FuncionamentoPessoal:      req.FuncionamentoPessoal,
		FuncionamentoSocial:       req.FuncionamentoSocial,
		FuncionamentoProfissional: req.FuncionamentoProfissional,
		RedeSuporte:               req.RedeSuporte,
		ExpectativasServico:       req.ExpectativasServico,
		RepresentacoesPsicologo:   req.RepresentacoesPsicologo,
		RiscoIndicadores:          req.RiscoIndicadores,
		RiscoDescricao:            req.RiscoDescricao,
		RiscoAcaoAdotada:          req.RiscoAcaoAdotada,
		RiscoFundamentacao:        req.RiscoFundamentacao,
		InfoEsclarecida:           req.InfoEsclarecida,
		InfoObservacoes:           req.InfoObservacoes,
		DecisaoTecnica:            req.DecisaoTecnica,
		DecisaoJustificacao:       req.DecisaoJustificacao,
		ArticulacaoEntidades:      req.ArticulacaoEntidades,
		ArticulacaoConsentimento:  req.ArticulacaoConsentimento,
		ArticulacaoNotas:          req.ArticulacaoNotas,
		ImpressaoDescritiva:       req.ImpressaoDescritiva,
		DimensoesAprofundar:       req.DimensoesAprofundar,
		SupervisaoDiscutido:       req.SupervisaoDiscutido,
		SupervisaoData:            supervisaoData,
		SupervisaoSintese:         req.SupervisaoSintese,
		CreatedBy:                 createdBy,
		Estado:                    estadoSubmissao(createdBy),
	}

	if err := fillFichaPsicologiaFromUtenteData(&ficha); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Utente inválido ou dados do processo inexistentes"})
		return
	}

	if err := config.DB.Create(&ficha).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, ficha)
}

func UpdateFichaPsicologia(c *gin.Context) {
	var req UpdateFichaPsicologiaRequest
	id := c.Param("id")

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	var ficha models.FichaPsicologia
	if err := config.DB.First(&ficha, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ficha não encontrada"})
		return
	}

	if req.DataContacto != nil && *req.DataContacto != "" {
		parsed, err := time.Parse("2006-01-02", *req.DataContacto)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data de contacto inválida. Use o formato YYYY-MM-DD"})
			return
		}
		ficha.DataContacto = &parsed
	}

	if req.SupervisaoData != nil && *req.SupervisaoData != "" {
		parsed, err := time.Parse("2006-01-02", *req.SupervisaoData)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data de supervisão inválida. Use o formato YYYY-MM-DD"})
			return
		}
		ficha.SupervisaoData = &parsed
	}

	if req.LocalContacto != nil {
		ficha.LocalContacto = *req.LocalContacto
	}
	if req.Modalidade != nil {
		ficha.Modalidade = *req.Modalidade
	}
	if req.Contacto != nil {
		ficha.Contacto = *req.Contacto
	}
	if req.ProfissionalResponsavel != nil {
		ficha.ProfissionalResponsavel = *req.ProfissionalResponsavel
	}
	if req.OrigemContacto != nil {
		ficha.OrigemContacto = *req.OrigemContacto
	}
	if req.EntidadeReferencia != nil {
		ficha.EntidadeReferencia = *req.EntidadeReferencia
	}
	if req.Enquadramento != nil {
		ficha.Enquadramento = *req.Enquadramento
	}
	if req.MotivoDescricao != nil {
		ficha.MotivoDescricao = *req.MotivoDescricao
	}
	if req.InicioProblema != nil {
		ficha.InicioProblema = *req.InicioProblema
	}
	if req.DuracaoEvolucao != nil {
		ficha.DuracaoEvolucao = *req.DuracaoEvolucao
	}
	if req.EventosPrecipitantes != nil {
		ficha.EventosPrecipitantes = *req.EventosPrecipitantes
	}
	if req.ImpactoFuncionamento != nil {
		ficha.ImpactoFuncionamento = *req.ImpactoFuncionamento
	}
	if req.ContextoElementos != nil {
		ficha.ContextoElementos = *req.ContextoElementos
	}
	if req.ContextoDescricao != nil {
		ficha.ContextoDescricao = *req.ContextoDescricao
	}
	if req.IndicadoresClinicos != nil {
		ficha.IndicadoresClinicos = *req.IndicadoresClinicos
	}
	if req.IndicadoresDescricao != nil {
		ficha.IndicadoresDescricao = *req.IndicadoresDescricao
	}
	if req.EstadoMentalAparencia != nil {
		ficha.EstadoMentalAparencia = *req.EstadoMentalAparencia
	}
	if req.EstadoMentalDiscurso != nil {
		ficha.EstadoMentalDiscurso = *req.EstadoMentalDiscurso
	}
	if req.EstadoMentalHumor != nil {
		ficha.EstadoMentalHumor = *req.EstadoMentalHumor
	}
	if req.EstadoMentalPensamento != nil {
		ficha.EstadoMentalPensamento = *req.EstadoMentalPensamento
	}
	if req.EstadoMentalOrientacao != nil {
		ficha.EstadoMentalOrientacao = *req.EstadoMentalOrientacao
	}
	if req.EstadoMentalInsight != nil {
		ficha.EstadoMentalInsight = *req.EstadoMentalInsight
	}
	if req.FuncionamentoPessoal != nil {
		ficha.FuncionamentoPessoal = *req.FuncionamentoPessoal
	}
	if req.FuncionamentoSocial != nil {
		ficha.FuncionamentoSocial = *req.FuncionamentoSocial
	}
	if req.FuncionamentoProfissional != nil {
		ficha.FuncionamentoProfissional = *req.FuncionamentoProfissional
	}
	if req.RedeSuporte != nil {
		ficha.RedeSuporte = *req.RedeSuporte
	}
	if req.ExpectativasServico != nil {
		ficha.ExpectativasServico = *req.ExpectativasServico
	}
	if req.RepresentacoesPsicologo != nil {
		ficha.RepresentacoesPsicologo = *req.RepresentacoesPsicologo
	}
	if req.RiscoIndicadores != nil {
		ficha.RiscoIndicadores = *req.RiscoIndicadores
	}
	if req.RiscoDescricao != nil {
		ficha.RiscoDescricao = *req.RiscoDescricao
	}
	if req.RiscoAcaoAdotada != nil {
		ficha.RiscoAcaoAdotada = *req.RiscoAcaoAdotada
	}
	if req.RiscoFundamentacao != nil {
		ficha.RiscoFundamentacao = *req.RiscoFundamentacao
	}
	if req.InfoEsclarecida != nil {
		ficha.InfoEsclarecida = *req.InfoEsclarecida
	}
	if req.InfoObservacoes != nil {
		ficha.InfoObservacoes = *req.InfoObservacoes
	}
	if req.DecisaoTecnica != nil {
		ficha.DecisaoTecnica = *req.DecisaoTecnica
	}
	if req.DecisaoJustificacao != nil {
		ficha.DecisaoJustificacao = *req.DecisaoJustificacao
	}
	if req.ArticulacaoEntidades != nil {
		ficha.ArticulacaoEntidades = *req.ArticulacaoEntidades
	}
	if req.ArticulacaoConsentimento != nil {
		ficha.ArticulacaoConsentimento = *req.ArticulacaoConsentimento
	}
	if req.ArticulacaoNotas != nil {
		ficha.ArticulacaoNotas = *req.ArticulacaoNotas
	}
	if req.ImpressaoDescritiva != nil {
		ficha.ImpressaoDescritiva = *req.ImpressaoDescritiva
	}
	if req.DimensoesAprofundar != nil {
		ficha.DimensoesAprofundar = *req.DimensoesAprofundar
	}
	if req.SupervisaoDiscutido != nil {
		ficha.SupervisaoDiscutido = *req.SupervisaoDiscutido
	}
	if req.SupervisaoSintese != nil {
		ficha.SupervisaoSintese = *req.SupervisaoSintese
	}

	if err := fillFichaPsicologiaFromUtenteData(&ficha); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := config.DB.Save(&ficha).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ficha)
}

func DeleteFichaPsicologia(c *gin.Context) {
	id := c.Param("id")

	// Eliminar a ficha diretamente por ID
	result := config.DB.Where("id = ?", id).Delete(&models.FichaPsicologia{})
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

func ValidarFichaPsicologia(c *gin.Context) {
	validarFicha(c, "psicologia")
}
