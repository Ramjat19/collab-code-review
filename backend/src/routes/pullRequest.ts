import express, { Response } from 'express';
import authMiddleware, { AuthRequest } from '../middleware/auth';
import PullRequest from '../models/PullRequest';
import Project from '../models/Project';

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
    const { status } = req.query;

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

    let filter: any = { repository: projectId };
    if (status) {
      filter.status = status;
    }

    const pullRequests = await PullRequest.find(filter)
      .populate("author", "username email")
      .populate("repository", "name description")
      .populate("assignedReviewers", "username email")
      .sort({ createdAt: -1 });

    res.json(pullRequests);
  } catch (err) {
    res.status(500).json({ message: "Error fetching pull requests", error: err });
  }
});

// Get single PR with full details
router.get("/:id", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pullRequest = await PullRequest.findById(req.params.id)
      .populate("author", "username email")
      .populate("repository", "name description")
      .populate("assignedReviewers", "username email")
      .populate("comments.author", "username email")
      .populate("reviewDecisions.reviewer", "username email");

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

    res.json(pullRequest);
  } catch (err) {
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

export default router;