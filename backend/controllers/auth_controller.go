package controllers

import (
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"clinica-backend/config"
	"clinica-backend/models"
	"clinica-backend/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/time/rate"
)

// loginLimiters guarda um rate limiter por IP: máximo 5 tentativas por minuto
var loginLimiters sync.Map

func getLoginLimiter(ip string) *rate.Limiter {
	if l, ok := loginLimiters.Load(ip); ok {
		return l.(*rate.Limiter)
	}
	l := rate.NewLimiter(rate.Every(time.Minute/5), 5)
	loginLimiters.Store(ip, l)
	return l
}

// verifyEmailLimiters guarda um rate limiter por user_id (como string): máximo 5 tentativas por minuto
var verifyEmailLimiters sync.Map

func getVerifyEmailLimiter(key string) *rate.Limiter {
	if l, ok := verifyEmailLimiters.Load(key); ok {
		return l.(*rate.Limiter)
	}
	l := rate.NewLimiter(rate.Every(time.Minute/5), 5)
	verifyEmailLimiters.Store(key, l)
	return l
}

// generateVerificationCode gera um código de verificação de 6 dígitos
func generateVerificationCode() (string, error) {
	b := make([]byte, 3)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	// Converter para um número entre 100000 e 999999
	code := fmt.Sprintf("%06d", int(uint(b[0])<<16|uint(b[1])<<8|uint(b[2]))%1000000)
	return code, nil
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type RegisterRequest struct {
	Email           string `json:"email" binding:"required,email"`
	Password        string `json:"password" binding:"required,min=6"`
	ConfirmPassword string `json:"confirm_password" binding:"required"`
	NomeCompleto    string `json:"nome_completo" binding:"required"`
	Telefone        string `json:"telefone"` // opcional: associa a uma conta criada pelo agente de voz
}

type GoogleLoginRequest struct {
	IDToken string `json:"id_token" binding:"required"`
}

type LoginResponse struct {
	Token         string `json:"token"`
	UserID        uint   `json:"user_id"`
	Role          string `json:"role"`
	Name          string `json:"name"`
	Email         string `json:"email"`
	Tipo          string `json:"tipo,omitempty"`
	AreaClinicaID *uint  `json:"area_clinica_id,omitempty"`
}

type RegisterResponse struct {
	Message          string `json:"message"`
	UserID           uint   `json:"user_id"`
	Token            string `json:"token,omitempty"`
	Role             string `json:"role"`
	VerificationCode string `json:"verification_code,omitempty"`
}

func getTipoTerapeutaFromEmail(email string) (string, string) {
	email = strings.ToLower(strings.TrimSpace(email))

	if !strings.HasSuffix(email, "@ufp.edu.pt") {
		return "professor", ""
	}

	parts := strings.Split(email, "@")
	if len(parts) == 0 {
		return "professor", ""
	}

	username := parts[0]

	if _, err := strconv.Atoi(username); err == nil {
		return "aluno", username
	}

	return "professor", ""
}

func Login(c *gin.Context) {
	if !getLoginLimiter(c.ClientIP()).Allow() {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "Demasiadas tentativas de login. Tente novamente em breve."})
		return
	}

	var req LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email e password são obrigatórios"})
		return
	}

	var user models.User

	err := config.DB.Where("email = ?", req.Email).First(&user).Error
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email ou password inválidos"})
		return
	}

	if user.Email == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Conta não ativada. Use 'Ativar conta' para definir o seu email e password."})
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email ou password inválidos"})
		return
	}

	if !user.Active {
		c.JSON(http.StatusForbidden, gin.H{"error": "Utilizador inativo"})
		return
	}

	// Verificar se o email foi verificado (não aplicar para contas Google)
	if !user.EmailVerified && user.GoogleSub == nil {
		// Verificar se o código ainda é válido (dentro das 24h)
		if user.VerificationCodeExpiresAt != nil && user.VerificationCodeExpiresAt.After(time.Now()) {
			// Código ainda válido: gerar novo código e reenviar
			newCode, err := generateVerificationCode()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao gerar código de verificação"})
				return
			}

			// Guardar novo código
			config.DB.Model(&user).Updates(map[string]interface{}{
				"verification_code":            newCode,
				"verification_code_expires_at": time.Now().Add(24 * time.Hour),
			})

			// Enviar email com novo código (assíncrono para não bloquear a resposta)
			go func(email, code string) {
				if err := utils.SendVerificationEmail(email, code); err != nil {
					log.Printf("Aviso: Falha ao reenviar email de verificação para %s: %v", email, err)
				}
			}(user.Email, newCode)

			// Retornar 206 indicando que precisa verificar (com novo código enviado)
			c.JSON(206, gin.H{
				"needs_verification": true,
				"email":              user.Email,
				"user_id":            user.ID,
				"message":            "Conta não verificada. Enviámos um novo código para o seu email. Por favor verifique-o para continuar.",
			})
			return
		}

		// Código expirou: conta foi/será apagada
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email ou password inválidos"})
		return
	}

	now := time.Now()
	config.DB.Model(&user).Update("last_login_at", now)

	var tipo string
	var areaClinicaID *uint
	if user.Role == "terapeuta" {
		var terapeuta models.Terapeuta
		if err := config.DB.Where("user_id = ?", user.ID).First(&terapeuta).Error; err != nil {
			log.Printf("Erro ao buscar terapeuta no login normal: %v", err)
		} else {
			tipo = terapeuta.Tipo
			areaClinicaID = terapeuta.AreaClinicaID
		}
	}

	token, err := utils.GenerateAppJWT(user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao gerar token"})
		return
	}

	response := LoginResponse{
		Token:         token,
		UserID:        user.ID,
		Role:          user.Role,
		Name:          user.Nome,
		Email:         user.Email,
		Tipo:          tipo,
		AreaClinicaID: areaClinicaID,
	}

	c.JSON(http.StatusOK, response)
}

