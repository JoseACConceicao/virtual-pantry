// receitas.js

// --- Funções para backend ---
function getToken() {
    return localStorage.getItem('token');
}

const API_BASE = '';

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

// --- Sistema de banco de nomes dinâmicos ---
function normalizarNome(nome) {
    // Plural → Singular (regras básicas)
    const pluralParaSingular = {
        's': '', // tomates → tomate
        'es': 'e', // ovos → ovo
        'ões': 'ão', // pães → pão
        'is': 'l', // grãos → grão
    };
    
    let nomeNormalizado = nome.toLowerCase().trim();
    
    // Aplicar regras de plural → singular
    for (const [plural, singular] of Object.entries(pluralParaSingular)) {
        if (nomeNormalizado.endsWith(plural)) {
            nomeNormalizado = nomeNormalizado.slice(0, -plural.length) + singular;
            break;
        }
    }
    
    return nomeNormalizado;
}

async function adicionarNomeAoBanco(nome) {
    const nomeNormalizado = normalizarNome(nome);
    try {
        await apiFetch('/api/banco-nomes', {
            method: 'POST',
            body: JSON.stringify({ nome: nomeNormalizado })
        });
        return nomeNormalizado;
    } catch (err) {
        console.error('Erro ao adicionar nome ao banco:', err);
        return nomeNormalizado;
    }
}

async function carregarNomesExistentes() {
    try {
        const nomes = await apiFetch('/api/banco-nomes');
        return nomes;
    } catch (err) {
        console.error('Erro ao carregar nomes:', err);
        return [];
    }
}

async function obterSugestoes(termo) {
    try {
        const sugestoes = await apiFetch(`/api/banco-nomes?termo=${encodeURIComponent(termo)}`);
        return sugestoes.slice(0, 5); // Máximo 5 sugestões
    } catch (err) {
        console.error('Erro ao obter sugestões:', err);
        return [];
    }
}

