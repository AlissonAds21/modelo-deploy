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

// Função auxiliar para construir URL pública do Supabase
function construirUrlSupabase(fileName) {
  if (!supabaseUrl) {
    console.error('❌ SUPABASE_URL não definido');
    return null;
  }
  
  // Limpar e sanitizar o nome do arquivo
  const cleanFileName = fileName.trim().replace(/^\/+/, ''); // Remove barras iniciais
  
  const baseUrl = supabaseUrl.replace(/\/$/, ''); // Remove barra final se houver
  // Usar encodeURIComponent para garantir que caracteres especiais sejam tratados corretamente
  const encodedFileName = encodeURIComponent(cleanFileName);
  const url = `${baseUrl}/storage/v1/object/public/uploads/${encodedFileName}`;
  
  // Validar URL
  if (!url.startsWith('http')) {
    console.error('❌ URL construída inválida:', url);
    return null;
  }
  
  return url;
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

// Criar tabelas (se não existirem)
// IMPORTANTE: Usar aspas duplas para manter o case da coluna fotoPerfil

// Criar tabela de perfis primeiro
const createPerfilTable = `
  CREATE TABLE IF NOT EXISTS perfil_usuarios (
    id_perfil SERIAL PRIMARY KEY,
    perfil VARCHAR(50) NOT NULL
  );
`;
pool.query(createPerfilTable).catch(err => console.error('Erro ao criar tabela perfil_usuarios:', err));

// Inserir perfis padrão
pool.query(`
  INSERT INTO perfil_usuarios (id_perfil, perfil) VALUES
  (1, 'Master'),
  (2, 'Cliente'),
  (3, 'Profissional')
  ON CONFLICT (id_perfil) DO NOTHING;
`).catch(err => console.error('Erro ao inserir perfis:', err));

// Criar tabela de histórico
const createHistoricoTable = `
  CREATE TABLE IF NOT EXISTS historico_movimentacoes (
    id_mov SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES cadastro_usuario(id_usuario) ON DELETE CASCADE,
    acao TEXT NOT NULL,
    data_mov TIMESTAMP DEFAULT NOW()
  );
`;
pool.query(createHistoricoTable).catch(err => console.error('Erro ao criar tabela historico_movimentacoes:', err));

// Criar tabela de serviços
const createServicosTable = `
  CREATE TABLE IF NOT EXISTS servicos (
    id_servico SERIAL PRIMARY KEY,
    tipo_servico VARCHAR(100),
    titulo_servico VARCHAR(100),
    servico VARCHAR(200),
    descricao_servico TEXT,
    valor_servico NUMERIC(10,2),
    usuario_id INTEGER REFERENCES cadastro_usuario(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    ativo BOOLEAN DEFAULT TRUE
  );
`;
pool.query(createServicosTable).catch(err => console.error('Erro ao criar tabela servicos:', err));

// Criar tabelas de anúncios (em sequência para garantir ordem)
(async () => {
  try {
    // 1. Criar tabela de anúncios primeiro
    await pool.query(`
      CREATE TABLE IF NOT EXISTS anuncios (
        id_anuncio SERIAL PRIMARY KEY,
        tipo_servico VARCHAR(100) NOT NULL,
        especialidade VARCHAR(100) NOT NULL,
        valor DECIMAL(20,2) NOT NULL,
        titulo_anuncio VARCHAR(100) NOT NULL,
        descricao_anuncio VARCHAR(100) NOT NULL,
        usuario_id INTEGER REFERENCES cadastro_usuario(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        ativo BOOLEAN DEFAULT TRUE,
        vendido BOOLEAN DEFAULT FALSE
      );
    `);
    console.log('✅ Tabela anuncios criada/verificada');
    
    // 2. Criar tabela de imagens de anúncios (depende de anuncios)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS imagens_anuncios (
        id_imagens SERIAL PRIMARY KEY,
        id_anuncio INTEGER NOT NULL REFERENCES anuncios(id_anuncio) ON DELETE CASCADE,
        url_imagens VARCHAR(200) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Tabela imagens_anuncios criada/verificada');
    
    // Adicionar coluna vendido se não existir
    await pool.query(`
      ALTER TABLE anuncios
      ADD COLUMN IF NOT EXISTS vendido BOOLEAN DEFAULT FALSE;
    `).catch(err => console.error('Erro ao adicionar coluna vendido:', err));
    
    // Adicionar coluna is_principal se não existir
    await pool.query(`
      ALTER TABLE imagens_anuncios
      ADD COLUMN IF NOT EXISTS is_principal BOOLEAN DEFAULT FALSE;
    `).catch(err => console.error('Erro ao adicionar coluna is_principal:', err));
    
    // 3. Criar índices (dependem das tabelas existirem)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_imagens_anuncios_id_anuncio ON imagens_anuncios(id_anuncio);
    `);
    console.log('✅ Índice idx_imagens_anuncios_id_anuncio criado/verificado');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_imagens_anuncios_id_imagens ON imagens_anuncios(id_imagens DESC);
    `);
    console.log('✅ Índice idx_imagens_anuncios_id_imagens criado/verificado');
  } catch (err) {
    console.error('❌ Erro ao criar tabelas/índices de anúncios:', err.message);
  }
})();

// Adicionar colunas se não existirem
pool.query(`
  ALTER TABLE servicos
  ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES cadastro_usuario(id) ON DELETE CASCADE;
`).catch(err => console.error('Erro ao adicionar coluna usuario_id:', err));

pool.query(`
  ALTER TABLE servicos
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
`).catch(err => console.error('Erro ao adicionar coluna created_at:', err));

pool.query(`
  ALTER TABLE servicos
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;
`).catch(err => console.error('Erro ao adicionar coluna ativo:', err));

// Criar tabela cadastro_usuario com novas colunas
const createTable = `
  CREATE TABLE IF NOT EXISTS cadastro_usuario (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    perfil INTEGER DEFAULT 2 REFERENCES perfil_usuarios(id_perfil),
    cpf VARCHAR(14) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    "fotoPerfil" VARCHAR(500),
    data_cadastro TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'Ativo'
  );
`;
pool.query(createTable).catch(err => console.error('Erro ao criar tabela:', err));

// Adicionar colunas se não existirem (para tabelas já criadas)
pool.query(`
  ALTER TABLE cadastro_usuario
  ADD COLUMN IF NOT EXISTS perfil INTEGER DEFAULT 2 REFERENCES perfil_usuarios(id_perfil);
`).catch(err => console.error('Erro ao adicionar coluna perfil:', err));

pool.query(`
  ALTER TABLE cadastro_usuario
  ADD COLUMN IF NOT EXISTS data_cadastro TIMESTAMP DEFAULT NOW();
`).catch(err => console.error('Erro ao adicionar coluna data_cadastro:', err));

pool.query(`
  ALTER TABLE cadastro_usuario
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Ativo';
`).catch(err => console.error('Erro ao adicionar coluna status:', err));

// Atualizar registros existentes
pool.query(`
  UPDATE cadastro_usuario
  SET perfil = 2, status = 'Ativo', data_cadastro = COALESCE(data_cadastro, NOW())
  WHERE perfil IS NULL OR status IS NULL OR data_cadastro IS NULL;
`).catch(err => console.error('Erro ao atualizar registros:', err));

// === MIDDLEWARES ===
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos (deve vir ANTES das rotas de API)
// Servir arquivos estáticos
app.use(express.static('public'));
app.use('/imagensSite', express.static('public/imagensSite'));
app.use('/imagens', express.static('public/imagens'));