// GoogleLogin autentica o utilizador através do Google OAuth
// Requer um id_token válido do Google
// Valida que o email termina em @ufp.edu.pt
func GoogleLogin(c *gin.Context) {
	var req GoogleLoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID token obrigatório"})
		return
	}

	claims, err := utils.VerifyGoogleToken(context.Background(), req.IDToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token Google inválido"})
		return
	}

	if !claims.EmailVerified {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email não verificado no Google"})
		return
	}

	role := "utente"
	if utils.ValidateUFPEmail(claims.Email) {
		role = "terapeuta"
	}

	var user models.User

	result := config.DB.Where("google_sub = ?", claims.Sub).First(&user)
	if result.Error != nil {
		user = models.User{
			Email:         claims.Email,
			Nome:          claims.Name,
			GoogleSub:     &claims.Sub,
			Role:          role,
			Active:        true,
			EmailVerified: true, // Contas Google são verificadas automaticamente
		}

		if err := config.DB.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao criar utilizador"})
			return
		}

		if role == "utente" {
			utente := models.Utente{
				UserID: user.ID,
			}

			if err := config.DB.Create(&utente).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao criar perfil de utente"})
				return
			}

			processo := models.ProcessoClinico{
				UtenteID: user.ID,
				Ativo:    true,
			}

			if err := config.DB.Create(&processo).Error; err != nil {
			}
		}
	}

	// Garantir que o perfil de terapeuta existe (mesmo se criação anterior falhou)
	if role == "terapeuta" {
		var t models.Terapeuta
		if config.DB.Where("user_id = ?", user.ID).First(&t).Error != nil {
			tipoTerapeuta, numeroMecanografico := getTipoTerapeutaFromEmail(user.Email)
			novoT := models.Terapeuta{UserID: user.ID, Tipo: tipoTerapeuta}
			if numeroMecanografico != "" {
				novoT.NumeroMecanografico = &numeroMecanografico
			}
			if err := config.DB.Create(&novoT).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao criar perfil de terapeuta"})
				return
			}
		}
	}

	if !user.Active {
		c.JSON(http.StatusForbidden, gin.H{"error": "Utilizador inativo"})
		return
	}

	now := time.Now()
	config.DB.Model(&user).Update("last_login_at", now)

	var tipo string
	var areaClinicaID *uint
	if user.Role == "terapeuta" {
		var terapeuta models.Terapeuta
		if err := config.DB.Where("user_id = ?", user.ID).First(&terapeuta).Error; err != nil {
			log.Printf("Erro ao buscar terapeuta: %v", err)
		} else {
			tipo = terapeuta.Tipo
			areaClinicaID = terapeuta.AreaClinicaID
		}
	}

	token, err := utils.GenerateAppJWT(user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao gerar token"})
		return
	}

	response := LoginResponse{
		Token:         token,
		UserID:        user.ID,
		Role:          user.Role,
		Name:          user.Nome,
		Email:         user.Email,
		Tipo:          tipo,
		AreaClinicaID: areaClinicaID,
	}

	c.JSON(http.StatusOK, response)
}

