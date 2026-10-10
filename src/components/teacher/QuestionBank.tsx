import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  QuestionItem,
  QuestionType,
  EducationLevel,
  QuestionOption,
} from '../../types';
import {
  fetchQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  fetchSubjects,
} from '../../services/db';
import { EmptyState } from '../common/EmptyState';
import { downloadCsvTemplate, parseCsvFile } from '../../utils/csv';
import {
  Plus,
  Trash2,
  Edit,
  Download,
  Upload,
  Search,
  CheckCircle,
  HelpCircle,
  Image as ImageIcon,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';

export const QuestionBank: React.FC = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State for Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);

  // Form Fields
  const [formSubject, setFormSubject] = useState('Matematika');
  const [formLevel, setFormLevel] = useState<EducationLevel>('SD');
  const [formGrade, setFormGrade] = useState('6');
  const [formType, setFormType] = useState<QuestionType>('single_choice');
  const [formText, setFormText] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formWeight, setFormWeight] = useState<number>(10);
  const [formRubric, setFormRubric] = useState('');
  const [formOptions, setFormOptions] = useState<QuestionOption[]>([
    { id: 'A', text: '' },
    { id: 'B', text: '' },
    { id: 'C', text: '' },
    { id: 'D', text: '' },
  ]);
  const [formCorrectAnswer, setFormCorrectAnswer] = useState<string>('A');
  const [formMultiCorrect, setFormMultiCorrect] = useState<string[]>([]);
  const [formTrueFalseCorrect, setFormTrueFalseCorrect] = useState<boolean>(true);

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Preview Modal
  const [previewQuestion, setPreviewQuestion] = useState<QuestionItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [qs, subs] = await Promise.all([
        fetchQuestions(user?.uid),
        fetchSubjects(),
      ]);
      setQuestions(qs);
      setSubjects(subs.map((s) => s.name));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const openCreateModal = () => {
    setEditingQuestion(null);
    setFormSubject(subjects[0] || 'Matematika');
    setFormLevel('SD');
    setFormGrade('6');
    setFormType('single_choice');
    setFormText('');
    setFormImageUrl('');
    setFormWeight(10);
    setFormRubric('');
    setFormOptions([
      { id: 'A', text: '' },
      { id: 'B', text: '' },
      { id: 'C', text: '' },
      { id: 'D', text: '' },
    ]);
    setFormCorrectAnswer('A');
    setFormMultiCorrect([]);
    setFormTrueFalseCorrect(true);
    setIsModalOpen(true);
  };

  const openEditModal = (q: QuestionItem) => {
    setEditingQuestion(q);
    setFormSubject(q.subject);
    setFormLevel(q.educationLevel);
    setFormGrade(q.gradeLevel);
    setFormType(q.type);
    setFormText(q.questionText);
    setFormImageUrl(q.imageUrl || '');
    setFormWeight(q.weight);
    setFormRubric(q.rubric || '');
    setFormOptions(
      q.options || [
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' },
      ]
    );

    if (q.type === 'single_choice' || q.type === 'short_answer') {
      setFormCorrectAnswer(typeof q.correctAnswer === 'string' ? q.correctAnswer : 'A');
    } else if (q.type === 'multi_choice') {
      setFormMultiCorrect(Array.isArray(q.correctAnswer) ? q.correctAnswer : []);
    } else if (q.type === 'true_false') {
      setFormTrueFalseCorrect(Boolean(q.correctAnswer));
    }
    setIsModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    let finalCorrectAnswer: any = formCorrectAnswer;
    if (formType === 'multi_choice') {
      finalCorrectAnswer = formMultiCorrect;
    } else if (formType === 'true_false') {
      finalCorrectAnswer = formTrueFalseCorrect;
    } else if (formType === 'essay') {
      finalCorrectAnswer = undefined;
    }

    const payload: Omit<QuestionItem, 'id' | 'createdAt'> = {
      authorUid: user.uid,
      subject: formSubject,
      educationLevel: formLevel,
      gradeLevel: formGrade,
      type: formType,
      questionText: formText,
      imageUrl: formImageUrl.trim() || undefined,
      weight: Number(formWeight) || 10,
      rubric: formType === 'essay' ? formRubric : undefined,
      options:
        formType === 'single_choice' || formType === 'multi_choice'
          ? formOptions.filter((o) => o.text.trim().length > 0)
          : undefined,
      correctAnswer: finalCorrectAnswer,
    };

    try {
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, payload);
      } else {
        await createQuestion(payload);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error saving question:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus soal ini dari Bank Soal?')) {
      try {
        await deleteQuestion(id);
        loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // CSV Import Handling
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportError(null);
      const rows = await parseCsvFile(file);
      if (rows.length === 0) {
        setImportError('File kosong atau tidak memiliki baris data.');
        return;
      }
      setImportRows(rows);
    } catch (err: any) {
      setImportError(err.message || 'Gagal membaca file CSV.');
    }
  };

  const handleProcessImport = async () => {
    if (!user || importRows.length === 0) return;
    setIsImporting(true);

    try {
      for (const row of importRows) {
        const type = (row.tipe_soal || 'single_choice') as QuestionType;
        const text = row.pertanyaan || '';
        if (!text) continue;

        const options: QuestionOption[] = [];
        if (row.pilihan_a) options.push({ id: 'A', text: row.pilihan_a });
        if (row.pilihan_b) options.push({ id: 'B', text: row.pilihan_b });
        if (row.pilihan_c) options.push({ id: 'C', text: row.pilihan_c });
        if (row.pilihan_d) options.push({ id: 'D', text: row.pilihan_d });
        if (row.pilihan_e) options.push({ id: 'E', text: row.pilihan_e });

        let correct: any = row.kunci_jawaban || 'A';
        if (type === 'true_false') {
          correct = row.kunci_jawaban?.toLowerCase() === 'true' || row.kunci_jawaban?.toLowerCase() === 'benar';
        } else if (type === 'multi_choice') {
          correct = row.kunci_jawaban ? row.kunci_jawaban.split(';').map((s) => s.trim()) : ['A'];
        }

        await createQuestion({
          authorUid: user.uid,
          subject: formSubject,
          educationLevel: formLevel,
          gradeLevel: formGrade,
          type,
          questionText: text,
          weight: Number(row.bobot) || 10,
          rubric: row.rubrik_esai || undefined,
          options: options.length > 0 ? options : undefined,
          correctAnswer: type !== 'essay' ? correct : undefined,
        });
      }

      setIsImportModalOpen(false);
      setImportRows([]);
      loadData();
    } catch (err: any) {
      setImportError(err.message || 'Gagal mengimpor sebagian data.');
    } finally {
      setIsImporting(false);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    if (filterLevel !== 'ALL' && q.educationLevel !== filterLevel) return false;
    if (filterType !== 'ALL' && q.type !== filterType) return false;
    if (searchQuery.trim() && !q.questionText.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 font-['Courier_Prime',monospace]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
            Bank Soal
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola butir soal evaluasi, kunci jawaban berstandar, dan bobot nilai per jenjang.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => downloadCsvTemplate('question')}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
            title="Unduh format template CSV kosong"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Template CSV</span>
          </button>

          <button
            onClick={() => {
              setImportRows([]);
              setImportError(null);
              setIsImportModalOpen(true);
            }}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Impor Soal CSV</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Soal Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 p-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari teks pertanyaan..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-sky-600 bg-white"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500 font-bold">Jenjang:</span>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="py-1.5 px-2 border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none"
          >
            <option value="ALL">Semua Jenjang</option>
            <option value="SD">SD (Kelas 1-6)</option>
            <option value="SMP">SMP (Kelas 7-9)</option>
            <option value="SMA">SMA (Kelas 10-12)</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500 font-bold">Tipe:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="py-1.5 px-2 border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none"
          >
            <option value="ALL">Semua Tipe Soal</option>
            <option value="single_choice">Pilihan Ganda (1 Jawaban)</option>
            <option value="multi_choice">Pilihan Ganda Kompleks</option>
            <option value="true_false">Benar / Salah</option>
            <option value="short_answer">Isian Singkat</option>
            <option value="essay">Esai</option>
          </select>
        </div>
      </div>

      {/* Table of Questions */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-mono">
          Memuat bank soal...
        </div>
      ) : filteredQuestions.length === 0 ? (
        <EmptyState
          message="Belum ada data butir soal. Silakan buat soal baru atau impor melalui CSV."
          actionButton={
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Tambah Soal Sekarang
            </button>
          }
        />
      ) : (
        <div className="bg-white border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Pertanyaan</th>
                <th className="py-3 px-4 w-28">Mata Pelajaran</th>
                <th className="py-3 px-4 w-28">Jenjang/Kelas</th>
                <th className="py-3 px-4 w-32">Tipe Soal</th>
                <th className="py-3 px-4 w-20 text-center">Bobot</th>
                <th className="py-3 px-4 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredQuestions.map((q, idx) => (
                <tr key={q.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4 font-normal">
                    <div className="line-clamp-2 text-slate-900 font-medium mb-1">
                      {q.questionText}
                    </div>
                    {q.imageUrl && (
                      <span className="inline-flex items-center space-x-1 text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.5 border border-sky-200">
                        <ImageIcon className="w-3 h-3" />
                        <span>Ada Lampiran Gambar</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">{q.subject}</td>
                  <td className="py-3 px-4 font-mono">
                    {q.educationLevel} (Kls {q.gradeLevel})
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold uppercase">
                      {q.type === 'single_choice'
                        ? 'Pilgan'
                        : q.type === 'multi_choice'
                        ? 'Pilgan Kompleks'
                        : q.type === 'true_false'
                        ? 'Benar/Salah'
                        : q.type === 'short_answer'
                        ? 'Isian'
                        : 'Esai'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-sky-800">
                    {q.weight}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => setPreviewQuestion(q)}
                        className="p-1 text-slate-500 hover:text-sky-700 cursor-pointer"
                        title="Lihat Pratinjau Soal"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(q)}
                        className="p-1 text-slate-500 hover:text-amber-600 cursor-pointer"
                        title="Edit Soal"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="p-1 text-slate-500 hover:text-red-600 cursor-pointer"
                        title="Hapus Soal"
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

      {/* Modal Form Tambah / Edit Soal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-slate-300 max-w-3xl w-full p-6 text-slate-900 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-3 mb-4">
              {editingQuestion ? 'Edit Butir Soal' : 'Tambah Soal Baru ke Bank Soal'}
            </h2>

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Mata Pelajaran
                  </label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full p-2 border border-slate-300 bg-white"
                  >
                    {subjects.length > 0 ? (
                      subjects.map((s) => (
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
                        <option value="Pendidikan Agama">Pendidikan Agama</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Jenjang</label>
                  <select
                    value={formLevel}
                    onChange={(e) => setFormLevel(e.target.value as EducationLevel)}
                    className="w-full p-2 border border-slate-300 bg-white"
                  >
                    <option value="SD">SD</option>
                    <option value="SMP">SMP</option>
                    <option value="SMA">SMA</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Tingkat Kelas
                  </label>
                  <select
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    className="w-full p-2 border border-slate-300 bg-white font-mono"
                  >
                    {formLevel === 'SD' &&
                      ['1', '2', '3', '4', '5', '6'].map((g) => (
                        <option key={g} value={g}>
                          Kelas {g}
                        </option>
                      ))}
                    {formLevel === 'SMP' &&
                      ['7', '8', '9'].map((g) => (
                        <option key={g} value={g}>
                          Kelas {g}
                        </option>
                      ))}
                    {formLevel === 'SMA' &&
                      ['10', '11', '12'].map((g) => (
                        <option key={g} value={g}>
                          Kelas {g}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Tipe Butir Soal
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as QuestionType)}
                    className="w-full p-2 border border-slate-300 bg-white font-bold"
                  >
                    <option value="single_choice">Pilihan Ganda (1 Jawaban Benar)</option>
                    <option value="multi_choice">Pilihan Ganda Kompleks (Banyak Jawaban)</option>
                    <option value="true_false">Benar / Salah</option>
                    <option value="short_answer">Isian Singkat</option>
                    <option value="essay">Esai / Uraian</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Bobot Nilai (Poin)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formWeight}
                    onChange={(e) => setFormWeight(Number(e.target.value))}
                    required
                    className="w-full p-2 border border-slate-300 bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Isi Pertanyaan / Narasi Soal
                </label>
                <textarea
                  rows={4}
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Tuliskan teks pertanyaan di sini..."
                  required
                  className="w-full p-2.5 border border-slate-300 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  URL Gambar Pendukung (Opsional)
                </label>
                <input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://example.com/gambar-soal.png"
                  className="w-full p-2 border border-slate-300 bg-white font-mono"
                />
              </div>

              {/* Opsi & Kunci Jawaban Sesuai Tipe */}
              {(formType === 'single_choice' || formType === 'multi_choice') && (
                <div className="border border-slate-200 p-4 bg-slate-50 space-y-3">
                  <div className="font-bold uppercase text-slate-700">
                    Pilihan Jawaban & Kunci Benar:
                  </div>
                  {formOptions.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center space-x-2">
                      <span className="w-6 font-bold font-mono text-center">{opt.id}.</span>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const next = [...formOptions];
                          next[idx].text = e.target.value;
                          setFormOptions(next);
                        }}
                        placeholder={`Teks pilihan ${opt.id}`}
                        required={idx < 2}
                        className="flex-1 p-2 border border-slate-300 bg-white"
                      />
                      {formType === 'single_choice' ? (
                        <label className="flex items-center space-x-1 cursor-pointer pl-2">
                          <input
                            type="radio"
                            name="correctSingle"
                            checked={formCorrectAnswer === opt.id}
                            onChange={() => setFormCorrectAnswer(opt.id)}
                          />
                          <span className="text-[11px] font-bold">Kunci Benar</span>
                        </label>
                      ) : (
                        <label className="flex items-center space-x-1 cursor-pointer pl-2">
                          <input
                            type="checkbox"
                            checked={formMultiCorrect.includes(opt.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormMultiCorrect([...formMultiCorrect, opt.id]);
                              } else {
                                setFormMultiCorrect(formMultiCorrect.filter((x) => x !== opt.id));
                              }
                            }}
                          />
                          <span className="text-[11px] font-bold">Kunci Benar</span>
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {formType === 'true_false' && (
                <div className="border border-slate-200 p-4 bg-slate-50">
                  <span className="font-bold uppercase text-slate-700 block mb-2">
                    Kunci Jawaban Benar:
                  </span>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer font-bold">
                      <input
                        type="radio"
                        name="tf"
                        checked={formTrueFalseCorrect === true}
                        onChange={() => setFormTrueFalseCorrect(true)}
                      />
                      <span>BENAR</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer font-bold">
                      <input
                        type="radio"
                        name="tf"
                        checked={formTrueFalseCorrect === false}
                        onChange={() => setFormTrueFalseCorrect(false)}
                      />
                      <span>SALAH</span>
                    </label>
                  </div>
                </div>
              )}

              {formType === 'short_answer' && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Kunci Jawaban Singkat
                  </label>
                  <input
                    type="text"
                    value={formCorrectAnswer}
                    onChange={(e) => setFormCorrectAnswer(e.target.value)}
                    required
                    placeholder="Ketik kunci jawaban eksak..."
                    className="w-full p-2 border border-slate-300 bg-white font-mono"
                  />
                </div>
              )}

              {formType === 'essay' && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Pedoman Rubrik Penilaian Esai
                  </label>
                  <textarea
                    rows={3}
                    value={formRubric}
                    onChange={(e) => setFormRubric(e.target.value)}
                    placeholder="Pedoman skor: 10 poin jika lengkap, 5 poin jika separuh..."
                    className="w-full p-2 border border-slate-300 bg-white font-mono"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold uppercase tracking-wider cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold uppercase tracking-wider cursor-pointer"
                >
                  Simpan Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview Soal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-slate-300 max-w-xl w-full p-6 text-slate-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
                Pratinjau Butir Soal ({previewQuestion.subject} • {previewQuestion.educationLevel} Kelas {previewQuestion.gradeLevel})
              </span>
              <span className="text-xs font-mono font-bold">Bobot: {previewQuestion.weight}</span>
            </div>

            <div className="text-sm font-normal mb-4 whitespace-pre-wrap">
              {previewQuestion.questionText}
            </div>

            {previewQuestion.imageUrl && (
              <img
                src={previewQuestion.imageUrl}
                alt="Preview"
                className="max-h-48 mb-4 border border-slate-200"
              />
            )}

            {previewQuestion.options && (
              <div className="space-y-1.5 text-xs mb-4">
                {previewQuestion.options.map((opt) => (
                  <div key={opt.id} className="p-2 border border-slate-100 flex items-center">
                    <span className="font-bold mr-2">{opt.id}.</span>
                    <span>{opt.text}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-mono mb-6">
              <span className="font-bold">Kunci Jawaban Guru:</span>{' '}
              {Array.isArray(previewQuestion.correctAnswer)
                ? previewQuestion.correctAnswer.join(', ')
                : String(previewQuestion.correctAnswer ?? 'Esai Manual')}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewQuestion(null)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import CSV */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-slate-300 max-w-2xl w-full p-6 text-slate-900 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-3 mb-4 flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-sky-700" />
              <span>Impor Soal dari File CSV</span>
            </h2>

            {importError && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 text-xs">
                {importError}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  1. Pilih File CSV (Sesuai Template Imtihan)
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="w-full p-2 border border-slate-300 bg-white"
                />
              </div>

              {importRows.length > 0 && (
                <div>
                  <div className="font-bold text-slate-800 mb-2">
                    Pratinjau Data ({importRows.length} baris terdeteksi):
                  </div>
                  <div className="max-h-56 overflow-y-auto border border-slate-200 p-2 bg-slate-50 text-[11px] font-mono divide-y divide-slate-200">
                    {importRows.slice(0, 5).map((r, i) => (
                      <div key={i} className="py-2">
                        <div className="font-bold text-slate-900">
                          [{r.tipe_soal || 'single_choice'}] {r.pertanyaan}
                        </div>
                        <div className="text-slate-500">
                          Kunci: {r.kunci_jawaban} | Bobot: {r.bobot || 10}
                        </div>
                      </div>
                    ))}
                    {importRows.length > 5 && (
                      <div className="text-slate-400 py-1 italic">
                        ...dan {importRows.length - 5} baris lainnya.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  disabled={isImporting}
                  className="px-4 py-2 border border-slate-300 bg-white text-slate-700 font-bold uppercase tracking-wider cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProcessImport}
                  disabled={isImporting || importRows.length === 0}
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                >
                  {isImporting ? 'Mengimpor...' : `Simpan ${importRows.length} Soal`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
