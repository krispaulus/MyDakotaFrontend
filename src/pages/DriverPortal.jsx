import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import Swal from 'sweetalert2';
import { Html5Qrcode } from 'html5-qrcode';
import {
    Truck, Package, Phone, CheckCircle2,
    Navigation, RefreshCw, Search, ClipboardList,
    UserCheck, ChevronRight, QrCode, Camera, X, Trash2
} from 'lucide-react';

const DriverPortal = () => {
    const [activeTab, setActiveTab] = useState('surat-tugas'); // 'surat-tugas' | 'loper'
    const [loading, setLoading] = useState(false);

    // Profil Sopir yang Login
    const [driverInfo, setDriverInfo] = useState({
        username: localStorage.getItem('username') || '',
        supir_nip: '',
        supir_nama: localStorage.getItem('realname') || localStorage.getItem('username') || '',
        cabang_id: localStorage.getItem('active_agen_nama') || 'DLI PUSAT',
        is_admin: false
    });

    // Mode Admin Simulasi
    const [sopirList, setSopirList] = useState([]);
    const [selectedSimulasiNip, setSelectedSimulasiNip] = useState('');

    // Data Surat Tugas & Resi Loper
    const [suratTugasList, setSuratTugasList] = useState([]);
    const [selectedNoST, setSelectedNoST] = useState('');
    const [loperResiList, setLoperResiList] = useState([]);
    const [searchResi, setSearchResi] = useState('');

    // State Modal Konfirmasi Antar & Scan Barang Turun
    const [podModalResi, setPodModalResi] = useState(null);
    const [podStatus, setPodStatus] = useState('TERKIRIM');
    const [podPenerima, setPodPenerima] = useState('');
    const [scanKoliInput, setScanKoliInput] = useState('');
    const [scannedKoliList, setScannedKoliList] = useState([]);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [submittingPod, setSubmittingPod] = useState(false);

    const qrScannerRef = useRef(null);
    const scanInputRef = useRef(null);

    useEffect(() => {
        fetchDriverData('');
        return () => stopCameraScanner();
    }, []);

    const fetchDriverData = async (overrideNip = selectedSimulasiNip, filterST = '') => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [resST, resLoper] = await Promise.all([
                api.get('/driver/surat-tugas', {
                    params: {
                        supir_nip: overrideNip || undefined,
                        status: 'BERJALAN'
                    },
                    headers
                }),
                api.get('/driver/loper-resi', {
                    params: {
                        supir_nip: overrideNip || undefined,
                        no_st: filterST || undefined
                    },
                    headers
                }).catch(() => ({ data: { data: [] } }))
            ]);

            const drv = resST.data?.driver || {};
            setDriverInfo((prev) => ({
                ...prev,
                ...drv,
                supir_nama: drv.supir_nama || prev.supir_nama,
                username: drv.username || prev.username
            }));

            const activeSTList = (resST.data?.data || []).filter(
                (st) => String(st.complete_yn || 'N').toUpperCase() !== 'Y'
            );
            setSuratTugasList(activeSTList);

            // Hanya tampilkan resi yang belum berstatus TERKIRIM
            const pendingResi = (resLoper.data?.data || []).filter(
                (r) => String(r.status_antar || '').toUpperCase() !== 'TERKIRIM'
            );
            setLoperResiList(pendingResi);

            if (drv.is_admin && sopirList.length === 0) {
                const resAllSopir = await api.get('/master/sopir', { headers }).catch(() => ({ data: [] }));
                setSopirList(resAllSopir.data?.data || resAllSopir.data || []);
            }
        } catch (err) {
            console.error('Gagal memuat portal sopir:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePilihSuratTugas = (noST) => {
        setSelectedNoST(noST);
        setActiveTab('loper');
        fetchDriverData(selectedSimulasiNip, noST);
    };

    // Buka Modal POD Konfirmasi Antar
    const openPodModal = (resi) => {
        setPodModalResi(resi);
        setPodStatus('TERKIRIM');
        setPodPenerima(resi.penerima && resi.penerima !== '-' ? resi.penerima : '');
        setScanKoliInput('');
        setScannedKoliList([]);
        setIsCameraOpen(false);
    };

    const closePodModal = () => {
        stopCameraScanner();
        setPodModalResi(null);
    };

    // Tambah hasil scan barcode/QR barang turun
    const handleAddScannedKoli = (rawCode) => {
        const cleanCode = String(rawCode || scanKoliInput || '').trim().toUpperCase();
        if (!cleanCode || !podModalResi) return;

        const baseResi = String(podModalResi.no_btt || '').trim().toUpperCase();
        // Validasi kode scan harus milik resi ini (awalan 16 digit sama)
        if (!cleanCode.startsWith(baseResi)) {
            Swal.fire({
                toast: true,
                position: 'top',
                icon: 'error',
                title: `Barcode [${cleanCode}] bukan milik resi ${baseResi}!`,
                showConfirmButton: false,
                timer: 2200
            });
            setScanKoliInput('');
            return;
        }

        if (scannedKoliList.includes(cleanCode)) {
            Swal.fire({
                toast: true,
                position: 'top',
                icon: 'warning',
                title: `Koli [${cleanCode}] sudah di-scan!`,
                showConfirmButton: false,
                timer: 1800
            });
            setScanKoliInput('');
            return;
        }

        setScannedKoliList((prev) => [...prev, cleanCode]);
        setScanKoliInput('');
    };

    // Kamera QR / Barcode Scanner di HP
    const startCameraScanner = async () => {
        setIsCameraOpen(true);
        setTimeout(async () => {
            try {
                const scanner = new Html5Qrcode('pod-qr-reader');
                qrScannerRef.current = scanner;
                await scanner.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 220, height: 220 } },
                    (decodedText) => {
                        handleAddScannedKoli(decodedText);
                    },
                    () => { }
                );
            } catch (err) {
                console.error('Kamera gagal dibuka:', err);
                setIsCameraOpen(false);
                Swal.fire('Kamera Tidak Tersedia', 'Pastikan izin kamera browser aktif atau gunakan input manual.', 'warning');
            }
        }, 200);
    };

    const stopCameraScanner = () => {
        if (qrScannerRef.current) {
            qrScannerRef.current.stop().catch(() => { });
            qrScannerRef.current = null;
        }
        setIsCameraOpen(false);
    };

    // Simpan POD ke Backend
    const handleSubmitPod = async (e) => {
        e.preventDefault();
        if (!podModalResi) return;

        if (!podPenerima.trim()) {
            Swal.fire('Wajib Diisi', 'Nama penerima di lokasi wajib diisi!', 'warning');
            return;
        }

        // Jika status TERKIRIM, wajib minimal scan 1 barang turun
        if (podStatus === 'TERKIRIM' && scannedKoliList.length === 0) {
            Swal.fire('Scan Barang Turun', 'Silakan scan barcode/QR barang yang diturunkan terlebih dahulu!', 'warning');
            return;
        }

        setSubmittingPod(true);
        try {
            const token = localStorage.getItem('token');
            await api.post('/driver/loper-resi/deliver', {
                no_btt: podModalResi.no_btt,
                no_loper: podModalResi.no_loper,
                nama_penerima: podPenerima.trim(),
                status_antar: podStatus,
                scanned_koli: scannedKoliList
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                icon: 'success',
                title: 'Berhasil Disimpan!',
                text: `Resi ${podModalResi.no_btt} (${scannedKoliList.length}/${podModalResi.koli} Koli) diperbarui.`,
                timer: 1600,
                showConfirmButton: false
            });
            closePodModal();
            fetchDriverData(selectedSimulasiNip, selectedNoST);
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan status pengantaran', 'error');
        } finally {
            setSubmittingPod(false);
        }
    };

    const filteredResi = loperResiList.filter((item) => {
        if (!searchResi.trim()) return true;
        const q = searchResi.toLowerCase();
        return (
            String(item.no_btt || '').toLowerCase().includes(q) ||
            String(item.penerima || '').toLowerCase().includes(q) ||
            String(item.alamat_tujuan || '').toLowerCase().includes(q) ||
            String(item.kota_tujuan || '').toLowerCase().includes(q)
        );
    });

    return (
        <div className="min-h-screen bg-[#f4f7fb] py-4 px-3 sm:px-4 pb-24 font-sans text-slate-800">
            <div className="max-w-md mx-auto space-y-3.5">

                {/* 1. TOP STATUS BAR PILL */}
                <div className="bg-white rounded-2xl px-4 py-3 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                        <span className="text-xs font-bold text-slate-600 truncate uppercase">
                            DRIVER: <strong className="text-[#004b84]">{driverInfo.supir_nama || driverInfo.username || 'SOPIR'}</strong>
                        </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                            {driverInfo.supir_nip ? `NIP ${driverInfo.supir_nip}` : 'DLI PUSAT'}
                        </span>
                        <button
                            type="button"
                            onClick={() => fetchDriverData(selectedSimulasiNip, selectedNoST)}
                            title="Refresh Data"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer transition"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-600' : ''} />
                        </button>
                    </div>
                </div>

                {/* 2. MODE ADMIN: PILIH SOPIR */}
                {driverInfo.is_admin && (
                    <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                            <UserCheck size={12} className="text-indigo-600" /> SIMULASI AKUN SOPIR (ADMIN)
                        </label>
                        <select
                            value={selectedSimulasiNip}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSelectedSimulasiNip(val);
                                setSelectedNoST('');
                                fetchDriverData(val, '');
                            }}
                            className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800 uppercase outline-none focus:border-[#004b84]"
                        >
                            <option value="">-- PILIH NAMA SOPIR --</option>
                            {sopirList.map((s, idx) => (
                                <option key={idx} value={s.kry_nip || s.supir_id}>
                                    {s.kry_nama || s.supir_nama} ({s.kry_nip || s.supir_id})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* 3. RINGKASAN STATISTIK */}
                <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                        <div className="text-[10px] font-extrabold text-slate-400 uppercase">SURAT TUGAS AKTIF</div>
                        <div className="text-xl font-black text-[#004b84] mt-0.5">{suratTugasList.length}</div>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                        <div className="text-[10px] font-extrabold text-slate-400 uppercase">LOPER HARI INI (BELUM ANTAR)</div>
                        <div className="text-xl font-black text-amber-600 mt-0.5">{loperResiList.length}</div>
                    </div>
                </div>

                {/* 4. SEGMENTED TAB SWITCHER MOBILE */}
                <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs grid grid-cols-2 gap-1.5">
                    <button
                        type="button"
                        onClick={() => setActiveTab('surat-tugas')}
                        className={`py-3 px-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition cursor-pointer ${activeTab === 'surat-tugas'
                            ? 'bg-[#004b84] text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        <ClipboardList size={15} /> Surat Tugas ({suratTugasList.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('loper')}
                        className={`py-3 px-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition cursor-pointer ${activeTab === 'loper'
                            ? 'bg-[#059669] text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        <Package size={15} /> Loper Resi ({loperResiList.length})
                    </button>
                </div>

                {/* ===================================================================== */}
                {/* KONTEN TAB 1: SURAT TUGAS AKTIF JALAN                                 */}
                {/* ===================================================================== */}
                {activeTab === 'surat-tugas' && (
                    <div className="space-y-3">
                        {loading ? (
                            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center text-xs font-bold text-slate-400">
                                Memuat Surat Tugas...
                            </div>
                        ) : suratTugasList.length === 0 ? (
                            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center space-y-2">
                                <Truck size={32} className="mx-auto text-slate-300" />
                                <p className="text-xs font-bold text-slate-500">
                                    Belum ada Surat Tugas aktif untuk akun pengemudi ini.
                                </p>
                            </div>
                        ) : (
                            suratTugasList.map((st, idx) => (
                                <div key={idx} className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase block">NO. SURAT TUGAS</span>
                                            <span className="font-mono font-black text-sm text-[#004b84]">{st.no_surat_tugas}</span>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                                            AKTIF JALAN
                                        </span>
                                    </div>

                                    <div className="bg-slate-50 rounded-2xl p-3 space-y-2 text-xs">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 block">RUTE / TUJUAN</span>
                                            <span className="font-black text-emerald-700 uppercase">
                                                {st.asal_cabang} &rarr; {st.tujuan_tugas}
                                            </span>
                                            {st.nama_trayek && (
                                                <span className="block text-[11px] text-slate-500 font-semibold">{st.nama_trayek}</span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/70">
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 block">NO. POLISI</span>
                                                <span className="font-mono font-black text-slate-900">{st.no_polisi}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 block">BERANGKAT</span>
                                                <span className="font-mono text-[11px] text-slate-700">{st.tgl_berangkat}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handlePilihSuratTugas(st.no_surat_tugas)}
                                        className="w-full py-3 px-4 bg-[#004b84] hover:bg-blue-900 active:scale-[0.99] text-white font-black rounded-2xl text-xs uppercase flex items-center justify-between cursor-pointer transition shadow-xs"
                                    >
                                        <span>BUKA DAFTAR RESI HARI INI</span>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ===================================================================== */}
                {/* KONTEN TAB 2: LOPER RESI HARI INI (HANYA NOMOR RESI & BELUM DIANTAR)  */}
                {/* ===================================================================== */}
                {activeTab === 'loper' && (
                    <div className="space-y-3">
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
                            <div className="relative">
                                <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Cari No. Resi, Penerima, Alamat..."
                                    value={searchResi}
                                    onChange={(e) => setSearchResi(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-[#004b84] focus:bg-white"
                                />
                            </div>
                            {selectedNoST && (
                                <div className="flex items-center justify-between bg-indigo-50 px-3 py-2 rounded-xl text-[11px]">
                                    <span className="font-mono font-bold text-indigo-800 truncate">
                                        ST: {selectedNoST}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedNoST('');
                                            fetchDriverData(selectedSimulasiNip, '');
                                        }}
                                        className="font-black text-rose-600 uppercase ml-2 shrink-0 cursor-pointer"
                                    >
                                        Reset Filter
                                    </button>
                                </div>
                            )}
                        </div>

                        {filteredResi.length === 0 ? (
                            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center space-y-2">
                                <Package size={32} className="mx-auto text-slate-300" />
                                <p className="text-xs font-bold text-slate-500">
                                    Semua resi loper hari ini sudah diantar atau belum ada muatan baru.
                                </p>
                            </div>
                        ) : (
                            filteredResi.map((resi, idx) => {
                                const cleanPhone = String(resi.telp_penerima || '').replace(/\D/g, '').replace(/^0/, '62');
                                const mapsQuery = encodeURIComponent(`${resi.alamat_tujuan} ${resi.kota_tujuan}`);

                                return (
                                    <div
                                        key={idx}
                                        className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-2xs space-y-3"
                                    >
                                        {/* Header Resi (Hanya Nomor Resi Utama) */}
                                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                                    TITIK #{idx + 1} • NO. RESI
                                                </span>
                                                <span className="font-mono font-black text-sm text-[#004b84]">{resi.no_btt}</span>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${resi.status_antar === 'DALAM PENGANTARAN'
                                                ? 'bg-amber-100 text-amber-800'
                                                : 'bg-rose-100 text-rose-700'
                                                }`}>
                                                {resi.status_antar}
                                            </span>
                                        </div>

                                        {/* Info Penerima & Alamat (Tanpa Koli sebelum Konfirmasi Terkirim) */}
                                        <div className="space-y-1.5 text-xs">
                                            <div className="font-black text-slate-900 uppercase text-sm">{resi.penerima}</div>
                                            <p className="text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                {resi.alamat_tujuan} — <b>{resi.kota_tujuan}</b>
                                            </p>
                                            {Number(resi.nominal_cod) > 0 && (
                                                <div className="pt-1">
                                                    <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-mono text-[11px] font-bold">
                                                        COD Rp {Number(resi.nominal_cod).toLocaleString('id-ID')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Tombol Aksi Mobile */}
                                        <div className="pt-2 border-t border-slate-100 space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="py-2.5 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5"
                                                >
                                                    <Navigation size={14} /> Google Maps
                                                </a>
                                                {cleanPhone.length >= 9 ? (
                                                    <a
                                                        href={`https://wa.me/${cleanPhone}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5"
                                                    >
                                                        <Phone size={14} /> WhatsApp
                                                    </a>
                                                ) : (
                                                    <div className="py-2.5 px-3 bg-slate-100 text-slate-400 rounded-xl text-[11px] font-bold flex items-center justify-center">
                                                        No. HP Kosong
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => openPodModal(resi)}
                                                className="w-full py-3 px-4 rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2 cursor-pointer transition bg-[#059669] hover:bg-emerald-700 text-white shadow-xs"
                                            >
                                                <CheckCircle2 size={16} /> KONFIRMASI TERKIRIM (POD)
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* ===================================================================== */}
            {/* MODAL KONFIRMASI ANTAR + SCAN BARANG TURUN                            */}
            {/* ===================================================================== */}
            {podModalResi && (
                <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
                        <div className="px-5 py-4 bg-[#004b84] text-white flex items-center justify-between">
                            <h3 className="font-black text-sm uppercase">Konfirmasi Antar & Scan Turun</h3>
                            <button type="button" onClick={closePodModal} className="p-1 rounded-full hover:bg-white/15 cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitPod} className="p-5 space-y-3.5 text-xs overflow-y-auto">
                            {/* Info Resi & Jumlah Koli Baru Muncul di Sini */}
                            <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-between">
                                <div>
                                    <div className="font-mono font-black text-sm text-[#004b84]">{podModalResi.no_btt}</div>
                                    <div className="text-slate-600 font-bold mt-0.5 uppercase">{podModalResi.penerima}</div>
                                </div>
                                <div className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl font-black text-xs shrink-0">
                                    {podModalResi.koli} KOLI
                                </div>
                            </div>

                            {/* 3 Pilihan Status Pengantaran */}
                            <div>
                                <label className="font-black text-slate-700 block mb-1 uppercase">STATUS PENGANTARAN</label>
                                <select
                                    value={podStatus}
                                    onChange={(e) => setPodStatus(e.target.value)}
                                    className="w-full p-3 border border-slate-300 rounded-xl font-bold text-slate-800 bg-white outline-none focus:border-[#004b84]"
                                >
                                    <option value="AKSES_JALAN_DITUTUP">AKSES JALAN DITUTUP </option>
                                    <option value="AKSES_JALAN_TERGANGGU">AKSES JALAN TERGANGGU</option>
                                    <option value="ALAMAT_SUDAH_BENAR_TAPI_NAMA_PENERIMA_TIDAK_SESUAI">ALAMAT SUDAH BENAR TAPI NAMA PENERIMA TIDAK SESUAI</option>
                                    <option value="ALAMAT_TIDAK_DITEMUKAN">ALAMAT TIDAK DITEMUKAN</option>
                                    <option value="AKSES_JALAN_DITUTUP">AKSES JALAN DITUTUP</option>
                                    <option value="BARANG_RUSAK_PADA_SAAT_PROSES_PENGIRIMAN">BARANG RUSAK PADA SAAT PROSES PENGIRIMAN</option>
                                    <option value="DITOLAK_OLEH_PENERIMA">DITOLAK OLEH PENERIMA</option>
                                    <option value="DITUNDA_KARENA_CUACA_BURUK">DITUNDA KARENA CUACA BURUK</option>
                                    <option value="MENUNGGU_PROSES_PEMBAYARAN_DARI_PENGIRIM">MENUNGGU PROSES PEMBAYARAN DARI PENGIRIM</option>
                                    <option value="MENUNGGU_PROSES_PENGAMBILAN_BARANG_OLEH_PENERIMA">MENUNGGU PROSES PENGAMBILAN BARANG OLEH PENERIMA</option>
                                    <option value="NOMOR_TELEPON_TIDAK_BISA_DIHUBUNGI">NOMOR TELEPON TIDAK BISA DIHUBUNGI</option>
                                    <option value="NOMOR_TELP_PENERIMA_TIDAK_DIANGKAT">NOMOR TELP PENERIMA TIDAK DIANGKAT</option>
                                    <option value="PENERIMA_MEMINTA_PENGAMBILAN_BARANG_SENDIRI_DI_KANTOR">PENERIMA MEMINTA PENGAMBILAN BARANG SENDIRI DI KANTOR</option>
                                    <option value="PENERIMA_MEMINTA_PERUBAHAN_WAKTU_PENGANTARAN">PENERIMA MEMINTA PERUBAHAN WAKTU PENGANTARAN</option>
                                    <option value="PENERIMA_MENOLAK_MEMBAYAR_BIAYA_TAMBAHAN_PENGANTARAN">PENERIMA MENOLAK MEMBAYAR BIAYA TAMBAHAN PENGANTARAN</option>
                                    <option value="PENERIMA_MENOLAK_MEMBAYAR_COD">PENERIMA MENOLAK MEMBAYAR COD</option>
                                    <option value="PENERIMA_PINDAH_ALAMAT">PENERIMA PINDAH ALAMAT</option>
                                    <option value="PENERIMA_TIDAK_DAPAT_MENERIMA_KIRIMAN_(Toko/PT_Libur)">PENERIMA TIDAK DAPAT MENERIMA KIRIMAN (Toko/PT Libur)</option>
                                    <option value="PENERIMA_TIDAK_DITEMPAT">PENERIMA TIDAK DITEMPAT</option>
                                    <option value="PENGANTARAN_MENUNGGU_KONFIRMASI_DARI_PENERIMA">PENGANTARAN MENUNGGU KONFIRMASI DARI PENERIMA</option>
                                    <option value="PENGIRIM_MEMINTA_PENGANTARAN_KE_ALAMAT_LAIN">PENGIRIM MEMINTA PENGANTARAN KE ALAMAT LAIN</option>
                                    <option value="PENGIRIMAN_DIBATALKAN_ATAS_PERMINTAAN_PENGIRIM">PENGIRIMAN DIBATALKAN ATAS PERMINTAAN PENGIRIM</option>
                                    <option value="UKURAN_BARANG_TERLALU_BESAR_UNTUK_DIANTAR">UKURAN BARANG TERLALU BESAR UNTUK DIANTAR</option>

                                </select>
                            </div>

                            {/* Nama Penerima */}
                            <div>
                                <label className="font-black text-slate-700 block mb-1 uppercase">NAMA PENERIMA DI LOKASI *</label>
                                <input
                                    type="text"
                                    required
                                    value={podPenerima}
                                    onChange={(e) => setPodPenerima(e.target.value)}
                                    placeholder="Nama penerima di lokasi..."
                                    className="w-full p-3 border border-slate-300 rounded-xl font-bold uppercase outline-none focus:border-[#004b84]"
                                />
                            </div>

                            {/* Fitur Scan Barang Turun (Menggantikan Catatan) */}
                            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <label className="font-black text-emerald-900 uppercase flex items-center gap-1.5">
                                        <QrCode size={15} /> SCAN BARANG TURUN ({scannedKoliList.length}/{podModalResi.koli} KOLI)
                                    </label>
                                    {!isCameraOpen ? (
                                        <button
                                            type="button"
                                            onClick={startCameraScanner}
                                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                        >
                                            <Camera size={13} /> Kamera
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={stopCameraScanner}
                                            className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                                        >
                                            Tutup Kamera
                                        </button>
                                    )}
                                </div>

                                {/* Area Kamera QR Scanner */}
                                {isCameraOpen && (
                                    <div id="pod-qr-reader" className="w-full rounded-xl overflow-hidden border border-emerald-400 bg-black" />
                                )}

                                {/* Input Scan Barcode Manual / Scanner */}
                                <div className="flex gap-2">
                                    <input
                                        ref={scanInputRef}
                                        type="text"
                                        value={scanKoliInput}
                                        onChange={(e) => setScanKoliInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddScannedKoli();
                                            }
                                        }}
                                        placeholder={`Scan kode koli ${podModalResi.no_btt}0001...`}
                                        className="flex-1 p-2.5 bg-white border border-emerald-300 rounded-xl font-mono text-xs uppercase outline-none focus:border-emerald-600"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleAddScannedKoli()}
                                        className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl uppercase cursor-pointer"
                                    >
                                        Scan
                                    </button>
                                </div>

                                {/* Daftar Koli yang Sudah Di-scan Turun */}
                                {scannedKoliList.length > 0 && (
                                    <div className="space-y-1 max-h-28 overflow-y-auto pt-1">
                                        {scannedKoliList.map((kode, i) => (
                                            <div key={i} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-emerald-200 font-mono text-[11px] font-bold text-emerald-900">
                                                <span>{i + 1}. {kode}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setScannedKoliList(scannedKoliList.filter((item) => item !== kode))}
                                                    className="text-rose-500 hover:text-rose-700 cursor-pointer"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Tombol Simpan & Batal */}
                            <div className="grid grid-cols-2 gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={closePodModal}
                                    className="py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-2xl uppercase cursor-pointer"
                                >
                                    BATAL
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingPod}
                                    className="py-3 bg-[#059669] hover:bg-emerald-700 text-white font-black rounded-2xl uppercase cursor-pointer shadow-xs disabled:opacity-60"
                                >
                                    {submittingPod ? 'MENYIMPAN...' : 'SIMPAN STATUS'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverPortal;