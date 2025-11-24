// Limpar campos ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('email');
  const senhaInput = document.getElementById('senha');
  
  // Garantir que os campos estejam vazios
  if (emailInput) emailInput.value = '';
  if (senhaInput) senhaInput.value = '';
  
  // Desabilitar autocomplete do navegador
  if (emailInput) {
    emailInput.setAttribute('autocomplete', 'off');
    emailInput.setAttribute('autocapitalize', 'off');
    emailInput.setAttribute('spellcheck', 'false');
  }
  if (senhaInput) {
    senhaInput.setAttribute('autocomplete', 'new-password');
  }
});

// Verificar se há token expirado no localStorage e limpar
function verificarSessaoExpirada() {
  const token = localStorage.getItem('token');
  const tokenExpiry = localStorage.getItem('tokenExpiry');
  
  if (token && tokenExpiry) {
    const agora = Date.now();
    if (agora > parseInt(tokenExpiry)) {
      // Token expirado, limpar dados
      localStorage.removeItem('token');
      localStorage.removeItem('tokenExpiry');
      localStorage.removeItem('usuario');
      console.log('Sessão expirada. Faça login novamente.');
    }
  }
}

// Executar verificação ao carregar
verificarSessaoExpirada();

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
  
    // Validar campos vazios
    if (!email || !senha) {
      alert('Por favor, preencha todos os campos.');
      return;
    }
  
    // Permitir login por CPF ou e-mail
    const login = email; // pode ser CPF ou e-mail
  
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, senha })
      });
  
      const result = await response.json();
  
      if (response.ok) {
        // Armazenar token e dados do usuário
        if (result.token) {
          localStorage.setItem('token', result.token);
          // Token expira em 1 hora (3600000 ms)
          const expiryTime = Date.now() + (60 * 60 * 1000);
          localStorage.setItem('tokenExpiry', expiryTime.toString());
        }
        
        localStorage.setItem('usuario', JSON.stringify(result.usuario));
        localStorage.setItem('lastActivity', Date.now().toString());
        
        alert(result.message);
        window.location.href = 'index.html';
      } else {
        alert('Erro: ' + result.error);
        // Limpar campos em caso de erro
        document.getElementById('senha').value = '';
      }
    } catch (err) {
      alert('Erro de conexão com o servidor.');
      document.getElementById('senha').value = '';
    }
  });