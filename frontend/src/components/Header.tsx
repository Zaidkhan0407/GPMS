import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User } from 'lucide-react';

interface HeaderProps {
  resume: File | null;
  selectedModules: string[];
  handleResumeUpload: (file: File | null) => void;
  handleModuleSelect: (module: string) => void;
}

const Header: React.FC<HeaderProps> = ({ resume, selectedModules, handleResumeUpload, handleModuleSelect }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-gradient-to-br from-sky-600 via-sky-700 to-sky-800 backdrop-blur-xl shadow-2xl border-b border-sky-500/30 sticky top-0 z-50 transition-all duration-300 hover:shadow-sky-400/30">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16" aria-label="Top">
        <div className="h-full flex items-center justify-between">
          {/* Logo and Navigation Links */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="text-2xl font-bold whitespace-nowrap hover:scale-105 transition-transform duration-200 text-sky-100 hover:text-white">
              AI Placement Management
            </Link>
            <div className="hidden lg:flex items-center space-x-6 animate-fadeIn font-['Playfair_Display']">
              {user && user.role === 'student' && (
                <>
                  <button
                    onClick={() => {
                      handleModuleSelect("Resume Analysis");
                      navigate('/resume-analysis');
                    }}
                    className={`text-sm font-medium ${selectedModules.includes("Resume Analysis") ? 'text-white bg-sky-500/50' : 'text-sky-100'} hover:text-white hover:scale-105 transition-all duration-300 hover:bg-sky-500/30 px-3 py-2 rounded-lg`}
                  >
                    Resume Analysis
                  </button>
                  <button
                    onClick={() => {
                      handleModuleSelect("Interview Prep");
                      navigate('/interview-prep');
                    }}
                    className={`text-sm font-medium ${selectedModules.includes("Interview Prep") ? 'text-white bg-sky-500/50' : 'text-sky-100'} hover:text-white hover:scale-105 transition-all duration-300 hover:bg-sky-500/30 px-3 py-2 rounded-lg`}
                  >
                    Interview Prep
                  </button>
                  <button
                    onClick={() => {
                      handleModuleSelect("Job Recommendations");
                      navigate('/job-recommendations');
                    }}
                    className={`text-sm font-medium ${selectedModules.includes("Job Recommendations") ? 'text-white bg-sky-500/50' : 'text-sky-100'} hover:text-white hover:scale-105 transition-all duration-300 hover:bg-sky-500/30 px-3 py-2 rounded-lg`}
                  >
                    Job Recommendations
                  </button>
                </>
              )}
              {user && user.role === 'tpo' && (
                <Link to="/tpo-dashboard" className="text-sm font-medium text-sky-100 hover:text-white hover:scale-105 transition-all duration-300 hover:bg-sky-500/30 px-3 py-2 rounded-lg">
                  TPO Dashboard
                </Link>
              )}
              {user && user.role === 'hr' && (
                <Link to="/hr-dashboard" className="text-sm font-medium text-sky-100 hover:text-white hover:scale-105 transition-all duration-300 hover:bg-sky-500/30 px-3 py-2 rounded-lg">
                  HR Dashboard
                </Link>
              )}
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex items-center">
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={(e) => handleResumeUpload(e.target.files ? e.target.files[0] : null)}
                      className="hidden"
                      id="resume-upload"
                    />
                    <label
                      htmlFor="resume-upload"
                      className="cursor-pointer bg-sky-500/50 backdrop-blur-md hover:bg-sky-500/60 text-white text-sm font-semibold py-2 px-4 rounded-lg inline-flex items-center transition-all duration-200 hover:scale-105 shadow-lg border border-sky-400/50 hover:border-sky-300/50"
                    >
                      {resume ? 'Change File' : 'Choose File'}
                    </label>
                  </div>
                </div>
                <span className="text-white text-sm hidden md:block truncate max-w-[150px] bg-sky-500/50 backdrop-blur-md rounded-lg px-3 py-2 border border-sky-400/50">
                  {user.email}
                </span>
                <button
                  onClick={logout}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-sky-500/50 backdrop-blur-md hover:bg-sky-500/60 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-sky-300/30 border border-sky-400/50 hover:border-sky-300/50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden sm:block">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 text-base font-medium rounded-lg text-white bg-sky-500/50 backdrop-blur-md hover:bg-sky-500/60 transition-all duration-200 hover:scale-105 shadow-lg border border-sky-400/50 hover:border-sky-300/50"
                >
                  <User className="mr-2 h-5 w-5" />
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center px-4 py-2 text-base font-medium rounded-lg text-white bg-sky-500 hover:bg-sky-400 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-sky-400/50"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
