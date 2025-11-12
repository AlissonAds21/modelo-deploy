-- ============================================
-- SCRIPT PARA VERIFICAR E CORRIGIR COLUNA DE FOTO
-- Execute este script no Neon Tech SQL Editor
-- ============================================

-- PASSO 1: Verificar qual é o nome atual da coluna
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cadastro_usuario' 
AND (column_name LIKE '%foto%' OR column_name LIKE '%Foto%');

-- PASSO 2: Se a coluna estiver como 'fotoperfil' (minúsculo), renomear para 'fotoPerfil'
-- Descomente a linha abaixo APENAS se o PASSO 1 mostrar que a coluna está como 'fotoperfil':
-- ALTER TABLE cadastro_usuario RENAME COLUMN fotoperfil TO "fotoPerfil";

-- PASSO 3: Se a coluna não existir, criar
-- Descomente as linhas abaixo APENAS se o PASSO 1 não retornar nenhuma coluna de foto:
-- ALTER TABLE cadastro_usuario ADD COLUMN "fotoPerfil" VARCHAR(500);

-- PASSO 4: Verificar se a correção funcionou
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cadastro_usuario' 
AND (column_name LIKE '%foto%' OR column_name LIKE '%Foto%');

-- ============================================
-- NOTA IMPORTANTE
-- ============================================
-- O código do servidor agora funciona com AMBOS os casos:
-- - Se a coluna estiver como "fotoPerfil" (com aspas, case preservado)
-- - Se a coluna estiver como "fotoperfil" (minúsculo, sem aspas)
-- 
-- Você NÃO precisa renomear a coluna se não quiser.
-- O código tentará ambos os formatos automaticamente.

