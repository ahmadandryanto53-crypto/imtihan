import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Exam, ExamAttempt } from '../../types';
import {
  fetchExamsForStudent,
  fetchStudentAttempts,
  createExamAttempt,
} from '../../services/db';
import { ExamRoom } from './ExamRoom';
import { EmptyState } from '../common/EmptyState';
import { Header } from '../common/Header';
import { formatDateIndo } from '../../utils/format';
import {
  FileText,
  KeyRound,
  Play,
  CheckCircle,
  AlertCircle,
  Clock,
  ShieldAlert,
  ArrowRight,
  School,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user, profile, student } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<ExamAttempt | null>(null);

  // Token input modal state
  const [selectedExamForToken, setSelectedExamForToken] = useState<Exam | null>(null);
  const [inputToken, setInputToken] = useState<string>('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState<boolean>(false);

  // Exam completion screen state
  const [finishedAttempt, setFinishedAttempt] = useState<ExamAttempt | null>(null);

  const loadData = async () => {
    if (!student && !profile) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const studentClassId = student?.classId || '';
      const educationLevel = student?.educationLevel || 'SD';

      const [availableExams, myAttempts] = await Promise.all([
        fetchExamsForStudent(studentClassId, educationLevel),
        user ? fetchStudentAttempts(user.uid) : Promise.resolve([]),
      ]);

      setExams(availableExams);
      setAttempts(myAttempts);

      // Check if student has an ongoing in_progress attempt
      const ongoing = myAttempts.find((att) => {
        if (att.status !== 'in_progress') return false;
        const deadline = new Date(att.deadlineAt).getTime();
        return Date.now() < deadline;
      });

      if (ongoing) {
        const matchedExam = availableExams.find((e) => e.id === ongoing.examId);
        if (matchedExam) {
          setActiveExam(matchedExam);
          setCurrentAttempt(ongoing);
        }
      }
    } catch (err) {
      console.error('Error loading student data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [student, profile]);

  const handleStartExamClick = (exam: Exam) => {
    setSelectedExamForToken(exam);
    setInputToken('');
    setTokenError(null);
  };

  const handleVerifyTokenAndStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamForToken || !user) return;

    if (inputToken.trim().toUpperCase() !== selectedExamForToken.token.trim().toUpperCase()) {
      setTokenError('Token ujian tidak valid. Pastikan Anda memasukkan token yang benar dari pengawas.');
      return;
    }

    // Check exam schedule if set
    const now = new Date();
    if (selectedExamForToken.startTime && new Date(selectedExamForToken.startTime) > now) {
      setTokenError(`Ujian belum dapat dimulai. Jadwal mulai: ${formatDateIndo(selectedExamForToken.startTime)}`);
      return;
    }

    if (selectedExamForToken.endTime && new Date(selectedExamForToken.endTime) < now) {
      setTokenError('Waktu ujian telah berakhir.');
      return;
    }

    setIsStarting(true);
    setTokenError(null);

    try {
      const studentProfile = student || {
        uid: user.uid,
        nis: profile?.fullName || 'SISWA-001',
        fullName: profile?.fullName || user.displayName || 'Siswa',
        educationLevel: selectedExamForToken.educationLevel,
        gradeLevel: selectedExamForToken.gradeLevel,
        classId: selectedExamForToken.classIds[0] || 'default',
        className: 'Peserta Ujian',
        academicYear: '2026/2027',
        status: 'active',
      };

      const newAttempt = await createExamAttempt(selectedExamForToken, studentProfile);
      setActiveExam(selectedExamForToken);
      setCurrentAttempt(newAttempt);
      setSelectedExamForToken(null);
    } catch (err: any) {
      console.error('Error starting attempt:', err);
      setTokenError(err.message || 'Gagal memulai ujian. Silakan coba lagi.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleFinishExam = (finished: ExamAttempt) => {
    setActiveExam(null);
    setCurrentAttempt(null);
    setFinishedAttempt(finished);
    loadData();
  };

  // If in active exam room
  if (activeExam && currentAttempt) {
    return (
      <ExamRoom
        exam={activeExam}
        attempt={currentAttempt}
        onFinishExam={handleFinishExam}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Courier_Prime',monospace]">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8">
        {/* Finished Attempt Notification Banner / Modal */}
        {finishedAttempt && (
          <div className="mb-8 p-6 bg-white border-2 border-emerald-600 shadow-sm text-slate-900">
            <div className="flex items-center space-x-3 text-emerald-700 mb-2">
              <CheckCircle className="w-6 h-6 shrink-0" />
              <h2 className="text-base font-bold uppercase tracking-wider">
                Ujian Berhasil Diselesaikan & Dikumpulkan
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Jawaban Anda untuk ujian <span className="font-bold">{finishedAttempt.examTitle}</span> telah tersimpan di server.
            </p>

            <div className="p-4 bg-slate-50 border border-slate-200 text-xs font-mono grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-slate-500 block">Waktu Selesai:</span>
                <span className="font-bold">{formatDateIndo(finishedAttempt.submittedAt)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status:</span>
                <span className="font-bold uppercase text-emerald-700">
                  {finishedAttempt.status === 'terminated_violation'
                    ? 'Dihentikan (Pelanggaran)'
                    : finishedAttempt.status === 'time_expired'
                    ? 'Waktu Habis'
                    : 'Tuntas Dikumpulkan'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Pelanggaran:</span>
                <span className="font-bold">{finishedAttempt.violationCount} kali</span>
              </div>
              <div>
                <span className="text-slate-500 block">Nilai Objektif:</span>
                <span className="font-bold text-sky-700">
                  {finishedAttempt.objectiveScore !== undefined
                    ? `${finishedAttempt.objectiveScore} / 100`
                    : 'Menunggu Penilaian'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setFinishedAttempt(null)}
              className="mt-4 px-4 py-1.5 bg-slate-800 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-900 cursor-pointer"
            >
              Tutup Pemberitahuan
            </button>
          </div>
        )}

        {/* Student Identity Card */}
        <div className="bg-white border border-slate-200 p-6 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
              <School className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 uppercase">
                {student?.fullName || profile?.fullName || user?.displayName || 'Siswa CBT'}
              </h1>
              <div className="text-xs text-slate-500 flex items-center space-x-3 mt-1">
                <span>NIS: {student?.nis || '-'}</span>
                <span>•</span>
                <span>Jenjang: {student?.educationLevel || 'SD/SMP/SMA'}</span>
                <span>•</span>
                <span>Kelas: {student?.className || student?.gradeLevel || '-'}</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-right text-slate-500">
            <div className="font-bold text-slate-700">Tahun Ajaran</div>
            <div>{student?.academicYear || '2026/2027'}</div>
          </div>
        </div>

        {/* Section: Daftar Ujian Tersedia */}
        <div className="mb-10">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <FileText className="w-5 h-5 text-sky-700" />
                <span>Daftar Ujian Tersedia</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih ujian yang dijadwalkan untuk kelas Anda, lalu masukkan token untuk memulai.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-xs text-slate-500 font-mono">
              Memuat data ujian...
            </div>
          ) : exams.length === 0 ? (
            <EmptyState message="Belum ada ujian yang tersedia untuk jenjang dan kelas Anda." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {exams.map((exam) => {
                const pastAttempt = attempts.find((a) => a.examId === exam.id);
                const isCompleted =
                  pastAttempt &&
                  (pastAttempt.status === 'submitted' ||
                    pastAttempt.status === 'terminated_violation' ||
                    pastAttempt.status === 'time_expired');
                const isInProgress = pastAttempt && pastAttempt.status === 'in_progress';

                return (
                  <div
                    key={exam.id}
                    className="bg-white border border-slate-200 p-6 flex flex-col justify-between hover:border-sky-300 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-mono font-bold bg-sky-50 text-sky-800 px-2 py-0.5 border border-sky-200">
                          {exam.subject}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono uppercase">
                          {exam.educationLevel} Kelas {exam.gradeLevel}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 mb-2">
                        {exam.title}
                      </h3>
                      {exam.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                          {exam.description}
                        </p>
                      )}

                      <div className="space-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3 mt-3">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Durasi: {exam.durationMinutes} Menit</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>Jumlah Soal: {exam.questionCount || exam.questions.length} Soal</span>
                        </div>
                        {exam.startTime && (
                          <div className="text-[11px] text-slate-400">
                            Jadwal: {formatDateIndo(exam.startTime)} s/d {formatDateIndo(exam.endTime)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                      {isCompleted ? (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-emerald-700 font-bold flex items-center space-x-1">
                            <CheckCircle className="w-4 h-4" />
                            <span>Sudah Dikerjakan</span>
                          </span>
                          {exam.showScoreAfterExam && pastAttempt.finalScore !== undefined && (
                            <span className="font-bold text-slate-800 font-mono">
                              Nilai: {pastAttempt.finalScore}
                            </span>
                          )}
                        </div>
                      ) : isInProgress ? (
                        <button
                          onClick={() => {
                            setActiveExam(exam);
                            setCurrentAttempt(pastAttempt);
                          }}
                          className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer"
                        >
                          <Play className="w-4 h-4" />
                          <span>Lanjutkan Pengerjaan</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartExamClick(exam)}
                          className="w-full py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer"
                        >
                          <KeyRound className="w-4 h-4" />
                          <span>Mulai Ujian (Input Token)</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section: Riwayat Ujian Siswa */}
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
            Riwayat Ujian Anda
          </h2>
          {attempts.length === 0 ? (
            <div className="p-6 bg-white border border-slate-200 text-center text-xs text-slate-500">
              Belum ada riwayat ujian yang telah dikerjakan.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Nama Ujian</th>
                    <th className="py-3 px-4">Mata Pelajaran</th>
                    <th className="py-3 px-4">Waktu Mulai</th>
                    <th className="py-3 px-4">Waktu Kumpul</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Pelanggaran</th>
                    <th className="py-3 px-4 text-right">Nilai Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {attempts.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900">{att.examTitle}</td>
                      <td className="py-3 px-4">{att.subject}</td>
                      <td className="py-3 px-4 font-mono">{formatDateIndo(att.startedAt)}</td>
                      <td className="py-3 px-4 font-mono">{formatDateIndo(att.submittedAt)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                            att.status === 'submitted'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : att.status === 'terminated_violation'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {att.status === 'submitted'
                            ? 'Selesai'
                            : att.status === 'terminated_violation'
                            ? 'Diskualifikasi'
                            : att.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">{att.violationCount} kali</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sky-800">
                        {att.finalScore !== undefined
                          ? att.finalScore
                          : att.objectiveScore !== undefined
                          ? att.objectiveScore
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal Input Token Ujian */}
      {selectedExamForToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-slate-300 max-w-md w-full p-6 text-slate-900 shadow-xl">
            <div className="flex items-center space-x-2 text-sky-800 mb-2">
              <KeyRound className="w-5 h-5" />
              <h3 className="text-base font-bold uppercase tracking-wide">
                Validasi Token Ujian
              </h3>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Anda akan memulai <span className="font-bold">{selectedExamForToken.title}</span> ({selectedExamForToken.subject}).
              Silakan masukkan token yang diberikan oleh pengawas ujian.
            </p>

            {tokenError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <div>{tokenError}</div>
              </div>
            )}

            <form onSubmit={handleVerifyTokenAndStart} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Token Ujian
                </label>
                <input
                  type="text"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value.toUpperCase())}
                  placeholder="Contoh: CBT2026"
                  required
                  autoFocus
                  maxLength={12}
                  className="w-full p-3 border border-slate-300 text-center font-mono font-bold text-lg tracking-widest text-slate-900 focus:outline-none focus:border-sky-600 uppercase"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div>• Durasi: {selectedExamForToken.durationMinutes} Menit</div>
                <div>• Mode layar penuh (fullscreen) wajib aktif.</div>
                <div>• Toleransi pelanggaran maksimal {selectedExamForToken.maxViolations || 2} kali.</div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedExamForToken(null)}
                  disabled={isStarting}
                  className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isStarting}
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-60 flex items-center space-x-1.5"
                >
                  {isStarting ? (
                    <span>Memvalidasi...</span>
                  ) : (
                    <>
                      <span>Mulai Ujian</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
