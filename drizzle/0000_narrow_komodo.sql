CREATE TABLE `turmas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nivel` text NOT NULL,
	`ano` integer NOT NULL,
	`identificador` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `usuarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`usuario` text NOT NULL,
	`senha` text NOT NULL,
	`tipo` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_usuario_unique` ON `usuarios` (`usuario`);