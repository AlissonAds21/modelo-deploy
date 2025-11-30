// ============================================
// GERENCIAMENTO DE IMAGENS DE PRODUTO/SERVIÇO
// ============================================

let codigoProdutoAtual = null;

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  // Obter código do produto da página
  const codigoInput = document.getElementById('codigoProduto');
  if (codigoInput) {
    codigoProdutoAtual = codigoInput.value;
    adicionarBotaoFotos();
    verificarVisibilidadeBotaoEditar();
    // Carregar dados do produto (título, preço, etc.)
    carregarDadosProduto(codigoProdutoAtual);
    // Carregar imagens na página do produto (não no modal)
    carregarImagensNaPagina(codigoProdutoAtual);
    // Verificar se voltou da página de gerenciamento
    setTimeout(verificarRetornoGerenciamento, 500);
  }
});

// Verificar se deve mostrar o botão Editar (apenas para usuários logados que NÃO são Clientes)
function verificarVisibilidadeBotaoEditar() {
  const usuarioStr = localStorage.getItem('usuario');
  const btnEditar = document.querySelector('.btn-editar-produto');
  const btnAdicionarFotos = document.getElementById('btnAdicionarFotosProduto');
  
  if (!usuarioStr) {
    // Não logado - esconder tudo
    if (btnEditar) btnEditar.style.display = 'none';
    if (btnAdicionarFotos) btnAdicionarFotos.style.display = 'none';
    return;
  }
  
  try {
    const usuario = JSON.parse(usuarioStr);
    const perfilId = usuario.perfil || 2; // 1=Master, 2=Cliente, 3=Profissional
    
    // Cliente (perfil 2) não pode editar
    if (perfilId === 2) {
      if (btnEditar) btnEditar.style.display = 'none';
      if (btnAdicionarFotos) btnAdicionarFotos.style.display = 'none';
    } else {
      // Master ou Profissional podem editar
      if (btnEditar) btnEditar.style.display = 'inline-flex';
      if (btnAdicionarFotos) btnAdicionarFotos.style.display = 'block';
    }
  } catch (err) {
    console.error('Erro ao verificar perfil:', err);
    // Em caso de erro, esconder por segurança
    if (btnEditar) btnEditar.style.display = 'none';
    if (btnAdicionarFotos) btnAdicionarFotos.style.display = 'none';
  }
}

