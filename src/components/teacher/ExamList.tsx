import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Exam, ExamStatus } from '../../types';
import { fetchExams, updateExam, deleteExam } from '../../services/db';
import { EmptyState } from '../common/EmptyState';
import { formatDateIndo } from '../../utils/format';
import {
  FileText,
  KeyRound,
  Trash2,
  Copy,
  Check,
  Play,
  Pause,
  Archive,
  Clock,
} from 'lucide-react';
import { TeacherTab } from './TeacherSidebar';

interface ExamListProps {
  onNavigate: (tab: TeacherTab) => void;
}

export const ExamList: React.FC<ExamListProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchExams(user?.uid);
      setExams(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleCopyToken = (exam: Exam) => {
    navigator.clipboard.writeText(exam.token);
    setCopiedId(exam.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdateStatus = async (id: string, newStatus: ExamStatus) => {
    try {
      await updateExam(id, { status: newStatus });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus jadwal ujian ini? Data attempt yang terkait mungkin tidak dapat diakses.')) {
      try {
        await deleteExam(id);
        loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 font-['Courier_Prime',monospace]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
            Daftar Ujian
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar sesi ujian yang dibuat, status publikasi, dan pengaturan token peserta.
          </p>
        </div>

        <button
          onClick={() => onNavigate('create_exam')}
          className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
        >
          + Buat Ujian Baru
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-mono">
          Memuat daftar ujian...
        </div>
      ) : exams.length === 0 ? (
        <EmptyState
          message="Belum ada data ujian. Silakan buat ujian baru terlebih dahulu."
          actionButton={
            <button
              onClick={() => onNavigate('create_exam')}
              className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Buat Ujian Baru
            </button>
          }
        />
      ) : (
        <div className="bg-white border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Nama Ujian</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4">Jenjang & Kelas</th>
                <th className="py-3 px-4">Durasi</th>
                <th className="py-3 px-4">Jumlah Soal</th>
                <th className="py-3 px-4">Token Ujian</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Aksi & Kontrol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {exams.map((ex) => (
                <tr key={ex.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{ex.title}</div>
                    {ex.startTime && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Jadwal: {formatDateIndo(ex.startTime)}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-bold">{ex.subject}</td>
                  <td className="py-3 px-4 font-mono">
                    {ex.educationLevel} (Kls {ex.gradeLevel})
                  </td>
                  <td className="py-3 px-4 font-mono">{ex.durationMinutes} Menit</td>
                  <td className="py-3 px-4 font-mono">{ex.questionCount || ex.questions.length}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleCopyToken(ex)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 font-mono font-bold tracking-wider text-slate-900 text-xs flex items-center space-x-1 cursor-pointer"
                      title="Klik untuk salin token"
                    >
                      <span>{ex.token}</span>
                      {copiedId === ex.id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-500" />
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${
                        ex.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : ex.status === 'scheduled'
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : ex.status === 'completed'
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {ex.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      {ex.status !== 'active' ? (
                        <button
                          onClick={() => handleUpdateStatus(ex.id, 'active')}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase cursor-pointer"
                          title="Aktifkan Ujian"
                        >
                          Aktifkan
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(ex.id, 'completed')}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-bold uppercase cursor-pointer"
                          title="Selesaikan Ujian"
                        >
                          Tutup
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(ex.id)}
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        title="Hapus Ujian"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
