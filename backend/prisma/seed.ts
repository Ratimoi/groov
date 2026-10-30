import { PrismaClient, type Prisma } from "@prisma/client";
import process from "process";

const prisma = new PrismaClient();

const hora = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);

const usuarios: Prisma.UsuarioCreateManyInput[] = [
    {
        id: "usr-admin-01",
        nome: "Carlos Mendes",
        username: "carlos.admin",
        avatarUrl: "https://i.pravatar.cc/150?img=12",
        email: "carlos.mendes@eventos.com",
        senha: "123456",
        papel: "ADMIN"
    },
    {
        id: "usr-produtor-01",
        nome: "Fernanda Rocha",
        username: "fernanda.produtora",
        avatarUrl: "https://i.pravatar.cc/150?img=47",
        email: "fernanda.rocha@eventos.com",
        senha: "123456",
        papel: "PRODUTOR"
    },
    {
        id: "usr-cliente-01",
        nome: "Lucas Oliveira",
        username: "lucas.oliveira",
        avatarUrl: "https://i.pravatar.cc/150?img=33",
        email: "lucas.oliveira@email.com",
        senha: "123456",
        papel: "CLIENTE"
    },
    {
        id: "usr-cliente-02",
        nome: "Mariana Souza",
        username: "mari.souza",
        avatarUrl: "https://i.pravatar.cc/150?img=45",
        email: "mariana.souza@email.com",
        senha: "123456",
        papel: "CLIENTE"
    },
    {
        id: "usr-cliente-03",
        nome: "Rafael Costa",
        username: "rafa.costa",
        avatarUrl: "https://i.pravatar.cc/150?img=59",
        email: "rafael.costa@email.com",
        senha: "123456"
        // papel não informado: assume o padrão CLIENTE
    }
];

