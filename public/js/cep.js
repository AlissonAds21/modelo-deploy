// Função para formatar CEP
function formatarCEP(cep) {
  const cepLimpo = cep.replace(/\D/g, '');
  if (cepLimpo.length === 8) {
    return cepLimpo.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  return cepLimpo;
}

// Event listener para o campo CEP
document.addEventListener('DOMContentLoaded', () => {
  const cepInput = document.getElementById('cep');
  
  if (cepInput) {
    // Formatar CEP enquanto digita
    cepInput.addEventListener('input', function() {
      this.value = formatarCEP(this.value);
    });

    // Buscar CEP quando sair do campo (blur)
    cepInput.addEventListener('blur', function() {
      const cep = this.value.replace(/\D/g, '');
      
      if (cep.length !== 8) {
        if (cep.length > 0) {
          alert("CEP inválido! Digite 8 dígitos.");
        }
        return;
      }

      // Mostrar loading (opcional)
      const logradouroInput = document.getElementById('logradouro');
      const bairroInput = document.getElementById('bairro');
      const cidadeInput = document.getElementById('cidade');
      const estadoInput = document.getElementById('estado');
      
      if (logradouroInput) logradouroInput.value = 'Buscando...';
      if (bairroInput) bairroInput.value = 'Buscando...';
      if (cidadeInput) cidadeInput.value = 'Buscando...';
      if (estadoInput) estadoInput.value = 'Buscando...';

      fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Erro na requisição');
          }
          return response.json();
        })
        .then(data => {
          if (data.erro) {
            alert("CEP não encontrado.");
            // Limpar campos
            if (logradouroInput) logradouroInput.value = '';
            if (bairroInput) bairroInput.value = '';
            if (cidadeInput) cidadeInput.value = '';
            if (estadoInput) estadoInput.value = '';
            return;
          }

          // Preencher campos
          if (logradouroInput) logradouroInput.value = data.logradouro || '';
          if (bairroInput) bairroInput.value = data.bairro || '';
          if (cidadeInput) cidadeInput.value = data.localidade || '';
          if (estadoInput) estadoInput.value = data.uf || '';
          
          const paisInput = document.getElementById('pais');
          if (paisInput) paisInput.value = 'Brasil';
        })
        .catch(err => {
          console.error("Erro ao buscar CEP:", err);
          alert("Erro ao buscar CEP. Tente novamente.");
          // Limpar campos em caso de erro
          if (logradouroInput) logradouroInput.value = '';
          if (bairroInput) bairroInput.value = '';
          if (cidadeInput) cidadeInput.value = '';
          if (estadoInput) estadoInput.value = '';
        });
    });
  }
});

