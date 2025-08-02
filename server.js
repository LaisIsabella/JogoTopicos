// Carregar variáveis de ambiente
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Verificar se as variáveis estão configuradas
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: Variáveis SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórias!');
    console.log('Crie um arquivo .env na raiz do projeto com suas credenciais do Supabase.');
    console.log('Exemplo:');
    console.log('SUPABASE_URL=https://seu-projeto.supabase.co');
    console.log('SUPABASE_ANON_KEY=sua-chave-anonima');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Função para calcular estatísticas da sessão
function calculateSessionStats(responses) {
    const totalQuestions = responses.length;
    const correctAnswers = responses.filter(r => r.correct).length;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);
    
    return {
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        percentage: percentage
    };
}

// Rota para registrar uma sessão completa de jogo
app.post('/registrar', async (req, res) => {
    console.log('📝 Recebendo dados do jogo...');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    try {
        const { timestamp, responses } = req.body;
        
        // Validação básica
        if (!timestamp || !responses || !Array.isArray(responses) || responses.length === 0) {
            console.error('❌ Dados inválidos recebidos');
            return res.status(400).json({ 
                error: 'Dados inválidos', 
                received: { timestamp, responsesLength: responses?.length }
            });
        }

        const startTime = new Date(timestamp);
        const endTime = new Date();
        const durationSeconds = Math.round((endTime - startTime) / 1000);
        
        // Obter IP e User Agent para analytics
        const userIP = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';
        
        console.log('🔍 Dados processados:', {
            startTime,
            endTime,
            durationSeconds,
            responsesCount: responses.length,
            userIP,
            userAgent: userAgent.substring(0, 100) // Truncar para evitar problemas
        });
        
        // Calcular estatísticas da sessão
        const sessionStats = calculateSessionStats(responses);
        console.log('📊 Estatísticas da sessão:', sessionStats);
        
        // Preparar dados da sessão (compatível com UUID e DECIMAL)
        const sessionData = {
            total_questions: sessionStats.total_questions,
            correct_answers: sessionStats.correct_answers,
            percentage: parseFloat(sessionStats.percentage.toFixed(2)), // DECIMAL(5,2)
            duration_seconds: durationSeconds,
            user_ip: userIP, // INET type
            user_agent: userAgent.substring(0, 500) // Limitar tamanho
        };

        console.log('💾 Inserindo sessão no banco...');
        console.log('Dados da sessão:', sessionData);

        // Inserir sessão principal
        const { data: session, error: sessionError } = await supabase
            .from('game_sessions')
            .insert([sessionData])
            .select()
            .single();

        if (sessionError) {
            console.error('❌ Erro ao criar sessão:', sessionError);
            return res.status(500).json({ 
                error: 'Erro ao criar sessão',
                details: sessionError.message,
                code: sessionError.code
            });
        }

        console.log('✅ Sessão criada com sucesso! ID:', session.id);

        // Preparar dados das respostas individuais
        const responsesData = responses.map((response, index) => {
            const responseData = {
                session_id: session.id,
                topic: response.topic || 'Tópico não informado',
                is_cs_related: Boolean(response.isCSRelated),
                was_selected: Boolean(response.selected),
                is_correct: Boolean(response.correct),
                time_spent_seconds: response.timeSpent || 10,
                question_order: index + 1
            };
            
            console.log(`📝 Resposta ${index + 1}:`, responseData);
            return responseData;
        });

        console.log('💾 Inserindo respostas no banco...');
        console.log(`Total de respostas: ${responsesData.length}`);

        // Inserir todas as respostas em batch
        const { error: responsesError } = await supabase
            .from('game_responses')
            .insert(responsesData);

        if (responsesError) {
            console.error('❌ Erro ao salvar respostas:', responsesError);
            return res.status(500).json({ 
                error: 'Erro ao salvar respostas',
                details: responsesError.message,
                code: responsesError.code,
                sessionId: session.id // Retorna o ID da sessão mesmo se as respostas falharam
            });
        }

        console.log('✅ Respostas salvas com sucesso!');

        const result = { 
            message: 'Dados registrados com sucesso!',
            sessionId: session.id,
            stats: sessionStats,
            timestamp: new Date().toISOString()
        };

        console.log('🎉 Resposta enviada:', result);
        res.json(result);

    } catch (err) {
        console.error('❌ Erro interno:', err);
        console.error('Stack trace:', err.stack);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            message: err.message
        });
    }
});

