# Surat Pengantar Naik (SP Naik)

## 1. Fungsi

**Surat Pengantar Naik (SP Naik)** adalah dokumen operasional yang merekam pemberangkatan barang (BTT/Resi) dari suatu cabang/agen/counter ke cabang/agen/counter lain. Biasanya disebut **SP Naik** oleh pengguna karena barang "naik" ke kendaraan pengiriman.

SP Naik mencatat:
- Dari mana dan ke mana barang dikirim
- Tanggal pemberangkatan
- Kendaraan dan sopir yang digunakan
- Jenis layanan (Darat, Laut, atau Udara)
- Status transit (Langsung ke tujuan akhir, atau singgah di cabang perantara)
- Daftar semua nomor BTT/Resi yang diberangkatkan

SP Naik adalah syarat wajib sebelum barang bisa meninggalkan cabang asal. Tanpa SP Naik, pemberangkatan barang tidak tercatat di sistem.

---

## 2. Istilah Penting

| Istilah | Keterangan |
|---------|-----------|
| **BTT** | Bukti Terima Titipan — dokumen resi pengiriman barang |
| **SP Naik** | Surat Pengantar Naik, dokumen pemberangkatan barang |
| **Loading** | Proses memuat barang ke kendaraan oleh checker menggunakan barcode scanner |
| **Transit** | Pengiriman yang singgah di cabang perantara sebelum ke tujuan akhir |
| **Langsung** | Pengiriman langsung ke cabang tujuan tanpa singgah |
| **Checker** | Petugas operasional yang melakukan proses loading barang |
| **SP Turun** | Dokumen penerimaan barang di cabang tujuan (proses setelah SP Naik) |

---

## 3. Tabel Database yang Terlibat

### 3.1 Tabel Utama SP Naik

#### `OPR_T_eSP_Terima` — Header SP Naik
Tabel induk yang menyimpan satu baris per SP Naik.

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `SPT_eID` | varchar | **Primary Key** — Nomor SP (contoh: `SDBS0010620260001`) |
| `SPT_AsalAgenID` | int | ID cabang/agen asal pengiriman |
| `SPT_TujuanAgenID` | int | ID cabang/agen tujuan |
| `SPT_TransitYN` | varchar(1) | `Y` = Transit, `N` = Langsung |
| `SPT_Tanggal` | datetime | Tanggal pemberangkatan |
| `SPT_NamaSopir` | varchar(50) | Nama sopir/pengemudi |
| `SPT_NoMobil` | varchar(10) | Nomor polisi kendaraan |
| `SPT_SuratTugas` | varchar(15) | Nomor Surat Tugas / Surat Jalan |
| `SPT_PostingYN` | varchar(1) | Status posting akuntansi |
| `SPT_AktifYN` | varchar(1) | `Y` = aktif, `N` = non-aktif/dibatalkan |
| `SPT_UpdateID` | varchar(50) | Username yang membuat/mengubah |
| `SPT_UpdateTime` | datetime | Waktu pembaruan terakhir |
| `SPT_BoronganYN` | varchar(1) | `Y` = sopir borongan, `N` = sopir gajian |
| `SPT_GPS_AktifYN` | varchar(1) | `Y` = kendaraan terpantau GPS |
| `SPT_Service` | int | Jenis layanan: `1`=Reguler Darat, `2`=Reguler Laut, `3`=Reguler Udara, `4`=Kurir Darat, `5`=Kurir Laut, `6`=Kurir Udara |
| `SPT_LoadHID` | varchar(18) | ID loading (diisi jika SP dibuat dari proses loading) |
| `SPT_LoadChecker` | varchar(100) | NIP checker yang melakukan loading |

#### `OPR_T_eSP_TerimaDetil` — Detil BTT per SP Naik
Tabel detil, satu baris per BTT yang terdaftar dalam SP Naik.

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `SPTD_eSPTID` | varchar | Foreign Key ke `OPR_T_eSP_Terima.SPT_eID` |
| `SPTD_BTTID` | varchar | Nomor BTT/Resi yang dikirim |

### 3.2 Tabel Pendukung

