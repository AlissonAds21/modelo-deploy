-- ============================================
-- SCRIPT PARA ATUALIZAR TABELA DE SERVIÇOS
-- Execute este script no Neon Postgres SQL Editor
-- ============================================

-- Adicionar colunas se não existirem
ALTER TABLE servicos
ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES cadastro_usuario(id) ON DELETE CASCADE;

ALTER TABLE servicos
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

ALTER TABLE servicos
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_servicos_usuario ON servicos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_servicos_created_at ON servicos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_servicos_ativo ON servicos(ativo);

-- Comentários
COMMENT ON COLUMN servicos.usuario_id IS 'ID do usuário que criou o serviço (Profissional ou Master)';
COMMENT ON COLUMN servicos.created_at IS 'Data de criação do serviço';
COMMENT ON COLUMN servicos.ativo IS 'Se FALSE, o serviço não será exibido';

-- Verificar se foi atualizada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'servicos' 
ORDER BY ordinal_position;

