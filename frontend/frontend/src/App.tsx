import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import SimpleHome from './pages/SimpleHome';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import PullRequestList from './pages/PullRequestList';
import PullRequestDetail from './pages/PullRequestDetail';
import SimpleGitHubFeatures from './pages/SimpleGitHubFeatures';
import NotificationBell from './components/NotificationBell';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  // Listen for storage changes to update authentication state
  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
    };

    // Listen for storage events (when localStorage changes in other tabs)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for token changes in the same tab
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-8">
                <h1 className="text-xl font-bold text-gray-900">
                  CodeReview
                </h1>
                <nav className="flex space-x-6">
                  <Link to="/" className="text-gray-600 hover:text-gray-900">
                    Home
                  </Link>
                  {isAuthenticated && (
                    <>
                      <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
                        Dashboard
                      </Link>
                      <Link to="/projects" className="text-gray-600 hover:text-gray-900">
                        Projects
                      </Link>
                      <Link to="/profile" className="text-gray-600 hover:text-gray-900">
                        Profile
                      </Link>
                    </>
                  )}
                  <Link to="/github-features" className="text-gray-600 hover:text-gray-900">
                    Features
                  </Link>
                </nav>
              </div>
              
              {isAuthenticated && (
                <div className="flex items-center space-x-4">
                  <NotificationBell />
                  <button
                    onClick={() => {
                      localStorage.removeItem('token');
                      setIsAuthenticated(false);
                      window.location.href = '/login';
                    }}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route 
              path="/" 
              element={<SimpleHome />} 
            />
            <Route 
              path="/login" 
              element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
            />
            <Route 
              path="/signup" 
              element={isAuthenticated ? <Navigate to="/dashboard" /> : <Signup />} 
            />
            <Route 
              path="/dashboard" 
              element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/projects" 
              element={isAuthenticated ? <Projects /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/projects/:id" 
              element={isAuthenticated ? <ProjectDetail /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/projects/:projectId/pull-requests" 
              element={isAuthenticated ? <PullRequestList /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/projects/:projectId/pull-requests/:prId" 
              element={isAuthenticated ? <PullRequestDetail /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/github-features" 
              element={<SimpleGitHubFeatures />} 
            />
            <Route 
              path="/profile" 
              element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
