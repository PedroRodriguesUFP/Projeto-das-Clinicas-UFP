package utils

import (
	"context"
	"fmt"
	"strings"

	"github.com/coreos/go-oidc/v3/oidc"
)

const (
	GoogleProviderURL  = "https://accounts.google.com"
	AllowedEmailDomain = "@ufp.edu.pt"
)

var (
	provider *oidc.Provider
	verifier *oidc.IDTokenVerifier
)

// InitGoogle inicializa o provider OpenID Connect do Google
func InitGoogle(ctx context.Context, clientID string) error {
	var err error
	provider, err = oidc.NewProvider(ctx, GoogleProviderURL)
	if err != nil {
		return fmt.Errorf("falha ao inicializar provider Google: %w", err)
	}

	// Configurar verifier com cliente ID
	verifier = provider.Verifier(&oidc.Config{
		ClientID: clientID,
	})

	return nil
}

// GoogleTokenClaims contém os claims que nos interessam do token Google
type GoogleTokenClaims struct {
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Sub           string `json:"sub"` // Google Subject (unique identifier)
}

// VerifyGoogleToken valida o token Google e retorna os claims
func VerifyGoogleToken(ctx context.Context, idToken string) (*GoogleTokenClaims, error) {
	if verifier == nil {
		return nil, fmt.Errorf("Google verifier não foi inicializado")
	}

	// Validar token contra Google's JWKS
	token, err := verifier.Verify(ctx, idToken)
	if err != nil {
		return nil, fmt.Errorf("falha ao validar token Google: %w", err)
	}

	// Extrair claims
	claims := &GoogleTokenClaims{}
	if err := token.Claims(claims); err != nil {
		return nil, fmt.Errorf("falha ao extrair claims do token: %w", err)
	}

	return claims, nil
}

// ValidateUFPEmail verifica se o email pertence ao domínio @ufp.edu.pt
func ValidateUFPEmail(email string) bool {
	return strings.HasSuffix(strings.ToLower(email), strings.ToLower(AllowedEmailDomain))
}
