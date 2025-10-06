import express from 'express';
import auth, { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Project from '../models/Project';

const router = express.Router();

// Get all users (for reviewer assignment)
router.get('/all', auth, async (req: AuthRequest, res) => {
  try {
    const users = await User.find({}, 'username email')
      .limit(50) // Limit to prevent too many results
      .sort({ username: 1 });
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get users by project (collaborators + owner)
router.get('/project/:projectId', auth, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    
    // Get project to find owner and collaborators
    const project = await Project.findById(projectId).populate('owner collaborators', 'username email');
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Combine owner and collaborators
    const users = [];
    if (project.owner) {
      users.push(project.owner);
    }
    if (project.collaborators) {
      users.push(...project.collaborators);
    }

    // Remove duplicates based on _id
    const uniqueUsers = users.filter((user, index, self) => 
      index === self.findIndex(u => u._id.toString() === user._id.toString())
    );

    res.json({
      success: true,
      data: uniqueUsers
    });
  } catch (error) {
    console.error('Error fetching project users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project users'
    });
  }
});

export default router;