import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { UserModel } from '../models/User';
import { signToken, requireAuth } from '../middleware/auth';
import { asString, wrap } from '../utils/http';
import { sanitizeLine } from '../utils/sanitize';
import { colorForId } from '../utils/color';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_COST = 12;
// used when the email does not exist, so login takes the same time either way
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

interface PublicUser {
  id: string;
  name: string;
  email: string;
  color: string;
}

function toPublicUser(user: { _id: unknown; name: string; email: string }): PublicUser {
  const id = String(user._id);
  return { id, name: user.name, email: user.email, color: colorForId(id) };
}

export function authRoutes(authLimit: number): Router {
  const router = Router();

  // brute force protection: only a few register / login tries per ip
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: authLimit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many attempts, please try again later' },
  });

  router.post(
    '/register',
    limiter,
    wrap(async (req, res) => {
      const name = sanitizeLine(asString(req.body?.name), 30);
      const email = asString(req.body?.email).trim().toLowerCase();
      const password = asString(req.body?.password);

      if (name.length < 2) {
        res.status(400).json({ message: 'Name must be at least 2 characters' });
        return;
      }
      if (!EMAIL_PATTERN.test(email) || email.length > 254) {
        res.status(400).json({ message: 'Please enter a valid email' });
        return;
      }
      // bcrypt only reads the first 72 bytes, so longer passwords are not allowed
      if (password.length < 8 || Buffer.byteLength(password) > 72) {
        res.status(400).json({ message: 'Password must be 8 to 72 characters' });
        return;
      }

      const existing = await UserModel.findOne({ email });
      if (existing) {
        res.status(409).json({ message: 'This email is already registered' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
      const user = await UserModel.create({ name, email, passwordHash });
      res.status(201).json({ token: signToken(String(user._id)), user: toPublicUser(user) });
    })
  );

  router.post(
    '/login',
    limiter,
    wrap(async (req, res) => {
      const email = asString(req.body?.email).trim().toLowerCase();
      const password = asString(req.body?.password);

      const user = await UserModel.findOne({ email }).select('+passwordHash');
      const matches = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

      // same message for "no such email" and "wrong password"
      if (!user || !matches) {
        res.status(401).json({ message: 'Wrong email or password' });
        return;
      }
      res.json({ token: signToken(String(user._id)), user: toPublicUser(user) });
    })
  );

  router.get(
    '/me',
    requireAuth,
    wrap(async (req, res) => {
      const user = await UserModel.findById(req.userId);
      if (!user) {
        res.status(401).json({ message: 'Please log in again' });
        return;
      }
      res.json({ user: toPublicUser(user) });
    })
  );

  return router;
}
