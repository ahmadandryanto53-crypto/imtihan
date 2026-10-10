import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const { user, profile, logout } = useAuth();

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'teacher':
        return 'Guru Pengampu';
      case 'student':
        return 'Siswa Peserta';
      default:
        return 'Pengguna';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight text-sky-700">إمتحان</span>
            <span className="text-xs text-slate-400 font-mono">| CBT Online</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Sistem Ujian Online Terintegrasi (SD • SMP • SMA)
          </div>
        </div>
      </div>

      {user && (
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-right">
            <div>
              <div className="text-xs font-bold text-slate-800">
                {profile?.fullName || user.displayName || user.email}
              </div>
              <div className="text-[10px] text-sky-700 font-semibold uppercase tracking-wider">
                {getRoleLabel(profile?.role)}
              </div>
            </div>
            <div className="w-8 h-8 rounded bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
              <UserIcon className="w-4 h-4" />
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center space-x-1 px-3 py-1.5 border border-slate-200 hover:border-red-300 hover:text-red-600 rounded text-xs text-slate-600 transition-colors cursor-pointer"
            title="Keluar dari akun"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      )}
    </header>
  );
};
