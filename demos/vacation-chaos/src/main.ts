import { loadConfig } from './config.js';
import { writeLine } from './output.js';
import { createShowServer } from './server.js';
import { Show } from './show/engine.js';

const config = loadConfig();
const show = new Show();
createShowServer(show, config).listen(config.port, () => {
  writeLine(`Mission Control  ${config.publicUrl}/control`);
  writeLine(`Phone vote       ${config.publicUrl}/vote`);
  writeLine(`MCP tools        ${config.publicUrl}/mcp  (Authorization: Bearer <presenter key>)`);
  writeLine(`Presenter key    ${config.presenterKey}  (press P in Mission Control)`);
});
