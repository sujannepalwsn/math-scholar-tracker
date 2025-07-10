import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getHomeworkById, markHomework, getCurrentUser } from '../services/apiService';

// Form for Teacher to Grade/Feedback a single submission
function MarkSubmissionForm({ homeworkId, submission, onMarked }) {
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [studentGrade, setStudentGrade] = useState(submission.grade || ''); // Grade for the homework
  const [status, setStatus] = useState(submission.status || 'Graded');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const markingData = { feedback, studentGrade, status };
      // submission._id is the ID of the subdocument in the submissions array
      const updatedSubmission = await markHomework(homeworkId, submission._id, markingData);
      onMarked(updatedSubmission.submission); // Pass the updated submission back
    } catch (err) {
      setError(err.message || 'Failed to mark homework.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFeedback(submission.feedback || '');
    setStudentGrade(submission.grade || '');
    setStatus(submission.status === 'Pending' || submission.status === 'Submitted' || submission.status === 'Late Submission' ? 'Graded' : submission.status);
  }, [submission]);


  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 border-t space-y-2 bg-gray-50 rounded-b-md">
      {error && <p className="text-red-500 bg-red-100 p-2 rounded text-sm">{error}</p>}
      <div>
        <label htmlFor={`feedback-${submission._id}`} className="block text-xs font-medium text-gray-600">Feedback</label>
        <textarea
          id={`feedback-${submission._id}`}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows="2"
          className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm"
        ></textarea>
      </div>
      <div className="grid grid-cols-2 gap-x-3">
        <div>
          <label htmlFor={`grade-${submission._id}`} className="block text-xs font-medium text-gray-600">Grade/Mark</label>
          <input
            type="text"
            id={`grade-${submission._id}`}
            value={studentGrade}
            onChange={(e) => setStudentGrade(e.target.value)}
            className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm"
            placeholder="e.g., A+, 85/100"
          />
        </div>
        <div>
          <label htmlFor={`status-${submission._id}`} className="block text-xs font-medium text-gray-600">Status</label>
          <select
            id={`status-${submission._id}`}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm"
          >
            <option value="Submitted">Submitted</option>
            <option value="Late Submission">Late Submission</option>
            <option value="Graded">Graded</option>
            <option value="Needs Revision">Needs Revision</option>
            <option value="Pending">Pending (Not Submitted)</option>
          </select>
        </div>
      </div>
      <button type="submit" disabled={loading} className="bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-3 rounded shadow disabled:opacity-50">
        {loading ? 'Saving...' : 'Save Marks & Feedback'}
      </button>
    </form>
  );
}


