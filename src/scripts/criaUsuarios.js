const crypto = require('crypto');
const { eq } = require('drizzle-orm');
const bcrypt = require('bcrypt');
const { db } = require('../db');
const { usuarios } = require('../db/schema');

function gerarSenhaSegura() {
  const envPass = process.env.SEED_DEFAULT_PASSWORD;
  if (envPass && envPass.length >= 8) return envPass;
  return crypto.randomBytes(6).toString('hex') + 'S1!';
}

async function seedUsuarios() {
  try {
    console.log('Iniciando provisionamento seguro de contas...');

    const contas = [
      { usuario: 'DesenvolvedorAdmin', tipo: 'admin' },
      { usuario: 'DesenvolvedorProfessor', tipo: 'professor' },
      { usuario: 'DesenvolvedorCozinha', tipo: 'cozinha' },
      { usuario: 'DesenvolvedorCoordenacao', tipo: 'coordenacao' }
    ];

    for (const conta of contas) {
      const existe = await db.select().from(usuarios).where(eq(usuarios.usuario, conta.usuario));
      
      if (existe.length === 0) {
        const senhaTemporaria = gerarSenhaSegura();
        const hashSeguro = await bcrypt.hash(senhaTemporaria, 10);
        await db.insert(usuarios).values({ 
          usuario: conta.usuario, 
          senha: hashSeguro, 
          tipo: conta.tipo 
        });
        console.log(`[+] Conta provisionada: ${conta.usuario} (${conta.tipo}) | Senha Temporária: ${senhaTemporaria}`);
      } else {
        console.log(`[-] Conta já existe: ${conta.usuario}`);
      }
    }
    
    console.log('Operação finalizada. O sistema está pronto para login.');
    process.exit(0);
  } catch (error) {
    console.error('Falha crítica ao provisionar contas:', error);
    process.exit(1);
  }
}

seedUsuarios();