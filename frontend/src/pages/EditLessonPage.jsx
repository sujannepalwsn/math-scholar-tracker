import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import LessonForm from '../components/LessonForm';
import { getCurrentUser } from '../services/apiService'; // For role check

function EditLessonPage() {
  const { id } = useParams(); // Get lesson ID from URL
  const currentUser = getCurrentUser();

  // Protect route: Only admin, teacher, co-teacher can edit
  // Further checks (e.g., if teacher is the creator of the lesson) can be added in LessonForm or backend
  if (!currentUser || !['admin', 'teacher', 'co-teacher'].includes(currentUser.role)) {
    return <Navigate to="/lessons" replace />;
  }

  return (
    <LessonForm lessonId={id} />
  );
}

export default EditLessonPage;
