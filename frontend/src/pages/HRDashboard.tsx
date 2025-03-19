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
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-8">HR Dashboard</h1>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-lg shadow-lg" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="px-6 py-4">
          <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">Select Company</label>
          <select
            id="company"
            value={selectedCompany || ''}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full rounded-md border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            {companies.map((company) => (
              <option key={company._id} value={company._id}>
                {company.name} - {company.position}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedCompany && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Applications</h2>
            <button
              onClick={handleRemoveRejected}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400 transition-colors duration-150"
            >
              Remove Rejected
            </button>
          </div>
          {applications.length === 0 ? (
            <div className="px-6 py-4 text-gray-500">No applications found for this position.</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {/* Technical Candidates Section */}
              <div className="px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Candidates</h3>
                <div className="space-y-4">
                  {applications
                    .filter(app => app.scores && app.scores.overall_match)
                    .sort((a, b) => b.scores.overall_match - a.scores.overall_match)
                    .map((application) => (
                      <div key={application.id} className="bg-white rounded-lg shadow-sm p-6 transition-all duration-150 hover:shadow-md border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-xl font-semibold text-gray-900">{application.user.email}</h4>
                            <p className="text-sm text-gray-500 mt-1">Applied: {new Date(application.applied_at).toLocaleDateString()}</p>
                          </div>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)} bg-opacity-10`}>
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </span>
                        </div>
                        <div className="mb-6">
                          <h5 className="text-sm font-medium text-gray-700 mb-3">Match Scores</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 hover:border-blue-200 transition-all duration-300">
                              <p className="font-semibold text-blue-600 text-lg">{(application.scores.overall_match * 1).toFixed(1)}%</p>
                              <p className="text-blue-600 text-sm">Overall Match</p>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg border border-green-100 hover:border-green-200 transition-all duration-300">
                              <p className="font-semibold text-green-600 text-lg">{(application.scores.technical_match * 1).toFixed(1)}%</p>
                              <p className="text-green-600 text-sm">Technical Match</p>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 hover:border-purple-200 transition-all duration-300">
                              <p className="font-semibold text-purple-600 text-lg">{(application.scores.soft_skills_match * 1).toFixed(1)}%</p>
                              <p className="text-purple-600 text-sm">Soft Skills</p>
                            </div>
                            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 hover:border-indigo-200 transition-all duration-300">
                              <p className="font-semibold text-indigo-600 text-lg">{(application.scores.experience_match * 1).toFixed(1)}%</p>
                              <p className="text-indigo-600 text-sm">Experience</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-3">
                          {application.resume_url && (
                            <button
                              onClick={() => handleViewResume(application.resume_url!)}
                              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              View Resume
                            </button>
                          )}
                          <select
                            value={application.status}
                            onChange={(e) => handleUpdateStatus(application.id, e.target.value)}
                            className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          >
                            <option value="pending">Pending</option>
                            <option value="accepted">Accept</option>
                            <option value="rejected">Reject</option>
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
