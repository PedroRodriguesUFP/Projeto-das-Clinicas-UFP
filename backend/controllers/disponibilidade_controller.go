package controllers

import (
	"net/http"
	"strconv"
	"time"

	"clinica-backend/config"
	"clinica-backend/models"

	"github.com/gin-gonic/gin"
)

type BlocoDisponibilidade struct {
	HoraInicio string `json:"hora_inicio" binding:"required"`
	HoraFim    string `json:"hora_fim" binding:"required"`
}

type SetDisponibilidadeRequest struct {
	Data   string                  `json:"data" binding:"required"`
	Blocos []BlocoDisponibilidade `json:"blocos"`
}

// GetMinhaDisponibilidade devolve os blocos do terapeuta autenticado num mês
func GetMinhaDisponibilidade(c *gin.Context) {
	terapeutaID := c.GetUint("user_id")
	ano, _ := strconv.Atoi(c.Query("ano"))
	mes, _ := strconv.Atoi(c.Query("mes"))

	query := config.DB.Where("terapeuta_id = ?", terapeutaID)

	if ano > 0 && mes > 0 {
		primeiroDia := time.Date(ano, time.Month(mes), 1, 0, 0, 0, 0, time.Local)
		ultimoDia := primeiroDia.AddDate(0, 1, -1)
		query = query.Where("data BETWEEN ? AND ?", primeiroDia.Format("2006-01-02"), ultimoDia.Format("2006-01-02"))
	}

	var blocos []models.DisponibilidadeTerapeuta
	query.Order("data, hora_inicio").Find(&blocos)

	resposta := make([]gin.H,0,len(blocos))
	for _, b := range blocos {
		resposta = append(resposta, gin.H{
			"id":            b.ID,
			"data":          b.Data.Format("2006-01-02"),
			"hora_inicio":   b.HoraInicio,
			"hora_fim":      b.HoraFim,
		})
	}

	c.JSON(http.StatusOK, resposta)
}

// SetMinhaDisponibilidade substitui os blocos de UM DIA ESPECÍFICO do terapeuta,
// sem tocar nos blocos de outros dias.
func SetMinhaDisponibilidade(c *gin.Context) {
	terapeutaID := c.GetUint("user_id")

	var req SetDisponibilidadeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	dataParsed, err := time.Parse("2006-01-02", req.Data)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data inválida"})
		return
	}

	tx := config.DB.Begin()

	if err := tx.Where("terapeuta_id = ? AND data = ?", terapeutaID, dataParsed).
		Delete(&models.DisponibilidadeTerapeuta{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao limpar disponibilidade anterior"})
		return
	}

	for _, b := range req.Blocos {
		bloco := models.DisponibilidadeTerapeuta{
			TerapeutaID: terapeutaID,
			Data:        dataParsed,
			HoraInicio:  b.HoraInicio,
			HoraFim:     b.HoraFim,
		}
		if err := tx.Create(&bloco).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao gravar disponibilidade"})
			return
		}
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Disponibilidade do dia atualizada"})
}

// GetDiasDisponiveisArea devolve, para um mês, os dias com disponibilidade real
func GetDiasDisponiveisArea(c *gin.Context) {
	areaID, _ := strconv.Atoi(c.Param("id"))
	ano, _ := strconv.Atoi(c.Query("ano"))
	mes, _ := strconv.Atoi(c.Query("mes"))

	primeiroDia := time.Date(ano, time.Month(mes), 1, 0, 0, 0, 0, time.Local)
	ultimoDia := primeiroDia.AddDate(0, 1, -1)

	var datasRaw []time.Time
	config.DB.Table("disponibilidade_terapeuta").
		Distinct("disponibilidade_terapeuta.data").
		Joins("JOIN terapeutas ON terapeutas.user_id = disponibilidade_terapeuta.terapeuta_id").
		Joins("JOIN users u ON u.id = terapeutas.user_id").
		Where("terapeutas.area_clinica_id = ?", areaID).
		Where("u.active = ?", true).
		Where("disponibilidade_terapeuta.data BETWEEN ? AND ?", primeiroDia.Format("2006-01-02"), ultimoDia.Format("2006-01-02")).
		Pluck("disponibilidade_terapeuta.data", &datasRaw)

	dias := make([]string, len(datasRaw))
	for i, d := range datasRaw {
		dias[i] = d.Format("2006-01-02")
	}

	c.JSON(http.StatusOK, gin.H{"dias_disponiveis": dias})
}

// GetHorariosDisponiveisArea devolve as horas livres num dia específico
func GetHorariosDisponiveisArea(c *gin.Context) {
	areaID, _ := strconv.Atoi(c.Param("id"))
	dataStr := c.Query("data")
	duracaoMin, _ := strconv.Atoi(c.DefaultQuery("duracao", "60"))

	data, err := time.ParseInLocation("2006-01-02", dataStr, time.Local)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data inválida"})
		return
	}

	var blocos []models.DisponibilidadeTerapeuta
	config.DB.Table("disponibilidade_terapeuta").
		Select("disponibilidade_terapeuta.*").
		Joins("JOIN terapeutas ON terapeutas.user_id = disponibilidade_terapeuta.terapeuta_id").
		Joins("JOIN users u ON u.id = terapeutas.user_id").
		Where("terapeutas.area_clinica_id = ?", areaID).
		Where("u.active = ?", true).
		Where("disponibilidade_terapeuta.data = ?", dataStr).
		Find(&blocos)

	slotsDisponiveis := []string{}
	duracao := time.Duration(duracaoMin) * time.Minute
	horasTestadas := map[string]bool{}

	for _, bloco := range blocos {
		horaInicioBloco, _ := time.Parse("15:04:05", bloco.HoraInicio)
		horaFimBloco, _ := time.Parse("15:04:05", bloco.HoraFim)

		slotStart := time.Date(data.Year(), data.Month(), data.Day(),
			horaInicioBloco.Hour(), horaInicioBloco.Minute(), 0, 0, time.Local)
		fimBloco := time.Date(data.Year(), data.Month(), data.Day(),
			horaFimBloco.Hour(), horaFimBloco.Minute(), 0, 0, time.Local)

		for slotStart.Add(duracao).Before(fimBloco) || slotStart.Add(duracao).Equal(fimBloco) {
			chave := slotStart.Format("15:04")
			if !horasTestadas[chave] {
				horasTestadas[chave] = true

				var terapeutaLivre int64
				config.DB.Table("terapeutas").
					Joins("JOIN users u ON u.id = terapeutas.user_id").
					Where("terapeutas.area_clinica_id = ?", areaID).
					Where("u.active = ?", true).
					Where("NOT EXISTS (SELECT 1 FROM consultas c WHERE c.terapeuta_id = terapeutas.user_id AND c.estado = 'agendada' AND c.data_inicio < ? AND c.data_fim > ?)",
						slotStart.Add(duracao), slotStart).
					Count(&terapeutaLivre)

				if terapeutaLivre > 0 {
					slotsDisponiveis = append(slotsDisponiveis, chave)
				}
			}
			slotStart = slotStart.Add(30 * time.Minute)
		}
	}

	c.JSON(http.StatusOK, gin.H{"horarios_disponiveis": slotsDisponiveis})
}