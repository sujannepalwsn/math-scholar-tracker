import express from 'express';
import { supabase } from '../server.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper for role checking (can be moved to a shared middleware file)
const checkRole = (allowedRoles) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ message: 'Access denied. User role not available.' });
  }
  if (allowedRoles.includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ message: `Access denied. Role '${req.user.role}' is not authorized.` });
  }
};

// @desc    Assign homework for a lesson
// @route   POST /api/homework
// @access  Private (admin, teacher, co-teacher)
router.post(
  '/',
  authMiddleware,
  checkRole(['admin', 'teacher', 'co-teacher']),
  async (req, res) => {
    const { lesson_id, title, description, due_date } = req.body;
    try {
      if (!lesson_id || !title || !description || !due_date) {
        return res.status(400).json({ message: 'Lesson ID, title, description, and due date are required' });
      }

      // Check if lesson exists and get its grade
      const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .select('grade')
        .eq('id', lesson_id)
        .single();

      if (lessonError || !lesson) {
        return res.status(404).json({ message: 'Lesson not found, cannot assign homework.' });
      }

      const { data, error } = await supabase
        .from('homework') // Assuming table name 'homework'
        .insert([{
          lesson_id,
          title,
          description,
          due_date,
          assigned_by: req.user.id,
          grade: lesson.grade, // Inherit grade from lesson
        }])
        .select();

      if (error) throw error;
      res.status(201).json(data[0]);
    } catch (error) {
      console.error("Error assigning homework:", error);
      res.status(500).json({ message: 'Server error assigning homework', error: error.message });
    }
  }
);

// @desc    Get all homework
// @route   GET /api/homework
// @access  Private (filtered by role)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { lesson_id, student_id, grade: queryGrade } = req.query;
    let query = supabase
      .from('homework')
      .select(`
        *,
        lesson:lessons(topic_name, subject_area, lesson_date),
        assigned_by_profile:profiles(full_name, email),
        submissions:homework_submissions(*)
      `);
      // If submissions need student profile:
      // .select(`..., submissions:homework_submissions(*, student_profile:profiles(full_name))`)


    if (lesson_id) query = query.eq('lesson_id', lesson_id);

    const userGrade = req.profile?.grade; // Use grade from req.profile

    if (req.user.role === 'student') {
      if (!userGrade) {
        console.warn(`Student ${req.user.id} has no grade in profile for homework filtering.`);
        // Depending on policy, might return empty or error.
        // For now, if grade is missing, they might not see any homework if query.eq('grade', undefined) filters all.
        return res.json([]); // Or return res.status(400).json({ message: "Student grade not found..."});
      }
      query = query.eq('grade', userGrade);
    } else if (req.user.role === 'parent') {
      // TODO: Parent logic - needs to fetch children's grades and filter by those.
      // This is complex and depends on how parent-child relationships are stored.
      // For now, parents might not see any or need specific query params.
      return res.status(403).json({ message: "Parent homework view not yet fully implemented. Please specify child's grade if known."})
    } else if (queryGrade) { // Teachers, admins can filter by grade
        query = query.eq('grade', queryGrade);
    }
    // Teachers/admins might also want to see only homework they assigned:
    // if (req.user.role === 'teacher' && req.query.onlyMine) query = query.eq('assigned_by', req.user.id);

    query = query.order('due_date', { ascending: true });
    const { data, error } = await query;

    if (error) throw error;

    // For students, add their specific submission status to each homework item
    if (req.user.role === 'student') {
      const personalizedHomeworks = data.map(hw => {
        const mySubmission = hw.submissions.find(sub => sub.student_id === req.user.id);
        return { ...hw, my_submission: mySubmission || null };
      });
      return res.json(personalizedHomeworks);
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching homework:", error);
    res.status(500).json({ message: 'Server error fetching homework', error: error.message });
  }
});

// @desc    Get a single homework by ID (includes submissions)
// @route   GET /api/homework/:id
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data: homework, error } = await supabase
      .from('homework')
      .select(`
        *,
        lesson:lessons(topic_name, subject_area, grade),
        assigned_by_profile:profiles(full_name, email),
        submissions:homework_submissions(*, student_profile:profiles(full_name, email))
      `)
      .eq('id', req.params.id)
      .single();

    if (error && error.code === 'PGRST116') return res.status(404).json({ message: 'Homework not found' });
    if (error) throw error;

    const userGrade = req.profile?.grade; // Use grade from req.profile
    if (req.user.role === 'student' && userGrade && homework.grade !== userGrade) {
      return res.status(403).json({ message: 'Not authorized to view this homework' });
    }
    // TODO: Parent access control based on children's grades.

    if (req.user.role === 'student') {
      const mySubmission = homework.submissions.find(sub => sub.student_id === req.user.id);
      return res.json({ ...homework, my_submission: mySubmission || null });
    }

    res.json(homework);
  } catch (error) {
    console.error("Error fetching homework by ID:", error);
    res.status(500).json({ message: 'Server error fetching homework', error: error.message });
  }
});

