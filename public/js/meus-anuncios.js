// Estado global
let anuncioSelecionado = null;
let anunciosCarregados = [];

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar perfil antes de carregar
    if (!verificarAcessoPermitido()) {
        return;
    }
    
    await carregarDadosUsuario();
    await carregarAnuncios();
});

// Verificar se o usuário tem permissão (Master ou Profissional)
function verificarAcessoPermitido() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Você precisa estar logado para acessar esta página.');
            window.location.href = 'login.html';
            return false;
        }

        const usuarioStr = localStorage.getItem('usuario');
        if (!usuarioStr) {
            alert('Sessão expirada. Faça login novamente.');
            window.location.href = 'login.html';
            return false;
        }

        const usuario = JSON.parse(usuarioStr);
        const perfilId = usuario.perfil || 2;

        // Apenas Master (1) ou Profissional (3) podem acessar
        if (perfilId !== 1 && perfilId !== 3) {
            alert('Acesso negado. Apenas usuários Master ou Profissional podem acessar esta página.');
            window.location.href = 'index.html';
            return false;
        }

        return true;
    } catch (err) {
        console.error('Erro ao verificar acesso:', err);
        alert('Erro ao verificar permissões. Redirecionando...');
        window.location.href = 'index.html';
        return false;
    }
}

// Carregar dados do usuário no header
async function carregarDadosUsuario() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const usuarioStr = localStorage.getItem('usuario');
        if (!usuarioStr) {
            window.location.href = 'login.html';
            return;
        }

        const usuario = JSON.parse(usuarioStr);
        
        // Atualizar informações do usuário no header
        document.getElementById('userName').textContent = usuario.nome || 'Usuário';
        
        // Buscar perfil
        const perfilMap = {
            1: 'Master',
            2: 'Cliente',
            3: 'Profissional'
        };
        const nomePerfil = perfilMap[usuario.perfil] || 'Cliente';
        document.getElementById('userPerfil').textContent = `Perfil ${nomePerfil}`;

        // Carregar foto de perfil
        if (usuario.fotoPerfil || usuario.fotoperfil) {
            const fotoUrl = usuario.fotoPerfil || usuario.fotoperfil;
            document.getElementById('userAvatar').src = fotoUrl;
        }

        // Buscar URL da ampulheta
        try {
            const ampulhetaUrl = await buscarUrlAmpulheta();
            if (ampulhetaUrl) {
                const statusText = document.getElementById('statusText');
                statusText.innerHTML = `<img src="${ampulhetaUrl}" alt="Ampulheta" style="width: 16px; height: 16px; margin-right: 4px;" onerror="this.style.display='none';"> Status Logado`;
            }
        } catch (err) {
            console.warn('Erro ao carregar ampulheta:', err);
        }
    } catch (err) {
        console.error('Erro ao carregar dados do usuário:', err);
    }
}

// Função auxiliar para buscar URL da ampulheta
async function buscarUrlAmpulheta() {
    const supabaseAmpulhetaUrl = 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/ampulheta.gif';
    return supabaseAmpulhetaUrl;
}

// Carregar anúncios do usuário
async function carregarAnuncios() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('Token não encontrado');
            return;
        }

        const response = await fetch('/api/meus-anuncios', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Erro ao carregar anúncios');
        }

        const data = await response.json();
        anunciosCarregados = data.anuncios || [];
        
        atualizarContadores();
        mostrarAnuncios('publicados');
    } catch (err) {
        console.error('Erro ao carregar anúncios:', err);
        mostrarErro('Erro ao carregar anúncios. Tente novamente.');
    }
}

// Atualizar contadores nas tabs
function atualizarContadores() {
    const publicados = anunciosCarregados.filter(a => a.ativo === true && a.vendido !== true).length;
    const pausados = anunciosCarregados.filter(a => a.ativo === false && a.vendido !== true).length;
    const vendidos = anunciosCarregados.filter(a => a.vendido === true).length;

    document.getElementById('countPublicados').textContent = publicados;
    document.getElementById('countPausados').textContent = pausados;
    document.getElementById('countVendidos').textContent = vendidos;
}

