const readline = require('readline');
const bcrypt = require('bcrypt');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function inicializar() {
    const envPath = path.join(__dirname, '../../.env');

    if (!fs.existsSync(envPath)) {
        console.log("Arquivo .env não localizado. Gerando chaves locais...");
        
        const jwtSecret = crypto.randomBytes(32).toString('hex');
        const envContent = `PORT=3000\nJWT_SECRET=${jwtSecret}\nDATABASE_URL=file:./sqlite.db\n`;
        
        fs.writeFileSync(envPath, envContent);
        console.log("Arquivo .env gerado na raiz do projeto.");
    } else {
        console.log("Arquivo .env já existe, avançando para o banco...");
    }

    console.log("Sincronizando esquema do banco de dados (drizzle-kit push)...");
    
    try {
        const { createClient } = require('@libsql/client');
        const dbClient = createClient({ url: 'file:./sqlite.db' });
        
        console.log("Injetando tabelas físicas diretamente via client SQLite...");
        await dbClient.execute(`
            CREATE TABLE IF NOT EXISTS notificacoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo TEXT NOT NULL,
                mensagem TEXT NOT NULL,
                autor TEXT NOT NULL,
                criado_em TEXT NOT NULL,
                alvo_tipo TEXT NOT NULL DEFAULT 'GLOBAL',
                alvo_usuario_id INTEGER REFERENCES usuarios(id)
            );
        `);
        
        await dbClient.execute(`
            CREATE TABLE IF NOT EXISTS notificacoes_lidas (
                usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                notificacao_id INTEGER NOT NULL REFERENCES notificacoes(id) ON DELETE CASCADE,
                lida_em TEXT NOT NULL,
                UNIQUE(usuario_id, notificacao_id)
            );
        `);
        console.log("Tabelas de notificações injetadas com sucesso!");
        
        console.log("Sincronizando esquema primário do banco (Drizzle Push) para as demais tabelas...");
        const { execSync } = require('child_process');
        const output = execSync('npx drizzle-kit push', { encoding: 'utf-8' });
        console.log(output);
    } catch (erro) {
        console.error("Falha ao criar tabelas via SQLite client:", erro.message);
        process.exit(1);
    }

    const { db } = require('../db/index');
    const { usuarios, parametros_sistema } = require('../db/schema');
    const { eq } = require('drizzle-orm');

    const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin';
    console.log(`Verificando administrador base ('${adminUsername}')...`);

    try {
        const adminExistente = await db.select().from(usuarios).where(eq(usuarios.usuario, adminUsername));
        
        async function salvarParametrosPadrao() {
            try {
                const parametrosExistentes = await db.select().from(parametros_sistema);
                const mapExist = {};
                parametrosExistentes.forEach(p => mapExist[p.chave] = true);

                const defaults = [
                    { chave: 'resto_per_capita_atencao_g', valor: 25, descricao: 'Limiar de atenção (amarelo) em g por aluno para resto no prato.' },
                    { chave: 'resto_per_capita_critico_g', valor: 45, descricao: 'Limiar crítico (vermelho) em g por aluno para resto no prato.' },
                    { chave: 'sobra_limpa_atencao_kg', valor: 5, descricao: 'Limiar de atenção para sobra limpa (kg).' },
                    { chave: 'sobra_limpa_critico_kg', valor: 10, descricao: 'Limiar crítico para sobra limpa (kg).' },
                    { chave: 'taxa_rejeicao_alerta_percentual', valor: 30, descricao: 'Percentual de rejeição que dispara alerta de cardápio.' }
                ];

                for (const p of defaults) {
                    if (!mapExist[p.chave]) {
                        await db.insert(parametros_sistema).values(p);
                    }
                }
            } catch (e) {
                console.warn('Falha ao popular parametros_sistema com valores padrões:', e.message);
            }
        }

        if (adminExistente.length > 0) {
            console.log(`Usuário administrador '${adminUsername}' já existe. Nenhuma ação necessária.`);
            await salvarParametrosPadrao();
            process.exit(0);
        }

        async function criarAdmin(senha) {
            if (!senha || senha.trim().length < 8) {
                console.error("Operação cancelada: A senha deve ter no mínimo 8 caracteres.");
                process.exit(1);
            }

            const hash = await bcrypt.hash(senha.trim(), 10);

            await db.insert(usuarios).values({
                usuario: adminUsername,
                senha: hash,
                tipo: 'admin'
            });

            await salvarParametrosPadrao();

            console.log(`Conta de administrador '${adminUsername}' criada com sucesso.`);
            process.exit(0);
        }

        if (process.env.INITIAL_ADMIN_PASSWORD) {
            console.log("Utilizando senha definida em INITIAL_ADMIN_PASSWORD...");
            await criarAdmin(process.env.INITIAL_ADMIN_PASSWORD);
        } else if (process.stdin.isTTY) {
            rl.question(`Defina a senha para o admin '${adminUsername}' (mínimo 8 caracteres): `, async (senha) => {
                await criarAdmin(senha);
            });
        } else {
            const senhaGerada = crypto.randomBytes(8).toString('hex') + 'A1!';
            console.log("Ambiente não interativo detectado.");
            console.log("=================================================");
            console.log(`[AVISO] Senha temporária do admin '${adminUsername}': ${senhaGerada}`);
            console.log("Altere esta senha imediatamente após o primeiro login!");
            console.log("=================================================");
            await criarAdmin(senhaGerada);
        }
    } catch (erro) {
        console.error("Falha ao acessar o banco de dados:", erro);
        process.exit(1);
    }
}

inicializar();