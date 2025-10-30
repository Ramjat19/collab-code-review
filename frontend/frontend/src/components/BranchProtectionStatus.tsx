import React, { useState, useEffect, useCallback } from 'react';
import { Shield, CheckCircle, XCircle, AlertCircle, Clock, GitMerge, RefreshCw } from 'lucide-react';
import { pullRequestAPI } from '../api';

interface BranchProtectionStatus {
  protected: boolean;
  canMerge: boolean;
  targetBranch: string;
  sourceBranch: string;
  requirements: {
    approvals: {
      required: number;
      current: number;
      satisfied: boolean;
      reviewers: string[];
    };
    conversations: {
      unresolved: number;
      satisfied: boolean;
    };
    ciChecks: {
      required: string[];
      passing: string[];
      satisfied: boolean;
    };
    upToDate: {
      satisfied: boolean;
      behindBy?: number;
    };
  };
  violations: string[];
}

interface BranchProtectionStatusProps {
  pullRequestId: string;
  onStatusChange?: (canMerge: boolean, isProtected: boolean) => void;
}

const BranchProtectionStatusComponent: React.FC<BranchProtectionStatusProps> = ({ 
  pullRequestId, 
  onStatusChange 
}) => {
  const [status, setStatus] = useState<BranchProtectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProtectionStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await pullRequestAPI.getProtectionStatus(pullRequestId);
      console.log('Branch protection status response:', response.data);
      setStatus(response.data);
    } catch (err) {
      console.error('Failed to fetch branch protection status:', err);
      setError('Failed to load branch protection status');
    } finally {
      setLoading(false);
    }
  }, [pullRequestId]);

  useEffect(() => {
    fetchProtectionStatus();
  }, [fetchProtectionStatus]);

  useEffect(() => {
    if (status && onStatusChange) {
      onStatusChange(status.canMerge, status.protected);
    }
  }, [status, onStatusChange]);

  const handleRequestReviews = async () => {
    // This would open a modal to select additional reviewers
    // For now, just refresh the status
    await fetchProtectionStatus();
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-4 mb-4 animate-pulse">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-5 h-5 text-gray-400" />
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 rounded-lg p-4 mb-4 bg-red-50">
        <div className="flex items-center space-x-2 text-red-600">
          <XCircle className="w-5 h-5" />
          <span className="font-medium">Branch Protection Error</span>
        </div>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!status) return null;

  if (!status.protected) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
        <div className="flex items-center space-x-2 text-gray-600">
          <Shield className="w-5 h-5" />
          <span className="font-medium">No Branch Protection</span>
        </div>
        <p className="text-gray-600 text-sm mt-1">
          Target branch "{status.targetBranch}" is not protected
        </p>
      </div>
    );
  }

  const getStatusIcon = (satisfied: boolean) => {
    return satisfied ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getOverallStatus = () => {
    if (status.canMerge) {
      return {
        icon: <CheckCircle className="w-5 h-5 text-green-500" />,
        text: 'Ready to merge',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    } else {
      return {
        icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
        text: 'Merge blocked',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      };
    }
  };

  const overallStatus = getOverallStatus();

  return (
    <div className={`border rounded-lg p-4 mb-4 ${overallStatus.bgColor} ${overallStatus.borderColor}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-900">Branch Protection Rules</span>
          <button
            onClick={fetchProtectionStatus}
            disabled={loading}
            className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh protection status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className={`flex items-center space-x-2 ${overallStatus.color}`}>
          {overallStatus.icon}
          <span className="font-medium">{overallStatus.text}</span>
        </div>
      </div>

      {/* Branch Info */}
      <div className="flex items-center space-x-2 mb-4 text-sm text-gray-600">
        <GitMerge className="w-4 h-4" />
        <span>{status.sourceBranch} → {status.targetBranch}</span>
      </div>

      {/* Requirements */}
      <div className="space-y-3">
        {/* Approvals */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(status.requirements.approvals.satisfied)}
            <div>
              <span className="text-sm font-medium text-gray-900">Required Approvals</span>
              <div className="text-xs text-gray-500">
                {status.requirements.approvals.current} of {status.requirements.approvals.required} required
              </div>
              {status.requirements.approvals.reviewers.length > 0 && (
                <div className="text-xs text-gray-500">
                  Approved by: {status.requirements.approvals.reviewers.join(', ')}
                </div>
              )}
            </div>
          </div>
          {!status.requirements.approvals.satisfied && (
            <button
              onClick={handleRequestReviews}
              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
            >
              Request Reviews
            </button>
          )}
        </div>

        {/* CI Checks */}
        <div className="flex items-center space-x-3">
          {getStatusIcon(status.requirements.ciChecks.satisfied)}
          <div>
            <span className="text-sm font-medium text-gray-900">Status Checks</span>
            <div className="text-xs text-gray-500">
              {status.requirements.ciChecks.passing.length} of {status.requirements.ciChecks.required.length} checks passing
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {status.requirements.ciChecks.required.map(check => (
                <span
                  key={check}
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    status.requirements.ciChecks.passing.includes(check)
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {check}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Conversations */}
        <div className="flex items-center space-x-3">
          {getStatusIcon(status.requirements.conversations.satisfied)}
          <div>
            <span className="text-sm font-medium text-gray-900">Conversation Resolution</span>
            <div className="text-xs text-gray-500">
              {status.requirements.conversations.unresolved === 0
                ? 'All conversations resolved'
                : `${status.requirements.conversations.unresolved} unresolved conversations`
              }
            </div>
          </div>
        </div>

        {/* Up to Date */}
        <div className="flex items-center space-x-3">
          {getStatusIcon(status.requirements.upToDate.satisfied)}
          <div>
            <span className="text-sm font-medium text-gray-900">Branch Up to Date</span>
            <div className="text-xs text-gray-500">
              {status.requirements.upToDate.satisfied
                ? 'Branch is up to date'
                : `Branch is ${status.requirements.upToDate.behindBy || 'several'} commits behind`
              }
            </div>
          </div>
        </div>
      </div>

      {/* Violations */}
      {status.violations.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="text-sm font-medium text-red-700 mb-2">
            Merge Requirements Not Met:
          </div>
          <ul className="space-y-1">
            {status.violations.map((violation, index) => (
              <li key={index} className="text-sm text-red-600 flex items-center space-x-2">
                <XCircle className="w-3 h-3 flex-shrink-0" />
                <span>{violation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <button
          onClick={fetchProtectionStatus}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
        >
          <Clock className="w-3 h-3" />
          <span>Refresh status</span>
        </button>
      </div>
    </div>
  );
};

export default BranchProtectionStatusComponent;