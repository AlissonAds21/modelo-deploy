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
    document.getElementById('marcaProduto').value = '';
    document.getElementById('valorUnitario').value = '';
    return;
  }
  
  try {
    const response = await fetch(`/api/produtos/${codigo}`);
    const data = await response.json();
    
    if (response.ok) {
      const produto = data;
      document.getElementById('nomeProduto').value = produto.produto || '';
      document.getElementById('marcaProduto').value = produto.marca || '';
      if (produto.valor_compra) {
        document.getElementById('valorUnitario').value = produto.valor_compra;
      } else {
        document.getElementById('valorUnitario').value = '';
      }
    } else {
      document.getElementById('nomeProduto').value = '';
      document.getElementById('marcaProduto').value = '';
      document.getElementById('valorUnitario').value = '';
      alert('Produto não encontrado. Verifique o código.');
    }
  } catch (err) {
    console.error('Erro ao buscar produto:', err);
    document.getElementById('nomeProduto').value = '';
    document.getElementById('marcaProduto').value = '';
    document.getElementById('valorUnitario').value = '';
    alert('Erro ao buscar produto. Verifique sua conexão com o servidor.');
  }
}

document.getElementById('formReceberProduto').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const compra = {
    codigo_produto: parseInt(document.getElementById('codigoProduto').value),
    quantidade: parseInt(document.getElementById('quantidade').value),
    valor_unitario: parseFloat(document.getElementById('valorUnitario').value)
  };
  
  try {
    const response = await fetch('/api/compras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(compra)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('✅ ' + result.message);
      document.getElementById('formReceberProduto').reset();
      document.getElementById('nomeProduto').value = '';
      document.getElementById('marcaProduto').value = '';
      document.getElementById('valorUnitario').value = '';
    } else {
      const errorMsg = result.error || 'Erro desconhecido ao receber produto.';
      alert('❌ Erro: ' + errorMsg);
    }
  } catch (err) {
    alert('❌ Erro de conexão com o servidor.');
  }
});

document.addEventListener('DOMContentLoaded', checkAccess);



