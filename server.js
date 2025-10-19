require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

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
const createTable = `
  CREATE TABLE IF NOT EXISTS cadastro_usuario (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    fotoPerfil VARCHAR(500)
  );
`;
pool.query(createTable).catch(err => console.error('Erro ao criar tabela:', err));

// === MIDDLEWARES ===
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/imagensSite', express.static('public/imagensSite'));

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
      const fileName = `${cpf}-${Date.now()}-${req.file.originalname}`;
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (error) {
        console.error('Erro no upload do Supabase:', error.message);
        return res.status(500).json({ error: 'Erro ao salvar imagem.' });
      }

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName);
      fotoPerfilUrl = publicUrl;
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
    await pool.query(
      'INSERT INTO cadastro_usuario (nome, cpf, email, senha, fotoPerfil) VALUES ($1, $2, $3, $4, $5)',
      [nome, cpf, email, hashSenha, fotoPerfilUrl]
    );

    res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
  } catch (err) {
    console.error('Erro no cadastro:', err);
    res.status(500).json({ error: 'Erro interno ao cadastrar.' });
  }
});

// === ROTA: LOGIN ===
app.post('/api/login', async (req, res) => {
  const { login, senha } = req.body;
  if (!login || !senha) {
    return res.status(400).json({ error: 'CPF/E-mail e senha são obrigatórios.' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM cadastro_usuario WHERE cpf = $1 OR email = $1',
      [login]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'CPF/E-mail ou senha inválidos.' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(senha, user.senha);
    if (!valid) return res.status(401).json({ error: 'CPF/E-mail ou senha inválidos.' });

    res.json({
      message: 'Login realizado com sucesso!',
      usuario: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cpf: user.cpf,
        fotoPerfil: user.fotoPerfil // URL do Supabase (ou local, se ativado)
      }
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno no login.' });
  }
});

// === INICIAR SERVIDOR ===
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

app.use('/imagens', express.static('public/imagens'));