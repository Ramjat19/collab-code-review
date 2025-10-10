import { Router } from "express";
import authMiddleware, { AuthRequest } from "../middleware/auth";
import Project from "../models/Project";
import User from "../models/User";
import mongoose from "mongoose";

const router = Router();

// Create project
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;
    const project = new Project({
      name,
      description,
      owner: req.user.id,
      collaborators: [req.user.id], // owner is also collaborator
    });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: "Error creating project", error: err });
  }
});

// Add collaborator by email
router.post("/:id/collaborators", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Only owner can add collaborators
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only owner can add collaborators" });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent duplicates
    if (project.collaborators.includes(user._id as mongoose.Types.ObjectId)) {
      return res.status(400).json({ message: "User already a collaborator" });
    }

    project.collaborators.push(user._id as mongoose.Types.ObjectId);
    await project.save();
    res.json({ message: "Collaborator added", project });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
});

// Remove collaborator by user ID
router.delete("/:id/collaborators/:userId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only owner can remove collaborators" });
    }

    project.collaborators = project.collaborators.filter(
      (id) => id.toString() !== req.params.userId
    );
    await project.save();
    res.json({ message: "Collaborator removed", project });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
});


// Get all projects of logged-in user
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const projects = await Project.find({ collaborators: req.user.id })
    .populate("owner", "username email")
    .populate("collaborators", "username email");

    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: "Error fetching projects", error: err });
  }
});

// Get project by ID
router.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const project = await Project.findById(req.params.id)
    .populate("owner", "username email")
    .populate("collaborators", "username email");
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: "Error fetching project", error: err });
  }
});

export default router;
