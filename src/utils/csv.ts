import * as XLSX from 'xlsx';

export function downloadCsvTemplate(
  type: 'question' | 'student' | 'teacher'
): void {
  let headers: string[] = [];
  let filename = '';

  if (type === 'question') {
    filename = 'template_bank_soal_imtihan.csv';
    headers = [
      'tipe_soal', // single_choice, multi_choice, true_false, short_answer, essay
      'pertanyaan',
      'pilihan_a',
      'pilihan_b',
      'pilihan_c',
      'pilihan_d',
      'pilihan_e',
      'kunci_jawaban', // e.g. A, or A;C, or true/false, or jawaban singkat
      'bobot',
      'rubrik_esai',
    ];
  } else if (type === 'student') {
    filename = 'template_siswa_imtihan.csv';
    headers = [
      'nis',
      'nama_lengkap',
      'jenjang', // SD, SMP, SMA
      'tingkat_kelas', // 1 - 12
      'nama_kelas', // e.g. 6A
      'tahun_ajaran', // e.g. 2026/2027
      'email', // opsional
    ];
  } else if (type === 'teacher') {
    filename = 'template_guru_imtihan.csv';
    headers = [
      'nip',
      'nama_lengkap',
      'email',
      'mata_pelajaran', // e.g. Matematika, IPA
      'kelas_diampu', // e.g. 7A, 7B
    ];
  }

  // Create empty template with headers only (no mock rows as mandated)
  const csvContent = headers.join(',') + '\n';
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function parseCsvFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 1) {
          resolve([]);
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        const rows: Record<string, string>[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
          const rowObj: Record<string, string> = {};
          headers.forEach((h, index) => {
            rowObj[h] = values[index] || '';
          });
          rows.push(rowObj);
        }
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

export function exportToExcel(data: Record<string, any>[], filename: string): void {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
