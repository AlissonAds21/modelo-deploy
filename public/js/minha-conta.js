// Carregar dados do usuário logado
document.addEventListener('DOMContentLoaded', () => {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    if (!usuario) {
      alert('Você precisa estar logado para acessar sua conta.');
      location.href = 'login.html';
      return;
    }
  
    // Preencher os campos
    document.getElementById('nome').value = usuario.nome;
    document.getElementById('cpf').value = usuario.cpf;
    document.getElementById('email').value = usuario.email;
    // Senha não é exibida por segurança — deixamos em branco
  });
  
  // Habilitar edição
  function enableEdit() {
    document.querySelectorAll('#minhaContaForm input:not([type="file"])').forEach(input => {
      input.removeAttribute('readonly');
    });
    document.getElementById('fotoPerfil').removeAttribute('disabled');
  
    // Mudar o botão para "Salvar Alterações"
    const btn = document.querySelector('.btn-primary');
    btn.textContent = 'Salvar Alterações';
    btn.onclick = saveChanges;
  }
  
  // Salvar alterações (não implementado aqui — seria uma requisição PUT ao backend)
  function saveChanges() {
    alert('Funcionalidade de atualização será implementada em breve!');
    // Aqui você faria um fetch PUT para /api/atualizar-usuario
  }