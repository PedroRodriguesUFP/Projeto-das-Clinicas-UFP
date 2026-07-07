package models

import "time"

type User struct {
	ID                        uint       `gorm:"column:id;primaryKey"`
	Nome                      string     `gorm:"column:nome"`
	Email                     string     `gorm:"column:email"`
	PasswordHash              string     `gorm:"column:password_hash" json:"-"`
	Role                      string     `gorm:"column:role"`
	Active                    bool       `gorm:"column:active"`
	GoogleSub                 *string    `gorm:"column:google_sub" json:"-"`
	EmailVerified             bool       `gorm:"column:email_verified"`
	VerificationCode          *string    `gorm:"column:verification_code" json:"-"`
	VerificationCodeExpiresAt *time.Time `gorm:"column:verification_code_expires_at" json:"-"`
	LastLoginAt               *time.Time `gorm:"column:last_login_at"`
	CreatedAt                 time.Time  `gorm:"column:created_at"`
	UpdatedAt                 time.Time  `gorm:"column:updated_at"`

	Terapeuta *Terapeuta `gorm:"foreignKey:UserID;references:ID"`
}

func (User) TableName() string {
	return "users"
}
