import express from 'express';
import auth, { AuthRequest } from '../middleware/auth';
import { NotificationService } from '../services/NotificationService';

const router = express.Router();

// Get user notifications
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const result = await NotificationService.getUserNotifications(req.user.id, page, limit);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// Mark notification as read
router.patch('/:id/read', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId || !id) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }
    const success = await NotificationService.markAsRead(id, userId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
router.patch('/read-all', auth, async (req: AuthRequest, res) => {
  try {
    const count = await NotificationService.markAllAsRead(req.user.id);
    
    res.json({
      success: true,
      message: `${count} notifications marked as read`
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read'
    });
  }
});

// Delete notification
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId || !id) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }
    const success = await NotificationService.deleteNotification(id, userId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Notification deleted'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

export default router;