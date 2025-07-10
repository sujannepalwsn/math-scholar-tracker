import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getLessons, getCurrentUser, deleteLesson } from '../services/apiService';

function LessonsPage() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const currentUser = getCurrentUser();

  const fetchLessons = async () => {
    setLoading(true);
    setError('');
    try {
      // Teachers/Admins see all lessons by default, or can filter
      // Students see lessons for their grade
      const params = {};
      if (currentUser?.role === 'student' && currentUser?.grade) {
        params.grade = currentUser.grade;
      }
      // Add more filters here if needed, e.g., for teachers to filter by their created lessons

      const data = await getLessons(params);
      setLessons(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch lessons.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, [currentUser?.role, currentUser?.grade]);

  const handleDeleteLesson = async (lessonId) => {
    if (window.confirm('Are you sure you want to delete this lesson and all associated homework?')) {
      try {
        await deleteLesson(lessonId);
        setLessons(prevLessons => prevLessons.filter(lesson => lesson._id !== lessonId));
        // Note: Deleting associated homework should be handled by backend logic (cascade or prevented)
        // For now, we assume backend handles this or it's a simple lesson delete.
      } catch (err) {
        setError(err.message || 'Failed to delete lesson.');
        console.error(err);
      }
    }
  };


  if (loading) return <div className="p-4 text-center">Loading lessons...</div>;
  if (error) return <div className="p-4 text-red-500 text-center">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Lessons</h1>
        {(currentUser?.role === 'admin' || currentUser?.role === 'teacher' || currentUser?.role === 'co-teacher') && (
          <Link to="/lessons/new" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Create New Lesson
          </Link>
        )}
      </div>

      {lessons.length === 0 ? (
        <p>No lessons found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map(lesson => (
            <div key={lesson._id} className="bg-white shadow-lg rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-2">{lesson.topicName}</h2>
              <p className="text-gray-600 mb-1"><strong>Subject:</strong> {lesson.subjectArea}</p>
              <p className="text-gray-600 mb-1"><strong>Grade:</strong> {lesson.grade}</p>
              <p className="text-gray-600 mb-3"><strong>Date:</strong> {new Date(lesson.lessonDate).toLocaleDateString()}</p>
              <p className="text-gray-500 text-sm mb-1">Status: <span className="font-medium capitalize">{lesson.status}</span></p>
              {lesson.createdBy && <p className="text-gray-500 text-sm mb-3">Created by: {lesson.createdBy.firstName} {lesson.createdBy.lastName}</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to={`/lessons/${lesson._id}`}
                  className="bg-indigo-500 hover:bg-indigo-700 text-white text-sm py-2 px-3 rounded shadow"
                >
                  View Details
                </Link>
                {(currentUser?.role === 'admin' || (currentUser?._id === lesson.createdBy?._id && (currentUser?.role === 'teacher' || currentUser?.role === 'co-teacher'))) && (
                  <>
                    <Link
                      to={`/lessons/edit/${lesson._id}`}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm py-2 px-3 rounded shadow"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteLesson(lesson._id)}
                      className="bg-red-500 hover:bg-red-700 text-white text-sm py-2 px-3 rounded shadow"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LessonsPage;
