const { sqliteTable, integer, text, real, unique } = require('drizzle-orm/sqlite-core');

const turmas = sqliteTable('turmas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nivel: text('nivel').notNull(),
  ano: integer('ano').notNull(),
  identificador: text('identificador').notNull()
});

const usuarios = sqliteTable('usuarios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  usuario: text('usuario').notNull().unique(),
  senha: text('senha').notNull(),
  tipo: text('tipo').notNull(),
  ativo: integer('ativo').notNull().default(1),
  two_factor_secret: text('two_factor_secret'),
  two_factor_enabled: integer('two_factor_enabled').notNull().default(0),
  recovery_codes: text('recovery_codes'),
  token_version: integer('token_version').notNull().default(1)
});

const dias_nao_letivos = sqliteTable('dias_nao_letivos', {
  data: text('data').primaryKey(),
  descricao: text('descricao').notNull().default('Feriado / Recesso')
});

const dias_ignorados_turma = sqliteTable('dias_ignorados_turma', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  data: text('data').notNull(),
  turma_id: integer('turma_id').notNull().references(() => turmas.id, { onDelete: 'cascade' })
}, (t) => ({
  unq_dia_ignorado: unique().on(t.data, t.turma_id)
}));

const receitas = sqliteTable('receitas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull().unique()
});

const catalogo_alimentos = sqliteTable('catalogo_alimentos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull(),
  categoria: text('categoria').notNull(), // 'lanche', 'bebida', 'fruta', 'arroz', 'feijao', 'prato_principal', 'opcao_vegetal', 'guarnicao', 'molho_salada', 'sobremesa'
  ativo: integer('ativo').notNull().default(1),
  criado_em: text('criado_em').notNull()
}, (t) => ({
  unq_catalogo_item: unique().on(t.nome, t.categoria)
}));

const restricoes = sqliteTable('restricoes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull().unique()
});

/*
NOTA SOBRE OS ALUNOS COM RESTRIÇÃO ALIMENTAR (DIETAS):
Antes de normalizar o banco, os alunos e turmas eram duplicados em várias tabelas. 
A tabela aluno_turmas resolve isso relacionando o aluno com sua turma base ou contraturno, 
e as consultas ficam mais fáceis usando apenas os IDs, evitando duplicações desnecessárias.
*/

const alunos_especiais = sqliteTable('alunos_especiais', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull()
});

const aluno_turmas = sqliteTable('aluno_turmas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  aluno_id: integer('aluno_id').notNull().references(() => alunos_especiais.id, { onDelete: 'cascade' }),
  turma_id: integer('turma_id').notNull().references(() => turmas.id, { onDelete: 'cascade' }),
  tipo_vinculo: text('tipo_vinculo').notNull().default('Base')
}, (t) => ({
  unq_aluno_turma: unique().on(t.aluno_id, t.turma_id)
}));

const aluno_restricoes = sqliteTable('aluno_restricoes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  aluno_id: integer('aluno_id').notNull().references(() => alunos_especiais.id, { onDelete: 'cascade' }),
  restricao_id: integer('restricao_id').notNull().references(() => restricoes.id, { onDelete: 'cascade' })
}, (t) => ({
  unq_aluno_restricao: unique().on(t.aluno_id, t.restricao_id)
}));

const calendario = sqliteTable('calendario', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  data: text('data').notNull(),
  turma_id: integer('turma_id').notNull().references(() => turmas.id, { onDelete: 'cascade' }),
  tipo_refeicao: text('tipo_refeicao').notNull(),
  lanche_padrao: text('lanche_padrao').notNull(),
  lanche_dieta: text('lanche_dieta'),
  bebida: text('bebida'),
  fruta: text('fruta'),
  arroz: text('arroz'),
  feijao: text('feijao'),
  prato_principal: text('prato_principal'),
  opcao_vegetal: text('opcao_vegetal'),
  guarnicao: text('guarnicao'),
  molho_salada: text('molho_salada'),
  sobremesa: text('sobremesa'),
  prato_principal_dieta: text('prato_principal_dieta')
}, (t) => ({
  unq_calendario: unique().on(t.data, t.turma_id, t.tipo_refeicao)
}));

const avaliacoes_comida = sqliteTable('avaliacoes_comida', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  data: text('data').notNull(),
  turma_id: integer('turma_id').notNull().references(() => turmas.id, { onDelete: 'cascade' }),
  tipo_refeicao: text('tipo_refeicao').notNull().default('Geral'),
  gostaram: integer('gostaram').notNull().default(0),
  nao_gostaram: integer('nao_gostaram').notNull().default(0),
  observacao: text('observacao'),
  criado_por: text('criado_por'),
  alterado_por: text('alterado_por')
}, (t) => ({
  unq_avaliacao: unique().on(t.data, t.turma_id, t.tipo_refeicao)
}));

const presenca_restricoes = sqliteTable('presenca_restricoes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  data: text('data').notNull(),
  aluno_id: integer('aluno_id').notNull().references(() => alunos_especiais.id, { onDelete: 'cascade' }),
  presente: integer('presente').notNull(),
  tipo_refeicao: text('tipo_refeicao').notNull().default('Geral')
}, (t) => ({
  unq_presenca_dieta: unique().on(t.data, t.aluno_id, t.tipo_refeicao)
}));