function HomeworkDetailPage() {
  const { id: homeworkId } = useParams();
  const [homework, setHomework] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visibleMarkForm, setVisibleMarkForm] = useState(null); // To toggle individual marking forms
  const currentUser = getCurrentUser();

  const fetchHomeworkDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getHomeworkById(homeworkId);
      setHomework(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch homework details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [homeworkId]);

  useEffect(() => {
    fetchHomeworkDetails();
  }, [fetchHomeworkDetails]);

  const handleSubmissionMarked = (updatedSubmission) => {
    setHomework(prevHomework => {
      const updatedSubmissions = prevHomework.submissions.map(sub =>
        sub._id === updatedSubmission._id ? updatedSubmission : sub
      );
      return { ...prevHomework, submissions: updatedSubmissions };
    });
    setVisibleMarkForm(null); // Hide form after marking
  };

  // Check if current user can manage this homework (is admin or assigned this homework)
  const canManageHomework = currentUser?.role === 'admin' ||
                           (homework && (currentUser?.role === 'teacher' || currentUser?.role === 'co-teacher') && homework.assignedBy?._id === currentUser._id);


  if (loading) return <div className="p-4 text-center">Loading homework details...</div>;
  if (error) return <div className="p-4 text-red-500 text-center">Error: {error}</div>;
  if (!homework) return <div className="p-4 text-center">Homework not found.</div>;

  // Student view of this page (if they navigate here directly)
  if (currentUser?.role === 'student') {
    const mySubmission = homework.mySubmission; // This field is added by backend for student requests
    return (
         <div className="container mx-auto p-4">
            <div className="bg-white shadow-xl rounded-lg p-6">
                <Link to={`/lessons/${homework.lesson?._id}`} className="text-sm text-indigo-600 hover:underline mb-2 block">&larr; Back to Lesson</Link>
                <h1 className="text-2xl font-bold text-gray-800">{homework.title}</h1>
                <p className="text-md text-gray-500">Part of lesson: {homework.lesson?.topicName || 'N/A'}</p>
                <p className="text-sm text-gray-500 mb-3">Due: {new Date(homework.dueDate).toLocaleDateString()}</p>
                <div className="prose max-w-none mb-4" dangerouslySetInnerHTML={{ __html: homework.description /* Consider sanitizing if HTML */ }} />

                {mySubmission ? (
                    <div className="border p-4 rounded-md bg-gray-50">
                        <h3 className="text-lg font-semibold">Your Submission</h3>
                        <p>Status: <span className={`font-medium ${mySubmission.status === 'Graded' ? 'text-green-600' : 'text-yellow-600'}`}>{mySubmission.status}</span></p>
                        {mySubmission.submittedAt && <p>Submitted: {new Date(mySubmission.submittedAt).toLocaleDateString()}</p>}
                        {mySubmission.filePath && <p>File: <a href={mySubmission.filePath} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">View Submitted File</a></p>}
                        {mySubmission.textSubmission && <div className="mt-2"><p className="font-medium">Text Submission:</p><pre className="bg-white p-2 border rounded text-sm whitespace-pre-wrap">{mySubmission.textSubmission}</pre></div>}
                        {mySubmission.grade && <p>Grade: {mySubmission.grade}</p>}
                        {mySubmission.feedback && <div className="mt-2"><p className="font-medium">Feedback:</p><p className="text-sm">{mySubmission.feedback}</p></div>}

                        {(mySubmission.status !== 'Graded' && mySubmission.status !== 'Submitted' && mySubmission.status !== 'Late Submission') && (
                             <Link to={`/homework/${homework._id}/submit`} className="mt-3 inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                                {mySubmission.filePath || mySubmission.textSubmission ? 'Update Submission' : 'Submit Homework'}
                            </Link>
                        )}
                    </div>
                ) : (
                     <Link to={`/homework/${homework._id}/submit`} className="mt-3 inline-block bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                        Submit Homework
                    </Link>
                )}
            </div>
        </div>
    );
  }


  // Teacher/Admin View
  if (!canManageHomework && currentUser?.role !== 'student') { // Double check if not student and cannot manage
    return <div className="p-4 text-red-500 text-center">You are not authorized to manage this homework.</div>;
  }


  return (
    <div className="container mx-auto p-4">
      <div className="bg-white shadow-xl rounded-lg p-6 mb-6">
        <Link to={`/lessons/${homework.lesson?._id}`} className="text-sm text-indigo-600 hover:underline mb-2 block">&larr; Back to Lesson Details</Link>
        <h1 className="text-3xl font-bold text-gray-800">{homework.title}</h1>
        <p className="text-lg text-gray-600">For Lesson: {homework.lesson?.topicName || 'N/A'} (Grade {homework.grade})</p>
        <p className="text-md text-gray-500">Due: {new Date(homework.dueDate).toLocaleDateString()}</p>
        {homework.assignedBy && <p className="text-sm text-gray-500 mb-3">Assigned by: {homework.assignedBy.firstName}</p>}
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: homework.description /* Consider sanitizing if HTML */ }} />
        {/* Add edit homework details button if needed: <Link to={`/homework/edit/${homework._id}`}>Edit Details</Link> */}
      </div>

      <div className="bg-white shadow-xl rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Student Submissions</h2>
        {homework.submissions && homework.submissions.length > 0 ? (
          <div className="space-y-4">
            {homework.submissions.map(sub => (
              <div key={sub._id} className="border rounded-md shadow-sm overflow-hidden">
                <div className="p-4 bg-white">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-700">
                      {sub.student?.firstName} {sub.student?.lastName} ({sub.student?.studentId || sub.student?.email})
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      sub.status === 'Graded' ? 'bg-green-100 text-green-700' :
                      sub.status === 'Submitted' || sub.status === 'Late Submission' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {sub.status}
                    </span>
                  </div>
                  {sub.submittedAt && <p className="text-xs text-gray-500">Submitted: {new Date(sub.submittedAt).toLocaleString()}</p>}

                  {sub.filePath && (
                    <p className="text-sm mt-2">
                      File: <a href={sub.filePath} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">View Submitted File</a>
                      {/* In a real app, filePath might be an S3 link or similar that needs to be secure or pre-signed */}
                    </p>
                  )}
                  {sub.textSubmission && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Text Submission:</p>
                      <pre className="bg-gray-50 p-2 border rounded text-xs whitespace-pre-wrap">{sub.textSubmission}</pre>
                    </div>
                  )}

                  {sub.status !== 'Pending' && ( // Only show grade/feedback if something was submitted
                    <>
                      {sub.grade && <p className="text-sm mt-1">Current Grade: <strong>{sub.grade}</strong></p>}
                      {sub.feedback && <p className="text-sm mt-1">Current Feedback: <span className="italic">{sub.feedback}</span></p>}

                      <button
                        onClick={() => setVisibleMarkForm(visibleMarkForm === sub._id ? null : sub._id)}
                        className="mt-3 text-sm bg-indigo-500 hover:bg-indigo-600 text-white py-1 px-3 rounded shadow"
                      >
                        {visibleMarkForm === sub._id ? 'Cancel Marking' : 'Mark / Give Feedback'}
                      </button>
                    </>
                  )}
                   {sub.status === 'Pending' && <p className="text-sm mt-2 text-gray-500 italic">No submission yet.</p>}


                </div>
                {visibleMarkForm === sub._id && (
                  <MarkSubmissionForm
                    homeworkId={homework._id}
                    submission={sub}
                    onMarked={handleSubmissionMarked}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No submissions yet for this homework.</p>
        )}
      </div>
    </div>
  );
}

export default HomeworkDetailPage;
