#!/usr/bin/env node
/**
 * Build script for AWS Amplify deployment
 * 
 * Handles:
 * - Building frontend with Vite
 * - Building backend for Lambda environment
 * - Bundling both for Amplify
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

function log(msg) {
  console.log(`\n✅ ${msg}`);
}

function error(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

async function buildForAmplify() {
  log('Starting Amplify Build Process');

  // Step 1: Install dependencies if needed
  log('Checking dependencies...');
  try {
    execSync('npm ls', { cwd: rootDir, stdio: 'pipe' });
  } catch {
    log('Installing dependencies...');
    execSync('npm install', { cwd: rootDir });
  }

  // Step 2: Build frontend
  log('Building frontend with Vite...');
  try {
    execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
  } catch {
    error('Frontend build failed');
  }

  // Step 3: Build server for Lambda
  log('Building backend for Lambda...');
  try {
    execSync('npm run build:server', { cwd: rootDir, stdio: 'inherit' });
  } catch {
    error('Backend build failed');
  }

  // Step 4: Create Amplify-compatible structure
  log('Preparing Amplify deployment structure...');
  
  const amplifyBuildDir = path.join(rootDir, '.amplify-build');
  if (fs.existsSync(amplifyBuildDir)) {
    fs.rmSync(amplifyBuildDir, { recursive: true });
  }
  fs.mkdirSync(amplifyBuildDir, { recursive: true });

  // Copy frontend dist
  const distSrc = path.join(rootDir, 'dist');
  const distDest = path.join(amplifyBuildDir, 'dist');
  if (fs.existsSync(distSrc)) {
    fs.cpSync(distSrc, distDest, { recursive: true });
    log('Frontend artifacts copied to .amplify-build/dist');
  }

  // Copy backend dist
  const serverDistSrc = path.join(rootDir, 'dist-server');
  const serverDistDest = path.join(amplifyBuildDir, 'dist-server');
  if (fs.existsSync(serverDistSrc)) {
    fs.cpSync(serverDistSrc, serverDistDest, { recursive: true });
    log('Backend artifacts copied to .amplify-build/dist-server');
  }

  // Copy package.json and package-lock.json
  fs.copyFileSync(
    path.join(rootDir, 'package.json'),
    path.join(amplifyBuildDir, 'package.json')
  );
  if (fs.existsSync(path.join(rootDir, 'package-lock.json'))) {
    fs.copyFileSync(
      path.join(rootDir, 'package-lock.json'),
      path.join(amplifyBuildDir, 'package-lock.json')
    );
  }

  // Create amplify.yml if it doesn't exist
  const amplifyYml = path.join(rootDir, 'amplify.yml');
  if (!fs.existsSync(amplifyYml)) {
    fs.writeFileSync(amplifyYml, `version: 1

frontend:
  phases:
    preBuild:
      commands:
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*

backend:
  phases:
    build:
      commands:
        - echo "Building backend..."
        - npm run build:server
  artifacts:
    baseDirectory: dist-server
    files:
      - '**/*'

env:
  variables:
    NODE_ENV: production
    PORT: 3001
`);
    log('Created amplify.yml with build configuration');
  }

  log('Amplify build process completed successfully!');
  log('Your app is ready for deployment to AWS Amplify');
  console.log(`
Next steps:
1. Commit your changes: git add . && git commit -m "Amplify deployment ready"
2. Push to GitHub: git push origin main
3. Connect to Amplify Console and authorize your repository
4. Set environment variables in Amplify Console
5. Amplify will automatically build and deploy
`);
}

buildForAmplify().catch(error);
