// src/constants/menuListDLI.js
export const MENU_LIST_DLI = [
    {
        id: 'dashboard',
        name: 'Dashboard',
        subMenus: [
        ]
    },

    {
        id: 'master',
        name: 'Master',
        subMenus: [
            { id: 'master_dalem_kota', name: 'Master Dalam Kota' },
            { id: 'area_customer', name: 'Area Customer' },
            { id: 'agen', name: 'Agen' },
            { id: 'area_loper', name: 'Area Loper' },
            { id: 'area_tidak_dilayani', name: 'Area Tidak Dilayani' },
            { id: 'harga_perwilayah', name: 'Harga Perwilayah' },
            { id: 'device_karyawan', name: 'Device Karyawan' },
            { id: 'monitoring_lokasi_karyawan', name: 'Monitoring Lokasi Karyawan' },
            { id: 'kendaraan', name: 'Kendaraan' },
            { id: 'perawatan_kendaraan', name: 'Perawatan Kendaraan' },
            { id: 'sewa_kendaraan', name: 'Sewa Kendaraan' },
            { id: 'kode_pos', name: 'Kode Pos' },
            { id: 'koordinator_wilayah', name: 'Koordinator Wilayah' },
            { id: 'lead_time_customer', name: 'Lead Time Customer' },
            { id: 'master_customer_new', name: 'Master Customer New' },
            { id: 'sopir', name: 'Sopir' },
            { id: 'trayek', name: 'Trayek' },
            { id: 'tarif_handling_propinsi', name: 'Tarif Handling Propinsi' },
            {
                id: 'tarif',
                name: 'Tarif',
                subMenus: [
                    { id: 'tarif_carter', name: 'Tarif Carter' },
                    { id: 'tarif_paket_customer', name: 'Tarif Paket Customer' },
                    { id: 'tarif_paket', name: 'Tarif Paket Kurir' },
                    { id: 'tarif_paket_ekonomis', name: 'Tarif Paket Ekonomis' },
                    { id: 'tarif_paket_umum', name: 'Tarif Paket Umum' },
                    { id: 'tarif_unit', name: 'Tarif Unit' },
                    { id: 'jenis_kendaraan_carter', name: 'Jenis Kendaraan Carter' },
                ]
            },
            { id: 'master_vendor', name: 'Master Vendor' },
        ]
    },

    {
        id: 'operasional',
        name: 'Operasional',
        subMenus: [
            { id: 'btt_gagal_berhasil_loper-admin', name: 'BTT Gagal Berhasil Loper - Admin' },
            { id: 'btt_gagal_berhasil_loper', name: 'BTT Gagal Berhasil Loper' },
            { id: 'inventory_barang_customer', name: 'Inventory Barang Customer' },
            {
                id: 'laporan',
                name: 'Laporan',
                subMenus: [
                    { id: 'laporan_lsbp', name: 'Laporan LSBP' },
                    { id: 'laporan_lsbp_v2', name: 'Laporan LSBP V2' },
                    { id: 'laporan_barang_turun', name: 'Laporan Barang Turun' },
                    { id: 'laporan_btt_belum_kembali', name: 'Laporan BTT Belum Kembali' },
                    { id: 'laporan_data_penerima_customer', name: 'Data Penerima Customer' },
                    { id: 'laporan_pendapatan_operasional', name: 'Pendapatan Operasional' },
                ]
            },
            { id: 'loading_barang', name: 'Loading Barang' },
            { id: 'loper', name: 'Loper' },
            { id: 'btt_melewati_tengat_waktu', name: 'BTT Melewati Tengat Waktu' },
            { id: 'pembongkaran_barang', name: 'Pembongkaran Barang' },
            { id: 'pengeluaran_inventory_customer', name: 'Pengeluaran Inventory Customer' },
            {
                id: 'pengambilan',
                name: 'Pengambilan',
                subMenus: [
                    { id: 'barang_sendiri', name: 'Barang Sendiri' },
                    { id: 'pengambilan_retur', name: 'Pengambilan Retur' },
                ]
            },
            {
                id: 'pengembalian',
                name: 'Pengembalian',
                subMenus: [
                    { id: 'pengembalian_btt', name: 'Pengembalian BTT' },
                    { id: 'pengambilan_barang_retur', name: 'Pengambilan Barang Retur' },
                ]
            },
            { id: 'pengisian_bbm', name: 'Pengisian BBM' },
            { id: 'surat_tugas_sopir', name: 'Surat Tugas Sopir' },
            { id: 'surat_muatan_udara', name: 'Surat Muatan Udara' },
            {
                id: 'surat_pengantar',
                name: 'Surat Pengantar',
                subMenus: [
                    { id: 'cetak_surat_pengiriman', name: 'Cetak Surat Pengiriman' },
                    { id: 'surat_pengantar_pengiriman', name: 'Surat Pengantar Pengiriman' },
                    { id: 'surat_pengantar-sp_pad', name: 'Surat Pengantar - SP PAD' },
                    { id: 'surat_pengantar_turun', name: 'Surat Pengantar Turun' },
                ]
            },
            {
                id: 'stok',
                name: 'Stok',
                subMenus: [
                    { id: 'stok_barang_gudang', name: 'Stok Barang Gudang' },
                    { id: 'stok_inventory_barang_customer', name: 'Stok Inventory Barang Customer' },
                ]
            },
            { id: 'voucher_bbm', name: 'Voucher BBM' },

        ]
    },

    {
        id: 'marketing',
        name: 'Marketing',
        subMenus: [
            { id: 'master_customer', name: 'Master Customer' },
            { id: 'bukti_tanda_terima_btt', name: 'Bukti Tanda Terima BTT' },
            { id: 'bebas_dari_biaya_bdb-pengiriman', name: 'Bebas Dari Biaya BDB - Pengiriman' },
            { id: 'cek_btt_dari_no_btt_manual', name: 'Cek BTT Dari No BTT Manual' },
            { id: 'cetak_btt_resi', name: 'Cetak Btt Resi' },
            { id: 'cetak_barcode_koli', name: 'Cetak Barcode Koli' },
            { id: 'closing_harian_agen', name: 'Closing Harian Agen' },
            { id: 'monitoring_btt', name: 'Monitoring BTT' },
            {
                id: 'laporan',
                name: 'Laporan',
                subMenus: [
                    { id: 'laporan_handling_barang_naik', name: 'Laporan Handling Barang Naik' },
                    { id: 'hasil_penjualan_btt_counter_agen', name: 'Hasil Penjualan Btt Counter / Agen' },
                    { id: 'penjualan_btt_harian', name: 'Penjualan Btt Harian' },
                    { id: 'penjualan', name: 'Penjualan' },
                    { id: 'btt_kirim_outstanding', name: 'Btt Kirim Outstanding' },
                ]
            },
            {
                id: 'pengajuan_khusus',
                name: 'Pengajuan Khusus',
                subMenus: [
                    { id: 'asuransi', name: 'Asuransi' },
                    { id: 'order_jemput', name: 'Order Jemput' },
                    { id: 'packing', name: 'Packing' },
                ]
            },
            {
                id: 'penerimaan_btt',
                name: 'Penerimaan BTT',
                subMenus: [
                    { id: 'btt_kembali', name: 'BTT Kembali' },
                    { id: 'btt_barang_retur', name: 'BTT Barang Retur' },
                    { id: 'penerimaan_pembayaran_kasir', name: 'Penerimaan Pembayaran Kasir' },
                ]
            },
            { id: 'pengembalian_surat_jalan_customer', name: 'Pengembalian Surat Jalan Customer' },
            { id: 'setoran_penjualan_tunai', name: 'Setoran Penjualan Tunai' },
            { id: 'upload_csv', name: 'Upload CSV' },
            { id: 'proses_packing', name: 'Proses Packing' },
            { id: 'pengemasan_barang_kurir', name: 'Pengemasan Barang Kurir' },
            {
                id: 'customer_upload_csv',
                name: 'Penjualan',
                subMenus: [
                    { id: 'upload_transport_planning_CSV', name: 'Upload Transport Planning CSV' },
                    { id: 'customer_khusus', name: 'Customer Khusus' },
                    { id: 'upload_data_untuk_pembuatan_btt', name: 'Upload Data Untuk Pembuatan BTT' },
                    { id: 'btt_upload_v2', name: 'BTT Upload V2' },
                    { id: 'dn_upload', name: 'DN Upload' },
                    { id: 'hasil_loper_upload_csv', name: 'Hasil Loper Upload CSV' },
                ]
            },
        ]
    },
    {
        id: 'hutang',
        name: 'Hutang',
        subMenus: [
            { id: 'aging_hutang', name: 'Aging Hutang' },
            { id: 'invoice_vendor', name: 'Invoice Vendor' },
        ]
    },

    {
        id: 'piutang',
        name: 'Piutang',
        subMenus: [
            { id: 'aging_piutang', name: 'Aging Piutang' },
            { id: 'approval_customer', name: 'Approval Customer' },
            { id: 'bukti_tanda_terima_btt_tagih_turun', name: 'Bukti Tanda Terima BTT Tagih Turun' },
            { id: 'credit_note', name: 'Credit Note' },
            { id: 'invoice', name: 'Invoice' },
            { id: 'kondisi_btt_dan_order_jemput', name: 'Kondisi BTT dan Order Jemput' },
            { id: 'master_faktur_pajak', name: 'Master Faktur Pajak' },
            { id: 'rekap_piutang_usaha', name: 'Rekap Piutang Usaha' },
            { id: 'mutasi_piutang', name: 'Mutasi Piutang' },
            { id: 'penagihan_invoice_oleh_kolektor', name: 'Penagihan Invoice Oleh Kolektor' },
            { id: 'penerimaan_pembayaran', name: 'Penerimaan Pembayaran' },
            { id: 'penerimaan_setoran_agen', name: 'Penerimaan Setoran Agen' },
            { id: 'proforma_invoice', name: 'Proforma Invoice' },
            { id: 'proses_piutang', name: 'Proses Piutang' },
            { id: 'revisi_btt_api_harga', name: 'Revisi BTT (API Harga)' },
            { id: 'saldo_awal_piutang', name: 'Saldo Awal Piutang' },
            { id: 'tukar_piutang', name: 'Tukar Piutang' },
        ]
    },
    {
        id: 'general_ledger',
        name: 'General Ledger',
        subMenus: [
            { id: 'cek_jurnal_tidak_seimbang', name: 'Cek Jurnal Tidak Seimbang' },
            {
                id: 'cetak',
                name: 'Cetak',
                subMenus: [
                    { id: 'cetak_buku_besar', name: 'Cetak Buku Besar' },
                    { id: 'cetak_neraca_saldo', name: 'Cetak Neraca Saldo' },
                    { id: 'cetak_neraca', name: 'Cetak Neraca' },
                    { id: 'cetak_rugi_laba', name: 'Cetak Rugi Laba' },
                    { id: 'cetak_posisi_keuangan', name: 'Cetak Posisi Keuangan' },
                    { id: 'cetak_laba_rugi_komprehensif', name: 'Cetak Laba Rugi Komprehensif' },
                ]
            },
            {
                id: 'daftar',
                name: 'Daftar',
                subMenus: [
                    { id: 'daftar_bank', name: 'Daftar Bank' },
                    { id: 'daftar_pemasukan_dan_pengeluaran', name: 'Daftar Pemasukan Dan Pengeluaran' },
                    { id: 'daftar_kelompok_perkiraan', name: 'Daftar Kelompok Perkiraan' },
                    { id: 'daftar_kode_perkiraan', name: 'Daftar Kode Perkiraan' },
                    { id: 'daftar_sgu', name: 'Daftar SGU' },
                    { id: 'daftar_akun_piutang_setoran', name: 'Daftar Akun Piutang Setoran' },
                ]
            },
            { id: 'insentif_loper', name: 'Insentif Loper' },
            { id: 'jurnal', name: 'Jurnal' },
            { id: 'komisi_sopir', name: 'Komisi Sopir' },
            { id: 'kas_masuk_keluar', name: 'Kas Masuk Keluar' },
            { id: 'pembayaran_vendor', name: 'Pembayaran Vendor' },
            { id: 'posting_jurnal', name: 'Posting Jurnal' },
            { id: 'setoran_cod', name: 'Setoran COD' },
        ]
    },
    {
        id: 'hrd',
        name: 'HRD',
        subMenus: [
            { id: 'master_karyawan', name: 'Master Karyawan' },
            { id: 'daftar_form_hrd', name: 'Daftar Form HRD' },

        ]
    },
    {
        id: 'settings',
        name: 'Settings',
        subMenus: [
            { id: 'managemen_user', name: 'Managemen User' },
            { id: 'managemen_konfigurasi', name: 'Managemen Konfigurasi' },
            { id: 'security_settings', name: 'Security Settings' },

        ]
    },
]