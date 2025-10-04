import React, { useEffect } from 'react';
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

interface DiffViewerProps {
  fileChange: FileChange;
  onLineClick?: (lineNumber: number, filePath: string) => void;
  comments?: Array<{
    lineNumber: number;
    text: string;
    author: { username: string };
  }>;
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
  onLineClick, 
  comments = [] 
}) => {
  useEffect(() => {
    Prism.highlightAll();
  }, [fileChange]);

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
        <pre className="text-sm">
          <code className={`language-${language}`}>
            {diffLines.map((line, index) => {
              const lineComments = getCommentsForLine(line.newLineNumber || line.oldLineNumber || 0);
              
              return (
                <div key={index}>
                  <div
                    className={`flex items-start cursor-pointer ${getLineStyle(line.type)} transition-colors`}
                    onClick={() => onLineClick && onLineClick(line.newLineNumber || line.oldLineNumber || 0, fileChange.path)}
                  >
                    {/* Line Numbers */}
                    <div className="flex-shrink-0 w-20 px-2 py-1 text-gray-500 text-xs text-right border-r">
                      <span className="block">{line.oldLineNumber || ''}</span>
                      <span className="block">{line.newLineNumber || ''}</span>
                    </div>
                    
                    {/* Diff Prefix */}
                    <div className="flex-shrink-0 w-6 px-1 py-1 text-xs text-center">
                      {getLinePrefix(line.type)}
                    </div>
                    
                    {/* Code Content */}
                    <div className="flex-1 px-2 py-1 overflow-x-auto">
                      <span>{line.content}</span>
                    </div>
                  </div>
                  
                  {/* Comments for this line */}
                  {lineComments.map((comment, commentIndex) => (
                    <div key={commentIndex} className="bg-blue-50 border-l-4 border-blue-500 ml-20 px-3 py-2 text-sm">
                      <div className="font-medium text-blue-900">{comment.author.username}</div>
                      <div className="text-blue-800 mt-1">{comment.text}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default DiffViewer;