| Tabel | Keterangan |
|-------|-----------|
| `MKT_T_eConote` | Data BTT/Resi: tujuan, berat, COD, jenis layanan, dll. |
| `GLB_M_Agen` | Master cabang/agen/counter |
| `GLB_M_Kendaraan` | Master kendaraan (termasuk info GPS) |
| `OPR_T_LoadingH` | Header proses loading barang oleh checker |
| `OPR_T_LoadingD` | Detil koli barang per loading |
| `OPR_T_eSuratJalan` | Surat Jalan kendaraan (berisi info sopir & kendaraan) |
| `HRD_M_Karyawan` | Data karyawan (untuk nama sopir dari NIP) |
| `GLB_M_Closing` | Status closing periode akuntansi per cabang |
| `OPR_T_eSP_Turun` | SP Turun — dokumen penerimaan di cabang tujuan |
| `vw_poolBTT` | View gabungan data BTT dari semua DB (DBS/DLB/Logistik) |
| `vw_Kendaraan` | View daftar kendaraan aktif |

### 3.3 Stored Procedure & Function

| Nama | Keterangan |
|------|-----------|
| `sp_AddOPR_T_eSP_Terima` | Membuat header SP Naik baru dan mengembalikan nomor SP yang dibuat |
| `sp_loadStatSP(agenID)` | Table-valued function — cek status SP per BTT di agen tertentu |
| `sp_SummaryLoad(loID)` | Table-valued function — ringkasan BTT dalam satu nomor loading |

---

## 4. Format Nomor SP

Nomor SP dihasilkan otomatis oleh stored procedure `sp_AddOPR_T_eSP_Terima` dengan format:

```
S [PT_ID] [KodeCabang] [BulanTahun] [Urutan]
│  │       │            │             │
│  │       │            │             └─ 4 digit urutan (0001, 0002, ...)
│  │       │            └─────────────── 6 digit (MMYYYY)
│  │       └──────────────────────────── 3 digit kode cabang
│  └──────────────────────────────────── kode perusahaan (contoh: DBS)
└─────────────────────────────────────── prefix "S"
```

**Contoh:** `SDBS001062026` + `0001` = `SDBS0010620260001`

Urutan di-reset per kombinasi `PT_ID + KodeCabang + BulanTahun`.

---

## 5. Halaman ASP yang Terlibat

| File | Fungsi |
|------|--------|
| `opr_t_sp_terima.asp` | Halaman daftar/view semua SP Naik (dengan filter) |
| `opr_t_sp_terima_a.asp` | Form input nomor loading (Metode Loading) |
| `opr_t_sp_terima_a_BTT.asp` | Form pembuatan SP (Metode Pilih BTT) |
| `opr_t_sp_terima_a_spPAD_DLIDLB.asp` | Tambah SP dari SP-PAD cabang DLI/DLB |
| `p-opr_t_sp_terima_a.asp` | Proses validasi nomor loading → redirect ke `_d.asp` |
| `p-opr_t_sp_terima_a_BTT.asp` | Proses simpan header SP (dipanggil oleh kedua metode) |
| `opr_t_sp_terima_d.asp` | Halaman summary loading per tujuan & layanan (Metode Loading) |
| `opr_t_sp_terima_d_crosscek.asp` | Kroscek BTT fisik vs sistem untuk satu loading |
| `opr_t_sp_terima_f.asp` | Form konfirmasi SP dari loading (per tujuan & jenis layanan) |
| `opr_t_sp_terima_e.asp` | Halaman edit SP: tambah/hapus BTT, ubah data header |
| `opr_t_sp_terima_print.asp` | Cetak SP (format standar) |
| `opr_t_sp_terima_print_ZEB.asp` | Cetak SP format Zebra (barcode label printer) |
| `opr_t_sp_terima_printgrid.asp` | Cetak grid/daftar SP (laporan) |
| `p-opr_t_sp_terima_h.asp` | Hapus/non-aktifkan SP |

---

## 6. Flow SP Naik

Ada **2 metode** untuk membuat SP Naik:

---

### 6.1 Metode A — Pilih BTT Langsung

Digunakan ketika operator memilih BTT satu per satu secara manual.

