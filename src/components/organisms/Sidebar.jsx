import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { 
  LayoutDashboard, Users, Book, Briefcase, 
  Database, TrendingUp, Truck, DollarSign, 
  Settings, LogOut, ChevronRight, Menu, Backpack
} from 'lucide-react';
import DakotaLogo from '../../assets/new_logo 2.png';
import axios from 'axios';
import LogoutModal from './LogoutModal';
import { useDarkMode } from '../../context/DarkModeContext';

  const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
      // Tambahkan state ini di bawah state user kamu
      const { isDarkMode } = useDarkMode();
      const [openMenus, setOpenMenus] = useState({});
      const [showLogoutModal, setShowLogoutModal] = useState(false);
      const navigate = useNavigate();
      const location = useLocation();
      const [user, setUser] = useState({ name: '', email: '', role: '', division: '', profileimage: '' });

  // 3. Fungsi handle juga di dalam sini supaya bisa akses set-state
  const handleConfirmLogout = () => {
    console.log("💣 [Security] Membakar total cache di tempat sebelum navigasi rute...");
    
    window.removeEventListener("storage", () => {});
    window.removeEventListener("profileUpdated", () => {});

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
      const response = await axios.get(`http://localhost:8080/api/profile?pt_id=${ptId}`, {
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


  const allMenus = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['S', 'A', 'SPV', 'U'] },
    // { name: 'Akun', icon: <Users size={20} />, roles: ['S', 'A'], division: 'Finance' },
    { name: 'General Ledger', icon: <Book size={20} />, roles: ['S', 'A'], division: 'Finance' },
    { name: 'HRD', icon: <Briefcase size={20} />, roles: ['S', 'A'], division: 'HRD' },
    { 
      name: 'Master', 
      icon: <Database size={20} />, 
      roles: ['S', 'A'],
      children: [
        { name: 'Agen', path: '/master/master-agen', roles: ['S', 'A'] },
        { name: 'Area Loper', path: '/settings/general-ledger' },
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
      name: 'Marketing', 
      icon: <TrendingUp size={20} />, 
      roles: ['S', 'A'], 
      division: 'Marketing',
      children: [
        { name: 'Dasboard', path: '/marketing/dashboard', roles: ['S'] },
        { name: 'Master Customer', path: '/marketing/master-customer', roles: ['S'] },
        { name: 'Bukti Tanda Terima(BTT)', path: '/marketing/btt', roles: ['S'] },
        { name: 'Bebas Dari Biaya (Bdb) - Pengiriman', path: '/marketing/bdb' },
        { name: 'Cetak Btt / Resi', path: '/marketing/cetak-btt', roles: ['S'] },
        { name: 'Cetak Barcode Koli', path: '/marketing/cetak-barcode' },
        { name: 'Closing Harian Agen', path: '/marketing/closing-harian', roles: ['S'] },
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
          name: 'Upload CSV', path: '/upload-csv' },
        { name: 'Proses Packing', path: '/proses-packing', roles: ['S'] },
        { name: 'Pengemasan Barang Kurir', path: '/pengemasan-barang-kurir' },  
        { name: 'Customer - Upload CSV', path: '/customer/upload-csv', roles: ['S'] },                                            
      ]
    
    },
    { name: 'Operasional', icon: <Truck size={20} />, roles: ['S', 'A'], division: 'Operasional' },
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

            return (
              <div key={idx} className="flex flex-col">
                {hasSubChildren ? (
                  /* LEVEL 2: Sub-menu yang punya anak lagi (Tarif) */
                  // Render Label untuk Sub-Sub-Menu (Level 2 yang punya anak)
                  <>
                    <div 
                        onClick={(e) => {
                          e.stopPropagation(); // Biar kliknya nggak nembus ke Master Data
                          toggleMenu(child.name, 2); 
                        }}
                        className={`flex items-center justify-between py-2 px-3 text-sm rounded-lg cursor-pointer transition-all
                          ${isSubOpen ? 'text-indigo-600 font-bold bg-indigo-50/50' : (isDarkMode ? 'text-gray-400 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-500')}`}
                      >
                                        <div className="flex items-center gap-2">
                          {/* Render icon sub-menu kalau ada */}
                          {child.icon ? <div className="flex-shrink-0">{child.icon}</div> : <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40 ml-1" />}
                          <span>{child.name}</span>
                        </div>

                        {/* PANAH BARU UNTUK LEVEL 2 */}
                        <ChevronRight 
                          size={14} 
                          className={`transition-transform duration-200 ${isSubOpen ? 'rotate-90 text-indigo-600' : 'opacity-40'}`} 
                        />
                    </div>

                    {/* RENDER LEVEL 3 (Cucu) (Tarif Carter, dll) */}
                    {isSubOpen && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-dashed pl-4">
                        {child.children.map((subChild, subIdx) => (
                          <NavLink
                            key={subIdx}
                            to={subChild.path}
                            className={({ isActive }) => `
                              block py-1.5 px-3 text-[13px] rounded-md transition-all
                              ${isActive 
                                ? (isDarkMode ? 'text-indigo-400 bg-gray-700/50' : 'text-indigo-600 bg-indigo-50/50 font-medium') 
                                : (isDarkMode ? 'text-gray-500 hover:text-indigo-300' : 'text-slate-400 hover:text-indigo-500')
                              }
                            `}
                          >
                            {subChild.name}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  // Render NavLink biasa (Level 2 standar)
                  <NavLink
                    to={child.path}
                    className={({ isActive }) => `
                      block py-2 px-3 text-sm rounded-lg transition-all
                      ${isActive ? (isDarkMode ? 'text-indigo-400 font-bold bg-gray-700' : 'text-indigo-600 font-bold bg-indigo-50') : (isDarkMode ? 'text-gray-400 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-500')}
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
      </nav>

      {/* User Profile Section */}
      <div className={`p-4 border-t transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-50/50 border-gray-100'}`}>
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
      </div>
      {/* MODAL HARUS DI LUAR DIV SIDEBAR TAPI MASIH DI DALAM RETURN UTAMA */}
      <LogoutModal 
        isOpen={showLogoutModal} 
        onClose={() => setShowLogoutModal(false)} 
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
};

export default Sidebar;