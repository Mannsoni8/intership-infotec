import * as Y from 'yjs';

export type BlockType = 'heading' | 'paragraph' | 'codeBlock' | 'quote' | 'listItem';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  color: string;
}

// what the rest api gives us
export interface DocSummary {
  _id: string;
  title: string;
  updatedAt: string;
  blockCount: number;
  role: 'owner' | 'collaborator';
  ownerName: string;
}

export interface Collaborator {
  id: string;
  name: string;
  email?: string; // only the owner gets the emails
}

export interface DocInfo {
  _id: string;
  title: string;
  updatedAt: string;
  role: 'owner' | 'collaborator';
  owner: { id: string; name: string };
  collaborators: Collaborator[];
}

// a block inside the yjs document
export interface BlockView {
  id: string;
  type: BlockType;
  depth: number;
  level: number;
  text: Y.Text;
}

export interface CollabUser {
  name: string;
  color: string;
}

// a user who is online in the document
export interface Peer extends CollabUser {
  clientId: number;
}

// the cursor of another user (positions are yjs relative positions, so they follow the text)
export interface RemoteCursor {
  clientId: number;
  name: string;
  color: string;
  blockId: string;
  anchor: unknown;
  head: unknown;
}

export interface LockInfo {
  clientId: number;
  name: string;
  color: string;
}

export type LockTable = Record<string, LockInfo>;

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'denied';
