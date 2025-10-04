import { useState } from "react";
import { Link } from "react-router-dom";
import type { Project } from "../types/models";

interface Props {
  projects: Project[];
  onAddCollaborator: (projectId: string, email: string) => void;
  onRemoveCollaborator: (projectId: string, userId: string) => void;
}

export default function ProjectList({ projects, onAddCollaborator, onRemoveCollaborator }: Props) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-lg">No projects yet</p>
        <p className="text-gray-400 text-sm mt-1">Create your first project to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {projects.map((project) => (
        <ProjectCard 
          key={project._id} 
          project={project}
          onAddCollaborator={onAddCollaborator}
          onRemoveCollaborator={onRemoveCollaborator}
        />
      ))}
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  onAddCollaborator: (projectId: string, email: string) => void;
  onRemoveCollaborator: (projectId: string, userId: string) => void;
}

function ProjectCard({ project, onAddCollaborator, onRemoveCollaborator }: ProjectCardProps) {
  const [collabEmail, setCollabEmail] = useState("");

  const handleAddCollaborator = () => {
    if (collabEmail.trim()) {
      onAddCollaborator(project._id, collabEmail);
      setCollabEmail("");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <Link 
            to={`/projects/${project._id}`} 
            className="text-xl font-semibold text-blue-600 hover:text-blue-800 underline"
          >
            {project.name}
          </Link>
          <p className="text-gray-600 mt-1">{project.description}</p>
          <p className="text-sm text-gray-500 mt-2">
            Created by {project.owner.username} • {project.collaborators.length} collaborator{project.collaborators.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Collaborators Section */}
      <div className="border-t border-gray-100 pt-4">
        <h4 className="font-medium text-gray-700 mb-3">Collaborators</h4>
        
        {/* Add Collaborator */}
        <div className="flex gap-2 mb-3">
          <input
            type="email"
            placeholder="Collaborator Email"
            value={collabEmail}
            onChange={(e) => setCollabEmail(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-3 py-1 text-sm"
          />
          <button
            onClick={handleAddCollaborator}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            Add
          </button>
        </div>

        {/* Collaborators List */}
        <div className="flex flex-wrap gap-2">
          {project.collaborators.map((collaborator) => (
            <div 
              key={collaborator._id} 
              className="flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm"
            >
              <span>{collaborator.username} ({collaborator.email})</span>
              {collaborator._id !== project.owner._id && (
                <button
                  onClick={() => onRemoveCollaborator(project._id, collaborator._id)}
                  className="ml-2 text-red-500 hover:text-red-700"
                  title="Remove collaborator"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}