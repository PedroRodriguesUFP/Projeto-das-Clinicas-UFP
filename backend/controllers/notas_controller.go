package controllers

import (
	"clinica-backend/config"
	"clinica-backend/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GET /consultas/:id/notas
func GetNotasByConsulta(c *gin.Context) {
	consultaID := c.Param("id")
	var nota models.NotaConsulta

	// No GORM, usamos o .Where().First() em vez de queries manuais
	if err := config.DB.Where("consulta_id = ?", consultaID).First(&nota).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notas não encontradas para esta consulta"})
		return
	}

	c.JSON(http.StatusOK, nota)
}

// POST /consultas/:id/notas
func SaveNotasConsulta(c *gin.Context) {
	consultaID := c.Param("id")
	var req models.NotaConsulta

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// No GORM, os placeholders usam '?' em vez de '$1, $2'
	query := `
		INSERT INTO notas_consulta (consulta_id, medicamento, dosagem, frequencia, duracao, observacoes_gerais)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT (consulta_id) 
		DO UPDATE SET 
			medicamento = EXCLUDED.medicamento,
			dosagem = EXCLUDED.dosagem,
			frequencia = EXCLUDED.frequencia,
			duracao = EXCLUDED.duracao,
			observacoes_gerais = EXCLUDED.observacoes_gerais,
			updated_at = CURRENT_TIMESTAMP
		RETURNING id;
	`

	// Substituímos o QueryRow() por Raw().Scan()
	err := config.DB.Raw(query, consultaID, req.Medicamento, req.Dosagem, req.Frequencia, req.Duracao, req.ObservacoesGerais).Scan(&req).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao guardar nota"})
		return
	}

	c.JSON(http.StatusOK, req)
}
