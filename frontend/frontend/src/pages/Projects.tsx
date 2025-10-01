import { useState, useEffect } from "react";
import API from "../api";

interface Project {
  _id: string;
  name: string;
  description: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const [message, setMessage] = useState("");
  const [collabEmail, setCollabEmail] = useState("");

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
    const handleAddCollaborator = async (projectId: string) => {
    try {
        await API.post(`/projects/${projectId}/collaborators`, { email: collabEmail });
        setMessage("Collaborator added!");
        setCollabEmail("");
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
        <button type="submit" className="bg-blue-500 text-white p-2">
          Create Project
        </button>
      </form>

      {message && <p className="text-green-600 mb-4">{message}</p>}

      <h3 className="text-lg font-bold mb-2">Your Projects:</h3>
      {projects.length === 0 ? (
        <p>No projects yet</p>
      ) : (
        <ul className="list-disc pl-5">
          {projects.map((p) => (
            <li key={p._id}>
            <b>{p.name}</b>: {p.description}
            <div className="mt-1 mb-2">
                <input
                placeholder="Collaborator Email"
                value={collabEmail}
                onChange={(e) => setCollabEmail(e.target.value)}
                className="border p-1 mr-2"
                />
                <button
                onClick={() => handleAddCollaborator(p._id)}
                className="bg-green-500 text-white p-1"
                >
                Add
                </button>
            </div>
            <div>
                <b>Collaborators:</b>
                {p.collaborators?.map((c: any) => (
                    <span key={c._id} className="ml-2">
                        {c.username} ({c.email})
                        <button
                        onClick={() => handleRemoveCollaborator(p._id, c._id)}
                        className="text-red-500 ml-1"
                        >
                        X
                        </button>
                    </span>
                    ))}
                </div>
                </li>
            ))}
        </ul>
      )}
    </div>
  );
}
