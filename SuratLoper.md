# Loper Barang

## 1. Fungsi

**Loper Barang** adalah dokumen operasional yang merekam pengiriman barang (BTT/Resi) dari cabang/agen/counter ke **penerima akhir** di wilayah setempat. Biasanya disebut **Loper** oleh pengguna karena barang "diloperkan" (diantarkan) oleh kurir lokal ke alamat penerima.

Loper Barang mencatat:
- Tanggal pengiriman ke penerima
- Kendaraan, sopir, dan kerani yang bertugas
- Daftar semua nomor BTT/Resi yang dikirimkan
- Total nilai COD (Cash on Delivery) yang harus ditagih
- Status aktif/non-aktif loper

Loper Barang adalah dokumen yang menandai tahap **last-mile delivery** — barang sudah tiba di cabang tujuan dan siap diantarkan ke penerima akhir. Tanpa Loper, proses pengantaran ke penerima tidak tercatat di sistem.

---

## 2. Istilah Penting

| Istilah | Keterangan |
|---------|-----------|
| **BTT** | Bukti Terima Titipan — dokumen resi pengiriman barang |
| **Loper** | Dokumen pengantaran barang ke penerima akhir (last-mile delivery) |
| **Loading** | Proses memuat barang ke kendaraan menggunakan barcode scanner |
| **Sopir** | Pengemudi kendaraan pengiriman |
| **Kerani** | Petugas pendamping sopir yang membantu proses pengantaran dan penagihan COD |
| **COD** | Cash on Delivery — pembayaran tunai oleh penerima saat barang diterima |
| **Carter** | Pengiriman dengan kendaraan sewaan / loper langsung tanpa proses loading terlebih dahulu |
| **SP Turun** | Dokumen penerimaan barang di cabang tujuan (proses sebelum Loper) |

---

## 3. Tabel Database yang Terlibat

### 3.1 Tabel Utama Loper

#### `OPR_T_eLoper` — Header Loper
Tabel induk yang menyimpan satu baris per Loper.

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `Loper_eID` | varchar | **Primary Key** — Nomor Loper |
| `Loper_Tanggal` | datetime | Tanggal pengiriman ke penerima |
| `Loper_NoMobil` | varchar | Nomor polisi kendaraan pengantar |
| `Loper_NIPSopir` | varchar | NIP sopir (foreign key ke `HRD_M_Karyawan`) |
| `Loper_NIPKerani` | varchar | NIP kerani (foreign key ke `HRD_M_Karyawan`) |
| `Loper_KeraniYN` | varchar(1) | `Y` = ada kerani, `N` = tanpa kerani |
| `Loper_UpdateID` | varchar | Username yang membuat/mengubah loper |
| `Loper_AktifYN` | varchar(1) | `Y` = aktif, `N` = non-aktif/dibatalkan |
| `Loper_AgenID` | varchar | ID cabang/agen yang membuat loper |

#### `OPR_T_eLoperDetail` — Detil BTT per Loper
Tabel detil, satu baris per BTT yang terdaftar dalam Loper.

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `LoperD_eLoperID` | varchar | Foreign Key ke `OPR_T_eLoper.Loper_eID` |
| `LoperD_BTTID` | varchar | Nomor BTT/Resi yang diantarkan |

### 3.2 Tabel Pendukung

| Tabel | Keterangan |
|-------|-----------|
| `MKT_T_eConote` | Data BTT/Resi: tujuan, berat, COD (`BTTT_TagihTujuan`), jenis layanan, dll. |
| `HRD_M_Karyawan` | Data karyawan — dipakai dua kali: satu alias untuk sopir, satu alias untuk kerani |
| `GLB_M_Agen` | Master cabang/agen/counter, termasuk flag `Agen_barcodeScannerPrinterReady` |
| `OPR_T_LoadingH` | Header proses loading barang (jika loper dibuat dari loading) |
| `OPR_T_LoadingD` | Detil BTT per loading |

---

## 4. Query Utama Halaman Daftar

Query dioptimalkan dimulai dari `OPR_T_eLoper` dengan `LEFT JOIN` ke tabel pendukung:

