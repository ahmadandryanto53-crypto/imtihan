import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  SchoolClass,
  SchoolSubject,
  StudentProfile,
  TeacherProfile,
  QuestionItem,
  Exam,
  ExamAttempt,
  StudentAnswer,
  ViolationEvent,
  AuditLogItem,
  UserRole,
} from '../types';

// ==========================================
// AUDIT LOGS
// ==========================================
export async function logAudit(
  action: string,
  actorUid: string,
  actorEmail: string,
  actorRole: UserRole,
  details: string,
  targetId?: string
) {
  try {
    const logRef = doc(collection(db, 'auditLogs'));
    const logItem: AuditLogItem = {
      id: logRef.id,
      action,
      actorUid,
      actorEmail,
      actorRole,
      details,
      targetId: targetId || '',
      timestamp: new Date().toISOString(),
    };
    await setDoc(logRef, logItem);
  } catch (err) {
    // Audit logging shouldn't crash client action, but log to console
    console.warn('Failed to write audit log:', err);
  }
}

export async function fetchAuditLogs(max = 50): Promise<AuditLogItem[]> {
  try {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditLogItem, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'auditLogs');
  }
}

// ==========================================
// CLASSES MANAGEMENT
// ==========================================
export async function fetchClasses(): Promise<SchoolClass[]> {
  try {
    const q = query(collection(db, 'classes'), orderBy('grade', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SchoolClass, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'classes');
  }
}

export async function createClass(data: Omit<SchoolClass, 'id' | 'createdAt'>): Promise<string> {
  try {
    const classRef = doc(collection(db, 'classes'));
    const item: SchoolClass = {
      ...data,
      id: classRef.id,
      studentCount: 0,
      createdAt: new Date().toISOString(),
    };
    await setDoc(classRef, item);
    return classRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'classes');
  }
}

export async function updateClass(id: string, data: Partial<SchoolClass>): Promise<void> {
  try {
    await updateDoc(doc(db, 'classes', id), data);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `classes/${id}`);
  }
}

export async function deleteClass(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'classes', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `classes/${id}`);
  }
}

// ==========================================
// SUBJECTS MANAGEMENT
// ==========================================
export async function fetchSubjects(): Promise<SchoolSubject[]> {
  try {
    const snap = await getDocs(collection(db, 'subjects'));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SchoolSubject, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'subjects');
  }
}

export async function createSubject(data: Omit<SchoolSubject, 'id' | 'createdAt'>): Promise<string> {
  try {
    const ref = doc(collection(db, 'subjects'));
    const item: SchoolSubject = {
      ...data,
      id: ref.id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(ref, item);
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'subjects');
  }
}

export async function deleteSubject(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'subjects', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `subjects/${id}`);
  }
}

// ==========================================
// STUDENTS MANAGEMENT
// ==========================================
export async function fetchStudents(): Promise<StudentProfile[]> {
  try {
    const snap = await getDocs(collection(db, 'students'));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as StudentProfile) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'students');
  }
}

