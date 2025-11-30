require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// === JWT CONFIG ===
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-super-segura-alterar-em-producao';
const JWT_EXPIRES_IN = '1h'; // Token expira em 1 hora

// === SUPABASE CONFIG (opcional localmente, obrigatório no Render) ===
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase Storage configurado.');
} else {
  console.warn('⚠️ SUPABASE_URL ou SUPABASE_ANON_KEY não definidos. Upload de imagens desativado.');
}

// === NEON POSTGRESQL ===
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()', (err) => {
  if (err) console.error('❌ Falha ao conectar ao Neon:', err.stack);
  else console.log('✅ Conectado ao Neon PostgreSQL!');
});

// Criar tabela (se não existir)
// IMPORTANTE: Usar aspas duplas para manter o case da coluna fotoPerfil
const createTable = `
  CREATE TABLE IF NOT EXISTS cadastro_usuario (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    "fotoPerfil" VARCHAR(500)
  );
`;
pool.query(createTable).catch(err => console.error('Erro ao criar tabela:', err));

// === MIDDLEWARES ===
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos (deve vir ANTES das rotas de API)
app.use(express.static('public'));
app.use('/imagensSite', express.static('public/imagensSite'));
app.use('/imagens', express.static('public/imagens'));

// === UPLOAD CONFIG (suporta local e Supabase) ===
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Apenas imagens são permitidas.'));
  }
});

// === ROTA: CADASTRO ===
app.post('/api/cadastro', upload.single('fotoPerfil'), async (req, res) => {
  const { nome, cpf, email, senha } = req.body;
  let fotoPerfilUrl = null;

  try {
    // ✅ UPLOAD NO SUPABASE (se configurado)
    if (supabase && req.file) {
      // Função para sanitizar nome do arquivo (remover acentos, espaços e caracteres especiais)
      function sanitizeFileName(name) {
        // Remover acentos
        const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        // Remover caracteres especiais, manter apenas letras, números, hífen, ponto e underscore
        const sanitized = normalized.replace(/[^a-zA-Z0-9._-]/g, '-');
        // Remover múltiplos hífens consecutivos
        return sanitized.replace(/-+/g, '-').replace(/^-|-$/g, '');
      }
      
      // Obter extensão do arquivo
      const fileExtension = req.file.originalname.split('.').pop() || 'jpg';
      // Sanitizar nome do arquivo original
      const sanitizedName = sanitizeFileName(req.file.originalname.replace(/\.[^/.]+$/, ''));
      // Criar nome do arquivo seguro
      const fileName = `${cpf}-${Date.now()}-${sanitizedName}.${fileExtension}`;
      
      console.log('📤 Fazendo upload:', fileName);
      
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (error) {
        console.error('❌ Erro no upload do Supabase:', error.message);
        console.error('❌ Detalhes do erro:', error);
        return res.status(500).json({ error: 'Erro ao salvar imagem: ' + error.message });
      }

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName);
      
      fotoPerfilUrl = publicUrl;
      
      // Verificar e corrigir URL se necessário (às vezes o Supabase retorna com caminho errado)
      if (fotoPerfilUrl && fotoPerfilUrl.includes('/upload/s/')) {
        fotoPerfilUrl = fotoPerfilUrl.replace('/upload/s/', '/storage/v1/object/public/uploads/');
      }
      
      console.log('✅ Foto de perfil salva no Supabase:', fotoPerfilUrl);
    }

    // ✅ (OPCIONAL) UPLOAD LOCAL — DESATIVADO POR PADRÃO
    // Se você quiser manter upload local (não recomendado para Render), descomente:
    /*
    if (!supabase && req.file) {
      const fs = require('fs');
      const uploadDir = 'public/uploads';
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const fileName = `${Date.now()}-${req.file.originalname}`;
      fs.writeFileSync(`${uploadDir}/${fileName}`, req.file.buffer);
      fotoPerfilUrl = `/uploads/${fileName}`;
    }
    */

    // Verificar duplicidade
    const check = await pool.query(
      'SELECT id FROM cadastro_usuario WHERE cpf = $1 OR email = $2',
      [cpf, email]
    );
    if (check.rows.length > 0) {
      return res.status(409).json({ error: 'CPF ou e-mail já cadastrado.' });
    }

    // Criar usuário
    const hashSenha = await bcrypt.hash(senha, 10);
    
    // Tentar inserir com "fotoPerfil" (case preservado) primeiro
    // Se falhar, tentar com fotoperfil (minúsculo)
    try {
      await pool.query(
        'INSERT INTO cadastro_usuario (nome, cpf, email, senha, "fotoPerfil") VALUES ($1, $2, $3, $4, $5)',
        [nome, cpf, email, hashSenha, fotoPerfilUrl]
      );
    } catch (insertError) {
      // Se der erro, a coluna provavelmente está em minúsculo
      if (insertError.code === '42703' || insertError.message.includes('does not exist')) {
        console.log('⚠️ Tentando com coluna em minúsculo...');
        await pool.query(
          'INSERT INTO cadastro_usuario (nome, cpf, email, senha, fotoperfil) VALUES ($1, $2, $3, $4, $5)',
          [nome, cpf, email, hashSenha, fotoPerfilUrl]
        );
      } else {
        throw insertError; // Re-lançar se for outro tipo de erro
      }
    }
    
    console.log('✅ Usuário cadastrado com foto:', fotoPerfilUrl);

    res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
  } catch (err) {
    console.error('Erro no cadastro:', err);
    res.status(500).json({ error: 'Erro interno ao cadastrar.' });
  }
});

