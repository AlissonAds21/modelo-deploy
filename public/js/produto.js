// Função para trocar imagem principal
function changeImage(src, element) {
  const mainImg = document.getElementById('main-img');
  mainImg.src = src;
  
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
  element.classList.add('active');
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

// Inicializar zoom quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  // Aguardar um pouco para garantir que a imagem foi carregada
  setTimeout(() => {
    inicializarZoomImagem();
  }, 500);
  
  // Também inicializar quando a imagem for trocada
  const mainImg = document.getElementById('main-img');
  if (mainImg) {
    mainImg.addEventListener('load', () => {
      inicializarZoomImagem();
    });
  }
});

// Variável global para armazenar o pagamento selecionado
let selectedPayment = null;


// Função para abrir modal de pagamento
function handlePurchase() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  
  if (!usuario) {
    if (confirm('Você precisa estar logado para realizar a compra. Deseja fazer login agora?')) {
      window.location.href = 'login.html';
    }
    return;
  }
  
  // Calcular preços com desconto
  const priceText = document.querySelector('.price').textContent;
  const priceMatch = priceText.match(/R\$\s*([\d.,]+)/);
  const basePrice = parseFloat(priceMatch ? priceMatch[1].replace(/\./g, '').replace(',', '.') : 0);
  
  // Atualizar preços no modal
  document.getElementById('pricePix').textContent = `R$ ${(basePrice * 0.95).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('priceBoleto').textContent = `R$ ${(basePrice * 0.97).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('priceCartao').textContent = `12x de R$ ${(basePrice / 12).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('priceDebito').textContent = `R$ ${(basePrice * 0.98).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  // Resetar seleção
  selectedPayment = null;
  document.querySelectorAll('.payment-card-modal').forEach(card => {
    card.classList.remove('selected');
  });
  document.getElementById('btnConfirmarPagamento').disabled = true;
  
  // Abrir modal
  document.getElementById('paymentModal').style.display = 'block';
}

// Função para selecionar pagamento no modal
function selectPaymentModal(element, type) {
  // Remove selected de todos os cards
  document.querySelectorAll('.payment-card-modal').forEach(card => {
    card.classList.remove('selected');
  });
  
  // Adiciona selected no card clicado
  element.classList.add('selected');
  selectedPayment = type;
  
  // Habilita botão de confirmar
  document.getElementById('btnConfirmarPagamento').disabled = false;
}

// Função para fechar modal
function fecharModalPagamento() {
  document.getElementById('paymentModal').style.display = 'none';
  selectedPayment = null;
  document.querySelectorAll('.payment-card-modal').forEach(card => {
    card.classList.remove('selected');
  });
  document.getElementById('btnConfirmarPagamento').disabled = true;
}

// Função para confirmar pagamento
async function confirmarPagamento() {
  if (!selectedPayment) {
    alert('Por favor, selecione uma forma de pagamento.');
    return;
  }
  
  // Obter código do produto
  const codigoProdutoInput = document.getElementById('codigoProduto');
  if (!codigoProdutoInput) {
    alert('Erro: Código do produto não encontrado.');
    return;
  }
  
  const codigoProduto = parseInt(codigoProdutoInput.value);
  const quantidade = 1; // Quantidade padrão (pode ser ajustado)
  
  // Obter preço base
  const priceText = document.querySelector('.price').textContent;
  const priceMatch = priceText.match(/R\$\s*([\d.,]+)/);
  const basePrice = parseFloat(priceMatch ? priceMatch[1].replace(/\./g, '').replace(',', '.') : 0);
  
  // Calcular valor final com desconto
  let valorFinal = basePrice;
  if (selectedPayment === 'pix') {
    valorFinal = basePrice * 0.95; // 5% desconto
  } else if (selectedPayment === 'boleto') {
    valorFinal = basePrice * 0.97; // 3% desconto
  } else if (selectedPayment === 'debito') {
    valorFinal = basePrice * 0.98; // 2% desconto
  }
  
  // Confirmar compra
  const confirmar = confirm(
    `Confirmar compra?\n\n` +
    `Produto: ${document.querySelector('.product-title').textContent}\n` +
    `Quantidade: ${quantidade}\n` +
    `Forma de pagamento: ${selectedPayment.toUpperCase()}\n` +
    `Valor: R$ ${valorFinal.toFixed(2).replace('.', ',')}`
  );
  
  if (!confirmar) {
    return;
  }
  
  try {
    // Buscar informações do produto primeiro
    const produtoResponse = await fetch(`/api/produtos/${codigoProduto}`);
    
    if (!produtoResponse.ok) {
      let errorMsg = 'Produto não encontrado';
      try {
        const errorData = await produtoResponse.json();
        errorMsg = errorData.error || errorMsg;
      } catch (e) {
        // Se não conseguir parsear JSON, usar mensagem padrão
        if (produtoResponse.status === 404) {
          errorMsg = 'Produto não encontrado. Verifique o código do produto.';
        } else {
          errorMsg = `Erro ao buscar produto (${produtoResponse.status})`;
        }
      }
      throw new Error(errorMsg);
    }
    
    const produto = await produtoResponse.json();
    
    // Verificar estoque
    if (produto.estoque_atual < quantidade) {
      alert(`❌ Estoque insuficiente!\n\nDisponível: ${produto.estoque_atual}\nSolicitado: ${quantidade}`);
      return;
    }
    
    // Realizar venda (id_vendedor = 5 é o vendedor padrão)
    const vendaResponse = await fetch('/api/vendas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigo_produto: codigoProduto,
        quantidade: quantidade,
        id_vendedor: 5 // Vendedor padrão
      })
    });
    
    if (!vendaResponse.ok) {
      let errorMsg = 'Erro ao processar venda';
      try {
        const errorData = await vendaResponse.json();
        errorMsg = errorData.error || errorMsg;
      } catch (e) {
        errorMsg = `Erro ao processar venda (${vendaResponse.status})`;
      }
      throw new Error(errorMsg);
    }
    
    const vendaResult = await vendaResponse.json();
    
    if (vendaResponse.ok) {
      // Sucesso! Mostrar informações do pagamento
      let mensagemPagamento = '';
      
      if (selectedPayment === 'pix') {
        mensagemPagamento = 
          `✅ Compra realizada com sucesso!\n\n` +
          `📱 PIX\n` +
          `Valor: R$ ${valorFinal.toFixed(2).replace('.', ',')}\n\n` +
          `Chave PIX: contato@seusite.com.br\n` +
          `(ou use o QR Code que será gerado)\n\n` +
          `O pagamento será confirmado automaticamente após a transferência.`;
      } else if (selectedPayment === 'boleto') {
        mensagemPagamento = 
          `✅ Compra realizada com sucesso!\n\n` +
          `📄 Boleto Bancário\n` +
          `Valor: R$ ${valorFinal.toFixed(2).replace('.', ',')}\n\n` +
          `O boleto será gerado e enviado para seu e-mail.\n` +
          `Vencimento: 3 dias úteis.`;
      } else if (selectedPayment === 'cartao') {
        mensagemPagamento = 
          `✅ Compra realizada com sucesso!\n\n` +
          `💳 Cartão de Crédito\n` +
          `Valor: R$ ${basePrice.toFixed(2).replace('.', ',')}\n` +
          `Parcelamento: 12x de R$ ${(basePrice / 12).toFixed(2).replace('.', ',')}\n\n` +
          `Você será redirecionado para o pagamento.`;
      } else if (selectedPayment === 'debito') {
        mensagemPagamento = 
          `✅ Compra realizada com sucesso!\n\n` +
          `🏦 Cartão de Débito\n` +
          `Valor: R$ ${valorFinal.toFixed(2).replace('.', ',')}\n\n` +
          `Você será redirecionado para o pagamento.`;
      }
      
      alert(mensagemPagamento);
      
      // Fechar modal
      fecharModalPagamento();
      
      // Opcional: redirecionar para página de confirmação
      // window.location.href = 'confirmacao.html';
      
    } else {
      throw new Error(vendaResult.error || 'Erro ao realizar venda');
    }
    
  } catch (err) {
    console.error('Erro na compra:', err);
    let errorMessage = err.message || 'Erro desconhecido';
    
    // Mensagens mais amigáveis
    if (errorMessage.includes('404') || errorMessage.includes('não encontrado')) {
      errorMessage = 'Produto não encontrado no banco de dados.\n\nVerifique se o produto está cadastrado e ativo.';
    } else if (errorMessage.includes('500') || errorMessage.includes('interno')) {
      errorMessage = 'Erro interno do servidor.\n\nVerifique se o servidor está rodando e se o banco de dados está conectado.';
    }
    
    alert(`❌ Erro ao processar compra:\n\n${errorMessage}\n\nTente novamente ou entre em contato com o suporte.`);
    
    // Reabilitar botão se existir
    const btnConfirmar = document.getElementById('btnConfirmarPagamento');
    if (btnConfirmar) {
      btnConfirmar.disabled = false;
    }
  }
}

