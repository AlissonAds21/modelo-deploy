// Garantir que campos iniciem vazios
document.addEventListener('DOMContentLoaded', () => {
  const campos = ['cep', 'numero', 'complemento'];
  campos.forEach(campoId => {
    const campo = document.getElementById(campoId);
    if (campo) {
      campo.value = '';
      campo.setAttribute('autocomplete', 'off');
    }
  });
  
  // Limpar campos readonly também
  setTimeout(() => {
    ['logradouro', 'bairro', 'cidade', 'estado'].forEach(campoId => {
      const campo = document.getElementById(campoId);
      if (campo) campo.value = '';
    });
  }, 100);
});

// Submissão do formulário de endereço
document.getElementById('enderecoForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Você precisa estar logado para cadastrar um endereço.');
    window.location.href = 'login.html';
    return;
  }
  
  const formData = {
    cep: document.getElementById('cep').value.replace(/\D/g, ''),
    logradouro: document.getElementById('logradouro').value.trim(),
    numero: document.getElementById('numero').value.trim(),
    complemento: document.getElementById('complemento').value.trim(),
    bairro: document.getElementById('bairro').value.trim(),
    cidade: document.getElementById('cidade').value.trim(),
    estado: document.getElementById('estado').value.trim(),
    pais: document.getElementById('pais').value.trim()
  };
  
  // Validações
  if (!formData.cep || formData.cep.length !== 8) {
    alert('CEP inválido!');
    return;
  }
  
  if (!formData.numero) {
    alert('Número é obrigatório!');
    return;
  }
  
  try {
    const response = await fetch('/api/enderecos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert(result.message || 'Endereço cadastrado com sucesso!');
      // Limpar formulário
      document.getElementById('enderecoForm').reset();
      // Limpar campos readonly
      document.getElementById('logradouro').value = '';
      document.getElementById('bairro').value = '';
      document.getElementById('cidade').value = '';
      document.getElementById('estado').value = '';
      document.getElementById('pais').value = 'Brasil';
    } else {
      alert('Erro: ' + (result.error || 'Erro ao cadastrar endereço.'));
    }
  } catch (err) {
    console.error('Erro ao cadastrar endereço:', err);
    alert('Erro de conexão com o servidor.');
  }
});

