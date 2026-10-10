import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../services/firebase';
import {
  loginWithGoogle as apiLoginWithGoogle,
  loginWithEmailOrUsername as apiLoginWithEmail,
  logoutUser as apiLogout,
  fetchOrCreateUserProfile,
  BOOTSTRAP_ADMIN_EMAIL,
} from '../services/auth';
import { UserProfile, StudentProfile, TeacherProfile, UserRole } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  student: StudentProfile | null;
  teacher: TeacherProfile | null;
  role: UserRole | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (identifier: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadUserData = async (currentUser: FirebaseUser) => {
    try {
      const data = await fetchOrCreateUserProfile(currentUser);
      setProfile(data.profile);
      setStudent(data.student || null);
      setTeacher(data.teacher || null);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      // Fallback if bootstrap admin
      if (currentUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
        setProfile({
          uid: currentUser.uid,
          email: currentUser.email,
          fullName: currentUser.displayName || 'Administrator',
          role: 'admin',
          status: 'active',
        });
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadUserData(currentUser);
      } else {
        setProfile(null);
        setStudent(null);
        setTeacher(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const loggedUser = await apiLoginWithGoogle();
      await loadUserData(loggedUser);
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (identifier: string, pass: string) => {
    setLoading(true);
    try {
      const loggedUser = await apiLoginWithEmail(identifier, pass);
      await loadUserData(loggedUser);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
    setProfile(null);
    setStudent(null);
    setTeacher(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserData(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        student,
        teacher,
        role: profile?.role || null,
        loading,
        loginWithGoogle,
        loginWithEmail,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
