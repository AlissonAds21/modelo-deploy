// Armazenamento temporário dos dados do anúncio (usando sessionStorage)
function obterDadosAnuncio() {
    const dadosStr = sessionStorage.getItem('dadosAnuncio');
    if (dadosStr) {
        try {
            const dados = JSON.parse(dadosStr);
            // Converter fotos de base64 para File objects se necessário
            return dados;
        } catch (err) {
            console.warn('Erro ao ler dados do sessionStorage:', err);
        }
    }
    return {
        tipoServico: null,
        opcaoSelecionada: null,
        valor: null,
        titulo: null,
        descricao: null,
        fotos: []
    };
}

function salvarDadosAnuncio(dados) {
    try {
        // Salvar apenas dados não-binários no sessionStorage
        const dadosParaSalvar = {
            tipoServico: dados.tipoServico,
            opcaoSelecionada: dados.opcaoSelecionada,
            valor: dados.valor,
            titulo: dados.titulo,
            descricao: dados.descricao,
            // Fotos serão mantidas em memória (não salvar no sessionStorage)
            fotos: dados.fotos ? dados.fotos.map(f => f ? 'file' : null) : []
        };
        sessionStorage.setItem('dadosAnuncio', JSON.stringify(dadosParaSalvar));
    } catch (err) {
        console.warn('Erro ao salvar dados no sessionStorage:', err);
    }
}

function limparDadosAnuncio() {
    sessionStorage.removeItem('dadosAnuncio');
}

// Armazenamento temporário dos dados do anúncio (em memória)
let dadosAnuncio = obterDadosAnuncio();

// Histórico de navegação
let historicoTelas = ['screen1'];

// URLs diretas das imagens (fallback caso a API falhe)
const IMAGENS_DIRETAS = {
    'assentamento': 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/servico-1-1764532062863-2-porcelanato-3.PNG',
    'pintura-paredes': 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/Pintuda%20de%20Paredes.PNG',
    'pintura-portoes': 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/Pintuda%20de%20Portoes.PNG',
    'acabamentos': 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/Instalacao%20de%20Sanca.PNG'
};

// Verificar permissão de acesso (apenas Profissional e Master)
function verificarAcessoAnuncio() {
    const token = localStorage.getItem('token');
    const usuarioStr = localStorage.getItem('usuario');
    
    if (!token || !usuarioStr) {
        alert('Você precisa estar logado para acessar esta página.');
        window.location.href = 'login.html';
        return false;
    }
    
    try {
        const usuario = JSON.parse(usuarioStr);
        const perfilId = usuario.perfil || 2; // 1=Master, 2=Cliente, 3=Profissional
        
        // Apenas Profissional (3) e Master (1) podem acessar
        if (perfilId !== 1 && perfilId !== 3) {
            alert('Acesso negado. Apenas usuários Profissional ou Master podem anunciar serviços.\n\nComo Cliente, você pode visualizar e comprar serviços na página principal.');
            window.location.href = 'index.html';
            return false;
        }
        
        return true;
    } catch (err) {
        console.error('Erro ao verificar perfil:', err);
        alert('Erro ao verificar permissões. Redirecionando para página principal.');
        window.location.href = 'index.html';
        return false;
    }
}

