# Firestore Security Specification - إمتحان (Imtihan)

## 1. Data Invariants
- **Authentication**: All read and write operations require valid authentication.
- **Role Isolation**:
  - `admins`: Can manage all collections, users, classes, subjects, exams, questions, and view global audit logs. Bootstrapped admin is `ahmadandryanto53@guru.sd.belajar.id`.
  - `teachers`: Can create and manage their own question banks, exams, view attempts for their exams, and grade essays. Cannot view or edit other teachers' private drafts unless authorized.
  - `students`: Can only view exams assigned to their class, start attempts for eligible exams, view their own attempts, and write their own answers during an active, non-expired attempt. Students CANNOT read correct answers from exams or question banks.
- **Attempt Locking**: Once an attempt status is terminal (`submitted`, `terminated_violation`, `time_expired`), students cannot modify answers or attempts.
- **Audit Logs**: Append-only for authenticated system events; students cannot delete or modify logs.

## 2. The "Dirty Dozen" Payloads (Attacks Blocked)
1. Unauthenticated reading of any collection (DENIED).
2. Student reading `questionBanks` containing `correctAnswer` (DENIED).
3. Student reading another student's `examAttempts` (DENIED).
4. Student altering their `finalScore` or `objectiveScore` in an attempt (DENIED).
5. Student modifying `answers` after attempt deadline or submission (DENIED).
6. Non-admin writing to `admins` or elevating role in `users` (DENIED).
7. Student resetting `violationCount` on their own attempt (DENIED).
8. Malicious client writing oversized payloads > 64KB into answer fields (DENIED).
9. Malicious client attempting to delete `auditLogs` (DENIED).
10. Teacher deleting another teacher's active exam with active attempts (DENIED).
11. Unauthorized student attempting an exam from a different grade or class (DENIED).
12. Forged attempt creation without matching `studentUid == request.auth.uid` (DENIED).
