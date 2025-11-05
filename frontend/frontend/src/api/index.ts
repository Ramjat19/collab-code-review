import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import type { PullRequest, CreatePullRequestData, Comment } from "../types";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_BASE_API}/api`,
  timeout: 10000, // 10 second timeout
  withCredentials: true, // Send cookies (refresh token) with requests
});

// Track CSRF token
let csrfToken: string | null = null;

// Fetch CSRF token on app initialization
export async function initializeCsrf(): Promise<void> {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_BASE_API}/api/csrf-token`,
      { withCredentials: true }
    );
    csrfToken = response.data.csrfToken;
    console.log('[CSRF] Token fetched successfully');
  } catch (error) {
    console.error('[CSRF] Failed to fetch token:', error);
  }
}

// Request interceptor: Add CSRF token to state-changing requests
API.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Add JWT token if available
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token to POST/PUT/PATCH/DELETE requests
    if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
      config.headers = config.headers || {};
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle CSRF token expiry/invalidation
API.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle CSRF token errors (403 with EBADCSRFTOKEN)
    if (error.response?.status === 403 && !originalRequest._retry) {
      const errorData = error.response.data as any;
      if (errorData?.error === 'Invalid CSRF token') {
        console.log('[CSRF] Token invalid, refetching...');
        originalRequest._retry = true;
        
        // Refetch CSRF token
        await initializeCsrf();
        
        // Retry original request with new token
        if (csrfToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers['X-CSRF-Token'] = csrfToken;
          return API(originalRequest);
        }
      }
    }

    // ... existing 401 refresh token logic
    return Promise.reject(error);
  }
);

// Track token expiry for proactive refresh
let tokenExpiryTime: number | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

// Helper to decode JWT and extract expiry (without verification - just for client-side timing)
function decodeTokenExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp ? payload.exp * 1000 : null; // Convert to ms
  } catch {
    return null;
  }
}

// Helper to schedule proactive refresh (1 minute before expiry)
function scheduleTokenRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  if (!tokenExpiryTime) return;

  const now = Date.now();
  const timeUntilExpiry = tokenExpiryTime - now;
  const refreshBufferMs = 60 * 1000; // Refresh 1 minute before expiry

  if (timeUntilExpiry > refreshBufferMs) {
    const timeUntilRefresh = timeUntilExpiry - refreshBufferMs;
    console.log(`[Auth] Scheduling proactive token refresh in ${Math.round(timeUntilRefresh / 1000)}s`);
    
    refreshTimer = setTimeout(async () => {
      console.log('[Auth] Proactively refreshing token...');
      try {
        await refreshAccessToken();
      } catch (err) {
        console.error('[Auth] Proactive refresh failed:', err);
      }
    }, timeUntilRefresh);
  }
}

// Helper to refresh access token using refresh token cookie
async function refreshAccessToken(): Promise<string> {
  try {
    // Use raw axios but manually include CSRF token to avoid interceptor loops
    const response = await axios.post(
      `${import.meta.env.VITE_BASE_API}/api/auth/refresh`,
      {},
      { 
        withCredentials: true,
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {}
      }
    );
    
    const { token, expiresIn } = response.data;
    if (token) {
      localStorage.setItem('token', token);
      
      // Calculate expiry time
      const expiryMs = decodeTokenExpiry(token);
      if (expiryMs) {
        tokenExpiryTime = expiryMs;
      } else if (expiresIn) {
        // Parse expiresIn (e.g., '15m', '1h', '24h') and calculate expiry
        const match = expiresIn.match(/^(\d+)([smhd])$/);
        if (match) {
          const value = parseInt(match[1], 10);
          const unit = match[2];
          const unitMs: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
          tokenExpiryTime = Date.now() + value * unitMs[unit];
        }
      }
      
      scheduleTokenRefresh();
      console.log('[Auth] Token refreshed successfully');
      return token;
    }
    throw new Error('No token in refresh response');
  } catch (err) {
    console.error('[Auth] Failed to refresh token:', err);
    throw err;
  }
}

// Export function to set token and schedule refresh (used after login/signup)
export function setAuthToken(token: string, expiresIn?: string) {
  localStorage.setItem('token', token);
  
  const expiryMs = decodeTokenExpiry(token);
  if (expiryMs) {
    tokenExpiryTime = expiryMs;
  } else if (expiresIn) {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2];
      const unitMs: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
      tokenExpiryTime = Date.now() + value * unitMs[unit];
    }
  }
  
  scheduleTokenRefresh();
}

