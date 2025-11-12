-- ============================================
-- SCRIPT COMPLETO PARA TESTAR VENDA E REDUÇÃO DE ESTOQUE
-- ============================================

-- PASSO 1: Criar um produto de teste
INSERT INTO produto (produto, marca, valor_compra, valor_venda)
VALUES ('Impressora Brother DCP', 'Brother', 1200.00, 1800.00)
RETURNING codigo_produto;

-- PASSO 2: Verificar se o estoque foi criado automaticamente (deve estar com 0)
SELECT 
    e.codigo_produto,
    p.produto,
    e.quantidade_saldo_anterior,
    e.quantidade_saldo_atual,
    e.data_movimentacao_atual
FROM estoque e
JOIN produto p ON e.codigo_produto = p.codigo_produto
WHERE p.produto = 'Impressora Brother DCP';

-- PASSO 3: Receber produto (aumentar estoque)
-- Use o codigo_produto retornado no PASSO 1 (exemplo: 1)
INSERT INTO pedido_compra (codigo_produto, quantidade, valor_unitario)
VALUES (1, 100, 1200.00);

-- PASSO 4: Verificar estoque após recebimento (deve estar com 100)
SELECT 
    e.codigo_produto,
    p.produto,
    e.quantidade_saldo_anterior AS saldo_anterior,
    e.quantidade_saldo_atual AS saldo_atual,
    e.data_movimentacao_atual
FROM estoque e
JOIN produto p ON e.codigo_produto = p.codigo_produto
WHERE e.codigo_produto = 1;

-- PASSO 5: Realizar uma venda (reduzir estoque)
-- id_vendedor = 5 (vendedor padrão)
INSERT INTO pedido_vendas (codigo_produto, id_vendedor, quantidade, valor_unitario)
VALUES (1, 5, 10, 1800.00);

-- PASSO 6: Verificar estoque após venda (deve estar com 90 = 100 - 10)
SELECT 
    e.codigo_produto,
    p.produto,
    e.quantidade_saldo_anterior AS saldo_anterior,
    e.quantidade_saldo_atual AS saldo_atual,
    (e.quantidade_saldo_anterior - e.quantidade_saldo_atual) AS quantidade_vendida,
    e.data_movimentacao_atual
FROM estoque e
JOIN produto p ON e.codigo_produto = p.codigo_produto
WHERE e.codigo_produto = 1;

-- PASSO 7: Verificar histórico de vendas
SELECT 
    pv.id_pedido,
    p.produto,
    pv.quantidade,
    pv.valor_unitario,
    pv.valor_total,
    u.cargo AS vendedor,
    pv.data_venda
FROM pedido_vendas pv
JOIN produto p ON pv.codigo_produto = p.codigo_produto
LEFT JOIN usuario u ON pv.id_vendedor = u.id_usuario
WHERE pv.codigo_produto = 1;

-- PASSO 8: Verificar histórico de vendas (tabela historico_vendas)
SELECT 
    hv.id_hist_venda,
    hv.id_pedido,
    p.produto,
    hv.quantidade,
    hv.valor_venda,
    hv.data_venda
FROM historico_vendas hv
JOIN produto p ON hv.codigo_produto = p.codigo_produto
WHERE hv.codigo_produto = 1;

-- PASSO 9: Testar venda que excede estoque (deve dar erro)
-- Este comando deve falhar com erro de estoque insuficiente
-- Descomente para testar:
-- INSERT INTO pedido_vendas (codigo_produto, id_vendedor, quantidade, valor_unitario)
-- VALUES (1, 5, 200, 1800.00);  -- Tentando vender 200 quando só tem 90

-- PASSO 10: Realizar mais uma venda para confirmar redução
INSERT INTO pedido_vendas (codigo_produto, id_vendedor, quantidade, valor_unitario)
VALUES (1, 5, 5, 1800.00);

-- PASSO 11: Verificar estoque final (deve estar com 85 = 90 - 5)
SELECT 
    e.codigo_produto,
    p.produto,
    e.quantidade_saldo_anterior AS saldo_anterior,
    e.quantidade_saldo_atual AS saldo_atual,
    e.data_movimentacao_atual
FROM estoque e
JOIN produto p ON e.codigo_produto = p.codigo_produto
WHERE e.codigo_produto = 1;

-- ============================================
-- RESUMO DO TESTE
-- ============================================
-- Estoque inicial: 0
-- Após recebimento de 100 unidades: 100
-- Após venda de 10 unidades: 90
-- Após venda de 5 unidades: 85
-- Total vendido: 15 unidades
-- Estoque final esperado: 85 unidades


