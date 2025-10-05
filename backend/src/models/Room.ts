import mongoose, { Document, Schema } from 'mongoose';

export interface IRoom extends Document {
  pullRequestId: string;
  projectId: string;
  participants: string[]; // User IDs
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema: Schema = new Schema({
  pullRequestId: {
    type: String,
    required: true,
    unique: true
  },
  projectId: {
    type: String,
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model<IRoom>('Room', RoomSchema);