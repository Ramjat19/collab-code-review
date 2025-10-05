import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
// Import common language syntaxes
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import type { FileChange } from '../types';
import InlineComment from './InlineComment';
import { useSocket } from '../hooks/useSocket';

interface DiffViewerProps {
  fileChange: FileChange;
  pullRequestId?: string;
  onLineClick?: (lineNumber: number, filePath: string) => void;
  comments?: Array<{
    _id: string;
    lineNumber: number;
    text: string;
    author: { username: string; email: string };
    createdAt: string;
    filePath?: string;
  }>;
  onCommentAdded?: (comment: any) => void;
}

interface LineData {
  number: number;
  content: string;
  type: 'added' | 'removed' | 'unchanged' | 'context';
  oldLineNumber?: number;
  newLineNumber?: number;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ 
  fileChange, 
  pullRequestId,
  onLineClick, 
  comments = [],
  onCommentAdded
}) => {
  console.log('DiffViewer rendering for file:', fileChange.path, 'onLineClick provided:', !!onLineClick);
  const [activeCommentLine, setActiveCommentLine] = useState<number | null>(null);
  const [commentPosition, setCommentPosition] = useState<{ x: number; y: number } | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const { sendComment, onCommentAdded: onSocketCommentAdded } = useSocket();

  useEffect(() => {
    Prism.highlightAll();
  }, [fileChange]);

  useEffect(() => {
    if (pullRequestId) {
      onSocketCommentAdded((data: any) => {
        if (data.filePath === fileChange.path && onCommentAdded) {
          onCommentAdded(data.comment);
        }
      });
    }
  }, [pullRequestId, fileChange.path, onCommentAdded, onSocketCommentAdded]);

  const handleLineClick = (lineNumber: number, event: React.MouseEvent) => {
    console.log('DiffViewer: Line clicked!', { lineNumber, filePath: fileChange.path, hasOnLineClick: !!onLineClick });
    if (onLineClick) {
      // If parent component handles line clicks, delegate to it
      onLineClick(lineNumber, fileChange.path);
    } else {
      // Otherwise, handle locally
      const rect = event.currentTarget.getBoundingClientRect();
      setCommentPosition({
        x: rect.right + 10,
        y: rect.top
      });
      setActiveCommentLine(lineNumber);
    }
  };

  const handleCommentSubmit = async (commentText: string) => {
    if (!pullRequestId || !activeCommentLine) return;
    
    setIsSubmittingComment(true);
    try {
      // Send comment via HTTP API
      const response = await fetch(`http://localhost:4000/api/pull-requests/${pullRequestId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: commentText,
          filePath: fileChange.path,
          lineNumber: activeCommentLine
        })
      });

      if (response.ok) {
        const newComment = await response.json();
        
        // Also send via Socket.IO for real-time updates
        if (sendComment) {
          sendComment(pullRequestId, newComment, activeCommentLine, fileChange.path);
        }

        // Close comment modal
        setActiveCommentLine(null);
        setCommentPosition(null);
        
        if (onCommentAdded) {
          onCommentAdded(newComment);
        }
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCloseComment = () => {
    setActiveCommentLine(null);
    setCommentPosition(null);
  };

  const getLanguageFromExtension = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'java': 'java',
      'cs': 'csharp',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'html': 'markup',
      'xml': 'markup',
    };
    return languageMap[ext || ''] || 'text';
  };

  const generateDiffLines = (): LineData[] => {
    const { oldContent, newContent, changeType } = fileChange;
    
    if (changeType === 'added' && newContent) {
      return newContent.split('\n').map((line, index) => ({
        number: index + 1,
        content: line,
        type: 'added' as const,
        newLineNumber: index + 1,
      }));
    }
    
    if (changeType === 'deleted' && oldContent) {
      return oldContent.split('\n').map((line, index) => ({
        number: index + 1,
        content: line,
        type: 'removed' as const,
        oldLineNumber: index + 1,
      }));
    }
    
    if (changeType === 'modified' && oldContent && newContent) {
      // Simple line-by-line diff (can be enhanced with a proper diff algorithm)
      const oldLines = oldContent.split('\n');
      const newLines = newContent.split('\n');
      const diffLines: LineData[] = [];
      
      const maxLines = Math.max(oldLines.length, newLines.length);
      
      for (let i = 0; i < maxLines; i++) {
        const oldLine = oldLines[i];
        const newLine = newLines[i];
        
        if (oldLine !== undefined && newLine !== undefined) {
          if (oldLine === newLine) {
            diffLines.push({
              number: diffLines.length + 1,
              content: oldLine,
              type: 'unchanged',
              oldLineNumber: i + 1,
              newLineNumber: i + 1,
            });
          } else {
            // Line modified
            if (oldLine) {
              diffLines.push({
                number: diffLines.length + 1,
                content: oldLine,
                type: 'removed',
                oldLineNumber: i + 1,
              });
            }
            if (newLine) {
              diffLines.push({
                number: diffLines.length + 1,
                content: newLine,
                type: 'added',
                newLineNumber: i + 1,
              });
            }
          }
        } else if (oldLine !== undefined) {
          diffLines.push({
            number: diffLines.length + 1,
            content: oldLine,
            type: 'removed',
            oldLineNumber: i + 1,
          });
        } else if (newLine !== undefined) {
          diffLines.push({
            number: diffLines.length + 1,
            content: newLine,
            type: 'added',
            newLineNumber: i + 1,
          });
        }
      }
      
      return diffLines;
    }
    
    return [];
  };

  const diffLines = generateDiffLines();
  const language = getLanguageFromExtension(fileChange.path);

  const getLineStyle = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-50 border-l-4 border-green-500 text-green-900';
      case 'removed':
        return 'bg-red-50 border-l-4 border-red-500 text-red-900';
      case 'unchanged':
        return 'bg-gray-50 hover:bg-gray-100';
      default:
        return 'hover:bg-gray-100';
    }
  };

  const getLinePrefix = (type: string) => {
    switch (type) {
      case 'added':
        return '+';
      case 'removed':
        return '-';
      default:
        return ' ';
    }
  };

  const getCommentsForLine = (lineNumber: number) => {
    return comments.filter(c => c.lineNumber === lineNumber);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* File Header */}
      <div className="bg-gray-100 px-4 py-2 border-b">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-medium">{fileChange.path}</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            fileChange.changeType === 'added' ? 'bg-green-100 text-green-800' :
            fileChange.changeType === 'deleted' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {fileChange.changeType.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Diff Content */}
      <div className="overflow-x-auto">
        <div style={{ backgroundColor: '#1f2937', color: '#f3f4f6', padding: '0', margin: '0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace' }}>
            <tbody>
            {diffLines.map((line, index) => {
              console.log('Rendering line:', index, { old: line.oldLineNumber, new: line.newLineNumber, type: line.type, content: line.content.substring(0, 30) });
              const lineComments = getCommentsForLine(line.newLineNumber || line.oldLineNumber || 0);
              
              // DEBUG: Log if line numbers exist but aren't showing
              if ((line.oldLineNumber || line.newLineNumber) && index < 3) {
                console.log('LINE NUMBERS SHOULD BE VISIBLE:', { old: line.oldLineNumber, new: line.newLineNumber });
              }
              
              return (
                <React.Fragment key={index}>
                  <tr style={{ borderBottom: '1px solid #374151' }}>
                    {/* Line Numbers - SUPER VISIBLE */}
                    <td 
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('LINE NUMBER CLICKED!', line.newLineNumber || line.oldLineNumber);
                        handleLineClick(line.newLineNumber || line.oldLineNumber || 0, e);
                      }}
                      style={{ 
                        width: '80px',
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #dee2e6',
                        textAlign: 'center',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#6c757d',
                        padding: '4px',
                        verticalAlign: 'top'
                      }}
                      title="Click to add comment"
                    >
                      <div style={{ color: '#dc3545' }}>{line.oldLineNumber || ''}</div>
                      <div style={{ color: '#28a745' }}>{line.newLineNumber || ''}</div>
                    </td>
                    
                    {/* Diff Prefix */}
                    <td style={{
                      width: '30px',
                      backgroundColor: line.type === 'added' ? '#065f46' : line.type === 'removed' ? '#991b1b' : '#374151',
                      textAlign: 'center',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      padding: '4px',
                      verticalAlign: 'top'
                    }}>
                      <span style={{ 
                        color: line.type === 'added' ? '#10b981' : line.type === 'removed' ? '#ef4444' : '#9ca3af',
                      }}>
                        {getLinePrefix(line.type)}
                      </span>
                    </td>
                    
                    {/* Code Content */}
                    <td 
                      onClick={(e) => {
                        console.log('CODE CONTENT CLICKED!', line.newLineNumber || line.oldLineNumber);
                        handleLineClick(line.newLineNumber || line.oldLineNumber || 0, e);
                      }}
                      style={{
                        padding: '4px 8px',
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        backgroundColor: line.type === 'added' ? '#065f46' : line.type === 'removed' ? '#991b1b' : '#1f2937',
                        color: line.type === 'added' ? '#d1fae5' : line.type === 'removed' ? '#fecaca' : '#f3f4f6',
                        cursor: 'pointer',
                        whiteSpace: 'pre',
                        verticalAlign: 'top'
                      }}
                    >
                      {line.content}
                    </td>
                  </tr>
                  
                  {/* Comments for this line */}
                  {lineComments.map((comment, commentIndex) => (
                    <tr key={`comment-${commentIndex}`}>
                      <td colSpan={3} style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '8px', border: '1px solid #3b82f6' }}>
                        <div style={{ fontWeight: 'bold' }}>{comment.author.username}</div>
                        <div style={{ marginTop: '4px' }}>{comment.text}</div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
            </tbody>
          </table>
        </div>
      </div>

            {/* Inline Comment Modal - only show if parent component doesn't handle line clicks */}
      {!onLineClick && activeCommentLine !== null && commentPosition && (
        <div
          style={{
            position: 'fixed',
            left: commentPosition.x,
            top: commentPosition.y,
            zIndex: 1000
          }}
        >
          <InlineComment
            isVisible={true}
            onClose={handleCloseComment}
            onSubmit={handleCommentSubmit}
            lineNumber={activeCommentLine}
            filePath={fileChange.path}
            existingComments={comments.filter(c => c.lineNumber === activeCommentLine)}
            isSubmitting={isSubmittingComment}
          />
        </div>
      )}
    </div>
  );
};

export default DiffViewer;