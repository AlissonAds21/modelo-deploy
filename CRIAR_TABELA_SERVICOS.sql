-- ============================================
-- SCRIPT PARA CRIAR TABELA DE SERVIÇOS
-- Execute este script no Neon Postgres SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS servicos (
    id_servico SERIAL PRIMARY KEY,
    tipo_servico VARCHAR(100),
    titulo_servico VARCHAR(100),
    servico VARCHAR(200),
    descricao_servico TEXT,
    valor_servico NUMERIC(10,2)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_servicos_tipo ON servicos(tipo_servico);
CREATE INDEX IF NOT EXISTS idx_servicos_titulo ON servicos(titulo_servico);

-- Comentários
COMMENT ON TABLE servicos IS 'Tabela de serviços oferecidos';
COMMENT ON COLUMN servicos.tipo_servico IS 'Tipo/categoria do serviço';
COMMENT ON COLUMN servicos.titulo_servico IS 'Título do serviço';
COMMENT ON COLUMN servicos.servico IS 'Nome do serviço';
COMMENT ON COLUMN servicos.descricao_servico IS 'Descrição detalhada do serviço';
COMMENT ON COLUMN servicos.valor_servico IS 'Valor do serviço';

-- Verificar se foi criada
SELECT 'Tabela servicos criada com sucesso!' AS status;
SELECT * FROM servicos LIMIT 1;

