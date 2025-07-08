// despensa.js
// Estrutura base para gerir alimentos dinamicamente na despensa

// Banco de nomes dinâmico para autocomplete
let bancoNomesAlimentos = new Set();

const API_BASE = '';

// Função para normalizar nomes (plural -> singular)
function normalizarNome(nome) {
    const normalizacoes = {
        'batatas': 'batata',
        'cenouras': 'cenoura', 
        'cebolas': 'cebola',
        'tomates': 'tomate',
        'maçãs': 'maçã',
        'laranjas': 'laranja',
        'bananas': 'banana',
        'ovos': 'ovo',
        'pães': 'pão',
        'queijos': 'queijo',
        'leites': 'leite',
        'iogurtes': 'iogurte',
        'manteigas': 'manteiga',
        'azeites': 'azeite',
        'óleos': 'óleo',
        'farinhas': 'farinha',
        'açúcares': 'açúcar',
        'sal': 'sal',
        'pimentas': 'pimenta',
        'ervas': 'erva',
        'especiarias': 'especiaria',
        'carnes': 'carne',
        'frangos': 'frango',
        'peixes': 'peixe',
        'atum': 'atum',
        'sardinhas': 'sardinha',
        'feijões': 'feijão',
        'grãos': 'grão',
        'arroz': 'arroz',
        'massas': 'massa',
        'noodles': 'noodle',
        'sopas': 'sopa',
        'molhos': 'molho',
        'ketchups': 'ketchup',
        'mostardas': 'mostarda',
        'maioneses': 'maionese',
        'vinagres': 'vinagre',
        'vinhos': 'vinho',
        'cervejas': 'cerveja',
        'refrigerantes': 'refrigerante',
        'sumos': 'sumo',
        'águas': 'água',
        'chás': 'chá',
        'cafés': 'café',
        'chocolates': 'chocolate',
        'bolachas': 'bolacha',
        'bolos': 'bolo',
        'doces': 'doce',
        'frutos secos': 'fruto seco',
        'amendoins': 'amendoim',
        'nozes': 'noz',
        'avelãs': 'avelã',
        'amêndoas': 'amêndoa',
        'passas': 'passa',
        'figos': 'figo',
        'damasco': 'damasco',
        'uvas': 'uva',
        'morangos': 'morango',
        'framboesas': 'framboesa',
        'mirtilos': 'mirtilo',
        'limões': 'limão',
        'limas': 'lima',
        'toranjas': 'toranja',
        'ananás': 'ananás',
        'mangas': 'manga',
        'pêssegos': 'pêssego',
        'ameixas': 'ameixa',
        'cerejas': 'cereja',
        'kiwis': 'kiwi',
        'abacaxis': 'abacaxi',
        'melões': 'melão',
        'melancias': 'melancia',
        'abóboras': 'abóbora',
        'beterrabas': 'beterraba',
        'nabos': 'nabo',
        'rabanetes': 'rabanete',
        'alhos': 'alho',
        'gengibres': 'gengibre',
        'curry': 'curry',
        'canelas': 'canela',
        'noz-moscada': 'noz-moscada',
        'pimenta-caiena': 'pimenta-caiena',
        'orégãos': 'orégão',
        'manjericão': 'manjericão',
        'salsa': 'salsa',
        'coentros': 'coentro',
        'louro': 'louro',
        'tomilho': 'tomilho',
        'alecrim': 'alecrim',
        'sálvia': 'sálvia',
        'hortelã': 'hortelã',
        'camomila': 'camomila',
        'lavanda': 'lavanda',
        'girassol': 'girassol',
        'chia': 'chia',
        'linhaça': 'linhaça',
        'quinoa': 'quinoa',
        'aveia': 'aveia',
        'trigo': 'trigo',
        'centeio': 'centeio',
        'cevada': 'cevada',
        'milho': 'milho',
        'soja': 'soja',
        'lentilhas': 'lentilha',
        'grão-de-bico': 'grão-de-bico',
        'ervilhas': 'ervilha',
        'favas': 'fava',
        'tremoços': 'tremoço',
        'amendoas': 'amendoa',
        'castanhas': 'castanha',
        'pinhões': 'pinhão',
        'pistachios': 'pistachio',
        'cajus': 'caju',
        'macadâmias': 'macadâmia',
        'pêras': 'pêra',
        'peras': 'pera',
        'maçãs': 'maçã',
        'macas': 'maca'
    };
    
    const nomeLower = nome.toLowerCase().trim();
    return normalizacoes[nomeLower] || nomeLower;
}

