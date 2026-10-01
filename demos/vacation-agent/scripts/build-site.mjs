import { cp, mkdir, writeFile } from 'node:fs/promises';
import { createScenario } from '../src/hotels.ts';
import { renderSite } from '../src/site.ts';

await mkdir('dist/site', { recursive: true });
let html = renderSite(createScenario('happy').hotels);
for (const [id, photo] of Object.entries({ A: 'photo-1566073771259-6a8506099945', B: 'photo-1582719478250-c89cae4dc85b', C: 'photo-1571896349842-33c89424de2d' })) {
  html = html.replaceAll(`https://images.unsplash.com/${photo}?w=1000&q=80`, `./assets/hotel-${id}.jpg`);
}
await writeFile('dist/site/index.html', html);
await cp('site-assets', 'dist/site/assets', { recursive: true });
