package models

import "time"

type Assiduidade struct {
    ID         uint      `gorm:"primaryKey"`
    UtenteID   uint      `gorm:"column:utente_id"`
    Data       time.Time `gorm:"column:data"`
    Estado     string    `gorm:"column:estado"`
    Observacao string    `gorm:"column:observacao"`
    CreatedBy  uint      `gorm:"column:created_by"`
    CreatedAt  time.Time `gorm:"column:created_at"`
}

func (Assiduidade) TableName() string {
    return "assiduidade"
}
