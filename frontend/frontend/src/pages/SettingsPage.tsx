import React from 'react';
import { useParams } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import BranchProtectionSettings from '../components/BranchProtectionSettings';

interface SettingsPageProps {
  onBack?: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const { projectId } = useParams();
  
  // Try to extract project ID from URL path or use default
  const actualProjectId = projectId || 'default';
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
          
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">Repository Settings</h1>
              <p className="text-gray-600">Configure branch protection rules and policies</p>
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="space-y-6">
          <BranchProtectionSettings
            projectId={actualProjectId}
            onRulesUpdate={(rules) => {
              console.log('Rules updated:', rules);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;