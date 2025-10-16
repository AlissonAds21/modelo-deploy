document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
  
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
        alert(result.message);
        localStorage.setItem('usuario', JSON.stringify(result.usuario));
        window.location.href = 'index.html';
      } else {
        alert('Erro: ' + result.error);
      }
    } catch (err) {
      alert('Erro de conexão com o servidor.');
    }
  });