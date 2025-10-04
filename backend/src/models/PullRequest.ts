import mongoose, { Schema, Document } from "mongoose";

export interface IFile extends Document {
  path: string;
  oldContent?: string;
  newContent?: string;
  changeType: 'added' | 'modified' | 'deleted';
  lineChanges?: Array<{
    lineNumber: number;
    type: 'added' | 'removed' | 'modified';
    content: string;
  }>;
}

export interface IPullRequest extends Document {
  title: string;
  description: string;
  status: 'open' | 'reviewing' | 'approved' | 'rejected' | 'merged' | 'closed';
  sourceBranch: string;
  targetBranch: string;
  repository: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  assignedReviewers: mongoose.Types.ObjectId[];
  files: IFile[];
  comments: Array<{
    text: string;
    author: mongoose.Types.ObjectId;
    filePath?: string;
    lineNumber?: number;
    createdAt: Date;
  }>;
  reviewDecisions: Array<{
    reviewer: mongoose.Types.ObjectId;
    decision: 'approved' | 'rejected' | 'changes_requested';
    comment?: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IFile>({
  path: { type: String, required: true },
  oldContent: { type: String },
  newContent: { type: String },
  changeType: { 
    type: String, 
    enum: ['added', 'modified', 'deleted'], 
    required: true 
  },
  lineChanges: [{
    lineNumber: { type: Number, required: true },
    type: { type: String, enum: ['added', 'removed', 'modified'], required: true },
    content: { type: String, required: true }
  }]
});

const pullRequestSchema = new Schema<IPullRequest>(
  {
    title: { type: String, required: true },
    description: { type: String },
    status: { 
      type: String, 
      enum: ['open', 'reviewing', 'approved', 'rejected', 'merged', 'closed'],
      default: 'open'
    },
    sourceBranch: { type: String, required: true },
    targetBranch: { type: String, required: true },
    repository: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedReviewers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    files: [fileSchema],
    comments: [{
      text: { type: String, required: true },
      author: { type: Schema.Types.ObjectId, ref: "User", required: true },
      filePath: { type: String },
      lineNumber: { type: Number },
      createdAt: { type: Date, default: Date.now }
    }],
    reviewDecisions: [{
      reviewer: { type: Schema.Types.ObjectId, ref: "User", required: true },
      decision: { 
        type: String, 
        enum: ['approved', 'rejected', 'changes_requested'], 
        required: true 
      },
      comment: { type: String },
      createdAt: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

export default mongoose.model<IPullRequest>("PullRequest", pullRequestSchema);