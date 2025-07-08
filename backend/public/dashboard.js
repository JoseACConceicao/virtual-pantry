// dashboard.js

// --- Helpers de autenticação ---
function getToken() {
    return localStorage.getItem('token');
}

const API_BASE = '';

// --- API Fetch com token ---
async function apiFetch(url, options = {}) {
    const token = getToken();
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

// --- Renderização dos widgets ---
document.addEventListener('DOMContentLoaded', function() {
    renderWidgetExpirar();
    renderWidgetBaixoStock();
    renderWidgetDesperdicio();
    renderWidgetListaCompras();
    // Adicionar listeners para abrir modal ao clicar nos widgets
    setupWidgetModals();
});

async function renderWidgetExpirar() {
    const card = document.querySelector('.dashboard-grid .card.highlight');
    if (!card) return;
    try {
        const lista = await apiFetch('/api/dashboard/expirar');
        card.querySelector('.card-value').textContent = lista.length + (lista.length === 1 ? ' produto' : ' produtos');
        if (lista.length) {
            const detalhes = lista.map(a => `${a.nome} (${diasRestantes(a.validade)})`).join(', ');
            card.querySelector('.card-detail').textContent = detalhes;
        } else {
            card.querySelector('.card-detail').textContent = 'Nenhum produto a expirar.';
        }
        card.dataset.lista = JSON.stringify(lista);
    } catch {
        card.querySelector('.card-value').textContent = '--';
        card.querySelector('.card-detail').textContent = 'Erro ao carregar.';
    }
}

async function renderWidgetBaixoStock() {
    const cards = document.querySelectorAll('.dashboard-grid .card');
    // O segundo card não tem .highlight nem .card-link
    const card = Array.from(cards).find(c => !c.classList.contains('highlight') && !c.classList.contains('card-link'));
    if (!card) return;
    try {
        const lista = await apiFetch('/api/dashboard/baixo-stock');
        card.querySelector('.card-value').textContent = lista.length + (lista.length === 1 ? ' produto' : ' produtos');
        if (lista.length) {
            const detalhes = lista.map(a => a.nome).join(', ');
            card.querySelector('.card-detail').textContent = detalhes;
        } else {
            card.querySelector('.card-detail').textContent = 'Stock suficiente.';
        }
        card.dataset.lista = JSON.stringify(lista);
    } catch {
        card.querySelector('.card-value').textContent = '--';
        card.querySelector('.card-detail').textContent = 'Erro ao carregar.';
    }
}

async function renderWidgetDesperdicio() {
    const cards = document.querySelectorAll('.dashboard-grid .card');
    // O terceiro card não tem .highlight nem .card-link
    const card = Array.from(cards).filter(c => !c.classList.contains('highlight') && !c.classList.contains('card-link'))[1];
    if (!card) return;
    try {
        const lista = await apiFetch('/api/dashboard/desperdicio');
        // Somar quantidade total (assume kg se unidade não especificada)
        let total = 0;
        lista.forEach(a => {
            let qtd = parseFloat(a.quantidade);
            if (!isNaN(qtd)) total += qtd;
        });
        card.querySelector('.card-value').textContent = total ? total + 'kg' : '0kg';
        card.querySelector('.card-detail').textContent = 'Esta semana';
        card.dataset.lista = JSON.stringify(lista);
    } catch {
        card.querySelector('.card-value').textContent = '--';
        card.querySelector('.card-detail').textContent = 'Erro ao carregar.';
    }
}

async function renderWidgetListaCompras() {
    // O card com .fa-list
    const card = document.querySelector('.dashboard-grid .card-link .fa-list')?.closest('.card');
    if (!card) return;
    try {
        const lista = await apiFetch('/api/lista-compras');
        card.querySelector('.card-value').textContent = lista.length + ' itens';
        card.dataset.lista = JSON.stringify(lista);
    } catch {
        card.querySelector('.card-value').textContent = '--';
    }
}

function diasRestantes(validade) {
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const v = new Date(validade);
    v.setHours(0,0,0,0);
    const diff = Math.ceil((v - hoje) / (1000*60*60*24));
    if (diff === 0) return 'hoje';
    if (diff === 1) return '1d';
    if (diff > 1) return diff + 'd';
    return 'expirado';
}

function setupWidgetModals() {
    // Expirar
    const cardExpirar = document.querySelector('.dashboard-grid .card.highlight');
    if (cardExpirar) {
        cardExpirar.style.cursor = 'pointer';
        cardExpirar.onclick = function() {
            const lista = JSON.parse(cardExpirar.dataset.lista || '[]');
            abrirModalLista('Produtos a expirar', lista, a => `${a.nome} - ${a.quantidade} (Validade: ${formatarData(a.validade)})`);
        };
    }
    // Baixo stock
    const cards = document.querySelectorAll('.dashboard-grid .card');
    const cardBaixo = Array.from(cards).find(c => !c.classList.contains('highlight') && !c.classList.contains('card-link'));
    if (cardBaixo) {
        cardBaixo.style.cursor = 'pointer';
        cardBaixo.onclick = function() {
            const lista = JSON.parse(cardBaixo.dataset.lista || '[]');
            abrirModalLista('Produtos com baixo stock', lista, a => `${a.nome} - ${a.quantidade}`);
        };
    }
    // Desperdício evitado
    const cardDesperdicio = Array.from(cards).filter(c => !c.classList.contains('highlight') && !c.classList.contains('card-link'))[1];
    if (cardDesperdicio) {
        cardDesperdicio.style.cursor = 'pointer';
        cardDesperdicio.onclick = function() {
            const lista = JSON.parse(cardDesperdicio.dataset.lista || '[]');
            abrirModalLista('Desperdício evitado', lista, a => `${a.nome} - ${a.quantidade} (Consumido: ${formatarData(a.data_consumo)})`);
        };
    }
    // Lista de compras
    const cardLista = document.querySelector('.dashboard-grid .card-link .fa-list')?.closest('.card');
    if (cardLista) {
        cardLista.style.cursor = 'pointer';
        cardLista.onclick = function(e) {
            // Permitir navegação normal se for <a>
            if (e.target.closest('a')) return;
            const lista = JSON.parse(cardLista.dataset.lista || '[]');
            abrirModalLista('Lista de compras', lista, a => `${a.nome} - ${a.quantidade} ${a.unidade || ''}`);
        };
    }
}

function abrirModalLista(titulo, lista, renderItem) {
    let html = `<div class="modal-content">
        <div class="modal-header">
            <h2>${titulo}</h2>
            <button class="btn-fechar"><i class="fa-solid fa-times"></i></button>
        </div>
        <div class="modal-body">
            <ul style="list-style:none;padding:0;max-height:50vh;overflow-y:auto;">
                ${lista.length ? lista.map(renderItem).map(li => `<li style='padding:0.5rem 0;border-bottom:1px solid #eee;'>${li}</li>`).join('') : '<li style=\'color:#bbb;\'>Nenhum item.</li>'}
            </ul>
        </div>
    </div>`;
    abrirModal(html);
}

function formatarData(data) {
    const d = new Date(data);
    return d.toLocaleDateString('pt-PT');
} 