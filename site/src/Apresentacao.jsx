import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  ChevronLeft, 
  Database, 
  ShieldAlert, 
  Cpu, 
  Activity, 
  TrendingDown, 
  Clock, 
  Lock, 
  PieChart, 
  Users, 
  Server, 
  BrainCircuit, 
  LineChart, 
  X, 
  Play, 
  Maximize2, 
  Minimize2, 
  LayoutGrid, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Utensils, 
  Layers, 
  GraduationCap, 
  CheckCircle2, 
  AlertTriangle, 
  Scale, 
  ChefHat 
} from 'lucide-react';

export default function Apresentacao() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGridDrawer, setShowGridDrawer] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef(null);

  useEffect(() => {
    document.title = "Apresentação Executiva | SESI Alimenta";
  }, []);

  // Gestão de auto-hide dos controles EXCLUSIVAMENTE ao mover o mouse
  const handleMouseMove = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 2400);
  }, []);

  useEffect(() => {
    // Esconde os controles iniciais após 2.4 segundos da carga da página
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 2400);

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [handleMouseMove]);

  // Slides condensados, ricos e estruturados em Bento Box / Layouts Canva
  const slides = [
    {
      id: 1,
      layout: 'hero-start',
      tag: "INOVAÇÃO & TECNOLOGIA ESCOLAR",
      titulo: "SESI Alimenta",
      subtitulo: "O ecossistema digital que transformou a gestão de alimentação escolar no SESI Caçapava.",
      stats: [
        { rotulo: "Alunos Monitorados", valor: "500+", icone: <Users className="w-4 h-4 text-primaria" /> },
        { rotulo: "Precisão na Produção", valor: "99.4%", icone: <Activity className="w-4 h-4 text-emerald-600" /> },
        { rotulo: "Desperdício Auditado", valor: "D-0", icone: <TrendingDown className="w-4 h-4 text-orange-600" /> },
        { rotulo: "Segurança de Dados", valor: "Zero-Trust", icone: <ShieldCheck className="w-4 h-4 text-blue-600" /> }
      ]
    },
    {
      id: 2,
      layout: 'comparison',
      tag: "O DIAGNÓSTICO",
      titulo: "O Fim do Improviso Analógico",
      subtitulo: "Como substituímos métodos manuais e perdas crônicas por sincronização matemática em tempo real.",
      antes: {
        titulo: "Antes: Gestão Manual & Estimativas",
        itens: [
          "Contagem física de alunos sala a sala consumindo tempo de aula.",
          "Cozinha superproduzia por precaução, gerando panelas inteiras de sobra.",
          "Falta de controle rigoroso para alunos com laudos e restrições clínicas.",
          "Ausência de métricas de lixo (resto de prato vs sobra de cuba)."
        ]
      },
      depois: {
        titulo: "Agora: SESI Alimenta em Operação",
        itens: [
          "Chamada digital no 1º horário: presenças computadas em 15 segundos.",
          "Cálculo volumétrico exato de porções antes de ligar os fogões.",
          "Separação nominal de dietas (lactose, glúten, APLV) sem risco de contaminação.",
          "Auditoria diária de pesagem com relatórios automatizados de B.I."
        ]
      }
    },
    {
      id: 3,
      layout: 'bento-steam',
      tag: "ORIGEM & METODOLOGIA",
      titulo: "Engenharia Aplicada ao STEAM",
      subtitulo: "Nascido da Aprendizagem Baseada em Projetos (PBL) na unidade SESI Caçapava.",
      cards: [
        {
          titulo: "Protagonismo Estudantil",
          descricao: "Idealizado e programado por Marcos Roberto Bretas Binder, com mentoria do Prof. Everson e suporte tático da Coordenação Luciana.",
          destaque: "SESI Caçapava",
          icone: <GraduationCap className="w-6 h-6 text-primaria" />
        },
        {
          titulo: "Ciência & Nutrição",
          descricao: "Auditoria comportamental, controle de resto-ingesta (TRO) e combate ao desperdício orgânico per capita.",
          destaque: "Nutrição Clínica",
          icone: <Scale className="w-6 h-6 text-emerald-600" />
        },
        {
          titulo: "Tecnologia & Engenharia",
          descricao: "Arquitetura Node.js + Express, SQLite WAL com concorrência sem lock, WebSocket nativo e React SPA 18.",
          destaque: "High Performance",
          icone: <Cpu className="w-6 h-6 text-blue-600" />
        },
        {
          titulo: "Artes & Experiência (UI/UX)",
          descricao: "Interface responsiva no padrão Soft UI, acessibilidade, proteção anti-flicker e modo público para totens de refeitório.",
          destaque: "Human-Centered Design",
          icone: <Sparkles className="w-6 h-6 text-amber-600" />
        }
      ]
    },
    {
      id: 4,
      layout: 'workflow-journey',
      tag: "ARQUITETURA DE DADOS",
      titulo: "As Três Jornadas Integradas",
      subtitulo: "Fluxo unidirecional de informação com isolamento estrito de permissões e integridade relacional.",
      etapas: [
        {
          numero: "01",
          papel: "Docente / Sala de Aula",
          foco: "Frequência no D-0",
          detalhe: "O professor seleciona a turma e lança a contagem real de alunos presentes e a lista nominal de dietas.",
          icone: <Users className="w-6 h-6 text-primaria" />
        },
        {
          numero: "02",
          papel: "Coordenação Pedagógica",
          foco: "Trava do Contraturno",
          detalhe: "Pedidos de almoço extra para projetos extracurriculares são auditados e liberados em lote com 1 clique.",
          icone: <ShieldAlert className="w-6 h-6 text-amber-600" />
        },
        {
          numero: "03",
          papel: "Cozinha & Nutrição",
          foco: "Produção & Desperdício",
          detalhe: "Dashboard consolida os números instantaneamente, orienta a panela e fecha o ciclo com a pesagem do lixo.",
          icone: <ChefHat className="w-6 h-6 text-emerald-600" />
        }
      ]
    },
    {
      id: 5,
      layout: 'clinical-diet',
      tag: "SEGURANÇA ALIMENTAR",
      titulo: "Gestão Clínica de Restrições",
      subtitulo: "Garantia de que nenhum aluno receba alimentos incompatíveis com seu laudo médico.",
      itens: [
        {
          nome: "Rastreamento Nominal",
          desc: "Alunos com restrições alimentares são identificados individualmente na chamada do professor.",
          icone: <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        },
        {
          nome: "Abatimento Automático da Matriz",
          desc: "O sistema subtrai os alunos de dieta do caldeirão padrão e gera a ordem de produção individualizada.",
          icone: <Layers className="w-5 h-5 text-primaria" />
        },
        {
          nome: "Isolamento Anti-Contaminação",
          desc: "Relatórios separados para cozinheiros com identificação de alérgenos: Lactose, Glúten, APLV, Diabetes, etc.",
          icone: <Utensils className="w-5 h-5 text-blue-600" />
        }
      ]
    },
    {
      id: 6,
      layout: 'bi-formulas',
      tag: "BUSINESS INTELLIGENCE (B.I.)",
      titulo: "Fórmulas & Métricas Matemáticas",
      subtitulo: "Indicadores analíticos processados em tempo real através de Common Table Expressions (CTEs).",
      formulas: [
        {
          sigla: "DPC",
          nome: "Desperdício Per Capita",
          meta: "Meta: < 35g / aluno",
          corBadge: "bg-orange-500/15 text-orange-400 border-orange-500/30",
          corDestaque: "text-orange-400",
          corCard: "hover:border-orange-500/40",
          prefixo: "DPC =",
          numerador: "Lixo Sujo (kg) × 1000",
          denominador: "Alunos Presentes",
          sufixo: "",
          unidade: "g / aluno",
          significado: "Mede com precisão cirúrgica quantas gramas de comida cada aluno descarta no prato."
        },
        {
          sigla: "IAL",
          nome: "Índice de Acerto Logístico",
          meta: "Meta: > 95%",
          corBadge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
          corDestaque: "text-emerald-400",
          corCard: "hover:border-emerald-500/40",
          prefixo: "IAL = [ 1 −",
          numerador: "|Produzido − Consumido|",
          denominador: "Produzido",
          sufixo: "] × 100",
          unidade: "% de acurácia",
          significado: "Pontua a eficiência do dimensionamento volumétrico e acurácia do cardápio planejado."
        },
        {
          sigla: "TRO",
          nome: "Taxa de Resto Ingesta",
          meta: "Meta: < 5%",
          corBadge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
          corDestaque: "text-blue-400",
          corCard: "hover:border-blue-500/40",
          prefixo: "TRO =",
          numerador: "Resto do Prato (kg)",
          denominador: "Total Servido (kg)",
          sufixo: "× 100",
          unidade: "% de descarte",
          significado: "Cruza avaliações de satisfação e peso das sobras para identificar pratos impopulares."
        }
      ]
    },
    {
      id: 7,
      layout: 'tech-radar',
      tag: "ENGENHARIA DE SOFTWARE",
      titulo: "Segurança & Inteligência de Borda",
      subtitulo: "Arquitetura resiliente com travas de integridade física e algoritmos preditivos.",
      cards: [
        {
          titulo: "Motor Preditivo Fuzzy",
          sub: "Distância de Levenshtein",
          texto: "Analisa a similaridade de pratos e bloqueia agendamentos de cardápios com alta rejeição histórica sem aviso.",
          icone: <BrainCircuit className="w-5 h-5 text-primaria" />
        },
        {
          titulo: "Autenticação 2FA Bancária",
          sub: "TOTP + Bcrypt + Recovery",
          texto: "Administradores utilizam segundo fator de autenticação baseado em tempo com chaves efêmeras e recuperação.",
          icone: <Lock className="w-5 h-5 text-emerald-600" />
        },
        {
          titulo: "Relógio Monotônico",
          sub: "performance.now() Sync",
          texto: "Bloqueia fraudes de horários de chamada ancorando milissegundos de hardware ao timestamp atômico do servidor.",
          icone: <Clock className="w-5 h-5 text-amber-600" />
        },
        {
          titulo: "Gateway Sentinela",
          sub: "Supervisor + WebSocket",
          texto: "Proxy reverso que auto-recupera o backend em 1.5s em caso de falha e isola o modo manutenção com anti-spoofing.",
          icone: <Server className="w-5 h-5 text-blue-600" />
        }
      ]
    },
    {
      id: 8,
      layout: 'database-scale',
      tag: "METADADOS & ESCALA REAL",
      titulo: "O Volume dos Dados em Produção",
      subtitulo: "Mapeamento quantitativo das 18 tabelas relacionais em execução com concorrência SQLite WAL.",
      metricasBanco: [
        { valor: "40", label: "Turmas Escolares", sub: "F1, F2, Médio, SENAI, Personaliza", icone: <Users className="w-5 h-5 text-orange-400" /> },
        { valor: "62", label: "Alunos com Dietas", sub: "Prontuários e laudos nominais", icone: <Utensils className="w-5 h-5 text-emerald-400" /> },
        { valor: "60", label: "Restrições no Catálogo", sub: "Lactose, Glúten, APLV, Diabetes...", icone: <ShieldCheck className="w-5 h-5 text-blue-400" /> },
        { valor: "1.445", label: "Refeições Mapeadas", sub: "Cardápio planejado por turno", icone: <Layers className="w-5 h-5 text-amber-400" /> },
        { valor: "530", label: "Votos de Avaliação", sub: "Histórico de aprovação de pratos", icone: <LineChart className="w-5 h-5 text-rose-400" /> },
        { valor: "302", label: "Chamadas Realizadas", sub: "Presenças e frequências auditadas", icone: <CheckCircle2 className="w-5 h-5 text-green-400" /> },
        { valor: "32", label: "Pesagens de Lixo", sub: "Auditoria física limpo vs sujo", icone: <Scale className="w-5 h-5 text-violet-400" /> },
        { valor: "18", label: "Tabelas Drizzle ORM", sub: "Modo WAL nativo sem lock", icone: <Database className="w-5 h-5 text-cyan-400" /> }
      ]
    },
    {
      id: 9,
      layout: 'showcase-totem',
      tag: "TRANSPARÊNCIA & ENGAJAMENTO",
      titulo: "Totem Interativo do Refeitório",
      subtitulo: "Comunicação aberta com a comunidade escolar através de telões na entrada do refeitório.",
      destaques: [
        {
          titulo: "Cardápio do Dia em Tempo Real",
          desc: "Exibe o que será servido em cada turno com alertas de alérgenos e valores nutricionais."
        },
        {
          titulo: "Ranking de Pratos Favoritos",
          desc: "Gamificação positiva baseada nas avaliações diárias respondidas pelos alunos através dos professores."
        },
        {
          titulo: "Mural de Metas de Desperdício",
          desc: "Engaja os alunos na redução do desperdício mostrando o progresso da campanha de sustentabilidade."
        }
      ]
    },
    {
      id: 10,
      layout: 'hero-end',
      tag: "RESULTADOS & IMPACTO",
      titulo: "Da Teoria à Eficiência Comprovada",
      subtitulo: "O SESI Alimenta já está transformando a rotina do SESI Caçapava: economia orçamentária, segurança alimentar e respeito ao alimento.",
      conclusoes: [
        "Eliminação total do desperdício por superprodução na cozinha.",
        "Zero incidentes de contaminação cruzada para alunos com dietas.",
        "Rastreabilidade completa de ponta a ponta com auditoria digital.",
        "Tecnologia 100% autoral pronta para escalar para a rede SESI."
      ]
    }
  ];

  const totalSlides = Array.isArray(slides) ? slides.length : 0;

  const changeSlide = useCallback((newIndex) => {
    if (isTransitioning || newIndex < 0 || newIndex >= totalSlides) return;
    setIsTransitioning(true);
    setCurrentSlide(newIndex);
    setTimeout(() => setIsTransitioning(false), 400);
  }, [totalSlides, isTransitioning]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        changeSlide(currentSlide + 1);
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        changeSlide(currentSlide - 1);
      }
      if (e.key === 'Home') {
        e.preventDefault();
        changeSlide(0);
      }
      if (e.key === 'End') {
        e.preventDefault();
        changeSlide(totalSlides - 1);
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setShowGridDrawer(prev => !prev);
      }
      if (e.key === 'Escape' && showGridDrawer) {
        setShowGridDrawer(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeSlide, currentSlide, totalSlides, showGridDrawer]);

  const slide = (Array.isArray(slides) && slides[currentSlide]) || (Array.isArray(slides) && slides[0]) || {};
  const progressPercentage = totalSlides > 0 ? ((currentSlide + 1) / totalSlides) * 100 : 0;

  return (
    <div className={`relative h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans select-none flex flex-col justify-between transition-all ${!controlsVisible ? 'cursor-none' : ''}`}>
      
      {/* Background Decorators Soft Glow */}
      <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full bg-orange-600/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

      {/* Barra de Progresso Minimalista no Topo */}
      <div className="fixed top-0 left-0 h-1 w-full bg-zinc-900 z-50">
        <div 
          className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Header Superior Flutuante */}
      <header className={`fixed top-5 left-6 right-6 md:top-7 md:left-10 md:right-10 flex justify-between items-center z-40 transition-all duration-500 ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
        <div className="flex items-center gap-3 bg-zinc-900/80 backdrop-blur-xl px-4 py-2 rounded-2xl border border-zinc-800/80 shadow-2xl">
          <img src="/logo_limpa.png" alt="SESI Alimenta" className="h-5 w-auto object-contain" />
          <div className="w-px h-3.5 bg-zinc-700 hidden sm:block" />
          <span className="text-[11px] font-black uppercase tracking-widest text-zinc-300 hidden sm:block">SESI Alimenta</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30">
            Unidade Caçapava
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão Ver Todos os Slides (Grid) */}
          <button 
            type="button"
            onClick={() => setShowGridDrawer(true)} 
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900/80 hover:bg-zinc-800 backdrop-blur-xl rounded-xl border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all"
            title="Ver grade de slides (Tecla G)"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden md:inline">Visão Geral</span>
          </button>

          {/* Botão Fullscreen */}
          <button 
            type="button"
            onClick={toggleFullscreen} 
            className="p-2 bg-zinc-900/80 hover:bg-zinc-800 backdrop-blur-xl rounded-xl border border-zinc-800 text-zinc-300 hover:text-white transition-all"
            title="Alternar Tela Cheia (Tecla F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Botão Fechar */}
          <button 
            type="button"
            onClick={() => navigate(-1)} 
            className="p-2 bg-zinc-900/80 hover:bg-red-500/20 hover:border-red-500/40 backdrop-blur-xl rounded-xl border border-zinc-800 text-zinc-400 hover:text-red-400 transition-all"
            title="Sair da apresentação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ÁREA CENTRAL DO SLIDE DINÂMICO */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12 w-full max-w-7xl mx-auto z-10 my-auto">
        <div 
          key={slide?.id || currentSlide} 
          className={`w-full transition-all duration-400 ease-out ${isTransitioning ? 'opacity-0 scale-[0.98] translate-y-3' : 'opacity-100 scale-100 translate-y-0'}`}
        >
          
          {/* SLIDE LAYOUT 1: HERO START */}
          {slide.layout === 'hero-start' && (
            <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-black uppercase tracking-[0.25em] mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                {slide.tag}
              </div>
              
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white mb-6 leading-[1.05]">
                {slide.titulo}
              </h1>
              
              <p className="text-lg sm:text-2xl font-medium text-zinc-300 max-w-3xl leading-relaxed mb-12">
                {slide.subtitulo}
              </p>

              {/* Grid de Métricas de Destaque */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                {(slide.stats || []).map((st, idx) => (
                  <div key={idx} className="bg-zinc-900/70 border border-zinc-800/80 backdrop-blur-xl p-5 rounded-3xl text-left hover:border-zinc-700 transition-all group">
                    <div className="p-2.5 rounded-2xl bg-zinc-800/80 w-fit mb-3 group-hover:scale-110 transition-transform">
                      {st.icone}
                    </div>
                    <div className="text-3xl font-black text-white tracking-tight mb-1">{st.valor}</div>
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{st.rotulo}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE LAYOUT 2: COMPARISON (ANTES VS DEPOIS) */}
          {slide.layout === 'comparison' && (
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-10">
                <span className="text-xs font-black tracking-[0.3em] uppercase text-orange-400 mb-2 block">{slide.tag}</span>
                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-3">{slide.titulo}</h2>
                <p className="text-base md:text-lg text-zinc-400 font-medium max-w-2xl mx-auto">{slide.subtitulo}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card Antes */}
                <div className="bg-zinc-900/60 border border-red-500/20 rounded-3xl p-6 md:p-8 backdrop-blur-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-black text-red-400">{slide.antes.titulo}</h3>
                  </div>
                  <ul className="space-y-4">
                    {slide.antes.itens.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-zinc-300 text-sm md:text-base font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card Depois */}
                <div className="bg-zinc-900/80 border border-emerald-500/30 rounded-3xl p-6 md:p-8 backdrop-blur-md relative overflow-hidden shadow-2xl shadow-emerald-950/20">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-black text-emerald-400">{slide.depois.titulo}</h3>
                  </div>
                  <ul className="space-y-4">
                    {slide.depois.itens.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-zinc-100 text-sm md:text-base font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE LAYOUT 3: BENTO STEAM */}
          {slide.layout === 'bento-steam' && (
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8">
                <span className="text-xs font-black tracking-[0.3em] uppercase text-orange-400 mb-2 block">{slide.tag}</span>
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">{slide.titulo}</h2>
                <p className="text-sm md:text-base text-zinc-400 font-medium max-w-2xl mx-auto">{slide.subtitulo}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {(slide.cards || []).map((card, i) => (
                  <div key={i} className="bg-zinc-900/70 border border-zinc-800/90 rounded-3xl p-6 backdrop-blur-xl hover:border-zinc-700 transition-all flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-zinc-800/80 group-hover:scale-105 transition-transform">
                          {card.icone}
                        </div>
                        <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                          {card.destaque}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-white mb-2">{card.titulo}</h3>
                      <p className="text-sm text-zinc-400 font-medium leading-relaxed">{card.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE LAYOUT 4: WORKFLOW JOURNEY */}
          {slide.layout === 'workflow-journey' && (
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-10">
                <span className="text-xs font-black tracking-[0.3em] uppercase text-orange-400 mb-2 block">{slide.tag}</span>
                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-3">{slide.titulo}</h2>
                <p className="text-base text-zinc-400 font-medium max-w-2xl mx-auto">{slide.subtitulo}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                {(slide.etapas || []).map((etapa, idx) => (
                  <div key={idx} className="bg-zinc-900/70 border border-zinc-800/80 rounded-3xl p-7 backdrop-blur-xl flex flex-col justify-between relative group hover:border-orange-500/40 transition-all">
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-3xl font-black text-zinc-700 group-hover:text-orange-400 transition-colors font-mono">{etapa.numero}</span>
                        <div className="p-3 rounded-2xl bg-zinc-800/80">
                          {etapa.icone}
                        </div>
                      </div>
                      <div className="text-xs font-black text-orange-400 uppercase tracking-widest mb-1">{etapa.foco}</div>
                      <h3 className="text-xl font-black text-white mb-3">{etapa.papel}</h3>
                      <p className="text-sm text-zinc-400 font-medium leading-relaxed">{etapa.detalhe}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE LAYOUT 5: CLINICAL DIET */}
          {slide.layout === 'clinical-diet' && (
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10">
                <span className="text-xs font-black tracking-[0.3em] uppercase text-emerald-400 mb-2 block">{slide.tag}</span>
                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-3">{slide.titulo}</h2>
                <p className="text-base text-zinc-400 font-medium max-w-2xl mx-auto">{slide.subtitulo}</p>
              </div>

              <div className="space-y-4">
                {(slide.itens || []).map((item, idx) => (
                  <div key={idx} className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 md:p-7 flex items-start sm:items-center gap-5 hover:border-emerald-500/40 transition-all">
                    <div className="p-3.5 rounded-2xl bg-zinc-800 shrink-0">
                      {item.icone}
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-black text-white mb-1">{item.nome}</h3>
                      <p className="text-sm md:text-base text-zinc-400 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE LAYOUT 6: BI FORMULAS */}
          {slide.layout === 'bi-formulas' && (
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8">
                <span className="text-xs font-black tracking-[0.3em] uppercase text-orange-400 mb-2 block">{slide.tag}</span>
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">{slide.titulo}</h2>
                <p className="text-sm md:text-base text-zinc-400 font-medium max-w-2xl mx-auto">{slide.subtitulo}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {(slide.formulas || []).map((f, idx) => (
                  <div key={idx} className={`rounded-3xl p-6 bg-zinc-900/75 border border-zinc-800/90 backdrop-blur-xl flex flex-col justify-between transition-all group ${f.corCard}`}>
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className={`text-2xl font-black tracking-tight ${f.corDestaque}`}>{f.sigla}</span>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${f.corBadge}`}>
                          {f.meta}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-white mb-4">{f.nome}</h3>
                      
                      {/* Box Matemático com Fração Real Formatada */}
                      <div className="bg-zinc-950/90 border border-zinc-800/90 p-4 rounded-2xl mb-4 shadow-inner flex items-center justify-center font-mono">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-zinc-200">
                          {f.prefixo && <span className="text-zinc-400 whitespace-nowrap">{f.prefixo}</span>}
                          
                          <div className="inline-flex flex-col items-center justify-center">
                            <span className="text-orange-300 px-2 pb-1 text-center whitespace-nowrap text-xs border-b border-zinc-700">
                              {f.numerador}
                            </span>
                            <span className="text-zinc-400 px-2 pt-1 text-center whitespace-nowrap text-[11px]">
                              {f.denominador}
                            </span>
                          </div>

                          {f.sufixo && <span className="text-zinc-400 whitespace-nowrap">{f.sufixo}</span>}
                        </div>
                      </div>

                      <p className="text-xs text-zinc-400 font-medium leading-relaxed">{f.significado}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span>Unidade:</span>
                      <span className="text-zinc-300 font-bold">{f.unidade}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE LAYOUT 7: TECH RADAR */}
          {slide.layout === 'tech-radar' && (
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8">
                <span className="text-xs font-black tracking-[0.3em] uppercase text-blue-400 mb-2 block">{slide.tag}</span>
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">{slide.titulo}</h2>
                <p className="text-sm md:text-base text-zinc-400 font-medium max-w-2xl mx-auto">{slide.subtitulo}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {(slide.cards || []).map((c, idx) => (
                  <div key={idx} className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 backdrop-blur-xl hover:border-zinc-700 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-zinc-800">
                          {c.icone}
                        </div>
                        <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                          {c.sub}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-white mb-2">{c.titulo}</h3>
                      <p className="text-sm text-zinc-400 font-medium leading-relaxed">{c.texto}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE LAYOUT 8: DATABASE SCALE & VOLUME */}
          {slide.layout === 'database-scale' && (
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8">
                <span className="text-xs font-black tracking-[0.3em] uppercase text-cyan-400 mb-2 block">{slide.tag}</span>
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">{slide.titulo}</h2>
                <p className="text-sm md:text-base text-zinc-400 font-medium max-w-2xl mx-auto">{slide.subtitulo}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(slide.metricasBanco || []).map((m, idx) => (
                  <div key={idx} className="bg-zinc-900/70 border border-zinc-800/80 rounded-3xl p-5 backdrop-blur-xl hover:border-cyan-500/40 transition-all flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-2xl bg-zinc-800/80 group-hover:scale-105 transition-transform">
                          {m.icone}
                        </div>
                        <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest px-2 py-0.5 rounded-full bg-zinc-800/60 border border-zinc-700/50">
                          DB STAT
                        </span>
                      </div>
                      <div className="text-3xl font-black text-white tracking-tight mb-1 font-mono">{m.valor}</div>
                      <h3 className="text-sm font-black text-zinc-200 mb-1">{m.label}</h3>
                      <p className="text-[11px] text-zinc-400 font-medium leading-snug">{m.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE LAYOUT 9: SHOWCASE TOTEM */}
          {slide.layout === 'showcase-totem' && (
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10">
                <span className="text-xs font-black tracking-[0.3em] uppercase text-orange-400 mb-2 block">{slide.tag}</span>
                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-3">{slide.titulo}</h2>
                <p className="text-base text-zinc-400 font-medium max-w-2xl mx-auto">{slide.subtitulo}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {(slide.destaques || []).map((d, idx) => (
                  <div key={idx} className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between hover:border-orange-500/40 transition-all">
                    <div>
                      <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center font-black text-sm mb-4">
                        0{idx + 1}
                      </div>
                      <h3 className="text-lg font-black text-white mb-2">{d.titulo}</h3>
                      <p className="text-sm text-zinc-400 font-medium leading-relaxed">{d.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE LAYOUT 9: HERO END */}
          {slide.layout === 'hero-end' && (
            <div className="max-w-5xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-[0.25em] mb-6">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {slide.tag}
              </div>

              <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight mb-6">
                {slide.titulo}
              </h2>

              <p className="text-lg md:text-xl text-zinc-300 font-medium max-w-3xl mx-auto mb-10 leading-relaxed">
                {slide.subtitulo}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-3xl mx-auto mb-10">
                {(slide.conclusoes || []).map((c, idx) => (
                  <div key={idx} className="bg-zinc-900/80 border border-zinc-800 p-4.5 rounded-2xl flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-sm font-semibold text-zinc-200">{c}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => changeSlide(0)}
                  className="px-6 py-3 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-black uppercase tracking-wider transition-all"
                >
                  Reiniciar Apresentação
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="px-8 py-3 rounded-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-950/30 transition-all flex items-center gap-2"
                >
                  Acessar Sistema <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* CONTROLES FLUTUANTES ESTILO CANVA (AUTO-HIDE INTELIGENTE) */}
      <footer className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ease-out ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`}>
        <div className="flex items-center gap-3 bg-zinc-900/90 backdrop-blur-2xl shadow-2xl border border-zinc-800/80 px-5 py-2.5 rounded-full">
          <button 
            type="button"
            onClick={() => changeSlide(currentSlide - 1)}
            disabled={currentSlide === 0}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full disabled:opacity-20 disabled:hover:bg-transparent transition-all active:scale-90"
            title="Slide Anterior (Seta Esquerda)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          {/* Contador de Slides */}
          <div className="flex items-center gap-1.5 px-3 text-xs font-black tracking-widest select-none font-mono">
            <span className="text-white">{String(currentSlide + 1).padStart(2, '0')}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-500">{String(totalSlides).padStart(2, '0')}</span>
          </div>

          <button 
            type="button"
            onClick={() => changeSlide(currentSlide + 1)}
            disabled={currentSlide === totalSlides - 1}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full disabled:opacity-20 disabled:hover:bg-transparent transition-all active:scale-90"
            title="Próximo Slide (Seta Direita / Espaço)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="w-px h-5 bg-zinc-800 mx-1" />

          <button 
            type="button"
            onClick={() => changeSlide(currentSlide + 1)}
            disabled={currentSlide === totalSlides - 1}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:hover:brightness-100"
          >
            {currentSlide === totalSlides - 1 ? 'Concluído' : 'Avançar'} <Play className="w-3 h-3 fill-current" />
          </button>
        </div>
      </footer>

      {/* GAVETA MODAL DE MINIATURAS DE SLIDES (GRID DRAWER) */}
      {showGridDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex flex-col p-6 md:p-12 animate-fade-in">
          <div className="flex justify-between items-center max-w-6xl mx-auto w-full mb-8">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Grade de Slides</h3>
              <p className="text-sm text-zinc-400 font-medium">Clique em qualquer slide para pular diretamente.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowGridDrawer(false)}
              className="p-2.5 rounded-full bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-w-6xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-10">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  changeSlide(idx);
                  setShowGridDrawer(false);
                }}
                className={`text-left p-5 rounded-2xl border transition-all flex flex-col justify-between h-44 group ${
                  currentSlide === idx 
                    ? 'bg-orange-950/30 border-orange-500 ring-2 ring-orange-500/30 text-white' 
                    : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-600 text-zinc-300'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-mono font-black text-orange-400">0{idx + 1}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{s.tag}</span>
                  </div>
                  <h4 className="text-base font-black text-white line-clamp-1 group-hover:text-orange-400 transition-colors">{s.titulo}</h4>
                  <p className="text-xs text-zinc-400 font-medium line-clamp-2 mt-1">{s.subtitulo || s.texto || ''}</p>
                </div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Layout: {s.layout}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}