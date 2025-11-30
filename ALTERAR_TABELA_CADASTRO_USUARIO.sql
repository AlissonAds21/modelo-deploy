-- ============================================
-- SCRIPT PARA ALTERAR TABELA cadastro_usuario
-- Execute este script no Neon Postgres SQL Editor
-- ============================================

-- Adicionar coluna perfil (após nome)
ALTER TABLE cadastro_usuario
ADD COLUMN IF NOT EXISTS perfil INTEGER DEFAULT 2 REFERENCES perfil_usuarios(id_perfil);

-- Atualizar perfis existentes baseado em regras:
-- Se não tiver perfil definido, definir como Cliente (2)
UPDATE cadastro_usuario
SET perfil = 2
WHERE perfil IS NULL;

-- Adicionar coluna data_cadastro (penúltima)
ALTER TABLE cadastro_usuario
ADD COLUMN IF NOT EXISTS data_cadastro TIMESTAMP DEFAULT NOW();

-- Atualizar data_cadastro para registros existentes (usar data atual se NULL)
UPDATE cadastro_usuario
SET data_cadastro = NOW()
WHERE data_cadastro IS NULL;

-- Adicionar coluna status (última)
ALTER TABLE cadastro_usuario
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Ativo';

-- Atualizar status para registros existentes (todos ficam Ativos)
UPDATE cadastro_usuario
SET status = 'Ativo'
WHERE status IS NULL;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_cadastro_usuario_perfil ON cadastro_usuario(perfil);
CREATE INDEX IF NOT EXISTS idx_cadastro_usuario_status ON cadastro_usuario(status);
CREATE INDEX IF NOT EXISTS idx_cadastro_usuario_email_status ON cadastro_usuario(email, status);

-- Comentários
COMMENT ON COLUMN cadastro_usuario.perfil IS 'ID do perfil do usuário (FK para perfil_usuarios)';
COMMENT ON COLUMN cadastro_usuario.data_cadastro IS 'Data e hora de criação da conta';
COMMENT ON COLUMN cadastro_usuario.status IS 'Status da conta: Ativo ou Inativo';

-- Verificar alterações
SELECT 'Colunas adicionadas à tabela cadastro_usuario com sucesso!' AS status;
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'cadastro_usuario' 
ORDER BY ordinal_position;