// --- Helpers de imagem (reutilizados do modal dos alimentos) ---
function criarWidgetImagemReceita(modal) {
    // Cria os botões e inputs para imagem
    const div = document.createElement('div');
    div.className = 'foto-btns';
    div.style.display = 'flex';
    div.style.gap = '0.5rem';
    div.style.marginBottom = '0.5rem';
    div.innerHTML = `
        <button type="button" class="btn-camera btn-galeria">Tirar foto</button>
        <button type="button" class="btn-ficheiro btn-galeria">Escolher dos ficheiros</button>
        <button type="button" class="btn-galeria-imagens btn-galeria">Selecionar da galeria</button>
        <input type="file" accept="image/*" capture="environment" id="input-foto-camera" style="display:none;">
        <input type="file" accept="image/*" id="input-foto-ficheiro" style="display:none;">
        <div id="galeria-fotos" class="galeria-fotos" style="display:none;"></div>
        <div id="preview-foto" class="preview-foto"></div>
    `;
    modal.querySelector('.imagem-receita').appendChild(div);

    let imagemSelecionadaGaleria = null;
    const inputFotoCamera = div.querySelector('#input-foto-camera');
    const inputFotoFicheiro = div.querySelector('#input-foto-ficheiro');
    function handleFileInputChange(e) {
        imagemSelecionadaGaleria = null;
        const file = e.target.files[0];
        const preview = div.querySelector('#preview-foto');
        if (file) {
            const reader = new FileReader();
            reader.onload = function(ev) {
                preview.innerHTML = `<img src="${ev.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        } else {
            preview.innerHTML = '';
        }
    }
    inputFotoCamera.addEventListener('change', handleFileInputChange);
    inputFotoFicheiro.addEventListener('change', handleFileInputChange);
    // Botão Tirar foto
    div.querySelector('.btn-camera').onclick = function() {
        inputFotoCamera.value = '';
        inputFotoCamera.click();
    };
    // Botão Escolher dos ficheiros
    div.querySelector('.btn-ficheiro').onclick = function() {
        inputFotoFicheiro.value = '';
        inputFotoFicheiro.click();
    };
    // Galeria de imagens
    div.querySelector('.btn-galeria-imagens').onclick = async function() {
        const galeriaDiv = div.querySelector('#galeria-fotos');
        if (galeriaDiv.style.display === 'none') {
            galeriaDiv.innerHTML = '';
            try {
                const banco = await apiFetch('/api/banco-imagens');
                const keys = Object.keys(banco);
                if (keys.length === 0) {
                    galeriaDiv.innerHTML = '<span style="color:#bbb;">Sem imagens guardadas.</span>';
                } else {
                    keys.forEach(nome => {
                        const img = document.createElement('img');
                        img.src = banco[nome];
                        img.alt = nome;
                        const item = document.createElement('div');
                        item.className = 'galeria-item';
                        item.title = nome;
                        item.appendChild(img);
                        item.onclick = function() {
                            galeriaDiv.querySelectorAll('.galeria-item').forEach(i => i.classList.remove('selected'));
                            item.classList.add('selected');
                            imagemSelecionadaGaleria = banco[nome];
                            div.querySelector('#preview-foto').innerHTML = `<img src="${banco[nome]}" alt="Preview">`;
                            inputFotoCamera.value = '';
                            inputFotoFicheiro.value = '';
                        };
                        galeriaDiv.appendChild(item);
                    });
                }
            } catch (err) {
                console.error('Erro ao carregar banco de imagens:', err);
                galeriaDiv.innerHTML = '<span style="color:#bbb;">Erro ao carregar imagens.</span>';
            }
            galeriaDiv.style.display = 'flex';
        } else {
            galeriaDiv.style.display = 'none';
        }
    };
    return {
        getImagem: function() {
            if (imagemSelecionadaGaleria) return imagemSelecionadaGaleria;
            const fileCamera = inputFotoCamera.files[0];
            const fileFicheiro = inputFotoFicheiro.files[0];
            return new Promise((resolve) => {
                if (imagemSelecionadaGaleria) {
                    resolve(imagemSelecionadaGaleria);
                } else if (fileCamera) {
                    const reader = new FileReader();
                    reader.onload = ev => resolve(ev.target.result);
                    reader.readAsDataURL(fileCamera);
                } else if (fileFicheiro) {
                    const reader = new FileReader();
                    reader.onload = ev => resolve(ev.target.result);
                    reader.readAsDataURL(fileFicheiro);
                } else {
                    resolve(null);
                }
            });
        }
    };
}

// --- Modal de adicionar receita ---
function criarModalAdicionarReceita() {
    // HTML do modal como string
    const html = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Nova Receita</h2>
                <button class="btn-fechar"><i class="fa-solid fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="form-adicionar-receita" autocomplete="off">
                    <div class="imagem-receita"></div>
                    <label for="titulo">Título</label>
                    <input type="text" name="titulo" id="titulo" required>
                    <label>Ingredientes</label>
                    <div class="ingredientes-list"></div>
                    <button type="button" class="btn-galeria btn-add-ingrediente" style="margin-bottom:0.7rem;">Adicionar ingrediente</button>
                    <label for="procedimento">Procedimento</label>
                    <textarea name="procedimento" id="procedimento" rows="4" required style="resize:vertical;"></textarea>
                    <div class="modal-actions">
                        <button type="submit" class="btn-add btn-galeria">Adicionar</button>
                        <button type="button" class="btn-cancel btn-galeria">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    abrirModal(html);
    // Selecionar o modal criado
    const modal = document.querySelector('.modal-overlay .modal-content');
    if (!modal) return;
    // Imagem
    const imgWidget = criarWidgetImagemReceita(modal);
    // Ingredientes dinâmicos com autocomplete
    const ingredientesDiv = modal.querySelector('.ingredientes-list');
    let nomesExistentes = [];
    carregarNomesExistentes().then(nomes => { nomesExistentes = nomes; });
    function criarAutocomplete(input) {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        dropdown.style.cssText = `position: absolute;top: 100%;left: 0;right: 0;background: white;border: 1px solid #D1A980;border-top: none;border-radius: 0 0 8px 8px;max-height: 150px;overflow-y: auto;z-index: 1000;display: none;`;
        wrapper.appendChild(dropdown);
        input.addEventListener('input', async function() {
            const valor = this.value.toLowerCase();
            dropdown.innerHTML = '';
            if (valor.length < 2) { dropdown.style.display = 'none'; return; }
            try {
                const sugestoes = await obterSugestoes(valor);
                if (sugestoes.length > 0) {
                    sugestoes.forEach(nome => {
                        const item = document.createElement('div');
                        item.textContent = nome;
                        item.style.cssText = `padding: 0.5rem 0.8rem;cursor: pointer;border-bottom: 1px solid #eee;`;
                        item.addEventListener('mouseenter', () => { item.style.backgroundColor = '#f0f0f0'; });
                        item.addEventListener('mouseleave', () => { item.style.backgroundColor = 'white'; });
                        item.addEventListener('click', () => { input.value = nome; dropdown.style.display = 'none'; });
                        dropdown.appendChild(item);
                    });
                    dropdown.style.display = 'block';
                } else { dropdown.style.display = 'none'; }
            } catch (err) { console.error('Erro no autocomplete:', err); dropdown.style.display = 'none'; }
        });
        document.addEventListener('click', function(e) {
            if (!wrapper.contains(e.target)) { dropdown.style.display = 'none'; }
        });
    }
    function addIngrediente(valor = '') {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.gap = '0.5rem';
        div.style.marginBottom = '0.3rem';
        div.style.alignItems = 'center';
        const nomeInput = document.createElement('input');
        nomeInput.type = 'text';
        nomeInput.className = 'input-ingrediente-nome';
        nomeInput.value = valor;
        nomeInput.required = true;
        nomeInput.placeholder = 'Nome do ingrediente';
        nomeInput.style.flex = '2';
        const qtdInput = document.createElement('input');
        qtdInput.type = 'number';
        qtdInput.className = 'input-ingrediente-qtd';
        qtdInput.required = true;
        qtdInput.placeholder = 'Qtd';
        qtdInput.min = '0';
        qtdInput.step = '0.1';
        qtdInput.style.flex = '1';
        const unidadeSelect = document.createElement('select');
        unidadeSelect.className = 'input-ingrediente-unidade';
        unidadeSelect.style.flex = '1';
        ['g', 'kg', 'ml', 'l', 'un', 'colher', 'xícara'].forEach(unidade => {
            const option = document.createElement('option');
            option.value = unidade;
            option.textContent = unidade;
            unidadeSelect.appendChild(option);
        });
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn-galeria btn-remove-ingrediente';
        removeBtn.textContent = '×';
        removeBtn.onclick = () => div.remove();
        div.appendChild(nomeInput);
        div.appendChild(qtdInput);
        div.appendChild(unidadeSelect);
        div.appendChild(removeBtn);
        ingredientesDiv.appendChild(div);
        criarAutocomplete(nomeInput);
    }
    // Começa com um campo
    addIngrediente();
    modal.querySelector('.btn-add-ingrediente').onclick = () => addIngrediente();
    // Cancelar
    modal.querySelector('.btn-cancel').onclick = function() { fecharModal(); };
    // Submissão
    modal.querySelector('#form-adicionar-receita').onsubmit = async function(e) {
        e.preventDefault();
        const form = e.target;
        const titulo = form.titulo.value.trim();
        const procedimento = form.procedimento.value.trim();
        // Processar ingredientes estruturados
        const ingredientes = [];
        const nomeInputs = form.querySelectorAll('.input-ingrediente-nome');
        const qtdInputs = form.querySelectorAll('.input-ingrediente-qtd');
        const unidadeSelects = form.querySelectorAll('.input-ingrediente-unidade');
        for (let i = 0; i < nomeInputs.length; i++) {
            const nomeInput = nomeInputs[i];
            const qtdInput = qtdInputs[i];
            const unidadeSelect = unidadeSelects[i];
            if (nomeInput.value.trim() && qtdInput.value) {
                const nome = nomeInput.value.trim();
                const quantidade = qtdInput.value;
                const unidade = unidadeSelect.value;
                ingredientes.push({ nome, quantidade, unidade });
            }
        }
        if (!titulo || !ingredientes.length || !procedimento) {
            alert('Preenche todos os campos obrigatórios.');
            return;
        }
        // Adicionar nomes ao banco
        for (const ing of ingredientes) {
            await adicionarNomeAoBanco(ing.nome);
        }
        // Imagem
        const imagem = await imgWidget.getImagem();
        // Enviar para backend
        try {
            await apiFetch('/api/receitas', {
                method: 'POST',
                body: JSON.stringify({
                    titulo,
                    ingredientes,
                    procedimento,
                    imagem
                })
            });
            fecharModal();
            await carregarReceitas();
        } catch (err) {
            alert('Erro ao adicionar receita: ' + err.message);
        }
    };
}

// --- Funções para backend ---
let receitas = [];
let receitasFiltradas = [];

async function carregarReceitas() {
    try {
        receitas = await apiFetch('/api/receitas');
        receitasFiltradas = receitas;
        console.log('Receitas carregadas:', receitas);
        renderReceitas();
    } catch (err) {
        console.error('Erro ao carregar receitas:', err);
        receitas = [];
        receitasFiltradas = [];
        renderReceitas(); // Renderizar mesmo com erro
    }
}

// --- Renderização das receitas ---
function renderReceitas() {
    const lista = document.querySelector('.receitas-list');
    if (!lista) return;
    lista.innerHTML = '';
    
    // Card de adicionar receita (igual ao da despensa)
    const addCard = document.createElement('a');
    addCard.href = '#';
    addCard.className = 'card card-link card-add-receita';
    addCard.innerHTML = `
        <div class="card-icon"><i class="fa-solid fa-plus"></i></div>
        <div class="card-title">Adicionar receita</div>
    `;
    addCard.onclick = function(e) {
        e.preventDefault();
        criarModalAdicionarReceita();
        document.getElementById('modal-adicionar-receita').style.display = 'flex';
    };
    lista.appendChild(addCard);
    
    // Renderizar receitas filtradas
    (receitasFiltradas || []).forEach((r) => {
        const card = document.createElement('div');
        card.className = 'receita-card';
        const ingredientesTexto = r.ingredientes ? 
            r.ingredientes.map(i => `${i.nome} (${i.quantidade}${i.unidade})`).join(', ') :
            'Sem ingredientes';
        card.innerHTML = `
            <button class="btn-eliminar-receita" onclick="eliminarReceita(${r.id})">
                <i class="fa-solid fa-trash"></i>
            </button>
            <img src="${r.imagem || 'imagens/receitas.jpg'}" alt="${r.titulo}">
            <div class="receita-info">
                <h2>${r.titulo}</h2>
                <span>${ingredientesTexto}</span>
            </div>
            <a href="#" class="ver-btn">Ver</a>
        `;
        // Event listener para o botão Ver
        card.querySelector('.ver-btn').onclick = function(e) {
            e.preventDefault();
            mostrarModalDetalhesReceita(r);
        };
        lista.appendChild(card);
    });
}

// --- Filtro de pesquisa ---
document.addEventListener('DOMContentLoaded', function() {
    const inputPesquisa = document.getElementById('pesquisa-receitas');
    if (inputPesquisa) {
        inputPesquisa.addEventListener('input', function() {
            const termo = this.value.toLowerCase();
            receitasFiltradas = receitas.filter(r =>
                r.titulo.toLowerCase().includes(termo) ||
                (r.ingredientes && r.ingredientes.some(ing => ing.nome && ing.nome.toLowerCase().includes(termo)))
            );
            renderReceitas();
        });
    }
});

// --- Funções para Ementa Semanal ---
let ementaSemanal = [];
let semanaAtual = getSemanaAtual();

// Função para obter a semana atual no formato YYYY-WW
function getSemanaAtual() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    
    // Calcular o primeiro dia do ano
    const primeiroDiaAno = new Date(ano, 0, 1);
    
    // Encontrar a primeira segunda-feira do ano
    const diasParaPrimeiraSegunda = primeiroDiaAno.getDay() === 0 ? 1 : 8 - primeiroDiaAno.getDay();
    const primeiraSegundaAno = new Date(ano, 0, 1 + diasParaPrimeiraSegunda);
    
    // Calcular quantas semanas se passaram desde a primeira segunda-feira
    const diasDesdePrimeiraSegunda = Math.floor((hoje - primeiraSegundaAno) / (24 * 60 * 60 * 1000));
    const semana = Math.floor(diasDesdePrimeiraSegunda / 7) + 1;
    
    return `${ano}-${semana.toString().padStart(2, '0')}`;
}

// Função para obter a semana anterior
function getSemanaAnterior(semana) {
    const [ano, numSemana] = semana.split('-').map(Number);
    if (numSemana === 1) {
        return `${ano - 1}-52`;
    }
    return `${ano}-${(numSemana - 1).toString().padStart(2, '0')}`;
}

// Função para obter a próxima semana
function getProximaSemana(semana) {
    const [ano, numSemana] = semana.split('-').map(Number);
    if (numSemana === 52) {
        return `${ano + 1}-01`;
    }
    return `${ano}-${(numSemana + 1).toString().padStart(2, '0')}`;
}

// Função para formatar datas da semana
function formatarDatasSemana(semana) {
    const [ano, numSemana] = semana.split('-').map(Number);
    
    // Calcular o primeiro dia do ano
    const primeiroDiaAno = new Date(ano, 0, 1);
    
    // Encontrar a primeira segunda-feira do ano
    const diasParaPrimeiraSegunda = primeiroDiaAno.getDay() === 0 ? 1 : 8 - primeiroDiaAno.getDay();
    const primeiraSegundaAno = new Date(ano, 0, 1 + diasParaPrimeiraSegunda);
    
    // Calcular a segunda-feira da semana desejada
    const segunda = new Date(primeiraSegundaAno.getTime() + (numSemana - 1) * 7 * 24 * 60 * 60 * 1000);
    const domingo = new Date(segunda.getTime() + 6 * 24 * 60 * 60 * 1000);
    
    const opcoes = { day: '2-digit', month: '2-digit' };
    return {
        inicio: segunda.toLocaleDateString('pt-PT', opcoes),
        fim: domingo.toLocaleDateString('pt-PT', opcoes)
    };
}

// Função para alternar visibilidade da ementa
function toggleEmenta() {
    const ementaContent = document.getElementById('ementa-content');
    const btnToggle = document.getElementById('btn-toggle-ementa');
    const icon = btnToggle.querySelector('i');
    
    ementaContent.classList.toggle('collapsed');
    
    if (ementaContent.classList.contains('collapsed')) {
        icon.className = 'fa-solid fa-chevron-down';
    } else {
        icon.className = 'fa-solid fa-chevron-up';
    }
}

// Função para alternar visibilidade dos dias
function toggleDia(dia) {
    const refeicoesDia = document.getElementById(`refeicoes-${dia}`);
    const diaHeader = document.querySelector(`[data-dia="${dia}"] .dia-header`);
    const icon = diaHeader.querySelector('i');
    
    refeicoesDia.classList.toggle('collapsed');
    diaHeader.classList.toggle('collapsed');
    
    if (refeicoesDia.classList.contains('collapsed')) {
        icon.className = 'fa-solid fa-chevron-right';
    } else {
        icon.className = 'fa-solid fa-chevron-down';
    }
}

// Função para carregar ementa semanal
async function carregarEmentaSemanal(semana = semanaAtual) {
    try {
        const response = await apiFetch(`/api/ementa-semanal?semana=${semana}`);
        ementaSemanal = response || [];
        renderizarEmentaSemanal();
        atualizarNavegacaoSemana(semana);
    } catch (error) {
        console.error('Erro ao carregar ementa semanal:', error);
        ementaSemanal = [];
    }
}

// Função para atualizar a navegação da semana
function atualizarNavegacaoSemana(semana) {
    console.log('Atualizando navegação para semana:', semana);
    const datas = formatarDatasSemana(semana);
    console.log('Datas calculadas:', datas);
    
    const inicioElement = document.getElementById('data-inicio-semana');
    const fimElement = document.getElementById('data-fim-semana');
    
    if (inicioElement && fimElement) {
        inicioElement.textContent = datas.inicio;
        fimElement.textContent = datas.fim;
        console.log('Datas atualizadas no DOM');
    } else {
        console.error('Elementos de data não encontrados');
    }
    
    // Atualizar estado dos botões
    const btnAnterior = document.getElementById('btn-semana-anterior');
    const btnProxima = document.getElementById('btn-proxima-semana');
    
    // Desabilitar botão anterior se for a semana atual
    btnAnterior.disabled = semana === getSemanaAtual();
}

// Função para renderizar ementa semanal
function renderizarEmentaSemanal() {
    const dias = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
    const tiposRefeicao = ['almoco', 'jantar'];
    
    dias.forEach(dia => {
        tiposRefeicao.forEach(tipo => {
            const refeicaoItem = document.querySelector(`[data-dia="${dia}"] [data-refeicao="${tipo}"]`);
            if (refeicaoItem) {
                const refeicaoContent = refeicaoItem.querySelector('.refeicao-content');
                const ementaItem = ementaSemanal.find(item => 
                    item.dia === dia && item.tipo_refeicao === tipo
                );
                
                if (ementaItem) {
                    const receita = receitas.find(r => r.id === ementaItem.receita_id);
                    if (receita) {
                        refeicaoContent.innerHTML = `
                            <div class="receita-agendada">
                                <img src="${receita.imagem}" alt="${receita.titulo}">
                                <span class="receita-nome">${receita.titulo}</span>
                                <button class="remover-receita" onclick="removerRefeicao('${dia}', '${tipo}')">
                                    <i class="fa-solid fa-times"></i>
                                </button>
                            </div>
                        `;
                    }
                } else {
                    refeicaoContent.innerHTML = '<span class="sem-receita">Sem receita agendada</span>';
                }
            }
        });
    });
}

// Função para adicionar refeição à ementa
async function adicionarRefeicao(dia, tipoRefeicao, receitaId) {
    try {
        const response = await apiFetch('/api/ementa-semanal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dia: dia,
                tipo_refeicao: tipoRefeicao,
                receita_id: receitaId,
                semana: semanaAtual
            })
        });
        
        if (response.success) {
            await carregarEmentaSemanal(semanaAtual);
        }
    } catch (error) {
        console.error('Erro ao adicionar refeição:', error);
    }
}

