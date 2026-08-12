/**
 * Télécharge les photos depuis les URLs legacy (Render) vers uploads/ local.
 * Usage : APP_ENV=production node scripts/syncLegacyUploads.js
 */
require('dotenv').config({
  path: require('path').resolve(__dirname, `../.env.${process.env.APP_ENV || 'production'}`),
});
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const prisma = require('../src/config/prisma');
const cotisationService = require('../src/services/cotisationService');
const { extractUploadFilename } = require('../src/utils/uploads');

const LEGACY_BASES = [
  process.env.UPLOADS_LEGACY_BASE_URL,
  'https://saap-cflcma-ci.onrender.com',
  'https://saap-api.onrender.com',
].filter(Boolean).map((u) => String(u).replace(/\/$/, ''));

async function downloadFromLegacy(filename) {
  const uploadDir = cotisationService.ensureUploadDir();
  const localPath = path.join(uploadDir, filename);
  if (fs.existsSync(localPath)) {
    return { status: 'exists', filename };
  }

  for (const base of LEGACY_BASES) {
    const url = `${base}/uploads/${encodeURIComponent(filename)}`;
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(localPath, buffer);
      return { status: 'downloaded', filename, from: base };
    } catch {
      // essayer la base suivante
    }
  }

  return { status: 'missing', filename };
}

async function main() {
  const membres = await prisma.membre.findMany({
    where: { photoUrl: { not: null } },
    select: { idMembre: true, photoUrl: true },
  });

  const filenames = [...new Set(membres.map((m) => extractUploadFilename(m.photoUrl)).filter(Boolean))];
  console.log(`${filenames.length} fichier(s) à synchroniser…\n`);

  let downloaded = 0;
  let exists = 0;
  let missing = 0;

  for (const filename of filenames) {
    const result = await downloadFromLegacy(filename);
    if (result.status === 'downloaded') {
      downloaded += 1;
      console.log(`[+] ${filename} ← ${result.from}`);
    } else if (result.status === 'exists') {
      exists += 1;
      console.log(`[=] ${filename} (déjà présent)`);
    } else {
      missing += 1;
      console.log(`[-] ${filename} (introuvable sur legacy)`);
    }
  }

  console.log(`\nRésumé : ${downloaded} téléchargé(s), ${exists} déjà là, ${missing} manquant(s).`);
  if (missing > 0) {
    console.log('\nLes fichiers manquants ne sont plus sur Render (disque éphémère).');
    console.log('Copiez une sauvegarde locale dans uploads/ puis relancez ce script.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