// === MIDDLEWARE: Verificar JWT ===
function verificarToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || req.headers['x-access-token'];
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido. Faça login novamente.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }
    return res.status(401).json({ error: 'Token inválido. Faça login novamente.' });
  }
}

// === ROTA: LOGIN ===
app.post('/api/login', async (req, res) => {
  const { login, senha } = req.body;
  if (!login || !senha) {
    return res.status(400).json({ error: 'CPF/E-mail e senha são obrigatórios.' });
  }

  try {
    // Tentar primeiro com aspas (se a coluna foi criada com case preservado)
    // Se falhar, tentar sem aspas (minúsculo)
    let result;
    try {
      result = await pool.query(
        'SELECT id, nome, cpf, email, senha, "fotoPerfil" as fotoperfil FROM cadastro_usuario WHERE cpf = $1 OR email = $1',
        [login]
      );
    } catch (colError) {
      // Se der erro, a coluna provavelmente está em minúsculo
      result = await pool.query(
        'SELECT id, nome, cpf, email, senha, fotoperfil FROM cadastro_usuario WHERE cpf = $1 OR email = $1',
        [login]
      );
    }
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'CPF/E-mail ou senha inválidos.' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(senha, user.senha);
    if (!valid) return res.status(401).json({ error: 'CPF/E-mail ou senha inválidos.' });

    // Obter a URL da foto (pode estar como fotoperfil)
    let fotoPerfil = user.fotoperfil || null;
    
    // Log para debug
    console.log('📸 Foto de perfil do banco:', fotoPerfil);
    
    // Gerar JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        nome: user.nome
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      message: 'Login realizado com sucesso!',
      token: token,
      usuario: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cpf: user.cpf,
        fotoPerfil: fotoPerfil // URL completa do Supabase
      }
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno no login.' });
  }
});

// === ROTA: Verificar Token (para validação no cliente) ===
app.get('/api/verificar-sessao', verificarToken, (req, res) => {
  res.json({ 
    valid: true, 
    userId: req.userId,
    message: 'Sessão válida' 
  });
});

// ============================================
// ROTAS DE PRODUTOS
// ============================================