// Mostrar anúncios por categoria
function mostrarAnuncios(categoria) {
    const anunciosList = document.getElementById('anunciosList');
    anunciosList.innerHTML = '';

    let anunciosFiltrados = [];
    
    switch (categoria) {
        case 'publicados':
            anunciosFiltrados = anunciosCarregados.filter(a => a.ativo === true && a.vendido !== true);
            break;
        case 'pausados':
            anunciosFiltrados = anunciosCarregados.filter(a => a.ativo === false && a.vendido !== true);
            break;
        case 'vendidos':
            anunciosFiltrados = anunciosCarregados.filter(a => a.vendido === true);
            break;
    }

    if (anunciosFiltrados.length === 0) {
        anunciosList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <h3>Nenhum anúncio encontrado</h3>
                <p>Você ainda não tem anúncios nesta categoria.</p>
            </div>
        `;
        ocultarSidebar();
        return;
    }

    anunciosFiltrados.forEach(anuncio => {
        const card = criarCardAnuncio(anuncio);
        anunciosList.appendChild(card);
    });

    // Selecionar primeiro anúncio automaticamente
    if (anunciosFiltrados.length > 0) {
        selecionarAnuncio(anunciosFiltrados[0].id_anuncio);
    }
}

// Criar card de anúncio
function criarCardAnuncio(anuncio) {
    const card = document.createElement('div');
    card.className = 'anuncio-card';
    card.dataset.anuncioId = anuncio.id_anuncio;
    card.onclick = (e) => {
        // Não abrir visualizador se clicar no card inteiro, apenas na imagem ou título
        if (e.target.closest('.anuncio-image-container') || e.target.closest('.anuncio-title')) {
            abrirVisualizadorAnuncio(anuncio.id_anuncio);
        } else {
            selecionarAnuncio(anuncio.id_anuncio);
        }
    };

    // Determinar status
    let statusBadge = '';
    if (anuncio.vendido) {
        statusBadge = `
            <div class="status-badge sold">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"></path>
                </svg>
                <span>VENDIDO</span>
            </div>
        `;
    } else if (anuncio.ativo) {
        statusBadge = `
            <div class="status-badge published">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"></path>
                </svg>
                <span>PUBLICADO</span>
            </div>
        `;
    } else {
        statusBadge = `
            <div class="status-badge paused">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>PAUSADO</span>
            </div>
        `;
    }

    // Imagem do anúncio
    const imagemUrl = anuncio.imagem || anuncio.url_imagens || null;
    let imagemHTML = '';
    if (imagemUrl) {
        imagemHTML = `<img src="${imagemUrl}" alt="${anuncio.titulo_anuncio || anuncio.titulo}" onclick="event.stopPropagation(); abrirVisualizadorAnuncio(${anuncio.id_anuncio});" onerror="this.parentElement.innerHTML='<div class=\\'anuncio-image-placeholder\\'>foto principal do anuncio</div>';" style="cursor: pointer;">`;
    } else {
        imagemHTML = '<div class="anuncio-image-placeholder">foto principal do anuncio</div>';
    }

    // Formatar data
    const dataFormatada = formatarData(anuncio.created_at || anuncio.data_criacao);

    // Formatar preço
    const preco = anuncio.valor || 0;
    const precoFormatado = preco.toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });

    card.innerHTML = `
        <div class="anuncio-status">
            ${statusBadge}
        </div>
        <div class="anuncio-image-container">
            ${imagemHTML}
        </div>
        <div class="anuncio-info">
            <h3 class="anuncio-title" onclick="event.stopPropagation(); abrirVisualizadorAnuncio(${anuncio.id_anuncio});">${anuncio.titulo_anuncio || anuncio.titulo || 'Sem título'}</h3>
            <div class="anuncio-price">R$ ${precoFormatado}</div>
            <div class="anuncio-date">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>${dataFormatada}</span>
            </div>
        </div>
    `;

    return card;
}

// Abrir visualizador de anúncio
function abrirVisualizadorAnuncio(idAnuncio) {
    window.location.href = `visualizador-anuncio.html?id=${idAnuncio}`;
}

// Selecionar anúncio
function selecionarAnuncio(idAnuncio) {
    anuncioSelecionado = anunciosCarregados.find(a => a.id_anuncio === idAnuncio);
    
    if (!anuncioSelecionado) return;

    // Atualizar visual dos cards
    document.querySelectorAll('.anuncio-card').forEach(card => {
        card.style.borderColor = '#e0e0e0';
        card.style.backgroundColor = '#fff';
    });
    
    const cardSelecionado = document.querySelector(`[data-anuncio-id="${idAnuncio}"]`);
    if (cardSelecionado) {
        cardSelecionado.style.borderColor = '#8b5cf6';
        cardSelecionado.style.backgroundColor = '#f9f9ff';
    }

    // Atualizar sidebar
    atualizarSidebar();
    mostrarSidebar();
}

// Atualizar sidebar com dados do anúncio selecionado
function atualizarSidebar() {
    if (!anuncioSelecionado) {
        ocultarSidebar();
        return;
    }

    // Atualizar estatísticas
    document.getElementById('statVistas').textContent = anuncioSelecionado.vistas || 0;
    document.getElementById('statFavoritos').textContent = anuncioSelecionado.favoritos || 0;
    document.getElementById('statMensagens').textContent = anuncioSelecionado.mensagens || 0;

    // Atualizar botões de ação baseado no status
    const btnEdit = document.querySelector('.btn-edit');
    const btnPause = document.querySelector('.btn-pause');
    const btnSold = document.querySelector('.btn-sold');

    if (anuncioSelecionado.vendido) {
        btnPause.style.display = 'none';
        btnSold.style.display = 'none';
        btnEdit.textContent = 'Ver detalhes';
        btnEdit.onclick = () => abrirVisualizadorAnuncio(anuncioSelecionado.id_anuncio);
    } else if (anuncioSelecionado.ativo) {
        btnPause.style.display = 'block';
        btnPause.textContent = 'Pausar anúncio';
        btnSold.style.display = 'block';
        btnEdit.textContent = 'Editar anúncio';
        btnEdit.onclick = editarAnuncio;
    } else {
        btnPause.style.display = 'block';
        btnPause.textContent = 'Reativar anúncio';
        btnSold.style.display = 'block';
        btnEdit.textContent = 'Editar anúncio';
        btnEdit.onclick = editarAnuncio;
    }
}

// Mostrar/ocultar sidebar
function mostrarSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.style.display = 'block';
    }
}

function ocultarSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.style.display = 'none';
    }
}

// Trocar de tab
function mostrarTab(categoria) {
    // Atualizar botões de tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const tabBtn = document.getElementById(`tab${categoria.charAt(0).toUpperCase() + categoria.slice(1)}`);
    if (tabBtn) {
        tabBtn.classList.add('active');
    }

    // Mostrar anúncios da categoria
    mostrarAnuncios(categoria);
    anuncioSelecionado = null;
    ocultarSidebar();
}

// Editar anúncio
function editarAnuncio() {
    if (!anuncioSelecionado) return;
    
    // Redirecionar para página de edição (ou abrir modal)
    alert('Funcionalidade de edição será implementada em breve.');
    // window.location.href = `editar-anuncio.html?id=${anuncioSelecionado.id_anuncio}`;
}

// Pausar/Reativar anúncio
async function pausarAnuncio() {
    if (!anuncioSelecionado) return;

    const novoStatus = !anuncioSelecionado.ativo;
    const acao = novoStatus ? 'reativar' : 'pausar';

    if (!confirm(`Tem certeza que deseja ${acao} este anúncio?`)) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/anuncios/${anuncioSelecionado.id_anuncio}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ativo: novoStatus })
        });

        if (!response.ok) {
            throw new Error('Erro ao atualizar status do anúncio');
        }

        // Atualizar localmente
        anuncioSelecionado.ativo = novoStatus;
        const index = anunciosCarregados.findIndex(a => a.id_anuncio === anuncioSelecionado.id_anuncio);
        if (index !== -1) {
            anunciosCarregados[index].ativo = novoStatus;
        }

        atualizarContadores();
        mostrarAnuncios(document.querySelector('.tab-btn.active').id.replace('tab', '').toLowerCase());
        alert(`Anúncio ${novoStatus ? 'reativado' : 'pausado'} com sucesso!`);
    } catch (err) {
        console.error('Erro ao pausar anúncio:', err);
        alert('Erro ao atualizar status do anúncio. Tente novamente.');
    }
}

// Marcar como vendido
async function marcarComoVendido() {
    if (!anuncioSelecionado) return;

    if (!confirm('Tem certeza que deseja marcar este anúncio como vendido?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/anuncios/${anuncioSelecionado.id_anuncio}/vendido`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ vendido: true })
        });

        if (!response.ok) {
            throw new Error('Erro ao marcar anúncio como vendido');
        }

        // Atualizar localmente
        anuncioSelecionado.vendido = true;
        anuncioSelecionado.ativo = false;
        const index = anunciosCarregados.findIndex(a => a.id_anuncio === anuncioSelecionado.id_anuncio);
        if (index !== -1) {
            anunciosCarregados[index].vendido = true;
            anunciosCarregados[index].ativo = false;
        }

        atualizarContadores();
        mostrarAnuncios(document.querySelector('.tab-btn.active').id.replace('tab', '').toLowerCase());
        alert('Anúncio marcado como vendido com sucesso!');
    } catch (err) {
        console.error('Erro ao marcar como vendido:', err);
        alert('Erro ao marcar anúncio como vendido. Tente novamente.');
    }
}

