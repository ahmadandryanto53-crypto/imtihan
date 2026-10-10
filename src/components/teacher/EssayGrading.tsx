import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Exam, ExamAttempt, StudentAnswer, ExamQuestionSnapshot } from '../../types';
import {
  fetchExams,
  subscribeToExamAttempts,
  fetchAttemptAnswers,
  gradeEssayQuestion,
  finalizeAttemptScoring,
  fetchExamById,
} from '../../services/db';
import { EmptyState } from '../common/EmptyState';
import { formatDateIndo } from '../../utils/format';
import { PenTool, CheckCircle, Save, BookOpen } from 'lucide-react';

export const EssayGrading: React.FC = () => {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToExamAttempts(null, (data) => {
      // Filter attempts that have status submitted/expired and need grading
      const needs = data.filter(
        (a) => a.scoringStatus === 'needs_grading' || a.scoringStatus === 'completed'
      );
      setAttempts(needs);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleSelectAttempt = async (att: ExamAttempt) => {
    setSelectedAttempt(att);
    setSaving(false);

    try {
      const [ex, ans] = await Promise.all([
        fetchExamById(att.examId),
        fetchAttemptAnswers(att.id),
      ]);
      setSelectedExam(ex);
      setAnswers(ans);

      // Pre-fill existing scores & feedbacks
      const sc: Record<string, number> = {};
      const fb: Record<string, string> = {};
      Object.values(ans).forEach((a) => {
        if (a.score !== undefined) sc[a.questionId] = a.score;
        if (a.feedback) fb[a.questionId] = a.feedback;
      });
      setScores(sc);
      setFeedbacks(fb);
    } catch (err) {
      console.error(err);
    }
  };

  const handleScoreChange = (qId: string, val: number) => {
    setScores((prev) => ({ ...prev, [qId]: val }));
  };

  const handleFeedbackChange = (qId: string, text: string) => {
    setFeedbacks((prev) => ({ ...prev, [qId]: text }));
  };

  const handleSaveAndFinalize = async () => {
    if (!selectedAttempt || !selectedExam) return;
    setSaving(true);

    try {
      // Save individual essay grades
      const essayQuestions = selectedExam.questions.filter((q) => q.type === 'essay');
      for (const q of essayQuestions) {
        const sc = scores[q.id] || 0;
        const fb = feedbacks[q.id] || '';
        await gradeEssayQuestion(selectedAttempt.id, q.id, sc, fb);
      }

      // Finalize total scoring
      await finalizeAttemptScoring(selectedAttempt.id, selectedExam);
      setSelectedAttempt(null);
      setSelectedExam(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const essayQuestions: ExamQuestionSnapshot[] =
    selectedExam?.questions.filter((q) => q.type === 'essay') || [];

  return (
    <div className="p-6 md:p-8 space-y-6 font-['Courier_Prime',monospace]">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight flex items-center space-x-2">
          <PenTool className="w-5 h-5 text-sky-700" />
          <span>Penilaian Soal Esai Siswa</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Periksa jawaban esai siswa, beri skor berdasarkan rubrik penilaian, dan terbitkan nilai akhir.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-mono">
          Memuat daftar pengumpulan...
        </div>
      ) : attempts.length === 0 ? (
        <EmptyState message="Belum ada attempt ujian siswa yang membutuhkan penilaian esai." />
      ) : selectedAttempt && selectedExam ? (
        /* Grading Form for Selected Attempt */
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-500 font-mono uppercase">
                Peserta Ujian:
              </div>
              <h2 className="text-base font-bold text-slate-900">
                {selectedAttempt.studentName} ({selectedAttempt.studentNis}) - {selectedAttempt.className}
              </h2>
              <div className="text-xs text-slate-500 mt-1">
                Ujian: {selectedExam.title} ({selectedExam.subject}) | Waktu Kumpul: {formatDateIndo(selectedAttempt.submittedAt)}
              </div>
            </div>

            <button
              onClick={() => setSelectedAttempt(null)}
              className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase cursor-pointer"
            >
              Kembali ke Daftar
            </button>
          </div>

          {essayQuestions.length === 0 ? (
            <div className="p-8 bg-white border border-slate-200 text-center text-xs text-slate-500">
              Ujian ini tidak memiliki butir soal bertipe esai.
            </div>
          ) : (
            <div className="space-y-6">
              {essayQuestions.map((q, idx) => {
                const studentAns = answers[q.id]?.answer;
                const currentScore = scores[q.id] ?? 0;
                const currentFeedback = feedbacks[q.id] ?? '';

                return (
                  <div key={q.id} className="bg-white border border-slate-200 p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-xs font-bold bg-sky-700 text-white px-2.5 py-1">
                        Soal Esai #{idx + 1}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-600">
                        Bobot Maksimal: {q.weight} Poin
                      </span>
                    </div>

                    <div className="text-sm text-slate-900 font-medium whitespace-pre-wrap">
                      {q.questionText}
                    </div>

                    {q.rubric && (
                      <div className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-900">
                        <span className="font-bold">Pedoman Rubrik:</span> {q.rubric}
                      </div>
                    )}

                    {/* Jawaban Siswa */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-none">
                      <div className="text-xs font-bold text-slate-500 uppercase mb-2 font-mono">
                        Jawaban Siswa:
                      </div>
                      <div className="text-xs text-slate-900 font-mono leading-relaxed whitespace-pre-wrap">
                        {studentAns ? String(studentAns) : '(Tidak menjawab / kosong)'}
                      </div>
                    </div>

                    {/* Input Nilai & Umpan Balik */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 uppercase mb-1">
                          Skor Diberikan (0 - {q.weight})
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={q.weight}
                          value={currentScore}
                          onChange={(e) => handleScoreChange(q.id, Number(e.target.value))}
                          className="w-full p-2 border border-slate-300 bg-white font-mono font-bold text-sm"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-bold text-slate-700 uppercase mb-1">
                          Umpan Balik Guru (Opsional)
                        </label>
                        <input
                          type="text"
                          value={currentFeedback}
                          onChange={(e) => handleFeedbackChange(q.id, e.target.value)}
                          placeholder="Catatan koreksi untuk siswa..."
                          className="w-full p-2 border border-slate-300 bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedAttempt(null)}
                  className="px-5 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndFinalize}
                  disabled={saving}
                  className="px-6 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold uppercase tracking-wider text-xs cursor-pointer flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Menyimpan...' : 'Simpan & Terbitkan Nilai Akhir'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* List of Attempts to Grade */
        <div className="bg-white border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">NIS</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Ujian</th>
                <th className="py-3 px-4">Waktu Selesai</th>
                <th className="py-3 px-4">Status Penilaian</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {attempts.map((att) => (
                <tr key={att.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900">{att.studentName}</td>
                  <td className="py-3 px-4 font-mono">{att.studentNis}</td>
                  <td className="py-3 px-4 font-mono">{att.className}</td>
                  <td className="py-3 px-4">{att.examTitle}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {formatDateIndo(att.submittedAt)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${
                        att.scoringStatus === 'needs_grading'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {att.scoringStatus === 'needs_grading'
                        ? 'Perlu Penilaian Esai'
                        : 'Sudah Dinilai'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleSelectAttempt(att)}
                      className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-[11px] uppercase tracking-wider cursor-pointer"
                    >
                      Beri Nilai Esai
                    </button>
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
