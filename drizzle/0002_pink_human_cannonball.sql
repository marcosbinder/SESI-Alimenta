CREATE TABLE `restricoes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `restricoes_nome_unique` ON `restricoes` (`nome`);--> statement-breakpoint
CREATE TABLE `alunos_especiais` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`turma_id` integer NOT NULL,
	FOREIGN KEY (`turma_id`) REFERENCES `turmas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `aluno_restricoes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`aluno_id` integer NOT NULL,
	`restricao_id` integer NOT NULL,
	FOREIGN KEY (`aluno_id`) REFERENCES `alunos_especiais`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`restricao_id`) REFERENCES `restricoes`(`id`) ON UPDATE no action ON DELETE no action
);
