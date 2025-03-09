import React, { useState } from 'react';
    import { Link } from 'react-router-dom';
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
      const availableModules = ["Resume Analysis", "Interview Prep", "Job Recommendations"];
      const [isModuleSelectionOpen, setIsModuleSelectionOpen] = useState(false);

      return (
        <header className="bg-gradient-to-r from-indigo-600/90 to-indigo-800/90 backdrop-blur-xl shadow-2xl border-b border-white/10 sticky top-0 z-50 transition-all duration-300 hover:shadow-indigo-500/20">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Top">
            <div className="w-full py-6 flex items-center justify-between border-b border-indigo-500/30 lg:border-none">
              {/* Logo and Navigation Links */}
              <div className="flex items-center space-x-8">
                <Link to="/" className="text-white text-2xl font-bold whitespace-nowrap hover:scale-105 transition-transform duration-200 bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200 hover:from-white hover:to-blue-200">
                  AI Placement Management
                </Link>
                <div className="hidden lg:flex space-x-6 animate-fadeIn">
                  {user && user.role === 'student' && (
                    <>
                      <Link to="/resume-analysis" className="text-sm font-medium text-white/90 hover:text-white hover:scale-105 transition-all duration-300 hover:bg-white/10 px-4 py-2 rounded-lg backdrop-blur-md">
                        Resume Analysis
                      </Link>
                      <Link to="/interview-prep" className="text-sm font-medium text-white/90 hover:text-white hover:scale-105 transition-all duration-200 whitespace-nowrap">
                        Interview Prep
                      </Link>
                      <Link to="/job-recommendations" className="text-sm font-medium text-white/90 hover:text-white hover:scale-105 transition-all duration-200 whitespace-nowrap">
                        Job Recommendations
                      </Link>
                    </>
                  )}
                  {user && user.role === 'tpo' && (
                    <Link to="/tpo-dashboard" className="text-sm font-medium text-white/90 hover:text-white hover:scale-105 transition-all duration-200 whitespace-nowrap">
                      TPO Dashboard
                    </Link>
                  )}
                  {user && user.role === 'hr' && (
                    <Link to="/hr-dashboard" className="text-sm font-medium text-white/90 hover:text-white hover:scale-105 transition-all duration-200 whitespace-nowrap">
                      HR Dashboard
                    </Link>
                  )}
                </div>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center space-x-4">
                {user ? (
                  <>
                    <div className="hidden sm:flex items-center space-x-4">
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => handleResumeUpload(e.target.files ? e.target.files[0] : null)}
                          className="hidden"
                          id="resume-upload"
                        />
                        <label
                          htmlFor="resume-upload"
                          className="cursor-pointer bg-white/10 backdrop-blur-md hover:bg-white/20 text-white text-sm font-semibold py-2 px-4 rounded-lg inline-flex items-center transition-all duration-200 hover:scale-105 shadow-lg"
                        >
                          {resume ? 'Change File' : 'Choose File'}
                        </label>
                      </div>
                      <button
                        onClick={() => setIsModuleSelectionOpen(!isModuleSelectionOpen)}
                        className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white text-sm font-semibold py-2 px-4 rounded-lg whitespace-nowrap transition-all duration-200 hover:scale-105 shadow-lg"
                      >
                        Select Modules
                      </button>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-white/90 text-sm hidden md:block truncate max-w-[150px] bg-white/10 backdrop-blur-md rounded-lg px-3 py-1">
                        {user.email}
                      </span>
                      <button
                        onClick={logout}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-indigo-500/30 border border-white/10"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        <span className="hidden sm:block">Logout</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="inline-flex items-center px-4 py-2 text-base font-medium rounded-lg text-white bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all duration-200 hover:scale-105 shadow-lg"
                    >
                      <User className="mr-2 h-5 w-5" />
                      Sign in
                    </Link>
                    <Link
                      to="/signup"
                      className="inline-flex items-center px-4 py-2 text-base font-medium rounded-lg text-indigo-600 bg-white hover:bg-opacity-90 transition-all duration-200 hover:scale-105 shadow-lg"
                    >
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </nav>
          {isModuleSelectionOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white/10 backdrop-blur-xl rounded-lg shadow-lg border border-white/20 overflow-hidden transform origin-top-right transition-all duration-200 z-50">
              <div className="p-4 space-y-3">
                {availableModules.map((module) => (
                  <label key={module} className="flex items-center space-x-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-all duration-200">
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(module)}
                      onChange={() => handleModuleSelect(module)}
                      className="form-checkbox h-4 w-4 text-indigo-600 rounded border-white/30 bg-white/10 focus:ring-indigo-500 focus:ring-offset-0"
                    />
                    <span className="text-sm text-white/90 font-medium">{module}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </header>
      );
    };

    export default Header;
