import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Exam,
  ExamAttempt,
  StudentAnswer,
  ExamQuestionSnapshot,
} from '../../types';
import {
  saveStudentAnswer,
  recordViolation,
  submitExamAttempt,
  fetchAttemptAnswers,
} from '../../services/db';
import { formatDuration } from '../../utils/format';
import { ViolationWarningModal } from './ViolationWarningModal';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Send,
  Maximize2,
  RefreshCw,
  Check,
} from 'lucide-react';

interface ExamRoomProps {
  exam: Exam;
  attempt: ExamAttempt;
  onFinishExam: (updatedAttempt: ExamAttempt) => void;
}

export const ExamRoom: React.FC<ExamRoomProps> = ({
  exam,
  attempt: initialAttempt,
  onFinishExam,
}) => {
  const [attempt, setAttempt] = useState<ExamAttempt>(initialAttempt);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [showViolationModal, setShowViolationModal] = useState<boolean>(false);
  const [violationAlertMessage, setViolationAlertMessage] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(true);

  const lastViolationTimeRef = useRef<number>(0);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ordered list of questions for this attempt
  const orderedQuestions: ExamQuestionSnapshot[] = React.useMemo(() => {
    if (attempt.studentQuestionOrder && attempt.studentQuestionOrder.length > 0) {
      const map = new Map(exam.questions.map((q) => [q.id, q]));
      return attempt.studentQuestionOrder
        .map((id) => map.get(id))
        .filter((q): q is ExamQuestionSnapshot => q !== undefined);
    }
    return exam.questions;
  }, [exam.questions, attempt.studentQuestionOrder]);

  const currentQuestion: ExamQuestionSnapshot | undefined = orderedQuestions[currentIndex];

  // Load existing answers on mount
  useEffect(() => {
    async function loadAnswers() {
      try {
        const loaded = await fetchAttemptAnswers(attempt.id);
        setAnswers(loaded);
      } catch (err) {
        console.error('Failed to load answers:', err);
      }
    }
    loadAnswers();
  }, [attempt.id]);

  // Request fullscreen on start
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        }
      } catch {
        setIsFullscreen(false);
      }
    };
    enterFullscreen();
  }, []);

  // Timer Countdown from deadlineAt
  useEffect(() => {
    const target = new Date(attempt.deadlineAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.floor((target - now) / 1000);
      if (diff <= 0) {
        setRemainingSeconds(0);
        handleAutoSubmit('Waktu ujian telah berakhir.');
      } else {
        setRemainingSeconds(diff);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [attempt.deadlineAt]);

  // Violation Handler with Cooldown Debounce (3 seconds cooldown between events)
  const triggerViolation = useCallback(
    async (type: 'fullscreen_exit' | 'tab_switch' | 'window_blur', msg: string) => {
      const now = Date.now();
      if (now - lastViolationTimeRef.current < 3000) {
        return; // Ignore duplicate events fired in close succession
      }
      lastViolationTimeRef.current = now;

      try {
        const result = await recordViolation(
          attempt.id,
          type,
          msg,
          attempt.violationCount,
          exam.maxViolations || 2
        );

        setAttempt((prev) => ({
          ...prev,
          violationCount: result.newCount,
          status: result.isTerminated ? 'terminated_violation' : prev.status,
        }));

        setViolationAlertMessage(msg);
        setShowViolationModal(true);

        if (result.isTerminated) {
          // Immediately finalize exam submission
          const finished = await submitExamAttempt(
            attempt.id,
            exam,
            `Dihentikan otomatis: ${result.newCount} kali pelanggaran tercatat.`
          );
          onFinishExam(finished);
        }
      } catch (err) {
        console.error('Error logging violation:', err);
      }
    },
    [attempt.id, attempt.violationCount, exam, onFinishExam]
  );

  // Monitor Fullscreen, Tab visibility, and Window blur
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFull = !!document.fullscreenElement;
      setIsFullscreen(inFull);
      if (!inFull) {
        triggerViolation('fullscreen_exit', 'Terdeteksi keluar dari mode layar penuh (Fullscreen).');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('tab_switch', 'Terdeteksi beralih tab atau meminimalkan browser.');
      }
    };

    const handleWindowBlur = () => {
      // Blur can fire on normal internal clicks, only trigger if window lost focus
      if (!document.hasFocus()) {
        triggerViolation('window_blur', 'Jendela ujian kehilangan fokus kerja.');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [triggerViolation]);

  // Answer change & autosave
  const handleAnswerChange = (val: string | string[] | boolean) => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;
    const isFlagged = answers[qId]?.isFlagged || false;

    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        questionId: qId,
        answer: val,
        isFlagged,
        updatedAt: new Date().toISOString(),
      },
    }));

    setSaveStatus('saving');
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveStudentAnswer(attempt.id, qId, val, isFlagged);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to save answer:', err);
        setSaveStatus('error');
      }
    }, 600);
  };

  const toggleFlagQuestion = async () => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;
    const current = answers[qId];
    const newFlag = !current?.isFlagged;

    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        questionId: qId,
        answer: current?.answer ?? null,
        isFlagged: newFlag,
        updatedAt: new Date().toISOString(),
      },
    }));

    try {
      await saveStudentAnswer(attempt.id, qId, current?.answer ?? null, newFlag);
    } catch {
      // ignore
    }
  };

  const handleManualSubmit = async () => {
    setShowSubmitModal(false);
    try {
      setSaveStatus('saving');
      const finished = await submitExamAttempt(attempt.id, exam);
      onFinishExam(finished);
    } catch (err) {
      console.error('Failed to submit exam:', err);
    }
  };

  const handleAutoSubmit = async (reason: string) => {
    try {
      const finished = await submitExamAttempt(attempt.id, exam, reason);
      onFinishExam(finished);
    } catch (err) {
      console.error('Failed to auto-submit exam:', err);
    }
  };

  const reEnterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {
      // ignore
    }
  };

  const currentAnswerValue = currentQuestion ? answers[currentQuestion.id]?.answer : null;
  const isCurrentFlagged = currentQuestion ? answers[currentQuestion.id]?.isFlagged : false;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-['Courier_Prime',monospace] select-none">
      {/* Violation Alert Modal */}
      {showViolationModal && (
        <ViolationWarningModal
          violationCount={attempt.violationCount}
          maxViolations={exam.maxViolations || 2}
          message={violationAlertMessage}
          onAcknowledge={() => {
            setShowViolationModal(false);
            reEnterFullscreen();
          }}
        />
      )}

      {/* Top Bar / Header Pengerjaan Ujian */}
      <header className="bg-white border-b border-slate-300 px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-base font-bold text-sky-800">{exam.title}</span>
            <span className="text-xs px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 font-mono">
              {exam.subject}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Peserta: {attempt.studentName} ({attempt.studentNis}) | Kelas: {attempt.className}
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* Status Autosave */}
          <div className="flex items-center space-x-1.5 text-xs">
            {saveStatus === 'saved' && (
              <span className="text-emerald-700 flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>Tersimpan</span>
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="text-sky-600 flex items-center space-x-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-red-600 flex items-center space-x-1 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Gagal Simpan (Cek Koneksi)</span>
              </span>
            )}
          </div>

          {/* Pelanggaran Badge */}
          <div className="flex items-center space-x-1 text-xs border border-slate-200 px-2.5 py-1 bg-slate-50">
            <span className="text-slate-500">Pelanggaran:</span>
            <span
              className={`font-bold ${
                attempt.violationCount > 0 ? 'text-red-600' : 'text-slate-800'
              }`}
            >
              {attempt.violationCount} / {exam.maxViolations || 2}
            </span>
          </div>

          {/* Countdown Timer */}
          <div className="flex items-center space-x-2 px-3 py-1 bg-slate-900 text-white font-mono text-sm border border-slate-800">
            <Clock className="w-4 h-4 text-sky-400" />
            <span className="tracking-wider">{formatDuration(remainingSeconds)}</span>
          </div>

          {/* Tombol Kumpulkan */}
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kumpulkan</span>
          </button>
        </div>
      </header>

      {/* Warning Fullscreen Exit Prompt Banner */}
      {!isFullscreen && (
        <div className="bg-red-600 text-white text-xs px-6 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Anda sedang tidak dalam mode layar penuh. Segera aktifkan kembali untuk menghindari diskualifikasi.</span>
          </div>
          <button
            onClick={reEnterFullscreen}
            className="px-3 py-1 bg-white text-red-700 font-bold uppercase text-[11px] cursor-pointer flex items-center space-x-1"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Aktifkan Fullscreen</span>
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
        {/* Left: Question Box */}
        <div className="flex-1 bg-white border border-slate-300 p-6 md:p-8 flex flex-col justify-between">
          {currentQuestion ? (
            <div>
              {/* Question Header & Flag Toggle */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-bold bg-sky-700 text-white px-3 py-1">
                    Soal No. {currentIndex + 1}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Bobot: {currentQuestion.weight} poin | Tipe:{' '}
                    {currentQuestion.type === 'single_choice'
                      ? 'Pilihan Ganda'
                      : currentQuestion.type === 'multi_choice'
                      ? 'Pilihan Ganda Kompleks'
                      : currentQuestion.type === 'true_false'
                      ? 'Benar / Salah'
                      : currentQuestion.type === 'short_answer'
                      ? 'Isian Singkat'
                      : 'Esai'}
                  </span>
                </div>

                <button
                  onClick={toggleFlagQuestion}
                  className={`flex items-center space-x-1 px-3 py-1 border text-xs cursor-pointer ${
                    isCurrentFlagged
                      ? 'bg-amber-100 border-amber-400 text-amber-800 font-bold'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{isCurrentFlagged ? 'Ditandai Ragu' : 'Tandai Ragu-ragu'}</span>
                </button>
              </div>

              {/* Question Text & Media */}
              <div className="text-slate-900 text-base leading-relaxed mb-6 font-normal whitespace-pre-wrap">
                {currentQuestion.questionText}
              </div>

              {currentQuestion.imageUrl && (
                <div className="mb-6 max-w-md border border-slate-200 p-2 bg-slate-50">
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Lampiran Soal"
                    className="max-h-72 w-auto object-contain mx-auto"
                  />
                </div>
              )}

              {/* Answer Input depending on question type */}
              <div className="mt-8 space-y-3">
                {/* 1. Single Choice */}
                {currentQuestion.type === 'single_choice' &&
                  currentQuestion.options?.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-start p-3.5 border cursor-pointer transition-colors ${
                        currentAnswerValue === opt.id
                          ? 'border-sky-600 bg-sky-50/50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q_${currentQuestion.id}`}
                        value={opt.id}
                        checked={currentAnswerValue === opt.id}
                        onChange={() => handleAnswerChange(opt.id)}
                        className="mt-0.5 text-sky-600 focus:ring-sky-500"
                      />
                      <span className="ml-3 font-bold text-slate-700 mr-2">{opt.id}.</span>
                      <span className="text-slate-800 leading-normal">{opt.text}</span>
                    </label>
                  ))}

                {/* 2. Multi Choice */}
                {currentQuestion.type === 'multi_choice' &&
                  currentQuestion.options?.map((opt) => {
                    const currentArr = Array.isArray(currentAnswerValue) ? currentAnswerValue : [];
                    const isChecked = currentArr.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start p-3.5 border cursor-pointer transition-colors ${
                          isChecked
                            ? 'border-sky-600 bg-sky-50/50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            let nextArr: string[];
                            if (e.target.checked) {
                              nextArr = [...currentArr, opt.id];
                            } else {
                              nextArr = currentArr.filter((id) => id !== opt.id);
                            }
                            handleAnswerChange(nextArr);
                          }}
                          className="mt-0.5 text-sky-600 focus:ring-sky-500"
                        />
                        <span className="ml-3 font-bold text-slate-700 mr-2">{opt.id}.</span>
                        <span className="text-slate-800 leading-normal">{opt.text}</span>
                      </label>
                    );
                  })}

                {/* 3. True / False */}
                {currentQuestion.type === 'true_false' && (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleAnswerChange(true)}
                      className={`p-4 border text-center font-bold text-sm cursor-pointer ${
                        currentAnswerValue === true
                          ? 'bg-sky-700 text-white border-sky-700'
                          : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      BENAR
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAnswerChange(false)}
                      className={`p-4 border text-center font-bold text-sm cursor-pointer ${
                        currentAnswerValue === false
                          ? 'bg-sky-700 text-white border-sky-700'
                          : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      SALAH
                    </button>
                  </div>
                )}

                {/* 4. Short Answer */}
                {currentQuestion.type === 'short_answer' && (
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Tulis jawaban singkat:
                    </label>
                    <input
                      type="text"
                      value={typeof currentAnswerValue === 'string' ? currentAnswerValue : ''}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      placeholder="Ketik jawaban Anda..."
                      className="w-full p-3 border border-slate-300 focus:outline-none focus:border-sky-600 bg-white text-slate-900 text-sm"
                    />
                  </div>
                )}

                {/* 5. Essay */}
                {currentQuestion.type === 'essay' && (
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Tulis jawaban esai secara lengkap:
                    </label>
                    <textarea
                      rows={7}
                      value={typeof currentAnswerValue === 'string' ? currentAnswerValue : ''}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      placeholder="Tuliskan uraian jawaban Anda di sini..."
                      className="w-full p-3 border border-slate-300 focus:outline-none focus:border-sky-600 bg-white text-slate-900 text-sm leading-relaxed"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 py-12">Tidak ada soal tersedia.</div>
          )}

          {/* Bottom Navigation Buttons */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-6 mt-8">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center space-x-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            <span className="text-xs text-slate-500">
              Soal {currentIndex + 1} dari {orderedQuestions.length}
            </span>

            <button
              onClick={() =>
                setCurrentIndex((prev) => Math.min(orderedQuestions.length - 1, prev + 1))
              }
              disabled={currentIndex === orderedQuestions.length - 1}
              className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center space-x-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Navigation Palette & Progress */}
        <div className="w-80 bg-white border border-slate-300 p-5 flex flex-col justify-between shrink-0">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2 mb-4">
              Navigasi Nomor Soal
            </h3>

            {/* Grid Soal */}
            <div className="grid grid-cols-5 gap-2 max-h-[380px] overflow-y-auto pr-1">
              {orderedQuestions.map((q, idx) => {
                const ans = answers[q.id];
                const isAnswered =
                  ans && ans.answer !== null && ans.answer !== '' && ans.answer !== undefined;
                const isFlagged = ans?.isFlagged;
                const isCurrent = idx === currentIndex;

                let btnClass = 'bg-white border-slate-300 text-slate-700 hover:border-slate-400';
                if (isCurrent) {
                  btnClass = 'ring-2 ring-sky-600 font-bold border-sky-600';
                }
                if (isFlagged) {
                  btnClass += ' bg-amber-200 border-amber-400 text-amber-900';
                } else if (isAnswered) {
                  btnClass += ' bg-emerald-700 text-white border-emerald-700';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 border text-xs font-mono transition-colors flex items-center justify-center cursor-pointer ${btnClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-slate-200 space-y-2 text-[11px] text-slate-600">
              <div className="flex items-center space-x-2">
                <span className="w-4 h-4 bg-emerald-700 inline-block border border-emerald-700"></span>
                <span>Sudah dijawab</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-4 h-4 bg-amber-200 inline-block border border-amber-400"></span>
                <span>Ragu-ragu</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-4 h-4 bg-white inline-block border border-slate-300"></span>
                <span>Belum dijawab</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Selesai & Kumpulkan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal to Submit Exam */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-slate-300 max-w-md w-full p-6 text-slate-900 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-2 uppercase tracking-wide">
              Konfirmasi Pengumpulan Ujian
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Apakah Anda yakin ingin mengumpulkan ujian ini sekarang? Setelah dikumpulkan, Anda tidak dapat lagi mengubah jawaban.
            </p>

            <div className="bg-slate-50 border border-slate-200 p-3 mb-6 text-xs font-mono space-y-1">
              <div>Total Soal: {orderedQuestions.length}</div>
              <div>
                Terjawab:{' '}
                {
                  Object.values(answers).filter(
                    (a) => a.answer !== null && a.answer !== '' && a.answer !== undefined
                  ).length
                }{' '}
                soal
              </div>
              <div>
                Belum Terjawab:{' '}
                {orderedQuestions.length -
                  Object.values(answers).filter(
                    (a) => a.answer !== null && a.answer !== '' && a.answer !== undefined
                  ).length}{' '}
                soal
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Kembali Periksa
              </button>
              <button
                onClick={handleManualSubmit}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Ya, Kumpulkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
