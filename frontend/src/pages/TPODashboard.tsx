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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">TPO Dashboard</h1>
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
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingCompany ? 'Edit Job Listing' : 'Add New Company'}</h2>
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">Job Description</label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
                  ></textarea>
                </div>
                <div>
                  <label htmlFor="requirements" className="block text-sm font-medium text-gray-700">Requirements</label>
                  <textarea
                    id="requirements"
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    required
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
                      placeholder="Enter a unique code for HR authentication"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-4">
                  {editingCompany && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                  >
                    {editingCompany ? 'Update Job' : 'Add Company'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Current Job Listings</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {companies.map((company) => (
                  <div key={company._id} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{company.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{company.position}</p>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleEdit(company)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(company._id)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                      <p className="font-medium text-gray-700">Description:</p>
                      <p className="mt-1">{company.description}</p>
                      <p className="font-medium text-gray-700 mt-3">Requirements:</p>
                      <p className="mt-1">{company.requirements}</p>
                      <p className="font-medium text-gray-700 mt-3">HR Contact:</p>
                      <p className="mt-1">{company.hr_email}</p>
                      <p className="font-medium text-gray-700 mt-3">Location:</p>
                      <p className="mt-1">{company.location}</p>
                      <p className="font-medium text-gray-700 mt-3">Salary Range:</p>
                      <p className="mt-1">${(company.salary_min || 0).toLocaleString()} - ${(company.salary_max || 0).toLocaleString()}</p>
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