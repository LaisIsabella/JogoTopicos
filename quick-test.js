// quick-test.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('🧪 Teste rápido de inserção...');

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente não configuradas!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function quickTest() {
    try {
        // 1. Testar conectividade
        console.log('1. Testando conectividade...');
        const { count, error: countError } = await supabase
            .from('game_sessions')
            .select('*', { count: 'exact', head: true });
        
        if (countError) {
            console.error('❌ Erro de conectividade:', countError.message);
            return;
        }
        
        console.log(`✅ Conectado! Total de sessões existentes: ${count}`);
        
        // 2. Inserir sessão de teste
        console.log('\n2. Inserindo sessão de teste...');
        const testSession = {
            total_questions: 3,
            correct_answers: 2,
            percentage: 66.67,
            duration_seconds: 45,
            user_ip: '127.0.0.1',
            user_agent: 'Teste Manual'
        };
        
        console.log('Dados da sessão:', JSON.stringify(testSession, null, 2));
        
        const { data: session, error: sessionError } = await supabase
            .from('game_sessions')
            .insert([testSession])
            .select()
            .single();
        
        if (sessionError) {
            console.error('❌ Erro ao inserir sessão:', sessionError);
            console.error('Detalhes completos:', JSON.stringify(sessionError, null, 2));
            return;
        }
        
        console.log('✅ Sessão inserida com sucesso!');
        console.log('ID da sessão:', session.id);
        console.log('Dados retornados:', JSON.stringify(session, null, 2));
        
        // 3. Inserir respostas de teste
        console.log('\n3. Inserindo respostas de teste...');
        const testResponses = [
            {
                session_id: session.id,
                topic: 'Pensamento computacional',
                is_cs_related: true,
                was_selected: true,
                is_correct: true,
                time_spent_seconds: 8,
                question_order: 1
            },
            {
                session_id: session.id,
                topic: 'Marketing Digital',
                is_cs_related: false,
                was_selected: false,
                is_correct: true,
                time_spent_seconds: 10,
                question_order: 2
            },
            {
                session_id: session.id,
                topic: 'Programação na educação superior',
                is_cs_related: true,
                was_selected: false,
                is_correct: false,
                time_spent_seconds: 10,
                question_order: 3
            }
        ];
        
        console.log('Dados das respostas:', JSON.stringify(testResponses, null, 2));
        
        const { data: responses, error: responsesError } = await supabase
            .from('game_responses')
            .insert(testResponses)
            .select();
        
        if (responsesError) {
            console.error('❌ Erro ao inserir respostas:', responsesError);
            console.error('Detalhes completos:', JSON.stringify(responsesError, null, 2));
            return;
        }
        
        console.log('✅ Respostas inseridas com sucesso!');
        console.log(`   ${responses.length} respostas salvas`);
        
        // 4. Verificar dados inseridos
        console.log('\n4. Verificando dados inseridos...');
        const { data: savedSession, error: readError } = await supabase
            .from('game_sessions')
            .select(`
                *,
                game_responses (
                    topic,
                    is_cs_related,
                    was_selected,
                    is_correct
                )
            `)
            .eq('id', session.id)
            .single();
        
        if (readError) {
            console.error('❌ Erro ao ler dados:', readError);
            return;
        }
        
        console.log('✅ Dados verificados com sucesso!');
        console.log('Sessão completa:', JSON.stringify(savedSession, null, 2));
        
        console.log('\n🎉 Teste concluído com sucesso!');
        console.log('📝 Agora você pode testar o jogo frontend fazendo uma requisição POST para /registrar');
        
    } catch (error) {
        console.error('❌ Erro geral:', error.message);
        console.error('Stack:', error.stack);
    }
}

quickTest();