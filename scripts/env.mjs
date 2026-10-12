// Memuat variabel dari .dev.vars (atau .env) bila belum ada di lingkungan.
import fs from 'node:fs';

export function loadEnv() {
  for (const file of ['.dev.vars', '.env']) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
      if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  }
}

export function requireDatabaseUrl() {
  loadEnv();
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL belum diatur. Isi di file .dev.vars (lihat .dev.vars.example) atau di lingkungan.');
    process.exit(1);
  }
  return process.env.DATABASE_URL;
}
