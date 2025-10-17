require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Conexão com Neon PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // necessário para Neon
  }
});

// Teste de conexão
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('❌ Falha ao conectar ao Neon:', err.stack);
  } else {
    console.log('✅ Conectado ao Neon PostgreSQL!');
  }
});

// Criar tabela cadastro_usuario
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

pool.query(createTable)
  .then(() => console.log('✅ Tabela "cadastro_usuario" pronta.'))
  .catch(err => console.error('Erro ao criar tabela:', err));

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('public/uploads'));
app.use('/imagensSite', express.static('public/imagensSite'));

// Configuração de upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Rota: Cadastro
app.post('/api/cadastro', upload.single('fotoPerfil'), async (req, res) => {
  const { nome, cpf, email, senha } = req.body;
  const fotoPerfil = req.file ? `/uploads/${req.file.filename}` : null;

  if (!nome || !cpf || !email || !senha) {
    return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
  }

  try {
    const check = await pool.query(
      'SELECT id FROM cadastro_usuario WHERE cpf = $1 OR email = $2',
      [cpf, email]
    );

    if (check.rows.length > 0) {
      return res.status(409).json({ error: 'CPF ou e-mail já cadastrado.' });
    }

    const hashSenha = await bcrypt.hash(senha, 10);
    await pool.query(
      'INSERT INTO cadastro_usuario (nome, cpf, email, senha, fotoPerfil) VALUES ($1, $2, $3, $4, $5)',
      [nome, cpf, email, hashSenha, fotoPerfil]
    );

    res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao cadastrar.' });
  }
});

// Rota: Login
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
        fotoPerfil: user.fotoPerfil // ✅ Envia a URL da imagem para o frontend
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno no login.' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});