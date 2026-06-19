# Dokumentasi Modul TambahDataBTT (Tambah Resi / BTT)

> Dokumen ini menjelaskan proses, prosedur, syarat, ketentuan, dan file-file terkait pada halaman penambahan data Bukti Tanda Terima (BTT / Resi Pengiriman) Dakota Cargo.

---

## 1. Gambaran Umum

Halaman ini digunakan oleh **operator agen/cabang** untuk membuat resi pengiriman baru (BTT = Bukti Tanda Terima). Prosesnya terdiri dari dua tahap utama:

1. **Form Input** — pengguna mengisi data pengirim, penerima, barang, tarif, dan cara pembayaran (`index.asp`)
2. **Preview & Simpan** — sistem menampilkan preview BTT, kemudian pengguna menekan tombol "PROSES SIMPAN DAN CETAK BTT" untuk menyimpan data ke database via stored procedure (`p-mkt_t_eConote_a.asp` → `get_ajx_econote_a.asp`)

---

## 2. Alur Proses (Flow)

```
[1] Pengguna login di  http://localhost:5173/
        |
[2] akan menampilkan dashboard user dan cabang yang di sudah di berikan member
        |
[3] Cek user di tag di cabang apa? jika Pusat Dakota maka create BTT disable, harus dari cabang yang di tag.
        |
[4] Cek LOCK (lihat Bagian 4)
     ├── Lock aktif → tampilkan halaman error/lock, form tidak muncul
     └── Tidak lock → tampilkan form input
        |
[5] Pengguna isi form:
    - Data Pengirim (customer)
    - Data Penerima (nama, alamat, kota, kecamatan, kelurahan, kodepos)
    - Data Barang (koli, berat asli, berat volume, volume, isi kiriman)
    - Jenis Layanan (darat/laut/udara, reguler/kurir/ekonomis)
    - Jenis Harga (Berat / Kubikasi / Unit)
    - Cara Pembayaran (Tunai / Kredit / Tagih Tujuan / Transfer)
    - Packing (opsional, via popup)
        |
[6] Pemilihan Tarif (Ajax: SetHargaAwal)
    - Cek Uncovered Area
    - Ambil harga dari MKT_M_eHarga_Pelanggan atau MKT_M_Harga_Mads
    - Hitung biaya kirim (termasuk diskon volume) via fungsi JavaScript tarifpilih()
    - Hitung biaya penerus dari OPR_M_eArea
        |
[7] Submit Form → POST ke p-mkt_t_eConote_a.asp
    - Validasi server side:
        * Agen tujuan harus diisi
        * Jika Tagih Tujuan: cek customer XXX0000000 harus ada
        * Telepon min 10 karakter
        * Alamat min 10 karakter
        * Tagih Tujuan: total harga min Rp 100.000
        * Tanggal tidak boleh sudah di-closing
    - Tampilkan Preview BTT (3 lembar)
    - Tombol PROSES SIMPAN DAN CETAK BTT
        |
[8] Submit 2 → POST ke get_ajx_econote_a.asp
    - Eksekusi stored procedure: sp_AddMKT_T_eConote
    - Insert ke MKT_T_eHistory (eHistory DB)
    - Update BTTT_HistID di MKT_T_eConote
    - Jika ada No. Booking: update MKT_T_eBookingConote
    - Redirect ke halaman cetak / asuransi
```

---

## 3. Syarat Masuk Halaman (Pra-Kondisi)

| Kondisi | Deskripsi |
|---|---|
| **Bukan PUSAT** | Jika `session("cabang")` mengandung "PUSAT" → redirect ke `err.msg` |
| **Harus Login** | `checkLogin()` dipanggil; jika session kosong → redirect ke `login.asp` |

---

## 4. Sistem Lock (Kondisi Blokir Transaksi)

Ada **4 jenis lock** yang dicek secara berurutan. Jika salah satu aktif, form tidak ditampilkan dan pengguna melihat pesan error.

### 4.1 Lock Manual Pusat (`lockPenjualan`)
- **Sumber:** tabel `art_t_lockPenjualan`
- **Query:** `SELECT agenID, LockStatus WHERE agenID = session("server-id") AND lockStatus = 'Y'`
- **Efek:** Form benar-benar diblokir. Hanya bisa dibuka oleh Keuangan Pusat.
- **Berlaku untuk:** semua tipe user (agen maupun cabang)

### 4.2 Lock BTT Tagih Turun Belum Closing (`lockCekTurun`)
- **Sumber:** tabel `OPR_T_eBBL` JOIN `MKT_T_eConote`
- **Kondisi:** Ada BTT pembayaran=3 (Tagih Tujuan) yang sudah diterima (`BBL_TerimaYN='Y'`) oleh agen ini, belum ada di `ART_T_PenjualanBTTD`, tanggal BBL < hari ini, dan tahun BTT > 2024
- **Berlaku untuk:** hanya user bertipe AGEN
- **Pengecualian:** Cabang/Counter/Transit bebas dari lock ini

### 4.3 Lock BTT Belum Closing (`lockClosing`)
- **Sumber:** tabel `MKT_T_eConote`
- **Kondisi:** Ada BTT milik agen ini (tahun ≥ 2024, tanggal < hari ini) yang belum masuk ke `ART_T_PenjualanBTTD` dan masih aktif (`BTTT_AktifYN='Y'`)
- **Artinya:** Agen wajib closing BTT hari sebelumnya sebelum boleh membuat BTT baru.

### 4.4 Lock Closing Belum Diinput Keuangan (`lockNoPenerimaan`)
- **Sumber:** tabel `ART_T_PenjualanBTTH` JOIN `ART_T_ReceiptDD`
- **Kondisi:** Ada nomor closing (suffix "SB") milik agen ini yang sudah closing tapi `TRectDD_TRectDTRectHNo` masih kosong (belum dibuatkan kwitansi penerimaan oleh keuangan cabang)
- **Aktif hanya setelah jam 12:01 siang.** Sebelum jam 12 siang, lock ini tidak berlaku.

### 4.5 Lock Invoice Setoran Gantung (`lock`)
- **Sumber:** tabel `ART_T_PenjualanBTTD` JOIN `ART_T_PenjualanBTTH` JOIN `ART_T_ReceiptDD` JOIN `ART_T_ReceiptD`
- **Kondisi:** Ada invoice setoran (`BTTH_Tanggal >= 2024-08-01`) yang kwitansinya belum lunas (`PostingYN IS NULL` atau `= 'N'`, dan sisa tagihan > 0)
- **Berlaku untuk:** hanya user bertipe AGEN

### 4.6 Lock Bulan Sudah Closing (di p-mkt_t_eConote_a.asp)
- **Sumber:** tabel `GLB_M_Closing`
- **Kondisi:** Bulan dan tahun dari tanggal BTT yang diinput sudah ada di tabel closing untuk agen ini
- **Pesan:** "Transaksi Untuk Periode Ini Sudah DiClosing"

---

### Pengecualian Lock Global

Kondisi berikut **menonaktifkan semua lock** (kecuali lock manual pusat):

