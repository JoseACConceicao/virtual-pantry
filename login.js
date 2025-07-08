// login.js

console.log('login.js carregado');

// Garante que o CSS do modal está presente
if (!document.getElementById('modal-alimento-style')) {
    const style = document.createElement('style');
    style.id = 'modal-alimento-style';
    style.innerHTML = `
    .modal-alimento { position: fixed; z-index: 1000; left: 0; top: 0; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
    .modal-alimento[style*='none'] { display: none !important; }
    .modal-overlay { position: absolute; left: 0; top: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.25); }
    .modal-content { position: relative; background: #fff; border-radius: 18px; box-shadow: 0 8px 32px rgba(116,136,115,0.13); padding: 2.2rem 1.5rem 1.5rem 1.5rem; min-width: 320px; max-width: 95vw; z-index: 1; display: flex; flex-direction: column; gap: 1.1rem; }
    .modal-content h3 { color: #748873; font-size: 1.3rem; margin-bottom: 0.5rem; text-align: center; }
    .modal-content p { color: #748873; font-size: 1rem; text-align: center; }
    .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem; }
    .btn-cancel { background: #eee; color: #748873; border: none; border-radius: 25px; padding: 0.6rem 1.5rem; font-size: 1rem; font-weight: 500; cursor: pointer; transition: background 0.2s; }
    .btn-cancel:hover { background: #ddd; }
    @media (max-width: 600px) { .modal-content { min-width: 90vw; padding: 1.2rem 0.5rem; } }
    `;
    document.head.appendChild(style);
}

// Função utilitária para mostrar pop-up de erro ou sucesso
function showPopup(msg, isError = true) {
    let modal = document.getElementById('modal-erro-login');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-erro-login';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content" style="max-width:340px;">
                <h3 id="popup-title-login"></h3>
                <p id="msg-erro-login"></p>
                <div class="modal-actions">
                    <button class="btn-cancel">Fechar</button>
                </div>
            </div>
        `;
        modal.className = 'modal-alimento';
        document.body.appendChild(modal);
    }
    modal.querySelector('#popup-title-login').textContent = isError ? 'Erro' : 'Sucesso';
    modal.querySelector('#msg-erro-login').textContent = msg;
    modal.style.display = 'flex';
    modal.querySelector('.btn-cancel').onclick = function() {
        modal.style.display = 'none';
    };
    modal.querySelector('.modal-overlay').onclick = function() {
        modal.style.display = 'none';
    };
}

const API_BASE = '';

async function apiFetch(url, options = {}) {
    const token = getToken && typeof getToken === 'function' ? getToken() : localStorage.getItem('token');
    options.headers = options.headers || {};
    if (token) {
        options.headers['Authorization'] = 'Bearer ' + token;
    }
    if (!options.headers['Content-Type'] && !(options.body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
    }
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
    const res = await fetch(fullUrl, options);
    if (!res.ok) throw new Error((await res.json()).error || 'Erro na API');
    return res.json();
}

// Função para fazer login
async function fazerLogin(email, password) {
    try {
        const data = await apiFetch('/api/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        localStorage.setItem('token', data.token);
        localStorage.setItem('userEmail', email);
        window.location.href = 'dashboard.html';
    } catch (error) {
        showPopup(error.message, true);
    }
}

// Função para fazer registo
async function fazerRegisto(email, password) {
    try {
        const data = await apiFetch('/api/register', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        showPopup('Registo realizado com sucesso! Faça login.', false);
        // Volta para o formulário de login
        document.getElementById('show-login').click();
    } catch (error) {
        showPopup(error.message, true);
    }
}

// Função utilitária para obter o token JWT
function getToken() {
    return localStorage.getItem('token');
}

// Configurar event listeners quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, configurando event listeners...');
    
    // Event listener para o botão de login
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        console.log('Botão de login encontrado, adicionando event listener...');
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Botão de login clicado!');
            
            const email = document.querySelector('.login input[type="email"]').value;
            const password = document.querySelector('.login input[type="password"]').value;
            
            if (!email || !password) {
                showPopup('Por favor, preencha todos os campos.', true);
                return;
            }
            
            fazerLogin(email, password);
        });
    } else {
        console.error('Botão de login não encontrado!');
    }
    
    // Event listener para o botão de registo
    const registerBtn = document.querySelector('.register button[type="submit"]');
    if (registerBtn) {
        console.log('Botão de registo encontrado, adicionando event listener...');
        registerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Botão de registo clicado!');
            
            const email = document.querySelector('.register input[type="email"]').value;
            const password = document.querySelector('.register input[type="password"]').value;
            
            if (!email || !password) {
                showPopup('Por favor, preencha todos os campos.', true);
                return;
            }
            
            fazerRegisto(email, password);
        });
    } else {
        console.error('Botão de registo não encontrado!');
    }
    
    // Event listeners para os botões de switch (já existem no HTML, mas vamos garantir)
    const showLoginBtn = document.getElementById('show-login');
    const showRegisterBtn = document.getElementById('show-register');
    
    if (showLoginBtn && showRegisterBtn) {
        showLoginBtn.addEventListener('click', function() {
            document.querySelector('.login').classList.add('active');
            document.querySelector('.register').classList.remove('active');
            this.classList.add('active');
            showRegisterBtn.classList.remove('active');
        });
        
        showRegisterBtn.addEventListener('click', function() {
            document.querySelector('.register').classList.add('active');
            document.querySelector('.login').classList.remove('active');
            this.classList.add('active');
            showLoginBtn.classList.remove('active');
        });
    }
});

// Fallback para caso o DOMContentLoaded já tenha acontecido
if (document.readyState === 'loading') {
    console.log('DOM ainda a carregar, aguardando...');
} else {
    console.log('DOM já carregado, executando configuração imediatamente...');
    // Executar a configuração imediatamente
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        console.log('Botão de login encontrado (fallback), adicionando event listener...');
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Botão de login clicado!');
            
            const email = document.querySelector('.login input[type="email"]').value;
            const password = document.querySelector('.login input[type="password"]').value;
            
            if (!email || !password) {
                showPopup('Por favor, preencha todos os campos.', true);
                return;
            }
            
            fazerLogin(email, password);
        });
    }
    
    const registerBtn = document.querySelector('.register button[type="submit"]');
    if (registerBtn) {
        console.log('Botão de registo encontrado (fallback), adicionando event listener...');
        registerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Botão de registo clicado!');
            
            const email = document.querySelector('.register input[type="email"]').value;
            const password = document.querySelector('.register input[type="password"]').value;
            
            if (!email || !password) {
                showPopup('Por favor, preencha todos os campos.', true);
                return;
            }
            
            fazerRegisto(email, password);
        });
    }
}