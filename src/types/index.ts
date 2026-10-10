/**
 * Type definitions for Aplikasi CBT Online إمتحان (Imtihan)
 */

export type UserRole = 'student' | 'teacher' | 'admin';

export type EducationLevel = 'SD' | 'SMP' | 'SMA';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentProfile {
  id?: string;
  uid: string;
  nis: string;
  fullName: string;
  educationLevel: EducationLevel;
  gradeLevel: string; // "1" .. "12"
  classId: string;
  className: string;
  academicYear: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface TeacherProfile {
  id?: string;
  uid: string;
  nip?: string;
  fullName: string;
  email: string;
  subjects?: string[];
  assignedClasses?: string[];
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface SchoolClass {
  id: string;
  name: string; // e.g. "Kelas 6A", "Kelas 10 MIPA 1"
  educationLevel: EducationLevel;
  grade: string; // "1".."12"
  academicYear: string; // e.g. "2026/2027"
  homeroomTeacher?: string;
  studentCount?: number;
  createdAt: string;
}

export interface SchoolSubject {
  id: string;
  code: string;
  name: string;
  educationLevel: EducationLevel | 'ALL';
  createdAt: string;
}

export type QuestionType =
  | 'single_choice'
  | 'multi_choice'
  | 'true_false'
  | 'short_answer'
  | 'essay';

export interface QuestionOption {
  id: string; // 'A', 'B', 'C', 'D', 'E'
  text: string;
}

export interface QuestionItem {
  id: string;
  authorUid: string;
  subject: string;
  educationLevel: EducationLevel;
  gradeLevel: string;
  type: QuestionType;
  questionText: string;
  imageUrl?: string;
  options?: QuestionOption[];
  // Restricted: should not be delivered to students during active test
  correctAnswer?: string | string[] | boolean;
  weight: number;
  rubric?: string;
  createdAt: string;
}

export type ExamStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'archived';

export interface Exam {
  id: string;
  title: string;
  description?: string;
  teacherUid: string;
  teacherName: string;
  subject: string;
  educationLevel: EducationLevel;
  gradeLevel: string;
  classIds: string[];
  startTime: string; // ISO string
  endTime: string; // ISO string
  durationMinutes: number;
  token: string;
  maxViolations: number; // default 2
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showScoreAfterExam: boolean;
  status: ExamStatus;
  questionCount: number;
  questions: ExamQuestionSnapshot[];
  createdAt: string;
  updatedAt?: string;
}

// Snapshot of question included in an exam (without correctAnswer when sent to student)
export interface ExamQuestionSnapshot {
  id: string;
  type: QuestionType;
  questionText: string;
  imageUrl?: string;
  options?: QuestionOption[];
  weight: number;
  rubric?: string;
  // Included in server/teacher view, stripped for student client
  correctAnswer?: string | string[] | boolean;
}

export type AttemptStatus =
  | 'in_progress'
  | 'submitted'
  | 'terminated_violation'
  | 'time_expired';

export type ScoringStatus = 'pending' | 'needs_grading' | 'completed';

export interface ExamAttempt {
  id: string;
  examId: string;
  studentUid: string;
  studentName: string;
  studentNis: string;
  examTitle: string;
  subject: string;
  educationLevel: EducationLevel;
  gradeLevel: string;
  className: string;
  status: AttemptStatus;
  startedAt: string;
  deadlineAt: string;
  submittedAt?: string;
  lastActivityAt: string;
  violationCount: number;
  lastQuestionIndex: number;
  answeredCount: number;
  terminationReason?: string;
  objectiveScore?: number;
  essayScore?: number;
  finalScore?: number;
  scoringStatus: ScoringStatus;
  studentQuestionOrder?: string[]; // IDs in persistent order for this attempt
}

export interface StudentAnswer {
  questionId: string;
  answer: string | string[] | boolean | null;
  isFlagged?: boolean;
  updatedAt: string;
  score?: number; // assigned by auto or teacher
  feedback?: string;
}

export interface ViolationEvent {
  id?: string;
  type: 'fullscreen_exit' | 'tab_switch' | 'window_blur' | 'unauthorized_action';
  message: string;
  timestamp: string;
  violationNumber: number;
}

export interface AuditLogItem {
  id: string;
  action: string;
  actorUid: string;
  actorEmail: string;
  actorRole: UserRole;
  details: string;
  targetId?: string;
  timestamp: string;
}
