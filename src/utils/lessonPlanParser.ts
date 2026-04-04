export interface ParsedLessonPlan {
  topic?: string;
  subject?: string;
  grade?: string;
  date?: string;
  objectives?: string;
  warmUp?: string;
  learningActivities?: string[];
  evaluation?: string[];
  classWork?: string;
  homeAssignment?: string;
  remarks?: string;
}

export function parseLessonPlanText(text: string): ParsedLessonPlan {
  const result: ParsedLessonPlan = {
    learningActivities: [],
    evaluation: []
  };

  // Helper to extract section content
  const extractSection = (regex: RegExp, content: string) => {
    const match = content.match(regex);
    return match ? match[1].trim() : undefined;
  };

  // Basic fields
  result.topic = extractSection(/TOPIC:\s*(.*)/i, text);
  result.subject = extractSection(/SUBJECT:\s*([^|]*)/i, text);
  result.grade = extractSection(/GRADE:\s*([^|]*)/i, text);
  result.date = extractSection(/DATE:\s*(.*)/i, text);

  // Section 1: Objectives
  const objectivesMatch = text.match(/1\.\s*OBJECTIVES\s*\/\s*LEARNING\s*OUTCOMES\s*([\s\S]*?)(?=2\.)/i);
  if (objectivesMatch) result.objectives = objectivesMatch[1].trim();

  // Section 2: Warm up & Review
  const warmUpMatch = text.match(/2\.\s*WARM\s*UP\s*&\s*REVIEW\s*([\s\S]*?)(?=3\.)/i);
  if (warmUpMatch) result.warmUp = warmUpMatch[1].trim();

  // Section 3: Teaching & Learning Activities
  const activitiesMatch = text.match(/3\.\s*TEACHING\s*&\s*LEARNING\s*ACTIVITIES\s*([\s\S]*?)(?=4\.)/i);
  if (activitiesMatch) {
    const activitiesText = activitiesMatch[1].trim();
    // Split by letters (a., b., c., etc.)
    const items = activitiesText.split(/^[a-z]\.\s+/m).filter(Boolean).map(s => s.trim());
    result.learningActivities = items;
  }

  // Section 4: Evaluation
  const evaluationMatch = text.match(/4\.\s*EVALUATION\s*([\s\S]*?)(?=CLASS\s*WORK|HOME\s*ASSIGNMENT|REMARKS:|$)/i);
  if (evaluationMatch) {
    const evaluationText = evaluationMatch[1].trim();
    const items = evaluationText.split(/^[a-z]\.\s+/m).filter(Boolean).map(s => s.trim());
    result.evaluation = items;
  }

  // Class Work
  const classWorkMatch = text.match(/CLASS\s*WORK\s*([\s\S]*?)(?=HOME\s*ASSIGNMENT|REMARKS:|$)/i);
  if (classWorkMatch) result.classWork = classWorkMatch[1].trim();

  // Home Assignment
  const homeAssignmentMatch = text.match(/HOME\s*ASSIGNMENT\s*([\s\S]*?)(?=REMARKS:|$)/i);
  if (homeAssignmentMatch) result.homeAssignment = homeAssignmentMatch[1].trim();

  // Remarks
  const remarksMatch = text.match(/REMARKS:\s*([\s\S]*)$/i);
  if (remarksMatch) result.remarks = remarksMatch[1].trim();

  return result;
}
