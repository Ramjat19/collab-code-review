export interface User {
  _id: string;
  username: string;
  email: string;
}

export interface Project {
  _id: string;
  name: string;
  description: string;
  repository?: string;
  owner: string;
  collaborators: string[];
  isPrivate: boolean;
  createdAt: string;
}

export interface Snippet {
  _id: string;
  title: string;
  description: string;
  code: string;
  language: string;
  projectId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  text: string;
  author: User;
  snippetId?: string;
  pullRequestId?: string;
  filePath?: string;
  lineNumber?: number;
  parentId?: string; // For threaded comments
  createdAt: string;
  updatedAt: string;
}

// Pull Request related types
export interface FileChange {
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

export interface ReviewDecision {
  reviewer: User;
  decision: 'approved' | 'changes_requested' | 'commented';
  comment?: string;
  createdAt: string;
}

export interface PullRequest {
  _id: string;
  title: string;
  description: string;
  status: 'open' | 'reviewing' | 'approved' | 'rejected' | 'merged' | 'closed' | 'draft';
  sourceBranch: string;
  targetBranch: string;
  repository: Project;
  author: User;
  assignedReviewers: User[];
  files: FileChange[];
  comments: Comment[];
  reviewDecisions: ReviewDecision[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePullRequestData {
  title: string;
  description: string;
  projectId: string;
  sourceBranch: string;
  targetBranch: string;
  assignees?: string[];
  files: FileChange[];
}

// Notification types
export interface Notification {
  _id: string;
  recipient: string;
  sender: User;
  type: 'reviewer_assigned' | 'pr_updated' | 'comment_added' | 'pr_approved' | 'pr_rejected';
  title: string;
  message: string;
  relatedPR?: PullRequest;
  relatedProject?: Project;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  totalCount: number;
  unreadCount: number;
  hasMore: boolean;
}

export interface Notification {
  _id: string;
  recipient: string;
  sender: User;
  type: 'reviewer_assigned' | 'pr_updated' | 'comment_added' | 'pr_approved' | 'pr_rejected';
  title: string;
  message: string;
  relatedPR?: PullRequest;
  relatedProject?: Project;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  totalCount: number;
  unreadCount: number;
  hasMore: boolean;
}