// Lädt einen Ordner als geschützte Vorschau (target: preview) ins Vercel-Team hoch.
// Der Zugangsschlüssel wird vom Netzwerk-Proxy eingesetzt („proxyinjected“ ist nur ein Platzhalter).
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const ORDNER = process.argv[2]; const PROJEKT = process.argv[3] || 'ssv-vorschau';
const TEAM = 'team_PFmpBlwDeIPapupD2s1QuY2J';
const API = 'https://api.vercel.com';
const H = { Authorization: 'Bearer proxyinjected' };

function dateien(dir, basis = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? dateien(p, basis) : [{ abs: p, rel: path.relative(basis, p).split(path.sep).join('/') }];
  });
}
(async () => {
  const liste = dateien(ORDNER);
  const files = [];
  for (const f of liste) {
    const buf = fs.readFileSync(f.abs); const sha = crypto.createHash('sha1').update(buf).digest('hex');
    const r = await fetch(API + '/v2/files?teamId=' + TEAM, { method: 'POST', headers: { ...H, 'Content-Type': 'application/octet-stream', 'x-vercel-digest': sha, 'Content-Length': String(buf.length) }, body: buf });
    if (!r.ok) { console.error('Upload fehlgeschlagen', f.rel, r.status, await r.text()); process.exit(1); }
    files.push({ file: f.rel, sha, size: buf.length });
  }
  console.log('hochgeladen:', files.length, 'Dateien');
  const r = await fetch(API + '/v13/deployments?teamId=' + TEAM + '&skipAutoDetectionConfirmation=1', {
    method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: PROJEKT, files, projectSettings: { framework: null, buildCommand: null, outputDirectory: null, installCommand: null } })
  });
  const j = await r.json();
  if (!r.ok) { console.error('Deployment fehlgeschlagen', r.status, JSON.stringify(j).slice(0, 500)); process.exit(1); }
  console.log('Deployment', j.id, 'Status', j.readyState, 'URL https://' + j.url, 'Ziel', j.target || 'preview');
})();
