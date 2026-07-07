package controllers

import (
	"crypto/rand"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"clinica-backend/config"
	"clinica-backend/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UtenteResponse struct {
	ID             uint   `json:"id"`
	Nome           string `json:"nome"`
	Email          string `json:"email"`
	NumeroProcesso string `json:"numero_processo"`
	Telefone       string `json:"telefone"`
	Morada         string `json:"morada"`
}

type TerapeutaAreaDTO struct {
	TerapeutaID   uint   `json:"terapeuta_id"`
	TerapeutaNome string `json:"terapeuta_nome"`
	AreaClinicaID uint   `json:"area_clinica_id"`
	AreaNome      string `json:"area_nome"`
}

type UtenteDetailResponse struct {
	ID                       uint               `json:"id"`
	Nome                     string             `json:"nome"`
	Email                    string             `json:"email"`
	NumeroProcesso           string             `json:"numero_processo"`
	Telefone                 string             `json:"telefone"`
	Morada                   string             `json:"morada"`
	DataNascimento           *string            `json:"data_nascimento"`
	FotoURL                  *string            `json:"foto_url"`
	TerapeutaResponsavelID   *uint              `json:"terapeuta_responsavel_id"`
	TerapeutaResponsavelNome string             `json:"terapeuta_responsavel_nome"`
	Terapeutas               []TerapeutaAreaDTO `json:"terapeutas"`
}

type UtenteConsultaResponse struct {
	ID            uint   `json:"id"`
	TerapeutaNome string `json:"terapeuta_nome"`
	SalaNome      string `json:"sala_nome"`
	AreaClinica   string `json:"area_clinica"`
	Estado        string `json:"estado"`
	DataInicio    string `json:"data_inicio"`
	DataFim       string `json:"data_fim"`
}

type RegistoClinicoResponse struct {
	ID          uint   `json:"id"`
	ConsultaID  *uint  `json:"consulta_id"`
	AreaClinica string `json:"area_clinica"`
	Conteudo    string `json:"conteudo"`
	CriadoPor   string `json:"criado_por"`
	DataCriacao string `json:"data_criacao"`
}

type RegistoOuDocumentoResponse struct {
	ID          uint   `json:"id"`
	Tipo        string `json:"tipo"` // "registo" ou "documento"
	ConsultaID  *uint  `json:"consulta_id"`
	AreaClinica string `json:"area_clinica"`
	Conteudo    string `json:"conteudo"` // Para registos
	CriadoPor   string `json:"criado_por"`
	DataCriacao string `json:"data_criacao"`
	// Para documentos
	NomeArquivo string `json:"nome_arquivo"`
	ArquivoURL  string `json:"arquivo_url"`
}

