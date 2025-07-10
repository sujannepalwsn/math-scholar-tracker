import mongoose from 'mongoose';

const studentSubmissionSchema = new mongoose.Schema({
  student: { // User ID of the student
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  filePath: { // Path to uploaded file (PDF/image)
    type: String,
    trim: true,
  },
  textSubmission: { // For text-based submissions if no file upload
    type: String,
  },
  submissionDate: {
    type: Date,
    default: Date.now,
  },
  status: { // e.g., 'Submitted', 'Late Submission', 'Graded', 'Resubmitted'
    type: String,
    enum: ['Pending', 'Submitted', 'Late Submission', 'Graded', 'Needs Revision'],
    default: 'Pending',
  },
  grade: { // Optional: if homework is graded with a score
    type: String,
  },
  feedback: { // Teacher's feedback
    type: String,
    trim: true,
  },
  submittedAt: { // Actual time of submission
      type: Date,
  }
});

const homeworkSchema = new mongoose.Schema({
  lesson: { // Associated lesson
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Homework title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Homework description is required'],
  },
  dueDate: {
    type: Date,
    required: [true, 'Submission deadline is required'],
  },
  assignedBy: { // User ID of the teacher/admin
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Array to track submissions from each student assigned the homework
  // This structure assumes homework is assigned to a class/group implicitly through the lesson's grade,
  // or could be explicitly assigned to students. For now, submissions are added as they come.
  submissions: [studentSubmissionSchema],

  // Could add a field for 'assignedTo' (e.g., specific grade, or array of student IDs)
  // For simplicity, we'll assume it's for the grade of the lesson.
  grade: { // Grade this homework is for (copied from lesson or specified)
    type: String,
    required: true,
  }

}, { timestamps: true });

// Method to get a specific student's submission
homeworkSchema.methods.getStudentSubmission = function(studentId) {
  return this.submissions.find(sub => sub.student.equals(studentId));
};

// Method to update or add a student's submission
// This is more complex due to array updates, often handled in the service/controller layer.
// homeworkSchema.methods.addOrUpdateSubmission = ...

const Homework = mongoose.model('Homework', homeworkSchema);

export default Homework;
