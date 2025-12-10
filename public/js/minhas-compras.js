// Carregar histórico de compras do cliente
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const usuarioStr = localStorage.getItem('usuario');
    
    if (!token || !usuarioStr) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const usuario = JSON.parse(usuarioStr);
        const usuarioId = usuario.id;
        
        const response = await fetch(`/api/compras/${usuarioId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao buscar compras');
        }
        
        const compras = await response.json();
        exibirCompras(compras);
    } catch (err) {
        console.error('Erro ao carregar compras:', err);
        const container = document.getElementById('comprasContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🛒</div>
                    <h2>Nenhuma compra encontrada</h2>
                    <p>Você ainda não realizou nenhuma compra.</p>
                    <a href="index.html" class="btn">Ver Produtos</a>
                </div>
            `;
        }
    }
});

function exibirCompras(compras) {
    const container = document.getElementById('comprasContainer');
    if (!container) return;
    
    if (!compras || compras.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🛒</div>
                <h2>Nenhuma compra encontrada</h2>
                <p>Você ainda não realizou nenhuma compra.</p>
                <a href="index.html" class="btn">Ver Produtos</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="compras-list">
            ${compras.map(compra => `
                <div class="compra-item">
                    <div class="compra-header">
                        <div class="compra-id">Compra #${compra.id_pedido || compra.id}</div>
                        <div class="compra-data">${formatarData(compra.data_venda || compra.created_at)}</div>
                    </div>
                    <div class="compra-produtos">
                        ${compra.produtos ? compra.produtos.map(produto => `
                            <div class="produto-compra">
                                ${produto.imagem ? `<img src="${produto.imagem}" alt="${produto.produto}" onerror="this.style.display='none'">` : ''}
                                <div class="produto-compra-info">
                                    <div class="produto-compra-nome">${produto.produto || 'Produto'}</div>
                                    <div class="produto-compra-detalhes">
                                        Quantidade: ${produto.quantidade || 1} | 
                                        Valor unitário: R$ ${parseFloat(produto.valor_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div class="produto-compra-valor">
                                    R$ ${parseFloat(produto.valor_total || produto.valor_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        `).join('') : ''}
                    </div>
                    <div class="compra-total">
                        <div class="compra-total-label">Total:</div>
                        <div class="compra-total-valor">R$ ${parseFloat(compra.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function formatarData(data) {
    if (!data) return 'Data não disponível';
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}