func GetUtentes(c *gin.Context) {
	userID, _ := getAuthenticatedUserID(c)
	roleValue, _ := c.Get("userRole")
	userRole, _ := roleValue.(string)

	var utentes []models.Utente
	query := config.DB.
		Preload("User").
		Joins("JOIN users ON users.id = utentes.user_id").
		Where("users.role = ?", "utente")

	if userRole == "terapeuta" {
		// Determinar o ID do professor responsável:
		// se for aluno, usar o supervisor; se for professor, usar o próprio ID
		responsavelID := userID
		var terapeuta models.Terapeuta
		if err := config.DB.Where("user_id = ?", userID).First(&terapeuta).Error; err == nil {
			if terapeuta.Tipo == "aluno" && terapeuta.SupervisorID != nil {
				responsavelID = *terapeuta.SupervisorID
			}
		}

		// Mostrar utentes que têm pelo menos uma consulta com este terapeuta responsável
		query = query.Where(
			"utentes.user_id IN (SELECT DISTINCT utente_id FROM consultas WHERE terapeuta_id = ?)",
			responsavelID,
		)
	}

	if err := query.Find(&utentes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := []UtenteResponse{}
	for _, utente := range utentes {
		numeroProcesso := ""
		telefone := ""
		morada := ""

		if utente.NumeroProcesso != nil {
			numeroProcesso = *utente.NumeroProcesso
		}
		if utente.Telefone != nil {
			telefone = *utente.Telefone
		}
		if utente.Morada != nil {
			morada = *utente.Morada
		}

		response = append(response, UtenteResponse{
			ID:             utente.User.ID,
			Nome:           utente.User.Nome,
			Email:          utente.User.Email,
			NumeroProcesso: numeroProcesso,
			Telefone:       telefone,
			Morada:         morada,
		})
	}

	c.JSON(http.StatusOK, response)
}

func GetUtenteByID(c *gin.Context) {
	id := c.Param("id")

	userID, _ := getAuthenticatedUserID(c)
	roleValue, _ := c.Get("userRole")
	userRole, _ := roleValue.(string)
	if utenteID, err := strconv.ParseUint(id, 10, 64); err == nil {
		uid := uint(utenteID)
		if userRole == "terapeuta" && !terapeutaHasAccessToUtente(userID, uid) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para aceder a este utente"})
			return
		}
		if !alunoHasActiveConsulta(userID, uid) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Acesso só disponível durante uma consulta ativa"})
			return
		}
	}

	var utente models.Utente

	err := config.DB.
		Preload("User").
		Where("user_id = ?", id).
		First(&utente).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Utente não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	numeroProcesso := ""
	telefone := ""
	morada := ""
	var dataNascimento *string

	if utente.NumeroProcesso != nil {
		numeroProcesso = *utente.NumeroProcesso
	}
	if utente.Telefone != nil {
		telefone = *utente.Telefone
	}
	if utente.Morada != nil {
		morada = *utente.Morada
	}
	if utente.DataNascimento != nil {
		formatted := utente.DataNascimento.Format("2006-01-02")
		dataNascimento = &formatted
	}

	// Carregar terapeutas por área
	var utTerapeutas []models.UtenteTerapeuta
	config.DB.Preload("Terapeuta").Preload("AreaClinica").
		Where("utente_id = ?", id).Find(&utTerapeutas)

	terapeutasDTO := []TerapeutaAreaDTO{}
	for _, ut := range utTerapeutas {
		terapeutasDTO = append(terapeutasDTO, TerapeutaAreaDTO{
			TerapeutaID:   ut.TerapeutaID,
			TerapeutaNome: ut.Terapeuta.Nome,
			AreaClinicaID: ut.AreaClinicaID,
			AreaNome:      ut.AreaClinica.Nome,
		})
	}

	response := UtenteDetailResponse{
		ID:             utente.User.ID,
		Nome:           utente.User.Nome,
		Email:          utente.User.Email,
		NumeroProcesso: numeroProcesso,
		Telefone:       telefone,
		Morada:         morada,
		DataNascimento: dataNascimento,
		FotoURL:        utente.FotoURL,
		Terapeutas:     terapeutasDTO,
	}

	var processo models.ProcessoClinico
	if err := config.DB.Preload("TerapeutaResponsavel").Where("utente_id = ?", id).First(&processo).Error; err == nil {
		response.TerapeutaResponsavelID = processo.TerapeutaResponsavelID
		if processo.TerapeutaResponsavel != nil {
			response.TerapeutaResponsavelNome = processo.TerapeutaResponsavel.Nome
		}
	}

	c.JSON(http.StatusOK, response)
}

