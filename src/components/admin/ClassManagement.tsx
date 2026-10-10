import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SchoolClass, EducationLevel } from '../../types';
import {
  fetchClasses,
  createClass,
  updateClass,
  deleteClass,
  logAudit,
} from '../../services/db';
import { EmptyState } from '../common/EmptyState';
import { School, Plus, Edit, Trash2 } from 'lucide-react';

export const ClassManagement: React.FC = () => {
  const { user, profile } = useAuth();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);

  // Form
  const [name, setName] = useState('');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('SD');
  const [grade, setGrade] = useState('6');
  const [academicYear, setAcademicYear] = useState('2026/2027');
  const [homeroomTeacher, setHomeroomTeacher] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchClasses();
      setClasses(data);
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
    setEditingClass(null);
    setName('');
    setEducationLevel('SD');
    setGrade('6');
    setAcademicYear('2026/2027');
    setHomeroomTeacher('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: SchoolClass) => {
    setEditingClass(c);
    setName(c.name);
    setEducationLevel(c.educationLevel);
    setGrade(c.grade);
    setAcademicYear(c.academicYear);
    setHomeroomTeacher(c.homeroomTeacher || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingClass) {
        await updateClass(editingClass.id, {
          name: name.trim(),
          educationLevel,
          grade,
          academicYear: academicYear.trim(),
          homeroomTeacher: homeroomTeacher.trim() || undefined,
        });

        await logAudit(
          'UPDATE_CLASS',
          user.uid,
          user.email || '',
          profile?.role || 'admin',
          `Memperbarui data kelas: ${name}`,
          editingClass.id
        );
      } else {
        const id = await createClass({
          name: name.trim(),
          educationLevel,
          grade,
          academicYear: academicYear.trim(),
          homeroomTeacher: homeroomTeacher.trim() || undefined,
        });

        await logAudit(
          'CREATE_CLASS',
          user.uid,
          user.email || '',
          profile?.role || 'admin',
          `Menambahkan kelas baru: ${name} (${educationLevel} Kelas ${grade})`,
          id
        );
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, className: string) => {
    if (window.confirm(`Yakin ingin menghapus kelas "${className}"?`)) {
      try {
        await deleteClass(id);
        if (user) {
          await logAudit(
            'DELETE_CLASS',
            user.uid,
            user.email || '',
            profile?.role || 'admin',
            `Menghapus kelas: ${className}`,
            id
          );
        }
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
          <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight flex items-center space-x-2">
            <School className="w-5 h-5 text-indigo-700" />
            <span>Manajemen Rombongan Belajar & Kelas</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola tingkatan kelas 1–12 (SD, SMP, SMA), rombel belajar, dan wali kelas.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kelas Baru</span>
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-mono">
          Memuat daftar kelas...
        </div>
      ) : classes.length === 0 ? (
        <EmptyState
          message="Belum ada data kelas. Silakan tambahkan kelas terlebih dahulu."
          actionButton={
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Tambah Kelas Sekarang
            </button>
          }
        />
      ) : (
        <div className="bg-white border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Kelas / Rombel</th>
                <th className="py-3 px-4">Jenjang</th>
                <th className="py-3 px-4">Tingkat Kelas</th>
                <th className="py-3 px-4">Tahun Ajaran</th>
                <th className="py-3 px-4">Wali Kelas</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {classes.map((c, idx) => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                  <td className="py-3 px-4 font-mono">{c.educationLevel}</td>
                  <td className="py-3 px-4 font-mono">Kelas {c.grade}</td>
                  <td className="py-3 px-4 font-mono">{c.academicYear}</td>
                  <td className="py-3 px-4">{c.homeroomTeacher || '-'}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1 text-slate-500 hover:text-amber-600 cursor-pointer"
                        title="Edit Kelas"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        className="p-1 text-slate-500 hover:text-red-600 cursor-pointer"
                        title="Hapus Kelas"
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

      {/* Modal Form Kelas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-slate-300 max-w-md w-full p-6 text-slate-900 shadow-xl text-xs">
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-3 mb-4">
              {editingClass ? 'Edit Rombel Kelas' : 'Tambah Rombel Kelas Baru'}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Nama Kelas / Rombel <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kelas 6A, Kelas 10 MIPA 1"
                  required
                  className="w-full p-2.5 border border-slate-300 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Jenjang</label>
                  <select
                    value={educationLevel}
                    onChange={(e) => {
                      const lvl = e.target.value as EducationLevel;
                      setEducationLevel(lvl);
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
                  <label className="block font-bold text-slate-700 uppercase mb-1">Tingkat</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
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

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Tahun Ajaran <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="Contoh: 2026/2027"
                  required
                  className="w-full p-2.5 border border-slate-300 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Wali Kelas (Opsional)
                </label>
                <input
                  type="text"
                  value={homeroomTeacher}
                  onChange={(e) => setHomeroomTeacher(e.target.value)}
                  placeholder="Nama guru wali kelas"
                  className="w-full p-2.5 border border-slate-300 bg-white"
                />
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
                  Simpan Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
