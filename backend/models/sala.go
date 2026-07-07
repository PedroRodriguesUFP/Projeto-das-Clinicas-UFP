package models

type Sala struct {
	ID            uint          `gorm:"column:id;primaryKey" json:"id"`
	Nome          string        `gorm:"column:nome" json:"nome"`
	Descricao     *string       `gorm:"column:descricao" json:"descricao"`
	Ativa         bool          `gorm:"column:ativa" json:"ativa"`
	AreasClinicas []AreaClinica `gorm:"many2many:sala_area_clinica" json:"areas_clinicas"`
}

func (Sala) TableName() string {
	return "salas"
}
