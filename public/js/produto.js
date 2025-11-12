// Função para trocar imagem principal
function changeImage(src, element) {
  document.getElementById('main-img').src = src;
  // Remove active de todas as thumbnails
  document.querySelectorAll('.thumbnail').forEach(thumb => {
    thumb.classList.remove('active');
  });
  // Adiciona active na thumbnail clicada
  element.classList.add('active');
}

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
}

