import express from 'express';
import Lesson from '../models/LessonModel.js';
import { protect, authorize } ROKEN_STRIPPED_VALUE // (e.g., ['admin', 'teacher', 'co-teacher'])
router.post(
  '/',
  protect,
  authorize(['admin', 'teacher', 'co-teacher']),
  async (req, res) => {
    const { topicName, subjectArea, grade, lessonDate, resources, status } = req.body;
    try {
      if (!topicName || !subjectArea || !grade || !lessonDate) {
        return res.status(400).json({ message: 'Missing required fields for lesson' });
      }
      const lesson = new Lesson({
        topicName,
        subjectArea,
        grade,
        lessonDate,
        resources: resources || [],
        status: status || 'planned',
        createdBy: req.user._id, // User from 'protect' middleware
      });
      const createdLesson = await lesson.save();
      res.status(201).json(createdLesson);
    } catch (error) {
      console.error("Error creating lesson:", error);
      res.status(500).json({ message: 'Server error creating lesson', error: error.message });
    }
  }
);

// @desc    Get all lessons (can be filtered by grade, subject, etc. via query params)
// @route   GET /api/lessons
// @access  Private (students, parents, teachers, admin)
router.get('/', protect, async (req, res) => {
  try {
    const { grade, subjectArea, dateFrom, dateTo, teacherId } = req.query;
    const filter = {};
    if (grade) filter.grade = grade;
    if (subjectArea) filter.subjectArea = { $regex: subjectArea, $options: 'i' }; // Case-insensitive search
    if (dateFrom || dateTo) {
      filter.lessonDate = {};
      if (dateFrom) filter.lessonDate.$gte = new Date(dateFrom);
      if (dateTo) filter.lessonDate.$lte = new Date(dateTo);
    }
    if (teacherId) filter.createdBy = teacherId;

    // For students/parents, maybe only show lessons relevant to their grade?
    // This logic can be enhanced based on user role.
    if (req.user.role === 'student' && req.user.grade) {
        filter.grade = req.user.grade;
    }
    // TODO: For parents, filter by their children's grades.

    const lessons = await Lesson.find(filter).populate('createdBy', 'firstName lastName email').sort({ lessonDate: -1 });
    res.json(lessons);
  } catch (error) {
    console.error("Error fetching lessons:", error);
    res.status(500).json({ message: 'Server error fetching lessons', error: error.message });
  }
});

// @desc    Get a single lesson by ID
// @route   GET /api/lessons/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate('createdBy', 'firstName lastName email');
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Optional: Check if student/parent has access to this lesson's grade
    if ((req.user.role === 'student' || req.user.role === 'parent') && lesson.grade !== req.user.grade) {
        // This assumes parent's profile also has a 'grade' field matching their child, or requires linking children to parent.
        // For now, a student can only see lessons of their own grade.
        // Parent access needs more sophisticated logic (e.g. check against linked children's grades)
        // For simplicity, if user is a student and lesson grade doesn't match, deny.
        if (req.user.role === 'student' && lesson.grade !== req.user.grade) {
             return res.status(403).json({ message: 'Not authorized to view this lesson' });
        }
    }

    res.json(lesson);
  } catch (error) {
    console.error("Error fetching lesson:", error);
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Lesson not found (invalid ID format)' });
    }
    res.status(500).json({ message: 'Server error fetching lesson', error: error.message });
  }
});

// @desc    Update a lesson
// @route   PUT /api/lessons/:id
// @access  Private (creator, admin, teacher with rights)
router.put(
  '/:id',
  protect,
  authorize(['admin', 'teacher', 'co-teacher']),
  async (req, res) => {
    try {
      const lesson = await Lesson.findById(req.params.id);
      if (!lesson) {
        return res.status(404).json({ message: 'Lesson not found' });
      }

      // Authorization: Only creator or admin can update
      if (lesson.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'User not authorized to update this lesson' });
      }

      const { topicName, subjectArea, grade, lessonDate, resources, status } = req.body;

      lesson.topicName = topicName || lesson.topicName;
      lesson.subjectArea = subjectArea || lesson.subjectArea;
      lesson.grade = grade || lesson.grade;
      lesson.lessonDate = lessonDate || lesson.lessonDate;
      lesson.resources = resources !== undefined ? resources : lesson.resources;
      lesson.status = status || lesson.status;

      const updatedLesson = await lesson.save();
      res.json(updatedLesson);
    } catch (error) {
      console.error("Error updating lesson:", error);
      if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Lesson not found (invalid ID format)' });
      }
      res.status(500).json({ message: 'Server error updating lesson', error: error.message });
    }
  }
);

// @desc    Delete a lesson
// @route   DELETE /api/lessons/:id
// @access  Private (creator, admin, teacher with rights)
router.delete(
  '/:id',
  protect,
  authorize(['admin', 'teacher', 'co-teacher']),
  async (req, res) => {
    try {
      const lesson = await Lesson.findById(req.params.id);
      if (!lesson) {
        return res.status(404).json({ message: 'Lesson not found' });
      }

      // Authorization: Only creator or admin can delete
      if (lesson.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'User not authorized to delete this lesson' });
      }

      // TODO: Consider what happens to homework associated with this lesson.
      // Option 1: Delete them (cascade delete - implement in pre-remove hook on Lesson model or here)
      // Option 2: Unlink them (set lesson field to null - may not make sense)
      // Option 3: Prevent deletion if homework exists.
      // For now, just deleting the lesson.
      // await Homework.deleteMany({ lesson: lesson._id }); // Example of cascade delete

      await lesson.deleteOne(); // Mongoose v6+
      // For older Mongoose: await lesson.remove();

      res.json({ message: 'Lesson removed successfully' });
    } catch (error) {
      console.error("Error deleting lesson:", error);
       if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Lesson not found (invalid ID format)' });
      }
      res.status(500).json({ message: 'Server error deleting lesson', error: error.message });
    }
  }
);

export default router;