// Sistema de dicas de preenchimento
const DICAS_CAMPOS = {
    'metro-quadrado-assentamento': {
        titulo: 'Valor do m²',
        conteudo: 'Digite apenas o valor numérico do metro quadrado. Exemplo: 30,00 ou 30. Não é necessário incluir "m²" ou "R$" no campo.'
    },
    'metro-quadrado-paredes': {
        titulo: 'Valor do m²',
        conteudo: 'Digite apenas o valor numérico do metro quadrado. Exemplo: 20,00 ou 20. Não é necessário incluir "m²" ou "R$" no campo.'
    },
    'metro-quadrado-portoes': {
        titulo: 'Valor do m²',
        conteudo: 'Digite apenas o valor numérico do metro quadrado. Exemplo: 40,00 ou 40. Não é necessário incluir "m²" ou "R$" no campo.'
    },
    'metro-quadrado-acabamentos': {
        titulo: 'Valor do m²',
        conteudo: 'Digite apenas o valor numérico do metro quadrado. Exemplo: 40,00 ou 40. Não é necessário incluir "m²" ou "R$" no campo.'
    },
    'titulo-assentamento': {
        titulo: 'Título do Anúncio',
        conteudo: 'Crie um título atrativo e claro. Exemplos: "Assentamento de Porcelanato Premium", "Instalação de Pisos Cerâmicos", "Revestimento de Alta Qualidade". Seja específico e use palavras-chave relevantes.'
    },
    'titulo-paredes': {
        titulo: 'Título do Anúncio',
        conteudo: 'Crie um título atrativo e claro. Exemplos: "Pintura de Paredes Internas", "Pintura Externa Residencial", "Serviço de Pintura Profissional". Seja específico e use palavras-chave relevantes.'
    },
    'titulo-portoes': {
        titulo: 'Título do Anúncio',
        conteudo: 'Crie um título atrativo e claro. Exemplos: "Pintura de Portões de Ferro", "Pintura de Portas de Madeira", "Restauração e Pintura de Portões". Seja específico e use palavras-chave relevantes.'
    },
    'titulo-acabamentos': {
        titulo: 'Título do Anúncio',
        conteudo: 'Crie um título atrativo e claro. Exemplos: "Instalação de Papel de Parede", "Aplicação de Molduras de Gesso", "Instalação de Rodapés". Seja específico e use palavras-chave relevantes.'
    },
    'descricao-assentamento': {
        titulo: 'Descrição do Serviço',
        conteudo: 'Descreva detalhadamente o serviço oferecido. Inclua: tipo de material usado, experiência do profissional, garantia oferecida, tempo de execução, e qualquer informação relevante que possa atrair clientes.'
    },
    'descricao-paredes': {
        titulo: 'Descrição do Serviço',
        conteudo: 'Descreva detalhadamente o serviço oferecido. Inclua: tipo de tinta usada, preparação da superfície, número de demãos, experiência do profissional, garantia oferecida, e tempo de execução.'
    },
    'descricao-portoes': {
        titulo: 'Descrição do Serviço',
        conteudo: 'Descreva detalhadamente o serviço oferecido. Inclua: tipo de tinta/verniz usado, preparação da superfície, proteção contra ferrugem (para ferro), experiência do profissional, garantia oferecida, e tempo de execução.'
    },
    'descricao-acabamentos': {
        titulo: 'Descrição do Serviço',
        conteudo: 'Descreva detalhadamente o serviço oferecido. Inclua: tipo de material usado, técnica de aplicação, experiência do profissional, garantia oferecida, tempo de execução, e cuidados especiais necessários.'
    }
};

// Verificar se dica foi fechada pelo usuário
function dicaFechada(campoId) {
    const dicasFechadas = JSON.parse(localStorage.getItem('dicasFechadas') || '[]');
    return dicasFechadas.includes(campoId);
}

// Marcar dica como fechada
function fecharDica(campoId) {
    const dicasFechadas = JSON.parse(localStorage.getItem('dicasFechadas') || '[]');
    if (!dicasFechadas.includes(campoId)) {
        dicasFechadas.push(campoId);
        localStorage.setItem('dicasFechadas', JSON.stringify(dicasFechadas));
    }
    // Esconder a dica
    const hint = document.getElementById(`hint-${campoId}`);
    if (hint) {
        hint.classList.remove('show');
    }
}

// Criar elemento de dica
function criarDica(campoId) {
    const dica = DICAS_CAMPOS[campoId];
    if (!dica) return null;
    
    // Verificar se já foi fechada
    if (dicaFechada(campoId)) return null;
    
    const hintDiv = document.createElement('div');
    hintDiv.id = `hint-${campoId}`;
    hintDiv.className = 'field-hint';
    hintDiv.innerHTML = `
        <div class="field-hint-header">
            <div class="field-hint-title">${dica.titulo}</div>
            <button class="field-hint-close" onclick="fecharDica('${campoId}')" aria-label="Fechar dica">×</button>
        </div>
        <div class="field-hint-content">${dica.conteudo}</div>
    `;
    
    return hintDiv;
}

