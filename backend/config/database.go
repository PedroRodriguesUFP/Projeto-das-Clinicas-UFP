package config

import (
	"clinica-backend/models"
	"log"

	"github.com/glebarez/sqlite"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB() {
	LoadEnv()

	var err error
	DB, err = gorm.Open(sqlite.Open("clinica_local.db"), &gorm.Config{})

	if err != nil {
		log.Fatal("❌ Erro ao ligar à base de dados local:", err)
	}

	log.Println("✅ Ligação à base de dados LOCAL (SQLite) estabelecida!")

	// 1. Cria as tabelas
	err = DB.AutoMigrate(
		&models.User{},
		&models.AreaClinica{},
		&models.Terapeuta{},
		&models.Utente{},
		&models.ProcessoClinico{},

		// --- AS TABELAS NOVAS QUE FALTAVAM ---
		&models.Consulta{},
		&models.Sala{},
		&models.FichaAvaliacao{},
		&models.FichaPsicologia{},
		&models.FichaTerapiaFala{},
		&models.FichaNutricao{},
		&models.DocumentoConsulta{},
	)

	if err != nil {
		log.Println("❌ Erro a migrar tabelas:", err)
	} else {
		log.Println("✅ Tabelas sincronizadas!")

		// 2. Garante que as áreas clínicas existem (inclui Fisioterapia)
		SeedAreasClinicas(DB)

		// 3. Injeta o utilizador de teste automaticamente!
		SeedProfessor(DB)
	}
}

// SeedAreasClinicas insere as áreas clínicas base se ainda não existirem.
// A área de Fisioterapia tem o ID 3, consistente com o database/seed.sql.
func SeedAreasClinicas(db *gorm.DB) {
	areas := []models.AreaClinica{
		{ID: 1, Nome: "Psicologia", Ativa: true},
		{ID: 2, Nome: "Nutrição", Ativa: true},
		{ID: 3, Nome: "Fisioterapia", Ativa: true},
		{ID: 4, Nome: "Terapia da Fala", Ativa: true},
	}

	for _, area := range areas {
		var count int64
		db.Model(&models.AreaClinica{}).
			Where("id = ? OR nome = ?", area.ID, area.Nome).
			Count(&count)

		if count == 0 {
			if err := db.Create(&area).Error; err != nil {
				log.Printf("⚠️ Erro ao criar área clínica '%s': %v", area.Nome, err)
			} else {
				log.Printf("✅ Área clínica '%s' criada (ID %d)", area.Nome, area.ID)
			}
		}
	}
}

// SeedProfessor injeta um utilizador de teste que já tem o email verificado.
func SeedProfessor(db *gorm.DB) {
	var count int64
	db.Model(&models.User{}).Where("email = ?", "professor@ufp.pt").Count(&count)

	if count == 0 {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("ClinicaUFP@2026!"), bcrypt.DefaultCost)

		professor := models.User{
			Nome:          "Professor Fisio",
			Email:         "professor@ufp.edu.pt",
			PasswordHash:  string(hashedPassword),
			Role:          "terapeuta",
			EmailVerified: true,
			Active:        true,
		}

		if err := db.Create(&professor).Error; err != nil {
			log.Println("⚠️ Erro ao criar Professor de teste:", err)
			return
		}

		// Área clínica de Fisioterapia (ID 3) — garante-se que já existe via SeedAreasClinicas
		areaFisio := uint(3)
		terapeuta := models.Terapeuta{
			UserID:        professor.ID,
			Tipo:          "professor",
			AreaClinicaID: &areaFisio,
		}
		if err := db.Create(&terapeuta).Error; err != nil {
			log.Println("⚠️ Erro ao criar Terapeuta de teste:", err)
			return
		}

		log.Println("🚀 PROFESSOR DE TESTE CRIADO COM SUCESSO!")
		log.Println("📧 Email: professor@ufp.edu.pt")
		log.Println("🔑 Password: 123456")
	}
}