```sql
SELECT
    OPR_T_eLoper.Loper_eID,
    OPR_T_eLoper.Loper_Tanggal,
    OPR_T_eLoper.Loper_NoMobil,
    OPR_T_eLoper.Loper_NIPSopir,
    OPR_T_eLoper.Loper_NIPKerani,
    OPR_T_eLoper.Loper_UpdateID,
    OPR_T_eLoper.Loper_AktifYN,
    HRD_M_Karyawan_1.Kry_Nama AS kerani,
    HRD_M_Karyawan_2.Kry_Nama AS sopir,
    OPR_T_eLoper.Loper_AgenID,
    SUM(MKT_T_eConote.BTTT_TagihTujuan) AS cod,
    COUNT(OPR_T_eLoperDetail.LoperD_BTTID) AS jbtt,
    CASE WHEN loper_aktifyn = 'Y' THEN 'Ya' ELSE 'Tidak' END AS aktifjd,
    OPR_T_eLoper.Loper_KeraniYN
FROM OPR_T_eLoper
LEFT JOIN OPR_T_eLoperDetail ON OPR_T_eLoper.Loper_eID = OPR_T_eLoperDetail.LoperD_eLoperID
LEFT JOIN MKT_T_eConote ON OPR_T_eLoperDetail.LoperD_BTTID = MKT_T_eConote.BTTT_ID
LEFT JOIN HRD_M_Karyawan AS HRD_M_Karyawan_1 ON OPR_T_eLoper.Loper_NIPKerani = HRD_M_Karyawan_1.Kry_NIP
LEFT JOIN HRD_M_Karyawan AS HRD_M_Karyawan_2 ON OPR_T_eLoper.Loper_NIPSopir = HRD_M_Karyawan_2.Kry_NIP
WHERE OPR_T_eLoper.Loper_AgenID = [session("server-id")]
GROUP BY ...
ORDER BY Loper_Tanggal, Loper_eID
```

Data yang tampil per baris tabel: No. Loper | Tanggal | No. Mobil | Sopir | Kerani | Pembuat | Jumlah BTT | Total COD | Status Aktif

---

## 5. Filter Pencarian

Semua filter bersifat opsional dan diaktifkan dengan checkbox. Filter dikirim via POST (form submit) atau QueryString (paging).

| Parameter | Nama Field | Keterangan |
|-----------|-----------|-----------|
| `chktanggal` | Tanggal s/d | Filter rentang tanggal loper |
| `chknoloper` | No. Loper | Filter berdasarkan nomor loper (LIKE) |
| `chkmobil` | No. Mobil | Filter nomor kendaraan (LIKE) |
| `chksopir` | Sopir | Filter nama sopir (LIKE) |
| `chkkerani` | Kerani | Filter nama kerani (exact match) |
| `chknobtt` | No. BTT | Filter nomor BTT yang ada dalam loper (exact match) |

Default tanggal saat pertama buka (angka=1): awal bulan berjalan sampai akhir bulan berjalan.

---

## 6. Halaman ASP yang Terlibat

| File | Fungsi |
|------|--------|
| `opr_t_loper.asp` | Halaman daftar/view semua Loper (dengan filter dan paging) |
| `opr_t_loper_a.asp` | Form tambah Loper dari proses Loading Barang |
| `opr_t_loper_a_BTT.asp` | Form tambah Loper dengan memilih BTT langsung |
| `opr_t_loper_a_carter.asp` | Form tambah Loper khusus Carter / Loper Langsung |
| `opr_t_loper_a_BTT_dlidlb.asp` | Form tambah Loper dengan memilih BTT dari cabang DLI/DLB |
| `opr_t_loper_e.asp` | Halaman edit Loper: tambah/hapus BTT, ubah data header |
| `opr_t_loper_print.asp` | Cetak Loper (format standar) |
| `opr_t_loper_lampiran.asp` | Cetak Hasil Loper (lampiran) |
| `opr_t_laporan_loper.asp` | Laporan Loper (cetak daftar) |
| `opr_t_loper_rekap.asp` | Rekap Loper per sopir/periode |
| `opr_t_loper_komisi_new_print.asp` | Cetak komisi loper per sopir |
| `p-opr_t_loper_h.asp` | Hapus/non-aktifkan Loper |
| `OPR_T_Laporan_Berhasil_Loper.asp` | Laporan BTT yang berhasil diantarkan (terloper) |
| `OPR_T_Laporan_Berhasil_Loper_sendiri.asp` | Laporan BTT yang berhasil diantarkan sendiri (PAD) |

---

## 7. Metode Pembuatan Loper

Ada **4 metode** untuk membuat Loper:

---

### 7.1 Metode A — Dari Loading Barang

Digunakan ketika barang sudah melalui proses loading dengan barcode scanner. BTT sudah terdaftar dalam nomor loading terlebih dahulu.

```
┌────────────────────────────────────────────────────────┐
│                  opr_t_loper.asp                        │
│            (Daftar Loper — halaman utama)               │
└──────────────────────┬─────────────────────────────────┘
                       │ klik [TAMBAH (LOADING BARANG)]
                       ▼
┌────────────────────────────────────────────────────────┐
│                 opr_t_loper_a.asp                       │
│  Input nomor loading barang                             │
│  Sistem validasi loading: sudah approve? belum diloper? │
└──────────────────────┬─────────────────────────────────┘
                       │ setelah validasi lulus
                       ▼
┌────────────────────────────────────────────────────────┐
│                 opr_t_loper_e.asp                       │
│  Halaman edit Loper:                                    │
│  - BTT dari loading otomatis terisi                     │
│  - Bisa tambah/hapus BTT                               │
│  - Isi data sopir, kerani, kendaraan                   │
└──────────────────────┬─────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────┐
│               opr_t_loper_print.asp                     │
│                  (Cetak Loper)                          │
└────────────────────────────────────────────────────────┘
```

