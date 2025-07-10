import React from 'react';
import LessonForm from '../components/LessonForm';
import { getCurrentUser } from '../services/apiService'; // For role check
import { Navigate } from 'react-router-dom';

function CreateLessonPage() {
  const currentUser = getCurrentUser();

  // Protect route: Only admin, teacher, co-teacher can create
  if (!currentUser || !['admin', 'teacher', 'co-teacher'].includes(currentUser.role)) {
    // Redirect to login or a 'not authorized' page
    // For now, redirecting to lessons list, or home if preferred
    return <Navigate to="/lessons" replace />;
  }

  return (
    <LessonForm />
  );
}

export default CreateLessonPage;