// Função para adicionar nome ao banco
async function adicionarNomeAoBanco(nome) {
    const nomeNormalizado = normalizarNome(nome);
    try {
        await apiFetch('/api/banco-nomes', {
            method: 'POST',
            body: JSON.stringify({ nome: nomeNormalizado })
        });
        bancoNomesAlimentos.add(nomeNormalizado);
    } catch (err) {
        console.error('Erro ao adicionar nome ao banco:', err);
    }
}

// Função para carregar banco de nomes
async function carregarBancoNomes() {
    try {
        const nomes = await apiFetch('/api/banco-nomes');
        bancoNomesAlimentos = new Set(nomes);
    } catch (err) {
        console.error('Erro ao carregar banco de nomes:', err);
        bancoNomesAlimentos = new Set();
    }
}

// Função para obter sugestões de autocomplete
async function obterSugestoes(termo) {
    try {
        const sugestoes = await apiFetch(`/api/banco-nomes?termo=${encodeURIComponent(termo)}`);
        return sugestoes.slice(0, 5); // Máximo 5 sugestões
    } catch (err) {
        console.error('Erro ao obter sugestões:', err);
        // Fallback para busca local
        const termoLower = termo.toLowerCase();
        return [...bancoNomesAlimentos].filter(nome => 
            nome.includes(termoLower)
        ).slice(0, 5);
    }
}

// Exemplo de dados iniciais (pode ser carregado do backend futuramente)
let alimentos = [
    {
        nome: 'Arroz',
        imagem: 'imagens/arroz.jpg',
        quantidade: '2 kg',
        validade: '2025-07-11', // formato ISO para fácil ordenação
    },
    {
        nome: 'Ovos',
        imagem: 'imagens/ovos.jpg',
        quantidade: '6 un',
        validade: '2024-06-10',
    }
];

// Função para calcular cor da borda conforme validade (verde, amarelo, vermelho)
function getUrgencyBorder(dateStr) {
    const today = new Date();
    const validade = new Date(dateStr);
    // Zerar horas para comparar apenas datas
    today.setHours(0,0,0,0);
    validade.setHours(0,0,0,0);
    const diffTime = validade - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 7) {
        return 'border-green';
    } else if (diffDays >= 3) {
        return 'border-yellow';
    } else {
        return 'border-red';
    }
}

// Função para renderizar todos os cards de alimentos
function renderAlimentos() {
    const container = document.querySelector('.despensa-list.dashboard-grid');
    if (!container) return;

    // Limpar conteúdo atual
    container.innerHTML = '';

    // Card de adicionar alimento
    container.innerHTML += `
        <a href="#" class="card card-link card-add-alimento">
            <div class="card-icon"><i class="fa-solid fa-plus"></i></div>
            <div class="card-title">Adicionar alimento</div>
        </a>
    `;

    // Ordenar alimentos por validade (mais próximo primeiro)
    const alimentosOrdenados = [...alimentos].sort((a, b) => new Date(a.validade) - new Date(b.validade));

    // Renderizar cada alimento
    alimentosOrdenados.forEach((alimento) => {
        const borderClass = getUrgencyBorder(alimento.validade);
        let imagemHtml = '';
        if (alimento.imagem && alimento.imagem.trim() !== '') {
            imagemHtml = `<img src="${alimento.imagem}" alt="${alimento.nome}" class="alimento-img">`;
        } else {
            imagemHtml = `<div class="alimento-img no-img" title="Sem imagem">📷</div>`;
        }
        container.innerHTML += `
            <div class="card alimento-card ${borderClass}">
                <button class="btn-eliminar-alimento" data-id="${alimento.id}" title="Eliminar alimento"><i class="fa-solid fa-trash"></i></button>
                ${imagemHtml}
                <div class="card-title">${alimento.nome}</div>
                <div class="card-qty">
                    <button class="qty-btn" data-id="${alimento.id}" data-delta="-1"><i class="fa-solid fa-chevron-left"></i></button>
                    <span class="qty-value">${alimento.quantidade}</span>
                    <button class="qty-btn" data-id="${alimento.id}" data-delta="1"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
                <div class="card-detail">Validade: ${formatValidade(alimento.validade)}</div>
            </div>
        `;
    });

    // Adicionar event listeners aos botões de lixo
    setTimeout(() => {
        document.querySelectorAll('.btn-eliminar-alimento').forEach(btn => {
            btn.onclick = function(e) {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const alimento = alimentos.find(a => a.id == id);
                if (alimento) {
                    abrirModalConfirmarRemover(alimento.id, alimento.nome, alimento.quantidade, alimento.unidade || '');
                }
            };
        });
    }, 0);
}

// Função auxiliar para formatar a validade (ex: 2024-06-10 -> 10/06/2024)
function formatValidade(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-PT');
}