func GetConsultasByUtenteID(c *gin.Context) {
	id := c.Param("id")

	userID, _ := getAuthenticatedUserID(c)
	roleValue, _ := c.Get("userRole")
	userRole, _ := roleValue.(string)
	if utenteID, err := strconv.ParseUint(id, 10, 64); err == nil {
		uid := uint(utenteID)
		if userRole == "terapeuta" && !terapeutaHasAccessToUtente(userID, uid) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para aceder a este utente"})
			return
		}
		if !alunoHasActiveConsulta(userID, uid) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Acesso só disponível durante uma consulta ativa"})
			return
		}
	}

	if roleValue, exists := c.Get("userRole"); exists {
		if userRole, ok := roleValue.(string); ok && userRole == "utente" {
			authenticatedID, err := getAuthenticatedUserID(c)
			if err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
				return
			}

			if fmt.Sprintf("%d", authenticatedID) != id {
				c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para aceder às consultas deste utente"})
				return
			}
		}
	}

	var consultas []models.Consulta

	err := config.DB.
		Preload("Terapeuta").
		Preload("Sala").
		Preload("AreaClinica").
		Where("utente_id = ?", id).
		Order("data_inicio DESC").
		Find(&consultas).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var response []UtenteConsultaResponse

	for _, consulta := range consultas {
		response = append(response, UtenteConsultaResponse{
			ID:            consulta.ID,
			TerapeutaNome: consulta.Terapeuta.Nome,
			SalaNome:      consulta.Sala.Nome,
			AreaClinica:   consulta.AreaClinica.Nome,
			Estado:        consulta.Estado,
			DataInicio:    consulta.DataInicio.Format("2006-01-02T15:04:05"),
			DataFim:       consulta.DataFim.Format("2006-01-02T15:04:05"),
		})
	}

	c.JSON(http.StatusOK, response)
}

func GetRegistosClinicosByUtenteID(c *gin.Context) {
	id := c.Param("id")

	userID, _ := getAuthenticatedUserID(c)
	roleValue, _ := c.Get("userRole")
	userRole, _ := roleValue.(string)
	if utenteID, err := strconv.ParseUint(id, 10, 64); err == nil {
		uid := uint(utenteID)
		if userRole == "terapeuta" && !terapeutaHasAccessToUtente(userID, uid) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para aceder a este utente"})
			return
		}
		if !alunoHasActiveConsulta(userID, uid) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Acesso só disponível durante uma consulta ativa"})
			return
		}
	}

	var processo models.ProcessoClinico

	err := config.DB.Where("utente_id = ?", id).First(&processo).Error
	if err != nil {
		c.JSON(http.StatusOK, []RegistoOuDocumentoResponse{})
		return
	}

	var registos []models.RegistoClinico

	err = config.DB.
		Preload("AreaClinica").
		Preload("CriadoPor").
		Where("processo_id = ?", processo.ID).
		Order("created_at DESC").
		Find(&registos).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Buscar documentos de consulta do utente
	var documentos []models.DocumentoConsulta
	err = config.DB.
		Preload("UserUpload").
		Joins("JOIN consultas ON consultas.id = documentos_consulta.consulta_id").
		Where("consultas.utente_id = ?", id).
		Order("documentos_consulta.created_at DESC").
		Find(&documentos).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var response []RegistoOuDocumentoResponse

	// Adicionar registos clínicos
	for _, r := range registos {
		response = append(response, RegistoOuDocumentoResponse{
			ID:          r.ID,
			Tipo:        "registo",
			ConsultaID:  r.ConsultaID,
			AreaClinica: r.AreaClinica.Nome,
			Conteudo:    r.Conteudo,
			CriadoPor:   r.CriadoPor.Nome,
			DataCriacao: r.CreatedAt.Format("2006-01-02T15:04:05"),
		})
	}

	// Adicionar documentos de consulta
	for _, d := range documentos {
		response = append(response, RegistoOuDocumentoResponse{
			ID:          d.ID,
			Tipo:        "documento",
			NomeArquivo: d.NomeArquivo,
			ArquivoURL:  d.ArquivoURL,
			CriadoPor:   d.UserUpload.Nome,
			DataCriacao: d.CreatedAt.Format("2006-01-02T15:04:05"),
		})
	}

	// Ordenar por data descendente
	// Usar sorting simples baseado em DataCriacao
	c.JSON(http.StatusOK, response)
}

type CreateUtenteRequest struct {
	Nome           string `json:"nome" binding:"required"`
	Email          string `json:"email" binding:"omitempty,email"`
	NumeroProcesso string `json:"numero_processo"`
	Telefone       string `json:"telefone"`
	Morada         string `json:"morada"`
	DataNascimento string `json:"data_nascimento"` // "2000-01-15"
	Password       string `json:"password" binding:"omitempty,min=8"`
}

type UpdateUtenteRequest struct {
	Nome           string `json:"nome"`
	Email          string `json:"email"`
	NumeroProcesso string `json:"numero_processo"`
	Telefone       string `json:"telefone"`
	Morada         string `json:"morada"`
	DataNascimento string `json:"data_nascimento"` // "2000-01-15"
}