// Função para lidar com o chat
function handleChat() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  
  if (!usuario) {
    if (confirm('Você precisa estar logado para falar com o vendedor. Deseja fazer login agora?')) {
      window.location.href = 'login.html';
    }
    return;
  }
  
  alert('Abrindo conversa com o vendedor...\n\nEm breve você poderá conversar diretamente com o vendedor.');
  // Aqui você pode implementar a integração com sistema de chat
}

// Fechar modal ao clicar fora dele
window.onclick = function(event) {
  const modal = document.getElementById('paymentModal');
  if (event.target == modal) {
    fecharModalPagamento();
  }
  
  const modalEditar = document.getElementById('modalEditarProduto');
  if (event.target == modalEditar) {
    fecharModalEditarProduto();
  }
}

// ============================================
// EDIÇÃO DE PRODUTO/SERVIÇO
// ============================================

// Abrir modal de edição
async function abrirModalEditarProduto() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  
  if (!usuario) {
    if (confirm('Você precisa estar logado para editar o produto. Deseja fazer login agora?')) {
      window.location.href = 'login.html';
    }
    return;
  }
  
  const codigoInput = document.getElementById('codigoProduto');
  const codigo = codigoInput ? codigoInput.value : null;
  
  if (!codigo) {
    alert('Código do produto não encontrado.');
    return;
  }
  
  try {
    // Buscar dados do produto
    const response = await fetch(`/api/produtos/${codigo}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const produto = await response.json();
    
    // Preencher formulário - Campos básicos
    document.getElementById('editarProdutoCodigo').value = produto.codigo_produto;
    document.getElementById('editarProdutoNome').value = produto.produto || '';
    document.getElementById('editarProdutoMarca').value = produto.marca || '';
    document.getElementById('editarProdutoValorCompra').value = produto.valor_compra || 0;
    document.getElementById('editarProdutoValorVenda').value = produto.valor_venda || 0;
    
    // Preencher campos de detalhes (se existirem no banco)
    document.getElementById('editarProdutoModelo').value = produto.modelo || '';
    document.getElementById('editarProdutoCapacidade').value = produto.capacidade || '';
    document.getElementById('editarProdutoTensao').value = produto.tensao || '';
    document.getElementById('editarProdutoTecnologia').value = produto.tecnologia || '';
    document.getElementById('editarProdutoCor').value = produto.cor || '';
    document.getElementById('editarProdutoGarantia').value = produto.garantia || '';
    document.getElementById('editarProdutoCondicao').value = produto.condicao || '';
    
    // Descrição completa (priorizar banco, senão usar da página)
    const descricaoBanco = produto.descricao_completa || '';
    const descricaoPagina = document.querySelector('.product-description div')?.textContent || '';
    document.getElementById('editarProdutoDescricao').value = descricaoBanco.trim() || descricaoPagina.trim();
    
    // Abrir modal
    document.getElementById('modalEditarProduto').style.display = 'block';
  } catch (err) {
    console.error('Erro ao carregar produto:', err);
    alert('Erro ao carregar informações do produto. Verifique a conexão.');
  }
}

// Fechar modal de edição
function fecharModalEditarProduto() {
  document.getElementById('modalEditarProduto').style.display = 'none';
  document.getElementById('formEditarProduto').reset();
}

// Salvar edição do produto
async function salvarEdicaoProduto() {
  const codigo = document.getElementById('editarProdutoCodigo').value;
  const produto = document.getElementById('editarProdutoNome').value;
  const marca = document.getElementById('editarProdutoMarca').value;
  const valorCompra = parseFloat(document.getElementById('editarProdutoValorCompra').value) || 0;
  const valorVenda = parseFloat(document.getElementById('editarProdutoValorVenda').value) || 0;
  const modelo = document.getElementById('editarProdutoModelo').value;
  const capacidade = document.getElementById('editarProdutoCapacidade').value;
  const tensao = document.getElementById('editarProdutoTensao').value;
  const tecnologia = document.getElementById('editarProdutoTecnologia').value;
  const cor = document.getElementById('editarProdutoCor').value;
  const garantia = document.getElementById('editarProdutoGarantia').value;
  const condicao = document.getElementById('editarProdutoCondicao').value;
  const descricao = document.getElementById('editarProdutoDescricao').value;
  
  if (!produto.trim()) {
    alert('Por favor, preencha o nome do produto.');
    return;
  }
  
  if (valorVenda <= 0) {
    alert('Por favor, informe um valor de venda válido.');
    return;
  }
  
  try {
    // Atualizar produto via API com todos os campos
    const response = await fetch(`/api/produtos/${codigo}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        produto,
        marca,
        valor_compra: valorCompra,
        valor_venda: valorVenda,
        modelo: modelo || null,
        capacidade: capacidade || null,
        tensao: tensao || null,
        tecnologia: tecnologia || null,
        cor: cor || null,
        garantia: garantia || null,
        condicao: condicao || null,
        descricao_completa: descricao || null
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      // Atualizar informações na página
      const titleElement = document.querySelector('.product-title');
      if (titleElement) {
        titleElement.textContent = produto + (marca ? ` - ${marca}` : '');
      }
      
      // Atualizar preço
      const priceElement = document.querySelector('.price');
      if (priceElement) {
        priceElement.textContent = `R$ ${valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      
      // Atualizar parcelas (3x sem juros)
      const installments3x = document.querySelectorAll('.installments')[0];
      if (installments3x) {
        const valor3x = (valorVenda / 3).toFixed(2);
        installments3x.textContent = `ou 3x de R$ ${parseFloat(valor3x).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sem juros`;
      }
      
      // Atualizar parcelas (12x com juros)
      const installments12x = document.querySelectorAll('.installments')[1];
      if (installments12x) {
        const valor12x = (valorVenda / 12).toFixed(2);
        installments12x.textContent = `ou 12x de R$ ${parseFloat(valor12x).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} com juros`;
      }
      
      // Atualizar detalhes do produto
      atualizarDetalhesProduto({
        marca,
        modelo,
        capacidade,
        tensao,
        tecnologia,
        cor,
        garantia,
        condicao
      });
      
      // Atualizar descrição
      const descricaoElement = document.querySelector('.product-description div');
      if (descricaoElement && descricao) {
        descricaoElement.textContent = descricao;
      }
      
      alert('✅ Produto atualizado com sucesso!');
      fecharModalEditarProduto();
      
      // Recarregar página após 1 segundo para garantir sincronização
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      alert('Erro: ' + (result.error || 'Erro ao atualizar produto'));
    }
  } catch (err) {
    console.error('Erro ao salvar edição:', err);
    alert('Erro ao salvar alterações. Verifique a conexão.');
  }
}

// Função para atualizar os detalhes do produto na página
function atualizarDetalhesProduto(detalhes) {
  const detailItems = document.querySelectorAll('.details-grid .detail-item');
  
  detailItems.forEach((item, index) => {
    const strong = item.querySelector('strong');
    if (!strong) return;
    
    const label = strong.textContent.trim();
    const span = item.querySelector('span');
    if (!span) return;
    
    // Mapear labels para campos
    if (label === 'Marca' && detalhes.marca) {
      span.textContent = detalhes.marca;
    } else if (label === 'Modelo' && detalhes.modelo) {
      span.textContent = detalhes.modelo;
    } else if (label === 'Capacidade' && detalhes.capacidade) {
      span.textContent = detalhes.capacidade;
    } else if (label === 'Tensão' && detalhes.tensao) {
      span.textContent = detalhes.tensao;
    } else if (label === 'Tecnologia' && detalhes.tecnologia) {
      span.textContent = detalhes.tecnologia;
    } else if (label === 'Cor' && detalhes.cor) {
      span.textContent = detalhes.cor;
    } else if (label === 'Garantia' && detalhes.garantia) {
      span.textContent = detalhes.garantia;
    } else if (label === 'Condição' && detalhes.condicao) {
      span.textContent = detalhes.condicao;
    }
  });
}

