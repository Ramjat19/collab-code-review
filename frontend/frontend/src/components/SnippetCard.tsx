import { useState } from "react";
import type { Snippet, Comment } from "../types/models";
import CommentModal from "./CommentModal";

interface Props {
  snippet: Snippet;
  onSnippetUpdate: (updatedSnippet: Snippet) => void;
}

export default function SnippetCard({ snippet, onSnippetUpdate }: Props) {
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

  const handleCommentAdded = (newComment: Comment) => {
    const updatedSnippet = {
      ...snippet,
      comments: [...snippet.comments, newComment]
    };
    onSnippetUpdate(updatedSnippet);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getLanguageClass = (code: string) => {
    if (code.includes('#include') || code.includes('cout') || code.includes('int main')) return 'cpp';
    if (code.includes('function') || code.includes('const ') || code.includes('=>')) return 'javascript';
    if (code.includes('def ') || code.includes('import ') || code.includes('print(')) return 'python';
    return 'text';
  };

  return (
    <>
      <div className="border border-gray-200 rounded-lg mb-6 bg-white shadow-sm hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="border-b border-gray-100 p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg text-gray-800">{snippet.title}</h3>
              <p className="text-sm text-gray-600 mt-1">
                By <span className="font-medium">{snippet.author.username}</span> • {formatDate(snippet.createdAt)}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                {getLanguageClass(snippet.code).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Code Block */}
        <div className="p-4">
          <div className="bg-gray-50 border rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-3 py-2 text-xs text-gray-600 border-b">
              Code
            </div>
            <pre className="p-4 text-sm overflow-x-auto">
              <code>{snippet.code}</code>
            </pre>
          </div>
        </div>

        {/* Comments Section */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h4 className="font-medium text-gray-700">
                💬 {snippet.comments.length} Comment{snippet.comments.length !== 1 ? 's' : ''}
              </h4>
              {snippet.comments.length > 0 && (
                <span className="text-sm text-gray-500">
                  Latest: {snippet.comments.length > 0 ? formatDate(snippet.comments[snippet.comments.length - 1].createdAt) : ''}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsCommentModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors flex items-center space-x-1"
            >
              <span>{snippet.comments.length > 0 ? 'View & Comment' : '+ Add Comment'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comment Modal */}
      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        snippetId={snippet._id}
        comments={snippet.comments}
        onCommentAdded={handleCommentAdded}
      />
    </>
  );
}