func CreateUtente(c *gin.Context) {
	var req CreateUtenteRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	// Gerar hash da password (fornecida pelo staff, ou aleatória para contas sem login)
	var passwordHash string
	if req.Password != "" {
		hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao processar password"})
			return
		}
		passwordHash = string(hashed)
	} else {
		randomBytes := make([]byte, 32)
		rand.Read(randomBytes)
		hashed, _ := bcrypt.GenerateFromPassword(randomBytes, bcrypt.DefaultCost)
		passwordHash = string(hashed)
	}

	// Criar User
	user := models.User{
		Nome:          req.Nome,
		Email:         req.Email,
		PasswordHash:  passwordHash,
		Role:          "utente",
		Active:        true,
		EmailVerified: true, // contas criadas por staff não precisam verificar email
	}

	if err := config.DB.Create(&user).Error; err != nil {
		if req.Email != "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Email já existe"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	// Criar Utente
	var dataNascimento *time.Time
	if req.DataNascimento != "" {
		parsed, err := time.Parse("2006-01-02", req.DataNascimento)
		if err == nil {
			dataNascimento = &parsed
		}
	}

	numeroProcesso := ""
	if req.NumeroProcesso != "" {
		numeroProcesso = req.NumeroProcesso
	}

	telefone := ""
	if req.Telefone != "" {
		telefone = req.Telefone
	}

	morada := ""
	if req.Morada != "" {
		morada = req.Morada
	}

	utente := models.Utente{
		UserID:         user.ID,
		DataNascimento: dataNascimento,
		NumeroProcesso: &numeroProcesso,
		Telefone:       &telefone,
		Morada:         &morada,
	}

	if err := config.DB.Create(&utente).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Criar ProcessoClinico
	processo := models.ProcessoClinico{
		UtenteID: user.ID,
	}
	if err := config.DB.Create(&processo).Error; err != nil {
		log.Printf("Erro ao criar ProcessoClinico para utente %d: %v", user.ID, err)
	}

	response := UtenteDetailResponse{
		ID:             user.ID,
		Nome:           user.Nome,
		Email:          user.Email,
		NumeroProcesso: numeroProcesso,
		Telefone:       telefone,
		Morada:         morada,
	}

	c.JSON(http.StatusCreated, response)
}

func UpdateUtente(c *gin.Context) {
	id := c.Param("id")

	userID, _ := getAuthenticatedUserID(c)
	roleValue, _ := c.Get("userRole")
	userRole, _ := roleValue.(string)
	if userRole == "utente" {
		if paramID, err := strconv.ParseUint(id, 10, 64); err != nil || uint(paramID) != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para editar este perfil"})
			return
		}
	}

	var req UpdateUtenteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	// Atualizar User
	user := models.User{}
	if err := config.DB.Where("id = ?", id).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utente não encontrado"})
		return
	}

	if req.Nome != "" {
		user.Nome = req.Nome
	}
	if req.Email != "" {
		user.Email = req.Email
	}

	if err := config.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email já existe"})
		return
	}

	// Verificar/Criar Utente se não existir
	utente := models.Utente{}
	err := config.DB.Where("user_id = ?", id).First(&utente).Error

	if err != nil && err.Error() == "record not found" {
		// Se não existe, criar novo registo utente
		utente = models.Utente{
			UserID: user.ID,
		}
		if err := config.DB.Create(&utente).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar perfil de utente"})
			return
		}
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar utente"})
		return
	}

	if req.NumeroProcesso != "" {
		utente.NumeroProcesso = &req.NumeroProcesso
	}
	if req.Telefone != "" {
		utente.Telefone = &req.Telefone
	}
	if req.Morada != "" {
		utente.Morada = &req.Morada
	}
	if req.DataNascimento != "" {
		parsed, err := time.Parse("2006-01-02", req.DataNascimento)
		if err == nil {
			utente.DataNascimento = &parsed
		}
	}

	if err := config.DB.Save(&utente).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := UtenteDetailResponse{
		ID:    user.ID,
		Nome:  user.Nome,
		Email: user.Email,
	}
	if utente.NumeroProcesso != nil {
		response.NumeroProcesso = *utente.NumeroProcesso
	}
	if utente.Telefone != nil {
		response.Telefone = *utente.Telefone
	}
	if utente.Morada != nil {
		response.Morada = *utente.Morada
	}
	if utente.DataNascimento != nil {
		response.DataNascimento = &[]string{utente.DataNascimento.Format("2006-01-02")}[0]
	}
	response.FotoURL = utente.FotoURL

	c.JSON(http.StatusOK, response)
}

