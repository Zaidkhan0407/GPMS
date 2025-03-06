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
      similarity_score: number;
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
          setError('An error occurred while applying to the job. Please try again.');
        } finally {
          setApplying(null);
        }
      };

      return (
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Job Recommendations</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          )}

          {recommendedJobs.length > 0 && (
            <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
              <h2 className="text-2xl font-bold mb-4">Recommended Jobs</h2>
              {recommendedJobs.map((job) => (
                <div key={job.id} className="mb-6 p-4 border rounded">
                  <h3 className="text-xl font-semibold">{job.name} - {job.position}</h3>
                  <p className="text-gray-600 mb-2">Matching Score: {(job.similarity_score * 100).toFixed(2)}%</p>
                  <h4 className="font-medium mb-1">Description:</h4>
                  <p className="text-gray-700 mb-2">{job.description}</p>
                  <h4 className="font-medium mb-1">Requirements:</h4>
                  <p className="text-gray-700 mb-4">{job.requirements}</p>
                  <button
                    onClick={() => handleApply(job.id)}
                    disabled={applying === job.id}
                    className={`px-4 py-2 rounded-md text-white font-medium ${applying === job.id ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                  >
                    {applying === job.id ? 'Applying...' : 'Apply Now'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    };

    export default JobRecommendations;
