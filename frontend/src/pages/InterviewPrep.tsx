import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthToken } from '../context/AuthContext';

interface InterviewPrepProps {
  resume: File | null;
  selectedModules: string[];
}

const InterviewPrep: React.FC<InterviewPrepProps> = ({ resume }) => {
  const [questions, setQuestions] = useState<string[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (resume) {
      handleExtractQuestions();
    }
  }, [resume]);

  const handleExtractQuestions = async () => {
    if (!resume) {
      setError('Please upload a resume');
      return;
    }

    setLoading(true);
    setError('');
    setQuestions([]);

    const formData = new FormData();
    formData.append('resume', resume);
    formData.append('action', 'questions');

    try {
      const token = getAuthToken();
      const response = await axios.post('http://localhost:5000/api/analyze-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      setQuestions(response.data.questions);
    } catch (error) {
      console.error('Error extracting questions:', error);
      setError('An error occurred while extracting questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resume || !selectedQuestion || !answer) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setFeedback('');

    try {
      const token = getAuthToken();
      const response = await axios.post(
        'http://localhost:5000/api/interview-prep',
        {
          resume_text: resume ? await resume.text() : null,
          question: selectedQuestion,
          answer: answer,
          word_limit: 1000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setFeedback(String(response.data.result));
    } catch (error) {
      console.error('Error during interview preparation:', error);
      setError('An error occurred during interview preparation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 relative bg-gradient-to-br from-sky-200 via-sky-300 to-sky-500 bg-fixed">
      <div className="absolute inset-0 bg-white/30 backdrop-blur-sm z-0"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12 animate-fade-in-down">
          <h1 className="text-6xl font-extrabold text-indigo-600 mb-4 filter drop-shadow-2xl hover:scale-105 transition-all duration-300 font-['Playfair_Display']">Interview Preparation</h1>
          <p className="text-xl text-indigo-700 font-medium tracking-wide drop-shadow-md">Practice and perfect your interview skills with AI-powered feedback</p>
        </div>

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

        {questions.length > 0 && (
          <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in-up">
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-indigo-200/50 hover:border-indigo-300/50 transition-all duration-300 overflow-hidden">
              <div className="px-8 py-6 bg-gradient-to-r from-indigo-500/10 via-indigo-400/10 to-indigo-300/10 border-b border-indigo-200/40">
                <label htmlFor="question" className="block text-xl font-semibold text-indigo-700 mb-2 filter drop-shadow-lg">
                  Select Interview Question
                </label>
                <p className="text-sm text-indigo-600">Choose a question to practice your response</p>
              </div>
              <div className="px-8 py-6 hover:bg-indigo-50/30 transition-colors duration-300">
                <select
                  id="question"
                  value={selectedQuestion}
                  onChange={(e) => setSelectedQuestion(e.target.value)}
                  className="w-full rounded-lg bg-white/50 border-indigo-300 text-indigo-700 placeholder-indigo-400 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500/50 transition-all duration-200"
                >
                  <option value="" className="bg-white text-indigo-700">Select a question</option>
                  {questions.map((q, index) => (
                    <option key={index} value={q} className="py-2 text-indigo-700 bg-white">
                      {q}
                    </option>
                  ))}
                </select>
              </div>
            </div>
  
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-indigo-200/50 hover:border-indigo-300/50 transition-all duration-300 overflow-hidden">
              <div className="px-8 py-6 bg-gradient-to-r from-indigo-500/10 via-indigo-400/10 to-indigo-300/10 border-b border-indigo-200/40">
                <label htmlFor="answer" className="block text-xl font-semibold text-indigo-700 mb-2 filter drop-shadow-lg">
                  Your Answer
                </label>
                <p className="text-sm text-indigo-600">Provide your response to the selected question</p>
              </div>
              <div className="px-8 py-6 hover:bg-teal-50/30 transition-colors duration-300">
                <textarea
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="w-full rounded-lg bg-white/50 border-indigo-300 text-indigo-700 placeholder-indigo-400 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500/50 transition-all duration-200"
                  rows={5}
                  placeholder="Enter your answer to the question"
                />
              </div>
            </div>
  
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-indigo-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 border border-transparent hover:border-indigo-400 hover:bg-indigo-600"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  'Get Feedback'
                )}
              </button>
            </div>
          </form>
        )}
  
        {feedback && (
          <div className="mt-12 transform hover:scale-102 transition-all duration-300 animate-fade-in-up">
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden border border-teal-200/50 hover:border-indigo-300/50 transition-all duration-300">
              <div className="px-8 py-6 bg-gradient-to-r from-indigo-500/10 via-indigo-400/10 to-indigo-300/10 border-b border-indigo-200/40">
                <h2 className="text-2xl font-bold text-indigo-700 mb-1 filter drop-shadow-lg">AI Feedback</h2>
                <p className="text-sm text-indigo-600">Analysis of your interview response</p>
              </div>
              <div className="px-8 py-6 hover:bg-teal-50/30 transition-colors duration-300">
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap text-indigo-700 bg-white/50 rounded-lg p-4 border border-indigo-200/40 hover:border-indigo-300/50 transition-colors duration-300">{feedback}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewPrep;