```
┌─────────────────────────────────────────────────────────────────┐
│                   opr_t_sp_terima.asp                           │
│              (Daftar SP Naik — halaman utama)                   │
└───────────────────────┬─────────────────────────────────────────┘
                        │ klik tombol [TAMBAH SP DARI BTT]
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│               opr_t_sp_terima_a_BTT.asp                         │
│  Form isian:                                                     │
│  - Tanggal pemberangkatan                                        │
│  - Jenis Layanan (Darat / Laut / Udara)                         │
│  - Tujuan Kota → pilih Agen Tujuan                              │
│  - Status Transit (Langsung / Transit)                           │
│  - Nama Sopir & Status Gajian (Borongan/Gajian)                 │
│  - Nomor Kendaraan                                               │
│  - Nomor Surat Tugas                                             │
└───────────────────────┬─────────────────────────────────────────┘
                        │ klik [TAMBAH RINCIAN]
                        │ POST ke:
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│             p-opr_t_sp_terima_a_BTT.asp                         │
│  Proses:                                                         │
│  1. Cek periode closing akuntansi (GLB_M_Closing)               │
│  2. Validasi data wajib (sopir, tujuan)                         │
│  3. EXEC sp_AddOPR_T_eSP_Terima → buat header SP baru           │
│  4. Dapat nomor SP baru (heID)                                   │
└───────────────────────┬─────────────────────────────────────────┘
                        │ redirect ke:
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│               opr_t_sp_terima_e.asp                             │
│  Halaman edit SP:                                                │
│  - Tampil header SP (tujuan, tanggal, sopir, kendaraan)         │
│  - Input nomor BTT (scan barcode atau ketik manual)             │
│  - Validasi BTT: sesuai tujuan, belum ada di SP lain            │
│  - Tambah BTT ke OPR_T_eSP_TerimaDetil                         │
│  - Hapus BTT dari daftar jika salah                             │
│  - Bisa cetak SP dari halaman ini                               │
└───────────────────────┬─────────────────────────────────────────┘
                        │ setelah semua BTT ditambahkan
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│             opr_t_sp_terima_print.asp                           │
│                 (Cetak SP Naik)                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Catatan penting tentang Status Transit:**
- **Langsung** → hanya menampilkan BTT yang tujuan akhirnya adalah cabang tujuan SP (kolom kanan atas pada cetakan BTT)
- **Transit** → menampilkan BTT yang cabang tujuannya bukan cabang ini (barang titipan yang akan diteruskan)

---

### 6.2 Metode B — Dari Proses Loading (Barcode Scanner)

Digunakan ketika checker sudah melakukan proses loading barang menggunakan barcode scanner terlebih dahulu. Semua BTT sudah tercatat dalam sistem melalui proses loading.

#### Fase 1: Proses Loading (oleh Checker — dilakukan sebelum SP Naik)

```
┌─────────────────────────────────────────────────────────────────┐
│                    opr_t_loading.asp                            │
│              (Daftar Loading — halaman loading)                  │
└───────────────────────┬─────────────────────────────────────────┘
                        │ klik [TAMBAH LOADING]
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                   opr_t_loading_a.asp                           │
│  Checker scan barcode BTT satu per satu.                        │
│  Setiap scan → BTT masuk ke OPR_T_LoadingD                     │
│  Header loading → OPR_T_LoadingH                                │
│  Sistem otomatis mendeteksi tujuan & jenis layanan BTT          │
└───────────────────────┬─────────────────────────────────────────┘
                        │ setelah semua BTT discan
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                 opr_t_loading_admin.asp                         │
│  Admin/supervisor APPROVE loading                                │
│  → LoadH_ApproveYN = 'Y' di OPR_T_LoadingH                    │
│  Loading siap diproses menjadi SP Naik                          │
└─────────────────────────────────────────────────────────────────┘
```

#### Fase 2: Membuat SP Naik dari Loading

```
┌─────────────────────────────────────────────────────────────────┐
│                   opr_t_sp_terima.asp                           │
│              (Daftar SP Naik — halaman utama)                   │
└───────────────────────┬─────────────────────────────────────────┘
                        │ klik tombol [TAMBAH SP DARI PROSES LOADING]
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│               opr_t_sp_terima_a.asp                             │
│  Input nomor loading barang                                      │
│  (ketik manual atau scan barcode)                               │
└───────────────────────┬─────────────────────────────────────────┘
                        │ klik [PROSES]
                        │ POST ke:
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              p-opr_t_sp_terima_a.asp                            │
│  Validasi:                                                       │
│  ✓ Nomor loading ada di database (OPR_T_LoadingH)              │
│  ✓ Loading sudah di-APPROVE (LoadH_ApproveYN = 'Y')            │
│  ✗ Belum terdaftar di SP-PAD (OPR_T_eSP_PAD)                  │
│  ✗ Belum terdaftar di Surat Loper (OPR_T_eLoper)              │
│                                                                  │
│  Jika gagal → tampil pesan error                                │
│  Jika lulus → redirect ke:                                      │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│               opr_t_sp_terima_d.asp                             │
│  Summary Loading — tampil daftar BTT dalam loading              │
│  Dikelompokkan berdasarkan:                                      │
│    • Jenis Layanan: Darat | Laut | Udara                        │
│    • Tipe Layanan: SP KURIR | SP REGULER                        │
│  Per baris: Cabang Tujuan | Jumlah BTT | No. SP (jika sudah)   │
│                                                                  │
│  Jika SP belum dibuat → nama cabang tujuan = link klik          │
│  Jika SP sudah ada   → tampil nomor SP (link cetak)             │
└───────────────────────┬─────────────────────────────────────────┘
                        │ klik nama cabang tujuan
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│               opr_t_sp_terima_f.asp                             │
│  Form konfirmasi SP dari loading per tujuan:                    │
│  - Data otomatis dari loading: kendaraan, sopir (dari SJ)       │
│  - Tujuan dan jenis layanan sudah terisi                        │
│  - Konfirmasi dan submit                                         │
└───────────────────────┬─────────────────────────────────────────┘
                        │ POST ke p-opr_t_sp_terima_a_BTT.asp
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│             p-opr_t_sp_terima_a_BTT.asp                         │
│  (Sama seperti Metode A)                                         │
│  EXEC sp_AddOPR_T_eSP_Terima dengan SPT_LoadHID terisi          │
└───────────────────────┬─────────────────────────────────────────┘
                        │ redirect ke:
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│               opr_t_sp_terima_e.asp                             │
│  Halaman edit SP — BTT sudah otomatis terisi dari loading       │
│  (BTT dari OPR_T_LoadingD yang sesuai tujuan & layanan)        │
│  Bisa tambah/hapus BTT jika diperlukan                          │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│             opr_t_sp_terima_print.asp                           │
│                 (Cetak SP Naik)                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Diagram Lengkap Alur SP Naik

