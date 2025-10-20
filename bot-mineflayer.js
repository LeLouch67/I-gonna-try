// bot-mineflayer.js
// Starter mineflayer — reconnexion simple, détection players, console commands.
// UTILISATION : node bot-mineflayer.js <host> <port?> <username?> <password?>
// Ex : node bot-mineflayer.js monserveur.falixsrv.me 25565 MonCompte@example.com 'motdepasse'

const mineflayer = require('mineflayer');
const { pathfinder, Movements } = require('mineflayer-pathfinder');

const HOST = process.argv[2] || 'minekampff.falixsrv.me';
const PORT = parseInt(process.argv[3] || '40806', 10);
const USERNAME = process.argv[4] || 'BotTest';
// si online-mode=true -> mot de passe (ou token MS)
const AUTO_KEEPALIVE = false; // true = envoie un message périodique (déconseillé pour garder serveur up)

let bot = null;
let reconnectDelay = 5000; // ms, augmente si tu veux backoff

function createBot() {
  console.log(`[${new Date().toISOString()}] Tentative de connexion à ${HOST}:${PORT} en tant que ${USERNAME}`);
  bot = mineflayer.createBot({
    host: HOST,
    port: PORT,
    username: USERNAME,
    password: PASSWORD || undefined,
    keepAlive: true,
    auth: PASSWORD ? 'microsoft' : 'mojang' // laisser par défaut si tu sais
  });

  bot.loadPlugin(pathfinder);

  bot.on('spawn', () => {
    console.log(`[${new Date().toISOString()}] Bot spawn — connecté`);
    // Setup pathfinder movements (exemple basique)
    const mcData = require('minecraft-data')(bot.version);
    bot.pathfinder.setMovements(new Movements(bot, mcData));
  });

  // Gérer joueurs : playerJoined / playerLeft via l'objet players
  let knownPlayers = new Set(Object.keys(bot.players || {}));

  // Timer périodique pour comparer players (fiable entre versions)
  setInterval(() => {
    if (!bot || !bot.players) return;
    const current = new Set(Object.keys(bot.players));
    // Detect joined
    for (const p of current) {
      if (!knownPlayers.has(p) && p !== bot.username) {
        console.log(`[${new Date().toISOString()}] PLAYER JOINED → ${p}`);
        // action : ex. envoyer message public
        // bot.chat(`Bienvenue ${p} !`); // facultatif
      }
    }
    // Detect left
    for (const p of knownPlayers) {
      if (!current.has(p)) {
        console.log(`[${new Date().toISOString()}] PLAYER LEFT   → ${p}`);
      }
    }
    knownPlayers = current;
  }, 2000);

  // Écouter les messages serveur (chat)
  bot.on('message', (jsonMsg) => {
    try {
      console.log(`[CHAT] ${jsonMsg.toString()}`);
    } catch (e) {
      // fallback
      console.log('[CHAT] (unparsable message)');
    }
  });

  bot.on('kicked', (reason) => {
    console.warn(`[${new Date().toISOString()}] Bot kicked: ${reason}`);
  });

  bot.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Bot error:`, err && err.message ? err.message : err);
  });

  bot.on('end', () => {
    console.log(`[${new Date().toISOString()}] Déconnecté — tentative de reconnexion dans ${reconnectDelay/1000}s`);
    setTimeout(() => {
      // augmentation progressive du délai (simple backoff)
      reconnectDelay = Math.min(reconnectDelay * 1.5, 5 * 60 * 1000);
      createBot();
    }, reconnectDelay);
  });

  // Optional: keepalive message (désactive si tu ne veux pas spam)
  if (AUTO_KEEPALIVE) {
    setInterval(() => {
      if (bot && bot.chat) {
        try { bot.chat('/me ping'); } catch (e) {}
      }
    }, 10 * 60 * 1000); // toutes les 10 minutes
  }

  // Console commands (stdin)
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (text) => {
    const line = text.trim();
    if (!bot || !bot.chat) {
      console.log('Bot non prêt.');
      return;
    }
    if (line === 'exit') {
      console.log('Fermeture demandée.');
      bot.quit();
      process.exit(0);
    } else if (line.startsWith('say ')) {
      const msg = line.slice(4);
      bot.chat(msg);
      console.log('Message envoyé :', msg);
    } else if (line === 'players') {
      console.log('Players:', Object.keys(bot.players));
    } else {
      console.log('Commandes console: say <msg>, players, exit');
    }
  });
}

createBot();
