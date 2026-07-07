package controllers

import (
	"net/http"
	"time"

	"clinica-backend/config"
	"clinica-backend/models"

	"github.com/gin-gonic/gin"
)

type PendenteFicha struct {
	ID         uint      `json:"id"`
	Tipo       string    `json:"tipo"`
	UtenteID   uint      `json:"utente_id"`
	UtenteNome string    `json:"utente_nome"`
	AlunoID    uint      `json:"aluno_id"`
	AlunoNome  string    `json:"aluno_nome"`
	ConsultaID *uint     `json:"consulta_id"`
	CreatedAt  time.Time `json:"created_at"`
}

type PendenteDocumento struct {
	ID          uint      `json:"id"`
	ConsultaID  uint      `json:"consulta_id"`
	NomeArquivo string    `json:"nome_arquivo"`
	ArquivoURL  string    `json:"arquivo_url"`
	AlunoID     uint      `json:"aluno_id"`
	AlunoNome   string    `json:"aluno_nome"`
	UtenteNome  string    `json:"utente_nome"`
	CreatedAt   time.Time `json:"created_at"`
}

func GetPendentes(c *gin.Context) {
	userID, err := getAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	if isUserAluno(userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acesso negado"})
		return
	}

	roleValue, _ := c.Get("userRole")
	role, _ := roleValue.(string)

	// Determinar IDs dos alunos supervisionados
	var alunoIDs []uint
	if role == "admin" {
		var alunos []models.Terapeuta
		config.DB.Where("tipo = 'aluno'").Find(&alunos)
		for _, a := range alunos {
			alunoIDs = append(alunoIDs, a.UserID)
		}
	} else {
		var alunos []models.Terapeuta
		config.DB.Where("supervisor_id = ? AND tipo = 'aluno'", userID).Find(&alunos)
		for _, a := range alunos {
			alunoIDs = append(alunoIDs, a.UserID)
		}
	}

	empty := gin.H{
		"fichas_avaliacao":    []PendenteFicha{},
		"fichas_psicologia":   []PendenteFicha{},
		"fichas_terapia_fala": []PendenteFicha{},
		"fichas_nutricao":     []PendenteFicha{},
		"documentos":          []PendenteDocumento{},
	}
	if len(alunoIDs) == 0 {
		c.JSON(http.StatusOK, empty)
		return
	}

	// Cache de nomes de utilizadores
	userNames := map[uint]string{}
	var users []models.User
	config.DB.Where("id IN ?", alunoIDs).Find(&users)
	for _, u := range users {
		userNames[u.ID] = u.Nome
	}

	nomeUtente := func(utenteID uint) string {
		var u models.User
		if config.DB.Joins("JOIN utentes ON utentes.user_id = users.id").
			Where("utentes.user_id = ?", utenteID).First(&u).Error == nil {
			return u.Nome
		}
		return ""
	}

	// Fichas Avaliação pendentes
	var fichasAv []models.FichaAvaliacao
	config.DB.Where("estado = 'pendente' AND created_by IN ?", alunoIDs).Find(&fichasAv)
	fichasAvResp := make([]PendenteFicha, 0, len(fichasAv))
	for _, f := range fichasAv {
		fichasAvResp = append(fichasAvResp, PendenteFicha{
			ID:         f.ID,
			Tipo:       "Fisioterapia",
			UtenteID:   f.UtenteID,
			UtenteNome: nomeUtente(f.UtenteID),
			AlunoID:    f.CreatedBy,
			AlunoNome:  userNames[f.CreatedBy],
			ConsultaID: f.ConsultaID,
			CreatedAt:  f.CreatedAt,
		})
	}

	// Fichas Psicologia pendentes
	var fichasPsic []models.FichaPsicologia
	config.DB.Where("estado = 'pendente' AND created_by IN ?", alunoIDs).Find(&fichasPsic)
	fichasPsicResp := make([]PendenteFicha, 0, len(fichasPsic))
	for _, f := range fichasPsic {
		fichasPsicResp = append(fichasPsicResp, PendenteFicha{
			ID:         f.ID,
			Tipo:       "Psicologia",
			UtenteID:   f.UtenteID,
			UtenteNome: nomeUtente(f.UtenteID),
			AlunoID:    f.CreatedBy,
			AlunoNome:  userNames[f.CreatedBy],
			ConsultaID: f.ConsultaID,
			CreatedAt:  f.CreatedAt,
		})
	}

	// Fichas Terapia da Fala pendentes
	var fichasFala []models.FichaTerapiaFala
	config.DB.Where("estado = 'pendente' AND created_by IN ?", alunoIDs).Find(&fichasFala)
	fichasFalaResp := make([]PendenteFicha, 0, len(fichasFala))
	for _, f := range fichasFala {
		fichasFalaResp = append(fichasFalaResp, PendenteFicha{
			ID:         f.ID,
			Tipo:       "Terapia da Fala",
			UtenteID:   f.UtenteID,
			UtenteNome: nomeUtente(f.UtenteID),
			AlunoID:    f.CreatedBy,
			AlunoNome:  userNames[f.CreatedBy],
			ConsultaID: f.ConsultaID,
			CreatedAt:  f.CreatedAt,
		})
	}

	// Fichas Nutrição pendentes
	var fichasNutri []models.FichaNutricao
	config.DB.Where("estado = 'pendente' AND created_by IN ?", alunoIDs).Find(&fichasNutri)
	fichasNutriResp := make([]PendenteFicha, 0, len(fichasNutri))
	for _, f := range fichasNutri {
		fichasNutriResp = append(fichasNutriResp, PendenteFicha{
			ID:         f.ID,
			Tipo:       "Nutrição",
			UtenteID:   f.UtenteID,
			UtenteNome: nomeUtente(f.UtenteID),
			AlunoID:    f.CreatedBy,
			AlunoNome:  userNames[f.CreatedBy],
			ConsultaID: f.ConsultaID,
			CreatedAt:  f.CreatedAt,
		})
	}

	// Documentos pendentes
	var docs []models.DocumentoConsulta
	config.DB.Where("estado = 'pendente' AND uploaded_by IN ?", alunoIDs).Find(&docs)
	docsResp := make([]PendenteDocumento, 0, len(docs))
	for _, d := range docs {
		utenteNomeDoc := ""
		var consulta models.Consulta
		if config.DB.Preload("Utente").First(&consulta, d.ConsultaID).Error == nil {
			utenteNomeDoc = consulta.Utente.Nome
		}
		docsResp = append(docsResp, PendenteDocumento{
			ID:          d.ID,
			ConsultaID:  d.ConsultaID,
			NomeArquivo: d.NomeArquivo,
			ArquivoURL:  d.ArquivoURL,
			AlunoID:     d.UploadedBy,
			AlunoNome:   userNames[d.UploadedBy],
			UtenteNome:  utenteNomeDoc,
			CreatedAt:   d.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"fichas_avaliacao":    fichasAvResp,
		"fichas_psicologia":   fichasPsicResp,
		"fichas_terapia_fala": fichasFalaResp,
		"fichas_nutricao":     fichasNutriResp,
		"documentos":          docsResp,
	})
}
