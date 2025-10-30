import React, { useState, useEffect } from 'react';
import { Shield, Save, RefreshCw, Settings, GitBranch, Users, CheckCircle, XCircle } from 'lucide-react';
import { pullRequestAPI } from '../api';

interface BranchProtectionRules {
  requirePullRequest: boolean;
  requireReviews: boolean;
  requiredReviewers: number;
  dismissStaleReviews: boolean;
  requireCodeOwnerReviews: boolean;
  restrictPushes: boolean;
  allowForcePushes: boolean;
  allowDeletions: boolean;
  requiredStatusChecks: {
    strict: boolean;
    contexts: string[];
  };
  enforceAdmins: boolean;
  restrictReviewDismissals: boolean;
  blockCreations: boolean;
}

interface BranchProtectionConfig {
  id: string;
  projectId: string;
  rules: BranchProtectionRules;
  createdAt: Date;
  updatedAt: Date;
}

interface BranchProtectionSettingsProps {
  projectId?: string;
  onRulesUpdate?: (rules: BranchProtectionRules) => void;
}

const BranchProtectionSettings: React.FC<BranchProtectionSettingsProps> = ({
  projectId = 'default',
  onRulesUpdate
}) => {
  const [config, setConfig] = useState<BranchProtectionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchRules();
  }, [projectId]);

  const fetchRules = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await pullRequestAPI.getBranchProtectionRules(projectId);
      setConfig(response.data.data);
    } catch (err) {
      console.error('Failed to fetch branch protection rules:', err);
      setError('Failed to load branch protection rules');
    } finally {
      setLoading(false);
    }
  };

  const saveRules = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      // Send the proper data structure to the backend
      const updateData = {
        projectId: config.projectId,
        rules: config.rules,
        branchPattern: 'main'
      };
      
      const response = await pullRequestAPI.updateBranchProtectionRules(updateData);
      setConfig(response.data.data);
      setSuccess('Branch protection rules updated successfully!');
      
      if (onRulesUpdate) {
        onRulesUpdate(config.rules);
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to save branch protection rules:', err);
      setError('Failed to save branch protection rules');
    } finally {
      setSaving(false);
    }
  };

  const updateRule = (key: keyof BranchProtectionRules, value: any) => {
    if (!config) return;

    setConfig({
      ...config,
      rules: {
        ...config.rules,
        [key]: value
      },
      updatedAt: new Date()
    });
  };

  const updateStatusCheck = (field: 'strict' | 'contexts', value: any) => {
    if (!config) return;

    setConfig({
      ...config,
      rules: {
        ...config.rules,
        requiredStatusChecks: {
          ...config.rules.requiredStatusChecks,
          [field]: value
        }
      },
      updatedAt: new Date()
    });
  };

  const addStatusCheckContext = () => {
    const newContext = prompt('Enter status check context (e.g., ci/tests):');
    if (newContext && config) {
      const contexts = [...config.rules.requiredStatusChecks.contexts, newContext];
      updateStatusCheck('contexts', contexts);
    }
  };

  const removeStatusCheckContext = (index: number) => {
    if (!config) return;
    const contexts = config.rules.requiredStatusChecks.contexts.filter((_, i) => i !== index);
    updateStatusCheck('contexts', contexts);
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg border">
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold">Branch Protection Settings</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading settings...</span>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6 bg-white rounded-lg border">
        <div className="text-center py-8">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">Failed to load branch protection settings</p>
          <button
            onClick={fetchRules}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold">Branch Protection Settings</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={fetchRules}
            className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={saveRules}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded flex items-center">
          <XCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          {success}
        </div>
      )}

      {/* Settings Form */}
      <div className="space-y-6">
        {/* Pull Request Requirements */}
        <section>
          <h3 className="flex items-center text-lg font-medium mb-4">
            <GitBranch className="w-5 h-5 mr-2 text-gray-600" />
            Pull Request Requirements
          </h3>
          <div className="space-y-3 ml-7">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.rules.requirePullRequest}
                onChange={(e) => updateRule('requirePullRequest', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Require pull request reviews before merging</span>
            </label>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.rules.restrictPushes}
                onChange={(e) => updateRule('restrictPushes', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Restrict pushes that create files</span>
            </label>
          </div>
        </section>

        {/* Review Requirements */}
        <section>
          <h3 className="flex items-center text-lg font-medium mb-4">
            <Users className="w-5 h-5 mr-2 text-gray-600" />
            Review Requirements
          </h3>
          <div className="space-y-3 ml-7">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.rules.requireReviews}
                onChange={(e) => updateRule('requireReviews', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Require pull request reviews before merging</span>
            </label>
            
            <div className="flex items-center space-x-3">
              <span>Required number of reviewers:</span>
              <input
                type="number"
                min="1"
                max="10"
                value={config.rules.requiredReviewers}
                onChange={(e) => updateRule('requiredReviewers', parseInt(e.target.value))}
                className="w-20 px-3 py-1 border border-gray-300 rounded"
              />
            </div>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.rules.dismissStaleReviews}
                onChange={(e) => updateRule('dismissStaleReviews', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Dismiss stale reviews when new commits are pushed</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.rules.requireCodeOwnerReviews}
                onChange={(e) => updateRule('requireCodeOwnerReviews', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Require review from code owners specifically</span>
            </label>
          </div>
        </section>

        {/* Status Checks */}
        <section>
          <h3 className="flex items-center text-lg font-medium mb-4">
            <Settings className="w-5 h-5 mr-2 text-gray-600" />
            Status Checks
          </h3>
          <div className="space-y-3 ml-7">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.rules.requiredStatusChecks.strict}
                onChange={(e) => updateStatusCheck('strict', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Require branches to be up to date before merging</span>
            </label>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Required status check contexts:</span>
                <button
                  onClick={addStatusCheckContext}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Context
                </button>
              </div>
              <div className="space-y-2">
                {config.rules.requiredStatusChecks.contexts.map((context, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                    <code className="text-sm flex-1">{context}</code>
                    <button
                      onClick={() => removeStatusCheckContext(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {config.rules.requiredStatusChecks.contexts.length === 0 && (
                  <p className="text-sm text-gray-500 p-2 bg-gray-50 rounded">No status check contexts configured</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Advanced Settings */}
        <section>
          <h3 className="flex items-center text-lg font-medium mb-4">
            <Shield className="w-5 h-5 mr-2 text-gray-600" />
            Advanced Settings
          </h3>
          <div className="space-y-3 ml-7">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.rules.enforceAdmins}
                onChange={(e) => updateRule('enforceAdmins', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Include administrators</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.rules.allowForcePushes}
                onChange={(e) => updateRule('allowForcePushes', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Allow force pushes</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.rules.allowDeletions}
                onChange={(e) => updateRule('allowDeletions', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Allow deletions</span>
            </label>
          </div>
        </section>
      </div>

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-600">
        <p>Last updated: {new Date(config.updatedAt).toLocaleString()}</p>
        <p>Project ID: {config.projectId}</p>
      </div>
    </div>
  );
};

export default BranchProtectionSettings;