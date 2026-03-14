-- Update handle_leave_approval to support mid-day leave
CREATE OR REPLACE FUNCTION public.handle_leave_approval()
RETURNS TRIGGER AS $$
DECLARE
  curr_date DATE;
BEGIN
  IF (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved')) THEN
    curr_date := NEW.start_date;
    WHILE curr_date <= NEW.end_date LOOP
      -- If it's a teacher leave
      IF NEW.teacher_id IS NOT NULL THEN
        -- Check if it's mid-day leave (start_time/end_time present)
        IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
          -- For mid-day leave, we record it in notes but don't force 'leave' status
          -- as the teacher might be present for other parts of the day.
          -- Actually, the requirement says 10:00-12:30 Present, 12:30-End On Leave.
          -- We'll mark as 'present' by default if they were there part of the day,
          -- but append leave info to notes.
          INSERT INTO public.teacher_attendance (teacher_id, center_id, date, status, notes)
          VALUES (NEW.teacher_id, NEW.center_id, curr_date, 'present', 'Mid-Day Leave Approved: ' || NEW.start_time || ' to ' || NEW.end_time || '. Reason: ' || COALESCE(NEW.reason, ''))
          ON CONFLICT (teacher_id, date) DO UPDATE
          SET notes = public.teacher_attendance.notes || ' | Mid-Day Leave: ' || NEW.start_time || '-' || NEW.end_time;
        ELSE
          -- Full day leave
          INSERT INTO public.teacher_attendance (teacher_id, center_id, date, status, notes)
          VALUES (NEW.teacher_id, NEW.center_id, curr_date, 'leave', 'Approved Leave: ' || COALESCE(NEW.reason, ''))
          ON CONFLICT (teacher_id, date) DO UPDATE
          SET status = 'leave', notes = 'Approved Leave: ' || COALESCE(NEW.reason, '');
        END IF;
      END IF;

      -- If it's a student leave (always marked absent for that day for simplicity in standard school attendance)
      IF NEW.student_id IS NOT NULL THEN
        INSERT INTO public.attendance (student_id, center_id, date, status, remarks)
        VALUES (NEW.student_id, NEW.center_id, curr_date, 'absent', 'Approved Leave: ' || COALESCE(NEW.reason, ''))
        ON CONFLICT (student_id, date) DO UPDATE
        SET status = 'absent', remarks = 'Approved Leave: ' || COALESCE(NEW.reason, '');
      END IF;

      curr_date := curr_date + 1;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
