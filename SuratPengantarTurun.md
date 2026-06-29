# Surat Pengantar Turun (SP Turun)

## 1. Fungsi

**Surat Pengantar Turun (SP Turun)** adalah dokumen operasional yang merekam **penerimaan barang** (BTT/Resi) di cabang tujuan. Disebut **SP Turun** karena barang "turun" dari kendaraan pengiriman dan diterima oleh cabang penerima.

SP Turun mencatat:
- Nomor SP Naik yang sedang diterima
- Tanggal penerimaan di cabang tujuan
- Daftar BTT yang diterima beserta jumlah koli yang diterima per BTT
- Keterangan/catatan jika ada kondisi khusus pada barang yang diterima

SP Turun adalah bukti formal bahwa barang telah tiba di cabang penerima. Tanpa SP Turun, status BTT di sistem pelacakan (eHistory) tidak akan terupdate menjadi "sudah diterima cabang tujuan".

SP Turun adalah kebalikan dari SP Naik — satu SP Naik diproses menjadi satu SP Turun di cabang penerima.

---

## 2. Istilah Penting

| Istilah | Keterangan |
|---------|-----------|
| **BTT** | Bukti Terima Titipan — dokumen resi pengiriman barang |
| **SP Naik** | Surat Pengantar Naik, dokumen pemberangkatan barang dari cabang asal |
| **SP Turun** | Surat Pengantar Turun, dokumen penerimaan barang di cabang tujuan — **dokumen ini** |
| **SP PAD** | SP Pengiriman Antar Daerah — surat pengantar antar perusahaan (DBS→DLB, DLB→DLI, dst.) |
| **Transit** | Barang singgah di cabang perantara sebelum ke tujuan akhir |
| **Langsung** | Barang langsung ke cabang tujuan tanpa singgah |
| **JML BERANGKAT** | Jumlah koli sesuai yang dicatat di SP Naik saat pemberangkatan |
| **JML DITERIMA** | Jumlah koli yang benar-benar diterima fisik di cabang tujuan (bisa < JML BERANGKAT jika ada selisih) |
| **eHistory** | Database pelacakan status kiriman (`eHistoryDB.dbo.MKT_T_eHistory`) |
| **PT** | Kode perusahaan: `A`=DBS, `B`=DLB, `C`=DLI/Logistik |

---

## 3. Tabel Database yang Terlibat

### 3.1 Tabel Utama SP Turun

#### `OPR_T_eSP_Turun` — Detil Penerimaan Barang
Tabel utama SP Turun. Setiap baris mewakili **satu BTT** yang diterima dalam satu SP.  
Berbeda dengan SP Naik yang memiliki header terpisah, SP Turun tidak memiliki tabel header tersendiri — identitas SP diambil langsung dari `OPR_T_eSP_Terima` (tabel header SP Naik).

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `SP_eID` | varchar | Nomor SP Naik yang sedang diterima (FK ke `OPR_T_eSP_Terima.SPT_eID`) |
| `SP_BTTID` | varchar | Nomor BTT/Resi yang diterima |
| `SP_AgenID` | int | ID cabang/agen penerima (cabang yang melakukan proses SP Turun) |
| `SP_Tanggal` | datetime | Tanggal penerimaan |
| `SP_HistID` | varchar | ID rekam di tabel eHistory (`eHistoryDB.dbo.MKT_T_eHistory`) |
| `SP_JmlTerima` | int | Jumlah koli yang diterima fisik |
| `SP_Keterangan` | varchar | Catatan/keterangan kondisi barang saat diterima |
| `SP_AktifYN` | varchar(1) | `Y` = aktif, `N` = non-aktif/dihapus |

### 3.2 Tabel Pendukung

