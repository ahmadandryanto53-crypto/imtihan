import React, { useState } from 'react';
import { Header } from '../common/Header';
import { AdminSidebar, AdminTab } from './AdminSidebar';
import { AdminDashboard } from './AdminDashboard';
import { StudentManagement } from './StudentManagement';
import { TeacherManagement } from './TeacherManagement';
import { ClassManagement } from './ClassManagement';
import { SubjectManagement } from './SubjectManagement';
import { QuestionBank } from '../teacher/QuestionBank';
import { ExamList } from '../teacher/ExamList';
import { RealtimeMonitor } from '../teacher/RealtimeMonitor';
import { ExamResults } from '../teacher/ExamResults';
import { AuditLogsView } from './AuditLogsView';
import { AppSettingsView } from './AppSettingsView';

export const AdminLayout: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<AdminTab>('dashboard');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Courier_Prime',monospace]">
      <Header />
      <div className="flex-1 flex">
        <AdminSidebar currentTab={currentTab} onSelectTab={setCurrentTab} />
        <main className="flex-1 overflow-x-hidden">
          {currentTab === 'dashboard' && <AdminDashboard onNavigate={setCurrentTab} />}
          {currentTab === 'students' && <StudentManagement />}
          {currentTab === 'teachers' && <TeacherManagement />}
          {currentTab === 'classes' && <ClassManagement />}
          {currentTab === 'subjects' && <SubjectManagement />}
          {currentTab === 'question_bank' && <QuestionBank />}
          {currentTab === 'exams' && (
            <ExamList onNavigate={() => setCurrentTab('question_bank')} />
          )}
          {currentTab === 'monitor' && <RealtimeMonitor />}
          {currentTab === 'all_results' && <ExamResults />}
          {currentTab === 'audit_logs' && <AuditLogsView />}
          {currentTab === 'settings' && <AppSettingsView />}
        </main>
      </div>
    </div>
  );
};
