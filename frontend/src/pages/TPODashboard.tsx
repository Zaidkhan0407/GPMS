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
}

const TPODashboard: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [hrEmail, setHrEmail] = useState('');
  const [hrCode, setHrCode] = useState('');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const token = getAuthToken();
      const response = await axios.get('http://localhost:5000/api/companies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompanies(response.data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      if (editingCompany) {
        const response = await axios.put(`http://localhost:5000/api/companies/${editingCompany._id}`, {
          name,
          position,
          description,
          requirements,
          hr_email: hrEmail,
          hr_code: hrCode
        }, {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          }
        });
        
        if (response.status === 200) {
          setEditingCompany(null);
          setName('');
          setPosition('');
          setDescription('');
          setRequirements('');
          setHrEmail('');
          setHrCode('');
          fetchCompanies();
        } else {
          console.error('Failed to update company:', response);
          alert('Failed to update company. Please try again.');
        }
      } else {
        await axios.post('http://localhost:5000/api/companies', {
          name,
          position,
          description,
          requirements,
          hr_email: hrEmail,
          hr_code: hrCode
        }, {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          }
        });
        setName('');
        setPosition('');
        setDescription('');
        setRequirements('');
        setHrEmail('');
        setHrCode('');
        fetchCompanies();
      }
    } catch (error) {
      console.error('Error submitting company:', error);
      alert('Error submitting company. Please try again.');
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setName(company.name);
    setPosition(company.position);
    setDescription(company.description);
    setRequirements(company.requirements);
    setHrEmail(company.hr_email);
    setHrCode(company.hr_code);
  };

  const handleCancelEdit = () => {
    setEditingCompany(null);
    setName('');
    setPosition('');
    setDescription('');
    setRequirements('');
    setHrEmail('');
    setHrCode('');
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">TPO Dashboard</h1>
      
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-bold mb-4">{editingCompany ? 'Edit Job Listing' : 'Add New Company'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Company Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Job Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            ></textarea>
          </div>
          <div>
            <label htmlFor="requirements" className="block text-sm font-medium text-gray-700">Requirements</label>
            <textarea
              id="requirements"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            ></textarea>
          </div>
          <div>
            <label htmlFor="hrEmail" className="block text-sm font-medium text-gray-700">HR Email</label>
            <input
              type="email"
              id="hrEmail"
              value={hrEmail}
              onChange={(e) => setHrEmail(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter a unique code for HR authentication"
            />
          </div>
          <div className="flex space-x-4">
            <button
              type="submit"
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {editingCompany ? 'Update Job' : 'Add Company'}
            </button>
            {editingCompany && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Added Companies</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <div key={company._id} className="bg-white shadow-md rounded-lg p-6">
              <h3 className="text-lg font-semibold">{company.name}</h3>
              <p className="text-sm text-gray-600">{company.position}</p>
              <p className="mt-2 text-sm text-gray-800">{company.description}</p>
              <p className="mt-2 text-sm font-medium">Requirements:</p>
              <p className="text-sm text-gray-800">{company.requirements}</p>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600">HR Email: {company.hr_email}</p>
                <p className="text-sm text-gray-600">HR Code: {company.hr_code}</p>
                <div className="mt-2 flex space-x-2">
                  <button
                    onClick={() => handleEdit(company)}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(company._id)}
                    className="px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Delete Job
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TPODashboard;