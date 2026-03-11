export interface CTAOption {
  id: string;
  text: string;
}

export interface CTACategory {
  id: string;
  label: string;
  options: CTAOption[];
}

export const CTA_CATEGORIES: CTACategory[] = [
  {
    id: 'hard-selling',
    label: '🔥 Hard Selling',
    options: [
      { id: 'hs-1', text: 'Kalau memang ini yang kamu cari, langsung amankan lewat keranjang bawah ya.' },
      { id: 'hs-2', text: 'Biar nggak kelewatan, kamu bisa checkout sekarang di keranjang bawah.' },
      { id: 'hs-3', text: 'Kalau sudah cocok, nggak perlu lama-lama. Klik keranjang bawah dan selesaikan pesananmu.' },
      { id: 'hs-4', text: 'Yuk, selangkah lagi. Ambil sekarang lewat keranjang bawah sebelum stoknya bergeser.' },
      { id: 'hs-5', text: 'Keputusan kecil hari ini bisa jadi hasil besar nanti. Amankan dulu di keranjang bawah ya.' },
    ],
  },
  {
    id: 'lembut',
    label: '🌸 Lembut',
    options: [
      { id: 'l-1', text: 'Kalau kamu merasa ini cocok, belinya di keranjang bawah ya 😊' },
      { id: 'l-2', text: 'Cek dulu produknya lewat keranjang bawah, siapa tahu kamu suka 🌸' },
      { id: 'l-3', text: 'Kalau tertarik, boleh masukin ke keranjang bawah pelan-pelan aja.' },
      { id: 'l-4', text: 'Nggak harus sekarang, tapi boleh intip dulu di keranjang bawah ya.' },
    ],
  },
  {
    id: 'logika',
    label: '🧠 Logika',
    options: [
      { id: 'log-1', text: 'Siapa tahu ada promo sebelum habis langsung amankan lewat keranjang bawah ya.' },
      { id: 'log-2', text: 'Harga lagi bersahabat, mending masukin dulu ke keranjang bawah biar nggak ketinggalan.' },
      { id: 'log-3', text: 'Stok cepat habis, belinya di keranjang bawah sekarang biar aman ya.' },
      { id: 'log-4', text: 'Lebih hemat kalau langsung dimasukin ke keranjang bawah sebelum naik harga.' },
    ],
  },
  {
    id: 'emosional',
    label: '💛 Emosional',
    options: [
      { id: 'em-1', text: 'Kamu pantas hidup lebih mudah amankan lewat keranjang bawah sekarang ya.' },
      { id: 'em-2', text: 'Jangan tunggu sampai nyesel, belinya di keranjang bawah ya.' },
      { id: 'em-3', text: 'Kalau ini bisa bikin harimu lebih ringan, jangan ragu beli di keranjang bawah.' },
      { id: 'em-4', text: 'Hadiah kecil buat dirimu sendiri? Ambilnya lewat keranjang bawah ya.' },
    ],
  },
  {
    id: 'penasaran',
    label: '🤔 Penasaran',
    options: [
      { id: 'p-1', text: 'Penasaran kenapa ini viral? Cek langsung di keranjang bawah ya 👇' },
      { id: 'p-2', text: 'Bagian terbaiknya ada setelah kamu buka keranjang bawah.' },
      { id: 'p-3', text: 'Yang bikin banyak orang tertarik ada di keranjang bawah coba lihat deh.' },
      { id: 'p-4', text: 'Kalau mau tahu rahasianya, intip dulu di keranjang bawah ya.' },
    ],
  },
  {
    id: 'sosial',
    label: '👥 Sosial',
    options: [
      { id: 's-1', text: 'Ribuan orang sudah pakai kamu bisa ikut lewat keranjang bawah ya.' },
      { id: 's-2', text: 'Produk ini lagi naik daun, belinya gampang lewat keranjang bawah ya.' },
      { id: 's-3', text: 'Join pengguna lainnya, amankan produkmu di keranjang bawah.' },
      { id: 's-4', text: 'Biar nggak ketinggalan tren, langsung ambil lewat keranjang bawah ya.' },
    ],
  },
  {
    id: 'eksperimen',
    label: '🧪 Eksperimen',
    options: [
      { id: 'ek-1', text: 'Mending dulu masukin ke keranjang bawah biar ga lupa ya.' },
      { id: 'ek-2', text: 'Belinya di keranjang bawah ya, coba dulu nggak masalah.' },
      { id: 'ek-3', text: 'Mulai dari satu dulu, tinggal masukin ke keranjang bawah aja sekarang.' },
      { id: 'ek-4', text: 'Nggak perlu komitmen besar, cukup ambil dulu di keranjang bawah.' },
    ],
  },
];

export const DEFAULT_CTA_CATEGORY_ID = 'hard-selling';
