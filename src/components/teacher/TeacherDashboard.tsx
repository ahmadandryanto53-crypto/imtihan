import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Exam, ExamAttempt } from '../../types';
import { fetchExams, subscribeToExamAttempts } from '../../services/db';
import { EmptyState } from '../common/EmptyState';
import { formatDateIndo } from '../../utils/format';
import {
  FileText,
  PlayCircle,
  Users,
  CheckCircle,
  Award,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { TeacherTab } from './TeacherSidebar';

interface TeacherDashboardProps {
  onNavigate: (tab: TeacherTab) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    fetchExams(user.uid)
      .then((data) => {
        setExams(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    // Subscribe to attempts
    const unsub = subscribeToExamAttempts(null, (allAttempts) => {
      // Filter attempts belonging to this teacher's exams
      setAttempts(allAttempts);
    });

    return () => unsub();
  }, [user]);

  // Derived statistics from real data
  const teacherExamIds = new Set(exams.map((e) => e.id));
  const myAttempts = attempts.filter((a) => teacherExamIds.has(a.examId));

  const totalExams = exams.length;
  const activeExams = exams.filter((e) => e.status === 'active').length;
  const inProgressStudents = myAttempts.filter((a) => a.status === 'in_progress').length;
  const completedAttempts = myAttempts.filter(
    (a) =>
      a.status === 'submitted' ||
      a.status === 'time_expired' ||
      a.status === 'terminated_violation'
  ).length;

  const scoredAttempts = myAttempts.filter((a) => a.finalScore !== undefined);
  const averageScore =
    scoredAttempts.length > 0
      ? Math.round(
          scoredAttempts.reduce((sum, a) => sum + (a.finalScore || 0), 0) / scoredAttempts.length
        )
      : null;

  return (
    <div className="p-6 md:p-8 space-y-8 font-['Courier_Prime',monospace]">
      <div>
        <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
          Dashboard Guru
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Ringkasan status bank soal, ujian aktif, dan hasil pengerjaan siswa secara aktual.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-mono">
          Memuat data statistik...
        </div>
      ) : totalExams === 0 && myAttempts.length === 0 ? (
        <EmptyState
          message="Belum ada data ujian atau attempt siswa. Silakan buat soal di Bank Soal dan jadwalkan Ujian terlebih dahulu."
          actionButton={
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => onNavigate('question_bank')}
                className="px-4 py-2 bg-sky-700 text-white text-xs font-bold uppercase tracking-wider hover:bg-sky-800 cursor-pointer"
              >
                Buka Bank Soal
              </button>
              <button
                onClick={() => onNavigate('create_exam')}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 cursor-pointer"
              >
                Buat Ujian Baru
              </button>
            </div>
          }
        />
      ) : (
        <>
          {/* 4 Kartu Statistik Berdasarkan Data Aktual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Total Ujian
                </span>
                <FileText className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono">{totalExams}</div>
              <div className="text-[11px] text-slate-500 mt-1">Ujian dibuat</div>
            </div>

            <div className="bg-white border border-slate-200 p-5">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Ujian Aktif
                </span>
                <PlayCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono">{activeExams}</div>
              <div className="text-[11px] text-slate-500 mt-1">Sedang berlangsung</div>
            </div>

            <div className="bg-white border border-slate-200 p-5">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Peserta Mengerjakan
                </span>
                <Users className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-700 font-mono">
                {inProgressStudents}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Siswa realtime</div>
            </div>

            <div className="bg-white border border-slate-200 p-5">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Rata-rata Nilai
                </span>
                <Award className="w-4 h-4 text-sky-700" />
              </div>
              <div className="text-2xl font-bold text-sky-800 font-mono">
                {averageScore !== null ? averageScore : '-'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Dari {completedAttempts} attempt selesai
              </div>
            </div>
          </div>

          {/* Quick Actions & Live Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ujian Aktif Saat Ini */}
            <div className="bg-white border border-slate-200 p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-sky-700" />
                  <span>Daftar Ujian Anda</span>
                </h2>
                <button
                  onClick={() => onNavigate('exam_list')}
                  className="text-xs text-sky-700 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <span>Lihat Semua</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {exams.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Belum ada ujian dibuat.
                </div>
              ) : (
                <div className="space-y-3">
                  {exams.slice(0, 4).map((ex) => (
                    <div
                      key={ex.id}
                      className="p-3 border border-slate-100 flex items-center justify-between hover:border-slate-300"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{ex.title}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {ex.subject} • {ex.educationLevel} Kelas {ex.gradeLevel} • Token: {ex.token}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 border ${
                          ex.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : ex.status === 'completed'
                            ? 'bg-slate-100 text-slate-700 border-slate-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {ex.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Aktivitas Siswa Terbaru */}
            <div className="bg-white border border-slate-200 p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-700" />
                  <span>Aktivitas Ujian Terbaru</span>
                </h2>
                <button
                  onClick={() => onNavigate('monitor')}
                  className="text-xs text-sky-700 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <span>Pantau Realtime</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {myAttempts.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Belum ada siswa yang mengerjakan ujian.
                </div>
              ) : (
                <div className="space-y-3">
                  {myAttempts.slice(0, 4).map((att) => (
                    <div
                      key={att.id}
                      className="p-3 border border-slate-100 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {att.studentName} ({att.studentNis})
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {att.examTitle} • Terakhir: {formatDateIndo(att.lastActivityAt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 border ${
                            att.status === 'in_progress'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : att.status === 'submitted'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {att.status === 'in_progress' ? 'Mengerjakan' : att.status}
                        </span>
                        {att.finalScore !== undefined && (
                          <div className="text-xs font-mono font-bold text-sky-800 mt-1">
                            Nilai: {att.finalScore}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