```
                    ┌──────────────────────────┐
                    │   PROSES LOADING          │
                    │  (Hanya untuk Metode B)   │
                    │                           │
                    │  Checker scan BTT         │
                    │  → OPR_T_LoadingH/D       │
                    │  Admin approve loading     │
                    └────────────┬─────────────┘
                                 │
                                 ▼
              ┌─────────────────────────────────────────┐
              │         opr_t_sp_terima.asp              │
              │    (Halaman Daftar SP Naik)               │
              └──────┬───────────────────┬───────────────┘
                     │                   │
          [TAMBAH SP DARI BTT]   [TAMBAH SP DARI LOADING]
                     │                   │
                     ▼                   ▼
        ┌────────────────┐   ┌────────────────────────┐
        │  _a_BTT.asp    │   │      _a.asp             │
        │  (Form SP)     │   │  (Input No. Loading)    │
        └───────┬────────┘   └────────────┬───────────┘
                │                         │
                │                         │ (validasi)
                │                    ┌────▼────────────┐
                │                    │  p-_a.asp        │
                │                    │  (Cek loading:   │
                │                    │  approved? valid?)│
                │                    └────┬────────────┘
                │                         │
                │                    ┌────▼────────────┐
                │                    │    _d.asp        │
                │                    │  (Summary BTT    │
                │                    │   per tujuan)    │
                │                    └────┬────────────┘
                │                         │ (klik tujuan)
                │                    ┌────▼────────────┐
                │                    │    _f.asp        │
                │                    │  (Form konfirm   │
                │                    │   per tujuan)    │
                │                    └────┬────────────┘
                │                         │
                └──────────┬──────────────┘
                           │
                           ▼
              ┌────────────────────────────┐
              │   p-opr_t_sp_terima        │
              │       _a_BTT.asp            │
              │  EXEC sp_AddOPR_T_eSP_Terima│
              │  → Buat Header SP Baru      │
              └────────────┬───────────────┘
                           │ (dapat nomor SP)
                           ▼
              ┌────────────────────────────┐
              │   opr_t_sp_terima_e.asp     │
              │   (Halaman Edit SP)         │
              │   - Tambah/hapus BTT        │
              │   - BTT dari loading:       │
              │     otomatis terisi         │
              │   - BTT manual: input       │
              │     satu per satu           │
              └────────────┬───────────────┘
                           │
                           ▼
              ┌────────────────────────────┐
              │   opr_t_sp_terima          │
              │       _print.asp           │
              │   (Cetak SP Naik)          │
              └────────────────────────────┘
```

