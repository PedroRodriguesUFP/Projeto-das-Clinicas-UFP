package utils

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// AppJWTClaims são os claims do JWT próprio da aplicação
type AppJWTClaims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

var jwtSecret string

// SetJWTSecret configura a chave secreta para JWT
func SetJWTSecret(secret string) {
	jwtSecret = secret
}

// GenerateAppJWT gera um JWT da aplicação para o utilizador
func GenerateAppJWT(userID uint, email, role string) (string, error) {
	if jwtSecret == "" {
		return "", fmt.Errorf("JWT secret não foi configurado")
	}

	claims := &AppJWTClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "clinica-backend",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", fmt.Errorf("falha ao gerar JWT: %w", err)
	}

	return tokenString, nil
}

// ValidateAppJWT valida e extrai os claims de um JWT da aplicação
func ValidateAppJWT(tokenString string) (*AppJWTClaims, error) {
	if jwtSecret == "" {
		return nil, fmt.Errorf("JWT secret não foi configurado")
	}

	claims := &AppJWTClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("método de assinatura inesperado: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("falha ao validar JWT: %w", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("JWT inválido")
	}

	return claims, nil
}
