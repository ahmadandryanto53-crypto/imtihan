import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Exam, ExamAttempt, ViolationEvent } from '../../types';
import {
  fetchExams,
  subscribeToExamAttempts,
  fetchViolationEvents,
} from '../../services/db';
import { EmptyState } from '../common/EmptyState';
import { formatDateIndo, formatDuration } from '../../utils/format';
import {
  Activity,
  Users,
  AlertTriangle,
  Clock,
  Eye,
  CheckCircle,
  Filter,
} from 'lucide-react';

export const RealtimeMonitor: React.FC = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('ALL');
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail Modal State
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);
  const [violationEvents, setViolationEvents] = useState<ViolationEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    fetchExams(user?.uid)
      .then((data) => {
        setExams(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [user]);

  // Subscribe to realtime attempts
  useEffect(() => {
    const examParam = selectedExamId === 'ALL' ? null : selectedExamId;
    const unsub = subscribeToExamAttempts(examParam, (data) => {
      setAttempts(data);
    });

    return () => unsub();
  }, [selectedExamId]);

  const handleOpenDetail = async (attempt: ExamAttempt) => {
    setSelectedAttempt(attempt);
    setLoadingEvents(true);
    try {
      const events = await fetchViolationEvents(attempt.id);
      setViolationEvents(events);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const getStatusBadge = (att: ExamAttempt) => {
    if (att.status === 'in_progress') {
      const deadline = new Date(att.deadlineAt).getTime();
      const diff = Math.floor((deadline - Date.now()) / 1000);
      if (diff <= 300 && diff > 0) {
        return (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 font-bold uppercase text-[10px]">
            Mendekati Batas Waktu
          </span>
        );
      }
      return (
        <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 font-bold uppercase text-[10px]">
          Sedang Mengerjakan
        </span>
      );
    }
    if (att.status === 'submitted') {
      return (
        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase text-[10px]">
          Selesai / Dikumpulkan
        </span>
      );
    }
    if (att.status === 'terminated_violation') {
      return (
        <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 font-bold uppercase text-[10px]">
          Dihentikan (Pelanggaran)
        </span>
      );
    }
    if (att.status === 'time_expired') {
      return (
        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 font-bold uppercase text-[10px]">
          Waktu Habis
        </span>
      );
    }
    return <span className="text-[10px] uppercase font-bold">{att.status}</span>;
  };

  return (
    <div className="p-6 md:p-8 space-y-6 font-['Courier_Prime',monospace]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight flex items-center space-x-2">
            <Activity className="w-5 h-5 text-emerald-600 animate-pulse" />
            <span>Pantau Ujian Realtime</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring live aktivitas siswa, sisa waktu pengerjaan, dan pencatatan pelanggaran langsung dari server.
          </p>
        </div>

        {/* Filter Ujian */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="font-bold text-slate-600">Pilih Ujian:</span>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="py-1.5 px-3 border border-slate-300 bg-white font-mono text-xs focus:outline-none"
          >
            <option value="ALL">Semua Ujian</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title} ({ex.subject})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white border border-slate-200 p-3 flex justify-between items-center">
          <span className="text-slate-500 font-bold">Total Peserta:</span>
          <span className="font-bold font-mono text-slate-900">{attempts.length}</span>
        </div>
        <div className="bg-white border border-slate-200 p-3 flex justify-between items-center">
          <span className="text-slate-500 font-bold">Sedang Aktif:</span>
          <span className="font-bold font-mono text-amber-600">
            {attempts.filter((a) => a.status === 'in_progress').length}
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-3 flex justify-between items-center">
          <span className="text-slate-500 font-bold">Telah Selesai:</span>
          <span className="font-bold font-mono text-emerald-600">
            {attempts.filter((a) => a.status === 'submitted' || a.status === 'time_expired').length}
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-3 flex justify-between items-center">
          <span className="text-slate-500 font-bold">Diskualifikasi:</span>
          <span className="font-bold font-mono text-red-600">
            {attempts.filter((a) => a.status === 'terminated_violation').length}
          </span>
        </div>
      </div>

      {/* Realtime Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-mono">
          Menghubungkan listener realtime...
        </div>
      ) : attempts.length === 0 ? (
        <EmptyState message="Belum ada data peserta yang memulai ujian pada sesi ini." />
      ) : (
        <div className="bg-white border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">NIS</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Nama Ujian</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Terjawab</th>
                <th className="py-3 px-4 text-center">Pelanggaran</th>
                <th className="py-3 px-4">Aktivitas Terakhir</th>
                <th className="py-3 px-4 text-center">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {attempts.map((att) => (
                <tr key={att.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900">{att.studentName}</td>
                  <td className="py-3 px-4 font-mono">{att.studentNis}</td>
                  <td className="py-3 px-4 font-mono">{att.className}</td>
                  <td className="py-3 px-4">{att.examTitle}</td>
                  <td className="py-3 px-4">{getStatusBadge(att)}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-sky-800">
                    {att.answeredCount} soal
                  </td>
                  <td className="py-3 px-4 text-center font-mono">
                    <span
                      className={`font-bold ${
                        att.violationCount > 0 ? 'text-red-600' : 'text-slate-500'
                      }`}
                    >
                      {att.violationCount} kali
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {formatDateIndo(att.lastActivityAt)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleOpenDetail(att)}
                      className="p-1 text-slate-500 hover:text-sky-700 cursor-pointer"
                      title="Lihat Log Aktivitas"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Detail Attempt & Violation Events */}
      {selectedAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-slate-300 max-w-xl w-full p-6 text-slate-900 shadow-xl max-h-[85vh] overflow-y-auto">
            <h3 className="text-base font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-3 mb-4">
              Detail Aktivitas & Sesi Peserta
            </h3>

            <div className="bg-slate-50 border border-slate-200 p-4 mb-4 text-xs space-y-1 font-mono">
              <div>
                <span className="text-slate-500">Nama Siswa:</span>{' '}
                <span className="font-bold">{selectedAttempt.studentName}</span>
              </div>
              <div>
                <span className="text-slate-500">NIS:</span> {selectedAttempt.studentNis} | Kelas:{' '}
                {selectedAttempt.className}
              </div>
              <div>
                <span className="text-slate-500">Ujian:</span> {selectedAttempt.examTitle}
              </div>
              <div>
                <span className="text-slate-500">Waktu Mulai:</span>{' '}
                {formatDateIndo(selectedAttempt.startedAt)}
              </div>
              <div>
                <span className="text-slate-500">Batas Waktu:</span>{' '}
                {formatDateIndo(selectedAttempt.deadlineAt)}
              </div>
              {selectedAttempt.terminationReason && (
                <div className="text-red-700 font-bold mt-2">
                  Alasan Penghentian: {selectedAttempt.terminationReason}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                Riwayat Log Pelanggaran Terverifikasi
              </h4>

              {loadingEvents ? (
                <div className="text-xs text-slate-400 py-4">Memuat log...</div>
              ) : violationEvents.length === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-mono">
                  Tidak ada catatan pelanggaran. Siswa mengerjakan sesuai aturan fullscreen.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {violationEvents.map((ev, i) => (
                    <div
                      key={ev.id || i}
                      className="p-2.5 bg-red-50 border border-red-200 text-xs text-red-800 flex items-start space-x-2"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                      <div>
                        <div className="font-bold">
                          Pelanggaran #{ev.violationNumber}: {ev.message}
                        </div>
                        <div className="text-[10px] text-red-600 font-mono mt-0.5">
                          Waktu: {formatDateIndo(ev.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedAttempt(null)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
