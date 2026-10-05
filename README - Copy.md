# SyncDoc - Collaborative Document Engine

Internship project (MERN stack). SyncDoc is a block based document editor where many people can
edit the same document at the same time without overwriting each other (Yjs CRDT), with an
AST (tree) stored in MongoDB.

**Status: Weeks 1 - 4 complete.**

## Tech used
- Frontend: React, TypeScript, Vite, react-router
- Backend: Node.js, Express, TypeScript
- Database: MongoDB + Mongoose
- Real time: WebSocket (ws) + Yjs
- Security: JWT, bcrypt, helmet, express-rate-limit, DOMPurify
- Export: pdfkit (PDF), HTML, Markdown
- Tests: Jest + Supertest (server), Vitest (client)

## Folder structure
```
syncdoc/
  scripts/setup.js          creates server/.env with a random JWT secret
  client/src/
    components/             Block, CursorLayer, EditorPage, DocumentList, LoginPage, SharePanel, PresenceBar
    context/                AuthContext, CursorContext (atomic cursor state)
    hooks/useCollabDoc.ts   Yjs connection, presence, cursors, locks, block actions
    utils/                  deltas (caret transform), textDiff, stable, dom (+ unit tests)
  server/src/
    models/                 User, Document (recursive AST validation + DOMPurify in the pre-save hook)
    routes/                 auth, documents (CRUD, share, import, export)
    sync/                   syncServer (Yjs websocket, locks, autosave), deps (database glue)
    utils/                  blockTree (tree <-> flat), markdown, exportHtml, exportPdf, sanitize
    __tests__/              unit, sync (10 clients) and api (integration) tests
```

## How to run

You need **Node 18+** and **MongoDB** running on your computer (or a MongoDB Atlas link).

```bash
npm install
npm run setup        # creates server/.env with a random JWT secret - check MONGO_URI inside
npm run seed         # 2 demo users + 2 documents (optional)
npm run dev:server   # terminal 1 -> http://localhost:5000
npm run dev:client   # terminal 2 -> http://localhost:5173
```

Demo accounts after `npm run seed` (password `Password123!`): `alice@example.com`, `bob@example.com`.

**Try the collaboration:** open the app in two browser tabs. Every tab keeps its own login
(sessionStorage), so log in as Alice in one tab and as Bob in the other, then open the shared
document "Technical Spec - Payment Service". Type in both tabs at the same time.

Editor shortcuts: `Enter` new block (splits the text at the caret), `Tab` / `Shift+Tab` indent or
outdent a list item, `Backspace` in an empty block deletes it, arrows move between blocks.

### Run the tests
```bash
npm run typecheck
npm test                                              # unit + sync tests (no database needed)
TEST_MONGO_URI=mongodb://127.0.0.1:27017/syncdoc-test npm test   # also runs the api tests
```
The api tests wipe the database named in `TEST_MONGO_URI` - never point it at real data.

## What was built

### Week 1 - AST model and document UI
- Nested Mongoose schema: a block can have `children`. A **recursive `pre('save')` hook** walks the
  tree and checks unique ids, max depth, list rules, and fills `parentId`, `depth` and `path`.
- React UI to list, create, import and delete documents, and block components for every type
  (heading, text, list item, quote, code).

### Week 2 - Real time engine
- WebSocket server with Yjs rooms, presence (who is online) and **block locking**
  ("Alice is editing" on the block that has her cursor).
- Edits are **autosaved to MongoDB** every 2 seconds, so nothing is lost when the server restarts.

### Mid-project review
- **Markdown <-> JSON AST** mapping (`utils/markdown.ts`) - used for import and export.
- **10 concurrent clients test** (`sync.test.ts`): every client edits the same paragraph, heading and
  adds blocks at the same moment; all clients end identical and no character is lost.
- **Remote changes do not corrupt your typing:** when someone edits the block you are typing in, your
  caret is moved with the change (`utils/deltas.ts`) instead of jumping to the end.

### Week 3 - Export and cursors
- Export to **PDF**, **HTML** and **Markdown** (buttons in the editor). HTML is escaped and passed
  through DOMPurify, and has its own Content-Security-Policy.
- `CursorContext`: atomic reducer state for the local cursor and selection. Two contexts (state and
  actions) so a block does not re-render when the cursor moves. Blocks are `React.memo`, so only the
  changed block is updated on screen.

### Week 4 - Security and live cursors
- **DOMPurify** on the server cleans the text of every block before it is saved (see Security).
- **Live cursors and selections** of other users, shown with their name and color. Positions are Yjs
  relative positions, so they follow the text while others type.
- Block state indicators: blue bar = you are editing, colored bar + badge = locked by someone,
  yellow flash = just changed by someone else.

## Security

| Risk | What is done |
| --- | --- |
| Passwords | bcrypt (cost 12), 8-72 characters, hash never returned (`select: false`) |
| Login tokens | JWT HS256 (algorithm fixed, 8h), secret must be 32+ chars or the server will not start |
| Brute force | rate limit on login / register (20 per 15 min per ip) and on the whole api |
| Who can open a document | only owner and collaborators: REST and WebSocket both check it. Others get "not found" |
| Removed collaborator | his live WebSocket is closed immediately |
| Owner-only actions | rename, delete, share, remove people |
| XSS | DOMPurify strips markup from every block and title before saving (repeated until stable). React escapes everything it shows. Exported HTML is escaped, sanitized again and has `Content-Security-Policy: default-src 'none'` |
| NoSQL injection | all inputs are type-checked (`asString`), ids validated, `sanitizeFilter` is on |
| Fake data over WebSocket | block ids / types / depth from clients are repaired before saving, max 1000 blocks, 10000 chars per block, 1 MB per message |
| Lock spoofing | lock name and color come from the logged in user, not from the client message |
| CSRF / CSWSH | token is sent in a header (not a cookie); WebSocket checks the `Origin` |
| Headers | helmet (nosniff, frameguard, HSTS ...), CORS only for `CLIENT_ORIGIN`, 300 KB body limit |
| Errors | internal errors are logged, users only see a generic message |
| Downloads | exports are sent as attachments with `no-store` |

## Known limitations (honest list)
- **Locks are "soft".** The UI makes a locked block read-only and the server keeps the lock table,
  but the server does not reject a modified client that edits a locked block anyway. Because it is a CRDT,
  such edits are still merged, never lost.
- **Code blocks keep `<` and `>`** (code needs them). They are never inserted as HTML anywhere
  (textarea + escaped exports). Other block types have all markup removed, so typing literal
  HTML tags like `<b>` in normal text will remove them.
- **PDF and non-English text:** the built-in PDF fonts only support Latin characters, other characters
  become `?`. Set `PDF_FONT_PATH` in `server/.env` to a `.ttf` font that has your characters (e.g. Noto Sans).
- The JWT is sent in the WebSocket URL (browsers can not set headers there). Do not log full URLs in production.
- The token is stored in `sessionStorage`, so an XSS bug would be able to read it. Use HTTPS in production.
- Rate limits are per server process (not shared between several servers).
- No password reset, email verification or refresh tokens yet.
- Tested on Node 22 against a MongoDB-compatible server (FerretDB). No dependency needs more than Node 18,
  and `package-lock.json` is included (use `npm ci` for the exact same versions).
- The browser UI was type-checked, built, unit tested and served by the Vite dev server, but it was not
  clicked through in an automated browser test, so please try the two-tab demo once yourself.
