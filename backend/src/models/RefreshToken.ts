import mongoose, { Schema, Document } from 'mongoose';

export interface IRefreshToken extends Document {
  user: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  createdByIp?: string;
  revoked?: boolean;
  revokedAt?: Date;
  revokedByIp?: string;
  replacedByToken?: string;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    createdByIp: { type: String },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
    revokedByIp: { type: String },
    replacedByToken: { type: String }
  },
  { timestamps: false }
);

export default mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema);
