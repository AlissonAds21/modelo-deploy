// Função para buscar URL da ampulheta do banco de dados
// Comportamento: tenta a rota local '/api/imagens/ampulheta' e, se falhar,
// retorna a URL pública do Supabase (inserida manualmente) como fallback.
async function buscarUrlAmpulheta() {
  // URL pública do Supabase (conforme informado)
  const supabaseAmpulhetaUrl = 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/ampulheta.gif';

  try {
    const response = await fetch('/api/imagens/ampulheta');
    if (response.ok) {
      const data = await response.json();
      if (data && data.url_imagem) return data.url_imagem;
    }
    // Se não houver resposta válida do backend, usar fallback público
    return supabaseAmpulhetaUrl;
  } catch (err) {
    // Se a rota /api falhar (ex: tabela ausente), usar diretamente a URL do Supabase
    console.warn('⚠️ Erro ao buscar URL da ampulheta do banco (usando fallback Supabase):', err);
    return supabaseAmpulhetaUrl;
  }
}

// Função para verificar expiração de sessão (1 hora de inatividade)
function verificarSessaoExpirada() {
  const token = localStorage.getItem('token');
  const tokenExpiry = localStorage.getItem('tokenExpiry');
  const lastActivity = localStorage.getItem('lastActivity');
  
  if (!token || !tokenExpiry) {
    return false; // Sem token, não há sessão para expirar
  }
  
  const agora = Date.now();
  const expiryTime = parseInt(tokenExpiry);
  
  // Verificar se token expirou
  if (agora > expiryTime) {
    console.log('Sessão expirada por tempo (1 hora).');
    limparSessao();
    return true;
  }
  
  // Verificar inatividade (1 hora sem interação)
  if (lastActivity) {
    const tempoInatividade = agora - parseInt(lastActivity);
    const umaHora = 60 * 60 * 1000; // 1 hora em milissegundos
    
    if (tempoInatividade > umaHora) {
      console.log('Sessão expirada por inatividade (1 hora).');
      limparSessao();
      return true;
    }
  }
  
  // Atualizar última atividade
  localStorage.setItem('lastActivity', agora.toString());
  return false;
}

// Função para limpar sessão
function limparSessao() {
  localStorage.removeItem('token');
  localStorage.removeItem('tokenExpiry');
  localStorage.removeItem('usuario');
  localStorage.removeItem('lastActivity');
  
  // Redirecionar para login se estiver em página protegida
  if (window.location.pathname.includes('admin.html') || 
      window.location.pathname.includes('minha-conta.html')) {
    alert('Sua sessão expirou. Por favor, faça login novamente.');
    window.location.href = 'login.html';
  } else {
    // Recarregar página para atualizar header
    location.reload();
  }
}

// Registrar atividade do usuário
document.addEventListener('click', () => {
  const token = localStorage.getItem('token');
  if (token) {
    localStorage.setItem('lastActivity', Date.now().toString());
  }
});

document.addEventListener('keypress', () => {
  const token = localStorage.getItem('token');
  if (token) {
    localStorage.setItem('lastActivity', Date.now().toString());
  }
});

// Verificar sessão periodicamente (a cada 5 minutos)
setInterval(() => {
  verificarSessaoExpirada();
}, 5 * 60 * 1000);

