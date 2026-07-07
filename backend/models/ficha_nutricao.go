package models

import "time"

type FichaNutricao struct {
	ID             uint       `gorm:"primaryKey" json:"id"`
	UtenteID       uint       `gorm:"column:utente_id" json:"utente_id"`
	ConsultaID     *uint      `gorm:"column:consulta_id" json:"consulta_id"`
	NomeCompleto   string     `gorm:"column:nome_completo" json:"nome_completo"`
	NumeroProcesso string     `gorm:"column:numero_processo" json:"numero_processo"`
	DataNascimento *time.Time `gorm:"column:data_nascimento" json:"data_nascimento"`

	// Anamnese
	MotivoConsulta         string `gorm:"column:motivo_consulta" json:"motivo_consulta"`
	AntecedentesPessoais   string `gorm:"column:antecedentes_pessoais" json:"antecedentes_pessoais"`
	AntecedentesFamiliares string `gorm:"column:antecedentes_familiares" json:"antecedentes_familiares"`
	MedicacaoHabitual      string `gorm:"column:medicacao_habitual" json:"medicacao_habitual"`
	AlergiasIntolerancias  string `gorm:"column:alergias_intolerancias" json:"alergias_intolerancias"`

	// Estilo de vida
	AtividadeFisica   string `gorm:"column:atividade_fisica" json:"atividade_fisica"`
	HabitosTabacos    string `gorm:"column:habitos_tabagicos" json:"habitos_tabagicos"`
	HabitosAlcoolicos string `gorm:"column:habitos_alcoolicos" json:"habitos_alcoolicos"`

	// Avaliação clínica
	DadosLaboratoriais  string `gorm:"column:dados_laboratoriais" json:"dados_laboratoriais"`
	EstadoApetite       string `gorm:"column:estado_apetite" json:"estado_apetite"`
	EstadoMastigacao    string `gorm:"column:estado_mastigacao" json:"estado_mastigacao"`
	EstadoDigestao      string `gorm:"column:estado_digestao" json:"estado_digestao"`
	EstadoFuncaoGI      string `gorm:"column:estado_funcao_gi" json:"estado_funcao_gi"`
	ExameFisicoNutricao string `gorm:"column:exame_fisico_nutricao" json:"exame_fisico_nutricao"`

	// Ingestão
	IngestaoAlimentarHabitual string `gorm:"column:ingestao_alimentar_habitual" json:"ingestao_alimentar_habitual"`
	IngestaoHidrica           string `gorm:"column:ingestao_hidrica" json:"ingestao_hidrica"`

	// Antropometria
	PesoKg           *float64 `gorm:"column:peso_kg" json:"peso_kg"`
	AlturaM          *float64 `gorm:"column:altura_m" json:"altura_m"`
	IMC              *float64 `gorm:"column:imc" json:"imc"`
	MassaGordaPct    *float64 `gorm:"column:massa_gorda_pct" json:"massa_gorda_pct"`
	MassaMuscularKg  *float64 `gorm:"column:massa_muscular_kg" json:"massa_muscular_kg"`
	PerimetroCintura *float64 `gorm:"column:perimetro_cintura" json:"perimetro_cintura"`
	PerimetroGluteal *float64 `gorm:"column:perimetro_gluteal" json:"perimetro_gluteal"`
	PregasCutaneas   string   `gorm:"column:pregas_cutaneas" json:"pregas_cutaneas"`
	EvolucaoPesoMin  *float64 `gorm:"column:evolucao_peso_min" json:"evolucao_peso_min"`
	EvolucaoPesoMax  *float64 `gorm:"column:evolucao_peso_max" json:"evolucao_peso_max"`

	// Intervenção
	IntervencaoNutricional string `gorm:"column:intervencao_nutricional" json:"intervencao_nutricional"`
	PlanoAlimentar         string `gorm:"column:plano_alimentar" json:"plano_alimentar"`

	CreatedBy uint      `gorm:"column:created_by" json:"created_by"`
	Estado    string    `gorm:"column:estado;default:'aprovada'" json:"estado"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`

	Utente   *Utente   `gorm:"foreignKey:UtenteID;references:UserID" json:"utente,omitempty"`
	Consulta *Consulta `gorm:"foreignKey:ConsultaID" json:"consulta,omitempty"`
	User     *User     `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
}

func (FichaNutricao) TableName() string {
	return "fichas_nutricao"
}