// Listar todos os produtos com estoque
app.get('/api/produtos', async (req, res) => {
  try {
    // Verificar se a tabela produto existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'produto'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      return res.json([]); // Retornar array vazio se tabela não existe
    }
    
    const result = await pool.query(`
      SELECT 
        p.codigo_produto,
        p.produto,
        p.marca,
        COALESCE(p.valor_compra, 0) AS valor_compra,
        COALESCE(p.valor_venda, 0) AS valor_venda,
        COALESCE(e.quantidade_saldo_atual, 0) AS estoque_atual,
        e.data_movimentacao_atual AS ultima_movimentacao
      FROM produto p
      LEFT JOIN estoque e ON p.codigo_produto = e.codigo_produto
      WHERE p.ativo = TRUE OR p.ativo IS NULL
      ORDER BY p.codigo_produto
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar produtos:', err);
    res.status(500).json({ error: 'Erro ao listar produtos: ' + err.message });
  }
});

// Buscar produto por código
app.get('/api/produtos/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    
    // Verificar se o código é válido
    if (!codigo || isNaN(codigo)) {
      return res.status(400).json({ error: 'Código do produto inválido.' });
    }
    
    const result = await pool.query(`
      SELECT 
        p.*,
        COALESCE(e.quantidade_saldo_atual, 0) AS estoque_atual
      FROM produto p
      LEFT JOIN estoque e ON p.codigo_produto = e.codigo_produto
      WHERE p.codigo_produto = $1 AND (p.ativo = TRUE OR p.ativo IS NULL)
    `, [codigo]);
    
    if (result.rows.length === 0) {
      // Verificar se o produto existe mas está inativo
      const checkInativo = await pool.query(
        'SELECT codigo_produto FROM produto WHERE codigo_produto = $1',
        [codigo]
      );
      
      if (checkInativo.rows.length > 0) {
        return res.status(404).json({ error: 'Produto encontrado mas está inativo.' });
      }
      
      return res.status(404).json({ error: 'Produto não encontrado. Verifique se o código está correto e se o produto está cadastrado no banco de dados.' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar produto:', err);
    res.status(500).json({ error: 'Erro ao buscar produto: ' + err.message });
  }
});

// Criar produto
app.post('/api/produtos', async (req, res) => {
  try {
    const { produto, marca, valor_compra, valor_venda } = req.body;
    
    if (!produto) {
      return res.status(400).json({ error: 'Nome do produto é obrigatório.' });
    }
    
    const result = await pool.query(`
      INSERT INTO produto (produto, marca, valor_compra, valor_venda)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [produto, marca || null, valor_compra || 0, valor_venda || 0]);
    
    res.status(201).json({ 
      message: 'Produto criado com sucesso!',
      produto: result.rows[0]
    });
  } catch (err) {
    console.error('Erro ao criar produto:', err);
    res.status(500).json({ error: 'Erro ao criar produto.' });
  }
});

