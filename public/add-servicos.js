// ============================================
// GERENCIAMENTO DE IMAGENS DE SERVIÇOS
// ============================================

let codigoProdutoAtual = null;
let imagemSelecionadaId = null;
let imagemSelecionadaElement = null;
let produtoInfo = null;
let imagensCarregadas = []; // Armazenar lista de imagens para acessar ordem

// Inicialização quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  // Obter código do produto da URL ou localStorage
  const urlParams = new URLSearchParams(window.location.search);
  codigoProdutoAtual = urlParams.get('codigo') || localStorage.getItem('produtoCodigoParaImagens');
  
  if (!codigoProdutoAtual) {
    alert('Código do produto não encontrado. Redirecionando...');
    window.location.href = 'produto1.html';
    return;
  }
  
  // Salvar no localStorage para referência
  localStorage.setItem('produtoCodigoParaImagens', codigoProdutoAtual);
  
  // Carregar informações do produto e imagens
  carregarInfoProduto();
  carregarImagens();
  
  // Configurar link de voltar
  const linkProduto = document.getElementById('linkProduto');
  if (linkProduto) {
    linkProduto.href = `produto1.html?codigo=${codigoProdutoAtual}`;
  }
});

// Carregar informações do produto
async function carregarInfoProduto() {
  try {
    const response = await fetch(`/api/produtos/${codigoProdutoAtual}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    produtoInfo = await response.json();
    const produtoInfoEl = document.getElementById('produtoInfo');
    
    if (produtoInfoEl && produtoInfo) {
      produtoInfoEl.textContent = `Produto: ${produtoInfo.produto || 'N/A'} ${produtoInfo.marca ? `- ${produtoInfo.marca}` : ''}`;
    }
  } catch (err) {
    console.error('Erro ao carregar informações do produto:', err);
    const produtoInfoEl = document.getElementById('produtoInfo');
    if (produtoInfoEl) {
      produtoInfoEl.textContent = 'Erro ao carregar informações do produto';
    }
  }
}

// Carregar imagens do produto/serviço
async function carregarImagens() {
  try {
    const response = await fetch(`/api/produtos/${codigoProdutoAtual}/imagens`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const imagens = await response.json();
    const container = document.getElementById('imagensList');
    
    if (!container) return;
    
    if (!imagens || imagens.length === 0) {
      container.innerHTML = `
        <div class="imagens-empty-state">
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
    
    // Verificar limite de imagens
    if (imagens.length >= 10) {
      const btnAdd = document.querySelector('.btn-add-imagem');
      if (btnAdd) {
        btnAdd.disabled = true;
        btnAdd.style.opacity = '0.6';
        btnAdd.title = 'Limite de 10 imagens atingido';
      }
    }
    
    // Armazenar imagens para acesso posterior
    imagensCarregadas = imagens;
    
    // Ordenar por ordem
    imagens.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    
    container.innerHTML = imagens.map((img, index) => `
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
        ${img.descricao ? `<div style="font-size: 11px; color: #666; margin-top: 8px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${img.descricao}">${img.descricao}</div>` : ''}
        ${index === 0 ? '<div style="position: absolute; top: 8px; left: 8px; background: #28a745; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">PRINCIPAL</div>' : ''}
      </div>
    `).join('');
  } catch (err) {
    console.error('Erro ao carregar imagens:', err);
    const container = document.getElementById('imagensList');
    if (container) {
      container.innerHTML = '<div class="imagens-empty-state"><p style="color: #d00;">Erro ao carregar imagens. Verifique a conexão.</p></div>';
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
  // Verificar limite de imagens
  const container = document.getElementById('imagensList');
  const thumbnails = container.querySelectorAll('.imagem-thumbnail');
  if (thumbnails.length >= 10) {
    alert('Limite de 10 imagens atingido. Remova uma imagem antes de adicionar outra.');
    return;
  }
  
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
    document.getElementById('imagemProdutoCodigo').value = codigoProdutoAtual;
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
    document.getElementById('imagemProdutoCodigo').value = codigoProdutoAtual;
    
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
  
  if (!codigoProdutoAtual) {
    alert('Código do produto não encontrado.');
    return;
  }
  
  try {
    const response = await fetch(`/api/produtos/${codigoProdutoAtual}/imagens/${idImagem}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert(result.message);
      carregarImagens();
      imagemSelecionadaId = null;
      imagemSelecionadaElement = null;
      
      // Reabilitar botão de adicionar se estava desabilitado
      const btnAdd = document.querySelector('.btn-add-imagem');
      if (btnAdd) {
        btnAdd.disabled = false;
        btnAdd.style.opacity = '1';
        btnAdd.title = '';
      }
    } else {
      alert('Erro: ' + result.error);
    }
  } catch (err) {
    console.error('Erro ao deletar imagem:', err);
    alert('Erro ao remover imagem.');
  }
}

// Upload de imagem (novo ou atualizar)
document.getElementById('formUploadImagem').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const idAtualizar = document.getElementById('imagemIdAtualizar').value;
  const fileInput = document.getElementById('imagemFile');
  const descricao = document.getElementById('imagemDescricao').value;
  
  if (!fileInput.files || fileInput.files.length === 0) {
    alert('Por favor, selecione uma imagem.');
    return;
  }
  
  if (!codigoProdutoAtual) {
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
  
  // Verificar limite antes de adicionar
  if (!idAtualizar) {
    const container = document.getElementById('imagensList');
    const thumbnails = container.querySelectorAll('.imagem-thumbnail');
    if (thumbnails.length >= 10) {
      alert('Limite de 10 imagens atingido. Remova uma imagem antes de adicionar outra.');
      return;
    }
  }
  
  const formData = new FormData();
  formData.append('imagem', fileInput.files[0]);
  formData.append('ordem', ordem);
  formData.append('descricao', descricao);
  
  try {
    // Se for atualização, primeiro deletar a imagem antiga
    if (idAtualizar) {
      const deleteResponse = await fetch(`/api/produtos/${codigoProdutoAtual}/imagens/${idAtualizar}`, {
        method: 'DELETE'
      });
      
      if (!deleteResponse.ok) {
        console.warn('Aviso: Não foi possível remover a imagem antiga antes de atualizar.');
      }
    }
    
    // Fazer upload da nova imagem
    const response = await fetch(`/api/produtos/${codigoProdutoAtual}/imagens`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert(idAtualizar ? 'Imagem atualizada com sucesso! A posição foi mantida.' : result.message);
      fecharModalUpload();
      carregarImagens();
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

// Voltar para página do produto
function voltarParaProduto() {
  const url = `produto1.html?codigo=${codigoProdutoAtual}`;
  window.location.href = url;
}

// Fechar modais ao clicar fora
document.addEventListener('click', (e) => {
  // Fechar preview
  if (e.target.id === 'modalPreviewImagem') {
    fecharPreview();
  }
  
  // Fechar modal de upload
  if (e.target.id === 'modalUploadImagem') {
    fecharModalUpload();
  }
});

// Fechar modal de opções com ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    fecharModalOpcoes();
    fecharModalUpload();
    fecharPreview();
  }
});


