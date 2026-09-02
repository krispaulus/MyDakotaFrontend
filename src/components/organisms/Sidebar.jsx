import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import {
  LayoutDashboard, Users, Book, Briefcase, List,
  Database, TrendingUp, Truck, DollarSign, LayersPlus, Printer, ReceiptPoundSterling, WalletMinimal,
  Settings, LogOut, ChevronRight, Menu, Backpack, ClipboardPen, HandCoins, Route, GitCompareArrows, FileArchive
} from 'lucide-react';
import DakotaLogo from '../../assets/new_logo 2.png';
import LogoutModal from './LogoutModal';
import { useDarkMode } from '../../context/DarkModeContext';
import api from '../../api/axios';

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  // Tambahkan state ini di bawah state user kamu
  const { isDarkMode } = useDarkMode();
  const [openMenus, setOpenMenus] = useState({});
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState({ name: '', email: '', role: '', division: '', profileimage: '' });
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [modalNoSP, setModalNoSP] = useState('');
  const printInputRef = React.useRef(null);

  const [showBttPrintModal, setShowBttPrintModal] = useState(false);
  const [modalNoBTT, setModalNoBTT] = useState('');
  const bttInputRef = React.useRef(null);

  const [showBarcodePrintModal, setShowBarcodePrintModal] = useState(false);
  const [modalNoBarcode, setModalNoBarcode] = useState('');
  const barcodeInputRef = React.useRef(null);

  // 3. Fungsi handle juga di dalam sini supaya bisa akses set-state
  const handleConfirmLogout = () => {
    console.log("💣 [Security] Membakar total cache di tempat sebelum navigasi rute...");

    window.removeEventListener("storage", () => { });
    window.removeEventListener("profileUpdated", () => { });

    const savedIdleTime = localStorage.getItem('max_idle_time');

    const targetedItems = [
      'token', 'active_agen_id', 'kode_cabang', 'role_akses',
      'user_name', 'username', 'selected_pt', 'profile_kode_cabang', 'profileimage'
    ];

    targetedItems.forEach(item => {
      localStorage.removeItem(item);
      sessionStorage.removeItem(item);
    });

    // 3. Eksekusi clear total untuk memastikan sisa sampah lainnya lenyap
    localStorage.clear();
    sessionStorage.clear();

    if (savedIdleTime) {
      localStorage.setItem('max_idle_time', savedIdleTime);
      console.log("🛡️ [Security Engine] max_idle_time dipertahankan:", savedIdleTime);
    }

    // 4. Banting rute langsung ke login murni secara paksa menggunakan window global location replace
    // Metode .replace() akan menghapus history rute dashboard dari browser agar tidak bisa di-back!
    window.location.replace('/login');

  };

  // Fungsi fallback click di Sidebar.jsx
  const handleLogout = () => {
    const savedIdleTime = localStorage.getItem('max_idle_time');
    localStorage.clear();
    sessionStorage.clear();
    if (savedIdleTime) {
      localStorage.setItem('max_idle_time', savedIdleTime);
    }
    window.location.href = '/login';
  };

  // Fungsi untuk ambil data profile terbaru
  // ==============================================================
  // 🟢 REVISED FETCH PROFILE: MURNI DINAMIS & OPERASIONAL DAKOTA CARGO
  // ==============================================================
  // Helper pembentuk URL Gambar yang sama persis seperti di UserManagement / AccountPage
  const getProfileImageUrl = (rawPath) => {
    if (!rawPath || rawPath === 'null' || rawPath === 'undefined') return '';
    if (rawPath.startsWith('http')) return rawPath;

    const BASE_URL = window.location.origin;
    const cleanPath = rawPath.startsWith('/') ? rawPath : `/uploads/${rawPath}`;
    return `${BASE_URL}${cleanPath}`;
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const ptId = localStorage.getItem('selected_pt') || 'C'; // Default DLI
      const response = await api.get(`/profile?pt_id=${ptId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        const d = response.data.data ? response.data.data : response.data;

        let rawRole = (d.usertype || d.UserType || d.role_akses || localStorage.getItem('role_akses') || '').toString().trim().toUpperCase();
        let rawUsername = (d.username || d.Username || localStorage.getItem('user_name') || '').toString().trim().toLowerCase();

        let currentRole = 'U';
        if (rawRole === 'S' || rawRole === 'SUPERADMIN' || rawUsername.startsWith('super')) {
          currentRole = 'S';
        } else if (rawRole === 'A' || rawRole === 'ADMIN') {
          currentRole = 'A';
        }

        const imgRaw = d.profileimage || d.ProfileImage || d.profile_image || '';
        const validImgUrl = getProfileImageUrl(imgRaw);

        setUser({
          name: d.realname || d.real_name || d.username || localStorage.getItem('user_name') || 'Staff Dakota',
          email: d.email || localStorage.getItem('user_email') || 'staff@dakota.com',
          role: currentRole,
          division: d.kode_cabang || '',
          profileimage: validImgUrl
        });

        localStorage.setItem('role_akses', currentRole);
        if (d.realname) localStorage.setItem('user_name', d.realname);
        if (validImgUrl) localStorage.setItem('profileimage', validImgUrl);
      }
    } catch (error) {
      console.error("❌ Gagal fetch profile di sidebar:", error);
    }
  };

  useEffect(() => {
    fetchProfile();
    // Re-fetch saat pindah halaman agar foto selalu update
    const handleUpdate = () => {
      fetchProfile(); // Pastikan fungsi fetch data user kamu namanya ini

      const cachedImage = localStorage.getItem('profileimage');
      if (cachedImage) {
        setUser(prev => ({ ...prev, profileimage: cachedImage }));
      }
    };
    // Pasang telinga buat dengerin alarm "profileUpdated"
    window.addEventListener("profileUpdated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("profileUpdated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);


  const toggleMenu = (menuName, level = 1) => {
    setOpenMenus(prev => {
      // Jika Klik Menu Utama (Master, Settings, dll)
      if (level === 1) {
        // Jika sudah buka, tutup semua. Jika belum, buka ini saja (Single-open level 1)
        return prev[menuName] ? {} : { [menuName]: true };
      }

      // Jika Klik Sub-Menu (Tarif, dll)
      // Kita pakai ...prev supaya Parent (Master) TIDAK tertutup
      return {
        ...prev,
        [menuName]: !prev[menuName]
      };
    });
  };

  // Auto-focus kursor saat modal pop-up cetak SP menyala terbuka
  useEffect(() => {
    if (showPrintModal && printInputRef.current) {
      setTimeout(() => printInputRef.current.focus(), 100);
    }
  }, [showPrintModal]);

  const executeQuickPrint = (e) => {
    if (e) e.preventDefault();
    if (!modalNoSP.trim()) return;

    // Buka tab baru khusus pencetakan agar halaman utama tidak hilang!
    window.open(`/operasional/sp-terima/print-nota/${modalNoSP.trim().toUpperCase()}`, '_blank');
    setShowPrintModal(false);
    setModalNoSP('');
  };

  // ✅ Tambahkan fungsi handler ini agar form onSubmit punya mesin penggerak:
  const executeQuickPrintBTT = (e) => {
    if (e) e.preventDefault();
    if (!modalNoBTT.trim()) return;

    // Membuka tab baru mengarah langsung ke engine cetak bawaan Go lu bray!
    window.open(`/marketing/btt/print?id=${modalNoBTT.trim().toUpperCase()}`, '_blank');

    // Reset state dan tutup modal
    setShowBttPrintModal(false);
    setModalNoBTT('');
  };

  // Auto-focus kursor saat modal BTT dinyalakan operator
  useEffect(() => {
    if (showBttPrintModal && bttInputRef.current) {
      setTimeout(() => bttInputRef.current.focus(), 100);
    }
  }, [showBttPrintModal]);

  const executeQuickPrintBarcode = (e) => {
    if (e) e.preventDefault();
    if (!modalNoBarcode.trim()) return;

    // 🚀 Buka tab baru murni langsung mengarah ke rute cetak barcode koli backend bawaan lu!
    window.open(`/marketing/btt/print-barcode?id=${modalNoBarcode.trim().toUpperCase()}`, '_blank');

    // Reset state dan tutup gerbang modal
    setShowBarcodePrintModal(false);
    setModalNoBarcode('');
  };

  // Efek auto-focus instan begitu laser scanner siap bekerja
  useEffect(() => {
    if (showBarcodePrintModal && barcodeInputRef.current) {
      setTimeout(() => barcodeInputRef.current.focus(), 100);
    }
  }, [showBarcodePrintModal]);


  const allMenus = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['S', 'A', 'SPV', 'U'] },
    // { name: 'Akun', icon: <Users size={20} />, roles: ['S', 'A'], division: 'Finance' },

    {
      name: 'Master',
      icon: <Database size={20} />,
      roles: ['S', 'A'],
      children: [
        { name: 'Area Customer', path: '/master/area-customer', roles: ['S', 'A'] },
        { name: 'Agen', path: '/master/master-agen', roles: ['S', 'A'] },
        { name: 'Area Loper', path: '/master/master-area-loper', roles: ['S', 'A'] },
        { name: 'Area Tidak Dilayani', path: '/master/master-area-tidak-dilayani', roles: ['S', 'A'] },
        { name: 'Harga Perwilayah', path: '/master/master-harga-perwilayah', roles: ['S', 'A'] },
        { name: 'Divice Karyawan', path: '/master/master-device-karyawan', roles: ['S', 'A'] },
        { name: 'Monitoring Lokasi Karyawan', path: '/master/monitoring-karyawan', roles: ['S', 'A'] },
        { name: 'Kendaraan', path: '/master/master-kendaraan', roles: ['S', 'A'] },
        { name: 'Perawatan Kendaraan', path: '/master/perawatan-kendaraan', roles: ['S', 'A'] },
        { name: 'Sewa Kendaraan', path: '/master/master-sewa-kendaraan', roles: ['S', 'A'] },
        { name: 'Kode Pos', path: '/master/master-kodepos' },
        { name: 'Koordinator Wilayah', path: '/master/master-korwil', roles: ['S', 'A'] },
        { name: 'Lead Time Customer', path: '/master/master-leadtime-customer', roles: ['S', 'A'] },
        { name: 'Master Customer New', path: '/master/master-customer-new', roles: ['S', 'A'] },
        { name: 'Sopir', path: '/master/master-sopir' },
        { name: 'Trayek', path: '/master/master-trayek', roles: ['S', 'A'] },
        {
          name: 'Tarif',
          icon: <Truck size={18} />,
          children: [
            { name: 'Tarif Carter', path: '/master/tarif-carter' },
            // { name: 'Tarif Handling', path: '/settings/general-ledger' },
            { name: 'Tarif Paket Customer', path: '/master/tarif-customer' },
            { name: 'Tarif Handling Propinsi', path: '/master/tarif-handling-propinsi' },
            { name: 'Tarif Paket', path: '/master/tarif-paket' },
            // { name: 'Tarif Paket Kurir', path: '/settings/marketing' },
            { name: 'Tarif Paket Ekonomis', path: '/master/tarif-ekonomis' },
            { name: 'Tarif Paket Umum', path: '/master/tarif-umum' },
            // { name: 'Tarif Transit', path: '/settings/account' },
            { name: 'Tarif Unit', path: '/master/tarif-unit' },
            { name: 'Jenis Kendaraan Carter', path: '/master/jenis-kendaraan-carter' },
            { name: 'Master Vendor', path: '/master/master-vendor' },
          ]

        },
      ]
    },

    {
      name: 'Operasional',
      icon: <HandCoins size={20} />,
      roles: ['S', 'A'],
      children: [
        { name: 'BTT Gagal Berhasil Loper - Admin', path: '/operasional/surat-kembali-btt', roles: ['S', 'A'] },
        { name: 'BTT Gagal Berhasil Loper', path: '/operasional/hasil-loper', roles: ['S', 'A'] },
        // { name: 'Komisi Borongan', path: '/operasional/master-area-loper', roles: ['S', 'A'] },
        { name: 'Inventory Barang Customer', path: '/operasional/inventory-customer', roles: ['S', 'A'] },
        {
          name: 'Laporan',
          icon: <FileArchive size={20} />,
          roles: ['S', 'A'],
          children: [
            { name: 'Laporan LSBP', path: '/operasional/laporan-lsbp', roles: ['S', 'A'] },
            { name: 'Laporan LSBP V2', path: '/operasional/laporan-lsbp-v2', roles: ['S', 'A'] },
            { name: 'Laporan Barang Turun', path: '/operasional/laporan-barang-turun', roles: ['S', 'A'] },
            { name: 'Laporan BTT Belum Kembali', path: '/operasional/laporan-btt-belum-kembali', roles: ['S', 'A'] },
            { name: 'Laporan Data Penerima Customer', path: '/operasional/laporan-data-penerima-customer', roles: ['S', 'A'] },
            { name: 'Laporan Pendapatan Operasional', path: '/operasional/laporan-pendapatan-operasional', roles: ['S', 'A'] }
          ]
        },
        { name: 'Loading Barang', path: '/operasional/loading-barang', roles: ['S', 'A'] },
        // { name: 'Loading Unloading Barang', path: '/operasional/divice-karyawan', roles: ['S', 'A'] },
        { name: 'Loper', path: '/operasional/loper', roles: ['S', 'A'] },
        { name: 'BTT Melewati Tengat Waktu', path: '/operasional/loper-deadline', roles: ['S', 'A'] },
        { name: 'Pembongkaran Barang', path: '/operasional/pembongkaran-barang', roles: ['S', 'A'] },

        { name: 'Pengeluaran Inventory Customer', path: '/operasional/pengeluaran-inventory-customer', roles: ['S', 'A'] },

        {
          name: 'Pengambilan ',
          icon: <Route size={18} />,
          children: [
            { name: 'Barang Sendiri', path: '/pengambilan/barang-sendiri', roles: ['S', 'A'] },
            { name: 'Pengambilan Retur', path: '/pengambilan/pengambilan-retur', roles: ['S', 'A'] },
          ]
        },
        {
          name: 'Pengembalian',
          icon: <GitCompareArrows size={18} />,
          children: [
            { name: 'Pengembalian BTT', path: '/operasional/pengembalian-btt', roles: ['S', 'A'] },
            { name: 'Pengembalian Barang Retur', path: '/operasional/pengembalian/barang-retur', roles: ['S', 'A'] },
          ]
        },
        { name: 'Pengisian BBM', path: '/operasional/pengisian-bbm', roles: ['S', 'A'] },
        { name: 'Surat Tugas Supir', path: '/operasional/surat-tugas', roles: ['S', 'A'] },
        { name: 'Surat Muatan Udara', path: '/operasional/surat-muatan-udara', roles: ['S', 'A'] },
        {
          name: 'Surat Pengantar',
          icon: <ClipboardPen size={18} />,
          children: [
            { name: 'Cetak Surat Pengiriman', path: '/operasional/cetak-surat-pengiriman', roles: ['S', 'A'] },
            { name: 'Surat Pengantar - Pengiriman', path: '/operasional/surat-pengantar-pengiriman', roles: ['S', 'A'] },
            { name: 'Surat Pengantar - SP PAD', path: '/operasional/surat-pengantar-sp-pad', roles: ['S', 'A'] },
            { name: 'Surat Pengantar - Turun', path: '/operasional/surat-pengantar-turun', roles: ['S', 'A'] },
          ]
        },
        {
          name: 'Stok',
          icon: <LayersPlus size={18} />,
          children: [
            { name: 'Stok Barang Gudang', path: '/operasional/stok/stok-barang-gudang', roles: ['S', 'A'] },
            { name: 'Stok Inventory Barang Customer', path: '/operasional/surat-pengantar-sp-pad', roles: ['S', 'A'] },
          ]
        },
        { name: 'Voucher BBM', path: '/operasional/voucher-bbm', roles: ['S', 'A'] },
      ]
    },

    {
      name: 'Marketing',
      icon: <TrendingUp size={20} />,
      roles: ['S', 'A'],
      division: 'Marketing',
      children: [
        // { name: 'Dasboard', path: '/marketing/dashboard', roles: ['S'] },
        { name: 'Master Customer', path: '/marketing/master-customer', roles: ['S'] },
        { name: 'Bukti Tanda Terima(BTT)', path: '/marketing/btt', roles: ['S'] },
        { name: 'Bebas Dari Biaya (Bdb) - Pengiriman', path: '/marketing/bdb' },
        { name: 'Cetak BTT / Resi', path: '#print-btt', roles: ['S'] },
        { name: 'Cetak Barcode Koli', path: '#print-barcode', roles: ['S'] },
        { name: 'Closing Harian Agen', path: '/marketing/closing-harian', roles: ['S'] },
        { name: 'Monitoring BTT', path: '/marketing/monitoring-btt', roles: ['S'] },
        {
          name: 'Laporan',
          icon: <Backpack size={18} />,
          children: [
            { name: 'Hasil Penjualan Btt Counter / Agen', path: '/laporan/hasil-penjualan', roles: ['S'] },
            { name: 'Penjualan Btt Harian', path: '/laporan/penjualan-harian' },
            { name: 'Btt Belum Dibuat Laporan Penjualan', path: '/laporan/btt-belum-dibuat', roles: ['S'] },
            { name: 'Penjualan', path: '/laporan/penjualan' },
            { name: 'Btt Kirim Outstanding', path: '/laporan/btt-outstanding', roles: ['S'] },
            { name: 'Perjalanan Btt', path: '/laporan/perjalanan-btt' },
            { name: 'Penjualan Dan Penerimaan', path: '/laporan/penjualan-penerimaan', roles: ['S'] },
            { name: 'Laporan Omset Penjualan', path: '/laporan/omset-penjualan' },
            { name: 'Monitoring Btt', path: '/laporan/monitoring-btt', roles: ['S'] },
          ]
        },
        {
          name: 'Pengajuan Khusus',
          icon: <Truck size={18} />,
          roles: ['S'],
          children: [
            { name: 'Asuransi', path: '/pengajuan/asuransi', roles: ['S'] },
            { name: 'Order Jemput', path: '/pengajuan/order-jemput' },
            { name: 'Packing', path: '/pengajuan/packing' },
          ]
        },
        {
          name: 'Penerimaan',
          icon: <Truck size={18} />,
          path: '', roles: ['S'],
          children: [
            { name: 'Btt Kembali', path: '/penerimaan/btt-kembali', roles: ['S'] },
            { name: 'Btt / Barang Retur', path: '/penerimaan/btt-retur' },
            { name: 'Penerimaan Pembayaran Kasir', path: '/penerimaan/pembayaran-kasir' },
            { name: 'Pengembalian Surat Jalan Customer', path: '/penerimaan/pengembalian-surat-jalan', roles: ['S'] },
            { name: 'Setoran Penjualan Tunai', path: '/penerimaan/setoran-penjualan' },
          ]
        },
        { name: 'Pengembalian Surat Jalan Customer', path: '/marketing/pengembalian-surat-jalan-customer', roles: ['S'] },
        { name: 'Upload CSV', path: '/marketing/upload-csv' },
        { name: 'Proses Packing', path: '/marketing/proses-packing', roles: ['S'] },
        { name: 'Pengemasan Barang Kurir', path: '/marketing/pengemasan-barang-kurir' },
        { name: 'Customer - Upload CSV', path: '/marketing/customer-upload-csv', roles: ['S'] },
      ]

    },

    {
      name: 'Hutang',
      icon: <ReceiptPoundSterling size={20} />,
      roles: ['S', 'A'],
      division: 'Finance',
      children: [
        { name: 'Aging Hutang', path: '/aging-hutang', roles: ['S', 'A'], division: 'Finance' },
        { name: 'Invoice Vendor', path: '/invoice-vendor', roles: ['S', 'A'], division: 'Finance' },
      ],
    },

    {
      name: 'Piutang',
      icon: <DollarSign size={20} />,
      roles: ['S', 'A'],
      division: 'Finance',
      children: [
        { name: 'Aging Piutang', path: '/agingpiutang', roles: ['S'] },
        { name: 'Approval Customer', path: '/approval-customer', roles: ['S'] },
        { name: 'Bukti Tanda Terima (BTT) - Tagih Turun', path: '/BTTTagihTujuan', roles: ['S'] },
        { name: 'Credit Note', path: '/credit-note', roles: ['S'] },
        { name: 'Invoice', path: '/invoice', roles: ['S'] },
        { name: 'Kondisi BTT dan Order Jemput', path: '/kondisi-btt', roles: ['S'] },
        { name: 'Master Faktur Pajak', path: '/faktur-pajak', roles: ['S'] },
        { name: 'Mutasi Piutang', path: '/mutasi-piutang', roles: ['S'] },
        { name: 'Penagihan invoide oleh Kolekter', path: '/tagih-invoice', roles: ['S'] },
        { name: 'Pencairan Giro Mundur Kredit', path: '/pencairan-giro', roles: ['S'] },
        { name: 'Penerimaan Pembayaran', path: '/penerimaan-pembayaran', roles: ['S'] },
        { name: 'Penerimaan Penagihan Kolektor', path: '/penerimaan-penagihan-kolektor', roles: ['S'] },
        { name: 'Penerimaan Setoran Agen', path: '/penerimaan-setoran-agen', roles: ['S'] },
        { name: 'Proforma Invoice', path: '/proforma-invoice', roles: ['S'] },
        { name: 'Proses Piutang', path: '/proses-piutang', roles: ['S'] },
        { name: 'Revisi Btt Apl (Harga)', path: '/revisi-btt-apl', roles: ['S'] },
        { name: 'Saldo Awal Piutang', path: '/saldo-awal-piutang', roles: ['S'] },
        { name: 'Tukar Faktur', path: '/tukar-faktur', roles: ['S'] },
      ]
    },
    { name: 'Klaim', icon: <WalletMinimal size={20} />, roles: ['S', 'A'], division: 'Finance' },

    {
      name: 'General Ledger',
      icon: <Book size={20} />,
      roles: ['S', 'A'],
      children: [
        // { name: 'Cek Jurnal', path: '#', roles: ['S'] },
        { name: 'Cek Jurnal Tidak Seimbang', path: '/general-ledger/jurnal-tidak-seimbang' },
        {
          name: 'Cetak',
          icon: <Printer size={18} />,
          children: [
            { name: 'Cetak Buku Besar', path: '/general-ledger/cetak-buku-besar', roles: ['S'] },
            { name: 'Cetak Neraca Saldo', path: '/general-ledger/cetak-neraca-saldo', roles: ['S'] },
            { name: 'Cetak Neraca', path: '/general-ledger/cetak-neraca', roles: ['S'] },
            { name: 'Cetak Rugi Laba', path: '/general-ledger/cetak-rugi-laba', roles: ['S'] },
            { name: 'Cetak Posisi Keuangan', path: '/general-ledger/cetak-posisi-keuangan', roles: ['S'] },
            { name: 'Cetak Rugi Laba Komprehensif', path: '/general-ledger/cetak-rugi-laba-komprehensif', roles: ['S'] }
          ]
        },
        {
          name: 'Daftar',
          icon: <List size={18} />,
          roles: ['S'],
          children: [
            { name: 'Daftar Bank', path: '/general-ledger/daftar-bank', roles: ['S'] },
            { name: 'Daftar Pemasukan & Pengeluaran', path: '/general-ledger/daftar-pemasukan-pengeluaran', roles: ['S', 'A'] },
            { name: 'Daftar Kelompok Perkiraan', path: '/general-ledger/daftar-kelompok-perkiraan', roles: ['S', 'A'] },
            { name: 'Daftar Kode Perkiraan', path: '/general-ledger/daftar-kode-perkiraan', roles: ['S', 'A'] },
            { name: 'Daftar SGU', path: '/general-ledger/daftar-sgu', roles: ['S', 'A'] },
            { name: 'Daftar Akun Piutang Setoran', path: '/general-ledger/daftar-akun-piutang-setoran', roles: ['S', 'A'] },
          ]
        },
        { name: 'Insentif Loper', path: '/general-ledger/insentif-loper', roles: ['S', 'A'] },
        { name: 'Jurnal', path: '/general-ledger/jurnal', roles: ['S', 'A'] },
        { name: 'Komisi Sopir', path: '/general-ledger/komisi-sopir', roles: ['S', 'A'] },
        { name: 'Kas Masuk / Keluar', path: '/general-ledger/kas-masuk-keluar', roles: ['S', 'A'] },
        { name: 'Pembayaran Vendor', path: '/general-ledger/pembayaran-vendor', roles: ['S', 'A'] },
        { name: 'Posting Jurnal', path: '/general-ledger/posting-jurnal', roles: ['S', 'A'] },
        { name: 'Setoran COD', path: '/general-ledger/setoran-cod', roles: ['S', 'A'] },

        // { name: 'Posting Pembukuan Akhir Bulan', path: '#' },
        // { name: 'Setoran Cod', path: '#' },
        // { name: 'Unposting Pembukuan Akhir Bulan', path: '#' },
        // { name: 'Insentif Loper', path: '#' },
      ]
    },
    { name: 'HRD', icon: <Briefcase size={20} />, roles: ['S', 'A'], division: 'HRD' },


    // MENU SETTINGS DENGAN CHILDREN


    {
      name: 'Settings',
      icon: <Settings size={20} />,
      roles: ['S', 'A'],
      children: [
        { name: 'Manajemen User', path: '/settings/users', roles: ['S'] },
        { name: 'Manajemen Configurasi', path: '/settings/configurasi' },
        { name: 'Security Settings', path: '/settings/security' },
      ]
    },
  ];


  // 🎯 PENJARING MENU MULTI-LEVEL DENGAN HAK AKSES SUPERADMIN UNLIMITED
  const currentUsernameLower = (user.name || localStorage.getItem('user_name') || '').toLowerCase();
  const isSuperAdmin = user.role === 'S' || user.role === 'Superadmin' || currentUsernameLower.startsWith('super');

  const filteredMenus = allMenus
    .filter(menu => {
      // 👑 JIKA SUPERADMIN: Loloskan seluruh menu tanpa syarat!
      if (isSuperAdmin) return true;
      return menu.roles && menu.roles.includes(user.role);
    })
    .map(menu => {
      // 👑 JIKA SUPERADMIN: Loloskan seluruh sub-menu (children) tanpa disaring!
      if (isSuperAdmin) {
        return menu;
      }

      if (menu.children) {
        return {
          ...menu,
          children: menu.children.filter(child =>
            !child.roles || child.roles.includes(user.role)
          )
        };
      }
      return menu;
    });


  return (
    <div className={`transition-all duration-300 border-r flex flex-col h-screen sticky top-0 z-40 ${isCollapsed ? 'w-24' : 'w-72'} ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>

      {/* Logo & Toggle */}
      <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && <img src={DakotaLogo} alt="Logo" className="h-9 w-auto" />}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-slate-500 hover:bg-gray-100'}`}>
          <Menu size={24} />
        </button>
      </div>

      {/* Menu List */}
      <nav className={`flex-1 px-4 space-y-2 mt-4 overflow-y-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {filteredMenus.map((item, index) => {
          const hasChildren = item.children && item.children.length > 0;
          const isOpen = openMenus[item.name];

          return (
            <div key={index}>
              {hasChildren ? (
                <div
                  onClick={() => toggleMenu(item.name, 1)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all
                    ${isOpen ? (isDarkMode ? 'bg-gray-700 text-indigo-400' : 'bg-slate-50 text-indigo-600') : (isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-slate-500 hover:bg-slate-50')}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">{item.icon}</div>
                    {!isCollapsed && <span className="font-semibold text-[15px]">{item.name}</span>}
                  </div>
                  {!isCollapsed && (
                    <ChevronRight
                      size={16}
                      className={`transition-transform duration-200 ${isOpen ? 'rotate-90 text-indigo-600' : 'opacity-40'}`}
                    />
                  )}
                </div>
              ) : (
                /* LEVEL 1: Menu Tunggal (Dashboard, dll) */
                <NavLink
                  to={item.name === 'Dashboard' ? '/dashboard' : `/${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setOpenMenus({})}
                  className={({ isActive }) => `
                    flex items-center group relative px-4 py-3 rounded-xl transition-all
                    ${isActive ? 'bg-indigo-600 text-white shadow-lg' : (isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-slate-500 hover:bg-slate-50')} 
                    ${isCollapsed ? 'justify-center' : 'justify-between'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">{item.icon}</div>
                    {!isCollapsed && <span className="font-semibold text-[15px]">{item.name}</span>}
                  </div>
                </NavLink>
              )}

              {/* RENDER CHILD MENU (Level 2 & Level 3) */}
              {!isCollapsed && hasChildren && isOpen && (
                <div className={`ml-10 mt-2 space-y-1 border-l-2 pl-4 animate-in fade-in slide-in-from-top-1 ${isDarkMode ? 'border-gray-600' : 'border-indigo-50'}`}>
                  {item.children.map((child, idx) => {
                    const hasSubChildren = child.children && child.children.length > 0;
                    const isSubOpen = openMenus[child.name];

                    // 🛑 JIKA LEVEL 2 ADALAH TOMBOL INTERSEPT POP-UP POLOS (Kunci Utama!)
                    if (child.path && child.path.includes('#print-btt')) {
                      return (
                        <button
                          key={`child-btn-btt-${idx}`}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            console.log("🔥 [INTERCEPT] Menyalakan modal BTT secara paksa!");
                            setShowBttPrintModal(true); // 👑 Ini saklar utama penyala modal bray!
                          }}
                          className="w-full text-left block py-2 px-3 text-sm rounded-lg transition-all font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 font-sans"
                        >
                          {child.name}
                        </button>
                      );
                    }

                    // 🚨 INTERSEPT 3: LOGIKA PENCEGATAN MENU CETAK BARCODE KOLI MURNI
                    if (child.path && child.path.includes('#print-barcode')) {
                      return (
                        <button
                          key={`child-btn-barcode-${idx}`}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            console.log("🔥 [INTERCEPT] Menyalakan modal Barcode Koli secara paksa!");
                            setShowBarcodePrintModal(true); // 👑 Nyalakan saklar modal barcode!
                          }}
                          className="w-full text-left block py-2 px-3 text-sm rounded-lg transition-all font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 font-sans"
                        >
                          {child.name}
                        </button>
                      );
                    }

                    return (
                      <div key={`child-group-${idx}`} className="flex flex-col">
                        {hasSubChildren ? (
                          /* =========================================================================
                             📂 LEVEL 2 YANG MEMILIKI ANAK LAGI (Contoh: Surat Pengantar)
                             ========================================================================= */
                          <>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMenu(child.name, 2);
                              }}
                              className={`flex items-center justify-between py-2 px-3 text-sm rounded-lg cursor-pointer transition-all font-medium
                ${isSubOpen
                                  ? (isDarkMode ? 'text-indigo-400 font-bold bg-gray-700/50' : 'text-indigo-600 font-black bg-indigo-50/50')
                                  : (isDarkMode ? 'text-gray-300 hover:text-indigo-400 hover:bg-gray-700/30' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50')
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                {child.icon ? <div className="flex-shrink-0">{child.icon}</div> : <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40 ml-1" />}
                                <span>{child.name}</span>
                              </div>
                              <ChevronRight
                                size={14}
                                className={`transition-transform duration-200 ${isSubOpen ? 'rotate-90 text-indigo-600' : 'opacity-40'}`}
                              />
                            </div>

                            {/* 📂 LEVEL 3: LOOPING UTK CUCU MENU DI DALAM SUB-MENU */}
                            {isSubOpen && (
                              <div className="ml-4 mt-1 space-y-1 border-l border-dashed pl-4">
                                {child.children.map((subChild, subIdx) => {
                                  // 🔥 BERIKAN PROTEKSI INTERSEPT LEVEL 3 JIKA ADA JALUR '#' DI DALAM SUB-CHILDREN
                                  if (subChild.path === '#') {
                                    return (
                                      <button
                                        key={`sub-child-btn-${subIdx}`}
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setShowPrintModal(true); // Amankan pemicu modal pop-up dari dalam grup!
                                        }}
                                        className="w-full text-left block py-1.5 px-3 text-[13px] rounded-md transition-all font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-100 font-sans"
                                      >
                                        {subChild.name}
                                      </button>
                                    );
                                  }

                                  return (
                                    <NavLink
                                      key={`sub-child-nav-${subIdx}`}
                                      to={subChild.path}
                                      className={({ isActive }) => `
                          block py-1.5 px-3 text-[13px] rounded-md transition-all font-medium
                          ${isActive
                                          ? (isDarkMode ? 'text-indigo-400 bg-gray-700/60 font-bold' : 'text-indigo-600 bg-indigo-50/60 font-black')
                                          : (isDarkMode ? 'text-gray-300 hover:text-indigo-400 hover:bg-gray-700/30' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100')
                                        }
                        `}
                                    >
                                      {subChild.name}
                                    </NavLink>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        ) : (
                          /* =========================================================================
                             🔗 LEVEL 2 STANDAR (NavLink Biasa Tanpa Anak)
                             ========================================================================= */
                          <NavLink
                            to={child.path}
                            className={({ isActive }) => `
                block py-2 px-3 text-sm rounded-lg transition-all font-medium
                ${isActive
                                ? (isDarkMode ? 'text-indigo-400 font-bold bg-gray-700/60' : 'text-indigo-600 font-black bg-indigo-50')
                                : (isDarkMode ? 'text-gray-300 hover:text-indigo-400 hover:bg-gray-700/30' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50')
                              } 
              `}
                          >
                            {child.name}
                          </NavLink>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {/* END RENDER CHILD MENU (Level 2 & Level 3) */}
            </div> // Penutup <div key={index}>
          ); // Penutup return
        })}
      </nav >

      {/* User Profile Section */}
      < div className={`p-4 border-t transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-50/50 border-gray-100'}`}>
        <NavLink to="/account" className="no-underline">
          {({ isActive }) => (
            <div className={`flex items-center gap-3 rounded-2xl border transition-all p-2
              ${isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : (isDarkMode ? 'bg-gray-700 text-gray-300 border-gray-600 shadow-sm' : 'bg-white text-slate-500 border-gray-100 shadow-sm')}
              ${isCollapsed ? 'justify-center' : 'justify-between'}`}
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex-shrink-0 border-2 flex items-center justify-center font-bold overflow-hidden
                ${isActive ? 'bg-white text-indigo-600 border-indigo-400' : 'bg-sky-400 text-white border-white'}`}
              >
                {(localStorage.getItem('profileimage') || user.profileimage) ? (
                  <img
                    src={localStorage.getItem('profileimage') || user.profileimage}
                    alt="profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Jika URL rusak atau broken link, hancurkan src agar otomatis ke inisial huruf nama
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  // Ambil huruf pertama dari nama user yang sedang login aktif secara dinamis
                  user.name ? user.name.charAt(0).toUpperCase() : 'U'
                )}
              </div>

              {!isCollapsed && (
                <>
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <span className={`text-xs font-bold truncate ${isActive ? 'text-white' : (isDarkMode ? 'text-gray-200' : 'text-slate-800')}`}>{user.name}</span>
                    <span className={`text-[10px] truncate ${isActive ? 'text-indigo-100' : (isDarkMode ? 'text-gray-400' : 'text-slate-500')}`}>{user.email}</span>
                  </div>
                  {/* TOMBOL LOGOUT CUKUP SEPERTI INI */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setShowLogoutModal(true); // Cuma panggil perintah buka modal
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${isActive ? 'text-white hover:bg-indigo-500' : (isDarkMode ? 'text-red-400 hover:bg-gray-600' : 'text-red-500 hover:bg-red-50')}`}
                  >
                    <LogOut size={16} />
                  </button>
                </>
              )}
            </div>
          )}
        </NavLink>
      </div >

      {/* =========================================================================
          🏙️ MODAL POP-UP QUICK SCANNER PRINTER MANIFEST SP (LIGHT MODE HIGH QUALITY)
          ========================================================================= */}
      {
        showPrintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-6 flex flex-col relative">

              {/* Tombol Close Silang */}
              <button
                onClick={() => { setShowPrintModal(false); setModalNoSP(''); }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                ✕
              </button>

              <div className="text-center mb-5">
                <span className="bg-blue-600 text-white px-5 py-1.5 font-black text-xs rounded shadow-sm tracking-widest uppercase">
                  QUICK PRINT SCANNER SP
                </span>
              </div>

              <form onSubmit={executeQuickPrint} className="space-y-4 text-xs font-semibold">
                <div className="space-y-2">
                  <label className="block text-gray-400 uppercase tracking-wider text-[11px] font-bold text-center">
                    Tembak Barcode / Input Nomor SP:
                  </label>
                  <input
                    ref={printInputRef}
                    type="text"
                    maxLength={15}
                    placeholder="BZZZTT! Scan Barcode..."
                    value={modalNoSP}
                    onChange={(e) => setModalNoSP(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && executeQuickPrint()}
                    className="w-full p-3 border border-gray-300 rounded-xl bg-transparent outline-none uppercase font-black text-center text-sm tracking-widest text-blue-600 focus:border-blue-500 shadow-inner"
                  />
                  <p className="text-[9px] text-gray-400 italic text-center leading-relaxed">
                    Sistem otomatis membuka tab cetak baru tanpa menutup dashboard kerja aktif lu.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowPrintModal(false); setModalNoSP(''); }}
                    className="w-1/3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition uppercase tracking-wider text-[10px]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition uppercase tracking-wider text-[10px]"
                  >
                    Cetak Nota SP
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* =========================================================================
          🏙️ MODAL 2: KONFIRMASI CETAK RESI BTT MARKETING (PERSIS IMAGE_DBBD6B.PNG)
          ========================================================================= */}
      {showBttPrintModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 p-7 flex flex-col font-sans tracking-normal text-xs font-semibold text-slate-700">

            {/* Judul Modal Tegas */}
            <div className="text-center mb-5 border-b border-gray-100 pb-3">
              <h3 className="text-slate-900 font-black text-sm uppercase tracking-wider">
                KONFIRMASI CETAK RESI
              </h3>
            </div>

            <form onSubmit={executeQuickPrintBTT} className="space-y-4">
              <div className="flex flex-col gap-2 text-center">
                <label className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                  NOMOR RESI / BTT TERDETEKSI:
                </label>

                {/* Input Box yang Aktif & Bisa Diketik / Scan Laser Barcode */}
                <input
                  ref={bttInputRef}
                  type="text"
                  placeholder="Ketik / Scan Nomor BTT di sini..."
                  value={modalNoBTT}
                  onChange={(e) => setModalNoBTT(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && executeQuickPrintBTT()}
                  className="w-full p-3 border border-blue-200 rounded-xl bg-blue-50/30 text-center font-black text-blue-600 text-sm tracking-widest uppercase outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
                />

                <p className="text-[10px] text-gray-400 font-normal italic leading-relaxed px-4 mt-1">
                  Pastikan kertas thermal printer kasir counter Dakota sudah terpasang rapi sebelum menekan tombol print.
                </p>
              </div>

              {/* Action Button: CANCEL & PRINT NOW */}
              <div className="flex gap-3 pt-3 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setShowBttPrintModal(false);
                    setModalNoBTT('');
                  }}
                  className="w-1/3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold rounded-xl transition uppercase tracking-wider shadow-sm"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  🖨️ PRINT NOW
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* =========================================================================
          🏙️ MODAL 3: KONFIRMASI CETAK BARCODE KOLI (KEMBAR SIAM PREMIUM STYLE)
          ========================================================================= */}
      {showBarcodePrintModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 p-7 flex flex-col font-sans tracking-normal text-xs font-semibold text-slate-700">

            {/* Judul Modal Sesuai Mandat, Master! */}
            <div className="text-center mb-5 border-b border-gray-100 pb-3">
              <h3 className="text-slate-900 font-black text-sm uppercase tracking-wider">
                CETAK BARCODE KOLI
              </h3>
            </div>

            <form onSubmit={executeQuickPrintBarcode} className="space-y-4">
              <div className="flex flex-col gap-2 text-center">
                <label className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                  NOMOR RESI / BTT TERDETEKSI:
                </label>

                {/* Input Box Laser Scanner Koli */}
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Ketik / Scan Nomor BTT di sini..."
                  value={modalNoBarcode}
                  onChange={(e) => setModalNoBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && executeQuickPrintBarcode()}
                  className="w-full p-3 border border-blue-200 rounded-xl bg-blue-50/30 text-center font-black text-blue-600 text-sm tracking-widest uppercase outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
                />

                <p className="text-[10px] text-gray-400 font-normal italic leading-relaxed px-4 mt-1">
                  Pastikan kertas thermal printer kasir counter Dakota sudah terpasang rapi sebelum menekan tombol print.
                </p>
              </div>

              {/* Action Button */}
              <div className="flex gap-3 pt-3 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setShowBarcodePrintModal(false);
                    setModalNoBarcode('');
                  }}
                  className="w-1/3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold rounded-xl transition uppercase tracking-wider shadow-sm"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  🖨️ PRINT NOW
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL HARUS DI LUAR DIV SIDEBAR TAPI MASIH DI DALAM RETURN UTAMA */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </div >
  );
};

export default Sidebar;