// @desc    Student submits homework
// @route   POST /api/homework/:id/submit
// @access  Private (student)
router.post(
  '/:homework_id/submit',
  authMiddleware,
  checkRole(['student']),
  async (req, res) => {
    const { file_path, text_submission } = req.body;
    const { homework_id } = req.params;
    const student_id = req.user.id;

    try {
      const { data: homework, error: hwError } = await supabase
        .from('homework')
        .select('due_date, grade')
        .eq('id', homework_id)
        .single();

      if (hwError || !homework) return res.status(404).json({ message: 'Homework not found' });

      const userGrade = req.profile?.grade; // Use grade from req.profile
      if (userGrade && homework.grade !== userGrade) {
        return res.status(403).json({ message: 'Cannot submit to homework not for your grade.' });
      }
      // If userGrade is null but student role, they might be blocked if homework.grade is not null.
      // Or if homework.grade is null, they might access it.
      // This depends on data consistency; ideally, students always have a grade and homework always has a grade.

      const now = new Date();
      const submission_status = now > new Date(homework.due_date) ? 'Late Submission' : 'Submitted';

      // Upsert submission: Insert or update if already exists
      const { data, error } = await supabase
        .from('homework_submissions') // Assuming table 'homework_submissions'
        .upsert({
          homework_id,
          student_id,
          file_path,
          text_submission,
          status: submission_status,
          submitted_at: now.toISOString(),
          // On conflict (homework_id, student_id), update these fields:
        }, {
          onConflict: 'homework_id, student_id',
        })
        .select('*, student_profile:profiles(full_name)');

      if (error) {
        // Check for specific errors, e.g., if submission is locked after grading.
        // This would typically be handled by RLS or database triggers.
        console.error("Submission error:", error);
        throw error;
      }
      res.status(201).json({ message: 'Homework submitted successfully', submission: data[0] });
    } catch (error) {
      console.error("Error submitting homework:", error);
      res.status(500).json({ message: 'Server error submitting homework', error: error.message });
    }
  }
);

// @desc    Teacher marks homework submission
// @route   PUT /api/homework/submissions/:submission_id/mark
// @access  Private (admin, teacher, co-teacher)
router.put(
  '/submissions/:submission_id/mark',
  authMiddleware,
  checkRole(['admin', 'teacher', 'co-teacher']),
  async (req, res) => {
    const { feedback, grade_mark, status } = req.body; // grade_mark is the actual mark for the homework
    const { submission_id } = req.params;
    try {
      // Optional: Check if teacher is authorized for this specific homework (e.g., they assigned it or teach the grade)
      // This usually is better handled by RLS policies in Supabase.

      const { data, error } = await supabase
        .from('homework_submissions')
        .update({
          feedback,
          grade: grade_mark, // 'grade' here is the mark given, not student's class grade
          status: status || 'Graded',
          marked_at: new Date().toISOString(),
          marked_by: req.user.id,
        })
        .eq('id', submission_id)
        .select('*, student_profile:profiles(full_name, email)');

      if (error) throw error;
      if (!data || data.length === 0) return res.status(404).json({ message: 'Submission not found or not updated.' });

      res.json({ message: 'Homework marked successfully', submission: data[0] });
    } catch (error) {
      console.error("Error marking homework:", error);
      res.status(500).json({ message: 'Server error marking homework', error: error.message });
    }
  }
);

// @desc    Update homework details (title, description, dueDate)
// @route   PUT /api/homework/:id
// @access  Private (admin, teacher, co-teacher who assigned it)
router.put(
  '/:id',
  authMiddleware,
  checkRole(['admin', 'teacher', 'co-teacher']),
  async (req, res) => {
    const { title, description, due_date, lesson_id } = req.body;
    const homework_id = req.params.id;
    try {
      const { data: existingHomework, error: fetchError } = await supabase
        .from('homework')
        .select('assigned_by, grade')
        .eq('id', homework_id)
        .single();

      if (fetchError) return res.status(404).json({ message: 'Homework not found' });

      if (req.user.role !== 'admin' && existingHomework.assigned_by !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to update this homework' });
      }

      const updatePayload = {};
      if (title !== undefined) updatePayload.title = title;
      if (description !== undefined) updatePayload.description = description;
      if (due_date !== undefined) updatePayload.due_date = due_date;

      let newGrade = existingHomework.grade;
      if (lesson_id !== undefined) {
        const { data: lesson, error: lessonError } = await supabase
          .from('lessons')
          .select('grade')
          .eq('id', lesson_id)
          .single();
        if (lessonError || !lesson) return res.status(404).json({ message: 'Associated lesson not found.' });
        updatePayload.lesson_id = lesson_id;
        newGrade = lesson.grade; // Update grade if lesson changes
      }
      if (newGrade !== existingHomework.grade) updatePayload.grade = newGrade;


      if (Object.keys(updatePayload).length === 0) {
        return res.status(400).json({ message: 'No fields to update.'});
      }
      updatePayload.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('homework')
        .update(updatePayload)
        .eq('id', homework_id)
        .select();

      if (error) throw error;
      res.json(data[0]);
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
  authMiddleware,
  checkRole(['admin', 'teacher', 'co-teacher']),
  async (req, res) => {
    const homework_id = req.params.id;
    try {
      if (req.user.role !== 'admin') {
        const { data: hw, error: fetchError } = await supabase
          .from('homework')
          .select('assigned_by')
          .eq('id', homework_id)
          .single();
        if (fetchError) return res.status(404).json({ message: 'Homework not found' });
        if (hw.assigned_by !== req.user.id) {
          return res.status(403).json({ message: 'Not authorized to delete this homework' });
        }
      }

      // Consider cascade deletes for homework_submissions if set up in Supabase.
      // If not, delete submissions manually first:
      // await supabase.from('homework_submissions').delete().eq('homework_id', homework_id);

      const { error, count } = await supabase.from('homework').delete().eq('id', homework_id);

      if (error) throw error;
      if (count === 0) return res.status(404).json({message: "Homework not found or already deleted."});

      res.json({ message: 'Homework deleted successfully' });
    } catch (error) {
      console.error("Error deleting homework:", error);
      res.status(500).json({ message: 'Server error deleting homework', error: error.message });
    }
  }
);

export default router;