// Register cria uma nova conta de utilizador
func Register(c *gin.Context) {
	var req RegisterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados obrigatórios: email, password, confirm_password, nome_completo"})
		return
	}

	if req.Password != req.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{"error": "As palavras-passe não coincidem"})
		return
	}

	var existingUser models.User
	result := config.DB.Where("email = ?", req.Email).First(&existingUser)
	if result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email já registado"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao processar password"})
		return
	}

	// Gerar código de verificação
	verificationCode, err := generateVerificationCode()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao gerar código de verificação"})
		return
	}

	// Definir expiração do código em 24 horas
	expiresAt := time.Now().Add(24 * time.Hour)
	telefone := normalizePhone(req.Telefone)

	// Se já existe um utente com este telefone (ex: criado automaticamente pelo agente de
	// voz ElevenLabs numa marcação anterior, sem conta associada), reaproveita-se essa conta
	// em vez de criar um utilizador duplicado — assim mantém-se o histórico de consultas.
	var newUser models.User
	linkingExisting := false
	if telefone != "" {
		var utenteExistente models.Utente
		if err := config.DB.Where("telefone = ?", telefone).First(&utenteExistente).Error; err == nil {
			var userExistente models.User
			if err := config.DB.First(&userExistente, utenteExistente.UserID).Error; err != nil {
				log.Printf("ERRO ao carregar User associado ao telefone '%s': %v", telefone, err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao criar utilizador"})
				return
			}
			if userExistente.Email != "" {
				c.JSON(http.StatusConflict, gin.H{"error": "Este número de telemóvel já está associado a outra conta"})
				return
			}

			userExistente.Email = req.Email
			userExistente.Nome = req.NomeCompleto
			userExistente.PasswordHash = string(hashedPassword)
			userExistente.EmailVerified = false
			userExistente.VerificationCode = &verificationCode
			userExistente.VerificationCodeExpiresAt = &expiresAt
			if err := config.DB.Save(&userExistente).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao associar conta existente"})
				return
			}
			newUser = userExistente
			linkingExisting = true
			log.Printf("INFO: Registo associado a conta existente (criada via agente) -> UserID %d, telefone '%s'", newUser.ID, telefone)
		}
	}

	if !linkingExisting {
		newUser = models.User{
			Email:                     req.Email,
			Nome:                      req.NomeCompleto,
			PasswordHash:              string(hashedPassword),
			Role:                      "utente",
			Active:                    true,
			EmailVerified:             false,
			VerificationCode:          &verificationCode,
			VerificationCodeExpiresAt: &expiresAt,
		}

		if err := config.DB.Create(&newUser).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao criar utilizador"})
			return
		}

		utente := models.Utente{
			UserID: newUser.ID,
		}
		if telefone != "" {
			utente.Telefone = &telefone
		}

		if err := config.DB.Create(&utente).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao criar perfil de utente"})
			return
		}

		processo := models.ProcessoClinico{
			UtenteID: newUser.ID,
			Ativo:    true,
		}

		if err := config.DB.Create(&processo).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao criar processo clínico"})
			return
		}
	}

	// Enviar email de verificação (assíncrono para não bloquear a resposta)
	go func(email, code string) {
		if err := utils.SendVerificationEmail(email, code); err != nil {
			log.Printf("Aviso: Falha ao enviar email de verificação para %s: %v", email, err)
		}
	}(newUser.Email, verificationCode)

	response := RegisterResponse{
		Message:          "Conta criada com sucesso. Por favor verifique o seu email dentro de 24 horas. Após esse período, a conta será eliminada automaticamente e terá de fazer um novo registo.",
		UserID:           newUser.ID,
		Role:             newUser.Role,
		VerificationCode: "", // Vazio por padrão (segurança)
	}

	// Em desenvolvimento, mostrar o código para testes
	// Em produção, apenas o email contém o código
	if os.Getenv("ENVIRONMENT") == "development" {
		response.VerificationCode = verificationCode
	}

	c.JSON(http.StatusCreated, response)
}

