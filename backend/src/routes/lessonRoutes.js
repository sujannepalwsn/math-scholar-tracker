import express from 'express';
import { supabase } from '../server.js'; // Import Supabase client
import { authMiddleware } from '../middleware/authMiddleware.js'; // Renamed from 'protect'

// TODO: Implement authorize middleware if complex role logic is needed beyond simple checks.
// For now, role checks will be inline or use a simpler checker.
// import { authorize } from '../middleware/authMiddleware.js';


const router = express.Router();

// Helper to check roles (can be expanded or moved to middleware)
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


// @desc    Create a new lesson
// @route   POST /api/lessons
// @access  Private (admin, teacher, co-teacher)
router.post(
  '/',
  authMiddleware,
  checkRole(['admin', 'teacher', 'co-teacher']),
  async (req, res) => {
    const { topic_name, subject_area, grade, lesson_date, resources, status } = req.body;

    // Validate required fields
    if (!topic_name || !subject_area || !grade || !lesson_date) {
      return res.status(400).json({ message: 'Missing required fields for lesson (topic_name, subject_area, grade, lesson_date)' });
    }

    try {
      const { data, error } = await supabase
        .from('lessons') // Assuming table name is 'lessons'
        .insert([{
          topic_name,
          subject_area,
          grade,
          lesson_date,
          resources: resources || [],
          status: status || 'planned',
          created_by: req.user.id, // User ID from Supabase auth
        }])
        .select(); // Return the created record

      if (error) throw error;
      res.status(201).json(data[0]);
    } catch (error) {
      console.error("Error creating lesson:", error);
      res.status(500).json({ message: 'Server error creating lesson', error: error.message });
    }
  }
);

// @desc    Get all lessons (can be filtered)
// @route   GET /api/lessons
// @access  Private (all authenticated users, filtered by role/grade)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { grade, subject_area, date_from, date_to, teacher_id } = req.query;
    let query = supabase.from('lessons').select('*, created_by_profile:profiles(full_name, email)'); // Join with profiles for creator info

    if (grade) query = query.eq('grade', grade);
    if (subject_area) query = query.ilike('subject_area', `%${subject_area}%`); // Case-insensitive like
    if (date_from) query = query.gte('lesson_date', date_from);
    if (date_to) query = query.lte('lesson_date', date_to);
    if (teacher_id) query = query.eq('created_by', teacher_id);

    // Role-based filtering (example)
    if (req.user.role === 'student') {
      const studentGrade = req.profile?.grade; // Use grade from req.profile
      if (studentGrade) {
        query = query.eq('grade', studentGrade);
      } else {
        // If student grade isn't available from profile, this might return too many/few lessons.
        // Or it might indicate the student's profile/student record is incomplete.
        console.warn(`Student ${req.user.id} has no grade in their profile for lesson filtering.`);
        // Depending on policy, you might want to return empty or error.
        // For now, it will attempt to fetch without grade filter if studentGrade is null/undefined.
        // Consider adding: return res.json([]); or similar if grade is mandatory for students.
      }
    }
    // TODO: Add filtering for parents based on their children's grades.

    query = query.order('lesson_date', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error fetching lessons:", error);
    res.status(500).json({ message: 'Server error fetching lessons', error: error.message });
  }
});

// @desc    Get a single lesson by ID
// @route   GET /api/lessons/:id
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data: lesson, error } = await supabase
      .from('lessons')
      .select('*, created_by_profile:profiles(full_name, email)')
      .eq('id', req.params.id)
      .single(); // Expect one row

    if (error && error.code === 'PGRST116') { // PGRST116: "The result contains 0 rows"
      return res.status(404).json({ message: 'Lesson not found' });
    }
    if (error) throw error;


    // Optional: Role-based access control for specific lesson
    // Example: Student can only access lessons of their grade
    if (req.user.role === 'student') {
        const studentGrade = req.profile?.grade; // Use grade from req.profile
        if (studentGrade && lesson.grade !== studentGrade) {
            return res.status(403).json({ message: 'Not authorized to view this lesson' });
        }
        // If studentGrade is null here, they might see lessons not intended for them if not caught by RLS.
        // RLS policy `Students can view lesson plans for their grade` in migration depends on `students` table.
        // The `get_profile` function now provides this grade, so this check should be effective if profile has grade.
    }
    // TODO: Parent access based on children's grades.

    res.json(lesson);
  } catch (error) {
    console.error("Error fetching lesson:", error);
    res.status(500).json({ message: 'Server error fetching lesson', error: error.message });
  }
});

