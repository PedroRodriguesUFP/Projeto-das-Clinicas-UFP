#!/bin/bash

# Script para inicializar a base de dados localmente para desenvolvimento
# Uso: ./init-db.sh

set -e

echo "🔧 Inicializando base de dados local para desenvolvimento..."
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Passo 1: Criar utilizador e BD
echo -e "${BLUE}[1/3]${NC} Criando utilizador 'clinica_dev' e base de dados 'clinicplatform'..."
sudo -u postgres psql << 'EOF'
SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'clinicplatform' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS clinicplatform;
DROP ROLE IF EXISTS clinica_dev;
CREATE USER clinica_dev WITH PASSWORD 'clinica1234';
CREATE DATABASE clinicplatform OWNER clinica_dev;
GRANT ALL PRIVILEGES ON DATABASE clinicplatform TO clinica_dev;
EOF
echo -e "${GREEN}✓ Utilizador e BD criados com sucesso${NC}"
echo ""

# Passo 2: Aplicar schema
echo -e "${BLUE}[2/3]${NC} Aplicando schema da base de dados..."
PGPASSWORD='clinica1234' psql -h 127.0.0.1 -U clinica_dev -d clinicplatform -f database/schema.sql > /dev/null 2>&1
echo -e "${GREEN}✓ Schema aplicado com sucesso${NC}"
echo ""

# Passo 3: Aplicar seed
echo -e "${BLUE}[3/3]${NC} Carregando dados de teste (seed)..."
PGPASSWORD='clinica1234' psql -h 127.0.0.1 -U clinica_dev -d clinicplatform -f database/seed.sql > /dev/null 2>&1
echo -e "${GREEN}✓ Dados de teste carregados com sucesso${NC}"
echo ""

# Verificação
echo -e "${BLUE}Verificando...${NC}"
USER_COUNT=$(PGPASSWORD='clinica1234' psql -h 127.0.0.1 -U clinica_dev -d clinicplatform -t -c "SELECT COUNT(*) FROM users;")
echo -e "${GREEN}✓ Base de dados pronta com $USER_COUNT utilizadores${NC}"
echo ""

echo -e "${GREEN}🎉 Base de dados inicializada com sucesso!${NC}"
echo ""
echo "Próximos passos:"
echo "1. Certifique-se que o .env está configurado (já está pronto)"
echo "2. Inicie o backend: cd backend && go run cmd/main.go"
echo "3. Inicie o frontend: cd frontend && npm run dev"
echo ""
