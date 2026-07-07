package controllers

import (
	"net/http"
	"time"

	"clinica-backend/config"
	"clinica-backend/models"

	"github.com/gin-gonic/gin"
)

type TerapeutaListItem struct {
	UserID              uint    `json:"user_id"`
	Nome                string  `json:"nome"`
	Email               string  `json:"email"`
	Tipo                string  `json:"tipo"`
	AreaClinicaID       *uint   `json:"area_clinica_id"`
	AreaClinicaNome     string  `json:"area_clinica_nome"`
	NumeroMecanografico *string `json:"numero_mecanografico"`
}

func GetSalas(c *gin.Context) {
	var salas []models.Sala

	if err := config.DB.
		Preload("AreasClinicas").
		Where("ativa = ?", true).
		Order("nome ASC").
		Find(&salas).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, salas)
}

func GetAreasClinicas(c *gin.Context) {
	var areas []models.AreaClinica

	if err := config.DB.Where("ativa = ?", true).Order("nome ASC").Find(&areas).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Garantir que retorna array vazio em vez de null
	if areas == nil {
		areas = []models.AreaClinica{}
	}

	c.JSON(http.StatusOK, areas)
}

func GetTerapeutas(c *gin.Context) {
	var terapeutas []models.Terapeuta

	err := config.DB.
		Preload("User").
		Preload("AreaClinica").
		Joins("JOIN users ON users.id = terapeutas.user_id").
		Where("users.active = ?", true).
		Where("terapeutas.tipo = ?", "professor").
		Order("users.nome ASC").
		Find(&terapeutas).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := make([]TerapeutaListItem, 0, len(terapeutas))
	for _, t := range terapeutas {
		response = append(response, TerapeutaListItem{
			UserID:              t.UserID,
			Nome:                t.User.Nome,
			Email:               t.User.Email,
			Tipo:                t.Tipo,
			AreaClinicaID:       t.AreaClinicaID,
			AreaClinicaNome:     t.AreaClinica.Nome,
			NumeroMecanografico: t.NumeroMecanografico,
		})
	}

	c.JSON(http.StatusOK, response)
}

func GetTerapeutasStaff(c *gin.Context) {
	var terapeutas []models.Terapeuta
	err := config.DB.
		Preload("User").
		Preload("AreaClinica").
		Joins("JOIN users ON users.id = terapeutas.user_id").
		Where("users.active = ?", true).
		Order("terapeutas.tipo ASC, users.nome ASC").
		Find(&terapeutas).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := make([]TerapeutaListItem, 0, len(terapeutas))
	for _, t := range terapeutas {
		response = append(response, TerapeutaListItem{
			UserID:          t.UserID,
			Nome:            t.User.Nome,
			Email:           t.User.Email,
			Tipo:            t.Tipo,
			AreaClinicaID:   t.AreaClinicaID,
			AreaClinicaNome: t.AreaClinica.Nome,
		})
	}
	c.JSON(http.StatusOK, response)
}

func GetTerapeutasByArea(c *gin.Context) {
	areaID := c.Param("area_id")

	var terapeutas []models.Terapeuta

	err := config.DB.
		Preload("User").
		Preload("AreaClinica").
		Joins("JOIN users ON users.id = terapeutas.user_id").
		Where("users.active = ?", true).
		Where("terapeutas.tipo = ?", "professor").
		Where("terapeutas.area_clinica_id = ?", areaID).
		Order("users.nome ASC").
		Find(&terapeutas).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := make([]TerapeutaListItem, 0, len(terapeutas))
	for _, t := range terapeutas {
		response = append(response, TerapeutaListItem{
			UserID:              t.UserID,
			Nome:                t.User.Nome,
			Email:               t.User.Email,
			Tipo:                t.Tipo,
			AreaClinicaID:       t.AreaClinicaID,
			AreaClinicaNome:     t.AreaClinica.Nome,
			NumeroMecanografico: t.NumeroMecanografico,
		})
	}

	c.JSON(http.StatusOK, response)
}

func GetAlunosDisponiveis(c *gin.Context) {
	search := c.Query("search")
	professorUserID := c.GetUint("user_id")

	// Obter a área clínica do professor
	var professor models.Terapeuta
	if err := config.DB.
		Where("user_id = ?", professorUserID).
		First(&professor).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Professor não encontrado"})
		return
	}

	// Se o professor não tem área clínica definida, retorna lista vazia
	if professor.AreaClinicaID == nil {
		c.JSON(http.StatusOK, []gin.H{})
		return
	}

	var alunos []models.Terapeuta

	query := config.DB.
		Joins("JOIN users ON terapeutas.user_id = users.id").
		Where("terapeutas.tipo = ?", "aluno").
		Where("terapeutas.supervisor_id IS NULL").
		Where("terapeutas.area_clinica_id = ?", *professor.AreaClinicaID)

	if search != "" {
		query = query.Where("users.nome ILIKE ? OR users.email ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.
		Preload("User").
		Order("users.nome ASC").
		Find(&alunos).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := make([]gin.H, 0, len(alunos))
	for _, aluno := range alunos {
		response = append(response, gin.H{
			"user_id": aluno.UserID,
			"nome":    aluno.User.Nome,
			"email":   aluno.User.Email,
		})
	}

	c.JSON(http.StatusOK, response)
}

type UpdateAreaClinicaRequest struct {
	AreaClinicaID uint `json:"area_clinica_id" binding:"required"`
}

// UpdateAreaClinica atualiza a área clínica do terapeuta
// Apenas o próprio terapeuta pode atualizar
// Professores podem alterar à vontade
// Alunos só podem alterar uma vez (na primeira vez que faz login)
func UpdateAreaClinica(c *gin.Context) {
	userID := c.GetUint("user_id")
	var req UpdateAreaClinicaRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "area_clinica_id obrigatório"})
		return
	}

	// Buscar terapeuta
	var terapeuta models.Terapeuta
	if err := config.DB.Where("user_id = ?", userID).First(&terapeuta).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Terapeuta não encontrado"})
		return
	}

	// Validar se área clínica existe
	var areaClinica models.AreaClinica
	if err := config.DB.Where("id = ?", req.AreaClinicaID).First(&areaClinica).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Área clínica não encontrada"})
		return
	}

	// Se for aluno e já tem área clínica, não pode alterar
	if terapeuta.Tipo == "aluno" && terapeuta.AreaClinicaID != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Alunos não podem alterar a área clínica após a primeira configuração"})
		return
	}

	// Atualizar área clínica
	terapeuta.AreaClinicaID = &req.AreaClinicaID
	if err := config.DB.Model(&terapeuta).Update("area_clinica_id", terapeuta.AreaClinicaID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar área clínica"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Área clínica atualizada com sucesso",
		"terapeuta": gin.H{
			"user_id":           terapeuta.UserID,
			"tipo":              terapeuta.Tipo,
			"area_clinica_id":   terapeuta.AreaClinicaID,
			"area_clinica_nome": areaClinica.Nome,
		},
	})
}

