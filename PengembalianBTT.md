# Pengembalian BTT

## 1. Fungsi

**Pengembalian BTT** adalah dokumen operasional yang merekam proses pengembalian barang (BTT/Resi) yang **tidak berhasil diantarkan** ke penerima akhir. Barang yang gagal diantar oleh loper dikembalikan ke cabang/agen asal atau ke lokasi yang ditentukan, dan proses pengembalian ini wajib dicatat dalam sistem.

Pengembalian BTT mencatat:
- Tanggal pengembalian barang
- Cabang/agen tujuan pengembalian (kemana barang dikembalikan)
- Daftar nomor BTT yang dikembalikan
- Nomor BDB (Bukti Debit Barang) yang terkait — diisi setelah dokumen keuangan dibuat
- Status aktif/non-aktif dokumen pengembalian

Pengembalian BTT adalah langkah yang harus dilakukan ketika proses loper tidak berhasil. Tanpa dokumen ini, barang yang gagal diantar tidak tercatat statusnya di sistem dan tidak bisa diproses lebih lanjut (termasuk pembuatan BDB).

---

## 2. Istilah Penting

| Istilah | Keterangan |
|---------|-----------|
| **BTT** | Bukti Terima Titipan — dokumen resi pengiriman barang |
| **Pengembalian BTT** | Dokumen yang mencatat barang gagal diantar dan dikembalikan ke cabang |
| **BDB** | Bukti Debit Barang — dokumen keuangan yang dibuat setelah pengembalian BTT selesai dicatat |
| **KB** | Kode awalan untuk tabel/kolom Kembalian BTT (`KB_eID`, `KB_Tanggal`, dst.) |
| **Loper** | Proses pengantaran barang ke penerima akhir (lihat SuratLoper.md) |
| **Cabang Tujuan Kembali** | Cabang/agen kemana barang dikembalikan (disimpan di `KB_TujuanAgenID`) |

---

## 3. Tabel Database yang Terlibat

### 3.1 Tabel Utama Pengembalian BTT

#### `OPR_T_eKembaliBTT` — Header Pengembalian BTT
Tabel induk yang menyimpan satu baris per dokumen pengembalian.

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `KB_eID` | varchar | **Primary Key** — Nomor Pengembalian BTT |
| `KB_Tanggal` | datetime | Tanggal pengembalian barang |
| `KB_TujuanAgenID` | int | ID cabang/agen tujuan pengembalian (foreign key ke `GLB_M_Agen`) |
| `KB_AgenID` | int | ID cabang yang membuat dokumen pengembalian (diambil dari `session("server-id")`) |
| `KB_UpdateID` | varchar | Username yang membuat/mengubah dokumen |
| `KB_AktifYN` | varchar(1) | `Y` = aktif, `N` = non-aktif/dibatalkan |
| `KB_BDBID` | varchar | Nomor BDB terkait — kosong/NULL jika BDB belum dibuat |

#### `OPR_T_eKembaliBTTDetil` — Detil BTT per Pengembalian
Tabel detil, satu baris per BTT yang dikembalikan dalam satu dokumen pengembalian.

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `KBD_KBeID` | varchar | Foreign Key ke `OPR_T_eKembaliBTT.KB_eID` |
| `KBD_BTTID` | varchar | Nomor BTT/Resi yang dikembalikan |

### 3.2 Tabel Pendukung

| Tabel | Keterangan |
|-------|-----------|
| `GLB_M_Agen` | Master cabang/agen — dipakai untuk nama cabang tujuan pengembalian dan flag `Agen_barcodeScannerPrinterReady` |
| `MKT_T_eConote` | Data BTT/Resi (digunakan di halaman form tambah/edit) |

---

## 4. Query Utama Halaman Daftar

```sql
SELECT
    OPR_T_eKembaliBTT.KB_eID,
    ISNULL(OPR_T_eKembaliBTT.KB_BDBID, '') AS KB_BDBID,
    OPR_T_eKembaliBTT.KB_Tanggal,
    OPR_T_eKembaliBTT.KB_TujuanAgenID,
    GLB_M_Agen.Agen_Nama,
    OPR_T_eKembaliBTT.KB_UpdateID,
    OPR_T_eKembaliBTT.KB_AktifYN,
    CASE WHEN OPR_T_eKembaliBTT.KB_AktifYN = 'Y' THEN 'Ya' ELSE 'Tidak' END AS aktifjd
FROM OPR_T_eKembaliBTT
LEFT OUTER JOIN GLB_M_Agen
    ON OPR_T_eKembaliBTT.KB_TujuanAgenID = GLB_M_Agen.Agen_ID
LEFT OUTER JOIN OPR_T_eKembaliBTTDetil
    ON OPR_T_eKembaliBTT.KB_eID = OPR_T_eKembaliBTTDetil.KBD_KBeID
WHERE OPR_T_eKembaliBTT.KB_AgenID = [session("server-id")]
[+ filter aktif]
GROUP BY KB_eID, KB_BDBID, KB_Tanggal, KB_TujuanAgenID, Agen_Nama, KB_UpdateID, KB_AktifYN
ORDER BY KB_Tanggal, KB_eID
```

