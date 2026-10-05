import mongoose from 'mongoose';

// connects to mongodb using the uri from .env
export async function connectDB(uri: string): Promise<void> {
  // security: any object with $ operators inside a filter is treated as a plain value.
  // this blocks NoSQL injection like { email: { "$gt": "" } }
  mongoose.set('sanitizeFilter', true);
  mongoose.set('strictQuery', true);

  await mongoose.connect(uri);
  console.log('MongoDB connected');
}