| Tabel | Keterangan |
|-------|-----------|
| `OPR_T_eSP_Terima` | Header SP Naik: asal, tujuan, sopir, kendaraan, status transit |
| `OPR_T_eSP_TerimaDetil` | Detil BTT dalam SP Naik (JML BERANGKAT per BTT) |
| `OPR_T_eSP_PAD` | Header SP PAD (Pengiriman Antar Daerah) |
| `OPR_T_eSP_PADDetil` | Detil BTT dalam SP PAD |
| `MKT_T_eConote` | Data BTT/Resi lokal (tujuan, berat, COD, dll.) |
| `MKT_T_eBDB` | Data BDB (Bukti Dokumen Barang) — jenis kiriman khusus |
| `eHistoryDB.dbo.MKT_T_eHistory` | Tabel pelacakan status BTT (di DB eHistoryDB) |
| `eHistoryDB.dbo.vw_PoolBTT` | View gabungan data BTT dari semua DB (DBS/DLB/Logistik) |
| `GLB_M_Agen` | Master cabang/agen/counter |
| `OPR_T_eBBL` | Berita Acara Barang Lebih — dipakai untuk cek apakah BTT sudah diproses BBL |

### 3.3 Stored Procedure

| Nama | Keterangan |
|------|-----------|
| `dbs.dbo.sp_AddOPR_T_eSP_Turun_eHistory` | Insert SP Turun sekaligus insert history ke `eHistoryDB.MKT_T_eHistory`. Menangani update flag GPS secara internal. |
| `sp_AddMKT_T_eHistory` | Tambah rekam status kiriman di eHistory (dipakai di `p-opr_t_sp_turun_e.asp` saat simpan) |

---

## 4. Sumber SP yang Bisa Diproses

SP Turun mendukung dua sumber SP yang masuk ke cabang penerima:

### 4.1 SP Naik Reguler
SP yang dibuat oleh cabang asal melalui proses SP Naik biasa (`OPR_T_eSP_Terima`).  
Nomor SP format: `S[PT][Cabang][BulanTahun][Urutan]`  
Contoh: `SDBS0010620260001`

Karakter ke-2 menentukan database asal:
- `A` → database `dbs`
- `B` → database `dlb`
- `C` → database `logistik`

### 4.2 SP PAD (Pengiriman Antar Daerah)
SP yang dibuat untuk pengiriman antar perusahaan berbeda (`OPR_T_eSP_PAD`).  
Nomor SP PAD format: `P[PT][...]`

**Aturan penting SP PAD:** SP PAD **tidak bisa** diproses di perusahaan yang sama dengan pembuat SP PAD. Jika digit ke-2 SP PAD sama dengan PT user yang login, sistem akan menolak dengan pesan error.

---

## 5. Halaman ASP yang Terlibat

| File | Fungsi |
|------|--------|
| `opr_t_sp_turun.asp` | Halaman daftar/view semua SP Turun (dengan filter tanggal, cabang asal, transit, no. SP, no. BTT) |
| `opr_t_sp_turun_a.asp` | Form input nomor SP Naik yang akan diproses menjadi SP Turun |
| `p-opr_t_sp_turun_a.asp` | Proses validasi nomor SP → insert ke `OPR_T_eSP_Turun` → redirect ke `_e.asp` |
| `opr_t_sp_turun_e.asp` | Halaman edit/konfirmasi SP Turun — tampil detil BTT, input JML DITERIMA dan keterangan per BTT |
| `p-opr_t_sp_turun_e.asp` | Proses simpan JML DITERIMA (insert history ke eHistoryDB) |
| `p-opr_t_sp_turun_h.asp` | Hapus/non-aktifkan SP Turun (hanya jika BTT belum diproses lanjut) |
| `get-DetailSP.asp` | AJAX — tampil preview daftar BTT dalam SP yang diinput (dipanggil otomatis setelah 15 karakter) |
| `get-ajx-SP_Turun-jml.asp` | AJAX — update `SP_JmlTerima` langsung per BTT saat operator mengetik di kolom JML DITERIMA |
| `get-ajx-SP_Turun-ket.asp` | AJAX — update `SP_Keterangan` langsung per BTT saat operator mengetik keterangan |
| `opr_t_sp_turun_m.asp` | Form alternatif SP Turun tanpa Surat Tugas (tersedia tapi dikomentari di menu utama) |

---

## 6. Flow SP Turun