// Atualizar produto
app.put('/api/produtos/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const { 
      produto, 
      marca, 
      valor_compra, 
      valor_venda,
      modelo,
      capacidade,
      tensao,
      tecnologia,
      cor,
      garantia,
      condicao,
      descricao_completa
    } = req.body;
    
    // Construir query dinamicamente para lidar com colunas que podem não existir
    let updateFields = [];
    let values = [];
    let paramIndex = 1;
    
    if (produto !== undefined) {
      updateFields.push(`produto = COALESCE($${paramIndex}, produto)`);
      values.push(produto);
      paramIndex++;
    }
    if (marca !== undefined) {
      updateFields.push(`marca = COALESCE($${paramIndex}, marca)`);
      values.push(marca);
      paramIndex++;
    }
    if (valor_compra !== undefined) {
      updateFields.push(`valor_compra = COALESCE($${paramIndex}, valor_compra)`);
      values.push(valor_compra);
      paramIndex++;
    }
    if (valor_venda !== undefined) {
      updateFields.push(`valor_venda = COALESCE($${paramIndex}, valor_venda)`);
      values.push(valor_venda);
      paramIndex++;
    }
    if (modelo !== undefined) {
      updateFields.push(`modelo = COALESCE($${paramIndex}, modelo)`);
      values.push(modelo);
      paramIndex++;
    }
    if (capacidade !== undefined) {
      updateFields.push(`capacidade = COALESCE($${paramIndex}, capacidade)`);
      values.push(capacidade);
      paramIndex++;
    }
    if (tensao !== undefined) {
      updateFields.push(`tensao = COALESCE($${paramIndex}, tensao)`);
      values.push(tensao);
      paramIndex++;
    }
    if (tecnologia !== undefined) {
      updateFields.push(`tecnologia = COALESCE($${paramIndex}, tecnologia)`);
      values.push(tecnologia);
      paramIndex++;
    }
    if (cor !== undefined) {
      updateFields.push(`cor = COALESCE($${paramIndex}, cor)`);
      values.push(cor);
      paramIndex++;
    }
    if (garantia !== undefined) {
      updateFields.push(`garantia = COALESCE($${paramIndex}, garantia)`);
      values.push(garantia);
      paramIndex++;
    }
    if (condicao !== undefined) {
      updateFields.push(`condicao = COALESCE($${paramIndex}, condicao)`);
      values.push(condicao);
      paramIndex++;
    }
    if (descricao_completa !== undefined) {
      updateFields.push(`descricao_completa = COALESCE($${paramIndex}, descricao_completa)`);
      values.push(descricao_completa);
      paramIndex++;
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    }
    
    values.push(codigo);
    
    // Tentar atualizar com todas as colunas, se alguma não existir, tentar sem ela
    let result;
    try {
      result = await pool.query(`
        UPDATE produto
        SET ${updateFields.join(', ')}
        WHERE codigo_produto = $${paramIndex}
        RETURNING *
      `, values);
    } catch (err) {
      // Se der erro por coluna não existir, tentar apenas com campos básicos
      if (err.message.includes('column') || err.message.includes('does not exist')) {
        console.warn('Algumas colunas de detalhes não existem, atualizando apenas campos básicos');
        const basicFields = [];
        const basicValues = [];
        let basicIndex = 1;
        
        if (produto !== undefined) {
          basicFields.push(`produto = COALESCE($${basicIndex}, produto)`);
          basicValues.push(produto);
          basicIndex++;
        }
        if (marca !== undefined) {
          basicFields.push(`marca = COALESCE($${basicIndex}, marca)`);
          basicValues.push(marca);
          basicIndex++;
        }
        if (valor_compra !== undefined) {
          basicFields.push(`valor_compra = COALESCE($${basicIndex}, valor_compra)`);
          basicValues.push(valor_compra);
          basicIndex++;
        }
        if (valor_venda !== undefined) {
          basicFields.push(`valor_venda = COALESCE($${basicIndex}, valor_venda)`);
          basicValues.push(valor_venda);
          basicIndex++;
        }
        
        basicValues.push(codigo);
        
        result = await pool.query(`
          UPDATE produto
          SET ${basicFields.join(', ')}
          WHERE codigo_produto = $${basicIndex}
          RETURNING *
        `, basicValues);
      } else {
        throw err;
      }
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    
    res.json({ 
      message: 'Produto atualizado com sucesso!',
      produto: result.rows[0]
    });
  } catch (err) {
    console.error('Erro ao atualizar produto:', err);
    res.status(500).json({ error: 'Erro ao atualizar produto: ' + err.message });
  }
});

// Desativar produto
app.delete('/api/produtos/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    await pool.query('UPDATE produto SET ativo = FALSE WHERE codigo_produto = $1', [codigo]);
    res.json({ message: 'Produto desativado com sucesso!' });
  } catch (err) {
    console.error('Erro ao desativar produto:', err);
    res.status(500).json({ error: 'Erro ao desativar produto.' });
  }
});

// ============================================
// ROTAS DE ESTOQUE
// ============================================

