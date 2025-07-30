const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'db.json');
let db = { users: [], notes: [], tokens: {} };

function loadDB() {
  if (fs.existsSync(DB_PATH)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (err) {
      console.error('Failed to parse DB, using empty DB', err);
    }
  }
}

function saveDB() {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) req.connection.destroy();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        reject(e);
      }
    });
  });
}

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

function requireAuth(req, res) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '');
  const userId = db.tokens[token];
  if (!userId) {
    send(res, 401, { error: 'Unauthorized' });
    return null;
  }
  return userId;
}

async function handleRequest(req, res) {
  if (req.method === 'POST' && req.url === '/register') {
    try {
      const body = await parseBody(req);
      const { username, password } = body;
      if (!username || !password) {
        return send(res, 400, { error: 'username and password required' });
      }
      if (db.users.find(u => u.username === username)) {
        return send(res, 409, { error: 'user exists' });
      }
      const user = {
        id: crypto.randomUUID(),
        username,
        passwordHash: hashPassword(password)
      };
      db.users.push(user);
      saveDB();
      return send(res, 201, { id: user.id, username: user.username });
    } catch (e) {
      return send(res, 500, { error: 'server error' });
    }
  }

  if (req.method === 'POST' && req.url === '/login') {
    try {
      const body = await parseBody(req);
      const { username, password } = body;
      const user = db.users.find(u => u.username === username);
      if (!user || user.passwordHash !== hashPassword(password)) {
        return send(res, 401, { error: 'invalid credentials' });
      }
      const token = crypto.randomBytes(16).toString('hex');
      db.tokens[token] = user.id;
      saveDB();
      return send(res, 200, { token });
    } catch (e) {
      return send(res, 500, { error: 'server error' });
    }
  }

  if (req.method === 'POST' && req.url === '/notes') {
    const userId = requireAuth(req, res);
    if (!userId) return;
    try {
      const body = await parseBody(req);
      const { transcript } = body;
      if (!transcript) {
        return send(res, 400, { error: 'transcript required' });
      }
      // Placeholder for OpenAI note generation
      const notes = `Notes for: ${transcript}`;
      const note = {
        id: crypto.randomUUID(),
        userId,
        transcript,
        notes,
        createdAt: Date.now()
      };
      db.notes.push(note);
      saveDB();
      return send(res, 201, note);
    } catch (e) {
      return send(res, 500, { error: 'server error' });
    }
  }

  if (req.method === 'GET' && req.url === '/notes') {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const userNotes = db.notes.filter(n => n.userId === userId);
    return send(res, 200, userNotes);
  }

  send(res, 404, { error: 'Not found' });
}

loadDB();

const server = http.createServer((req, res) => {
  handleRequest(req, res);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
