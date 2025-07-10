import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/.+\@.+\..+/, 'Please fill a valid email address'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
  },
  role: {
    type: String,
    enum: ['student', 'parent', 'teacher', 'admin', 'co-teacher'],
    default: 'student',
    required: true,
  },
  // Common fields for all users
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
  },
  contactNumber: {
    type: String,
    trim: true,
  },
  profilePhotoUrl: { // Path to photo or URL
    type: String,
    trim: true,
  },
  // Student-specific fields
  studentId: { // Auto-generated unique ID
    type: String,
    unique: true,
    sparse: true, // Allows multiple nulls, but unique if value exists
  },
  grade: { // e.g., 8, 9, 10
    type: String,
    trim: true,
  },
  school: {
    type: String,
    trim: true,
  },
  // Parent-specific fields (or linked student for parent role)
  // For a student, this can store parent's contact or link to parent user
  parentDetails: {
    name: String,
    contactNumber: String,
    email: String,
  },
  // For a parent, this can link to their child(ren)
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Teacher/Co-teacher specific fields
  subjectSpecialization: [String], // e.g., ['Mathematics', 'Algebra']

  // Consent and data policy
  consentAgreed: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  }
}, { timestamps: true });

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Auto-generate studentId for student role before saving
userSchema.pre('save', async function(next) {
  if (this.role === 'student' && this.isNew) {
    // A simple way to generate a unique ID, can be improved
    // e.g., GRD_LAST4FNAME_RANDOM
    const gradePart = this.grade ? `G${this.grade}_` : 'STD_';
    const namePart = this.lastName.substring(0, 4).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    let potentialId = `${gradePart}${namePart}${randomPart}`;

    // Ensure uniqueness (simple check, might need retry logic for high concurrency)
    let existingUser = await this.constructor.findOne({ studentId: potentialId });
    while (existingUser) {
      const newRandomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      potentialId = `${gradePart}${namePart}${newRandomPart}`;
      existingUser = await this.constructor.findOne({ studentId: potentialId });
    }
    this.studentId = potentialId;
  }
  next();
});


const User = mongoose.model('User', userSchema);

export default User;
