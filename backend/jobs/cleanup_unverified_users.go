package jobs

import (
	"log"
	"time"

	"clinica-backend/config"
	"clinica-backend/models"

	"gorm.io/gorm"
)

// StartUnverifiedUserCleanupJob inicia um job que apaga contas não verificadas após 24 horas
// Este job executa a cada 1 hora para verificar e limpar contas expiradas
func StartUnverifiedUserCleanupJob() {
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()

		// Executar uma vez na inicialização
		cleanupUnverifiedUsers()

		// Depois repetir a cada hora
		for range ticker.C {
			cleanupUnverifiedUsers()
		}
	}()
}

// cleanupUnverifiedUsers elimina contas de utilizadores não verificados cujo código expirou
func cleanupUnverifiedUsers() {
	now := time.Now()

	// Encontrar utilizadores não verificados com código expirado
	var unverifiedUsers []models.User
	if err := config.DB.Where("email_verified = ? AND verification_code_expires_at IS NOT NULL AND verification_code_expires_at < ?", false, now).Find(&unverifiedUsers).Error; err != nil {
		log.Printf("Erro ao buscar utilizadores não verificados: %v", err)
		return
	}

	if len(unverifiedUsers) == 0 {
		return
	}

	log.Printf("Encontrados %d utilizadores não verificados com código expirado. A eliminar...", len(unverifiedUsers))

	// Para cada utilizador, eliminar associações e depois o utilizador
	for _, user := range unverifiedUsers {
		if err := deleteUserAndAssociations(user.ID); err != nil {
			log.Printf("Erro ao eliminar utilizador %d (%s): %v", user.ID, user.Email, err)
		} else {
			log.Printf("Utilizador %d (%s) eliminado com sucesso (conta não verificada após 24h)", user.ID, user.Email)
		}
	}
}

// deleteUserAndAssociations elimina um utilizador e todas as suas associações em uma transação
func deleteUserAndAssociations(userID uint) error {
	return config.DB.Transaction(func(tx *gorm.DB) error {
		// Encontrar o utente associado
		var utente models.Utente
		if err := tx.Where("user_id = ?", userID).First(&utente).Error; err == nil {
			// Eliminar processo clínico associado ao utente
			if err := tx.Where("utente_id = ?", utente.UserID).Delete(&models.ProcessoClinico{}).Error; err != nil {
				return err
			}
		}

		// Eliminar terapeuta se existir
		if err := tx.Where("user_id = ?", userID).Delete(&models.Terapeuta{}).Error; err != nil {
			return err
		}

		// Eliminar utente
		if err := tx.Where("user_id = ?", userID).Delete(&models.Utente{}).Error; err != nil {
			return err
		}

		// Eliminar utilizador
		if err := tx.Delete(&models.User{}, userID).Error; err != nil {
			return err
		}

		return nil
	})
}
