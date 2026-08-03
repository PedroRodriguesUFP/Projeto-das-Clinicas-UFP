package controllers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net"
	"net/http"
	"net/http/httptest"

	"testing"

	"clinica-backend/config"
	"clinica-backend/models"
	"clinica-backend/routes"
	"clinica-backend/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) {
	// abrir SQLite em memória
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	config.DB = db
	// migrar as tabelas básicas usadas nos handlers
	if err := config.DB.AutoMigrate(&models.User{}, &models.Terapeuta{}, &models.Utente{}, &models.ProcessoClinico{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
}

func TestGoogleLogin_UFPNonNumeric_IsUtente(t *testing.T) {
	setupTestDB(t)

	// mock VerifyGoogleTokenFunc
	utils.VerifyGoogleTokenFunc = func(ctx context.Context, idToken string, expectedNonce string) (*utils.GoogleTokenClaims, error) {
		return &utils.GoogleTokenClaims{Email: "john.doe@ufp.edu.pt", EmailVerified: true, Name: "John Doe", Sub: "sub-ud1", Nonce: expectedNonce}, nil
	}

	r := gin.Default()
	routes.RegisterAuthRoutes(r)

	body := map[string]string{"id_token": "tok", "nonce": "n-1"}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest("POST", "/auth/google/callback", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "1.2.3.4:1234"
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d, body: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid json response: %v", err)
	}
	if resp["role"] != "utente" {
		t.Fatalf("expected role 'utente', got %v", resp["role"])
	}
}

func TestGoogleLogin_UFPNumeric_IsTerapeutaWithNumero(t *testing.T) {
	setupTestDB(t)

	utils.VerifyGoogleTokenFunc = func(ctx context.Context, idToken string, expectedNonce string) (*utils.GoogleTokenClaims, error) {
		return &utils.GoogleTokenClaims{Email: "123456@ufp.edu.pt", EmailVerified: true, Name: "Aluno", Sub: "sub-std", Nonce: expectedNonce}, nil
	}

	r := gin.Default()
	routes.RegisterAuthRoutes(r)

	body := map[string]string{"id_token": "tok2", "nonce": "n-2"}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest("POST", "/auth/google/callback", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "2.2.2.2:1234"
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d, body: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid json response: %v", err)
	}
	if resp["role"] != "terapeuta" {
		t.Fatalf("expected role 'terapeuta', got %v", resp["role"])
	}

	var user models.User
	if err := config.DB.Where("email = ?", "123456@ufp.edu.pt").First(&user).Error; err != nil {
		t.Fatalf("expected user created, got err: %v", err)
	}
	var terapeuta models.Terapeuta
	if err := config.DB.Where("user_id = ?", user.ID).First(&t).Error; err != nil {
		t.Fatalf("expected terapeuta created, got err: %v", err)
	}
	if terapeuta.NumeroMecanografico == nil || *terapeuta.NumeroMecanografico != "123456" {
		t.Fatalf("expected numero_mecanografico '123456', got %v", terapeuta.NumeroMecanografico)
		if terapeuta.NumeroMecanografico == nil || *terapeuta.NumeroMecanografico != "123456" {
			t.Fatalf("expected numero_mecanografico '123456', got %v", terapeuta.NumeroMecanografico)
		}
	}
}
func TestGoogleLogin_RateLimitBlocksAfterN(t *testing.T) {
	setupTestDB(t)

	utils.VerifyGoogleTokenFunc = func(ctx context.Context, idToken string, expectedNonce string) (*utils.GoogleTokenClaims, error) {
		return &utils.GoogleTokenClaims{Email: "rate@ex.com", EmailVerified: true, Name: "Rate", Sub: idToken, Nonce: expectedNonce}, nil
	}

	r := gin.Default()
	routes.RegisterAuthRoutes(r)

	ip := "9.9.9.9:1111"
	for i := 0; i < 6; i++ {
		body := map[string]string{"id_token": "tok-rate", "nonce": "n-rate"}
		b, _ := json.Marshal(body)
		req := httptest.NewRequest("POST", "/auth/google/callback", bytes.NewReader(b))
		req.Header.Set("Content-Type", "application/json")
		req.RemoteAddr = ip
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if i < 5 {
			if w.Code != http.StatusOK {
				t.Fatalf("expected 200 on attempt %d, got %d", i+1, w.Code)
			}
		} else {
			if w.Code != http.StatusTooManyRequests {
				t.Fatalf("expected 429 on attempt %d, got %d, body: %s", i+1, w.Code, w.Body.String())
			}
		}
	}
}

func TestRegister_EmailValidation_MXAndDisposable(t *testing.T) {
	setupTestDB(t)

	oldLookupMX := utils.LookupMXFunc
	defer func() { utils.LookupMXFunc = oldLookupMX }()

	r := gin.Default()
	routes.RegisterAuthRoutes(r)

	utils.LookupMXFunc = func(domain string) ([]*net.MX, error) {
		if domain == "gordo-dominio-que-nao-existe-123.pt" {
			return nil, &net.DNSError{Err: "no such host", IsNotFound: true}
		}
		return []*net.MX{{Host: "mail.example.com", Pref: 10}}, nil
	}

	body := map[string]string{
		"email":            "eu@gordo-dominio-que-nao-existe-123.pt",
		"password":         "StrongPass123!",
		"confirm_password": "StrongPass123!",
		"nome_completo":    "Utilizador Inexistente",
	}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest("POST", "/auth/register", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "10.0.0.1:1234"
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request for non-existent MX, got %d, body: %s", w.Code, w.Body.String())
	}

	bodyDisposable := map[string]string{
		"email":            "eu@mailinator.com",
		"password":         "StrongPass123!",
		"confirm_password": "StrongPass123!",
		"nome_completo":    "Utilizador Descartavel",
	}
	bDisp, _ := json.Marshal(bodyDisposable)
	reqDisp := httptest.NewRequest("POST", "/auth/register", bytes.NewReader(bDisp))
	reqDisp.Header.Set("Content-Type", "application/json")
	reqDisp.RemoteAddr = "10.0.0.2:1234"
	wDisp := httptest.NewRecorder()
	r.ServeHTTP(wDisp, reqDisp)

	if wDisp.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request for disposable email, got %d, body: %s", wDisp.Code, wDisp.Body.String())
	}

	utils.LookupMXFunc = func(domain string) ([]*net.MX, error) {
		return []*net.MX{{Host: "gmail-smtp-in.l.google.com.", Pref: 5}}, nil
	}
	bodyValid := map[string]string{
		"email":            "eu@gmail.com",
		"password":         "StrongPass123!",
		"confirm_password": "StrongPass123!",
		"nome_completo":    "Utilizador Valido",
	}
	bValid, _ := json.Marshal(bodyValid)
	reqValid := httptest.NewRequest("POST", "/auth/register", bytes.NewReader(bValid))
	reqValid.Header.Set("Content-Type", "application/json")
	reqValid.RemoteAddr = "10.0.0.3:1234"
	wValid := httptest.NewRecorder()
	r.ServeHTTP(wValid, reqValid)

	if wValid.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for valid MX email, got %d, body: %s", wValid.Code, wValid.Body.String())
	}

	utils.LookupMXFunc = func(domain string) ([]*net.MX, error) {
		return nil, &net.DNSError{Err: "i/o timeout", IsTimeout: true}
	}
	bodyFailOpen := map[string]string{
		"email":            "eu2@gmail.com",
		"password":         "StrongPass123!",
		"confirm_password": "StrongPass123!",
		"nome_completo":    "Utilizador Fail Open",
	}
	bFailOpen, _ := json.Marshal(bodyFailOpen)
	reqFailOpen := httptest.NewRequest("POST", "/auth/register", bytes.NewReader(bFailOpen))
	reqFailOpen.Header.Set("Content-Type", "application/json")
	reqFailOpen.RemoteAddr = "10.0.0.4:1234"
	wFailOpen := httptest.NewRecorder()
	r.ServeHTTP(wFailOpen, reqFailOpen)

	if wFailOpen.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for transient DNS error (fail-open), got %d, body: %s", wFailOpen.Code, wFailOpen.Body.String())
	}
}

