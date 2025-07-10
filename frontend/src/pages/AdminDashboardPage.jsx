import React from 'react';

function AdminDashboardPage() {
  // Basic check for user info, ideally use AuthContext
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));

  if (!userInfo || userInfo.role !== 'admin') {
    // Redirect to login or show error
    return <div className="p-4">Access Denied. Please login as an admin.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <p>Welcome, Admin {userInfo.firstName}!</p>
      {/* More admin-specific content will go here */}
    </div>
  );
}

export default AdminDashboardPage;
