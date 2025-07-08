// account_menu.js

// Função utilitária para obter o token JWT
function getToken() {
    return localStorage.getItem('token');
}

// Função para decodificar o token JWT e obter o email
function getUserEmailFromToken() {
    const token = getToken();
    if (!token) return '';
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.email || '';
    } catch {
        return '';
    }
}

// Menu de conta
function setupAccountMenu() {
    const accountBtn = document.getElementById('account-btn');
    const accountMenu = document.getElementById('account-menu');
    const accountEmail = document.getElementById('account-email');
    if (!accountBtn || !accountMenu || !accountEmail) return;
    // Mostrar email
    accountEmail.textContent = getUserEmailFromToken();
    // Toggle menu
    accountBtn.onclick = function(e) {
        e.preventDefault();
        accountMenu.style.display = (accountMenu.style.display === 'flex' || accountMenu.style.display === '') ? 'none' : 'flex';
    };
    // Fechar ao clicar fora
    document.addEventListener('click', function(e) {
        if (!accountMenu.contains(e.target) && !accountBtn.contains(e.target)) {
            accountMenu.style.display = 'none';
        }
    });
    // Logout
    accountMenu.querySelector('.account-logout').onclick = function() {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    };
    // Mudar password
    accountMenu.querySelector('.account-change-password').onclick = function() {
        accountMenu.style.display = 'none'; // Fechar o menu
        mostrarModalMudarPassword();
    };
}

// Função para mostrar modal de mudar password
function mostrarModalMudarPassword() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Mudar Password</h3>
                <button class="btn-fechar" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="form-mudar-password">
                    <div class="form-group">
                        <label for="current-password">Password Atual:</label>
                        <input type="password" id="current-password" required>
                    </div>
                    <div class="form-group">
                        <label for="new-password">Nova Password:</label>
                        <input type="password" id="new-password" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label for="confirm-password">Confirmar Nova Password:</label>
                        <input type="password" id="confirm-password" required minlength="6">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancelar" onclick="this.closest('.modal-overlay').remove()">
                            Cancelar
                        </button>
                        <button type="submit" class="btn-confirmar">
                            Mudar Password
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listener para o formulário
    const form = modal.querySelector('#form-mudar-password');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // Validações
        if (newPassword !== confirmPassword) {
            alert('As passwords não coincidem.');
            return;
        }
        
        if (newPassword.length < 6) {
            alert('A nova password deve ter pelo menos 6 caracteres.');
            return;
        }
        
        try {
            const response = await fetch('http://localhost:3001/api/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('Password alterada com sucesso!');
                modal.remove();
            } else {
                alert(data.error || 'Erro ao alterar password.');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao conectar com o servidor.');
        }
    });
}

// Inicializar automaticamente se existir o botão de conta
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('account-btn')) {
        setupAccountMenu();
    }
}); 