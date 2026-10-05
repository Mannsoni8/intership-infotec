// Integration tests: they need a real MongoDB. Run them with
//   TEST_MONGO_URI=mongodb://127.0.0.1:27017/syncdoc-test npm test
// Without TEST_MONGO_URI these tests are skipped.
import http from 'http';
import { AddressInfo } from 'net';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import WebSocket from 'ws';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { createApp } from '../app';
import { connectDB } from '../config/db';
import { attachSyncServer, SyncHandle } from '../sync/syncServer';
import { createSyncDeps } from '../sync/deps';

const describeDb = process.env.TEST_MONGO_URI ? describe : describe.skip;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PASSWORD = 'Sup3r-secret-pw';

describeDb('REST api + sync engine with a real database', () => {
  let server: http.Server;
  let sync: SyncHandle;
  let port: number;
  let api: ReturnType<typeof request>;

  beforeAll(async () => {
    await connectDB(process.env.TEST_MONGO_URI as string);
    await mongoose.connection.dropDatabase();
    await mongoose.connection.syncIndexes();

    const app = createApp({
      onDocumentDeleted: (id) => sync.evictRoom(id),
      onAccessRevoked: (id, userId) => sync.kickUser(id, userId),
      flushDocument: (id) => sync.flushRoom(id),
    });
    server = http.createServer(app);
    sync = attachSyncServer(server, createSyncDeps(), { saveDelayMs: 200, roomIdleMs: 500 });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    port = (server.address() as AddressInfo).port;
    api = request(server);
  });

  afterAll(async () => {
    await sync.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const register = async (name: string, email: string) => {
    const res = await api.post('/api/auth/register').send({ name, email, password: PASSWORD });
    expect(res.status).toBe(201);
    return { token: res.body.token as string, id: res.body.user.id as string };
  };
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  let alice: { token: string; id: string };
  let bob: { token: string; id: string };
  let carol: { token: string; id: string };

  describe('authentication', () => {
    test('register and login work, the password is never returned', async () => {
      alice = await register('Alice', 'Alice@Example.com');
      bob = await register('Bob', 'bob@example.com');
      carol = await register('Carol', 'carol@example.com');

      const res = await api.post('/api/auth/login').send({ email: 'alice@example.com', password: PASSWORD });
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('alice@example.com'); // emails are normalized
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
    });

    test('the password is stored as a bcrypt hash', async () => {
      const raw = await mongoose.connection.collection('users').findOne({ email: 'alice@example.com' });
      expect(raw?.passwordHash).toMatch(/^\$2[aby]\$12\$/);
      expect(raw?.passwordHash).not.toContain(PASSWORD);
    });

    test.each([
      [{ name: 'A', email: 'a@b.co', password: PASSWORD }, 'short name'],
      [{ name: 'Dave', email: 'not-an-email', password: PASSWORD }, 'bad email'],
      [{ name: 'Dave', email: 'dave@example.com', password: 'short' }, 'short password'],
      [{ name: 'Dave', email: 'dave@example.com', password: 'x'.repeat(100) }, 'password over 72 bytes'],
      [{ name: 'Dave', email: { $gt: '' }, password: PASSWORD }, 'email as object'],
    ])('register rejects %j (%s)', async (body, _why) => {
      const res = await api.post('/api/auth/register').send(body);
      expect(res.status).toBe(400);
    });

    test('duplicate email is rejected', async () => {
      const res = await api.post('/api/auth/register').send({ name: 'Alice 2', email: 'alice@example.com', password: PASSWORD });
      expect(res.status).toBe(409);
    });

    test('wrong password and unknown email give the same answer', async () => {
      const wrong = await api.post('/api/auth/login').send({ email: 'alice@example.com', password: 'wrong-password' });
      const unknown = await api.post('/api/auth/login').send({ email: 'nobody@example.com', password: PASSWORD });
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.body).toEqual(unknown.body);
    });

    test('NoSQL injection in the login does not work', async () => {
      const res = await api.post('/api/auth/login').send({ email: { $gt: '' }, password: { $gt: '' } });
      expect(res.status).toBe(401);
    });

    test('protected routes need a valid token', async () => {
      expect((await api.get('/api/documents')).status).toBe(401);
      expect((await api.get('/api/documents').set(auth('garbage'))).status).toBe(401);

      // a token signed with another secret
      const forged = jwt.sign({ sub: alice.id }, 'another-secret-another-secret-another-secret');
      expect((await api.get('/api/documents').set(auth(forged))).status).toBe(401);

      // a token with "alg: none" (no signature at all)
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: alice.id })).toString('base64url');
      expect((await api.get('/api/documents').set(auth(`${header}.${payload}.`))).status).toBe(401);

      // an expired token
      const expired = jwt.sign({ sub: alice.id }, process.env.JWT_SECRET as string, { expiresIn: -10 });
      expect((await api.get('/api/documents').set(auth(expired))).status).toBe(401);

      expect((await api.get('/api/auth/me').set(auth(alice.token))).body.user.name).toBe('Alice');
    });
  });

  describe('documents, sharing and access control', () => {
    let docId: string;

    test('create, list, get and rename', async () => {
      const created = await api.post('/api/documents').set(auth(alice.token)).send({ title: 'Spec' });
      expect(created.status).toBe(201);
      docId = created.body._id;
      expect(created.body.role).toBe('owner');

      const list = await api.get('/api/documents').set(auth(alice.token));
      expect(list.body.map((d: { title: string }) => d.title)).toContain('Spec');

      const renamed = await api.patch(`/api/documents/${docId}`).set(auth(alice.token)).send({ title: 'Spec v2' });
      expect(renamed.body.title).toBe('Spec v2');
    });

    test('strangers get "not found" (they can not even know the document exists)', async () => {
      expect((await api.get(`/api/documents/${docId}`).set(auth(bob.token))).status).toBe(404);
      expect((await api.get('/api/documents/not-an-id').set(auth(bob.token))).status).toBe(404);
      expect((await api.get(`/api/documents/${docId}/export/md`).set(auth(bob.token))).status).toBe(404);
      expect((await api.delete(`/api/documents/${docId}`).set(auth(bob.token))).status).toBe(404);
      const list = await api.get('/api/documents').set(auth(bob.token));
      expect(list.body).toEqual([]);
    });

    test('titles are cleaned and an object as title is rejected', async () => {
      const res = await api.post('/api/documents').set(auth(alice.token)).send({ title: '<img src=x onerror=alert(1)>Clean' });
      expect(res.body.title).toBe('Clean');
      expect((await api.post('/api/documents').set(auth(alice.token)).send({ title: { $ne: 1 } })).status).toBe(400);
      expect((await api.post('/api/documents').set(auth(alice.token)).send({ title: '   ' })).status).toBe(400);
    });

    test('the owner shares with a collaborator, who can read but not manage', async () => {
      expect((await api.post(`/api/documents/${docId}/share`).set(auth(alice.token)).send({ email: 'nobody@x.com' })).status).toBe(404);
      expect((await api.post(`/api/documents/${docId}/share`).set(auth(alice.token)).send({ email: 'alice@example.com' })).status).toBe(400);

      const shared = await api.post(`/api/documents/${docId}/share`).set(auth(alice.token)).send({ email: 'BOB@example.com' });
      expect(shared.status).toBe(200);
      expect(shared.body.collaborators).toHaveLength(1);

      const asBob = await api.get(`/api/documents/${docId}`).set(auth(bob.token));
      expect(asBob.status).toBe(200);
      expect(asBob.body.role).toBe('collaborator');
      expect(asBob.body.collaborators[0].email).toBeUndefined(); // emails are only for the owner

      const list = await api.get('/api/documents').set(auth(bob.token));
      expect(list.body[0].role).toBe('collaborator');

      // collaborators can not rename, delete or share
      expect((await api.patch(`/api/documents/${docId}`).set(auth(bob.token)).send({ title: 'x' })).status).toBe(403);
      expect((await api.delete(`/api/documents/${docId}`).set(auth(bob.token))).status).toBe(403);
      expect((await api.post(`/api/documents/${docId}/share`).set(auth(bob.token)).send({ email: 'carol@example.com' })).status).toBe(403);
      expect((await api.delete(`/api/documents/${docId}/share/${alice.id}`).set(auth(bob.token))).status).toBe(403);
    });

    test('removing a collaborator takes the access away', async () => {
      expect((await api.delete(`/api/documents/${docId}/share/${bob.id}`).set(auth(alice.token))).status).toBe(200);
      expect((await api.get(`/api/documents/${docId}`).set(auth(bob.token))).status).toBe(404);
    });

    test('a collaborator can leave a document by himself', async () => {
      await api.post(`/api/documents/${docId}/share`).set(auth(alice.token)).send({ email: 'carol@example.com' });
      expect((await api.delete(`/api/documents/${docId}/share/${carol.id}`).set(auth(carol.token))).status).toBe(200);
      expect((await api.get(`/api/documents/${docId}`).set(auth(carol.token))).status).toBe(404);
    });
  });

  describe('Markdown import and export', () => {
    test('import creates blocks, and export gives them back in every format', async () => {
      const md = '# Plan\n\nHello **world**\n\n- one\n  - two\n\n```\nlet a = 1;\n```\n';
      const imported = await api.post('/api/documents/import').set(auth(alice.token)).send({ title: 'Imported', markdown: md });
      expect(imported.status).toBe(201);
      const id = imported.body._id;

      const out = await api.get(`/api/documents/${id}/export/md`).set(auth(alice.token));
      expect(out.status).toBe(200);
      expect(out.text).toContain('# Plan');
      expect(out.text).toContain('  - two');
      expect(out.headers['content-disposition']).toMatch(/^attachment; filename="Imported\.md"$/);

      const html = await api.get(`/api/documents/${id}/export/html`).set(auth(alice.token));
      expect(html.headers['content-type']).toMatch(/text\/html/);
      expect(html.text).toContain('<li>one<ul><li>two</li></ul></li>');
      expect(html.headers['x-content-type-options']).toBe('nosniff'); // helmet

      const pdf = await api.get(`/api/documents/${id}/export/pdf`).set(auth(alice.token)).buffer(true).parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
      expect(pdf.status).toBe(200);
      expect(pdf.headers['content-type']).toBe('application/pdf');
      expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');

      expect((await api.get(`/api/documents/${id}/export/exe`).set(auth(alice.token))).status).toBe(400);
    });

    test('xss inside imported Markdown is removed before it is saved', async () => {
      const md = '# Hi <script>alert(1)</script>\n\n<img src=x onerror=alert(2)>text\n\n- <svg onload=alert(3)>item\n';
      const imported = await api.post('/api/documents/import').set(auth(alice.token)).send({ title: 'XSS', markdown: md });
      const raw = JSON.stringify(await mongoose.connection.collection('documents').findOne({ title: 'XSS' }));
      expect(raw).not.toMatch(/<script|<img|<svg|onerror|onload/i);

      const html = await api.get(`/api/documents/${imported.body._id}/export/html`).set(auth(alice.token));
      expect(html.text).not.toMatch(/<script|<img|<svg/i);
    });

    test('bad import requests are rejected', async () => {
      expect((await api.post('/api/documents/import').set(auth(alice.token)).send({ title: 'x', markdown: '   ' })).status).toBe(400);
      expect((await api.post('/api/documents/import').set(auth(alice.token)).send({ markdown: '# a' })).status).toBe(400);
    });
  });

  describe('live editing is saved to the database', () => {
    const connect = (token: string, docId: string) => {
      const doc = new Y.Doc();
      const provider = new WebsocketProvider(`ws://localhost:${port}`, docId, doc, {
        WebSocketPolyfill: WebSocket as never,
        disableBc: true,
        params: { token },
      });
      provider.messageHandlers[4] = () => undefined; // lock messages are not needed here
      return { doc, provider, blocks: doc.getArray<Y.Map<unknown>>('blocks') };
    };
    const close = (c: ReturnType<typeof connect>) => {
      c.provider.destroy();
      c.provider.awareness.destroy();
      c.doc.destroy();
    };

    test('two users edit together, autosave stores it, xss typed into the editor is cleaned', async () => {
      const created = await api.post('/api/documents').set(auth(alice.token)).send({ title: 'Live' });
      const docId = created.body._id as string;
      await api.post(`/api/documents/${docId}/share`).set(auth(alice.token)).send({ email: 'bob@example.com' });

      const a = connect(alice.token, docId);
      const b = connect(bob.token, docId);
      await sleep(800);
      expect(a.blocks.length).toBe(1);
      expect(b.blocks.length).toBe(1);

      // Alice types into the first paragraph while Bob adds a heading and a code block
      (a.blocks.get(0).get('text') as Y.Text).insert(0, 'Hello <script>alert(1)</script>team');
      b.doc.transact(() => {
        for (const [id, type, text] of [['h1', 'heading', 'Title'], ['c1', 'codeBlock', 'if (a<b) {}']]) {
          const m = new Y.Map<unknown>();
          m.set('id', id);
          m.set('type', type);
          m.set('depth', 0);
          m.set('level', 2);
          m.set('text', new Y.Text(text));
          b.blocks.push([m]);
        }
      });
      await sleep(900); // autosave runs after 200 ms

      const md = await api.get(`/api/documents/${docId}/export/md`).set(auth(alice.token));
      expect(md.text).toContain('Hello team'); // <script> was removed by DOMPurify when saving
      expect(md.text).not.toContain('<script');
      expect(md.text).toContain('## Title');
      expect(md.text).toContain('if (a<b) {}'); // code keeps its characters

      close(a);
      close(b);
    });

    test('a new session starts from the saved version', async () => {
      const list = await api.get('/api/documents').set(auth(alice.token));
      const live = list.body.find((d: { title: string }) => d.title === 'Live');
      await sleep(900); // the empty room is removed from memory
      const c = connect(alice.token, live._id);
      await sleep(800);
      expect(c.blocks.length).toBe(3);
      expect((c.blocks.get(0).get('text') as Y.Text).toString()).toBe('Hello team');
      close(c);
    });

    test('a user without access can not open the websocket, even with a valid login', async () => {
      const list = await api.get('/api/documents').set(auth(alice.token));
      const live = list.body.find((d: { title: string }) => d.title === 'Live');
      const code = await new Promise<number>((resolve) => {
        const ws = new WebSocket(`ws://localhost:${port}/${live._id}?token=${carol.token}`);
        ws.on('close', (c) => resolve(c));
        ws.on('error', () => undefined);
      });
      expect(code).toBe(1008);
    });

    test('deleting a document closes the live sessions', async () => {
      const created = await api.post('/api/documents').set(auth(alice.token)).send({ title: 'To delete' });
      const docId = created.body._id as string;
      const a = connect(alice.token, docId);
      await sleep(600);
      expect(a.provider.wsconnected).toBe(true);
      expect((await api.delete(`/api/documents/${docId}`).set(auth(alice.token))).status).toBe(200);
      await sleep(700);
      expect(a.provider.wsconnected).toBe(false); // and it can not come back: the document is gone
      close(a);
    });
  });

  describe('request limits', () => {
    test('invalid json and huge bodies are refused with clear errors', async () => {
      const bad = await api.post('/api/auth/login').set('Content-Type', 'application/json').send('{"email": ');
      expect(bad.status).toBe(400);
      const huge = await api.post('/api/documents/import').set(auth(alice.token)).send({ title: 'x', markdown: 'a'.repeat(400000) });
      expect(huge.status).toBe(413);
    });

    test('too many login tries are blocked (brute force protection)', async () => {
      const limited = request(createApp({}, { authLimit: 3 }));
      const statuses: number[] = [];
      for (let i = 0; i < 5; i++) {
        statuses.push((await limited.post('/api/auth/login').send({ email: 'alice@example.com', password: 'nope-nope-nope' })).status);
      }
      expect(statuses).toEqual([401, 401, 401, 429, 429]);
    });

    test('unknown api routes give 404 json and no stack traces are leaked', async () => {
      const res = await api.get('/api/does-not-exist');
      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body)).not.toMatch(/at \w+|node_modules/);
    });
  });
});
