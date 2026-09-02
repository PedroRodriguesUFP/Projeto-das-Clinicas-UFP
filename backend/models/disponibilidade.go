package models

import "time" 

type DisponibilidadeTerapeuta struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	TerapeutaID uint   `json:"terapeuta_id"`
	Data        time.Time `json:"-" gorm:"type:date"`        // "2026-08-05"
	HoraInicio  string `json:"hora_inicio"` // "09:00:00"
	HoraFim     string `json:"hora_fim"`    // "13:00:00"
}


func (DisponibilidadeTerapeuta) TableName() string {
	return "disponibilidade_terapeuta"
}