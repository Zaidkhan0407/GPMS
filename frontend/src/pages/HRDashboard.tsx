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
  };
  status: string;
  applied_at: string;
  last_updated: string;
  resume_url?: string;
}

const HRDashboard: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string>('pending');
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
      await axios.patch(`http://localhost:5000/api/applications/${applicationId}/status`, {
        status
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (selectedCompany) {
        fetchApplications(selectedCompany);
      }
    } catch (error) {
      console.error('Error updating application status:', error);
      setError('Failed to update application status. Please try again.');
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">HR Dashboard</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="company" className="block text-sm font-medium text-gray-700">Select Company</label>
        <select
          id="company"
          value={selectedCompany || ''}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          {companies.map((company) => (
            <option key={company._id} value={company._id}>
              {company.name} - {company.position}
            </option>
          ))}
        </select>
      </div>

      {selectedCompany && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Applications</h2>
          {applications.length === 0 ? (
            <p>No applications found for this position.</p>
          ) : (
            <div className="space-y-4">
              {applications.sort((a, b) => b.scores.overall_match - a.scores.overall_match).map((application) => (
                <div key={application.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-medium">{application.user.email}</h3>
                      <p className="text-sm text-gray-500">Applied: {new Date(application.applied_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`font-medium ${getStatusColor(application.status)}`}>
                      {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                    </span>
                  </div>
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-1">Match Score:</h4>
                    <div className="text-sm">
                      <p className="font-medium">{Math.abs(application.scores.overall_match).toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {application.resume_url && (
                      <button
                        onClick={() => handleViewResume(application.resume_url!)}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        View Resume
                      </button>
                    )}
                    <button
                      onClick={() => handleUpdateStatus(application.id, 'accepted')}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(application.id, 'rejected')}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HRDashboard;
