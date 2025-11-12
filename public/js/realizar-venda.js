function checkAccess() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  if (!usuario) {
    window.location.href = 'login.html';
  }
}

async function buscarProduto() {
  const codigo = document.getElementById('codigoProduto').value;
  if (!codigo) {
    document.getElementById('nomeProduto').value = '';
    document.getElementById('estoqueDisponivel').value = '';
    return;
  }
  
  try {
    const response = await fetch(`/api/produtos/${codigo}`);
    if (response.ok) {
      const produto = await response.json();
      document.getElementById('nomeProduto').value = produto.produto;
      document.getElementById('estoqueDisponivel').value = produto.estoque_atual || 0;
    } else {
      document.getElementById('nomeProduto').value = 'Produto não encontrado';
      document.getElementById('estoqueDisponivel').value = '';
      alert('Produto não encontrado. Verifique o código.');
    }
  } catch (err) {
    console.error('Erro ao buscar produto:', err);
    alert('Erro ao buscar produto. Verifique sua conexão.');
  }
}

document.getElementById('formRealizarVenda').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const venda = {
    codigo_produto: parseInt(document.getElementById('codigoProduto').value),
    quantidade: parseInt(document.getElementById('quantidade').value),
    id_vendedor: parseInt(document.getElementById('idVendedor').value)
  };
  
  try {
    const response = await fetch('/api/vendas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(venda)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('✅ ' + result.message);
      document.getElementById('formRealizarVenda').reset();
      document.getElementById('idVendedor').value = 5;
      document.getElementById('nomeProduto').value = '';
      document.getElementById('estoqueDisponivel').value = '';
    } else {
      alert('❌ Erro: ' + result.error);
    }
  } catch (err) {
    alert('❌ Erro de conexão com o servidor.');
  }
});

document.addEventListener('DOMContentLoaded', checkAccess);



