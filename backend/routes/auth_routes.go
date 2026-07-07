package routes

import (
	"clinica-backend/controllers"

	"github.com/gin-gonic/gin"
)

func RegisterAuthRoutes(router *gin.Engine) {
	auth := router.Group("/auth")
	{
		auth.POST("/login", controllers.Login)
		auth.POST("/register", controllers.Register)
		auth.POST("/verify-email", controllers.VerifyEmail)
		auth.POST("/resend-verification", controllers.ResendVerification)
		auth.POST("/google/callback", controllers.GoogleLogin)
		auth.POST("/claim-utente", controllers.ClaimUtenteAccount)
	}
}
