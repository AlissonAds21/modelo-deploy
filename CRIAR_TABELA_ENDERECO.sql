-- ============================================
-- SCRIPT PARA CRIAR TABELA DE ENDEREÇOS
-- Execute este script no Neon Postgres SQL Editor
-- ============================================

-- Criar tabela de endereços
CREATE TABLE IF NOT EXISTS endereco (
    id SERIAL PRIMARY KEY,
    cep VARCHAR(10) NOT NULL,
    logradouro VARCHAR(255),
    numero VARCHAR(20) NOT NULL,
    complemento VARCHAR(255),
    bairro VARCHAR(255),
    cidade VARCHAR(255),
    estado VARCHAR(2),
    pais VARCHAR(100) DEFAULT 'Brasil',
    tipo_endereco VARCHAR(50) NOT NULL,
    usuario_id INTEGER REFERENCES cadastro_usuario(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Adicionar coluna endereco_id na tabela cadastro_usuario (opcional)
ALTER TABLE cadastro_usuario
ADD COLUMN IF NOT EXISTS endereco_id INTEGER REFERENCES endereco(id) ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_endereco_usuario ON endereco(usuario_id);
CREATE INDEX IF NOT EXISTS idx_endereco_cep ON endereco(cep);
CREATE INDEX IF NOT EXISTS idx_endereco_tipo ON endereco(tipo_endereco);

-- Comentários
COMMENT ON TABLE endereco IS 'Tabela de endereços dos usuários';
COMMENT ON COLUMN endereco.cep IS 'CEP do endereço (8 dígitos)';
COMMENT ON COLUMN endereco.logradouro IS 'Rua, avenida, etc.';
COMMENT ON COLUMN endereco.numero IS 'Número do endereço';
COMMENT ON COLUMN endereco.complemento IS 'Complemento (apto, bloco, etc.)';
COMMENT ON COLUMN endereco.bairro IS 'Bairro';
COMMENT ON COLUMN endereco.cidade IS 'Cidade';
COMMENT ON COLUMN endereco.estado IS 'Estado (UF)';
COMMENT ON COLUMN endereco.pais IS 'País (padrão: Brasil)';
COMMENT ON COLUMN endereco.tipo_endereco IS 'Tipo: Cliente, Fornecedor ou Funcionario';
COMMENT ON COLUMN endereco.usuario_id IS 'ID do usuário que cadastrou o endereço';

-- Verificar se foi criada
SELECT 'Tabela endereco criada com sucesso!' AS status;
SELECT * FROM endereco LIMIT 1;





