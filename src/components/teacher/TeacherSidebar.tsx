import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  ListOrdered,
  Activity,
  Award,
  PenTool,
  UserCheck,
} from 'lucide-react';

export type TeacherTab =
  | 'dashboard'
  | 'question_bank'
  | 'create_exam'
  | 'exam_list'
  | 'monitor'
  | 'results'
  | 'essay_grading'
  | 'profile';

interface TeacherSidebarProps {
  currentTab: TeacherTab;
  onSelectTab: (tab: TeacherTab) => void;
}

export const TeacherSidebar: React.FC<TeacherSidebarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const menuItems = [
    { id: 'dashboard', label: '1. Dashboard', icon: LayoutDashboard },
    { id: 'question_bank', label: '2. Bank Soal', icon: BookOpen },
    { id: 'create_exam', label: '3. Buat Ujian', icon: PlusCircle },
    { id: 'exam_list', label: '4. Daftar Ujian', icon: ListOrdered },
    { id: 'monitor', label: '5. Pantau Ujian', icon: Activity },
    { id: 'results', label: '6. Hasil Ujian', icon: Award },
    { id: 'essay_grading', label: '7. Penilaian Esai', icon: PenTool },
    { id: 'profile', label: '8. Profil Guru', icon: UserCheck },
  ] as const;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-61px)] flex flex-col justify-between shrink-0 font-['Courier_Prime',monospace]">
      <div className="py-4">
        <div className="px-6 pb-4 border-b border-slate-100 mb-2">
          <div className="text-[11px] font-bold text-sky-800 uppercase tracking-widest">
            Portal Guru
          </div>
          <div className="text-xs text-slate-500">Manajemen Ujian & Evaluasi</div>
        </div>

        <nav className="space-y-0.5 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id as TeacherTab)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer text-left ${
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
        <div>إمتحان (Imtihan) v1.0</div>
        <div>Mode: Guru Pengampu</div>
      </div>
    </aside>
  );
};
