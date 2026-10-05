import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { getEnv } from './config/env';
import { connectDB } from './config/db';
import { DocumentModel } from './models/Document';
import { UserModel } from './models/User';
import { buildTree, FlatBlock } from './utils/blockTree';

const PASSWORD = 'Password123!'; // demo accounts only, never use this in production

function block(type: FlatBlock['type'], text: string, extra: Partial<FlatBlock> = {}): FlatBlock {
  return { id: randomUUID(), type, depth: 0, text, ...extra };
}

async function seed(): Promise<void> {
  await connectDB(getEnv().mongoUri);
  await DocumentModel.deleteMany({});
  await UserModel.deleteMany({});

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const alice = await UserModel.create({ name: 'Alice', email: 'alice@example.com', passwordHash });
  const bob = await UserModel.create({ name: 'Bob', email: 'bob@example.com', passwordHash });

  await DocumentModel.create({
    title: 'Technical Spec - Payment Service',
    owner: alice._id,
    collaborators: [bob._id], // shared, so both can edit together
    blocks: buildTree([
      block('heading', 'Payment Service Spec', { level: 1 }),
      block('paragraph', 'This document explains how the payment service talks to the billing API.'),
      block('heading', 'Requirements', { level: 2 }),
      block('listItem', 'Retry failed requests up to 3 times'),
      block('listItem', 'Log every transaction id'),
      block('listItem', 'Only log the last 4 digits', { depth: 1 }),
      block('listItem', 'Never store card numbers'),
      block('codeBlock', 'async function charge(amount) {\n  // TODO: call billing api\n}'),
      block('quote', 'Keep the code simple and readable.'),
    ]),
  });

  await DocumentModel.create({
    title: 'Meeting Notes - Sprint 1',
    owner: bob._id,
    blocks: buildTree([
      block('heading', 'Sprint 1 Notes', { level: 1 }),
      block('paragraph', 'Everyone joined on time. Discussed the folder structure of the monorepo.'),
    ]),
  });

  console.log('Seeded 2 users and 2 documents');
  console.log(`Login with alice@example.com or bob@example.com, password: ${PASSWORD}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
