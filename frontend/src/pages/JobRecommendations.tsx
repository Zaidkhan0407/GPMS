import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  hr_email: string;
  hr_code: string;
  experience: string;
  match_details: {
    overall_match: number;
    technical_match: number;
    semantic_match: number;
    tfidf_similarity: number;
    bm25_score: number;
  };
}

const JobRecommendations: React.FC<JobRecommendationsProps> = ({ resume, selectedModules }) => {
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    salaryMin: '',
    salaryMax: '',
    location: '',
    technology: ''
  });

  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters]);

  const validateSalary = (value: string): number | null => {
    const num = parseInt(value);
    return !isNaN(num) && num >= 0 ? num : null;
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'salaryMin' || name === 'salaryMax') {
      // Only allow positive numbers or empty string
      if (value === '' || /^\d+$/.test(value)) {
        setFilters(prev => ({ ...prev, [name]: value }));
      }
    } else {
      // Sanitize other inputs
      const sanitizedValue = value.trim();
      setFilters(prev => ({ ...prev, [name]: sanitizedValue }));
    }
  };

  const filteredJobs = useMemo(() => {
    return recommendedJobs.filter((job: Job) => {
      const salaryMin = validateSalary(debouncedFilters.salaryMin);
      const salaryMax = validateSalary(debouncedFilters.salaryMax);

      // Salary validation
      if (salaryMin && salaryMax && salaryMin > salaryMax) {
        return false;
      }

      const matchesSalaryMin = !salaryMin || (job.salary_min && job.salary_min >= salaryMin);
      const matchesSalaryMax = !salaryMax || (job.salary_max && job.salary_max <= salaryMax);
      
      // Case-insensitive search with trimmed values
      const location = debouncedFilters.location.toLowerCase().trim();
      const technology = debouncedFilters.technology.toLowerCase().trim();
      
      const matchesLocation = !location || (job.location && job.location.toLowerCase().includes(location));
      const matchesTechnology = !technology || (job.requirements && job.requirements.toLowerCase().includes(technology));

      return matchesSalaryMin && matchesSalaryMax && matchesLocation && matchesTechnology;
    });
  }, [recommendedJobs, debouncedFilters]);


  const handleSubmit = useCallback(async () => {
    if (!resume) {
      setError('Please upload a resume');
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        setError('Authentication required. Please log in.');
        return;
      }

      setLoading(true);
      setError(null);
      setRecommendedJobs([]);

      const formData = new FormData();
      formData.append('resume', resume);

      const response = await axios.post('http://localhost:5000/api/jobs/recommendations', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.jobs) {
        setRecommendedJobs(response.data.jobs.map((job: Job) => ({
          ...job,
          location: job.location || 'Location not specified',
          salary_min: job.salary_min ?? 0,
          salary_max: job.salary_max ?? 0,
          match_details: {
            overall_match: job.match_details?.overall_match ?? 0,
            technical_match: job.match_details?.technical_match ?? 0,
            semantic_match: job.match_details?.semantic_match ?? 0,
            tfidf_similarity: job.match_details?.tfidf_similarity ?? 0,
            bm25_score: job.match_details?.bm25_score ?? 0
          }
        })));
      } else {
        setError('No matching jobs found');
      }
    } catch (error: any) {
      console.error('Error recommending jobs:', error);
      setError(error.response?.data?.error || 'Failed to get job recommendations');
    } finally {
      setLoading(false);
    }
  }, [resume]);

  useEffect(() => {
    // Add this check to ensure the module is selected and resume exists
    if (selectedModules.includes("Job Recommendations") && resume) {
      handleSubmit();
    }
  }, [selectedModules, resume, handleSubmit]);

  const handleApply = async (jobId: string) => {
    if (!resume) {
      setError('Please upload a resume to apply');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setError('Authentication required. Please log in.');
      return;
    }

    setApplying(jobId);
    setError(null);

    const formData = new FormData();
    formData.append('resume', resume);

    try {
      const response = await axios.post(`http://localhost:5000/api/jobs/${jobId}/apply`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        validateStatus: function (status) {
          return status < 500;
        }
      });

      if (response.status === 401) {
        setError('Your session has expired. Please log in again.');
        return;
      }
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
  console.log("Recommended Jobs:", recommendedJobs);
  return (
    <div className="min-h-screen py-12 relative bg-gradient-to-br from-sky-200 via-sky-300 to-sky-500 bg-fixed">
      <div className="absolute inset-0 bg-white/30 backdrop-blur-sm z-0"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12 animate-fade-in-down">
          <h2 className="text-2xl font-bold text-indigo-700 mb-1 filter drop-shadow-lg">Job Recommendations</h2>
          <p className="text-sm text-indigo-600">Personalized job matches based on your resume</p>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-indigo-200/50 hover:border-indigo-300/50 transition-all duration-300">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Salary (₹)</label>
              <input
                type="number"
                name="salaryMin"
                value={filters.salaryMin}
                onChange={handleFilterChange}
                className="w-full rounded-lg bg-white/50 border-indigo-300 text-indigo-700 placeholder-indigo-400 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500/50 transition-all duration-200"
                placeholder="Enter minimum salary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Salary (₹)</label>
              <input
                type="number"
                name="salaryMax"
                value={filters.salaryMax}
                onChange={handleFilterChange}
                className="w-full rounded-lg bg-white/50 border-indigo-300 text-indigo-700 placeholder-indigo-400 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500/50 transition-all duration-200"
                placeholder="Enter maximum salary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={filters.location}
                onChange={handleFilterChange}
                className="w-full rounded-lg bg-white/50 border-indigo-300 text-indigo-700 placeholder-indigo-400 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500/50 transition-all duration-200"
                placeholder="Enter location"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Technology</label>
              <input
                type="text"
                name="technology"
                value={filters.technology}
                onChange={handleFilterChange}
                className="w-full rounded-lg bg-white/50 border-indigo-300 text-indigo-700 placeholder-indigo-400 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500/50 transition-all duration-200"
                placeholder="Enter technology"
              />
            </div>
          </div>
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

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-indigo-200"></div>
          </div>
        )}

        {!loading && !error && recommendedJobs.length === 0 && (
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl px-8 py-6 mb-6 border border-indigo-200/50 hover:border-indigo-300/50 transition-all duration-300">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-700">No Recommendations</h3>
              <p className="mt-1 text-sm text-gray-600">Please ensure you have uploaded a resume and selected "Job Recommendations" from the modules.</p>
            </div>
          </div>
        )}

        {recommendedJobs.length > 0 && (
          <div className="space-y-6 animate-fade-in-up">
            {filteredJobs.map((job, index) => (
              <div key={job.id} className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden border border-indigo-200/50 hover:border-indigo-300/50 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 transform hover:-translate-y-1">
                <div className="px-8 py-6 bg-gradient-to-r from-indigo-600/20 via-indigo-500/20 to-indigo-400/20 border-b border-indigo-200/30">
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <h3 className="text-2xl font-bold text-indigo-700">{job.name}</h3>
                      <p className="mt-1 text-lg text-indigo-600">{job.position}</p>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-indigo-500">
                        <div className="flex items-center">
                          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {job.location !== 'Location not specified' ? job.location : 'Location not specified'}
                        </div>
                        <div className="ml-4">₹{job.salary_min === job.salary_max ? (job.salary_min?.toLocaleString() || 0) : `${job.salary_min?.toLocaleString() || 0} - ₹${job.salary_max?.toLocaleString() || 0}`}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center bg-indigo-50/80 rounded-lg p-4 shadow-sm border border-indigo-200/50">
                      <p className="text-3xl font-bold text-indigo-600">{((job.match_details?.overall_match ?? 0)*100).toFixed(1)}%</p>
                      <p className="text-sm text-indigo-500">Match Score</p>
                    </div>
                  </div>
                </div>

                <div className="px-8 py-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white/70 backdrop-blur-xl rounded-xl p-4 border border-indigo-200/50 hover:border-indigo-300/50 transition-all duration-300 flex flex-col items-center">
                      <p className="text-xl font-bold text-indigo-600">{((job.match_details?.technical_match ?? 0) * 100).toFixed(1)}%</p>
                      <p className="text-sm text-indigo-500 text-center">Technical Match</p>
                    </div>
                    <div className="bg-white/70 backdrop-blur-xl rounded-xl p-4 border border-indigo-200/50 hover:border-indigo-300/50 transition-all duration-300">
                      <p className="text-xl font-bold text-indigo-600">{((job.match_details?.semantic_match ?? 0) * 100).toFixed(1)}%</p>
                      <p className="text-sm text-indigo-500">Semantic Match</p>
                    </div>
                    <div className="bg-white/70 backdrop-blur-xl rounded-xl p-4 border border-indigo-200/50 hover:border-indigo-300/50 transition-all duration-300">
                      <p className="text-xl font-bold text-indigo-600">{((job.match_details?.tfidf_similarity ?? 0) * 100).toFixed(1)}%</p>
                      <p className="text-sm text-indigo-500">TF-IDF Score</p>
                    </div>
                    <div className="bg-white/70 backdrop-blur-xl rounded-xl p-4 border border-indigo-200/50 hover:border-indigo-300/50 transition-all duration-300">
                      <p className="text-xl font-bold text-indigo-600">{((job.match_details?.bm25_score ?? 0) * 100).toFixed(1)}%</p>
                      <p className="text-sm text-indigo-500">BM25 Score</p>
                    </div>
                  </div>

                  <div className="text-indigo-800 bg-white/50 rounded-lg p-6 border border-indigo-200/40 font-['Playfair_Display',_'Merriweather',_serif] text-lg tracking-wide leading-relaxed shadow-inner space-y-4">
                    <div className="flex items-start space-x-3 hover:bg-indigo-100/30 p-3 rounded-lg transition-all duration-300">
                      <span className="flex-shrink-0 w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-300/30 text-indigo-600">{index + 1}</span>
                      <p className="text-indigo-700 pt-1">{job.description}</p>
                    </div>

                    <div className="bg-white/70 backdrop-blur-xl rounded-xl p-6 border border-indigo-200/50 hover:border-indigo-300/50 transition-all duration-300">
                      <h4 className="text-lg font-semibold text-indigo-700 mb-2">Requirements</h4>
                      <p className="text-gray-600">{job.requirements}</p>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => handleApply(job.id)}
                        disabled={applying === job.id}
                        className="px-8 py-3 bg-indigo-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 border border-transparent hover:border-indigo-400 hover:bg-indigo-600"
                      >
                        {applying === job.id ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Applying...
                          </span>
                        ) : (
                          'Apply Now'
                        )}
                      </button>
                    </div>
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