// @desc    Update a lesson
// @route   PUT /api/lessons/:id
// @access  Private (creator, admin, teacher with rights)
router.put(
  '/:id',
  authMiddleware,
  checkRole(['admin', 'teacher', 'co-teacher']),
  async (req, res) => {
    try {
      // First, fetch the lesson to check ownership if not admin
      const { data: existingLesson, error: fetchError } = await supabase
        .from('lessons')
        .select('created_by')
        .eq('id', req.params.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        return res.status(404).json({ message: 'Lesson not found' });
      }
      if (fetchError) throw fetchError;

      // Authorization: Only creator or admin can update
      // Note: Supabase RLS policies are the primary way to enforce this.
      // This check is an additional safeguard or for more complex logic.
      if (req.user.role !== 'admin' && existingLesson.created_by !== req.user.id) {
        return res.status(403).json({ message: 'User not authorized to update this lesson' });
      }

      const { topic_name, subject_area, grade, lesson_date, resources, status } = req.body;

      // Construct update object with only provided fields
      const updateData = {};
      if (topic_name !== undefined) updateData.topic_name = topic_name;
      if (subject_area !== undefined) updateData.subject_area = subject_area;
      if (grade !== undefined) updateData.grade = grade;
      if (lesson_date !== undefined) updateData.lesson_date = lesson_date;
      if (resources !== undefined) updateData.resources = resources;
      if (status !== undefined) updateData.status = status;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No fields provided for update.' });
      }
      updateData.updated_at = new Date().toISOString(); // Manually set updated_at if not auto-handled by DB

      const { data, error } = await supabase
        .from('lessons')
        .update(updateData)
        .eq('id', req.params.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) return res.status(404).json({ message: 'Lesson not found or not updated' });

      res.json(data[0]);
    } catch (error) {
      console.error("Error updating lesson:", error);
      res.status(500).json({ message: 'Server error updating lesson', error: error.message });
    }
  }
);

// @desc    Delete a lesson
// @route   DELETE /api/lessons/:id
// @access  Private (creator, admin, teacher with rights)
router.delete(
  '/:id',
  authMiddleware,
  checkRole(['admin', 'teacher', 'co-teacher']),
  async (req, res) => {
    try {
      // Optional: Fetch lesson to check ownership if RLS is not solely relied upon
      if (req.user.role !== 'admin') {
        const { data: lesson, error: fetchError } = await supabase
          .from('lessons')
          .select('created_by')
          .eq('id', req.params.id)
          .single();

        if (fetchError && fetchError.code === 'PGRST116') return res.status(404).json({ message: 'Lesson not found' });
        if (fetchError) throw fetchError;
        if (lesson.created_by !== req.user.id) {
          return res.status(403).json({ message: 'User not authorized to delete this lesson' });
        }
      }

      // TODO: Consider Supabase cascade delete settings for related homework.
      // If not set up, manual deletion of related homework might be needed here.
      // e.g., await supabase.from('homework').delete().eq('lesson_id', req.params.id);

      const { error, count } = await supabase
        .from('lessons')
        .delete()
        .eq('id', req.params.id);

      if (error) throw error;
      if (count === 0) {
         return res.status(404).json({ message: 'Lesson not found or already deleted' });
      }

      res.json({ message: 'Lesson removed successfully' });
    } catch (error) {
      console.error("Error deleting lesson:", error);
      res.status(500).json({ message: 'Server error deleting lesson', error: error.message });
    }
  }
);

export default router;
