/**
 * Script para executar os scripts SQL no banco de dados Neon Postgres
 * Execute: node executar-scripts-db.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Verificar se DATABASE_URL está configurada
if (!process.env.DATABASE_URL) {
  console.error('❌ Erro: DATABASE_URL não encontrada no arquivo .env');
  console.log('💡 Certifique-se de que o arquivo .env existe e contém:');
  console.log('   DATABASE_URL=postgresql://usuario:senha@host:porta/database');
  process.exit(1);
}

// Criar pool de conexão
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Função para executar um arquivo SQL
async function executarScriptSQL(nomeArquivo) {
  const caminhoArquivo = path.join(__dirname, nomeArquivo);
  
  if (!fs.existsSync(caminhoArquivo)) {
    console.error(`❌ Arquivo não encontrado: ${nomeArquivo}`);
    return false;
  }
  
  const sql = fs.readFileSync(caminhoArquivo, 'utf8');
  
  try {
    console.log(`\n📄 Executando: ${nomeArquivo}...`);
    await pool.query(sql);
    console.log(`✅ ${nomeArquivo} executado com sucesso!`);
    return true;
  } catch (err) {
    // Ignorar erros de "já existe" (IF NOT EXISTS)
    if (err.code === '42P07' || err.message.includes('already exists')) {
      console.log(`⚠️  ${nomeArquivo}: Tabela/objeto já existe (ignorando)`);
      return true;
    }
    console.error(`❌ Erro ao executar ${nomeArquivo}:`, err.message);
    return false;
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando execução dos scripts SQL no Neon Postgres...\n');
  console.log(`📡 Conectando ao banco: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  
  // Testar conexão
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Conexão estabelecida com sucesso!\n');
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco de dados:', err.message);
    process.exit(1);
  }
  
  // Lista de scripts na ordem correta
  const scripts = [
    'CRIAR_TABELA_PERFIL_USUARIOS.sql',
    'ALTERAR_TABELA_CADASTRO_USUARIO.sql',
    'CRIAR_TABELA_HISTORICO_MOVIMENTACOES.sql',
    'CRIAR_TABELA_SERVICOS.sql'
  ];
  
  let sucesso = 0;
  let falhas = 0;
  
  // Executar cada script
  for (const script of scripts) {
    const resultado = await executarScriptSQL(script);
    if (resultado) {
      sucesso++;
    } else {
      falhas++;
    }
    // Pequena pausa entre scripts
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Resumo
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMO:');
  console.log(`   ✅ Sucessos: ${sucesso}`);
  console.log(`   ❌ Falhas: ${falhas}`);
  console.log('='.repeat(50));
  
  if (falhas === 0) {
    console.log('\n🎉 Todos os scripts foram executados com sucesso!');
    console.log('💡 Você pode reiniciar o servidor agora: npm start');
  } else {
    console.log('\n⚠️  Alguns scripts falharam. Verifique os erros acima.');
  }
  
  // Fechar conexão
  await pool.end();
}

// Executar
main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});


