-- ============================================
-- SCRIPT PARA ADICIONAR CAMPOS DE DETALHES AO PRODUTO
-- Execute este script no Neon Tech SQL Editor
-- ============================================

-- Adicionar colunas de detalhes à tabela produto (se não existirem)
ALTER TABLE produto 
ADD COLUMN IF NOT EXISTS modelo VARCHAR(100),
ADD COLUMN IF NOT EXISTS capacidade VARCHAR(255),
ADD COLUMN IF NOT EXISTS tensao VARCHAR(50),
ADD COLUMN IF NOT EXISTS tecnologia VARCHAR(100),
ADD COLUMN IF NOT EXISTS cor VARCHAR(50),
ADD COLUMN IF NOT EXISTS garantia VARCHAR(50),
ADD COLUMN IF NOT EXISTS condicao VARCHAR(50),
ADD COLUMN IF NOT EXISTS descricao_completa TEXT;

-- Comentários nas colunas
COMMENT ON COLUMN produto.modelo IS 'Modelo do produto/serviço';
COMMENT ON COLUMN produto.capacidade IS 'Capacidade ou especificação técnica';
COMMENT ON COLUMN produto.tensao IS 'Tensão elétrica (ex: Bivolt, 110V, 220V)';
COMMENT ON COLUMN produto.tecnologia IS 'Tecnologia utilizada';
COMMENT ON COLUMN produto.cor IS 'Cor do produto';
COMMENT ON COLUMN produto.garantia IS 'Período de garantia';
COMMENT ON COLUMN produto.condicao IS 'Condição do produto (Novo, Usado, etc.)';
COMMENT ON COLUMN produto.descricao_completa IS 'Descrição completa e detalhada do produto';

-- Verificar se as colunas foram adicionadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'produto' 
ORDER BY ordinal_position;

