package controllers

import (
	"regexp"
	"strings"
	"time"

	"clinica-backend/config"
	"clinica-backend/models"
)

var nonDigitOrPlus = regexp.MustCompile(`[^\d+]`)

// normalizePhone normaliza um número de telemóvel para um formato E.164-like
// (+<indicativo><número>), para que o mesmo número escrito de formas diferentes
// (com espaços, com/sem indicativo) case sempre com o mesmo valor na BD.
//
// A app tem utentes de Portugal e de França, que têm formatos nacionais distintos:
//   - Portugal: 9 dígitos, sem zero inicial (ex: 912345678)
//   - França:   10 dígitos, com zero inicial (ex: 0612345678)
//
// Quando o número já vem com indicativo (+351, +33, 00351, 0033) esse é sempre respeitado.
// Quando vem em formato nacional (sem indicativo), assume-se Portugal por defeito,
// exceto se tiver o formato claramente francês (10 dígitos a começar por 0).
func normalizePhone(raw string) string {
	numero := strings.TrimSpace(raw)
	if numero == "" {
		return ""
	}

	// Remove tudo exceto dígitos e o "+" (espaços, traços, parênteses, etc.)
	numero = nonDigitOrPlus.ReplaceAllString(numero, "")

	// "00" internacional -> "+"
	if strings.HasPrefix(numero, "00") {
		numero = "+" + numero[2:]
	}

	// Já tem indicativo explícito -> mantém como está
	if strings.HasPrefix(numero, "+") {
		return numero
	}

	// Sem indicativo: formato nacional francês (10 dígitos, começa por 0)
	if len(numero) == 10 && strings.HasPrefix(numero, "0") {
		return "+33" + numero[1:]
	}

	// Sem indicativo: assume-se Portugal (9 dígitos, sem zero inicial)
	if len(numero) == 9 {
		return "+351" + numero
	}

	// Formato não reconhecido: devolve só os dígitos, sem indicativo assumido,
	// para não associar números incorretamente.
	return numero
}

// haConflitoHorario verifica se já existe uma consulta "agendada" que colide
// com o intervalo [dataInicio, dataFim) para o mesmo terapeuta, ou (quando
// salaID é dado) para a mesma sala. Usada como verificação prévia, antes do
// INSERT, para devolver uma resposta clara em vez de deixar rebentar na
// constraint da base de dados.
func haConflitoHorario(terapeutaID uint, salaID *uint, dataInicio, dataFim time.Time) bool {
	q := config.DB.Model(&models.Consulta{}).
		Where("estado = ?", "agendada").
		Where("data_inicio < ? AND data_fim > ?", dataFim, dataInicio)

	if salaID != nil {
		q = q.Where("terapeuta_id = ? OR sala_id = ?", terapeutaID, *salaID)
	} else {
		q = q.Where("terapeuta_id = ?", terapeutaID)
	}

	var count int64
	q.Count(&count)
	return count > 0
}

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
