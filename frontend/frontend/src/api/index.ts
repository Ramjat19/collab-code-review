import axios from "axios";
import type { PullRequest, CreatePullRequestData, Comment } from "../types";

const API = axios.create({
  baseURL: "http://localhost:4000/api",
});

// Add token automatically if available
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Pull Request API functions
export const pullRequestAPI = {
  // Get PRs for a project/repository
  getByProject: (projectId: string, status?: string) => 
    API.get<PullRequest[]>(`/pull-requests/repository/${projectId}`, { params: { status } }),
  
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
};

export default API;