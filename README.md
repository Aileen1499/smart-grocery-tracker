# Smart Grocery & Price Tracker (PWA)

Aplikasi web mobile Progressive Web App (PWA) **Smart Grocery & Price Tracker** yang dibangun untuk memenuhi seluruh spesifikasi fungsional **Software Requirements Specification (SRS) F-01 sampai F-06**, Kasus Belanja Bulanan Rian, dan standar evaluasi **Pertemuan 15 (Daily Test 2 - DT2)** Kurikulum Informatika ICT Codehub SMA Mutiara Bangsa 2 Tangerang.

---

## 🎯 Ringkasan Fitur Inti (SRS F-01 ~ F-06)

| Kode | Fitur | Spesifikasi & Kriteria Keberhasilan (KKTP) | Status |
| :--- | :--- | :--- | :--- |
| **F-01** | **Form Input Sesi, Toko & Tanggal** | Pemilihan toko (`Lotte Mart Grocery - Puri Indah`), selector tanggal (`2026-10-26`), nama barang, kategori, satuan, harga, dan kuantitas. Dilengkapi validasi form aktif yang mencegah input kosong, harga negatif, atau kuantitas 0. | ✅ Selesai |
| **F-02** | **Reaktivitas Qty & Subtotal** | Penggandaan kuantitas instan tanpa reload browser. Subtotal baris (`Harga Efektif × Qty`) dan Grand Total tagihan terhitung otomatis detik itu juga saat tombol `+` / `-` ditekan. | ✅ Selesai |
| **F-03** | **Kalkulator Diskon Kompound** | Menangani diskon tunggal (25% pada Rp 20.000 = Rp 15.000) dan promo bertumpuk bertingkat (50% + 20% pada Rp 100.000 = **Rp 40.000** secara bertahap kompound, bukan 70% linier). | ✅ Selesai |
| **F-04** | **Komparator Fluktuasi Harga Realtime** | Membandingkan harga input dengan histori bulan lalu (26 September 2026) di Lotte Mart Puri Indah:<br>• **Naik:** Panah Merah (`↑ +Rp 6.000`) pada Beras Rojolele<br>• **Turun:** Panah Hijau (`↓ -Rp 4.000`) pada Telur 1kg<br>• **Stabil:** Tanda Setara Abu-abu (`= Stabil`) pada Garam 500g | ✅ Selesai |
| **F-05** | **Pengendali Anggaran (Safety Cap)** | Pemantauan limit dompet (default Rp 350.000, uji lab Rp 100.000).<br>• `< 90%`: Status Aman (bar hijau)<br>• `≥ 90%`: Peringatan Waspada (bar kuning)<br>• `> 100%`: Banner merah menyala tegas: *"Total belanja melebihi batas saldo dompet! Kurangi kuantitas atau batalkan barang sekunder."* | ✅ Selesai |
| **F-06A** | **Persistensi Data Lokal** | Penyimpanan sesi belanja utuh di `localStorage`. Tahan reload paksa browser (`F5` / `Ctrl+R`) tanpa reset ke nol. Fitur hapus baris item berfungsi memotong grand total secara dinamis. | ✅ Selesai |
| **F-06B** | **Arsitektur Realtime Sync** | Sinkronisasi lokal antar-tab/jendela tanpa reload melalui `BroadcastChannel` dan `StorageEvent`. Struktur adapter modular siap disambungkan dengan Cloud Firestore `onSnapshot()` tanpa mengubah kode inti. | ✅ Siap Pakai |
| **UX/UI** | **Mobile PWA Ergonomis** | Touch target minimal 44×44px, numeric keyboard otomatis (`inputmode="numeric"`), visual toast feedback non-blocking (tanpa `window.alert()`), modal konfirmasi hapus aman, dan responsif 375px tanpa horizontal scroll. | ✅ Selesai |

---

## 📂 Struktur Proyek

```
smart-grocery-tracker/
├── index.html              # Antarmuka mobile PWA utama
├── manifest.json           # Manifest PWA untuk instalasi smartphone
├── sw.js                   # Service Worker untuk kapabilitas offline & cache
├── css/
│   └── style.css           # Styling mobile-first responsif (375px), touch-friendly (>=44px)
├── js/
│   ├── app.js              # Controller utama aplikasi & binding event DOM
│   ├── calculator.js       # Logika kalkulasi diskon kompound (F-03) & subtotal (F-02)
│   ├── comparator.js       # Logika komparasi fluktuasi harga histori toko (F-04)
│   ├── budget.js           # Logika evaluasi status budget safety cap (F-05)
│   ├── storage.js          # Persistensi data lokal LocalStorage tahan F5 (F-06A)
│   ├── sync.js             # Sinkronisasi realtime multi-tab & adapter onSnapshot (F-06B)
│   ├── ui.js               # Toast notification non-blocking & modal konfirmasi aman
│   └── history-data.js     # Data baseline histori harga Lotte Mart Puri Indah 26 Sept 2026
├── tests/
│   └── tracker.test.js     # Unit test otomatis 15 skenario (Node.js test runner)
└── package.json            # Konfigurasi proyek & skrip pengujian
```

---

## 🧪 Menjalankan Pengujian Otomatis

Seluruh pengujian unit dan logika matematis diuji menggunakan Node.js Test Runner bawaan tanpa dependensi eksternal:

```powershell
npm test
```

Hasil verifikasi:
```
✔ SRS F-03: Kalkulator Diskon Bertingkat (Kompound) (4 test lolos)
✔ SRS F-02: Reaktivitas Kuantitas dan Subtotal (3 test lolos)
✔ SRS F-04: Komparator Fluktuasi Harga Realtime (4 test lolos)
✔ SRS F-05: Pengendali Anggaran (Budget Safety Cap) (3 test lolos)
✔ SRS F-06A: Struktur Default State & Persistensi (1 test lolos)
ℹ tests 15 | pass 15 | fail 0
```

---

## 🚀 Menjalankan Aplikasi Secara Lokal

Untuk membuka dan menguji aplikasi di browser:
1. Buka langsung file `index.html` di browser Google Chrome, atau
2. Jalankan local web server (opsional):
   ```powershell
   npx serve .
   ```
   Lalu buka URL yang muncul (misalnya `http://localhost:3000`) pada smartphone atau browser PC.

Untuk menguji simulasi smartphone di Google Chrome DevTools:
- Tekan `F12` > klik ikon **Toggle Device Toolbar** (`Ctrl + Shift + M`).
- Pilih preset **iPhone SE** (lebar 375px).
- Klik tombol **"⭐ Muat Skenario Uji DT2 Kasus Rian"** di keranjang untuk mengisi otomatis data barang belanjaan uji.
