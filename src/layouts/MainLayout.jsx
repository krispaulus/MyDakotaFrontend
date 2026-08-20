import React, { useState, useEffect } from 'react';
import Header from '../components/organisms/Header';
import Sidebar from '../components/organisms/Sidebar';
import { useDarkMode } from '../context/DarkModeContext';
import { useNavigate, Outlet } from 'react-router-dom';
import WarningModal from '../components/WarningModal.jsx';

const MainLayout = ({ children }) => {
    const { isDarkMode } = useDarkMode();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const navigate = useNavigate();
    const [isIdleModalOpen, setIsIdleModalOpen] = useState(false);
    const toggleSidebar = () => setIsCollapsed(!isCollapsed);

    // 🔒 1. PROTEKSI AUTH: Cek ketersediaan token saat komponen dimuat
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login', { replace: true });
        }
    }, [token, navigate]);

    // ================= LOGIKA AUTO LOGOUT ON IDLE ================
    useEffect(() => {
        if (!token) return; // Jangan jalankan timer jika belum login

        let timeoutId;

        const getIdleTimeout = () => {
            const savedTime = localStorage.getItem('max_idle_time');
            return savedTime ? parseInt(savedTime, 10) : 3 * 60 * 1000;
        };

        const triggerIdleModal = () => {
            console.log("⏰ Batas waktu idle tercapai. Memunculkan WarningModal...");
            setIsIdleModalOpen(true);
        };

        const resetTimer = () => {
            if (isIdleModalOpen) return;

            if (timeoutId) clearTimeout(timeoutId);
            const currentTimeout = getIdleTimeout();
            timeoutId = setTimeout(triggerIdleModal, currentTimeout);
        };

        const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

        activityEvents.forEach((event) => {
            window.addEventListener(event, resetTimer);
        });

        resetTimer();

        const handleTimeChange = () => {
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
    }, [navigate, isIdleModalOpen, token]);

    // FUNGSI EKSEKUSI LOGOUT
    const handleConfirmLogout = () => {
        setIsIdleModalOpen(false);

        localStorage.removeItem('token');
        localStorage.removeItem('user_name');
        localStorage.removeItem('selected_pt');
        localStorage.removeItem('pt_ID');
        sessionStorage.clear();

        navigate('/login', { replace: true });
    };

    // 🔒 2. CEGAH RENDER LAYOUT JIKA TIDAK ADA TOKEN
    if (!token) {
        return null;
    }

    return (
        <div className={`flex h-screen w-full overflow-hidden transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-[#f4f7fe]'}`}>

            {/* AREA MENU KIRI (SIDEBAR) */}
            <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

            {/* AREA KANAN (HEADER + CONTENT) */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

                {/* HEADER */}
                <Header onMenuClick={toggleSidebar} />

                {/* CONTENT AREA: Mendukung children atau Outlet React Router */}
                <main className={`flex-1 overflow-y-auto p-8 transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-[#f4f7fe]'}`}>
                    {children || <Outlet />}
                </main>
            </div>

            <WarningModal
                isOpen={isIdleModalOpen}
                title="SESSION EXPIRED"
                message={`Sesi Anda telah berakhir karena tidak ada\naktivitas selama beberapa menit terakhir.`}
                onClose={handleConfirmLogout}
            />
        </div>
    );
};

export default MainLayout;