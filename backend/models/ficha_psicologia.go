package models

import "time"

type FichaPsicologia struct {
	ID             uint       `gorm:"primaryKey" json:"id"`
	UtenteID       uint       `gorm:"column:utente_id" json:"utente_id"`
	ConsultaID     *uint      `gorm:"column:consulta_id" json:"consulta_id"`
	NomeCompleto   string     `gorm:"column:nome_completo" json:"nome_completo"`
	NumeroProcesso string     `gorm:"column:numero_processo" json:"numero_processo"`
	DataNascimento *time.Time `gorm:"column:data_nascimento" json:"data_nascimento"`

	// Section I: Identification
	DataContacto            *time.Time `gorm:"column:data_contacto" json:"data_contacto"`
	LocalContacto           string     `gorm:"column:local_contacto" json:"local_contacto"`
	Modalidade              string     `gorm:"column:modalidade" json:"modalidade"`
	Contacto                string     `gorm:"column:contacto" json:"contacto"`
	ProfissionalResponsavel string     `gorm:"column:profissional_responsavel" json:"profissional_responsavel"`
	OrigemContacto          string     `gorm:"column:origem_contacto" json:"origem_contacto"`
	EntidadeReferencia      string     `gorm:"column:entidade_referencia" json:"entidade_referencia"`
	Enquadramento           string     `gorm:"column:enquadramento" json:"enquadramento"`

	// Section II: Reason for seeking help
	MotivoDescricao      string `gorm:"column:motivo_descricao;type:text" json:"motivo_descricao"`
	InicioProblema       string `gorm:"column:inicio_problema;type:text" json:"inicio_problema"`
	DuracaoEvolucao      string `gorm:"column:duracao_evolucao;type:text" json:"duracao_evolucao"`
	EventosPrecipitantes string `gorm:"column:eventos_precipitantes;type:text" json:"eventos_precipitantes"`
	ImpactoFuncionamento string `gorm:"column:impacto_funcionamento;type:text" json:"impacto_funcionamento"`

	// Section III: Community and relational context
	ContextoElementos         string `gorm:"column:contexto_elementos;type:text" json:"contexto_elementos"`
	ContextoDescricao         string `gorm:"column:contexto_descricao;type:text" json:"contexto_descricao"`
	IndicadoresClinicos       string `gorm:"column:indicadores_clinicos;type:text" json:"indicadores_clinicos"`
	IndicadoresDescricao      string `gorm:"column:indicadores_descricao;type:text" json:"indicadores_descricao"`
	EstadoMentalAparencia     string `gorm:"column:estado_mental_aparencia;type:text" json:"estado_mental_aparencia"`
	EstadoMentalDiscurso      string `gorm:"column:estado_mental_discurso;type:text" json:"estado_mental_discurso"`
	EstadoMentalHumor         string `gorm:"column:estado_mental_humor;type:text" json:"estado_mental_humor"`
	EstadoMentalPensamento    string `gorm:"column:estado_mental_pensamento;type:text" json:"estado_mental_pensamento"`
	EstadoMentalOrientacao    string `gorm:"column:estado_mental_orientacao;type:text" json:"estado_mental_orientacao"`
	EstadoMentalInsight       string `gorm:"column:estado_mental_insight;type:text" json:"estado_mental_insight"`
	FuncionamentoPessoal      string `gorm:"column:funcionamento_pessoal;type:text" json:"funcionamento_pessoal"`
	FuncionamentoSocial       string `gorm:"column:funcionamento_social;type:text" json:"funcionamento_social"`
	FuncionamentoProfissional string `gorm:"column:funcionamento_profissional;type:text" json:"funcionamento_profissional"`
	RedeSuporte               string `gorm:"column:rede_suporte;type:text" json:"rede_suporte"`

	// Section IV: Expectations and support request
	ExpectativasServico     string `gorm:"column:expectativas_servico;type:text" json:"expectativas_servico"`
	RepresentacoesPsicologo string `gorm:"column:representacoes_psicologo;type:text" json:"representacoes_psicologo"`

	// Section V: Risk and vulnerability assessment
	RiscoIndicadores   string `gorm:"column:risco_indicadores;type:text" json:"risco_indicadores"`
	RiscoDescricao     string `gorm:"column:risco_descricao;type:text" json:"risco_descricao"`
	RiscoAcaoAdotada   string `gorm:"column:risco_acao_adotada;type:text" json:"risco_acao_adotada"`
	RiscoFundamentacao string `gorm:"column:risco_fundamentacao;type:text" json:"risco_fundamentacao"`

	// Section VI: Information provided to client
	InfoEsclarecida string `gorm:"column:info_esclarecida;type:text" json:"info_esclarecida"`
	InfoObservacoes string `gorm:"column:info_observacoes;type:text" json:"info_observacoes"`

	// Section VII: Technical decision and proposed pathway
	DecisaoTecnica      string `gorm:"column:decisao_tecnica;type:text" json:"decisao_tecnica"`
	DecisaoJustificacao string `gorm:"column:decisao_justificacao;type:text" json:"decisao_justificacao"`

	// Section VIII: Inter-institutional articulation
	ArticulacaoEntidades     string `gorm:"column:articulacao_entidades;type:text" json:"articulacao_entidades"`
	ArticulacaoConsentimento string `gorm:"column:articulacao_consentimento" json:"articulacao_consentimento"`
	ArticulacaoNotas         string `gorm:"column:articulacao_notas;type:text" json:"articulacao_notas"`

	// Section IX: Technical preliminary impression
	ImpressaoDescritiva string `gorm:"column:impressao_descritiva;type:text" json:"impressao_descritiva"`
	DimensoesAprofundar string `gorm:"column:dimensoes_aprofundar;type:text" json:"dimensoes_aprofundar"`

	// Section X: Supervision
	SupervisaoDiscutido bool       `gorm:"column:supervisao_discutido" json:"supervisao_discutido"`
	SupervisaoData      *time.Time `gorm:"column:supervisao_data" json:"supervisao_data"`
	SupervisaoSintese   string     `gorm:"column:supervisao_sintese;type:text" json:"supervisao_sintese"`

	CreatedBy uint      `gorm:"column:created_by" json:"created_by"`
	Estado    string    `gorm:"column:estado;default:'aprovada'" json:"estado"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`

	Utente   *Utente   `gorm:"foreignKey:UtenteID;references:UserID" json:"utente,omitempty"`
	Consulta *Consulta `gorm:"foreignKey:ConsultaID" json:"consulta,omitempty"`
	User     *User     `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
}

func (FichaPsicologia) TableName() string {
	return "fichas_psicologia"
}