1. **Hari libur (`HRD_M_CalLiburPeriodik`):** Jika hari ini adalah hari libur periodik (cek sampai 2 hari ke belakang), lock dinonaktifkan untuk agen.
2. **Hari Sabtu/Minggu:** Lock setoran (`lock`) dan `lockNoPenerimaan` dinonaktifkan.
3. **Login sebagai Cabang/Counter/Transit:** Semua lock (kecuali lock manual pusat) dinonaktifkan.
4. **Agen ID khusus:** Agen ID 103, 123, 575, 600, 774 selalu bebas dari semua lock.

---

### Logika `cektgl` (Tanggal Referensi Lock)

Sistem menghitung `cektgl` (batas tanggal BTT yang dianggap "belum disetor") berdasarkan hari dan jam saat ini:

| Hari | Sebelum jam 12 | Setelah jam 12 |
|---|---|---|
| Senin | H-5 (Jumat) | H-4 (Sabtu kemarin) |
| Sabtu | H-3 | H-2 |
| Minggu | H-4 | H-3 |
| Hari biasa lainnya | H-2 | H-1 |
| Hari libur | H-2 (dari hari libur) | H-2 (dari hari libur) |

> Tujuan: memberi kelonggaran agar BTT hari sebelumnya tidak langsung mengunci pada hari berikutnya sebelum jam 12 siang.

---

## 5. Detail Field Form (`index.asp`)

### 5.1 Bagian Pengirim (Asal)
| Field | Nama Variabel | Keterangan |
|---|---|---|
| Tanggal BTT | `tanggalstart` | Validasi: tidak boleh beda >1 hari dari hari ini (`rangeDate()`) |
| Customer / Pengirim | `CustID`, `custIDNomor`, `custname` | Autocomplete via Ajax `GetJsonCustPengirim` |
| Alamat | `custalamat` | |
| Telepon 1 & 2 | `custTelepon`, `custTelepon2` | Digabung, tanda "-" dihapus |
| Kota | `custkota` | |
| Email | `email` | Opsional |

### 5.2 Bagian Penerima (Tujuan)
| Field | Nama Variabel | Keterangan |
|---|---|---|
| Agen Tujuan | `agenID` | Dropdown semua agen aktif dari `GLB_M_Agen` |
| Nama Penerima | `tujuannama` | |
| U.P. | `tujuanup` | Nama pihak yang dituju |
| Alamat | `tujuanalamat` | Min 10 karakter |
| Kota | `tujuankota` | |
| Kecamatan | `tujuankecamatan` | Autocomplete via Ajax `GetJsonKecamatanAutofillPropKota` |
| Kelurahan | `tujuankelurahan` | Autocomplete via Ajax `GetJsonKelurahanAutofillKotaKecamatan` |
| Kode Pos | `kodepos` | Via Ajax `GetKodePos` |
| Pulau | `pulau` | |
| Telepon 1, 2, 3 | `tujuantelp`, `tujuanTelp2`, `tujuanTelp3` | Digabung, tanda "-" dihapus. Min 10 karakter |
| Email | `tujuanemail` | Opsional |

### 5.3 Bagian Barang & Layanan
| Field | Nama Variabel | Keterangan |
|---|---|---|
| Isi Kiriman | `isi` | |
| Jumlah Koli | `colly` | |
| Berat Asli | `beratAsli` | kg |
| Berat Volume | `beratvolume` | kg (P×L×T / 4000 atau 6000) |
| Volume | `volume` | m³ |
| Jenis Harga | `KdJenisHarga` | 0=Berat, 1=Kubikasi, 2=Unit |
| Harga Unit ID | `unitHargaID` | Hanya jika KdJenisHarga=2, dari `MKT_M_HargaUnit_mads` |
| Jenis Layanan | `KodeLayanan` | 1=Darat, 2=Laut, 3=Udara |
| Service | `service` | R=Reguler, K=Kurir, E=Ekonomis, S=Same Day |
| Kode Tarif | `ketpilihtarif` | Kode pilihan tarif (misal: "1K", "3R", "1R", "2R") |
| No. Surat Jalan | `NoSJ` | Opsional |
| Keterangan | `ket` | Otomatis diisi "SURAT JALAN KEMBALI" jika No.SJ ada |
| No. BTT Manual | `NoBTTManual` | Opsional, nomor BTT kustom |
| DLI Express | `BTTT_DliExprYN` | Y/N, menampilkan watermark "DLI EXPRESS" di cetak |
| Promo ID | `promoID` | Opsional |

### 5.4 Bagian Pembayaran
| Nilai | Kode | Keterangan |
|---|---|---|
| Tunai | 1 | Harga dibulatkan per 1000 |
| Kredit | 2 | Tidak dibulatkan |
| Tagih Tujuan | 3 | Min Rp 100.000; customer XXX0000000 harus ada |
| Transfer | 6 | Khusus customer "UMUM TRANSFER"; jika diakses dari AGEN/COUNTER dikonversi jadi Tunai (1) saat simpan |

### 5.5 Packing (Opsional)
- Dibuka via tombol "TAMBAH PACKING" → popup iframe `packing/index.asp`
- Data packing disimpan sementara via Ajax `GetBiayaPackingNewMethod` atau `UpdateBiayaPackingNewMethod`
- ID packing (`pckID`) dan biaya packing (`bpacking`) disimpan di hidden field
- Sesi packing: `session("pckID")` dan `session("biayapck")`

---

## 6. Kalkulasi Harga (JavaScript `tarifpilih()`)

Fungsi ini menghitung `totalbayar` berdasarkan berat terbesar dari {beratAsli, beratVolume, volume, KG minimum penerus jika ada}.

### Struktur Tarif (dari `SetHargaAwal`)
| Parameter | Arti |
|---|---|
| `dasar` / `hargapokok` | Harga pokok (flat untuk < kg minimum) |
| `kgmin` / `minimalKG` | KG minimum, di bawah ini pakai harga pokok |
| `kgnext` / `hargakgselanjutnya` | Harga per KG setelah melewati kgmin |
| `disc1kg`, `disc1rp` | Threshold KG diskon level 1 dan harga per KG-nya |
| `disc2kg`, `disc2rp` | Threshold KG diskon level 2 dan harga per KG-nya |
| `disc3kg`, `disc3rp` | Threshold KG diskon level 3 dan harga per KG-nya |

### Logika Kalkulasi
```
beratfinal = max(beratAsli, beratVolume, volume, [kgMinPenerus jika ada])

if beratfinal >= kgmin:
    if beratfinal >= disc3kg:  totalbayar = beratfinal × disc3rp
    elif beratfinal >= disc2kg: totalbayar = beratfinal × disc2rp
    elif beratfinal >= disc1kg: totalbayar = beratfinal × disc1rp
    else:                       totalbayar = beratfinal × kgnext
else:
    totalbayar = hargapokok (flat)

# Jika jenis harga UNIT: totalbayar = totalbayar × FaktorX (sesuai layanan darat/laut/udara)
# Jika pembayaran bukan Kredit: totalbayar = round(totalbayar / 1000) × 1000
```

### Biaya Penerus
Dihitung dari `OPR_M_eArea` (field `HrgPenerus`, `KGmin`):
```
if beratfinal <= KGmin_penerus:
    biayaPenerus = KGmin_penerus × HrgPenerus
else:
    biayaPenerus = beratfinal × HrgPenerus
```

