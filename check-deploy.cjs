#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Verificando se o projeto está pronto para deploy...\n');

const checks = [];

// 1. Verificar se package.json tem scripts necessários
console.log('📦 Verificando package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (packageJson.scripts.build) {
    checks.push({ name: 'Script build', status: '✅', details: 'npm run build disponível' });
  } else {
    checks.push({ name: 'Script build', status: '❌', details: 'Script build não encontrado' });
  }
  
  if (packageJson.scripts.start) {
    checks.push({ name: 'Script start', status: '✅', details: 'npm start disponível' });
  } else {
    checks.push({ name: 'Script start', status: '❌', details: 'Script start não encontrado' });
  }
  
  if (packageJson.scripts['render-build']) {
    checks.push({ name: 'Script render-build', status: '✅', details: 'Script específico do Render disponível' });
  } else {
    checks.push({ name: 'Script render-build', status: '❌', details: 'Script render-build não encontrado' });
  }
} catch (error) {
  checks.push({ name: 'package.json', status: '❌', details: 'Erro ao ler package.json' });
}

// 2. Verificar se arquivos essenciais existem
console.log('📁 Verificando arquivos essenciais...');
const essentialFiles = [
  'server.cjs',
  'src/pages/Index.tsx',
  'src/components/AuthScreen.tsx',
  'src/contexts/ChatContext.tsx',
  'vite.config.ts'
];

essentialFiles.forEach(file => {
  if (fs.existsSync(file)) {
    checks.push({ name: `Arquivo ${file}`, status: '✅', details: 'Encontrado' });
  } else {
    checks.push({ name: `Arquivo ${file}`, status: '❌', details: 'Não encontrado' });
  }
});

// 3. Testar build
console.log('🔨 Testando build...');
try {
  execSync('npm run build', { stdio: 'pipe' });
  checks.push({ name: 'Build test', status: '✅', details: 'Build executado com sucesso' });
  
  // Verificar se dist foi criado
  if (fs.existsSync('dist') && fs.existsSync('dist/index.html')) {
    checks.push({ name: 'Arquivos de build', status: '✅', details: 'dist/index.html criado' });
  } else {
    checks.push({ name: 'Arquivos de build', status: '❌', details: 'dist/index.html não encontrado' });
  }
} catch (error) {
  checks.push({ name: 'Build test', status: '❌', details: 'Erro no build: ' + error.message.substring(0, 100) });
}

// 4. Verificar dependências
console.log('📚 Verificando dependências...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = ['express', 'cors', 'react', 'vite'];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
      checks.push({ name: `Dependência ${dep}`, status: '✅', details: 'Instalada' });
    } else {
      checks.push({ name: `Dependência ${dep}`, status: '❌', details: 'Não encontrada' });
    }
  });
} catch (error) {
  checks.push({ name: 'Verificação de dependências', status: '❌', details: 'Erro ao verificar' });
}

// 5. Verificar configuração do servidor
console.log('🖥️ Verificando servidor...');
try {
  const serverContent = fs.readFileSync('server.cjs', 'utf8');
  
  if (serverContent.includes('process.env.PORT')) {
    checks.push({ name: 'Configuração de porta', status: '✅', details: 'PORT configurada corretamente' });
  } else {
    checks.push({ name: 'Configuração de porta', status: '❌', details: 'PORT não configurada' });
  }
  
  if (serverContent.includes('express.static')) {
    checks.push({ name: 'Servir arquivos estáticos', status: '✅', details: 'Configurado' });
  } else {
    checks.push({ name: 'Servir arquivos estáticos', status: '❌', details: 'Não configurado' });
  }
} catch (error) {
  checks.push({ name: 'Verificação do servidor', status: '❌', details: 'Erro ao ler server.cjs' });
}

// Exibir resultados
console.log('\n📊 RESULTADOS DA VERIFICAÇÃO:\n');
console.log('═'.repeat(80));

let passed = 0;
let failed = 0;

checks.forEach(check => {
  console.log(`${check.status} ${check.name.padEnd(30)} | ${check.details}`);
  if (check.status === '✅') passed++;
  else failed++;
});

console.log('═'.repeat(80));
console.log(`\n📈 RESUMO: ${passed} passou(m) | ${failed} falhou(ram)`);

if (failed === 0) {
  console.log('\n🎉 PROJETO PRONTO PARA DEPLOY!');
  console.log('\n📋 Próximos passos:');
  console.log('1. git add .');
  console.log('2. git commit -m "Deploy ready"');
  console.log('3. git push origin main');
  console.log('4. Configurar no Render.com');
} else {
  console.log('\n⚠️  CORRIJA OS PROBLEMAS ANTES DO DEPLOY');
  console.log('\nProblemas encontrados:');
  checks.filter(c => c.status === '❌').forEach(check => {
    console.log(`- ${check.name}: ${check.details}`);
  });
}

console.log('\n🔗 Documentação completa: DEPLOY.md');
