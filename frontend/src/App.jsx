import React from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import LessonsPage from './pages/LessonsPage';
import CreateLessonPage from './pages/CreateLessonPage';
import EditLessonPage from './pages/EditLessonPage';
import LessonDetailPage from './pages/LessonDetailPage';
import HomeworkDetailPage from './pages/HomeworkDetailPage';
import HomeworkSubmissionPage from './pages/HomeworkSubmissionPage';
import { getCurrentUser } from './services/apiService';


// Protected Route Component
const ProtectedRoute = ({ children, roles }) => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(currentUser.role)) {
    // Redirect to a generic dashboard or home if role doesn't match
    return <Navigate to="/" replace />;
  }
  return children;
};


// Basic Navbar component
function Navbar() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    navigate('/login');
  };

  return (
    <nav className="bg-gray-800 text-white p-4 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold hover:text-gray-300">Tuition Tracker</Link>
        <ul className="flex space-x-4 items-center">
          {!currentUser && (
            <>
              <li><Link to="/login" className="hover:text-gray-300">Login</Link></li>
              <li><Link to="/register" className="hover:text-gray-300">Register</Link></li>
            </>
          )}
          {currentUser && (
            <>
              {currentUser.role === 'student' && <li><Link to="/student/dashboard" className="hover:text-gray-300">Dashboard</Link></li>}
              {(currentUser.role === 'admin' || currentUser.role === 'teacher' || currentUser.role === 'co-teacher') &&
                <li><Link to="/lessons" className="hover:text-gray-300">Lessons</Link></li>}
              {/* Add specific dashboards for teacher/admin if LessonsPage isn't it */}
              {currentUser.role === 'admin' && <li><Link to="/admin/dashboard" className="hover:text-gray-300">Admin Panel</Link></li>}

              <li><button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm">Logout ({currentUser.firstName})</button></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}


function HomePage() {
  const currentUser = getCurrentUser();
  return (
    <div className="p-6 text-center">
      <h1 className="text-4xl font-bold mb-6 text-gray-800">Welcome to Tuition Class Management</h1>
      <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
        Efficiently manage your students, lessons, academic progress, and finances. Built for modern educational needs.
      </p>
      {!currentUser && (
        <div className="space-x-4">
          <Link to="/login" className="bg-indigo-600 text-white px-8 py-3 rounded-md hover:bg-indigo-700 text-lg shadow-md">
            Login
          </Link>
          <Link to="/register" className="bg-green-500 text-white px-8 py-3 rounded-md hover:bg-green-600 text-lg shadow-md">
            Register
          </Link>
        </div>
      )}
       {currentUser && (
        <div className="mt-8">
          <p className="text-xl text-gray-700">You are logged in as {currentUser.firstName} ({currentUser.role}).</p>
           {currentUser.role === 'student' && <Link to="/student/dashboard" className="mt-4 inline-block text-indigo-600 hover:underline text-lg">Go to Your Dashboard</Link>}
           {(currentUser.role === 'admin' || currentUser.role === 'teacher' || currentUser.role === 'co-teacher') &&
            <Link to="/lessons" className="mt-4 inline-block text-indigo-600 hover:underline text-lg">Manage Lessons</Link>}
        </div>
      )}
    </div>
  );
}

// Placeholder for Privacy Policy Page
function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto p-6 prose">
      <h1>Privacy Policy</h1>
      <p>Effective Date: July 10, 2024</p>
      <p>This is a placeholder for your privacy policy. You should replace this with your actual policy, detailing data collection, usage, storage, user rights, and contact information relevant to GDPR/FERPA or other applicable regulations.</p>
      <h2>Information We Collect</h2>
      <p>We collect information you provide directly to us, such as when you create an account, register a student, submit homework, or communicate with us. This may include personal identification information, contact details, academic information, and payment details (if applicable).</p>
      <h2>How We Use Your Information</h2>
      <p>To provide and improve our services, manage accounts, process payments, communicate with users, track academic progress, and ensure platform security.</p>
      <h2>Data Security</h2>
      <p>We implement reasonable measures to protect your information from unauthorized access, use, or disclosure.</p>
      <h2>Your Rights</h2>
      <p>You may have rights to access, correct, or delete your personal information under applicable laws.</p>
      <h2>Contact Us</h2>
      <p>If you have questions about this privacy policy, please contact us at [Your Contact Email/Address].</p>
    </div>
  )
}


function App() {
  const teacherAdminRoles = ['admin', 'teacher', 'co-teacher'];
  const studentRole = ['student'];

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Navbar />
      <main className="container mx-auto mt-6 mb-6 p-4 flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />

          {/* Student Routes */}
          <Route path="/student/dashboard" element={<ProtectedRoute roles={studentRole}><StudentDashboardPage /></ProtectedRoute>} />
          <Route path="/homework/:id/submit" element={<ProtectedRoute roles={studentRole}><HomeworkSubmissionPage /></ProtectedRoute>} />

          {/* Teacher/Admin/Co-Teacher Routes */}
          <Route path="/lessons" element={<ProtectedRoute roles={teacherAdminRoles}><LessonsPage /></ProtectedRoute>} />
          <Route path="/lessons/new" element={<ProtectedRoute roles={teacherAdminRoles}><CreateLessonPage /></ProtectedRoute>} />
          <Route path="/lessons/edit/:id" element={<ProtectedRoute roles={teacherAdminRoles}><EditLessonPage /></ProtectedRoute>} />
          {/* Lesson Detail is accessible to students too, but homework assignment part is role-based within component */}
          <Route path="/lessons/:id" element={<ProtectedRoute roles={['student', ...teacherAdminRoles]}><LessonDetailPage /></ProtectedRoute>} />

          {/* Homework Detail page can be viewed by students (shows their submission) or teachers (shows all submissions) */}
          <Route path="/homework/:id" element={<ProtectedRoute roles={['student', ...teacherAdminRoles]}><HomeworkDetailPage /></ProtectedRoute>} />

          {/* Admin Only Routes (Example) */}
          <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin']}><AdminDashboardPage /></ProtectedRoute>} />

          {/* Fallback for non-matched routes or redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="bg-gray-800 text-white text-center p-4 text-sm">
        © {new Date().getFullYear()} Tuition Tracker. All rights reserved. <Link to="/privacy-policy" className="hover:underline">Privacy Policy</Link>
      </footer>
    </div>
  );
}

export default App;
