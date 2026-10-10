import React from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  BookMarked,
  FileQuestion,
  CalendarCheck,
  Activity,
  Award,
  ScrollText,
  Settings,
} from 'lucide-react';

export type AdminTab =
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'classes'
  | 'subjects'
  | 'question_bank'
  | 'exams'
  | 'monitor'
  | 'all_results'
  | 'audit_logs'
  | 'settings';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const menuItems = [
    { id: 'dashboard', label: '1. Dashboard', icon: LayoutDashboard },
    { id: 'students', label: '2. Manajemen Siswa', icon: GraduationCap },
    { id: 'teachers', label: '3. Manajemen Guru', icon: Users },
    { id: 'classes', label: '4. Manajemen Kelas', icon: School },
    { id: 'subjects', label: '5. Mata Pelajaran', icon: BookMarked },
    { id: 'question_bank', label: '6. Bank Soal Global', icon: FileQuestion },
    { id: 'exams', label: '7. Manajemen Ujian', icon: CalendarCheck },
    { id: 'monitor', label: '8. Pantau Realtime', icon: Activity },
    { id: 'all_results', label: '9. Semua Nilai', icon: Award },
    { id: 'audit_logs', label: '10. Audit Log', icon: ScrollText },
    { id: 'settings', label: '11. Pengaturan Sistem', icon: Settings },
  ] as const;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-61px)] flex flex-col justify-between shrink-0 font-['Courier_Prime',monospace]">
      <div className="py-4">
        <div className="px-6 pb-4 border-b border-slate-100 mb-2">
          <div className="text-[11px] font-bold text-sky-800 uppercase tracking-widest">
            Portal Administrator
          </div>
          <div className="text-xs text-slate-500">Pusat Kendali CBT Online</div>
        </div>

        <nav className="space-y-0.5 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id as AdminTab)}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-bold transition-colors cursor-pointer text-left ${
                  isActive
                    ? 'bg-sky-50 text-sky-800 border-l-4 border-sky-600 pl-2'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent pl-2'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-700' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-100 text-[11px] text-slate-400">
        <div>إمتحان (Imtihan) CBT</div>
        <div>Mode: Administrator Utama</div>
      </div>
    </aside>
  );
};
