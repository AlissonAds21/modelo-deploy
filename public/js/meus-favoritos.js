// Carregar favoritos do localStorage
document.addEventListener('DOMContentLoaded', () => {
    carregarFavoritos();
});

function carregarFavoritos() {
    const container = document.getElementById('favoritosContainer');
    if (!container) return;
    
    // Buscar favoritos do localStorage
    const favoritosStr = localStorage.getItem('favoritos');
    let favoritos = [];
    
    if (favoritosStr) {
        try {
            favoritos = JSON.parse(favoritosStr);
        } catch (err) {
            console.error('Erro ao ler favoritos:', err);
            favoritos = [];
        }
    }
    
    if (!favoritos || favoritos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💎</div>
                <h2>Nenhum favorito encontrado</h2>
                <p>Você ainda não favoritou nenhum produto ou serviço.</p>
                <a href="index.html" class="btn">Ver Produtos</a>
            </div>
        `;
        return;
    }
    
    // Buscar informações dos produtos favoritados
    Promise.all(favoritos.map(id => buscarProdutoInfo(id)))
        .then(produtos => {
            produtos = produtos.filter(p => p !== null);
            exibirFavoritos(produtos);
        })
        .catch(err => {
            console.error('Erro ao carregar favoritos:', err);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <h2>Erro ao carregar favoritos</h2>
                    <p>Ocorreu um erro ao carregar seus favoritos. Tente novamente mais tarde.</p>
                    <a href="index.html" class="btn">Voltar</a>
                </div>
            `;
        });
}

async function buscarProdutoInfo(id) {
    try {
        const response = await fetch(`/api/produtos/${id}`);
        if (!response.ok) {
            return null;
        }
        
        const produto = await response.json();
        
        // Buscar primeira imagem
        let imagem = null;
        try {
            const imgResponse = await fetch(`/api/produtos/${id}/imagens`);
            if (imgResponse.ok) {
                const imagens = await imgResponse.json();
                if (imagens && imagens.length > 0) {
                    imagem = imagens[0].url_imagem;
                }
            }
        } catch (imgErr) {
            console.warn('Erro ao buscar imagem:', imgErr);
        }
        
        return {
            id: produto.codigo_produto,
            produto: produto.produto || 'Produto sem nome',
            marca: produto.marca || '',
            valor_venda: produto.valor_venda || 0,
            imagem: imagem
        };
    } catch (err) {
        console.error(`Erro ao buscar produto ${id}:`, err);
        return null;
    }
}

function exibirFavoritos(produtos) {
    const container = document.getElementById('favoritosContainer');
    if (!container) return;
    
    if (!produtos || produtos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💎</div>
                <h2>Nenhum favorito encontrado</h2>
                <p>Você ainda não favoritou nenhum produto ou serviço.</p>
                <a href="index.html" class="btn">Ver Produtos</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="favoritos-grid">
            ${produtos.map(produto => `
                <div class="favorito-card" onclick="window.location.href='produto${produto.id}.html'">
                    <button class="favorito-remove" onclick="event.stopPropagation(); removerFavorito(${produto.id})" title="Remover dos favoritos">×</button>
                    ${produto.imagem ? 
                        `<img src="${produto.imagem}" alt="${produto.produto}" class="favorito-card-image" onerror="this.style.display='none'">` : 
                        `<div class="favorito-card-image" style="display: flex; align-items: center; justify-content: center; background: #f5f5f5; color: #999;">Sem imagem</div>`
                    }
                    <div class="favorito-card-info">
                        <div class="favorito-card-title">${produto.produto}</div>
                        ${produto.marca ? `<div class="favorito-card-marca">${produto.marca}</div>` : ''}
                        <div class="favorito-card-price">R$ ${parseFloat(produto.valor_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function removerFavorito(id) {
    if (!confirm('Deseja remover este item dos favoritos?')) {
        return;
    }
    
    const favoritosStr = localStorage.getItem('favoritos');
    let favoritos = [];
    
    if (favoritosStr) {
        try {
            favoritos = JSON.parse(favoritosStr);
        } catch (err) {
            console.error('Erro ao ler favoritos:', err);
        }
    }
    
    favoritos = favoritos.filter(f => f !== id);
    localStorage.setItem('favoritos', JSON.stringify(favoritos));
    
    // Recarregar favoritos
    carregarFavoritos();
    
    // Atualizar ícone no index.html se estiver aberto
    if (typeof atualizarIconeFavorito === 'function') {
        atualizarIconeFavorito(id, false);
    }
}