export async function createStudent(data: Omit<StudentProfile, 'id'>): Promise<string> {
  try {
    const studentRef = doc(db, 'students', data.uid);
    const now = new Date().toISOString();
    const item: StudentProfile = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(studentRef, item);

    // Also update users collection role
    await setDoc(
      doc(db, 'users', data.uid),
      {
        uid: data.uid,
        email: `${data.nis.toLowerCase()}@siswa.imtihan.cbt`,
        fullName: data.fullName,
        role: 'student',
        status: data.status,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

    return data.uid;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `students/${data.uid}`);
  }
}

export async function updateStudent(uid: string, data: Partial<StudentProfile>): Promise<void> {
  try {
    await updateDoc(doc(db, 'students', uid), { ...data, updatedAt: new Date().toISOString() });
    if (data.fullName || data.status) {
      await updateDoc(doc(db, 'users', uid), {
        ...(data.fullName ? { fullName: data.fullName } : {}),
        ...(data.status ? { status: data.status } : {}),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `students/${uid}`);
  }
}

// ==========================================
// TEACHERS MANAGEMENT
// ==========================================
export async function fetchTeachers(): Promise<TeacherProfile[]> {
  try {
    const snap = await getDocs(collection(db, 'teachers'));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as TeacherProfile) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'teachers');
  }
}

export async function createTeacher(data: Omit<TeacherProfile, 'id'>): Promise<string> {
  try {
    const teacherRef = doc(db, 'teachers', data.uid);
    const now = new Date().toISOString();
    const item: TeacherProfile = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(teacherRef, item);

    // Also sync to users collection
    await setDoc(
      doc(db, 'users', data.uid),
      {
        uid: data.uid,
        email: data.email,
        fullName: data.fullName,
        role: 'teacher',
        status: data.status,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

    return data.uid;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `teachers/${data.uid}`);
  }
}

export async function updateTeacher(uid: string, data: Partial<TeacherProfile>): Promise<void> {
  try {
    await updateDoc(doc(db, 'teachers', uid), { ...data, updatedAt: new Date().toISOString() });
    if (data.fullName || data.status || data.email) {
      await updateDoc(doc(db, 'users', uid), {
        ...(data.fullName ? { fullName: data.fullName } : {}),
        ...(data.email ? { email: data.email } : {}),
        ...(data.status ? { status: data.status } : {}),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `teachers/${uid}`);
  }
}

// ==========================================
// QUESTION BANK
// ==========================================
export async function fetchQuestions(teacherUid?: string): Promise<QuestionItem[]> {
  try {
    let q = query(collection(db, 'questionBanks'), orderBy('createdAt', 'desc'));
    if (teacherUid) {
      q = query(collection(db, 'questionBanks'), where('authorUid', '==', teacherUid));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<QuestionItem, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'questionBanks');
  }
}

export async function createQuestion(data: Omit<QuestionItem, 'id' | 'createdAt'>): Promise<string> {
  try {
    const ref = doc(collection(db, 'questionBanks'));
    const item: QuestionItem = {
      ...data,
      id: ref.id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(ref, item);
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'questionBanks');
  }
}

export async function updateQuestion(id: string, data: Partial<QuestionItem>): Promise<void> {
  try {
    await updateDoc(doc(db, 'questionBanks', id), data);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `questionBanks/${id}`);
  }
}

export async function deleteQuestion(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'questionBanks', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `questionBanks/${id}`);
  }
}

// ==========================================
// EXAMS MANAGEMENT
// ==========================================
export async function fetchExams(teacherUid?: string): Promise<Exam[]> {
  try {
    let q = query(collection(db, 'exams'), orderBy('createdAt', 'desc'));
    if (teacherUid) {
      q = query(collection(db, 'exams'), where('teacherUid', '==', teacherUid));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Exam, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'exams');
  }
}

export async function fetchExamsForStudent(classId: string, level: string): Promise<Exam[]> {
  try {
    const q = query(
      collection(db, 'exams'),
      where('educationLevel', '==', level),
      where('status', 'in', ['scheduled', 'active'])
    );
    const snap = await getDocs(q);
    const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Exam, 'id'>) }));
    // Filter exams assigned to student's class
    return all.filter((ex) => !ex.classIds || ex.classIds.length === 0 || ex.classIds.includes(classId));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'exams');
  }
}

export async function fetchExamById(examId: string): Promise<Exam | null> {
  try {
    const snap = await getDoc(doc(db, 'exams', examId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<Exam, 'id'>) };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `exams/${examId}`);
  }
}

export async function createExam(data: Omit<Exam, 'id' | 'createdAt'>): Promise<string> {
  try {
    const ref = doc(collection(db, 'exams'));
    const item: Exam = {
      ...data,
      id: ref.id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(ref, item);
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'exams');
  }
}

export async function updateExam(id: string, data: Partial<Exam>): Promise<void> {
  try {
    await updateDoc(doc(db, 'exams', id), { ...data, updatedAt: new Date().toISOString() });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `exams/${id}`);
  }
}

export async function deleteExam(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'exams', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `exams/${id}`);
  }
}

// ==========================================
// EXAM ATTEMPTS & STUDENT SESSIONS
// ==========================================
export async function fetchStudentAttempts(studentUid: string): Promise<ExamAttempt[]> {
  try {
    const q = query(collection(db, 'examAttempts'), where('studentUid', '==', studentUid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ExamAttempt, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'examAttempts');
  }
}

export async function fetchAttemptById(attemptId: string): Promise<ExamAttempt | null> {
  try {
    const snap = await getDoc(doc(db, 'examAttempts', attemptId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<ExamAttempt, 'id'>) };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `examAttempts/${attemptId}`);
  }
}

