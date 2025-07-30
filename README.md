# Voice Note Taking

This repository contains a simple Node.js application for taking voice notes.

Originally a single-user CLI script, it has been refactored into a small HTTP
server that supports multiple users with basic authentication and persistent
storage. The voice transcription and note generation are placeholders because
external dependencies are unavailable in this environment.

## Usage

1. Install Node.js (v18 or later).
2. Run the server:

   ```bash
   node server.js
   ```

3. The server listens on `http://localhost:3000`.

### Endpoints

- `POST /register` – Register a new user. Body: `{ "username": "name", "password": "pw" }`
- `POST /login` – Obtain an auth token. Body: `{ "username": "name", "password": "pw" }`
- `POST /notes` – Create a note. Requires `Authorization: Bearer <token>` header and body `{ "transcript": "your text" }`
- `GET /notes` – Retrieve notes for the logged-in user.

All data is stored in `db.json`.