// Função para editar quantidade
function editarQuantidade(index, delta) {
    let alimento = alimentos[index];
    // Extrair número e unidade (ex: "2 kg")
    let match = alimento.quantidade.match(/^(\d+)\s*(.*)$/);
    if (!match) return;
    let valor = parseInt(match[1]);
    let unidade = match[2] || '';
    let novoValor = valor + delta;
    if (novoValor < 0) novoValor = 0;
    if (novoValor === 0) {
        abrirModalConfirmarRemover(alimento.id, alimento.nome, valor, unidade);
    } else {
        // Atualizar quantidade no backend
        editarAlimentoBackend({ ...alimento, quantidade: novoValor + (unidade ? ' ' + unidade : '') });
    }
}

// Função utilitária para obter o token JWT
function getToken() {
    return localStorage.getItem('token');
}

// Função fetch autenticada
async function apiFetch(url, options = {}) {
    const token = getToken();
    options.headers = options.headers || {};
    if (token) {
        options.headers['Authorization'] = 'Bearer ' + token;
    }
    if (!options.headers['Content-Type'] && !(options.body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`, options);
    if (!res.ok) throw new Error((await res.json()).error || 'Erro na API');
    return res.json();
}

// Carregar alimentos do backend
async function carregarAlimentos() {
    try {
        alimentos = await apiFetch('/api/alimentos');
        renderAlimentos();
    } catch (err) {
        alert('Erro ao carregar alimentos: ' + err.message);
    }
}

// Função para adicionar alimento ao backend
async function adicionarAlimentoBackend(alimento) {
    try {
        await apiFetch('/api/alimentos', {
            method: 'POST',
            body: JSON.stringify(alimento)
        });
        await carregarAlimentos();
    } catch (err) {
        alert('Erro ao adicionar alimento: ' + err.message);
    }
}

// Função para editar alimento no backend
async function editarAlimentoBackend(alimento) {
    try {
        await apiFetch(`/api/alimentos/${alimento.id}`, {
            method: 'PUT',
            body: JSON.stringify(alimento)
        });
        await carregarAlimentos();
    } catch (err) {
        alert('Erro ao editar alimento: ' + err.message);
    }
}

// Função para remover alimento no backend
async function removerAlimentoBackend(id) {
    try {
        await apiFetch(`/api/alimentos/${id}`, {
            method: 'DELETE'
        });
        await carregarAlimentos();
    } catch (err) {
        alert('Erro ao remover alimento: ' + err.message);
    }
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

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', async function() {
    await carregarBancoNomes(); // Carregar banco de nomes
    await carregarAlimentos();
    // Event listener para o card de adicionar alimento
    document.addEventListener('click', function(e) {
        if (e.target.closest('.card-add-alimento')) {
            e.preventDefault();
            criarModalAdicionarAlimento();
        }
    });
    
    // Event listeners para os botões de quantidade
    document.addEventListener('click', function(e) {
        if (e.target.closest('.qty-btn')) {
            e.preventDefault();
            const btn = e.target.closest('.qty-btn');
            const id = btn.dataset.id;
            const delta = parseInt(btn.dataset.delta);
            const index = alimentos.findIndex(a => a.id == id);
            if (index !== -1) {
                editarQuantidade(index, delta);
            }
        }
    });
});

function criarModalAdicionarAlimento() {
    // HTML do modal como string
    const html = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Adicionar Alimento</h2>
                <button class="btn-fechar"><i class="fa-solid fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="form-adicionar-alimento" autocomplete="off">
                    <div class="ingredient-field">
                        <label>Nome do alimento:</label>
                        <input type="text" name="nome" id="nome-alimento" required placeholder="Ex: arroz, ovos, leite...">
                        <div id="sugestoes-alimento" class="sugestoes-dropdown" style="display:none;"></div>
                    </div>
                    <div class="quantidade-container">
                        <label>Quantidade:</label>
                        <div class="quantidade-inputs">
                            <input type="number" name="quantidade" id="quantidade-alimento" required min="0" step="0.1" placeholder="0">
                            <select name="unidade" id="unidade-alimento" required>
                                <option value="">Unidade</option>
                                <option value="kg">kg</option>
                                <option value="g">g</option>
                                <option value="l">l</option>
                                <option value="ml">ml</option>
                                <option value="un">un</option>
                                <option value="pcs">pcs</option>
                                <option value="pacote">pacote</option>
                                <option value="lata">lata</option>
                                <option value="garrafa">garrafa</option>
                                <option value="caixa">caixa</option>
                                <option value="saco">saco</option>
                                <option value="dúzia">dúzia</option>
                                <option value="meia dúzia">meia dúzia</option>
                            </select>
                        </div>
                    </div>
                    <label>Validade:<input type="date" name="validade" required></label>
                    <label>Fotografia:</label>
                    <div class="foto-btns" style="display:flex; gap:0.5rem; margin-bottom:0.5rem;">
                        <button type="button" class="btn-camera btn-galeria">Tirar foto</button>
                        <button type="button" class="btn-ficheiro btn-galeria">Escolher dos ficheiros</button>
                        <button type="button" class="btn-galeria-imagens btn-galeria">Selecionar da galeria</button>
                    </div>
                    <input type="file" accept="image/*" capture="environment" id="input-foto-camera" style="display:none;">
                    <input type="file" accept="image/*" id="input-foto-ficheiro" style="display:none;">
                    <div id="galeria-fotos" class="galeria-fotos" style="display:none;"></div>
                    <div id="preview-foto" class="preview-foto"></div>
                    <div class="modal-actions">
                        <button type="submit" class="btn-add btn-galeria">Adicionar</button>
                        <button type="button" class="btn-cancel btn-galeria">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    abrirModal(html);
    // Adicionar event listener ao formulário do modal
    const modal = document.querySelector('.modal-overlay .modal-content');
    const form = modal.querySelector('#form-adicionar-alimento');
    form.onsubmit = async function(e) {
        e.preventDefault();
        const nome = form.querySelector('#nome-alimento').value.trim();
        const quantidade = form.querySelector('#quantidade-alimento').value.trim();
        const unidade = form.querySelector('#unidade-alimento').value.trim();
        const validade = form.querySelector('input[name="validade"]').value;
        // Para já, ignorar imagem
        if (!nome || !quantidade || !unidade || !validade) return;
        await adicionarAlimentoBackend({ nome, quantidade: quantidade + ' ' + unidade, validade });
        // Remover da lista manual se existir
        if (typeof removerItemManualPorNome === 'function') {
            await removerItemManualPorNome(nome);
        }
        document.querySelector('.modal-overlay').style.display = 'none';
    };
    // Fechar modal ao clicar no botão fechar ou cancelar
    modal.querySelector('.btn-fechar').onclick = function() {
        document.querySelector('.modal-overlay').style.display = 'none';
    };
    modal.querySelector('.btn-cancel').onclick = function() {
        document.querySelector('.modal-overlay').style.display = 'none';
    };
}

function abrirModalAdicionarAlimento() {
    document.querySelector('.modal-overlay').style.display = 'flex';
}

function fecharModalAdicionarAlimento() {
    document.querySelector('.modal-overlay').style.display = 'none';
}

// Adicionar estilo para .no-img se necessário
if (!document.getElementById('no-img-style')) {
    const style = document.createElement('style');
    style.id = 'no-img-style';
    style.innerHTML = `
    .alimento-img.no-img {
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f6f6f6;
        color: #bbb;
        width: 80px;
        height: 80px;
        border-radius: 12px;
        margin-bottom: 1rem;
        font-size: 2.2rem;
        box-shadow: 0 2px 8px rgba(116,136,115,0.10);
    }
    @media (max-width: 600px) {
        .alimento-img.no-img { width: 60px; height: 60px; font-size: 1.5rem; }
    }
    `;
    document.head.appendChild(style);
}

function abrirModalConfirmarRemover(id, nome, valorAnterior, unidade) {
    // Remover modal antigo se existir
    let modal = document.getElementById('modal-confirmar-remover');
    if (modal) modal.remove();
    // Criar modal com overlay
    modal = document.createElement('div');
    modal.id = 'modal-confirmar-remover';
    modal.innerHTML = `
        <div class="modal-overlay" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.35);z-index:1000;"></div>
        <div class="modal-content" style="max-width:340px;z-index:1001;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.12);padding:2rem 1.5rem;">
            <h3>Eliminar alimento?</h3>
            <p>Tem a certeza que deseja eliminar <strong>${nome}</strong> da despensa?</p>
            <div class="modal-actions" style="display:flex;gap:1rem;justify-content:center;margin-top:1.2rem;">
                <button class="btn-confirm">Eliminar</button>
                <button class="btn-cancel">Cancelar</button>
            </div>
        </div>
    `;
    modal.className = 'modal-alimento';
    document.body.appendChild(modal);
    // Confirmar
    modal.querySelector('.btn-confirm').onclick = function() {
        removerAlimentoBackend(id);
        modal.remove();
    };
    // Cancelar
    modal.querySelector('.btn-cancel').onclick = function() {
        modal.remove();
        carregarAlimentos();
    };
    // Fechar ao clicar fora
    modal.querySelector('.modal-overlay').onclick = function() {
        modal.remove();
        carregarAlimentos();
    };
} 