// generate-apple-secret.mjs
import { SignJWT, importPKCS8 } from 'jose';

// ⚠️ Mets bien tes valeurs ici
const TEAM_ID = 'K5LGN7GCDG';                  // ton Team ID Apple
const KEY_ID = 'T33893RTNV';                   // ton Key ID (celui de la clé .p8)
const CLIENT_ID = 'com.beaudoin.faceup.oauth'; // ton Service ID (Identifier) Apple
const PRIVATE_KEY_PATH = './AuthKey_T33893RTNV.p8'; // chemin vers la clé .p8 dans Replit
const TTL_DAYS = 180; // durée de validité (max 180 jours)

import fs from 'fs/promises';

async function main() {
  const p8 = await fs.readFile(PRIVATE_KEY_PATH, 'utf8');
  const alg = 'ES256';
  const now = Math.floor(Date.now() / 1000);
  const exp = now + TTL_DAYS * 24 * 60 * 60;

  const pk = await importPKCS8(p8, alg);

  const jwt = await new SignJWT({
      iss: TEAM_ID,
      sub: CLIENT_ID,
      aud: 'https://appleid.apple.com',
      iat: now,
      exp: exp
    })
    .setProtectedHeader({ alg, kid: KEY_ID })
    .sign(pk);

  console.log('\n✅ Apple Client Secret (JWT) généré :\n');
  console.log(jwt + '\n');
  console.log('ℹ️ Expire le :', new Date(exp * 1000).toISOString());
}

main().catch(err => {
  console.error('❌ Erreur génération JWT:', err);
  process.exit(1);
});