import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { StudentDashboard } from './components/student/StudentDashboard';
import { TeacherLayout } from './components/teacher/TeacherLayout';
import { AdminLayout } from './components/admin/AdminLayout';
import { ShieldAlert, RefreshCw } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user, profile, role, loading, logout } = useAuth();
  // Role override for admin to inspect other views if desired
  const [adminViewMode, setAdminViewMode] = useState<'admin' | 'teacher' | 'student'>('admin');

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-['Courier_Prime',monospace]">
        <div className="flex items-center space-x-3 text-sky-800">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm font-bold tracking-wider uppercase">
            Memuat Sistem CBT إمتحان...
          </span>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Login Page immediately
  if (!user) {
    return <LoginPage />;
  }

  // If user profile is inactive
  if (profile?.status === 'inactive') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 font-['Courier_Prime',monospace]">
        <div className="max-w-md w-full bg-white border border-red-300 p-8 text-center space-y-4">
          <ShieldAlert className="w-10 h-10 text-red-600 mx-auto" />
          <h2 className="text-base font-bold text-red-700 uppercase tracking-wider">
            Akun Dinonaktifkan
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Akun Anda ({user.email}) sedang berstatus nonaktif. Silakan hubungi Administrator Sekolah untuk mengaktifkan kembali akses Anda.
          </p>
          <button
            onClick={logout}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-900"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  // Admin View
  if (role === 'admin') {
    return (
      <div>
        {/* Floating Role Switcher bar for Admin Convenience */}
        <div className="bg-slate-900 text-white px-6 py-1.5 text-[11px] font-mono flex items-center justify-between border-b border-slate-800 sticky top-0 z-40">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300">Mode Pratinjau Administrator:</span>
            <span className="font-bold uppercase text-sky-400">
              {adminViewMode}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAdminViewMode('admin')}
              className={`px-2 py-0.5 uppercase font-bold cursor-pointer ${
                adminViewMode === 'admin'
                  ? 'bg-sky-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => setAdminViewMode('teacher')}
              className={`px-2 py-0.5 uppercase font-bold cursor-pointer ${
                adminViewMode === 'teacher'
                  ? 'bg-sky-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Guru
            </button>
            <button
              onClick={() => setAdminViewMode('student')}
              className={`px-2 py-0.5 uppercase font-bold cursor-pointer ${
                adminViewMode === 'student'
                  ? 'bg-sky-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Siswa
            </button>
          </div>
        </div>

        {adminViewMode === 'admin' && <AdminLayout />}
        {adminViewMode === 'teacher' && <TeacherLayout />}
        {adminViewMode === 'student' && <StudentDashboard />}
      </div>
    );
  }

  // Teacher View
  if (role === 'teacher') {
    return <TeacherLayout />;
  }

  // Student View (default for enrolled student accounts)
  return <StudentDashboard />;
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