// Criando os Usuários que serão Atrações dos eventos (DJs, artistas, palestrantes...)
const atracoes: Prisma.UsuarioCreateManyInput[] = [
    // Festas
    { id: "usr-atracao-01", nome: "DJ Lumen", username: "djlumen", avatarUrl: "https://i.pravatar.cc/150?img=11", email: "djlumen@atracoes.com", senha: "123456" },
    { id: "usr-atracao-02", nome: "DJ Kaio Vortex", username: "kaiovortex", avatarUrl: "https://i.pravatar.cc/150?img=13", email: "kaiovortex@atracoes.com", senha: "123456" },
    { id: "usr-atracao-03", nome: "Banda Maré Alta", username: "banda.marealta", avatarUrl: "https://i.pravatar.cc/150?img=14", email: "marealta@atracoes.com", senha: "123456" },
    { id: "usr-atracao-04", nome: "DJ Sol Nascente", username: "djsolnascente", avatarUrl: "https://i.pravatar.cc/150?img=15", email: "solnascente@atracoes.com", senha: "123456" },
    { id: "usr-atracao-05", nome: "Bia Ventura", username: "biaventura", avatarUrl: "https://i.pravatar.cc/150?img=5", email: "biaventura@atracoes.com", senha: "123456" },
    { id: "usr-atracao-06", nome: "DJ Retrô Max", username: "djretromax", avatarUrl: "https://i.pravatar.cc/150?img=17", email: "retromax@atracoes.com", senha: "123456" },
    { id: "usr-atracao-07", nome: "Bateria Unidos do Porto", username: "unidosdoporto", avatarUrl: "https://i.pravatar.cc/150?img=18", email: "unidosdoporto@atracoes.com", senha: "123456" },

    // Culturais
    { id: "usr-atracao-08", nome: "Maestro Henrique Albuquerque", username: "maestro.henrique", avatarUrl: "https://i.pravatar.cc/150?img=52", email: "henrique.albuquerque@atracoes.com", senha: "123456" },
    { id: "usr-atracao-09", nome: "Lia Montenegro", username: "lia.montenegro", avatarUrl: "https://i.pravatar.cc/150?img=20", email: "lia.montenegro@atracoes.com", senha: "123456" },
    { id: "usr-atracao-10", nome: "Tiago Ramos", username: "tiago.ramos", avatarUrl: "https://i.pravatar.cc/150?img=53", email: "tiago.ramos@atracoes.com", senha: "123456" },
    { id: "usr-atracao-11", nome: "Júlia Prado", username: "julia.prado", avatarUrl: "https://i.pravatar.cc/150?img=24", email: "julia.prado@atracoes.com", senha: "123456" },
    { id: "usr-atracao-12", nome: "João Pedro Farias", username: "joaopedro.farias", avatarUrl: "https://i.pravatar.cc/150?img=56", email: "joaopedro.farias@atracoes.com", senha: "123456" },
    { id: "usr-atracao-13", nome: "Renata Lopes", username: "renata.gaiteira", avatarUrl: "https://i.pravatar.cc/150?img=26", email: "renata.lopes@atracoes.com", senha: "123456" },
    { id: "usr-atracao-14", nome: "Ana Beatriz Lima", username: "anabeatriz.lima", avatarUrl: "https://i.pravatar.cc/150?img=29", email: "anabeatriz.lima@atracoes.com", senha: "123456" },

    // Educativos
    { id: "usr-atracao-15", nome: "Gustavo Henrique", username: "gustavo.dev", avatarUrl: "https://i.pravatar.cc/150?img=59", email: "gustavo.henrique@atracoes.com", senha: "123456" },
    { id: "usr-atracao-16", nome: "Patrícia Alves", username: "patricia.financas", avatarUrl: "https://i.pravatar.cc/150?img=32", email: "patricia.alves@atracoes.com", senha: "123456" },
    { id: "usr-atracao-17", nome: "Dra. Camila Torres", username: "camila.torres", avatarUrl: "https://i.pravatar.cc/150?img=36", email: "camila.torres@atracoes.com", senha: "123456" },
    { id: "usr-atracao-18", nome: "Prof. Eduardo Martins", username: "eduardo.martins", avatarUrl: "https://i.pravatar.cc/150?img=60", email: "eduardo.martins@atracoes.com", senha: "123456" },
    { id: "usr-atracao-19", nome: "Rodrigo Saldanha", username: "rodrigo.astro", avatarUrl: "https://i.pravatar.cc/150?img=61", email: "rodrigo.saldanha@atracoes.com", senha: "123456" },
    { id: "usr-atracao-20", nome: "Larissa Moura", username: "larissa.foto", avatarUrl: "https://i.pravatar.cc/150?img=38", email: "larissa.moura@atracoes.com", senha: "123456" }
];

// Ligando as Atrações aos Eventos (id do evento -> ids dos usuários)
const atracoesPorEvento: Record<string, string[]> = {
    // Festas
    "evt-festa-01": ["usr-atracao-01", "usr-atracao-02"],
    "evt-festa-02": ["usr-atracao-03", "usr-atracao-04"],
    "evt-festa-03": ["usr-atracao-05", "usr-atracao-02", "usr-atracao-01"],
    "evt-festa-04": ["usr-atracao-06"],
    "evt-festa-05": ["usr-atracao-07", "usr-atracao-03"],

    // Culturais
    "evt-cultural-01": ["usr-atracao-08"],
    "evt-cultural-02": ["usr-atracao-09"],
    "evt-cultural-03": ["usr-atracao-10", "usr-atracao-11"],
    "evt-cultural-04": ["usr-atracao-12", "usr-atracao-13"],
    "evt-cultural-05": ["usr-atracao-14", "usr-atracao-10"],

    // Educativos
    "evt-educativo-01": ["usr-atracao-15"],
    "evt-educativo-02": ["usr-atracao-16"],
    "evt-educativo-03": ["usr-atracao-17", "usr-atracao-15", "usr-atracao-18"],
    "evt-educativo-04": ["usr-atracao-19", "usr-atracao-18"],
    "evt-educativo-05": ["usr-atracao-20"]
};

// Criando os Grupos (o líder também entra como membro)
const grupos: Prisma.GrupoCreateManyInput[] = [
    { id: "grp-01", nome: "Galera da Balada", liderId: "usr-cliente-01" },
    { id: "grp-02", nome: "Amigos do Samba", liderId: "usr-cliente-03" },
    { id: "grp-03", nome: "Clube da Cultura", liderId: "usr-atracao-08" },
    { id: "grp-04", nome: "Raízes do Sul", liderId: "usr-atracao-12" },
    { id: "grp-05", nome: "Turma do Conhecimento", liderId: "usr-atracao-15" },
    { id: "grp-06", nome: "Equipe Organizadora", liderId: "usr-produtor-01" }
];

// Membros de cada Grupo (id do grupo -> ids dos usuários)
// Todos os 25 usuários estão em pelo menos um grupo; alguns estão em dois
const membrosPorGrupo: Record<string, string[]> = {
    "grp-01": ["usr-cliente-01", "usr-cliente-02", "usr-atracao-01", "usr-atracao-02", "usr-atracao-04"],
    "grp-02": ["usr-cliente-03", "usr-atracao-03", "usr-atracao-05", "usr-atracao-06", "usr-atracao-07"],
    "grp-03": ["usr-atracao-08", "usr-atracao-09", "usr-atracao-10", "usr-atracao-11", "usr-atracao-14"],
    "grp-04": ["usr-atracao-12", "usr-atracao-13", "usr-cliente-02", "usr-cliente-03"],
    "grp-05": ["usr-atracao-15", "usr-atracao-16", "usr-atracao-17", "usr-atracao-18", "usr-atracao-19", "usr-atracao-20"],
    "grp-06": ["usr-produtor-01", "usr-admin-01", "usr-cliente-01"]
};

const membrosGrupo: Prisma.MembroGrupoCreateManyInput[] = Object.entries(membrosPorGrupo)
    .flatMap(([grupoId, usuarioIds]) => usuarioIds.map(usuarioId => ({ grupoId, usuarioId })));

// Criando as Categorias
const categorias: Prisma.CategoriaCreateManyInput[] = [
    { id: "cat-festas", nome: "Festas" },
    { id: "cat-culturais", nome: "Culturais" },
    { id: "cat-educativos", nome: "Educativos" }
];

