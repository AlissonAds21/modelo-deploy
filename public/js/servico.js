// Carregar dados do anúncio em servico.html
async function carregarAnuncioServico() {
  try {
    // Obter ID da URL
    const urlParams = new URLSearchParams(window.location.search);
    const idAnuncio = urlParams.get('id');
    
    if (!idAnuncio) {
      mostrarErroServico('ID do anúncio não fornecido.');
      return;
    }
    
    // Buscar dados do anúncio
    const response = await fetch(`/api/anuncios/${idAnuncio}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        mostrarErroServico('Anúncio não encontrado.');
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const anuncio = await response.json();
    
    // Verificar perfil do usuário logado
    const usuarioStr = localStorage.getItem('usuario');
    let usuario = null;
    if (usuarioStr) {
      try {
        usuario = JSON.parse(usuarioStr);
      } catch (e) {
        console.warn('Erro ao parsear usuário:', e);
      }
    }
    
    const perfilUsuario = usuario ? (usuario.perfil || 2) : 2; // 1=Master, 2=Cliente, 3=Profissional
    const isCliente = perfilUsuario === 2;
    
    // Ocultar opções de edição se for cliente
    const btnEditar = document.getElementById('btnEditarAnuncio');
    
    if (isCliente) {
      if (btnEditar) btnEditar.style.display = 'none';
    } else {
      // Se for Master ou Profissional, mostrar botão de editar (funcionalidade futura)
      if (btnEditar) {
        btnEditar.style.display = 'flex';
        btnEditar.onclick = () => {
          alert('Funcionalidade de edição será implementada em breve.');
          // window.location.href = `editar-anuncio.html?id=${idAnuncio}`;
        };
      }
    }
    
    // Atualizar título
    const titleElement = document.getElementById('anuncioTitulo');
    const breadcrumbTitle = document.getElementById('breadcrumbTitle');
    if (titleElement) {
      titleElement.textContent = anuncio.titulo_anuncio || 'Sem título';
    }
    if (breadcrumbTitle) {
      breadcrumbTitle.textContent = anuncio.titulo_anuncio || 'Anúncio';
    }
    
    // Salvar ID do anúncio
    const idAnuncioInput = document.getElementById('idAnuncio');
    if (idAnuncioInput) {
      idAnuncioInput.value = idAnuncio;
    }
    
    // Atualizar preço
    const preco = parseFloat(anuncio.valor || 0);
    const precoFormatado = preco.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    
    const priceElement = document.getElementById('anuncioPreco');
    if (priceElement) {
      priceElement.textContent = `R$ ${precoFormatado}`;
    }
    
    // Atualizar parcelas
    if (preco > 0) {
      const valor3x = (preco / 3).toFixed(2);
      const valor12x = (preco / 12).toFixed(2);
      const installments1 = document.getElementById('installments1');
      const installments2 = document.getElementById('installments2');
      if (installments1) {
        installments1.textContent = `ou 3x de R$ ${parseFloat(valor3x).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sem juros`;
      }
      if (installments2) {
        installments2.textContent = `ou 12x de R$ ${parseFloat(valor12x).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} com juros`;
      }
    }
    
    // Atualizar status
    const statusBadge = document.getElementById('statusBadge');
    if (statusBadge) {
      if (anuncio.vendido) {
        statusBadge.textContent = 'VENDIDO';
        statusBadge.className = 'badge anuncio-status-badge sold';
      } else if (anuncio.ativo) {
        statusBadge.textContent = 'PUBLICADO';
        statusBadge.className = 'badge anuncio-status-badge published';
      } else {
        statusBadge.textContent = 'PAUSADO';
        statusBadge.className = 'badge anuncio-status-badge paused';
      }
    }
    
    // Atualizar informações do vendedor
    const sellerName = document.getElementById('sellerName');
    const sellerAvatar = document.getElementById('sellerAvatar');
    
    if (anuncio.vendedor_nome) {
      if (sellerName) sellerName.textContent = anuncio.vendedor_nome;
      if (sellerAvatar) {
        const iniciais = anuncio.vendedor_nome.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        sellerAvatar.textContent = iniciais || '?';
        
        const fotoVendedor = anuncio.vendedor_foto || anuncio.vendedor_foto_alt;
        if (fotoVendedor) {
          sellerAvatar.style.backgroundImage = `url(${fotoVendedor})`;
          sellerAvatar.style.backgroundSize = 'cover';
          sellerAvatar.style.backgroundPosition = 'center';
          sellerAvatar.textContent = '';
        }
      }
    }
    
    // Atualizar detalhes
    const detailsGrid = document.getElementById('detailsGrid');
    if (detailsGrid) {
      let detailsHTML = `
        <div class="detail-item">
          <strong>Tipo de Serviço</strong>
          <span>${anuncio.tipo_servico || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <strong>Especialidade</strong>
          <span>${anuncio.especialidade || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <strong>Valor</strong>
          <span>R$ ${precoFormatado}</span>
        </div>
        <div class="detail-item">
          <strong>Data de Publicação</strong>
          <span>${formatarDataServico(anuncio.data_criacao)}</span>
        </div>
      `;
      
      // Adicionar cidade apenas se o anunciante for master ou profissional
      if (anuncio.vendedor_cidade && (anuncio.vendedor_perfil === 1 || anuncio.vendedor_perfil === 3)) {
        detailsHTML += `
          <div class="detail-item">
            <strong>Cidade</strong>
            <span>${anuncio.vendedor_cidade}</span>
          </div>
        `;
      }
      
      detailsGrid.innerHTML = detailsHTML;
    }
    
    // Atualizar descrição
    const descricaoElement = document.getElementById('anuncioDescricao');
    if (descricaoElement) {
      descricaoElement.textContent = anuncio.descricao_anuncio || 'Sem descrição disponível.';
    }
    
    // Carregar imagens (usar apenas a principal)
    await carregarImagensServico(anuncio.imagens || []);
    
  } catch (err) {
    console.error('Erro ao carregar anúncio:', err);
    mostrarErroServico('Erro ao carregar informações do anúncio. Verifique a conexão.');
  }
}

// Função para trocar imagem principal (usada pelas miniaturas)
function changeImage(src, element) {
  const mainImg = document.getElementById('main-img');
  if (mainImg) {
    mainImg.src = src;
    mainImg.style.display = 'block';
    
    // Resetar zoom ao trocar imagem
    const mainImageContainer = document.querySelector('.main-image');
    if (mainImageContainer) {
      mainImageContainer.classList.remove('zooming');
      mainImg.style.transform = '';
      mainImg.style.transformOrigin = 'center center';
    }
  }
  
  // Remove active de todas as thumbnails
  document.querySelectorAll('.thumbnail').forEach(thumb => {
    thumb.classList.remove('active');
  });
  // Adiciona active na thumbnail clicada
  if (element) {
    element.classList.add('active');
  }
}

// Carregar imagens do anúncio (apenas principal)
async function carregarImagensServico(imagens) {
  const mainImg = document.getElementById('main-img');
  const thumbnailList = document.getElementById('thumbnail-list');
  const loadingDiv = document.getElementById('loading-images');
  const noImagesDiv = document.getElementById('no-images');
  
  if (!imagens || imagens.length === 0) {
    if (loadingDiv) loadingDiv.style.display = 'none';
    if (noImagesDiv) noImagesDiv.style.display = 'block';
    if (mainImg) mainImg.style.display = 'none';
    if (thumbnailList) thumbnailList.innerHTML = '';
    return;
  }
  
  // Esconder loading
  if (loadingDiv) loadingDiv.style.display = 'none';
  if (noImagesDiv) noImagesDiv.style.display = 'none';
  
  // Buscar imagem principal (is_principal = true) ou primeira imagem
  const imagemPrincipal = imagens.find(img => img.is_principal) || imagens[0];
  
  if (imagemPrincipal && imagemPrincipal.url_imagens && mainImg) {
    mainImg.src = imagemPrincipal.url_imagens;
    mainImg.style.display = 'block';
    mainImg.onerror = function() {
      this.style.display = 'none';
      if (noImagesDiv) noImagesDiv.style.display = 'block';
    };
  }
  
  // Criar miniaturas (todas as imagens)
  if (thumbnailList) {
    thumbnailList.innerHTML = imagens.map((img, index) => {
      const isActive = (img.is_principal || index === 0) ? 'active' : '';
      return `
        <div class="thumbnail ${isActive}" onclick="changeImage('${img.url_imagens}', this)">
          <img src="${img.url_imagens}" alt="Imagem ${index + 1}" onerror="this.parentElement.style.display='none';">
        </div>
      `;
    }).join('');
  }
  
  // Inicializar zoom após carregar imagens
  setTimeout(() => {
    if (typeof inicializarZoomImagem === 'function') {
      inicializarZoomImagem();
    }
  }, 500);
}

// Formatar data
function formatarDataServico(data) {
  if (!data) return 'Data não disponível';
  
  const date = new Date(data);
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const ano = date.getFullYear();
  const horas = String(date.getHours()).padStart(2, '0');
  const minutos = String(date.getMinutes()).padStart(2, '0');
  
  return `${dia}/${mes}/${ano} às ${horas}:${minutos}`;
}

// Entrar em contato
function handleContact() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  
  if (!usuario || !usuario.id) {
    if (confirm('Você precisa estar logado para entrar em contato. Deseja fazer login agora?')) {
      window.location.href = 'login.html';
    }
    return;
  }
  
  // Redirecionar para mensagens ou abrir chat
  alert('Funcionalidade de contato será implementada em breve.');
  // window.location.href = `minhas-mensagens.html?anuncio=${document.getElementById('idAnuncio').value}`;
}

// Mostrar erro
function mostrarErroServico(mensagem) {
  const productContainer = document.querySelector('.product-container');
  if (productContainer) {
    productContainer.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: #999;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h3 style="color: #666; margin-bottom: 8px;">Erro</h3>
        <p>${mensagem}</p>
        <button onclick="location.href='index.html'" style="margin-top: 20px; padding: 12px 24px; background-color: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer;">
          Voltar para Início
        </button>
      </div>
    `;
  }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  carregarAnuncioServico();
});

