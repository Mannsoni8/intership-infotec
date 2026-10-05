import { Schema, model } from 'mongoose';

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 30 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    // never returned by default, so it can not leak by mistake
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

export const UserModel = model<IUser>('User', userSchema);