// Consultar estoque
app.get('/api/estoque', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.*,
        p.produto,
        p.marca
      FROM estoque e
      JOIN produto p ON e.codigo_produto = p.codigo_produto
      WHERE p.ativo = TRUE
      ORDER BY p.produto
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao consultar estoque:', err);
    res.status(500).json({ error: 'Erro ao consultar estoque.' });
  }
});

// ============================================
// ROTAS DE COMPRAS (RECEBIMENTO)
// ============================================

// Receber produto (compra)
app.post('/api/compras', async (req, res) => {
  try {
    const { codigo_produto, quantidade, valor_unitario } = req.body;
    
    if (!codigo_produto || !quantidade || !valor_unitario) {
      return res.status(400).json({ error: 'Código do produto, quantidade e valor unitário são obrigatórios.' });
    }
    
    if (quantidade <= 0) {
      return res.status(400).json({ error: 'Quantidade deve ser maior que zero.' });
    }
    
    // Verificar se produto existe
    const produtoCheck = await pool.query(
      'SELECT * FROM produto WHERE codigo_produto = $1 AND ativo = TRUE',
      [codigo_produto]
    );
    
    if (produtoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    
    // Inserir compra (trigger tg_aumentar_estoque atualiza estoque automaticamente)
    const result = await pool.query(`
      INSERT INTO pedido_compra (codigo_produto, quantidade, valor_unitario)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [codigo_produto, quantidade, valor_unitario]);
    
    res.status(201).json({ 
      message: 'Produto adicionado ao estoque com sucesso!',
      compra: result.rows[0]
    });
  } catch (err) {
    console.error('Erro ao receber produto:', err);
    res.status(500).json({ error: 'Erro ao receber produto: ' + err.message });
  }
});

// Listar histórico de compras
app.get('/api/compras', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        pc.*,
        p.produto,
        p.marca
      FROM pedido_compra pc
      JOIN produto p ON pc.codigo_produto = p.codigo_produto
      ORDER BY pc.data_compra DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar compras:', err);
    res.status(500).json({ error: 'Erro ao listar compras.' });
  }
});

// ============================================
// ROTAS DE VENDAS
// ============================================

// Realizar venda
app.post('/api/vendas', async (req, res) => {
  try {
    const { codigo_produto, quantidade, id_vendedor } = req.body;
    
    if (!codigo_produto || !quantidade || !id_vendedor) {
      return res.status(400).json({ error: 'Código do produto, quantidade e vendedor são obrigatórios.' });
    }
    
    if (quantidade <= 0) {
      return res.status(400).json({ error: 'Quantidade deve ser maior que zero.' });
    }
    
    // Buscar produto e valor de venda
    const produto = await pool.query(
      'SELECT * FROM produto WHERE codigo_produto = $1 AND ativo = TRUE',
      [codigo_produto]
    );
    
    if (produto.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    
    const valor_unitario = produto.rows[0].valor_venda;
    
    if (!valor_unitario || valor_unitario <= 0) {
      return res.status(400).json({ error: 'Produto sem valor de venda definido.' });
    }
    
    // Inserir venda (trigger baixa estoque automaticamente)
    const result = await pool.query(`
      INSERT INTO pedido_vendas (codigo_produto, id_vendedor, quantidade, valor_unitario)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [codigo_produto, id_vendedor, quantidade, valor_unitario]);
    
    res.status(201).json({ 
      message: 'Venda realizada com sucesso!',
      venda: result.rows[0]
    });
  } catch (err) {
    console.error('Erro ao realizar venda:', err);
    res.status(500).json({ error: 'Erro ao realizar venda: ' + err.message });
  }
});

// Listar histórico de vendas
app.get('/api/vendas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        pv.*,
        p.produto,
        p.marca,
        u.cargo AS cargo_vendedor
      FROM pedido_vendas pv
      JOIN produto p ON pv.codigo_produto = p.codigo_produto
      LEFT JOIN usuario u ON pv.id_vendedor = u.id_usuario
      ORDER BY pv.data_venda DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar vendas:', err);
    res.status(500).json({ error: 'Erro ao listar vendas.' });
  }
});

