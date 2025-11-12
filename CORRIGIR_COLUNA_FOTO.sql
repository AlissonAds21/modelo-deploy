-- ============================================
-- SCRIPT PARA CORRIGIR COLUNA DE FOTO DE PERFIL
-- Execute este script no Neon Tech se necessário
-- ============================================

-- Verificar se a coluna existe como 'fotoperfil' (minúsculo)
-- Se existir, renomear para 'fotoPerfil' (com case preservado)

-- Passo 1: Verificar qual é o nome atual da coluna
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cadastro_usuario' 
AND column_name LIKE '%foto%';

-- Passo 2: Se a coluna estiver como 'fotoperfil' (minúsculo), renomear
-- Descomente a linha abaixo se precisar renomear:
-- ALTER TABLE cadastro_usuario RENAME COLUMN fotoperfil TO "fotoPerfil";

-- Passo 3: Verificar se a renomeação funcionou
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cadastro_usuario' 
AND column_name LIKE '%foto%';

-- ============================================
-- ALTERNATIVA: Se preferir manter minúsculo
-- ============================================
-- Se você preferir manter a coluna como 'fotoperfil' (minúsculo),
-- não precisa fazer nada. O código já está preparado para funcionar
-- com ambos os casos.
