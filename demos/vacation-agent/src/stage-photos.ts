import { readFileSync } from 'node:fs';
export const stagePhotos = Object.fromEntries(['santorini', 'pool', 'isfahan'].map(name => [name,
  `data:image/jpeg;base64,${readFileSync(new URL(`../assets/stage/${name}.jpg`, import.meta.url)).toString('base64')}`,
]));
