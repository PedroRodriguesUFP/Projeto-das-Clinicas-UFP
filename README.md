# UAAPS — Unidade Académica de Aprendizagem e Prática em Saúde

Aplicação web para gestão da clínica universitária da **Universidade Fernando Pessoa (UFP)**. Permite gerir consultas, utentes, terapeutas (alunos e professores), salas e registos clínicos, com autenticação por email ou conta Google institucional.

---

## Tecnologias

**Backend** — Go 1.22 · Gin · GORM · PostgreSQL  
**Frontend** — React 19 · Vite · React Router v7 · Bootstrap Icons  
**Autenticação** — JWT (24h) · Google OAuth (restrito a @ufp.edu.pt) · Verificação de email  
**Base de dados** — PostgreSQL com extensões `pgcrypto` e `btree_gist`

---

## Funcionalidades

- **Autenticação** — Registo com verificação de email, login com Google (@ufp.edu.pt), JWT
- **Gestão de consultas** — Agendamento, remarcação, cancelamento, estados (agendada / realizada / falta justificada / falta injustificada), upload de PDFs clínicos
- **Calendário** — Visualização mensal/semanal/diária com FullCalendar
- **Utentes** — Perfil, histórico de consultas, registos clínicos, fichas de avaliação (fisioterapia e psicologia)
- **Terapeutas** — Perfis de aluno e professor, associação de alunos a supervisores, gestão de área clínica
- **Salas** — Visualização de ocupação por hora com deteção de conflitos em tempo real
- **Controlo de acesso** — 4 roles: `admin`, `administrativo`, `terapeuta`, `utente`
- **Segurança** — Rate limiting no login, headers HTTP seguros, uploads protegidos por JWT, sanitização de paths

---

## Estrutura do Projeto

```
clinica-platform/
├── backend/              # API em Go (Gin + GORM)
│   ├── cmd/main.go       # Ponto de entrada e rotas
│   ├── controllers/      # Handlers HTTP
│   ├── middleware/       # Auth, roles, rate limiting
│   ├── models/           # Modelos GORM
│   ├── config/           # BD e variáveis de ambiente
│   └── utils/            # JWT, email, OAuth
├── frontend/             # SPA em React
│   └── src/
│       ├── pages/        # Páginas da aplicação
│       ├── components/   # Componentes reutilizáveis
│       ├── services/     # Chamadas à API
│       ├── context/      # AuthContext (estado global)
│       └── styles/       # CSS por módulo
└── database/
    ├── schema.sql        # Estrutura da base de dados
    └── seed.sql          # Dados de teste
```

---

## Configuração Local

### Pré-requisitos

- Go 1.22+
- Node.js 20+
- PostgreSQL 15+

### 1. Base de dados

```bash
# Cria a BD, aplica o schema e carrega dados de teste
./init-db.sh
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # editar com as tuas variáveis
go mod tidy
go run cmd/main.go
```

Variáveis obrigatórias no `backend/.env`:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=clinica_dev
DB_PASSWORD=clinica1234
DB_NAME=clinicplatform
JWT_SECRET=chave-secreta-longa
PORT=8080
```

Variáveis opcionais:

```env
GOOGLE_CLIENT_ID=...          # OAuth Google
SMTP_HOST=smtp.gmail.com      # Email real
SMTP_PORT=587
SMTP_USER=conta@gmail.com
SMTP_PASSWORD=app-password
APP_ENV=development            # ou production
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre em `http://localhost:5173`

---

## Roles e Permissões

| Ação | admin | administrativo | terapeuta | utente |
|------|:-----:|:--------------:|:---------:|:------:|
| Ver todas as consultas | ✓ | ✓ | próprias | próprias |
| Criar consulta | ✓ | ✓ | ✓ | ✓ |
| Editar / remarcar consulta | ✓ | ✓ | ✓ | — |
| Gerir utentes | ✓ | ✓ | ver | ver próprio |
| Gerir terapeutas / alunos | ✓ | — | gerir alunos | — |
| Fichas clínicas | ✓ | — | ✓ | — |
| Administração | ✓ | — | — | — |

---

## Email

Em desenvolvimento, sem SMTP configurado, o sistema funciona em **modo MOCK**: o código de verificação aparece nos logs do backend.

Para email real, configurar as variáveis `SMTP_*` no `.env` (ver secção acima).

---

## Autores

Projeto académico desenvolvido no âmbito da **Licenciatura em Engenharia Informática** — Universidade Fernando Pessoa.
