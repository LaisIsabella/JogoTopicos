// test-connection.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('🔍 Testando conexão com Supabase...');
console.log('URL:', supabaseUrl ? 'Configurada' : 'NÃO configurada');
console.log('Key:', supabaseKey ? 'Configurada' : 'NÃO configurada');

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: Variáveis SUPABASE_URL e SUPABASE_ANON_KEY não estão configuradas!');
    console.log('\n📝 Crie um arquivo .env com:');
    console.log('SUPABASE_URL=https://seu-projeto.supabase.co');
    console.log('SUPABASE_ANON_KEY=sua-chave-anonima');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        console.log('\n🧪 Testando conexão...');
        
        // Teste 1: Verificar se as tabelas existem
        console.log('1. Verificando tabela game_sessions...');
        const { count: sessionsCount, error: sessionsError } = await supabase
            .from('game_sessions')
            .select('*', { count: 'exact', head: true });
        
        if (sessionsError) {
            console.error('❌ Erro na tabela game_sessions:', sessionsError.message);
            console.log('📝 Crie a tabela com o SQL:');
            console.log(createSessionsTableSQL);
        } else {
            console.log('✅ Tabela game_sessions acessível');
            console.log(`   Total de sessões: ${sessionsCount}`);
        }

        // Teste 2: Verificar tabela de respostas
        console.log('\n2. Verificando tabela game_responses...');
        const { count: responsesCount, error: responsesError } = await supabase
            .from('game_responses')
            .select('*', { count: 'exact', head: true });
        
        if (responsesError) {
            console.error('❌ Erro na tabela game_responses:', responsesError.message);
            console.log('📝 Crie a tabela com o SQL:');
            console.log(createResponsesTableSQL);
        } else {
            console.log('✅ Tabela game_responses acessível');
            console.log(`   Total de respostas: ${responsesCount}`);
        }

        // Teste 3: Inserir dados de teste
        if (!sessionsError && !responsesError) {
            console.log('\n3. Testando inserção de dados...');
            
            const testSession = {
                total_questions: 5,
                correct_answers: 3,
                percentage: 60.00, // DECIMAL format
                duration_seconds: 120,
                user_ip: '127.0.0.1', // INET format
                user_agent: 'Test Agent'
            };

            const { data: newSession, error: insertError } = await supabase
                .from('game_sessions')
                .insert([testSession])
                .select()
                .single();

            if (insertError) {
                console.error('❌ Erro ao inserir sessão de teste:', insertError.message);
                console.error('Detalhes:', insertError);
            } else {
                console.log('✅ Sessão de teste inserida com sucesso!');
                console.log('ID da sessão:', newSession.id);
                
                // Inserir uma resposta de teste
                const testResponse = {
                    session_id: newSession.id,
                    topic: 'Teste de Conectividade',
                    is_cs_related: true,
                    was_selected: true,
                    is_correct: true,
                    time_spent_seconds: 5,
                    question_order: 1
                };

                const { error: responseInsertError } = await supabase
                    .from('game_responses')
                    .insert([testResponse]);

                if (responseInsertError) {
                    console.error('❌ Erro ao inserir resposta de teste:', responseInsertError.message);
                } else {
                    console.log('✅ Resposta de teste inserida com sucesso!');
                }
            }
        }

        console.log('\n🎉 Teste de conectividade concluído!');
        
    } catch (error) {
        console.error('❌ Erro geral:', error.message);
        console.error('Stack:', error.stack);
    }
}

// SQL para criar as tabelas (usando seu schema)
const createSessionsTableSQL = `
CREATE TABLE game_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    duration_seconds INTEGER,
    user_ip INET,
    user_agent TEXT
);
`;

const createResponsesTableSQL = `
CREATE TABLE game_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    is_cs_related BOOLEAN NOT NULL,
    was_selected BOOLEAN NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INTEGER NOT NULL,
    question_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;

// Executar o teste
testConnection();