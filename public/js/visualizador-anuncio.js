// Função para trocar imagem principal
function changeImage(src, element) {
  const mainImg = document.getElementById('main-img');
  mainImg.src = src;
  mainImg.style.display = 'block';
  
  // Resetar zoom ao trocar imagem
  const mainImageContainer = document.querySelector('.main-image');
  if (mainImageContainer) {
    mainImageContainer.classList.remove('zooming');
    mainImg.style.transform = '';
    mainImg.style.transformOrigin = 'center center';
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

// Função para aplicar zoom interativo na imagem principal
function inicializarZoomImagem() {
  const mainImageContainer = document.querySelector('.main-image');
  const mainImg = document.getElementById('main-img');
  
  if (!mainImageContainer || !mainImg) {
    return;
  }
  
  let isZooming = false;
  
  // Evento de mouse enter - ativar zoom
  mainImageContainer.addEventListener('mouseenter', () => {
    isZooming = true;
    mainImageContainer.classList.add('zooming');
  });
  
  // Evento de mouse leave - desativar zoom
  mainImageContainer.addEventListener('mouseleave', () => {
    isZooming = false;
    mainImageContainer.classList.remove('zooming');
    mainImg.style.transform = '';
    mainImg.style.transformOrigin = 'center center';
  });
  
  // Evento de movimento do mouse - ajustar origem do zoom
  mainImageContainer.addEventListener('mousemove', (e) => {
    if (!isZooming) return;
    
    const rect = mainImageContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calcular porcentagem da posição do mouse dentro do container
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    // Aplicar transform origin baseado na posição do mouse
    mainImg.style.transformOrigin = `${xPercent}% ${yPercent}%`;
  });
}

// Carregar dados do anúncio
async function carregarAnuncio() {
  try {
    // Obter ID da URL
    const urlParams = new URLSearchParams(window.location.search);
    const idAnuncio = urlParams.get('id');
    
    if (!idAnuncio) {
      mostrarErro('ID do anúncio não fornecido.');
      return;
    }
    
    document.getElementById('idAnuncio').value = idAnuncio;
    
    // Buscar dados do anúncio
    const response = await fetch(`/api/anuncios/${idAnuncio}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        mostrarErro('Anúncio não encontrado.');
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const anuncio = await response.json();
    
    // Atualizar título
    document.getElementById('anuncioTitulo').textContent = anuncio.titulo_anuncio || 'Sem título';
    document.getElementById('breadcrumbTitle').textContent = anuncio.titulo_anuncio || 'Anúncio';
    
    // Atualizar preço
    const preco = parseFloat(anuncio.valor || 0);
    const precoFormatado = preco.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    document.getElementById('anuncioPreco').textContent = `R$ ${precoFormatado}`;
    
    // Atualizar parcelas
    if (preco > 0) {
      const valor3x = (preco / 3).toFixed(2);
      const valor12x = (preco / 12).toFixed(2);
      document.getElementById('installments1').textContent = `ou 3x de R$ ${parseFloat(valor3x).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sem juros`;
      document.getElementById('installments2').textContent = `ou 12x de R$ ${parseFloat(valor12x).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} com juros`;
    }
    
    // Atualizar status
    const statusBadge = document.getElementById('statusBadge');
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
    
    // Atualizar informações do vendedor
    const sellerName = document.getElementById('sellerName');
    const sellerAvatar = document.getElementById('sellerAvatar');
    
    if (anuncio.vendedor_nome) {
      sellerName.textContent = anuncio.vendedor_nome;
      // Iniciais do vendedor
      const iniciais = anuncio.vendedor_nome.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      sellerAvatar.textContent = iniciais || '?';
      
      // Foto do vendedor se disponível
      const fotoVendedor = anuncio.vendedor_foto || anuncio.vendedor_foto_alt;
      if (fotoVendedor) {
        sellerAvatar.style.backgroundImage = `url(${fotoVendedor})`;
        sellerAvatar.style.backgroundSize = 'cover';
        sellerAvatar.style.backgroundPosition = 'center';
        sellerAvatar.textContent = '';
      }
    }
    
    // Atualizar detalhes
    const detailsGrid = document.getElementById('detailsGrid');
    detailsGrid.innerHTML = `
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
        <span>${formatarData(anuncio.data_criacao)}</span>
      </div>
    `;
    
    // Atualizar descrição
    document.getElementById('anuncioDescricao').textContent = anuncio.descricao_anuncio || 'Sem descrição disponível.';
    
    // Carregar imagens
    await carregarImagens(anuncio.imagens || []);
    
  } catch (err) {
    console.error('Erro ao carregar anúncio:', err);
    mostrarErro('Erro ao carregar informações do anúncio. Verifique a conexão.');
  }
}

// Carregar imagens do anúncio
async function carregarImagens(imagens) {
  const mainImg = document.getElementById('main-img');
  const thumbnailList = document.getElementById('thumbnail-list');
  const loadingDiv = document.getElementById('loading-images');
  const noImagesDiv = document.getElementById('no-images');
  
  if (!imagens || imagens.length === 0) {
    if (loadingDiv) loadingDiv.style.display = 'none';
    if (noImagesDiv) noImagesDiv.style.display = 'block';
    mainImg.style.display = 'none';
    thumbnailList.innerHTML = '';
    return;
  }
  
  // Esconder loading
  if (loadingDiv) loadingDiv.style.display = 'none';
  if (noImagesDiv) noImagesDiv.style.display = 'none';
  
  // Definir primeira imagem como principal
  const primeiraImagem = imagens[0].url_imagens;
  if (primeiraImagem) {
    mainImg.src = primeiraImagem;
    mainImg.style.display = 'block';
    mainImg.onerror = function() {
      this.style.display = 'none';
      if (noImagesDiv) noImagesDiv.style.display = 'block';
    };
  }
  
  // Criar miniaturas
  thumbnailList.innerHTML = imagens.map((img, index) => {
    const isActive = index === 0 ? 'active' : '';
    return `
      <div class="thumbnail ${isActive}" onclick="changeImage('${img.url_imagens}', this)">
        <img src="${img.url_imagens}" alt="Imagem ${index + 1}" onerror="this.parentElement.style.display='none';">
      </div>
    `;
  }).join('');
  
  // Inicializar zoom após carregar imagens
  setTimeout(() => {
    inicializarZoomImagem();
  }, 500);
}

// Formatar data
function formatarData(data) {
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
function mostrarErro(mensagem) {
  const productContainer = document.querySelector('.product-container');
  if (productContainer) {
    productContainer.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: #999;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h3 style="color: #666; margin-bottom: 8px;">Erro</h3>
        <p>${mensagem}</p>
        <button onclick="location.href='meus-anuncios.html'" style="margin-top: 20px; padding: 12px 24px; background-color: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer;">
          Voltar para Meus Anúncios
        </button>
      </div>
    `;
  }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  carregarAnuncio();
});



