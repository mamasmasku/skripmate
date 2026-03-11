export interface StorytellRumus {
  id: string;
  name: string;
  description: string;
  structure: string;
}

export const STORYTELLING_RUMUS: StorytellRumus[] = [
  {
    id: 'explain-reveal-invite',
    name: 'Explain - Reveal - Invite',
    description: 'Jelaskan situasi → Ungkap fakta/insight mengejutkan → Ajak action',
    structure: 'Explain: jelaskan konteks/situasi\nReveal: ungkap insight atau fakta yang mengejutkan\nInvite: ajak audiens ambil tindakan'
  },
  {
    id: 'before-after-bridge',
    name: 'Before - After - Bridge',
    description: 'Kondisi sebelum → Kondisi sesudah yang lebih baik → Produk sebagai jembatan',
    structure: 'Before: gambarkan kondisi sebelum pakai produk\nAfter: tunjukkan kondisi sesudah yang lebih baik\nBridge: produk ini yang jadi jembatannya'
  },
  {
    id: 'problem-agitate-solve',
    name: 'Problem - Agitate - Solve',
    description: 'Angkat masalah → Perbesar rasa sakitnya → Hadirkan solusi',
    structure: 'Problem: angkat masalah yang relevan\nAgitate: perbesar dampak/rasa sakit dari masalah itu\nSolve: hadirkan produk sebagai solusi konkret'
  },
  {
    id: 'feature-advantages-benefits',
    name: 'Feature - Advantages - Benefits',
    description: 'Fitur produk → Keunggulan dibanding lain → Manfaat nyata bagi pengguna',
    structure: 'Feature: sebutkan fitur utama produk\nAdvantages: jelaskan keunggulan dibanding alternatif lain\nBenefits: apa manfaat nyata yang dirasakan pengguna'
  },
  {
    id: 'useful-useful-unique',
    name: 'Useful - Useful - Unique',
    description: 'Manfaat 1 → Manfaat 2 → Keunikan yang membedakan dari kompetitor',
    structure: 'Useful 1: manfaat pertama yang dirasakan\nUseful 2: manfaat kedua yang memperkuat\nUnique: keunikan produk yang tidak dimiliki kompetitor'
  },
  {
    id: 'aida',
    name: 'Attention - Interest - Desire - Action',
    description: 'Tarik perhatian → Bangun minat → Bangkitkan keinginan → Dorong aksi',
    structure: 'Attention: kalimat pembuka yang memancing perhatian\nInterest: bangun rasa ingin tahu dengan fakta/cerita menarik\nDesire: bangkitkan keinginan dengan manfaat & hasil nyata\nAction: dorong audiens ambil tindakan sekarang'
  },
  {
    id: 'problem-promise-prove',
    name: 'Problem - Promise - Prove',
    description: 'Angkat masalah → Beri janji solusi → Buktikan dengan data/testimoni',
    structure: 'Problem: angkat masalah yang dirasakan audiens\nPromise: beri janji bahwa produk ini solusinya\nProve: buktikan dengan bukti konkret, demo, atau testimoni'
  },
  {
    id: 'attention-problem-solution',
    name: 'Attention - Problem - Solution',
    description: 'Tarik perhatian → Gambarkan masalah → Berikan solusi',
    structure: 'Attention: kalimat hook yang menarik perhatian\nProblem: gambarkan masalah yang relatable\nSolution: hadirkan produk sebagai solusi'
  },
  {
    id: 'problem-statistik-solution',
    name: 'Problem - Statistik - Solution',
    description: 'Angkat masalah → Kuatkan dengan data/angka → Tawarkan solusi',
    structure: 'Problem: angkat masalah yang nyata\nStatistik: perkuat dengan data, angka, atau fakta\nSolution: produk ini menjawab masalah tersebut'
  },
  {
    id: 'problem-grouping-solution',
    name: 'Problem - Grouping - Solution',
    description: 'Angkat masalah → Kelompokkan tipe/kategori masalah → Solusi untuk semua',
    structure: 'Problem: angkat masalah umum\nGrouping: kelompokkan berbagai tipe masalah yang relevan\nSolution: produk ini menjawab semua kelompok masalah'
  },
  {
    id: 'problem-impact-impact-solution',
    name: 'Problem - Impact - Impact - Solution',
    description: 'Masalah → Dampak 1 → Dampak 2 (lebih dalam) → Solusi',
    structure: 'Problem: angkat masalah utama\nImpact 1: dampak pertama yang langsung terasa\nImpact 2: dampak jangka panjang yang lebih besar\nSolution: produk ini memutus rantai masalah'
  },
  {
    id: 'star-story-solution',
    name: 'STAR - Story - Solution',
    description: 'Situation/Task/Action/Result → Cerita konkret → Produk sebagai solusi',
    structure: 'STAR: Situation (situasi), Task (tugas/tantangan), Action (tindakan), Result (hasil)\nStory: ceritakan secara naratif yang menarik\nSolution: produk ini yang membuat itu semua mungkin'
  },
  {
    id: 'why-try-buy',
    name: 'Why - Try - Buy',
    description: 'Kenapa butuh → Coba/bukti → Ajak beli sekarang',
    structure: 'Why: kenapa audiens butuh produk ini\nTry: bukti atau pengalaman nyata memakai produk\nBuy: ajak audiens untuk segera membeli'
  },
  {
    id: 'failed-growth-success',
    name: 'Failed - Growth - Success',
    description: 'Cerita kegagalan → Proses berkembang → Sukses berkat produk',
    structure: 'Failed: ceritakan kegagalan atau kondisi buruk di awal\nGrowth: proses perubahan dan pembelajaran\nSuccess: kondisi sukses/baik yang dicapai berkat produk'
  },
  {
    id: 'success-failed-insight',
    name: 'Success - Failed - Insight',
    description: 'Cerita sukses → Kegagalan/tantangan → Pelajaran berharga',
    structure: 'Success: mulai dari kondisi positif\nFailed: tapi ada kegagalan atau tantangan yang muncul\nInsight: pelajaran berharga yang didapat (dan produk sebagai jawabannya)'
  },
  {
    id: 'feature-advantage-analogy',
    name: 'Feature - Advantage - Analogy',
    description: 'Fitur produk → Keunggulan → Analogi sederhana agar mudah dipahami',
    structure: 'Feature: jelaskan fitur utama\nAdvantage: keunggulan nyata dari fitur tersebut\nAnalogy: gunakan analogi sederhana agar mudah dimengerti'
  },
  {
    id: 'extreme-one-stop-solution',
    name: 'Extreme - One Stop Solution',
    description: 'Gambarkan masalah yang ekstrem/besar → Satu solusi yang menyelesaikan semuanya',
    structure: 'Extreme: gambarkan masalah dalam kondisi paling parah/ekstrem\nOne Stop Solution: produk ini adalah satu-satunya solusi yang dibutuhkan'
  },
  {
    id: 'solution-impact-problem',
    name: 'Solution - Impact - Problem',
    description: 'Tampilkan solusi dulu → Tunjukkan dampak positifnya → Ungkap masalah yang diselesaikan',
    structure: 'Solution: langsung tampilkan produk/solusinya\nImpact: tunjukkan dampak positif nyata\nProblem: ungkap masalah yang ternyata diselesaikannya'
  },
  {
    id: 'open-loops',
    name: 'Psychological Pull of Open Loops',
    description: 'Buat pertanyaan/ketegangan yang belum terjawab → Jaga rasa penasaran → Jawab di akhir',
    structure: 'Open Loop: buat pertanyaan atau pernyataan yang menggantung\nKeep Tension: pertahankan rasa penasaran dengan detail yang memancing\nClose Loop: jawab pertanyaan di akhir, sertakan produk sebagai jawabannya'
  },
  {
    id: 'mirror-relate',
    name: 'Mirror Relate',
    description: 'Audiens merasa bercermin → Ungkap alasan tersembunyi → Insight "gue banget"',
    structure: 'Mirror: gambarkan situasi yang membuat audiens berkata "gue banget"\nRelate: ungkap alasan tersembunyi di balik situasi itu\nInsight: berikan insight yang terasa personal dan menyentuh'
  },
  {
    id: 'hidden-truth',
    name: 'Hidden Truth',
    description: 'Ungkap kebenaran/fakta emosional yang sering dipendam → Validasi jujur',
    structure: 'Hidden: ungkap kebenaran atau fakta yang jarang dibicarakan\nTruth: sampaikan dengan jujur dan berani\nValidasi: validasi perasaan audiens yang mungkin merasakannya juga'
  },
  {
    id: 'pain-relief',
    name: 'Pain → Relief',
    description: 'Sentuh luka emosional → Validasi (itu wajar) → Jalan keluar/penguatan',
    structure: 'Pain: sentuh luka atau ketidaknyamanan emosional audiens\nValidasi: ingatkan bahwa itu wajar dan banyak yang merasakannya\nRelief: hadirkan jalan keluar atau penguatan dengan produk'
  },
  {
    id: 'were-the-same',
    name: "We're the Same",
    description: 'Aku pernah mengalaminya → Aku paham perasaanmu → Kebersamaan (Selevel)',
    structure: "We: ceritakan bahwa kamu pernah mengalami hal yang sama\nSame: tunjukkan pemahaman mendalam akan perasaan audiens\nTogether: bangun rasa kebersamaan dan tawarkan solusi bersama"
  },
  {
    id: 'call-out-your-people',
    name: 'Call Out Your People',
    description: 'Panggil kelompok spesifik → Ungkap tantangan khas mereka → Solusi',
    structure: 'Call Out: panggil kelompok spesifik (ibu rumah tangga, pekerja kantoran, dll)\nChallenge: ungkap tantangan khas yang mereka hadapi\nSolution: produk ini khusus hadir untuk mereka'
  },
  {
    id: 'i-wish-someone-told-me',
    name: 'I Wish Someone Told Me',
    description: 'Pelajaran hidup/penyesalan → Nasihat lembut untuk masa lalu → Produk sebagai jawaban',
    structure: 'I Wish: ceritakan penyesalan atau hal yang seharusnya diketahui lebih awal\nTold Me: nasihat lembut yang ingin disampaikan ke diri sendiri dulu\nNow: sekarang ada solusinya, dan itu produk ini'
  },
  {
    id: 'validation-healing',
    name: 'Validation / Healing',
    description: 'Identifikasi luka → Ucapkan apresiasi yang dirindukan audiens → Produk sebagai pelengkap',
    structure: 'Validation: identifikasi luka atau beban yang dirasakan audiens\nHealing: ucapkan kalimat apresiasi yang mungkin lama tidak mereka dengar\nProduk: hadirkan produk sebagai bagian dari self-care mereka'
  },
  {
    id: 'i-know-you-feel-this',
    name: 'I Know You Feel This',
    description: 'Baca pikiran/perasaan audiens → Jelaskan penyebabnya → Validasi dan solusi',
    structure: 'I Know: ungkap pikiran atau perasaan yang mungkin dirasakan audiens saat ini\nFeel: jelaskan mengapa mereka merasakan itu\nThis: validasi dan tawarkan solusi nyata'
  },
  {
    id: 'silent-pain',
    name: 'Silent Pain',
    description: 'Luarnya tampak baik → Mengungkap struggle di balik layar → Empati dan solusi',
    structure: 'Silent: gambarkan kondisi luar yang tampak baik-baik saja\nPain: ungkap struggle tersembunyi di balik kondisi itu\nEmpati: tunjukkan empati dan hadirkan produk sebagai bantuan nyata'
  },
  {
    id: 'growing-up-realization',
    name: 'Growing Up Realization',
    description: 'Dulu vs Sekarang → Perubahan cara pandang saat dewasa → Produk yang relevan',
    structure: 'Dulu: ceritakan cara pandang atau kebiasaan dulu\nSekarang: bandingkan dengan cara pandang sekarang yang lebih bijak\nRealisasi: produk ini bagian dari kedewasaan yang dimaksud'
  },
  {
    id: 'soft-punch',
    name: 'Soft Punch',
    description: 'Kenyataan pahit dengan nada lembut → Penyadaran tanpa menghakimi → Arah kebaikan',
    structure: 'Soft: sampaikan kenyataan pahit dengan cara yang lembut\nPunch: tetapi penyadarannya terasa kuat dan mengena\nDirection: arahkan ke hal yang lebih baik, dengan produk sebagai langkah awal'
  },
  {
    id: 'self-worth-reminder',
    name: 'Self-Worth Reminder',
    description: 'Masalah bukan karena kurangnya dirimu → Ingatkan nilai diri berharga → Produk sebagai dukungan',
    structure: 'Problem: angkat insecurity atau rasa kurang yang sering dirasakan\nReminder: ingatkan bahwa masalah itu bukan karena dirinya kurang\nWorth: hadirkan produk sebagai bentuk menghargai diri sendiri'
  },
  {
    id: 'adult-friendship',
    name: 'Adult Friendship',
    description: 'Realita pertemanan dewasa yang sibuk → Makna baru pertemanan → Nostalgia',
    structure: 'Adult: gambarkan realita pertemanan dewasa yang berubah\nFriendship: tunjukkan makna pertemanan yang baru dan lebih dalam\nNostalgia: produk sebagai cara merayakan atau mempererat hubungan'
  },
  {
    id: 'overthinking-cycle',
    name: 'Overthinking Cycle',
    description: 'Gambarkan siklus pikiran berputar → Validasi ini normal → Empati dan solusi',
    structure: 'Cycle: gambarkan siklus overthinking yang sangat relatable\nValidasi: ingatkan bahwa ini normal dan banyak yang mengalaminya\nSolusi: produk ini membantu memutus atau meringankan siklus tersebut'
  },
  {
    id: 'unspoken-love',
    name: 'Unspoken Love',
    description: 'Cinta/Rindu tak terungkap → Alasan takut → Konsekuensi emosional (Melankolis)',
    structure: 'Unspoken: gambarkan perasaan cinta atau rindu yang tidak terungkap\nFear: ungkap alasan mengapa takut mengungkapkan\nLove: produk ini bisa menjadi cara untuk mengekspresikannya'
  },
  {
    id: 'caring-too-much',
    name: 'Caring Too Much',
    description: 'Lelahnya people pleaser → Luka yang ditanggung → Ingatkan peduli diri sendiri',
    structure: 'Caring: gambarkan kelelahan orang yang selalu mementingkan orang lain\nToo Much: ungkap luka yang ditanggung akibat terlalu peduli\nSelf: produk ini hadir untuk mengingatkan bahwa dirinya juga penting'
  },
  {
    id: 'first-step-relate',
    name: 'First Step Relate',
    description: 'Takut memulai → Validasi perasaan → Dorongan motivasi tanpa memaksa',
    structure: 'First Step: gambarkan ketakutan atau ragu-ragu untuk memulai\nRelate: validasi bahwa itu wajar dirasakan siapapun\nGo: berikan dorongan lembut dengan produk sebagai langkah pertama'
  },
  {
    id: 'regret-vs-growth',
    name: 'Regret vs Growth',
    description: 'Identifikasi kesalahan/kegagalan → Hikmah → Fokus ke pelajaran',
    structure: 'Regret: identifikasi kesalahan atau kegagalan yang pernah terjadi\nGrowth: temukan hikmah dan pertumbuhan dari pengalaman itu\nForward: produk ini bagian dari perjalanan tumbuh ke depan'
  },
  {
    id: 'the-quiet-hero',
    name: 'The Quiet Hero',
    description: 'Apresiasi perjuangan diam-diam/pengorbanan tak terlihat → Memberi kekuatan',
    structure: 'Quiet: gambarkan perjuangan diam-diam yang jarang dilihat orang lain\nHero: apresiasi pengorbanan yang tak terlihat itu\nStrength: produk ini adalah bentuk penghargaan untuk para quiet hero'
  },
  {
    id: 'healing-is-not-linear',
    name: 'Healing Is Not Linear',
    description: 'Hari baik vs buruk → Bagian proses → Dorongan lanjut',
    structure: 'Healing: gambarkan bahwa ada hari baik dan hari buruk\nNot Linear: ingatkan bahwa itu bagian normal dari proses pemulihan\nKeep Going: produk ini hadir menemani di setiap prosesnya'
  },
];