// Inicializar sistema de dicas
function inicializarDicas() {
    // Adicionar dicas para todos os campos
    Object.keys(DICAS_CAMPOS).forEach(campoId => {
        const campo = document.getElementById(campoId);
        if (!campo) return;
        
        // Criar container de dica
        const hint = criarDica(campoId);
        if (!hint) return;
        
        // Adicionar dica ao form-group
        const formGroup = campo.closest('.form-group');
        if (formGroup) {
            formGroup.appendChild(hint);
        }
        
        // Mostrar dica ao focar no campo
        campo.addEventListener('focus', () => {
            if (!dicaFechada(campoId)) {
                hint.classList.add('show');
            }
        });
        
        // Esconder dica ao sair do campo (após um pequeno delay)
        campo.addEventListener('blur', () => {
            setTimeout(() => {
                // Só esconder se não estiver com mouse sobre a dica
                if (!hint.matches(':hover')) {
                    hint.classList.remove('show');
                }
            }, 200);
        });
        
        // Manter dica visível quando mouse estiver sobre ela
        hint.addEventListener('mouseenter', () => {
            hint.classList.add('show');
        });
        
        hint.addEventListener('mouseleave', () => {
            hint.classList.remove('show');
        });
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Verificar acesso ANTES de carregar qualquer coisa
    if (!verificarAcessoAnuncio()) {
        return; // Bloquear se não tiver permissão
    }
    
    // Carregar imagens imediatamente usando URLs diretas
    carregarImagensDiretas();
    // Tentar buscar da API depois
    carregarImagensServicos();
    inicializarTela1();
    inicializarOpcoes();
    inicializarFotos();
    inicializarDicas();
});

// Carregar imagens diretamente (fallback imediato)
function carregarImagensDiretas() {
    const tipos = ['assentamento', 'pintura-paredes', 'pintura-portoes', 'acabamentos'];
    const ids = ['img-assentamento', 'img-pintura-paredes', 'img-pintura-portoes', 'img-acabamentos'];
    
    tipos.forEach((tipo, index) => {
        const img = document.getElementById(ids[index]);
        if (img && IMAGENS_DIRETAS[tipo]) {
            img.src = IMAGENS_DIRETAS[tipo];
            console.log(`🖼️ Carregando imagem direta de ${tipo}:`, IMAGENS_DIRETAS[tipo]);
        }
    });
}

// Carregar imagens dos serviços do banco de dados
async function carregarImagensServicos() {
    try {
        console.log('🖼️ Carregando imagens dos serviços...');
        
        // URLs diretas fornecidas pelo usuário (usar diretamente se a API falhar)
        const imagensDiretas = {
            'assentamento': 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/servico-1-1764532062863-2-porcelanato-3.PNG',
            'pintura-paredes': 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/Pintuda%20de%20Paredes.PNG',
            'pintura-portoes': 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/Pintuda%20de%20Portoes.PNG',
            'acabamentos': 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/Instalacao%20de%20Sanca.PNG'
        };
        
        let imagens = imagensDiretas; // Usar URLs diretas como padrão
        
        // Tentar buscar da API
        try {
            const response = await fetch('/api/imagens/servicos');
            if (response.ok) {
                const imagensApi = await response.json();
                console.log('📦 Imagens recebidas da API:', imagensApi);
                imagens = imagensApi;
            } else {
                console.warn('⚠️ API retornou erro, usando URLs diretas');
            }
        } catch (apiErr) {
            console.warn('⚠️ Erro ao buscar da API, usando URLs diretas:', apiErr.message);
        }
        
        // Atualizar imagens dos cards usando IDs específicos
        const tipos = ['assentamento', 'pintura-paredes', 'pintura-portoes', 'acabamentos'];
        const ids = ['img-assentamento', 'img-pintura-paredes', 'img-pintura-portoes', 'img-acabamentos'];
        const placeholders = ['🏗️', '🎨', '🚪', '✨'];
        
        tipos.forEach((tipo, index) => {
            const img = document.getElementById(ids[index]);
            if (img && imagens[tipo]) {
                console.log(`🖼️ Carregando imagem de ${tipo}:`, imagens[tipo]);
                img.src = imagens[tipo];
                img.onerror = function() {
                    console.error(`❌ Erro ao carregar imagem de ${tipo}:`, imagens[tipo]);
                    this.style.display = 'none';
                    this.parentElement.innerHTML = `<div class="placeholder-img">${placeholders[index]}</div>`;
                };
                img.onload = function() {
                    console.log(`✅ Imagem de ${tipo} carregada com sucesso`);
                };
            } else if (!img) {
                console.warn(`⚠️ Elemento ${ids[index]} não encontrado`);
            }
        });
        
        console.log('✅ Processo de carregamento de imagens concluído');
    } catch (err) {
        console.error('❌ Erro ao carregar imagens dos serviços:', err);
        // Usar URLs diretas em caso de erro
        const imagensDiretas = {
            'assentamento': 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/servico-1-1764532062863-2-porcelanato-3.PNG',
            'pintura-paredes': 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/Pintuda%20de%20Paredes.PNG',
            'pintura-portoes': 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/Pintuda%20de%20Portoes.PNG',
            'acabamentos': 'https://afszgngtfbdodwznanuo.supabase.co/storage/v1/object/public/uploads/Instalacao%20de%20Sanca.PNG'
        };
        
        const tipos = ['assentamento', 'pintura-paredes', 'pintura-portoes', 'acabamentos'];
        const ids = ['img-assentamento', 'img-pintura-paredes', 'img-pintura-portoes', 'img-acabamentos'];
        
        tipos.forEach((tipo, index) => {
            const img = document.getElementById(ids[index]);
            if (img && imagensDiretas[tipo]) {
                img.src = imagensDiretas[tipo];
            }
        });
    }
}

// Inicializar Tela 1 - Seleção de tipo de serviço
function inicializarTela1() {
    const servicoCards = document.querySelectorAll('.servico-card');
    servicoCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remover seleção anterior
            servicoCards.forEach(c => c.classList.remove('selected'));
            // Selecionar card clicado
            card.classList.add('selected');
            dadosAnuncio.tipoServico = card.dataset.tipo;
            
            // Adicionar botão "PRÓXIMO" se não existir
            const buttonsContainer = card.closest('.anuncio-screen').querySelector('.anuncio-buttons');
            if (buttonsContainer && !buttonsContainer.querySelector('.btn-proximo')) {
                const btnProximo = document.createElement('button');
                btnProximo.className = 'btn-proximo';
                btnProximo.innerHTML = 'PRÓXIMO <span>→</span>';
                btnProximo.onclick = () => avancarTela(dadosAnuncio.tipoServico);
                buttonsContainer.insertBefore(btnProximo, buttonsContainer.firstChild);
            }
        });
    });
}

// Inicializar opções selecionáveis
function inicializarOpcoes() {
    const opcoesBtns = document.querySelectorAll('.opcao-btn');
    opcoesBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remover seleção do grupo
            const grupo = btn.closest('.opcoes-grid');
            grupo.querySelectorAll('.opcao-btn').forEach(b => b.classList.remove('selected'));
            // Selecionar opção clicada
            btn.classList.add('selected');
            dadosAnuncio.opcaoSelecionada = btn.dataset.opcao;
            salvarDadosAnuncio(dadosAnuncio);
        });
    });
}

// Inicializar grid de fotos
function inicializarFotos() {
    const fotosGrid = document.getElementById('fotosGrid');
    if (!fotosGrid) return;
    
    fotosGrid.innerHTML = '';
    
    for (let i = 0; i < 8; i++) {
        const slot = document.createElement('div');
        slot.className = 'foto-slot';
        slot.innerHTML = `
            <div class="upload-icon">↑</div>
            <input type="file" accept="image/*" onchange="handleFotoUpload(event, ${i})" />
            <button class="remove-btn" onclick="removerFoto(${i})" title="Remover foto">×</button>
        `;
        slot.addEventListener('click', (e) => {
            if (!slot.classList.contains('has-image') && e.target !== slot.querySelector('.remove-btn')) {
                slot.querySelector('input[type="file"]').click();
            }
        });
        fotosGrid.appendChild(slot);
    }
}

