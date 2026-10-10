import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, StudentProfile, TeacherProfile } from '../types';

export const BOOTSTRAP_ADMIN_EMAIL = 'ahmadandryanto53@guru.sd.belajar.id';

const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function loginWithEmailOrUsername(identifier: string, pass: string): Promise<FirebaseUser> {
  let emailToUse = identifier.trim();

  // If identifier does not have '@', try resolving username/NIS
  if (!emailToUse.includes('@')) {
    try {
      // Check students table by NIS
      const q = query(collection(db, 'students'), where('nis', '==', emailToUse));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const studentDoc = snap.docs[0].data();
        if (studentDoc.email) {
          emailToUse = studentDoc.email;
        } else {
          // Standard mapped domain
          emailToUse = `${emailToUse.toLowerCase()}@siswa.imtihan.cbt`;
        }
      } else {
        emailToUse = `${emailToUse.toLowerCase()}@imtihan.cbt`;
      }
    } catch {
      emailToUse = `${emailToUse.toLowerCase()}@imtihan.cbt`;
    }
  }

  const result = await signInWithEmailAndPassword(auth, emailToUse, pass);
  return result.user;
}

export async function logoutUser(): Promise<void> {
  await fbSignOut(auth);
}

export async function fetchOrCreateUserProfile(user: FirebaseUser): Promise<{
  profile: UserProfile;
  student?: StudentProfile | null;
  teacher?: TeacherProfile | null;
}> {
  const userDocRef = doc(db, 'users', user.uid);
  let userSnap;
  try {
    userSnap = await getDoc(userDocRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
  }

  const isBootstrapAdmin = user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

  if (!userSnap.exists()) {
    // If it's the bootstrap admin email, register as admin
    if (isBootstrapAdmin) {
      const now = new Date().toISOString();
      const adminProfile: UserProfile = {
        uid: user.uid,
        email: user.email || BOOTSTRAP_ADMIN_EMAIL,
        fullName: user.displayName || 'Administrator Sistem',
        role: 'admin',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      try {
        await setDoc(userDocRef, adminProfile);
        await setDoc(doc(db, 'admins', user.uid), {
          uid: user.uid,
          email: user.email || BOOTSTRAP_ADMIN_EMAIL,
          createdAt: now,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
      }

      return { profile: adminProfile };
    }

    // Default for newly authenticated users without profile: pending assignment
    const defaultProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      fullName: user.displayName || 'Pengguna Baru',
      role: 'student', // default fallback, will show prompt if unassigned
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    return { profile: defaultProfile };
  }

  const profile = userSnap.data() as UserProfile;

  // Auto-ensure bootstrap admin has admin role
  if (isBootstrapAdmin && profile.role !== 'admin') {
    profile.role = 'admin';
    try {
      await setDoc(userDocRef, { ...profile, role: 'admin' }, { merge: true });
      await setDoc(doc(db, 'admins', user.uid), {
        uid: user.uid,
        email: user.email || BOOTSTRAP_ADMIN_EMAIL,
        createdAt: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  }

  let studentProfile: StudentProfile | null = null;
  let teacherProfile: TeacherProfile | null = null;

  if (profile.role === 'student') {
    try {
      const studentSnap = await getDoc(doc(db, 'students', user.uid));
      if (studentSnap.exists()) {
        studentProfile = { id: studentSnap.id, ...(studentSnap.data() as StudentProfile) };
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `students/${user.uid}`);
    }
  } else if (profile.role === 'teacher') {
    try {
      const teacherSnap = await getDoc(doc(db, 'teachers', user.uid));
      if (teacherSnap.exists()) {
        teacherProfile = { id: teacherSnap.id, ...(teacherSnap.data() as TeacherProfile) };
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `teachers/${user.uid}`);
    }
  }

  return { profile, student: studentProfile, teacher: teacherProfile };
}
