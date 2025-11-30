// Garantir que todos os campos iniciem vazios
document.addEventListener('DOMContentLoaded', () => {
  const campos = ['nome', 'cpf', 'email', 'perfil', 'senha', 'confirmarSenha'];
  campos.forEach(campoId => {
    const campo = document.getElementById(campoId);
    if (campo) {
      campo.value = '';
      if (campoId === 'senha' || campoId === 'confirmarSenha') {
        campo.setAttribute('autocomplete', 'new-password');
      } else {
        campo.setAttribute('autocomplete', 'off');
      }
    }
  });
  
  // Limpar qualquer valor que possa ter sido preenchido pelo navegador
  setTimeout(() => {
    campos.forEach(campoId => {
      const campo = document.getElementById(campoId);
      if (campo && campo.value) campo.value = '';
    });
  }, 100);
});

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
        // Salvar valores no autocomplete antes de redirecionar
        if (typeof autocompleteManager !== 'undefined') {
          if (data.email) autocompleteManager.saveValue('email', data.email);
          if (data.cpf) autocompleteManager.saveValue('cpf', data.cpf);
          if (data.nome) autocompleteManager.saveValue('nome', data.nome);
        }
        alert(result.message);
        window.location.href = 'login.html';
      } else {
        alert('Erro: ' + result.error);
      }
    } catch (err) {
      alert('Erro de conexão com o servidor.');
    }
  });