// Toggle favorito
function toggleFavorito() {
    const btn = document.getElementById('btnFavorito');
    btn.classList.toggle('active');
    // Implementar lógica de favorito
}

// Compartilhar anúncio
function compartilharAnuncio() {
    if (!anuncioSelecionado) return;
    
    if (navigator.share) {
        navigator.share({
            title: anuncioSelecionado.titulo_anuncio || anuncioSelecionado.titulo,
            text: `Confira este anúncio: ${anuncioSelecionado.titulo_anuncio || anuncioSelecionado.titulo}`,
            url: window.location.href
        }).catch(err => console.log('Erro ao compartilhar:', err));
    } else {
        // Fallback: copiar link
        const link = window.location.href;
        navigator.clipboard.writeText(link).then(() => {
            alert('Link copiado para a área de transferência!');
        });
    }
}

// Abrir ajuda
function abrirAjuda() {
    alert('Central de ajuda será implementada em breve.');
}

// Formatar data
function formatarData(data) {
    if (!data) return 'Data não disponível';
    
    const date = new Date(data);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = String(date.getFullYear()).slice(-2);
    const horas = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');
    
    return `${dia}/${mes}/${ano} às ${horas}:${minutos}`;
}

// Mostrar erro
function mostrarErro(mensagem) {
    const anunciosList = document.getElementById('anunciosList');
    anunciosList.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <h3>Erro</h3>
            <p>${mensagem}</p>
        </div>
    `;
}



