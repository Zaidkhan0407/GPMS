import { useState } from 'react';
import axios from 'axios';

interface Analysis {
  security_issues: string[];
  performance_optimizations: string[];
  code_quality: string[];
  overall_severity: string;
}

const CodeAnalyzer = () => {
  const [code, setCode] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('security');

  const analyzeCode = async () => {
    try {
      setLoading(true);
      const response = await axios.post('http://localhost:5000/api/analyze-code', { code });
      setAnalysis(response.data.analysis);
    } catch (error) {
      console.error('Error analyzing code:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  const renderIssues = (issues: string[]) => {
    return issues.map((issue, index) => (
      <div key={index} className="p-3 bg-gray-800 rounded-lg mb-2">
        {issue}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">AI Code Review Assistant</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Code Editor */}
          <div className="bg-gray-800 rounded-lg p-4">
            <textarea
              className="w-full h-96 bg-gray-900 text-white p-4 rounded-lg font-mono"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your code here..."
            />
            <button
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              onClick={analyzeCode}
              disabled={loading}
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>

          {/* Analysis Results */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Analysis Results</h2>
              {analysis && (
                <span className={`font-semibold ${getSeverityColor(analysis.overall_severity)}`}>
                  {analysis.overall_severity} Severity
                </span>
              )}
            </div>

            {/* Tabs */}
            <div className="flex mb-4 border-b border-gray-700">
              <button
                className={`px-4 py-2 ${activeTab === 'security' ? 'border-b-2 border-blue-500' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                Security
              </button>
              <button
                className={`px-4 py-2 ${activeTab === 'performance' ? 'border-b-2 border-blue-500' : ''}`}
                onClick={() => setActiveTab('performance')}
              >
                Performance
              </button>
              <button
                className={`px-4 py-2 ${activeTab === 'quality' ? 'border-b-2 border-blue-500' : ''}`}
                onClick={() => setActiveTab('quality')}
              >
                Code Quality
              </button>
            </div>

            {/* Tab Content */}
            <div className="overflow-y-auto h-[calc(100vh-400px)]">
              {analysis ? (
                <div>
                  {activeTab === 'security' && renderIssues(analysis.security_issues)}
                  {activeTab === 'performance' && renderIssues(analysis.performance_optimizations)}
                  {activeTab === 'quality' && renderIssues(analysis.code_quality)}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">
                  {loading ? 'Analyzing your code...' : 'Paste your code and click Analyze to get started'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeAnalyzer;