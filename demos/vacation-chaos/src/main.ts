import { loadConfig } from './config.js';
import { writeLine } from './output.js';

const config = loadConfig();
writeLine(`Vacation Chaos on ${config.publicUrl}`);