// Garantir que a rota raiz sempre sirva index.html
// Endpoint de teste para verificar configuração do Supabase
app.get('/api/test/supabase', (req, res) => {
  const info = {
    supabaseUrl: supabaseUrl ? '✅ Configurado' : '❌ Não configurado',
    supabaseAnonKey: supabaseAnonKey ? '✅ Configurado' : '❌ Não configurado',
    supabaseClient: supabase ? '✅ Inicializado' : '❌ Não inicializado',
    urlExemplo: supabaseUrl ? construirUrlSupabase('teste.jpg') : null,
    urlBase: supabaseUrl || null
  };
  
  console.log('📋 Informações do Supabase:', info);
  res.json(info);
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

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
  const { nome, cpf, email, senha, perfil } = req.body;
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

      // Usar função auxiliar para construir URL (mais confiável)
      fotoPerfilUrl = construirUrlSupabase(fileName);
      
      if (!fotoPerfilUrl) {
        // Fallback: tentar usar getPublicUrl do Supabase
        try {
          const { data: { publicUrl } } = supabase.storage
            .from('uploads')
            .getPublicUrl(fileName);
          
          fotoPerfilUrl = publicUrl;
          
          // Verificar e corrigir URL se necessário (às vezes o Supabase retorna com caminho errado)
          if (fotoPerfilUrl && fotoPerfilUrl.includes('/upload/s/')) {
            fotoPerfilUrl = fotoPerfilUrl.replace('/upload/s/', '/storage/v1/object/public/uploads/');
          }
        } catch (urlError) {
          console.error('❌ Erro ao obter URL pública:', urlError);
          fotoPerfilUrl = null;
        }
      }
      
      // Validar URL final
      if (!fotoPerfilUrl || !fotoPerfilUrl.startsWith('http')) {
        console.error('❌ URL de foto de perfil inválida:', fotoPerfilUrl);
        fotoPerfilUrl = null;
      } else {
        console.log('✅ Foto de perfil salva no Supabase:', fotoPerfilUrl);
      }
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

    // Validar perfil (2 = Cliente, 3 = Profissional, padrão = 2)
    const perfilId = perfil ? parseInt(perfil) : 2;
    if (perfilId !== 2 && perfilId !== 3) {
      return res.status(400).json({ error: 'Perfil inválido. Use Cliente (2) ou Profissional (3).' });
    }
    
    // Criar usuário (perfil padrão = 2 = Cliente, status = 'Ativo')
    const hashSenha = await bcrypt.hash(senha, 10);
    
    let userId;
    
    // Tentar inserir com "fotoPerfil" (case preservado) primeiro
    // Se falhar, tentar com fotoperfil (minúsculo)
    try {
      const result = await pool.query(
        'INSERT INTO cadastro_usuario (nome, perfil, cpf, email, senha, "fotoPerfil", status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [nome, perfilId, cpf, email, hashSenha, fotoPerfilUrl, 'Ativo']
      );
      userId = result.rows[0].id;
    } catch (insertError) {
      // Se der erro, a coluna provavelmente está em minúsculo
      if (insertError.code === '42703' || insertError.message.includes('does not exist')) {
        console.log('⚠️ Tentando com coluna em minúsculo...');
        const result = await pool.query(
          'INSERT INTO cadastro_usuario (nome, perfil, cpf, email, senha, fotoperfil, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
          [nome, perfilId, cpf, email, hashSenha, fotoPerfilUrl, 'Ativo']
        );
        userId = result.rows[0].id;
      } else {
        throw insertError; // Re-lançar se for outro tipo de erro
      }
    }
    
    // Registrar histórico: conta criada
    await registrarHistorico(userId, 'Conta criada com sucesso');
    
    console.log('✅ Usuário cadastrado com foto:', fotoPerfilUrl);

    res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
  } catch (err) {
    console.error('Erro no cadastro:', err);
    res.status(500).json({ error: 'Erro interno ao cadastrar.' });
  }
});

// === FUNÇÃO: Registrar histórico de movimentações ===
async function registrarHistorico(idUsuario, acao) {
  try {
    await pool.query(
      'INSERT INTO historico_movimentacoes (id_usuario, acao) VALUES ($1, $2)',
      [idUsuario, acao]
    );
  } catch (err) {
    console.error('Erro ao registrar histórico:', err);
    // Não bloquear operação se histórico falhar
  }
}

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
    req.userPerfil = decoded.perfil; // Adicionar perfil ao request
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }
    return res.status(401).json({ error: 'Token inválido. Faça login novamente.' });
  }
}

// === MIDDLEWARE: Verificar se é Master ===
function verificarMaster(req, res, next) {
  if (req.userPerfil !== 1) {
    return res.status(403).json({ error: 'Acesso negado. Apenas usuários Master podem realizar esta ação.' });
  }
  next();
}

// === ROTA: LOGIN ===
app.post('/api/login', async (req, res) => {
  const { login, senha } = req.body;
  if (!login || !senha) {
    return res.status(400).json({ error: 'E-mail, CPF ou senha incorretos.' });
  }

  try {
    // Normalizar o login (trim e lowercase para email)
    const loginNormalizado = login.trim();
    
    // Buscar usuário com perfil e status - aceita email OU cpf
    let result;
    try {
      result = await pool.query(
        `SELECT u.id, u.nome, u.cpf, u.email, u.senha, u.perfil, u.status, 
                u."fotoPerfil" as fotoperfil, p.perfil as nome_perfil
         FROM cadastro_usuario u
         LEFT JOIN perfil_usuarios p ON u.perfil = p.id_perfil
         WHERE (LOWER(u.email) = LOWER($1) OR u.cpf = $1)`,
        [loginNormalizado]
      );
    } catch (colError) {
      // Se der erro, tentar sem aspas (minúsculo)
      result = await pool.query(
        `SELECT u.id, u.nome, u.cpf, u.email, u.senha, u.perfil, u.status, 
                u.fotoperfil, p.perfil as nome_perfil
         FROM cadastro_usuario u
         LEFT JOIN perfil_usuarios p ON u.perfil = p.id_perfil
         WHERE (LOWER(u.email) = LOWER($1) OR u.cpf = $1)`,
        [loginNormalizado]
      );
    }
    
    if (result.rows.length === 0) {
      console.log('❌ Usuário não encontrado para login:', loginNormalizado);
      return res.status(401).json({ error: 'E-mail, CPF ou senha incorretos.' });
    }

    const user = result.rows[0];
    
    // Log para debug
    console.log('🔍 Usuário encontrado:', {
      id: user.id,
      email: user.email,
      cpf: user.cpf,
      perfil: user.perfil,
      status: user.status,
      senhaHash: user.senha ? user.senha.substring(0, 20) + '...' : 'NULL'
    });
    
    // Verificar status - usuários inativos não podem logar
    if (!user.status || user.status !== 'Ativo') {
      console.log('❌ Usuário inativo:', user.id);
      return res.status(403).json({ error: 'Conta inativa. Entre em contato com o suporte.' });
    }
    
    // Verificar se senha existe no banco
    if (!user.senha) {
      console.log('❌ Senha não encontrada no banco para usuário:', user.id);
      return res.status(401).json({ error: 'E-mail, CPF ou senha incorretos.' });
    }
    
    // Comparar senha usando bcrypt
    const valid = await bcrypt.compare(senha, user.senha);
    
    if (!valid) {
      console.log('❌ Senha inválida para usuário:', user.id);
      // Log adicional para debug (não em produção)
      const testHash = await bcrypt.hash(senha, 10);
      console.log('🔍 Hash de teste gerado:', testHash.substring(0, 20) + '...');
      return res.status(401).json({ error: 'E-mail, CPF ou senha incorretos.' });
    }
    
    console.log('✅ Senha válida para usuário:', user.id);

    // Obter a URL da foto (pode estar como fotoperfil)
    let fotoPerfil = user.fotoperfil || null;
    let nomePerfil = user.nome_perfil || 'Cliente';
    
    // Log para debug
    console.log('📸 Foto de perfil do banco:', fotoPerfil);
    console.log('👤 Perfil do usuário:', nomePerfil);
    
    // Gerar JWT token (incluir perfil)
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        nome: user.nome,
        perfil: user.perfil || 2
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Registrar histórico: login realizado
    await registrarHistorico(user.id, 'Login realizado com sucesso');
    
    res.json({
      message: 'Login realizado com sucesso!',
      token: token,
      usuario: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cpf: user.cpf,
        fotoPerfil: fotoPerfil,
        perfil: user.perfil || 2,
        nomePerfil: nomePerfil,
        status: user.status
      }
    });
  } catch (err) {
    console.error('❌ Erro no login:', err);
    res.status(500).json({ error: 'E-mail, CPF ou senha incorretos.' });
  }
});

