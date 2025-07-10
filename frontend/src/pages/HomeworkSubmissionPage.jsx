import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getHomeworkById, submitHomework, getCurrentUser } from '../services/apiService';

function HomeworkSubmissionPage() {
  const { id: homeworkId } = useParams();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [homework, setHomework] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFile, setSubmissionFile] = useState(null); // For file uploads
  const [currentSubmissionDetails, setCurrentSubmissionDetails] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');


  const fetchHomework = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const hwData = await getHomeworkById(homeworkId);
      setHomework(hwData);
      // If student has already submitted, pre-fill their submission for editing (if allowed)
      if (hwData.mySubmission) {
        setCurrentSubmissionDetails(hwData.mySubmission);
        setSubmissionText(hwData.mySubmission.textSubmission || '');
        // File path would be hwData.mySubmission.filePath, but we don't pre-fill file inputs.
        // Student would need to re-upload if changing the file.
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch homework details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [homeworkId]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student') {
      navigate('/login'); // Redirect if not a student
      return;
    }
    fetchHomework();
  }, [currentUser, navigate, fetchHomework]);

  const handleFileChange = (e) => {
    setSubmissionFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError('');

    if (!submissionText && !submissionFile) {
      setSubmitError('You must provide either text or a file for submission.');
      setSubmitLoading(false);
      return;
    }

    // TODO: Implement actual file upload logic here if submissionFile exists
    // For now, we'll assume filePath is manually entered or comes from a service
    // In a real app, you'd upload to S3/Firebase Storage and get a URL.
    // For this plan, we'll just pass a placeholder string if a file is selected.
    let filePathPlaceholder = null;
    if (submissionFile) {
        // Placeholder for actual file upload.
        // This would involve using FormData and a specific backend endpoint for uploads.
        // For now, we just indicate a file was selected.
        console.log("File selected:", submissionFile.name); // Log for now
        // In a real app, this would be: filePathPlaceholder = await uploadFileService(submissionFile);
        filePathPlaceholder = `uploads/${submissionFile.name}`; // Highly simplified placeholder
        alert("File upload is not fully implemented in this demo. A placeholder path will be used.");
    }


    try {
      const submissionData = {
        textSubmission: submissionText,
        // filePath: submissionFile ? `placeholder/path/to/${submissionFile.name}` : (currentSubmissionDetails?.filePath || null),
        filePath: filePathPlaceholder || (currentSubmissionDetails?.filePath && !submissionFile ? currentSubmissionDetails.filePath : null),

      };
      await submitHomework(homeworkId, submissionData);
      // Navigate to lesson detail or homework detail page after submission
      navigate(`/lessons/${homework?.lesson?._id || ''}`);
      // Or navigate(`/homework/${homeworkId}`) to see their submission status.
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit homework.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-center">Loading homework...</div>;
  if (error) return <div className="p-4 text-red-500 text-center">Error: {error}</div>;
  if (!homework) return <div className="p-4 text-center">Homework not found.</div>;

  // Check if student is allowed to submit (e.g., not already graded)
  const canSubmit = !currentSubmissionDetails || (currentSubmissionDetails.status !== 'Graded');
    if (currentSubmissionDetails?.status === 'Graded') {
     return (
        <div className="max-w-2xl mx-auto mt-6 p-6 bg-white rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{homework.title}</h2>
            <p className="text-sm text-gray-500 mb-4">Due: {new Date(homework.dueDate).toLocaleDateString()}</p>
            <p className="text-red-600 bg-red-100 p-3 rounded-md">This homework has already been graded. You cannot make further submissions.</p>
            {currentSubmissionDetails.filePath && <p className="mt-2">Your submitted file: <a href={currentSubmissionDetails.filePath} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{currentSubmissionDetails.filePath.split('/').pop()}</a></p>}
            {currentSubmissionDetails.textSubmission && <div className="mt-2"><p className="font-medium">Your Text Submission:</p><pre className="bg-gray-50 p-2 border rounded text-sm whitespace-pre-wrap">{currentSubmissionDetails.textSubmission}</pre></div>}
            {currentSubmissionDetails.grade && <p className="mt-2">Grade: {currentSubmissionDetails.grade}</p>}
            {currentSubmissionDetails.feedback && <p className="mt-2">Feedback: {currentSubmissionDetails.feedback}</p>}
            <Link to={`/lessons/${homework.lesson?._id}`} className="mt-4 inline-block text-indigo-600 hover:underline">
                &larr; Back to Lesson
            </Link>
        </div>
     );
  }


  return (
    <div className="max-w-2xl mx-auto mt-6 p-6 bg-white rounded-lg shadow-xl">
      <Link to={`/lessons/${homework.lesson?._id}`} className="text-sm text-indigo-600 hover:underline mb-3 block">
        &larr; Back to Lesson Details
      </Link>
      <h2 className="text-3xl font-bold text-gray-800 mb-2">{homework.title}</h2>
      <p className="text-md text-gray-600 mb-1">Lesson: {homework.lesson?.topicName}</p>
      <p className="text-sm text-gray-500 mb-4">Due: {new Date(homework.dueDate).toLocaleDateString()}</p>

      <div className="prose max-w-none mb-6">
        <h4 className="font-semibold">Description:</h4>
        <p>{homework.description}</p>
      </div>

      {submitError && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{submitError}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="submissionText" className="block text-sm font-medium text-gray-700">
            Text Submission (if any)
          </label>
          <textarea
            id="submissionText"
            name="submissionText"
            rows="8"
            value={submissionText}
            onChange={(e) => setSubmissionText(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Type your answer here..."
          ></textarea>
        </div>

        <div>
          <label htmlFor="submissionFile" className="block text-sm font-medium text-gray-700">
            File Upload (PDF/Image) (Optional)
          </label>
          <input
            type="file"
            id="submissionFile"
            name="submissionFile"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            accept=".pdf,.jpg,.jpeg,.png"
          />
          {currentSubmissionDetails?.filePath && !submissionFile && (
            <p className="text-xs text-gray-500 mt-1">
                Current file: <a href={currentSubmissionDetails.filePath} target="_blank" rel="noopener noreferrer" className="text-indigo-500">{currentSubmissionDetails.filePath.split('/').pop()}</a>. Uploading a new file will replace it.
            </p>
          )}
        </div>

        {new Date() > new Date(homework.dueDate) && (!currentSubmissionDetails || currentSubmissionDetails.status !== 'Late Submission') && (
            <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded-md">
                The due date has passed. Your submission will be marked as late.
            </p>
        )}


        {canSubmit ? (
            <button
            type="submit"
            disabled={submitLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
            {submitLoading ? 'Submitting...' : (currentSubmissionDetails ? 'Update Submission' : 'Submit Homework')}
            </button>
        ) : (
             <p className="text-gray-600 bg-gray-100 p-3 rounded-md">Submission is not currently allowed (e.g., already graded or past a hard deadline).</p>
        )}
      </form>
    </div>
  );
}

export default HomeworkSubmissionPage;