// Manipular upload de foto (função global)
window.handleFotoUpload = function(event, index) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas imagens.');
        return;
    }
    
    // Verificar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('A imagem é muito grande. Tamanho máximo: 5MB.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const slot = event.target.closest('.foto-slot');
        slot.classList.add('has-image');
        slot.innerHTML = `
            <img src="${e.target.result}" alt="Foto ${index + 1}" />
            <button class="remove-btn" onclick="removerFoto(${index})" title="Remover foto">×</button>
        `;
        
        // Armazenar arquivo
        dadosAnuncio.fotos[index] = file;
    };
    reader.readAsDataURL(file);
};

// Remover foto (função global)
window.removerFoto = function(index) {
    const fotosGrid = document.getElementById('fotosGrid');
    if (!fotosGrid || !fotosGrid.children[index]) return;
    
    const slot = fotosGrid.children[index];
    slot.classList.remove('has-image');
    slot.innerHTML = `
        <div class="upload-icon">↑</div>
        <input type="file" accept="image/*" onchange="handleFotoUpload(event, ${index})" />
        <button class="remove-btn" onclick="removerFoto(${index})" title="Remover foto">×</button>
    `;
    slot.addEventListener('click', (e) => {
        if (!slot.classList.contains('has-image') && e.target !== slot.querySelector('.remove-btn')) {
            slot.querySelector('input[type="file"]').click();
        }
    });
    dadosAnuncio.fotos[index] = null;
};

// Avançar para próxima tela
function avancarTela(tipo) {
    // Salvar dados da tela atual
    salvarDadosTelaAtual();
    
    // Ocultar tela atual
    const telaAtual = document.querySelector('.anuncio-screen:not([style*="display: none"])');
    if (telaAtual) {
        telaAtual.style.display = 'none';
        historicoTelas.push(telaAtual.id);
    }
    
    // Se estiver na tela 1 (seleção de tipo), ir para a tela específica do serviço
    // Se já estiver em uma tela de serviço específica, ir para a tela de fotos
    let proximaTela;
    if (telaAtual && telaAtual.id === 'screen1') {
        // Está na tela 1, ir para a tela do serviço selecionado
        proximaTela = document.getElementById(`screen-${tipo}`);
    } else {
        // Já está em uma tela de serviço, ir para a tela de fotos
        proximaTela = document.getElementById('screen-fotos');
    }
    
    if (proximaTela) {
        proximaTela.style.display = 'block';
        // Carregar dados salvos se houver
        carregarDadosTela(proximaTela.id);
    } else {
        console.error('Tela não encontrada:', proximaTela);
        alert('Erro ao navegar. Tente novamente.');
    }
}

// Voltar para tela anterior
function voltarTela(tipoAtual) {
    // Salvar dados da tela atual
    salvarDadosTelaAtual();
    
    // Ocultar tela atual
    const telaAtual = document.querySelector('.anuncio-screen:not([style*="display: none"])');
    if (telaAtual) {
        telaAtual.style.display = 'none';
    }
    
    // Mostrar tela anterior
    if (historicoTelas.length > 1) {
        historicoTelas.pop(); // Remover tela atual do histórico
        const telaAnteriorId = historicoTelas[historicoTelas.length - 1];
        const telaAnterior = document.getElementById(telaAnteriorId);
        if (telaAnterior) {
            telaAnterior.style.display = 'block';
            carregarDadosTela(telaAnteriorId);
        }
    } else {
        // Se não houver histórico, voltar para tela 1
        document.getElementById('screen1').style.display = 'block';
    }
}

