import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";

export default function Dashboard() {
  const [user, setUser] = useState<{
    id: string;
    username: string;
    email: string;
  } | null>(null);
  const [stats, setStats] = useState({ projects: 0, snippets: 0 });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userResponse = await API.get("/auth/me");
        setUser(userResponse.data);
        
        const projectsResponse = await API.get("/projects");
        setStats(prev => ({ ...prev, projects: projectsResponse.data.length }));
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };

    fetchUserData();
  }, []);

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p>Please login to access your dashboard.</p>
        <Link to="/login" className="text-blue-600 hover:text-blue-800">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user.username}!
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your code review projects and collaborate with your team.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800">Projects</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.projects}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800">Code Reviews</h3>
          <p className="text-3xl font-bold text-green-600">{stats.snippets}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800">Comments</h3>
          <p className="text-3xl font-bold text-orange-600">-</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link 
              to="/projects" 
              className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              View All Projects
            </Link>
            <Link 
              to="/projects" 
              className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create New Project
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
          <p className="text-gray-500">No recent activity to show.</p>
        </div>
      </div>
    </div>
  );
}