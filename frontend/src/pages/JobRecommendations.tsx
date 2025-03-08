import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthToken } from '../context/AuthContext';

interface JobRecommendationsProps {
  resume: File | null;
  selectedModules: string[];
}

interface Job {
  id: string;
  name: string;
  position: string;
  description: string;
  requirements: string;
  match_details: {
    overall_match: number;
    technical_match: number;
    soft_skills_match: number;
    experience_match: number;
    semantic_similarity: number;
    contextual_similarity: number;
  };
}

const JobRecommendations: React.FC<JobRecommendationsProps> = ({ resume, selectedModules }) => {
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    if (resume && selectedModules.includes("Job Recommendations")) {
      handleSubmit();
    }
  }, [resume, selectedModules]);

  const handleSubmit = async () => {
    if (!resume) {
      setError('Please upload a resume');
      return;
    }

    setLoading(true);
    setError(null);
    setRecommendedJobs([]);

    const formData = new FormData();
    formData.append('resume', resume);
    formData.append('action', 'recommend_jobs');

    try {
      const token = getAuthToken();
      const response = await axios.post('http://localhost:5000/api/analyze-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      setRecommendedJobs(response.data.recommended_jobs);
    } catch (error) {
      console.error('Error recommending jobs:', error);
      setError('An error occurred while recommending jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (jobId: string) => {
    if (!resume) {
      setError('Please upload a resume to apply');
      return;
    }

    setApplying(jobId);
    setError(null);

    const formData = new FormData();
    formData.append('resume', resume);

    try {
      const token = getAuthToken();
      await axios.post(`http://localhost:5000/api/jobs/${jobId}/apply`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      // Update the UI to show application was successful
      const updatedJobs = recommendedJobs.map(job => {
        if (job.id === jobId) {
          return { ...job, applied: true };
        }
        return job;
      });
      setRecommendedJobs(updatedJobs);
    } catch (error) {
      console.error('Error applying to job:', error);
      setError('An error occurred while applying to the job.Please try again.');
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Job Recommendations</h1>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6" role="alert">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!loading && !error && recommendedJobs.length === 0 && (
          <div className="bg-white shadow-sm rounded-lg px-8 py-6 mb-6">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Recommendations</h3>
              <p className="mt-1 text-sm text-gray-500">Please ensure you have uploaded a resume and selected "Job Recommendations" from the modules.</p>
            </div>
          </div>
        )}

        {recommendedJobs.length > 0 && (
          <div className="space-y-6">
            {recommendedJobs.map((job) => (
              <div key={job.id} className="bg-white shadow-sm rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md">
                <div className="px-6 py-5 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{job.name}</h3>
                      <p className="mt-1 text-sm text-gray-500">{job.position}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">{(job.match_details.overall_match * 100).toFixed(1)}%</p>
                        <p className="text-sm text-gray-500">Match Score</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-lg font-semibold text-blue-700">{(job.match_details.technical_match * 100).toFixed(1)}%</p>
                      <p className="text-sm text-blue-600">Technical Match</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-lg font-semibold text-green-700">{job.match_details.soft_skills_match ? (job.match_details.soft_skills_match * 100).toFixed(1) : 'N/A'}%</p>
                      <p className="text-sm text-green-600">Soft Skills</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-lg font-semibold text-purple-700">{job.match_details.experience_match ? (job.match_details.experience_match * 100).toFixed(1) : 'N/A'}%</p>
                      <p className="text-sm text-purple-600">Experience</p>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-3">
                      <p className="text-lg font-semibold text-indigo-700">{(job.match_details.semantic_similarity * 100).toFixed(1)}%</p>
                      <p className="text-sm text-indigo-600">Semantic Match</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                      <p className="text-sm text-gray-600">{job.description}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Requirements</h4>
                      <p className="text-sm text-gray-600">{job.requirements}</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => handleApply(job.id)}
                      disabled={applying === job.id}
                      className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${applying === job.id ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150`}
                    >
                      {applying === job.id ? 'Applying...' : 'Apply Now'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobRecommendations;
