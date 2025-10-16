// Função para verificar se o usuário está logado
function checkLoginStatus() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));

  if (usuario) {
    document.getElementById('authButtons').innerHTML = `
      <div class="logged-user-container">
        <!-- Imagem de perfil -->
        <div class="user-avatar">
          <img src="${usuario.fotoPerfil || 'imagens/user-default.png'}" alt="Foto de Perfil" class="profile-pic">
        </div>
        
        <!-- Botões e status à direita -->
        <div class="user-info">
          <div class="buttons-row">
            <button onclick="location.href='minha-conta.html'">Minha Conta</button>
            <button onclick="logout()">Sair</button>
          </div>
          <div class="user-status">
            <span><img src="imagens/ampulheta.gif" alt="Ampulheta" class="hourglass-icon"> Status Logado</span>
            <div class="user-name">${usuario.nome}!</div>
          </div>
        </div>
      </div>
    `;
  } else {
    // Usuário não logado
    document.getElementById('authButtons').innerHTML = `
      <button onclick="location.href='login.html'">Entrar</button>
      <button onclick="location.href='cadastro.html'">Cadastrar</button>
    `;
  }
}
  
  // Função para sair (limpar localStorage e recarregar)
  function logout() {
    localStorage.removeItem('usuario');
    location.reload();
  }
  
  // Executa ao carregar a página
  document.addEventListener('DOMContentLoaded', checkLoginStatus);