### Total Biaya
`SumBiaya = biayaKirim + biayaPenerus + biayaPacking`

---

## 7. Sumber Data Tarif

Sistem memeriksa tarif secara **berurutan** (dari yang paling spesifik ke yang paling umum):

1. **`MKT_M_eHarga_Pelanggan`** — harga khusus per pelanggan (`customerID = custPriceListID`)
2. **`MKT_M_Harga_Mads`** — harga umum per rute (asal kota → tujuan kecamatan)

Key pencarian: `Tujuan_Propinsi + Tujuan_Kabupaten + Tujuan_Kecamatan` (+ `servID` untuk jenis layanan)

### Uncovered Area
Sebelum mengambil tarif, sistem mengecek tabel `MKT_M_UncoveredAreas`:
- Jika rute tujuan ada dan `BlockYN='Y'` serta `Valid_Date <= GETDATE()` → tampilkan warning JavaScript `showUncoveredAreaWarning()`, tarif tidak diambil.

---

## 8. Proses Validasi Server-Side (`p-mkt_t_eConote_a.asp`)

Setelah form di-submit (POST ke `p-mkt_t_eConote_a.asp`), sistem melakukan validasi:

| Validasi | Kondisi Gagal | Pesan Error |
|---|---|---|
| Agen tujuan | `agenID = 0` | "CABANG/AGEN PENERIMA HARUS DIISI" |
| Customer tagih tujuan | Pembayaran=3 tapi `MKT_M_Customer` belum ada kode `XXX0000000` | "CABANG/AGEN PENERIMA INI BLM TERDAFTAR..." |
| Telepon penerima | Kurang dari 10 karakter | "Nomor Telepon Harus Berisi Minimal 10 Karakter" |
| Alamat penerima | Kurang dari 10 karakter | "Alamat Harus Berisi Minimal 10 Karakter" |
| Minimum tagih tujuan | Pembayaran=3 dan total < Rp 100.000 | "Penjualan Tagih Tidak Boleh Kurang Dari 100.000 Rupiah" |
| Periode sudah closing | Bulan/tahun tanggal BTT ada di `GLB_M_Closing` | "Transaksi Untuk Periode Ini Sudah DiClosing..." |
| Tanggal sudah di-closing | `ART_T_PenjualanBTTD` sudah punya BTT di tanggal itu (untuk pembayaran bukan transfer) | "Penjualan Untuk Tanggal Ini Telah Di Closing..." |
| **[Proteksi BTT Kredit] Customer bukan kredit** | Pembayaran=2 tapi `Cust_KreditYN <> 'Y'` | "Proteksi Kredit: Customer ini tidak terdaftar sebagai customer Kredit." |
| **[Proteksi BTT Kredit] TglAkhirDokumen expired** | Pembayaran=2 dan `Cust_TglAkhirDokumen < today` (query DB langsung) | "Proteksi Kredit: Tanggal perjanjian customer sudah berakhir..." |
| **[Proteksi BTT Kredit] Berat minimum** | Pembayaran=2 dan `max(beratAsli, beratVolume) < Cust_KgMin` | "Proteksi Kredit: Berat kiriman (X kg) di bawah berat minimum..." |
| **[Proteksi BTT Kredit] Limit kredit** | Pembayaran=2 dan `outstanding + nilai_transaksi > Cust_KreditLimit` (query DB langsung) | "Proteksi Kredit: Limit kredit customer terlampaui..." |
| **[Proteksi BTT Kredit] Invoice jatuh tempo** | Pembayaran=2 dan ada invoice outstanding (`ARTIH_Terbayar <> 'Y'`) yang tanggal jatuh temponya (`ARTIH_TglKW + Cust_KreditHari`) sudah lewat hari ini | "Pembuatan BTT Kredit tidak bisa dilakukan dikarenakan ada invoice outstanding yang melewati tanggal jatuh tempo..." |

> **Catatan:** Customer "UMUM TRANSFER" (`Cust_Name LIKE '%UMUM TRANSFER%'`) secara otomatis mengubah kode pembayaran menjadi `6` (Transfer), terlepas dari pilihan di form.

---

## 9. Penyimpanan Data (`get_ajx_econote_a.asp`)

### Stored Procedure Utama
```sql
exec sp_AddMKT_T_eConote
    @SPYN, @Tanggal, @ServID, @AsalCustID, @AsalAgenID, @AsalName, @AsalAlamat, @AsalKota, @AsalTelp,
    @Email, @TujuanCustID, @TujuanAgenID, @TujuanNama, @TujuanAlamat, @TujuanKota, @TujuanTelp,
    @TujuanKelurahan, @TujuanKecamatan, @TujuanPulau, @TujuanKodepos, @TujuanEmail, @Pembayaran,
    @Up, @Ket, @NoSuratJalan, @NamaBarang, @JenisHarga, @JmlUnit, @JmlPck, @Berat, @BeratVol,
    @Ukuran, @Harga, @BiayaPenerus, @PackingID, @KirimYN, @AgenYN, @AgenTime, @CustomerYN,
    @CustomerTime, @BayarYN, @PostingYN, @PostingTime, @AktifYN, @UpdateID, @UpdateTime,
    @Service, @SMU, @CBYN, @PaketYN, @Disc, @Hash, @PrintCount, @HistID, @TagihTujuan,
    @NoBttManual, @BTT_PromoID, @BTTT_PTID, @IncHandYN, @BTTT_DliExprYN
```

SP ini meng-INSERT ke tabel `MKT_T_eConote` dan mengembalikan `ID` (nomor BTT baru) atau string `"DataExists"` jika data duplikat.

### Jika `"DataExists"` → redirect ke halaman asuransi

### Langkah-langkah setelah SP berhasil:
1. **Insert history** via SP `sp_AddMKT_T_eHistory` ke database eHistory (`MM_eHistory_STRING`)
2. **Update** `MKT_T_eConote.BTTT_HistID` dengan ID history yang baru dibuat
3. **Jika ada No. Booking** (`MKT_T_eBookingConote.Booking_ID`): update `Booking_BTTID`

---

## 10. Nilai Default Field Saat Penyimpanan

| Field | Nilai Default |
|---|---|
| `BTTT_KirimYN` | N |
| `BTTT_AgenYN` | N |
| `BTTT_CustomerYN` | N |
| `BTTT_BayarYN` | N |
| `BTTT_PostingYN` | N |
| `BTTT_AktifYN` | Y |
| `BTTT_CBYN` | N |
| `BTTT_SPYN` | N |
| `BTTT_Disc` | 0 |
| `BTTT_PrintCount` | 0 |
| `BTTT_Service` | R (Reguler) jika kosong |
| `BTTT_ServID` | 1 (Darat) jika kosong |

---

## 11. File-File Terkait

### File Utama
| File | Fungsi |
|---|---|
| `TambahDataBTT/index.asp` | Form input BTT + sistem lock |
| `TambahDataBTT/p-mkt_t_eConote_a.asp` | Validasi server-side + preview BTT 3 lembar |
| `TambahDataBTT/get_ajx_econote_a.asp` | Eksekusi INSERT ke database (via SP) |