// Criando os Eventos
const eventos: Prisma.EventoCreateManyInput[] = [
    // ---------- FESTAS ----------
    {
        id: "evt-festa-01",
        titulo: "Noite Eletrônica Neon",
        descricao: "Prepare-se para uma noite inteira de música eletrônica comandada pelos principais DJs da cena nacional, passando por house, techno e progressive até o amanhecer. A Arena Pulse será transformada em um verdadeiro túnel de luzes neon, com projeções mapeadas, lasers sincronizados com a batida e um sistema de som de alta potência. O evento conta ainda com área lounge para descanso, bares espalhados por todo o espaço e food trucks com opções variadas. Venha com roupas claras ou fluorescentes e aproveite cada detalhe dessa experiência sensorial que promete ser a festa mais brilhante do ano.",
        imagemUrl: "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1",
        comecaEm: new Date("2026-11-14T23:00:00-03:00"),
        terminaEm: new Date("2026-11-15T06:00:00-03:00"),
        horario: hora("23:00"),
        destaque: true,
        nomeLocal: "Arena Pulse",
        cidade: "Porto Alegre",
        categoriaId: "cat-festas",
        criadoPorId: "usr-produtor-01"
    },
    {
        id: "evt-festa-02",
        titulo: "Baile do Havaí",
        descricao: "O Clube Atlântico vira um pedaço do Havaí em uma festa temática à beira da piscina, com decoração tropical, tochas, flores e muito clima de verão. A noite tem open bar de drinks tropicais, como piña colada, caipirinhas de frutas e mai tai, além de mesa de frutas frescas durante todo o evento. Na programação musical, bandas de axé, pagode e sertanejo se revezam no palco, intercaladas com DJ tocando os hits do momento. Cada participante recebe um colar havaiano na entrada, e as melhores fantasias temáticas concorrem a prêmios ao longo da noite.",
        imagemUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3",
        comecaEm: new Date("2026-12-05T21:00:00-03:00"),
        terminaEm: new Date("2026-12-06T04:00:00-03:00"),
        horario: hora("21:00"),
        nomeLocal: "Clube Atlântico",
        cidade: "Florianópolis",
        categoriaId: "cat-festas",
        criadoPorId: "usr-produtor-01"
    },
    {
        id: "evt-festa-03",
        titulo: "Réveillon Estrelas 2027",
        descricao: "Celebre a chegada de 2027 em grande estilo na Orla Central, com uma estrutura completa montada de frente para o mar. A festa conta com shows ao vivo de artistas nacionais, DJ após a meia-noite e uma queima de fogos de 15 minutos que promete iluminar todo o céu da cidade. Os convidados do camarote têm acesso a ceia completa, open bar premium e área exclusiva com vista privilegiada para os fogos. O evento oferece ainda segurança reforçada, banheiros climatizados e pontos de transporte organizados para a volta, para que você só se preocupe em comemorar.",
        imagemUrl: "https://images.unsplash.com/photo-1467810563316-b5476525c0f9",
        comecaEm: new Date("2026-12-31T22:00:00-03:00"),
        terminaEm: new Date("2027-01-01T06:00:00-03:00"),
        horario: hora("22:00"),
        destaque: true,
        nomeLocal: "Orla Central",
        cidade: "Rio de Janeiro",
        categoriaId: "cat-festas",
        criadoPorId: "usr-produtor-01"
    },
    {
        id: "evt-festa-04",
        titulo: "Festa Anos 2000",
        descricao: "Volte no tempo com a Festa Anos 2000, uma noite dedicada aos maiores sucessos que marcaram a década, do pop internacional ao rock nacional, passando pelo funk melody e pelas músicas que tocavam sem parar nas rádios. O Galpão Retrô ganha decoração inspirada na época, com cenários para fotos, telas exibindo clipes clássicos e uma pista de dança cheia de nostalgia. Durante a festa acontece um concurso de fantasias, premiando quem melhor representar os ícones e a moda daquele período. Separe sua calça de cintura baixa, seu boné de aba reta e venha reviver os melhores momentos dessa geração.",
        imagemUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30",
        comecaEm: new Date("2027-01-23T22:00:00-03:00"),
        terminaEm: new Date("2027-01-24T05:00:00-03:00"),
        horario: hora("22:00"),
        nomeLocal: "Galpão Retrô",
        cidade: "Curitiba",
        categoriaId: "cat-festas",
        criadoPorId: "usr-produtor-01"
    },
    {
        id: "evt-festa-05",
        titulo: "Bloco Carnavalesco Folia Sul",
        descricao: "O Bloco Carnavalesco Folia Sul abre a temporada de carnaval com um grande esquenta no Largo do Mercado, reunindo foliões de todas as idades. A programação traz bateria de escola de samba ao vivo, marchinhas tradicionais e um trio elétrico que percorre as ruas do centro histórico ao longo da tarde. Quem adquirir o abadá terá acesso à área reservada próxima ao trio, com bebidas inclusas e banheiros exclusivos. Capriche na fantasia, chame os amigos e venha aproveitar uma das festas de rua mais animadas da região.",
        imagemUrl: "https://images.unsplash.com/photo-1518998053901-5348d3961a04",
        comecaEm: new Date("2027-02-06T15:00:00-03:00"),
        terminaEm: new Date("2027-02-06T23:00:00-03:00"),
        horario: hora("15:00"),
        nomeLocal: "Largo do Mercado",
        cidade: "Pelotas",
        categoriaId: "cat-festas",
        criadoPorId: "usr-produtor-01"
    },

    // ---------- CULTURAIS ----------
    {
        id: "evt-cultural-01",
        titulo: "Orquestra Sinfônica: Clássicos do Cinema",
        descricao: "A Orquestra Sinfônica sobe ao palco do Theatro São Pedro para um concerto especial dedicado às trilhas sonoras mais marcantes da história do cinema. O repertório inclui temas de grandes compositores de Hollywood, passando por aventuras épicas, romances clássicos e ficções científicas que conquistaram gerações. Durante a apresentação, cenas dos filmes são projetadas em um telão, criando uma experiência que une música e imagem de forma emocionante. Um programa ideal para os amantes da sétima arte e para quem deseja conhecer a música orquestral de uma forma leve e envolvente.",
        imagemUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6",
        comecaEm: new Date("2026-11-20T20:00:00-03:00"),
        terminaEm: new Date("2026-11-20T22:00:00-03:00"),
        horario: hora("20:00"),
        destaque: true,
        nomeLocal: "Theatro São Pedro",
        cidade: "Porto Alegre",
        categoriaId: "cat-culturais",
        criadoPorId: "usr-produtor-01"
    },
    {
        id: "evt-cultural-02",
        titulo: "Exposição Arte Contemporânea Brasileira",
        descricao: "O Museu de Arte Moderna recebe uma grande mostra dedicada à produção de artistas brasileiros contemporâneos, reunindo pinturas, esculturas, fotografias e obras digitais. A exposição está organizada em núcleos temáticos que discutem identidade, cidade, natureza e tecnologia, mostrando a diversidade da arte produzida no país nas últimas décadas. Além das obras tradicionais, o público pode interagir com instalações imersivas que reagem ao movimento e ao som dos visitantes. Visitas guiadas acontecem diariamente, e aos fins de semana há oficinas gratuitas para crianças e adultos.",
        imagemUrl: "https://images.unsplash.com/photo-1531058020387-3be344556be6",
        comecaEm: new Date("2026-11-28T10:00:00-03:00"),
        terminaEm: new Date("2026-12-20T18:00:00-03:00"),
        horario: hora("10:00"),
        nomeLocal: "Museu de Arte Moderna",
        cidade: "São Paulo",
        categoriaId: "cat-culturais",
        criadoPorId: "usr-produtor-01"
    },
    {
        id: "evt-cultural-03",
        titulo: "Peça Teatral: O Auto da Compadecida",
        descricao: "O Teatro Guaíra apresenta uma nova montagem do clássico de Ariano Suassuna, acompanhando as aventuras de João Grilo e Chicó pelo sertão nordestino. Com muito humor e personagens inesquecíveis, a peça mistura crítica social, religiosidade popular e situações hilárias que conquistam o público de todas as idades. O espetáculo conta com cenário inspirado na xilogravura e na literatura de cordel, além de trilha sonora executada ao vivo com instrumentos regionais. Uma oportunidade imperdível de rever ou conhecer uma das obras mais queridas da dramaturgia brasileira.",
        imagemUrl: "https://images.unsplash.com/photo-1503095396549-807759245b35",
        comecaEm: new Date("2026-12-10T20:30:00-03:00"),
        terminaEm: new Date("2026-12-10T22:30:00-03:00"),
        horario: hora("20:30"),
        nomeLocal: "Teatro Guaíra",
        cidade: "Curitiba",
        categoriaId: "cat-culturais",
        criadoPorId: "usr-produtor-01"
    },
    {
        id: "evt-cultural-04",
        titulo: "Festival de Música Nativista",
        descricao: "Durante três dias, o Parque da Harmonia recebe o Festival de Música Nativista, uma celebração da cultura e das tradições gaúchas. A programação reúne apresentações de músicos regionais, concursos de composição, invernadas artísticas com danças tradicionais e rodas de chimarrão ao ar livre. A área gastronômica oferece pratos típicos como churrasco de fogo de chão, arroz carreteiro e doces campeiros. O festival também conta com feira de artesanato, exposição de trajes típicos e espaço infantil, tornando o evento ideal para toda a família.",
        imagemUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
        comecaEm: new Date("2027-01-15T18:00:00-03:00"),
        terminaEm: new Date("2027-01-17T23:00:00-03:00"),
        horario: hora("18:00"),
        nomeLocal: "Parque da Harmonia",
        cidade: "Porto Alegre",
        categoriaId: "cat-culturais",
        criadoPorId: "usr-produtor-01"
    },
    {
        id: "evt-cultural-05",
        titulo: "Mostra de Cinema Nacional",
        descricao: "A Mostra de Cinema Nacional reúne, ao longo de quatro dias, uma seleção de filmes brasileiros premiados em festivais nacionais e internacionais. A programação inclui longas de ficção, documentários e curtas-metragens de diferentes regiões do país, mostrando a diversidade do audiovisual brasileiro. Após as principais sessões, o público participa de debates com diretores, roteiristas e atores, conhecendo os bastidores das produções. A mostra oferece ainda oficinas de roteiro e crítica cinematográfica para quem deseja se aprofundar no universo do cinema.",
        imagemUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba",
        comecaEm: new Date("2027-02-18T19:00:00-03:00"),
        terminaEm: new Date("2027-02-21T23:00:00-03:00"),
        horario: hora("19:00"),
        nomeLocal: "Cine Cultura",
        cidade: "Belo Horizonte",
        categoriaId: "cat-culturais",
        criadoPorId: "usr-produtor-01"
    },

    // ---------- EDUCATIVOS ----------
    {
        id: "evt-educativo-01",
        titulo: "Workshop de Programação Web",
        descricao: "Workshop intensivo e totalmente prático para quem quer dar os primeiros passos no desenvolvimento web. Durante o dia, os participantes aprendem os fundamentos de HTML para estruturar páginas, CSS para estilização e layouts responsivos, e JavaScript para adicionar interatividade. As atividades são conduzidas por desenvolvedores experientes, com exercícios guiados e acompanhamento individual. Ao final, os participantes desenvolvem em grupo um projeto completo de site, publicado online, e recebem certificado de participação.",
        imagemUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97",
        comecaEm: new Date("2026-11-21T09:00:00-03:00"),
        terminaEm: new Date("2026-11-21T17:00:00-03:00"),
        horario: hora("09:00"),
        nomeLocal: "Hub de Inovação Tecnopuc",
        cidade: "Porto Alegre",
        categoriaId: "cat-educativos",
        criadoPorId: "usr-produtor-01"
    },
    {
        id: "evt-educativo-02",
        titulo: "Palestra: Educação Financeira para Jovens",
        descricao: "Palestra voltada para jovens que desejam aprender a cuidar melhor do próprio dinheiro desde cedo. O encontro aborda de forma simples e prática como montar um orçamento pessoal, controlar gastos, evitar dívidas e criar o hábito de poupar todos os meses. Também são apresentados os conceitos básicos de investimentos, como reserva de emergência, renda fixa e juros compostos, com exemplos do dia a dia. Ao final, há um momento aberto para perguntas, e os participantes recebem uma planilha de controle financeiro para começar a aplicar o que aprenderam.",
        imagemUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f",
        comecaEm: new Date("2026-12-03T19:00:00-03:00"),
        terminaEm: new Date("2026-12-03T21:00:00-03:00"),
        horario: hora("19:00"),
        nomeLocal: "Auditório Central",
        cidade: "Pelotas",
        categoriaId: "cat-educativos",
        criadoPorId: "usr-produtor-01"
    },
    {
        id: "evt-educativo-03",
        titulo: "Congresso de Inteligência Artificial",
        descricao: "O Congresso de Inteligência Artificial reúne pesquisadores, profissionais de tecnologia e empresas em dois dias de palestras, painéis e workshops sobre o avanço da IA. Entre os temas abordados estão aprendizado de máquina, modelos de linguagem, visão computacional, ética no uso de dados e o impacto da automação no mercado de trabalho. A programação inclui estudos de caso de empresas que já aplicam IA em seus processos e uma área de exposição com startups apresentando suas soluções. O evento é uma excelente oportunidade de atualização profissional e networking com especialistas da área.",
        imagemUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87",
        comecaEm: new Date("2027-01-28T08:30:00-03:00"),
        terminaEm: new Date("2027-01-29T18:00:00-03:00"),
        horario: hora("08:30"),
        destaque: true,
        nomeLocal: "Centro de Convenções",
        cidade: "São Paulo",
        categoriaId: "cat-educativos",
        criadoPorId: "usr-produtor-01"
    },
    {
        id: "evt-educativo-04",
        titulo: "Feira de Ciências e Astronomia",
        descricao: "A Feira de Ciências e Astronomia transforma o Planetário Municipal em um grande laboratório aberto ao público, com atividades para crianças, jovens e adultos. Os visitantes podem participar de experimentos interativos de física e química, conhecer projetos desenvolvidos por estudantes e assistir a sessões especiais na cúpula do planetário. Ao anoitecer, telescópios são montados na área externa para a observação da Lua, de planetas e de constelações, com explicações de astrônomos. Oficinas de construção de foguetes e lunetas completam a programação, tornando o dia uma experiência educativa e divertida para toda a família.",
        imagemUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa",
        comecaEm: new Date("2027-02-13T10:00:00-03:00"),
        terminaEm: new Date("2027-02-13T20:00:00-03:00"),
        horario: hora("10:00"),
        nomeLocal: "Planetário Municipal",
        cidade: "Florianópolis",
        categoriaId: "cat-educativos",
        criadoPorId: "usr-produtor-01"
    },
    {
        id: "evt-educativo-05",
        titulo: "Curso de Fotografia com Celular",
        descricao: "Curso prático para quem deseja tirar fotos de qualidade profissional usando apenas o celular. Os participantes aprendem técnicas de composição, como regra dos terços e linhas de condução, além de como aproveitar a luz natural e configurar o modo manual da câmera. Na segunda parte do curso, é realizada uma saída fotográfica pelos arredores do Espaço Criativo para colocar em prática o que foi ensinado. O encontro termina com uma aula de edição em aplicativos gratuitos, ensinando a ajustar cores, contraste e enquadramento para deixar as fotos prontas para as redes sociais.",
        imagemUrl: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d",
        comecaEm: new Date("2027-03-06T14:00:00-03:00"),
        terminaEm: new Date("2027-03-06T18:00:00-03:00"),
        horario: hora("14:00"),
        nomeLocal: "Espaço Criativo",
        cidade: "Rio de Janeiro",
        categoriaId: "cat-educativos",
        criadoPorId: "usr-produtor-01"
    }
];

