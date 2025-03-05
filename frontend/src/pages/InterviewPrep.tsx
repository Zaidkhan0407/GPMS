import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthToken } from '../context/AuthContext';

interface InterviewPrepProps {
  resume: File | null;
  selectedModules: string[];
}

const InterviewPrep: React.FC<InterviewPrepProps> = ({ resume, selectedModules }) => {
  const [questions, setQuestions] = useState<string[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (resume && selectedModules.includes("Interview Prep")) {
      handleExtractQuestions();
    }
  }, [resume, selectedModules]);

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
          resume_text: resume ? 'test' : null,
          question: selectedQuestion,
          answer: answer
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setFeedback(response.data.result);
    } catch (error) {
      console.error('Error during interview preparation:', error);
      setError('An error occurred during interview preparation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Interview Preparation</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {questions.length > 0 && (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="mb-4">
            <label htmlFor="question" className="block text-sm font-medium text-gray-700">
              Select Interview Question
            </label>
            <select
              id="question"
              value={selectedQuestion}
              onChange={(e) => setSelectedQuestion(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            >
              <option value="">Select a question</option>
              {questions.map((q, index) => (
                <option key={index} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="answer" className="block text-sm font-medium text-gray-700">
              Your Answer
            </label>
            <textarea
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              rows={3}
              placeholder="Enter your answer to the question"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {loading ? 'Analyzing...' : 'Get Feedback'}
          </button>
        </form>
      )}

      {feedback && (
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-2xl font-bold mb-4">Feedback</h2>
          <pre className="whitespace-pre-wrap">{feedback}</pre>
        </div>
      )}
    </div>
  );
};

export default InterviewPrep;