func TestRegister_RateLimiting(t *testing.T) {
	setupTestDB(t)

	oldLookupMX := utils.LookupMXFunc
	defer func() { utils.LookupMXFunc = oldLookupMX }()

	utils.LookupMXFunc = func(domain string) ([]*net.MX, error) {
		return []*net.MX{{Host: "mail.gmail.com", Pref: 10}}, nil
	}

	r := gin.Default()
	routes.RegisterAuthRoutes(r)

	ip := "8.8.8.8:1234"
	for i := 0; i < 6; i++ {
		body := map[string]string{
			"email":            "user" + string(rune('a'+i)) + "@gmail.com",
			"password":         "StrongPass123!",
			"confirm_password": "StrongPass123!",
			"nome_completo":    "Test User",
		}
		b, _ := json.Marshal(body)
		req := httptest.NewRequest("POST", "/auth/register", bytes.NewReader(b))
		req.Header.Set("Content-Type", "application/json")
		req.RemoteAddr = ip
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if i < 5 {
			if w.Code != http.StatusOK {
				t.Fatalf("expected 200 on attempt %d, got %d, body: %s", i+1, w.Code, w.Body.String())
			}
		} else {
			if w.Code != http.StatusTooManyRequests {
				t.Fatalf("expected 429 Too Many Requests on attempt %d, got %d, body: %s", i+1, w.Code, w.Body.String())
			}
		}
	}
}

func TestRegisterAndLogin_EmailNormalization(t *testing.T) {
	setupTestDB(t)

	oldLookupMX := utils.LookupMXFunc
	defer func() { utils.LookupMXFunc = oldLookupMX }()

	utils.LookupMXFunc = func(domain string) ([]*net.MX, error) {
		return []*net.MX{{Host: "mail.gmail.com", Pref: 10}}, nil
	}

	r := gin.Default()
	routes.RegisterAuthRoutes(r)

	bodyReg := map[string]string{
		"email":            "Ana.Silva@Gmail.Com",
		"password":         "StrongPass123!",
		"confirm_password": "StrongPass123!",
		"nome_completo":    "Ana Silva",
	}
	bReg, _ := json.Marshal(bodyReg)
	reqReg := httptest.NewRequest("POST", "/auth/register", bytes.NewReader(bReg))
	reqReg.Header.Set("Content-Type", "application/json")
	reqReg.RemoteAddr = "12.34.56.78:1234"
	wReg := httptest.NewRecorder()
	r.ServeHTTP(wReg, reqReg)

	if wReg.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on register, got %d, body: %s", wReg.Code, wReg.Body.String())
	}

	var user models.User
	if err := config.DB.Where("email = ?", "ana.silva@gmail.com").First(&user).Error; err != nil {
		t.Fatalf("expected user created with lowercased email, got error: %v", err)
	}

	bodyLogin := map[string]string{
		"email":    "ANA.SILVA@GMAIL.COM",
		"password": "StrongPass123!",
	}
	bLogin, _ := json.Marshal(bodyLogin)
	reqLogin := httptest.NewRequest("POST", "/auth/login", bytes.NewReader(bLogin))
	reqLogin.Header.Set("Content-Type", "application/json")
	reqLogin.RemoteAddr = "12.34.56.78:1234"
	wLogin := httptest.NewRecorder()
	r.ServeHTTP(wLogin, reqLogin)

	if wLogin.Code != http.StatusOK && wLogin.Code != 206 {
		t.Fatalf("expected 200 or 206 on login with upper-case email, got %d, body: %s", wLogin.Code, wLogin.Body.String())
	}
}
