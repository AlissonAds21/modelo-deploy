// Carregar dados do usuário do banco de dados (não do localStorage)
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Você precisa estar logado para acessar sua conta.');
        location.href = 'login.html';
        return;
    }
    
    // Buscar ID do usuário do token ou localStorage
    const usuarioLocal = JSON.parse(localStorage.getItem('usuario') || '{}');
    const userId = usuarioLocal.id;
    
    if (!userId) {
        alert('Erro ao identificar usuário. Faça login novamente.');
        location.href = 'login.html';
        return;
    }
    
    // Buscar dados atualizados do banco
    try {
        const response = await fetch(`/api/usuarios/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                alert('Sessão expirada. Faça login novamente.');
                localStorage.clear();
                location.href = 'login.html';
                return;
            }
            throw new Error('Erro ao buscar dados do usuário');
        }
        
        const usuario = await response.json();
        
        // Preencher os campos com dados do banco
        document.getElementById('nome').value = usuario.nome || '';
        document.getElementById('cpf').value = usuario.cpf || '';
        document.getElementById('email').value = usuario.email || '';
        // Senha não é exibida por segurança — deixamos em branco
        
        // Exibir foto de perfil se existir
        const fotoPerfilImg = document.getElementById('fotoPerfilPreview');
        if (usuario.fotoperfil) {
            fotoPerfilImg.src = usuario.fotoperfil;
            fotoPerfilImg.classList.add('visible');
        } else {
            // Avatar padrão se não tiver foto
            fotoPerfilImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgMjF2LTJhNCA0IDAgMCAwLTQtNEg4YTQgNCAwIDAgMC00IDR2MiIgc3Ryb2tlPSIjOTk5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iNyIgcj0iNCIgc3Ryb2tlPSIjOTk5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==';
            fotoPerfilImg.classList.add('visible');
        }
        
        // Atualizar localStorage com dados atualizados
        localStorage.setItem('usuario', JSON.stringify({
            ...usuarioLocal,
            nome: usuario.nome,
            cpf: usuario.cpf,
            email: usuario.email,
            fotoPerfil: usuario.fotoperfil
        }));
        
    } catch (err) {
        console.error('Erro ao carregar dados:', err);
        alert('Erro ao carregar dados do usuário. Tente novamente.');
    }
});

// Habilitar edição
function enableEdit() {
    document.querySelectorAll('#minhaContaForm input:not([type="file"])').forEach(input => {
        input.removeAttribute('readonly');
    });
    
    // Habilitar botão de alterar foto
    const btnAlterarFoto = document.getElementById('btnAlterarFoto');
    if (btnAlterarFoto) {
        btnAlterarFoto.style.display = 'block';
    }
    
    // Mudar o botão para "Salvar Alterações"
    const btn = document.querySelector('.btn-primary');
    btn.textContent = 'Salvar Alterações';
    btn.onclick = saveChanges;
}

// Salvar alterações
async function saveChanges() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Sessão expirada. Faça login novamente.');
        location.href = 'login.html';
        return;
    }
    
    const usuarioLocal = JSON.parse(localStorage.getItem('usuario') || '{}');
    const userId = usuarioLocal.id;
    
    if (!userId) {
        alert('Erro ao identificar usuário.');
        return;
    }
    
    // Coletar dados do formulário
    const nome = document.getElementById('nome').value.trim();
    const cpf = document.getElementById('cpf').value.trim();
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;
    
    // Validações
    if (!nome || !cpf || !email) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    if (senha && senha !== confirmarSenha) {
        alert('As senhas não coincidem!');
        document.getElementById('confirmarSenha').focus();
        return;
    }
    
    // Preparar FormData para enviar foto se houver
    const formData = new FormData();
    formData.append('nome', nome);
    formData.append('cpf', cpf);
    formData.append('email', email);
    if (senha) {
        formData.append('senha', senha);
    }
    
    const fotoInput = document.getElementById('fotoPerfil');
    if (fotoInput && fotoInput.files && fotoInput.files.length > 0) {
        formData.append('fotoPerfil', fotoInput.files[0]);
    }
    
    try {
        const response = await fetch(`/api/usuarios/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            alert('Erro: ' + (result.error || 'Erro ao atualizar dados.'));
            return;
        }
        
        alert(result.message || 'Dados atualizados com sucesso!');
        
        // Atualizar foto na tela se foi enviada
        if (result.usuario && result.usuario.fotoperfil) {
            const fotoPerfilImg = document.getElementById('fotoPerfilPreview');
            fotoPerfilImg.src = result.usuario.fotoperfil;
            fotoPerfilImg.classList.add('visible');
        }
        
        // Atualizar localStorage
        localStorage.setItem('usuario', JSON.stringify({
            ...usuarioLocal,
            nome: result.usuario.nome,
            cpf: result.usuario.cpf,
            email: result.usuario.email,
            fotoPerfil: result.usuario.fotoperfil
        }));
        
        // Desabilitar edição novamente
        document.querySelectorAll('#minhaContaForm input:not([type="file"])').forEach(input => {
            input.setAttribute('readonly', 'readonly');
        });
        
        // Limpar campos de senha
        document.getElementById('senha').value = '';
        document.getElementById('confirmarSenha').value = '';
        
        // Limpar seleção de foto
        const fotoInput = document.getElementById('fotoPerfil');
        if (fotoInput) {
            fotoInput.value = ''; // Limpar seleção
        }
        
        // Ocultar botão de alterar foto
        const btnAlterarFoto = document.getElementById('btnAlterarFoto');
        if (btnAlterarFoto) {
            btnAlterarFoto.style.display = 'none';
        }
        
        // Restaurar botão
        const btn = document.querySelector('.btn-primary');
        btn.textContent = 'Atualizar Cadastro';
        btn.onclick = enableEdit;
        
    } catch (err) {
        console.error('Erro ao salvar:', err);
        alert('Erro de conexão com o servidor.');
    }
}

// Event listener para o botão "Alterar Foto"
document.addEventListener('DOMContentLoaded', () => {
    const btnAlterarFoto = document.getElementById('btnAlterarFoto');
    const fotoInput = document.getElementById('fotoPerfil');
    
    if (btnAlterarFoto && fotoInput) {
        btnAlterarFoto.addEventListener('click', () => {
            fotoInput.click();
        });
        
        fotoInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const fotoPerfilImg = document.getElementById('fotoPerfilPreview');
                    fotoPerfilImg.src = event.target.result;
                    fotoPerfilImg.classList.add('visible');
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }
});
