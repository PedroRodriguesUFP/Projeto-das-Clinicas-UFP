package models

import "time"

type RegistoClinico struct {
	ID            uint      `gorm:"column:id;primaryKey"`
	ProcessoID    uint      `gorm:"column:processo_id"`
	ConsultaID    *uint     `gorm:"column:consulta_id"`
	AreaClinicaID uint      `gorm:"column:area_clinica_id"`
	Conteudo      string    `gorm:"column:conteudo"`
	CreatedBy     uint      `gorm:"column:created_by"`
	CreatedAt     time.Time `gorm:"column:created_at"`

	AreaClinica AreaClinica `gorm:"foreignKey:AreaClinicaID"`
	CriadoPor   User        `gorm:"foreignKey:CreatedBy"`
}

func (RegistoClinico) TableName() string {
	return "registos_clinicos"
}
