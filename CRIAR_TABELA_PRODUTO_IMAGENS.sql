-- ============================================
-- SCRIPT PARA CRIAR TABELA DE IMAGENS DE SERVIÇOS
-- Execute este script no Neon Tech SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS servico_imagens (
  id_imagem SERIAL PRIMARY KEY,
  codigo_servico INT NOT NULL REFERENCES produto(codigo_produto) ON DELETE CASCADE,
  url_imagem VARCHAR(500) NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  tipo_arquivo VARCHAR(10) NOT NULL,
  ordem INT DEFAULT 0,
  descricao TEXT,
  data_upload TIMESTAMP DEFAULT NOW(),
  ativo BOOLEAN DEFAULT TRUE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_servico_imagens_servico ON servico_imagens(codigo_servico);
CREATE INDEX IF NOT EXISTS idx_servico_imagens_ordem ON servico_imagens(codigo_servico, ordem);
CREATE INDEX IF NOT EXISTS idx_servico_imagens_ativo ON servico_imagens(ativo);

-- Comentários nas colunas
COMMENT ON TABLE servico_imagens IS 'Armazena múltiplas imagens para cada serviço';
COMMENT ON COLUMN servico_imagens.codigo_servico IS 'Código do serviço (FK para tabela produto)';
COMMENT ON COLUMN servico_imagens.url_imagem IS 'URL completa da imagem no Supabase Storage';
COMMENT ON COLUMN servico_imagens.nome_arquivo IS 'Nome original do arquivo';
COMMENT ON COLUMN servico_imagens.tipo_arquivo IS 'Extensão do arquivo (jpg, png, gif, etc.)';
COMMENT ON COLUMN servico_imagens.ordem IS 'Ordem de exibição das imagens (0 = primeira)';
COMMENT ON COLUMN servico_imagens.ativo IS 'Se FALSE, a imagem não será exibida';

-- Verificar se a tabela foi criada
SELECT * FROM servico_imagens LIMIT 1;

