# SOLVIX — backend setup

## Requirements
- Node.js 18+ (recommended) and npm

## Run the project
1. Extract the ZIP and open the `solvix_dsa_project` folder in VS Code.
2. Open Terminal → New Terminal.
3. Run `npm install`.
4. Run `npm start`.
5. Open **http://localhost:3000** in your browser (do not open `index.html` directly).

## Demo login
- Email: `explorer@sih.gov.in`
- Password: `password123`

The demo account is created automatically on the first server start. A registration endpoint is also available at `POST /api/auth/register` with `{ "name": "Your Name", "email": "you@example.com", "password": "atleast8chars" }`.

## API routes
- `GET /api/health` — server health
- `POST /api/auth/login` — login, returns bearer token
- `POST /api/auth/register` — create account
- `GET /api/destinations?q=bhilai` — destination search
- `POST /api/routes/shortest` — `{ "from": "Raipur", "to": "Jagdalpur" }`; Dijkstra shortest path
- `POST /api/search-history` — save a destination search
- `GET /api/search-history` — logged-in user's search history
- `POST /api/bookings` — save a train/flight/bus/hotel request (requires `Authorization: Bearer TOKEN`)
- `GET /api/bookings` — current user's saved requests (requires token)

## Storage and project notes
Demo data is saved in `data/users.json`, `data/bookings.json`, and `data/search-history.json`. Passwords are stored as salted scrypt hashes, not plain text. Session tokens are in memory and are cleared when the server restarts; this is a college-project/demo backend, not production authentication.

The route graph uses sample distances only, not live traffic or real road navigation. Booking requests are stored for demonstration and do **not** book or confirm a real ticket.
