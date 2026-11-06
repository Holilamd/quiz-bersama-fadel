export interface SubjectCategory {
  slug: string;
  name: string;
  description: string;
  icon: string;
  badgeColor: string;
  solidColor: string;
}

export const CATEGORIES: Record<string, SubjectCategory> = {
  matematika: {
    slug: 'matematika',
    name: 'Matematika',
    description: 'Berhitung angka, penjumlahan, pengurangan, perkalian, pembagian, pecahan dasar, dan bangun datar.',
    icon: 'Calculator',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    solidColor: 'bg-blue-600',
  },
  ipa: {
    slug: 'ipa',
    name: 'IPAS (Sains)',
    description: 'Panca indra, tubuh manusia, makhluk hidup, wujud benda, perubahan energi, dan lingkungan sekitar.',
    icon: 'Atom',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    solidColor: 'bg-emerald-600',
  },
  bahasa: {
    slug: 'bahasa',
    name: 'Bahasa Indonesia',
    description: 'Membaca pemahaman cerita, kosa kata baru, penggunaan huruf kapital, tanda baca, dan kalimat tanya.',
    icon: 'BookOpen',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    solidColor: 'bg-amber-600',
  },
  tematik: {
    slug: 'tematik',
    name: 'Tematik & PPKn',
    description: 'Aturan di rumah dan sekolah, gotong royong, hidup rukun, serta nilai-nilai dasar Pancasila.',
    icon: 'Sparkles',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    solidColor: 'bg-slate-700',
  },
};

export const GRADE_LEVELS = [
  { id: 'all', label: 'Semua Kelas' },
  { id: 'Kelas 1 SD', label: 'Kelas 1 SD' },
  { id: 'Kelas 2 SD', label: 'Kelas 2 SD' },
  { id: 'Kelas 3 SD', label: 'Kelas 3 SD' },
  { id: 'Kelas 4 SD', label: 'Kelas 4 SD' },
];
