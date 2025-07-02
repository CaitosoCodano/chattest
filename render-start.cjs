#!/usr/bin/env node

// Render startup script with error handling
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Chat App on Render...');
console.log('📁 Working directory:', process.cwd());
console.log('🌐 Environment:', process.env.NODE_ENV || 'development');
console.log('🔌 Port:', process.env.PORT || 3000);

// Check if dist directory exists
const fs = require('fs');
const distPath = path.join(process.cwd(), 'dist');

if (!fs.existsSync(distPath)) {
  console.error('❌ dist directory not found. Running build...');
  process.exit(1);
}

if (!fs.existsSync(path.join(distPath, 'index.html'))) {
  console.error('❌ dist/index.html not found. Build may have failed.');
  process.exit(1);
}

console.log('✅ Build files found');

// Start the server
const serverPath = path.join(process.cwd(), 'server.cjs');
if (!fs.existsSync(serverPath)) {
  console.error('❌ server.cjs not found');
  process.exit(1);
}

console.log('✅ Starting server...');

// Set production environment
process.env.NODE_ENV = 'production';

// Start server
require('./server.cjs');
