const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = 3000;
const FILE = './resultados.csv';

app.use(cors());
app.use(express.json());

const csTopics = [
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
        "Teorias educacionais e psicológicas aplicadas à educação em computação"
        ];


        // Tópicos que NÃO são de interesse direto da Ciência da Computação
        const nonCSTopics = [
            "Marketing Digital",
            "Teoria dos jogos",
            "Sistemas elétricos",
        ];

// cria o cabeçalho se ainda não existir
if (!fs.existsSync(FILE)) {
    const header = ['Timestamp', ...getAllTopics().map(t => `"${t}"`)].join(',') + '\n';
    fs.writeFileSync(FILE, header, 'utf8');
}


app.post('/registrar', (req, res) => {
    const { timestamp, responses } = req.body;
    const row = formatRow(timestamp, responses);
    fs.appendFile(FILE, row + '\n', err => {
        if (err) return res.status(500).send('Erro ao salvar');
        res.send('Registrado com sucesso!');
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

// helpers
function getAllTopics() {
    return [...csTopics, ...nonCSTopics]; // coloque os arrays completos aqui
}

function formatRow(timestamp, responses) {
    const allTopics = getAllTopics();
    const row = [timestamp];
    allTopics.forEach(topic => {
        const r = responses.find(resp => resp.topic === topic);
        if (!r) {
            row.push('');
        } else {
            const { isCSRelated, selected } = r;
            const correct = (isCSRelated && selected) || (!isCSRelated && !selected);
            row.push(correct ? '✔️' : '❌');
        }
    });
    return row.map(c => `"${c}"`).join(','); // ← importante: colocar aspas em tudo
}

const path = require('path');

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Fallback para index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});