func DeleteUtente(c *gin.Context) {
	id := c.Param("id")

	// Eliminar registos dependentes em ordem (respeitar FKs)
	config.DB.Exec("DELETE FROM avaliacoes_objetivas WHERE ficha_id IN (SELECT id FROM fichas_avaliacao WHERE utente_id = ?)", id)
	config.DB.Exec("DELETE FROM documentos_consulta WHERE consulta_id IN (SELECT id FROM consultas WHERE utente_id = ?)", id)
	config.DB.Exec("DELETE FROM registos_clinicos WHERE consulta_id IN (SELECT id FROM consultas WHERE utente_id = ?)", id)
	config.DB.Exec("DELETE FROM consultas WHERE utente_id = ?", id)
	config.DB.Exec("DELETE FROM fichas_avaliacao WHERE utente_id = ?", id)
	config.DB.Exec("DELETE FROM fichas_psicologia WHERE utente_id = ?", id)
	config.DB.Exec("DELETE FROM fichas_terapia_fala WHERE utente_id = ?", id)
	config.DB.Exec("DELETE FROM processos_clinicos WHERE utente_id = ?", id)
	config.DB.Exec("DELETE FROM assiduidade WHERE utente_id = ?", id)
	config.DB.Exec("DELETE FROM utente_terapeutas WHERE utente_id = ?", id)

	// Eliminar Utente
	if err := config.DB.Where("user_id = ?", id).Delete(&models.Utente{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Eliminar User
	if err := config.DB.Delete(&models.User{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Utente eliminado com sucesso"})
}

func UploadAvatar(c *gin.Context) {
	id := c.Param("id")

	userID, _ := getAuthenticatedUserID(c)
	roleValue, _ := c.Get("userRole")
	userRole, _ := roleValue.(string)
	if userRole == "utente" || userRole == "terapeuta" {
		if paramID, err := strconv.ParseUint(id, 10, 64); err != nil || uint(paramID) != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Só pode alterar o seu próprio avatar"})
			return
		}
	}

	// Validar que o utilizador existe
	user := models.User{}
	if err := config.DB.Where("id = ?", id).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilizador não encontrado"})
		return
	}

	// Verificar/Criar Utente se não existir
	utente := models.Utente{}
	err := config.DB.Where("user_id = ?", id).First(&utente).Error
	if err != nil && err.Error() == "record not found" {
		// Se não existe, criar novo registo utente
		utente = models.Utente{
			UserID: user.ID,
		}
		if err := config.DB.Create(&utente).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar perfil de utente"})
			return
		}
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar utente"})
		return
	}

	// Fazer upload do ficheiro
	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ficheiro não fornecido"})
		return
	}

	allowedTypes := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
	}

	contentType := file.Header.Get("Content-Type")
	if contentType == "" || !allowedTypes[contentType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Apenas imagens (JPEG, PNG) são permitidas"})
		return
	}

	// Validar magic bytes — Content-Type é controlado pelo cliente
	{
		src, err := file.Open()
		if err == nil {
			buf := make([]byte, 512)
			n, _ := src.Read(buf)
			src.Close()
			detected := http.DetectContentType(buf[:n])
			if detected != "image/jpeg" && detected != "image/png" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Ficheiro inválido: não é uma imagem real"})
				return
			}
		}
	}

	if file.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ficheiro muito grande (máximo 5MB)"})
		return
	}

	uploadsDir := "uploads/avatars"
	if err := os.MkdirAll(uploadsDir, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar diretório"})
		return
	}

	ext := ".jpeg"
	if contentType == "image/png" {
		ext = ".png"
	}
	filename := fmt.Sprintf("avatar_%d_%d%s", utente.UserID, time.Now().Unix(), ext)
	filePath := filepath.Join(uploadsDir, filename)

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao guardar ficheiro: " + err.Error()})
		return
	}

	fotoURL := fmt.Sprintf("/uploads/avatars/%s", filename)
	if err := config.DB.Model(&utente).Update("foto_url", fotoURL).Error; err != nil {
		os.Remove(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao guardar dados: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Avatar enviado com sucesso",
		"foto_url": fotoURL,
	})
}

