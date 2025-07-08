const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('virtual_pantry.db');
const app = express();
const PORT = process.env.PORT || 3001;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'J@fonso092007';
const cors = require('cors');
const path = require('path');

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // Permite requests sem origin (ex: Postman)
    if (
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com') ||
      origin === 'http://localhost:10000' ||
      origin === 'http://localhost:3000' ||
      origin === 'http://localhost:5000'
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Criação das tabelas se não existirem
db.serialize(() => {
    // Tabela de utilizadores
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

    // Tabela de alimentos
    db.run(`
    CREATE TABLE IF NOT EXISTS alimentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      quantidade TEXT NOT NULL,
      validade TEXT NOT NULL,
      imagem TEXT,
      user_id INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

    // Tabela de receitas
    db.run(`
    CREATE TABLE IF NOT EXISTS receitas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      ingredientes TEXT NOT NULL, -- JSON string
      procedimento TEXT NOT NULL,
      imagem TEXT,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

    // Tabela de banco de nomes (para autocomplete)
    db.run(`
    CREATE TABLE IF NOT EXISTS banco_nomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      UNIQUE(nome, user_id)
    )
  `);

    // Tabela de banco de imagens
    db.run(`
    CREATE TABLE IF NOT EXISTS banco_imagens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      imagem TEXT NOT NULL, -- Base64
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      UNIQUE(nome, user_id)
    )
  `);

    // Tabela de ementa semanal
    db.run(`
    CREATE TABLE IF NOT EXISTS ementa_semanal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dia_semana TEXT NOT NULL, -- segunda, terca, quarta, etc.
      tipo_refeicao TEXT NOT NULL, -- almoco, jantar
      receita_id INTEGER,
      semana TEXT NOT NULL, -- formato: YYYY-WW (ex: 2024-01)
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(receita_id) REFERENCES receitas(id) ON DELETE SET NULL,
      FOREIGN KEY(user_id) REFERENCES users(id),
      UNIQUE(dia_semana, tipo_refeicao, semana, user_id)
    )
  `);

    // Criar tabela lista_manual
    db.run(`
    CREATE TABLE IF NOT EXISTS lista_manual (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      quantidade REAL,
      unidade TEXT,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/test-db', (req, res) => {
    db.all('SELECT name FROM sqlite_master WHERE type="table"', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ tables: rows });
    });
});

// Registo de utilizador
app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e password são obrigatórios.' });

    // Hash da password
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: 'Erro ao encriptar password.' });

        db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hash], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Email já registado.' });
                }
                return res.status(500).json({ error: err.message });
            }
            // Cria token JWT
            const token = jwt.sign({ userId: this.lastID, email }, SECRET, { expiresIn: '7d' });
            res.json({ token });
        });
    });
});

// Login de utilizador
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e password são obrigatórios.' });

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(400).json({ error: 'Email ou password inválidos.' });

        bcrypt.compare(password, user.password, (err, result) => {
            if (err) return res.status(500).json({ error: 'Erro ao verificar password.' });
            if (!result) return res.status(400).json({ error: 'Email ou password inválidos.' });

            // Cria token JWT
            const token = jwt.sign({ userId: user.id, email }, SECRET, { expiresIn: '7d' });
            res.json({ token });
        });
    });
});

// Mudar password
app.post('/api/change-password', authenticateToken, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Password atual e nova password são obrigatórias.' });
    }
    
    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'A nova password deve ter pelo menos 6 caracteres.' });
    }
    
    // Verificar password atual
    db.get('SELECT password FROM users WHERE id = ?', [req.user.userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });
        
        bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!isMatch) return res.status(401).json({ error: 'Password atual incorreta.' });
            
            // Hash da nova password
            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                if (err) return res.status(500).json({ error: err.message });
                
                // Atualizar password
                db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.userId], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    res.json({ success: true, message: 'Password alterada com sucesso.' });
                });
            });
        });
    });
});

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Espera "Bearer <token>"
    if (!token) return res.status(401).json({ error: 'Token não fornecido.' });

    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido.' });
        req.user = user; // userId e email
        next();
    });
}

app.get('/api/alimentos', authenticateToken, (req, res) => {
    db.all('SELECT * FROM alimentos WHERE user_id = ?', [req.user.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/alimentos', authenticateToken, (req, res) => {
    const { nome, quantidade, validade, imagem } = req.body;
    if (!nome || !quantidade || !validade) return res.status(400).json({ error: 'Campos obrigatórios em falta.' });

    db.run(
        'INSERT INTO alimentos (nome, quantidade, validade, imagem, user_id) VALUES (?, ?, ?, ?, ?)',
        [nome, quantidade, validade, imagem || '', req.user.userId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, nome, quantidade, validade, imagem });
        }
    );
});

app.put('/api/alimentos/:id', authenticateToken, (req, res) => {
    const { nome, quantidade, validade, imagem } = req.body;
    db.run(
        'UPDATE alimentos SET nome = ?, quantidade = ?, validade = ?, imagem = ? WHERE id = ? AND user_id = ?',
        [nome, quantidade, validade, imagem || '', req.params.id, req.user.userId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Alimento não encontrado.' });
            res.json({ success: true });
        }
    );
});

app.delete('/api/alimentos/:id', authenticateToken, (req, res) => {
    db.run(
        'DELETE FROM alimentos WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.userId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Alimento não encontrado.' });
            res.json({ success: true });
        }
    );
});

// Rotas para receitas
app.get('/api/receitas', authenticateToken, (req, res) => {
    db.all('SELECT * FROM receitas WHERE user_id = ? ORDER BY created_at DESC', [req.user.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Parse ingredientes JSON
        const receitas = rows.map(row => ({
            ...row,
            ingredientes: JSON.parse(row.ingredientes || '[]')
        }));
        res.json(receitas);
    });
});

app.post('/api/receitas', authenticateToken, (req, res) => {
    const { titulo, ingredientes, procedimento, imagem } = req.body;
    if (!titulo || !ingredientes || !procedimento) {
        return res.status(400).json({ error: 'Título, ingredientes e procedimento são obrigatórios.' });
    }

    const ingredientesJson = JSON.stringify(ingredientes);
    
    db.run(
        'INSERT INTO receitas (titulo, ingredientes, procedimento, imagem, user_id) VALUES (?, ?, ?, ?, ?)',
        [titulo, ingredientesJson, procedimento, imagem || '', req.user.userId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ 
                id: this.lastID, 
                titulo, 
                ingredientes: JSON.parse(ingredientesJson), 
                procedimento, 
                imagem 
            });
        }
    );
});

app.put('/api/receitas/:id', authenticateToken, (req, res) => {
    const { titulo, ingredientes, procedimento, imagem } = req.body;
    if (!titulo || !ingredientes || !procedimento) {
        return res.status(400).json({ error: 'Título, ingredientes e procedimento são obrigatórios.' });
    }

    const ingredientesJson = JSON.stringify(ingredientes);
    
    db.run(
        'UPDATE receitas SET titulo = ?, ingredientes = ?, procedimento = ?, imagem = ? WHERE id = ? AND user_id = ?',
        [titulo, ingredientesJson, procedimento, imagem || '', req.params.id, req.user.userId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Receita não encontrada.' });
            res.json({ success: true });
        }
    );
});

app.delete('/api/receitas/:id', authenticateToken, (req, res) => {
    db.run(
        'DELETE FROM receitas WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.userId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Receita não encontrada.' });
            res.json({ success: true });
        }
    );
});

// Rotas para banco de nomes (autocomplete)
app.get('/api/banco-nomes', authenticateToken, (req, res) => {
    const { termo } = req.query;
    let query = 'SELECT nome FROM banco_nomes WHERE user_id = ?';
    let params = [req.user.userId];
    
    if (termo) {
        query += ' AND nome LIKE ?';
        params.push(`%${termo}%`);
    }
    
    query += ' ORDER BY nome LIMIT 10';
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const nomes = rows.map(row => row.nome);
        res.json(nomes);
    });
});

app.post('/api/banco-nomes', authenticateToken, (req, res) => {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório.' });

    db.run(
        'INSERT OR IGNORE INTO banco_nomes (nome, user_id) VALUES (?, ?)',
        [nome.toLowerCase().trim(), req.user.userId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.delete('/api/banco-nomes/:nome', authenticateToken, (req, res) => {
    db.run(
        'DELETE FROM banco_nomes WHERE nome = ? AND user_id = ?',
        [req.params.nome, req.user.userId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// Rotas para banco de imagens
app.get('/api/banco-imagens', authenticateToken, (req, res) => {
    db.all('SELECT nome, imagem FROM banco_imagens WHERE user_id = ? ORDER BY nome', [req.user.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const imagens = {};
        rows.forEach(row => {
            imagens[row.nome] = row.imagem;
        });
        res.json(imagens);
    });
});

app.post('/api/banco-imagens', authenticateToken, (req, res) => {
    const { nome, imagem } = req.body;
    if (!nome || !imagem) return res.status(400).json({ error: 'Nome e imagem são obrigatórios.' });

    db.run(
        'INSERT OR REPLACE INTO banco_imagens (nome, imagem, user_id) VALUES (?, ?, ?)',
        [nome.toLowerCase().trim(), imagem, req.user.userId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.delete('/api/banco-imagens/:nome', authenticateToken, (req, res) => {
    db.run(
        'DELETE FROM banco_imagens WHERE nome = ? AND user_id = ?',
        [req.params.nome, req.user.userId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// Rotas para ementa semanal
app.get('/api/ementa-semanal', authenticateToken, (req, res) => {
    const { semana } = req.query;
    
    let query = `
        SELECT e.*, r.titulo, r.imagem 
        FROM ementa_semanal e 
        LEFT JOIN receitas r ON e.receita_id = r.id 
        WHERE e.user_id = ?
    `;
    
    let params = [req.user.userId];
    
    // Se uma semana específica foi fornecida, filtrar por ela
    if (semana) {
        query += ` AND e.semana = ?`;
        params.push(semana);
    }
    
    query += `
        ORDER BY 
            CASE e.dia_semana 
                WHEN 'segunda' THEN 1 
                WHEN 'terca' THEN 2 
                WHEN 'quarta' THEN 3 
                WHEN 'quinta' THEN 4 
                WHEN 'sexta' THEN 5 
                WHEN 'sabado' THEN 6 
                WHEN 'domingo' THEN 7 
            END,
            CASE e.tipo_refeicao 
                WHEN 'almoco' THEN 1 
                WHEN 'jantar' THEN 2 
            END
    `;
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Retornar array simples para facilitar o frontend
        const ementa = rows.map(row => ({
            id: row.id,
            dia: row.dia_semana,
            tipo_refeicao: row.tipo_refeicao,
            receita_id: row.receita_id,
            receita_titulo: row.titulo,
            receita_imagem: row.imagem,
            semana: row.semana
        }));
        
        res.json(ementa);
    });
});

app.post('/api/ementa-semanal', authenticateToken, (req, res) => {
    const { dia, tipo_refeicao, receita_id, semana } = req.body;
    if (!dia || !tipo_refeicao || !semana) {
        return res.status(400).json({ error: 'Dia, tipo de refeição e semana são obrigatórios.' });
    }

    db.run(
        'INSERT OR REPLACE INTO ementa_semanal (dia_semana, tipo_refeicao, receita_id, semana, user_id) VALUES (?, ?, ?, ?, ?)',
        [dia, tipo_refeicao, receita_id || null, semana, req.user.userId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.delete('/api/ementa-semanal/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    
    db.run(
        'DELETE FROM ementa_semanal WHERE id = ? AND user_id = ?',
        [id, req.user.userId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Refeição não encontrada.' });
            res.json({ success: true });
        }
    );
});

// Geração automática da lista de compras
app.get('/api/lista-compras', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const dataFinal = new Date(hoje.getTime() + 29 * 24 * 60 * 60 * 1000); // 30 dias

    // Helper para obter todas as semanas entre hoje e dataFinal
    function getSemanasNoIntervalo(inicio, fim) {
        const semanas = new Set();
        let data = new Date(inicio);
        while (data <= fim) {
            const ano = data.getFullYear();
            const primeiroDiaAno = new Date(ano, 0, 1);
            const diasParaPrimeiraSegunda = primeiroDiaAno.getDay() === 0 ? 1 : 8 - primeiroDiaAno.getDay();
            const primeiraSegundaAno = new Date(ano, 0, 1 + diasParaPrimeiraSegunda);
            const diasDesdePrimeiraSegunda = Math.floor((data - primeiraSegundaAno) / (24 * 60 * 60 * 1000));
            const semana = Math.floor(diasDesdePrimeiraSegunda / 7) + 1;
            semanas.add(`${ano}-${semana.toString().padStart(2, '0')}`);
            data.setDate(data.getDate() + 1);
        }
        return Array.from(semanas);
    }
    const semanas = getSemanasNoIntervalo(hoje, dataFinal);

    // Mapear dia_semana para índice (segunda=0, ..., domingo=6)
    const diasMap = {
        'segunda': 0,
        'terca': 1,
        'quarta': 2,
        'quinta': 3,
        'sexta': 4,
        'sabado': 5,
        'domingo': 6
    };

    // Buscar ementa_semanal para todas as semanas no intervalo
    const placeholders = semanas.map(() => '?').join(',');
    db.all(
        `SELECT e.*, r.ingredientes
         FROM ementa_semanal e
         LEFT JOIN receitas r ON e.receita_id = r.id
         WHERE e.user_id = ? AND e.semana IN (${placeholders})`,
        [userId, ...semanas],
        (err, ementaRows) => {
            if (err) return res.status(500).json({ error: err.message });
            // LOG: mostrar todas as entradas devolvidas pela query
            console.log('Ementa semanal devolvida pela query:', ementaRows.map(e => ({ id: e.id, semana: e.semana, dia_semana: e.dia_semana, receita_id: e.receita_id })));
            // Calcular data exata de cada entrada e filtrar para os próximos 30 dias
            const entradasValidas = ementaRows.filter(item => {
                const [ano, semana] = item.semana.split('-').map(Number);
                // Calcular a data da segunda-feira da semana
                const primeiroDiaAno = new Date(ano, 0, 1);
                const diasParaPrimeiraSegunda = primeiroDiaAno.getDay() === 0 ? 1 : 8 - primeiroDiaAno.getDay();
                const primeiraSegundaAno = new Date(ano, 0, 1 + diasParaPrimeiraSegunda);
                const dataSegunda = new Date(primeiraSegundaAno.getTime() + (semana - 1) * 7 * 24 * 60 * 60 * 1000);
                const diaOffset = diasMap[item.dia_semana];
                if (diaOffset === undefined) {
                    console.log('Dia da semana não reconhecido:', item.dia_semana);
                    return false;
                }
                const dataRefeicao = new Date(dataSegunda.getTime() + diaOffset * 24 * 60 * 60 * 1000);
                dataRefeicao.setHours(0,0,0,0);
                const dentro = dataRefeicao >= hoje && dataRefeicao <= dataFinal;
                // LOG: mostrar cálculo da data exata e se está dentro do intervalo
                console.log(`Refeição: semana=${item.semana}, dia_semana=${item.dia_semana}, dataExata=${dataRefeicao.toISOString().slice(0,10)}, dentroIntervalo=${dentro}`);
                return dentro;
            });
            // LOG: mostrar entradas válidas
            console.log('Entradas válidas para os próximos 30 dias:', entradasValidas.map(e => ({ id: e.id, semana: e.semana, dia_semana: e.dia_semana, receita_id: e.receita_id })));
            // Buscar alimentos da despensa
            db.all('SELECT * FROM alimentos WHERE user_id = ?', [userId], (err, alimentosRows) => {
                if (err) return res.status(500).json({ error: err.message });

                // Juntar todos os ingredientes das receitas agendadas
                let ingredientesNecessarios = [];
                entradasValidas.forEach(item => {
                    if (item.ingredientes) {
                        try {
                            const ingredientes = JSON.parse(item.ingredientes);
                            ingredientes.forEach(ing => {
                                ingredientesNecessarios.push({
                                    nome: (ing.nome || '').toLowerCase().trim(),
                                    quantidade: parseFloat(ing.quantidade) || 1,
                                    unidade: (ing.unidade || '').toLowerCase().trim() || '',
                                    motivo: 'receita'
                                });
                            });
                        } catch {}
                    }
                });

                // Agrupar ingredientes por nome+unidade
                const agrupados = {};
                ingredientesNecessarios.forEach(ing => {
                    const key = ing.nome + '|' + ing.unidade;
                    if (!agrupados[key]) {
                        agrupados[key] = { ...ing };
                    } else {
                        agrupados[key].quantidade += ing.quantidade;
                    }
                });

                // Subtrair o que existe na despensa
                alimentosRows.forEach(alimento => {
                    const nome = (alimento.nome || '').toLowerCase().trim();
                    Object.keys(agrupados).forEach(key => {
                        if (key.startsWith(nome + '|')) {
                            let qtdDespensa = parseFloat(alimento.quantidade);
                            if (!isNaN(qtdDespensa)) {
                                agrupados[key].quantidade -= qtdDespensa;
                            }
                        }
                    });
                });

                // Filtrar só os que faltam (quantidade > 0)
                const listaCompras = Object.values(agrupados)
                    .filter(ing => ing.quantidade > 0)
                    .map(ing => ({
                        nome: ing.nome,
                        quantidade: ing.quantidade,
                        unidade: ing.unidade,
                        motivo: ing.motivo
                    }));

                res.json(listaCompras);
            });
        }
    );
});

// --- Endpoints para lista manual ---
// Listar itens manuais
app.get('/api/lista-manual', authenticateToken, (req, res) => {
    db.all('SELECT id, nome, quantidade, unidade FROM lista_manual WHERE user_id = ? ORDER BY created_at', [req.user.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
// Adicionar item manual
app.post('/api/lista-manual', authenticateToken, (req, res) => {
    const { nome, quantidade, unidade } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório.' });
    db.run('INSERT INTO lista_manual (nome, quantidade, unidade, user_id) VALUES (?, ?, ?, ?)', [nome.trim(), quantidade || null, unidade || null, req.user.userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, nome, quantidade, unidade });
    });
});
// Remover item manual por id
app.delete('/api/lista-manual/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM lista_manual WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});
// Esvaziar lista manual do user
app.delete('/api/lista-manual', authenticateToken, (req, res) => {
    db.run('DELETE FROM lista_manual WHERE user_id = ?', [req.user.userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- Endpoints para dashboard ---
// 1. Produtos a expirar (<3 dias)
app.get('/api/dashboard/expirar', authenticateToken, (req, res) => {
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const tresDias = new Date(hoje.getTime() + 2 * 24 * 60 * 60 * 1000);
    db.all('SELECT id, nome, quantidade, validade FROM alimentos WHERE user_id = ?', [req.user.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const expirar = rows.filter(a => {
            const v = new Date(a.validade);
            v.setHours(0,0,0,0);
            return v >= hoje && v <= tresDias;
        });
        res.json(expirar);
    });
});
// 2. Baixo stock (stock insuficiente para qualquer receita)
app.get('/api/dashboard/baixo-stock', authenticateToken, (req, res) => {
    db.all('SELECT * FROM alimentos WHERE user_id = ?', [req.user.userId], (err, alimentos) => {
        if (err) return res.status(500).json({ error: err.message });
        db.all('SELECT ingredientes FROM receitas WHERE user_id = ?', [req.user.userId], (err, receitas) => {
            if (err) return res.status(500).json({ error: err.message });
            // Para cada alimento, ver se existe alguma receita em que a quantidade na despensa é < necessária
            const baixoStock = alimentos.filter(alimento => {
                const nomeAlimento = (alimento.nome || '').toLowerCase().trim();
                let quantidadeAlimento = parseFloat(alimento.quantidade);
                if (isNaN(quantidadeAlimento)) return false;
                // Procurar em todas as receitas
                return receitas.some(r => {
                    let ings = [];
                    try { ings = JSON.parse(r.ingredientes); } catch {}
                    return ings.some(ing => {
                        const nomeIng = (ing.nome || '').toLowerCase().trim();
                        const unidadeIng = (ing.unidade || '').toLowerCase().trim();
                        // Só comparar se unidade for igual
                        if (nomeIng === nomeAlimento && unidadeIng && alimento.quantidade.includes(unidadeIng)) {
                            return quantidadeAlimento < parseFloat(ing.quantidade);
                        }
                        // Se não houver unidade, comparar só nome
                        if (nomeIng === nomeAlimento && !unidadeIng) {
                            return quantidadeAlimento < parseFloat(ing.quantidade);
                        }
                        return false;
                    });
                });
            });
            res.json(baixoStock);
        });
    });
});
// 3. Desperdício evitado (alimentos consumidos na semana cujo prazo expirava nessa semana)
app.get('/api/dashboard/desperdicio', authenticateToken, (req, res) => {
    // Supondo que existe uma tabela alimentos_consumidos (id, nome, quantidade, validade, data_consumo, user_id)
    // Se não existir, devolve vazio
    db.all('SELECT name FROM sqlite_master WHERE type="table" AND name="alimentos_consumidos"', [], (err, tables) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!tables.length) return res.json([]);
        // Calcular semana atual
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const primeiroDiaAno = new Date(ano, 0, 1);
        const diasParaPrimeiraSegunda = primeiroDiaAno.getDay() === 0 ? 1 : 8 - primeiroDiaAno.getDay();
        const primeiraSegundaAno = new Date(ano, 0, 1 + diasParaPrimeiraSegunda);
        const diasDesdePrimeiraSegunda = Math.floor((hoje - primeiraSegundaAno) / (24 * 60 * 60 * 1000));
        const semanaAtual = Math.floor(diasDesdePrimeiraSegunda / 7) + 1;
        // Buscar alimentos consumidos esta semana
        db.all('SELECT id, nome, quantidade, validade, data_consumo FROM alimentos_consumidos WHERE user_id = ?', [req.user.userId], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            const resultado = rows.filter(a => {
                // Calcular semana de validade
                const v = new Date(a.validade);
                const diasDesdePrimeiraSegundaVal = Math.floor((v - primeiraSegundaAno) / (24 * 60 * 60 * 1000));
                const semanaVal = Math.floor(diasDesdePrimeiraSegundaVal / 7) + 1;
                // Calcular semana de consumo
                const c = new Date(a.data_consumo);
                const diasDesdePrimeiraSegundaCons = Math.floor((c - primeiraSegundaAno) / (24 * 60 * 60 * 1000));
                const semanaCons = Math.floor(diasDesdePrimeiraSegundaCons / 7) + 1;
                return semanaVal === semanaAtual && semanaCons === semanaAtual;
            });
            res.json(resultado);
        });
    });
});

// Servir ficheiros estáticos do frontend
app.use(express.static(path.join(__dirname, 'public')));

// Fallback para SPA: qualquer rota não-API desconhecida serve index.html
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor a correr em http://localhost:${PORT}`);
});

