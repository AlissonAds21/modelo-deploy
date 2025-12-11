-- ============================================
-- SCRIPT PARA CRIAR TABELA DE PERFIS DE USUÁRIOS
-- Execute este script no Neon Postgres SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS perfil_usuarios (
    id_perfil SERIAL PRIMARY KEY,
    perfil VARCHAR(50) NOT NULL
);

-- Inserir perfis padrão
INSERT INTO perfil_usuarios (id_perfil, perfil) VALUES
(1, 'Master'),
(2, 'Cliente'),
(3, 'Profissional')
ON CONFLICT (id_perfil) DO NOTHING;

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_perfil_usuarios_perfil ON perfil_usuarios(perfil);

-- Comentários
COMMENT ON TABLE perfil_usuarios IS 'Tabela de perfis de usuários do sistema';
COMMENT ON COLUMN perfil_usuarios.id_perfil IS 'ID único do perfil (1=Master, 2=Cliente, 3=Profissional)';
COMMENT ON COLUMN perfil_usuarios.perfil IS 'Nome do perfil';

-- Verificar se foi criada
SELECT 'Tabela perfil_usuarios criada com sucesso!' AS status;
SELECT * FROM perfil_usuarios;





