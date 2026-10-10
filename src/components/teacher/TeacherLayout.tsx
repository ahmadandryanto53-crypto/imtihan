import React, { useState } from 'react';
import { Header } from '../common/Header';
import { TeacherSidebar, TeacherTab } from './TeacherSidebar';
import { TeacherDashboard } from './TeacherDashboard';
import { QuestionBank } from './QuestionBank';
import { ExamCreate } from './ExamCreate';
import { ExamList } from './ExamList';
import { RealtimeMonitor } from './RealtimeMonitor';
import { ExamResults } from './ExamResults';
import { EssayGrading } from './EssayGrading';
import { TeacherProfileView } from './TeacherProfileView';

export const TeacherLayout: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TeacherTab>('dashboard');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Courier_Prime',monospace]">
      <Header />
      <div className="flex-1 flex">
        <TeacherSidebar currentTab={currentTab} onSelectTab={setCurrentTab} />
        <main className="flex-1 overflow-x-hidden">
          {currentTab === 'dashboard' && <TeacherDashboard onNavigate={setCurrentTab} />}
          {currentTab === 'question_bank' && <QuestionBank />}
          {currentTab === 'create_exam' && <ExamCreate onSuccess={setCurrentTab} />}
          {currentTab === 'exam_list' && <ExamList onNavigate={setCurrentTab} />}
          {currentTab === 'monitor' && <RealtimeMonitor />}
          {currentTab === 'results' && <ExamResults />}
          {currentTab === 'essay_grading' && <EssayGrading />}
          {currentTab === 'profile' && <TeacherProfileView />}
        </main>
      </div>
    </div>
  );
};
