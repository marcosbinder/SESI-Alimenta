CREATE TABLE `avaliacoes_comida` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`data` text NOT NULL,
	`turma_id` integer NOT NULL,
	`gostaram` integer DEFAULT 0 NOT NULL,
	`razoavel` integer DEFAULT 0 NOT NULL,
	`nao_gostaram` integer DEFAULT 0 NOT NULL,
	`nao_comeram` integer DEFAULT 0 NOT NULL,
	`observacao` text,
	FOREIGN KEY (`turma_id`) REFERENCES `turmas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `presenca_restricoes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`data` text NOT NULL,
	`aluno_id` integer NOT NULL,
	`presente` integer NOT NULL,
	FOREIGN KEY (`aluno_id`) REFERENCES `alunos_especiais`(`id`) ON UPDATE no action ON DELETE no action
);
