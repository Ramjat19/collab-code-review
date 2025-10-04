import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { pullRequestAPI } from '../api';
import type { PullRequest } from '../types';

const PullRequestList: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    if (projectId) {
      fetchPullRequests();
    }
  }, [projectId, statusFilter]);

  const fetchPullRequests = async () => {
    try {
      setLoading(true);
      const response = await pullRequestAPI.getByProject(projectId!, statusFilter || undefined);
      setPullRequests(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch pull requests');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'merged':
        return 'bg-purple-100 text-purple-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-600">Loading pull requests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pull Requests</h1>
        <Link
          to={`/projects/${projectId}/pull-requests/new`}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          New Pull Request
        </Link>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="reviewing">Reviewing</option>
          <option value="approved">Approved</option>
          <option value="merged">Merged</option>
          <option value="closed">Closed</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Pull Requests List */}
      {pullRequests.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500 text-lg mb-2">No pull requests found</div>
          <div className="text-gray-400 text-sm">
            {statusFilter ? `No pull requests with status "${statusFilter}"` : 'Create your first pull request to get started'}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {pullRequests.map((pr) => (
            <div
              key={pr._id}
              className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* PR Title and Status */}
                  <div className="flex items-center space-x-3 mb-2">
                    <Link
                      to={`/projects/${projectId}/pull-requests/${pr._id}`}
                      className="text-lg font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {pr.title}
                    </Link>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pr.status)}`}>
                      {pr.status.toUpperCase()}
                    </span>
                  </div>

                  {/* PR Description */}
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {pr.description}
                  </p>

                  {/* PR Meta Information */}
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <span>#{pr._id.slice(-6)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>opened by</span>
                      <span className="font-medium text-gray-700">{pr.author.username}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>on {formatDate(pr.createdAt)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>{pr.sourceBranch}</span>
                      <span>→</span>
                      <span>{pr.targetBranch}</span>
                    </div>
                  </div>

                  {/* Additional Stats */}
                  <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                    <span>{pr.files.length} file{pr.files.length !== 1 ? 's' : ''} changed</span>
                    <span>{pr.comments.length} comment{pr.comments.length !== 1 ? 's' : ''}</span>
                    {pr.assignedReviewers.length > 0 && (
                      <span>{pr.assignedReviewers.length} reviewer{pr.assignedReviewers.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>

                {/* Assigned Reviewers */}
                {pr.assignedReviewers.length > 0 && (
                  <div className="ml-4">
                    <div className="text-xs text-gray-500 mb-1">Reviewers</div>
                    <div className="flex -space-x-1">
                      {pr.assignedReviewers.slice(0, 3).map((reviewer) => (
                        <div
                          key={reviewer._id}
                          className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600"
                          title={reviewer.username}
                        >
                          {reviewer.username.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {pr.assignedReviewers.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500">
                          +{pr.assignedReviewers.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PullRequestList;