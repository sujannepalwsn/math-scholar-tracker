import express from 'express';
import Homework from '../models/HomeworkModel.js';
import Lesson from '../models/LessonModel.js'; // To check lesson existence and grade
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Assign homework for a lesson
// @route   POST /api/homework
// @access  Private (admin, teacher, co-teacher)
router.post(
  '/',
  protect,
  authorize(['admin', 'teacher', 'co-teacher']),
  async (req, res) => {
    const { lessonId, title, description, dueDate } = req.body;
    try {
      if (!lessonId || !title || !description || !dueDate) {
        return res.status(400).json({ message: 'Lesson ID, title, description, and due date are required' });
      }

      const lesson = await Lesson.findById(lessonId);
      if (!lesson) {
        return res.status(404).json({ message: 'Lesson not found, cannot assign homework.' });
      }

      const homework = new Homework({
        lesson: lessonId,
        title,
        description,
        dueDate,
        assignedBy: req.user._id,
        grade: lesson.grade, // Inherit grade from lesson
        submissions: [], // Initialize with empty submissions
      });

      const createdHomework = await homework.save();
      res.status(201).json(createdHomework);
    } catch (error) {
      console.error("Error assigning homework:", error);
      res.status(500).json({ message: 'Server error assigning homework', error: error.message });
    }
  }
);

// @desc    Get all homework (e.g., for a specific lesson, or for a student)
// @route   GET /api/homework
// @access  Private (students, parents, teachers, admin)
router.get('/', protect, async (req, res) => {
  try {
    const { lessonId, studentId, grade } = req.query;
    const filter = {};

    if (lessonId) filter.lesson = lessonId;

    // Filter by user role and context
    if (req.user.role === 'student') {
      // Students see homework for their grade
      filter.grade = req.user.grade;
      // If studentId is provided and matches logged-in student, it's fine.
      // Otherwise, student can only see their own relevant homework.
    } else if (req.user.role === 'teacher' || req.user.role === 'co-teacher' || req.user.role === 'admin') {
      // Teachers/Admins can filter by grade or see all if they have rights.
      if (grade) filter.grade = grade;
      // They can also see homework they assigned
      // filter.assignedBy = req.user._id; // This might be too restrictive, they might want to see all.
    } else if (req.user.role === 'parent') {
      // Parents should see homework for their children's grades.
      // This requires linking parent to children and their grades.
      // For now, if a grade is provided in query and parent is logged in, use it.
      // This part needs refinement based on parent-child relationship data.
      if (grade) filter.grade = grade; // Simple for now
      else { // If no grade, parent might not see any or this needs specific logic
          return res.json([]); // Or fetch based on linked children
      }
    }


    const homeworks = await Homework.find(filter)
      .populate('lesson', 'topicName subjectArea lessonDate')
      .populate('assignedBy', 'firstName lastName')
      .sort({ dueDate: 1 });

    // For students, personalize the submission status in the response
    if (req.user.role === 'student') {
        const personalizedHomeworks = homeworks.map(hw => {
            const mySubmission = hw.submissions.find(sub => sub.student.equals(req.user._id));
            return {
                ...hw.toObject(), // Convert Mongoose doc to plain object
                mySubmission: mySubmission || null // Add student's specific submission details
            };
        });
        return res.json(personalizedHomeworks);
    }

    res.json(homeworks);
  } catch (error) {
    console.error("Error fetching homework:", error);
    res.status(500).json({ message: 'Server error fetching homework', error: error.message });
  }
});

// @desc    Get a single homework by ID
// @route   GET /api/homework/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const homework = await Homework.findById(req.params.id)
      .populate('lesson', 'topicName subjectArea grade')
      .populate('assignedBy', 'firstName lastName')
      .populate('submissions.student', 'firstName lastName email studentId'); // Populate student details in submissions

    if (!homework) {
      return res.status(404).json({ message: 'Homework not found' });
    }

    // Access control: Student should only access homework of their grade.
    if (req.user.role === 'student' && homework.grade !== req.user.grade) {
        return res.status(403).json({ message: 'Not authorized to view this homework' });
    }
    // TODO: Parent access control based on children's grades.

    // If user is student, add their specific submission to the top-level of response for convenience
    if (req.user.role === 'student') {
        const mySubmission = homework.submissions.find(sub => sub.student._id.equals(req.user._id));
        return res.json({ ...homework.toObject(), mySubmission: mySubmission || null });
    }

    res.json(homework);
  } catch (error) {
    console.error("Error fetching homework by ID:", error);
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Homework not found (invalid ID format)' });
    }
    res.status(500).json({ message: 'Server error fetching homework', error: error.message });
  }
});


