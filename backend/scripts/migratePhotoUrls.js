/**
 * Normalise photo_url en base : ne garde que le nom de fichier.
 * Usage : APP_ENV=production node scripts/migratePhotoUrls.js
 */
require('dotenv').config({
  path: require('path').resolve(__dirname, `../.env.${process.env.APP_ENV || 'production'}`),
});
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const prisma = require('../src/config/prisma');
const { extractUploadFilename } = require('../src/utils/uploads');

async function main() {
  const membres = await prisma.membre.findMany({
    where: { photoUrl: { not: null } },
    select: { id: true, idMembre: true, photoUrl: true },
  });

  let updated = 0;
  for (const m of membres) {
    const filename = extractUploadFilename(m.photoUrl);
    if (!filename) {
      console.warn(`[skip] ${m.idMembre} : format inconnu → ${m.photoUrl}`);
      continue;
    }
    if (filename === m.photoUrl) continue;

    await prisma.membre.update({
      where: { id: m.id },
      data: { photoUrl: filename },
    });
    updated += 1;
    console.log(`[ok] ${m.idMembre} → ${filename}`);
  }

  console.log(`\nTerminé : ${updated} / ${membres.length} photo(s) normalisée(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
