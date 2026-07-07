package utils

import (
	"fmt"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"time"
)

type EmailConfig struct {
	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPassword string
	FromEmail    string
	FromName     string
	DevelopMode  bool
}

var emailConfig *EmailConfig

// InitEmailConfig inicializa a configuração de email a partir de variáveis de ambiente
func InitEmailConfig() error {
	port, err := strconv.Atoi(os.Getenv("SMTP_PORT"))
	if err != nil {
		port = 587 // Default port para SMTP
	}

	developMode := os.Getenv("ENVIRONMENT") == "development"

	emailConfig = &EmailConfig{
		SMTPHost:     os.Getenv("SMTP_HOST"),
		SMTPPort:     port,
		SMTPUser:     os.Getenv("SMTP_USER"),
		SMTPPassword: os.Getenv("SMTP_PASSWORD"),
		FromEmail:    os.Getenv("SMTP_FROM_EMAIL"),
		FromName:     os.Getenv("SMTP_FROM_NAME"),
		DevelopMode:  developMode,
	}

	// Se SMTP não estiver configurado, usar valores de fallback
	if emailConfig.SMTPHost == "" {
		fmt.Println("⚠️  Email SMTP não configurado. Usando modo MOCK (development).")
		fmt.Println("💡 Para enviar emails de verdade, configure:")
		fmt.Println("   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL")
		return nil
	}

	fmt.Printf("✓ Email SMTP configurado: %s:%d\n", emailConfig.SMTPHost, emailConfig.SMTPPort)
	return nil
}

// SendVerificationEmail envia email com código de verificação
func SendVerificationEmail(toEmail, verificationCode string) error {
	if emailConfig == nil || emailConfig.SMTPHost == "" {
		// Modo MOCK - development
		return sendMockEmail(toEmail, verificationCode)
	}

	from := fmt.Sprintf("%s <%s>", emailConfig.FromName, emailConfig.FromEmail)
	to := toEmail
	subject := "Verificação de Email — UAAPS"

	// Corpo do email em HTML
	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		body { font-family: Arial, sans-serif; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background-color: #005439; color: white; padding: 20px; text-align: center; }
		.content { padding: 20px; background-color: #f9f9f9; }
		.code { font-size: 32px; font-weight: bold; color: #005439; text-align: center; margin: 20px 0; letter-spacing: 5px; }
		.footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>Verificação de Email</h1>
		</div>
		<div class="content">
			<p>Bem-vindo à Unidade Académica de Aprendizagem e Prática em Saúde (UAAPS)!</p>
			<p>Para completar o seu registo, utilize o seguinte código de verificação:</p>
			<div class="code">%s</div>
			<p>Este código expira em 24 horas.</p>
			<p>Se não criou esta conta, ignore este email.</p>
		</div>
		<div class="footer">
			<p>UAAPS — Unidade Académica de Aprendizagem e Prática em Saúde</p>
		</div>
	</div>
</body>
</html>
	`, verificationCode)

	headers := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n", from, to, subject)
	message := headers + body

	// Conectar ao servidor SMTP
	addr := fmt.Sprintf("%s:%d", emailConfig.SMTPHost, emailConfig.SMTPPort)
	auth := smtp.PlainAuth("", emailConfig.SMTPUser, emailConfig.SMTPPassword, emailConfig.SMTPHost)

	err := smtp.SendMail(addr, auth, emailConfig.FromEmail, []string{toEmail}, []byte(message))
	if err != nil {
		fmt.Printf("❌ Erro ao enviar email: %v\n", err)
		return err
	}

	fmt.Printf("✓ Email enviado com sucesso para: %s\n", toEmail)
	return nil
}

// sendMockEmail simula o envio de email em development (mock)
func sendMockEmail(toEmail, verificationCode string) error {
	separator := strings.Repeat("=", 60)
	dash := strings.Repeat("-", 60)

	fmt.Println("\n" + separator)
	fmt.Println("📧 EMAIL MOCK (Development Mode)")
	fmt.Println(separator)
	fmt.Printf("Para: %s\n", toEmail)
	fmt.Printf("De: UAAPS <uaaps@ufp.pt>\n")
	fmt.Printf("Assunto: Verificação de Email — UAAPS\n")
	fmt.Printf("Data: %s\n", time.Now().Format("2006-01-02 15:04:05"))
	fmt.Println(dash)
	fmt.Println("Corpo:")
	fmt.Println(dash)
	fmt.Printf("Bem-vindo à Unidade Académica de Aprendizagem e Prática em Saúde (UAAPS)!\n\n")
	fmt.Printf("Para completar o seu registo, utilize o seguinte código de verificação:\n\n")
	fmt.Printf("   🔐 %s\n\n", verificationCode)
	fmt.Printf("Este código expira em 24 horas.\n")
	fmt.Printf("Se não criou esta conta, ignore este email.\n")
	fmt.Println(dash)
	fmt.Println("(Este é um email MOCK. Configure SMTP para enviar de verdade)")
	fmt.Println(separator + "\n")

	return nil
}

// IsEmailConfigured verifica se o SMTP está configurado
func IsEmailConfigured() bool {
	return emailConfig != nil && emailConfig.SMTPHost != ""
}
