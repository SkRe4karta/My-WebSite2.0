#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const standalonePath = path.join(process.cwd(), '.next', 'standalone', 'server.js');
const standaloneDir = path.join(process.cwd(), '.next', 'standalone');

// Проверяем наличие standalone файла
if (fs.existsSync(standalonePath)) {
    console.log('✅ Starting via standalone mode...');
    console.log(`   Server file: ${standalonePath}`);
    
    // Проверяем, что мы в правильной директории
    const serverPath = path.isAbsolute(standalonePath) 
        ? standalonePath 
        : path.resolve(process.cwd(), standalonePath);
    
    const server = spawn('node', [serverPath], {
        stdio: 'inherit',
        cwd: standaloneDir, // Важно: запускаем из папки standalone
        env: { 
            ...process.env, 
            PORT: process.env.PORT || '3000',
            HOSTNAME: process.env.HOSTNAME || '0.0.0.0'
        }
    });
    
    server.on('error', (err) => {
        console.error('❌ Error starting standalone server:', err);
        console.error('   Standalone mode is required. Please run "npm run build" first.');
        process.exit(1);
    });
    
    server.on('exit', (code) => {
        if (code !== 0) {
            console.error(`❌ Server exited with code ${code}`);
        }
        process.exit(code || 0);
    });
    
    // Обработка сигналов для корректного завершения
    process.on('SIGINT', () => {
        server.kill('SIGINT');
    });
    process.on('SIGTERM', () => {
        server.kill('SIGTERM');
    });
} else {
    console.error('❌ ERROR: .next/standalone/server.js not found!');
    console.error('');
    console.error('   Standalone mode is required. Please:');
    console.error('   1. Run "npm run build" with NODE_ENV=production');
    console.error('   2. Make sure next.config.js has "output: \'standalone\'"');
    console.error('   3. Check that build completed successfully');
    console.error('');
    console.error('   Note: "next start" does not work with "output: standalone" configuration.');
    console.error(`   Expected path: ${standalonePath}`);
    process.exit(1);
}

