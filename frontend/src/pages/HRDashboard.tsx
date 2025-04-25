import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthToken } from '../context/AuthContext';

interface Application {
  id: string;
  user: {
    id: string;
    email: string;
  };
  scores: {
    cosine_similarity: number;
    bm25_score: number;
    overall_match: number;
    technical_match: number;
    soft_skills_match: number;
    experience_match: number;
  };
  status: string;
  applied_at: string;
  last_updated: string;
  resume_url?: string;
}

const HRDashboard: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchApplications(selectedCompany);
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    try {
      const token = getAuthToken();
      const response = await axios.get('http://localhost:5000/api/companies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompanies(response.data);
      if (response.data.length > 0) {
        setSelectedCompany(response.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      setError('Failed to fetch companies. Please try again.');
    }
  };

  const fetchApplications = async (jobId: string) => {
    try {
      const token = getAuthToken();
      const response = await axios.get(`http://localhost:5000/api/jobs/${jobId}/applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(response.data.applications);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError('Failed to fetch applications. Please try again.');
    }
  };

  const handleUpdateStatus = async (applicationId: string, status: string) => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }

      const response = await axios.patch(`http://localhost:5000/api/applications/${applicationId}/status`, {
        status
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Clear any existing error
      setError(null);
      // Refresh the applications list
      if (selectedCompany) {
        await fetchApplications(selectedCompany);
      }
    } catch (error: any) {
      console.error('Error updating application status:', error);
      let errorMessage = 'Failed to update application status. Please try again.';
      
      if (error.response) {
        // Handle specific error responses
        switch (error.response.status) {
          case 401:
            errorMessage = 'Session expired. Please log in again.';
            break;
          case 403:
            errorMessage = 'You do not have permission to update application status.';
            break;
          case 404:
            errorMessage = 'Application not found.';
            break;
          default:
            errorMessage = error.response.data?.message || errorMessage;
        }
      } else if (error.request) {
        // Handle network errors
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setError(errorMessage);
    }
  };

  const handleViewResume = (resumeUrl: string) => {
    window.open(resumeUrl, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'text-green-500';
      case 'rejected':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  };

  const handleRemoveRejected = async () => {
    try {
      const token = getAuthToken();
      await axios.delete('http://localhost:5000/api/applications/rejected', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (selectedCompany) {
        fetchApplications(selectedCompany);
      }
    } catch (error) {
      console.error('Error removing rejected applications:', error);
      setError('Failed to remove rejected applications. Please try again.');
    }
  };

  return (
  <div className="h-screen overflow-y-auto py-12 relative bg-gradient-to-br from-sky-200 via-sky-300 to-sky-500 bg-fixed">
    <div className="absolute inset-0 bg-white/30 backdrop-blur-sm z-0"></div>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 relative z-10">
      <div className="text-center mb-12 animate-fade-in-down">
        <h1 className="text-5xl font-extrabold text-indigo-600 mb-4 filter drop-shadow-2xl hover:scale-105 transition-all duration-300 font-['Playfair_Display']">
        HR Dashboard</h1>
        <p className="text-lg text-indigo-700 font-medium tracking-wide drop-shadow-md">Manage job applications and candidate evaluations</p>
      </div>

      {error && (
        <div className="mb-8 transform hover:scale-102 transition-all duration-300 animate-fade-in">
          <div className="bg-white/70 backdrop-blur-xl border-l-4 border-red-400 rounded-lg p-5 shadow-lg hover:shadow-indigo-200/30">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-xl mb-6 border border-indigo-300/50 hover:border-indigo-400/50 transition-all duration-300 hover:shadow-indigo-200/30">
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-500/30 via-indigo-400/30 to-indigo-300/30 border-b border-indigo-300/40">
          <label htmlFor="company" className="block text-xl font-semibold text-indigo-700 mb-2 filter drop-shadow-lg">Select Company</label>
          <p className="text-sm text-indigo-600">Choose a company to view applications</p>
        </div>
        <div className="px-6 py-4 hover:bg-indigo-100/50 transition-colors duration-300">
          <select
            id="company"
            value={selectedCompany || ''}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full rounded-lg bg-white border-indigo-300 text-indigo-700 placeholder-indigo-400 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-400/50 transition-all duration-200"
          >
            {companies.map((company) => (
              <option key={company._id} value={company._id} className="bg-indigo-900 text-indigo-100">
                {company.name} - {company.position}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedCompany && (
        <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-xl overflow-hidden border border-indigo-300/50 hover:border-indigo-400/50 transition-all duration-300 hover:shadow-indigo-200/30">
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-500/30 via-indigo-400/30 to-indigo-300/30 border-b border-indigo-300/40 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-indigo-700 mb-1 filter drop-shadow-lg">Applications</h2>
            <button
              onClick={handleRemoveRejected}
              className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-400 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-transparent hover:border-red-200"
            >
              Remove Rejected
            </button>
          </div>
          {applications.length === 0 ? (
            <div className="px-6 py-4 text-indigo-200 text-center italic">No applications found for this position.</div>
          ) : (
            <div className="divide-y divide-purple-700/30">
              {/* Technical Candidates Section */}
              <div className="px-6 py-4">
                <h3 className="text-2xl font-bold text-indigo-200 mb-6 filter drop-shadow-lg">Technical Candidates</h3>
                <div className="space-y-6">
                  {applications
                    .filter(app => app.scores && app.scores.overall_match)
                    .sort((a, b) => b.scores.overall_match - a.scores.overall_match)
                    .map((application) => (
                      <div key={application.id} className="bg-white/80 backdrop-blur-xl rounded-xl shadow-xl p-6 transition-all duration-300 hover:shadow-indigo-200/30 border border-indigo-300/50 hover:border-indigo-400/50 animate-fade-in-up">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h4 className="text-xl font-semibold text-indigo-300">{application.user.email}</h4>
                            <p className="text-sm text-indigo-400 mt-2">Applied: {new Date(application.applied_at).toLocaleDateString()}</p>
                          </div>
                          <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium ${getStatusColor(application.status)} bg-opacity-20 backdrop-blur-sm border border-current`}>
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </span>
                        </div>
                        <div className="mb-6">
                          <h5 className="text-lg font-medium text-indigo-200 mb-4">Match Scores</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-indigo-100/80 backdrop-blur-sm p-4 rounded-xl border border-indigo-300/50 hover:border-indigo-400/50 transition-all duration-300 hover:shadow-indigo-200/30">
                              <p className="font-bold text-indigo-700 text-2xl">{(application.scores.overall_match * 1).toFixed(1)}%</p>
                              <p className="text-indigo-600 text-sm mt-1">Overall Match</p>
                            </div>
                            <div className="bg-indigo-100/80 backdrop-blur-sm p-4 rounded-xl border border-indigo-300/50 hover:border-indigo-400/50 transition-all duration-300 hover:shadow-indigo-200/30">
                              <p className="font-bold text-indigo-700 text-2xl">{(application.scores.technical_match * 1).toFixed(1)}%</p>
                              <p className="text-indigo-600 text-sm mt-1">Technical Match</p>
                            </div>
                            <div className="bg-indigo-100/80 backdrop-blur-sm p-4 rounded-xl border border-indigo-300/50 hover:border-indigo-400/50 transition-all duration-300 hover:shadow-indigo-200/30">
                              <p className="font-bold text-indigo-700 text-2xl">{(application.scores.soft_skills_match * 1).toFixed(1)}%</p>
                              <p className="text-indigo-600 text-sm mt-1">Soft Skills</p>
                            </div>
                            <div className="bg-indigo-100/80 backdrop-blur-sm p-4 rounded-xl border border-indigo-300/50 hover:border-indigo-400/50 transition-all duration-300 hover:shadow-indigo-200/30">
                              <p className="font-bold text-indigo-700 text-2xl">{(application.scores.experience_match * 1).toFixed(1)}%</p>
                              <p className="text-indigo-600 text-sm mt-1">Experience</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-4">
                          {application.resume_url && (
                            <button
                              onClick={() => handleViewResume(application.resume_url!)}
                              className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-indigo-400 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-transparent hover:border-indigo-300"
                            >
                              View Resume
                            </button>
                          )}
                          <select
                            value={application.status}
                            onChange={(e) => handleUpdateStatus(application.id, e.target.value)}
                            className="w-32 rounded-xl bg-white border-indigo-300 text-indigo-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-400/50 transition-all duration-200"
                          >
                            <option value="pending" className="bg-indigo-900">Pending</option>
                            <option value="accepted" className="bg-indigo-900">Accept</option>
                            <option value="rejected" className="bg-indigo-900">Reject</option>
                          </select>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);
};

export default HRDashboard;
