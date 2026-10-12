# Backend Server Architecture Documentation

## 1. High-Level Overview

The backend server is a real-time collaborative document platform built on **Node.js**, **Express**, **TypeScript**, **MongoDB (Mongoose)**, and **Yjs (CRDTs)** over **WebSockets**.

It combines:
1. **Stateless HTTP REST API** for authentication, user profiles, document metadata, access delegation, and export operations.
2. **Stateful In-Memory CRDT Sync Engine** for low-latency, conflict-free collaborative editing, presence awareness, and block-level locking.
3. **Hybrid Data Modeling** allowing the editor to manipulate a flat block list for CRDT efficiency while storing a normalized hierarchical tree (AST) in MongoDB.

```
                      +---------------------------------------+
                      |            Client (Browser)           |
                      +---------------------------------------+
                           |                             |
             REST API Calls|                             | WebSocket Connection
            (HTTP/JSON)    |                             | (Yjs Protocol + Presence)
                           v                             v
               +---------------------------------------------+
               |             Node.js HTTP Server             |
               |                                             |
               |  +--------------------+  +---------------+  |
               |  |  Express REST API  |  |  Sync Engine  |  |
               |  |  - Auth & JWT      |  |  (Yjs Room)   |  |
               |  |  - Documents CRUD  |  |  - CRDT Sync  |  |
               |  |  - Access Control  |  |  - Awareness  |  |
               |  |  - Exporters       |  |  - Block Lock |  |
               |  +--------------------+  +---------------+  |
               +---------------------------------------------+
                           |            Hooks            |
                           +--------------+--------------+
                                          |
                         +----------------v---------------+
                         |      MongoDB (Mongoose)        |
                         |  - Users Collection            |
                         |  - Documents AST Collection    |
                         +--------------------------------+
```

---

## 2. Server Entry Point & Lifecycle (`src/index.ts`)

The server initializes in `src/index.ts` with a coordinated lifecycle:
- **Environment Validation**: `getEnv()` validates necessary environment variables (`PORT`, `MONGO_URI`, `CLIENT_ORIGIN`, `JWT_SECRET`).
- **Database Connection**: Establishes connection to MongoDB via Mongoose.
- **Unified HTTP Listener**: A single `http.Server` instance multiplexes both Express HTTP routing and WebSocket upgrades on the same port (`PORT`, default `5000`).
- **Inter-Layer Bridge (`AppHooks`)**: Injects lifecycle triggers from REST routes into the WebSocket synchronization engine:
  - `onDocumentDeleted(docId)`: Immediately evicts the active room and terminates connected clients.
  - `onAccessRevoked(docId, userId)`: Kicks unauthorized users from live editing sessions.
  - `flushDocument(docId)`: Flushes in-memory Yjs buffers to MongoDB before generating exports.
- **Graceful Shutdown**: Intercepts `SIGINT` and `SIGTERM` signals to:
  1. Stop accepting new HTTP/WS connections (`server.close()`).
  2. Persist all dirty in-memory Yjs document rooms to MongoDB (`sync.close()`).
  3. Terminate WebSocket client sockets cleanly.
  4. Disconnect Mongoose cleanly (`mongoose.disconnect()`).

---

## 3. REST API Architecture (`src/app.ts`, `src/routes/`)

### 3.1 Security & Middleware Stack
- **Helmet**: Enforces secure HTTP response headers (HSTS, X-Content-Type-Options, Frameguard).
- **CORS**: Whitelists client origins configured in `CLIENT_ORIGIN`.
- **Payload Limiting**: Strict JSON body size limit of `300kb` to protect against denial-of-service memory exhaustion.
- **Rate Limiting**:
  - Global API limiter: `1000` requests per 15 minutes per IP.
  - Auth routes limiter: `20` attempts per 15 minutes per IP.
- **Centralized Error Handling**:
  - Maps payload size violations to `413 Request is too large`.
  - Maps JSON parse errors to `400 Invalid JSON`.
  - Maps `DocumentValidationError` to `400` with clean messaging.
  - Catches unexpected internal errors without leaking stack traces or internal server details.

### 3.2 Authentication & User Management (`src/routes/auth.ts`, `src/middleware/auth.ts`)
- **Password Security**: Passwords hashed with `bcryptjs` using a cost factor of `12`.
- **Timing Attack Mitigation**: Uses a deterministic pre-computed `DUMMY_HASH` when an email is not found, ensuring lookup verification takes equal CPU time.
- **JWT Authorization**: Signs user IDs with HS256 JWTs. Verified via `requireAuth` middleware for protected endpoints.
- **User Color Assignment**: Hashes user IDs into deterministic pastel HSL colors (`src/utils/color.ts`) for real-time collaborative cursor identification.

### 3.3 Document Management & Access Control (`src/routes/documents.ts`)
- **Role-Based Permissions**:
  - **Owner**: Can edit, rename, delete, invite collaborators, revoke collaborators, and export.
  - **Collaborator**: Can edit, view metadata, leave the document, and export.
- **Information Leak Prevention**: Non-existent document IDs and unauthorized documents return identical `404 Document not found` responses to avoid enumeration attacks.
- **Input Sanitization**: Block text and line inputs are sanitized using DOMPurify (`src/utils/sanitize.ts`).
- **Markdown Import**: Converts Markdown structures into AST blocks (`src/utils/markdown.ts`).
- **Export Formats**:
  - **PDF**: Streams a clean document via PDFKit (`src/utils/exportPdf.ts`).
  - **HTML**: Renders semantic HTML markup sanitized against XSS (`src/utils/exportHtml.ts`).
  - **Markdown**: Formats blocks back into Markdown syntax (`src/utils/markdown.ts`).

---

## 4. Real-Time Sync Engine (`src/sync/syncServer.ts`, `src/sync/deps.ts`)

The real-time collaboration engine runs on top of `ws` and implements Yjs CRDT protocols alongside custom block locking.

### 4.1 Protocol Multiplexing

All communication uses binary encoded frames with numeric message type tags:

| Type Tag | Protocol / Purpose | Description |
| :--- | :--- | :--- |
| `0` | `MSG_SYNC` | Yjs Sync Protocol (State Vectors & Updates) |
| `1` | `MSG_AWARENESS` | Presence updates (cursors, active block, user name, color) |
| `4` | `MSG_LOCK` | Custom block locking (acquire / release block edit locks) |

### 4.2 Room Architecture & In-Memory State
A **Room** represents an active in-memory collaborative document:
- `ydoc`: An isolated `Y.Doc` instance hosting a shared `Y.Array<Y.Map>` representing blocks.
- `awareness`: Broadcasts client awareness states.
- `locks`: Tracks exclusive edit locks on individual blocks (`blockId -> { clientId, name, color }`).
- `conns`: Tracks active WebSocket connections and their associated awareness IDs.

### 4.3 Debounced Persistence & Concurrency
- **Debounced Save**: When changes arrive via `ydoc.on('update')`, a save timer is debounced for `saveDelayMs` (default: 2,000ms).
- **Sequential Save Queue**: Saves are serialized using an asynchronous promise chain (`room.savePromise`), guaranteeing MongoDB writes never execute concurrently or out of order.
- **Concurrency Retries**: Version conflict errors (`VersionError`) from simultaneous document updates trigger automatic re-attempts.
- **Idle Teardown**: When the last user disconnects, the room saves immediately to MongoDB and remains in memory for `roomIdleMs` (60s). If no clients reconnect, the `Y.Doc` and room memory are released.
- **Heartbeat Monitoring**: Ping-pong heartbeats sweep every 30 seconds to drop stale connections and release abandoned block locks.

---

## 5. Document Data Model & Tree AST (`src/models/Document.ts`, `src/utils/blockTree.ts`)

### 5.1 Hierarchical Schema in MongoDB
Documents in MongoDB store a recursive block tree:

```typescript
interface IBlockNode {
  blockId: string;       // Unique ID regex: ^[A-Za-z0-9-]{1,64}$
  type: BlockType;       // heading | paragraph | codeBlock | quote | list | listItem
  text: string;          // Sanitized text content (max 10,000 chars)
  level?: number;        // Heading level (1-6)
  parentId: string|null; // Computed parent node identifier
  depth: number;         // Computed nesting depth (max 5)
  path: string;          // Materialized path, e.g. "rootId/childId"
  children: IBlockNode[];// Recursive child nodes (lists & listItems)
}
```

### 5.2 Tree <-> Flat List Transformation
- **In MongoDB (AST Tree)**: Preserves structured semantic nesting (lists wrapping list items).
- **In Yjs (Flat Array)**: Flat array of `FlatBlock` items with a `depth` property, ensuring efficient conflict resolution during linear cursor movements and block ordering.
- **Transformation Pipeline**:
  - `buildTree(flat: FlatBlock[])`: Reconstructs tree hierarchies from flat CRDT block arrays, validating depths and capping nesting at `MAX_ITEM_DEPTH = 4`.
  - `flattenBlocks(nodes: IBlockNode[])`: Unwraps AST containers into linear block sequences for editor ingestion.

### 5.3 Enforced Document Constraints
- Maximum nesting depth: `MAX_DEPTH = 5`
- Maximum blocks per document: `MAX_BLOCKS = 1,000`
- Maximum collaborators per document: `MAX_COLLABORATORS = 20`
- Maximum documents per owner: `MAX_DOCS_PER_USER = 100`

---

## 6. Directory Structure

```
server/
├── .env                  # Environment configuration
├── package.json          # Node dependencies and npm scripts
├── tsconfig.json         # TypeScript configuration
├── src/
│   ├── index.ts          # Server entry point & graceful shutdown
│   ├── app.ts            # Express application factory & middleware setup
│   ├── seed.ts           # Development database seeder
│   ├── config/
│   │   ├── db.ts         # Mongoose connection management
│   │   └── env.ts        # Environment variable schema validation
│   ├── middleware/
│   │   └── auth.ts       # JWT verification & token generation
│   ├── models/
│   │   ├── Document.ts   # Document Mongoose schema, AST model & validators
│   │   └── User.ts       # User account schema & credentials
│   ├── routes/
│   │   ├── auth.ts       # Authentication endpoints (register, login, me)
│   │   └── documents.ts  # Document CRUD, sharing, import, and export
│   ├── sync/
│   │   ├── deps.ts       # Bridge between WebSocket rooms and MongoDB
│   │   └── syncServer.ts # Yjs WebSocket server, room state & lock engine
│   ├── utils/
│   │   ├── blockTree.ts  # Flat <-> Tree block transformations
│   │   ├── color.ts      # Deterministic user color generation
│   │   ├── exportHtml.ts # HTML document rendering
│   │   ├── exportPdf.ts  # PDFKit streaming export
│   │   ├── http.ts       # Request validation & async route wrapper
│   │   ├── markdown.ts   # Markdown parser and block serializer
│   │   └── sanitize.ts   # DOMPurify-based XSS sanitization
│   └── __tests__/        # Jest integration and unit test suite
```

