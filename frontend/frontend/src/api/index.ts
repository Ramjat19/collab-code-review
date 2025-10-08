import axios, { AxiosError } from "axios";
import type { PullRequest, CreatePullRequestData, Comment } from "../types";

const API = axios.create({
  baseURL: "http://localhost:4000/api",
  timeout: 10000, // 10 second timeout
});

// Add token automatically if available
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Enhanced error handling
API.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle different types of errors
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout - please check your connection';
    } else if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
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
    API.delete<{ message: string; pullRequest: PullRequest }>(`/pull-requests/${id}/reviewers/${reviewerId}`)
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