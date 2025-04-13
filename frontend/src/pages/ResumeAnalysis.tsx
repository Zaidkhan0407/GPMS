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
      const result = response.data.result || response.data;
      const cleanResult = typeof result === 'string' ? result.replace(/\*\*/g, '') : JSON.stringify(result, null, 2);
      setAnalysis(cleanResult);
    } catch (error) {
      console.error('Error analyzing resume:', error);
      setError('An error occurred while analyzing the resume. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-deep-purple-900 to-black py-12 animate-gradient-x">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 animate-fade-in-down">
          <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-300 mb-4 filter drop-shadow-lg hover:scale-105 transition-all duration-300 font-['Playfair_Display']">
            Resume Analysis
          </h1>
          <p className="text-xl text-purple-300 font-medium tracking-wide">Get detailed insights and improvements for your resume</p>
        </div>
    
        {loading && (
          <div className="flex justify-center items-center my-8">
            <div className="w-12 h-12 border-4 border-purple-300 border-t-purple-100 rounded-full animate-spin shadow-lg"></div>
          </div>
        )}

        {error && (
          <div className="mb-8 transform hover:scale-102 transition-all duration-300 animate-fade-in">
            <div className="bg-deep-purple-900/50 backdrop-blur-xl border-l-4 border-red-400 rounded-lg p-5 shadow-lg hover:shadow-purple-500/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-400 font-medium">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
    
        {analysis && (
          <div className="transform hover:scale-102 transition-all duration-300 animate-fade-in-up">
            <div className="bg-deep-purple-900/30 backdrop-blur-xl rounded-xl shadow-xl overflow-hidden border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300">
              <div className="px-6 py-4 bg-gradient-to-r from-deep-purple-900/60 via-deep-purple-800/60 to-deep-purple-700/60 border-b border-purple-600/40">
                <h2 className="text-2xl font-bold text-purple-300 mb-1 filter drop-shadow-lg">Analysis Results</h2>
                <p className="text-sm text-purple-400">Detailed feedback and suggestions for your resume</p>
              </div>
              <div className="px-6 py-4 hover:bg-deep-purple-800/30 transition-colors duration-300">
                <div className="max-w-none">
                  <div className="whitespace-pre-wrap text-purple-200 bg-deep-purple-900/40 rounded-lg p-4 border border-purple-600/40 font-['Playfair_Display',_'Merriweather',_serif] text-lg tracking-wide leading-relaxed shadow-inner">{analysis}</div>
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
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 border border-transparent hover:border-purple-400"
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