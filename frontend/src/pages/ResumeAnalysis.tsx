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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Resume Analysis</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {analysis && (
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-2xl font-bold mb-4">Analysis Results</h2>
          <pre className="whitespace-pre-wrap">{analysis}</pre>
        </div>
      )}
    </div>
  );
};

export default ResumeAnalysis;

