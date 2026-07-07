package models

import "time"

type FichaAvaliacao struct {
	ID                         uint       `gorm:"primaryKey" json:"id"`
	UtenteID                   uint       `gorm:"column:utente_id" json:"utente_id"`
	ConsultaID                 *uint      `gorm:"column:consulta_id" json:"consulta_id"`
	NomeCompleto               string     `gorm:"column:nome_completo" json:"nome_completo"`
	NumeroProcesso             string     `gorm:"column:numero_processo" json:"numero_processo"`
	DataNascimento             *time.Time `gorm:"column:data_nascimento" json:"data_nascimento"`
	Idade                      *uint      `gorm:"column:idade" json:"idade"`
	Sexo                       string     `gorm:"column:sexo" json:"sexo"`
	PesoKg                     *float64   `gorm:"column:peso_kg" json:"peso_kg"`
	AlturaM                    *float64   `gorm:"column:altura_m" json:"altura_m"`
	IMC                        *float64   `gorm:"column:imc" json:"imc"`
	DiagnosticoQueixaPrincipal string     `gorm:"column:diagnostico_queixa_principal" json:"diagnostico_queixa_principal"`
	TipoRegisto                string     `gorm:"column:tipo_registo" json:"tipo_registo"`
	AvaliacaoSubjetiva         string     `gorm:"column:avaliacao_subjetiva" json:"avaliacao_subjetiva"`
	DiagnosticoFisioterapia    string     `gorm:"column:diagnostico_fisioterapia" json:"diagnostico_fisioterapia"`
	ObjetivosPrognostico       string     `gorm:"column:objetivos_prognostico" json:"objetivos_prognostico"`
	PlanoTerapeutico           string     `gorm:"column:plano_terapeutico" json:"plano_terapeutico"`
	PlanoProgressao            string     `gorm:"column:plano_progressao" json:"plano_progressao"`
	HistoriaPessoal            string     `gorm:"column:historia_pessoal" json:"historia_pessoal"`
	Perspetivas                string     `gorm:"column:perspetivas" json:"perspetivas"`
	Limitacoes                 string     `gorm:"column:limitacoes" json:"limitacoes"`
	MCD                        string     `gorm:"column:mcd" json:"mcd"`
	HistoriaCondicao           string     `gorm:"column:historia_condicao" json:"historia_condicao"`
	Medicacao                  string     `gorm:"column:medicacao" json:"medicacao"`
	HistMedAtual               string     `gorm:"column:hist_med_atual" json:"hist_med_atual"`
	HistMedAnterior            string     `gorm:"column:hist_med_anterior" json:"hist_med_anterior"`
	HistMedFamiliar            string     `gorm:"column:hist_med_familiar" json:"hist_med_familiar"`
	SINSS                      string     `gorm:"column:sinss" json:"sinss"`
	CreatedBy                  uint       `gorm:"column:created_by" json:"created_by"`
	Estado                     string     `gorm:"column:estado;default:'aprovada'" json:"estado"`
	CreatedAt                  time.Time  `gorm:"column:created_at" json:"created_at"`

	Utente              *Utente             `gorm:"foreignKey:UtenteID;references:UserID" json:"utente,omitempty"`
	Consulta            *Consulta           `gorm:"foreignKey:ConsultaID" json:"consulta,omitempty"`
	User                *User               `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
	AvaliacoesObjetivas []AvaliacaoObjetiva `gorm:"foreignKey:FichaID" json:"avaliacoes_objetivas,omitempty"`
}

func (FichaAvaliacao) TableName() string {
	return "fichas_avaliacao"
}
