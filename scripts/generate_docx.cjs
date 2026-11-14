const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
  PageBreak,
  Header,
  Footer,
  PageNumber
} = require('docx');

const baseDir = path.resolve(__dirname, '..');
const readImg = (relPath) => fs.readFileSync(path.join(baseDir, relPath));

// Images
const iconApp = readImg('icons/icon-192.png');
const qrCode = readImg('screenshots/qrcode_live_app.png');
const img01 = readImg('screenshots/01_login_auth_screen.png');
const img03 = readImg('screenshots/03_input_diskon_kompound.png');
const img04 = readImg('screenshots/04_keranjang_troli_items.png');
const img05 = readImg('screenshots/05_safety_cap_overbudget.png');
const img06 = readImg('screenshots/06_tab_riwayat_struk.png');
const img07 = readImg('screenshots/07_tab_fluktuasi_harga.png');

// Helper styling
const FONT = 'Times New Roman';

function p(text, opts = {}) {
  const {
    bold = false,
    italic = false,
    size = 22, // 11pt = 22 half-pts
    align = AlignmentType.JUSTIFIED,
    after = 120, // 6pt
    line = 360, // 1.5 line spacing (240 * 1.5 = 360)
    children = null
  } = opts;

  return new Paragraph({
    alignment: align,
    spacing: { after: after, line: line },
    children: children || [
      new TextRun({
        text: text,
        font: FONT,
        bold: bold,
        italics: italic,
        size: size,
        color: '000000'
      })
    ]
  });
}

function h1(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 180, after: 100, line: 300 },
    children: [
      new TextRun({
        text: text,
        font: FONT,
        bold: true,
        size: 26, // 13pt
        color: '000000'
      })
    ],
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' }
    }
  });
}

function h2(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 140, after: 80, line: 300 },
    children: [
      new TextRun({
        text: text,
        font: FONT,
        bold: true,
        size: 23, // 11.5pt
        color: '000000'
      })
    ]
  });
}

function makeCell(content, widthPercent = 50, opts = {}) {
  const { align = AlignmentType.LEFT, vAlign = undefined, rowspan = 1 } = opts;
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    verticalAlign: vAlign,
    rowSpan: rowspan,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
    },
    children: Array.isArray(content) ? content : [content]
  });
}

