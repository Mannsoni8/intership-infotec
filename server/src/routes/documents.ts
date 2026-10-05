import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import { DocumentModel, DocumentDoc, MAX_COLLABORATORS } from '../models/Document';
import { UserModel } from '../models/User';
import { requireAuth } from '../middleware/auth';
import { asString, paramString, wrap } from '../utils/http';
import { sanitizeLine } from '../utils/sanitize';
import { flattenBlocks, buildTree } from '../utils/blockTree';
import { markdownToBlocks, blocksToMarkdown, MAX_MARKDOWN_LENGTH } from '../utils/markdown';
import { blocksToHtml } from '../utils/exportHtml';
import { blocksToPdf } from '../utils/exportPdf';

const MAX_DOCS_PER_USER = 100;

// the sync server registers these, so rest actions can affect live websocket sessions
export interface AppHooks {
  onDocumentDeleted?: (docId: string) => void;
  onAccessRevoked?: (docId: string, userId: string) => void;
  flushDocument?: (docId: string) => Promise<void>;
}

function isOwner(doc: DocumentDoc, userId: string): boolean {
  return String(doc.owner) === userId;
}

function hasAccess(doc: DocumentDoc, userId: string): boolean {
  return isOwner(doc, userId) || doc.collaborators.some((c) => String(c) === userId);
}

// finds the document and checks that the user may see it.
// "not found" and "no access" give the same answer so ids can not be guessed
async function findAccessible(req: Request, res: Response): Promise<DocumentDoc | null> {
  const id = paramString(req.params.id);
  if (!mongoose.isValidObjectId(id)) {
    res.status(404).json({ message: 'Document not found' });
    return null;
  }
  const doc = await DocumentModel.findById(id);
  if (!doc || !hasAccess(doc, req.userId as string)) {
    res.status(404).json({ message: 'Document not found' });
    return null;
  }
  return doc;
}

// same, but only the owner is allowed
async function findOwned(req: Request, res: Response): Promise<DocumentDoc | null> {
  const doc = await findAccessible(req, res);
  if (!doc) return null;
  if (!isOwner(doc, req.userId as string)) {
    res.status(403).json({ message: 'Only the owner can do this' });
    return null;
  }
  return doc;
}

// the document info that is sent to the browser (without blocks)
async function describe(doc: DocumentDoc, userId: string) {
  await doc.populate([
    { path: 'owner', select: 'name' },
    { path: 'collaborators', select: 'name email' },
  ]);
  const owner = doc.owner as unknown as { _id: unknown; name: string };
  const owned = String(owner._id) === userId;
  return {
    _id: String(doc._id),
    title: doc.title,
    updatedAt: doc.updatedAt,
    role: owned ? 'owner' : 'collaborator',
    owner: { id: String(owner._id), name: owner.name },
    // emails of other people are only shown to the owner
    collaborators: (doc.collaborators as unknown as { _id: unknown; name: string; email: string }[]).map((c) => ({
      id: String(c._id),
      name: c.name,
      ...(owned ? { email: c.email } : {}),
    })),
  };
}

