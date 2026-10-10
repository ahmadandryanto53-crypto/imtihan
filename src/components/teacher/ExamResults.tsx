import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Exam, ExamAttempt } from '../../types';
import { fetchExams, subscribeToExamAttempts } from '../../services/db';
import { EmptyState } from '../common/EmptyState';
import { formatDateIndo } from '../../utils/format';
import { exportToExcel } from '../../utils/csv';
import { Award, Download, Filter, Search, CheckCircle } from 'lucide-react';

export const ExamResults: React.FC = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterExamId, setFilterExamId] = useState<string>('ALL');
  const [searchName, setSearchName] = useState<string>('');

  useEffect(() => {
    fetchExams(user?.uid)
      .then((data) => setExams(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    const unsub = subscribeToExamAttempts(null, (data) => {
      setAttempts(data);
    });

    return () => unsub();
  }, [user]);

  const filteredAttempts = attempts.filter((att) => {
    if (filterExamId !== 'ALL' && att.examId !== filterExamId) return false;
    if (
      searchName.trim() &&
      !att.studentName.toLowerCase().includes(searchName.toLowerCase()) &&
      !att.studentNis.toLowerCase().includes(searchName.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleExport = () => {
    const exportData = filteredAttempts.map((att, index) => ({
      No: index + 1,
      'Nama Siswa': att.studentName,
      NIS: att.studentNis,
      Kelas: att.className,
      'Nama Ujian': att.examTitle,
      'Mata Pelajaran': att.subject,
      'Waktu Mulai': formatDateIndo(att.startedAt),
      'Waktu Selesai': formatDateIndo(att.submittedAt),
      'Nilai Objektif': att.objectiveScore ?? '-',
      'Nilai Esai': att.essayScore ?? '-',
      'Nilai Akhir': att.finalScore ?? '-',
      'Status Penilaian': att.scoringStatus,
      Pelanggaran: `${att.violationCount} kali`,
      'Status Attempt': att.status,
    }));

    exportToExcel(exportData, `Laporan_Nilai_Imtihan_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 font-['Courier_Prime',monospace]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight flex items-center space-x-2">
            <Award className="w-5 h-5 text-sky-700" />
            <span>Rekapitulasi Hasil & Nilai Ujian</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Hasil evaluasi siswa, rincian skor objektif & esai, dan unduh laporan ke format Excel.
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={filteredAttempts.length === 0}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-2 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>Ekspor Laporan (Excel)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 p-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Cari nama atau NIS siswa..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="font-bold text-slate-600">Filter Ujian:</span>
          <select
            value={filterExamId}
            onChange={(e) => setFilterExamId(e.target.value)}
            className="py-1.5 px-3 border border-slate-300 bg-white font-mono focus:outline-none"
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

      {/* Results Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-mono">
          Memuat rekapitulasi nilai...
        </div>
      ) : filteredAttempts.length === 0 ? (
        <EmptyState message="Belum ada data nilai ujian yang terkumpul." />
      ) : (
        <div className="bg-white border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">NIS</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Nama Ujian</th>
                <th className="py-3 px-4 text-right">Nilai Objektif</th>
                <th className="py-3 px-4 text-right">Nilai Esai</th>
                <th className="py-3 px-4 text-right">Nilai Akhir</th>
                <th className="py-3 px-4">Status Penilaian</th>
                <th className="py-3 px-4 text-center">Pelanggaran</th>
                <th className="py-3 px-4">Waktu Selesai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAttempts.map((att) => (
                <tr key={att.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900">{att.studentName}</td>
                  <td className="py-3 px-4 font-mono">{att.studentNis}</td>
                  <td className="py-3 px-4 font-mono">{att.className}</td>
                  <td className="py-3 px-4">{att.examTitle}</td>
                  <td className="py-3 px-4 text-right font-mono">
                    {att.objectiveScore !== undefined ? att.objectiveScore : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {att.essayScore !== undefined ? att.essayScore : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-sky-800 text-sm">
                    {att.finalScore !== undefined ? att.finalScore : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${
                        att.scoringStatus === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : att.scoringStatus === 'needs_grading'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {att.scoringStatus === 'completed'
                        ? 'Selesai Dinilai'
                        : att.scoringStatus === 'needs_grading'
                        ? 'Perlu Nilai Esai'
                        : 'Menunggu'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono">{att.violationCount} kali</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {formatDateIndo(att.submittedAt)}
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
