const { Service } = require('node-windows');
const path = require('path');

const svc = new Service({
  name: 'SESI-Alimenta-Backend',
  description: 'Gateway Sentinela e Motor ERP do SESI Alimenta.',
  script: path.join(__dirname, '../gateway.js'),
  wait: 2,
  grow: 0.5,
  maxRestarts: 40,
  env: [
    {
      name: "NODE_ENV",
      value: "production"
    },
    {
      name: "GATEWAY_SPAWN",
      value: "true"
    },
    {
      name: "PORT",
      value: "3000"
    },
    {
      name: "BACKEND_PORT",
      value: "3001"
    }
  ]
});

svc.on('install', () => {
  console.log('Serviço do Windows criado com sucesso.');
  svc.start();
  console.log('Serviço SESI-Alimenta-Backend operando em segundo plano.');
});

svc.on('alreadyinstalled', () => {
  console.log('O serviço já está registrado no sistema.');
});

svc.install();