# SyncDoc

SyncDoc is a block-based collaborative document editor where multiple users can edit the same document in real time without overwriting each other's changes.

The project uses Yjs CRDT for real-time synchronization and stores the document structure as an AST in MongoDB.

---

## Features

- Real-time collaborative document editing
- Block-based document editor
- Yjs CRDT synchronization
- WebSocket-based communication
- Live cursors and user presence
- Block locking
- Automatic document saving
- MongoDB document persistence
- Markdown import and export
- HTML export
- PDF export
- JWT authentication
- Password hashing with bcrypt
- Document sharing and collaboration
- DOMPurify-based sanitization
- API rate limiting
- Helmet security headers
- REST API
- Unit and integration testing

---

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Yjs

### Backend

- Node.js
- Express
- WebSocket (`ws`)

### Database

- MongoDB
- Mongoose

### Authentication & Security

- JWT
- bcrypt
- Helmet
- DOMPurify
- Rate Limiting

### Testing

- Jest
- Supertest
- Vitest

### Export

- PDFKit
- HTML
- Markdown

---

## Architecture

```text
                    ┌─────────────────────┐
                    │       Browser       │
                    │                     │
                    │ React + TypeScript  │
                    │       + Yjs         │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                 REST API             WebSocket
                    │                     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │       Server        │
                    │                     │
                    │ Express + WebSocket │
                    │ Authentication      │
                    │ Validation           │
                    │ Synchronization      │
                    └──────────┬──────────┘
                               │
                           Mongoose
                               │
                               ▼
                    ┌─────────────────────┐
                    │      MongoDB        │
                    │                     │
                    │ Users               │
                    │ Documents           │
                    │ Block AST            │
                    └─────────────────────┘
