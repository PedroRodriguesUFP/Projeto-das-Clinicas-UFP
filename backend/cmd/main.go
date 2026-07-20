package main

import (
	"clinica-backend/config"
	"clinica-backend/controllers"
	"clinica-backend/jobs"
	"clinica-backend/middleware"
	"clinica-backend/routes"
	"clinica-backend/utils"
	"context"
	"log"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/secure"
	"github.com/gin-gonic/gin"
)

func main() {
	config.LoadEnv()
	config.ConnectDB()

	if env := config.GetEnvOptional("ENVIRONMENT", ""); env == "" {
		log.Println("AVISO: variável ENVIRONMENT não definida — assumido 'production'. Defina ENVIRONMENT=development para ativar modo de desenvolvimento.")
	}

	googleClientID := config.GetEnvOptional("GOOGLE_CLIENT_ID", "")
	if googleClientID != "" {
		if err := utils.InitGoogle(context.Background(), googleClientID); err != nil {
			log.Printf("Aviso: Falha ao inicializar Google OAuth: %v", err)
		}
	}

	jwtSecret := config.GetEnv("JWT_SECRET")
	utils.SetJWTSecret(jwtSecret)

	// Inicializar configuração de email
	if err := utils.InitEmailConfig(); err != nil {
		log.Printf("Aviso: Falha ao inicializar email config: %v", err)
	}

	// Iniciar job de limpeza de contas não verificadas
	jobs.StartUnverifiedUserCleanupJob()
	log.Println("Job de limpeza de contas não verificadas iniciado (executa a cada 1 hora)")

	r := gin.Default()

	allowedOrigins := []string{
		"http://localhost:5173",
		"http://localhost:8000",
		"http://localhost:8001",
		"http://127.0.0.1:8000",
	}

	if envOrigins := config.GetEnvOptional("CORS_ALLOWED_ORIGINS", ""); envOrigins != "" {
		for _, origin := range strings.Split(envOrigins, ",") {
			origin = strings.TrimSpace(origin)
			if origin != "" {
				allowedOrigins = append(allowedOrigins, origin)
			}
		}
	}

	r.Use(secure.New(secure.Config{
		FrameDeny:            true,
		ContentTypeNosniff:   true,
		BrowserXssFilter:     true,
		ReferrerPolicy:       "strict-origin-when-cross-origin",
		STSSeconds:           31536000,
		STSIncludeSubdomains: true,
		IsDevelopment:        config.GetEnvOptional("APP_ENV", "development") == "development",
	}))

	r.Use(cors.New(cors.Config{
		AllowOrigins:  allowedOrigins,
		AllowMethods:  []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:  []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders: []string{"Content-Length"},
		MaxAge:        12 * time.Hour,
	}))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "root ok"})
	})

	routes.RegisterAuthRoutes(r)
	routes.RegisterElevenLabsRoutes(r)

	r.GET("/areas-clinicas", controllers.GetAreasClinicas)

	auth := r.Group("/")
	auth.Use(middleware.AuthMiddleware())
	{
		auth.GET("/consultas", controllers.GetConsultas)
		auth.GET("/consultas/disponibilidade/check", controllers.CheckDisponibilidade)
		auth.GET("/consultas/pendentes", middleware.RoleMiddleware("admin", "administrativo"), controllers.GetConsultasPendentes)
		auth.GET("/consultas/:id", controllers.GetConsultaByID)
		auth.GET("/terapeutas/:terapeuta_id/horarios-disponiveis", middleware.RoleMiddleware("admin", "administrativo", "terapeuta", "utente"), controllers.GetHorariosDisponiveis)
		auth.POST("/consultas", middleware.RoleMiddleware("admin", "administrativo", "terapeuta", "utente"), controllers.CreateConsulta)
		auth.PATCH("/consultas/:id", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.UpdateConsulta)
		auth.PATCH("/consultas/:id/estado", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.UpdateEstadoConsulta)
		auth.PUT("/consultas/:id/cancelar", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.CancelConsulta)
		auth.PATCH("/consultas/:id/validar", middleware.RoleMiddleware("admin", "administrativo"), controllers.ValidarConsulta)
		auth.PUT("/consultas/:id/remarcar", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.RemarcarConsulta)
		auth.POST("/consultas/:id/upload-pdf", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.UploadPdfConsulta)

		auth.POST("/utentes", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.CreateUtente)
		auth.GET("/utentes", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.GetUtentes)
		auth.GET("/utentes/:id", middleware.RoleMiddleware("admin", "administrativo", "terapeuta", "utente"), controllers.GetUtenteByID)
		auth.PATCH("/utentes/:id", middleware.RoleMiddleware("admin", "administrativo", "terapeuta", "utente"), controllers.UpdateUtente)
		auth.PATCH("/utentes/:id/terapeuta", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.UpdateTerapeutaUtente)
		auth.POST("/utentes/:id/avatar", middleware.RoleMiddleware("admin", "administrativo", "terapeuta", "utente"), controllers.UploadAvatar)
		auth.DELETE("/utentes/:id", middleware.RoleMiddleware("admin", "administrativo"), controllers.DeleteUtente)
		auth.GET("/utentes/:id/consultas", middleware.RoleMiddleware("admin", "administrativo", "terapeuta", "utente"), controllers.GetConsultasByUtenteID)
		auth.GET("/utentes/:id/registos-clinicos", middleware.RoleMiddleware("admin", "administrativo", "terapeuta", "utente"), controllers.GetRegistosClinicosByUtenteID)

		auth.GET("/salas", controllers.GetSalas)
		auth.GET("/exports/sala", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.ExportOcupacaoSalas)
		auth.GET("/terapeutas", middleware.RoleMiddleware("admin", "administrativo", "terapeuta", "utente"), controllers.GetTerapeutas)
		auth.GET("/terapeutas/lista-staff", middleware.RoleMiddleware("admin", "administrativo"), controllers.GetTerapeutasStaff)
		auth.GET("/terapeutas/area/:area_id", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.GetTerapeutasByArea)
		auth.GET("/terapeutas/:terapeuta_id/utentes", middleware.RoleMiddleware("admin", "administrativo"), controllers.GetUtentesDeTerapeuta)
		auth.GET("/alunos", middleware.RoleMiddleware("admin", "administrativo"), controllers.GetAlunos)
		auth.GET("/alunos-disponiveis", middleware.RoleMiddleware("terapeuta"), controllers.GetAlunosDisponiveis)
		auth.GET("/meus-alunos", middleware.RoleMiddleware("terapeuta"), controllers.GetAlunosDoProfessor)
		auth.POST("/adicionar-aluno", middleware.RoleMiddleware("terapeuta"), controllers.AdicionarAluno)
		auth.DELETE("/remover-aluno/:aluno_id", middleware.RoleMiddleware("terapeuta"), controllers.RemoverAluno)
		auth.PUT("/terapeutas/area-clinica", middleware.RoleMiddleware("terapeuta"), controllers.UpdateAreaClinica)
		auth.PUT("/terapeutas/:user_id/area-clinica", middleware.RoleMiddleware("admin", "administrativo"), controllers.UpdateAreaClinicaAdmin)

		auth.GET("/fichas-avaliacao", middleware.RoleMiddleware("admin", "terapeuta", "utente"), controllers.GetFichasAvaliacao)
		auth.GET("/fichas-avaliacao/:id", middleware.RoleMiddleware("admin", "terapeuta", "utente"), controllers.GetFichaAvaliacaoByID)
		auth.POST("/fichas-avaliacao", middleware.RoleMiddleware("admin", "terapeuta"), controllers.CreateFichaAvaliacao)
		auth.PATCH("/fichas-avaliacao/:id", middleware.RoleMiddleware("admin", "terapeuta"), controllers.UpdateFichaAvaliacao)
		auth.DELETE("/fichas-avaliacao/:id", middleware.RoleMiddleware("admin", "terapeuta"), controllers.DeleteFichaAvaliacao)

		auth.GET("/fichas-psicologia", middleware.RoleMiddleware("admin", "terapeuta", "utente"), controllers.GetFichasPsicologia)
		auth.GET("/fichas-psicologia/:id", middleware.RoleMiddleware("admin", "terapeuta", "utente"), controllers.GetFichaPsicologiaByID)
		auth.POST("/fichas-psicologia", middleware.RoleMiddleware("admin", "terapeuta"), controllers.CreateFichaPsicologia)
		auth.PATCH("/fichas-psicologia/:id", middleware.RoleMiddleware("admin", "terapeuta"), controllers.UpdateFichaPsicologia)
		auth.DELETE("/fichas-psicologia/:id", middleware.RoleMiddleware("admin", "terapeuta"), controllers.DeleteFichaPsicologia)

		auth.GET("/fichas-terapia-fala", middleware.RoleMiddleware("admin", "terapeuta", "utente"), controllers.GetFichasTerapiaFala)
		auth.GET("/fichas-terapia-fala/:id", middleware.RoleMiddleware("admin", "terapeuta", "utente"), controllers.GetFichaTerapiaFalaByID)
		auth.POST("/fichas-terapia-fala", middleware.RoleMiddleware("admin", "terapeuta"), controllers.CreateFichaTerapiaFala)
		auth.PATCH("/fichas-terapia-fala/:id", middleware.RoleMiddleware("admin", "terapeuta"), controllers.UpdateFichaTerapiaFala)
		auth.DELETE("/fichas-terapia-fala/:id", middleware.RoleMiddleware("admin", "terapeuta"), controllers.DeleteFichaTerapiaFala)

		auth.GET("/fichas-nutricao", middleware.RoleMiddleware("admin", "terapeuta", "utente"), controllers.GetFichasNutricao)
		auth.GET("/fichas-nutricao/:id", middleware.RoleMiddleware("admin", "terapeuta", "utente"), controllers.GetFichaNutricaoByID)
		auth.POST("/fichas-nutricao", middleware.RoleMiddleware("admin", "terapeuta"), controllers.CreateFichaNutricao)
		auth.PATCH("/fichas-nutricao/:id", middleware.RoleMiddleware("admin", "terapeuta"), controllers.UpdateFichaNutricao)
		auth.DELETE("/fichas-nutricao/:id", middleware.RoleMiddleware("admin", "terapeuta"), controllers.DeleteFichaNutricao)

		auth.GET("/documentos", middleware.RoleMiddleware("admin", "terapeuta"), controllers.GetDocumentos)
		auth.PATCH("/documentos/:id/validar", middleware.RoleMiddleware("admin", "terapeuta"), controllers.ValidarDocumento)

		auth.PATCH("/fichas-avaliacao/:id/validar", middleware.RoleMiddleware("admin", "terapeuta"), controllers.ValidarFichaAvaliacao)
		auth.PATCH("/fichas-psicologia/:id/validar", middleware.RoleMiddleware("admin", "terapeuta"), controllers.ValidarFichaPsicologia)
		auth.PATCH("/fichas-terapia-fala/:id/validar", middleware.RoleMiddleware("admin", "terapeuta"), controllers.ValidarFichaTerapiaFala)
		auth.PATCH("/fichas-nutricao/:id/validar", middleware.RoleMiddleware("admin", "terapeuta"), controllers.ValidarFichaNutricao)

		auth.GET("/pendentes", middleware.RoleMiddleware("admin", "terapeuta"), controllers.GetPendentes)

		auth.GET("/assiduidade", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.GetAssiduidade)
		auth.POST("/assiduidade", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.CreateAssiduidade)

		auth.GET("/admin/stats", middleware.RoleMiddleware("admin"), controllers.GetAdminStats)
		auth.GET("/admin/users", middleware.RoleMiddleware("admin"), controllers.GetStaffUsers)
		auth.PATCH("/admin/users/:id/toggle-active", middleware.RoleMiddleware("admin"), controllers.ToggleUserActive)
		auth.POST("/admin/users", middleware.RoleMiddleware("admin"), controllers.CreateStaffUser)
	}

	// Uploads: avatars públicos, PDFs protegidos — geridos num único handler
	r.GET("/uploads/*filepath", controllers.ServeUploadedFile)

	port := config.GetEnv("PORT")
	r.Run(":" + port)
}