// Função para verificar se o usuário está logado
function checkLoginStatus() {
  // Verificar se sessão expirou
  if (verificarSessaoExpirada()) {
    return;
  }
  
  const usuarioStr = localStorage.getItem('usuario');
  if (!usuarioStr) {
    document.getElementById('authButtons').innerHTML = `
      <button onclick="location.href='login.html'">Entrar</button>
      <button onclick="location.href='cadastro.html'">Cadastrar</button>
    `;
    return;
  }

  try {
    const usuario = JSON.parse(usuarioStr);
    
    // Determinar URL da foto de perfil (tentar ambos os formatos)
    let fotoPerfilUrl = usuario.fotoPerfil || usuario.fotoperfil || null;
    
    // Log para debug
    console.log('👤 Usuário logado:', usuario.nome);
    console.log('📸 URL da foto (fotoPerfil):', usuario.fotoPerfil);
    console.log('📸 URL da foto (fotoperfil):', usuario.fotoperfil);
    console.log('📸 URL final:', fotoPerfilUrl);
    
    // Se não tiver foto ou URL inválida, usar placeholder
    const placeholderUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(usuario.nome || 'Usuario')}&background=587bfa&color=fff&size=128&bold=true`;
    
    // Verificar se a URL é válida
    if (!fotoPerfilUrl || 
        fotoPerfilUrl === 'null' || 
        fotoPerfilUrl === '' || 
        fotoPerfilUrl === null ||
        fotoPerfilUrl === undefined) {
      fotoPerfilUrl = placeholderUrl;
      console.log('⚠️ Foto não encontrada, usando placeholder');
    } else {
      // Verificar se a URL começa com http (URL completa)
      if (!fotoPerfilUrl.startsWith('http')) {
        console.warn('⚠️ URL da foto não está completa:', fotoPerfilUrl);
        // Tentar construir URL completa do Supabase
        const supabaseBaseUrl = 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/';
        fotoPerfilUrl = supabaseBaseUrl + fotoPerfilUrl;
        console.log('🔗 URL construída:', fotoPerfilUrl);
      }
      console.log('✅ Usando foto do Supabase:', fotoPerfilUrl);
    }
    
  // Buscar URL da ampulheta do banco de dados (usar Promise para compatibilidade)
  buscarUrlAmpulheta().then(function(ampulhetaUrl) {
    console.log('⏳ URL da ampulheta do banco:', ampulhetaUrl || 'não encontrada');

    // Se não encontrar no banco, usar fallback (ocultar ou usar placeholder)
    const ampulhetaImgTag = ampulhetaUrl 
      ? `<img src="${ampulhetaUrl}" alt="Ampulheta" class="hourglass-icon" onerror="this.onerror=null; this.style.display='none'; console.warn('Erro ao carregar ampulheta do Supabase');">`
      : '';

    // Construir HTML de usuário logado (usa ampulheta encontrada ou não)
    document.getElementById('authButtons').innerHTML = `
      <div class="logged-user-container">
        <!-- Imagem de perfil -->
        <div class="user-avatar">
          <img src="${fotoPerfilUrl}" 
               alt="Foto de Perfil" 
               class="profile-pic"
               onerror="console.error('Erro ao carregar imagem:', this.src); this.onerror=null; this.src='${placeholderUrl}';">
        </div>
        
        <!-- Botões e status à direita -->
        <div class="user-info">
          <div class="buttons-row">
            <button onclick="location.href='minha-conta.html'">Minha Conta</button>
            <button onclick="logout()">Sair</button>
          </div>
          <div class="user-status">
            <span>${ampulhetaImgTag || `<img src="imagens/ampulheta.gif" alt="Ampulheta" class="hourglass-icon" onerror="this.style.display='none'">`} Status Logado</span>
            <div class="user-name">${usuario.nome}!</div>
          </div>
        </div>
      </div>
    `;
  }).catch(function(err) {
    console.warn('Erro ao buscar ampulheta:', err);
    // Em caso de erro ao obter ampulheta, renderizar interface sem a ampulheta
    document.getElementById('authButtons').innerHTML = `
      <div class="logged-user-container">
        <div class="user-avatar">
          <img src="${fotoPerfilUrl}" alt="Foto de Perfil" class="profile-pic" onerror="console.error('Erro ao carregar imagem:', this.src); this.onerror=null; this.src='${placeholderUrl}';">
        </div>
        <div class="user-info">
          <div class="buttons-row">
            <button onclick="location.href='minha-conta.html'">Minha Conta</button>
            <button onclick="logout()">Sair</button>
          </div>
          <div class="user-status">
            <span><img src="imagens/ampulheta.gif" alt="Ampulheta" class="hourglass-icon" onerror="this.style.display='none'"> Status Logado</span>
            <div class="user-name">${usuario.nome}!</div>
          </div>
        </div>
      </div>
    `;
  });
  } catch (err) {
    console.error('Erro ao processar usuário:', err);
    document.getElementById('authButtons').innerHTML = `
      <button onclick="location.href='login.html'">Entrar</button>
      <button onclick="location.href='cadastro.html'">Cadastrar</button>
    `;
  }
}
  
  // Função para sair (limpar localStorage e recarregar)
  function logout() {
    limparSessao();
    location.reload();
  }
  
  // Executa ao carregar a página
  document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    carregarImagemProduto1();
  });

// Função para carregar a primeira imagem do produto1 do banco de dados
async function carregarImagemProduto1() {
  const imgProduto1 = document.getElementById('img-produto1');
  
  if (!imgProduto1) {
    return; // Elemento não encontrado, sair silenciosamente
  }
  
  try {
    // Buscar imagens do produto1 (código 1)
    const response = await fetch('/api/produtos/1/imagens');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const imagens = await response.json();
    
    // Se houver imagens, usar a primeira (ordenada por ordem)
    if (imagens && imagens.length > 0) {
      // Ordenar por ordem
      imagens.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
      
      // Usar a primeira imagem
      const primeiraImagem = imagens[0];
      imgProduto1.src = primeiraImagem.url_imagem;
      imgProduto1.alt = primeiraImagem.descricao || 'Produto1';
      
      console.log('✅ Imagem do produto1 carregada do banco:', primeiraImagem.url_imagem);
    } else {
      // Se não houver imagens no banco, manter a imagem padrão
      console.log('ℹ️ Nenhuma imagem encontrada no banco para produto1, usando imagem padrão');
    }
  } catch (err) {
    // Em caso de erro, manter a imagem padrão
    console.warn('⚠️ Erro ao carregar imagem do produto1 do banco, usando imagem padrão:', err);
    // A imagem padrão já está definida no HTML, então não precisa fazer nada
  }
}