const presenca_geral = sqliteTable('presenca_geral', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  data: text('data').notNull(),
  turma_id: integer('turma_id').notNull().references(() => turmas.id, { onDelete: 'cascade' }),
  tipo_refeicao: text('tipo_refeicao').notNull().default('Geral'),
  quantidade: integer('quantidade').notNull(),
  criado_por: text('criado_por'),
  alterado_por: text('alterado_por')
}, (t) => ({
  unq_presenca_geral: unique().on(t.data, t.turma_id, t.tipo_refeicao)
}));

const auditoria_lixo = sqliteTable('auditoria_lixo', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  data: text('data').notNull(),
  tipo_refeicao: text('tipo_refeicao').notNull(),
  lixo_limpo_kg: real('lixo_limpo_kg').notNull().default(0),
  lixo_sujo_kg: real('lixo_sujo_kg').notNull().default(0)
}, (t) => ({
  unq_lixo: unique().on(t.data, t.tipo_refeicao)
}));

const solicitacoes_almoco = sqliteTable('solicitacoes_almoco', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  professor_id: integer('professor_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  aluno_nome: text('aluno_nome').notNull(),
  aluno_sobrenome: text('aluno_sobrenome').notNull(),
  chamada: text('chamada').notNull(),
  turma_id: integer('turma_id').notNull().references(() => turmas.id, { onDelete: 'cascade' }),
  motivo: text('motivo').notNull(),
  datas: text('datas').notNull(),
  is_dieta: integer('is_dieta').notNull().default(0),
  status: text('status').notNull().default('Pendente'),
  justificativa: text('justificativa'),
  avaliado_por: text('avaliado_por'),
  avaliado_em: text('avaliado_em'),
  cancelado_em: text('cancelado_em'),
  autor_cancelamento: text('autor_cancelamento'),
  motivo_cancelamento: text('motivo_cancelamento'),
  criado_em: text('criado_em').notNull(),
  grupo_lote_id: text('grupo_lote_id'),
  motivo_lote: text('motivo_lote'),
  dieta_sugerida: text('dieta_sugerida')
});

const reportes_erro = sqliteTable('reportes_erro', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  usuario: text('usuario').notNull(),
  perfil: text('perfil').notNull(),
  mensagem: text('mensagem').notNull(),
  criado_em: text('criado_em').notNull(),
  resolvido: integer('resolvido').notNull().default(0)
});

const logs_sistema = sqliteTable('logs_sistema', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nivel: text('nivel').notNull().default('INFO'), // Pode ser: INFO, AVISO, ERRO, CRITICO
  rota: text('rota'),
  mensagem: text('mensagem').notNull(),
  detalhes: text('detalhes'),
  usuario: text('usuario'),
  criado_em: text('criado_em').notNull()
});

const notificacoes = sqliteTable('notificacoes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titulo: text('titulo').notNull(),
  mensagem: text('mensagem').notNull(),
  autor: text('autor').notNull(),
  criado_em: text('criado_em').notNull(),
  alvo_tipo: text('alvo_tipo').notNull().default('GLOBAL'),
  alvo_usuario_id: integer('alvo_usuario_id').references(() => usuarios.id, { onDelete: 'cascade' })
});

const notificacoes_lidas = sqliteTable('notificacoes_lidas', {
  usuario_id: integer('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  notificacao_id: integer('notificacao_id').notNull().references(() => notificacoes.id, { onDelete: 'cascade' }),
  lida_em: text('lida_em').notNull()
}, (t) => ({
  unq_notificacao_lida: unique().on(t.usuario_id, t.notificacao_id)
}));

const feedbacks_lidos = sqliteTable('feedbacks_lidos', {
  usuario_id: integer('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  feedback_id: text('feedback_id').notNull(),
  lido_em: text('lido_em').notNull()
}, (t) => ({
  unq_feedback_lido: unique().on(t.usuario_id, t.feedback_id)
}));

const parametros_sistema = sqliteTable('parametros_sistema', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chave: text('chave').notNull().unique(),
  valor: real('valor').notNull(),
  descricao: text('descricao')
});

const modo_manutencao = sqliteTable('modo_manutencao', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ativo: integer('ativo').notNull().default(0),
  mensagem: text('mensagem').notNull().default('O sistema está passando por manutenção programada para melhorias técnicas. Retornaremos em breve.'),
  previsao: text('previsao').default(''),
  ips_autorizados: text('ips_autorizados').notNull().default('127.0.0.1,::1,::ffff:127.0.0.1'),
  atualizado_em: text('atualizado_em'),
  atualizado_por: text('atualizado_por')
});

module.exports = {
  turmas, usuarios, dias_nao_letivos, receitas, catalogo_alimentos,
  restricoes, alunos_especiais, aluno_turmas, aluno_restricoes,
  calendario, avaliacoes_comida, presenca_restricoes, presenca_geral, auditoria_lixo,
  solicitacoes_almoco, reportes_erro, logs_sistema, parametros_sistema, notificacoes, notificacoes_lidas,
  feedbacks_lidos, dias_ignorados_turma, modo_manutencao
};