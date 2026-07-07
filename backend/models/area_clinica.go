package models

type AreaClinica struct {
	ID    uint   `gorm:"column:id;primaryKey" json:"id"`
	Nome  string `gorm:"column:nome" json:"nome"`
	Ativa bool   `gorm:"column:ativa" json:"ativa"`
}

func (AreaClinica) TableName() string {
	return "areas_clinicas"
}