// Salvar dados da tela atual
function salvarDadosTelaAtual() {
    const telaAtual = document.querySelector('.anuncio-screen:not([style*="display: none"])');
    if (!telaAtual) return;
    
    const telaId = telaAtual.id;
    
    if (telaId === 'screen1') {
        // Dados já salvos no click do card
        salvarDadosAnuncio(dadosAnuncio);
        return;
    }
    
    // Salvar opção selecionada
    const opcaoSelecionada = telaAtual.querySelector('.opcao-btn.selected');
    if (opcaoSelecionada) {
        dadosAnuncio.opcaoSelecionada = opcaoSelecionada.dataset.opcao;
    }
    
    // Salvar campos de texto baseado no tipo de tela
    if (telaId.includes('assentamento')) {
        dadosAnuncio.valor = document.getElementById('metro-quadrado-assentamento')?.value || null;
        dadosAnuncio.titulo = document.getElementById('titulo-assentamento')?.value || null;
        dadosAnuncio.descricao = document.getElementById('descricao-assentamento')?.value || null;
    } else if (telaId.includes('pintura-paredes')) {
        dadosAnuncio.valor = document.getElementById('metro-quadrado-paredes')?.value || null;
        dadosAnuncio.titulo = document.getElementById('titulo-paredes')?.value || null;
        dadosAnuncio.descricao = document.getElementById('descricao-paredes')?.value || null;
    } else if (telaId.includes('pintura-portoes')) {
        dadosAnuncio.valor = document.getElementById('metro-quadrado-portoes')?.value || null;
        dadosAnuncio.titulo = document.getElementById('titulo-portoes')?.value || null;
        dadosAnuncio.descricao = document.getElementById('descricao-portoes')?.value || null;
    } else if (telaId.includes('acabamentos')) {
        dadosAnuncio.valor = document.getElementById('metro-quadrado-acabamentos')?.value || null;
        dadosAnuncio.titulo = document.getElementById('titulo-acabamentos')?.value || null;
        dadosAnuncio.descricao = document.getElementById('descricao-acabamentos')?.value || null;
    }
    
    // Salvar no sessionStorage
    salvarDadosAnuncio(dadosAnuncio);
}

