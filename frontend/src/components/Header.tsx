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
        <header className="bg-indigo-600">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Top">
            <div className="w-full py-4 flex items-center justify-between border-b border-indigo-500 lg:border-none">
              {/* Logo and Navigation Links */}
              <div className="flex items-center space-x-8">
                <Link to="/" className="text-white text-xl font-bold whitespace-nowrap">
                  AI Placement Management
                </Link>
                <div className="hidden lg:flex space-x-6">
                  {user && user.role === 'student' && (
                    <>
                      <Link to="/resume-analysis" className="text-sm font-medium text-white hover:text-indigo-200 whitespace-nowrap">
                        Resume Analysis
                      </Link>
                      <Link to="/interview-prep" className="text-sm font-medium text-white hover:text-indigo-200 whitespace-nowrap">
                        Interview Prep
                      </Link>
                      <Link to="/job-recommendations" className="text-sm font-medium text-white hover:text-indigo-200 whitespace-nowrap">
                        Job Recommendations
                      </Link>
                    </>
                  )}
                  {user && user.role === 'tpo' && (
                    <Link to="/tpo-dashboard" className="text-sm font-medium text-white hover:text-indigo-200 whitespace-nowrap">
                      TPO Dashboard
                    </Link>
                  )}
                  {user && user.role === 'hr' && (
                    <Link to="/hr-dashboard" className="text-sm font-medium text-white hover:text-indigo-200 whitespace-nowrap">
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
                          className="cursor-pointer bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-semibold py-2 px-4 rounded inline-flex items-center"
                        >
                          {resume ? 'Change File' : 'Choose File'}
                        </label>
                      </div>
                      <button
                        onClick={() => setIsModuleSelectionOpen(!isModuleSelectionOpen)}
                        className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-semibold py-2 px-4 rounded whitespace-nowrap"
                      >
                        Select Modules
                      </button>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-white text-sm hidden md:block truncate max-w-[150px]">
                        {user.email}
                      </span>
                      <button
                        onClick={logout}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-indigo-700 hover:bg-indigo-800"
                      >
                        <LogOut className="h-4 w-4 mr-1" />
                        <span className="hidden sm:block">Logout</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-500 hover:bg-indigo-600"
                    >
                      <User className="mr-2 h-5 w-5" />
                      Sign in
                    </Link>
                    <Link
                      to="/signup"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50"
                    >
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </nav>
          {isModuleSelectionOpen && (
            <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Select Modules
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Choose up to three modules for analysis.
                      </p>
                    </div>
                    <div className="mt-4">
                      {availableModules.map((module) => (
                        <label key={module} className="flex items-center">
                          <input
                            type="checkbox"
                            value={module}
                            checked={selectedModules.includes(module)}
                            onChange={() => handleModuleSelect(module)}
                            className="mr-2"
                          />
                          {module}
                        </label>
                    ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={() => setIsModuleSelectionOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </header>
      );
    };

    export default Header;
