import { Router } from "express";
import authMiddleware, { AuthRequest } from "../middleware/auth";
import Project from "../models/Project";

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

// Get all projects of logged-in user
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const projects = await Project.find({ collaborators: req.user.id });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: "Error fetching projects", error: err });
  }
});

// Get project by ID
router.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: "Error fetching project", error: err });
  }
});

export default router;