export async function createExamAttempt(
  exam: Exam,
  student: StudentProfile
): Promise<ExamAttempt> {
  try {
    const attemptRef = doc(collection(db, 'examAttempts'));
    const now = new Date();
    const deadline = new Date(now.getTime() + exam.durationMinutes * 60 * 1000);

    // Shuffle questions if required
    let questionOrder = exam.questions.map((q) => q.id);
    if (exam.shuffleQuestions) {
      questionOrder = [...questionOrder].sort(() => Math.random() - 0.5);
    }

    const attempt: ExamAttempt = {
      id: attemptRef.id,
      examId: exam.id,
      studentUid: student.uid,
      studentName: student.fullName,
      studentNis: student.nis,
      examTitle: exam.title,
      subject: exam.subject,
      educationLevel: exam.educationLevel,
      gradeLevel: exam.gradeLevel,
      className: student.className,
      status: 'in_progress',
      startedAt: now.toISOString(),
      deadlineAt: deadline.toISOString(),
      lastActivityAt: now.toISOString(),
      violationCount: 0,
      lastQuestionIndex: 0,
      answeredCount: 0,
      scoringStatus: 'pending',
      studentQuestionOrder: questionOrder,
    };

    await setDoc(attemptRef, attempt);
    return attempt;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'examAttempts');
  }
}

export async function saveStudentAnswer(
  attemptId: string,
  questionId: string,
  answer: string | string[] | boolean | null,
  isFlagged?: boolean
): Promise<void> {
  try {
    const answerRef = doc(db, 'examAttempts', attemptId, 'answers', questionId);
    const item: StudentAnswer = {
      questionId,
      answer,
      isFlagged: isFlagged || false,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(answerRef, item);

    // Update attempt lastActivity and fetch answered count
    const answersSnap = await getDocs(collection(db, 'examAttempts', attemptId, 'answers'));
    const answeredCount = answersSnap.docs.filter((d) => {
      const data = d.data();
      return data.answer !== null && data.answer !== '' && data.answer !== undefined;
    }).length;

    await updateDoc(doc(db, 'examAttempts', attemptId), {
      lastActivityAt: new Date().toISOString(),
      answeredCount,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `examAttempts/${attemptId}/answers/${questionId}`);
  }
}

export async function fetchAttemptAnswers(attemptId: string): Promise<Record<string, StudentAnswer>> {
  try {
    const snap = await getDocs(collection(db, 'examAttempts', attemptId, 'answers'));
    const map: Record<string, StudentAnswer> = {};
    snap.docs.forEach((d) => {
      map[d.id] = d.data() as StudentAnswer;
    });
    return map;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `examAttempts/${attemptId}/answers`);
  }
}

export async function recordViolation(
  attemptId: string,
  type: ViolationEvent['type'],
  message: string,
  currentViolations: number,
  maxViolations = 2
): Promise<{ newCount: number; isTerminated: boolean }> {
  const newCount = currentViolations + 1;
  const isTerminated = newCount >= maxViolations;

  try {
    const eventRef = doc(collection(db, 'examAttempts', attemptId, 'events'));
    const ev: ViolationEvent = {
      id: eventRef.id,
      type,
      message,
      timestamp: new Date().toISOString(),
      violationNumber: newCount,
    };
    await setDoc(eventRef, ev);

    const updatePayload: Partial<ExamAttempt> = {
      violationCount: newCount,
      lastActivityAt: new Date().toISOString(),
    };

    if (isTerminated) {
      updatePayload.status = 'terminated_violation';
      updatePayload.submittedAt = new Date().toISOString();
      updatePayload.terminationReason = `Ujian dihentikan otomatis: Terjadi ${newCount} kali pelanggaran (${message})`;
    }

    await updateDoc(doc(db, 'examAttempts', attemptId), updatePayload);
    return { newCount, isTerminated };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `examAttempts/${attemptId}/events`);
  }
}

export async function fetchViolationEvents(attemptId: string): Promise<ViolationEvent[]> {
  try {
    const snap = await getDocs(collection(db, 'examAttempts', attemptId, 'events'));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as ViolationEvent) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `examAttempts/${attemptId}/events`);
  }
}

