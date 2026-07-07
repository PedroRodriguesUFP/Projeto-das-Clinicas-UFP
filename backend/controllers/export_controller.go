package controllers

import (
	"bytes"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"

	"clinica-backend/config"
	"clinica-backend/models"
)

// GET /exports/sala?from=2025-01-01&to=2025-01-07
func ExportOcupacaoSalas(c *gin.Context) {
	from, err := time.Parse("2006-01-02", c.Query("from"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Parâmetro 'from' inválido (formato: YYYY-MM-DD)"})
		return
	}
	to, err := time.Parse("2006-01-02", c.Query("to"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Parâmetro 'to' inválido (formato: YYYY-MM-DD)"})
		return
	}
	if to.Before(from) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "'to' deve ser igual ou posterior a 'from'"})
		return
	}
	if to.Sub(from).Hours() > 24*62 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Intervalo máximo de 62 dias"})
		return
	}

	var salas []models.Sala
	config.DB.Where("ativa = ?", true).Order("nome asc").Find(&salas)

	var consultas []models.Consulta
	config.DB.Where(
		"date(data_inicio) >= ? AND date(data_inicio) <= ? AND estado != 'cancelada'",
		from.Format("2006-01-02"), to.Format("2006-01-02"),
	).Preload("Sala").Preload("Utente").Preload("Terapeuta").Find(&consultas)

	f := excelize.NewFile()

	// Styles
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"F3F4F6"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	agendadaStyle, _ := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Color: []string{"BFDBFE"}, Pattern: 1},
	})
	realizadaStyle, _ := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Color: []string{"BBF7D0"}, Pattern: 1},
	})
	canceladaStyle, _ := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Color: []string{"FEF08A"}, Pattern: 1},
	})
	faltouStyle, _ := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Color: []string{"FECACA"}, Pattern: 1},
	})

	for d := from; !d.After(to); d = d.AddDate(0, 0, 1) {
		sheetName := d.Format("02-01 Mon")
		f.NewSheet(sheetName)

		// Header row
		f.SetCellValue(sheetName, "A1", "Hora")
		f.SetCellStyle(sheetName, "A1", "A1", headerStyle)
		for i, sala := range salas {
			col := columnName(i + 2)
			cell := col + "1"
			f.SetCellValue(sheetName, cell, sala.Nome)
			f.SetCellStyle(sheetName, cell, cell, headerStyle)
		}

		// Time slots (09:00-19:00, 30min intervals)
		row := 2
		for hour := 9; hour < 19; hour++ {
			for min := 0; min < 60; min += 30 {
				slotStart := time.Date(d.Year(), d.Month(), d.Day(), hour, min, 0, 0, time.UTC)
				slotEnd := slotStart.Add(30 * time.Minute)

				f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), slotStart.Format("15:04"))

				for i, sala := range salas {
					col := columnName(i + 2)
					cell := fmt.Sprintf("%s%d", col, row)

					for _, consulta := range consultas {
						if consulta.SalaID == nil || *consulta.SalaID != sala.ID {
							continue
						}
						if consulta.DataInicio.Before(slotStart) || !consulta.DataInicio.Before(slotEnd) {
							continue
						}
						// This slot overlaps with this appointment
						switch consulta.Estado {
						case "realizada":
							f.SetCellStyle(sheetName, cell, cell, realizadaStyle)
						case "cancelada":
							f.SetCellStyle(sheetName, cell, cell, canceladaStyle)
						case "faltou":
							f.SetCellStyle(sheetName, cell, cell, faltouStyle)
						default:
							f.SetCellStyle(sheetName, cell, cell, agendadaStyle)
						}
						break
					}
				}
				row++
			}
		}

		// Column widths
		f.SetColWidth(sheetName, "A", "A", 8)
		for i := range salas {
			col := columnName(i + 2)
			f.SetColWidth(sheetName, col, col, 22)
		}
	}

	// Remove default sheet
	f.DeleteSheet("Sheet1")

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao gerar ficheiro Excel"})
		return
	}

	filename := fmt.Sprintf("salas-%s-%s.xlsx", from.Format("2006-01-02"), to.Format("2006-01-02"))
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

// columnName converts a 0-based index to a column letter (0=A, 1=B, ... 25=Z, 26=AA, ...)
func columnName(n int) string {
	name := ""
	for n > 0 {
		n--
		name = string(rune('A'+n%26)) + name
		n /= 26
	}
	return name
}
