import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { pullRequestAPI } from '../api';
import DiffViewer from '../components/DiffViewer';
import InlineComment from '../components/InlineComment';
import ReviewerAssignment from '../components/ReviewerAssignment';
import { useSocket } from '../hooks/useSocket';
import type { PullRequest, Comment } from '../types';

const PullRequestDetail: React.FC = () => {
  const { projectId, prId } = useParams<{ projectId: string; prId: string }>();
  const [pullRequest, setPullRequest] = useState<PullRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'conversation' | 'files' | 'commits'>('conversation');
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [selectedLine, setSelectedLine] = useState<{ lineNumber: number; filePath: string } | null>(null);
  const { 
    joinPRRoom, 
    leavePRRoom, 
    onCommentAdded, 
    onUserJoined, 
    onUserLeft, 
    roomParticipants,
    isConnected 
  } = useSocket();

  const fetchPullRequest = useCallback(async () => {
    try {
        setLoading(true);
      const response = await pullRequestAPI.getById(prId!);
      setPullRequest(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch pull request');
    } finally {
      setLoading(false);
    }
  }, [prId]);

  useEffect(() => {
    if (prId) {
      fetchPullRequest();
    }
  }, [prId, fetchPullRequest]);

  // Socket.IO room management
  useEffect(() => {
    if (prId && projectId && isConnected) {
      // Join the PR room for real-time updates
      joinPRRoom(prId, projectId);

      // Set up comment listeners
      onCommentAdded((data: any) => {
        // Add new comment to local state
        setPullRequest(prev => prev ? {
          ...prev,
          comments: [...prev.comments, data.comment]
        } : null);
      });

      onUserJoined((data: any) => {
        console.log(`${data.username} joined the PR room`);
      });

      onUserLeft((data: any) => {
        console.log(`${data.username} left the PR room`);
      });

      // Cleanup: leave room when component unmounts
      return () => {
        leavePRRoom(prId);
      };
    }
  }, [prId, projectId, isConnected, joinPRRoom, leavePRRoom, onCommentAdded, onUserJoined, onUserLeft]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !pullRequest) return;

    try {
      setSubmittingComment(true);
      const commentData = {
        content: newComment,
        ...(selectedLine && {
          filePath: selectedLine.filePath,
          lineNumber: selectedLine.lineNumber,
        }),
      };

      await pullRequestAPI.addComment(pullRequest._id, commentData);
      setNewComment('');
      setSelectedLine(null);
      await fetchPullRequest(); // Refresh to get new comment
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSubmitReview = async (decision: 'approved' | 'changes_requested' | 'commented') => {
    if (!pullRequest) return;

    try {
      await pullRequestAPI.submitReview(pullRequest._id, { decision });
      await fetchPullRequest(); // Refresh to get updated review status
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit review');
    }
  };

  const handleLineClick = (lineNumber: number, filePath: string) => {
    console.log('Line clicked!', { lineNumber, filePath });
    setSelectedLine({ lineNumber, filePath });
    setActiveTab('conversation');
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const groupCommentsByLine = () => {
    if (!pullRequest) return {};
    
    return pullRequest.comments.reduce((acc, comment) => {
      if (comment.filePath && comment.lineNumber) {
        const key = `${comment.filePath}:${comment.lineNumber}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(comment);
      }
      return acc;
    }, {} as Record<string, Comment[]>);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-600">Loading pull request...</div>
        <div className="text-xs text-gray-400 mt-2">PR ID: {prId}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
        <div className="text-xs text-gray-600 mt-2">
          Attempted to fetch PR: {prId}
          <br />
          Project: {projectId}
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Debug: Show if we have the parameters
  if (!prId || !projectId) {
    return (
      <div className="text-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="text-yellow-800">Invalid URL parameters</div>
        <div className="text-xs text-yellow-600 mt-2">
          PR ID: {prId || 'missing'}, Project ID: {projectId || 'missing'}
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Expected URL format: /projects/[projectId]/pull-requests/[prId]
        </div>
      </div>
    );
  }

  if (!pullRequest) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Pull request not found</div>
        <div className="text-xs text-gray-400 mt-2">
          PR ID: {prId}, Project: {projectId}
        </div>
        <button 
          onClick={() => fetchPullRequest()} 
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const lineComments = groupCommentsByLine();
  const generalComments = (pullRequest.comments || []).filter(c => c && (!c.filePath || !c.lineNumber));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{pullRequest.title}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(pullRequest.status)}`}>
                {pullRequest.status.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>#{pullRequest._id.slice(-6)}</span>
              <span>opened by <strong>{pullRequest.author.username}</strong></span>
              <span>on {formatDate(pullRequest.createdAt)}</span>
              {/* Real-time participants indicator */}
              {isConnected && roomParticipants.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{roomParticipants.length} viewing</span>
                  <div className="flex -space-x-1">
                    {roomParticipants.filter(p => p && p.username).slice(0, 3).map((participant) => (
                      <div
                        key={participant.userId}
                        className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white border-2 border-white"
                        title={participant.username || 'Unknown'}
                      >
                        {participant.username?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    ))}
                    {roomParticipants.length > 3 && (
                      <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-xs text-white border-2 border-white">
                        +{roomParticipants.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {pullRequest.sourceBranch} → {pullRequest.targetBranch}
              </span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={() => handleSubmitReview('approved')}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              Approve
            </button>
            <button
              onClick={() => handleSubmitReview('changes_requested')}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm"
            >
              Request Changes
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700">{pullRequest.description}</p>
        </div>
        
        {/* Reviewer Assignment */}
        <div className="mt-4">
          <ReviewerAssignment
            pullRequest={pullRequest}
            onUpdate={(updatedPR) => setPullRequest(updatedPR)}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('conversation')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'conversation'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Conversation ({pullRequest.comments.length})
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'files'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Files Changed ({pullRequest.files.length})
          </button>
          <button
            onClick={() => setActiveTab('commits')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'commits'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Commits
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'conversation' && (
          <div className="space-y-6">
            {/* Selected Line Info */}
            {selectedLine && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="text-sm text-blue-800">
                  Commenting on line {selectedLine.lineNumber} in <code>{selectedLine.filePath}</code>
                  <button
                    onClick={() => setSelectedLine(null)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Comment Form */}
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={selectedLine ? `Add a comment for line ${selectedLine.lineNumber}...` : 'Add a comment...'}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none"
                rows={3}
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newComment.trim() || submittingComment}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {submittingComment ? 'Adding...' : 'Comment'}
                </button>
              </div>
            </form>

            {/* Comments */}
            <div className="space-y-4">
              {generalComments.filter(comment => comment && comment._id).map((comment) => (
                <div key={comment._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-600">
                      {comment.author?.username?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-gray-900">{comment.author?.username || 'Unknown'}</span>
                        <span className="text-sm text-gray-500">{formatDate(comment.createdAt)}</span>
                      </div>
                      <div className="text-gray-700">{comment.text}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Review Decisions */}
            {pullRequest.reviewDecisions.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Reviews</h3>
                {(pullRequest.reviewDecisions || []).filter(review => review && review.reviewer).map((review, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-600">
                        {review.reviewer?.username?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-gray-900">{review.reviewer?.username || 'Unknown'}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            review.decision === 'approved' ? 'bg-green-100 text-green-800' :
                            review.decision === 'changes_requested' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {review.decision.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">{formatDate(review.createdAt)}</span>
                        </div>
                        {review.comment && (
                          <div className="text-gray-700">{review.comment}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-6">
            {pullRequest.files.map((file, index) => {
              const fileLineComments = Object.entries(lineComments)
                .filter(([key]) => key.startsWith(file.path + ':'))
                .reduce((acc, [key, comments]) => {
                  const lineNumber = parseInt(key.split(':')[1]);
                  acc.push(...comments.map(c => ({ ...c, lineNumber })));
                  return acc;
                }, [] as Array<Comment & { lineNumber: number }>);

              return (
                <DiffViewer
                  key={index}
                  fileChange={file}
                  pullRequestId={prId}
                  onLineClick={handleLineClick}
                  comments={fileLineComments}
                  onCommentAdded={(comment: Comment) => {
                    // Update local state when comment is added
                    setPullRequest(prev => prev ? {
                      ...prev,
                      comments: [...prev.comments, comment]
                    } : null);
                  }}
                />
              );
            })}
          </div>
        )}

        {activeTab === 'commits' && (
          <div className="text-center py-8">
            <div className="text-gray-500">Commits view - Coming soon</div>
            <div className="text-sm text-gray-400 mt-2">
              This will show the git commit history for this PR
            </div>
          </div>
        )}
      </div>

      {/* Inline Comment Modal */}
      {selectedLine && (
        <InlineComment
          isVisible={true}
          onClose={() => setSelectedLine(null)}
          onSubmit={(comment: string) => {
            console.log('Rendering InlineComment modal for:', selectedLine);
            if (!pullRequest) return;
            
            const commentData = {
              content: comment,
              filePath: selectedLine.filePath,
              lineNumber: selectedLine.lineNumber,
            };

            pullRequestAPI.addComment(pullRequest._id, commentData)
              .then(() => {
                setSelectedLine(null);
                fetchPullRequest(); // Refresh to get new comment
              })
              .catch((err: any) => {
                setError(err.response?.data?.message || 'Failed to add comment');
              });
          }}
          lineNumber={selectedLine.lineNumber}
          filePath={selectedLine.filePath}
          existingComments={pullRequest?.comments.filter(c => 
            c.filePath === selectedLine.filePath && c.lineNumber === selectedLine.lineNumber
          ).map(c => ({
            _id: c._id,
            author: { username: c.author.username, email: c.author.email },
            text: c.text,
            createdAt: c.createdAt
          })) || []}
          isSubmitting={submittingComment}
        />
      )}
    </div>
  );
};

export default PullRequestDetail;