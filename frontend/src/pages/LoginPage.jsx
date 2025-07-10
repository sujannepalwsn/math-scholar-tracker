import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Placeholder for AuthContext or similar state management
// For now, we'll just log the user in and navigate.
// import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // const { login } = useAuth(); // Replace with actual auth context later

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('registered') === 'true') {
      setSuccessMessage('Registration successful! Please log in.');
    }
  }, [location.search]);


  const handleChange = (e) => {
    setFormData(prevState => ({
      ...prevState,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to login');
      }

      console.log('Login successful:', data);
      // login(data); // Call context login function
      localStorage.setItem('userInfo', JSON.stringify(data)); // Basic auth persistence

      // Navigate based on role, or to a default dashboard
      // For now, just navigate to a generic dashboard or home
      navigate(data.role === 'student' ? '/student/dashboard' : data.role === 'admin' ? '/admin/dashboard' : '/');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Login</h2>
      {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</p>}
      {successMessage && <p className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{successMessage}</p>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email_login" className="block text-sm font-medium text-gray-700">Email</label>
          <input type="email" name="email" id="email_login" required value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="password_login" className="block text-sm font-medium text-gray-700">Password</label>
          <input type="password" name="password" id="password_login" required value={formData.password} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        Don't have an account? <button onClick={() => navigate('/register')} className="font-medium text-indigo-600 hover:text-indigo-500">Register here</button>
      </p>
    </div>
  );
}

export default LoginPage;
