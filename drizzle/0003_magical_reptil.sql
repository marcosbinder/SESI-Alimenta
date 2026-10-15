CREATE TABLE `calendario` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`data` text NOT NULL,
	`receita_id` integer NOT NULL,
	FOREIGN KEY (`receita_id`) REFERENCES `receitas`(`id`) ON UPDATE no action ON DELETE no action
);