`GROUP BY` dipakai karena JOIN ke `OPR_T_eKembaliBTTDetil` berpotensi menghasilkan banyak baris per header pengembalian (satu header = banyak BTT).

`ISNULL(KB_BDBID, '')` memastikan kolom BDB tampil kosong (bukan NULL) jika BDB belum dibuat.

Data yang tampil per baris tabel: No. Pengembalian | Tanggal | Cabang/Agen Tujuan | Pembuat | No. BDB | Status Aktif

---

## 5. Filter Pencarian

Semua filter bersifat opsional dan diaktifkan dengan checkbox. Filter dikirim via POST (form submit) atau QueryString (paging).

| Parameter | Nama Field | Keterangan |
|-----------|-----------|-----------|
| `chktanggal` | Tanggal s/d | Filter rentang tanggal pengembalian |
| `chknokembali` | No. Pengembalian | Filter berdasarkan nomor pengembalian (LIKE) |
| `chkagen` | Agen/Cabang | Filter nama cabang tujuan pengembalian (exact match, via dropdown semua agen aktif) |
| `chknobtt` | No. BTT | Filter nomor BTT yang ada dalam pengembalian (LIKE via `OPR_T_eKembaliBTTDetil`) |

**Default tanggal saat pertama buka (angka=1):** hanya **hari ini** (`stra = stra = bl/hr/th`), bukan rentang bulan. Berbeda dari Loper dan SP Naik yang default-nya rentang bulan berjalan.

---

## 6. Halaman ASP yang Terlibat

| File | Fungsi |
|------|--------|
| `opr_t_kembalibtt.asp` | Halaman daftar/view semua Pengembalian BTT (dengan filter dan paging) |
| `opr_t_kembalibtt_scan_a.asp` | Form tambah Pengembalian BTT dengan scan barcode |
| `opr_t_kembalibtt_a.asp` | Form tambah Pengembalian BTT (metode manual — saat ini dinonaktifkan/dikomentari) |
| `opr_t_kembalibtt_scan_e.asp` | Halaman edit Pengembalian BTT (tambah/hapus BTT) |
| `opr_t_kembalibtt_print.asp` | Cetak dokumen Pengembalian BTT |
| `ExportXLS-opr_t_kembalibtt_print.asp` | Export Pengembalian BTT ke format Excel (.xls) |
| `p-opr_t_kembalibtt_h.asp` | Hapus/non-aktifkan Pengembalian BTT |
| `get-info-btt-belum-kembali.asp` | Monitoring: daftar BTT yang sudah diterima tapi belum dibuatkan Pengembalian BTT |
| `opr_t_kembalibtt_chk_monitor.asp` | Monitoring: daftar Pengembalian BTT yang sudah dibuat tapi belum dibuatkan BDB |

---

## 7. Alur Proses Pengembalian BTT

```
┌──────────────────────────────────────────────────────────┐
│             opr_t_kembalibtt.asp                          │
│         (Halaman Daftar Pengembalian BTT)                 │
└──────────────────┬───────────────────────────────────────┘
                   │ klik [TAMBAH (SCAN BARCODE)]
                   │ (hanya muncul jika hak akses D6a aktif
                   │  DAN flagBarcodeScanner ≠ 'Y')
                   ▼
┌──────────────────────────────────────────────────────────┐
│           opr_t_kembalibtt_scan_a.asp                     │
│  Form isian:                                              │
│  - Tanggal pengembalian                                   │
│  - Cabang/Agen tujuan pengembalian                       │
│  - Scan barcode BTT yang dikembalikan satu per satu      │
│  - Setiap scan → BTT masuk ke daftar pengembalian        │
└──────────────────┬───────────────────────────────────────┘
                   │ simpan
                   ▼
┌──────────────────────────────────────────────────────────┐
│           opr_t_kembalibtt_scan_e.asp                     │
│  Halaman edit Pengembalian BTT:                           │
│  - Tambah/hapus BTT dari daftar                          │
│  - Konfirmasi data pengembalian                          │
└──────────────────┬───────────────────────────────────────┘
                   │ selesai
                   ▼
┌──────────────────────────────────────────────────────────┐
│           opr_t_kembalibtt_print.asp                      │
│           (Cetak Pengembalian BTT)                        │
└──────────────────────────────────────────────────────────┘
```

---

## 8. Alur Lengkap: Dari Pengembalian BTT ke BDB

```
  [LOPER gagal diantar]
  OPR_T_eLoper / OPR_T_eLoperDetail
           │
           │ barang tidak bisa diserahkan ke penerima
           ▼
┌──────────────────────────────┐
│    PENGEMBALIAN BTT           │   ← dokumen ini
│  OPR_T_eKembaliBTT           │
│  OPR_T_eKembaliBTTDetil      │
│                              │
│  KB_BDBID = NULL/kosong      │  ← belum ada BDB
└──────────────┬───────────────┘
               │
               │ (proses pembuatan BDB oleh petugas keuangan)
               ▼
┌──────────────────────────────┐
│    BDB (Bukti Debit Barang)  │
│  KB_BDBID terisi             │  ← pengembalian sudah ber-BDB
└──────────────────────────────┘
```