function safeFileName(title: string): string {
  const name = title.replace(/[^A-Za-z0-9 _-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
  return name || 'document';
}

export function documentRoutes(hooks: AppHooks): Router {
  const router = Router();
  router.use(requireAuth);

  // list of my documents (owned + shared with me)
  router.get(
    '/',
    wrap(async (req, res) => {
      const userId = req.userId as string;
      const [owned, shared] = await Promise.all([
        DocumentModel.find({ owner: userId }).populate('owner', 'name').lean(),
        DocumentModel.find({ collaborators: userId }).populate('owner', 'name').lean(),
      ]);

      const toItem = (d: (typeof owned)[number], role: string) => ({
        _id: String(d._id),
        title: d.title,
        updatedAt: d.updatedAt,
        blockCount: flattenBlocks(d.blocks).length,
        role,
        ownerName: (d.owner as unknown as { name: string }).name,
      });

      const list = [...owned.map((d) => toItem(d, 'owner')), ...shared.map((d) => toItem(d, 'collaborator'))];
      list.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
      res.json(list);
    })
  );

  // create an empty document
  router.post(
    '/',
    wrap(async (req, res) => {
      const userId = req.userId as string;
      const title = sanitizeLine(asString(req.body?.title), 120);
      if (!title) {
        res.status(400).json({ message: 'Title is required' });
        return;
      }
      if ((await DocumentModel.countDocuments({ owner: userId })) >= MAX_DOCS_PER_USER) {
        res.status(400).json({ message: `You can have at most ${MAX_DOCS_PER_USER} documents` });
        return;
      }

      const doc = new DocumentModel({
        title,
        owner: userId,
        blocks: buildTree([{ id: randomUUID(), type: 'paragraph', depth: 0, text: '' }]),
      });
      await doc.save(); // pre-save hook runs here
      res.status(201).json(await describe(doc, userId));
    })
  );

  // create a document from Markdown text (Markdown -> JSON AST)
  router.post(
    '/import',
    wrap(async (req, res) => {
      const userId = req.userId as string;
      const title = sanitizeLine(asString(req.body?.title), 120);
      const markdown = asString(req.body?.markdown);
      if (!title) {
        res.status(400).json({ message: 'Title is required' });
        return;
      }
      if (!markdown.trim() || markdown.length > MAX_MARKDOWN_LENGTH) {
        res.status(400).json({ message: 'Markdown is empty or too long' });
        return;
      }
      if ((await DocumentModel.countDocuments({ owner: userId })) >= MAX_DOCS_PER_USER) {
        res.status(400).json({ message: `You can have at most ${MAX_DOCS_PER_USER} documents` });
        return;
      }

      const doc = new DocumentModel({ title, owner: userId, blocks: buildTree(markdownToBlocks(markdown)) });
      await doc.save();
      res.status(201).json(await describe(doc, userId));
    })
  );

  router.get(
    '/:id',
    wrap(async (req, res) => {
      const doc = await findAccessible(req, res);
      if (doc) res.json(await describe(doc, req.userId as string));
    })
  );

  // rename
  router.patch(
    '/:id',
    wrap(async (req, res) => {
      const doc = await findOwned(req, res);
      if (!doc) return;
      const title = sanitizeLine(asString(req.body?.title), 120);
      if (!title) {
        res.status(400).json({ message: 'Title is required' });
        return;
      }
      doc.title = title;
      await doc.save();
      res.json(await describe(doc, req.userId as string));
    })
  );

  router.delete(
    '/:id',
    wrap(async (req, res) => {
      const doc = await findOwned(req, res);
      if (!doc) return;
      await doc.deleteOne();
      hooks.onDocumentDeleted?.(String(doc._id));
      res.json({ message: 'Document deleted' });
    })
  );

  // share with another registered user (by email)
  router.post(
    '/:id/share',
    wrap(async (req, res) => {
      const doc = await findOwned(req, res);
      if (!doc) return;

      const email = asString(req.body?.email).trim().toLowerCase();
      const target = email ? await UserModel.findOne({ email }) : null;
      if (!target) {
        res.status(404).json({ message: 'No registered user has this email' });
        return;
      }
      if (String(target._id) === String(doc.owner)) {
        res.status(400).json({ message: 'You already own this document' });
        return;
      }
      if (doc.collaborators.length >= MAX_COLLABORATORS) {
        res.status(400).json({ message: `At most ${MAX_COLLABORATORS} collaborators` });
        return;
      }
      if (!doc.collaborators.some((c) => String(c) === String(target._id))) {
        doc.collaborators.push(target._id);
        await doc.save();
      }
      res.json(await describe(doc, req.userId as string));
    })
  );

  // remove a collaborator (owner) or leave a document (the collaborator himself)
  router.delete(
    '/:id/share/:userId',
    wrap(async (req, res) => {
      const doc = await findAccessible(req, res);
      if (!doc) return;
      const me = req.userId as string;
      const target = paramString(req.params.userId);

      if (!isOwner(doc, me) && target !== me) {
        res.status(403).json({ message: 'Only the owner can remove other people' });
        return;
      }
      doc.collaborators = doc.collaborators.filter((c) => String(c) !== target) as typeof doc.collaborators;
      await doc.save();
      hooks.onAccessRevoked?.(String(doc._id), target);
      res.json(await describe(doc, me));
    })
  );

  // export as pdf / html / md
  router.get(
    '/:id/export/:format',
    wrap(async (req, res) => {
      const format = paramString(req.params.format);
      if (!['pdf', 'html', 'md'].includes(format)) {
        res.status(400).json({ message: 'Format must be pdf, html or md' });
        return;
      }
      const found = await findAccessible(req, res);
      if (!found) return;

      // make sure the latest live edits are saved before exporting
      await hooks.flushDocument?.(String(found._id));
      const doc = await DocumentModel.findById(found._id).lean();
      if (!doc) {
        res.status(404).json({ message: 'Document not found' });
        return;
      }
      const blocks = flattenBlocks(doc.blocks);
      const fileName = safeFileName(doc.title);

      // "attachment" makes the browser download the file instead of opening it on our site
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}.${format}"`);

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        const pdf = blocksToPdf(doc.title, blocks);
        pdf.on('error', () => res.destroy());
        pdf.pipe(res);
      } else if (format === 'html') {
        res.type('text/html; charset=utf-8').send(blocksToHtml(doc.title, blocks));
      } else {
        res.type('text/markdown; charset=utf-8').send(blocksToMarkdown(blocks));
      }
    })
  );

  return router;
}
