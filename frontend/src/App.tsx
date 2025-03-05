import React, { useState } from 'react';
    import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
    import Header from './components/Header';
    import Footer from './components/Footer';
    import Home from './pages/Home';
    import Login from './pages/Login';
    import Signup from './pages/Signup';
    import ResumeAnalysis from './pages/ResumeAnalysis';
    import InterviewPrep from './pages/InterviewPrep';
    import JobRecommendations from './pages/JobRecommendations';
    import TPODashboard from './pages/TPODashboard';
    import { AuthProvider, useAuth } from './context/AuthContext';

    const PrivateRoute = ({ children, role }: { children: React.ReactNode; role: string }) => {
      const { user } = useAuth();
      if (!user) return <Navigate to="/login" />;
      if (role === 'tpo' && user.role !== 'tpo') return <Navigate to="/" />;
      return <>{children}</>;
    };

    function App() {
      const [resume, setResume] = useState<File | null>(null);
      const [selectedModules, setSelectedModules] = useState<string[]>([]);

      const handleResumeUpload = (file: File | null) => {
        setResume(file);
      };

      const handleModuleSelect = (module: string) => {
        if (selectedModules.includes(module)) {
          setSelectedModules(selectedModules.filter((m) => m !== module));
        } else if (selectedModules.length < 3) {
          setSelectedModules([...selectedModules, module]);
        }
      };

      return (
        <AuthProvider>
          <Router>
            <div className="flex flex-col min-h-screen">
              <Header
                resume={resume}
                selectedModules={selectedModules}
                handleResumeUpload={handleResumeUpload}
                handleModuleSelect={handleModuleSelect}
              />
              <main className="flex-grow">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route
                    path="/resume-analysis"
                    element={
                      <PrivateRoute role="student">
                        <ResumeAnalysis resume={resume} selectedModules={selectedModules} />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/interview-prep"
                    element={
                      <PrivateRoute role="student">
                        <InterviewPrep resume={resume} selectedModules={selectedModules} />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/job-recommendations"
                    element={
                      <PrivateRoute role="student">
                        <JobRecommendations resume={resume} selectedModules={selectedModules} />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/tpo-dashboard"
                    element={
                      <PrivateRoute role="tpo">
                        <TPODashboard />
                      </PrivateRoute>
                    }
                  />
                </Routes>
              </main>
              <Footer />
            </div>
          </Router>
        </AuthProvider>
      );
    }

    export default App;
