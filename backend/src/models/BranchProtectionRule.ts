import mongoose, { Schema, Document } from 'mongoose';

export interface IBranchProtectionRule extends Document {
  projectId: string;
  branchPattern: string; // e.g., "main", "develop", "*" for all branches
  rules: {
    requirePullRequest: boolean;
    requireReviews: boolean;
    requiredReviewers: number;
    dismissStaleReviews: boolean;
    requireCodeOwnerReviews: boolean;
    restrictPushes: boolean;
    allowForcePushes: boolean;
    allowDeletions: boolean;
    requiredStatusChecks: {
      strict: boolean;
      contexts: string[];
    };
    enforceAdmins: boolean;
    restrictReviewDismissals: boolean;
    blockCreations: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
}

const BranchProtectionRuleSchema: Schema = new Schema({
  projectId: {
    type: String,
    required: true,
    default: 'global'
  },
  branchPattern: {
    type: String,
    required: true,
    default: 'main'
  },
  rules: {
    requirePullRequest: {
      type: Boolean,
      default: true
    },
    requireReviews: {
      type: Boolean,
      default: true
    },
    requiredReviewers: {
      type: Number,
      default: 2,
      min: 1,
      max: 10
    },
    dismissStaleReviews: {
      type: Boolean,
      default: true
    },
    requireCodeOwnerReviews: {
      type: Boolean,
      default: false
    },
    restrictPushes: {
      type: Boolean,
      default: true
    },
    allowForcePushes: {
      type: Boolean,
      default: false
    },
    allowDeletions: {
      type: Boolean,
      default: false
    },
    requiredStatusChecks: {
      strict: {
        type: Boolean,
        default: true
      },
      contexts: {
        type: [String],
        default: ['ci/tests', 'ci/build']
      }
    },
    enforceAdmins: {
      type: Boolean,
      default: false
    },
    restrictReviewDismissals: {
      type: Boolean,
      default: false
    },
    blockCreations: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Index for efficient queries
BranchProtectionRuleSchema.index({ projectId: 1, branchPattern: 1 });
BranchProtectionRuleSchema.index({ projectId: 1, isActive: 1 });

// Update the updatedAt field before saving
BranchProtectionRuleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IBranchProtectionRule>('BranchProtectionRule', BranchProtectionRuleSchema);