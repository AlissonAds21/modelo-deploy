// Verificar login e sessão (apenas para ações que requerem autenticação)
function checkAdminAccess() {
  const token = localStorage.getItem('token');
  const tokenExpiry = localStorage.getItem('tokenExpiry');
  
  // Se não houver token, permitir visualização mas não ações administrativas
  if (!token || !tokenExpiry) {
    console.log('Usuário não autenticado - modo visualização');
    return false; // Retorna false mas não bloqueia acesso
  }
  
  // Verificar se token expirou
  const agora = Date.now();
  if (agora > parseInt(tokenExpiry)) {
    console.log('Token expirado');
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('usuario');
    localStorage.removeItem('lastActivity');
    return false;
  }
  
  // Verificar inatividade
  const lastActivity = localStorage.getItem('lastActivity');
  if (lastActivity) {
    const tempoInatividade = agora - parseInt(lastActivity);
    const umaHora = 60 * 60 * 1000;
    if (tempoInatividade > umaHora) {
      console.log('Sessão expirada por inatividade');
      localStorage.removeItem('token');
      localStorage.removeItem('tokenExpiry');
      localStorage.removeItem('usuario');
      localStorage.removeItem('lastActivity');
      return false;
    }
  }
  
  // Atualizar última atividade
  localStorage.setItem('lastActivity', agora.toString());
  
  // Verificar token no servidor (opcional, para validação adicional)
  fetch('/api/verificar-sessao', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }).catch(() => {
    // Se falhar, não bloquear, mas logar erro
    console.warn('Erro ao verificar sessão no servidor');
  });
  
  return true; // Usuário autenticado
}

