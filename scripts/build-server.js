/**
 * Server Build Script for BWGA Intelligence AI
 * 
 * Uses esbuild to bundle the server for production deployment.
 * This avoids TypeScript configuration issues with ESM modules.
 */

/* eslint-disable no-undef */
import * as esbuild from 'esbuild';
import { existsSync, mkdirSync } from 'fs';

async function build() {
  console.log('🔨 Building server for production...');
  
  // Ensure output directory exists
  const outDir = 'dist-server';
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  try {
    await esbuild.build({
      entryPoints: ['server/index.ts'],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'esm',
      outdir: 'dist-server/server',
      external: [
        // Node built-ins
        'fs', 'path', 'url', 'http', 'https', 'crypto', 'stream', 
        'zlib', 'util', 'os', 'events', 'buffer', 'querystring',
        'child_process', 'cluster', 'dgram', 'dns', 'net', 'readline',
        'tls', 'tty', 'v8', 'vm', 'worker_threads', 'fs/promises',
        // Dependencies that should not be bundled
        'express', 'cors', 'helmet', 'compression', 'dotenv', 'pg',
        '@google/generative-ai', 'jsonwebtoken', 'axios',
        '@aws-sdk/client-bedrock-runtime'
      ],
      sourcemap: true,
      minify: false, // Keep readable for debugging
    });

    console.log('✅ Server build complete!');
    console.log('📦 Output: dist-server/server/index.js');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