```
┌─────────────────────────────────────────────────────────────────┐
│                   opr_t_sp_turun.asp                            │
│              (Daftar SP Turun — halaman utama)                  │
└───────────────────────┬─────────────────────────────────────────┘
                        │ klik tombol [TAMBAH]
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                  opr_t_sp_turun_a.asp                           │
│  Form input:                                                     │
│  - Tanggal SP Turun (default: hari ini, readonly)               │
│  - Nomor SP Naik (ketik manual atau scan barcode)               │
│  - Nomor SP PAD dari DLB atau DLI (opsional, antar perusahaan) │
│                                                                  │
│  Saat nomor SP mencapai 15 karakter:                            │
│  → AJAX panggil get-DetailSP.asp                                │
│  → Preview daftar BTT dalam SP muncul di bawah                  │
│                                                                  │
│  Validasi sisi klien (SP PAD):                                  │
│  ✗ SP PAD PT sama dengan PT user → tampil warning merah        │
└───────────────────────┬─────────────────────────────────────────┘
                        │ klik [Proses]
                        │ POST ke:
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                 p-opr_t_sp_turun_a.asp                          │
│  Proses per BTT:                                                 │
│  1. Tentukan database asal dari digit ke-2 nomor SP             │
│     (A=dbs, B=dlb, C=logistik)                                  │
│  2. Validasi: nomor SP ada di database yang sesuai              │
│  3. Ambil daftar BTT dari SP Naik / SP PAD                     │
│  4. Per BTT yang belum ada di OPR_T_eSP_Turun:                 │
│     a. Cek BTT tidak ada di OPR_T_eBBL (BBL_TerimaYN='Y')     │
│     b. EXEC sp_AddOPR_T_eSP_Turun_eHistory                     │
│        → Insert ke OPR_T_eSP_Turun                             │
│        → Insert ke eHistoryDB.MKT_T_eHistory                   │
│           (statsp=2 jika Transit, statsp=6 jika Langsung)      │
└───────────────────────┬─────────────────────────────────────────┘
                        │ redirect ke:
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                  opr_t_sp_turun_e.asp                           │
│  Halaman konfirmasi & edit JML DITERIMA:                        │
│  - Tampil header dari SP Naik: cabang asal, tujuan, sopir,      │
│    kendaraan, surat tugas, status transit, tanggal berangkat    │
│  - Tabel detil BTT:                                             │
│    • Nomor BTT                                                   │
│    • Tanggal BTT                                                 │
│    • Nama pengirim / pelanggan                                   │
│    • Nama penerima (tujuan BTT)                                  │
│    • JML ASLI (dari data BTT asli)                              │
│    • JML BERANGKAT (dari SP Naik, SPTD_Jml)                    │
│    • JML DITERIMA (input, via AJAX ke get-ajx-SP_Turun-jml.asp)│
│    • KETERANGAN (input, via AJAX ke get-ajx-SP_Turun-ket.asp)  │
│                                                                  │
│  Update JML DITERIMA & KETERANGAN disimpan langsung (real-time) │
│  melalui AJAX tanpa perlu klik tombol Simpan terlebih dahulu   │
└───────────────────────┬─────────────────────────────────────────┘
                        │ klik [Simpan]
                        │ POST ke:
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                 p-opr_t_sp_turun_e.asp                          │
│  Finalisasi:                                                     │
│  - Cek apakah history sudah ada di eHistoryDB                  │
│  - Jika belum → EXEC sp_AddMKT_T_eHistory (status=6)           │
│  - Redirect kembali ke opr_t_sp_turun_e.asp                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Diagram Lengkap Alur SP Turun

```
              ┌──────────────────────────────────────┐
              │         opr_t_sp_turun.asp            │
              │    (Halaman Daftar SP Turun)          │
              └──────────────┬───────────────────────┘
                             │ klik [TAMBAH]
                             ▼
              ┌──────────────────────────────────────┐
              │       opr_t_sp_turun_a.asp            │
              │  Input Nomor SP Naik atau SP PAD     │
              │                                       │
              │  [saat 15 karakter diinput]          │
              │   ┌────────────────────────┐         │
              │   │   get-DetailSP.asp     │         │
              │   │   (AJAX preview BTT)   │         │
              │   └────────────────────────┘         │
              └──────────────┬───────────────────────┘
                             │ klik [Proses]
                             ▼
              ┌──────────────────────────────────────┐
              │      p-opr_t_sp_turun_a.asp           │
              │  Tentukan DB asal (A/B/C dari sp[1]) │
              │  Ambil BTT dari SP Naik / SP PAD     │
              │  Per BTT:                             │
              │  ✓ Belum ada di OPR_T_eSP_Turun     │
              │  ✓ Belum di OPR_T_eBBL (terimaYN=Y) │
              │  → EXEC sp_AddOPR_T_eSP_Turun        │
              │            _eHistory                  │
              │     ┌─────────────────────────┐      │
              │     │  OPR_T_eSP_Turun        │      │
              │     │  + eHistoryDB           │      │
              │     │    .MKT_T_eHistory      │      │
              │     └─────────────────────────┘      │
              └──────────────┬───────────────────────┘
                             │ redirect
                             ▼
              ┌──────────────────────────────────────┐
              │       opr_t_sp_turun_e.asp            │
              │  Tampil detil SP Turun               │
              │  Input JML DITERIMA per BTT          │
              │  Input KETERANGAN per BTT            │
              │                                       │
              │  ┌────────────────────────────┐      │
              │  │  get-ajx-SP_Turun-jml.asp  │      │
              │  │  (AJAX update JML DITERIMA)│      │
              │  └────────────────────────────┘      │
              │  ┌────────────────────────────┐      │
              │  │  get-ajx-SP_Turun-ket.asp  │      │
              │  │  (AJAX update keterangan)  │      │
              │  └────────────────────────────┘      │
              └──────────────┬───────────────────────┘
                             │ klik [Simpan]
                             ▼
              ┌──────────────────────────────────────┐
              │      p-opr_t_sp_turun_e.asp           │
              │  Insert history eHistoryDB jika perlu│
              │  Redirect ke _e.asp                  │
              └──────────────────────────────────────┘
