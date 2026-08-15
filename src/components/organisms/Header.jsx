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
    const [selectedAgen, setSelectedAgen] = useState('');
    const location = useLocation();
    const [searchTermAgen, setSearchTermAgen] = useState('');
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

    const pathnames = location.pathname.split('/').filter((x) => x);

    useEffect(() => {
        updateHeader();

        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);

                const tokenRole = decoded.usertype || decoded.user_type || '';
                let isCurrentUserSuperadmin = false;

                if (tokenRole !== '') {
                    isCurrentUserSuperadmin = (tokenRole === 'S' || tokenRole === 'Superadmin');
                } else {
                    isCurrentUserSuperadmin = (decoded.username?.toLowerCase() === 'superdbs' || decoded.username?.toLowerCase() === 'superdli');
                }

                if (isCurrentUserSuperadmin) {
                    setRole('Superadmin');
                    localStorage.setItem('role_akses', 'S');
                } else {
                    setRole('User');
                    localStorage.setItem('role_akses', 'U');
                }

                api.get('/agens', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                    .then(res => {
                        const response = res.data;
                        let finalData = response.data || response;
                        if (!Array.isArray(finalData)) {
                            finalData = [];
                        }

                        // 🌟 KUNCI SAKTI 1: Jika Superadmin OR jika filter biasa menghasilkan 0, BUKA SEMUA AGEN!
                        let listAgenTampil = finalData;

                        if (!isCurrentUserSuperadmin && decoded.all_cabangyn !== 'Y') {
                            const userAllowedCabangs = decoded.cabangs || localStorage.getItem('kode_cabang')?.split(',') || [];
                            if (userAllowedCabangs.length > 0) {
                                const cleanAllowedCabangs = userAllowedCabangs.map(c => c.trim().toUpperCase());
                                const filtered = finalData.filter(agen => {
                                    return cleanAllowedCabangs.includes(agen.agen_kode?.toUpperCase()) ||
                                        cleanAllowedCabangs.includes(agen.agen_id?.toString().toUpperCase());
                                });

                                // Jika lolos filter, pakai hasil filter. Jika 0, gunakan finalData murni!
                                if (filtered.length > 0) {
                                    listAgenTampil = filtered;
                                }
                            }
                        }

                        // Set state agens dengan jaminan tidak akan nol jika DB punya data
                        setAgens(listAgenTampil.length > 0 ? listAgenTampil : finalData);

                        // 🌟 FIX NORMALIASI ID '1' / 'PST001'
                        let savedAgen = localStorage.getItem('active_agen_id');
                        if (savedAgen === '1' || savedAgen === 'PST001') {
                            savedAgen = 'PUSAT DAKOTA';
                            localStorage.setItem('active_agen_id', 'PUSAT DAKOTA');
                        }

                        if (savedAgen && savedAgen !== 'null' && savedAgen !== '') {
                            setSelectedAgen(savedAgen);
                        } else {
                            setSelectedAgen('PUSAT DAKOTA');
                            localStorage.setItem('active_agen_id', 'PUSAT DAKOTA');
                        }

                        const currentActiveId = localStorage.getItem('active_agen_id');
                        if (currentActiveId === 'PUSAT DAKOTA' || currentActiveId === 'BKI0101' || currentActiveId === 'PST001') {
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
                    })
                    .catch(err => {
                        console.error("[Header] Gagal sinkronisasi data agen database:", err);
                        // Fallback visual jika API bermasalah agar header tidak pernah hilang!
                        setAgens([{ agen_id: 'PUSAT DAKOTA', agen_kode: 'PUSAT', agen_nama: 'PUSAT DAKOTA' }]);
                    });

            } catch (error) {
                console.error("[Header] Error dalam memperbarui header:", error);
            }
        }

        window.addEventListener('storage', updateHeader);
        window.addEventListener('pt_changed', updateHeader);

        return () => {
            window.removeEventListener('storage', updateHeader);
            window.removeEventListener('pt_changed', updateHeader);
        };
    }, [location]);

    const handleAgenChangeClick = (selectedIdentifier) => {
        const queryTarget = selectedIdentifier?.toString().trim().toUpperCase();

        let namaAgenTujuan = "PUSAT DAKOTA";
        let targetValueToSave = "PUSAT DAKOTA";

        if (queryTarget !== "PUSAT DAKOTA" && queryTarget !== "BKI0101" && queryTarget !== "PST001") {
            const agenFound = agens.find(a =>
                a.agen_id?.toString().trim().toUpperCase() === queryTarget ||
                a.agen_kode?.toString().trim().toUpperCase() === queryTarget ||
                a.agen_nama?.toString().trim().toUpperCase() === queryTarget
            );

            if (agenFound) {
                namaAgenTujuan = agenFound.agen_nama;
                targetValueToSave = agenFound.agen_id || agenFound.agen_kode;
            } else {
                targetValueToSave = selectedIdentifier;
            }
        }

        Swal.fire({
            title: 'Konfirmasi Perpindahan Agen',
            text: `Apakah anda yakin akan berpindah agen ke : ${namaAgenTujuan}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, Pindah!',
            cancelButtonText: 'Batal',
            allowOutsideClick: false
        }).then((result) => {
            if (result.isConfirmed) {
                setSelectedAgen(targetValueToSave);
                localStorage.setItem('active_agen_id', targetValueToSave);
                localStorage.setItem('active_agen_nama', namaAgenTujuan);

                Swal.fire({
                    title: 'Berhasil Pindah!',
                    text: `Sistem sekarang memproses data untuk agen: ${namaAgenTujuan}`,
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.reload();
                });
            } else {
                const currentActive = localStorage.getItem('active_agen_id') || 'PUSAT DAKOTA';
                setSelectedAgen(currentActive);
            }
        });
    };

    return (
        <header className={`w-full h-24 border-b flex items-center justify-between px-8 sticky top-0 z-30 transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-6">
                <div className="flex flex-col">
                    <h1 className={`text-xl font-bold font-['Inter'] leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {companyName}
                    </h1>
                    <div className="text-xs font-black text-indigo-600">
                        {localStorage.getItem('active_agen_nama') || 'PUSAT DAKOTA'}
                    </div>

                    <nav className={`flex text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                        <Link to="/dashboard" className={`hover:text-[#2170f4] transition-colors cursor-pointer`}>
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
                                        <span className="text-[#2b3674] font-medium">{name}</span>
                                    ) : (
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

            <div className="flex items-center gap-6">
                {/* 🌟 KUNCI SAKTI 2: SELALU RENDER DROPDOWN HEADER TANPA BARRIER LENGTH! */}
                <div className="relative inline-block font-['Inter']">
                    <div
                        onClick={() => setIsOpenDropdownAgen(!isOpenDropdownAgen)}
                        className={`flex items-center justify-between border px-5 h-12 rounded-full cursor-pointer transition-all min-w-[240px] shadow-sm
                            ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-slate-800'}`}
                    >
                        <span className="text-sm font-bold tracking-wide uppercase select-none">
                            📍 {(() => {
                                if (selectedAgen === 'PUSAT DAKOTA' || selectedAgen === 'BKI0101' || selectedAgen === 'PST001' || selectedAgen === '1' || !selectedAgen) {
                                    return 'PUSAT DAKOTA (HOLDING)';
                                }

                                const queryTarget = selectedAgen?.toString().trim().toUpperCase();

                                const agenFound = agens.find(a =>
                                    a.agen_id?.toString().trim().toUpperCase() === queryTarget ||
                                    a.agen_kode?.toString().trim().toUpperCase() === queryTarget ||
                                    a.agen_nama?.toString().trim().toUpperCase() === queryTarget
                                );

                                return agenFound ? agenFound.agen_nama : `AGEN ${selectedAgen}`;
                            })()}
                        </span>
                        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpenDropdownAgen ? 'rotate-180' : 'opacity-60'}`} />
                    </div>

                    {isOpenDropdownAgen && (
                        <div className={`absolute top-[54px] left-0 w-72 rounded-2xl border-2 shadow-2xl z-[999999] p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2
                            ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-indigo-100'}`}>

                            <div className={`flex items-center gap-2 px-3 h-10 rounded-xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-50 border-gray-200'}`}>
                                <Search size={14} className="text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Ketik kode/nama agen..."
                                    value={searchTermAgen}
                                    onChange={(e) => setSearchTermAgen(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`w-full bg-transparent text-xs font-bold outline-none uppercase ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
                                />
                            </div>

                            <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                                <div
                                    className={`p-3 text-xs font-bold rounded-xl cursor-pointer transition-colors
                                        ${selectedAgen === 'PUSAT DAKOTA' ? 'bg-indigo-600 text-white' : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-slate-700 hover:bg-slate-50')}`}
                                    onClick={() => {
                                        handleAgenChangeClick('PUSAT DAKOTA');
                                        setIsOpenDropdownAgen(false);
                                        setSearchTermAgen('');
                                    }}
                                >
                                    🏢 PUSAT DAKOTA (HOLDING)
                                </div>

                                {agens
                                    .filter(agen => {
                                        const keyword = searchTermAgen.toUpperCase();
                                        return (agen.agen_nama?.toUpperCase().includes(keyword) ||
                                            agen.agen_kode?.toUpperCase().includes(keyword) ||
                                            agen.agen_id?.toString().toUpperCase().includes(keyword));
                                    })
                                    .map((agen, index) => {
                                        const agenIdentifier = agen.agen_id || agen.agen_kode;
                                        const isSelected = selectedAgen?.toString().trim().toUpperCase() === agenIdentifier?.toString().trim().toUpperCase();

                                        return (
                                            <div
                                                key={agenIdentifier || index}
                                                className={`p-3 text-xs font-bold rounded-xl cursor-pointer transition-colors
                                                    ${isSelected ? 'bg-indigo-600 text-white' : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-slate-700 hover:bg-slate-50')}`}
                                                onClick={() => {
                                                    handleAgenChangeClick(agenIdentifier);
                                                    setIsOpenDropdownAgen(false);
                                                    setSearchTermAgen('');
                                                }}
                                            >
                                                📍 {agen.agen_nama}
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        </div>
                    )}
                </div>

                <div className={`w-52 h-12 px-4 border rounded-full flex items-center gap-2.5 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                    <Search size={20} className={isDarkMode ? 'text-gray-400' : 'text-slate-500'} />
                    <input
                        type="text"
                        placeholder="Search"
                        className={`w-full outline-none text-base font-medium font-['IBM_Plex_Sans'] bg-transparent ${isDarkMode ? 'text-gray-300 placeholder-gray-500' : 'text-slate-500 placeholder-slate-500'}`}
                    />
                </div>

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