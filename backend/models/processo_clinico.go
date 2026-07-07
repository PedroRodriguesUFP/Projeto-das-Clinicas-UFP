package models

import "time"

type ProcessoClinico struct {
	ID                     uint      `gorm:"column:id;primaryKey"`
	UtenteID               uint      `gorm:"column:utente_id"`
	TerapeutaResponsavelID *uint     `gorm:"column:terapeuta_responsavel_id"`
	CreatedAt              time.Time `gorm:"column:created_at"`
	Ativo                  bool      `gorm:"column:ativo"`

	TerapeutaResponsavel *User `gorm:"foreignKey:TerapeutaResponsavelID;references:ID"`
}

func (ProcessoClinico) TableName() string {
	return "processos_clinicos"
}
