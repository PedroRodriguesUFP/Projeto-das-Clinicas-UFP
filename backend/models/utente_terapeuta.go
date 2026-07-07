package models

import "time"

type UtenteTerapeuta struct {
	UtenteID      uint      `gorm:"column:utente_id;primaryKey"`
	TerapeutaID   uint      `gorm:"column:terapeuta_id"`
	AreaClinicaID uint      `gorm:"column:area_clinica_id;primaryKey"`
	CreatedAt     time.Time `gorm:"column:created_at"`

	Terapeuta   User        `gorm:"foreignKey:TerapeutaID;references:ID"`
	AreaClinica AreaClinica `gorm:"foreignKey:AreaClinicaID;references:ID"`
}

func (UtenteTerapeuta) TableName() string {
	return "utente_terapeutas"
}