---

### 7.2 Metode B — Pilih BTT Langsung

Digunakan ketika cabang **belum memiliki barcode scanner** (`Agen_barcodeScannerPrinterReady` ≠ `'Y'`). Operator memilih BTT satu per satu secara manual.

```
┌────────────────────────────────────────────────────────┐
│                  opr_t_loper.asp                        │
│            (Daftar Loper — halaman utama)               │
└──────────────────────┬─────────────────────────────────┘
                       │ klik [TAMBAH (PILIH BTT)]
                       ▼
┌────────────────────────────────────────────────────────┐
│               opr_t_loper_a_BTT.asp                     │
│  Form isian:                                            │
│  - Tanggal pengiriman                                   │
│  - Nama Sopir & Kerani                                  │
│  - Nomor Kendaraan                                      │
│  - Pilih BTT satu per satu (scan/ketik manual)         │
└──────────────────────┬─────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────┐
│               opr_t_loper_e.asp                         │
│  Halaman edit — tambah/hapus BTT, konfirmasi dan cetak  │
└──────────────────────┬─────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────┐
│               opr_t_loper_print.asp                     │
│                  (Cetak Loper)                          │
└────────────────────────────────────────────────────────┘
```

---

### 7.3 Metode C — Khusus Carter / Loper Langsung

Digunakan ketika cabang **sudah memiliki barcode scanner** (`Agen_barcodeScannerPrinterReady` = `'Y'`) atau untuk pengiriman carter/langsung tanpa loading. Tombol ini selalu muncul di samping metode lain.

```
┌────────────────────────────────────────────────────────┐
│                  opr_t_loper.asp                        │
└──────────────────────┬─────────────────────────────────┘
                       │ klik [TAMBAH (KHUSUS CARTER / LOPER LANGSUNG)]
                       ▼
┌────────────────────────────────────────────────────────┐
│             opr_t_loper_a_carter.asp                    │
│  Form untuk pengiriman carter atau loper langsung       │
│  (tanpa melalui proses loading barcode scanner)        │
└──────────────────────┬─────────────────────────────────┘
                       │
                       ▼
               (proses dan cetak)
```

---

### 7.4 Metode D — Pilih BTT DLI/DLB

Digunakan untuk meloperkan barang yang asalnya dari cabang DLI atau DLB (perusahaan afiliasi).

```
┌────────────────────────────────────────────────────────┐
│                  opr_t_loper.asp                        │
└──────────────────────┬─────────────────────────────────┘
                       │ klik [TAMBAH (PILIH BTT DLI/DLB)]
                       ▼
┌────────────────────────────────────────────────────────┐
│            opr_t_loper_a_BTT_dlidlb.asp                │
│  Form pemilihan BTT khusus dari cabang DLI/DLB         │
└──────────────────────┬─────────────────────────────────┘
                       │
                       ▼
               (proses dan cetak)
```

---

## 8. Diagram Lengkap Alur Loper

```
              ┌──────────────────────────────────────┐
              │        opr_t_loper.asp                │
              │    (Halaman Daftar Loper)              │
              └────┬──────────┬──────────┬───────────┘
                   │          │          │          │
        [LOADING]  │  [PILIH  │  [CARTER]│  [DLI/DLB]
                   │   BTT]   │          │
                   ▼          ▼          ▼          ▼
           ┌──────────┐ ┌─────────┐ ┌────────┐ ┌────────────┐
           │ _a.asp   │ │_a_BTT   │ │_a_     │ │_a_BTT_     │
           │(Loading) │ │.asp     │ │carter  │ │dlidlb.asp  │
           └────┬─────┘ └────┬────┘ │.asp    │ └─────┬──────┘
                │             │      └───┬────┘       │
                └─────────────┴──────────┴────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │       opr_t_loper_e.asp        │
                    │    (Halaman Edit Loper)         │
                    │  - Input/edit data loper        │
                    │  - Tambah/hapus BTT             │
                    │  - Konfirmasi pengantaran       │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │     opr_t_loper_print.asp      │
                    │         (Cetak Loper)          │
                    └───────────────────────────────┘
```

---

## 9. Aturan Bisnis Penting

### 9.1 Hak Akses (Session)
- `session("D3a")` — hak akses untuk **membuat** Loper (tombol Tambah muncul)
- `session("D3b")` — hak akses untuk **edit** Loper
- `session("D3c")` — hak akses untuk **hapus/non-aktifkan** Loper

