import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createLesson, updateLesson, getLessonById } from '../services/apiService';

// Reusable Lesson Form Component
function LessonForm({ lessonId }) {
  const [formData, setFormData] = useState({
    topicName: '',
    subjectArea: '',
    grade: '',
    lessonDate: '',
    resources: [{ name: '', type: 'link', url: '' }],
    status: 'planned',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const isEditMode = !!lessonId;

  useEffect(() => {
    if (isEditMode) {
      setLoading(true);
      getLessonById(lessonId)
        .then(data => {
          setFormData({
            topicName: data.topicName,
            subjectArea: data.subjectArea,
            grade: data.grade,
            lessonDate: data.lessonDate ? new Date(data.lessonDate).toISOString().split('T')[0] : '',
            resources: data.resources.length > 0 ? data.resources : [{ name: '', type: 'link', url: '', content: '' }],
            status: data.status || 'planned',
          });
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || 'Failed to fetch lesson details.');
          setLoading(false);
        });
    }
  }, [lessonId, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleResourceChange = (index, e) => {
    const { name, value } = e.target;
    const updatedResources = formData.resources.map((resource, i) =>
      i === index ? { ...resource, [name]: value } : resource
    );
    // If type is 'text', clear URL and vice-versa, ensure content field exists
    if (name === 'type') {
        updatedResources[index] = { ...updatedResources[index], url: value === 'text' ? '' : updatedResources[index].url, content: value === 'text' ? updatedResources[index].content || '' : '' };
    }
    setFormData(prev => ({ ...prev, resources: updatedResources }));
  };

  const addResourceField = () => {
    setFormData(prev => ({
      ...prev,
      resources: [...prev.resources, { name: '', type: 'link', url: '', content: '' }]
    }));
  };

  const removeResourceField = (index) => {
    setFormData(prev => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Filter out empty resources
    const finalResources = formData.resources.filter(r => r.name && (r.url || r.content));
    const lessonData = { ...formData, resources: finalResources };

    // Ensure lessonDate is not empty
    if (!lessonData.lessonDate) {
        setError('Lesson date is required.');
        setLoading(false);
        return;
    }

    try {
      if (isEditMode) {
        await updateLesson(lessonId, lessonData);
      } else {
        await createLesson(lessonData);
      }
      navigate('/lessons'); // Navigate to lessons list after successful operation
    } catch (err) {
      setError(err.message || `Failed to ${isEditMode ? 'update' : 'create'} lesson.`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode && !formData.topicName) return <p>Loading lesson data...</p>;

  return (
    <div className="max-w-2xl mx-auto mt-6 p-6 bg-white rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{isEditMode ? 'Edit Lesson' : 'Create New Lesson'}</h2>
      {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="topicName" className="block text-sm font-medium text-gray-700">Topic Name</label>
          <input type="text" name="topicName" id="topicName" required value={formData.topicName} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        <div>
          <label htmlFor="subjectArea" className="block text-sm font-medium text-gray-700">Subject Area</label>
          <input type="text" name="subjectArea" id="subjectArea" required value={formData.subjectArea} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label htmlFor="grade" className="block text-sm font-medium text-gray-700">Grade (e.g., 8, 9, 10)</label>
          <input type="text" name="grade" id="grade" required value={formData.grade} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label htmlFor="lessonDate" className="block text-sm font-medium text-gray-700">Lesson Date</label>
          <input type="date" name="lessonDate" id="lessonDate" required value={formData.lessonDate} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
          <select name="status" id="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
            <option value="planned">Planned</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <fieldset className="border p-4 rounded-md">
          <legend className="text-lg font-medium text-gray-700 px-1 mb-2">Resources</legend>
          {formData.resources.map((resource, index) => (
            <div key={index} className="space-y-3 border-b pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
              <div className="flex justify-between items-center">
                <h4 className="text-md font-semibold">Resource {index + 1}</h4>
                {formData.resources.length > 1 && (
                    <button type="button" onClick={() => removeResourceField(index)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                )}
              </div>
              <div>
                <label htmlFor={`resourceName-${index}`} className="block text-xs font-medium text-gray-600">Name</label>
                <input type="text" name="name" id={`resourceName-${index}`} value={resource.name} onChange={(e) => handleResourceChange(index, e)} className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm" placeholder="e.g., Chapter 1 PDF" />
              </div>
              <div>
                <label htmlFor={`resourceType-${index}`} className="block text-xs font-medium text-gray-600">Type</label>
                <select name="type" id={`resourceType-${index}`} value={resource.type} onChange={(e) => handleResourceChange(index, e)} className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm">
                  <option value="link">Link</option>
                  <option value="pdf">PDF URL</option>
                  <option value="youtube">YouTube URL</option>
                  <option value="gdrive">Google Drive URL</option>
                  <option value="text">Text Content</option>
                </select>
              </div>
              {resource.type !== 'text' ? (
                <div>
                  <label htmlFor={`resourceUrl-${index}`} className="block text-xs font-medium text-gray-600">URL</label>
                  <input type="url" name="url" id={`resourceUrl-${index}`} value={resource.url} onChange={(e) => handleResourceChange(index, e)} className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm" placeholder="https://example.com/resource" />
                </div>
              ) : (
                 <div>
                  <label htmlFor={`resourceContent-${index}`} className="block text-xs font-medium text-gray-600">Text Content</label>
                  <textarea name="content" id={`resourceContent-${index}`} value={resource.content || ''} onChange={(e) => handleResourceChange(index, e)} rows="3" className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm" placeholder="Enter text content here..."></textarea>
                </div>
              )}
            </div>
          ))}
          <button type="button" onClick={addResourceField} className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            + Add Another Resource
          </button>
        </fieldset>

        <div>
          <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
            {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Lesson' : 'Create Lesson')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default LessonForm;