// === ROTA: Verificar Token (para validação no cliente) ===
app.get('/api/verificar-sessao', verificarToken, async (req, res) => {
  try {
    // Buscar dados completos do usuário incluindo perfil
    const result = await pool.query(
      `SELECT u.id, u.nome, u.email, u.cpf, u.perfil, u.status, 
              u."fotoPerfil" as fotoperfil, p.perfil as nome_perfil
       FROM cadastro_usuario u
       LEFT JOIN perfil_usuarios p ON u.perfil = p.id_perfil
       WHERE u.id = $1`,
      [req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    
    const user = result.rows[0];
    res.json({ 
      valid: true, 
      userId: user.id, 
      email: user.email,
      nome: user.nome,
      perfil: user.perfil,
      nomePerfil: user.nome_perfil || 'Cliente',
      status: user.status,
      fotoPerfil: user.fotoperfil
    });
  } catch (err) {
    console.error('Erro ao verificar sessão:', err);
    res.status(500).json({ error: 'Erro ao verificar sessão.' });
  }
});

// === ROTAS DE GERENCIAMENTO DE USUÁRIOS ===

// Listar todos os usuários (apenas Master)
app.get('/api/usuarios', verificarToken, verificarMaster, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nome, u.email, u.cpf, u.perfil, u.status, u.data_cadastro,
              u."fotoPerfil" as fotoperfil, p.perfil as nome_perfil
       FROM cadastro_usuario u
       LEFT JOIN perfil_usuarios p ON u.perfil = p.id_perfil
       ORDER BY u.data_cadastro DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
});

// Buscar usuário por ID
app.get('/api/usuarios/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Master pode ver qualquer usuário, outros só podem ver a si mesmos
    if (req.userPerfil !== 1 && parseInt(id) !== req.userId) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    
    let result;
    try {
      result = await pool.query(
        `SELECT u.id, u.nome, u.email, u.cpf, u.perfil, u.status, u.data_cadastro,
                u."fotoPerfil" as fotoperfil, p.perfil as nome_perfil
         FROM cadastro_usuario u
         LEFT JOIN perfil_usuarios p ON u.perfil = p.id_perfil
         WHERE u.id = $1`,
        [id]
      );
    } catch (colError) {
      // Se der erro, tentar sem aspas (minúsculo)
      result = await pool.query(
        `SELECT u.id, u.nome, u.email, u.cpf, u.perfil, u.status, u.data_cadastro,
                u.fotoperfil, p.perfil as nome_perfil
         FROM cadastro_usuario u
         LEFT JOIN perfil_usuarios p ON u.perfil = p.id_perfil
         WHERE u.id = $1`,
        [id]
      );
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    res.status(500).json({ error: 'Erro ao buscar usuário.' });
  }
});

// Atualizar dados do usuário (nome, CPF, email, senha, foto)
app.put('/api/usuarios/:id', verificarToken, upload.single('fotoPerfil'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cpf, email, senha } = req.body;
    
    // Verificar se o usuário pode atualizar (só pode atualizar a si mesmo, exceto Master)
    if (req.userPerfil !== 1 && parseInt(id) !== req.userId) {
      return res.status(403).json({ error: 'Acesso negado. Você só pode atualizar seus próprios dados.' });
    }
    
    // Verificar se usuário existe
    const userCheck = await pool.query(
      'SELECT id, nome FROM cadastro_usuario WHERE id = $1',
      [id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    
    // Preparar campos para atualização
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (nome) {
      updates.push(`nome = $${paramIndex++}`);
      values.push(nome);
    }
    
    if (cpf) {
      // Verificar se CPF já existe para outro usuário
      const cpfCheck = await pool.query(
        'SELECT id FROM cadastro_usuario WHERE cpf = $1 AND id != $2',
        [cpf, id]
      );
      if (cpfCheck.rows.length > 0) {
        return res.status(409).json({ error: 'CPF já cadastrado para outro usuário.' });
      }
      updates.push(`cpf = $${paramIndex++}`);
      values.push(cpf);
    }
    
    if (email) {
      // Verificar se email já existe para outro usuário
      const emailCheck = await pool.query(
        'SELECT id FROM cadastro_usuario WHERE LOWER(email) = LOWER($1) AND id != $2',
        [email, id]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ error: 'E-mail já cadastrado para outro usuário.' });
      }
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    
    if (senha) {
      const hashSenha = await bcrypt.hash(senha, 10);
      updates.push(`senha = $${paramIndex++}`);
      values.push(hashSenha);
    }
    
    // Processar upload de foto
    let fotoPerfilUrl = null;
    if (req.file && supabase) {
      // Função para sanitizar nome do arquivo
      function sanitizeFileName(name) {
        const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const sanitized = normalized.replace(/[^a-zA-Z0-9._-]/g, '-');
        return sanitized.replace(/-+/g, '-').replace(/^-|-$/g, '');
      }
      
      const fileExtension = req.file.originalname.split('.').pop() || 'jpg';
      const sanitizedName = sanitizeFileName(req.file.originalname.replace(/\.[^/.]+$/, ''));
      const fileName = `${id}-${Date.now()}-${sanitizedName}.${fileExtension}`;
      
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
      
      fotoPerfilUrl = publicUrl;
      
      if (fotoPerfilUrl && fotoPerfilUrl.includes('/upload/s/')) {
        fotoPerfilUrl = fotoPerfilUrl.replace('/upload/s/', '/storage/v1/object/public/uploads/');
      }
      
      // Adicionar foto aos updates
      try {
        updates.push(`"fotoPerfil" = $${paramIndex++}`);
        values.push(fotoPerfilUrl);
      } catch (colError) {
        updates.push(`fotoperfil = $${paramIndex++}`);
        values.push(fotoPerfilUrl);
      }
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    }
    
    // Adicionar ID aos valores
    values.push(id);
    
    // Executar update
    let updateQuery;
    try {
      updateQuery = `UPDATE cadastro_usuario SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
      await pool.query(updateQuery, values);
    } catch (updateError) {
      // Se der erro com "fotoPerfil", tentar com "fotoperfil"
      if (updateError.code === '42703' || updateError.message.includes('does not exist')) {
        const updatesFixed = updates.map(u => u.replace('"fotoPerfil"', 'fotoperfil'));
        updateQuery = `UPDATE cadastro_usuario SET ${updatesFixed.join(', ')} WHERE id = $${paramIndex}`;
        await pool.query(updateQuery, values);
      } else {
        throw updateError;
      }
    }
    
    // Registrar histórico
    await registrarHistorico(parseInt(id), 'Dados atualizados pelo próprio usuário');
    
    // Buscar dados atualizados
    let result;
    try {
      result = await pool.query(
        `SELECT u.id, u.nome, u.email, u.cpf, u.perfil, u.status, u.data_cadastro,
                u."fotoPerfil" as fotoperfil, p.perfil as nome_perfil
         FROM cadastro_usuario u
         LEFT JOIN perfil_usuarios p ON u.perfil = p.id_perfil
         WHERE u.id = $1`,
        [id]
      );
    } catch (colError) {
      result = await pool.query(
        `SELECT u.id, u.nome, u.email, u.cpf, u.perfil, u.status, u.data_cadastro,
                u.fotoperfil, p.perfil as nome_perfil
         FROM cadastro_usuario u
         LEFT JOIN perfil_usuarios p ON u.perfil = p.id_perfil
         WHERE u.id = $1`,
        [id]
      );
    }
    
    res.json({
      message: 'Dados atualizados com sucesso!',
      usuario: result.rows[0]
    });
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
});

// Inativar usuário (não deletar) - apenas Master
app.put('/api/usuarios/:id/inativar', verificarToken, verificarMaster, async (req, res) => {
  try {
    const { id } = req.params;
    const masterId = req.userId;
    
    // Verificar se usuário existe
    const userCheck = await pool.query(
      'SELECT id, nome, status FROM cadastro_usuario WHERE id = $1',
      [id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    
    const usuario = userCheck.rows[0];
    
    // Não permitir inativar a si mesmo
    if (parseInt(id) === masterId) {
      return res.status(400).json({ error: 'Você não pode inativar sua própria conta.' });
    }
    
    // Atualizar status para Inativo
    await pool.query(
      'UPDATE cadastro_usuario SET status = $1 WHERE id = $2',
      ['Inativo', id]
    );
    
    // Registrar histórico
    await registrarHistorico(parseInt(id), `Conta inativada pelo Master (ID: ${masterId})`);
    await registrarHistorico(masterId, `Inativou conta do usuário ${usuario.nome} (ID: ${id})`);
    
    res.json({ message: 'Usuário inativado com sucesso.' });
  } catch (err) {
    console.error('Erro ao inativar usuário:', err);
    res.status(500).json({ error: 'Erro ao inativar usuário.' });
  }
});

// Reativar usuário - apenas Master
app.put('/api/usuarios/:id/reativar', verificarToken, verificarMaster, async (req, res) => {
  try {
    const { id } = req.params;
    const masterId = req.userId;
    
    // Verificar se usuário existe
    const userCheck = await pool.query(
      'SELECT id, nome FROM cadastro_usuario WHERE id = $1',
      [id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    
    const usuario = userCheck.rows[0];
    
    // Atualizar status para Ativo
    await pool.query(
      'UPDATE cadastro_usuario SET status = $1 WHERE id = $2',
      ['Ativo', id]
    );
    
    // Registrar histórico
    await registrarHistorico(parseInt(id), `Conta reativada pelo Master (ID: ${masterId})`);
    await registrarHistorico(masterId, `Reativou conta do usuário ${usuario.nome} (ID: ${id})`);
    
    res.json({ message: 'Usuário reativado com sucesso.' });
  } catch (err) {
    console.error('Erro ao reativar usuário:', err);
    res.status(500).json({ error: 'Erro ao reativar usuário.' });
  }
});

// Atualizar perfil de usuário - apenas Master
app.put('/api/usuarios/:id/perfil', verificarToken, verificarMaster, async (req, res) => {
  try {
    const { id } = req.params;
    const { perfil } = req.body;
    const masterId = req.userId;
    
    if (!perfil || ![1, 2, 3].includes(parseInt(perfil))) {
      return res.status(400).json({ error: 'Perfil inválido. Use 1 (Master), 2 (Cliente) ou 3 (Profissional).' });
    }
    
    // Verificar se usuário existe
    const userCheck = await pool.query(
      'SELECT id, nome, perfil FROM cadastro_usuario WHERE id = $1',
      [id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    
    const usuario = userCheck.rows[0];
    const perfilAntigo = usuario.perfil;
    
    // Atualizar perfil
    await pool.query(
      'UPDATE cadastro_usuario SET perfil = $1 WHERE id = $2',
      [perfil, id]
    );
    
    // Registrar histórico
    await registrarHistorico(parseInt(id), `Perfil alterado de ${perfilAntigo} para ${perfil} pelo Master (ID: ${masterId})`);
    await registrarHistorico(masterId, `Alterou perfil do usuário ${usuario.nome} (ID: ${id}) de ${perfilAntigo} para ${perfil}`);
    
    res.json({ message: 'Perfil atualizado com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

// Obter histórico de movimentações de um usuário
app.get('/api/usuarios/:id/historico', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Master pode ver histórico de qualquer usuário, outros só podem ver o próprio
    if (req.userPerfil !== 1 && parseInt(id) !== req.userId) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    
    const result = await pool.query(
      'SELECT * FROM historico_movimentacoes WHERE id_usuario = $1 ORDER BY data_mov DESC',
      [id]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar histórico:', err);
    res.status(500).json({ error: 'Erro ao buscar histórico.' });
  }
});

// ============================================
// ROTAS DE ENDEREÇOS
// ============================================

// Cadastrar endereço
app.post('/api/enderecos', verificarToken, async (req, res) => {
  try {
    const { cep, logradouro, numero, complemento, bairro, cidade, estado, pais } = req.body;
    const usuarioId = req.userId;
    
    // Validações
    if (!cep || cep.length !== 8) {
      return res.status(400).json({ error: 'CEP inválido.' });
    }
    
    if (!numero) {
      return res.status(400).json({ error: 'Número é obrigatório.' });
    }
    
    // Inserir endereço
    const result = await pool.query(
      `INSERT INTO endereco (cep, logradouro, numero, complemento, bairro, cidade, estado, pais, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [cep, logradouro || null, numero, complemento || null, bairro || null, cidade || null, estado || null, pais || 'Brasil', usuarioId]
    );
    
    const enderecoId = result.rows[0].id;
    
    // Atualizar referência no cadastro_usuario (opcional)
    await pool.query(
      'UPDATE cadastro_usuario SET endereco_id = $1 WHERE id = $2',
      [enderecoId, usuarioId]
    ).catch(err => {
      // Se a coluna não existir, não é crítico
      console.warn('⚠️ Coluna endereco_id não existe ou erro ao atualizar:', err.message);
    });
    
    // Registrar histórico
    await registrarHistorico(usuarioId, `Endereço cadastrado: ${logradouro}, ${numero} - ${cidade}/${estado}`);
    
    res.status(201).json({
      message: 'Endereço cadastrado com sucesso!',
      endereco: result.rows[0]
    });
  } catch (err) {
    console.error('Erro ao cadastrar endereço:', err);
    res.status(500).json({ error: 'Erro ao cadastrar endereço.' });
  }
});

