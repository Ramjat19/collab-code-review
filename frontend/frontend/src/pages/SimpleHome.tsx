import { Link } from 'react-router-dom';

const SimpleHome = () => {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">
        CodeReview Platform
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-4">🏠 Welcome</h2>
          <p className="text-gray-600 mb-4">
            This is a collaborative code review platform with GitHub-like features.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-4">🚀 Quick Links</h2>
          <div className="space-y-2">
            <Link to="/login" className="block text-blue-600 hover:text-blue-800">
              → Login
            </Link>
            <Link to="/signup" className="block text-blue-600 hover:text-blue-800">
              → Sign Up
            </Link>
            <Link to="/github-features" className="block text-blue-600 hover:text-blue-800">
              → View GitHub Features
            </Link>
            <Link to="/projects" className="block text-blue-600 hover:text-blue-800">
              → Projects (requires login)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleHome;