import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthToken } from '../context/AuthContext';

interface ResumeAnalysisProps {
  resume: File | null;
  selectedModules: string[];
}

const ResumeAnalysis: React.FC<ResumeAnalysisProps> = ({ resume }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resume) {
      handleSubmit();
    }
  }, [resume]);

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
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      const improvements = response.data.improvements || [];
      setAnalysis(improvements);
    } catch (error) {
      console.error('Error analyzing resume:', error);
      setError('An error occurred while analyzing the resume. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 relative bg-gradient-to-br from-sky-200 via-sky-300 to-sky-500 bg-fixed">
      <div className="absolute inset-0 bg-white/30 backdrop-blur-sm z-0"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12 animate-fade-in-down">
          <h1 className="text-6xl font-extrabold text-indigo-600 mb-4 filter drop-shadow-2xl hover:scale-105 transition-all duration-300 font-['Playfair_Display']">
            Resume Analysis
          </h1>
          <p className="text-xl text-indigo-700 font-medium tracking-wide drop-shadow-md">Get detailed insights and improvements for your resume</p>
        </div>
    
        {loading && (
          <div className="flex justify-center items-center my-8">
            <div className="w-12 h-12 border-4 border-purple-300 border-t-purple-100 rounded-full animate-spin shadow-lg"></div>
          </div>
        )}

        {error && (
          <div className="mb-8 transform hover:scale-102 transition-all duration-300 animate-fade-in">
            <div className="bg-white/70 backdrop-blur-xl border-l-4 border-red-400 rounded-lg p-5 shadow-lg hover:shadow-teal-200/30">
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
    
        {analysis && (
          <div className="transform hover:scale-102 transition-all duration-300 animate-fade-in-up">
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl overflow-hidden border border-indigo-200/50 hover:border-indigo-300/50 transition-all duration-300">
              <div className="px-6 py-4 bg-gradient-to-r from-indigo-500/10 via-indigo-400/10 to-indigo-300/10 border-b border-indigo-200/40">
                <h2 className="text-2xl font-bold text-indigo-700 mb-1 filter drop-shadow-lg">Analysis Results</h2>
                <p className="text-sm text-indigo-600">Detailed feedback and suggestions for your resume</p>
              </div>
              <div className="px-6 py-4 hover:bg-teal-50/30 transition-colors duration-300">
                <div className="max-w-none">
                <div className="text-indigo-800 bg-white/50 rounded-lg p-6 border border-indigo-200/40 font-['Playfair_Display',_'Merriweather',_serif] text-lg tracking-wide leading-relaxed shadow-inner space-y-4">
                  {Array.isArray(analysis) ? analysis.map((improvement, index) => (
                    <div key={index} className="flex items-start space-x-3 hover:bg-indigo-100/30 p-3 rounded-lg transition-all duration-300">
                      <span className="flex-shrink-0 w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-300/30 text-indigo-600">{index + 1}</span>
                      <p className="text-indigo-700 pt-1">{improvement}</p>
                    </div>
                  )) : null}
                </div>
              </div>
              </div>
            </div>
          </div>
        )}

        {!analysis && !error && !loading && (
          <div className="flex justify-center animate-fade-in-up">
            <button 
              onClick={handleSubmit}
              disabled={!resume}
              className="px-8 py-3 bg-indigo-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 border border-transparent hover:border-indigo-400 hover:bg-indigo-600"
            >
              Analyze Resume
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeAnalysis;