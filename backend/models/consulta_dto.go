package models

import "time"

type SimpleEntity struct {
	ID   uint   `json:"id"`
	Nome string `json:"nome"`
}

type DocumentoDTO struct {
	ID          uint      `json:"id"`
	ArquivoURL  string    `json:"arquivo_url"`
	NomeArquivo string    `json:"nome_arquivo"`
	Estado      string    `json:"estado"`
	CreatedAt   time.Time `json:"created_at"`
}

type ConsultaDTO struct {
	ID              uint           `json:"id"`
	UtenteID        uint           `json:"utente_id"`
	TerapeutaID     uint           `json:"terapeuta_id"`
	SalaID          *uint          `json:"sala_id"`
	AreaClinicaID   uint           `json:"area_clinica_id"`
	DataInicio      time.Time      `json:"data_inicio"`
	DataFim         time.Time      `json:"data_fim"`
	Duracao         int            `json:"duracao"` // em minutos
	Estado          string         `json:"estado"`
	TipoConsulta    string         `json:"tipo_consulta"`
	EstadoValidacao string         `json:"estado_validacao"`
	Tipo            string         `json:"tipo"`
	Utente          *SimpleEntity  `json:"utente"`
	Terapeuta       *SimpleEntity  `json:"terapeuta"`
	Sala            *SimpleEntity  `json:"sala"`
	AreaClinica     *SimpleEntity  `json:"area_clinica"`
	Documentos      []DocumentoDTO `json:"documentos,omitempty"`
}

// ConvertToDTO converte uma Consulta para ConsultaDTO
func (c *Consulta) ConvertToDTO() *ConsultaDTO {
	duracao := 0
	if !c.DataFim.IsZero() && !c.DataInicio.IsZero() {
		duracao = int(c.DataFim.Sub(c.DataInicio).Minutes())
	}

	utente := &SimpleEntity{
		ID:   c.Utente.ID,
		Nome: c.Utente.Nome,
	}

	terapeuta := &SimpleEntity{
		ID:   c.Terapeuta.ID,
		Nome: c.Terapeuta.Nome,
	}

	var sala *SimpleEntity
	if c.SalaID != nil && c.Sala.ID != 0 {
		sala = &SimpleEntity{ID: c.Sala.ID, Nome: c.Sala.Nome}
	}

	areaClinica := &SimpleEntity{
		ID:   c.AreaClinica.ID,
		Nome: c.AreaClinica.Nome,
	}

	// Converter documentos
	documentos := []DocumentoDTO{}
	for _, doc := range c.Documentos {
		documentos = append(documentos, DocumentoDTO{
			ID:          doc.ID,
			ArquivoURL:  doc.ArquivoURL,
			NomeArquivo: doc.NomeArquivo,
			Estado:      doc.Estado,
			CreatedAt:   doc.CreatedAt,
		})
	}

	return &ConsultaDTO{
		ID:              c.ID,
		UtenteID:        c.UtenteID,
		TerapeutaID:     c.TerapeutaID,
		SalaID:          c.SalaID,
		AreaClinicaID:   c.AreaClinicaID,
		DataInicio:      c.DataInicio,
		DataFim:         c.DataFim,
		Duracao:         duracao,
		Estado:          c.Estado,
		TipoConsulta:    c.TipoConsulta,
		EstadoValidacao: c.EstadoValidacao,
		Tipo:            "Consulta",
		Utente:          utente,
		Terapeuta:       terapeuta,
		Sala:            sala,
		AreaClinica:     areaClinica,
		Documentos:      documentos,
	}
}
