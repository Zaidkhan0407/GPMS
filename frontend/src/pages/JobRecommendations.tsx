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
      const [, setLoading] = useState(false);
      const [error, setError] = useState<string | null>(null);

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

      return (
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Job Recommendations</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
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
                  <p className="text-gray-700">{job.requirements}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    };

    export default JobRecommendations;
