import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import {
  LayoutDashboard, Users, Book, Briefcase,
  Database, TrendingUp, Truck, DollarSign,
  Settings, LogOut, ChevronRight, Menu, Backpack, ClipboardPen, HandCoins
} from 'lucide-react';
import DakotaLogo from '../../assets/new_logo 2.png';
import LogoutModal from './LogoutModal';
import { useDarkMode } from '../../context/DarkModeContext';
import api from '../api/axios';

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
  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const ptId = localStorage.getItem('selected_pt') || 'A';
      const response = await api.get(`/profile?pt_id=${ptId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 🌟 KUNCI EMAS: PostgreSQL langsung mengembalikan object di response.data murni!
      if (response.data) {
        const d = response.data;

        // Baca role penugasan (S = Superadmin, A = Admin, U = User)
        let backendRole = d.usertype || d.role_akses || localStorage.getItem('role_akses') || '';
        let currentRole = 'U'; // default fallback

        if (backendRole === 'S' || backendRole === 'Super Admin' || backendRole === 'Superadmin') {
          currentRole = 'S';
        } else if (backendRole === 'A' || backendRole === 'Admin') {
          currentRole = 'A';
        } else if (backendRole === 'V' || backendRole === 'Vendor') {
          currentRole = 'V';
        }

        setUser({
          // Menggunakan penamaan kolom database PostgreSQL riil milik Dakota Cargo
          name: d.realname || d.real_name || d.username || localStorage.getItem('user_name') || 'Staff Dakota',
          email: d.email || localStorage.getItem('user_email') || 'staff@dakota.com',
          role: currentRole, // Mengunci nilai 'S' murni agar menu tembus!
          division: d.kode_cabang || '',
          profileimage: d.profileimage || localStorage.getItem('profileimage') || ''
        });

        // Simpan standarisasi kode ke local storage browser untuk backup layout
        localStorage.setItem('role_akses', currentRole);
        localStorage.setItem('profile_kode_cabang', d.kode_cabang || '');
        if (d.realname) localStorage.setItem('user_name', d.realname);
        if (d.profileimage) localStorage.setItem('profileimage', d.profileimage);
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
    { name: 'General Ledger', icon: <Book size={20} />, roles: ['S', 'A'], division: 'Finance' },
    { name: 'HRD', icon: <Briefcase size={20} />, roles: ['S', 'A'], division: 'HRD' },
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

        {
          name: 'Upload CSV', path: '/upload-csv'
        },
        { name: 'Proses Packing', path: '/proses-packing', roles: ['S'] },
        { name: 'Pengemasan Barang Kurir', path: '/pengemasan-barang-kurir' },
        { name: 'Customer - Upload CSV', path: '/customer/upload-csv', roles: ['S'] },
      ]

    },
    {
      name: 'Master',
      icon: <Database size={20} />,
      roles: ['S', 'A'],
      children: [
        { name: 'Agen', path: '/master/master-agen', roles: ['S', 'A'] },
        { name: 'Area Loper', path: '/master/master-area-loper', roles: ['S', 'A'] },
        { name: 'Area Tidak Dilayani', path: '/settings/hrd' },
        { name: 'Divice Karyawan', path: '/settings/marketing' },
        { name: 'Kendaraan', path: '/settings/operasional' },
        { name: 'Sewa Kendaraan', path: '/settings/piutang' },
        { name: 'Kode Pos', path: '/master/master-kodepos' },
        { name: 'Koordinator Wilayah', path: '/settings/account' },
        { name: 'Sopir', path: '/settings/account' },
        { name: 'Trayek', path: '/settings/account' },
        {
          name: 'Tarif',
          icon: <Truck size={18} />,
          children: [
            { name: 'Tarif Carter', path: '/master/master-agen', roles: ['S', 'A'] },
            { name: 'Tarif Handling', path: '/settings/general-ledger' },
            { name: 'Tarif Paket Customer', path: '/settings/hrd' },
            { name: 'Tarif Paket Kurir', path: '/settings/marketing' },
            { name: 'Tarif Paket Ekonomis', path: '/master/tarif-ekonomis' },
            { name: 'Tarif Paket Umum', path: '/master/tarif-umum' },
            { name: 'Tarif Transit', path: '/settings/account' },
            { name: 'Tarif Unit', path: '/master/tarif-unit' },
          ]

        },
      ]
    },


    {
      name: 'Operasional',
      icon: <HandCoins size={20} />,
      roles: ['S', 'A'],
      children: [
        { name: 'BTT Gagal Berhasil Loper', path: '/operasional/surat-kembali-btt', roles: ['S', 'A'] },
        { name: 'Komisi Borongan', path: '/operasional/master-area-loper', roles: ['S', 'A'] },
        { name: 'Laporan', path: '/operasional/area-tidak-dilayani', roles: ['S', 'A'] },
        { name: 'Loading Unloading Barang', path: '/operasional/divice-karyawan', roles: ['S', 'A'] },
        { name: 'Loper', path: '/operasional/loper', roles: ['S', 'A'] },
        { name: 'Pengambilan ', path: '/operasional/sewa-kendaraan', roles: ['S', 'A'] },
        { name: 'Pengembalian', path: '/operasional/kode-pos', roles: ['S', 'A'] },
        { name: 'Pengisian BBM', path: '/operasional/account', roles: ['S', 'A'] },
        { name: 'Sewa Kendaraan', path: '/operasional/account', roles: ['S', 'A'] },
        { name: 'Setok Barang Gudang', path: '/operasional/account', roles: ['S', 'A'] },
        { name: 'Rekap Stok Barang Gudang', path: '/operasional/account', roles: ['S', 'A'] },
        { name: 'Surat Muatan Udara', path: '/operasional/account', roles: ['S', 'A'] },
        {
          name: 'Surat Pengantar',
          icon: <ClipboardPen size={18} />,
          children: [
            { name: 'Cetak Surat Pengiriman', path: '#', roles: ['S', 'A'] },
            { name: 'Surat Pengantar - Pengiriman', path: '/operasional/surat-pengantar-pengiriman', roles: ['S', 'A'] },
            { name: 'Surat Pengantar - SP PAD', path: '/operasional/surat-pengantar-sp-padx`', roles: ['S', 'A'] },
            { name: 'Surat Pengantar - Turun`', path: '/operasional/surat-pengantar-turun', roles: ['S', 'A'] },
          ]
        },
        { name: 'Surat Tugas', path: '/operasional/account', roles: ['S', 'A'] },
        { name: 'Tarif Komisi Super', path: '/operasional/account', roles: ['S', 'A'] },
        { name: 'Voucher BBM', path: '/operasional/account', roles: ['S', 'A'] },
      ]
    },




    { name: 'Piutang', icon: <DollarSign size={20} />, roles: ['S', 'A'], division: 'Finance' },

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

  // const filteredMenus = allMenus.filter(menu => {
  //   //if (user.role === 'S' || user.role === 'A') return menu.roles.includes(user.role);
  //   if (user.role === 'S') return true; // Superadmin lihat semua menu
  //   if (user.role === 'A') return menu.roles.includes('A'); // Admin lihat menu yang untuk Admin  
  //   return menu.name === 'Dashboard' || menu.division === user.division;
  // });

  const filteredMenus = allMenus
    .filter(menu => menu.roles.includes(user.role)) // Filter level atas
    .map(menu => {
      if (menu.children) {
        // Filter children berdasarkan role user
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