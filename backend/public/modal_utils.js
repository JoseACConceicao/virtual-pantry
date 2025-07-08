/**
 * Abre um modal com o HTML fornecido.
 * O modal é centralizado, overlay escuro, fecha ao clicar fora ou no botão .btn-fechar.
 * @param {string} html - HTML do conteúdo do modal (deve conter .modal-content e .btn-fechar)
 */
function abrirModal(html) {
    fecharModal(); // Garante que só existe um modal
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = 2000;
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    // Fechar ao clicar no overlay (mas não dentro do modal)
    overlay.addEventListener('mousedown', function(e) {
        if (e.target === overlay) fecharModal();
    });
    // Fechar ao clicar no botão de fechar
    const btnFechar = overlay.querySelector('.btn-fechar');
    if (btnFechar) {
        btnFechar.addEventListener('click', fecharModal);
    }
    // Foco no primeiro input
    setTimeout(() => {
        const firstInput = overlay.querySelector('input,textarea,select');
        if (firstInput) firstInput.focus();
    }, 100);
}

/**
 * Fecha o modal (remove overlay)
 */
function fecharModal() {
    document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
}

// Exportar globalmente
window.abrirModal = abrirModal;
window.fecharModal = fecharModal; 