import React, { useState, useEffect } from 'react';
import Header from '../components/organisms/Header';
import Sidebar from '../components/organisms/Sidebar';
import { useDarkMode } from '../context/DarkModeContext';
import { useNavigate } from 'react-router-dom';
import WarningModal from '../components/WarningModal.jsx';

const MainLayout = ({ children }) => {
    const { isDarkMode } = useDarkMode();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const navigate = useNavigate();
    const [isIdleModalOpen, setIsIdleModalOpen] = useState(false);
    const toggleSidebar = () => setIsCollapsed(!isCollapsed);

    // ================= LOGIKA AUTO LOGOUT ON IDLE ================
    useEffect(() => {
        let timeoutId;

        const getIdleTimeout = () => {
            const savedTime = localStorage.getItem('max_idle_time');
            // Default 3 menit jika belum di-set di setting admin
            return savedTime ? parseInt(savedTime, 10) : 3 * 60 * 1000;
        };

        const triggerIdleModal = () => {
            console.log("⏰ Batas waktu idle tercapai. Memunculkan WarningModal...");
            setIsIdleModalOpen(true);
        };

        const resetTimer = () => {
            // Jika modal warning idle sudah terbuka di layar, timer tidak boleh di-reset lagi
            if (isIdleModalOpen) return;

            if (timeoutId) clearTimeout(timeoutId);
            const currentTimeout = getIdleTimeout();
            console.log(' [MainLayout] Set timer baru:', currentTimeout, 'ms (', currentTimeout / 60000, 'menit)'); // DEBUG LOG
            timeoutId = setTimeout(triggerIdleModal, currentTimeout);
        };

        // Event deteksi pergerakan user
        const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

        activityEvents.forEach((event) => {
            window.addEventListener(event, resetTimer);
        });

        resetTimer();

        const handleTimeChange = () => {
            console.log("🔄 Konfigurasi durasi sesi berubah, mengatur ulang timer...");
            resetTimer();
        };
        window.addEventListener('idle_time_changed', handleTimeChange);

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            activityEvents.forEach((event) => {
                window.removeEventListener(event, resetTimer);
            });
            window.removeEventListener('idle_time_changed', handleTimeChange);
        };
    }, [navigate, isIdleModalOpen]); // Tambahkan isIdleModalOpen ke dependency array

    // =========================================================================

    // FUNGSI EKSEKUSI LOGOUT: Dipanggil saat tombol 'Back' di modal diklik
    const handleConfirmLogout = () => {
        setIsIdleModalOpen(false);

        // Hapus sesi data
        localStorage.removeItem('token');
        localStorage.removeItem('user_name');
        localStorage.removeItem('selected_pt');
        localStorage.removeItem('pt_ID');

        // Pindah ke login screen
        navigate('/login');
    };
    // ==============================================================    

    return (
        <div className={`flex h-screen w-full overflow-hidden transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-[#f4f7fe]'}`}>

            {/* AREA MENU KIRI (SIDEBAR) */}
            <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

            {/* AREA KANAN (HEADER + CONTENT) */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

                {/* HEADER: Muncul di bagian atas area kanan */}
                <Header onMenuClick={toggleSidebar} />

                {/* CONTENT AREA: Tempat konten utama dashboard muncul */}
                <main className={`flex-1 overflow-y-auto p-8 transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-[#f4f7fe]'}`}>
                    {children}
                </main>
            </div>
            <WarningModal
                isOpen={isIdleModalOpen}
                title="SESSION EXPIRED"
                message={`Sesi Anda telah berakhir karena tidak ada\naktivitas selama beberapa menit terakhir.`}
                onClose={handleConfirmLogout} // Begitu tombol diklik, jalankan fungsi logout bersih
            />
        </div>
    );
};

export default MainLayout;