// Função para remover refeição da ementa
async function removerRefeicao(dia, tipoRefeicao) {
    try {
        const ementaItem = ementaSemanal.find(item => 
            item.dia === dia && item.tipo_refeicao === tipoRefeicao
        );
        
        if (ementaItem) {
            const response = await apiFetch(`/api/ementa-semanal/${ementaItem.id}`, {
                method: 'DELETE'
            });
            
            if (response.success) {
                await carregarEmentaSemanal();
            }
        }
    } catch (error) {
        console.error('Erro ao remover refeição:', error);
    }
}

// Função para mostrar modal de seleção de receita
function mostrarModalSelecaoReceita(dia, tipoRefeicao) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Selecionar Receita</h3>
                <button class="btn-fechar" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="receitas-selecao">
                    ${receitas.map(receita => `
                        <div class="receita-opcao" onclick="selecionarReceita('${dia}', '${tipoRefeicao}', ${receita.id})">
                            <img src="${receita.imagem}" alt="${receita.titulo}">
                            <span>${receita.titulo}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Função para selecionar receita
async function selecionarReceita(dia, tipoRefeicao, receitaId) {
    await adicionarRefeicao(dia, tipoRefeicao, receitaId);
    document.querySelector('.modal-overlay').remove();
}

// Função para eliminar receita da lista
async function eliminarReceita(receitaId) {
    if (confirm('Tem certeza que deseja eliminar esta receita?')) {
        try {
            const response = await apiFetch(`/api/receitas/${receitaId}`, {
                method: 'DELETE'
            });
            
            if (response.success) {
                await carregarReceitas();
                await carregarEmentaSemanal();
            }
        } catch (error) {
            console.error('Erro ao eliminar receita:', error);
        }
    }
}

// Funções de navegação
function navegarSemanaAnterior() {
    semanaAtual = getSemanaAnterior(semanaAtual);
    carregarEmentaSemanal(semanaAtual);
}

function navegarProximaSemana() {
    semanaAtual = getProximaSemana(semanaAtual);
    carregarEmentaSemanal(semanaAtual);
}

// Event listeners
document.addEventListener('DOMContentLoaded', async function() {
    await carregarReceitas();
    await carregarEmentaSemanal();
    
    // Event listener para toggle da ementa
    const btnToggleEmenta = document.getElementById('btn-toggle-ementa');
    if (btnToggleEmenta) {
        btnToggleEmenta.addEventListener('click', toggleEmenta);
    }
    
    // Event listeners para navegação de semanas
    const btnSemanaAnterior = document.getElementById('btn-semana-anterior');
    const btnProximaSemana = document.getElementById('btn-proxima-semana');
    
    if (btnSemanaAnterior) {
        btnSemanaAnterior.addEventListener('click', navegarSemanaAnterior);
    }
    
    if (btnProximaSemana) {
        btnProximaSemana.addEventListener('click', navegarProximaSemana);
    }
    
    // Event listeners para refeições
    document.querySelectorAll('.refeicao-item').forEach(item => {
        item.addEventListener('click', function() {
            const dia = this.closest('.dia-semana').dataset.dia;
            const tipoRefeicao = this.dataset.refeicao;
            mostrarModalSelecaoReceita(dia, tipoRefeicao);
        });
    });
});

// Função para mostrar modal de detalhes da receita
function mostrarModalDetalhesReceita(receita) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:480px;">
            <div class="modal-header">
                <h2>${receita.titulo}</h2>
                <button class="btn-fechar" title="Fechar"><i class="fa-solid fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div style="display:flex;justify-content:center;margin-bottom:1rem;">
                    <img src="${receita.imagem || 'imagens/receitas.jpg'}" alt="${receita.titulo}" style="max-width:180px;max-height:180px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                </div>
                <h3>Ingredientes</h3>
                <ul style="margin-bottom:1.2rem;">
                    ${(receita.ingredientes || []).map(ing =>
                        `<li>${ing.nome} (${ing.quantidade}${ing.unidade ? ' ' + ing.unidade : ''})</li>`
                    ).join('')}
                </ul>
                <h3>Procedimento</h3>
                <div style="white-space:pre-line;">${receita.procedimento}</div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    // Fechar ao clicar no X
    modal.querySelector('.btn-fechar').onclick = function() {
        modal.remove();
    };
    // Fechar ao clicar fora do modal-content
    modal.onclick = function(e) {
        if (e.target === modal) modal.remove();
    };
} 