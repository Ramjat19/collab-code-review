import express, { Response } from 'express';
import authMiddleware, { AuthRequest } from '../middleware/auth';
import PullRequest from '../models/PullRequest';
import Project from '../models/Project';
import { NotificationService } from '../services/NotificationService';

const router = express.Router();

// Create a new pull request
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { 
      title, 
      description, 
      sourceBranch, 
      targetBranch, 
      projectId, 
      assignees,
      files 
    } = req.body;

    // Check if user has access to this repository
    const repository = await Project.findById(projectId);
    if (!repository) {
      res.status(404).json({ message: "Repository not found" });
      return;
    }

    if (!repository.collaborators.includes(req.user.id)) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    const pullRequest = new PullRequest({
      title,
      description,
      author: req.user.id,
      repository: projectId,
      sourceBranch,
      targetBranch,
      files: files || [],
      assignedReviewers: assignees || [],
      status: "open"
    });

    await pullRequest.save();
    
    await pullRequest.populate([
      { path: "author", select: "username email" },
      { path: "repository", select: "name description" },
      { path: "assignedReviewers", select: "username email" }
    ]);

    res.status(201).json(pullRequest);
  } catch (err) {
    res.status(500).json({ message: "Error creating pull request", error: err });
  }
});

// Get pull requests for a repository/project
router.get('/repository/:projectId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { status, search, assignedTo, page = 1, limit = 10, simple } = req.query;

    // Check access to repository
    const repository = await Project.findById(projectId);
    if (!repository) {
      res.status(404).json({ message: "Repository not found" });
      return;
    }
    
    if (!repository.collaborators.includes(req.user.id)) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    const filter: any = { repository: projectId };
    
    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Search filter (title and description)
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Assigned to filter
    if (assignedTo) {
      if (assignedTo === 'me') {
        filter.assignedReviewers = req.user.id;
      } else if (assignedTo === 'unassigned') {
        filter.$or = [
          { assignedReviewers: { $exists: false } },
          { assignedReviewers: { $size: 0 } }
        ];
      }
    }

    // Pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalCount = await PullRequest.countDocuments(filter);
    
    const pullRequests = await PullRequest.find(filter)
      .populate("author", "username email")
      .populate("repository", "name description")
      .populate("assignedReviewers", "username email")
      .select('-files.oldContent -files.newContent -comments.text') // Exclude large content but keep arrays for counts
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // If simple mode is requested (backwards compatibility), return just the array
    if (simple === 'true') {
      const simplePullRequests = await PullRequest.find(filter)
        .populate("author", "username email")
        .populate("repository", "name description")
        .populate("assignedReviewers", "username email")
        .select('-files.oldContent -files.newContent -comments.text') // Exclude large content but keep arrays for counts
        .sort({ createdAt: -1 })
        .limit(50); // Reasonable limit for simple mode
      
      res.json(simplePullRequests);
      return;
    }

    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      pullRequests,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit: limitNum
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching pull requests", error: err });
  }
});

// Get single PR with full details
router.get("/:id", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log(`GET PR request for ID: ${req.params.id}, User ID: ${req.user.id}`);
    
    const pullRequest = await PullRequest.findById(req.params.id)
      .populate("author", "username email")
      .populate("repository", "name description")
      .populate("assignedReviewers", "username email")
      .populate("comments.author", "username email")
      .populate("reviewDecisions.reviewer", "username email");

    console.log(`Pull request found:`, !!pullRequest);

    if (!pullRequest) {
      console.log("Pull request not found in database");
      res.status(404).json({ message: "Pull request not found" });
      return;
    }

    // Check access to repository
    const repository = await Project.findById(pullRequest.repository);
    console.log(`Repository found:`, !!repository);
    console.log(`User ID: ${req.user.id}, Owner ID: ${repository?.owner}, Is collaborator:`, repository?.collaborators.includes(req.user.id));
    
    const hasAccess = repository && (
      repository.owner.toString() === req.user.id || 
      repository.collaborators.includes(req.user.id)
    );
    
    if (!hasAccess) {
      console.log("Access denied to repository");
      res.status(403).json({ message: "Access denied" });
      return;
    }

    console.log("Sending pull request data");
    res.json(pullRequest);
  } catch (err) {
    console.error("Error in GET PR route:", err);
    res.status(500).json({ message: "Error fetching pull request", error: err });
  }
});

// Add comment to PR
router.post("/:id/comments", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content, filePath, lineNumber } = req.body;
    const pullRequest = await PullRequest.findById(req.params.id);

    if (!pullRequest) {
      res.status(404).json({ message: "Pull request not found" });
      return;
    }

    // Check access to repository
    const repository = await Project.findById(pullRequest.repository);
    if (!repository || !repository.collaborators.includes(req.user.id)) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    const comment = {
      author: req.user.id,
      text: content,
      filePath,
      lineNumber,
      createdAt: new Date()
    };

    pullRequest.comments.push(comment);
    await pullRequest.save();

    await pullRequest.populate("comments.author", "username email");

    // Create notifications for other participants (excluding comment author)
    const participantsToNotify = new Set([
      pullRequest.author.toString(),
      ...pullRequest.assignedReviewers.map(r => r.toString())
    ]);
    
    // Remove comment author from notification list
    participantsToNotify.delete(req.user.id);

    // Send notifications to participants
    for (const userId of participantsToNotify) {
      try {
        await NotificationService.notifyCommentAdded(
          userId,
          req.params.id!,
          req.user.id,
          pullRequest.title
        );
      } catch (notifError) {
        console.error('Error sending comment notification:', notifError);
      }
    }

    // Emit real-time comment to Socket.IO room
    const socketService = req.app.get('socketService');
    if (socketService) {
      socketService.broadcastToRoom(req.params.id, 'comment-added', {
        comment: {
          ...comment,
          author: {
            id: req.user.id,
            username: req.user.username,
            email: req.user.email
          }
        },
        lineNumber,
        filePath,
        pullRequestId: req.params.id
      });
    }

    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ message: "Error adding comment", error: err });
  }
});