---

## 9. Monitoring dan Kontrol

### 9.1 BTT Terima Belum Dibuat Pengembalian

Tombol **[BTT TERIMA BELUM DIBUAT PENGEMBALIAN BTT]** membuka `get-info-btt-belum-kembali.asp`. Halaman ini menampilkan daftar BTT yang sudah diterima di cabang ini (dari SP Turun) tetapi belum ada dokumen pengembalian-nya. Berguna untuk memastikan tidak ada barang retur yang tercecer tanpa dokumen.

### 9.2 Pengembalian BTT Belum Dibuat BDB

Tombol **[PENGEMBALIAN BTT BELUM DIBUAT BDB]** membuka `opr_t_kembalibtt_chk_monitor.asp`. Halaman ini menampilkan daftar dokumen Pengembalian BTT dengan `KB_BDBID` masih kosong — artinya pengembalian sudah dicatat tapi proses keuangan (BDB) belum selesai. Berguna untuk monitoring piutang retur.

---

## 10. Aturan Bisnis Penting

### 10.1 Hak Akses (Session)
- `session("D6a")` — hak akses untuk **membuat** Pengembalian BTT (tombol Tambah muncul)
- `session("D6b")` — hak akses untuk **edit** Pengembalian BTT
- `session("D6c")` — hak akses untuk **hapus/non-aktifkan** Pengembalian BTT

### 10.2 Flag Barcode Scanner
Kolom `GLB_M_Agen.Agen_barcodeScannerPrinterReady` mengontrol tombol tambah:

| Nilai | Tombol Tambah |
|-------|--------------|
| `≠ 'Y'` | Tombol **[TAMBAH (SCAN BARCODE)]** muncul |
| `= 'Y'` | Tombol tambah **tidak muncul** |

### 10.3 Status BDB
- `KB_BDBID` kosong/NULL → pengembalian belum diproses ke BDB (masih outstanding)
- `KB_BDBID` terisi → pengembalian sudah dibuatkan BDB, proses keuangan selesai

### 10.4 Filter Agen
Data yang tampil hanya milik cabang yang sedang login (`KB_AgenID = session("server-id")`). `KB_TujuanAgenID` adalah cabang **tujuan** pengembalian (kemana barang dikembalikan), bukan cabang pembuat.

### 10.5 Default Tanggal Hari Ini
Berbeda dari modul lain (Loper, SP Naik) yang default rentang bulan, Pengembalian BTT default menampilkan **hanya data hari ini**. Ini karena pengembalian biasanya diproses dan dicek pada hari yang sama dengan kejadian.

### 10.6 Status Aktif
- `KB_AktifYN = 'Y'` → Pengembalian aktif dan valid
- `KB_AktifYN = 'N'` → Pengembalian dibatalkan/dihapus via `p-opr_t_kembalibtt_h.asp`

### 10.7 Metode Tambah Manual (Dinonaktifkan)
Kode berisi tombol `TAMBAH` (tanpa scan) yang mengarah ke `opr_t_kembalibtt_a.asp` — saat ini **dikomentari** dan tidak aktif. Hanya metode scan barcode (`opr_t_kembalibtt_scan_a.asp`) yang tersedia.

---

## 11. Aksi per Record Pengembalian (Modal Popup)

Klik nomor pengembalian di tabel → modal popup muncul dengan pilihan:

| Aksi | Halaman | Hak Akses |
|------|---------|-----------|
| **Print** | `opr_t_kembalibtt_print.asp?b=[ID]` | Semua yang bisa login |
| **Export XLS** | `ExportXLS-opr_t_kembalibtt_print.asp?b=[ID]` | Semua yang bisa login |
| **Edit** | `opr_t_kembalibtt_scan_e.asp?b=[ID]` | `session("D6b")` |
| **Hapus** | `p-opr_t_kembalibtt_h.asp?b=[ID]` | `session("D6c")` |

---

## 12. Kaitannya dengan Proses Lain

```
  [Penerimaan BTT]
  MKT_T_eConote
        │
        │ (pengiriman antar cabang)
        ▼
  [SP Naik → SP Turun]
  OPR_T_eSP_Terima / OPR_T_eSP_Turun
        │
        │ (pengantaran ke penerima)
        ▼
  ┌──────────────────────┐
  │    LOPER BARANG       │
  │  OPR_T_eLoper         │
  └──────────┬───────────┘
             │
      ┌──────┴──────┐
      │             │
  [BERHASIL]   [GAGAL diantar]
      │             │
      ▼             ▼
  OPR_T_eAmbil  ┌──────────────────────┐
  (penyerahan   │   PENGEMBALIAN BTT    │  ← dokumen ini
   ke penerima) │ OPR_T_eKembaliBTT    │
                │ OPR_T_eKembaliBTTDetil│
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │  BDB                  │
                │  (Bukti Debit Barang) │
                │  KB_BDBID terisi      │
                └──────────────────────┘
```

Siklus pengembalian: **Loper gagal diantar → Pengembalian BTT dicatat → BDB dibuat → proses keuangan selesai**.