---

## 8. Aturan Bisnis Penting

### 8.1 Cek Periode Closing
Sebelum membuat SP Naik, sistem mengecek tabel `GLB_M_Closing`. Jika periode yang dipilih sudah di-closing oleh akuntansi, transaksi **tidak bisa** dilakukan. Operator harus menghubungi petugas akunting kantor pusat.

### 8.2 Status Transit vs Langsung
- **Langsung (N):** BTT yang bisa dimasukkan hanya yang tujuan akhirnya adalah cabang tujuan SP ini. Sistem menampilkan BTT yang `BTTt_TujuanAgenID` = tujuan SP.
- **Transit (Y):** BTT yang bisa dimasukkan adalah BTT yang melewati cabang ini (bukan tujuan akhir). Digunakan ketika kendaraan singgah di cabang perantara.

### 8.3 Validasi Loading (Metode B)
Loading hanya bisa diproses menjadi SP Naik jika:
1. Nomor loading **valid** dan terdaftar di `OPR_T_LoadingH`
2. Loading sudah **di-approve** (`LoadH_ApproveYN = 'Y'`)
3. Loading **belum** terdaftar di SP-PAD (`OPR_T_eSP_PAD`)
4. Loading **belum** terdaftar di Surat Loper (`OPR_T_eLoper`)

### 8.4 Satu Loading, Banyak SP
Dari satu nomor loading, bisa dihasilkan **banyak SP Naik** sekaligus — satu SP per kombinasi tujuan + jenis layanan. Contoh: loading berisi BTT tujuan Semarang (darat) dan BTT tujuan Surabaya (laut) akan menghasilkan dua SP berbeda.

### 8.5 Hak Akses (Session)
- `session("D1a")` — hak akses untuk **membuat** SP Naik (tombol Tambah muncul)
- `session("D1b")` — hak akses untuk **edit** SP Naik
- `session("D1c")` — hak akses untuk **hapus/non-aktifkan** SP Naik

### 8.6 Flag Barcode Scanner
Kolom `GLB_M_Agen.Agen_barcodeScannerPrinterReady` mengontrol apakah tombol tambahan (seperti "TAMBAH SP HANYA BDB") muncul di halaman daftar SP. Jika cabang belum siap, tombol tersebut disembunyikan.

---

## 9. Cetak SP Naik

| File | Keterangan |
|------|-----------|
| `opr_t_sp_terima_print.asp` | Cetak format standar (kertas biasa) |
| `opr_t_sp_terima_print_ZEB.asp` | Cetak format Zebra (label printer barcode) |
| `opr_t_sp_terima_printgrid.asp` | Cetak daftar/grid SP (laporan multiple SP) |
| `opr_t_sp_terima_printbtt.asp` | Cetak daftar BTT dalam satu SP |

---

## 10. Kaitannya dengan Proses Lain

```
   [Penerimaan BTT]        [Proses Loading]
   MKT_T_eConote     →     OPR_T_LoadingH/D
         │                        │
         │            ┌───────────┘
         │            │
         ▼            ▼
   ┌────────────────────────┐
   │     SP NAIK            │   ← dokumen ini
   │  OPR_T_eSP_Terima      │
   │  OPR_T_eSP_TerimaDetil │
   └────────────┬───────────┘
                │
                │  (barang tiba di cabang tujuan)
                ▼
   ┌────────────────────────┐
   │     SP TURUN           │
   │  OPR_T_eSP_Turun       │
   └────────────────────────┘
                │
                │  (penerimaan oleh penerima)
                ▼
   ┌────────────────────────┐
   │     OPR_T_eAmbil       │
   │  (Penyerahan ke kurir) │
   └────────────────────────┘
```

Siklus pengiriman barang: **BTT dibuat → Loading → SP Naik → pengiriman → SP Turun → penyerahan ke penerima**.
