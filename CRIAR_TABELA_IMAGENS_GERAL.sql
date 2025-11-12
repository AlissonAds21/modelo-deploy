-- ============================================
-- SCRIPT PARA CRIAR TABELA DE IMAGENS GERAIS
-- Execute este script no Neon Tech SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS imagens_geral (
  id_imagem SERIAL PRIMARY KEY,
  nome_imagem VARCHAR(255) NOT NULL UNIQUE,
  url_imagem VARCHAR(500) NOT NULL,
  tipo_arquivo VARCHAR(10) NOT NULL,
  descricao TEXT,
  data_upload TIMESTAMP DEFAULT NOW(),
  ativo BOOLEAN DEFAULT TRUE
);

-- Índice para busca rápida por nome
CREATE INDEX IF NOT EXISTS idx_imagens_geral_nome ON imagens_geral(nome_imagem);
CREATE INDEX IF NOT EXISTS idx_imagens_geral_ativo ON imagens_geral(ativo);

-- Comentários nas colunas
COMMENT ON TABLE imagens_geral IS 'Armazena URLs de imagens gerais do sistema (logos, ícones, etc.)';
COMMENT ON COLUMN imagens_geral.nome_imagem IS 'Nome identificador da imagem (ex: ampulheta, logo, etc.)';
COMMENT ON COLUMN imagens_geral.url_imagem IS 'URL completa da imagem no Supabase Storage';
COMMENT ON COLUMN imagens_geral.tipo_arquivo IS 'Extensão do arquivo (gif, png, jpg, svg, etc.)';

-- Verificar se a tabela foi criada
SELECT * FROM imagens_geral;

