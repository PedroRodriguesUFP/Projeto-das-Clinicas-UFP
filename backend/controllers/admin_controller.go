package controllers

import (
	"fmt"
	"net/http"
	"time"

	"clinica-backend/config"
	"clinica-backend/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// ─── Estatísticas ────────────────────────────────────────────────────────────

type AdminStatsResponse struct {
	TotalUtentes       int64   `json:"total_utentes"`
	TotalTerapeutas    int64   `json:"total_terapeutas"`
	ConsultasHoje      int64   `json:"consultas_hoje"`
	ConsultasSemana    int64   `json:"consultas_semana"`
	ConsultasAgendadas int64   `json:"consultas_agendadas"`
	TaxaFaltas         float64 `json:"taxa_faltas"`
}

func GetAdminStats(c *gin.Context) {
	var stats AdminStatsResponse

	config.DB.Model(&models.Utente{}).Count(&stats.TotalUtentes)
	config.DB.Model(&models.Terapeuta{}).Count(&stats.TotalTerapeutas)

	hoje := time.Now().Truncate(24 * time.Hour)
	config.DB.Model(&models.Consulta{}).
		Where("data_inicio >= ? AND data_inicio < ?", hoje, hoje.Add(24*time.Hour)).
		Count(&stats.ConsultasHoje)

	inicioSemana := hoje.AddDate(0, 0, -int(hoje.Weekday()))
	config.DB.Model(&models.Consulta{}).
		Where("data_inicio >= ?", inicioSemana).
		Count(&stats.ConsultasSemana)

	config.DB.Model(&models.Consulta{}).
		Where("estado = ?", "agendada").
		Count(&stats.ConsultasAgendadas)

	var totalFechadasOuFaltou, totalFaltas int64
	config.DB.Model(&models.Consulta{}).
		Where("estado IN ?", []string{"realizada", "faltou_injustificada", "faltou_justificada"}).
		Count(&totalFechadasOuFaltou)
	config.DB.Model(&models.Consulta{}).
		Where("estado IN ?", []string{"faltou_injustificada", "faltou_justificada"}).
		Count(&totalFaltas)
	if totalFechadasOuFaltou > 0 {
		stats.TaxaFaltas = float64(totalFaltas) / float64(totalFechadasOuFaltou) * 100
	}

	c.JSON(http.StatusOK, stats)
}

// ─── Gestão de utilizadores/staff ────────────────────────────────────────────

type StaffUserResponse struct {
	ID          uint   `json:"id"`
	Nome        string `json:"nome"`
	Email       string `json:"email"`
	Role        string `json:"role"`
	Active      bool   `json:"active"`
	Tipo        string `json:"tipo"`
	AreaClinica string `json:"area_clinica"`
	CreatedAt   string `json:"created_at"`
}

func GetStaffUsers(c *gin.Context) {
	var users []models.User
	if err := config.DB.Where("role != ?", "utente").Order("created_at DESC").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var result []StaffUserResponse
	for _, u := range users {
		entry := StaffUserResponse{
			ID:        u.ID,
			Nome:      u.Nome,
			Email:     u.Email,
			Role:      u.Role,
			Active:    u.Active,
			CreatedAt: u.CreatedAt.Format("2006-01-02"),
		}
		if u.Role == "terapeuta" {
			var t models.Terapeuta
			if config.DB.Preload("AreaClinica").Where("user_id = ?", u.ID).First(&t).Error == nil {
				entry.Tipo = t.Tipo
				if t.AreaClinica.Nome != "" {
					entry.AreaClinica = t.AreaClinica.Nome
				}
			}
		}
		result = append(result, entry)
	}

	c.JSON(http.StatusOK, result)
}

func ToggleUserActive(c *gin.Context) {
	id := c.Param("id")

	callerID, _ := getAuthenticatedUserID(c)
	if id == fmt.Sprintf("%d", callerID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Não pode desativar a sua própria conta"})
		return
	}

	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilizador não encontrado"})
		return
	}
	if user.Role == "utente" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Use o painel de utentes para gerir pacientes"})
		return
	}

	newActive := !user.Active
	config.DB.Model(&user).Update("active", newActive)
	c.JSON(http.StatusOK, gin.H{"active": newActive})
}

type CreateStaffRequest struct {
	Nome     string `json:"nome" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Role     string `json:"role" binding:"required"`
}

func CreateStaffUser(c *gin.Context) {
	var req CreateStaffRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}
	if req.Role != "administrativo" && req.Role != "terapeuta" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Role inválida. Use 'administrativo' ou 'terapeuta'"})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao processar password"})
		return
	}

	user := models.User{
		Nome:          req.Nome,
		Email:         req.Email,
		PasswordHash:  string(hashed),
		Role:          req.Role,
		Active:        true,
		EmailVerified: true,
	}
	if err := config.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email já existe"})
		return
	}

	if req.Role == "terapeuta" {
		t := models.Terapeuta{UserID: user.ID, Tipo: "professor"}
		config.DB.Create(&t)
	}

	c.JSON(http.StatusCreated, StaffUserResponse{
		ID:        user.ID,
		Nome:      user.Nome,
		Email:     user.Email,
		Role:      user.Role,
		Active:    user.Active,
		CreatedAt: user.CreatedAt.Format("2006-01-02"),
	})
}
