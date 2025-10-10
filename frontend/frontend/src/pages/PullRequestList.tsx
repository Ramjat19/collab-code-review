import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { pullRequestAPI } from '../api';
import type { PullRequest } from '../types';

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

const PullRequestList: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assignedFilter, setAssignedFilter] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 10
  });

  const fetchPullRequests = useCallback(async (page: number = 1, searchTerm?: string, statusFilterValue?: string, assignedFilterValue?: string, isSearchCall = false) => {
    if (!projectId) return;
    
    try {
      if (!isSearchCall) {
        setLoading(true);
      } else {
        setSearchLoading(true);
      }
      const response = await pullRequestAPI.getByProjectWithPagination(projectId, {
        status: (statusFilterValue || statusFilter) === 'all' ? undefined : (statusFilterValue || statusFilter),
        search: searchTerm || undefined,
        assignedTo: (assignedFilterValue || assignedFilter) === 'all' ? undefined : (assignedFilterValue || assignedFilter),
        page,
        limit: 10
      });
      setPullRequests(response.data.pullRequests);
      setPagination(response.data.pagination);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to fetch pull requests');
    } finally {
      if (!isSearchCall) {
        setLoading(false);
      } else {
        setSearchLoading(false);
      }
    }
  }, [projectId, statusFilter, assignedFilter]);

  // Debounce search query and fetch results
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== debouncedSearchQuery) {
        setDebouncedSearchQuery(searchQuery);
        // Only fetch if the search query actually changed
        if (projectId) {
          fetchPullRequests(1, searchQuery, undefined, undefined, true);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearchQuery, projectId, fetchPullRequests]);

  // Initial fetch and fetch when filters change (but not search)
  useEffect(() => {
    if (projectId) {
      fetchPullRequests(1);
    }
  }, [projectId, statusFilter, assignedFilter, fetchPullRequests]);

  // Keyboard shortcut for search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Preserve search input focus with useCallback to prevent re-renders
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleSearchFocus = useCallback(() => {
    // Maintain focus indicator
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    fetchPullRequests(1, searchQuery).finally(() => setSearching(false));
  };

  const handlePageChange = (page: number) => {
    fetchPullRequests(page);
  };

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setLoading(true);
    fetchPullRequests(1, undefined, newStatus).finally(() => setLoading(false));
  };

  const handleAssignedFilterChange = (newAssignedFilter: string) => {
    setAssignedFilter(newAssignedFilter);
    setLoading(true);
    fetchPullRequests(1, undefined, undefined, newAssignedFilter).finally(() => setLoading(false));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'merged':
        return 'bg-purple-100 text-purple-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-600">Loading pull requests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pull Requests</h1>
        <Link
          to={`/projects/${projectId}/pull-requests/new`}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          New Pull Request
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by title or description... (Ctrl+K)"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {searching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Searching...
              </>
            ) : (
              'Search'
            )}
          </button>
        </form>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="reviewing">Reviewing</option>
            <option value="approved">Approved</option>
            <option value="merged">Merged</option>
            <option value="closed">Closed</option>
            <option value="draft">Draft</option>
          </select>

          {/* Assignment Filter */}
          <select
            value={assignedFilter}
            onChange={(e) => handleAssignedFilterChange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All PRs</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </select>

          {/* Results Count */}
          {!loading && (
            <div className="text-sm text-gray-500">
              {pagination.totalCount} result{pagination.totalCount !== 1 ? 's' : ''}
              {debouncedSearchQuery && (
                <span> for "{debouncedSearchQuery}"</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pull Requests List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-6 animate-pulse">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="w-16 h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : pullRequests.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <div className="text-gray-500 text-lg mb-2">No pull requests found</div>
          <div className="text-gray-400 text-sm mb-4">
            {debouncedSearchQuery || statusFilter !== 'all' || assignedFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Create your first pull request to get started'
            }
          </div>
          {(debouncedSearchQuery || statusFilter !== 'all' || assignedFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setDebouncedSearchQuery('');
                setStatusFilter('all');
                setAssignedFilter('all');
                fetchPullRequests(1, '', 'all', 'all');
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {pullRequests.map((pr) => (
            <div
              key={pr._id}
              className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* PR Title and Status */}
                  <div className="flex items-center space-x-3 mb-2">
                    <Link
                      to={`/projects/${projectId}/pull-requests/${pr._id}`}
                      className="text-lg font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {pr.title}
                    </Link>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pr.status)}`}>
                      {pr.status.toUpperCase()}
                    </span>
                  </div>

                  {/* PR Description */}
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {pr.description}
                  </p>

                  {/* PR Meta Information */}
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <span>#{pr._id.slice(-6)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>opened by</span>
                      <span className="font-medium text-gray-700">{pr.author?.username || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>on {formatDate(pr.createdAt)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>{pr.sourceBranch}</span>
                      <span>→</span>
                      <span>{pr.targetBranch}</span>
                    </div>
                  </div>

                  {/* Additional Stats */}
                  <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                    <span>{(pr.files?.length || 0)} file{(pr.files?.length || 0) !== 1 ? 's' : ''} changed</span>
                    <span>{(pr.comments?.length || 0)} comment{(pr.comments?.length || 0) !== 1 ? 's' : ''}</span>
                    {(pr.assignedReviewers?.length || 0) > 0 && (
                      <span>{pr.assignedReviewers.length} reviewer{pr.assignedReviewers.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>

                {/* Assigned Reviewers */}
                {(pr.assignedReviewers?.length || 0) > 0 && (
                  <div className="ml-4">
                    <div className="text-xs text-gray-500 mb-1">Reviewers</div>
                    <div className="flex -space-x-1">
                      {pr.assignedReviewers?.slice(0, 3).map((reviewer) => (
                        <div
                          key={reviewer._id}
                          className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600"
                          title={reviewer.username || 'Unknown'}
                        >
                          {reviewer.username?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      ))}
                      {(pr.assignedReviewers?.length || 0) > 3 && (
                        <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500">
                          +{(pr.assignedReviewers?.length || 0) - 3}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of{' '}
              {pagination.totalCount} results
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              
              <div className="flex items-center space-x-1">
                {/* Page Numbers */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNumber = Math.max(1, pagination.currentPage - 2) + i;
                  if (pageNumber > pagination.totalPages) return null;
                  
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                      className={`px-3 py-1 text-sm rounded-md ${
                        pageNumber === pagination.currentPage
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PullRequestList;