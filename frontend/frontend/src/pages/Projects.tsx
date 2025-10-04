import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../api";
import ProjectList from "../components/ProjectList";
import type { Project } from "../types/models";

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const [message, setMessage] = useState("");


  // Fetch all projects
  const fetchProjects = async () => {
    try {
      const res = await API.get("/projects");
      setProjects(res.data);
    } catch {
      setMessage("Failed to fetch projects");
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Submit new project
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await API.post("/projects", form);
      setMessage("Project created successfully!");
      setForm({ name: "", description: "" });
      fetchProjects(); // refresh list
    } catch {
      setMessage("Failed to create project");
    }
  };

    // Add collaborator function
    const handleAddCollaborator = async (projectId: string, email: string) => {
    try {
        await API.post(`/projects/${projectId}/collaborators`, { email });
        setMessage("Collaborator added!");
        fetchProjects(); // refresh
    } catch {
        setMessage("Failed to add collaborator");
    }
    };

    // Remove collaborator function
    const handleRemoveCollaborator = async (projectId: string, userId: string) => {
    try {
        await API.delete(`/projects/${projectId}/collaborators/${userId}`);
        setMessage("Collaborator removed!");
        fetchProjects(); // refresh
    } catch {
        setMessage("Failed to remove collaborator");
    }
    };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Projects Dashboard</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-6">
        <input
          name="name"
          placeholder="Project Name"
          value={form.name}
          onChange={handleChange}
          className="border p-2"
        />
        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          className="border p-2"
        />
        <button type="submit" className="bg-blue-700 text-white p-2">
          Create Project
        </button>
      </form>

      {message && <p className="text-green-600 mb-4">{message}</p>}

      <h3 className="text-lg font-bold mb-2">Your Projects:</h3>
      <ProjectList 
        projects={projects}
        onAddCollaborator={handleAddCollaborator}
        onRemoveCollaborator={handleRemoveCollaborator}
      />
    </div>
  );
}
