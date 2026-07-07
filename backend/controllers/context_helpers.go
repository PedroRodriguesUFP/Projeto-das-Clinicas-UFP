package controllers

import (
	"fmt"

	"github.com/gin-gonic/gin"
)

func getAuthenticatedUserID(c *gin.Context) (uint, error) {
	if value, exists := c.Get("userID"); exists {
		if userID, ok := value.(uint); ok && userID > 0 {
			return userID, nil
		}
	}

	if value, exists := c.Get("user_id"); exists {
		if userID, ok := value.(uint); ok && userID > 0 {
			return userID, nil
		}
	}

	return 0, fmt.Errorf("utilizador autenticado não encontrado")
}