// Feature Layout in Table (Left: Image, Right: Text)
function featureTable(imgBuffer, captionText, descParagraphs) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            margins: { top: 40, bottom: 40, left: 40, right: 80 },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE }
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                children: [
                  new ImageRun({
                    data: imgBuffer,
                    transformation: { width: 140, height: 280 }
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60, line: 240 },
                children: [
                  new TextRun({
                    text: captionText,
                    font: FONT,
                    italics: true,
                    size: 16, // 8pt
                    color: '333333'
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            margins: { top: 40, bottom: 40, left: 80, right: 40 },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE }
            },
            children: descParagraphs
          })
        ]
      })
    ]
  });
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: FONT,
          size: 22,
          color: '000000'
        }
      }
    }
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: 720,    // 0.5 in
            bottom: 720, // 0.5 in
            left: 1000,  // ~0.7 in
            right: 1000
          }
        }
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: "Dokumentasi Project GroceryTracker • Aileen Pheeby Angelica (12C / 01) • Hal. ",
                  font: FONT,
                  size: 18,
                  italics: true
                }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  font: FONT,
                  size: 18,
                  bold: true
                })
              ]
            })
          ]
        })
      },
      children: [
        // ================= PAGE 1 =================
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40, line: 260 },
          children: [
            new TextRun({ text: "SMA MUTIARA BANGSA 2 TANGERANG", font: FONT, bold: true, size: 23 }),
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60, line: 260 },
          children: [
            new TextRun({ text: "Evaluasi Practical Test (PT) Pertemuan 18 ~ 19 • Kurikulum Informatika Kelas 12", font: FONT, size: 19 }),
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40, line: 280 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' } },
          children: [
            new TextRun({ text: "DOKUMENTASI PROJECT & USER MANUAL: GROCERYTRACKER", font: FONT, bold: true, size: 26 }),
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 120, line: 260 },
          children: [
            new TextRun({ text: "Aplikasi Web Smart Grocery & Budget Companion Progressive Web App (PWA)", font: FONT, italics: true, size: 21 }),
          ]
        }),

        h1("Bagian 1 • Identitas Project & Pembuat"),
        p("Naskah dokumentasi ini disusun untuk memenuhi instrumen evaluasi Practical Test (PT) mata pelajaran Informatika. Seluruh data identitas siswa dan tautan akses sistem terlampir secara resmi pada tabel di bawah ini:"),

        // Identity Table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                makeCell(p("Komponen Identitas", { bold: true, size: 21 }), 26),
                makeCell(p("Keterangan Data", { bold: true, size: 21 }), 54),
                makeCell(p("Logo / Akses", { bold: true, align: AlignmentType.CENTER, size: 21 }), 20)
              ]
            }),
            new TableRow({
              children: [
                makeCell(p("Judul Dokumen", { bold: true }), 26),
                makeCell(p("Dokumentasi Project & User Manual: GroceryTracker"), 54),
                makeCell([
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new ImageRun({
                        data: iconApp,
                        transformation: { width: 60, height: 60 }
                      })
                    ]
                  }),
                  p("Logo GroceryTracker", { italic: true, size: 16, align: AlignmentType.CENTER, after: 20 })
                ], 20, { rowspan: 4, vAlign: 'center' })
              ]
            }),
            new TableRow({
              children: [
                makeCell(p("Nama Lengkap Siswa", { bold: true }), 26),
                makeCell(p("Aileen Pheeby Angelica", { bold: true }), 54)
              ]
            }),
            new TableRow({
              children: [
                makeCell(p("Nomor Absen / Kelas", { bold: true }), 26),
                makeCell(p("Nomor Absen: 1 • Kelas: 12C", { bold: true }), 54)
              ]
            }),
            new TableRow({
              children: [
                makeCell(p("Sekolah / Akun Email", { bold: true }), 26),
                makeCell(p("SMA Mutiara Bangsa 2 Tangerang • aileen@mutiarabangsa.sch.id"), 54)
              ]
            }),
            new TableRow({
              children: [
                makeCell(p("Link Live Website", { bold: true }), 26),
                makeCell(p("https://smart-grocery-tracker-ochre.vercel.app/"), 54),
                makeCell([
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new ImageRun({
                        data: qrCode,
                        transformation: { width: 60, height: 60 }
                      })
                    ]
                  }),
                  p("Scan Live Web", { italic: true, size: 16, align: AlignmentType.CENTER, after: 20 })
                ], 20, { rowspan: 3, vAlign: 'center' })
              ]
            }),
            new TableRow({
              children: [
                makeCell(p("Link GitHub Repository", { bold: true }), 26),
                makeCell(p("https://github.com/Aileen1499/smart-grocery-tracker.git"), 54)
              ]
            }),
            new TableRow({
              children: [
                makeCell(p("Spesifikasi Teknologi", { bold: true }), 26),
                makeCell(p("HTML5 Semantic, CSS3 Modern, Vanilla JavaScript (ES6+), Firebase Firestore, WebSocket Bridge WSS, Progressive Web App (PWA)."), 54)
              ]
            })
          ]
        }),

        h1("Bagian 2 • Tentang Aplikasi (Deskripsi & Manfaat Sosial)"),
        p("2.1 Deskripsi Singkat: GroceryTracker adalah aplikasi web mobile-first mandiri yang berfungsi ganda sebagai kalkulator belanja cerdas dan pengaman batas anggaran (Budget Safety Cap). Aplikasi ini dikembangkan untuk memecahkan problematika belanja nyata: kebingungan menghitung promo diskon bertingkat (50% + 20%), ketidaktahuan atas kenaikan harga bahan pokok, serta rasa cemas saat kasir mencetak struk belanja akibat anggaran yang terlampaui."),
        p("2.2 Manfaat Nyata bagi Berbagai Lapisan Masyarakat:"),
        p("• Siswa & Mahasiswa Rantau: Menjaga stabilitas uang saku bulanan melalui indikator batas anggaran yang ketat dan transparan agar bekal tidak habis sebelum tanggal gajian."),
        p("• Ibu Rumah Tangga & Keluarga: Menghadirkan kalkulasi promo diskon kompound secara otomatis dan presisi, sehingga alokasi pengeluaran dapur bebas dari jebakan diskon semu supermarket."),
        p("• Masyarakat Umum: Menyediakan arsip struk belanja digital serta tabel fluktuasi harga kebutuhan pokok antar-supermarket (Lotte Mart, Superindo, Alfamart, Indomaret) untuk efisiensi belanja."),

        // ================= PAGE 2 =================
        new Paragraph({ children: [new PageBreak()] }),

        h1("Bagian 3 • Penjelasan Fitur, Langkah Penggunaan, & Bukti Visual"),

        h2("Fitur 1: Sistem Otentikasi Terintegrasi & Akses Tamu (Multi-Device Sync)"),
        featureTable(
          img01,
          "Gambar 1: Antarmuka Login, Registrasi Akun, Google Sign-in, dan Mode Tamu.",
          [
            p("Fungsi & Manfaat: Menyediakan autentikasi yang aman dan fleksibel bagi pengguna. Mendukung sinkronisasi realtime dua arah antara laptop dan smartphone via Firebase Firestore & WebSocket Port 443, serta Mode Tamu untuk pengujian instan tanpa login.", { size: 21 }),
            p("Langkah Penggunaan (Step-by-Step):", { bold: true, size: 21 }),
            p("1. Buka peramban dan akses alamat web: https://smart-grocery-tracker-ochre.vercel.app/.", { size: 20 }),
            p("2. Pada formulir Masuk, ketikkan email aileen@mutiarabangsa.sch.id dan kata sandi akun.", { size: 20 }),
            p("3. Untuk pendaftaran baru, klik 'Daftar Akun' dan lengkapi nama, email, dan kata sandi.", { size: 20 }),
            p("4. Pengguna juga dapat menekan 'Lanjutkan dengan Google' untuk masuk secara praktis.", { size: 20 }),
            p("5. Untuk peninjauan cepat, klik tombol 'Masuk sebagai Tamu'. Sesi cloud akan langsung aktif.", { size: 20 }),
            p("Contoh Kasus: Siswa menyusun daftar belanja di laptop rumah, data langsung sinkron di ponsel saat tiba di supermarket.", { italic: true, size: 20 })
          ]
        ),

        h2("Fitur 2: Kalkulasi Belanja Realtime & Diskon Bertingkat Kompound (F-03)"),
        featureTable(
          img03,
          "Gambar 2: Kalkulasi Presisi Diskon Kompound 50% + 20% pada Wajan Rp 100.000.",
          [
            p("Fungsi & Manfaat: Menyelesaikan perhitungan diskon ganda bertingkat yang sering membingungkan pembeli. Promo wajan Rp 100.000 dengan diskon 50% + 20% dihitung berjenjang: dipotong 50% menjadi Rp 50.000, lalu dipotong lagi 20% dari Rp 50.000, menghasilkan harga bersih tepat Rp 40.000 (total hemat Rp 60.000).", { size: 21 }),
            p("Langkah Penggunaan (Step-by-Step):", { bold: true, size: 21 }),
            p("1. Pada Tab Belanja, ketikkan Nama Barang (misal: 'Wajan Teflon Serbaguna').", { size: 20 }),
            p("2. Tentukan kategori dan ketikkan harga satuan (contoh: 100000, otomatis terformat Rp 100,000).", { size: 20 }),
            p("3. Masukkan kuantitas pembelian (contoh: 1 pcs).", { size: 20 }),
            p("4. Ketikkan promo kompound pada kolom diskon: 50% + 20% (atau 50+20).", { size: 20 }),
            p("5. Sistem menampilkan pratinjau instan: Diskon Kompound: Rp 40.000 (Hemat Rp 60.000).", { size: 20 }),
            p("6. Klik tombol 'Masukkan ke Keranjang' untuk mencatat item ke dalam troli.", { size: 20 }),
            p("Hasil Nyata: Konsumen terhindar dari salah perhitungan kasir dan memperoleh transparansi harga mutlak.", { italic: true, size: 20 })
          ]
        ),

        // ================= PAGE 3 =================
        new Paragraph({ children: [new PageBreak()] }),

        h2("Fitur 3: Pengelolaan Troli Digital, Kuantitas Cepat (+/-), & FAB Melayang"),
        featureTable(
          img04,
          "Gambar 3: Rincian Troli Belanja, Tombol Pengganda (+/-), dan Tombol FAB Melayang.",
          [
            p("Fungsi & Manfaat: Menyajikan daftar belanja dalam kartu mobile ergonomis yang bersih. Dilengkapi tombol penyesuaian kuantitas kilat (+ dan -) yang seketika mengkalkulasi ulang total belanja tanpa jeda (0 ms), tombol hapus item, pengosongan troli, serta tombol melayang (+ Tambah Barang) untuk pengoperasian satu tangan di lorong toko.", { size: 21 }),
            p("Langkah Penggunaan (Step-by-Step):", { bold: true, size: 21 }),
            p("1. Rincian barang yang telah diinput tampil secara runtut pada daftar Troli Belanjaan.", { size: 20 }),
            p("2. Tekan tombol '+' untuk menambah jumlah atau '-' untuk mengurangi kuantitas.", { size: 20 }),
            p("3. Klik ikon Pensil jika ingin memperbarui nama barang atau harga satuan.", { size: 20 }),
            p("4. Klik ikon Tempat Sampah untuk menghapus komoditas tertentu dari keranjang.", { size: 20 }),
            p("5. Tekan tombol 'Kosongkan' jika ingin membatalkan seluruh daftar belanjaan sekaligus.", { size: 20 }),
            p("6. Saat menggulir layar ke bawah, sentuh tombol hijau bundar (+ Tambah Barang) untuk memunculkan formulir input secara cepat.", { size: 20 }),
            p("Contoh Kasus: Menambah Minyak Goreng dari 1 pcs (Rp 43.000) menjadi 3 pcs seketika mengkalkulasi subtotal menjadi Rp 129.000.", { italic: true, size: 20 })
          ]
        ),

        h2("Fitur 4: Pengendali Anggaran & Safety Cap Warning (SRS F-05)"),
        featureTable(
          img05,
          "Gambar 4: Banner Peringatan Bahaya Over Budget (> 100%) dan Kartu Merah Menyala.",
          [
            p("Fungsi & Manfaat: Memberikan perlindungan psikologis finansial otomatis melalui mekanisme 3 ambang batas (Three-tier Threshold Alert): Status Aman (Hijau, < 90%), Status Waspada (Kuning, 90% - 100%), dan Status Bahaya Over Budget (Merah, > 100%). Menampilkan peringatan tegas di bagian atas layar dan rekomendasi pembatalan barang belanjaan sekunder.", { size: 21 }),
            p("Langkah Penggunaan & Contoh Kasus:", { bold: true, size: 21 }),
            p("1. Pengguna menentukan pagu anggaran dompet belanja sebesar Rp 100.000.", { size: 20 }),
            p("2. Pengguna memasukkan komoditas belanjaan hingga akumulasi biaya mencapai Rp 114.000.", { size: 20 }),
            p("3. Bilah anggaran dan kartu troli seketika bertransformasi menjadi merah menyala.", { size: 20 }),
            p("4. Sistem menampilkan banner bahaya: 'PERINGATAN: Belanjaan Anda Melampaui Anggaran Sebesar Rp 14.000!'.", { size: 20 }),
            p("5. Konsumen langsung mengetahui pos belanja yang melebihi batas dan dapat mengeluarkan barang non-esensial sebelum membayar di kasir.", { size: 20 })
          ]
        ),

        // ================= PAGE 4 =================
        new Paragraph({ children: [new PageBreak()] }),

        h2("Fitur 5: Tab Riwayat Transaksi Belanja & Tombol Belanja Ulang (Re-Order)"),
        featureTable(
          img06,
          "Gambar 5: Tab Riwayat Transaksi dengan Struk Digital dan Tombol Belanja Ulang.",
          [
            p("Fungsi & Manfaat: Menyimpan rekaman digital transaksi belanja masa lalu secara terorganisir per toko (Lotte Mart, Superindo, dll) lengkap dengan tanggal transaksi, daftar item, dan total nominal belanja. Tombol 'Belanja Ulang' memungkinkan pengguna menduplikasi daftar barang lama ke troli baru dengan satu sentuhan.", { size: 21 }),
            p("Langkah Penggunaan (Step-by-Step):", { bold: true, size: 21 }),
            p("1. Tekan tab menu 'Riwayat' pada bilah navigasi bagian bawah.", { size: 20 }),
            p("2. Telusuri struk digital belanjaan yang telah diselesaikan sebelumnya.", { size: 20 }),
            p("3. Klik struk untuk meninjau rincian barang, harga komoditas, dan waktu belanja.", { size: 20 }),
            p("4. Untuk rutinitas belanja bulanan berulang, tekan tombol 'Belanja Ulang'. Seluruh item struk lama seketika disalin ke troli belanja aktif hari ini.", { size: 20 }),
            p("Hasil Nyata: Pengguna menghemat waktu pencatatan kebutuhan rutin keluarga setiap awal bulan.", { italic: true, size: 20 })
          ]
        ),

        h2("Fitur 6: Pelacak Fluktuasi Harga Komoditas Realtime Antar-Supermarket"),
        featureTable(
          img07,
          "Gambar 6: Tabel Fluktuasi Harga Komoditas Pokok Lintas Ritel Modern.",
          [
            p("Fungsi & Manfaat: Menampilkan transparansi perbandingan harga kebutuhan sembako pokok (Beras, Minyak Goreng, Telur, Gula Pasir, Daging Sapi) lintas gerai minimarket dan supermarket disertai indikator panah perubahan harga dinamis (Naik, Turun, Stabil) dibandingkan bulan sebelumnya.", { size: 21 }),
            p("Langkah Penggunaan (Step-by-Step):", { bold: true, size: 21 }),
            p("1. Tekan tab menu 'Harga' pada bilah navigasi bawah.", { size: 20 }),
            p("2. Perhatikan tabel komparasi harga komoditas sembako yang ditampilkan.", { size: 20 }),
            p("3. Amati indikator tren: Panah Hijau ke Bawah (Harga Turun), Panah Merah ke Atas (Harga Naik), dan Simbol Strip (Harga Stabil).", { size: 20 }),
            p("4. Pengguna dapat memilih gerai belanja yang menawarkan harga termurah untuk menghemat pengeluaran bulanan.", { size: 20 })
          ]
        ),

        // ================= PAGE 5 =================
        new Paragraph({ children: [new PageBreak()] }),

        h1("Bagian 4 • Cara Membuka & Menjalankan Aplikasi"),
        p("Aplikasi GroceryTracker beroperasi sebagai Progressive Web App (PWA) tanpa instalasi yang dapat diakses secara instan:"),
        p("1. Akses Melalui Komputer / Laptop (Desktop Browser): Buka peramban Google Chrome, Edge, atau Firefox, lalu masukkan alamat web: https://smart-grocery-tracker-ochre.vercel.app/."),
        p("2. Akses Melalui Smartphone (Mobile Safari / Chrome): Buka tautan di atas atau pindai QR Code pada lembar identitas dokumen ini."),
        p("3. Pemasangan PWA (Add to Home Screen): Pada browser Android atau iOS, sentuh menu pengaturan browser lalu pilih 'Tambahkan ke Layar Utama' (Add to Home Screen). Ikon aplikasi GroceryTracker akan terpasang di layar ponsel layaknya aplikasi native."),

        h1("Bagian 5 • Tanya Jawab & Kendala Umum (FAQ)"),
        p("• Tanya: Apakah isi keranjang belanja akan hilang jika aplikasi tertutup secara tiba-tiba?"),
        p("  Jawab: Tidak. Sistem secara otomatis mencadangkan data troli ke LocalStorage dan database cloud realtime sehingga keranjang langsung pulih saat aplikasi dibuka kembali."),
        p("• Tanya: Mengapa kartu belanja berubah warna menjadi kuning atau merah?"),
        p("  Jawab: Ini adalah mekanisme keselamatan finansial. Warna kuning menandakan belanjaan mencapai 90% pagu anggaran, sedangkan warna merah menandakan anggaran terlampaui (> 100%)."),
        p("• Tanya: Apakah aplikasi dapat digunakan tanpa registrasi akun email?"),
        p("  Jawab: Ya. Pengguna cukup menekan opsi 'Masuk sebagai Tamu' pada layar awal untuk mengoperasikan seluruh fitur kalkulasi secara penuh."),

        h1("Bagian 6 • Rencana Pengembangan Fitur Lanjutan (Wishlist)"),
        p("1. Pemindai Barcode Produk Kamera: Fitur pemindaian barcode kemasan secara otomatis melalui kamera smartphone."),
        p("2. Ekspor Laporan PDF / Spreadsheet: Fitur pengunduhan rekapitulasi pengeluaran bulanan dalam bentuk dokumen PDF formal."),
        p("3. Troli Belanja Kolaboratif: Fitur sinkronisasi keranjang bersama antar-anggota keluarga secara realtime saat berbelanja."),

        h1("Bagian 7 • Tautan Video Walkthrough Demonstrasi Aplikasi"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                makeCell([
                  p("VIDEO WALKTHROUGH & REKAMAN OPERASIONAL APLIKASI", { bold: true, align: AlignmentType.CENTER, after: 60 }),
                  p("Untuk menyaksikan rekaman video operasional dan simulasi alur belanja mandiri aplikasi GroceryTracker, silakan akses tautan publik berikut:", { size: 20 }),
                  p("• Tautan Video Walkthrough: https://smart-grocery-tracker-ochre.vercel.app/#video-walkthrough", { bold: true, size: 21, after: 40 }),
                  p("• Repositori GitHub Proyek: https://github.com/Aileen1499/smart-grocery-tracker.git", { bold: true, size: 21, after: 40 }),
                  p("Tautan di atas dapat dibuka langsung melalui peramban web desktop maupun smartphone.", { italic: true, size: 18 })
                ], 100)
              ]
            })
          ]
        })
      ]
    }
  ]
});

Packer.toBuffer(doc).then((buffer) => {
  const outputPath = path.join(baseDir, 'docs', 'Dokumentasi_Project_GroceryTracker_Aileen.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log('DOCX created successfully at:', outputPath);
});
