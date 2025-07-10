import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['pdf', 'youtube', 'gdrive', 'link', 'text'], required: true },
  url: { type: String, trim: true }, // Required if not text
  content: { type: String } // For text type resources
});

const lessonSchema = new mongoose.Schema({
  topicName: {
    type: String,
    required: [true, 'Topic name is required'],
    trim: true,
  },
  subjectArea: { // e.g., Mathematics, Algebra, Geometry
    type: String,
    required: [true, 'Subject area is required'],
    trim: true,
  },
  grade: { // e.g., 8, 9, 10 - to filter lessons by grade
    type: String,
    required: [true, 'Grade is required'],
  },
  lessonDate: {
    type: Date,
    required: [true, 'Lesson date is required'],
  },
  resources: [resourceSchema], // Attached materials
  createdBy: { // User ID of the teacher/admin who created the lesson
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Optional: for tracking if lesson is completed by the class or teacher
  status: {
    type: String,
    enum: ['planned', 'ongoing', 'completed', 'cancelled'],
    default: 'planned',
  }
}, { timestamps: true });

const Lesson = mongoose.model('Lesson', lessonSchema);

export default Lesson;