export async function submitExamAttempt(
  attemptId: string,
  exam: Exam,
  terminationReason?: string
): Promise<ExamAttempt> {
  try {
    const now = new Date().toISOString();
    const answers = await fetchAttemptAnswers(attemptId);

    // Calculate objective scores
    let objectiveTotal = 0;
    let maxObjectiveWeight = 0;
    let hasEssay = false;

    exam.questions.forEach((q) => {
      const studentAns = answers[q.id]?.answer;
      if (q.type === 'essay') {
        hasEssay = true;
      } else {
        maxObjectiveWeight += q.weight;
        let isCorrect = false;

        if (q.type === 'single_choice' || q.type === 'short_answer') {
          if (
            studentAns &&
            q.correctAnswer &&
            String(studentAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()
          ) {
            isCorrect = true;
          }
        } else if (q.type === 'true_false') {
          if (studentAns !== null && studentAns !== undefined && studentAns === q.correctAnswer) {
            isCorrect = true;
          }
        } else if (q.type === 'multi_choice') {
          if (Array.isArray(studentAns) && Array.isArray(q.correctAnswer)) {
            const sortedStudent = [...studentAns].sort().join(',');
            const sortedCorrect = [...q.correctAnswer].sort().join(',');
            if (sortedStudent === sortedCorrect) {
              isCorrect = true;
            }
          }
        }

        if (isCorrect) {
          objectiveTotal += q.weight;
        }
      }
    });

    const objectiveScore = maxObjectiveWeight > 0 ? Math.round((objectiveTotal / maxObjectiveWeight) * 100) : 100;
    const finalScore = hasEssay ? undefined : objectiveScore;
    const scoringStatus = hasEssay ? 'needs_grading' : 'completed';

    const updatePayload: Partial<ExamAttempt> = {
      status: terminationReason ? 'time_expired' : 'submitted',
      submittedAt: now,
      lastActivityAt: now,
      objectiveScore,
      finalScore,
      scoringStatus,
      terminationReason: terminationReason || undefined,
    };

    await updateDoc(doc(db, 'examAttempts', attemptId), updatePayload);

    const updated = await fetchAttemptById(attemptId);
    return updated!;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `examAttempts/${attemptId}`);
  }
}

// Subscribe to real-time attempts for proctoring/monitoring
export function subscribeToExamAttempts(
  examId: string | null,
  callback: (attempts: ExamAttempt[]) => void
) {
  let q = query(collection(db, 'examAttempts'), orderBy('lastActivityAt', 'desc'));
  if (examId) {
    q = query(collection(db, 'examAttempts'), where('examId', '==', examId));
  }

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ExamAttempt, 'id'>) }));
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'examAttempts');
    }
  );
}

// Essay Grading
export async function gradeEssayQuestion(
  attemptId: string,
  questionId: string,
  score: number,
  feedback?: string
): Promise<void> {
  try {
    const answerRef = doc(db, 'examAttempts', attemptId, 'answers', questionId);
    await updateDoc(answerRef, {
      score,
      feedback: feedback || '',
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `examAttempts/${attemptId}/answers/${questionId}`);
  }
}

export async function finalizeAttemptScoring(
  attemptId: string,
  exam: Exam
): Promise<void> {
  try {
    const answers = await fetchAttemptAnswers(attemptId);
    let totalScore = 0;
    let totalWeight = 0;
    let essayScoreSum = 0;
    let essayWeightSum = 0;

    exam.questions.forEach((q) => {
      totalWeight += q.weight;
      if (q.type === 'essay') {
        essayWeightSum += q.weight;
        const awarded = answers[q.id]?.score || 0;
        essayScoreSum += awarded;
        totalScore += awarded;
      } else {
        const studentAns = answers[q.id]?.answer;
        let isCorrect = false;
        if (q.type === 'single_choice' || q.type === 'short_answer') {
          if (
            studentAns &&
            q.correctAnswer &&
            String(studentAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()
          ) {
            isCorrect = true;
          }
        } else if (q.type === 'true_false') {
          if (studentAns !== null && studentAns !== undefined && studentAns === q.correctAnswer) {
            isCorrect = true;
          }
        } else if (q.type === 'multi_choice') {
          if (Array.isArray(studentAns) && Array.isArray(q.correctAnswer)) {
            const sortedStudent = [...studentAns].sort().join(',');
            const sortedCorrect = [...q.correctAnswer].sort().join(',');
            if (sortedStudent === sortedCorrect) isCorrect = true;
          }
        }
        if (isCorrect) {
          totalScore += q.weight;
        }
      }
    });

    const finalScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
    const essayScore = essayWeightSum > 0 ? Math.round((essayScoreSum / essayWeightSum) * 100) : 0;

    await updateDoc(doc(db, 'examAttempts', attemptId), {
      essayScore,
      finalScore,
      scoringStatus: 'completed',
      lastActivityAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `examAttempts/${attemptId}`);
  }
}
