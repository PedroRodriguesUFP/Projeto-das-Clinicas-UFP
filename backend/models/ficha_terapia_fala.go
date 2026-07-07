package models

import "time"

type FichaTerapiaFala struct {
	ID                     uint       `gorm:"primaryKey" json:"id"`
	UtenteID               uint       `gorm:"column:utente_id" json:"utente_id"`
	ConsultaID             *uint      `gorm:"column:consulta_id" json:"consulta_id"`
	NomeCompleto           string     `gorm:"column:nome_completo" json:"nome_completo"`
	NumeroProcesso         string     `gorm:"column:numero_processo" json:"numero_processo"`
	DataNascimento         *time.Time `gorm:"column:data_nascimento" json:"data_nascimento"`
	Sexo                   string     `gorm:"column:sexo" json:"sexo"`
	AvaliacaoSubjetiva     string     `gorm:"column:avaliacao_subjetiva" json:"avaliacao_subjetiva"`
	AvaliacaoObjetiva      string     `gorm:"column:avaliacao_objetiva" json:"avaliacao_objetiva"`
	DiagnosticoTerapiaFala string     `gorm:"column:diagnostico_terapia_fala" json:"diagnostico_terapia_fala"`
	ObjetivosPrognostico   string     `gorm:"column:objetivos_prognostico" json:"objetivos_prognostico"`
	PlanoTerapeutico       string     `gorm:"column:plano_terapeutico" json:"plano_terapeutico"`
	PlanoProgressao        string     `gorm:"column:plano_progressao" json:"plano_progressao"`
	CreatedBy              uint       `gorm:"column:created_by" json:"created_by"`
	Estado                 string     `gorm:"column:estado;default:'aprovada'" json:"estado"`
	EstudanteID            *uint      `gorm:"column:estudante_id" json:"estudante_id"`
	CreatedAt              time.Time  `gorm:"column:created_at" json:"created_at"`

	Utente    *Utente   `gorm:"foreignKey:UtenteID;references:UserID" json:"utente,omitempty"`
	Consulta  *Consulta `gorm:"foreignKey:ConsultaID" json:"consulta,omitempty"`
	User      *User     `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
	Estudante *User     `gorm:"foreignKey:EstudanteID;references:ID" json:"estudante,omitempty"`
}

func (FichaTerapiaFala) TableName() string {
	return "fichas_terapia_fala"
}
