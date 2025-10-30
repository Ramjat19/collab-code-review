import express from 'express';
import { 
  getBranchProtectionStatus, 
  validatePRRequirements,
  checkBypassPermission,
  isProtectedBranch 
} from '../middleware/branchProtection';
import authMiddleware from '../middleware/auth';
import PullRequestModel from '../models/PullRequest';
import BranchProtectionRule from '../models/BranchProtectionRule';

const router = express.Router();

/**
 * GET /api/pull-requests/:id/protection-status
 * Get branch protection status for a pull request
 */
router.get('/pull-requests/:id/protection-status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const pr = await PullRequestModel.findById(id)
      .populate('author')
      .populate('assignedReviewers')
      .populate('reviewDecisions.reviewer');

    if (!pr) {
      return res.status(404).json({ error: 'Pull request not found' });
    }

    const isProtected = isProtectedBranch(pr.targetBranch);
    
    if (!isProtected) {
      return res.json({
        protected: false,
        canMerge: true,
        message: 'Target branch is not protected'
      });
    }

    // Get the project ID from the PR's repository or use 'default'
    const projectId = pr.repository?.toString() || 'default';
    const status = await getBranchProtectionStatus(pr, undefined, projectId);
    
    res.json({
      protected: true,
      ...status,
      targetBranch: pr.targetBranch,
      sourceBranch: pr.sourceBranch
    });

  } catch (error) {
    console.error('Branch protection status error:', error);
    res.status(500).json({ error: 'Failed to get branch protection status' });
  }
});

/**
 * POST /api/branch-protection/merge/:id
 * Merge a pull request (with branch protection validation)
 */
router.post('/merge/:id', authMiddleware, validatePRRequirements, async (req, res) => {
  try {
    const { id } = req.params;
    const { mergeMethod = 'merge' } = req.body; // merge, squash, rebase
    
    const pr = await PullRequestModel.findById(id);
    
    if (!pr) {
      return res.status(404).json({ error: 'Pull request not found' });
    }

    if (pr.status !== 'approved') {
      return res.status(400).json({ 
        error: 'Pull request must be approved before merging' 
      });
    }

    // Update PR status to merged
    pr.status = 'merged';
    await pr.save();

    // Log the merge action
    const branchProtectionStatus = (req as any).branchProtectionStatus;
    console.log(`PR ${id} merged by user ${(req as any).user.id}`, {
      method: mergeMethod,
      branchProtection: branchProtectionStatus,
      sourceBranch: pr.sourceBranch,
      targetBranch: pr.targetBranch
    });

    res.json({
      message: 'Pull request merged successfully',
      pullRequest: pr,
      mergeMethod,
      mergedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('PR merge error:', error);
    res.status(500).json({ error: 'Failed to merge pull request' });
  }
});

/**
 * POST /api/branch-protection/force-merge/:id
 * Force merge a pull request (bypass protection - admin only)
 */
router.post('/force-merge/:id', authMiddleware, checkBypassPermission, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, mergeMethod = 'merge' } = req.body;
    
    const pr = await PullRequestModel.findById(id);
    
    if (!pr) {
      return res.status(404).json({ error: 'Pull request not found' });
    }

    // Update PR status to merged
    pr.status = 'merged';
    await pr.save();

    // Log the force merge with reason
    console.log(`FORCE MERGE: PR ${id} force-merged by user ${(req as any).user.id}`, {
      reason,
      method: mergeMethod,
      sourceBranch: pr.sourceBranch,
      targetBranch: pr.targetBranch,
      bypassedProtection: true
    });

    res.json({
      message: 'Pull request force-merged successfully',
      pullRequest: pr,
      mergeMethod,
      reason,
      mergedAt: new Date().toISOString(),
      bypassedProtection: true
    });

  } catch (error) {
    console.error('PR force merge error:', error);
    res.status(500).json({ error: 'Failed to force merge pull request' });
  }
});

/**
 * GET /api/branch-protection/config
 * Get branch protection configuration
 */
router.get('/branch-protection/config', authMiddleware, (req, res) => {
  // In production, this would come from database or config file
  const config = {
    protectedBranches: ['main', 'master', 'develop', 'production'],
    rules: {
      requiredApprovals: 2,
      requireUpToDate: true,
      requireConversationResolution: true,
      requiredStatusChecks: ['ci', 'tests', 'security'],
      allowForcePush: false,
      allowDeletions: false
    },
    exemptions: {
      adminCanBypass: false, // Set to true in production if needed
      emergencyBypassEnabled: false
    }
  };

  res.json(config);
});

/**
 * POST /api/branch-protection/request-review/:id
 * Request additional reviews for a pull request
 */
