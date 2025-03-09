import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthToken } from '../context/AuthContext';

interface ResumeAnalysisProps {
  resume: File | null;
  selectedModules: string[];
}

const ResumeAnalysis: React.FC<ResumeAnalysisProps> = ({ resume, selectedModules }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resume && selectedModules.includes("Resume Analysis")) {
      handleSubmit();
    }
  }, [resume, selectedModules]);

  const handleSubmit = async () => {
    if (!resume) {
      setError('Please upload a resume.');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    const formData = new FormData();
    formData.append('resume', resume);
    formData.append('action', 'improve');

    try {
      const token = getAuthToken();
      const response = await axios.post('http://localhost:5000/api/analyze-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      setAnalysis(response.data.result);
    } catch (error) {
      console.error('Error analyzing resume:', error);
      setError('An error occurred while analyzing the resume. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 animate-gradient-x">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 animate-fade-in-down">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4 filter drop-shadow-lg hover:scale-105 transition-all duration-300">Resume Analysis</h1>
          <p className="text-lg text-gray-600 font-medium">Get detailed insights and improvements for your resume</p>
        </div>
    
        {error && (
          <div className="mb-8 transform hover:scale-102 transition-all duration-300 animate-fade-in">
            <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-5 backdrop-blur-xl shadow-lg hover:shadow-red-500/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
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
    
        {analysis && (
          <div className="transform hover:scale-102 transition-all duration-300 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:border-gray-200 transition-colors duration-300">
              <div className="px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-1 filter drop-shadow-lg">Analysis Results</h2>
                <p className="text-sm text-gray-600">Detailed feedback and suggestions for your resume</p>
              </div>
              <div className="px-8 py-6 hover:bg-gray-50 transition-colors duration-300">
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-gray-700 bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors duration-300">{analysis}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeAnalysis;

