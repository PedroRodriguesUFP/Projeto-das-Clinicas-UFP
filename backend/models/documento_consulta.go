package models

import "time"

type DocumentoConsulta struct {
	ID          uint      `gorm:"column:id;primaryKey"`
	ConsultaID  uint      `gorm:"column:consulta_id"`
	ArquivoURL  string    `gorm:"column:arquivo_url"`
	NomeArquivo string    `gorm:"column:nome_arquivo"`
	UploadedBy  uint      `gorm:"column:uploaded_by"`
	Estado      string    `gorm:"column:estado;default:'aprovada'"`
	CreatedAt   time.Time `gorm:"column:created_at"`

	UserUpload User `gorm:"foreignKey:UploadedBy"`
}

func (DocumentoConsulta) TableName() string {
	return "documentos_consulta"
}