// Carregar informações do produto e atualizar página
async function carregarDadosProduto(codigo) {
  try {
    const response = await fetch(`/api/produtos/${codigo}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const produto = await response.json();
    
    // Atualizar título
    const titleElement = document.querySelector('.product-title');
    if (titleElement && produto.produto) {
      titleElement.textContent = produto.produto + (produto.marca ? ` - ${produto.marca}` : '');
    }
    
    // Atualizar preço
    const priceElement = document.querySelector('.price');
    if (priceElement && produto.valor_venda) {
      priceElement.textContent = `R$ ${parseFloat(produto.valor_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    // Atualizar parcelas
    if (produto.valor_venda) {
      const installments = document.querySelectorAll('.installments');
      if (installments.length >= 1) {
        const valor3x = (produto.valor_venda / 3).toFixed(2);
        installments[0].textContent = `ou 3x de R$ ${parseFloat(valor3x).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sem juros`;
      }
      if (installments.length >= 2) {
        const valor12x = (produto.valor_venda / 12).toFixed(2);
        installments[1].textContent = `ou 12x de R$ ${parseFloat(valor12x).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} com juros`;
      }
    }
    
    // Atualizar todos os detalhes do produto
    atualizarDetalhesProdutoNaPagina(produto);
    
    // Atualizar descrição completa
    if (produto.descricao_completa) {
      const descricaoElement = document.querySelector('.product-description div');
      if (descricaoElement) {
        descricaoElement.textContent = produto.descricao_completa;
      }
    }
    
  } catch (err) {
    console.error('Erro ao carregar dados do produto:', err);
  }
}

// Função para atualizar os detalhes do produto na página
function atualizarDetalhesProdutoNaPagina(produto) {
  const detailItems = document.querySelectorAll('.details-grid .detail-item');
  
  detailItems.forEach((item) => {
    const strong = item.querySelector('strong');
    if (!strong) return;
    
    const label = strong.textContent.trim();
    const span = item.querySelector('span');
    if (!span) return;
    
    // Mapear labels para campos do produto
    if (label === 'Marca' && produto.marca) {
      span.textContent = produto.marca;
    } else if (label === 'Modelo' && produto.modelo) {
      span.textContent = produto.modelo;
    } else if (label === 'Capacidade' && produto.capacidade) {
      span.textContent = produto.capacidade;
    } else if (label === 'Tensão' && produto.tensao) {
      span.textContent = produto.tensao;
    } else if (label === 'Tecnologia' && produto.tecnologia) {
      span.textContent = produto.tecnologia;
    } else if (label === 'Cor' && produto.cor) {
      span.textContent = produto.cor;
    } else if (label === 'Garantia' && produto.garantia) {
      span.textContent = produto.garantia;
    } else if (label === 'Condição' && produto.condicao) {
      span.textContent = produto.condicao;
    }
  });
}

// Carregar e exibir imagens do produto na página principal
async function carregarImagensNaPagina(codigo) {
  const mainImg = document.getElementById('main-img');
  const thumbnailList = document.getElementById('thumbnail-list');
  const loadingDiv = document.getElementById('loading-images');
  const noImagesDiv = document.getElementById('no-images');
  
  if (!mainImg || !thumbnailList) {
    console.warn('Elementos de imagem não encontrados na página');
    return;
  }
  
  try {
    const response = await fetch(`/api/produtos/${codigo}/imagens`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const imagens = await response.json();
    
    // Esconder loading
    if (loadingDiv) loadingDiv.style.display = 'none';
    
    if (!imagens || imagens.length === 0) {
      // Não há imagens - mostrar placeholder
      if (noImagesDiv) {
        noImagesDiv.style.display = 'block';
      }
      mainImg.style.display = 'none';
      thumbnailList.innerHTML = '';
      return;
    }
    
    // Esconder "sem imagens"
    if (noImagesDiv) noImagesDiv.style.display = 'none';
    
    // Ordenar imagens por ordem
    imagens.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    
    // Definir primeira imagem como principal
    const primeiraImagem = imagens[0];
    mainImg.src = primeiraImagem.url_imagem;
    mainImg.alt = primeiraImagem.descricao || 'Imagem principal do produto';
    mainImg.style.display = 'block';
    mainImg.onerror = function() {
      this.onerror = null;
      this.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22%3E%3Crect fill=%22%23ddd%22 width=%22400%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3EImagem não disponível%3C/text%3E%3C/svg%3E';
    };
    
    // Reinicializar zoom quando a imagem carregar
    mainImg.onload = function() {
      if (typeof inicializarZoomImagem === 'function') {
        inicializarZoomImagem();
      }
    };
    
    // Criar miniaturas
    thumbnailList.innerHTML = imagens.map((img, index) => {
      const isActive = index === 0 ? 'active' : '';
      return `
        <div class="thumbnail ${isActive}" onclick="changeImage('${img.url_imagem}', this)">
          <img src="${img.url_imagem}" 
               alt="${img.descricao || `Miniatura ${index + 1}`}"
               onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22150%22%3E%3Crect fill=%22%23ddd%22 width=%22150%22 height=%22150%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3EErro%3C/text%3E%3C/svg%3E';">
        </div>
      `;
    }).join('');
    
  } catch (err) {
    console.error('Erro ao carregar imagens na página:', err);
    
    // Esconder loading
    if (loadingDiv) loadingDiv.style.display = 'none';
    
    // Mostrar mensagem de erro ou usar imagem padrão
    if (noImagesDiv) {
      noImagesDiv.innerHTML = '<p>Erro ao carregar imagens</p>';
      noImagesDiv.style.display = 'block';
    }
    mainImg.style.display = 'none';
    thumbnailList.innerHTML = '';
  }
}

// Adicionar botão "Adicionar Fotos" na seção de imagens
function adicionarBotaoFotos() {
  const productImages = document.querySelector('.product-images');
  if (!productImages) return;
  
  // Verificar se o botão já existe
  if (document.getElementById('btnAdicionarFotosProduto')) return;
  
  // Criar botão
  const btnContainer = document.createElement('div');
  btnContainer.style.cssText = 'margin-top: 15px; text-align: center;';
  
  const btn = document.createElement('button');
  btn.id = 'btnAdicionarFotosProduto';
  btn.className = 'btn-secondary';
  btn.innerHTML = '📷 Adicionar/Editar Fotos';
  btn.style.cssText = 'padding: 10px 20px; font-size: 14px; cursor: pointer;';
  btn.onclick = () => {
    verificarLoginERedirecionar();
  };
  
  btnContainer.appendChild(btn);
  productImages.appendChild(btnContainer);
}

// Verificar login e redirecionar para página de gerenciamento
function verificarLoginERedirecionar() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  
  if (!usuario) {
    if (confirm('Você precisa estar logado para gerenciar fotos. Deseja fazer login agora?')) {
      window.location.href = 'login.html';
    }
    return;
  }
  
  // Obter código do produto
  const codigoInput = document.getElementById('codigoProduto');
  const codigo = codigoInput ? codigoInput.value : null;
  
  if (!codigo) {
    alert('Código do produto não encontrado.');
    return;
  }
  
  // Salvar código no localStorage para recarregar após voltar
  localStorage.setItem('produtoCodigoParaImagens', codigo);
  
  // Redirecionar para página de gerenciamento
  window.location.href = `addserviços.html?codigo=${codigo}`;
}

// Verificar se voltou da página de gerenciamento e recarregar imagens
function verificarRetornoGerenciamento() {
  const codigoSalvo = localStorage.getItem('produtoCodigoParaImagens');
  const codigoAtual = document.getElementById('codigoProduto')?.value;
  
  if (codigoSalvo && codigoAtual && codigoSalvo === codigoAtual) {
    // Limpar flag
    localStorage.removeItem('produtoCodigoParaImagens');
    // Recarregar imagens
    if (codigoProdutoAtual) {
      carregarImagensNaPagina(codigoProdutoAtual);
    }
  }
}

// Função mantida para compatibilidade (agora redireciona)
function verificarLoginEAbrirModal() {
  verificarLoginERedirecionar();
}

// Abrir modal de imagens
function abrirModalImagensProduto() {
  const codigo = codigoProdutoAtual || document.getElementById('codigoProduto')?.value;
  
  if (!codigo) {
    alert('Código do produto não encontrado.');
    return;
  }
  
  // Criar ou mostrar modal
  let modal = document.getElementById('modalImagensProduto');
  if (!modal) {
    criarModalImagens();
    modal = document.getElementById('modalImagensProduto');
  }
  
  document.getElementById('imagemProdutoCodigo').value = codigo;
  modal.style.display = 'block';
  carregarImagensProduto(codigo);
}

// Criar modal de imagens
function criarModalImagens() {
  const modal = document.createElement('div');
  modal.id = 'modalImagensProduto';
  modal.className = 'modal';
  modal.style.cssText = 'display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.5);';
  
  modal.innerHTML = `
    <div class="modal-content" style="background-color: #fefefe; margin: 5% auto; padding: 20px; border: 1px solid #888; width: 90%; max-width: 800px; border-radius: 8px;">
      <span class="close" onclick="fecharModalImagensProduto()" style="color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer;">&times;</span>
      <h2>📷 Gerenciar Fotos do Produto/Serviço</h2>
      <div id="imagensListProduto" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; max-height: 400px; overflow-y: auto;">
        <p>Carregando imagens...</p>
      </div>
      <div style="border-top: 1px solid #ddd; padding-top: 20px;">
        <h3>Adicionar Nova Foto</h3>
        <form id="formUploadImagemProduto" enctype="multipart/form-data">
          <input type="hidden" id="imagemProdutoCodigo">
          <div style="margin-bottom: 15px;">
            <label>Selecionar Imagem *</label>
            <input type="file" id="imagemFileProduto" accept="image/*" required style="width: 100%; padding: 8px; margin-top: 5px;">
            <small style="color: #666;">Formatos: JPG, PNG, GIF (máx. 5MB)</small>
          </div>
          <div style="margin-bottom: 15px;">
            <label>Ordem de Exibição</label>
            <input type="number" id="imagemOrdemProduto" min="0" value="0" style="width: 100%; padding: 8px; margin-top: 5px;">
            <small style="color: #666;">0 = primeira imagem</small>
          </div>
          <div style="margin-bottom: 15px;">
            <label>Descrição (opcional)</label>
            <textarea id="imagemDescricaoProduto" rows="2" style="width: 100%; padding: 8px; margin-top: 5px;"></textarea>
          </div>
          <div style="text-align: right;">
            <button type="button" onclick="fecharModalImagensProduto()" style="padding: 10px 20px; margin-right: 10px; cursor: pointer;">Fechar</button>
            <button type="submit" class="btn-primary" style="padding: 10px 20px; cursor: pointer;">Upload</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event listener para upload
  document.getElementById('formUploadImagemProduto').addEventListener('submit', async (e) => {
    e.preventDefault();
    await fazerUploadImagem();
  });
  
  // Fechar ao clicar fora
  modal.onclick = (e) => {
    if (e.target === modal) {
      fecharModalImagensProduto();
    }
  };
}

// Fechar modal
function fecharModalImagensProduto() {
  const modal = document.getElementById('modalImagensProduto');
  if (modal) {
    modal.style.display = 'none';
    document.getElementById('formUploadImagemProduto').reset();
    document.getElementById('imagemOrdemProduto').value = 0;
  }
}

// Carregar imagens do produto
async function carregarImagensProduto(codigo) {
  try {
    const response = await fetch(`/api/produtos/${codigo}/imagens`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const imagens = await response.json();
    const container = document.getElementById('imagensListProduto');
    
    if (!container) return;
    
    if (!imagens || imagens.length === 0) {
      container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #666;">Nenhuma imagem cadastrada. Adicione a primeira foto acima.</p>';
      return;
    }
    
    container.innerHTML = imagens.map(img => `
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 10px; background: #f9f9f9;">
        <img src="${img.url_imagem}" 
             alt="${img.descricao || 'Imagem'}" 
             style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px; margin-bottom: 10px;"
             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22150%22%3E%3Crect fill=%22%23ddd%22 width=%22150%22 height=%22150%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3EErro%3C/text%3E%3C/svg%3E';">
        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Ordem: ${img.ordem || 0}</div>
        ${img.descricao ? `<div style="font-size: 11px; color: #999; margin-bottom: 10px;">${img.descricao.substring(0, 30)}${img.descricao.length > 30 ? '...' : ''}</div>` : ''}
        <button onclick="deletarImagemProduto(${img.id_imagem})" style="width: 100%; padding: 5px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
          🗑️ Remover
        </button>
      </div>
    `).join('');
  } catch (err) {
    console.error('Erro ao carregar imagens:', err);
    const container = document.getElementById('imagensListProduto');
    if (container) {
      container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #d00;">Erro ao carregar imagens.</p>';
    }
  }
}

// Deletar imagem
async function deletarImagemProduto(idImagem) {
  if (!confirm('Deseja realmente remover esta imagem?')) return;
  
  const codigo = codigoProdutoAtual || document.getElementById('imagemProdutoCodigo')?.value;
  
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
      // Recarregar imagens na página principal também
      location.reload();
    } else {
      alert('Erro: ' + result.error);
    }
  } catch (err) {
    console.error('Erro ao deletar imagem:', err);
    alert('Erro ao remover imagem.');
  }
}

// Upload de imagem
async function fazerUploadImagem() {
  const codigo = document.getElementById('imagemProdutoCodigo').value;
  const fileInput = document.getElementById('imagemFileProduto');
  const ordem = document.getElementById('imagemOrdemProduto').value || 0;
  const descricao = document.getElementById('imagemDescricaoProduto').value;
  
  if (!fileInput.files || fileInput.files.length === 0) {
    alert('Por favor, selecione uma imagem.');
    return;
  }
  
  if (!codigo) {
    alert('Código do produto não encontrado.');
    return;
  }
  
  const formData = new FormData();
  formData.append('imagem', fileInput.files[0]);
  formData.append('ordem', ordem);
  formData.append('descricao', descricao);
  
  try {
    const response = await fetch(`/api/produtos/${codigo}/imagens`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert(result.message);
      document.getElementById('formUploadImagemProduto').reset();
      document.getElementById('imagemOrdemProduto').value = 0;
      carregarImagensProduto(codigo);
      // Recarregar página para mostrar nova imagem
      setTimeout(() => location.reload(), 1000);
    } else {
      alert('Erro: ' + result.error);
    }
  } catch (err) {
    console.error('Erro ao fazer upload:', err);
    alert('Erro ao fazer upload da imagem.');
  }
}

