export const MENU_LIST = [
  { id: 'dashboard', name: 'Dashboard' },
  {
    id: 'gl',
    name: 'General Ledger',
    // Kita tambahkan array subMenus di sini bro
    subMenus: [
      { id: 'gl_jurnal', name: 'Jurnal' },
      { id: 'gl_kelompok', name: 'Daftar Kelompok Perkiraan' },
      { id: 'gl_kas_masuk_keluar', name: 'Daftar Kas Masuk/Keluar' },
      { id: 'gl_rugilaba', name: 'Cetak Rugi/Laba' },
      { id: 'gl_rugilaba_tahun', name: 'Cetak Rugi/Laba Setahun' },
      { id: 'gl_kode_perkiraan', name: 'Daftar Kode Perkiraan' },
      { id: 'gl_bank', name: 'Daftar Bank' },
      { id: 'gl_buku_besar', name: 'Cetak Buku Besar' },
      { id: 'gl_awal_saldo', name: 'Daftar Awal Saldo Perkiraan' },
      { id: 'gl_neraca_saldo', name: 'Cetak Neraca Saldo' },
      { id: 'gl_transaksi_kas', name: 'Kas Masuk/Keluar' },
      { id: 'gl_posting', name: 'Posting Pembukuan Akhir Bulan' },
      { id: 'gl_kalkulasi_fiskal', name: 'Kalkulasi Fiskal' },
    ]
  },

  {
    id: 'hrd',
    name: 'HRD',
    // Kita tambahkan array subMenus di sini bro
    subMenus: [
      { id: 'hrd_proses_piutang_karyawan', name: 'Proses Piutang Karyawan' },
      { id: 'hrd_hari_libur_periodik', name: 'Hari Libur Periodik' },
      { id: 'hrd_periksa_absensi', name: 'Periksa Absensi' },
      { id: 'hrd_laporan_absensi', name: 'Laporan Absensi' },
      { id: 'hrd_transaksi_pembayaran_karyawan', name: 'Transaksi Pembayaran Karyawan' },
      { id: 'hrd_hari_kerja_khusus', name: 'Hari Kerja Khusus' },
      { id: 'hrd_entry_absensi', name: 'Entry Absensi' },
      { id: 'hrd_hari_libur_khusus', name: 'Hari Libur Khusus' },
      { id: 'hrd_perizinan', name: 'Perizinan' },
      { id: 'hrd_hari_libur_umum', name: 'Hari Libur Umum' },
      { id: 'hrd_laporan_status_kerja_karyawan', name: 'Laporan Status Kerja Karyawan' },
      { id: 'hrd_mutasi_piutang_karyawan', name: 'Mutasi Piutang Karyawan' },
      { id: 'hrd_saldo_awal_piutang_karyawan', name: 'Saldo Awal Piutang Karyawan' },
      { id: 'hrd_laporan_jumlah_izincutisakitalpa', name: 'Laporan Jumlah Izin/Cuti/sakit/alpa' },
      { id: 'hrd_master_supir', name: 'Master Supir' },
      { id: 'hrd_transaksi_pinjam_karyawan', name: 'Transaksi Pinjam Karyawan' },
    ]
  },

  {
    id: 'marketing',
    name: 'Marketing',
    subMenus: [
      { id: 'marketing_dashboard', name: 'Marketing Dashboard' },
      { id: 'marketing_master_customer', name: 'Master Customer' },
      { id: 'marketing_bukti_tanda_terima', name: 'Bukti Tanda Terima' },
      { id: 'marketing_bebas_dari_biaya_pengiriman', name: 'Bebas Dari Biaya' },
      { id: 'marketing_cetak_btt_resi', name: 'Cetak Btt' },
      { id: 'marketing_cetak_barcode_koli', name: 'Cetak Barcode Koli' },
      { id: 'marketing_closing_harian_agen', name: 'Closing Harian Agen' },

      {
        id: 'marketing_laporan',
        name: 'Laporan',
        subMenus: [
          { id: 'marketing_laporan_hasil_penjualan', name: 'Hasil Penjualan Btt Counter / Agen' },
          { id: 'marketing_laporan_penjualan_harian', name: 'Penjualan Btt Harian' },
          { id: 'marketing_laporan_btt_belum_dibuat', name: 'Btt Belum Dibuat Laporan Penjualan' },
          { id: 'marketing_laporan_hasil_penjualan', name: 'Penjualan' },
          { id: 'marketing_laporan_penjualan_harian', name: 'Btt Kirim Outstanding' },
          { id: 'marketing_laporan_btt_belum_dibuat', name: 'Perjalanan Btt' },
          { id: 'marketing_laporan_hasil_penjualan', name: 'Penjualan Dan Penerimaan' },
          { id: 'marketing_laporan_penjualan_harian', name: 'Laporan Omset Penjualan' },
          { id: 'marketing_laporan_btt_belum_dibuat', name: 'Monitoring Btt' },
        ]
      },
      { id: 'marketing_master_customer', name: 'Master Customer' },
      { id: 'marketing_bukti_tanda_terima', name: 'Bukti Tanda Terima' },
      { id: 'marketing_bebas_dari_biaya_pengiriman', name: 'Bebas Dari Biaya' },
      { id: 'marketing_cetak_btt_resi', name: 'Cetak Btt' },
      { id: 'marketing_cetak_barcode_koli', name: 'Cetak Barcode Koli' },
      { id: 'marketing_closing_harian_agen', name: 'Closing Harian Agen' },
    ]
  },

  {
    id: 'master',
    name: 'Master',
    subMenus: [
      { id: 'master_agen', name: 'Master Agen' },
      { id: 'master_area_loper', name: 'Area Loper' },
      { id: 'master_area_tidak_dilayani', name: 'Area Tidak Dilayani' },
      { id: 'master_device_karyawan', name: 'Device Karyawan' },
      { id: 'master_kendaraan', name: 'Master Kendaraan' },
      { id: 'master_sewa_kendaraan', name: 'Master Sewa Kendaraan' },
      { id: 'master_kodepos', name: 'Master Kode Pos' },
      { id: 'master_koordinator_wilayah', name: 'Koordinator Wilayah' },
      { id: 'master_sopir', name: 'Master Sopir' },
      { id: 'master_trayek', name: 'Master Trayek' },
      {
        id: 'master_tarif',
        name: 'Master Tarif',
        subMenus: [
          { id: 'tarif_carter', name: 'Tarif Carter' },
          { id: 'tarif_handling', name: 'Closing Harian Agen' },
          { id: 'tarif_paket_customer', name: 'Closing Harian Agen' },
          { id: 'tarif_paket_kurir', name: 'Closing Harian Agen' },
          { id: 'tarif_paket_ekonomis', name: 'Closing Harian Agen' },
          { id: 'tarif_paket_umum', name: 'Tarif Paket Umum' },
          { id: 'tarif_transit', name: 'Tarif Transit' },
          { id: 'tarif_unit', name: 'Tarif Unit' },
        ]
      },
    ]
  },



  {
    id: 'operasional',
    name: 'Operasional',
    subMenus: [
      { id: 'operasional', name: 'Operasional' },
      { id: 'operasional_dashboard', name: 'Dashboard' },
      { id: 'operasional_btt_gagalberhasil_loper', name: 'Btt Gagal berhasil Loper' },
      { id: 'operasional_komisi_borongan', name: 'Komisi Borongan' },
      {
        id: 'operasional_laporan',
        name: 'Laporan',
        subMenus: [
          { id: 'operasional_insentif_loper', name: 'Insentif Loper' },
          { id: 'operasional_laporan_barang_kurang', name: 'Laporan Barang Kurang' },
          { id: 'operasional_laporan_barang_dalam_perjalanan', name: 'Laporan Barang Dalam Perjalanan' },
          { id: 'operasional_laporan_barang_naik', name: 'Laporan Barang Naik' },
          { id: 'operasional_laporan_barang_turun', name: 'Laporan Barang Turun' },
          { id: 'operasional_laporan_handling_barang_naik', name: 'Laporan Handling Barang Naik' },
          { id: 'operasional_laporan_handling_by_pengembalian_btt', name: 'Laporan Handling By Pengembalian Btt' },
          { id: 'operasional_laporan_insentif_gudang', name: 'Laporan Insentif Gudang' },
          { id: 'operasional_laporan_leadtime', name: 'Laporan Leadtime' },
          { id: 'operasional_laporan_loading_kendaraan', name: 'Laporan Loading Kendaraan' },
          { id: 'operasional_laporan_perjalanan_kendaraan', name: 'Laporan Perjalanan Kendaraan' },
          { id: 'operasional_laporan_total_barang_naik_dan_turun', name: 'Laporan Total Barang Naik Dan Turun' },
          { id: 'operasional_laporan_bplk', name: 'Laporan Bplk' },
        ]
      },
    ]
  },

  {
    id: 'piutang',
    name: 'Piutang',
    subMenus: [
      { id: 'piutang_approval_customer', name: 'Approval Customer' },
      { id: 'piutang_btt_tagih_turun', name: 'Btt Tagih Turun' },
      { id: 'piutang_laporan_btt_tagih_turun', name: 'Laporan Btt Tagih Turun' },
      { id: 'piutang_invoice', name: 'Invoice' },
      { id: 'piutang_kondisi_btt_dan_order_jemput', name: 'Kondisi Btt Dan Order Jemput' },
      { id: 'piutang_kpi', name: 'KPI' },
      { id: 'piutang_laporan_piutang_usaha', name: 'Laporan Piutang Usaha' },
      { id: 'piutang_rekap_piutang_usaha', name: 'Rekap Piutang Usaha' },
      { id: 'piutang_lock_penjualan_cabang_agen_counter', name: 'Lock Penjualan Cabang agen counter' },
      { id: 'piutang_monitoring_setoran_agen_counter', name: 'Monitoring Setoran Agen counter' },
      { id: 'piutang_mutasi_piutang', name: 'Mutasi Piutang' },
      { id: 'piutang_penagihan_invoice_oleh_kolektor', name: 'Penagihan Invoice Oleh Kolektor' },
      { id: 'piutang_penerimaan_penagihan_kolektor', name: 'Penerimaan Penagihan Kolektor' },
      { id: 'piutang_penerimaan_pembayaran', name: 'Penerimaan Pembayaran' },
      { id: 'piutang_penerimaan_setoran_agen', name: 'Penerimaan Setoran Agen' },
      { id: 'piutang_penghapusan_piutang_tak_terbayar', name: 'Penghapusan Piutang Tak Terbayar' },
      { id: 'piutang_proses_piutang', name: 'Proses Piutang' },
      { id: 'piutang_pencairan_giro_mundur_kredit', name: 'Pencairan Giro Mundur Kredit' },
    ]
  },

  {
    id: 'settings',
    name: 'Settings',
    subMenus: [
      { id: 'settings_user', name: 'User' },
      { id: 'settings_config', name: 'Config' },
      { id: 'settings_security', name: 'Security' },
    ]
  },
];