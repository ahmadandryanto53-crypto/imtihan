import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Exam,
  EducationLevel,
  ExamStatus,
  QuestionItem,
  SchoolClass,
  ExamQuestionSnapshot,
} from '../../types';
import {
  fetchQuestions,
  fetchClasses,
  fetchSubjects,
  createExam,
} from '../../services/db';
import { TeacherTab } from './TeacherSidebar';
import {
  FileText,
  KeyRound,
  Calendar,
  Clock,
  Shuffle,
  ShieldAlert,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

interface ExamCreateProps {
  onSuccess: (tab: TeacherTab) => void;
}

export const ExamCreate: React.FC<ExamCreateProps> = ({ onSuccess }) => {
  const { user, profile } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('SD');
  const [gradeLevel, setGradeLevel] = useState('6');
  const [subject, setSubject] = useState('Matematika');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [token, setToken] = useState('');
  const [maxViolations, setMaxViolations] = useState<number>(2);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [showScoreAfterExam, setShowScoreAfterExam] = useState(true);
  const [status, setStatus] = useState<ExamStatus>('active');

  const [availableQuestions, setAvailableQuestions] = useState<QuestionItem[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [availableClasses, setAvailableClasses] = useState<SchoolClass[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Generate random 6-character token on mount
    generateNewToken();

    Promise.all([
      fetchQuestions(user?.uid),
      fetchClasses(),
      fetchSubjects(),
    ])
      .then(([qs, cls, subs]) => {
        setAvailableQuestions(qs);
        setAvailableClasses(cls);
        const subNames = subs.map((s) => s.name);
        setAvailableSubjects(subNames);
        if (subNames.length > 0) setSubject(subNames[0]);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [user]);

  const generateNewToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setToken(res);
  };

  const handleLevelChange = (lvl: EducationLevel) => {
    setEducationLevel(lvl);
    if (lvl === 'SD') setGradeLevel('6');
    else if (lvl === 'SMP') setGradeLevel('7');
    else setGradeLevel('10');
  };

  const filteredQuestions = availableQuestions.filter((q) => {
    return (
      q.educationLevel === educationLevel &&
      q.gradeLevel === gradeLevel &&
      q.subject.toLowerCase() === subject.toLowerCase()
    );
  });

  const handleToggleQuestion = (id: string) => {
    if (selectedQuestionIds.includes(id)) {
      setSelectedQuestionIds(selectedQuestionIds.filter((x) => x !== id));
    } else {
      setSelectedQuestionIds([...selectedQuestionIds, id]);
    }
  };

  const handleSelectAllQuestions = () => {
    const ids = filteredQuestions.map((q) => q.id);
    setSelectedQuestionIds(ids);
  };

  const handleDeselectAllQuestions = () => {
    setSelectedQuestionIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) return;
    if (!title.trim()) {
      setError('Harap isi judul ujian.');
      return;
    }
    if (durationMinutes <= 0) {
      setError('Durasi ujian harus lebih besar dari 0 menit.');
      return;
    }
    if (!token.trim()) {
      setError('Token ujian tidak boleh kosong.');
      return;
    }
    if (selectedQuestionIds.length === 0) {
      setError('Harap pilih minimal 1 butir soal untuk dimasukkan ke dalam ujian.');
      return;
    }

    setSubmitting(true);
    try {
      // Build snapshot of selected questions
      const questionMap = new Map(availableQuestions.map((q) => [q.id, q]));
      const questionSnapshots: ExamQuestionSnapshot[] = selectedQuestionIds
        .map((id) => questionMap.get(id))
        .filter((q): q is QuestionItem => q !== undefined)
        .map((q) => ({
          id: q.id,
          type: q.type,
          questionText: q.questionText,
          imageUrl: q.imageUrl,
          options: q.options,
          weight: q.weight,
          rubric: q.rubric,
          correctAnswer: q.correctAnswer,
        }));

      const payload: Omit<Exam, 'id' | 'createdAt'> = {
        title: title.trim(),
        description: description.trim() || undefined,
        teacherUid: user.uid,
        teacherName: profile?.fullName || user.displayName || 'Guru Pengampu',
        subject,
        educationLevel,
        gradeLevel,
        classIds: selectedClassIds,
        startTime: startTime || new Date().toISOString(),
        endTime: endTime || new Date(Date.now() + 7 * 86400000).toISOString(),
        durationMinutes,
        token: token.trim().toUpperCase(),
        maxViolations,
        shuffleQuestions,
        shuffleOptions,
        showScoreAfterExam,
        status,
        questionCount: questionSnapshots.length,
        questions: questionSnapshots,
      };

      await createExam(payload);
      onSuccess('exam_list');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal membuat ujian.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 font-['Courier_Prime',monospace] max-w-5xl">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
          Buat Jadwal Ujian Baru
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Tentukan konfigurasi ujian, durasi pengerjaan, token akses, dan pilih butir soal dari Bank Soal.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Section 1: Informasi Dasar */}
        <div className="bg-white border border-slate-200 p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
            1. Informasi Dasar Ujian
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Judul Ujian <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Asesmen Sumatif Akhir Semester Matematika"
                required
                className="w-full p-2.5 border border-slate-300 bg-white font-mono text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Deskripsi / Petunjuk Pengerjaan
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Petunjuk: Berdoalah sebelum mengerjakan, dilarang membuka tab lain..."
                className="w-full p-2 border border-slate-300 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Mata Pelajaran <span className="text-red-500">*</span>
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2.5 border border-slate-300 bg-white"
              >
                {availableSubjects.length > 0 ? (
                  availableSubjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Matematika">Matematika</option>
                    <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                    <option value="IPA">IPA</option>
                    <option value="IPS">IPS</option>
                  </>
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Jenjang</label>
                <select
                  value={educationLevel}
                  onChange={(e) => handleLevelChange(e.target.value as EducationLevel)}
                  className="w-full p-2.5 border border-slate-300 bg-white"
                >
                  <option value="SD">SD</option>
                  <option value="SMP">SMP</option>
                  <option value="SMA">SMA</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Tingkat Kelas</label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 bg-white font-mono"
                >
                  {educationLevel === 'SD' &&
                    ['1', '2', '3', '4', '5', '6'].map((g) => (
                      <option key={g} value={g}>
                        Kelas {g}
                      </option>
                    ))}
                  {educationLevel === 'SMP' &&
                    ['7', '8', '9'].map((g) => (
                      <option key={g} value={g}>
                        Kelas {g}
                      </option>
                    ))}
                  {educationLevel === 'SMA' &&
                    ['10', '11', '12'].map((g) => (
                      <option key={g} value={g}>
                        Kelas {g}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Waktu, Durasi & Keamanan */}
        <div className="bg-white border border-slate-200 p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
            2. Parameter Waktu & Kontrol Keamanan
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Durasi Ujian (Menit) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="360"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  required
                  className="w-full p-2.5 border border-slate-300 bg-white font-mono font-bold text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Token Ujian (6 Karakter) <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  maxLength={10}
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  required
                  className="w-full p-2.5 border border-slate-300 bg-white font-mono font-bold text-sm text-center tracking-widest uppercase"
                />
                <button
                  type="button"
                  onClick={generateNewToken}
                  className="px-3 border border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer"
                  title="Generate Token Baru"
                >
                  <Sparkles className="w-4 h-4 text-sky-700" />
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Maksimal Toleransi Pelanggaran
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={maxViolations}
                onChange={(e) => setMaxViolations(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-300 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Jadwal Mulai (Opsional)
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2 border border-slate-300 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Jadwal Berakhir (Opsional)
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-2 border border-slate-300 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Status Ujian
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ExamStatus)}
                className="w-full p-2.5 border border-slate-300 bg-white font-bold"
              >
                <option value="active">Aktif (Dapat Dikerjakan)</option>
                <option value="scheduled">Terjadwal</option>
                <option value="draft">Draft (Draf Guru)</option>
                <option value="completed">Selesai</option>
              </select>
            </div>
          </div>

          {/* Opsi Pengacakan & Tampilan Nilai */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="rounded-none text-sky-600"
              />
              <span className="font-bold text-slate-700">Acak Urutan Soal</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
                className="rounded-none text-sky-600"
              />
              <span className="font-bold text-slate-700">Acak Pilihan Jawaban</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showScoreAfterExam}
                onChange={(e) => setShowScoreAfterExam(e.target.checked)}
                className="rounded-none text-sky-600"
              />
              <span className="font-bold text-slate-700">Tampilkan Nilai Pasca Ujian</span>
            </label>
          </div>
        </div>

        {/* Section 3: Pemilihan Soal dari Bank Soal */}
        <div className="bg-white border border-slate-200 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                3. Pemilihan Butir Soal ({selectedQuestionIds.length} Soal Terpilih)
              </h2>
              <p className="text-[11px] text-slate-500">
                Menampilkan soal bank sesuai jenjang {educationLevel}, kelas {gradeLevel}, mapel {subject}.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleSelectAllQuestions}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
              >
                Pilih Semua
              </button>
              <button
                type="button"
                onClick={handleDeselectAllQuestions}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
              >
                Hapus Pilihan
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Memuat soal...</div>
          ) : filteredQuestions.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-200 text-center text-slate-500 bg-slate-50">
              Belum ada soal di Bank Soal yang cocok dengan kriteria ({educationLevel} Kelas {gradeLevel} - {subject}).
              Silakan tambahkan butir soal di menu Bank Soal terlebih dahulu.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredQuestions.map((q, idx) => {
                const isChecked = selectedQuestionIds.includes(q.id);
                return (
                  <label
                    key={q.id}
                    className={`flex items-start p-3 border transition-colors cursor-pointer ${
                      isChecked
                        ? 'border-sky-600 bg-sky-50/40'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleQuestion(q.id)}
                      className="mt-1 mr-3 text-sky-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                        <span className="font-bold text-slate-700">Soal #{idx + 1}</span>
                        <span className="font-mono">
                          Tipe: {q.type} | Bobot: {q.weight} poin
                        </span>
                      </div>
                      <div className="text-slate-900 font-medium leading-relaxed">
                        {q.questionText}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => onSuccess('exam_list')}
            className="px-5 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold uppercase tracking-wider cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting || selectedQuestionIds.length === 0}
            className="px-6 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Menyimpan Ujian...' : 'Terbitkan Jadwal Ujian'}
          </button>
        </div>
      </form>
    </div>
  );
};