// Submit review decision
router.post("/:id/review", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { decision, comment } = req.body;
    const pullRequest = await PullRequest.findById(req.params.id);

    if (!pullRequest) {
      res.status(404).json({ message: "Pull request not found" });
      return;
    }

    // Check if user is assigned reviewer or has access
    const repository = await Project.findById(pullRequest.repository);
    if (!repository || !repository.collaborators.includes(req.user.id)) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    // Remove existing review decision from this reviewer
    pullRequest.reviewDecisions = pullRequest.reviewDecisions.filter(
      review => review.reviewer.toString() !== req.user.id
    );

    // Add new review decision
    pullRequest.reviewDecisions.push({
      reviewer: req.user.id,
      decision,
      comment,
      createdAt: new Date()
    });

    await pullRequest.save();
    
    await pullRequest.populate([
      { path: "reviewDecisions.reviewer", select: "username email" },
      { path: "assignedReviewers", select: "username email" }
    ]);

    res.json(pullRequest);
  } catch (err) {
    res.status(500).json({ message: "Error submitting review", error: err });
  }
});

// Update PR status (merge, close, etc.)
router.patch("/:id/status", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const pullRequest = await PullRequest.findById(req.params.id);

    if (!pullRequest) {
      res.status(404).json({ message: "Pull request not found" });
      return;
    }

    // Check if user is owner or has permission
    const repository = await Project.findById(pullRequest.repository);
    if (!repository) {
      res.status(404).json({ message: "Repository not found" });
      return;
    }
    
    const isOwner = repository.owner.toString() === req.user.id;
    const isAuthor = pullRequest.author.toString() === req.user.id;
    
    if (!isOwner && !isAuthor) {
      res.status(403).json({ message: "Only repository owner or PR author can change status" });
      return;
    }

    pullRequest.status = status;

    await pullRequest.save();
    res.json(pullRequest);
  } catch (err) {
    res.status(500).json({ message: "Error updating PR status", error: err });
  }
});

// Get assigned pull requests
router.get("/assigned", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pullRequests = await PullRequest.find({ 
      assignedReviewers: req.user.id,
      status: { $in: ['open', 'reviewing'] }
    })
      .populate("author", "username email")
      .populate("repository", "name description")
      .sort({ createdAt: -1 });

    res.json(pullRequests);
  } catch (err) {
    res.status(500).json({ message: "Error fetching assigned PRs", error: err });
  }
});

// Assign reviewers to a pull request
router.post("/:id/assign-reviewers", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reviewerIds } = req.body;

    if (!reviewerIds || !Array.isArray(reviewerIds)) {
      res.status(400).json({ message: "reviewerIds must be an array" });
      return;
    }

    const pullRequest = await PullRequest.findById(id).populate("repository");
    if (!pullRequest) {
      res.status(404).json({ message: "Pull request not found" });
      return;
    }

    // Check if user has permission to assign reviewers (project owner/collaborator)
    const project = await Project.findById(pullRequest.repository);
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    if (project.owner.toString() !== req.user.id && !project.collaborators.includes(req.user.id)) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    // Update assigned reviewers
    pullRequest.assignedReviewers = reviewerIds;
    await pullRequest.save();

    // Send notifications to assigned reviewers
    for (const reviewerId of reviewerIds) {
      if (reviewerId !== req.user.id) { // Don't notify the person who assigned
        try {
          await NotificationService.notifyReviewerAssigned(
            reviewerId,
            (pullRequest as any)._id.toString(),
            req.user.id,
            pullRequest.title
          );
        } catch (notifError) {
          console.error('Error sending notification to reviewer:', notifError);
          // Don't fail the whole request if notification fails
        }
      }
    }

    // Populate and return updated PR
    await pullRequest.populate("assignedReviewers", "username email");
    
    res.json({
      message: "Reviewers assigned successfully",
      pullRequest
    });
  } catch (err) {
    res.status(500).json({ message: "Error assigning reviewers", error: err });
  }
});

// Remove reviewer from a pull request
router.delete("/:id/reviewers/:reviewerId", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, reviewerId } = req.params;

    const pullRequest = await PullRequest.findById(id).populate("repository");
    if (!pullRequest) {
      res.status(404).json({ message: "Pull request not found" });
      return;
    }

    // Check permissions
    const project = await Project.findById(pullRequest.repository);
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    if (project.owner.toString() !== req.user.id && !project.collaborators.includes(req.user.id)) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    // Remove reviewer
    pullRequest.assignedReviewers = pullRequest.assignedReviewers.filter(
      reviewer => reviewer.toString() !== reviewerId
    );
    await pullRequest.save();

    await pullRequest.populate("assignedReviewers", "username email");
    
    res.json({
      message: "Reviewer removed successfully",
      pullRequest
    });
  } catch (err) {
    res.status(500).json({ message: "Error removing reviewer", error: err });
  }
});

export default router;