### 9.2 Flag Barcode Scanner
Kolom `GLB_M_Agen.Agen_barcodeScannerPrinterReady` mengontrol tombol tambah yang muncul:

| Nilai | Tombol yang Muncul |
|-------|--------------------|
| `≠ 'Y'` (belum siap) | [TAMBAH (PILIH BTT)] + [TAMBAH (KHUSUS CARTER)] |
| `= 'Y'` (sudah siap) | [TAMBAH (KHUSUS CARTER / LOPER LANGSUNG)] saja |

Tombol **[TAMBAH (LOADING BARANG)]** dan **[TAMBAH (PILIH BTT DLI/DLB)]** selalu muncul selama hak akses D3a aktif.

### 9.3 Status Aktif Loper
- `Loper_AktifYN = 'Y'` → Loper aktif, barang masih dalam proses pengantaran
- `Loper_AktifYN = 'N'` → Loper non-aktif/dibatalkan (dihapus melalui `p-opr_t_loper_h.asp`)

### 9.4 Kerani Opsional
- `Loper_KeraniYN = 'Y'` → ada kerani pendamping, nama kerani tampil di tabel
- `Loper_KeraniYN = 'N'` → tanpa kerani, kolom kerani dikosongkan di tampilan

### 9.5 COD (Cash on Delivery)
Nilai COD dihitung dengan `SUM(MKT_T_eConote.BTTT_TagihTujuan)`. Nilai COD hanya ditampilkan jika > 0. Sopir/kerani bertanggung jawab mengumpulkan uang COD dari penerima dan menyetorkan ke cabang.

### 9.6 Paging
Halaman daftar menampilkan **15 record per halaman**. Navigasi paging (Prev/Next/Halaman) membawa seluruh parameter filter agar filter tetap aktif saat berpindah halaman.

### 9.7 Filter Agen
Data loper yang tampil hanya milik cabang/agen yang sedang login (`session("server-id")` dicocokan dengan `Loper_AgenID`). Satu cabang tidak bisa melihat loper cabang lain.

---

## 10. Aksi per Record Loper (Modal Popup)

Klik nomor loper di tabel → modal popup muncul dengan pilihan:

| Aksi | Halaman | Hak Akses |
|------|---------|-----------|
| **Print** | `opr_t_loper_print.asp?b=[ID]` | Semua yang bisa login |
| **Edit** | `opr_t_loper_e.asp?b=[ID]` | `session("D3b")` |
| **Hapus** | `p-opr_t_loper_h.asp?b=[ID]` | `session("D3c")` |

---

## 11. Laporan dan Cetakan

| Tombol | Halaman | Keterangan |
|--------|---------|-----------|
| CETAK | `opr_t_laporan_loper.asp` | Laporan daftar loper sesuai filter aktif |
| CETAK HASIL LOPER | `opr_t_loper_lampiran.asp` | Lampiran hasil pengantaran |
| REKAP | `opr_t_loper_rekap.asp` | Rekap loper per sopir dan periode |
| KOMISI LOPER | `opr_t_loper_komisi_new_print.asp` | Cetak komisi sopir loper |
| CETAK HANYA YG BERHASIL TERLOPER | `OPR_T_Laporan_Berhasil_Loper.asp` | BTT yang berhasil diantarkan |
| CETAK YG BERHASIL TERLOPER SENDIRI (PAD) | `OPR_T_Laporan_Berhasil_Loper_sendiri.asp` | BTT yang diantarkan sendiri (bukan diserahkan ke pihak ketiga) |

---

## 12. Kaitannya dengan Proses Lain

```
   [Penerimaan BTT]          [SP Naik]
   MKT_T_eConote     →    OPR_T_eSP_Terima
                                │
                    (pengiriman antar cabang)
                                │
                                ▼
                    ┌─────────────────────┐
                    │      SP TURUN        │
                    │  OPR_T_eSP_Turun     │
                    │  (tiba di cabang     │
                    │   tujuan)            │
                    └──────────┬──────────┘
                               │
                    (barang siap diantar)
                               │
           ┌───────────────────┴──────────────────┐
           │ [Loading Barang]                      │
           │ OPR_T_LoadingH/D                      │
           └───────────────────┬──────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    LOPER BARANG      │   ← dokumen ini
                    │  OPR_T_eLoper        │
                    │  OPR_T_eLoperDetail  │
                    └──────────┬──────────┘
                               │
                    (barang diantarkan ke penerima)
                               │
                               ▼
                    ┌─────────────────────┐
                    │   OPR_T_eAmbil       │
                    │ (Penyerahan ke       │
                    │  penerima akhir)     │
                    └─────────────────────┘
```

Siklus pengiriman barang: **BTT dibuat → SP Naik (antar cabang) → SP Turun (tiba di tujuan) → Loading → Loper → penyerahan ke penerima akhir**.
