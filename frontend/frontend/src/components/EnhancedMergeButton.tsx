import React, { useState } from 'react';
import { GitMerge, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { pullRequestAPI } from '../api';

interface EnhancedMergeButtonProps {
  pullRequestId: string;
  canMerge: boolean;
  isProtected: boolean;
  onMergeSuccess?: () => void;
  onMergeError?: (error: string) => void;
}

const EnhancedMergeButton: React.FC<EnhancedMergeButtonProps> = ({
  pullRequestId,
  canMerge,
  isProtected,
  onMergeSuccess,
  onMergeError
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showForceOptions, setShowForceOptions] = useState(false);
  const [forceReason, setForceReason] = useState('');
  const [mergeMethod, setMergeMethod] = useState<'merge' | 'squash' | 'rebase'>('merge');

  const handleMerge = async () => {
    try {
      setIsLoading(true);
      await pullRequestAPI.mergePR(pullRequestId, mergeMethod);
      
      if (onMergeSuccess) {
        onMergeSuccess();
      }
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to merge pull request';
      if (onMergeError) {
        onMergeError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceMerge = async () => {
    if (!forceReason.trim()) {
      if (onMergeError) {
        onMergeError('Reason is required for force merge');
      }
      return;
    }

    try {
      setIsLoading(true);
      await pullRequestAPI.forceMergePR(pullRequestId, forceReason, mergeMethod);
      
      if (onMergeSuccess) {
        onMergeSuccess();
      }
      setShowForceOptions(false);
      setForceReason('');
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to force merge pull request';
      if (onMergeError) {
        onMergeError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getMergeMethodDisplay = (method: string) => {
    switch (method) {
      case 'squash': return 'Squash and merge';
      case 'rebase': return 'Rebase and merge';
      default: return 'Create a merge commit';
    }
  };

  if (!isProtected) {
    // Simple merge button for unprotected branches
    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <select
            value={mergeMethod}
            onChange={(e) => setMergeMethod(e.target.value as 'merge' | 'squash' | 'rebase')}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="merge">Create a merge commit</option>
            <option value="squash">Squash and merge</option>
            <option value="rebase">Rebase and merge</option>
          </select>
        </div>
        
        <button
          onClick={handleMerge}
          disabled={isLoading}
          className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <GitMerge className="w-4 h-4" />
              <span>Merge Pull Request</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Merge Method Selection */}
      <div className="flex items-center space-x-2">
        <GitMerge className="w-4 h-4 text-gray-500" />
        <select
          value={mergeMethod}
          onChange={(e) => setMergeMethod(e.target.value as 'merge' | 'squash' | 'rebase')}
          className="text-sm border rounded px-2 py-1 flex-1"
          disabled={isLoading}
        >
          <option value="merge">Create a merge commit</option>
          <option value="squash">Squash and merge</option>
          <option value="rebase">Rebase and merge</option>
        </select>
      </div>

      {/* Protected Branch Indicator */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded">
        <Shield className="w-4 h-4 text-blue-500" />
        <span>This branch is protected by branch protection rules</span>
      </div>

      {canMerge ? (
        /* Can Merge - Show Normal Merge Button */
        <button
          onClick={handleMerge}
          disabled={isLoading}
          className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>{getMergeMethodDisplay(mergeMethod)}</span>
            </>
          )}
        </button>
      ) : (
        /* Cannot Merge - Show Blocked State with Force Option */
        <div className="space-y-3">
          <button
            disabled
            className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded-lg font-medium cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Merge blocked by branch protection</span>
          </button>

          {/* Force Merge Option (Admin only - you could add role checks) */}
          <div className="border-t pt-3">
            <button
              onClick={() => setShowForceOptions(!showForceOptions)}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              {showForceOptions ? 'Cancel' : 'Force merge (Admin)'}
            </button>

            {showForceOptions && (
              <div className="mt-3 p-3 border border-red-200 rounded bg-red-50">
                <div className="text-sm text-red-700 mb-2 font-medium">
                  ⚠️ Force merge will bypass branch protection rules
                </div>
                
                <textarea
                  value={forceReason}
                  onChange={(e) => setForceReason(e.target.value)}
                  placeholder="Required: Explain why you need to bypass protection rules..."
                  className="w-full text-sm border rounded px-2 py-1 mb-2 h-16 resize-none"
                  disabled={isLoading}
                />
                
                <div className="flex space-x-2">
                  <button
                    onClick={handleForceMerge}
                    disabled={isLoading || !forceReason.trim()}
                    className="flex-1 bg-red-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Processing...' : 'Force Merge'}
                  </button>
                  <button
                    onClick={() => {
                      setShowForceOptions(false);
                      setForceReason('');
                    }}
                    disabled={isLoading}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedMergeButton;