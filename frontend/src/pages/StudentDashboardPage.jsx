import React from 'react';

function StudentDashboardPage() {
  // Basic check for user info, ideally use AuthContext
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));

  if (!userInfo || userInfo.role !== 'student') {
    // Redirect to login or show error, for now just a message
    return <div className="p-4">Access Denied. Please login as a student.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Student Dashboard</h1>
      <p>Welcome, {userInfo.firstName}!</p>
      <p>Your Student ID: {userInfo.studentId}</p>
      {/* More dashboard content will go here */}
    </div>
  );
}

export default StudentDashboardPage;
