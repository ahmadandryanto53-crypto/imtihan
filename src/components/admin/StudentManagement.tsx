import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StudentProfile, EducationLevel, SchoolClass } from '../../types';
import {
  fetchStudents,
  createStudent,
  updateStudent,
  fetchClasses,
  logAudit,
} from '../../services/db';
import { EmptyState } from '../common/EmptyState';
import { downloadCsvTemplate, parseCsvFile } from '../../utils/csv';
import {
  GraduationCap,
  Plus,
  Search,
  Upload,
  Download,
  Edit,
  ShieldCheck,
  ShieldAlert,
  UserX,
  UserCheck,
} from 'lucide-react';

export const StudentManagement: React.FC = () => {
  const { user, profile } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);

  // Form State
  const [nis, setNis] = useState('');
  const [fullName, setFullName] = useState('');
  const [level, setLevel] = useState<EducationLevel>('SD');
  const [grade, setGrade] = useState('6');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [academicYear, setAcademicYear] = useState('2026/2027');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stu, cls] = await Promise.all([fetchStudents(), fetchClasses()]);
      setStudents(stu);
      setClasses(cls);
      if (cls.length > 0 && !selectedClassId) {
        setSelectedClassId(cls[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingStudent(null);
    setNis('');
    setFullName('');
    setLevel('SD');
    setGrade('6');
    setSelectedClassId(classes[0]?.id || '');
    setAcademicYear('2026/2027');
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (stu: StudentProfile) => {
    setEditingStudent(stu);
    setNis(stu.nis);
    setFullName(stu.fullName);
    setLevel(stu.educationLevel);
    setGrade(stu.gradeLevel);
    setSelectedClassId(stu.classId);
    setAcademicYear(stu.academicYear);
    setStatus(stu.status);
    setIsModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const matchedClass = classes.find((c) => c.id === selectedClassId);
    const className = matchedClass ? matchedClass.name : `Kelas ${grade}`;

    try {
      if (editingStudent) {
        await updateStudent(editingStudent.uid, {
          nis: nis.trim(),
          fullName: fullName.trim(),
          educationLevel: level,
          gradeLevel: grade,
          classId: selectedClassId,
          className,
          academicYear,
          status,
        });

        await logAudit(
          'UPDATE_STUDENT',
          user.uid,
          user.email || '',
          profile?.role || 'admin',
          `Memperbarui profil siswa NIS: ${nis}`,
          editingStudent.uid
        );
      } else {
        // Safe UID generation based on NIS or timestamp
        const studentUid = `stu_${nis.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || Date.now()}`;
        await createStudent({
          uid: studentUid,
          nis: nis.trim(),
          fullName: fullName.trim(),
          educationLevel: level,
          gradeLevel: grade,
          classId: selectedClassId,
          className,
          academicYear,
          status,
        });

        await logAudit(
          'CREATE_STUDENT',
          user.uid,
          user.email || '',
          profile?.role || 'admin',
          `Menambahkan siswa baru: ${fullName} (NIS: ${nis})`,
          studentUid
        );
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (stu: StudentProfile) => {
    if (!user) return;
    const nextStatus = stu.status === 'active' ? 'inactive' : 'active';
    try {
      await updateStudent(stu.uid, { status: nextStatus });
      await logAudit(
        'TOGGLE_STUDENT_STATUS',
        user.uid,
        user.email || '',
        profile?.role || 'admin',
        `Mengubah status siswa NIS ${stu.nis} menjadi ${nextStatus}`,
        stu.uid
      );
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // CSV Import
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportError(null);
      const rows = await parseCsvFile(file);
      if (rows.length === 0) {
        setImportError('File kosong atau format salah.');
        return;
      }
      setImportRows(rows);
    } catch (err: any) {
      setImportError(err.message || 'Gagal membaca CSV.');
    }
  };

  const handleProcessImport = async () => {
    if (!user || importRows.length === 0) return;
    setIsImporting(true);

    try {
      for (const row of importRows) {
        const studentNis = row.nis || '';
        const name = row.nama_lengkap || '';
        if (!studentNis || !name) continue;

        const eduLevel = (row.jenjang || 'SD') as EducationLevel;
        const gradeVal = row.tingkat_kelas || '6';
        const cName = row.nama_kelas || `Kelas ${gradeVal}`;
        const year = row.tahun_ajaran || '2026/2027';

        const studentUid = `stu_${studentNis.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

        await createStudent({
          uid: studentUid,
          nis: studentNis,
          fullName: name,
          educationLevel: eduLevel,
          gradeLevel: gradeVal,
          classId: 'imported',
          className: cName,
          academicYear: year,
          status: 'active',
        });
      }

      await logAudit(
        'IMPORT_STUDENTS_CSV',
        user.uid,
        user.email || '',
        profile?.role || 'admin',
        `Mengimpor ${importRows.length} data siswa dari CSV`
      );

      setIsImportModalOpen(false);
      setImportRows([]);
      loadData();
    } catch (err: any) {
      setImportError(err.message || 'Gagal mengimpor siswa.');
    } finally {
      setIsImporting(false);
    }
  };

  const filteredStudents = students.filter((stu) => {
    if (filterLevel !== 'ALL' && stu.educationLevel !== filterLevel) return false;
    if (
      search.trim() &&
      !stu.fullName.toLowerCase().includes(search.toLowerCase()) &&
      !stu.nis.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 font-['Courier_Prime',monospace]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-sky-700" />
            <span>Manajemen Akun Siswa</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar peserta didik jenjang SD, SMP, dan SMA. Pengelolaan NIS dan rombel kelas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => downloadCsvTemplate('student')}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
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
            <span>Impor Data Siswa</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 p-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau NIS siswa..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="font-bold text-slate-600">Jenjang:</span>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="py-1.5 px-3 border border-slate-300 bg-white focus:outline-none"
          >
            <option value="ALL">Semua Jenjang</option>
            <option value="SD">SD</option>
            <option value="SMP">SMP</option>
            <option value="SMA">SMA</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-mono">
          Memuat daftar siswa...
        </div>
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          message="Belum ada data siswa. Silakan tambahkan siswa secara manual atau melalui impor CSV."
          actionButton={
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Tambah Siswa Sekarang
            </button>
          }
        />
      ) : (
        <div className="bg-white border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">NIS</th>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Jenjang</th>
                <th className="py-3 px-4">Tingkat / Kelas</th>
                <th className="py-3 px-4">Tahun Ajaran</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStudents.map((stu, idx) => (
                <tr key={stu.uid} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{stu.nis}</td>
                  <td className="py-3 px-4 font-bold">{stu.fullName}</td>
                  <td className="py-3 px-4 font-mono">{stu.educationLevel}</td>
                  <td className="py-3 px-4 font-mono">
                    {stu.className || `Kelas ${stu.gradeLevel}`}
                  </td>
                  <td className="py-3 px-4 font-mono">{stu.academicYear}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${
                        stu.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {stu.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => openEditModal(stu)}
                        className="p-1 text-slate-500 hover:text-amber-600 cursor-pointer"
                        title="Edit Data Siswa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(stu)}
                        className="p-1 text-slate-500 hover:text-red-600 cursor-pointer"
                        title={stu.status === 'active' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                      >
                        {stu.status === 'active' ? (
                          <UserX className="w-4 h-4" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah / Edit Siswa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-slate-300 max-w-lg w-full p-6 text-slate-900 shadow-xl">
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-3 mb-4">
              {editingStudent ? 'Edit Profil Siswa' : 'Tambah Akun Siswa Baru'}
            </h2>

            <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Nomor Induk Siswa (NIS) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  placeholder="Contoh: 2026001"
                  required
                  className="w-full p-2.5 border border-slate-300 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Nama Lengkap Siswa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Muhammad Fatih"
                  required
                  className="w-full p-2.5 border border-slate-300 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Jenjang</label>
                  <select
                    value={level}
                    onChange={(e) => {
                      const lvl = e.target.value as EducationLevel;
                      setLevel(lvl);
                      if (lvl === 'SD') setGrade('6');
                      else if (lvl === 'SMP') setGrade('7');
                      else setGrade('10');
                    }}
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
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 bg-white font-mono"
                  >
                    {level === 'SD' &&
                      ['1', '2', '3', '4', '5', '6'].map((g) => (
                        <option key={g} value={g}>
                          Kelas {g}
                        </option>
                      ))}
                    {level === 'SMP' &&
                      ['7', '8', '9'].map((g) => (
                        <option key={g} value={g}>
                          Kelas {g}
                        </option>
                      ))}
                    {level === 'SMA' &&
                      ['10', '11', '12'].map((g) => (
                        <option key={g} value={g}>
                          Kelas {g}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Rombongan Belajar (Kelas)
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 bg-white"
                  >
                    {classes.length > 0 ? (
                      classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.educationLevel})
                        </option>
                      ))
                    ) : (
                      <option value="default">Kelas Umum</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Tahun Ajaran
                  </label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Status Akun</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full p-2.5 border border-slate-300 bg-white font-bold"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 bg-white text-slate-700 font-bold uppercase cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold uppercase cursor-pointer"
                >
                  Simpan Data Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import CSV */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-slate-300 max-w-lg w-full p-6 text-slate-900 shadow-xl text-xs">
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-3 mb-4">
              Impor Data Siswa dari CSV
            </h2>

            {importError && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700">
                {importError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Pilih File CSV
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="w-full p-2 border border-slate-300 bg-white"
                />
              </div>

              {importRows.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 font-mono">
                  {importRows.length} data siswa terdeteksi siap diimpor ke sistem.
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  disabled={isImporting}
                  className="px-4 py-2 border border-slate-300 bg-white text-slate-700 font-bold uppercase cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProcessImport}
                  disabled={isImporting || importRows.length === 0}
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold uppercase cursor-pointer disabled:opacity-50"
                >
                  {isImporting ? 'Mengimpor...' : `Simpan ${importRows.length} Siswa`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
