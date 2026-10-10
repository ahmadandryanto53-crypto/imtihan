import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TeacherProfile } from '../../types';
import {
  fetchTeachers,
  createTeacher,
  updateTeacher,
  logAudit,
} from '../../services/db';
import { EmptyState } from '../common/EmptyState';
import { downloadCsvTemplate, parseCsvFile } from '../../utils/csv';
import {
  Users,
  Plus,
  Search,
  Upload,
  Download,
  Edit,
  UserX,
  UserCheck,
  Mail,
} from 'lucide-react';

export const TeacherManagement: React.FC = () => {
  const { user, profile } = useAuth();
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherProfile | null>(null);

  // Form
  const [nip, setNip] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [subjectsStr, setSubjectsStr] = useState('');
  const [classesStr, setClassesStr] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchTeachers();
      setTeachers(data);
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
    setEditingTeacher(null);
    setNip('');
    setFullName('');
    setEmail('');
    setSubjectsStr('');
    setClassesStr('');
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (t: TeacherProfile) => {
    setEditingTeacher(t);
    setNip(t.nip || '');
    setFullName(t.fullName);
    setEmail(t.email);
    setSubjectsStr(t.subjects?.join(', ') || '');
    setClassesStr(t.assignedClasses?.join(', ') || '');
    setStatus(t.status);
    setIsModalOpen(true);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const subjectsArr = subjectsStr
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const classesArr = classesStr
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      if (editingTeacher) {
        await updateTeacher(editingTeacher.uid, {
          nip: nip.trim(),
          fullName: fullName.trim(),
          email: email.trim(),
          subjects: subjectsArr,
          assignedClasses: classesArr,
          status,
        });

        await logAudit(
          'UPDATE_TEACHER',
          user.uid,
          user.email || '',
          profile?.role || 'admin',
          `Memperbarui profil guru: ${fullName} (${email})`,
          editingTeacher.uid
        );
      } else {
        const teacherUid = `tea_${email.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || Date.now()}`;
        await createTeacher({
          uid: teacherUid,
          nip: nip.trim(),
          fullName: fullName.trim(),
          email: email.trim(),
          subjects: subjectsArr,
          assignedClasses: classesArr,
          status,
        });

        await logAudit(
          'CREATE_TEACHER',
          user.uid,
          user.email || '',
          profile?.role || 'admin',
          `Menambahkan guru baru: ${fullName} (${email})`,
          teacherUid
        );
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (t: TeacherProfile) => {
    if (!user) return;
    const nextStatus = t.status === 'active' ? 'inactive' : 'active';
    try {
      await updateTeacher(t.uid, { status: nextStatus });
      await logAudit(
        'TOGGLE_TEACHER_STATUS',
        user.uid,
        user.email || '',
        profile?.role || 'admin',
        `Mengubah status guru ${t.fullName} menjadi ${nextStatus}`,
        t.uid
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
        setImportError('File CSV kosong.');
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
        const tEmail = row.email || '';
        const name = row.nama_lengkap || '';
        if (!tEmail || !name) continue;

        const teacherUid = `tea_${tEmail.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const subs = row.mata_pelajaran ? row.mata_pelajaran.split(';') : [];
        const clss = row.kelas_diampu ? row.kelas_diampu.split(';') : [];

        await createTeacher({
          uid: teacherUid,
          nip: row.nip || '',
          fullName: name,
          email: tEmail,
          subjects: subs,
          assignedClasses: clss,
          status: 'active',
        });
      }

      await logAudit(
        'IMPORT_TEACHERS_CSV',
        user.uid,
        user.email || '',
        profile?.role || 'admin',
        `Mengimpor ${importRows.length} guru dari CSV`
      );

      setIsImportModalOpen(false);
      setImportRows([]);
      loadData();
    } catch (err: any) {
      setImportError(err.message || 'Gagal mengimpor guru.');
    } finally {
      setIsImporting(false);
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    if (
      search.trim() &&
      !t.fullName.toLowerCase().includes(search.toLowerCase()) &&
      !t.email.toLowerCase().includes(search.toLowerCase())
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
            <Users className="w-5 h-5 text-emerald-600" />
            <span>Manajemen Akun Guru</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar pengajar, NIP, penugasan mata pelajaran, dan hak kelola ujian CBT.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => downloadCsvTemplate('teacher')}
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
            <span>Impor Data Guru</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Guru Baru</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200 p-4">
        <div className="max-w-md relative text-xs">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama guru atau email..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-mono">
          Memuat daftar guru...
        </div>
      ) : filteredTeachers.length === 0 ? (
        <EmptyState
          message="Belum ada data guru. Silakan tambahkan guru baru atau impor melalui CSV."
          actionButton={
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Tambah Guru Sekarang
            </button>
          }
        />
      ) : (
        <div className="bg-white border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">NIP</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTeachers.map((t, idx) => (
                <tr key={t.uid} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{t.fullName}</td>
                  <td className="py-3 px-4 font-mono">{t.nip || '-'}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{t.email}</td>
                  <td className="py-3 px-4">{t.subjects?.join(', ') || '-'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${
                        t.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {t.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => openEditModal(t)}
                        className="p-1 text-slate-500 hover:text-amber-600 cursor-pointer"
                        title="Edit Data Guru"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(t)}
                        className="p-1 text-slate-500 hover:text-red-600 cursor-pointer"
                        title={t.status === 'active' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                      >
                        {t.status === 'active' ? (
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

      {/* Modal Tambah / Edit Guru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-slate-300 max-w-lg w-full p-6 text-slate-900 shadow-xl text-xs">
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-3 mb-4">
              {editingTeacher ? 'Edit Akun Guru' : 'Tambah Akun Guru Baru'}
            </h2>

            <form onSubmit={handleSaveTeacher} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Nama Lengkap & Gelar <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Budi Santoso, S.Pd."
                  required
                  className="w-full p-2.5 border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Nomor Induk Pegawai (NIP)
                </label>
                <input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="Contoh: 198205102008011005"
                  className="w-full p-2.5 border border-slate-300 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Email Akun Guru <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Contoh: budi.guru@sekolah.sch.id"
                  required
                  className="w-full p-2.5 border border-slate-300 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Mata Pelajaran Diampu (Pisahkan koma)
                </label>
                <input
                  type="text"
                  value={subjectsStr}
                  onChange={(e) => setSubjectsStr(e.target.value)}
                  placeholder="Contoh: Matematika, IPA"
                  className="w-full p-2.5 border border-slate-300 bg-white"
                />
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
                  Simpan Akun Guru
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
              Impor Data Guru dari CSV
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
                  {importRows.length} data guru terdeteksi siap diimpor.
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
                  {isImporting ? 'Mengimpor...' : `Simpan ${importRows.length} Guru`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
