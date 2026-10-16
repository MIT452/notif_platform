import http from 'http';
import { app } from './app.js';
import { env } from './config/env.js';
import { initSocket } from './socket.js';
import { startWorkers } from './workers/index.js';

const server = http.createServer(app);
initSocket(server);
startWorkers(); // même processus que Socket.IO (voir README pour les séparer en production)

server.listen(env.port, () => console.log(`API prête sur http://localhost:${env.port}`));
