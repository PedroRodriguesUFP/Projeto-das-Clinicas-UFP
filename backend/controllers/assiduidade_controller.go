package controllers

import (
	"clinica-backend/config"
	"clinica-backend/models"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type CreateAssiduidadeRequest struct {
	UtenteID   uint   `json:"utente_id"`
	Data       string `json:"data"`
	Estado     string `json:"estado"`
	Observacao string `json:"observacao"`
}

func isValidAssiduidadeEstado(estado string) bool {
	validStates := map[string]bool{
		"P":  true,
		"A":  true,
		"FJ": true,
		"FI": true,
	}

	return validStates[strings.ToUpper(estado)]
}

func GetAssiduidade(c *gin.Context) {
	var registos []models.Assiduidade
	query := config.DB.Order("id DESC")

	// filtro opcional por utente
	if utenteID := c.Query("utente_id"); utenteID != "" {
		query = query.Where("utente_id = ?", utenteID)
	}

	// filtro opcional por data
	if data := c.Query("data"); data != "" {
		query = query.Where("data = ?", data)
	}

	if err := query.Find(&registos).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, registos)
}

func CreateAssiduidade(c *gin.Context) {
	var req CreateAssiduidadeRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	createdBy, err := getAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	if req.UtenteID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "utente_id é obrigatório"})
		return
	}

	data, err := time.Parse("2006-01-02", req.Data)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data inválida. Use o formato YYYY-MM-DD"})
		return
	}

	estado := strings.ToUpper(strings.TrimSpace(req.Estado))
	if !isValidAssiduidadeEstado(estado) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Estado inválido. Valores permitidos: P, A, FJ, FI",
		})
		return
	}

	reg := models.Assiduidade{
		UtenteID:   req.UtenteID,
		Data:       data,
		Estado:     estado,
		Observacao: req.Observacao,
		CreatedBy:  createdBy,
	}

	if err := config.DB.Create(&reg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, reg)
}