// ============================================
// ROTAS DE DASHBOARD/ADMIN
// ============================================

// Dashboard - estatísticas gerais
app.get('/api/dashboard', async (req, res) => {
  try {
    // Verificar se as tabelas existem antes de consultar
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'produto'
      ) as produto_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'estoque'
      ) as estoque_exists
    `);
    
    const { produto_exists, estoque_exists } = tableCheck.rows[0];
    
    if (!produto_exists || !estoque_exists) {
      return res.json({
        produtos: { total: 0 },
        estoque: { total_produtos: 0, total_estoque: 0, sem_estoque: 0 },
        vendas: { total_vendas: 0, valor_total_vendas: 0, total_itens_vendidos: 0 },
        compras: { total_compras: 0, valor_total_compras: 0 }
      });
    }
    
    const [produtos, estoque, vendas, compras] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM produto WHERE ativo = TRUE'),
      pool.query(`
        SELECT 
          COUNT(*) as total_produtos,
          COALESCE(SUM(quantidade_saldo_atual), 0) as total_estoque,
          COUNT(CASE WHEN quantidade_saldo_atual = 0 THEN 1 END) as sem_estoque
        FROM estoque
      `),
      pool.query(`
        SELECT 
          COUNT(*) as total_vendas,
          COALESCE(SUM(valor_total), 0) as valor_total_vendas,
          COALESCE(SUM(quantidade), 0) as total_itens_vendidos
        FROM pedido_vendas
        WHERE data_venda >= CURRENT_DATE - INTERVAL '30 days'
      `),
      pool.query(`
        SELECT 
          COUNT(*) as total_compras,
          COALESCE(SUM(valor_total), 0) as valor_total_compras
        FROM pedido_compra
        WHERE data_compra >= CURRENT_DATE - INTERVAL '30 days'
      `)
    ]);
    
    res.json({
      produtos: produtos.rows[0] || { total: 0 },
      estoque: estoque.rows[0] || { total_produtos: 0, total_estoque: 0, sem_estoque: 0 },
      vendas: vendas.rows[0] || { total_vendas: 0, valor_total_vendas: 0, total_itens_vendidos: 0 },
      compras: compras.rows[0] || { total_compras: 0, valor_total_compras: 0 }
    });
  } catch (err) {
    console.error('Erro ao buscar dashboard:', err);
    // Retornar valores padrão em caso de erro
    res.json({
      produtos: { total: 0 },
      estoque: { total_produtos: 0, total_estoque: 0, sem_estoque: 0 },
      vendas: { total_vendas: 0, valor_total_vendas: 0, total_itens_vendidos: 0 },
      compras: { total_compras: 0, valor_total_compras: 0 }
    });
  }
});

// Listar usuários
app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM usuario ORDER BY id_usuario');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
});

// ============================================
// ROTAS DE IMAGENS GERAIS
// ============================================

// Buscar imagem por nome
app.get('/api/imagens/:nome', async (req, res) => {
  try {
    const { nome } = req.params;
    
    const result = await pool.query(
      'SELECT url_imagem, tipo_arquivo, descricao FROM imagens_geral WHERE nome_imagem = $1 AND ativo = TRUE',
      [nome]
    );
    
    if (result.rows.length === 0) {
      // Se não encontrou na tabela, usar fallback para ampulheta
      if (nome && nome.toLowerCase() === 'ampulheta') {
        const fallbackAmpulheta = process.env.AMPULHETA_URL || 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/ampulheta.gif';
        return res.json({ url_imagem: fallbackAmpulheta, tipo_arquivo: 'gif', descricao: 'fallback: ampulheta pública' });
      }
      return res.status(404).json({ error: 'Imagem não encontrada.' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    // Se a tabela não existe (código 42P01) ou outro erro, usar fallback para ampulheta
    if (err.code === '42P01' || (err.message && err.message.includes('does not exist'))) {
      const { nome } = req.params;
      const fallbackAmpulheta = process.env.AMPULHETA_URL || 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/ampulheta.gif';
      if (nome && nome.toLowerCase() === 'ampulheta') {
        // Não logar erro quando a tabela não existe e estamos usando fallback
        return res.json({ url_imagem: fallbackAmpulheta, tipo_arquivo: 'gif', descricao: 'fallback: ampulheta pública' });
      }
      // Para outras imagens quando a tabela não existe, retornar 404
      return res.status(404).json({ error: 'Tabela de imagens não configurada. Imagem não encontrada.' });
    }

    // Log detalhado apenas para outros erros
    console.error('Erro ao buscar imagem:', err);
    res.status(500).json({ error: 'Erro ao buscar imagem: ' + (err.message || String(err)) });
  }
});

// Listar todas as imagens gerais
app.get('/api/imagens', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM imagens_geral WHERE ativo = TRUE ORDER BY nome_imagem'
    );
    res.json(result.rows);
  } catch (err) {
    // Se a tabela não existe, retornar array vazio ao invés de erro
    if (err.code === '42P01' || (err.message && err.message.includes('does not exist'))) {
      return res.json([]);
    }
    console.error('Erro ao listar imagens:', err);
    res.status(500).json({ error: 'Erro ao listar imagens.' });
  }
});

// ============================================
// ROTAS DE IMAGENS DE PRODUTOS
// ============================================

// Função para sanitizar nome do arquivo (reutilizar da rota de cadastro)
function sanitizeFileName(name) {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const sanitized = normalized.replace(/[^a-zA-Z0-9._-]/g, '-');
  return sanitized.replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// Listar imagens de um produto/serviço
app.get('/api/produtos/:codigo/imagens', async (req, res) => {
  try {
    const { codigo } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM servico_imagens WHERE codigo_servico = $1 AND ativo = TRUE ORDER BY ordem, id_imagem',
      [codigo]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar imagens do serviço:', err);
    res.status(500).json({ error: 'Erro ao listar imagens do serviço.' });
  }
});

// Upload de imagem de produto
app.post('/api/produtos/:codigo/imagens', upload.single('imagem'), async (req, res) => {
  try {
    const { codigo } = req.params;
    const { ordem, descricao } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    }
    
    // Verificar se produto existe
    const produtoCheck = await pool.query(
      'SELECT codigo_produto FROM produto WHERE codigo_produto = $1',
      [codigo]
    );
    
    if (produtoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    
    let urlImagem = null;
    
    // Upload no Supabase
    if (supabase && req.file) {
      const fileExtension = req.file.originalname.split('.').pop() || 'jpg';
      const sanitizedName = sanitizeFileName(req.file.originalname.replace(/\.[^/.]+$/, ''));
      const fileName = `servico-${codigo}-${Date.now()}-${sanitizedName}.${fileExtension}`;
      
      console.log('📤 Fazendo upload de imagem do serviço:', fileName);
      
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (error) {
        console.error('❌ Erro no upload do Supabase:', error.message);
        return res.status(500).json({ error: 'Erro ao salvar imagem: ' + error.message });
      }

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName);
      
      urlImagem = publicUrl;
      
      if (urlImagem && urlImagem.includes('/upload/s/')) {
        urlImagem = urlImagem.replace('/upload/s/', '/storage/v1/object/public/uploads/');
      }
      
      console.log('✅ Imagem do serviço salva no Supabase:', urlImagem);
    } else {
      return res.status(500).json({ error: 'Supabase não configurado. Upload de imagens desativado.' });
    }
    
    // Inserir no banco
    const result = await pool.query(
      `INSERT INTO servico_imagens (codigo_servico, url_imagem, nome_arquivo, tipo_arquivo, ordem, descricao)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        codigo,
        urlImagem,
        req.file.originalname,
        req.file.mimetype.split('/')[1] || 'jpg',
        parseInt(ordem) || 0,
        descricao || null
      ]
    );
    
    res.status(201).json({
      message: 'Imagem adicionada com sucesso!',
      imagem: result.rows[0]
    });
  } catch (err) {
    console.error('Erro ao fazer upload de imagem:', err);
    res.status(500).json({ error: 'Erro ao fazer upload de imagem: ' + err.message });
  }
});

