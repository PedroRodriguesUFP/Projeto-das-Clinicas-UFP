package config

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB() {
	LoadEnv()

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		GetEnv("DB_HOST"),
		GetEnv("DB_PORT"),
		GetEnv("DB_USER"),
		GetEnv("DB_PASSWORD"),
		GetEnv("DB_NAME"),
		GetEnv("DB_SSLMODE"),
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Erro ao ligar à base de dados:", err)
	}

	log.Println("Ligação à base de dados estabelecida com sucesso")
}
