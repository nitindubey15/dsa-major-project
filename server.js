const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  if (req.path.startsWith('/data/') || ['/server.js', '/package.json'].includes(req.path)) return res.sendStatus(404);
  next();
});
app.use(express.static(__dirname, { index: 'index.html' }));

const files = {
  users: path.join(DATA_DIR, 'users.json'),
  bookings: path.join(DATA_DIR, 'bookings.json'),
  searches: path.join(DATA_DIR, 'search-history.json')
};
for (const file of Object.values(files)) if (!fs.existsSync(file)) fs.writeFileSync(file, '[]', 'utf8');
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; } }
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8'); }
function clean(value, max = 120) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function makePassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
}
function passwordMatches(password, user) {
  const actual = crypto.scryptSync(password, user.salt, 64);
  const expected = Buffer.from(user.passwordHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
const destinations = [
  { name: 'Raipur', type: 'City', icon: 'ph-buildings' },
  { name: 'Bhilai', type: 'City', icon: 'ph-buildings' },
  { name: 'Durg', type: 'City', icon: 'ph-buildings' },
  { name: 'Jagdalpur', type: 'City', icon: 'ph-map-pin' },
  { name: 'Chitrakote Falls', type: 'Tourist Place', icon: 'ph-waves' },
  { name: 'Bamleshwari Temple', type: 'Temple', icon: 'ph-bank' },
  { name: 'Tirathgarh Waterfalls', type: 'Tourist Place', icon: 'ph-waves' },
  { name: 'Barnawapara Wildlife Sanctuary', type: 'Wildlife', icon: 'ph-tree' },
  { name: 'Mainpat', type: 'Hill Station', icon: 'ph-mountains' },
  { name: 'Amarkantak', type: 'Tourist Place', icon: 'ph-mountains' },
  { name: 'Delhi', type: 'City', icon: 'ph-buildings' },
  { name: 'Mumbai', type: 'City', icon: 'ph-buildings' },
  { name: 'Goa', type: 'Beach Destination', icon: 'ph-waves' },
  { name: 'Jaipur', type: 'City', icon: 'ph-buildings' },
  { name: 'Manali', type: 'Hill Station', icon: 'ph-mountains' },
  { name: 'Kashmir', type: 'Tourist Destination', icon: 'ph-mountains' }
];

// Sample weighted graph for the DSA demo; weights are illustrative kilometres, not live routes.
const graph = {
  Raipur: { Bhilai: 35, Durg: 40, Jagdalpur: 280, Mainpat: 220 },
  Bhilai: { Raipur: 35, Durg: 10 },
  Durg: { Raipur: 40, Bhilai: 10, Jagdalpur: 275 },
  Jagdalpur: { Raipur: 280, Durg: 275, Amarkantak: 390 },
  Mainpat: { Raipur: 220, Amarkantak: 250 },
  Amarkantak: { Mainpat: 250, Jagdalpur: 390 }
};

// Dijkstra shortest path, O(V^2 + E) with linear minimum selection.
function dijkstra(start, target) {
  if (!graph[start] || !graph[target]) return null;
  const nodes = Object.keys(graph);
  const distance = Object.fromEntries(nodes.map(node => [node, Infinity]));
  const previous = {};
  const unvisited = new Set(nodes);
  distance[start] = 0;
  while (unvisited.size) {
    let current = null;
    for (const node of unvisited) if (current === null || distance[node] < distance[current]) current = node;
    if (current === null || distance[current] === Infinity) break;
    if (current === target) break;
    unvisited.delete(current);
    for (const [next, weight] of Object.entries(graph[current])) {
      if (!unvisited.has(next)) continue;
      const candidate = distance[current] + weight;
      if (candidate < distance[next]) { distance[next] = candidate; previous[next] = current; }
    }
  }
  if (!Number.isFinite(distance[target])) return null;
  const route = [];
  let cursor = target;
  while (cursor) { route.unshift(cursor); if (cursor === start) break; cursor = previous[cursor]; }
  return { path: route, distanceKm: distance[target] };
}

// Demo user is seeded on first start so the current frontend login keeps working.
function seedDemoUser() {
  const users = readJson(files.users);
  if (!users.some(user => user.email === 'explorer@sih.gov.in')) {
    const credentials = makePassword('password123');
    users.push({ id: crypto.randomUUID(), email: 'explorer@sih.gov.in', name: 'SOLVIX Explorer', ...{ salt: credentials.salt, passwordHash: credentials.hash }, createdAt: new Date().toISOString() });
    writeJson(files.users, users);
  }
}
seedDemoUser();
const tokens = new Map(); // In-memory demo sessions; use a persistent session store for production.
function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const userId = tokens.get(token);
  if (!userId) return res.status(401).json({ error: 'Please log in to continue.' });
  req.user = readJson(files.users).find(user => user.id === userId);
  if (!req.user) return res.status(401).json({ error: 'Session expired. Please log in again.' });
  next();
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'SOLVIX API', time: new Date().toISOString() }));

