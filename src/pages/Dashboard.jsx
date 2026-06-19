import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Package, Truck, Clock } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import { useDarkMode } from '../context/DarkModeContext';

function Dashboard() {
  const { isDarkMode } = useDarkMode();
  const [role, setRole] = useState('');
  const [agens, setAgens] = useState([]); // Deklarasikan cukup satu kali saja
  const userName = localStorage.getItem('username');

  // 1. Ambil Role secara akurat dari Token atau Local Storage
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // 🌟 KUNCI EMAS: Utamakan cache role_akses Local Storage terupdate yang bernilai 'S'
    const cachedRoleType = localStorage.getItem('role_akses') || 'U';
    
    if (cachedRoleType === 'S' || cachedRoleType === 'Super Admin') {
      setRole('Superadmin');
    } else if (cachedRoleType === 'A' || cachedRoleType === 'Admin') {
      setRole('Admin');
      } else if (cachedRoleType === 'U' || cachedRoleType === 'User') {
      setRole('User'); // Mengunci 'User' secara presisi untuk huruf 'U'
    } else if (token) {
      try {
        const decoded = jwtDecode(token);
        const rawType = decoded.usertype || decoded.user_type || '';
        if (rawType === 'S') setRole('Superadmin');
        else if (rawType === 'A') setRole('Admin');
        else setRole('User');
      } catch (error) {
        console.error('Gagal membaca token:', error);
        setRole('User');
      }
    } else {
      setRole('User');
    }
  }, []);

  // 2. Fetch Data Agen jika Superadmin
  useEffect(() => {
    const fetchAgens = async () => {
      // Hanya jalankan jika role sudah terdeteksi sebagai Superadmin
      if (role === 'Superadmin') {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/agens`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const result = await response.json();

          // Sesuai screenshot Postman, data dibungkus dalam properti 'data'
          if (result.status === 'success' && Array.isArray(result.data)) {
            setAgens(result.data);
            console.log("Berhasil load agen:", result.data.length);
          } else {
            console.error("Format data backend tidak sesuai:", result);
          }
        } catch (error) {
          console.error("Gagal mengambil data agen:", error);
        }
      }
    };

    fetchAgens();
  }, [role]); 

  return (
    <div className="w-full">
      {/* Header Selamat Datang */}
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-[#2b3674]'}`}>Dashboard MyDakota</h1>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
          Selamat Datang, 
          <span className={`font-semibold ml-1 ${isDarkMode ? 'text-blue-400' : 'text-[#2170f4]'}`}>{userName}</span>!
          <span> Kamu sebagai </span>
          <span className={`font-semibold ${isDarkMode ? 'text-blue-400' : 'text-[#2170f4]'}`}>{role}</span>!
        </p>
      </div>

      {/* Barisan Card Statistik */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon={<Package size={24} />} label="Total Cargo" value="1,240" color="text-blue-600" isDarkMode={isDarkMode} />
        <StatCard icon={<Truck size={24} />} label="In Transit" value="452" color="text-orange-500" isDarkMode={isDarkMode} />
        <StatCard icon={<Clock size={24} />} label="Pending" value="12" color="text-red-500" isDarkMode={isDarkMode} />
        <StatCard icon={<LayoutDashboard size={24} />} label="Completed" value="776" color="text-green-600" isDarkMode={isDarkMode} />
      </div>

      {/* Area Placeholder Grafik */}
      <div className={`w-full h-96 rounded-2xl shadow-sm border flex items-center justify-center transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <p className={`italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {role === 'Superadmin' 
            ? `Grafik Business Insight untuk ${agens.length} agen akan muncul di sini` 
            : "Grafik Laporan Business Insight Akan Muncul di Sini"}
        </p>
      </div>
    </div>
  );
}

const StatCard = ({ icon, label, value, color, isDarkMode }) => (
  <div className={`p-6 rounded-2xl shadow-sm border flex items-center gap-4 hover:shadow-md transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-50 hover:border-gray-200'}`}>
    <div className={`p-3 rounded-xl ${color} ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
      {icon}
    </div>
    <div>
      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
      <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-[#2b3674]'}`}>{value}</h3>
    </div>
  </div>
);

export default Dashboard;