// Listar endereços do usuário logado
app.get('/api/enderecos', verificarToken, async (req, res) => {
  try {
    const usuarioId = req.userId;
    
    const result = await pool.query(
      'SELECT * FROM endereco WHERE usuario_id = $1 ORDER BY created_at DESC',
      [usuarioId]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar endereços:', err);
    res.status(500).json({ error: 'Erro ao listar endereços.' });
  }
});

// ============================================
// ROTAS DE SERVIÇOS
// ============================================

// Criar serviço com fotos
app.post('/api/servicos', verificarToken, upload.array('fotos', 8), async (req, res) => {
  try {
    const { tipo_servico, especialidade, valor, titulo_anuncio, descricao_anuncio } = req.body;
    const usuarioId = req.userId;
    
    // Verificar se usuário é Profissional ou Master
    const usuario = await pool.query(
      'SELECT perfil FROM cadastro_usuario WHERE id = $1',
      [usuarioId]
    );
    
    if (usuario.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    
    const perfilUsuario = usuario.rows[0].perfil;
    if (perfilUsuario !== 1 && perfilUsuario !== 3) {
      return res.status(403).json({ error: 'Apenas usuários Profissional ou Master podem criar anúncios.' });
    }
    
    // Validações
    if (!tipo_servico || !especialidade || !titulo_anuncio || !descricao_anuncio) {
      return res.status(400).json({ error: 'Tipo de serviço, especialidade, título e descrição são obrigatórios.' });
    }
    
    // Validar valor (deve ser numérico)
    const valorDecimal = valor ? parseFloat(valor) : 0;
    if (isNaN(valorDecimal) || valorDecimal < 0) {
      return res.status(400).json({ error: 'Valor inválido. Deve ser um número positivo.' });
    }
    
    // PASSO 1: Inserir anúncio na tabela anuncios
    const resultAnuncio = await pool.query(
      `INSERT INTO anuncios (tipo_servico, especialidade, valor, titulo_anuncio, descricao_anuncio, usuario_id, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id_anuncio`,
      [tipo_servico, especialidade, valorDecimal, titulo_anuncio, descricao_anuncio, usuarioId]
    );
    
    const idAnuncio = resultAnuncio.rows[0].id_anuncio;
    
    // PASSO 2: Upload e salvar imagens na tabela imagens_anuncios
    const imagensSalvas = [];
    if (req.files && req.files.length > 0 && supabase) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        
        // Sanitizar nome do arquivo
        function sanitizeFileName(name) {
          const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const sanitized = normalized.replace(/[^a-zA-Z0-9._-]/g, '-');
          return sanitized.replace(/-+/g, '-').replace(/^-|-$/g, '');
        }
        
        const fileExtension = file.originalname.split('.').pop() || 'jpg';
        const sanitizedName = sanitizeFileName(file.originalname.replace(/\.[^/.]+$/, ''));
        const fileName = `anuncio-${idAnuncio}-${Date.now()}-${i}-${sanitizedName}.${fileExtension}`;
        
        const { data, error } = await supabase.storage
          .from('uploads')
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (error) {
          console.error('❌ Erro no upload da imagem:', error.message);
          continue; // Continuar com outras imagens mesmo se uma falhar
        }

        // Usar função auxiliar para construir URL (mais confiável)
        let urlImagem = construirUrlSupabase(fileName);
        
        if (!urlImagem) {
          // Fallback: tentar usar getPublicUrl do Supabase
          try {
            const { data: { publicUrl } } = supabase.storage
              .from('uploads')
              .getPublicUrl(fileName);
            
            urlImagem = publicUrl;
            
            // Corrigir caminho se necessário
            if (urlImagem && urlImagem.includes('/upload/s/')) {
              urlImagem = urlImagem.replace('/upload/s/', '/storage/v1/object/public/uploads/');
            }
          } catch (urlError) {
            console.error('❌ Erro ao obter URL pública:', urlError);
            continue;
          }
        }
        
        // Validar URL final
        if (!urlImagem || !urlImagem.startsWith('http')) {
          console.error('❌ URL de imagem inválida:', urlImagem);
          continue;
        }
        
        console.log('✅ URL de imagem gerada:', urlImagem);
        
        // Inserir imagem na tabela imagens_anuncios
        // A primeira imagem (i === 0) é marcada como principal
        const isPrincipal = i === 0;
        try {
          const resultImagem = await pool.query(
            `INSERT INTO imagens_anuncios (id_anuncio, url_imagens, is_principal)
             VALUES ($1, $2, $3)
             RETURNING id_imagens`,
            [idAnuncio, urlImagem, isPrincipal]
          );
          imagensSalvas.push({
            id_imagens: resultImagem.rows[0].id_imagens,
            url_imagens: urlImagem,
            is_principal: isPrincipal
          });
        } catch (imgError) {
          console.error('Erro ao salvar imagem no banco:', imgError);
          // Continuar mesmo se falhar
        }
      }
    }
    
    // Registrar histórico
    await registrarHistorico(usuarioId, `Anúncio criado: ${titulo_anuncio} (ID: ${idAnuncio})`);
    
    res.status(201).json({
      message: 'Anúncio criado com sucesso!',
      anuncio: {
        id_anuncio: idAnuncio,
        tipo_servico,
        especialidade,
        valor: valorDecimal,
        titulo_anuncio,
        descricao_anuncio,
        imagens: imagensSalvas
      }
    });
  } catch (err) {
    console.error('Erro ao criar serviço:', err);
    res.status(500).json({ error: 'Erro ao criar serviço.' });
  }
});