// Rota para testar conectividade
app.get('/test-db', async (req, res) => {
    try {
        console.log('🧪 Testando conectividade do banco...');
        
        const { count, error } = await supabase
            .from('game_sessions')
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            console.error('❌ Erro no teste:', error);
            return res.status(500).json({ 
                error: 'Erro de conectividade',
                details: error.message
            });
        }
        
        console.log('✅ Banco conectado com sucesso!');
        res.json({ 
            message: 'Banco conectado com sucesso!',
            totalSessions: count
        });
        
    } catch (err) {
        console.error('❌ Erro no teste:', err);
        res.status(500).json({ 
            error: 'Erro no teste de conectividade',
            message: err.message
        });
    }
});

// Rota para obter analytics básicas (opcional)
app.get('/analytics', async (req, res) => {
    try {
        const { data: sessions, error } = await supabase
            .from('game_sessions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Erro ao buscar analytics:', error);
            return res.status(500).json({ error: 'Erro ao buscar analytics' });
        }

        res.json({
            totalSessions: sessions.length,
            sessions: sessions
        });
    } catch (err) {
        console.error('Erro interno:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para gerar análise em formato tabular
app.get('/analysis', async (req, res) => {
    try {
        console.log('📊 Gerando análise tabular...');
        
        // Lista completa de tópicos
        const allTopics = [
            // Tópicos CS
            "Abordagens curriculares envolvendo etnicidade, gênero, direitos humanos e inclusão",
            "Analíticas de aprendizagem (learning analytics) em computação",
            "Aspectos demográficos, sociais e econômicos de cursos de computação",
            "Aspectos raciais/étnicos na educação em computação",
            "Aspectos éticos na educação em computação",
            "Avaliação automatizada de tarefas de programação",
            "Avaliação da aprendizagem em computação",
            "Avaliação de pensamento computacional",
            "Computação desplugada",
            "Computação na educação infantil",
            "Computação na educação profissional",
            "Computação no ensino fundamental",
            "Computação no ensino médio",
            "Comunidades discentes em cursos de computação",
            "Concepções e organizações curriculares em computação",
            "Curricularização da pesquisa e da extensão em computação",
            "Didática de computação",
            "Diversidade em cursos de computação",
            "Educação continuada em computação",
            "Educação corporativa em computação",
            "Educação de jovens e adultos em computação",
            "Educação em computação aberta e livre (e.g. REA, MOOC)",
            "Educação em computação através do uso de imagens, áudio e vídeo",
            "Educação em computação em espaços não-formais",
            "Ensino e/ou aprendizagem de computação",
            "Estratégias de ensino e/ou aprendizagem de computação",
            "Estudos de gênero na educação em computação",
            "Estudos secundários: revisões sistemáticas e mapeamentos sistemáticos",
            "Estágio supervisionado na formação de professores de computação",
            "Evasão e retenção em cursos e disciplinas de computação",
            "Fatores psicológicos e emocionais em educação em computação",
            "Feedback de tarefas de programação",
            "Formação científica em cursos de computação",
            "Formação continuada de professores em computação",
            "Formação inicial de professores em computação",
            "Formação na pós-graduação em computação",
            "Habilidades técnicas (hard skills) e não-técnicas (soft skills) em computação",
            "Hardware na educação em computação",
            "Implantação e avaliação continuada de currículos, programas e cursos de computação",
            "Inclusão e acessibilidade na educação em computação",
            "Integração dos conteúdos exigidos por legislação em currículos de computação",
            "Inteligência artificial e aprendizado de máquina na educação em computação",
            "Interação entre academia e indústria de TI",
            "Jogos e gamificação na educação em computação",
            "Linguagens visuais e textuais para aprendizagem de programação",
            "Materiais didáticos de computação",
            "Mentoria na graduação e pós-graduação em computação",
            "Metacognição na educação em computação",
            "Metodologias ativas no ensino e/ou aprendizagem de computação",
            "Mineração de dados educacionais em computação",
            "Modelos de monitoria e apoio discente em disciplinas de graduação",
            "Métodos e estratégias para concepção de currículos, programas e cursos de computação",
            "Pensamento computacional",
            "Programação na educação superior",
            "Prática de ensino de computação na formação de professores",
            "Psicologia da programação",
            "Realidade virtual e aumentada na educação em computação",
            "Recursos de apoio à educação em computação",
            "Redes e mídias sociais em educação em computação",
            "Robótica na educação em computação",
            "Saberes docentes na computação",
            "Teorias educacionais e psicológicas aplicadas à educação em computação",
            // Tópicos não-CS
            "Marketing Digital",
            "Teoria dos jogos",
            "Sistemas elétricos"
        ];

        // Buscar sessões com respostas
        const { data: sessions, error } = await supabase
            .from('game_sessions')
            .select(`
                id,
                created_at,
                total_questions,
                correct_answers,
                percentage,
                duration_seconds,
                user_ip,
                game_responses (
                    topic,
                    is_cs_related,
                    was_selected,
                    is_correct,
                    time_spent_seconds,
                    question_order
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Processar dados
        const analysisData = sessions.map((session, sessionIndex) => {
            const row = {
                session_id: session.id,
                session_number: sessionIndex + 1,
                date: new Date(session.created_at).toLocaleString('pt-BR'),
                total_questions: session.total_questions,
                correct_answers: session.correct_answers,
                percentage: session.percentage,
                duration_seconds: session.duration_seconds,
                user_ip: session.user_ip
            };

            // Mapa de respostas
            const responseMap = {};
            session.game_responses.forEach(response => {
                responseMap[response.topic] = response;
            });

            // Para cada tópico, adicionar código de resposta
            allTopics.forEach(topic => {
                const response = responseMap[topic];
                const columnName = topic.split(' ').slice(0, 3).join('_').toLowerCase()
                    .replace(/[^a-z0-9_]/g, '');
                
                if (!response) {
                    row[columnName] = 0; // Não apareceu
                } else {
                    row[columnName] = response.was_selected ? 2 : 1; // 2=clicou, 1=não clicou
                    row[`${columnName}_correct`] = response.is_correct ? 1 : 0;
                    row[`${columnName}_time`] = response.time_spent_seconds;
                    row[`${columnName}_order`] = response.question_order;
                }
            });

            return row;
        });

        // Gerar estatísticas por tópico
        const topicStats = {};
        const topicColumns = Object.keys(analysisData[0] || {}).filter(key => 
            !key.includes('session') && 
            !key.includes('date') && 
            !key.includes('total') && 
            !key.includes('correct') && 
            !key.includes('percentage') && 
            !key.includes('duration') && 
            !key.includes('user_ip') &&
            !key.endsWith('_correct') && 
            !key.endsWith('_time') && 
            !key.endsWith('_order')
        );

        topicColumns.forEach(column => {
            const responses = analysisData.map(row => row[column]).filter(val => val !== undefined);
            const appeared = responses.filter(val => val > 0);
            const clicked = responses.filter(val => val === 2);
            
            if (appeared.length > 0) {
                topicStats[column] = {
                    total_appearances: appeared.length,
                    total_clicks: clicked.length,
                    click_rate: (clicked.length / appeared.length * 100).toFixed(2),
                    non_click_rate: ((appeared.length - clicked.length) / appeared.length * 100).toFixed(2)
                };
            }
        });

        res.json({
            total_sessions: sessions.length,
            analysis_data: analysisData,
            topic_statistics: topicStats,
            legend: {
                response_codes: {
                    "0": "Tópico não apareceu nesta sessão",
                    "1": "Tópico apareceu, mas jogador NÃO clicou",
                    "2": "Tópico apareceu e jogador CLICOU"
                },
                additional_columns: {
                    "_correct": "1 se resposta correta, 0 se incorreta",
                    "_time": "Tempo gasto na pergunta (segundos)",
                    "_order": "Ordem em que a pergunta apareceu"
                }
            }
        });

    } catch (err) {
        console.error('Erro na análise:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para baixar CSV da análise
app.get('/analysis/csv', async (req, res) => {
    try {
        // Reutilizar lógica da rota /analysis (seria melhor extrair para função)
        // Por simplicidade, redirecionando para explicação
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(`Para gerar o CSV com análise completa:

1. Execute: node sistema-analise.js
2. Isso criará os arquivos:
   - analise_respostas_completa.csv
   - estatisticas_topicos.json
   - legenda_analise.txt

Ou acesse: GET /analysis para ver os dados em JSON
`);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/topic-stats', async (req, res) => {
    try {
        const { data: topicStats, error } = await supabase
            .from('game_responses')
            .select('topic, is_correct')
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) {
            console.error('Erro ao buscar estatísticas de tópicos:', error);
            return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
        }

        // Processar estatísticas por tópico
        const topicData = {};
        topicStats.forEach(response => {
            if (!topicData[response.topic]) {
                topicData[response.topic] = { total: 0, correct: 0 };
            }
            topicData[response.topic].total++;
            if (response.is_correct) {
                topicData[response.topic].correct++;
            }
        });

        // Calcular percentuais e ordenar por dificuldade
        const processedStats = Object.entries(topicData)
            .map(([topic, stats]) => ({
                topic,
                total_responses: stats.total,
                correct_responses: stats.correct,
                success_rate: Math.round((stats.correct / stats.total) * 100),
                difficulty_rank: Math.round(((stats.total - stats.correct) / stats.total) * 100)
            }))
            .sort((a, b) => a.success_rate - b.success_rate);

        res.json(processedStats);
    } catch (err) {
        console.error('Erro interno:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota fallback para SPA
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    
    if (require('fs').existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send(`
            <h1>🎮 Servidor do Jogo de Tópicos</h1>
            <p>Servidor funcionando em: <strong>http://localhost:${PORT}</strong></p>
            <h2>🔗 Rotas disponíveis:</h2>
            <ul>
                <li><a href="/test-db">GET /test-db</a> - Testar conectividade do banco</li>
                <li><a href="/analytics">GET /analytics</a> - Ver sessões recentes</li>
                <li><a href="/topic-stats">GET /topic-stats</a> - Estatísticas dos tópicos</li>
                <li><a href="/analysis">GET /analysis</a> - Análise tabular completa (JSON)</li>
                <li><a href="/analysis/csv">GET /analysis/csv</a> - Como gerar CSV</li>
                <li>POST /registrar - Registrar uma sessão de jogo</li>
            </ul>
            <p>Coloque seu arquivo <code>index.html</code> na raiz do projeto para servir o jogo.</p>
        `);
    }
});

// Tratamento de erros global
app.use((err, req, res, next) => {
    console.error('❌ Erro não tratado:', err);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log('📊 Configuração do Supabase:', {
        url: supabaseUrl ? '✅ Configurada' : '❌ Não configurada',
        key: supabaseKey ? '✅ Configurada' : '❌ Não configurada'
    });
    console.log('\n🔗 Rotas disponíveis:');
    console.log(`   GET  http://localhost:${PORT}/test-db - Testar banco`);
    console.log(`   GET  http://localhost:${PORT}/analytics - Analytics`);
    console.log(`   GET  http://localhost:${PORT}/analysis - Análise tabular`);
    console.log(`   POST http://localhost:${PORT}/registrar - Registrar jogo`);
    console.log('\n💡 Para gerar CSV: node sistema-analise.js');
});