// Criando os Lotes (ingressos à venda de cada evento)
// Nas Festas, o lote "Inteira" aceita compra em grupo com desconto
const lotes: Prisma.LoteCreateManyInput[] = [
    // ---------- FESTAS ----------
    { eventoId: "evt-festa-01", nome: "Meia-Entrada", preco: 40.00, quantidade: 200 },
    { eventoId: "evt-festa-01", nome: "Inteira", preco: 80.00, quantidade: 400, tamanhoGrupo: 5, descontoGrupo: 0.1000, prazoGrupoHoras: 48 },
    { eventoId: "evt-festa-02", nome: "Meia-Entrada", preco: 60.00, quantidade: 150 },
    { eventoId: "evt-festa-02", nome: "Inteira", preco: 120.00, quantidade: 300, tamanhoGrupo: 4, descontoGrupo: 0.1500, prazoGrupoHoras: 24 },
    { eventoId: "evt-festa-03", nome: "Pista", preco: 250.00, quantidade: 1000, tamanhoGrupo: 6, descontoGrupo: 0.1000, prazoGrupoHoras: 72 },
    { eventoId: "evt-festa-03", nome: "Camarote Open Bar", preco: 590.00, quantidade: 200 },
    { eventoId: "evt-festa-04", nome: "Meia-Entrada", preco: 35.00, quantidade: 150 },
    { eventoId: "evt-festa-04", nome: "Inteira", preco: 70.00, quantidade: 350, tamanhoGrupo: 5, descontoGrupo: 0.1000, prazoGrupoHoras: 48 },
    { eventoId: "evt-festa-05", nome: "Pista", preco: 30.00, quantidade: 800 },
    { eventoId: "evt-festa-05", nome: "Abadá", preco: 90.00, quantidade: 300, tamanhoGrupo: 4, descontoGrupo: 0.1200, prazoGrupoHoras: 48 },

    // ---------- CULTURAIS ----------
    { eventoId: "evt-cultural-01", nome: "Plateia", preco: 80.00, quantidade: 300 },
    { eventoId: "evt-cultural-01", nome: "Camarote", preco: 150.00, quantidade: 60 },
    { eventoId: "evt-cultural-02", nome: "Meia-Entrada", preco: 15.00, quantidade: 500 },
    { eventoId: "evt-cultural-02", nome: "Inteira", preco: 30.00, quantidade: 500 },
    { eventoId: "evt-cultural-03", nome: "Plateia", preco: 60.00, quantidade: 250 },
    { eventoId: "evt-cultural-03", nome: "Balcão", preco: 40.00, quantidade: 150 },
    { eventoId: "evt-cultural-04", nome: "Passaporte 1 Dia", preco: 50.00, quantidade: 600 },
    { eventoId: "evt-cultural-04", nome: "Passaporte 3 Dias", preco: 120.00, quantidade: 400 },
    { eventoId: "evt-cultural-05", nome: "Sessão Avulsa", preco: 20.00, quantidade: 400 },
    { eventoId: "evt-cultural-05", nome: "Passe Completo", preco: 70.00, quantidade: 150 },

    // ---------- EDUCATIVOS ----------
    { eventoId: "evt-educativo-01", nome: "Estudante", preco: 50.00, quantidade: 40 },
    { eventoId: "evt-educativo-01", nome: "Profissional", preco: 100.00, quantidade: 30 },
    { eventoId: "evt-educativo-02", nome: "Gratuito", preco: 0.00, quantidade: 150 },
    { eventoId: "evt-educativo-02", nome: "Com Certificado", preco: 25.00, quantidade: 100 },
    { eventoId: "evt-educativo-03", nome: "1º Lote", preco: 290.00, quantidade: 300 },
    { eventoId: "evt-educativo-03", nome: "2º Lote", preco: 390.00, quantidade: 500 },
    { eventoId: "evt-educativo-04", nome: "Infantil", preco: 10.00, quantidade: 300 },
    { eventoId: "evt-educativo-04", nome: "Adulto", preco: 20.00, quantidade: 300 },
    { eventoId: "evt-educativo-05", nome: "Estudante", preco: 45.00, quantidade: 25 },
    { eventoId: "evt-educativo-05", nome: "Geral", preco: 90.00, quantidade: 25 }
];

