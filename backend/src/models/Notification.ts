import { Schema, model, Document, Types } from 'mongoose';

export interface INotification extends Document {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  sender: Types.ObjectId;
  type: 'reviewer_assigned' | 'pr_updated' | 'comment_added' | 'pr_approved' | 'pr_rejected';
  title: string;
  message: string;
  relatedPR?: Types.ObjectId;
  relatedProject?: Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['reviewer_assigned', 'pr_updated', 'comment_added', 'pr_approved', 'pr_rejected'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  relatedPR: {
    type: Schema.Types.ObjectId,
    ref: 'PullRequest'
  },
  relatedProject: {
    type: Schema.Types.ObjectId,
    ref: 'Project'
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

export default model<INotification>('Notification', notificationSchema);