// Buscar anúncios do usuário logado
app.get('/api/meus-anuncios', verificarToken, async (req, res) => {
  try {
    const usuarioId = req.userId;
    
    // Buscar todos os anúncios do usuário com suas imagens
    // Usar COALESCE para evitar erros se as tabelas de estatísticas não existirem
    const result = await pool.query(`
      SELECT 
        a.id_anuncio,
        a.tipo_servico,
        a.especialidade,
        a.valor,
        a.titulo_anuncio,
        a.descricao_anuncio,
        a.ativo,
        COALESCE(a.vendido, FALSE) as vendido,
        a.created_at as data_criacao,
        (
          SELECT i.url_imagens 
          FROM imagens_anuncios i 
          WHERE i.id_anuncio = a.id_anuncio 
          ORDER BY i.is_principal DESC, i.id_imagens ASC 
          LIMIT 1
        ) as imagem,
        (
          SELECT i.url_imagens 
          FROM imagens_anuncios i 
          WHERE i.id_anuncio = a.id_anuncio 
          ORDER BY i.is_principal DESC, i.id_imagens ASC 
          LIMIT 1
        ) as url_imagens,
        0 as vistas,
        0 as favoritos,
        0 as mensagens
      FROM anuncios a
      WHERE a.usuario_id = $1
      ORDER BY a.created_at DESC
    `, [usuarioId]);
    
    // Corrigir URLs das imagens
    const anuncios = result.rows.map(anuncio => {
      let imagemUrl = anuncio.imagem || anuncio.url_imagens;
      if (imagemUrl) {
        imagemUrl = imagemUrl.trim();
        if (imagemUrl.includes('/upload/s/')) {
          imagemUrl = imagemUrl.replace('/upload/s/', '/storage/v1/object/public/uploads/');
        }
        if (!imagemUrl.startsWith('http') && supabaseUrl) {
          const fileName = imagemUrl.split('/').pop();
          imagemUrl = construirUrlSupabase(fileName);
        }
      }
      return {
        ...anuncio,
        imagem: imagemUrl,
        url_imagens: imagemUrl,
        titulo: anuncio.titulo_anuncio
      };
    });
    
    res.json({ anuncios });
  } catch (err) {
    console.error('Erro ao buscar anúncios do usuário:', err);
    res.status(500).json({ error: 'Erro ao buscar anúncios.' });
  }
});

// Atualizar status do anúncio (pausar/reativar)
app.put('/api/anuncios/:id/status', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { ativo } = req.body;
    const usuarioId = req.userId;
    
    // Verificar se o anúncio pertence ao usuário
    const checkAnuncio = await pool.query(
      'SELECT id_anuncio, usuario_id FROM anuncios WHERE id_anuncio = $1',
      [id]
    );
    
    if (checkAnuncio.rows.length === 0) {
      return res.status(404).json({ error: 'Anúncio não encontrado.' });
    }
    
    if (checkAnuncio.rows[0].usuario_id !== usuarioId) {
      return res.status(403).json({ error: 'Você não tem permissão para modificar este anúncio.' });
    }
    
    // Atualizar status
    await pool.query(
      'UPDATE anuncios SET ativo = $1 WHERE id_anuncio = $2',
      [ativo, id]
    );
    
    // Registrar histórico
    await registrarHistorico(usuarioId, `Anúncio ${ativo ? 'reativado' : 'pausado'} (ID: ${id})`);
    
    res.json({ message: `Anúncio ${ativo ? 'reativado' : 'pausado'} com sucesso!` });
  } catch (err) {
    console.error('Erro ao atualizar status do anúncio:', err);
    res.status(500).json({ error: 'Erro ao atualizar status do anúncio.' });
  }
});

