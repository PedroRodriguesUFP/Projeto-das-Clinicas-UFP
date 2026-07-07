package models

import "time"

type Consulta struct {
	ID              uint      `gorm:"column:id;primaryKey"`
	UtenteID        uint      `gorm:"column:utente_id"`
	TerapeutaID     uint      `gorm:"column:terapeuta_id"`
	SalaID          *uint     `gorm:"column:sala_id"`
	AreaClinicaID   uint      `gorm:"column:area_clinica_id"`
	DataInicio      time.Time `gorm:"column:data_inicio"`
	DataFim         time.Time `gorm:"column:data_fim"`
	Estado          string    `gorm:"column:estado"`
	TipoConsulta    string    `gorm:"column:tipo_consulta;default:'individual'" json:"tipo_consulta"`
	EstadoValidacao string    `gorm:"column:estado_validacao;default:'aprovada'" json:"estado_validacao"`
	CreatedBy       uint      `gorm:"column:created_by"`
	CreatedAt       time.Time `gorm:"column:created_at"`

	Utente      User                `gorm:"foreignKey:UtenteID"`
	Terapeuta   User                `gorm:"foreignKey:TerapeutaID"`
	Sala        Sala                `gorm:"foreignKey:SalaID"`
	AreaClinica AreaClinica         `gorm:"foreignKey:AreaClinicaID"`
	Documentos  []DocumentoConsulta `gorm:"foreignKey:ConsultaID"`
}

func (Consulta) TableName() string {
	return "consultas"
}
