-- seed.sql: Limpar BD e criar utilizadores base para testes
-- Executar contra a BD de produção (Supabase) quando necessário reset
-- Password de todos os novos utilizadores: Clinica2026!

BEGIN;

-- ============================================================
-- 1. APAGAR DADOS CLÍNICOS (ordem inversa de dependências)
-- ============================================================
DELETE FROM avaliacoes_objetivas;
DELETE FROM fichas_avaliacao;
DELETE FROM fichas_psicologia;
DELETE FROM fichas_terapia_fala;
DELETE FROM documentos_consulta;
DELETE FROM registos_clinicos;
DELETE FROM assiduidade;
DELETE FROM processos_clinicos;
DELETE FROM consultas;
DELETE FROM sala_area_clinica; 
DELETE FROM salas;

-- ============================================================
-- 2. APAGAR UTILIZADORES FORA DO KEEP-LIST
-- ============================================================
DELETE FROM users
WHERE email NOT IN (
  'admin@clinica.pt',
  'joao@clinica.pt',
  'ana@clinica.pt',
  'rececao@clinica.pt',
  'professor@ufp.edu.pt',
  '0001@ufp.edu.pt',
  '0002@ufp.edu.pt',
  '0003@ufp.edu.pt',
  '2023108685@ufp.edu.pt'
);

-- ============================================================
-- 3. GARANTIR QUE AS ÁREAS CLÍNICAS EXISTEM
-- ============================================================
INSERT INTO areas_clinicas (id, nome) VALUES 
(1, 'Psicologia'), 
(2, 'Nutrição'), 
(3, 'Fisioterapia'), 
(4, 'Terapia da Fala')
ON CONFLICT (nome) DO NOTHING;

