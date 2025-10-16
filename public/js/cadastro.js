document.getElementById('cadastroForm').addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const formData = new FormData(e.target);
    const data = {};
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }
  
    // Validação de senhas
    if (data.senha !== data.confirmarSenha) {
      alert('As senhas não coincidem!');
      document.getElementById('confirmarSenha').focus();
      return;
    }
  
    try {
      const response = await fetch('/api/cadastro', {
        method: 'POST',
        body: formData
      });
  
      const result = await response.json();
  
      if (response.ok) {
        alert(result.message);
        window.location.href = 'login.html';
      } else {
        alert('Erro: ' + result.error);
      }
    } catch (err) {
      alert('Erro de conexão com o servidor.');
    }
  });