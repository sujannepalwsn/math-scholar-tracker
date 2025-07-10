// Basic API service wrapper

const getAuthToken = () => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  return userInfo ? userInfo.token : null;
};

const request = async (url, method = 'GET', body = null, additionalHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error('API Service Error:', error);
    throw error; // Re-throw to be caught by calling component
  }
};

// Lesson Endpoints
export const getLessons = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/lessons?${query}`);
};
export const getLessonById = (id) => request(`/api/lessons/${id}`);
export const createLesson = (lessonData) => request('/api/lessons', 'POST', lessonData);
export const updateLesson = (id, lessonData) => request(`/api/lessons/${id}`, 'PUT', lessonData);
export const deleteLesson = (id) => request(`/api/lessons/${id}`, 'DELETE');

// Homework Endpoints
export const getHomeworks = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/homework?${query}`);
};
export const getHomeworkById = (id) => request(`/api/homework/${id}`);
export const assignHomework = (homeworkData) => request('/api/homework', 'POST', homeworkData);
export const updateHomework = (id, homeworkData) => request(`/api/homework/${id}`, 'PUT', homeworkData);
export const deleteHomework = (id) => request(`/api/homework/${id}`, 'DELETE');
export const submitHomework = (homeworkId, submissionData) => request(`/api/homework/${homeworkId}/submit`, 'POST', submissionData);
// submissionObjectId is the _id of the specific submission document within the homework's submissions array
export const markHomework = (homeworkId, submissionObjectId, markingData) => request(`/api/homework/${homeworkId}/mark/${submissionObjectId}`, 'PUT', markingData);

// User utility
export const getCurrentUser = () => {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
}