```

---

## 8. Aturan Bisnis Penting

### 8.1 Multi-Database: Identifikasi PT dari Nomor SP
Karakter ke-2 dari nomor SP menentukan di database mana data SP Naik tersimpan:

| Karakter ke-2 | Database | Perusahaan |
|---------------|----------|-----------|
| `A` | `dbs` | DBS |
| `B` | `dlb` | DLB |
| `C` | `logistik` | DLI |

Query validasi dan pengambilan BTT akan menggunakan database yang sesuai secara dinamis.

### 8.2 SP PAD — Larangan Proses PT Sama
SP PAD (Pengiriman Antar Daerah) adalah SP yang diterbitkan dari perusahaan lain. Sistem memiliki dua lapisan validasi:
1. **Sisi klien** (`opr_t_sp_turun_a.asp`): saat mengetik nomor SP PAD, JavaScript langsung menampilkan warning jika PT sama
2. **Sisi server** (`p-opr_t_sp_turun_a.asp`): jika PT sama, proses dihentikan dan menampilkan pesan error lengkap

Alasan: SP PAD yang PT-nya sama berarti ada kesalahan di dokumen pemberangkatan (SP Naik seharusnya reguler, bukan PAD).

### 8.3 Cek BBL Sebelum Insert
Sebelum setiap BTT dimasukkan ke SP Turun, sistem mengecek tabel `OPR_T_eBBL`:
```sql
SELECT BBL_eID FROM OPR_T_eBBL 
WHERE BBL_BTTID = '...' AND BBL_AktifYN = 'Y' AND BBL_TerimaYN = 'Y'
```
Jika BTT sudah ada di BBL dengan `BBL_TerimaYN = 'Y'`, BTT tersebut **dilewati** (tidak diproses SP Turun).

### 8.4 Status History (statsp)
Saat insert ke `eHistoryDB.MKT_T_eHistory`, nilai status (`Hist_StatUrut`) berbeda tergantung tipe SP Naik:
- **Transit (`SPT_TransitYN = 'Y'`)** → `statsp = 2`
- **Langsung (`SPT_TransitYN = 'N'`)** → `statsp = 6`

Status ini digunakan oleh fitur pelacakan kiriman untuk menampilkan posisi barang.

### 8.5 JML DITERIMA — Kondisi Selisih
Kolom `SP_JmlTerima` boleh diisi angka **kurang dari** JML BERANGKAT (`SPTD_Jml`):
- JML DITERIMA tidak bisa **melebihi** JML BERANGKAT (validasi JavaScript di `opr_t_sp_turun_e.asp`)
- Jika JML DITERIMA = **0** → sistem pelacakan menampilkan BTT sebagai "belum diterima"
  - Cabang pengirim **wajib membuat SP Naik baru** untuk BTT tersebut

### 8.6 Hapus SP Turun
Proses hapus (`p-opr_t_sp_turun_h.asp`) dilakukan dengan **DELETE fisik** dari `OPR_T_eSP_Turun` (berbeda dengan SP Naik yang menggunakan soft delete). Syarat hapus:
- BTT di dalam SP Turun **belum masuk** ke proses lanjutan: Loper, SP Transit, SP PAD, atau Ambil Barang Sendiri
- Cek dilakukan dengan membandingkan jumlah di `eHistoryDB.dbo.MKT_T_eHistory` vs jumlah yang `SP_JmlTerima > 0`

Jika ada BTT yang sudah diproses lanjut, seluruh SP Turun **tidak dapat dihapus**.

### 8.7 Update AJAX Real-Time
Halaman `opr_t_sp_turun_e.asp` menggunakan AJAX untuk menyimpan perubahan **langsung** saat operator mengetik, tanpa menunggu tombol Simpan:
- `get-ajx-SP_Turun-jml.asp` — dipanggil saat nilai input JML DITERIMA berubah (`onkeyup`)
- `get-ajx-SP_Turun-ket.asp` — dipanggil saat nilai input keterangan berubah (`onkeyup`)

Tombol **Simpan** pada halaman ini hanya memfinalisasi proses history di eHistoryDB.

### 8.8 Hak Akses (Session)
| Session | Fungsi |
|---------|--------|
| `session("D2a")` | Hak akses **tambah** SP Turun (tombol TAMBAH muncul) |
| `session("D2b")` | Hak akses **edit** SP Turun (ikon edit muncul di modal) |
| `session("D2c")` | Hak akses **hapus** SP Turun (ikon hapus muncul di modal) |

### 8.9 Filter di Halaman Daftar
Halaman `opr_t_sp_turun.asp` mendukung filter kombinasi:
- **Tanggal** (rentang `SP_Tanggal`)
- **Cabang Asal** (nama agen asal dari SP Naik di semua DB)
- **Status Transit** (Ya/Tidak)
- **No. SP** (pencarian parsial `LIKE`)
- **No. BTT** (pencarian parsial `LIKE`)

Query menggunakan `CASE WHEN SUBSTRING(SP_eID, 2, 1)` untuk join data asal/tujuan secara dinamis ke tiga database (DBS, DLB, Logistik).

---

## 9. Kaitannya dengan Proses Lain

```
   [Pembuatan BTT]          [Loading]
   MKT_T_eConote     →   OPR_T_LoadingH/D
         │                      │
         └──────────────────────┘
                  │
                  ▼
   ┌──────────────────────────┐
   │       SP NAIK            │
   │  OPR_T_eSP_Terima        │
   │  OPR_T_eSP_TerimaDetil   │
   └────────────┬─────────────┘
                │  (barang dikirim, tiba di cabang penerima)
                ▼
   ┌──────────────────────────┐
   │       SP TURUN           │   ← dokumen ini
   │  OPR_T_eSP_Turun         │
   │  + eHistoryDB            │
   │    .MKT_T_eHistory       │
   └────────────┬─────────────┘
                │
        ┌───────┴──────────┐
        │                  │
        ▼                  ▼
   ┌──────────────┐   ┌──────────────────┐
   │ OPR_T_eAmbil │   │ OPR_T_eLoper     │
   │ (Ambil       │   │ (Antar ke        │
   │  sendiri)    │   │  penerima)       │
   └──────────────┘   └──────────────────┘
```

**Siklus pengiriman barang:**  
BTT dibuat → Loading → SP Naik → pengiriman → **SP Turun** → penyerahan ke penerima (Loper / Ambil Sendiri).

SP Turun adalah titik transisi di mana tanggung jawab barang beralih dari cabang pengirim ke cabang penerima. Setelah SP Turun dibuat, cabang penerima bertanggung jawab atas proses penyerahan barang ke penerima akhir.