func UpdateAreaClinicaAdmin(c *gin.Context) {
	userID := c.Param("user_id")

	var req UpdateAreaClinicaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "area_clinica_id é obrigatório"})
		return
	}

	var terapeuta models.Terapeuta
	if err := config.DB.Where("user_id = ?", userID).First(&terapeuta).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Terapeuta não encontrado"})
		return
	}

	var areaClinica models.AreaClinica
	if err := config.DB.First(&areaClinica, req.AreaClinicaID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Área clínica não encontrada"})
		return
	}

	terapeuta.AreaClinicaID = &req.AreaClinicaID
	if err := config.DB.Model(&terapeuta).Update("area_clinica_id", terapeuta.AreaClinicaID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar área clínica"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":           "Área clínica atualizada com sucesso",
		"area_clinica_nome": areaClinica.Nome,
	})
}

type AdicionarAlunoRequest struct {
	AlunoID uint `json:"aluno_id" binding:"required"`
}

func AdicionarAluno(c *gin.Context) {
	professorID := c.GetUint("user_id")
	var req AdicionarAlunoRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "aluno_id obrigatório"})
		return
	}

	professor := models.Terapeuta{}
	if err := config.DB.Where("user_id = ? AND tipo = ?", professorID, "professor").First(&professor).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Só professores podem adicionar alunos"})
		return
	}

	aluno := models.Terapeuta{}
	if err := config.DB.Where("user_id = ? AND tipo = ?", req.AlunoID, "aluno").First(&aluno).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Aluno não encontrado"})
		return
	}

	if aluno.SupervisorID != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Este aluno já tem um supervisor"})
		return
	}

	if err := config.DB.Model(&aluno).Update("supervisor_id", professorID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao adicionar aluno"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Aluno adicionado com sucesso",
		"aluno":   aluno.UserID,
	})
}

func RemoverAluno(c *gin.Context) {
	professorID := c.GetUint("user_id")
	alunoID := c.Param("aluno_id")

	professor := models.Terapeuta{}
	if err := config.DB.Where("user_id = ? AND tipo = ?", professorID, "professor").First(&professor).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Só professores podem remover alunos"})
		return
	}

	aluno := models.Terapeuta{}
	if err := config.DB.Where("user_id = ? AND supervisor_id = ?", alunoID, professorID).First(&aluno).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Aluno não encontrado ou não pertence a este professor"})
		return
	}

	if err := config.DB.Model(&aluno).Update("supervisor_id", nil).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao remover aluno"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Aluno removido com sucesso",
	})
}

func GetAlunosDoProfessor(c *gin.Context) {
	professorID := c.GetUint("user_id")

	type AlunoItem struct {
		UserID      uint       `json:"user_id"`
		Nome        string     `json:"nome"`
		Email       string     `json:"email"`
		LastLoginAt *time.Time `json:"last_login_at"`
	}

	var results []AlunoItem
	config.DB.Raw(`
		SELECT t.user_id, u.nome, u.email, u.last_login_at
		FROM terapeutas t
		JOIN users u ON u.id = t.user_id
		WHERE t.supervisor_id = ?
		ORDER BY u.nome ASC
	`, professorID).Scan(&results)

	if results == nil {
		results = []AlunoItem{}
	}

	c.JSON(http.StatusOK, results)
}

func GetAlunos(c *gin.Context) {
	type AlunoItem struct {
		UserID         uint       `json:"user_id"`
		Nome           string     `json:"nome"`
		Email          string     `json:"email"`
		AreaClinica    string     `json:"area_clinica"`
		SupervisorNome string     `json:"supervisor_nome"`
		LastLoginAt    *time.Time `json:"last_login_at"`
	}

	var results []AlunoItem
	config.DB.Raw(`
		SELECT t.user_id, u.nome, u.email,
		       COALESCE(a.nome, '') AS area_clinica,
		       COALESCE(sup.nome, '') AS supervisor_nome,
		       u.last_login_at
		FROM terapeutas t
		JOIN users u ON u.id = t.user_id
		LEFT JOIN areas_clinicas a ON a.id = t.area_clinica_id
		LEFT JOIN users sup ON sup.id = t.supervisor_id
		WHERE t.tipo = 'aluno' AND u.active = true
		ORDER BY u.nome ASC
	`).Scan(&results)

	if results == nil {
		results = []AlunoItem{}
	}

	c.JSON(http.StatusOK, results)
}