// Export function to clear auth state (used on logout)
export function clearAuthToken() {
  localStorage.removeItem('token');
  tokenExpiryTime = null;
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

// Initialize token expiry tracking on load
const existingToken = localStorage.getItem('token');
if (existingToken) {
  const expiryMs = decodeTokenExpiry(existingToken);
  if (expiryMs && expiryMs > Date.now()) {
    tokenExpiryTime = expiryMs;
    scheduleTokenRefresh();
  }
}

// Add token automatically if available
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Enhanced error handling with 401 refresh + retry
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

API.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 with refresh token rotation
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Another request is already refreshing - queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return API.request(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return API.request(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Refresh failed - clear auth and redirect to login
        clearAuthToken();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle different types of errors
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout - please check your connection';
    } else if (error.response?.status === 401) {
      error.message = 'Session expired - please login again';
    } else if (error.response?.status === 403) {
      error.message = 'Access denied - insufficient permissions';
    } else if (error.response?.status === 404) {
      error.message = 'Resource not found';
    } else if (error.response && error.response.status >= 500) {
      error.message = 'Server error - please try again later';
    } else if (!error.response) {
      error.message = 'Network error - please check your connection';
    }
    
    return Promise.reject(error);
  }
);

// Pull Request API functions
export const pullRequestAPI = {
  // Get PRs for a project/repository (simple - for backwards compatibility)
  getByProject: (projectId: string, status?: string) => 
    API.get<PullRequest[]>(`/pull-requests/repository/${projectId}`, { 
      params: { status, simple: 'true' } 
    }),

  // Get PRs for a project/repository with search and pagination
  getByProjectWithPagination: (projectId: string, options?: {
    status?: string;
    search?: string;
    assignedTo?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = {
      status: options?.status,
      search: options?.search,
      assignedTo: options?.assignedTo,
      page: options?.page,
      limit: options?.limit
    };
    return API.get<{
      pullRequests: PullRequest[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalCount: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
        limit: number;
      }
    }>(`/pull-requests/repository/${projectId}`, { params });
  },
  
  // Get single PR with details
  getById: (id: string) => 
    API.get<PullRequest>(`/pull-requests/${id}`),
  
  // Create new PR
  create: (data: CreatePullRequestData) => 
    API.post<PullRequest>("/pull-requests", data),
  
  // Add comment to PR
  addComment: (id: string, comment: { content: string; filePath?: string; lineNumber?: number }) =>
    API.post<Comment>(`/pull-requests/${id}/comments`, comment),
  
  // Submit review
  submitReview: (id: string, review: { decision: string; comment?: string }) =>
    API.post<PullRequest>(`/pull-requests/${id}/review`, review),
  
  // Update PR status
  updateStatus: (id: string, status: string) =>
    API.patch<PullRequest>(`/pull-requests/${id}/status`, { status }),
  
  // Get assigned PRs
  getAssigned: () =>
    API.get<PullRequest[]>("/pull-requests/assigned"),
  
  // Assign reviewers
  assignReviewers: (id: string, reviewerIds: string[]) =>
    API.post<{ message: string; pullRequest: PullRequest }>(`/pull-requests/${id}/assign-reviewers`, { reviewerIds }),
  
  // Remove reviewer
  removeReviewer: (id: string, reviewerId: string) =>
    API.delete<{ message: string; pullRequest: PullRequest }>(`/pull-requests/${id}/reviewers/${reviewerId}`),
  
  // Branch Protection APIs
  getProtectionStatus: (id: string) =>
    API.get(`/branch-protection/pull-requests/${id}/protection-status`),
  
  mergePR: (id: string, mergeMethod = 'merge') =>
    API.post(`/branch-protection/merge/${id}`, { mergeMethod }),
  
  forceMergePR: (id: string, reason: string, mergeMethod = 'merge') =>
    API.post(`/branch-protection/force-merge/${id}`, { reason, mergeMethod }),
  
  requestReviews: (id: string, reviewerIds: string[], message?: string) =>
    API.post(`/branch-protection/request-review/${id}`, { reviewerIds, message }),

  // Branch Protection Configuration
  getBranchProtectionRules: (projectId?: string) =>
    API.get(`/branch-protection/rules${projectId ? `?projectId=${projectId}` : ''}`),
    
  updateBranchProtectionRules: (rules: any) =>
    API.put('/branch-protection/rules', rules),
    
  createBranchProtectionRule: (rule: any) =>
    API.post('/branch-protection/rules', rule),
    
  deleteBranchProtectionRule: (ruleId: string) =>
    API.delete(`/branch-protection/rules/${ruleId}`)
};

// User API functions
export const userAPI = {
  // Get all users
  getAll: () =>
    API.get<{ success: boolean; data: import("../types").User[] }>('/users/all'),
  
  // Get users by project
  getByProject: (projectId: string) =>
    API.get<{ success: boolean; data: import("../types").User[] }>(`/users/project/${projectId}`)
};

// Notification API functions
export const notificationAPI = {
  // Get user notifications
  getNotifications: (page: number = 1, limit: number = 20) =>
    API.get<{ success: boolean; data: import("../types").NotificationResponse }>(`/notifications?page=${page}&limit=${limit}`),
  
  // Mark notification as read
  markAsRead: (id: string) =>
    API.patch<{ success: boolean; message: string }>(`/notifications/${id}/read`),
  
  // Mark all as read
  markAllAsRead: () =>
    API.patch<{ success: boolean; message: string }>(`/notifications/read-all`),
  
  // Delete notification
  delete: (id: string) =>
    API.delete<{ success: boolean; message: string }>(`/notifications/${id}`)
};

export default API;