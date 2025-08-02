// sistema-analise.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Lista completa de todos os tópicos possíveis
const allTopics = [
    // Tópicos de CS
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

// Mapeamento de resposta: 0 = Não apareceu, 1 = Apareceu e não clicou, 2 = Apareceu e clicou
function getResponseCode(response) {
    if (!response) return 0; // Não apareceu
    return response.was_selected ? 2 : 1; // 2 = clicou, 1 = não clicou
}

// Função para gerar a análise em formato tabular
async function generateAnalysisTable() {
    try {
        console.log('📊 Gerando análise tabular...');
        
        // Buscar todas as sessões com suas respostas
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
            console.error('❌ Erro ao buscar dados:', error);
            return;
        }

        console.log(`✅ Encontradas ${sessions.length} sessões`);

        // Preparar dados para a tabela
        const analysisData = [];
        
        sessions.forEach((session, sessionIndex) => {
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

            // Criar um mapa das respostas desta sessão
            const responseMap = {};
            session.game_responses.forEach(response => {
                responseMap[response.topic] = response;
            });

            // Para cada tópico possível, verificar se apareceu e qual foi a resposta
            allTopics.forEach(topic => {
                const response = responseMap[topic];
                const responseCode = getResponseCode(response);
                
                // Usar nome simplificado para as colunas (primeiras palavras)
                const columnName = topic.split(' ').slice(0, 3).join('_').toLowerCase()
                    .replace(/[^a-z0-9_]/g, ''); // Remove caracteres especiais
                
                row[columnName] = responseCode;
                
                // Adicionar informações extras se o tópico apareceu
                if (response) {
                    row[`${columnName}_correct`] = response.is_correct ? 1 : 0;
                    row[`${columnName}_time`] = response.time_spent_seconds;
                    row[`${columnName}_order`] = response.question_order;
                }
            });

            analysisData.push(row);
        });

        return analysisData;

    } catch (error) {
        console.error('❌ Erro geral:', error);
        return null;
    }
}

// Função para exportar para CSV
function exportToCSV(data, filename = 'analise_respostas.csv') {
    if (!data || data.length === 0) {
        console.log('❌ Nenhum dado para exportar');
        return;
    }

    // Cabeçalhos
    const headers = Object.keys(data[0]);
    
    // Criar conteúdo CSV
    let csvContent = headers.join(',') + '\n';
    
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header];
            // Tratar valores nulos/undefined
            if (value === null || value === undefined) return '';
            // Escapar aspas se necessário
            if (typeof value === 'string' && value.includes(',')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csvContent += values.join(',') + '\n';
    });

    // Salvar arquivo
    fs.writeFileSync(filename, csvContent, 'utf8');
    console.log(`✅ Arquivo ${filename} criado com sucesso!`);
    console.log(`📄 ${data.length} linhas exportadas`);
}

// Função para gerar legenda dos códigos
function generateLegend() {
    const legend = `
📋 LEGENDA DOS CÓDIGOS DE RESPOSTA:
==================================

Para cada tópico, temos as seguintes colunas:
- [topico]: Código de resposta (0, 1 ou 2)
- [topico]_correct: Se a resposta foi correta (1) ou incorreta (0)
- [topico]_time: Tempo gasto na pergunta (segundos)
- [topico]_order: Ordem em que a pergunta apareceu

CÓDIGOS DE RESPOSTA:
- 0 = Tópico não apareceu nesta sessão
- 1 = Tópico apareceu, mas o jogador NÃO clicou
- 2 = Tópico apareceu e o jogador CLICOU

ANÁLISE RECOMENDADA:
====================

1. TAXA DE CLIQUES POR TÓPICO:
   - Contar quantos "2" cada tópico teve
   - Dividir pelo total de aparições (1 + 2)

2. TAXA DE ACERTO POR TÓPICO:
   - Somar os valores "_correct" para cada tópico
   - Dividir pelo total de aparições

3. DIFICULDADE PERCEBIDA:
   - Tópicos com muitos erros podem ser confusos
   - Tópicos CS com código 1 = jogador perdeu pontos
   - Tópicos não-CS com código 2 = jogador perdeu pontos

4. TEMPO DE RESPOSTA:
   - Tópicos com maior tempo podem ser mais difíceis
   - Comparar tempo médio entre tópicos CS e não-CS

5. POSIÇÃO DA PERGUNTA:
   - Verificar se a posição influencia na taxa de acerto
   - Primeiras perguntas vs. últimas perguntas
`;

    fs.writeFileSync('legenda_analise.txt', legend, 'utf8');
    console.log('📋 Legenda salva em legenda_analise.txt');
}

// Função para criar estatísticas por tópico
function generateTopicStats(data) {
    const stats = {};
    
    // Identificar todas as colunas de tópicos (que não terminam com _correct, _time, _order)
    const topicColumns = Object.keys(data[0]).filter(key => 
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
        const responses = data.map(row => row[column]).filter(val => val !== undefined);
        const appeared = responses.filter(val => val > 0); // 1 ou 2
        const clicked = responses.filter(val => val === 2);
        
        if (appeared.length > 0) {
            stats[column] = {
                total_appearances: appeared.length,
                total_clicks: clicked.length,
                click_rate: (clicked.length / appeared.length * 100).toFixed(2) + '%',
                non_click_rate: ((appeared.length - clicked.length) / appeared.length * 100).toFixed(2) + '%'
            };
        }
    });

    // Salvar estatísticas
    const statsContent = JSON.stringify(stats, null, 2);
    fs.writeFileSync('estatisticas_topicos.json', statsContent, 'utf8');
    console.log('📊 Estatísticas por tópico salvas em estatisticas_topicos.json');
    
    return stats;
}

// Função principal
async function main() {
    console.log('🚀 Iniciando análise dos dados...\n');
    
    const data = await generateAnalysisTable();
    
    if (!data) {
        console.log('❌ Falha ao gerar dados de análise');
        return;
    }

    console.log('\n📈 Exportando dados...');
    
    // Exportar CSV principal
    exportToCSV(data, 'analise_respostas_completa.csv');
    
    // Gerar estatísticas
    const stats = generateTopicStats(data);
    
    // Gerar legenda
    generateLegend();
    
    console.log('\n✅ Análise concluída!');
    console.log('📁 Arquivos gerados:');
    console.log('   - analise_respostas_completa.csv (dados principais)');
    console.log('   - estatisticas_topicos.json (estatísticas por tópico)');
    console.log('   - legenda_analise.txt (explicação dos códigos)');
    
    console.log('\n📊 Resumo dos dados:');
    console.log(`   - ${data.length} sessões analisadas`);
    console.log(`   - ${Object.keys(stats).length} tópicos únicos encontrados`);
    
    // Mostrar alguns tópicos mais clicados
    const sortedStats = Object.entries(stats)
        .sort((a, b) => b[1].total_clicks - a[1].total_clicks)
        .slice(0, 5);
    
    console.log('\n🔝 Top 5 tópicos mais clicados:');
    sortedStats.forEach(([topic, stat], index) => {
        console.log(`   ${index + 1}. ${topic}: ${stat.total_clicks} cliques (${stat.click_rate})`);
    });
}

// Executar se chamado diretamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    generateAnalysisTable,
    exportToCSV,
    generateTopicStats
};