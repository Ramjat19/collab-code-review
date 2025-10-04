import { Router } from "express";
import authMiddleware, { AuthRequest } from "../middleware/auth";
import Snippet from "../models/Snippet";
import Project from "../models/Project";

const router = Router();

// Create snippet for a project
router.post("/:projectId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, code } = req.body;
    const { projectId } = req.params;
    
    // Check if user has access to this project
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });
    
    if (!project.collaborators.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const snippet = new Snippet({
      title,
      code,
      project: projectId,
      author: req.user.id,
      comments: []
    });
    
    await snippet.save();
    await snippet.populate("author", "username email");
    
    res.status(201).json(snippet);
  } catch (err) {
    res.status(500).json({ message: "Error creating snippet", error: err });
  }
});

// Get all snippets for a project
router.get("/:projectId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    
    // Check if user has access to this project
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });
    
    if (!project.collaborators.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const snippets = await Snippet.find({ project: projectId })
      .populate("author", "username email")
      .populate("comments.user", "username email")
      .sort({ createdAt: -1 });
    
    res.json(snippets);
  } catch (err) {
    res.status(500).json({ message: "Error fetching snippets", error: err });
  }
});

// Add comment to snippet
router.post("/comment/:snippetId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { text } = req.body;
    const { snippetId } = req.params;
    
    const snippet = await Snippet.findById(snippetId).populate("project");
    if (!snippet) return res.status(404).json({ message: "Snippet not found" });
    
    // Check if user has access to this project
    const project = await Project.findById(snippet.project);
    if (!project || !project.collaborators.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    snippet.comments.push({
      text,
      user: req.user.id,
      createdAt: new Date()
    });
    
    await snippet.save();
    await snippet.populate("comments.user", "username email");
    
    res.json(snippet);
  } catch (err) {
    res.status(500).json({ message: "Error adding comment", error: err });
  }
});

export default router;