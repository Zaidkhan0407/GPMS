import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthToken } from '../context/AuthContext';

interface Company {
  _id: string;
  name: string;
  position: string;
  description: string;
  requirements: string;
  hr_email: string;
  hr_code: string;
  salary_min: number;
  salary_max: number;
  location: string;
}

const TPODashboard: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [hrEmail, setHrEmail] = useState('');
  const [hrCode, setHrCode] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [location, setLocation] = useState('');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setError(null);
      setLoading(true);
      const token = await getAuthToken(); // Ensure this function retrieves the token correctly
      if (!token) {
        setError('Your session has expired. Please login again.');
        setLoading(false);
        window.location.href = '/login';
        return;
      }
      const response = await axios.get('http://localhost:5000/api/companies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(response.data)) {
        setCompanies(response.data);
        setError(null);
      } else {
        setError('Invalid data format received from server');
        setCompanies([]);
      }
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      if (error.response?.status === 401) {
        setError('Your session has expired. Please login again.');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else if (error.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else if (!error.response && error.request) {
        setError('Network error. Please check your connection.');
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch companies. Please try again.';
        setError(errorMessage);
      }
      setCompanies([]);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      const companyData = {
        name,
        position,
        description,
        requirements,
        hr_email: hrEmail,
        hr_code: hrCode,
        salary_min: Number(salaryMin),
        salary_max: Number(salaryMax),
        location
      };

      if (editingCompany) {
        const response = await axios.put(`http://localhost:5000/api/companies/${editingCompany._id}`, companyData, {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          }
        });
        
        if (response.status === 200) {
          resetForm();
          fetchCompanies();
        } else {
          console.error('Failed to update company:', response);
          alert('Failed to update company. Please try again.');
        }
      } else {
        await axios.post('http://localhost:5000/api/companies', companyData, {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          }
        });
        resetForm();
        fetchCompanies();
      }
    } catch (error) {
      console.error('Error submitting company:', error);
      alert('Error submitting company. Please try again.');
    }
  };

  const resetForm = () => {
    setEditingCompany(null);
    setName('');
    setPosition('');
    setDescription('');
    setRequirements('');
    setHrEmail('');
    setHrCode('');
    setSalaryMin('');
    setSalaryMax('');
    setLocation('');
  };

  const handleCancelEdit = () => {
    setEditingCompany(null);
    setName('');
    setPosition('');
    setDescription('');
    setRequirements('');
    setHrEmail('');
    setHrCode('');
    setSalaryMin('');
    setSalaryMax('');
    setLocation('');
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setName(company.name);
    setPosition(company.position);
    setDescription(company.description);
    setRequirements(company.requirements);
    setHrEmail(company.hr_email);
    setHrCode(company.hr_code);
    setSalaryMin(company.salary_min.toString());
    setSalaryMax(company.salary_max.toString());
    setLocation(company.location);
  };

  const handleDelete = async (companyId: string) => {
    if (window.confirm('Are you sure you want to delete this job listing? This action cannot be undone.')) {
      try {
        const token = getAuthToken();
        await axios.delete(`http://localhost:5000/api/companies/${companyId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchCompanies();
      } catch (error) {
        console.error('Error deleting company:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-purple-900 py-12 animate-gradient-x">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 animate-fade-in-down">
          <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-50 via-fuchsia-100 to-purple-200 mb-4 filter drop-shadow-lg hover:scale-105 transition-all duration-300 font-['Playfair_Display']">TPO Dashboard</h1>
          <p className="text-xl text-fuchsia-100 font-medium tracking-wide">Manage job listings and company profiles</p>
        </div>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : (
          <>
            <div className="bg-purple-900/30 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300">
              <h2 className="text-2xl font-bold text-fuchsia-200 mb-6 filter drop-shadow-lg">{editingCompany ? 'Edit Job Listing' : 'Add New Company'}</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Company Name</label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-lg bg-purple-800/50 border-purple-600 text-purple-100 placeholder-purple-400 shadow-sm focus:border-purple-400 focus:ring focus:ring-purple-400/50 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label htmlFor="position" className="block text-sm font-medium text-gray-700">Position</label>
                    <input
                      type="text"
                      id="position"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-lg bg-purple-800/50 border-purple-600 text-purple-100 placeholder-purple-400 shadow-sm focus:border-purple-400 focus:ring focus:ring-purple-400/50 transition-all duration-200"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-purple-200">Job Description</label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={4}
                    className="mt-1 block w-full rounded-lg bg-purple-800/50 border-purple-600 text-purple-100 placeholder-purple-400 shadow-sm focus:border-purple-400 focus:ring focus:ring-purple-400/50 transition-all duration-200"
                  ></textarea>
                </div>
                <div>
                  <label htmlFor="requirements" className="block text-sm font-medium text-purple-200">Requirements</label>
                  <textarea
                    id="requirements"
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    required
                    rows={4}
                    className="mt-1 block w-full rounded-lg bg-purple-800/50 border-purple-600 text-purple-100 placeholder-purple-400 shadow-sm focus:border-purple-400 focus:ring focus:ring-purple-400/50 transition-all duration-200"
                  ></textarea>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                    <input
                      type="text"
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-lg bg-purple-800/50 border-purple-600 text-purple-100 placeholder-purple-400 shadow-sm focus:border-purple-400 focus:ring focus:ring-purple-400/50 transition-all duration-200"
                      placeholder="e.g., New York, NY"
                    />
                  </div>
                  <div>
                    <label htmlFor="hrEmail" className="block text-sm font-medium text-gray-700">HR Email</label>
                    <input
                      type="email"
                      id="hrEmail"
                      value={hrEmail}
                      onChange={(e) => setHrEmail(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-lg bg-purple-800/50 border-purple-600 text-purple-100 placeholder-purple-400 shadow-sm focus:border-purple-400 focus:ring focus:ring-purple-400/50 transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="salaryMin" className="block text-sm font-medium text-gray-700">Minimum Salary</label>
                    <input
                      type="number"
                      id="salaryMin"
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(e.target.value)}
                      required
                      min="0"
                      className="mt-1 block w-full rounded-lg bg-purple-800/50 border-purple-600 text-purple-100 placeholder-purple-400 shadow-sm focus:border-purple-400 focus:ring focus:ring-purple-400/50 transition-all duration-200"
                      placeholder="e.g., 50000"
                    />
                  </div>
                  <div>
                    <label htmlFor="salaryMax" className="block text-sm font-medium text-gray-700">Maximum Salary</label>
                    <input
                      type="number"
                      id="salaryMax"
                      value={salaryMax}
                      onChange={(e) => setSalaryMax(e.target.value)}
                      required
                      min="0"
                      className="mt-1 block w-full rounded-lg bg-purple-800/50 border-purple-600 text-purple-100 placeholder-purple-400 shadow-sm focus:border-purple-400 focus:ring focus:ring-purple-400/50 transition-all duration-200"
                      placeholder="e.g., 80000"
                    />
                  </div>
                  <div>
                    <label htmlFor="hrCode" className="block text-sm font-medium text-gray-700">HR Code</label>
                    <input
                      type="text"
                      id="hrCode"
                      value={hrCode}
                      onChange={(e) => setHrCode(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-lg bg-purple-800/50 border-purple-600 text-purple-100 placeholder-purple-400 shadow-sm focus:border-purple-400 focus:ring focus:ring-purple-400/50 transition-all duration-200"
                      placeholder="Enter a unique code for HR authentication"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-4">
                  {editingCompany && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-purple-400/50 rounded-xl shadow-sm text-sm font-medium text-purple-100 bg-purple-800/50 hover:bg-purple-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-400 transition-all duration-300"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-700 hover:to-fuchsia-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-400 transition-all duration-300"
                  >
                    {editingCompany ? 'Update Job' : 'Add Company'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-purple-900/30 backdrop-blur-xl rounded-xl shadow-xl overflow-hidden border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300">
              <div className="px-6 py-4 border-b border-purple-600/40 bg-gradient-to-r from-purple-900/60 via-purple-800/60 to-fuchsia-900/60">
                <h2 className="text-xl font-semibold text-fuchsia-200 filter drop-shadow-lg">Current Job Listings</h2>
              </div>
              <div className="divide-y divide-purple-700/30">
                {companies.map((company) => (
                  <div key={company._id} className="p-6 hover:bg-purple-800/30 transition-all duration-300">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-fuchsia-200">{company.name}</h3>
                        <p className="text-sm text-purple-300 mt-1">{company.position}</p>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleEdit(company)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-xl text-purple-100 bg-purple-600/50 hover:bg-purple-500/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-400 transition-all duration-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(company._id)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-xl text-red-100 bg-red-500/50 hover:bg-red-600/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400 transition-all duration-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-purple-200">
                      <p className="font-medium text-fuchsia-200">Description:</p>
                      <p className="mt-1">{company.description}</p>
                      <p className="font-medium text-fuchsia-200 mt-3">Requirements:</p>
                      <p className="mt-1">{company.requirements}</p>
                      <p className="font-medium text-fuchsia-200 mt-3">HR Contact:</p>
                      <p className="mt-1">{company.hr_email}</p>
                      <p className="font-medium text-fuchsia-200 mt-3">Location:</p>
                      <p className="mt-1">{company.location}</p>
                      <p className="font-medium text-fuchsia-200 mt-3">Salary Range:</p>
                      <p className="mt-1">${(company.salary_min || 0).toLocaleString()} - ${(company.salary_max || 0).toLocaleString()}</p>
                      <p className="font-medium text-fuchsia-200 mt-3">HR Code:</p>
                      <p className="mt-1">{company.hr_code}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TPODashboard;