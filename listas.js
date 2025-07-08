// listas.js

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

// --- Renderização da lista automática ---
async function carregarListaAutomatica() {
    const ul = document.getElementById('itens-automaticos');
    ul.innerHTML = '<li style="color:#bbb;">A carregar...</li>';
    try {
        const lista = await apiFetch('/api/lista-compras');
        if (!lista.length) {
            ul.innerHTML = '<li style="color:#bbb;">Nenhum item necessário para as receitas agendadas.</li>';
            return;
        }
        ul.innerHTML = '';
        lista.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<input type="checkbox"> ${item.nome} (${item.quantidade} ${item.unidade})`;
            ul.appendChild(li);
        });
    } catch (err) {
        ul.innerHTML = '<li style="color:#d9534f;">Erro ao carregar lista automática.</li>';
        console.error(err);
    }
}

// --- Lista manual via backend ---
async function getItensManuais() {
    return await apiFetch('/api/lista-manual');
}
async function addItemManual(nome, quantidade, unidade) {
    return await apiFetch('/api/lista-manual', {
        method: 'POST',
        body: JSON.stringify({ nome, quantidade, unidade })
    });
}
async function removeItemManual(id) {
    return await apiFetch(`/api/lista-manual/${id}`, { method: 'DELETE' });
}
async function esvaziarListaManual() {
    return await apiFetch('/api/lista-manual', { method: 'DELETE' });
}

async function renderizarItensManuais() {
    const ul = document.getElementById('itens-manuais');
    ul.innerHTML = '';
    let itens = [];
    try {
        itens = await getItensManuais();
    } catch {
        ul.innerHTML = '<li style="color:#d9534f;">Erro ao carregar extras manuais.</li>';
        return;
    }
    if (!itens.length) {
        ul.innerHTML = '<li style="color:#bbb;">Nenhum extra manual.</li>';
        return;
    }
    itens.forEach(item => {
        const li = document.createElement('li');
        let detalhe = item.nome;
        if (item.quantidade) {
            detalhe += ` (${item.quantidade}${item.unidade ? ' ' + item.unidade : ''})`;
        }
        li.innerHTML = `<input type="checkbox"> ${detalhe} <button class="btn-remover-manual" title="Remover"><i class="fa-solid fa-trash"></i></button>`;
        li.querySelector('.btn-remover-manual').onclick = async function() {
            await removeItemManual(item.id);
            renderizarItensManuais();
        };
        ul.appendChild(li);
    });
}

// --- Autocomplete para input manual ---
async function obterSugestoesBancoNomes(termo) {
    try {
        const res = await apiFetch('/api/banco-nomes?termo=' + encodeURIComponent(termo));
        return res;
    } catch {
        return [];
    }
}

function setupAutocompleteInputManual() {
    const input = document.getElementById('input-item-manual');
    if (!input) return;
    let dropdown = document.createElement('div');
    dropdown.className = 'sugestoes-dropdown';
    dropdown.style.position = 'absolute';
    dropdown.style.zIndex = 1000;
    dropdown.style.background = '#fff';
    dropdown.style.border = '1px solid #e9ecef';
    dropdown.style.borderRadius = '8px';
    dropdown.style.boxShadow = '0 2px 8px rgba(116,136,115,0.08)';
    dropdown.style.display = 'none';
    dropdown.style.maxHeight = '180px';
    dropdown.style.overflowY = 'auto';
    dropdown.style.minWidth = '180px';
    input.parentNode.appendChild(dropdown);

    input.addEventListener('input', async function() {
        const termo = input.value.trim();
        if (termo.length < 2) {
            dropdown.style.display = 'none';
            return;
        }
        const sugestoes = await obterSugestoesBancoNomes(termo);
        if (!sugestoes.length) {
            dropdown.style.display = 'none';
            return;
        }
        dropdown.innerHTML = '';
        sugestoes.forEach(nome => {
            const item = document.createElement('div');
            item.textContent = nome;
            item.style.padding = '0.5rem 1rem';
            item.style.cursor = 'pointer';
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                input.value = nome;
                dropdown.style.display = 'none';
            });
            dropdown.appendChild(item);
        });
        const rect = input.getBoundingClientRect();
        dropdown.style.left = input.offsetLeft + 'px';
        dropdown.style.top = (input.offsetTop + input.offsetHeight + 2) + 'px';
        dropdown.style.display = 'block';
    });
    input.addEventListener('blur', function() {
        setTimeout(() => { dropdown.style.display = 'none'; }, 120);
    });
}

// --- Adicionar item manual ---
document.addEventListener('DOMContentLoaded', function() {
    // Carregar listas
    carregarListaAutomatica();
    renderizarItensManuais();
    setupAutocompleteInputManual();

    // Submeter novo item manual
    const form = document.getElementById('form-adicionar-item-manual');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const input = document.getElementById('input-item-manual');
            const inputQtd = document.getElementById('input-quantidade-manual');
            const inputUn = document.getElementById('input-unidade-manual');
            const valor = input.value.trim();
            const quantidade = inputQtd.value.trim();
            const unidade = inputUn.value.trim();
            if (!valor) return;
            let itens = [];
            try {
                itens = await getItensManuais();
            } catch { itens = []; }
            // Evitar duplicados (case insensitive)
            if (itens.some(item => item.nome.toLowerCase() === valor.toLowerCase())) {
                input.classList.add('input-erro');
                input.value = '';
                input.placeholder = 'Já existe na lista!';
                setTimeout(() => {
                    input.classList.remove('input-erro');
                    input.placeholder = 'Ex: Iogurtes';
                }, 1200);
                return;
            }
            await addItemManual(valor, quantidade, unidade);
            renderizarItensManuais();
            input.value = '';
            inputQtd.value = '';
            inputUn.value = '';
            input.classList.add('input-ok');
            setTimeout(() => input.classList.remove('input-ok'), 600);
        });
    }

    // Exportar para PDF
    const btnExportar = document.getElementById('btn-exportar-pdf');
    if (btnExportar) {
        btnExportar.addEventListener('click', async function() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.text('Lista de Compras', 14, 18);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            let y = 30;
            // Itens automáticos
            const itensAuto = document.querySelectorAll('#itens-automaticos li');
            if (itensAuto.length) {
                doc.text('Automática:', 14, y);
                y += 8;
                itensAuto.forEach(li => {
                    const texto = li.textContent.trim();
                    doc.text(`- ${texto}`, 14, y);
                    y += 8;
                });
            }
            // Itens manuais
            const itensManuais = await getItensManuais();
            if (itensManuais.length) {
                y += 6;
                doc.text('Extras manuais:', 14, y);
                y += 8;
                itensManuais.forEach(item => {
                    doc.text(`- ${item.nome}`, 14, y);
                    y += 8;
                });
            }
            doc.save('lista_de_compras.pdf');
        });
    }
});

// Função para remover item manual ao adicionar à despensa
async function removerItemManualPorNome(nome) {
    let itens = [];
    try {
        itens = await getItensManuais();
    } catch { return; }
    const item = itens.find(i => i.nome.toLowerCase() === nome.toLowerCase());
    if (item) {
        await removeItemManual(item.id);
        renderizarItensManuais();
    }
} 