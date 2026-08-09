package models

import "time"

type NotaConsulta struct {
	ID                uint      `json:"id" db:"id"`
	ConsultaID        uint      `json:"consulta_id" db:"consulta_id"`
	Medicamento       string    `json:"medicamento" db:"medicamento"`
	Dosagem           string    `json:"dosagem" db:"dosagem"`
	Frequencia        string    `json:"frequencia" db:"frequencia"`
	Duracao           string    `json:"duracao" db:"duracao"`
	ObservacoesGerais string    `json:"observacoes_gerais" db:"observacoes_gerais"`
	CreatedAt         time.Time `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time `json:"updated_at" db:"updated_at"`
}