// Sistema de Autocomplete para campos de texto
// Armazena e sugere valores anteriores do usuário

class AutocompleteManager {
    constructor() {
        this.storageKeys = {
            'email': 'autocomplete_emails',
            'cpf': 'autocomplete_cpfs',
            'nome': 'autocomplete_nomes',
            'email-cpf': 'autocomplete_email_cpf' // Para login que aceita ambos
        };
    }

    // Obter valores salvos para um tipo de campo
    getSavedValues(fieldType) {
        const key = this.storageKeys[fieldType] || `autocomplete_${fieldType}`;
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : [];
    }

    // Salvar novo valor
    saveValue(fieldType, value) {
        if (!value || value.trim() === '') return;
        
        const key = this.storageKeys[fieldType] || `autocomplete_${fieldType}`;
        const saved = this.getSavedValues(fieldType);
        
        // Adicionar se não existir e limitar a 10 itens
        const valueTrimmed = value.trim();
        if (!saved.includes(valueTrimmed)) {
            saved.unshift(valueTrimmed); // Adicionar no início
            if (saved.length > 10) {
                saved.pop(); // Remover o mais antigo se passar de 10
            }
            localStorage.setItem(key, JSON.stringify(saved));
        }
    }

    // Criar dropdown de sugestões
    createDropdown(input, suggestions) {
        // Remover dropdown existente
        const existing = input.parentElement.querySelector('.autocomplete-dropdown');
        if (existing) {
            existing.remove();
        }

        if (suggestions.length === 0) return null;

        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = suggestion;
            item.addEventListener('click', () => {
                input.value = suggestion;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                this.hideDropdown(input);
            });
            dropdown.appendChild(item);
        });

        input.parentElement.style.position = 'relative';
        input.parentElement.appendChild(dropdown);
        
        return dropdown;
    }

    // Mostrar dropdown
    showDropdown(input, fieldType) {
        const saved = this.getSavedValues(fieldType);
        if (saved.length > 0) {
            this.createDropdown(input, saved);
        }
    }

    // Esconder dropdown
    hideDropdown(input) {
        const dropdown = input.parentElement.querySelector('.autocomplete-dropdown');
        if (dropdown) {
            dropdown.remove();
        }
    }

    // Inicializar autocomplete para um campo
    initField(input, fieldType) {
        // Garantir que campo inicia vazio
        input.value = '';
        
        // Mostrar sugestões ao focar/clicar
        input.addEventListener('focus', () => {
            this.showDropdown(input, fieldType);
        });

        // Filtrar sugestões enquanto digita
        input.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            const saved = this.getSavedValues(fieldType);
            
            if (value === '') {
                // Se vazio, mostrar todas as sugestões
                this.showDropdown(input, fieldType);
            } else {
                // Filtrar sugestões que começam com o texto digitado
                const filtered = saved.filter(item => 
                    item.toLowerCase().includes(value.toLowerCase())
                );
                if (filtered.length > 0) {
                    this.createDropdown(input, filtered);
                } else {
                    this.hideDropdown(input);
                }
            }
        });

        // Esconder ao sair do campo (com delay para permitir clique na sugestão)
        input.addEventListener('blur', () => {
            setTimeout(() => {
                this.hideDropdown(input);
            }, 200);
        });

        // Salvar valor ao submeter formulário
        const form = input.closest('form');
        if (form) {
            form.addEventListener('submit', () => {
                if (input.value.trim()) {
                    this.saveValue(fieldType, input.value);
                }
            });
        }
    }
}

// Instância global
const autocompleteManager = new AutocompleteManager();

// Inicializar autocomplete para campos específicos
document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;
    
    // Login - campo email/CPF
    if (currentPath.includes('login.html')) {
        const loginEmail = document.getElementById('email');
        if (loginEmail) {
            // Buscar tanto emails quanto CPFs
            const emails = autocompleteManager.getSavedValues('email');
            const cpfs = autocompleteManager.getSavedValues('cpf');
            const combined = [...new Set([...emails, ...cpfs])];
            
            // Criar tipo combinado temporariamente
            autocompleteManager.storageKeys['email-cpf'] = 'autocomplete_email_cpf';
            if (combined.length > 0) {
                localStorage.setItem('autocomplete_email_cpf', JSON.stringify(combined));
            }
            
            autocompleteManager.initField(loginEmail, 'email-cpf');
            
            // Salvar após login bem-sucedido (interceptar o evento de submit do login.js)
            setTimeout(() => {
                const loginForm = document.getElementById('loginForm');
                if (loginForm) {
                    const originalSubmit = loginForm.onsubmit;
                    loginForm.addEventListener('submit', (e) => {
                        setTimeout(() => {
                            const value = loginEmail.value.trim();
                            if (value.includes('@')) {
                                autocompleteManager.saveValue('email', value);
                            } else if (value.replace(/\D/g, '').length >= 10) {
                                autocompleteManager.saveValue('cpf', value);
                            }
                        }, 500);
                    }, true);
                }
            }, 100);
        }
    }

    // Cadastro - campo email
    if (currentPath.includes('cadastro.html')) {
        const cadastroEmail = document.getElementById('email');
        if (cadastroEmail) {
            autocompleteManager.initField(cadastroEmail, 'email');
        }

        // Cadastro - campo CPF
        const cadastroCpf = document.getElementById('cpf');
        if (cadastroCpf) {
            autocompleteManager.initField(cadastroCpf, 'cpf');
        }

        // Cadastro - campo nome
        const cadastroNome = document.getElementById('nome');
        if (cadastroNome) {
            autocompleteManager.initField(cadastroNome, 'nome');
        }
    }
});

