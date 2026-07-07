import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { Search, Bell, MessageSquare, ChevronDown } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useDarkMode } from '../../context/DarkModeContext';
import Swal from 'sweetalert2';
import api from '../../api/axios';

const Header = () => {
    const { isDarkMode } = useDarkMode();
    const [role, setRole] = useState('');
    const [companyName, setCompanyName] = useState('Dakota Group');
    const [agens, setAgens] = useState([]);
    const [selectedAgen, setSelectedAgen] = useState(''); // Cabang yang sedang aktif dipilih
    const [isOpenDropdown, setIsOpenDropdown] = useState(false); // Toggle buka-tutup dropdown mewah
    const location = useLocation();
    const [searchTermAgen, setSearchTermAgen] = useState(''); // State untuk menyimpan input pencarian agen
    const [isOpenDropdownAgen, setIsOpenDropdownAgen] = useState(false);
    const activeAgenId = localStorage.getItem('active_agen_id');

    const updateHeader = () => {
        const ptId = localStorage.getItem('selected_pt') || localStorage.getItem('pt_ID');
        const ptMapping = {
            'A': 'Dakota Buana Sarana (DBS)',
            'B': 'Dakota Lintas Buana',
            'C': 'Dakota Logistik Indonesia'
        };
        setCompanyName(ptMapping[ptId] || 'Dakota Group');
    };

    // Mengambil nama path saat ini
    const pathnames = location.pathname.split('/').filter((x) => x);

    useEffect(() => {
        updateHeader(); // Manggil fungsi membaca PT Company

        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                console.log("🦅 DEBUG CLAIM TOKEN:", decoded);

                //const rawType = decoded.user_type || localStorage.getItem('role_akses') || '';
                const tokenRole = decoded.usertype || decoded.user_type || '';

                let isCurrentUserSuperadmin = false;

                if (tokenRole !== '') {
                    // Jika token menyediakan data role, gunakan langsung secara absolut
                    isCurrentUserSuperadmin = (tokenRole === 'S' || tokenRole === 'Superadmin');
                } else {
                    // Jika token kosong (undefined), periksa apakah nama user di token adalah 'superdbs'
                    // Ini sebagai safety-gate block untuk menjaga akun superadmin lu
                    isCurrentUserSuperadmin = (decoded.username?.toLowerCase() === 'superdbs');
                }

                if (isCurrentUserSuperadmin) {
                    setRole('Superadmin');
                    localStorage.setItem('role_akses', 'S');
                } else {
                    setRole('User');
                    localStorage.setItem('role_akses', 'U');
                }

                const ptId = localStorage.getItem('selected_pt') || 'A';
                api.get('/agens', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                    .then(res => {
                        const response = res.data;
                        const finalData = response.data || response;
                        if (Array.isArray(finalData)) {

                            // 🌟 STRATEGI SAKTI GAMBAR 4 & 5: Filter hak akses cabang userdbs
                            if (isCurrentUserSuperadmin || decoded.all_cabangyn === 'Y') {
                                // Superadmin / Pusat berhak melihat semua agen
                                setAgens(finalData);
                            } else {
                                // User Biasa (userdbs): Menggunakan fungsi .trim() murni milik JavaScript frontend
                                const userAllowedCabangs = decoded.cabangs || localStorage.getItem('kode_cabang')?.split(',') || [];
                                const cleanAllowedCabangs = userAllowedCabangs.map(c => c.trim().toUpperCase());

                                const filtered = finalData.filter(agen => {
                                    return cleanAllowedCabangs.includes(agen.agen_kode?.toUpperCase()) ||
                                        cleanAllowedCabangs.includes(agen.agen_id?.toString());
                                });
                                console.log("Agen yang lolos filter akses userdbs:", filtered);
                                setAgens(filtered);
                            }

                            // 3. Set Default Active Agen
                            // 🌟 KUNCI EMAS: Jika kode_cabang utama di local storage adalah PUSAT DAKOTA, langsung paksa samakan!
                            //const cachedKodeCabang = localStorage.getItem('kode_cabang');
                            const savedAgen = localStorage.getItem('active_agen_id');

                            // 🌟 KUNCI EMAS 1: Jika di memori browser SUDAH ADA agen yang valid terpilih, 
                            // KUNCI mati nilainya, JANGAN PERNAH di-override paksa balik ke pusat lagi!
                            if (savedAgen && savedAgen !== 'null' && savedAgen !== '') {
                                setSelectedAgen(savedAgen);
                            } else {
                                // Jika bener-bener baru pertama kali login seumur hidup (savedAgen kosong murni)
                                if (isCurrentUserSuperadmin) {
                                    setSelectedAgen('PUSAT DAKOTA');
                                    localStorage.setItem('active_agen_id', 'PUSAT DAKOTA');
                                } else {
                                    // Jalur User Biasa (U): Lemparkan otomatis ke cabang penugasan pertamanya
                                    const userAllowedCabangs = decoded.cabangs || localStorage.getItem('kode_cabang')?.split(',') || [];
                                    const defaultId = userAllowedCabangs.length > 0 ? userAllowedCabangs[0].trim() : (finalData[0]?.agen_kode || '');
                                    setSelectedAgen(defaultId);
                                    localStorage.setItem('active_agen_id', defaultId);
                                }
                            }

                            // 🌟 SINKRONISASI NAMA AGEN AKTIF KE LOCAL STORAGE KARENA DIBUTUHKAN DI HALAMAN LAIN (CUST & BTT)
                            const currentActiveId = localStorage.getItem('active_agen_id');
                            if (currentActiveId === 'PUSAT DAKOTA') {
                                localStorage.setItem('active_agen_nama', 'PUSAT DAKOTA');
                            } else if (currentActiveId && currentActiveId !== 'null') {
                                const queryTarget = currentActiveId.toString().trim().toUpperCase();
                                const matchedAgen = finalData.find(a =>
                                    a.agen_kode?.toString().trim().toUpperCase() === queryTarget ||
                                    a.agen_id?.toString().trim().toUpperCase() === queryTarget
                                );
                                if (matchedAgen) {
                                    localStorage.setItem('active_agen_nama', matchedAgen.agen_nama);
                                }
                            }


                            // if (isCurrentUserSuperadmin || cachedKodeCabang === 'PUSAT DAKOTA') {
                            //     setSelectedAgen('PUSAT DAKOTA');
                            //     localStorage.setItem('active_agen_id', 'PUSAT DAKOTA');
                            // } else {
                            //     if (savedAgen && savedAgen !== 'PUSAT DAKOTA') {
                            //         setSelectedAgen(savedAgen);
                            //     } else {
                            //         const userAllowedCabangs = decoded.cabangs || [];
                            //         const defaultId = userAllowedCabangs.length > 0 ? userAllowedCabangs[0] : (finalData[0]?.agen_kode || '');
                            //         setSelectedAgen(defaultId);
                            //         localStorage.setItem('active_agen_id', defaultId);
                            //     }
                            // }
                        }
                    })

                    .catch(err => console.error("[Header] Gagal sinkronisasi data agen database:", err));

            } catch (error) {
                console.error("[Header] Error dalam memperbarui header:", error);
            }
        }

        //updateHeader();
        window.addEventListener('storage', updateHeader);
        window.addEventListener('pt_changed', updateHeader);

        return () => {
            window.removeEventListener('storage', updateHeader);
            window.removeEventListener('pt_changed', updateHeader);
        };
    }, [location]);

    // 🌟 3. LOGIKA POPUP KONFIRMASI SAKTI SAAT BERPINDAH AGEN OPERASIONAL
    const handleAgenChangeClick = (e) => {
        const agenTujuanKode = e.target.value;

        // Cari nama agen berdasarkan kodenya untuk ditampilkan di teks alert pembacaan user
        let namaAgenTujuan = "PUSAT DAKOTA";
        if (agenTujuanKode !== "PUSAT DAKOTA") {
            const agenFound = agens.find(a => a.agen_kode === agenTujuanKode);
            if (agenFound) namaAgenTujuan = agenFound.agen_nama;
        }

        // Tembakkan SweetAlert2 Konfirmasi Mewah 🎯
        Swal.fire({
            title: 'Konfirmasi Perpindahan Agen',
            text: `Apakah anda yakin akan berpindah agen ke : ${namaAgenTujuan}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, Pindah!',
            cancelButtonText: 'Batal',
            allowOutsideClick: false // Mencegah user klik sembarang di luar modal
        }).then((result) => {
            if (result.isConfirmed) {
                // Simpan permanen ke memori local storage agar system tahu agen yang sedang memproses saat ini!
                setSelectedAgen(agenTujuanKode);
                localStorage.setItem('active_agen_id', agenTujuanKode);
                localStorage.setItem('active_agen_nama', namaAgenTujuan);

                // Beri notifikasi sukses singkat sebelum refresh halaman operasional
                Swal.fire({
                    title: 'Berhasil Pindah!',
                    text: `Sistem sekarang memproses data untuk agen: ${namaAgenTujuan}`,
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.reload(); // Refresh total agar semua view form ter-update instan!
                });
            } else {
                // Jika user klik batal, kembalikan posisi select-box ke nilai sebelumnya
                const currentActive = localStorage.getItem('active_agen_id') || 'PUSAT DAKOTA';
                setSelectedAgen(currentActive);
            }
        });
    };

    return (
        <header className={`w-full h-24 border-b flex items-center justify-between px-8 sticky top-0 z-30 transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-6">
                {/* SISI KIRI: PT COMPANY */}
                <div className="flex flex-col">
                    <h1 className={`text-xl font-bold font-['Inter'] leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {companyName}
                    </h1>
                    <div className="text-xs font-black">
                        {activeAgenId && activeAgenId !== 'undefined' ? activeAgenId : 'PUSAT DAKOTA'}
                    </div>

                    {/* Navigasi Breadcrumb Dinamis                 */}
                    <nav className={`flex text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                        <Link
                            to="/dashboard"
                            className={`hover:text-[#2170f4] transition-colors cursor-pointer`}
                        >
                            Home
                        </Link>

                        {pathnames.map((value, index) => {
                            const last = index === pathnames.length - 1;
                            const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                            const name = value.charAt(0).toUpperCase() + value.slice(1);

                            return (
                                <span key={to} className="flex items-center">
                                    <span className="mx-2">|</span>
                                    {last ? (
                                        // Jika di halaman itu sendiri, tidak bisa diklik (Warna Biru)
                                        <span className="text-[#2b3674] font-medium">{name}</span>
                                    ) : (
                                        // Jika bukan halaman akhir, bisa diklik
                                        <Link to={to} className="hover:text-[#2170f4] transition-colors">
                                            {name}
                                        </Link>
                                    )}
                                </span>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* SISI KANAN: DROPDOWN AGEN & UTENSIL */}
            <div className="flex items-center gap-6">
                {/* DROPDOWN CABANG MUNCOOOL KARENA SUDAH BEBAS BARRIER ROLE */}
                {agens.length > 0 && (
                    /* 🌟 KUNCI EMAS 1: 'inline-block relative' dipasang ketat di sini sebagai jangkar absolute! */
                    <div className="relative inline-block font-['Inter']">

                        {/* KOTAK DROPDOWN UTAMA */}
                        <div
                            onClick={() => setIsOpenDropdownAgen(!isOpenDropdownAgen)}
                            className={`flex items-center justify-between border px-5 h-12 rounded-full cursor-pointer transition-all min-w-[240px] shadow-sm
                                ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-slate-800'}`}
                        >
                            <span className="text-sm font-bold tracking-wide uppercase select-none">
                                📍 {(() => {
                                    if (selectedAgen === 'PUSAT DAKOTA') return 'PUSAT DAKOTA (HOLDING)';

                                    // 🌟 KUNCI SAKTI: Konversi paksa semua pembanding menjadi string + bersihkan spasi (.trim())
                                    // agar pencarian ID angka "268" atau "21" dari database 100% klop tanpa celah!
                                    const queryTarget = selectedAgen?.toString().trim().toUpperCase();

                                    const agenFound = agens.find(a =>
                                        a.agen_kode?.toString().trim().toUpperCase() === queryTarget ||
                                        a.agen_id?.toString().trim().toUpperCase() === queryTarget ||
                                        a.agen_nama?.toString().trim().toUpperCase() === queryTarget
                                    );

                                    return agenFound ? agenFound.agen_nama : `AGEN ${selectedAgen}`;
                                })()}
                            </span>
                            <ChevronDown size={16} className={`transition-transform duration-200 ${isOpenDropdownAgen ? 'rotate-180' : 'opacity-60'}`} />
                        </div>

                        {/* PANEL POP-UP PILIHAN (DIIKAT MATI OLEH JANGKAR RELATIVE DI ATAS) */}
                        {isOpenDropdownAgen && (
                            /* 🌟 KUNCI EMAS 2: 'left-0' dipaksa agar panel rata kiri sejajar lurus dengan tombol box di atasnya */
                            <div className={`absolute top-[54px] left-0 w-72 rounded-2xl border-2 shadow-2xl z-[999999] p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2
                                ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-indigo-100'}`}>

                                {/* 🔍 INPUT PENCARIAN DI DALAM DROPDOWN */}
                                <div className={`flex items-center gap-2 px-3 h-10 rounded-xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-50 border-gray-200'}`}>
                                    <Search size={14} className="text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Ketik kode/nama agen..."
                                        value={searchTermAgen}
                                        onChange={(e) => setSearchTermAgen(e.target.value)}
                                        onClick={(e) => e.stopPropagation()} // Cegah dropdown menutup otomatis saat input diklik
                                        className={`w-full bg-transparent text-xs font-bold outline-none uppercase ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
                                    />
                                </div>

                                {/* LIST PILIHAN ITEM AGEN */}
                                <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                                    {(role === 'Superadmin' || localStorage.getItem('role_akses') === 'S') && (
                                        <div
                                            className={`p-3 text-xs font-bold rounded-xl cursor-pointer transition-colors
                                                ${selectedAgen === 'PUSAT DAKOTA' ? 'bg-indigo-600 text-white' : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-slate-700 hover:bg-slate-50')}`}
                                            onClick={() => {
                                                handleAgenChangeClick({ target: { value: 'PUSAT DAKOTA' } });
                                                setIsOpenDropdownAgen(false);
                                                setSearchTermAgen('');
                                            }}
                                        >
                                            🏢 PUSAT DAKOTA (HOLDING)
                                        </div>
                                    )}

                                    {agens
                                        .filter(agen => {
                                            const keyword = searchTermAgen.toUpperCase();
                                            return (agen.agen_nama?.toUpperCase().includes(keyword) ||
                                                agen.agen_kode?.toUpperCase().includes(keyword));
                                        })
                                        .map((agen, index) => (
                                            <div
                                                key={agen.agen_kode || index}
                                                className={`p-3 text-xs font-bold rounded-xl cursor-pointer transition-colors
                                                    ${selectedAgen === agen.agen_kode ? 'bg-indigo-600 text-white' : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-slate-700 hover:bg-slate-50')}`}
                                                onClick={() => {
                                                    handleAgenChangeClick({ target: { value: agen.agen_kode } });
                                                    setIsOpenDropdownAgen(false);
                                                    setSearchTermAgen('');
                                                }}
                                            >
                                                📍 {agen.agen_nama}
                                            </div>
                                        ))
                                    }

                                    {agens.filter(agen => {
                                        const keyword = searchTermAgen.toUpperCase();
                                        return (agen.agen_nama?.toUpperCase().includes(keyword) || agen.agen_kode?.toUpperCase().includes(keyword));
                                    }).length === 0 && (
                                            <p className="text-center text-xs text-gray-400 italic py-3">Agen tidak ditemukan, bro...</p>
                                        )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* SEARCH BAR */}
                <div className={`w-52 h-12 px-4 border rounded-full flex items-center gap-2.5 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                    <Search size={20} className={isDarkMode ? 'text-gray-400' : 'text-slate-500'} />
                    <input
                        type="text"
                        placeholder="Search"
                        className={`w-full outline-none text-base font-medium font-['IBM_Plex_Sans'] bg-transparent ${isDarkMode ? 'text-gray-300 placeholder-gray-500' : 'text-slate-500 placeholder-slate-500'}`}
                    />
                </div>

                {/* UTILITY ICONS */}
                <div className="flex gap-2">
                    <div className={`w-11 h-11 rounded-full border flex items-center justify-center hover:bg-gray-50 cursor-pointer transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-violet-950 hover:bg-gray-50'}`}>
                        <MessageSquare size={18} />
                    </div>
                    <div className={`w-11 h-11 rounded-full border flex items-center justify-center hover:bg-gray-50 cursor-pointer transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-violet-950 hover:bg-gray-50'}`}>
                        <Bell size={18} />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;