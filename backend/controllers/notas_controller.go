package controllers

import (
	"clinica-backend/config"
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
)

type NotasPayload struct {
	Notas      string                   `json:"notas"`
	Prescricao []map[string]interface{} `json:"prescricao"`
}

// GET /consultas/:id/notas
func GetNotasByConsulta(c *gin.Context) {
	consultaID := c.Param("id")

	var result struct {
		Notas           string
		PrescricoesJson string
	}

	// Ler diretamente da base de dados
	err := config.DB.Raw("SELECT notas, prescricoes_json FROM notas_consulta WHERE consulta_id = ?", consultaID).Scan(&result).Error
	if err != nil || (result.Notas == "" && result.PrescricoesJson == "") {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notas não encontradas para esta consulta"})
		return
	}

	// Converter a string JSON da base de dados de volta para um array para o React
	var prescricoes []map[string]interface{}
	if result.PrescricoesJson != "" {
		json.Unmarshal([]byte(result.PrescricoesJson), &prescricoes)
	}

	// Devolver no mesmo formato que o React espera
	c.JSON(http.StatusOK, gin.H{
		"notas":      result.Notas,
		"prescricao": prescricoes,
	})
}

// POST /consultas/:id/notas
func SaveNotasConsulta(c *gin.Context) {
	consultaID := c.Param("id")
	var req NotasPayload

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos: " + err.Error()})
		return
	}

	// Converter o array de prescrições em texto JSON para guardar no SQLite
	prescricaoJSON, _ := json.Marshal(req.Prescricao)

	query := `
		INSERT INTO notas_consulta (consulta_id, notas, prescricoes_json, updated_at)
		VALUES (?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT (consulta_id) 
		DO UPDATE SET 
			notas = EXCLUDED.notas,
			prescricoes_json = EXCLUDED.prescricoes_json,
			updated_at = CURRENT_TIMESTAMP
	`

	// Guardar na Base de Dados
	err := config.DB.Exec(query, consultaID, req.Notas, string(prescricaoJSON)).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao guardar nota: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notas guardadas com sucesso!"})
}