// VerifyEmail verifica o código de email, marca como verificado e faz login automático
func VerifyEmail(c *gin.Context) {
	var req struct {
		UserID uint   `json:"user_id" binding:"required"`
		Code   string `json:"code" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id e code são obrigatórios"})
		return
	}

	if !getVerifyEmailLimiter(strconv.FormatUint(uint64(req.UserID), 10)).Allow() {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "Demasiadas tentativas. Aguarde um momento."})
		return
	}

	var user models.User
	if err := config.DB.Where("id = ?", req.UserID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilizador não encontrado"})
		return
	}

	// Verificar se o código foi expirado
	if user.VerificationCodeExpiresAt == nil || time.Now().After(*user.VerificationCodeExpiresAt) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Código expirado"})
		return
	}

	// Verificar se o código está correto
	if user.VerificationCode == nil || *user.VerificationCode != req.Code {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Código inválido"})
		return
	}

	// Marcar como verificado
	now := time.Now()
	config.DB.Model(&user).Updates(map[string]interface{}{
		"email_verified":               true,
		"verification_code":            nil,
		"verification_code_expires_at": nil,
		"last_login_at":                now,
	})

	// Gerar token JWT para auto-login
	token, err := utils.GenerateAppJWT(user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao gerar token"})
		return
	}

	// Buscar dados adicionais do terapeuta se aplicável
	var tipo string
	var areaClinicaID *uint
	if user.Role == "terapeuta" {
		var terapeuta models.Terapeuta
		if err := config.DB.Where("user_id = ?", user.ID).First(&terapeuta).Error; err == nil {
			tipo = terapeuta.Tipo
			areaClinicaID = terapeuta.AreaClinicaID
		}
	}

	// Retornar dados de login completo para auto-login
	response := LoginResponse{
		Token:         token,
		UserID:        user.ID,
		Role:          user.Role,
		Name:          user.Nome,
		Email:         user.Email,
		Tipo:          tipo,
		AreaClinicaID: areaClinicaID,
	}

	c.JSON(http.StatusOK, response)
}

// ResendVerification foi desabilitada: contas não verificadas são automaticamente eliminadas após 24 horas
func ResendVerification(c *gin.Context) {
	c.JSON(http.StatusForbidden, gin.H{
		"error": "Reenvio de código desabilitado. O código de verificação é válido por 24 horas. Após expirar, a conta é eliminada automaticamente e é necessário fazer um novo registo.",
	})
}

// ClaimUtenteAccount permite a um familiar ativar a conta de um utente sem email,
// definindo o email e password com base no número de processo e data de nascimento.
func ClaimUtenteAccount(c *gin.Context) {
	var req struct {
		NumeroProcesso string `json:"numero_processo" binding:"required"`
		DataNascimento string `json:"data_nascimento" binding:"required"`
		Email          string `json:"email" binding:"required,email"`
		Password       string `json:"password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	// Encontrar utente pelo número de processo
	var utente models.Utente
	if err := config.DB.Preload("User").Where("numero_processo = ?", req.NumeroProcesso).First(&utente).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Número de processo não encontrado"})
		return
	}

	// Verificar que a conta ainda não foi ativada
	if utente.User.Email != "" {
		c.JSON(http.StatusConflict, gin.H{"error": "Esta conta já foi ativada. Pode fazer login normalmente."})
		return
	}

	// Verificar data de nascimento
	if utente.DataNascimento == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Conta sem data de nascimento registada. Contacte a clínica."})
		return
	}
	dob, err := time.Parse("2006-01-02", req.DataNascimento)
	if err != nil || !utente.DataNascimento.Truncate(24*time.Hour).Equal(dob.Truncate(24*time.Hour)) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados incorretos"})
		return
	}

	// Verificar que o email não está já em uso
	var existing models.User
	if config.DB.Where("email = ?", req.Email).First(&existing).Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Este email já está registado"})
		return
	}

	// Atualizar user com email + password
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro interno"})
		return
	}
	config.DB.Model(&utente.User).Updates(map[string]interface{}{
		"email":          req.Email,
		"password_hash":  string(hashed),
		"email_verified": true,
	})

	// Auto-login
	token, err := utils.GenerateAppJWT(utente.User.ID, req.Email, utente.User.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao gerar token"})
		return
	}
	c.JSON(http.StatusOK, LoginResponse{
		Token:  token,
		UserID: utente.User.ID,
		Role:   utente.User.Role,
		Name:   utente.User.Nome,
		Email:  req.Email,
	})
}
