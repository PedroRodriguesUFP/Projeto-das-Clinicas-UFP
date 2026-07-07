package controllers

import (
	"time"

	"clinica-backend/config"
	"clinica-backend/models"
)

// isUserAluno retorna true se o utilizador é terapeuta do tipo "aluno".
func isUserAluno(userID uint) bool {
	var t models.Terapeuta
	return config.DB.Where("user_id = ? AND tipo = 'aluno'", userID).First(&t).Error == nil
}

// estadoSubmissao devolve "pendente" se o criador é aluno, caso contrário "aprovada".
func estadoSubmissao(createdBy uint) string {
	if isUserAluno(createdBy) {
		return "pendente"
	}
	return "aprovada"
}

// isAlunoOutsideWindow retorna true se o utilizador é aluno terapeuta
// e o momento atual está fora da janela [data_inicio-2h, data_fim+2h].
func isAlunoOutsideWindow(userID uint, consulta *models.Consulta) bool {
	var t models.Terapeuta
	if err := config.DB.Where("user_id = ? AND tipo = 'aluno'", userID).First(&t).Error; err != nil {
		return false // não é aluno, sem restrição
	}
	now := time.Now()
	return now.Before(consulta.DataInicio.Add(-2*time.Hour)) ||
		now.After(consulta.DataFim.Add(2*time.Hour))
}

// terapeutaHasAccessToUtente retorna true se o terapeuta tem pelo menos
// uma consulta com este utente (direto ou via supervisor).
func terapeutaHasAccessToUtente(userID uint, utenteID uint) bool {
	var t models.Terapeuta
	if err := config.DB.Where("user_id = ?", userID).First(&t).Error; err != nil {
		return false
	}
	var count int64
	q := config.DB.Model(&models.Consulta{}).Where("utente_id = ?", utenteID)
	if t.Tipo == "aluno" && t.SupervisorID != nil {
		q = q.Where("terapeuta_id = ? OR terapeuta_id = ?", userID, *t.SupervisorID)
	} else {
		q = q.Where("terapeuta_id = ?", userID)
	}
	q.Count(&count)
	return count > 0
}

// getVisibleTerapeutaIDs retorna os IDs do terapeuta e, se for professor, também dos seus alunos.
func getVisibleTerapeutaIDs(userID uint) []uint {
	ids := []uint{userID}
	var alunos []models.Terapeuta
	config.DB.Where("supervisor_id = ? AND tipo = 'aluno'", userID).Find(&alunos)
	for _, a := range alunos {
		ids = append(ids, a.UserID)
	}
	return ids
}

// alunoIsLinkedToConsulta retorna true se o utilizador é o terapeuta da consulta
// OU é um aluno cujo supervisor é o terapeuta da consulta.
func alunoIsLinkedToConsulta(userID uint, consulta *models.Consulta) bool {
	if consulta.TerapeutaID == userID {
		return true
	}
	var t models.Terapeuta
	if err := config.DB.Where("user_id = ? AND tipo = 'aluno'", userID).First(&t).Error; err != nil {
		return false
	}
	return t.SupervisorID != nil && *t.SupervisorID == consulta.TerapeutaID
}

// alunoHasActiveConsulta retorna true se o aluno tem pelo menos uma
// consulta ativa (dentro de ±2h) com utenteID. Para não-alunos devolve true.
func alunoHasActiveConsulta(userID uint, utenteID uint) bool {
	var t models.Terapeuta
	if err := config.DB.Where("user_id = ? AND tipo = 'aluno'", userID).First(&t).Error; err != nil {
		return true // não é aluno, sem restrição
	}
	now := time.Now()
	q := config.DB.Model(&models.Consulta{}).
		Where("utente_id = ? AND data_inicio <= ? AND data_fim >= ?",
			utenteID, now.Add(2*time.Hour), now.Add(-2*time.Hour))
	if t.SupervisorID != nil {
		q = q.Where("terapeuta_id = ? OR terapeuta_id = ?", userID, *t.SupervisorID)
	} else {
		q = q.Where("terapeuta_id = ?", userID)
	}
	var count int64
	q.Count(&count)
	return count > 0
}
