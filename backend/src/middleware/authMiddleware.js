import { supabase } from '../server.js';

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ message: 'Not authorized, token failed or user not found' });
    }

    req.user = user; // Attach Supabase auth user object to request

    // Fetch the full profile using the get_profile RPC function
    // The p_user_id parameter name must match the function definition in SQL.
    const { data: profile, error: profileError } = await supabase
      .rpc('get_profile', { p_user_id: user.id })
      .single();

    if (profileError) {
      // Log the error but proceed; some routes might not need full profile,
      // or the profile might not exist yet (e.g., just after signup before student details are filled).
      console.error('Error fetching profile in authMiddleware:', profileError.message);
      // Depending on strictness, you might want to return an error here:
      // return res.status(500).json({ message: 'Error fetching user profile data.', details: profileError.message });
    }

    req.profile = profile || null; // Attach profile data (or null if not found/error) to request

    next();
  } catch (error) {
    console.error('Critical error in auth middleware:', error);
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

// Optional: Role-based authorization middleware
// This can now use req.profile.role if it's consistently populated by get_profile.
// Or, it can still use req.user.role if the role from JWT is sufficient.
/*
export const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    // Prefer role from profile if available and reliable, otherwise fallback to JWT role
    const userRole = req.profile?.role || req.user?.role;

    if (!userRole) {
      return res.status(403).json({ message: 'Forbidden: No user role information.' });
    }
    if (allowedRoles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({ message: `Forbidden: Role '${userRole}' is not authorized.` });
    }
  };
};
*/
