import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getLessonById, getHomeworks, getCurrentUser, deleteHomework, assignHomework } from '../services/apiService';

// Homework Assignment Form (Modal or inline)
function AssignHomeworkForm({ lessonId, lessonGrade, onHomeworkAssigned }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !dueDate) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const homeworkData = { lessonId, title, description, dueDate, grade: lessonGrade };
      const newHomework = await assignHomework(homeworkData);
      onHomeworkAssigned(newHomework); // Callback to update parent state
      setTitle(''); setDescription(''); setDueDate(''); // Reset form
    } catch (err) {
      setError(err.message || 'Failed to assign homework.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-6 p-4 border rounded-lg bg-gray-50">
      <h3 className="text-xl font-semibold mb-3">Assign New Homework</h3>
      {error && <p className="text-red-500 bg-red-100 p-2 rounded mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="hwTitle" className="block text-sm font-medium text-gray-700">Title</label>
          <input type="text" id="hwTitle" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label htmlFor="hwDesc" className="block text-sm font-medium text-gray-700">Description</label>
          <textarea id="hwDesc" value={description} onChange={(e) => setDescription(e.target.value)} required rows="3" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"></textarea>
        </div>
        <div>
          <label htmlFor="hwDueDate" className="block text-sm font-medium text-gray-700">Due Date</label>
          <input type="date" id="hwDueDate" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <button type="submit" disabled={loading} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50">
          {loading ? 'Assigning...' : 'Assign Homework'}
        </button>
      </form>
    </div>
  );
}


function LessonDetailPage() {
  const { id: lessonId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAssignHomeworkForm, setShowAssignHomeworkForm] = useState(false);
  const currentUser = getCurrentUser();
  const navigate = useNavigate();

  const fetchLessonAndHomeworks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const lessonData = await getLessonById(lessonId);
      setLesson(lessonData);

      // Students should only see homework relevant to them (already handled by backend if student makes request)
      // Teachers see all homework for this lesson
      const homeworkParams = { lessonId };
      const homeworkData = await getHomeworks(homeworkParams);
      setHomeworks(homeworkData);

    } catch (err) {
      setError(err.message || 'Failed to fetch lesson details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchLessonAndHomeworks();
  }, [fetchLessonAndHomeworks]);

  const handleHomeworkAssigned = (newHomework) => {
    setHomeworks(prev => [...prev, newHomework]);
    setShowAssignHomeworkForm(false); // Optionally hide form after assignment
  };

  const handleDeleteHomework = async (homeworkId) => {
    if (window.confirm('Are you sure you want to delete this homework?')) {
        try {
            await deleteHomework(homeworkId);
            setHomeworks(prevHomeworks => prevHomeworks.filter(hw => hw._id !== homeworkId));
        } catch (err) {
            setError(err.message || 'Failed to delete homework.');
            console.error(err);
        }
    }
  };


  if (loading) return <div className="p-4 text-center">Loading lesson details...</div>;
  if (error) return <div className="p-4 text-red-500 text-center">Error: {error} <button onClick={() => navigate('/lessons')} className="text-blue-500 underline ml-2">Go back to lessons</button></div>;
  if (!lesson) return <div className="p-4 text-center">Lesson not found. <button onClick={() => navigate('/lessons')} className="text-blue-500 underline ml-2">Go back to lessons</button></div>;

  const canManageLesson = currentUser?.role === 'admin' || (currentUser && (currentUser.role === 'teacher' || currentUser.role === 'co-teacher') && lesson.createdBy?._id === currentUser._id);
  const canAssignHomework = currentUser?.role === 'admin' || currentUser?.role === 'teacher' || currentUser?.role === 'co-teacher';


  return (
    <div className="container mx-auto p-4">
      <div className="bg-white shadow-xl rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">{lesson.topicName}</h1>
                <p className="text-lg text-gray-600">Subject: {lesson.subjectArea} | Grade: {lesson.grade}</p>
            </div>
            {canManageLesson && (
                 <Link to={`/lessons/edit/${lesson._id}`} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded text-sm">
                    Edit Lesson
                </Link>
            )}
        </div>
        <p className="text-gray-700 mb-2"><strong>Date:</strong> {new Date(lesson.lessonDate).toLocaleDateString()}</p>
        <p className="text-gray-700 mb-1"><strong>Status:</strong> <span className="capitalize font-medium">{lesson.status}</span></p>
        {lesson.createdBy && <p className="text-sm text-gray-500 mb-4">Created by: {lesson.createdBy.firstName} {lesson.createdBy.lastName}</p>}

        {lesson.resources && lesson.resources.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xl font-semibold mb-2 text-gray-700">Resources:</h3>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {lesson.resources.map((resource, index) => (
                <li key={index} className="text-gray-600">
                  {resource.url ? (
                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                      {resource.name} ({resource.type})
                    </a>
                  ) : (
                    <span>{resource.name} ({resource.type}): {resource.content?.substring(0,100)}{resource.content?.length > 100 ? '...' : ''}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-white shadow-xl rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Homework</h2>
            {canAssignHomework && (
                <button
                    onClick={() => setShowAssignHomeworkForm(!showAssignHomeworkForm)}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-3 rounded text-sm"
                >
                    {showAssignHomeworkForm ? 'Cancel Assignment' : 'Assign New Homework'}
                </button>
            )}
        </div>

        {showAssignHomeworkForm && canAssignHomework && (
          <AssignHomeworkForm lessonId={lesson._id} lessonGrade={lesson.grade} onHomeworkAssigned={handleHomeworkAssigned} />
        )}

        {homeworks.length === 0 ? (
          <p className="text-gray-600">No homework assigned for this lesson yet.</p>
        ) : (
          <div className="space-y-4">
            {homeworks.map(hw => {
              const isTeacherOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'teacher' || currentUser?.role === 'co-teacher';
              const canManageHw = isTeacherOrAdmin && (hw.assignedBy?._id === currentUser._id || currentUser.role === 'admin');
              const mySubmission = currentUser?.role === 'student' ? hw.mySubmission : null;

              return (
                <div key={hw._id} className="border rounded-md p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-semibold text-indigo-700">{hw.title}</h3>
                    <div className="text-sm text-gray-500">
                      Due: {new Date(hw.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                  <p className="text-gray-600 mt-1 mb-2 text-sm">{hw.description.substring(0,150)}{hw.description.length > 150 ? '...' : ''}</p>
                  {hw.assignedBy && <p className="text-xs text-gray-400 mb-2">Assigned by: {hw.assignedBy.firstName}</p>}

                  {/* Student's view of their submission */}
                  {currentUser?.role === 'student' && (
                    <div className="mt-2 text-sm">
                      {mySubmission ? (
                        <div>
                          <p>Your Status: <span className={`font-semibold ${mySubmission.status === 'Graded' ? 'text-green-600' : 'text-yellow-600'}`}>{mySubmission.status}</span></p>
                          {mySubmission.grade && <p>Your Grade: {mySubmission.grade}</p>}
                          {mySubmission.status !== 'Submitted' && mySubmission.status !== 'Late Submission' && mySubmission.status !== 'Graded' && (
                            <Link to={`/homework/${hw._id}/submit`} className="text-blue-600 hover:underline font-medium">
                              Submit/Update Your Work
                            </Link>
                          )}
                           { (mySubmission.status === 'Submitted' || mySubmission.status === 'Late Submission') && <p className="text-gray-500">Submitted on {new Date(mySubmission.submittedAt).toLocaleDateString()}</p>}
                           <Link to={`/homework/${hw._id}`} className="ml-2 text-gray-600 hover:underline text-xs">View Details</Link>
                        </div>
                      ) : (
                        <Link to={`/homework/${hw._id}/submit`} className="text-green-600 hover:underline font-semibold">
                          Submit Your Homework
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Teacher/Admin view of homework */}
                  {isTeacherOrAdmin && (
                    <div className="mt-3 flex flex-wrap gap-2 items-center">
                       <Link
                        to={`/homework/${hw._id}`} // Teacher views details, submissions, and can grade from there
                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-3 rounded shadow"
                      >
                        View Submissions & Details
                      </Link>
                      {canManageHw && (
                        <>
                          {/* <Link to={`/homework/edit/${hw._id}`} className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs py-1 px-3 rounded shadow">Edit Details</Link> */}
                          <button onClick={() => handleDeleteHomework(hw._id)} className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-3 rounded shadow">Delete Homework</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default LessonDetailPage;
