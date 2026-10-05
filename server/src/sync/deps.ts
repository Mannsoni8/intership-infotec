import mongoose from 'mongoose';
import { SyncDeps } from './syncServer';
import { DocumentModel } from '../models/Document';
import { UserModel } from '../models/User';
import { verifyToken } from '../middleware/auth';
import { colorForId } from '../utils/color';
import { flattenBlocks, buildTree } from '../utils/blockTree';

// connects the sync server with the real database and the login system
export function createSyncDeps(): SyncDeps {
  return {
    async authenticate(token) {
      const userId = token ? verifyToken(token) : null;
      if (!userId || !mongoose.isValidObjectId(userId)) return null;
      const user = await UserModel.findById(userId);
      if (!user) return null;
      return { id: String(user._id), name: user.name, color: colorForId(String(user._id)) };
    },

    async canAccess(docId, userId) {
      const doc = await DocumentModel.findById(docId).select('owner collaborators').lean();
      if (!doc) return false;
      return String(doc.owner) === userId || doc.collaborators.some((c) => String(c) === userId);
    },

    async loadBlocks(docId) {
      const doc = await DocumentModel.findById(docId).lean();
      return doc ? flattenBlocks(doc.blocks) : null;
    },

    // live edits (flat list from yjs) -> tree -> mongodb. The pre-save hook validates and sanitizes it.
    async saveBlocks(docId, blocks) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const doc = await DocumentModel.findById(docId);
        if (!doc) return; // document was deleted
        doc.blocks = buildTree(blocks);
        try {
          await doc.save();
          return;
        } catch (err) {
          // somebody changed the document at the same time (for example a rename): try once more
          if ((err as Error).name !== 'VersionError' || attempt === 1) throw err;
        }
      }
    },
  };
}
