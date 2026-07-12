package routes

import (
	"clinica-backend/controllers"

	"github.com/gin-gonic/gin"
)

// RegisterElevenLabsRoutes regista a rota pública usada pelo agente de voz
// para marcar consultas. Não usa o middleware de JWT (o agente não faz login),
// a autenticação é feita por um secret partilhado dentro do controller.
func RegisterElevenLabsRoutes(router *gin.Engine) {
	router.POST("/agente/consultas", controllers.CreateConsultaAgente)
}