async function main() {
    try {
        await prisma.usuario.createMany({ data: usuarios, skipDuplicates: true });
        console.log(`${usuarios.length} Usuário(s) Cadastrado(s)...`);

        await prisma.usuario.createMany({ data: atracoes, skipDuplicates: true });
        console.log(`${atracoes.length} Atrações Cadastradas...`);

        await prisma.grupo.createMany({ data: grupos, skipDuplicates: true });
        console.log(`${grupos.length} Grupos Cadastrados...`);

        // skipDuplicates usa o @@unique([grupoId, usuarioId]), então não duplica ao rodar de novo
        await prisma.membroGrupo.createMany({ data: membrosGrupo, skipDuplicates: true });
        console.log(`${membrosGrupo.length} Membros de Grupo Cadastrados...`);

        await prisma.categoria.createMany({ data: categorias, skipDuplicates: true });
        console.log(`${categorias.length} Categorias Cadastradas...`);

        await prisma.evento.createMany({ data: eventos, skipDuplicates: true });
        console.log(`${eventos.length} Eventos Cadastrados...`);

        await prisma.lote.createMany({ data: lotes });
        console.log(`${lotes.length} Lotes Cadastrados...`);

        for (const [eventoId, usuarioIds] of Object.entries(atracoesPorEvento)) {
            await prisma.evento.update({
                where: { id: eventoId },
                data: { atracoes: { set: usuarioIds.map(id => ({ id })) } }
            });
        }
        console.log(`Atrações vinculadas a ${Object.keys(atracoesPorEvento).length} Eventos...`);

    } catch (error) {
        console.error("Erro nas Inclusões (Seeds):", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .then(() => console.log("Seed finalizado!"))
    .catch(() => process.exit(1));
