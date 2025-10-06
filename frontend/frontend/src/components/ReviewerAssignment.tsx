import React, { useState, useEffect } from 'react';
import { Users, X, Plus } from 'lucide-react';
import { pullRequestAPI, userAPI } from '../api';
import type { User, PullRequest } from '../types';

interface ReviewerAssignmentProps {
  pullRequest: PullRequest;
  onUpdate: (updatedPR: PullRequest) => void;
}

const ReviewerAssignment: React.FC<ReviewerAssignmentProps> = ({ pullRequest, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>(
    pullRequest.assignedReviewers.map(r => r._id)
  );
  const [loading, setLoading] = useState(false);

  // Fetch available users (project collaborators)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // First try to get users by project (collaborators + owner)
        const response = await userAPI.getByProject(pullRequest.repository._id);
        setAvailableUsers(response.data.data);
      } catch (error) {
        console.error('Error fetching project users:', error);
        // Fallback to all users if project users fetch fails
        try {
          const allUsersResponse = await userAPI.getAll();
          setAvailableUsers(allUsersResponse.data.data);
        } catch (fallbackError) {
          console.error('Error fetching all users:', fallbackError);
          setAvailableUsers([]);
        }
      }
    };

    if (isEditing) {
      fetchUsers();
    }
  }, [isEditing, pullRequest.repository._id]);

  // Save reviewer assignments
  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await pullRequestAPI.assignReviewers(pullRequest._id, selectedReviewers);
      onUpdate(response.data.pullRequest);
      setIsEditing(false);
    } catch (error) {
      console.error('Error assigning reviewers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Remove reviewer
  const handleRemoveReviewer = async (reviewerId: string) => {
    try {
      const response = await pullRequestAPI.removeReviewer(pullRequest._id, reviewerId);
      onUpdate(response.data.pullRequest);
    } catch (error) {
      console.error('Error removing reviewer:', error);
    }
  };

  // Toggle reviewer selection
  const toggleReviewer = (userId: string) => {
    setSelectedReviewers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  if (isEditing) {
    return (
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assign Reviewers
          </h3>
          <button
            onClick={() => setIsEditing(false)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Available Users */}
        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
          {availableUsers.map(user => (
            <label key={user._id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={selectedReviewers.includes(user._id)}
                onChange={() => toggleReviewer(user._id)}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{user.username}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
              </div>
            </label>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Reviewers ({pullRequest.assignedReviewers.length})
        </h3>
        <button
          onClick={() => setIsEditing(true)}
          className="p-1 text-gray-400 hover:text-blue-600"
          title="Edit reviewers"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Current Reviewers */}
      {pullRequest.assignedReviewers.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No reviewers assigned</p>
      ) : (
        <div className="space-y-2">
          {pullRequest.assignedReviewers.map(reviewer => (
            <div key={reviewer._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium">
                  {reviewer.username?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{reviewer.username || 'Unknown'}</div>
                  <div className="text-xs text-gray-500">{reviewer.email || 'Unknown'}</div>
                </div>
              </div>
              <button
                onClick={() => handleRemoveReviewer(reviewer._id)}
                className="p-1 text-gray-400 hover:text-red-600"
                title="Remove reviewer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewerAssignment;