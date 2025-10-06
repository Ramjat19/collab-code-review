import Notification, { INotification } from '../models/Notification';
import { Types } from 'mongoose';

export class NotificationService {
  
  // Create a new notification
  static async createNotification(data: {
    recipient: Types.ObjectId;
    sender: Types.ObjectId;
    type: INotification['type'];
    title: string;
    message: string;
    relatedPR?: Types.ObjectId;
    relatedProject?: Types.ObjectId;
  }): Promise<INotification> {
    try {
      const notification = new Notification(data);
      await notification.save();
      
      // Populate sender info for real-time notification
      await notification.populate('sender', 'username email');
      await notification.populate('relatedPR', 'title');
      
      // Send real-time notification via Socket.IO
      const io = (global as any).io;
      if (io) {
        io.to(`user_${data.recipient.toString()}`).emit('notification', {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          sender: notification.sender,
          relatedPR: notification.relatedPR,
          isRead: notification.isRead,
          createdAt: notification.createdAt
        });
      }
      
      console.log(`Notification created and sent to user ${data.recipient}`);
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
  
  // Get notifications for a user
  static async getUserNotifications(userId: string, page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const notifications = await Notification.find({ recipient: userId })
        .populate('sender', 'username email')
        .populate('relatedPR', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
        
      const totalCount = await Notification.countDocuments({ recipient: userId });
      const unreadCount = await Notification.countDocuments({ 
        recipient: userId, 
        isRead: false 
      });
      
      return {
        notifications,
        totalCount,
        unreadCount,
        hasMore: skip + notifications.length < totalCount
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }
  
  // Mark notification as read
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await Notification.updateOne(
        { _id: notificationId, recipient: userId },
        { isRead: true }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }
  
  // Mark all notifications as read for a user
  static async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true }
      );
      return result.modifiedCount;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
  
  // Delete notification
  static async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await Notification.deleteOne({
        _id: notificationId,
        recipient: userId
      });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
  
  // Helper methods for specific notification types
  static async notifyReviewerAssigned(reviewerId: string, pullRequestId: string, assignedById: string, prTitle: string) {
    return this.createNotification({
      recipient: new Types.ObjectId(reviewerId),
      sender: new Types.ObjectId(assignedById),
      type: 'reviewer_assigned',
      title: 'You have been assigned as a reviewer',
      message: `You have been assigned to review "${prTitle}"`,
      relatedPR: new Types.ObjectId(pullRequestId)
    });
  }
  
  static async notifyPRUpdated(reviewerId: string, pullRequestId: string, updatedById: string, prTitle: string) {
    return this.createNotification({
      recipient: new Types.ObjectId(reviewerId),
      sender: new Types.ObjectId(updatedById),
      type: 'pr_updated',
      title: 'Pull request updated',
      message: `"${prTitle}" has been updated`,
      relatedPR: new Types.ObjectId(pullRequestId)
    });
  }
  
  static async notifyCommentAdded(userId: string, pullRequestId: string, commentAuthorId: string, prTitle: string) {
    return this.createNotification({
      recipient: new Types.ObjectId(userId),
      sender: new Types.ObjectId(commentAuthorId),
      type: 'comment_added',
      title: 'New comment on pull request',
      message: `New comment added to "${prTitle}"`,
      relatedPR: new Types.ObjectId(pullRequestId)
    });
  }
}