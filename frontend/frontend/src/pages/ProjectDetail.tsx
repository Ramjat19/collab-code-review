import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../api";
import SnippetList from "../components/SnippetList";
import type { Snippet, Project } from "../types/models";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>(); // projectId from URL
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [form, setForm] = useState({ title: "", code: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchSnippets();
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
          Created by {project?.owner.username} • {snippets.length} snippet{snippets.length !== 1 ? 's' : ''}
        </div>
      </div>

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
    </div>
  );
}
