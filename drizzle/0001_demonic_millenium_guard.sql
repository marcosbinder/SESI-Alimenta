CREATE TABLE `ingredientes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`unidade_medida` text NOT NULL,
	`calorias` real DEFAULT 0 NOT NULL,
	`proteinas` real DEFAULT 0 NOT NULL,
	`carboidratos` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ingredientes_nome_unique` ON `ingredientes` (`nome`);--> statement-breakpoint
CREATE TABLE `receitas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `receitas_nome_unique` ON `receitas` (`nome`);--> statement-breakpoint
CREATE TABLE `receita_ingredientes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`receita_id` integer NOT NULL,
	`ingrediente_id` integer NOT NULL,
	`quantidade_per_capita` real NOT NULL,
	FOREIGN KEY (`receita_id`) REFERENCES `receitas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ingrediente_id`) REFERENCES `ingredientes`(`id`) ON UPDATE no action ON DELETE no action
);
