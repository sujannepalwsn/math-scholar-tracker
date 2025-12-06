-- Add 'invite' to the allowed values for attendance_status in meeting_attendees table

-- First, drop the existing check constraint if it exists
ALTER TABLE public.meeting_attendees
DROP CONSTRAINT IF EXISTS meeting_attendees_attendance_status_check;

-- Then, add the new check constraint with 'invite' included
ALTER TABLE public.meeting_attendees
ADD CONSTRAINT meeting_attendees_attendance_status_check
CHECK (attendance_status IN ('pending', 'present', 'absent', 'excused', 'invite'));