-- ============================================================
-- 3.5. CRIAR SALAS E ASSOCIAR ÀS ÁREAS CLÍNICAS
-- ============================================================
-- Inserir as 12 salas (com IDs fixos para facilitar a associação)
INSERT INTO salas (id, nome, descricao, ativa) VALUES
  -- Psicologia
  (1, 'Gabinete Psicologia 1', 'Sala de consultas individual', TRUE),
  (2, 'Gabinete Psicologia 2', 'Sala de consultas individual', TRUE),
  (3, 'Gabinete Psicologia 3', 'Sala de consultas individual', TRUE),
  -- Nutrição
  (4, 'Gabinete Nutrição 1', 'Sala com balança de bioimpedância', TRUE),
  (5, 'Gabinete Nutrição 2', 'Sala de consultas individual', TRUE),
  (6, 'Gabinete Nutrição 3', 'Sala de consultas individual', TRUE),
  -- Fisioterapia
  (7, 'Ginásio Fisioterapia A', 'Espaço amplo partilhado', TRUE),
  (8, 'Ginásio Fisioterapia B', 'Espaço amplo partilhado', TRUE),
  (9, 'Box de Tratamento 1', 'Box fechada para tratamentos localizados', TRUE),
  -- Terapia da Fala
  (10, 'Gabinete Terapia Fala 1', 'Sala insonorizada', TRUE),
  (11, 'Gabinete Terapia Fala 2', 'Sala insonorizada', TRUE),
  (12, 'Gabinete Terapia Fala 3', 'Sala insonorizada', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Ajustar o relógio interno da base de dados para os IDs (evita erros futuros ao criar salas novas no software)
SELECT setval('salas_id_seq', (SELECT MAX(id) FROM salas));

-- Associar as salas às áreas respetivas (na tabela de ligação)
INSERT INTO sala_area_clinica (sala_id, area_clinica_id) VALUES
  (1, 1), (2, 1), (3, 1),       -- Psicologia (ID 1)
  (4, 2), (5, 2), (6, 2),       -- Nutrição (ID 2)
  (7, 3), (8, 3), (9, 3),       -- Fisioterapia (ID 3)
  (10, 4), (11, 4), (12, 4)     -- Terapia da Fala (ID 4)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. ADICIONAR PROFESSORES EM FALTA E ADMIN
-- ============================================================
INSERT INTO users (nome, email, password_hash, role, active, email_verified)
VALUES
  ('Administrador Sistema', 'admin@clinica.pt', crypt('admin', gen_salt('bf')), 'admin', TRUE, TRUE)
ON CONFLICT (email) WHERE email IS NOT NULL AND email <> '' DO NOTHING;

-- Inserir o Professor de Teste (que vais usar no bypass)
INSERT INTO users (nome, email, password_hash, role, active, email_verified)
VALUES
  ('Professor Teste', 'professor@ufp.edu.pt', crypt('professor', gen_salt('bf')), 'terapeuta', TRUE, TRUE)
ON CONFLICT (email) WHERE email IS NOT NULL AND email <> '' DO NOTHING;


INSERT INTO users (nome, email, password_hash, role, active)
VALUES
  ('Professor Fisioterapia', 'professor.fisio@ufp.edu.pt',
   crypt('Clinica2026!', gen_salt('bf')), 'terapeuta', TRUE),
  ('Professor Terapia Fala', 'professor.fala@ufp.edu.pt',
   crypt('Clinica2026!', gen_salt('bf')), 'terapeuta', TRUE)
ON CONFLICT (email) WHERE email IS NOT NULL AND email <> '' DO NOTHING;

-- Associar à tabela terapeutas
INSERT INTO terapeutas (user_id, tipo, area_clinica_id)
SELECT id, 'professor', 3
FROM users WHERE email = 'professor.fisio@ufp.edu.pt'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO terapeutas (user_id, tipo, area_clinica_id)
SELECT id, 'professor', 4
FROM users WHERE email = 'professor.fala@ufp.edu.pt'
ON CONFLICT (user_id) DO NOTHING;

-- Garantir que professor@ufp.edu.pt também está na tabela terapeutas
INSERT INTO terapeutas (user_id, tipo, area_clinica_id)
SELECT id, 'professor', 1
FROM users WHERE email = 'professor@ufp.edu.pt'
ON CONFLICT (user_id) DO NOTHING;

-- Atualizar supervisor de 2023108685@ para professor.fisio@
UPDATE terapeutas
SET supervisor_id = (SELECT id FROM users WHERE email = 'professor.fisio@ufp.edu.pt')
WHERE user_id = (SELECT id FROM users WHERE email = '2023108685@ufp.edu.pt');

-- Atualizar área de 2023108685@ para Fisioterapia (área 3)
UPDATE terapeutas
SET area_clinica_id = 3
WHERE user_id = (SELECT id FROM users WHERE email = '2023108685@ufp.edu.pt');

-- ============================================================
-- 5. CRIAR UTENTES DE TESTE
-- ============================================================
INSERT INTO users (nome, email, password_hash, role, active)
VALUES
  ('Ana Sofia Rodrigues',    'ana.rodrigues@teste.pt',    crypt('Clinica2026!', gen_salt('bf')), 'utente', TRUE),
  ('Bruno Miguel Ferreira',  'bruno.ferreira@teste.pt',   crypt('Clinica2026!', gen_salt('bf')), 'utente', TRUE),
  ('Catarina Isabel Mendes', 'catarina.mendes@teste.pt',  crypt('Clinica2026!', gen_salt('bf')), 'utente', TRUE),
  ('David André Santos',     'david.santos@teste.pt',     crypt('Clinica2026!', gen_salt('bf')), 'utente', TRUE),
  ('Filipa Margarida Lopes', 'filipa.lopes@teste.pt',     crypt('Clinica2026!', gen_salt('bf')), 'utente', TRUE),
  ('Gonçalo Rui Carvalho',   'goncalo.carvalho@teste.pt', crypt('Clinica2026!', gen_salt('bf')), 'utente', TRUE),
  ('Helena Cristina Neves',  'helena.neves@teste.pt',     crypt('Clinica2026!', gen_salt('bf')), 'utente', TRUE),
  ('Ivo Luís Martins',       'ivo.martins@teste.pt',      crypt('Clinica2026!', gen_salt('bf')), 'utente', TRUE)
ON CONFLICT (email) WHERE email IS NOT NULL AND email <> '' DO NOTHING;

-- Criar registos na tabela utentes (sem terapeuta atribuído)
INSERT INTO utentes (user_id, data_nascimento, numero_processo)
SELECT
  id,
  CASE email
    WHEN 'ana.rodrigues@teste.pt'    THEN '1990-03-14'::DATE
    WHEN 'bruno.ferreira@teste.pt'   THEN '1985-07-22'::DATE
    WHEN 'catarina.mendes@teste.pt'  THEN '1992-11-05'::DATE
    WHEN 'david.santos@teste.pt'     THEN '1978-01-30'::DATE
    WHEN 'filipa.lopes@teste.pt'     THEN '2001-09-18'::DATE
    WHEN 'goncalo.carvalho@teste.pt' THEN '1995-04-27'::DATE
    WHEN 'helena.neves@teste.pt'     THEN '1988-12-03'::DATE
    WHEN 'ivo.martins@teste.pt'      THEN '2003-06-15'::DATE
  END,
  'PROC-' || LPAD(id::TEXT, 4, '0')
FROM users
WHERE email IN (
  'ana.rodrigues@teste.pt', 'bruno.ferreira@teste.pt', 'catarina.mendes@teste.pt',
  'david.santos@teste.pt', 'filipa.lopes@teste.pt', 'goncalo.carvalho@teste.pt',
  'helena.neves@teste.pt', 'ivo.martins@teste.pt'
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 6. FORÇAR EMAILS VERIFICADOS PARA TESTES LOCAIS
-- ============================================================
UPDATE users SET email_verified = TRUE;

COMMIT;