type UpdateTerapeutaUtenteRequest struct {
	TerapeutaID   uint `json:"terapeuta_id"`                     // 0 = remover atribuição
	AreaClinicaID uint `json:"area_clinica_id" binding:"required"`
}

func UpdateTerapeutaUtente(c *gin.Context) {
	utenteID := c.Param("id")

	_, err := getAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	roleValue, exists := c.Get("userRole")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role não encontrada no contexto"})
		return
	}

	userRole, ok := roleValue.(string)
	if !ok || userRole == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role inválida no contexto"})
		return
	}

	if userRole != "admin" && userRole != "administrativo" && userRole != "terapeuta" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para alterar o terapeuta"})
		return
	}

	var req UpdateTerapeutaUtenteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos: area_clinica_id é obrigatório"})
		return
	}

	// Verificar se o utente existe
	var utente models.Utente
	if err := config.DB.Where("user_id = ?", utenteID).First(&utente).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utente não encontrado"})
		return
	}

	if req.TerapeutaID == 0 {
		// Remover atribuição desta área
		config.DB.Exec(
			"DELETE FROM utente_terapeutas WHERE utente_id = ? AND area_clinica_id = ?",
			utenteID, req.AreaClinicaID,
		)
	} else {
		// Verificar se o terapeuta é válido e pertence à área
		var terapeuta models.Terapeuta
		if err := config.DB.Preload("User").Where("user_id = ?", req.TerapeutaID).First(&terapeuta).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Terapeuta não encontrado"})
			return
		}
		if !terapeuta.User.Active {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Terapeuta inativo"})
			return
		}

		// Upsert: substituir ou criar atribuição
		if err := config.DB.Exec(`
			INSERT INTO utente_terapeutas (utente_id, terapeuta_id, area_clinica_id)
			VALUES (?, ?, ?)
			ON CONFLICT (utente_id, area_clinica_id) DO UPDATE SET terapeuta_id = EXCLUDED.terapeuta_id
		`, utenteID, req.TerapeutaID, req.AreaClinicaID).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar terapeuta"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Terapeuta atualizado com sucesso"})
}

func GetUtentesDeTerapeuta(c *gin.Context) {
	terapeutaID := c.Param("terapeuta_id")

	type Result struct {
		UtenteID      uint   `json:"utente_id"`
		UtenteNome    string `json:"utente_nome"`
		AreaClinicaID uint   `json:"area_clinica_id"`
		AreaNome      string `json:"area_nome"`
	}

	var results []Result
	config.DB.Raw(`
		SELECT DISTINCT utente_id, utente_nome, area_clinica_id, area_nome FROM (
			SELECT c.utente_id, u.nome AS utente_nome, c.area_clinica_id, a.nome AS area_nome
			FROM consultas c
			JOIN users u ON u.id = c.utente_id
			JOIN areas_clinicas a ON a.id = c.area_clinica_id
			WHERE c.terapeuta_id = ?
			UNION
			SELECT ut.utente_id, u.nome AS utente_nome, ut.area_clinica_id, a.nome AS area_nome
			FROM utente_terapeutas ut
			JOIN users u ON u.id = ut.utente_id
			JOIN areas_clinicas a ON a.id = ut.area_clinica_id
			WHERE ut.terapeuta_id = ?
		) combined
		ORDER BY area_nome, utente_nome
	`, terapeutaID, terapeutaID).Scan(&results)

	if results == nil {
		results = []Result{}
	}

	c.JSON(http.StatusOK, results)
}
