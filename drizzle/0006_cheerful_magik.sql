ALTER TABLE `calendario` ADD `tipo_refeicao` text NOT NULL;--> statement-breakpoint
ALTER TABLE `calendario` ADD `turma_id` integer NOT NULL REFERENCES turmas(id);