router.post('/request-review/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewerIds } = req.body;

    const pr = await PullRequestModel.findById(id);
    
    if (!pr) {
      return res.status(404).json({ error: 'Pull request not found' });
    }

    // Add reviewers to the PR
    const newReviewers = reviewerIds.filter((reviewerId: string) => 
      !pr.assignedReviewers.some(reviewer => reviewer.toString() === reviewerId)
    );
    
    pr.assignedReviewers.push(...newReviewers);
    await pr.save();

    // In a real implementation, you would send notifications to reviewers
    console.log(`Additional reviewers requested for PR ${id}:`, newReviewers);

    res.json({
      message: 'Review requests sent successfully',
      addedReviewers: newReviewers.length,
      totalReviewers: pr.assignedReviewers.length
    });

  } catch (error) {
    console.error('Request review error:', error);
    res.status(500).json({ error: 'Failed to request reviews' });
  }
});

// GET /api/branch-protection/rules - Get branch protection rules
router.get('/rules', async (req, res) => {
  try {
    const { projectId } = req.query;
    const pid = projectId || 'global';
    
    // Find existing rules for the project
    let rules = await BranchProtectionRule.findOne({ 
      projectId: pid, 
      isActive: true 
    });
    
    // If no rules exist, create default ones
    if (!rules) {
      rules = new BranchProtectionRule({
        projectId: pid,
        branchPattern: 'main',
        rules: {
          requirePullRequest: true,
          requireReviews: true,
          requiredReviewers: 2,
          dismissStaleReviews: true,
          requireCodeOwnerReviews: false,
          restrictPushes: true,
          allowForcePushes: false,
          allowDeletions: false,
          requiredStatusChecks: {
            strict: true,
            contexts: ['ci/tests', 'ci/build']
          },
          enforceAdmins: false,
          restrictReviewDismissals: false,
          blockCreations: false
        }
      });
      
      await rules.save();
      console.log('Created default branch protection rules for project:', pid);
    }

    res.json({ success: true, data: rules });
  } catch (error) {
    console.error('Get rules error:', error);
    res.status(500).json({ error: 'Failed to get branch protection rules' });
  }
});

// PUT /api/branch-protection/rules - Update branch protection rules
router.put('/rules', async (req, res) => {
  try {
    const { projectId, rules: ruleUpdates, branchPattern } = req.body;
    
    // Validate input
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    if (!ruleUpdates) {
      return res.status(400).json({ error: 'Rules data is required' });
    }

    // Find existing rules for the project
    let existingRules = await BranchProtectionRule.findOne({ 
      projectId, 
      isActive: true 
    });

    if (existingRules) {
      // Update existing rules
      existingRules.rules = { ...existingRules.rules, ...ruleUpdates };
      if (branchPattern) {
        existingRules.branchPattern = branchPattern;
      }
      existingRules.updatedAt = new Date();
      
      await existingRules.save();
      console.log('Updated branch protection rules for project:', projectId);
    } else {
      // Create new rules if they don't exist
      existingRules = new BranchProtectionRule({
        projectId,
        branchPattern: branchPattern || 'main',
        rules: ruleUpdates
      });
      
      await existingRules.save();
      console.log('Created new branch protection rules for project:', projectId);
    }

    res.json({ 
      success: true, 
      data: existingRules, 
      message: 'Rules updated successfully' 
    });
  } catch (error) {
    console.error('Update rules error:', error);
    res.status(500).json({ error: 'Failed to update branch protection rules' });
  }
});

// POST /api/branch-protection/rules - Create new branch protection rule
router.post('/rules', async (req, res) => {
  try {
    const { projectId, rules, branchPattern, createdBy } = req.body;
    
    if (!projectId || !rules) {
      return res.status(400).json({ error: 'Project ID and rules are required' });
    }

    // Check if rules already exist for this project
    const existingRule = await BranchProtectionRule.findOne({ 
      projectId, 
      branchPattern: branchPattern || 'main',
      isActive: true 
    });

    if (existingRule) {
      return res.status(409).json({ 
        error: 'Branch protection rule already exists for this project and branch pattern' 
      });
    }

    // Create new rule
    const newRule = new BranchProtectionRule({
      projectId,
      branchPattern: branchPattern || 'main',
      rules,
      createdBy
    });

    await newRule.save();
    console.log('New branch protection rule created:', newRule._id);
    
    res.status(201).json({ 
      success: true, 
      data: newRule, 
      message: 'Rule created successfully' 
    });
  } catch (error) {
    console.error('Create rule error:', error);
    res.status(500).json({ error: 'Failed to create branch protection rule' });
  }
});

// DELETE /api/branch-protection/rules/:id - Delete branch protection rule
router.delete('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Soft delete by setting isActive to false
    const rule = await BranchProtectionRule.findByIdAndUpdate(
      id,
      { 
        isActive: false,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!rule) {
      return res.status(404).json({ error: 'Branch protection rule not found' });
    }
    
    console.log('Branch protection rule deleted:', id);
    res.json({ success: true, message: 'Rule deleted successfully' });
  } catch (error) {
    console.error('Delete rule error:', error);
    res.status(500).json({ error: 'Failed to delete branch protection rule' });
  }
});

export default router;