// Verificar autenticação antes de ações administrativas
function requireAuth() {
  const isAuthenticated = checkAdminAccess();
  if (!isAuthenticated) {
    alert('Você precisa estar logado para realizar esta ação. Faça login primeiro.');
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('tokenExpiry');
  localStorage.removeItem('usuario');
  localStorage.removeItem('lastActivity');
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
  if (!requireAuth()) return; // Requer autenticação para abrir modal
  
  const modal = document.getElementById('modalProduto');
  const form = document.getElementById('formProduto');
  const titulo = document.getElementById('modalTitulo');
  const btnAdicionarFotos = document.getElementById('btnAdicionarFotos');
  
  form.reset();
  document.getElementById('produtoCodigo').value = codigo || '';
  titulo.textContent = codigo ? 'Editar Produto' : 'Novo Produto';
  
  // Mostrar botão de fotos apenas se for edição (produto já existe)
  if (btnAdicionarFotos) {
    if (codigo) {
      btnAdicionarFotos.style.display = 'block';
      btnAdicionarFotos.disabled = false;
    } else {
      btnAdicionarFotos.style.display = 'none';
    }
  }
  
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
  
  if (!requireAuth()) return; // Requer autenticação para salvar
  
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
      // Se foi criação, abrir modal novamente para permitir adicionar fotos
      if (!codigo && result.produto && result.produto.codigo_produto) {
        setTimeout(() => {
          abrirModalProduto(result.produto.codigo_produto);
        }, 500);
      }
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

// ============================================
// GERENCIAMENTO DE IMAGENS DO PRODUTO
// ============================================

let produtoCodigoAtual = null;

// Variáveis globais para gerenciamento de imagens
let imagemSelecionadaId = null;
let imagemSelecionadaElement = null;
let imagensCarregadas = []; // Armazenar lista de imagens para acessar ordem

// Abrir modal de imagens
function abrirModalImagens() {
  const codigo = document.getElementById('produtoCodigo').value;
  
  if (!codigo) {
    alert('Por favor, salve o produto primeiro antes de adicionar fotos.');
    return;
  }
  
  produtoCodigoAtual = codigo;
  document.getElementById('imagemProdutoCodigo').value = codigo;
  document.getElementById('modalImagens').style.display = 'block';
  carregarImagensProduto(codigo);
  // Resetar seleção
  imagemSelecionadaId = null;
  imagemSelecionadaElement = null;
}

// Fechar modal de imagens
function fecharModalImagens() {
  document.getElementById('modalImagens').style.display = 'none';
  const form = document.getElementById('formUploadImagem');
  if (form) form.reset();
  produtoCodigoAtual = null;
  imagemSelecionadaId = null;
  imagemSelecionadaElement = null;
}

// Carregar imagens do produto/serviço
async function carregarImagensProduto(codigo) {
  try {
    const response = await fetch(`/api/produtos/${codigo}/imagens`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const imagens = await response.json();
    const container = document.getElementById('imagensList');
    
    if (!container) return;
    
    if (!imagens || imagens.length === 0) {
      container.innerHTML = `
        <div class="imagens-empty-state" style="grid-column: 1 / -1;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="9" x2="15" y2="15"></line>
            <line x1="15" y1="9" x2="9" y2="15"></line>
          </svg>
          <p>Nenhuma imagem cadastrada</p>
          <p style="font-size: 14px;">Clique em "Adicionar Imagem" para começar</p>
        </div>
      `;
      return;
    }
    
    // Armazenar imagens para acesso posterior
    imagensCarregadas = imagens;
    
    // Ordenar por ordem
    imagens.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    
    container.innerHTML = imagens.map(img => `
      <div class="imagem-thumbnail" data-imagem-id="${img.id_imagem}" onclick="selecionarImagem(${img.id_imagem}, this)">
        <div class="imagem-clip-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
          </svg>
        </div>
        <div class="imagem-thumbnail-image">
          <img src="${img.url_imagem}" 
               alt="${img.descricao || 'Imagem'}" 
               onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22150%22%3E%3Crect fill=%22%23ddd%22 width=%22150%22 height=%22150%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3EErro%3C/text%3E%3C/svg%3E';"
               onclick="event.stopPropagation(); abrirPreview('${img.url_imagem}');">
        </div>
        <div class="imagem-actions-bar">
          <button class="imagem-action-btn edit" onclick="event.stopPropagation(); abrirOpcoesImagem(${img.id_imagem}, this);" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="imagem-action-btn delete" onclick="event.stopPropagation(); confirmarDeletarImagem(${img.id_imagem});" title="Deletar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
        ${img.descricao ? `<div style="font-size: 11px; color: #666; margin-top: 4px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${img.descricao}</div>` : ''}
      </div>
    `).join('');
  } catch (err) {
    console.error('Erro ao carregar imagens:', err);
    const container = document.getElementById('imagensList');
    if (container) {
      container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #d00;">Erro ao carregar imagens. Verifique a conexão.</p>';
    }
  }
}

// Selecionar imagem
function selecionarImagem(id, element) {
  // Remover seleção anterior
  document.querySelectorAll('.imagem-thumbnail').forEach(thumb => {
    thumb.classList.remove('selected');
  });
  
  // Adicionar seleção atual
  if (element) {
    element.classList.add('selected');
    imagemSelecionadaId = id;
    imagemSelecionadaElement = element;
  }
}

// Abrir preview da imagem
function abrirPreview(url) {
  const modal = document.getElementById('modalPreviewImagem');
  const img = document.getElementById('previewImagemSrc');
  if (modal && img) {
    img.src = url;
    modal.style.display = 'block';
  }
}

// Fechar preview
function fecharPreview() {
  const modal = document.getElementById('modalPreviewImagem');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Abrir opções de imagem
function abrirOpcoesImagem(id, element) {
  imagemSelecionadaId = id;
  imagemSelecionadaElement = element;
  
  const modal = document.getElementById('modalOpcoesImagem');
  const optionAtualizar = document.getElementById('optionAtualizar');
  const optionDeletar = document.getElementById('optionDeletar');
  
  if (modal) {
    // Mostrar opções de atualizar e deletar apenas se houver imagem selecionada
    if (optionAtualizar) optionAtualizar.style.display = id ? 'block' : 'none';
    if (optionDeletar) optionDeletar.style.display = id ? 'block' : 'none';
    modal.style.display = 'block';
  }
}

// Abrir opções para adicionar (sem imagem selecionada)
function abrirOpcoesAdicionar() {
  imagemSelecionadaId = null;
  imagemSelecionadaElement = null;
  abrirOpcoesImagem(null, null);
}

// Fechar modal de opções
function fecharModalOpcoes(event) {
  if (event && event.target.id === 'modalOpcoesImagem') {
    const modal = document.getElementById('modalOpcoesImagem');
    if (modal) modal.style.display = 'none';
  } else if (!event) {
    const modal = document.getElementById('modalOpcoesImagem');
    if (modal) modal.style.display = 'none';
  }
}

// Abrir upload para nova imagem
function abrirUploadNova() {
  fecharModalOpcoes();
  const modal = document.getElementById('modalUploadImagem');
  const titulo = document.getElementById('uploadTitulo');
  const form = document.getElementById('formUploadImagem');
  const idAtualizar = document.getElementById('imagemIdAtualizar');
  
  if (modal && form) {
    if (titulo) titulo.textContent = 'Adicionar Nova Foto';
    if (idAtualizar) idAtualizar.value = '';
    form.reset();
    modal.style.display = 'block';
  }
}

// Abrir upload para atualizar imagem existente
function abrirUploadAtualizar() {
  if (!imagemSelecionadaId) {
    alert('Selecione uma imagem primeiro.');
    return;
  }
  
  fecharModalOpcoes();
  const modal = document.getElementById('modalUploadImagem');
  const titulo = document.getElementById('uploadTitulo');
  const idAtualizar = document.getElementById('imagemIdAtualizar');
  
  if (modal) {
    if (titulo) titulo.textContent = 'Atualizar Foto';
    if (idAtualizar) idAtualizar.value = imagemSelecionadaId;
    
    // Preencher descrição da imagem atual se existir
    const imagemAtual = imagensCarregadas.find(img => img.id_imagem == imagemSelecionadaId);
    const descricaoInput = document.getElementById('imagemDescricao');
    if (descricaoInput && imagemAtual) {
      descricaoInput.value = imagemAtual.descricao || '';
    }
    
    modal.style.display = 'block';
  }
}

// Fechar modal de upload
function fecharModalUpload() {
  const modal = document.getElementById('modalUploadImagem');
  if (modal) {
    modal.style.display = 'none';
    document.getElementById('formUploadImagem').reset();
    const idAtualizar = document.getElementById('imagemIdAtualizar');
    if (idAtualizar) idAtualizar.value = '';
  }
}

// Confirmar deletar (abre modal de opções primeiro)
function confirmarDeletar() {
  fecharModalOpcoes();
  if (imagemSelecionadaId) {
    confirmarDeletarImagem(imagemSelecionadaId);
  }
}

// Confirmar e deletar imagem
async function confirmarDeletarImagem(idImagem) {
  if (!confirm('Deseja realmente remover esta imagem? Esta ação não pode ser desfeita.')) {
    return;
  }
  
  const codigo = produtoCodigoAtual || document.getElementById('imagemProdutoCodigo').value;
  
  if (!codigo) {
    alert('Código do produto não encontrado.');
    return;
  }
  
  try {
    const response = await fetch(`/api/produtos/${codigo}/imagens/${idImagem}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert(result.message);
      carregarImagensProduto(codigo);
      imagemSelecionadaId = null;
      imagemSelecionadaElement = null;
    } else {
      alert('Erro: ' + result.error);
    }
  } catch (err) {
    console.error('Erro ao deletar imagem:', err);
    alert('Erro ao remover imagem.');
  }
}

// Função deletarImagem mantida para compatibilidade (chama confirmarDeletarImagem)
async function deletarImagem(idImagem) {
  await confirmarDeletarImagem(idImagem);
}

// Upload de imagem (novo ou atualizar)
document.getElementById('formUploadImagem').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const codigo = document.getElementById('imagemProdutoCodigo').value;
  const idAtualizar = document.getElementById('imagemIdAtualizar').value;
  const fileInput = document.getElementById('imagemFile');
  const descricao = document.getElementById('imagemDescricao').value;
  
  if (!fileInput.files || fileInput.files.length === 0) {
    alert('Por favor, selecione uma imagem.');
    return;
  }
  
  if (!codigo) {
    alert('Código do produto não encontrado.');
    return;
  }
  
  // Determinar ordem baseada na ação
  let ordem;
  if (idAtualizar) {
    // Atualização: manter a ordem da imagem original
    const imagemAtual = imagensCarregadas.find(img => img.id_imagem == idAtualizar);
    ordem = imagemAtual ? (imagemAtual.ordem || 0) : 0;
  } else {
    // Nova imagem: adicionar no final (última ordem + 1)
    const ordensExistentes = imagensCarregadas.map(img => img.ordem || 0);
    ordem = ordensExistentes.length > 0 ? Math.max(...ordensExistentes) + 1 : 0;
  }
  
  const formData = new FormData();
  formData.append('imagem', fileInput.files[0]);
  formData.append('ordem', ordem);
  formData.append('descricao', descricao);
  
  try {
    // Se for atualização, primeiro deletar a imagem antiga
    if (idAtualizar) {
      const deleteResponse = await fetch(`/api/produtos/${codigo}/imagens/${idAtualizar}`, {
        method: 'DELETE'
      });
      
      if (!deleteResponse.ok) {
        console.warn('Aviso: Não foi possível remover a imagem antiga antes de atualizar.');
      }
    }
    
    // Fazer upload da nova imagem
    const response = await fetch(`/api/produtos/${codigo}/imagens`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert(idAtualizar ? 'Imagem atualizada com sucesso! A posição foi mantida.' : result.message);
      fecharModalUpload();
      carregarImagensProduto(codigo);
      imagemSelecionadaId = null;
      imagemSelecionadaElement = null;
    } else {
      alert('Erro: ' + result.error);
    }
  } catch (err) {
    console.error('Erro ao fazer upload:', err);
    alert('Erro ao fazer upload da imagem.');
  }
});

// Fechar modais ao clicar fora
document.addEventListener('click', (e) => {
  // Fechar preview
  if (e.target.id === 'modalPreviewImagem') {
    fecharPreview();
  }
});

// Fechar modal ao clicar fora
window.onclick = function(event) {
  const modalProduto = document.getElementById('modalProduto');
  const modalImagens = document.getElementById('modalImagens');
  const modalUpload = document.getElementById('modalUploadImagem');
  const modalPreview = document.getElementById('modalPreviewImagem');
  
  if (event.target == modalProduto) {
    fecharModalProduto();
  }
  
  if (event.target == modalImagens) {
    fecharModalImagens();
  }
  
  if (event.target == modalUpload) {
    fecharModalUpload();
  }
  
  if (event.target == modalPreview) {
    fecharPreview();
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  // Verificar autenticação mas não bloquear acesso à visualização
  const isAuthenticated = checkAdminAccess();
  
  // Carregar dados mesmo sem autenticação (modo visualização)
  carregarDashboard();
  carregarProdutos();
  
  // Se não autenticado, mostrar aviso discreto
  if (!isAuthenticated) {
    console.log('Modo visualização - faça login para editar');
  }
});