// @desc    Student submits homework
// @route   POST /api/homework/:id/submit
// @access  Private (student)
router.post(
  '/:id/submit',
  protect,
  authorize('student'),
  async (req, res) => {
    const { filePath, textSubmission } = req.body; // filePath from file upload, or textSubmission
    try {
      const homework = await Homework.findById(req.params.id);
      if (!homework) {
        return res.status(404).json({ message: 'Homework not found' });
      }

      if (homework.grade !== req.user.grade) {
          return res.status(403).json({ message: 'Cannot submit to homework not for your grade.' });
      }

      const now = new Date();
      const submissionStatus = now > new Date(homework.dueDate) ? 'Late Submission' : 'Submitted';

      // Check if submission already exists
      let existingSubmission = homework.submissions.find(sub => sub.student.equals(req.user._id));

      if (existingSubmission) {
        // Update existing submission (e.g., allow resubmission before grading or if needs revision)
        // For now, let's assume an update means replacing the file/text and resetting status if not graded.
        if (existingSubmission.status === 'Graded') {
            return res.status(400).json({ message: 'Homework already graded, cannot resubmit without permission.' });
        }
        existingSubmission.filePath = filePath || existingSubmission.filePath;
        existingSubmission.textSubmission = textSubmission || existingSubmission.textSubmission;
        existingSubmission.status = submissionStatus;
        existingSubmission.submittedAt = now;
        existingSubmission.feedback = ''; // Clear previous feedback on resubmission
        existingSubmission.grade = ''; // Clear previous grade
      } else {
        homework.submissions.push({
          student: req.user._id,
          filePath,
          textSubmission,
          status: submissionStatus,
          submittedAt: now,
        });
      }

      await homework.save();
      // Populate student details for the response of this specific submission
      const updatedHomework = await Homework.findById(req.params.id).populate('submissions.student', 'firstName lastName');
      const mySubmission = updatedHomework.submissions.find(sub => sub.student._id.equals(req.user._id));

      res.status(201).json({ message: 'Homework submitted successfully', submission: mySubmission });
    } catch (error) {
      console.error("Error submitting homework:", error);
      res.status(500).json({ message: 'Server error submitting homework', error: error.message });
    }
  }
);

// @desc    Teacher marks homework and provides feedback for a specific student
// @route   PUT /api/homework/:homeworkId/mark/:submissionId
// @access  Private (admin, teacher, co-teacher)
// Note: submissionId here is the _id of the sub-document in the submissions array.
router.put(
  '/:homeworkId/mark/:submissionObjectId', // submissionObjectId is the _id of the submission subdocument
  protect,
  authorize(['admin', 'teacher', 'co-teacher']),
  async (req, res) => {
    const { feedback, studentGrade, status } = req.body; // studentGrade is the mark for the homework, status is e.g. 'Graded'
    const { homeworkId, submissionObjectId } = req.params;
    try {
      const homework = await Homework.findById(homeworkId);
      if (!homework) {
        return res.status(404).json({ message: 'Homework not found' });
      }

      // Ensure the marker is authorized (e.g. assignedBy this homework or admin)
      if (homework.assignedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'teacher') {
          // A 'teacher' role might be allowed if they teach that grade/subject, more complex logic.
          // For now, only original assigner or admin.
          // Co-teachers might need specific permissions.
      }

      const submission = homework.submissions.id(submissionObjectId);
      if (!submission) {
        return res.status(404).json({ message: 'Student submission not found' });
      }

      submission.feedback = feedback !== undefined ? feedback : submission.feedback;
      submission.grade = studentGrade !== undefined ? studentGrade : submission.grade; // The actual mark/grade for the work
      submission.status = status || 'Graded'; // Update status, e.g., to 'Graded' or 'Needs Revision'

      await homework.save();
      // Populate for response
      const updatedHomework = await Homework.findById(homeworkId)
          .populate('submissions.student', 'firstName lastName email studentId');
      const updatedSubmission = updatedHomework.submissions.id(submissionObjectId);

      res.json({ message: 'Homework marked successfully', submission: updatedSubmission });
    } catch (error) {
      console.error("Error marking homework:", error);
      res.status(500).json({ message: 'Server error marking homework', error: error.message });
    }
  }
);


// @desc    Update homework details (e.g., title, description, dueDate)
// @route   PUT /api/homework/:id
// @access  Private (admin, teacher, co-teacher who assigned it)
router.put(
  '/:id',
  protect,
  authorize(['admin', 'teacher', 'co-teacher']),
  async (req, res) => {
    const { title, description, dueDate, lessonId } = req.body;
    try {
      const homework = await Homework.findById(req.params.id);
      if (!homework) {
        return res.status(404).json({ message: 'Homework not found' });
      }

      // Authorization: only assignedBy or admin can update
      if (homework.assignedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to update this homework' });
      }

      if (title) homework.title = title;
      if (description) homework.description = description;
      if (dueDate) homework.dueDate = dueDate;
      if (lessonId) {
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) return res.status(404).json({ message: 'Associated lesson not found if trying to update.' });
        homework.lesson = lessonId;
        homework.grade = lesson.grade; // Update grade if lesson changes
      }

      const updatedHomework = await homework.save();
      res.json(updatedHomework);
    } catch (error) {
      console.error("Error updating homework:", error);
      res.status(500).json({ message: 'Server error updating homework', error: error.message });
    }
  }
);

// @desc    Delete homework
// @route   DELETE /api/homework/:id
// @access  Private (admin, teacher, co-teacher who assigned it)
router.delete(
  '/:id',
  protect,
  authorize(['admin', 'teacher', 'co-teacher']),
  async (req, res) => {
    try {
      const homework = await Homework.findById(req.params.id);
      if (!homework) {
        return res.status(404).json({ message: 'Homework not found' });
      }

      // Authorization: only assignedBy or admin can delete
      if (homework.assignedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to delete this homework' });
      }

      await homework.deleteOne();
      res.json({ message: 'Homework deleted successfully' });
    } catch (error) {
      console.error("Error deleting homework:", error);
      res.status(500).json({ message: 'Server error deleting homework', error: error.message });
    }
  }
);


export default router;
