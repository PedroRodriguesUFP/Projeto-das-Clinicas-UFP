package models

import "time"

type AvaliacaoObjetiva struct {
    ID               uint      `gorm:"primaryKey"`
    FichaID          uint      `gorm:"column:ficha_id"`
    TipoTeste        string    `gorm:"column:tipo_teste"`
    Valor            string    `gorm:"column:valor"`
    Data             *time.Time `gorm:"column:data"`
    ReavaliacaoValor string    `gorm:"column:reavaliacao_valor"`
    ReavaliacaoData  *time.Time `gorm:"column:reavaliacao_data"`
}

func (AvaliacaoObjetiva) TableName() string {
    return "avaliacoes_objetivas"
}
