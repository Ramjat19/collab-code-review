import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Plus, GitPullRequest, Code2, Search } from "lucide-react";
import API from "../api";
import { pullRequestAPI } from "../api";
import SnippetList from "../components/SnippetList";
import type { Snippet, Project } from "../types/models";
import type { PullRequest } from "../types";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>(); // projectId from URL
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'snippets' | 'pullrequests'>('snippets');
  const [form, setForm] = useState({ title: "", code: "" });
  const [prForm, setPrForm] = useState({
    title: "",
    description: "",
    sourceBranch: "feature/new-feature",
    targetBranch: "main",
    files: [
      {
        path: "src/components/NewComponent.tsx",
        changeType: "added" as const,
        newContent: "// New component\nexport default function NewComponent() {\n  return <div>Hello World</div>;\n}"
      },
      {
        path: "src/utils/helper.js",
        changeType: "modified" as const,
        oldContent: "// Original code\nfunction oldFunction() {\n  return 'old';\n}",
        newContent: "// Updated code\nfunction newFunction() {\n  return 'new and improved';\n}"
      },
      {
        path: "src/legacy/oldFile.js",
        changeType: "deleted" as const,
        oldContent: "// This file is no longer needed\nconsole.log('deprecated');"
      }
    ]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrSubmitting, setIsPrSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const fetchProject = async () => {
    try {
      const res = await API.get(`/projects/${id}`);
      setProject(res.data);
    } catch (error) {
      console.error('Error fetching project:', error);
      setMessage("Failed to load project");
    }
  };

  const fetchSnippets = async () => {
    try {
      const res = await API.get(`/snippets/${id}`);
      setSnippets(res.data);
    } catch (error) {
      console.error('Error fetching snippets:', error);
      setMessage("Failed to load snippets");
    }
  };

  const fetchPullRequests = async () => {
    try {
      const res = await pullRequestAPI.getByProject(id!);
      setPullRequests(res.data);
    } catch (error) {
      console.error('Error fetching pull requests:', error);
      setMessage("Failed to load pull requests");
    }
  };

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchSnippets();
      fetchPullRequests();
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.code.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setMessage("");

    try {
      await API.post(`/snippets/${id}`, form);
      setForm({ title: "", code: "" });
      setMessage("Snippet created successfully!");
      fetchSnippets(); // Refresh the list
    } catch (error) {
      console.error('Error creating snippet:', error);
      setMessage("Failed to create snippet");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSnippetUpdate = (updatedSnippet: Snippet) => {
    setSnippets(prev => 
      prev.map(snippet => 
        snippet._id === updatedSnippet._id ? updatedSnippet : snippet
      )
    );
  };

  const handlePrFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setPrForm({ ...prForm, [e.target.name]: e.target.value });
  };

  const handlePrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prForm.title.trim() || isPrSubmitting) return;

    setIsPrSubmitting(true);
    setMessage("");

    try {
      await pullRequestAPI.create({
        ...prForm,
        projectId: id!
      });
      setPrForm({
        title: "",
        description: "",
        sourceBranch: "feature/new-feature",
        targetBranch: "main",
        files: [
          {
            path: "src/components/NewComponent.tsx",
            changeType: "added" as const,
            newContent: "// New component\nexport default function NewComponent() {\n  return <div>Hello World</div>;\n}"
          },
          {
            path: "src/utils/helper.js",
            changeType: "modified" as const,
            oldContent: "// Original code\nfunction oldFunction() {\n  return 'old';\n}",
            newContent: "// Updated code\nfunction newFunction() {\n  return 'new and improved';\n}"
          },
          {
            path: "src/legacy/oldFile.js",
            changeType: "deleted" as const,
            oldContent: "// This file is no longer needed\nconsole.log('deprecated');"
          }
        ]
      });
      setMessage("Pull Request created successfully!");
      fetchPullRequests(); // Refresh the list
    } catch (error) {
      console.error('Error creating pull request:', error);
      setMessage("Failed to create pull request");
    } finally {
      setIsPrSubmitting(false);
    }
  };

  if (!id) {
    return <div className="p-6">Invalid project ID</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <Link to="/projects" className="text-blue-600 hover:text-blue-800">
          Projects
        </Link>
        <span className="mx-2 text-gray-500">›</span>
        <span className="text-gray-700">{project?.name || 'Loading...'}</span>
      </nav>

      {/* Project Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {project?.name || 'Loading Project...'}
        </h1>
        {project?.description && (
          <p className="text-gray-600">{project.description}</p>
        )}
        <div className="mt-2 text-sm text-gray-500">
          Created by {project?.owner.username} • {snippets.length} snippet{snippets.length !== 1 ? 's' : ''} • {pullRequests.length} PR{pullRequests.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('snippets')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'snippets'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Code2 className="h-4 w-4" />
              <span>Code Snippets ({snippets.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('pullrequests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pullrequests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <GitPullRequest className="h-4 w-4" />
              <span>Pull Requests ({pullRequests.length})</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'snippets' && (
        <>
          {/* Create Snippet Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Add New Code Snippet</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Snippet Title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Enter a descriptive title for your code snippet"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                  Code
                </label>
                <textarea
                  id="code"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="Paste or write your code here..."
                  rows={8}
                  className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  disabled={!form.title.trim() || !form.code.trim() || isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Adding...' : 'Add Snippet'}
                </button>
                
                {message && (
                  <span className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                    {message}
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Snippets List */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Code Snippets</h2>
            <SnippetList 
              snippets={snippets} 
              onSnippetUpdate={handleSnippetUpdate}
            />
          </div>
        </>
      )}

      {activeTab === 'pullrequests' && (
        <>
          {/* Create Pull Request Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Create New Pull Request</h2>
              <GitPullRequest className="h-5 w-5 text-gray-400" />
            </div>
            <form onSubmit={handlePrSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="prTitle" className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    id="prTitle"
                    name="title"
                    type="text"
                    value={prForm.title}
                    onChange={handlePrFormChange}
                    placeholder="Add descriptive title for your changes"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isPrSubmitting}
                  />
                </div>
                
                <div>
                  <label htmlFor="sourceBranch" className="block text-sm font-medium text-gray-700 mb-1">
                    Source Branch
                  </label>
                  <input
                    id="sourceBranch"
                    name="sourceBranch"
                    type="text"
                    value={prForm.sourceBranch}
                    onChange={handlePrFormChange}
                    placeholder="feature/my-feature"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isPrSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="targetBranch" className="block text-sm font-medium text-gray-700 mb-1">
                    Target Branch
                  </label>
                  <select
                    id="targetBranch"
                    name="targetBranch"
                    value={prForm.targetBranch}
                    onChange={handlePrFormChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isPrSubmitting}
                  >
                    <option value="main">main</option>
                    <option value="develop">develop</option>
                    <option value="staging">staging</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label htmlFor="prDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="prDescription"
                  name="description"
                  value={prForm.description}
                  onChange={handlePrFormChange}
                  placeholder="Describe the changes you've made..."
                  rows={5}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isPrSubmitting}
                />
              </div>

              {/* Preview of files that will be included */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Files Changed (Sample)</h3>
                <div className="space-y-2">
                  {prForm.files.map((file, index) => (
                    <div key={index} className="flex items-center space-x-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        file.changeType === 'added' ? 'bg-green-100 text-green-800' :
                        file.changeType === 'modified' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {file.changeType}
                      </span>
                      <span className="font-mono text-gray-600">{file.path}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  * This is a demo. In a real application, files would be detected from Git changes.
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  disabled={!prForm.title.trim() || isPrSubmitting}
                  className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isPrSubmitting ? 'Creating...' : 'Create Pull Request'}</span>
                </button>
                
                {message && (
                  <span className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                    {message}
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Pull Requests List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Pull Requests</h2>
              <Link
                to={`/projects/${id}/pull-requests`}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
              >
                View All with Search & Filters
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            
            {/* Info banner about advanced features */}
            {pullRequests.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <Search className="h-4 w-4" />
                  <span className="font-medium">Need to search, filter, or navigate through many PRs?</span>
                  <Link
                    to={`/projects/${id}/pull-requests`}
                    className="font-semibold hover:underline"
                  >
                    Use the advanced PR list →
                  </Link>
                </div>
                <p className="text-blue-700 text-sm mt-1">
                  Advanced list includes: search by title, status filters, assignment filters, pagination & keyboard shortcuts
                </p>
              </div>
            )}
            
            {pullRequests.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <GitPullRequest className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pull Requests Yet</h3>
                <p className="text-gray-500 mb-4">Create your first pull request to start collaborating on code changes.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pullRequests.map((pr) => (
                  <Link
                    key={pr._id}
                    to={`/projects/${id}/pull-requests/${pr._id}`}
                    className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{pr.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            pr.status === 'open' ? 'bg-green-100 text-green-800' :
                            pr.status === 'merged' ? 'bg-purple-100 text-purple-800' :
                            pr.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {pr.status}
                          </span>
                        </div>
                        {pr.description && (
                          <p className="text-gray-600 mb-3">{pr.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>#{pr._id.slice(-6)}</span>
                          <span>by {pr.author.username}</span>
                          <span>{new Date(pr.createdAt).toLocaleDateString()}</span>
                          <span>{pr.comments?.length || 0} comments</span>
                        </div>
                      </div>
                      <GitPullRequest className="h-5 w-5 text-gray-400 mt-1" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
