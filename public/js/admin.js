// Verificar login
function checkAdminAccess() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  if (!usuario) {
    window.location.href = 'login.html';
  }
}

// Logout
function logout() {
  localStorage.removeItem('usuario');
  window.location.href = 'index.html';
}

// Tabs
function showTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  document.getElementById(`tab-${tabName}`).classList.add('active');
  event.target.classList.add('active');
  
  // Carregar dados da tab
  if (tabName === 'produtos') carregarProdutos();
  if (tabName === 'estoque') carregarEstoque();
  if (tabName === 'vendas') carregarVendas();
  if (tabName === 'compras') carregarCompras();
}

// Dashboard
async function carregarDashboard() {
  try {
    const response = await fetch('/api/dashboard');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    
    document.getElementById('totalProdutos').textContent = data.produtos?.total || 0;
    document.getElementById('totalEstoque').textContent = data.estoque?.total_estoque || 0;
    document.getElementById('totalVendas').textContent = data.vendas?.total_vendas || 0;
    document.getElementById('totalCompras').textContent = data.compras?.total_compras || 0;
  } catch (err) {
    console.error('Erro ao carregar dashboard:', err);
    // Definir valores padrão em caso de erro
    document.getElementById('totalProdutos').textContent = '0';
    document.getElementById('totalEstoque').textContent = '0';
    document.getElementById('totalVendas').textContent = '0';
    document.getElementById('totalCompras').textContent = '0';
  }
}

// Produtos
async function carregarProdutos() {
  try {
    const response = await fetch('/api/produtos');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const produtos = await response.json();
    
    const tbody = document.getElementById('tbodyProdutos');
    if (!produtos || produtos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">Nenhum produto cadastrado</td></tr>';
      return;
    }
    
    tbody.innerHTML = produtos.map(p => `
      <tr>
        <td>${p.codigo_produto}</td>
        <td>${p.produto}</td>
        <td>${p.marca || '-'}</td>
        <td>R$ ${parseFloat(p.valor_compra || 0).toFixed(2)}</td>
        <td>R$ ${parseFloat(p.valor_venda || 0).toFixed(2)}</td>
        <td>${p.estoque_atual || 0}</td>
        <td>
          <button class="btn-secondary" onclick="editarProduto(${p.codigo_produto})">Editar</button>
          <button class="btn-danger" onclick="desativarProduto(${p.codigo_produto})">Desativar</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Erro ao carregar produtos:', err);
    const tbody = document.getElementById('tbodyProdutos');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7">Erro ao carregar produtos. Verifique a conexão com o servidor.</td></tr>';
    }
  }
}

// Estoque
async function carregarEstoque() {
  try {
    const response = await fetch('/api/estoque');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const estoque = await response.json();
    
    const tbody = document.getElementById('tbodyEstoque');
    if (!estoque || estoque.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">Nenhum registro de estoque</td></tr>';
      return;
    }
    
    tbody.innerHTML = estoque.map(e => `
      <tr>
        <td>${e.codigo_produto}</td>
        <td>${e.produto}</td>
        <td>${e.quantidade_saldo_anterior || 0}</td>
        <td>${e.quantidade_saldo_atual || 0}</td>
        <td>${e.data_movimentacao_atual ? new Date(e.data_movimentacao_atual).toLocaleString('pt-BR') : '-'}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Erro ao carregar estoque:', err);
    const tbody = document.getElementById('tbodyEstoque');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5">Erro ao carregar estoque. Verifique a conexão com o servidor.</td></tr>';
    }
  }
}

// Vendas
async function carregarVendas() {
  try {
    const response = await fetch('/api/vendas');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const vendas = await response.json();
    
    const tbody = document.getElementById('tbodyVendas');
    if (!vendas || vendas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">Nenhuma venda registrada</td></tr>';
      return;
    }
    
    tbody.innerHTML = vendas.map(v => `
      <tr>
        <td>${v.id_pedido}</td>
        <td>${v.produto}</td>
        <td>${v.quantidade}</td>
        <td>R$ ${parseFloat(v.valor_unitario).toFixed(2)}</td>
        <td>R$ ${parseFloat(v.valor_total).toFixed(2)}</td>
        <td>${v.cargo_vendedor || v.id_vendedor}</td>
        <td>${new Date(v.data_venda).toLocaleString('pt-BR')}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Erro ao carregar vendas:', err);
    const tbody = document.getElementById('tbodyVendas');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7">Erro ao carregar vendas. Verifique a conexão com o servidor.</td></tr>';
    }
  }
}

// Compras
async function carregarCompras() {
  try {
    const response = await fetch('/api/compras');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const compras = await response.json();
    
    const tbody = document.getElementById('tbodyCompras');
    if (!compras || compras.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">Nenhuma compra registrada</td></tr>';
      return;
    }
    
    tbody.innerHTML = compras.map(c => `
      <tr>
        <td>${c.id_pedido_compra}</td>
        <td>${c.produto}</td>
        <td>${c.quantidade}</td>
        <td>R$ ${parseFloat(c.valor_unitario).toFixed(2)}</td>
        <td>R$ ${parseFloat(c.valor_total).toFixed(2)}</td>
        <td>${new Date(c.data_compra).toLocaleString('pt-BR')}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Erro ao carregar compras:', err);
    const tbody = document.getElementById('tbodyCompras');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6">Erro ao carregar compras. Verifique a conexão com o servidor.</td></tr>';
    }
  }
}

// Modal Produto
function abrirModalProduto(codigo = null) {
  const modal = document.getElementById('modalProduto');
  const form = document.getElementById('formProduto');
  const titulo = document.getElementById('modalTitulo');
  
  form.reset();
  document.getElementById('produtoCodigo').value = codigo || '';
  titulo.textContent = codigo ? 'Editar Produto' : 'Novo Produto';
  modal.style.display = 'block';
  
  if (codigo) {
    editarProduto(codigo);
  }
}

function fecharModalProduto() {
  document.getElementById('modalProduto').style.display = 'none';
}

async function editarProduto(codigo) {
  try {
    const response = await fetch(`/api/produtos/${codigo}`);
    const produto = await response.json();
    
    document.getElementById('produtoCodigo').value = produto.codigo_produto;
    document.getElementById('produtoNome').value = produto.produto;
    document.getElementById('produtoMarca').value = produto.marca || '';
    document.getElementById('produtoValorCompra').value = produto.valor_compra || 0;
    document.getElementById('produtoValorVenda').value = produto.valor_venda || 0;
    
    document.getElementById('modalProduto').style.display = 'block';
  } catch (err) {
    alert('Erro ao carregar produto');
  }
}

// Form Produto
document.getElementById('formProduto').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const codigo = document.getElementById('produtoCodigo').value;
  const produto = {
    produto: document.getElementById('produtoNome').value,
    marca: document.getElementById('produtoMarca').value,
    valor_compra: parseFloat(document.getElementById('produtoValorCompra').value) || 0,
    valor_venda: parseFloat(document.getElementById('produtoValorVenda').value) || 0
  };
  
  try {
    const url = codigo ? `/api/produtos/${codigo}` : '/api/produtos';
    const method = codigo ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(produto)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert(result.message);
      fecharModalProduto();
      carregarProdutos();
    } else {
      alert('Erro: ' + result.error);
    }
  } catch (err) {
    alert('Erro ao salvar produto');
  }
});

async function desativarProduto(codigo) {
  if (!confirm('Deseja realmente desativar este produto?')) return;
  
  try {
    const response = await fetch(`/api/produtos/${codigo}`, { method: 'DELETE' });
    const result = await response.json();
    
    if (response.ok) {
      alert(result.message);
      carregarProdutos();
    } else {
      alert('Erro: ' + result.error);
    }
  } catch (err) {
    alert('Erro ao desativar produto');
  }
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
  const modal = document.getElementById('modalProduto');
  if (event.target == modal) {
    fecharModalProduto();
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  checkAdminAccess();
  carregarDashboard();
  carregarProdutos();
});



