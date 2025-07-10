import express from 'express';
import { supabase } from '../server.js'; // Import Supabase client from server.js
import { authMiddleware } from '../middleware/authMiddleware.js'; // Import auth middleware

const router = express.Router();

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', authMiddleware, async (req, res) => {
  // req.user is populated by authMiddleware with Supabase user info
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  try {
    // Fetch additional profile information from your 'profiles' table if you have one
    // Supabase auth.users table contains basic auth info.
    // Custom profile data (like full_name, role, etc.) is often stored in a separate 'profiles' table.
    const { data: profile, error } = await supabase
      .from('profiles') // Assuming you have a 'profiles' table
      .select('*')
      .eq('id', req.user.id) // Match profile with the authenticated user's ID
      .single();

    if (error) {
      // If profile doesn't exist, it might mean it hasn't been created yet
      // or there's another issue.
      if (error.code === 'PGRST116') { // PGRST116: "The result contains 0 rows"
        // You might want to create a profile here if it's expected
        // For now, return user's auth data and a note.
        return res.json({
          id: req.user.id,
          email: req.user.email,
          role: req.user.role, // Role from JWT, if set
          // Include other relevant fields from req.user
          message: 'Profile not found in profiles table. Returning auth data.',
        });
      }
      throw error;
    }

    if (profile) {
      res.json(profile);
    } else {
      // This case should ideally be handled by the PGRST116 error check above
      res.status(404).json({ message: 'Profile not found' });
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error fetching profile', error: error.message });
  }
});

// TODO: Add routes for:
// - Creating/updating user profiles in the 'profiles' table after Supabase signup
// - Other user-related operations (e.g., fetching user lists for admins)

export default router;