// Atualizar ordem ou descrição de imagem
app.put('/api/produtos/:codigo/imagens/:idImagem', async (req, res) => {
  try {
    const { codigo, idImagem } = req.params;
    const { ordem, descricao } = req.body;
    
    const result = await pool.query(
      `UPDATE servico_imagens 
       SET ordem = COALESCE($1, ordem), 
           descricao = COALESCE($2, descricao)
       WHERE id_imagem = $3 AND codigo_servico = $4
       RETURNING *`,
      [ordem ? parseInt(ordem) : null, descricao || null, idImagem, codigo]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Imagem não encontrada.' });
    }
    
    res.json({
      message: 'Imagem atualizada com sucesso!',
      imagem: result.rows[0]
    });
  } catch (err) {
    console.error('Erro ao atualizar imagem:', err);
    res.status(500).json({ error: 'Erro ao atualizar imagem.' });
  }
});

// Deletar imagem de produto
app.delete('/api/produtos/:codigo/imagens/:idImagem', async (req, res) => {
  try {
    const { codigo, idImagem } = req.params;
    
    // Buscar URL da imagem para deletar do Supabase
    const imagemResult = await pool.query(
      'SELECT url_imagem, nome_arquivo FROM servico_imagens WHERE id_imagem = $1 AND codigo_servico = $2',
      [idImagem, codigo]
    );
    
    if (imagemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Imagem não encontrada.' });
    }
    
    // Deletar do Supabase (opcional - pode manter para histórico)
    if (supabase && imagemResult.rows[0].nome_arquivo) {
      try {
        // Extrair nome do arquivo da URL ou usar nome_arquivo
        const fileName = imagemResult.rows[0].nome_arquivo;
        await supabase.storage.from('uploads').remove([fileName]);
        console.log('🗑️ Imagem removida do Supabase:', fileName);
      } catch (supabaseErr) {
        console.warn('⚠️ Erro ao remover do Supabase (continuando):', supabaseErr);
      }
    }
    
    // Marcar como inativo no banco (soft delete)
    await pool.query(
      'UPDATE servico_imagens SET ativo = FALSE WHERE id_imagem = $1 AND codigo_servico = $2',
      [idImagem, codigo]
    );
    
    res.json({ message: 'Imagem removida com sucesso!' });
  } catch (err) {
    console.error('Erro ao deletar imagem:', err);
    res.status(500).json({ error: 'Erro ao deletar imagem.' });
  }
});

// === MIDDLEWARE DE TRATAMENTO DE ERROS 404 ===
app.use((req, res, next) => {
  // Se a rota começa com /api e não foi encontrada, retornar JSON
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Rota não encontrada', path: req.path });
  }
  next();
});

// === INICIAR SERVIDOR ===
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Rotas de API disponíveis:`);
  console.log(`   GET  /api/produtos`);
  console.log(`   GET  /api/produtos/:codigo`);
  console.log(`   POST /api/produtos`);
  console.log(`   GET  /api/estoque`);
  console.log(`   GET  /api/compras`);
  console.log(`   POST /api/compras`);
  console.log(`   GET  /api/vendas`);
  console.log(`   POST /api/vendas`);
  console.log(`   GET  /api/dashboard`);
  console.log(`   GET  /api/imagens`);
  console.log(`   GET  /api/imagens/:nome`);
  console.log(`   GET  /api/produtos/:codigo/imagens`);
  console.log(`   POST /api/produtos/:codigo/imagens`);
  console.log(`   PUT  /api/produtos/:codigo/imagens/:idImagem`);
  console.log(`   DELETE /api/produtos/:codigo/imagens/:idImagem`);
});