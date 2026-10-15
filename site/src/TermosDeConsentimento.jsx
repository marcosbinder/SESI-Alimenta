import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function TermosDeConsentimento() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Termos de Uso | SESI Alimenta";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[url('/escola.jpeg')] bg-cover bg-center bg-fixed relative flex items-center justify-center p-4 sm:p-8 font-sans selection:bg-primaria selection:text-white">
      
      {/* Overlay Escuro com Blur */}
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"></div>
      
      {/* Efeitos de luz coloridos por cima do overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-primaria/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-primaria/20 blur-[100px] rounded-full"></div>
      </div>

      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] border border-white/10 overflow-hidden relative z-10 my-4 sm:my-8 animate-fade-in">
        
        {/* HEADER DO DOCUMENTO */}
        <div className="bg-zinc-900 text-white p-8 md:p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,_var(--color-primaria)_0%,_transparent_70%)]"></div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primaria/40 blur-[80px] rounded-full"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="bg-primaria/20 text-primaria border border-primaria/30 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest backdrop-blur-sm">
                  Documento Legal
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">Termo de Consentimento</h1>
              <p className="text-zinc-400 font-medium text-sm md:text-base mt-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primaria"></span>
                Isenção de Responsabilidade e Créditos • SESI Alimenta
              </p>
            </div>
            
            <button 
              onClick={() => navigate('/login')}
              className="w-full md:w-auto bg-white/10 hover:bg-white text-white hover:text-zinc-900 font-black py-3.5 px-6 rounded-xl transition-all duration-300 shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest text-xs border border-white/20 hover:border-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              Voltar ao Login
            </button>
          </div>
        </div>

        {/* CONTEÚDO DO DOCUMENTO */}
        <div className="p-8 md:p-12 space-y-12 bg-white relative">
          
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-zinc-50 to-transparent pointer-events-none"></div>

          <section className="flex gap-5 md:gap-6 items-start group relative z-10">
            <div className="shrink-0 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-zinc-50 text-zinc-400 font-black text-xl md:text-2xl border border-zinc-100 group-hover:bg-primaria group-hover:text-white group-hover:border-primaria group-hover:shadow-lg group-hover:shadow-primaria/20 transition-all duration-300">
              01
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-zinc-900 mb-2 md:mb-3 uppercase tracking-wide group-hover:text-primaria transition-colors duration-300">
                Natureza do Projeto e Isenção Institucional
              </h2>
              <p className="text-zinc-500 font-medium leading-relaxed text-sm md:text-base">
                O software de logística de refeitório é um projeto estudantil independente idealizado e desenvolvido por Marcos Roberto Bretas Binder, com coidealização e apoio fundamental do Professor Everson e da equipe de Coordenação Escolar (no nome da coordenadora Luciana). Este sistema não possui vínculo oficial, patrocínio ou homologação de entidades corporativas externas, sendo seu uso voluntário e restrito ao auxílio operacional da unidade.
              </p>
            </div>
          </section>

          <section className="flex gap-5 md:gap-6 items-start group relative z-10">
            <div className="shrink-0 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-zinc-50 text-zinc-400 font-black text-xl md:text-2xl border border-zinc-100 group-hover:bg-primaria group-hover:text-white group-hover:border-primaria group-hover:shadow-lg group-hover:shadow-primaria/20 transition-all duration-300">
              02
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-zinc-900 mb-2 md:mb-3 uppercase tracking-wide group-hover:text-primaria transition-colors duration-300">
                Guarda de Dados e Infraestrutura Local
              </h2>
              <p className="text-zinc-500 font-medium leading-relaxed text-sm md:text-base">
                O sistema não está hospedado na internet pública ou em servidores na nuvem de terceiros. O código-fonte e o banco de dados executam fisicamente em um computador de propriedade, custódia e responsabilidade exclusiva da escola, conectado à sua intranet. O desenvolvedor não possui acesso remoto irrestrito, posse ou controle sobre a integridade física do banco de dados, sendo a segurança da rede local um dever da instituição.
              </p>
            </div>
          </section>

          <section className="flex gap-5 md:gap-6 items-start group relative z-10">
            <div className="shrink-0 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-zinc-50 text-zinc-400 font-black text-xl md:text-2xl border border-zinc-100 group-hover:bg-primaria group-hover:text-white group-hover:border-primaria group-hover:shadow-lg group-hover:shadow-primaria/20 transition-all duration-300">
              03
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-zinc-900 mb-2 md:mb-3 uppercase tracking-wide group-hover:text-primaria transition-colors duration-300">
                Criptografia Irreversível de Credenciais
              </h2>
              <p className="text-zinc-500 font-medium leading-relaxed text-sm md:text-base">
                As senhas de acesso dos operadores são submetidas a algoritmos pesados de criptografia de via única (hashing) no momento da criação. Ninguém, incluindo o desenvolvedor ou a equipe de TI da escola, possui os meios matemáticos ou técnicos para reverter a criptografia e ler as senhas em texto puro.
              </p>
            </div>
          </section>

          <section className="flex gap-5 md:gap-6 items-start group relative z-10">
            <div className="shrink-0 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-zinc-50 text-zinc-400 font-black text-xl md:text-2xl border border-zinc-100 group-hover:bg-primaria group-hover:text-white group-hover:border-primaria group-hover:shadow-lg group-hover:shadow-primaria/20 transition-all duration-300">
              04
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-zinc-900 mb-2 md:mb-3 uppercase tracking-wide group-hover:text-primaria transition-colors duration-300">
                Isenção de Responsabilidade Nutricional e Médica
              </h2>
              <p className="text-zinc-500 font-medium leading-relaxed text-sm md:text-base">
                O sistema automatiza a transferência de informações, mas não substitui a supervisão humana. O software não emite laudos médicos, não prescreve dietas e não elimina a necessidade de dupla checagem. A responsabilidade final, integral e intransferível de garantir que o alimento servido corresponde à restrição clínica do aluno permanece com os operadores da cozinha e com a equipe escolar. Em caso de falha sistêmica ou erro de banco de dados, o processo humano de verificação atuará como barreira final. O desenvolvedor isenta-se formalmente de qualquer responsabilidade civil ou criminal decorrente de reações alérgicas ou entrega incorreta de alimentos.
              </p>
            </div>
          </section>

          <section className="flex gap-5 md:gap-6 items-start group relative z-10">
            <div className="shrink-0 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-zinc-50 text-zinc-400 font-black text-xl md:text-2xl border border-zinc-100 group-hover:bg-primaria group-hover:text-white group-hover:border-primaria group-hover:shadow-lg group-hover:shadow-primaria/20 transition-all duration-300">
              05
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-zinc-900 mb-2 md:mb-3 uppercase tracking-wide group-hover:text-primaria transition-colors duration-300">
                Tratamento de Dados Sensíveis
              </h2>
              <p className="text-zinc-500 font-medium leading-relaxed text-sm md:text-base">
                O sistema processa dados de saúde (restrições alimentares) sob a premissa de que a instituição de ensino, na figura de Controladora dos Dados, já possui a devida autorização legal dos pais ou responsáveis para o tratamento dessas informações no ambiente escolar. O desenvolvedor atua exclusivamente na manutenção do código, sem qualquer poder de decisão sobre a finalidade da coleta de dados.
              </p>
            </div>
          </section>

          <section className="flex gap-5 md:gap-6 items-start group relative z-10">
            <div className="shrink-0 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-zinc-50 text-zinc-400 font-black text-xl md:text-2xl border border-zinc-100 group-hover:bg-primaria group-hover:text-white group-hover:border-primaria group-hover:shadow-lg group-hover:shadow-primaria/20 transition-all duration-300">
              06
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-zinc-900 mb-2 md:mb-3 uppercase tracking-wide group-hover:text-primaria transition-colors duration-300">
                Propriedade Intelectual e Descontinuidade
              </h2>
              <p className="text-zinc-500 font-medium leading-relaxed text-sm md:text-base">
                O código-fonte é fornecido à instituição sob o modelo "no estado em que se encontra" (as is). O desenvolvedor não assume obrigações contratuais de prestar suporte técnico vitalício, atualizações de segurança contínuas, manutenção de servidores ou correção de anomalias operacionais após o encerramento do seu vínculo com a instituição.
              </p>
            </div>
          </section>

          <section className="flex gap-5 md:gap-6 items-start group relative z-10">
            <div className="shrink-0 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-zinc-50 text-zinc-400 font-black text-xl md:text-2xl border border-zinc-100 group-hover:bg-primaria group-hover:text-white group-hover:border-primaria group-hover:shadow-lg group-hover:shadow-primaria/20 transition-all duration-300">
              07
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-zinc-900 mb-2 md:mb-3 uppercase tracking-wide group-hover:text-primaria transition-colors duration-300">
                Retenção e Exclusão
              </h2>
              <p className="text-zinc-500 font-medium leading-relaxed text-sm md:text-base">
                Para solicitar a exclusão permanente de sua conta ou retificação de dados registrados na plataforma, o usuário deverá utilizar a ferramenta de "Reportar Erro" ou contatar a administração do sistema, que executará a remoção manual no banco de dados.
              </p>
            </div>
          </section>

          <section className="flex gap-5 md:gap-6 items-start group relative z-10">
            <div className="shrink-0 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-zinc-50 text-zinc-400 font-black text-xl md:text-2xl border border-zinc-100 group-hover:bg-primaria group-hover:text-white group-hover:border-primaria group-hover:shadow-lg group-hover:shadow-primaria/20 transition-all duration-300">
              08
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-zinc-900 mb-2 md:mb-3 uppercase tracking-wide group-hover:text-primaria transition-colors duration-300">
                Aceite Irrevogável
              </h2>
              <p className="text-zinc-500 font-medium leading-relaxed text-sm md:text-base">
                A inserção de usuário e senha na tela de login e o acesso subsequente à plataforma configuram o aceite expresso, irrevogável e incondicional de todas as regras aqui dispostas.
              </p>
            </div>
          </section>

          <section className="flex gap-5 md:gap-6 items-start group relative z-10">
            <div className="shrink-0 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-zinc-50 text-zinc-400 font-black text-xl md:text-2xl border border-zinc-100 group-hover:bg-primaria group-hover:text-white group-hover:border-primaria group-hover:shadow-lg group-hover:shadow-primaria/20 transition-all duration-300">
              09
            </div>
            <div className="w-full">
              <h2 className="text-lg md:text-xl font-black text-zinc-900 mb-2 md:mb-3 uppercase tracking-wide group-hover:text-primaria transition-colors duration-300">
                Atribuições e Créditos do Projeto
              </h2>
              <div className="text-zinc-500 font-medium leading-relaxed text-sm md:text-base bg-zinc-50 p-6 rounded-2xl border border-zinc-100 w-full mt-4">
                <p className="mb-4 text-zinc-700 font-bold">O desenvolvimento e a implantação deste sistema contaram com o apoio fundamental dos seguintes colaboradores:</p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="text-primaria font-black text-lg mt-0.5">•</span>
                    <span><strong className="text-zinc-800">Marcos Binder:</strong> Desenvolvedor e idealizador principal do projeto de software.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primaria font-black text-lg mt-0.5">•</span>
                    <span><strong className="text-zinc-800">Professor Everson:</strong> Pela idealização inicial, mentoria, suporte constante e por atuar como o principal ponto de apoio para a viabilização do projeto.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primaria font-black text-lg mt-0.5">•</span>
                    <span><strong className="text-zinc-800">Coordenação Escolar (Luciana e equipe):</strong> Pelo suporte estratégico na divulgação e na estruturação do ambiente escolar para a recepção e adoção do sistema.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primaria font-black text-lg mt-0.5">•</span>
                    <span><strong className="text-zinc-800">Ibsen (Tecnologia da Informação):</strong> Pela assistência na estruturação da infraestrutura de rede e ideias técnicas para a operação local.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primaria font-black text-lg mt-0.5">•</span>
                    <span><strong className="text-zinc-800">Alunos do 9º ano:</strong> Pela ajuda no levantamento de algumas informações básicas para os testes do sistema.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* RODAPÉ */}
        <div className="bg-zinc-50 p-6 md:px-12 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
            Última atualização: <span className="text-zinc-600">04 de Agosto de 2026</span>
          </p>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-zinc-100">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Caçapava, SP</p>
          </div>
        </div>

      </div>
    </div>
  );
}
