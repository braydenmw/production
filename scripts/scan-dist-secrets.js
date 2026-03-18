import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');

const secretPatterns = [
  /AIzaSy[0-9A-Za-z_-]{20,}/g,             // Google API keys
  /gsk_[0-9A-Za-z]{20,}/g,                 // Groq-style keys
  /key_[0-9A-Za-z]{20,}/g,                 // Together-style keys
  /sk-[0-9A-Za-z]{20,}/g,                  // OpenAI-style keys
  /AKIA[0-9A-Z]{16}/g,                     // AWS access key id
];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const findings = [];

  for (const pattern of secretPatterns) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      for (const match of matches.slice(0, 3)) {
        findings.push({ filePath, match });
      }
    }
  }

  return findings;
}

function main() {
  if (!fs.existsSync(distDir)) {
    console.error('[scan-dist-secrets] dist directory not found. Run npm run build first.');
    process.exit(2);
  }

  const allFiles = walk(distDir).filter((filePath) => /\.(js|mjs|html|css)$/i.test(filePath));
  const findings = [];

  for (const filePath of allFiles) {
    findings.push(...scanFile(filePath));
  }

  if (findings.length > 0) {
    console.error('[scan-dist-secrets] Potential secret literals found in dist output:');
    for (const finding of findings) {
      console.error(`- ${path.relative(process.cwd(), finding.filePath)} :: ${finding.match.slice(0, 60)}`);
    }
    process.exit(1);
  }

  console.log('[scan-dist-secrets] No secret-like literals detected in dist output.');
}

main();