// Carregar dados na tela
function carregarDadosTela(telaId) {
    if (telaId === 'screen1') {
        // Restaurar seleção do card
        if (dadosAnuncio.tipoServico) {
            const card = document.querySelector(`[data-tipo="${dadosAnuncio.tipoServico}"]`);
            if (card) {
                document.querySelectorAll('.servico-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            }
        }
        return;
    }
    
    // Restaurar opção selecionada
    if (dadosAnuncio.opcaoSelecionada) {
        const opcaoBtn = document.querySelector(`[data-opcao="${dadosAnuncio.opcaoSelecionada}"]`);
        if (opcaoBtn) {
            opcaoBtn.closest('.opcoes-grid')?.querySelectorAll('.opcao-btn').forEach(b => b.classList.remove('selected'));
            opcaoBtn.classList.add('selected');
        }
    }
    
    // Restaurar campos de texto
    if (telaId.includes('assentamento')) {
        if (dadosAnuncio.metroQuadrado) document.getElementById('metro-quadrado-assentamento').value = dadosAnuncio.metroQuadrado;
        if (dadosAnuncio.titulo) document.getElementById('titulo-assentamento').value = dadosAnuncio.titulo;
        if (dadosAnuncio.descricao) document.getElementById('descricao-assentamento').value = dadosAnuncio.descricao;
    } else if (telaId.includes('pintura-paredes')) {
        if (dadosAnuncio.metroQuadrado) document.getElementById('metro-quadrado-paredes').value = dadosAnuncio.metroQuadrado;
        if (dadosAnuncio.titulo) document.getElementById('titulo-paredes').value = dadosAnuncio.titulo;
        if (dadosAnuncio.descricao) document.getElementById('descricao-paredes').value = dadosAnuncio.descricao;
    } else if (telaId.includes('pintura-portoes')) {
        if (dadosAnuncio.metroQuadrado) document.getElementById('metro-quadrado-portoes').value = dadosAnuncio.metroQuadrado;
        if (dadosAnuncio.titulo) document.getElementById('titulo-portoes').value = dadosAnuncio.titulo;
        if (dadosAnuncio.descricao) document.getElementById('descricao-portoes').value = dadosAnuncio.descricao;
    } else if (telaId.includes('acabamentos')) {
        if (dadosAnuncio.metroQuadrado) document.getElementById('metro-quadrado-acabamentos').value = dadosAnuncio.metroQuadrado;
        if (dadosAnuncio.titulo) document.getElementById('titulo-acabamentos').value = dadosAnuncio.titulo;
        if (dadosAnuncio.descricao) document.getElementById('descricao-acabamentos').value = dadosAnuncio.descricao;
    }
}

// Salvar anúncio completo
async function salvarAnuncio() {
    // Salvar dados da tela atual
    salvarDadosTelaAtual();
    
    // Validações
    if (!dadosAnuncio.tipoServico) {
        alert('Por favor, selecione um tipo de serviço.');
        voltarTela('fotos');
        return;
    }
    
    if (!dadosAnuncio.opcaoSelecionada) {
        alert('Por favor, selecione uma opção de serviço.');
        voltarTela('fotos');
        return;
    }
    
    if (!dadosAnuncio.titulo || dadosAnuncio.titulo.trim() === '') {
        alert('Por favor, preencha o título do anúncio.');
        voltarTela('fotos');
        return;
    }
    
    if (!dadosAnuncio.descricao || dadosAnuncio.descricao.trim() === '') {
        alert('Por favor, preencha a descrição do anúncio.');
        voltarTela('fotos');
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Você precisa estar logado para criar um anúncio.');
        window.location.href = 'login.html';
        return;
    }
    
    // Preparar dados conforme estrutura das tabelas
    const tipoServicoMap = {
        'assentamento': 'Assentamento de Pisos, Revestimentos e Porcelanatos',
        'pintura-paredes': 'Pintura de Paredes',
        'pintura-portoes': 'Pintura de Portões',
        'acabamentos': 'Acabamentos Específicos'
    };
    
    const formData = new FormData();
    formData.append('tipo_servico', tipoServicoMap[dadosAnuncio.tipoServico]);
    formData.append('especialidade', dadosAnuncio.opcaoSelecionada);
    formData.append('valor', extrairValor(dadosAnuncio.valor));
    formData.append('titulo_anuncio', dadosAnuncio.titulo.trim());
    formData.append('descricao_anuncio', dadosAnuncio.descricao.trim());
    
    // Adicionar fotos (File objects)
    dadosAnuncio.fotos.forEach((foto, index) => {
        if (foto && foto instanceof File) {
            formData.append('fotos', foto);
        }
    });
    
    try {
        const response = await fetch('/api/servicos', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Anúncio criado com sucesso!');
            // Limpar dados temporários
            limparDadosAnuncio();
            dadosAnuncio = {
                tipoServico: null,
                opcaoSelecionada: null,
                valor: null,
                titulo: null,
                descricao: null,
                fotos: []
            };
            historicoTelas = ['screen1'];
            // Redirecionar para index
            window.location.href = 'index.html';
        } else {
            alert('Erro: ' + (result.error || 'Erro ao criar anúncio.'));
        }
    } catch (err) {
        console.error('Erro ao salvar anúncio:', err);
        alert('Erro de conexão com o servidor.');
    }
}

// Extrair valor numérico do campo (apenas o valor do m²)
function extrairValor(texto) {
    if (!texto) return 0;
    
    // Remover espaços e converter vírgula para ponto
    texto = texto.toString().trim().replace(/\s/g, '');
    
    // Tentar extrair número (pode ter vírgula ou ponto como separador decimal)
    // Aceita formatos: "50", "50.00", "50,00", "R$50", "R$50.00", "R$50,00"
    const numeroLimpo = texto.replace(/[^\d.,]/g, '').replace(',', '.');
    const valor = parseFloat(numeroLimpo);
    
    return isNaN(valor) ? 0 : valor;
}

// Tornar função fecharDica global para uso no onclick
window.fecharDica = fecharDica;

