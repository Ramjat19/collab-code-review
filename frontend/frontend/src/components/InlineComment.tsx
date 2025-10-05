import React, { useState, useEffect } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';

interface InlineCommentProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => void;
  lineNumber: number;
  filePath?: string;
  existingComments?: Array<{
    _id: string;
    author: { username: string; email: string };
    text: string;
    createdAt: string;
  }>;
  isSubmitting?: boolean;
}

const InlineComment: React.FC<InlineCommentProps> = ({
  isVisible,
  onClose,
  onSubmit,
  lineNumber,
  filePath,
  existingComments = [],
  isSubmitting = false
}) => {
  const [comment, setComment] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setComment('');
      setIsTyping(false);
    }
  }, [isVisible]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim() && !isSubmitting) {
      onSubmit(comment);
      setComment('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      // Could emit typing events here
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!isVisible) return null;

  return (
    <div className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-96 max-w-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-700">
            Comment on line {lineNumber}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {filePath && (
        <div className="text-xs text-gray-500 mb-3 font-mono bg-gray-50 px-2 py-1 rounded">
          {filePath}
        </div>
      )}

      {/* Existing Comments */}
      {existingComments.length > 0 && (
        <div className="mb-4 space-y-3">
          <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Comments ({existingComments.length})
          </div>
          <div className="max-h-48 overflow-y-auto space-y-3">
            {existingComments.map((comment, index) => (
              <div key={comment._id || index} className="bg-gray-50 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {comment.author.username}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">
                  {comment.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comment Form */}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <textarea
            value={comment}
            onChange={handleInputChange}
            placeholder="Write a comment..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            disabled={isSubmitting}
            autoFocus
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Press Ctrl+Enter to submit
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!comment.trim() || isSubmitting}
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Send className="h-3 w-3" />
              <span>{isSubmitting ? 'Sending...' : 'Comment'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Keyboard shortcut hint */}
      <div className="mt-2 text-xs text-gray-400">
        <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl</kbd> +{' '}
        <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> to submit
      </div>
    </div>
  );
};

export default InlineComment;