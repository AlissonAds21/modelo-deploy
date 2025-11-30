-- ============================================
-- SCRIPT PARA CRIAR TABELA DE HISTÓRICO DE MOVIMENTAÇÕES
-- Execute este script no Neon Postgres SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS historico_movimentacoes (
    id_mov SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES cadastro_usuario(id) ON DELETE CASCADE,
    acao TEXT NOT NULL,
    data_mov TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_historico_movimentacoes_usuario ON historico_movimentacoes(id_usuario);
CREATE INDEX IF NOT EXISTS idx_historico_movimentacoes_data ON historico_movimentacoes(data_mov DESC);

-- Comentários
COMMENT ON TABLE historico_movimentacoes IS 'Registro de todas as ações realizadas pelos usuários';
COMMENT ON COLUMN historico_movimentacoes.id_usuario IS 'ID do usuário que realizou a ação';
COMMENT ON COLUMN historico_movimentacoes.acao IS 'Descrição da ação realizada';
COMMENT ON COLUMN historico_movimentacoes.data_mov IS 'Data e hora da movimentação';

-- Verificar se foi criada
SELECT 'Tabela historico_movimentacoes criada com sucesso!' AS status;
SELECT * FROM historico_movimentacoes LIMIT 1;

