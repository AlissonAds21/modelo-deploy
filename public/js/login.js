// Limpar campos ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('email');
  const senhaInput = document.getElementById('senha');
  
  // Garantir que os campos estejam vazios
  if (emailInput) {
    emailInput.value = '';
    emailInput.setAttribute('autocomplete', 'off');
    emailInput.setAttribute('autocapitalize', 'off');
    emailInput.setAttribute('spellcheck', 'false');
  }
  if (senhaInput) {
    senhaInput.value = '';
    senhaInput.setAttribute('autocomplete', 'new-password');
  }
  
  // Limpar qualquer valor que possa ter sido preenchido pelo navegador
  setTimeout(() => {
    if (emailInput && emailInput.value) emailInput.value = '';
    if (senhaInput && senhaInput.value) senhaInput.value = '';
  }, 100);
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
        // Salvar email/CPF no autocomplete
        if (typeof autocompleteManager !== 'undefined') {
          const loginValue = email.trim();
          if (loginValue.includes('@')) {
            autocompleteManager.saveValue('email', loginValue);
          } else if (loginValue.replace(/\D/g, '').length >= 10) {
            autocompleteManager.saveValue('cpf', loginValue);
          }
        }
        
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
        // Mensagem padronizada
        alert('E-mail, CPF ou senha incorretos.');
        // Limpar campos em caso de erro
        document.getElementById('senha').value = '';
      }
    } catch (err) {
      alert('E-mail, CPF ou senha incorretos.');
      document.getElementById('senha').value = '';
    }
  });

// Funcionalidade do ícone de olho para mostrar/esconder senha
// Lógica: olho SEM traço = senha oculta, olho COM traço = senha visível
document.addEventListener('DOMContentLoaded', () => {
  const togglePassword = document.getElementById('togglePassword');
  const senhaInput = document.getElementById('senha');
  const passwordWrapper = document.querySelector('.password-input-wrapper');
  
  if (togglePassword && senhaInput && passwordWrapper) {
    togglePassword.addEventListener('click', () => {
      const isPassword = senhaInput.type === 'password';
      // Se está como password (oculta), mudar para text (visível)
      // Se está como text (visível), mudar para password (oculta)
      senhaInput.type = isPassword ? 'text' : 'password';
      // Quando senha está visível (text), mostrar olho com traço
      // Quando senha está oculta (password), mostrar olho sem traço
      passwordWrapper.classList.toggle('show-password', !isPassword);
    });
  }
});