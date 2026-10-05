import 'dotenv/config';

export interface Env {
  port: number;
  mongoUri: string;
  jwtSecret: string;
  clientOrigins: string[];
  nodeEnv: string;
}

let cached: Env | null = null;

// reads and checks all the environment variables once.
// the server refuses to start if the JWT secret is missing or weak
export function getEnv(): Env {
  if (cached) return cached;

  const jwtSecret = process.env.JWT_SECRET || '';
  if (jwtSecret.length < 32 || jwtSecret.includes('change-me')) {
    throw new Error(
      'JWT_SECRET is missing or too weak (need 32+ characters). Run "npm run setup" in the root folder.'
    );
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is missing in server/.env');
  }

  cached = {
    port: Number(process.env.PORT) || 5000,
    mongoUri,
    jwtSecret,
    clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    nodeEnv: process.env.NODE_ENV || 'development',
  };
  return cached;
}

// only used by tests
export function resetEnvCache(): void {
  cached = null;
}
