# Dokumentasi Modul Closing Harian Agen

## Daftar Isi
1. [Gambaran Umum](#1-gambaran-umum)
2. [Alur Proses Closing](#2-alur-proses-closing)
3. [Daftar File](#3-daftar-file)
4. [Tabel Database yang Terlibat](#4-tabel-database-yang-terlibat)
5. [Proses Penjurnalan (Posting)](#5-proses-penjurnalan-posting)
6. [Perhitungan Keuangan](#6-perhitungan-keuangan)
7. [Format Nomor Closing](#7-format-nomor-closing)
8. [Fungsi-fungsi Utama](#8-fungsi-fungsi-utama)
9. [Parameter Sistem](#9-parameter-sistem)
10. [Kontrol Akses per Role](#10-kontrol-akses-per-role)

---

## 1. Gambaran Umum

Modul **Closing Harian Agen** adalah proses rekap dan pengesahan transaksi penjualan BTT (Bukti Titipan/eConote) harian per agen/cabang. Satu record closing merangkum semua BTT yang dikirim (naik), diterima (turun), maupun ditagih (tagih naik/turun) oleh suatu agen dalam satu hari.

Setelah closing dibuat, supervisor/kantor pusat dapat melakukan **Posting** yang secara otomatis membuat ayat jurnal akuntansi (GL) untuk mencatat pendapatan, komisi, handling, PPh, dan piutang agen.

---

## 2. Alur Proses Closing

```
[Agen buat closing baru]
        ↓
mkt_t_closing_a.asp  →  Header closing dibuat di ART_T_PenjualanBTTH
        ↓
p-mkt_t_closing_e.asp (stt=R: Reload)
    → Mengisi detail BTT ke ART_T_PenjualanBTTD
    → BTT Naik  : dari MKT_T_eConote (BTTt_AsalAgenID = agen)
    → BTT Turun : dari OPR_T_eBBL    (BBL_AgenID = agen, pembayaran = 3)
        ↓
[Supervisor/Pusat melakukan Posting]
        ↓
p-mkt_t_closing_post.asp (stt=P)
    → Membuat ayat jurnal di GL_T_JurnalH & GL_T_JurnalD
    → Update BTTH_PostingYN = 'Y'
        ↓
[Cetak Laporan]
        ↓
report/rpt_mkt_t_closing.asp
    → Menampilkan rincian BTT per jenis pembayaran + kalkulasi setoran
```

**Operasi lain:**
- **Unposting** (`stt=U`): Hapus ayat jurnal, kembalikan `BTTH_PostingYN = 'N'`
- **Clear** (`stt=C`): Hapus semua detail BTT dari closing (kosongkan `ART_T_PenjualanBTTD`)
- **Reload** (`stt=R`): Isi ulang detail BTT berdasarkan tanggal closing dan agen

---

## 3. Daftar File

| File | Fungsi |
|------|--------|
| `mkt_t_closing.asp` | Halaman utama: daftar, filter, navigasi closing |
| `mkt_t_closing_a.asp` | Form tambah header closing baru |
| `mkt_t_closing_c.asp` | Cek BTT yang belum terbayar |
| `p-mkt_t_closing_e.asp` | Proses Clear (hapus detail) atau Reload (isi ulang detail) |
| `p-mkt_t_closing_post.asp` | Proses Posting (buat jurnal) atau Unposting (hapus jurnal) |
| `report/rpt_mkt_t_closing.asp` | Cetak laporan penjualan harian per closing |

---

## 4. Tabel Database yang Terlibat

### 4.1 Tabel Utama Closing

#### `ART_T_PenjualanBTTH` — Header Closing
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `BTTH_ID` | varchar | Nomor closing (PK). Format: `[AgenID 3 digit][bulan][tahun 4 digit]/SB` |
| `BTTH_Tanggal` | datetime | Tanggal closing |
| `BTTH_AgenID` | varchar | ID agen pemilik closing |
| `BTTH_CBID` | varchar | No. kas masuk/keluar (kode bank/kassa) |
| `BTTH_PostingYN` | char(1) | Status posting: `Y` = sudah diposting, `N` = belum |
| `BTTH_TjurhNo` | varchar | Nomor jurnal GL yang terhubung |
| `BTTH_NoKW` | varchar | Nomor kwitansi |
| `BTTH_Pembayaran` | int | Jenis pembayaran: 1=Tunai, 2=Kredit, 3=Tagih, 4=Order Jemput |
| `BTTH_ActiveYN` | char(1) | Status aktif: `Y` = aktif, `N` = tidak aktif |
| `BTTH_UpdateID` | varchar | User yang terakhir update |
| `BTTH_UpdateTime` | datetime | Waktu terakhir update |

#### `ART_T_PenjualanBTTD` — Detail Closing
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `BTTD_BTTHID` | varchar | FK ke `ART_T_PenjualanBTTH.BTTH_ID` |
| `BTTD_BTTID` | varchar | FK ke `MKT_T_eConote.BTTT_ID` (nomor BTT/eConote) |
| `BTTD_BTTSeries` | varchar | Seri BTT (biasanya kosong) |

### 4.2 Tabel Referensi Transaksi

#### `MKT_T_eConote` — Data BTT / eConote
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `BTTT_ID` | varchar | Nomor BTT (PK) |
| `BTTT_Tanggal` | datetime | Tanggal BTT dibuat |
| `BTTT_AsalName` | varchar | Nama pengirim |
| `BTTT_AsalAgenID` | int | ID agen asal (pengirim) |
| `BTTT_AsalCustID` | varchar | Kode customer pengirim |
| `BTTT_TujuanNama` | varchar | Nama penerima |
| `BTTT_TujuanAgenID` | int | ID agen tujuan (penerima) |
| `BTTT_TujuanCustID` | varchar | Kode customer penerima |
| `BTTT_TujuanKota` | varchar | Kota tujuan |
| `BTTT_Harga` | money | Harga kirim (setelah diskon) |
| `BTTT_Disc` | decimal | Persentase diskon (%) |
| `BTTT_BiayaPenerus` | money | Biaya penerus (lanjutan ke agen lain) |
| `BTTT_PackingID` | varchar | FK ke `PCK_T_Packing` |
| `BTTT_Pembayaran` | int | Jenis: 1=Tunai, 2=Kredit, 3=Tagih |
| `BTTT_Berat` | decimal | Berat aktual |
| `BTTT_Beratvol` | decimal | Berat volume |
| `BTTT_JmlUnit` | int | Jumlah unit/koli |
| `BTTT_AktifYN` | char(1) | Status aktif BTT |

#### `PCK_T_Packing` — Biaya Packing
| Kolom | Keterangan |
|-------|------------|
| `PCK_ID` | PK packing |
| `PCK_Biaya` | Nilai biaya packing |

#### `MKT_T_Asuransi` — Biaya Asuransi
| Kolom | Keterangan |
|-------|------------|
| `BTTT_ID` | FK ke eConote |
| `TotalBiaya` | Total biaya asuransi |

#### `OPR_T_eBBL` — BTT Turun via BBL (Buku Bukti Lapor)
| Kolom | Keterangan |
|-------|------------|
| `BBL_BTTID` | FK ke `MKT_T_eConote.BTTT_ID` |
| `BBL_AgenID` | ID agen yang menerima BTT turun |

### 4.3 Tabel Master Agen

#### `GLB_M_Agen` — Master Agen
| Kolom | Keterangan |
|-------|------------|
| `Agen_ID` | PK |
| `Agen_Nama` | Nama agen |
| `Agen_CabangID` | ID cabang induk (= 1 jika di bawah pusat) |
| `Agen_KomisiKirim` | % komisi BTT naik |
| `Agen_KomisiTerima1` | % komisi tagih naik |
| `Agen_KomisiTerima2` | % komisi tagih turun |
| `Agen_KomisiTransit` | % komisi transit |
| `Agen_PCAID` | Kode akun piutang agen di chart of accounts |
| `Agen_komisiCAID` | Kode akun komisi agen |
| `Agen_NPWP` | Nomor NPWP agen |
| `Agen_NpwpPribadiYN` | `Y`=NPWP pribadi (PPh21), `N`=perusahaan (PPh23) |
| `Agen_JemputPusatYN` | `Y`=dijemput pusat |
| `Agen_AktifYN` | Status aktif |

#### `GLB_M_AgenCA` — Chart of Accounts per Agen
| Kolom | Keterangan |
|-------|------------|
| `AgenC_ID` | FK ke `GLB_M_Agen` |
| `AgenC_CAID` | Kode akun piutang agen |
| `AgenC_CAIDSetoran` | Kode akun setoran agen |

### 4.4 Tabel Jurnal GL

#### `GL_T_JurnalH` — Header Jurnal
| Kolom | Keterangan |
|-------|------------|
| `TJurH_No` | Nomor jurnal (PK). Format: `YYMMCCCMXXXXX` |
| `TJurH_Tanggal` | Tanggal jurnal |
| `TJurH_Keterangan` | Keterangan jurnal |
| `TJurH_Type` | Tipe jurnal (`M` = manual) |
| `TJurH_PostingYN` | Status posting GL |
| `TJurH_DeleteYN` | Status hapus |

#### `GL_T_JurnalD` — Detail Jurnal (Ayat)
| Kolom | Keterangan |
|-------|------------|
| `TJurD_TJurHNo` | FK ke `GL_T_JurnalH` |
| `TJurD_AccCode` | Kode akun (Chart of Accounts) |
| `TJurD_AgenID` | ID agen yang terkait ayat ini |
| `TJurD_Keterangan` | Keterangan ayat |
| `TJurD_Debet` | Nilai debet |
| `TJurD_Kredit` | Nilai kredit |

### 4.5 Tabel Penerimaan (Receipt)

| Tabel | Fungsi |
|-------|--------|
| `ART_T_ReceiptH` | Header kwitansi penerimaan |
| `ART_T_ReceiptDD` | Detail kwitansi — link closing ke receipt |
| `ART_T_ReceiptDDDD` | Rincian BTT dalam receipt |

### 4.6 Tabel Parameter Sistem

#### `GLB_M_Param` — Parameter Global
| `set_varname` | Keterangan |
|---------------|------------|
| `DPP` | Persentase PPN (misal: 1.1 = PPn 10/11) |
| `PPH21` | Persentase PPh Pasal 21 (untuk NPWP pribadi) |
| `PPH23` | Persentase PPh Pasal 23 (untuk NPWP perusahaan) |
| `PersenSetorAgenPusat` | % kewajiban setoran untuk agen di bawah pusat |
| `Piutang_CAID` | Kode akun piutang agen (default) |
| `PIUTANG_CaID` | Kode akun piutang (pusat) |
| `Jual_Tunai` | Kode akun pendapatan penjualan tunai |
| `Jual_Packing` | Kode akun pendapatan packing |
| `Jual_Tagih` | Kode akun pendapatan tagih |
| `AsuransiPend_CaID` | Kode akun pendapatan asuransi |
| `Discount_CaID` | Kode akun diskon |
| `Utang_PPn_caID` | Kode akun utang PPN |
| `Bank_CAID` | Kode akun bank |
| `PiutangCabang_CaID` | Kode akun piutang cabang (di pusat) |
| `PenerusTagihNaik_CaID` | Kode akun biaya penerus tagih naik |
| `TagihNaikPlusPenerus_CaID` | Kode akun tagih naik + penerus |

---

## 5. Proses Penjurnalan (Posting)

File: `p-mkt_t_closing_post.asp`

### 5.1 Penentuan Jenis Agen

Sistem membedakan dua kategori agen untuk menentukan alur jurnal:

| Kondisi | Kategori | Keterangan |
|---------|----------|------------|
| `Agen_CabangID = 1` AND `Agen_Nama LIKE '%AGEN%'` | **Agen di bawah Pusat** | Gunakan `PersenSetorAgenPusat` dari GLB_M_Param |
| Lainnya | **Agen Cabang** | `PersenKewajibanSETOR = 100 - Agen_KomisiKirim` |

### 5.2 Jurnal BTT Naik Tunai / Non-Kredit / Non-Tagih

**Perhitungan:**
```
calDPP      = 1 + (DPP / 100)
harga_asli  = ROUND(BTTT_Harga / (100 - BTTT_Disc) * 100, 0)
nilai_diskon = ROUND((BTTT_Disc / 100) * harga_asli, 0)
```

**Ayat Jurnal — Agen Cabang:**

| No | Akun | Debet | Kredit | Keterangan |
|----|------|-------|--------|------------|
| 1 | Piutang Agen (`Piutang_CAID`) | (harga_asli - diskon) + penerus + asuransi + packing | — | Total tagihan |
| 2 | Diskon (`Discount_CaID`) | nilai_diskon | — | Jika ada diskon |
| 3 | Penjualan Tunai (`Jual_Tunai`) | — | (harga_asli - diskon) + penerus + packing | Pendapatan BTT |
| 4 | Asuransi (`B006030100`) | — | asuransi | Jika ada asuransi |
| 5 | Packing (`Jual_Packing`) | — | packing / calDPP | Jika ada packing |

**Ayat Jurnal — Closing Pusat (AgenID = 1):**

| No | Akun | Debet | Kredit | Keterangan |
|----|------|-------|--------|------------|
| 1 | Piutang (`PIUTANG_CaID`) | (harga_asli - diskon) + penerus + asuransi + packing | — | Total tagihan |
| 2 | Diskon (`Discount_CaID`) | nilai_diskon | — | Jika ada diskon |
| 3 | Penjualan Tunai (`Jual_Tunai`) | — | harga + penerus | BTT |
| 4 | Asuransi (`AsuransiPend_CaID`) | — | asuransi | Jika ada (bukan 2024) |
| 5 | Packing (`Jual_Packing`) | — | packing / calDPP | Jika ada packing |

> **Catatan:** Berdasarkan permintaan keuangan pusat per 28/10/2024, jurnal PPn tidak lagi dibuat.

### 5.3 Jurnal BTT Kredit

Selalu menggunakan akun hardcoded khusus kredit:

| No | Akun | Debet | Kredit | Keterangan |
|----|------|-------|--------|------------|
| 1 | `A003012013` (Piutang Kredit) | (harga_asli - diskon) + penerus + asuransi + packing | — | Total tagihan kredit |
| 2 | Diskon (`Discount_CaID`) | nilai_diskon | — | Jika ada diskon |
| 3 | `C003043012` (Pend. Kredit) | — | harga + penerus | BTT kredit |
| 4 | `B006030100` (Asuransi) | — | asuransi | Jika ada |
| 5 | Packing (`Jual_Packing`) | — | packing | Jika ada |

### 5.4 Jurnal BTT Tagih Naik (khusus agen di bawah Pusat, `Agen_CabangID = 1`)

Dua blok jurnal dibuat: **jurnal di sisi cabang** dan **jurnal balik di sisi pusat**.

**Jurnal di Cabang (nomor jurnal = `j`):**

| Akun | D/K | Keterangan |
|------|-----|------------|
| Setoran Agen (`casetoran`) | D | Setoran tagih naik |
| Penjualan Tagih (`Jual_Tagih`) | K | Pendapatan |
| Komisi (`E102040070`) | D | Komisi tagih naik |
| Piutang Agen (`Piutang_CAID`) | K | Pengurang piutang komisi |
| Penerus (`PenerusTagihNaik_CaID`) | D | Biaya penerus |
| Penjualan Tagih (`Jual_Tagih`) | K | Penerus |
| Asuransi (`Piutang_CAID`) | D | Biaya asuransi |
| Penjualan Tagih (`Jual_Tagih`) | K | Asuransi |

**Jurnal Balik di Pusat (nomor jurnal baru = `jurnoTagih`, format `YYMMxxxMXXXXX`):**

| Akun | D/K | Keterangan |
|------|-----|------------|
| Piutang Cabang (`PiutangCabang_CaID`) | D | Tagih naik + penerus |
| Penerus (`PenerusTagihNaik_CaID`) | K | Penerus |
| Setoran (`casetoran`) | K | Tagih naik |
| Piutang (`capiutang`) | D | Asuransi |
| Asuransi (`AsuransiPend_CaID`) | K | Asuransi |
| Setoran (`casetoran`) | D | Komisi tagih naik |
| Piutang (`capiutang`) | K | Komisi tagih naik |

### 5.5 Jurnal BTT Turun (khusus `Agen_CabangID = 1`)

| Akun | D/K | Nilai |
|------|-----|-------|
| Piutang Agen (`Piutang_CAID`) | D | `prsSetturun/100 * total BTT turun` |
| Penjualan Tagih (`Jual_Tagih`) | K | idem |
| Penjualan Tagih (`Jual_Tagih`) | D | `prsKomturun/100 * total` |
| Piutang Agen (`Piutang_CAID`) | K | idem |

### 5.6 Update Status Setelah Posting

```sql
UPDATE ART_T_PenjualanBTTH SET BTTH_PostingYN = 'Y' WHERE BTTH_ID = '[nomor closing]'
```

### 5.7 Proses Unposting

```sql
DELETE FROM GL_T_JurnalD WHERE TJurD_TJurHNo = '[nomor jurnal]'
-- Jika ada jurnal tagih:
DELETE FROM GL_T_JurnalD WHERE TJurD_TJurHNo = '[nomor jurnal tagih]'

UPDATE ART_T_PenjualanBTTH SET BTTH_PostingYN = 'N' WHERE BTTH_ID = '[nomor closing]'
```

---

## 6. Perhitungan Keuangan

Semua kalkulasi berikut dilakukan di `report/rpt_mkt_t_closing.asp` untuk ditampilkan di laporan cetak.

### 6.1 Harga Asli & Diskon
```
harga_asli  = ROUND(BTTT_Harga / (100 - BTTT_Disc) * 100, 0)
nilai_diskon = ROUND((BTTT_Disc / 100) * harga_asli, 0)
```
> Berlaku untuk transaksi setelah 01/09/2022. Sebelumnya `harga_asli = BTTT_Harga`, `nilai_diskon = 0`.

### 6.2 DPP (Dasar Pengenaan Pajak) & PPN
```
calDPP      = 1 + (nilaiDPP / 100)    -- nilaiDPP dari GLB_M_Param

-- Jika ada penerus:
DppNya              = (harga_asli + penerus + packing) / calDPP
hitungDPP_untukKomisi = (harga_asli + packing) / calDPP
-- Jika tidak ada penerus:
DppNya              = hitungDPP_untukKomisi

hitungDPP_untukPPn = (harga_asli + penerus + packing) / calDPP
nilaiPPn           = (harga_asli + penerus + packing) - hitungDPP_untukPPn
```

### 6.3 Komisi Agen
```
-- Agen di bawah Pusat:
komisiAgen = hitungDPP_untukKomisi * (Agen_KomisiKirim / 100)

-- Agen Cabang:
komisiAgen = (harga_asli / calDPP) * (Agen_KomisiKirim / 100)
```

### 6.4 Kewajiban Setoran & Handling
```
PersenKewajibanSETOR = (dari GLB_M_Param 'PersenSetorAgenPusat')   -- agen pusat
PersenKewajibanSETOR = 100 - Agen_KomisiKirim                      -- agen cabang

PersenHandlingAgen = (100 - PersenKewajibanSETOR) - Agen_KomisiKirim

-- Jika agen pusat DAN ada penerus:
HandlingAgennya = (harga_asli / 1.011) * (PersenHandlingAgen / 100) + (penerus / 1.011)
-- Lainnya:
HandlingAgennya = (PersenHandlingAgen / 100) * hitungDPP_untukKomisi
```
> Khusus tahun 2024: `HandlingAgennya = 0` dan `PersenKewajibanSETOR = 100`.

### 6.5 PPh
```
-- PPh yang dipakai berdasarkan NPWP:
pphDipakai = nilaiPPH21  (jika Agen_NpwpPribadiYN = 'Y')
pphDipakai = nilaiPPH23  (jika Agen_NpwpPribadiYN = 'N')

-- Jika ada penerus:
hitungPPH = komisiAgen * (pphDipakai / 100)
-- Tanpa penerus:
hitungPPH = komisiAgen * (pphDipakai / 100)
```

### 6.6 Setoran Final
```
setoranFinal = jml - ((HandlingAgennya + komisiAgen) - hitungPPH)
-- dimana jml = (harga_asli - nilai_diskon) + penerus + packing + asuransi
```

---

## 7. Format Nomor Closing

```
BTTH_ID  = [3 digit AgenID][2 digit bulan][4 digit tahun]/SB
Contoh   : 0010620[26]/SB  →  001 + 06 + 2026 + /SB
```

Kolom kanan tabel daftar hanya menampilkan closing dengan suffix `/SB`:
```sql
WHERE RIGHT(ART_T_PenjualanBTTH.BTTH_ID, 3) = '/SB'
```

**Format Nomor Jurnal GL:**
```
TJurH_No = [2 digit tahun][2 digit bulan][3 digit AgenID][Type][5 digit urut]
Contoh   : 260600 1 M00001
```
Jurnal tagih balik (di pusat) menggunakan `AgenID = 001` (pusat).

---

## 8. Fungsi-fungsi Utama

### `mkt_t_closing.asp`

| Fungsi/Logika | Keterangan |
|---------------|------------|
| `checkLogin()` | Redirect ke login jika belum login (dari `checkLogin.asp`) |
| Filter multi-parameter | Filter berdasarkan tanggal, posting, pembayaran, cabang, no laporan, no BTT, no jurnal |
| Paginasi manual | Menggunakan `offset` + `requestrecords` + `recordsonpage = 15` |
| Modal popup | Klik nomor laporan → tampil tombol Print via Bootstrap modal |
| `encode()` | Fungsi dari `secureString.asp` — encode parameter URL untuk keamanan |
| Query parameterized | Semua filter menggunakan `ADODB.Command` + `Parameters.Append` |

### `p-mkt_t_closing_e.asp`

| Operasi | Logika |
|---------|--------|
| **Clear** (`stt=C`) | `DELETE ART_T_PenjualanBTTD WHERE BTTD_BTTHID = [nomor]`; juga hapus `ART_T_ReceiptDDDD` jika ada receipt |
| **Reload** (`stt=R`) | Cari BTT naik aktif di `MKT_T_eConote` (belum ada di closing manapun); Cari BTT turun via `OPR_T_eBBL`; Insert ke `ART_T_PenjualanBTTD`; Jika ada receipt, insert ke `ART_T_ReceiptDDDD`; Redirect ke posting |

**Query Reload BTT Naik:**
- Ambil eConote aktif (`BTTT_AktifYN = 'Y'`)
- Tanggal sesuai tanggal header closing
- Bukan bulan Mei 2022 (pengecualian historis)
- `BTTt_AsalAgenID = [agen closing]`
- Belum ada di closing manapun milik agen yang sama

**Query Reload BTT Turun:**
- Ambil via `OPR_T_eBBL` (berbasis penerimaan BBL)
- `BBL_AgenID = [agen closing]`
- `BTTT_Pembayaran = '3'` (tagih)
- Belum ada di closing manapun milik agen yang sama

### `p-mkt_t_closing_post.asp`

| Fungsi | Keterangan |
|--------|------------|
| Load setting | Memuat semua parameter dari `GLB_M_Param` ke session |
| Cek tipe agen | Bedakan agen cabang vs agen di bawah pusat untuk menentukan alur jurnal |
| Cek jurnal tagih | Cek apakah jurnal balik tagih naik sudah ada; jika belum, generate nomor baru |
| Generate nomor jurnal | Ambil `TOP 1` nomor jurnal terbesar bulan yang sama, tambah 1 untuk urutan baru |
| Posting per segmen | BTT Naik Tunai → BTT Kredit → BTT Tagih Naik → BTT Turun (masing-masing dicek, jika > 0 baru dijurnal) |

### `report/rpt_mkt_t_closing.asp`

| Fungsi | Keterangan |
|--------|------------|
| `printpage()` | Sembunyikan tombol → `window.print()` → tampilkan kembali |
| Iterasi jenis pembayaran | Loop `jn = 1 to 6` (Tunai, Kredit, Tagih Naik, Transfer) |
| Subtotal per jenis | Akumulasi per kelompok jenis pembayaran |
| Grand total | `grandTotalALL = subtotalTunai + subtotalTagih + subtotalKredit` |
| Navigasi selesai | Berdasarkan query string `?t=`: kosong → ke `mkt_t_closing.asp`, `S` → ke `art_t_setoran.asp`, lainnya → ke `art_t_setoran_e.asp` |

---

## 9. Parameter Sistem

Semua parameter diambil dari `GLB_M_Param WHERE set_CabID = 1` saat posting.

| Parameter | Nilai Tipikal | Digunakan Di |
|-----------|---------------|--------------|
| `DPP` | `1.1` | Hitung PPN, DPP |
| `PPH21` | `2.5` | PPh untuk NPWP pribadi |
| `PPH23` | `2` | PPh untuk NPWP perusahaan |
| `PersenSetorAgenPusat` | `90` (contoh) | % setoran agen di bawah pusat |
| `Piutang_CAID` | kode akun | Akun piutang agen (di sisi cabang) |
| `PIUTANG_CaID` | kode akun | Akun piutang (di sisi pusat) |
| `Jual_Tunai` | kode akun | Pendapatan penjualan tunai |
| `Jual_Packing` | kode akun | Pendapatan packing |
| `Jual_Tagih` | kode akun | Pendapatan tagih |
| `AsuransiPend_CaID` | kode akun | Pendapatan asuransi |
| `Discount_CaID` | kode akun | Diskon penjualan |
| `Bank_CAID` | kode akun | Akun bank |
| `PiutangCabang_CaID` | kode akun | Piutang cabang (di pusat) |
| `PenerusTagihNaik_CaID` | kode akun | Biaya penerus tagih naik |
| `TagihNaikPlusPenerus_CaID` | kode akun | Tagih naik + penerus gabungan |

---

## 10. Kontrol Akses per Role

Akses dikontrol berdasarkan nilai `session("server-id")` dan `session("korwil")`.

| Kondisi | Hak Akses |
|---------|-----------|
| `server-id = 1` (Pusat) | Lihat semua closing, bisa Posting/Unposting, bisa Clear/Reload |
| `server-id ≠ 1` (Cabang) | Hanya lihat closing milik agen sendiri + anak cabang; tombol TAMBAH muncul |
| `korwil ≠ ""` (Korwil) | Dapat melakukan Posting/Unposting (sama dengan pusat) |

**Kolom ACTION di tabel:**
- Tombol **Posting** / **Unposting** → hanya tampil jika `server-id = 1` atau `korwil ≠ ""`
- Tombol **Clear** → tampil jika belum diposting DAN receipt belum diposting DAN masih ada BTT (jbtt > 0)
- Tombol **Reload** → tampil jika belum diposting DAN receipt belum diposting DAN tidak ada BTT (jbtt = 0)

**Batasan query berdasarkan server:**
```sql
-- Cabang: hanya lihat closing milik sendiri
AND LEFT(BTTH_ID, 3) = [3 digit serverID]
```

---

## Catatan Historis / Pengecualian

| Kondisi | Aturan Khusus |
|---------|---------------|
| `BTTT_Tanggal < 01/09/2022` | `harga_asli = BTTT_Harga`, `nilai_diskon = 0` |
| Bulan Mei 2022 | BTT periode ini dikecualikan dari Reload |
| `tahunClosing = 2024` | `HandlingAgennya = 0`, `PersenKewajibanSETOR = 100` |
| Per 28/10/2024 | Jurnal PPn tidak lagi dibuat (sesuai permintaan keuangan pusat) |