### File Include (Dependensi)
| File | Fungsi |
|---|---|
| `function/checkLogin.asp` | Validasi sesi login |
| `function/getBaseUrl.asp` | Helper `getSiteURL()` |
| `Connections/cargo.asp` | Koneksi DB DBS (`MM_cargo_STRING`, `MM_dbs_STRING`) |
| `Connections/eHistory.asp` | Koneksi DB eHistory (`MM_eHistory_STRING`) |
| `secureString.asp` | Fungsi enkripsi/encode untuk hash BTT |
| `updateLog.asp` | Logging aksi user |
| `freeze_screen.asp` | Efek freeze screen saat proses simpan |
| `adovbs.inc` | Konstanta ADODB |

### File Ajax (Endpoint)
| File | Fungsi |
|---|---|
| `ajax/SetHargaAwal/index.asp` | Ambil data tarif (darat reguler) per rute; cek uncovered area |
| `ajax/GetJsonCustPengirim/index.asp` | Autocomplete data pengirim dari `MKT_M_Customer` |
| `ajax/GetJsonCustPengirimEqualto/index.asp` | Pencarian exact customer pengirim |
| `ajax/GetJsonCustPenerima/index.asp` | Autocomplete data penerima |
| `ajax/GetJsonCustName/index.asp` | Pencarian customer by nama |
| `ajax/GetJsonCustID/index.asp` | Pencarian customer by ID; sekaligus mengembalikan data proteksi kredit (`tglakhirdokumen`, `kgmin`, `kreditlimit`) — lihat [§14](#14-proteksi-btt-kredit) |
| `ajax/GetJsonKecamatanAutofillPropKota/index.asp` | Autocomplete kecamatan (mengisi propinsi & kota) |
| `ajax/GetJsonKelurahanAutofillKotaKecamatan/index.asp` | Autocomplete kelurahan (mengisi kota & kecamatan) |
| `ajax/GetKota/index.asp` | Dropdown kota berdasarkan propinsi |
| `ajax/GetKodePos/index.asp` | Ambil kodepos dari tabel kodepos |
| `ajax/GetJsonPenerus/index.asp` | Data agen penerus |
| `ajax/GetBiayaPacking/index.asp` | Kalkulasi biaya packing (cara lama) |
| `ajax/GetInvoiceJatuhTempo/index.asp` | **[Proteksi BTT Kredit]** Cek invoice outstanding yang melewati jatuh tempo (`ARTIH_TglKW + Cust_KreditHari < today`); scope agen sesuai `session("server-id")` — lihat [§14.4](#144-invoice-outstanding-melewati-jatuh-tempo) |
| `ajax/GetBiayaPackingNewMethod/index.asp` | Kalkulasi + INSERT biaya packing (cara baru) |
| `ajax/UpdateBiayaPackingNewMethod/index.asp` | Update biaya packing yang sudah ada |
| `ajax/GetHargaUnit/index.asp` | Daftar harga unit dari `MKT_M_HargaUnit_mads` |
| `ajax/GetKreditLimit/index.asp` | **[Proteksi BTT Kredit]** Hitung total outstanding kredit customer; dipanggil sebelum submit jika pembayaran = Kredit — lihat [§14](#14-proteksi-btt-kredit) |
| `ajax/SetHargaAwal/debug.asp` | Debug endpoint SetHargaAwal |

### File Pendukung Packing
| File | Fungsi |
|---|---|
| `packing/index.asp` | Popup form packing |
| `packing/p-mkt_t_packing_a.asp` | Proses simpan data packing |

### File Email (Tidak Aktif)
| File | Fungsi |
|---|---|
| `p-later-register-email.asp` | Pengiriman email notifikasi (di-comment, belum aktif) |

---

## 12. Tabel Database yang Terlibat

### Tabel Baca (READ)
| Tabel | DB | Fungsi |
|---|---|---|
| `WebLogin` | DBS | Validasi user login (`PT_ID`) |
| `GLB_M_Param` | DBS | Nilai DPP, PPH21, PPH23 |
| `art_t_lockPenjualan` | DBS | Status lock manual dari pusat |
| `HRD_M_CalLiburPeriodik` | DBS | Hari libur periodik |
| `ART_T_PenjualanBTTD` | DBS | Cek status closing BTT |
| `ART_T_PenjualanBTTH` | DBS | Cek status penerimaan keuangan |
| `ART_T_ReceiptDD` | DBS | Kwitansi closing |
| `ART_T_ReceiptD` | DBS | Detail kwitansi setoran |
| `ART_T_ReceiptH` | DBS | Header kwitansi setoran |
| `ART_T_ReceiptDDDD` | DBS | **[Proteksi BTT Kredit]** Pembayaran per BTT kredit (`TrectDDD_NoBTT`, `TrectDDD_Bayar`); dipakai untuk hitung outstanding di `GetKreditLimit` |
| `ART_T_InvoiceH` | DBS | **[Proteksi BTT Kredit]** Header invoice kredit; field `ARTIH_CustID`, `ARTIH_TglKW`, `ARTIH_Terbayar`, `ARTIH_Delete`, `ARTIH_ID` dipakai untuk cek jatuh tempo di `GetInvoiceJatuhTempo` |
| `OPR_T_eBBL` | DBS/DLB/Logistik | Cek BBL tagih turun |
| `MKT_T_eConote` | DBS | Cek BTT yang belum closing; **[Proteksi BTT Kredit]** juga dipakai untuk hitung outstanding kredit |
| `GLB_M_Closing` | DBS | Cek periode sudah closing |
| `GLB_M_Agen` | DBS | Data agen/cabang tujuan |
| `MKT_M_Customer` | DBS | Data customer pengirim; **[Proteksi BTT Kredit]** field `Cust_KreditYN`, `Cust_TglAkhirDokumen`, `Cust_KgMin`, `Cust_KreditLimit` |
| `MKT_M_eHarga_Pelanggan` | DBS | Harga khusus pelanggan |
| `MKT_M_Harga_Mads` | DBS | Harga umum per rute |
| `MKT_M_UncoveredAreas` | DBS | Daftar area yang tidak dilayani |
| `OPR_M_eArea` | DBS | Data biaya penerus per kecamatan |
| `MKT_M_HargaUnit_mads` | DBS | Harga unit (motor, barang besar, dll) |
| `MKT_T_eBookingConote` | DBS | Data booking yang akan dilink ke BTT |

### Tabel Tulis (WRITE)
| Tabel | DB | Fungsi |
|---|---|---|
| `MKT_T_eConote` | DBS | INSERT BTT baru (via SP `sp_AddMKT_T_eConote`) |
| `MKT_T_eHistory` | eHistory DB | INSERT history BTT (via SP `sp_AddMKT_T_eHistory`) |
| `PCK_T_Packing` | DBS | INSERT/UPDATE data packing |
| `MKT_T_eBookingConote` | DBS | UPDATE link booking ke BTT |

---

## 13. Catatan Penting & Gotcha

1. **Tanggal BTT dibatasi maksimal beda 1 hari** dari hari ini. Jika selisih > 1 hari atau 0 hari, BTT tidak bisa disimpan (`tglValidYN = "N"`). Validasi ini dilakukan di JavaScript fungsi `rangeDate()`.

2. **Tanggal yang digunakan untuk INSERT:** Jika tanggal = hari ini, sistem pakai `now()` (termasuk waktu); jika bukan hari ini, digunakan tanggal tersebut jam `00:01`.

3. **Pembayaran Transfer dari AGEN/COUNTER** secara otomatis diubah menjadi Tunai (kode 1) saat disimpan ke database. Kode 6 (Transfer) hanya berlaku jika diakses dari login Cabang.

4. **Penomoran BTT** dilakukan sepenuhnya oleh stored procedure `sp_AddMKT_T_eConote` di sisi database.

5. **Hash/Kode PT:** Tiap BTT diberi hash `session("PT_ID")` untuk membedakan entitas perusahaan (A=DBS, B=DLB, C=Dakota Logistik).

6. **Packing menggunakan session:** `session("pckID")` dan `session("biayapck")` di-clear pada awal load (`index.asp`). Packing diproses lewat Ajax sebelum form utama disubmit.

7. **Tanda kutip satu (') di-strip** dari field alamat dan keterangan menggunakan `replace(...,"'"," ")` untuk mencegah SQL injection (tidak menggunakan parameterized query).

8. **Biaya penerus dari tabel `OPR_M_eArea`** diquery berdasarkan kecamatan, kabupaten, dan propinsi. Jika tidak ditemukan, biaya penerus = 0.

9. **Jenis Harga UNIT:** Berat asli, berat volume, dan volume di-lock (readonly) setelah jenis unit dipilih dari modal. Berat dihitung otomatis dari `BeratStd × jumlah koli`. Jika dibatalkan, field kembali ke mode manual.

10. **Tombol PROSES SIMPAN** di-hide setelah diklik (8 detik) untuk mencegah double-submit (`vBtnSmpn()`).

---

## 14. Proteksi BTT Kredit

> **[Proteksi BTT Kredit]** — Gunakan flag ini untuk mencari semua bagian dokumentasi yang berkaitan dengan fitur ini.

Tiga proteksi ini **hanya berlaku untuk customer bertipe Kredit** (`Cust_KreditYN = 'Y'`). Customer Tunai/Tagih Tujuan tidak terpengaruh. Jika kondisi tidak terpenuhi, opsi **Kredit** diblokir/di-reset ke Tunai — BTT tetap bisa disimpan dengan metode pembayaran lain.

**Lapisan proteksi:**
- **Client-side** (JavaScript di `index.asp`): proteksi awal via UI — dapat di-bypass oleh user yang memanipulasi browser.
- **Server-side layer 1** (`p-mkt_t_eConote_a.asp`): validasi ulang di tahap preview sebelum form simpan ditampilkan — query langsung ke DB, tidak bergantung pada hidden field.
- **Server-side layer 2** (`get_ajx_econote_a.asp`): validasi final tepat sebelum SP eksekusi INSERT ke database — last line of defense, tidak bisa di-bypass.

---

### 14.1 Tanggal Akhir Dokumen

**Kapan dicek:** Saat isi kiriman diinput (`isikiriman()` → `setHargaAwal()` → `cekkredit()`), yaitu setelah customer dipilih.

**Sumber data:** `MKT_M_Customer.Cust_TglAkhirDokumen` — diambil via `ajax/GetJsonCustID` dan disimpan di hidden field `custTglAkhirDokumen`.

**Logika:**
```
if Cust_KreditYN = 'Y' AND Cust_TglAkhirDokumen < today:
    sembunyikan opsi KREDIT (kreditYNdiv tetap hidden)
    tampilkan modal peringatan merah
    reset pembayaran ke Tunai
```

**Fungsi JavaScript:** `isTglAkhirDokumenExpired()`, dipanggil di dalam `cekkredit()`.

**Pesan modal:**
> Tanggal perjanjian dengan customer ini sudah berakhir, silahkan perbaharui kembali dokumen-dokumen MOU dan perjanjian lain yang dibutuhkan dan melakukan penyesuaian di Master Customer agar dapat melakukan pengiriman Kredit kembali.

**Cara perbaiki:** Update `Cust_TglAkhirDokumen` di Master Customer ke tanggal yang masih berlaku.

**Server-side:** Dicek di `p-mkt_t_eConote_a.asp` dan `get_ajx_econote_a.asp` dengan query langsung ke `MKT_M_Customer` — tidak bergantung pada nilai dari form/hidden field.

---

### 14.2 Berat Minimum

**Kapan dicek:**
- Saat `BERAT ASLI` atau `BERAT VOLUME` diubah (`onChange`)
- Saat radio button **KREDIT** diklik
- Saat tombol SIMPAN ditekan dengan pembayaran Kredit

**Sumber data:** `MKT_M_Customer.Cust_KgMin` — diambil via `ajax/GetJsonCustID`, disimpan di hidden field `custKgMin`.

**Logika:**
```
beratMax = max(beratAsli, beratVolume)   ← berlaku salah satunya
if pembayaran = Kredit AND beratMax < Cust_KgMin:
    tampilkan modal peringatan oranye (dengan nilai kgMin)
    reset pembayaran ke Tunai
    hitung ulang tarif (pilihlisttarif)
```

**Fungsi JavaScript:** `cekBeratMinimum()`.

**Pesan modal:** Menyebutkan nilai `Cust_KgMin` yang berlaku untuk customer tersebut.

**Server-side:** Dicek di `p-mkt_t_eConote_a.asp` (menggunakan `aBerat`/`aBeratvol` yang sudah dibaca dari form) dan `get_ajx_econote_a.asp` (menggunakan `aBerat`/`aBeratvol` dari POST), dikombinasikan dengan `Cust_KgMin` yang diambil langsung dari DB.

---

### 14.3 Limit Kredit

**Kapan dicek:** Tepat sebelum form di-submit, jika pembayaran = Kredit (di dalam `checkForm()`).

**Sumber data:**
- `MKT_M_Customer.Cust_KreditLimit` — limit maksimum, disimpan di hidden field `custKreditLimit`
- `ajax/GetKreditLimit/index.asp` — menghitung total outstanding saat ini

**Kalkulasi outstanding** (query di `GetKreditLimit`):
```sql
-- Semua BTT kredit aktif customer ini, dikurangi yang sudah dibayar
SELECT SUM(
    (BTTT_Harga + BTTT_BiayaPenerus + ISNULL(PCK_Biaya, 0))
    - ISNULL((SELECT SUM(TrectDDD_Bayar) FROM ART_T_ReceiptDDDD
              WHERE TrectDDD_NoBTT = BTTT_ID), 0)
)
FROM MKT_T_eConote LEFT JOIN PCK_T_Packing ...
WHERE BTTT_AsalCustID = '[custID]'
  AND BTTT_Pembayaran = '2'
  AND BTTT_AktifYN = 'Y'
```

Ini mencakup ketiga kondisi outstanding:
- BTT kredit belum dibuatkan invoice (bayar = 0)
- BTT sudah ada invoice tapi belum dibayar sama sekali (bayar = 0)
- BTT dengan pembayaran parsial (sisa belum lunas)

**Logika:**
```
total = outstanding + nilai_transaksi_saat_ini (SumBiaya)
if total > Cust_KreditLimit:
    tampilkan modal peringatan ungu (dengan rincian angka)
    batalkan submit
```

**Fungsi JavaScript:** `cekLimitKredit(callback)` — async via `$.getJSON`.

**Pesan modal:**
> LIMIT transaksi melebihi batas limit customer yang di izinkan sesuai master customer. Silahkan lakukan pelunasan terhadap transaksi sebelumnya atau kurangi nilai transaksi saat ini agar pengiriman dapat tetap dilakukan.

Modal juga menampilkan tabel rincian: outstanding saat ini, nilai transaksi, total, dan limit.

**Server-side:** Dicek di `p-mkt_t_eConote_a.asp` menggunakan `aHarga + aBiayaPenerus + aBpacking`, dan di `get_ajx_econote_a.asp` menggunakan `aHarga + aBiayaPenerus + PCK_Biaya` (packing di-query dari `PCK_T_Packing` berdasarkan `aPackingID`). Outstanding dihitung dengan query SQL identik dengan `GetKreditLimit/index.asp`.

---

---

### 14.4 Invoice Outstanding Melewati Jatuh Tempo

**Kapan dicek:** Tepat sebelum form di-submit, jika pembayaran = Kredit (di dalam `checkForm()`), setelah `cekBeratMinimum()` dan sebelum `cekLimitKredit()`.

**Sumber data:**
- `ART_T_InvoiceH.ARTIH_TglKW` — tanggal kwitansi invoice diterbitkan
- `MKT_M_Customer.Cust_KreditHari` — jumlah hari kredit (TOP)
- Jatuh tempo = `ARTIH_TglKW + Cust_KreditHari`
- Outstanding = invoice dengan `ARTIH_Terbayar <> 'Y'` dan `ARTIH_Delete <> 'Y'`

**Scope agen:**
- `session("server-id") = 1` → cek semua invoice customer di semua agen/cabang
- `session("server-id") <> 1` → hanya invoice dari agen yang sesuai (`CONVERT(int, LEFT(ARTIH_ID, 3)) = server-id`)

**Logika:**
```
invoice_tertua = SELECT TOP 1 ... WHERE customer = custID AND belum_lunas AND tgl_jatuh_tempo < TODAY
                 ORDER BY tgl_jatuh_tempo ASC

if invoice_tertua EXISTS:
    tampilkan modal peringatan navy biru
    batalkan submit form
```

Modal terus muncul sampai semua invoice outstanding yang lewat jatuh tempo dilunasi. Setiap kali dicek, selalu menampilkan invoice tertua (jatuh tempo paling lama) yang masih outstanding.

**Fungsi JavaScript:** `cekInvoiceJatuhTempo(callback)` — async via `$.getJSON` ke endpoint `GetInvoiceJatuhTempo`.

**Pesan modal:**
> Pembuatan BTT Kredit tidak bisa dilakukan dikarenakan ada invoice outstanding yang melewati tanggal jatuh tempo. Silahkan melakukan pembayaran untuk Invoice nomor **[x]** yang sudah jatuh tempo di tanggal **[x]**.

**Server-side:** Dicek di `p-mkt_t_eConote_a.asp` (Cek 4) dan `get_ajx_econote_a.asp` (Cek 4) dengan query langsung ke DB. Pesan error identik dengan yang ditampilkan client-side.

---

### 14.5 Ringkasan Hidden Fields & Fungsi

| Hidden Field | Sumber | Kegunaan |
|---|---|---|
| `custTglAkhirDokumen` | `GetJsonCustID` → `Cust_TglAkhirDokumen` | Cek expired dokumen |
| `custKgMin` | `GetJsonCustID` → `Cust_KgMin` | Cek berat minimum |
| `custKreditLimit` | `GetJsonCustID` → `Cust_KreditLimit` | Cek limit kredit |

| Fungsi JS | Dipanggil dari | Fungsi |
|---|---|---|
| `isTglAkhirDokumenExpired()` | `cekkredit()` | Cek apakah TglAkhirDokumen sudah lewat |
| `cekkredit()` | `setHargaAwal()` | Kontrol visibilitas opsi Kredit + proteksi TglAkhir |
| `cekBeratMinimum()` | `beratAsli.onChange`, `beratVolume.onChange`, KREDIT onClick, `checkForm()` | Validasi berat vs KgMin |
| `cekInvoiceJatuhTempo(cb)` | `checkForm()` | Cek invoice outstanding yang lewat jatuh tempo via AJAX |
| `cekLimitKredit(cb)` | `checkForm()` | Cek outstanding + transaksi vs KreditLimit via AJAX |

| Modal ID | Warna | Proteksi |
|---|---|---|
| `modalTglAkhirDok` | Merah | Tanggal Akhir Dokumen expired |
| `modalBeratMin` | Oranye | Berat di bawah minimum |
| `modalInvoiceJatuhTempo` | Navy Biru | Invoice outstanding melewati jatuh tempo |
| `modalLimitKredit` | Ungu | Limit kredit terlampaui |

---

### 14.6 Implementasi Server-Side (Anti-Bypass)

Proteksi client-side (§14.1–14.3) dapat di-bypass jika user memanipulasi browser (DevTools, intercept request, dsb). Untuk mencegah hal ini, validasi yang sama diimplementasikan di sisi server pada dua titik:

#### `p-mkt_t_eConote_a.asp` (Layer 1 — Tahap Preview)

Kode proteksi disisipkan **setelah semua variabel form dibaca** (`aHarga`, `aBerat`, dll.) dan **sebelum preview BTT ditampilkan**. Jika gagal, halaman hanya menampilkan pesan error — tombol "PROSES SIMPAN DAN CETAK BTT" tidak muncul sama sekali.

Urutan cek (via variabel `svErrKredit`):
1. Query `MKT_M_Customer` berdasarkan `aAsalCustID` → cek `Cust_KreditYN = 'Y'`
2. Cek `Cust_TglAkhirDokumen < today` (bandingkan dengan `Now()`)
3. Cek `max(aBerat, aBeratvol) < Cust_KgMin`
4. Hitung outstanding dari DB → cek `outstanding + (aHarga + aBiayaPenerus + aBpacking) > Cust_KreditLimit`
5. Query `ART_T_InvoiceH` → cek ada invoice outstanding dengan `ARTIH_TglKW + Cust_KreditHari < today`

#### `get_ajx_econote_a.asp` (Layer 2 — Tepat Sebelum INSERT)

Kode proteksi disisipkan **setelah semua variabel form dibaca** dan **sebelum `exec sp_AddMKT_T_eConote`**. Ini adalah *last line of defense* — bahkan jika Layer 1 berhasil dilewati, data tidak akan masuk ke database.

Perbedaan dengan Layer 1:
- Biaya packing di-query langsung dari `PCK_T_Packing` berdasarkan `aPackingID` (karena tidak ada variabel `aBpacking` di file ini).
- Jika validasi gagal: `Response.Write svErrKredit` + `Response.End` — eksekusi berhenti total.

#### Sumber Data yang Digunakan (Server-Side)

| Data | Sumber |
|---|---|
| `Cust_KreditYN`, `Cust_TglAkhirDokumen`, `Cust_KgMin`, `Cust_KreditLimit` | Query `MKT_M_Customer WHERE Cust_ID = aAsalCustID` |
| Outstanding kredit | Query `MKT_T_eConote LEFT JOIN PCK_T_Packing LEFT JOIN ART_T_ReceiptDDDD` (sama dengan `GetKreditLimit`) |
| Biaya packing transaksi ini | Query `PCK_T_Packing WHERE PCK_ID = aPackingID` (hanya di `get_ajx_econote_a.asp`) |

> **Catatan keamanan:** Semua query menggunakan `Replace(Trim(...), "'", "''")` untuk sanitasi input sebelum dimasukkan ke SQL string, sesuai pola yang digunakan di seluruh modul ini.


🛠️ LANGKAH 1: Backend (Golang) – Proteksi & Endpoint SimpanSebelum frontend menembak data, kita harus siapkan "pagar" keamanan di sisi server (anti-bypass).Buat Endpoint GetKreditLimit & CheckLockBikin fungsi di Go untuk menghitung outstanding kredit customer (meniru query SQL yang menggabungkan mkt_t_econote dan art_t_receiptdddd).Implementasikan 4 jenis sistem lock transaksi (Lock Pusat, Lock BBL, Lock Closing, dan Invoice Gantung). Jika salah satu aktif, backend langsung menolak memberikan akses form.Buat Endpoint Autocomplete Wilayah & TarifGET /api/marketing/btt/autocomplete-kecamatan: Mengambil data dari tabel glb_m_kodepos yang kamu buat kemarin.POST /api/marketing/btt/hitung-tarif: Fungsi Go untuk menjalankan logika kalkulasi JavaScript tarifpilih() di sisi server (mencari berat terbesar antara berat asli vs volume, lalu dikalikan harga per KG sesuai level diskon).Buat Handler CreateBTT (Layer Proteksi Final)Membaca semua input form.Validasi Server-Side: Cek tanggal tidak boleh kedaluwarsa, dokumen kredit tidak expired, berat tidak di bawah minimum, dan total transaksi tidak menjebol limit kredit customer.Jika lolos, panggil Stored Procedure sp_AddMKT_T_eConote untuk mendapatkan nomor BTT baru.💻 LANGKAH 2: Frontend (React) – State & Controlled InputsKita harus mengikat kotak-kotak input mewah di BttFormModal.jsx yang kita buat tadi ke dalam sebuah objek State React.Deklarasikan State Form UtamaDi dalam BttFormModal.jsx, buat penampung data seperti ini:JavaScriptconst [formData, setFormData] = useState({
  tanggal_kirim: '2026-05-15',
  pelanggan_id: '8050000001',
  asal_nama: 'UMUM',
  asal_alamat: '',
  asal_kota: 'BANDUNG',
  asal_telp: '',
  asal_email: '',
  tujuan_nama: '',
  tujuan_alamat: '',
  tujuan_kota: '',
  tujuan_kecamatan: '',
  tujuan_kelurahan: '',
  tujuan_kodepos: '',
  tujuan_telp1: '',
  jenis_pelayanan: 'PAKET', // PAKET atau CARTER
  jenis_kiriman: 'BERAT',
  isi_kiriman: '',
  jml_koli: 1,
  berat_asli: 1,
  berat_volume: 1,
  harga_total: 0
});
Pasang Atribut value dan onChangeSetiap komponen <input> atau <textarea> wajib dipasangi value={formData.nama_field} dan fungsi pembaca ketikan onChange={handleChange} agar datanya tidak hilang saat diketik.🧠 LANGKAH 3: Frontend (React) – Otomatisasi & Pop-up ProteksiIni bagian yang bikin aplikasi kamu terasa pintar dan interaktif.Pasang Autocomplete Rute KirimSaat admin mengetik di kotak Kecamatan, aplikasi secara otomatis memicu fungsi fetch ke backend untuk mencari nama wilayah.Begitu kecamatan dipilih, field Provinsi, Kota, Kelurahan, dan Kodepos langsung terisi otomatis (Autofill) tanpa perlu diketik manual satu-satu.Hitung Berat Volume & Tarif OtomatisBuat fungsi pendeteksi perubahan pada input Dimensi Barang.Jika admin mengubah Berat Asli atau Jumlah Koli, sistem langsung menghitung nilai Berat Volume.Kirim data berat tersebut ke API backend untuk mendapatkan kalkulasi harga riil, lalu perbarui isi field Harga Total (Rp) secara instan di layar.Tampilkan Modal Peringatan Kredit (Sesuai Aturan Warna Dokumen!)Jika pembayaran dipilih Kredit tapi dokumen expired $\rightarrow$ Munculkan modal peringatan warna Merah.Jika berat kiriman di bawah ketentuan customer $\rightarrow$ Munculkan modal peringatan warna Oranye.Jika total transaksi melebihi batas saldo limit $\rightarrow$ Munculkan modal rincian tabel berwarna Ungu.🚀 LANGKAH 4: Pengujian & Cetak PreviewKirim Data ke API (Axios POST)Saat tombol "Simpan Bukti Terima" ditekan, jalankan validasi akhir. Jika aman, kirim objek formData menggunakan axios.post ke backend.Integrasi SweetAlert2Tampilkan animasi loading (Freeze Screen) saat proses penyimpanan berlangsung untuk menghindari double-submit dari user. Begitu berhasil, picu notifikasi sukses besar!


1. Daftar Tabel Wajib Migrasi (SQL Server ➔ Postgres)
Biar ringkas dan tidak membebani database Postgres barumu, import tabel-tabel berikut ke dalam skema public:

A. Core Transaksi & Wilayah (Sudah Aman)
mkt_t_econote (Tabel Utama): Tempat menyimpan data resi BTT yang baru saja kita buat layout-nya.

glb_m_kodepos: Untuk basis data pencarian rute, wilayah, dan kodepos.

B. Master Data Operasional (Wajib Ditambahkan)
glb_m_agen: Berisi daftar semua agen dan cabang aktif seluruh Indonesia. Ini dipakai untuk mengisi dropdown/pilihan Cabang Penerima dan Kode Cabang Agen.

mkt_m_customer: Berisi data pelanggan. Ini sangat krusial karena menyimpan data status Kredit (Cust_KreditYN), Tanggal Perjanjian (Cust_TglAkhirDokumen), Berat Minimum (Cust_KgMin), dan Limit Kredit (Cust_KreditLimit).

opr_m_earea: Menyimpan data rute biaya penerus per kecamatan (HrgPenerus dan KGmin). Tanpa tabel ini, sistem tidak bisa menghitung Biaya Penerus otomatis.

C. Master Tarif & Proteksi
mkt_m_eharga_pelanggan: Tarif khusus untuk customer corporate/kredit.

mkt_m_harga_mads: Tarif umum per rute dari Kota Asal ke Kecamatan Tujuan.

mkt_m_uncoveredareas: Daftar wilayah pelosok yang sedang diblokir/tidak dilayani. Ini penting agar sistem bisa memblokir input jika rutenya masuk ke area blacklist.

mkt_m_hargaunit_mads: Tarif khusus jika Jenis Harga yang dipilih adalah UNIT (misal kirim motor/mobil).

🚀 2. Rencana Langkah Berikutnya (Setelah Import Selesai)
Setelah semua tabel di atas masuk ke Postgres dengan selamat, langkah yang kamu usulkan tadi sudah 100% tepat ala Master: Mempersiapkan State Form & Handle Change di React.

Kenapa langkah ini harus didahulukan sebelum koding Backend?

Form Terkontrol (Controlled Inputs): Kita buat semua kotak input di modal bisa diketik dengan lancar tanpa macet.

Siap Tempur: Begitu state di React sudah rapi mengumpulkan data (dari nama pengirim sampai kubikasi), bentuk objek JSON-nya sudah ketahuan. Jadi pas kita bikin kodingan Go nanti, kita tinggal sesuaikan struktur struct di Go dengan JSON yang dikirim oleh React. Kerja jadi efisien, nggak bolak-balik revisi!

=====================
1. Analisis Kesiapan Database PostgreSQL
Berdasarkan screenshot pgAdmin 4 kamu (image_24aa2d.png) yang memiliki 25 tabel dan dokumen alur kerja, berikut adalah hasil audit tabelnya:

A. Tabel Master & Transaksi yang SUDAH ADA di pgAdmin kamu:
art_t_lockpenjualan (Lock manual pusat)

art_t_penjualanbttd (Data detail closing BTT)

art_t_receiptdd (Kwitansi penerimaan closing)

glb_m_agen, glb_m_kodepos, glb_m_kota (Master data wilayah & agen)

master_tarif_ekonomis, master_tarif_reguler, master_tarif_unit (Data tarif)

mkt_m_customer, mkt_m_eharga_pelanggan, mkt_m_harga, mkt_m_hargaunit (Master pelanggan & tarif khusus)

mkt_m_promosi, mkt_m_uncoveredareas (Master promo & pembatasan area)

mkt_m_ebookingconote (Data booking)

weblogin, weblogin_cabang (Autentikasi user & hak akses cabang)

B. CRITICAL CRASH: Tabel yang BELUM ADA (Harus Kamu Buat)!
Melihat logika Locking System dan penyimpanan di dokumen, ada beberapa tabel krusial yang tidak tertera di pgAdmin kamu saat ini. Kamu harus membuat tabel-tabel ini di PostgreSQL:

mkt_t_econote (WAJIB ADA): Ini tabel inti untuk menyimpan data setiap lembar BTT baru hasil submit transaksi.

glb_m_closing: Untuk mengecek apakah bulan/periode transaksi yang diinput admin sudah di-closing atau belum.

art_t_penjualanbtth: Header dari penjualan BTT untuk melacak setoran keuangan sebelum jam 12 siang.

opr_t_ebbl: Tabel manifes Bukti Barang Lolos (BBL) untuk mengecek Lock BTT Tagih Turun (Pembayaran Tagih Tujuan).

hrd_m_calliburperiodik: Tabel kalender libur perusahaan untuk logika pengecualian bypass lock global saat hari libur/Sabtu/Minggu.

pck_t_packing: Menyimpan data tambahan biaya packing barang (hidden fields packing).

art_t_invoiceh & art_t_receiptdddd: Digunakan untuk kalkulasi limit outstanding kredit dan melacak invoice jatuh tempo pelanggan (Proteksi BTT Kredit).

2. Langkah-Langkah Implementasi (Rencana Kerja)
Untuk membangun fitur ini secara rapi menggunakan kombinasi React + Go + Docker, kita harus membaginya menjadi beberapa tahap (milestone):

Tahap 1: Migrasi Database & Setup Docker
Lengkapi tabel-tabel yang kurang di atas ke dalam PostgreSQL.

Karena alur aslinya menggunakan Stored Procedure (sp_AddMKT_T_eConote), ubah logika SP tersebut menjadi query SQL biasa di Go, atau tulis ulang SP tersebut menggunakan bahasa PL/pgSQL khas PostgreSQL di dalam Docker.

Tahap 2: Pembuatan API Backend (Go)
Kamu perlu menyediakan beberapa endpoint RESTful API di backend Go untuk melayani form React kamu:

GET /api/btt/check-lock ── Menjalankan fungsi pengecekan 4 lapisan Lock global secara berurutan (§4.1 s.d §4.6) berdasarkan login Agen ID dan jam server saat ini.

POST /api/btt/calculate-tarif ── Menggantikan fungsi JS tarifpilih(). Menghitung berat terbesar (asli vs volume) dan mencocokkan tarif dari tabel mkt_m_eharga_pelanggan atau mkt_m_harga.

POST /api/btt/validate ── Validasi berlapis sebelum simpan (Cek nomor telepon, alamat, minimal nominal Rp100.000 untuk tagih tujuan, dan Proteksi Kredit).

POST /api/btt/save ── Menggantikan sp_AddMKT_T_eConote, menyimpan data ke tabel transaksi dan melempar log ke tabel history.

🎯 Strategi Kerja Bertahap Kita
Kita akan bagi pembuatan API ini menjadi beberapa milestone kecil. Kita beresin dulu pondasi dasarnya, baru kita bantai endpoint-nya satu per satu:

Langkah 0 (Pondasi): Setup Struktur Folder Project Go + Koneksi Database GORM ke PostgreSQL 192.168.22.8.

Langkah 1: Garap endpoint GET /api/btt/check-lock (Validasi Jam Server & Proteksi Agen).

Langkah 2: Garap endpoint POST /api/btt/calculate-tarif (Otak hitung rumus berat vs volume & pencarian tarif).

Langkah 3: Garap endpoint POST /api/btt/validate (Sistem keamanan kredit & validasi data).

Langkah 4: Garap endpoint POST /api/btt/save (Transaksi final & trigger history log).

MyDakotaBackend/
├── config/
│   └── database.go      # Tempat koneksi ke Postgres 22.8
├── controllers/
│   └── btt_controller.go # Tempat logic handler API BTT
├── models/
│   └── btt_model.go      # Struct tabel (Invoice, EBBL, Kwitansi, dll)
├── routes/
│   └── routes.go        # Tempat daftarin endpoint URL API
├── main.go              # Entry point utama aplikasi Go
├── go.mod
└── go.sum





=====================

Tahap 3: Pengembangan UI Form (React)
Berdasarkan screenshot modal Entry BTT kamu (image_2441ca.png), tampilannya sudah sangat bersih! Kamu tinggal menyambungkan field tersebut ke state React:

Pasang Event Listener onChange pada input Berat Asli, Dimensi (P x L x T) untuk otomatis menghitung berat volume dan menembak API tarif secara asinkron (debounce).

Integrasikan WarningModal (lingkaran merah/oranye/ungu) yang sudah kita buat sebelumnya untuk menampilkan 4 jenis pesan blokir Proteksi BTT Kredit:

Merah: Dokumen expired.

Oranye: Berat di bawah minimal.

Navy: Invoice lewat jatuh tempo.

Ungu: Over limit kredit.

3. Strategi Pengamanan Alur Kerja
Mengingat sistem ini memiliki validasi yang sangat ketat di file legacy .asp terdahulu, pastikan kamu menerapkan strategi Anti-Bypass di backend Go kamu:

Jangan pernah percaya validasi di sisi React Frontend saja. User bisa saja memanipulasi form melalui Inspect Element (DevTools). Seluruh fungsi pengecekan Lock, berat minimum, dan limit kredit WAJIB dieksekusi ulang di Backend Go tepat sebelum perintah SQL INSERT dijalankan.