app.post('/api/auth/login', (req, res) => {
  const email = clean(req.body?.email, 254).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  const user = readJson(files.users).find(item => item.email === email);
  if (!user || !passwordMatches(password, user)) return res.status(401).json({ error: 'Incorrect email or password.' });
  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(token, user.id);
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/auth/register', (req, res) => {
  const name = clean(req.body?.name, 80);
  const email = clean(req.body?.email, 254).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return res.status(400).json({ error: 'Provide a name, valid email, and password with at least 8 characters.' });
  const users = readJson(files.users);
  if (users.some(user => user.email === email)) return res.status(409).json({ error: 'An account with this email already exists.' });
  const credentials = makePassword(password);
  const user = { id: crypto.randomUUID(), name, email, salt: credentials.salt, passwordHash: credentials.hash, createdAt: new Date().toISOString() };
  users.push(user); writeJson(files.users, users);
  const token = crypto.randomBytes(32).toString('hex'); tokens.set(token, user.id);
  return res.status(201).json({ token, user: { id: user.id, name, email } });
});

app.get('/api/destinations', (req, res) => {
  const q = clean(req.query.q, 100).toLowerCase();
  const results = q ? destinations.filter(item => item.name.toLowerCase().includes(q) || item.type.toLowerCase().includes(q)) : destinations.slice(0, 6);
  res.json({ destinations: results.slice(0, 12) });
});

app.post('/api/routes/shortest', (req, res) => {
  const from = clean(req.body?.from, 80);
  const to = clean(req.body?.to, 80);
  if (!from || !to) return res.status(400).json({ error: 'Starting place and destination are required.' });
  if (from === to) return res.status(400).json({ error: 'Choose two different places.' });
  const route = dijkstra(from, to);
  if (!route) return res.status(404).json({ error: 'No sample route is available between those places.' });
  res.json(route);
});

app.post('/api/search-history', requireAuth, (req, res) => {
  const destination = clean(req.body?.destination, 100);
  if (!destination) return res.status(400).json({ error: 'Destination is required.' });
  const history = readJson(files.searches);
  history.push({ id: crypto.randomUUID(), userId: req.user.id, destination, createdAt: new Date().toISOString() });
  writeJson(files.searches, history.slice(-500));
  res.status(201).json({ saved: true });
});

app.get('/api/search-history', requireAuth, (req, res) => {
  const history = readJson(files.searches).filter(item => item.userId === req.user.id).slice(-20).reverse();
  res.json({ searches: history });
});

app.post('/api/bookings', requireAuth, (req, res) => {
  const service = clean(req.body?.service, 20);
  const from = clean(req.body?.from, 100);
  const to = clean(req.body?.to, 100);
  const date = clean(req.body?.date, 10);
  const travellers = Number(req.body?.travellers);
  if (!['Train', 'Flight', 'Hotel', 'Bus', 'Vehicle', 'Activity'].includes(service)) return res.status(400).json({ error: 'Select a valid travel service.' });
  if (!from || !to || from.toLowerCase() === to.toLowerCase()) return res.status(400).json({ error: 'Enter different starting and destination places.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || date < new Date().toISOString().slice(0, 10)) return res.status(400).json({ error: 'Choose a valid date today or later.' });
  if (!Number.isInteger(travellers) || travellers < 1 || travellers > 20) return res.status(400).json({ error: 'Travellers must be between 1 and 20.' });
  const bookings = readJson(files.bookings);
  const booking = { id: `SVX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`, userId: req.user.id, service, from, to, date, travellers, status: 'request-saved-not-ticketed', createdAt: new Date().toISOString() };
  bookings.push(booking); writeJson(files.bookings, bookings);
  res.status(201).json({ booking: { id: booking.id, service, from, to, date, travellers, status: booking.status } });
});

app.get('/api/bookings', requireAuth, (req, res) => {
  const bookings = readJson(files.bookings).filter(item => item.userId === req.user.id).reverse();
  res.json({ bookings });
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
app.listen(PORT, () => console.log(`SOLVIX is running at http://localhost:${PORT}`));
