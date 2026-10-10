import React, { useState, useEffect } from 'react';
import {
  fetchStudents,
  fetchTeachers,
  fetchClasses,
  fetchExams,
  subscribeToExamAttempts,
} from '../../services/db';
import { EmptyState } from '../common/EmptyState';
import {
  GraduationCap,
  Users,
  School,
  FileText,
  PlayCircle,
  Activity,
  CheckCircle,
  Award,
} from 'lucide-react';
import { AdminTab } from './AdminSidebar';

interface AdminDashboardProps {
  onNavigate: (tab: AdminTab) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [studentCount, setStudentCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [classCount, setClassCount] = useState(0);
  const [examCount, setExamCount] = useState(0);
  const [activeExamsCount, setActiveExamsCount] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchStudents(),
      fetchTeachers(),
      fetchClasses(),
      fetchExams(),
    ])
      .then(([students, teachers, classes, exams]) => {
        setStudentCount(students.length);
        setTeacherCount(teachers.length);
        setClassCount(classes.length);
        setExamCount(exams.length);
        setActiveExamsCount(exams.filter((e) => e.status === 'active').length);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    const unsub = subscribeToExamAttempts(null, (attempts) => {
      setInProgressCount(attempts.filter((a) => a.status === 'in_progress').length);
      const done = attempts.filter(
        (a) =>
          a.status === 'submitted' ||
          a.status === 'time_expired' ||
          a.status === 'terminated_violation'
      );
      setCompletedCount(done.length);

      const scored = done.filter((a) => a.finalScore !== undefined);
      if (scored.length > 0) {
        const sum = scored.reduce((acc, a) => acc + (a.finalScore || 0), 0);
        setAverageScore(Math.round(sum / scored.length));
      } else {
        setAverageScore(null);
      }
    });

    return () => unsub();
  }, []);

  const isDatabaseEmpty =
    studentCount === 0 &&
    teacherCount === 0 &&
    classCount === 0 &&
    examCount === 0;

  return (
    <div className="p-6 md:p-8 space-y-8 font-['Courier_Prime',monospace]">
      <div>
        <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
          Dashboard Administrator
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Statistik sistem CBT aktual dari Cloud Firestore. Seluruh metrik bersumber dari data nyata.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-mono">
          Memuat rekapitulasi sistem...
        </div>
      ) : isDatabaseEmpty ? (
        <EmptyState
          message="Sistem masih dalam kondisi baru (Database Kosong). Mulai dengan menambahkan Kelas, Mata Pelajaran, Akun Guru, atau Akun Siswa."
          actionButton={
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => onNavigate('classes')}
                className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                + Kelola Kelas
              </button>
              <button
                onClick={() => onNavigate('students')}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                + Kelola Siswa
              </button>
              <button
                onClick={() => onNavigate('teachers')}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                + Kelola Guru
              </button>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Total Siswa
              </span>
              <GraduationCap className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono">{studentCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Siswa terdaftar aktif</div>
          </div>

          <div className="bg-white border border-slate-200 p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Total Guru
              </span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono">{teacherCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Guru pengampu mapel</div>
          </div>

          <div className="bg-white border border-slate-200 p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Total Rombel / Kelas
              </span>
              <School className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono">{classCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Kelas SD, SMP, SMA</div>
          </div>

          <div className="bg-white border border-slate-200 p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Total Sesi Ujian
              </span>
              <FileText className="w-4 h-4 text-sky-700" />
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono">{examCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">{activeExamsCount} sedang aktif</div>
          </div>

          <div className="bg-white border border-slate-200 p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Sedang Mengerjakan
              </span>
              <Activity className="w-4 h-4 text-amber-600 animate-pulse" />
            </div>
            <div className="text-2xl font-bold text-amber-700 font-mono">
              {inProgressCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Siswa aktif realtime</div>
          </div>

          <div className="bg-white border border-slate-200 p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Attempt Selesai
              </span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700 font-mono">
              {completedCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Telah dikumpulkan</div>
          </div>

          <div className="bg-white border border-slate-200 p-5 sm:col-span-2">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Rata-rata Nilai Global
              </span>
              <Award className="w-4 h-4 text-sky-700" />
            </div>
            <div className="text-2xl font-bold text-sky-800 font-mono">
              {averageScore !== null ? `${averageScore} / 100` : 'Belum Ada Penilaian'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Rata-rata kumulatif seluruh peserta
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