// Buscar detalhes de um anúncio por ID (público ou autenticado)
app.get('/api/anuncios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar anúncio com todas as informações
    let result;
    try {
      // Tentar primeiro com "fotoPerfil" (com aspas para case-sensitive)
      result = await pool.query(`
        SELECT 
          a.id_anuncio,
          a.tipo_servico,
          a.especialidade,
          a.valor,
          a.titulo_anuncio,
          a.descricao_anuncio,
          a.ativo,
          COALESCE(a.vendido, FALSE) as vendido,
          a.created_at as data_criacao,
          a.usuario_id,
          u.nome as vendedor_nome,
          u."fotoPerfil" as vendedor_foto,
          u.fotoperfil as vendedor_foto_alt,
          u.perfil as vendedor_perfil,
          e.cidade as vendedor_cidade
        FROM anuncios a
        LEFT JOIN cadastro_usuario u ON a.usuario_id = u.id
        LEFT JOIN endereco e ON u.endereco_id = e.id
        WHERE a.id_anuncio = $1
      `, [id]);
    } catch (fotoError) {
      // Se falhar por causa da coluna fotoPerfil, tentar com fotoperfil (minúsculo)
      if (fotoError.message && fotoError.message.includes('fotoPerfil')) {
        console.warn('⚠️ Coluna fotoPerfil não encontrada, tentando fotoperfil:', fotoError.message);
        try {
          result = await pool.query(`
            SELECT 
              a.id_anuncio,
              a.tipo_servico,
              a.especialidade,
              a.valor,
              a.titulo_anuncio,
              a.descricao_anuncio,
              a.ativo,
              COALESCE(a.vendido, FALSE) as vendido,
              a.created_at as data_criacao,
              a.usuario_id,
              u.nome as vendedor_nome,
              u.fotoperfil as vendedor_foto,
              u.fotoperfil as vendedor_foto_alt,
              u.perfil as vendedor_perfil,
              e.cidade as vendedor_cidade
            FROM anuncios a
            LEFT JOIN cadastro_usuario u ON a.usuario_id = u.id
            LEFT JOIN endereco e ON u.endereco_id = e.id
            WHERE a.id_anuncio = $1
          `, [id]);
        } catch (joinError) {
          // Se ainda falhar (pode ser por causa do endereco), buscar sem endereço
          console.warn('⚠️ Erro no JOIN com endereco, buscando sem cidade:', joinError.message);
          result = await pool.query(`
            SELECT 
              a.id_anuncio,
              a.tipo_servico,
              a.especialidade,
              a.valor,
              a.titulo_anuncio,
              a.descricao_anuncio,
              a.ativo,
              COALESCE(a.vendido, FALSE) as vendido,
              a.created_at as data_criacao,
              a.usuario_id,
              u.nome as vendedor_nome,
              u.fotoperfil as vendedor_foto,
              u.fotoperfil as vendedor_foto_alt,
              u.perfil as vendedor_perfil,
              NULL as vendedor_cidade
            FROM anuncios a
            LEFT JOIN cadastro_usuario u ON a.usuario_id = u.id
            WHERE a.id_anuncio = $1
          `, [id]);
        }
      } else {
        // Se o erro não for relacionado a fotoPerfil, tentar sem endereço
        console.warn('⚠️ Erro no JOIN com endereco, buscando sem cidade:', fotoError.message);
        try {
          result = await pool.query(`
            SELECT 
              a.id_anuncio,
              a.tipo_servico,
              a.especialidade,
              a.valor,
              a.titulo_anuncio,
              a.descricao_anuncio,
              a.ativo,
              COALESCE(a.vendido, FALSE) as vendido,
              a.created_at as data_criacao,
              a.usuario_id,
              u.nome as vendedor_nome,
              u.fotoperfil as vendedor_foto,
              u.fotoperfil as vendedor_foto_alt,
              u.perfil as vendedor_perfil,
              NULL as vendedor_cidade
            FROM anuncios a
            LEFT JOIN cadastro_usuario u ON a.usuario_id = u.id
            WHERE a.id_anuncio = $1
          `, [id]);
        } catch (finalError) {
          // Última tentativa: buscar apenas dados básicos do anúncio
          console.warn('⚠️ Erro ao buscar dados do usuário, buscando apenas anúncio:', finalError.message);
          result = await pool.query(`
            SELECT 
              a.id_anuncio,
              a.tipo_servico,
              a.especialidade,
              a.valor,
              a.titulo_anuncio,
              a.descricao_anuncio,
              a.ativo,
              COALESCE(a.vendido, FALSE) as vendido,
              a.created_at as data_criacao,
              a.usuario_id,
              NULL as vendedor_nome,
              NULL as vendedor_foto,
              NULL as vendedor_foto_alt,
              NULL as vendedor_perfil,
              NULL as vendedor_cidade
            FROM anuncios a
            WHERE a.id_anuncio = $1
          `, [id]);
        }
      }
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Anúncio não encontrado.' });
    }
    
    const anuncio = result.rows[0];
    
    // Buscar todas as imagens do anúncio (incluindo is_principal)
    let imagensResult;
    try {
      imagensResult = await pool.query(`
        SELECT id_imagens, url_imagens, created_at, COALESCE(is_principal, FALSE) as is_principal
        FROM imagens_anuncios
        WHERE id_anuncio = $1
        ORDER BY is_principal DESC, id_imagens ASC
      `, [id]);
    } catch (colError) {
      // Se a coluna is_principal não existir, buscar sem ela
      console.warn('⚠️ Coluna is_principal não encontrada, buscando sem ela:', colError.message);
      imagensResult = await pool.query(`
        SELECT id_imagens, url_imagens, created_at
        FROM imagens_anuncios
        WHERE id_anuncio = $1
        ORDER BY id_imagens ASC
      `, [id]);
    }
    
    // Corrigir URLs das imagens
    const imagens = imagensResult.rows.map(img => {
      let imagemUrl = img.url_imagens;
      if (imagemUrl) {
        imagemUrl = imagemUrl.trim();
        if (imagemUrl.includes('/upload/s/')) {
          imagemUrl = imagemUrl.replace('/upload/s/', '/storage/v1/object/public/uploads/');
        }
        if (!imagemUrl.startsWith('http') && supabaseUrl) {
          const fileName = imagemUrl.split('/').pop();
          imagemUrl = construirUrlSupabase(fileName);
        }
      }
      return {
        id_imagens: img.id_imagens,
        url_imagens: imagemUrl,
        created_at: img.created_at,
        is_principal: img.is_principal !== undefined ? img.is_principal : (img.id_imagens === imagensResult.rows[0]?.id_imagens)
      };
    });
    
    // Adicionar cidade apenas se o anunciante for master ou profissional
    if (anuncio.vendedor_perfil !== 1 && anuncio.vendedor_perfil !== 3) {
      anuncio.vendedor_cidade = null; // Não mostrar cidade para clientes
    }
    
    res.json({
      ...anuncio,
      imagens: imagens,
      imagem_principal: imagens.length > 0 ? imagens[0].url_imagens : null
    });
  } catch (err) {
    console.error('❌ Erro ao buscar anúncio:', err);
    console.error('❌ Mensagem do erro:', err.message);
    if (err.stack) {
      console.error('❌ Stack trace:', err.stack);
    }
    res.status(500).json({ 
      error: 'Erro ao buscar anúncio.',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Marcar anúncio como vendido
app.put('/api/anuncios/:id/vendido', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { vendido } = req.body;
    const usuarioId = req.userId;
    
    // Verificar se o anúncio pertence ao usuário
    const checkAnuncio = await pool.query(
      'SELECT id_anuncio, usuario_id FROM anuncios WHERE id_anuncio = $1',
      [id]
    );
    
    if (checkAnuncio.rows.length === 0) {
      return res.status(404).json({ error: 'Anúncio não encontrado.' });
    }
    
    if (checkAnuncio.rows[0].usuario_id !== usuarioId) {
      return res.status(403).json({ error: 'Você não tem permissão para modificar este anúncio.' });
    }
    
    // Atualizar status (marcar como vendido e desativar)
    await pool.query(
      'UPDATE anuncios SET vendido = $1, ativo = FALSE WHERE id_anuncio = $2',
      [vendido, id]
    );
    
    // Registrar histórico
    await registrarHistorico(usuarioId, `Anúncio marcado como vendido (ID: ${id})`);
    
    res.json({ message: 'Anúncio marcado como vendido com sucesso!' });
  } catch (err) {
    console.error('Erro ao marcar anúncio como vendido:', err);
    res.status(500).json({ error: 'Erro ao marcar anúncio como vendido.' });
  }
});

// Buscar últimos 8 produtos/anúncios para exibir na seção "Últimas Postagens Atualizadas"
app.get('/api/produtos/ultimos', async (req, res) => {
  try {
    const items = [];
    
    // Buscar últimos anúncios (prioridade - LIFO por id_imagens)
    try {
      const anunciosResult = await pool.query(`
      SELECT DISTINCT ON (a.id_anuncio)
        i.id_imagens,
        i.url_imagens as imagem,
        a.titulo_anuncio as titulo,
        a.especialidade as marca,
        a.valor as valor_venda,
        a.id_anuncio,
        'anuncio' as tipo,
        a.created_at,
        a.usuario_id,
        u.perfil as usuario_perfil,
        e.cidade as usuario_cidade,
        e.bairro as usuario_bairro
      FROM anuncios a
      LEFT JOIN imagens_anuncios i ON i.id_anuncio = a.id_anuncio AND (i.is_principal = TRUE OR i.id_imagens = (
        SELECT MIN(id_imagens) FROM imagens_anuncios WHERE id_anuncio = a.id_anuncio
      ))
      LEFT JOIN cadastro_usuario u ON a.usuario_id = u.id
      LEFT JOIN endereco e ON u.endereco_id = e.id
      WHERE a.ativo = TRUE
      ORDER BY a.id_anuncio DESC, i.is_principal DESC, i.id_imagens ASC
      LIMIT 8
      `);
      
      for (const anuncio of anunciosResult.rows) {
        // Garantir que a URL da imagem está correta
        let imagemUrl = anuncio.imagem;
        if (imagemUrl) {
          // Limpar espaços e caracteres especiais
          imagemUrl = imagemUrl.trim();
          
          // Se a URL contém /upload/s/, substituir pelo caminho correto
          if (imagemUrl.includes('/upload/s/')) {
            imagemUrl = imagemUrl.replace('/upload/s/', '/storage/v1/object/public/uploads/');
          }
          
          // Se a URL não começa com http, tentar extrair o nome do arquivo e reconstruir
          if (!imagemUrl.startsWith('http')) {
            // Tentar extrair o nome do arquivo da URL
            const fileName = imagemUrl.split('/').pop();
            if (fileName && supabaseUrl) {
              imagemUrl = construirUrlSupabase(fileName);
              console.log('🔧 URL de anúncio corrigida:', imagemUrl);
            } else {
              console.warn('⚠️ URL de imagem de anúncio inválida:', anuncio.imagem);
              imagemUrl = null;
            }
          }
          
          // Validar URL final
          if (imagemUrl && !imagemUrl.startsWith('http')) {
            console.warn('⚠️ URL de imagem de anúncio ainda inválida após correção:', imagemUrl);
            imagemUrl = null;
          }
          
          // Log detalhado
          console.log(`📸 Anúncio "${anuncio.titulo}":`);
          console.log(`   URL original: ${anuncio.imagem}`);
          console.log(`   URL final: ${imagemUrl || 'NULL'}`);
        } else {
          console.warn(`⚠️ Anúncio "${anuncio.titulo}" sem URL de imagem`);
        }
        
        items.push({
          id: anuncio.id_anuncio,
          codigo_produto: anuncio.id_anuncio,
          produto: anuncio.titulo,
          titulo: anuncio.titulo,
          marca: anuncio.marca,
          valor_venda: parseFloat(anuncio.valor_venda) || 0,
          id_anuncio: anuncio.id_anuncio,
          tipo: 'anuncio',
          created_at: anuncio.created_at,
          usuario_perfil: anuncio.usuario_perfil,
          usuario_cidade: (anuncio.usuario_perfil === 1 || anuncio.usuario_perfil === 3) ? anuncio.usuario_cidade : null,
          imagem: imagemUrl,
          tipo: 'anuncio',
          created_at: anuncio.created_at
        });
      }
      
      console.log(`✅ Total de ${anunciosResult.rows.length} anúncios encontrados`);
    } catch (anuncioError) {
      console.warn('Erro ao buscar anúncios:', anuncioError.message);
    }
    
    // Se não tiver 8 anúncios, buscar produtos para completar
    if (items.length < 8) {
      try {
        const produtosResult = await pool.query(`
          SELECT 
            p.codigo_produto,
            p.produto as titulo,
            p.marca,
            COALESCE(p.valor_venda, 0) AS valor_venda,
            p.ativo,
            'produto' as tipo
          FROM produto p
          WHERE (p.ativo = TRUE OR p.ativo IS NULL)
          ORDER BY p.codigo_produto DESC
          LIMIT $1
        `, [Math.max(1, 8 - items.length)]);
        
        // Para cada produto, buscar a primeira imagem
        for (const produto of produtosResult.rows) {
          try {
            const imgResult = await pool.query(
              `SELECT url_imagem FROM produto_imagens 
               WHERE codigo_produto = $1 AND ativo = TRUE 
               ORDER BY ordem ASC, id_imagem ASC 
               LIMIT 1`,
              [produto.codigo_produto]
            );
            
            // Garantir que a URL da imagem está correta
            let imagemUrl = imgResult.rows.length > 0 ? imgResult.rows[0].url_imagem : null;
            if (imagemUrl) {
              // Se a URL contém /upload/s/, substituir pelo caminho correto
              if (imagemUrl.includes('/upload/s/')) {
                imagemUrl = imagemUrl.replace('/upload/s/', '/storage/v1/object/public/uploads/');
              }
              // Garantir que começa com http
              if (!imagemUrl.startsWith('http')) {
                console.warn('⚠️ URL de imagem de produto inválida:', imagemUrl);
                imagemUrl = null;
              }
            }
            
            items.push({
              id: produto.codigo_produto,
              codigo_produto: produto.codigo_produto,
              produto: produto.titulo,
              titulo: produto.titulo,
              marca: produto.marca,
              valor_venda: produto.valor_venda,
              imagem: imagemUrl,
              tipo: 'produto',
              created_at: null
            });
          } catch (imgError) {
            items.push({
              id: produto.codigo_produto,
              codigo_produto: produto.codigo_produto,
              produto: produto.titulo,
              titulo: produto.titulo,
              marca: produto.marca,
              valor_venda: produto.valor_venda,
              imagem: null,
              tipo: 'produto',
              created_at: null
            });
          }
        }
      } catch (prodError) {
        console.warn('Erro ao buscar produtos:', prodError.message);
      }
    }
    
    // Buscar últimos serviços
    try {
      const servicosResult = await pool.query(`
        SELECT 
          s.id_servico,
          s.titulo_servico as titulo,
          s.tipo_servico,
          s.servico,
          COALESCE(s.valor_servico, 0) AS valor_venda,
          s.created_at,
          s.ativo
        FROM servicos s
        WHERE (s.ativo = TRUE OR s.ativo IS NULL)
        ORDER BY s.created_at DESC, s.id_servico DESC
        LIMIT 4
      `);
      
      // Para cada serviço, buscar a primeira imagem
      for (const servico of servicosResult.rows) {
        try {
          const imgResult = await pool.query(
            `SELECT url_imagem FROM produto_imagens 
             WHERE codigo_produto = $1 AND ativo = TRUE 
             ORDER BY ordem ASC, id_imagem ASC 
             LIMIT 1`,
            [servico.id_servico]
          );
          
          // Garantir que a URL da imagem está correta
          let imagemUrl = imgResult.rows.length > 0 ? imgResult.rows[0].url_imagem : null;
          if (imagemUrl) {
            // Se a URL contém /upload/s/, substituir pelo caminho correto
            if (imagemUrl.includes('/upload/s/')) {
              imagemUrl = imagemUrl.replace('/upload/s/', '/storage/v1/object/public/uploads/');
            }
            // Garantir que começa com http
            if (!imagemUrl.startsWith('http')) {
              console.warn('⚠️ URL de imagem de serviço inválida:', imagemUrl);
              imagemUrl = null;
            }
          }
          
          items.push({
            id: servico.id_servico,
            codigo_produto: servico.id_servico,
            produto: servico.titulo,
            titulo: servico.titulo,
            marca: servico.tipo_servico,
            valor_venda: servico.valor_venda,
            imagem: imagemUrl,
            tipo: 'servico',
            created_at: servico.created_at
          });
        } catch (imgError) {
          items.push({
            id: servico.id_servico,
            codigo_produto: servico.id_servico,
            produto: servico.titulo,
            titulo: servico.titulo,
            marca: servico.tipo_servico,
            valor_venda: servico.valor_venda,
            imagem: null,
            tipo: 'servico',
            created_at: servico.created_at
          });
        }
      }
    } catch (servError) {
      console.warn('Erro ao buscar serviços:', servError.message);
    }
    
    // Ordenar por data de criação (mais recente primeiro) e pegar os 8 primeiros
    const itemsOrdenados = items.sort((a, b) => {
      if (a.created_at && b.created_at) {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      if (a.created_at) return -1;
      if (b.created_at) return 1;
      // Se não tiver data, ordenar por ID
      return (b.id || 0) - (a.id || 0);
    }).slice(0, 8);
    
    console.log(`📤 Retornando ${itemsOrdenados.length} itens para a página inicial`);
    itemsOrdenados.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.titulo} (${item.tipo}) - Imagem: ${item.imagem ? 'Sim' : 'Não'}`);
      if (item.imagem) {
        console.log(`     URL: ${item.imagem}`);
      }
    });
    
    res.json(itemsOrdenados);
  } catch (err) {
    console.error('Erro ao buscar últimos produtos/serviços:', err);
    res.status(500).json({ error: 'Erro ao buscar últimos produtos/serviços.' });
  }
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

// Listar compras de um cliente específico (vendas realizadas para o cliente)
app.get('/api/compras/:usuarioId', verificarToken, async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const tokenUsuarioId = req.userId;
    
    // Verificar se o usuário está buscando suas próprias compras
    if (parseInt(usuarioId) !== tokenUsuarioId) {
      return res.status(403).json({ error: 'Você só pode visualizar suas próprias compras.' });
    }
    
    // Buscar vendas (pedido_vendas) relacionadas ao cliente
    // Nota: Se houver uma tabela de clientes vinculada, ajustar a query
    const result = await pool.query(`
      SELECT 
        pv.id_pedido,
        pv.codigo_produto,
        pv.quantidade,
        pv.valor_unitario,
        pv.valor_total,
        pv.data_venda,
        p.produto,
        p.marca,
        (SELECT url_imagem FROM produto_imagens 
         WHERE codigo_produto = p.codigo_produto AND ativo = TRUE 
         ORDER BY ordem ASC, id_imagem ASC LIMIT 1) as imagem
      FROM pedido_vendas pv
      JOIN produto p ON pv.codigo_produto = p.codigo_produto
      WHERE pv.id_cliente = $1 OR pv.id_cliente IS NULL
      ORDER BY pv.data_venda DESC
    `, [usuarioId]);
    
    // Agrupar por pedido
    const comprasAgrupadas = {};
    result.rows.forEach(row => {
      const pedidoId = row.id_pedido;
      if (!comprasAgrupadas[pedidoId]) {
        comprasAgrupadas[pedidoId] = {
          id_pedido: pedidoId,
          data_venda: row.data_venda,
          valor_total: 0,
          produtos: []
        };
      }
      
      comprasAgrupadas[pedidoId].produtos.push({
        codigo_produto: row.codigo_produto,
        produto: row.produto,
        marca: row.marca,
        quantidade: row.quantidade,
        valor_unitario: row.valor_unitario,
        valor_total: row.valor_total,
        imagem: row.imagem
      });
      
      comprasAgrupadas[pedidoId].valor_total += parseFloat(row.valor_total || 0);
    });
    
    // Converter para array
    const compras = Object.values(comprasAgrupadas);
    
    res.json(compras);
  } catch (err) {
    console.error('Erro ao listar compras do cliente:', err);
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

// Buscar imagens dos serviços para a tela de anúncio
// IMPORTANTE: Esta rota deve vir ANTES de /api/imagens/:nome para não ser capturada pelo parâmetro dinâmico
app.get('/api/imagens/servicos', async (req, res) => {
  try {
    console.log('🔍 Rota /api/imagens/servicos chamada');
    
    // URLs exatas fornecidas pelo usuário (usar como padrão)
    const imagensPadrao = {
      'assentamento': 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/servico-1-1764532062863-2-porcelanato-3.PNG',
      'pintura-paredes': 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/Pintuda%20de%20Paredes.PNG',
      'pintura-portoes': 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/Pintuda%20de%20Portoes.PNG',
      'acabamentos': 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/Instalacao%20de%20Sanca.PNG'
    };
    
    // URLs decodificadas para busca no banco
    const urlsParaBuscar = {
      'assentamento': ['servico-1-1764532062863-2-porcelanato-3.PNG', 'porcelanato-3'],
      'pintura-paredes': ['Pintuda de Paredes.PNG', 'Pintuda%20de%20Paredes.PNG', 'Paredes.PNG'],
      'pintura-portoes': ['Pintuda de Portoes.PNG', 'Pintuda%20de%20Portoes.PNG', 'Portoes.PNG'],
      'acabamentos': ['Instalacao de Sanca.PNG', 'Instalacao%20de%20Sanca.PNG', 'Sanca.PNG']
    };
    
    const imagensServicos = { ...imagensPadrao };
    
    // Tentar buscar do banco de dados (tabela imagens_geral)
    try {
      console.log('🔍 Buscando imagens dos serviços no banco de dados...');
      const result = await pool.query(
        `SELECT url_imagem, nome_imagem FROM imagens_geral WHERE ativo = TRUE ORDER BY nome_imagem`
      );
      
      console.log(`✅ Encontradas ${result.rows.length} imagens no banco`);
      
      // Log de todas as imagens encontradas para debug
      if (result.rows.length > 0) {
        console.log('📋 Imagens encontradas:');
        result.rows.forEach((row, index) => {
          console.log(`  ${index + 1}. nome: "${row.nome_imagem}", url: ${row.url_imagem?.substring(0, 80)}...`);
        });
      }
      
      // Buscar por URLs exatas fornecidas pelo usuário
      for (const row of result.rows) {
        const urlOriginal = row.url_imagem || '';
        const urlLower = urlOriginal.toLowerCase();
        const urlDecoded = decodeURIComponent(urlOriginal);
        const urlDecodedLower = urlDecoded.toLowerCase();
        
        // Assentamento - buscar por padrões específicos
        for (const padrao of urlsParaBuscar.assentamento) {
          const padraoLower = padrao.toLowerCase();
          if (urlLower.includes(padraoLower) || urlDecodedLower.includes(padraoLower) || 
              urlOriginal.includes(padrao) || urlDecoded.includes(padrao)) {
            imagensServicos.assentamento = row.url_imagem;
            console.log('✅ Imagem de Assentamento encontrada no banco:', row.nome_imagem, '| URL:', row.url_imagem);
            break;
          }
        }
        
        // Pintura de Paredes - buscar por padrões específicos
        for (const padrao of urlsParaBuscar['pintura-paredes']) {
          const padraoLower = padrao.toLowerCase();
          if (urlLower.includes(padraoLower) || urlDecodedLower.includes(padraoLower) ||
              urlOriginal.includes(padrao) || urlDecoded.includes(padrao)) {
            imagensServicos['pintura-paredes'] = row.url_imagem;
            console.log('✅ Imagem de Pintura de Paredes encontrada no banco:', row.nome_imagem, '| URL:', row.url_imagem);
            break;
          }
        }
        
        // Pintura de Portões - buscar por padrões específicos
        for (const padrao of urlsParaBuscar['pintura-portoes']) {
          const padraoLower = padrao.toLowerCase();
          if (urlLower.includes(padraoLower) || urlDecodedLower.includes(padraoLower) ||
              urlOriginal.includes(padrao) || urlDecoded.includes(padrao)) {
            imagensServicos['pintura-portoes'] = row.url_imagem;
            console.log('✅ Imagem de Pintura de Portões encontrada no banco:', row.nome_imagem, '| URL:', row.url_imagem);
            break;
          }
        }
        
        // Acabamentos - buscar por padrões específicos
        for (const padrao of urlsParaBuscar.acabamentos) {
          const padraoLower = padrao.toLowerCase();
          if (urlLower.includes(padraoLower) || urlDecodedLower.includes(padraoLower) ||
              urlOriginal.includes(padrao) || urlDecoded.includes(padrao)) {
            imagensServicos.acabamentos = row.url_imagem;
            console.log('✅ Imagem de Acabamentos encontrada no banco:', row.nome_imagem, '| URL:', row.url_imagem);
            break;
          }
        }
      }
      
      // Se não encontrou por URL exata, buscar por padrões nos nomes ou URLs
      for (const row of result.rows) {
        const nomeLower = (row.nome_imagem || '').toLowerCase();
        const urlLower = (row.url_imagem || '').toLowerCase();
        const urlDecoded = decodeURIComponent(urlLower);
        
        // Assentamento - buscar por "porcelanato" na URL ou nome (se ainda não encontrou)
        if (!imagensServicos.assentamento || imagensServicos.assentamento === imagensPadrao.assentamento) {
          if (urlLower.includes('porcelanato') || urlDecoded.includes('porcelanato') || 
              nomeLower.includes('porcelanato') || nomeLower.includes('assentamento') ||
              nomeLower.includes('piso') || nomeLower.includes('revestimento')) {
            imagensServicos.assentamento = row.url_imagem;
            console.log('✅ Imagem de Assentamento encontrada (padrão):', row.nome_imagem);
          }
        }
        
        // Pintura de Paredes - buscar por "Paredes" na URL ou nome (se ainda não encontrou)
        if (!imagensServicos['pintura-paredes'] || imagensServicos['pintura-paredes'] === imagensPadrao['pintura-paredes']) {
          if (urlLower.includes('paredes') || urlDecoded.includes('Paredes') || 
              nomeLower.includes('paredes') || nomeLower.includes('pintura paredes') ||
              nomeLower.includes('pintuda paredes')) {
            imagensServicos['pintura-paredes'] = row.url_imagem;
            console.log('✅ Imagem de Pintura de Paredes encontrada (padrão):', row.nome_imagem);
          }
        }
        
        // Pintura de Portões - buscar por "Portoes" na URL ou nome (se ainda não encontrou)
        if (!imagensServicos['pintura-portoes'] || imagensServicos['pintura-portoes'] === imagensPadrao['pintura-portoes']) {
          if (urlLower.includes('portoes') || urlLower.includes('portão') || 
              urlDecoded.includes('Portoes') || urlDecoded.includes('Portão') ||
              nomeLower.includes('portoes') || nomeLower.includes('portão') ||
              nomeLower.includes('pintura portoes') || nomeLower.includes('pintuda portoes')) {
            imagensServicos['pintura-portoes'] = row.url_imagem;
            console.log('✅ Imagem de Pintura de Portões encontrada (padrão):', row.nome_imagem);
          }
        }
        
        // Acabamentos - buscar por "Sanca" na URL ou nome (se ainda não encontrou)
        if (!imagensServicos.acabamentos || imagensServicos.acabamentos === imagensPadrao.acabamentos) {
          if (urlLower.includes('sanca') || urlDecoded.includes('Sanca') || 
              nomeLower.includes('sanca') || nomeLower.includes('acabamento') ||
              nomeLower.includes('instalacao sanca') || nomeLower.includes('instalação sanca')) {
            imagensServicos.acabamentos = row.url_imagem;
            console.log('✅ Imagem de Acabamentos encontrada (padrão):', row.nome_imagem);
          }
        }
      }
      
      console.log('📤 Retornando imagens:', Object.keys(imagensServicos));
      
    } catch (dbErr) {
      // Se a tabela não existe, usar URLs padrão
      if (dbErr.code === '42P01' || dbErr.message?.includes('does not exist')) {
        console.log('⚠️ Tabela imagens_geral não encontrada, usando URLs padrão');
      } else {
        console.error('❌ Erro ao buscar imagens do banco:', dbErr);
        console.warn('⚠️ Usando URLs padrão devido ao erro');
      }
    }
    
    console.log('📤 Retornando imagens finais:', imagensServicos);
    res.json(imagensServicos);
  } catch (err) {
    console.error('❌ Erro geral ao buscar imagens dos serviços:', err);
    // Retornar URLs padrão mesmo em caso de erro
    const imagensErro = {
      'assentamento': 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/servico-1-1764532062863-2-porcelanato-3.PNG',
      'pintura-paredes': 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/Pintuda%20de%20Paredes.PNG',
      'pintura-portoes': 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/Pintuda%20de%20Portoes.PNG',
      'acabamentos': 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/Instalacao%20de%20Sanca.PNG'
    };
    console.log('📤 Retornando URLs padrão devido ao erro');
    res.json(imagensErro);
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
  console.log(`   GET  /api/imagens/servicos`);
  console.log(`   GET  /api/imagens`);
  console.log(`   GET  /api/imagens/:nome`);
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