const { Service } = require('node-windows');
const path = require('path');

const svc = new Service({
  name: 'SESI-Alimenta-Backend',
  script: path.join(__dirname, '../gateway.js')
});

svc.on('uninstall', () => {
  console.log('Serviço removido. Operação encerrada.');
});

svc.uninstall();