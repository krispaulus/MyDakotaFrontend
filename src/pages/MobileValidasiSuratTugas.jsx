import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api/axios';
import {
    CheckCircle2, XCircle, RefreshCw, Camera, X,
    PlusCircle, QrCode, PackageCheck, Play, Trash2
} from 'lucide-react';
import Swal from 'sweetalert2';

const MobileValidasiSuratTugas = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const noSuratTugas = searchParams.get('no') || '';

    const [inputManualNo, setInputManualNo] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);

    // State Proses Muat Barang (Loading Checker)
    const [isLoadingMode, setIsLoadingMode] = useState(false);
    const [loadingId, setLoadingId] = useState('');
    const [isLoadingFinished, setIsLoadingFinished] = useState(false);
    const [koliInput, setKoliInput] = useState('');
    const [scanningKoli, setScanningKoli] = useState(false);

    // State Scanner Kamera (Surat Tugas & Koli BTT)
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraLoading, setCameraLoading] = useState(false);
    const [isKoliCameraOpen, setIsKoliCameraOpen] = useState(false);

    const html5QrCodeRef = useRef(null);
    const koliQrCodeRef = useRef(null);
    const koliInputRef = useRef(null);

    const loggedUser = localStorage.getItem('username')
        || localStorage.getItem('realname')
        || 'PETUGAS CHECKER';
    const loggedCabang = localStorage.getItem('active_cabang_nama')
        || localStorage.getItem('cabang_nama')
        || 'DLI PUSAT';

    const fetchDetail = async (nomor) => {
        if (!nomor) return;
        setLoading(true);
        try {
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get(`/operasional/surat-tugas/public-detail`, {
                params: { no: nomor, pt_id: ptId }
            });
            setData(res.data?.data || null);
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (noSuratTugas) {
            fetchDetail(noSuratTugas);
        }
    }, [noSuratTugas]);

    // =========================================================================
    // 📷 1. SCANNER KAMERA SURAT TUGAS (TAHAP AWAL)
    // =========================================================================
    const startScanner = async () => {
        setIsCameraOpen(true);
        setCameraLoading(true);

        setTimeout(async () => {
            try {
                const scanner = new Html5Qrcode("qr-reader-box");
                html5QrCodeRef.current = scanner;

                await scanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 230, height: 230 }, aspectRatio: 1.0 },
                    (decodedText) => {
                        stopScanner();
                        let cleanCode = decodedText.trim();
                        if (cleanCode.includes('no=')) {
                            cleanCode = decodeURIComponent(cleanCode.split('no=')[1].split('&')[0]);
                        }
                        cleanCode = cleanCode.toUpperCase();
                        setInputManualNo(cleanCode);
                        setSearchParams({ no: cleanCode });
                    },
                    () => { }
                );
                setCameraLoading(false);
            } catch (err) {
                console.error("Gagal menyalakan kamera:", err);
                setCameraLoading(false);
                setIsCameraOpen(false);
                Swal.fire({
                    icon: 'warning',
                    title: 'Kamera Tidak Tersedia',
                    text: 'Izin kamera ditolak atau koneksi masih HTTP. Silakan gunakan input nomor manual.',
                    confirmButtonColor: '#004b84'
                });
            }
        }, 300);
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current) {
            try {
                await html5QrCodeRef.current.stop();
                html5QrCodeRef.current.clear();
            } catch { }
            html5QrCodeRef.current = null;
        }
        setIsCameraOpen(false);
        setCameraLoading(false);
    };

    // =========================================================================
    // 📦 2. KLIK "TAMBAH RINCIAN" -> MULAI PROSES MUAT BARANG (LOADING)
    // =========================================================================
    const handleTambahRincian = async () => {
        if (!data) return;
        try {
            const ptId = localStorage.getItem('pt_id') || 'C';
            const targetNo = data.raw_sjh_id || data.no_surat_tugas || noSuratTugas;
            const res = await api.post(`/operasional/surat-tugas/start-loading?pt_id=${ptId}`, {
                no_surat_tugas: targetNo
            });

            setLoadingId(res.data?.loading_id || `LC001${Date.now()}`);
            setIsLoadingMode(true);
            setIsLoadingFinished(false);

            setTimeout(() => {
                if (koliInputRef.current) koliInputRef.current.focus();
            }, 250);
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal memulai proses muat barang', 'error');
        }
    };

    // =========================================================================
    // 📷 3. SCAN QR / BARCODE KOLI BTT KE DALAM SURAT TUGAS
    // =========================================================================
    const handleScanKoliSubmit = async (kodeKoliRaw) => {
        const cleanKode = (kodeKoliRaw || '').trim().toUpperCase();
        if (!cleanKode || !data || scanningKoli) return;

        setScanningKoli(true);
        try {
            const ptId = localStorage.getItem('pt_id') || 'C';
            const targetNo = data.raw_sjh_id || data.no_surat_tugas || noSuratTugas;

            const res = await api.post(`/operasional/surat-tugas/scan-btt-koli?pt_id=${ptId}`, {
                no_surat_tugas: targetNo,
                kode_scan: cleanKode
            });

            await fetchDetail(targetNo);
            setKoliInput('');

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: res.data?.message || 'Koli berhasil di-scan!',
                showConfirmButton: false,
                timer: 1400
            });
        } catch (err) {
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian',
                text: err.response?.data?.message || 'Kode BTT / Koli tidak ditemukan',
                timer: 2200
            });
            setKoliInput('');
        } finally {
            setScanningKoli(false);
            if (koliInputRef.current) koliInputRef.current.focus();
        }
    };

    // Kamera Scan QR Koli BTT
    const startKoliScanner = () => {
        setIsKoliCameraOpen(true);
        setTimeout(async () => {
            try {
                const scanner = new Html5Qrcode("koli-qr-reader-box");
                koliQrCodeRef.current = scanner;

                await scanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
                    (decodedText) => {
                        stopKoliScanner();
                        handleScanKoliSubmit(decodedText);
                    },
                    () => { }
                );
            } catch {
                setIsKoliCameraOpen(false);
                Swal.fire('Kamera Tidak Tersedia', 'Gunakan scanner laser atau ketik nomor koli BTT secara manual.', 'info');
            }
        }, 300);
    };

    const stopKoliScanner = async () => {
        if (koliQrCodeRef.current) {
            try {
                await koliQrCodeRef.current.stop();
                koliQrCodeRef.current.clear();
            } catch { }
            koliQrCodeRef.current = null;
        }
        setIsKoliCameraOpen(false);
    };

    useEffect(() => {
        return () => {
            stopScanner();
            stopKoliScanner();
        };
    }, []);

    // Hapus BTT dari daftar muatan
    const handleRemoveBTT = async (noBtt) => {
        try {
            const ptId = localStorage.getItem('pt_id') || 'C';
            const targetNo = data.raw_sjh_id || data.no_surat_tugas || noSuratTugas;
            await api.delete(`/operasional/surat-tugas/remove-btt`, {
                params: { pt_id: ptId, sjh_id: targetNo, no_btt: noBtt }
            });
            fetchDetail(targetNo);
        } catch {
            Swal.fire('Gagal', 'Tidak dapat menghapus BTT dari daftar muat', 'error');
        }
    };

    // =========================================================================
    // ✅ 4. SELESAI SCAN CHECKER & JALANKAN TUGAS OLEH KEPALA OPERASIONAL
    // =========================================================================
    const handleSelesaiScanChecker = () => {
        if (!data?.btt_list || data.btt_list.length === 0) {
            Swal.fire('Peringatan', 'Belum ada BTT yang dipindai ke dalam surat tugas ini!', 'warning');
            return;
        }
        stopKoliScanner();
        setIsLoadingMode(false);
        setIsLoadingFinished(true);

        Swal.fire({
            icon: 'success',
            title: 'Pemindaian Barang Selesai!',
            text: 'Muatan barang sudah masuk ke surat jalan. Kepala Operasional dapat menekan tombol "Jalankan Tugas".',
            confirmButtonColor: '#004b84'
        });
    };

    const handleJalankanTugas = async () => {
        const confirm = await Swal.fire({
            title: 'Jalankan Tugas Operasional?',
            text: `Aktifkan Surat Tugas ${getFormattedNo()} untuk armada ${data?.no_kendaraan || ''}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#059669',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Jalankan Tugas!',
            cancelButtonText: 'Batal'
        });

        if (confirm.isConfirmed) {
            setProcessing(true);
            try {
                const targetNo = data?.raw_sjh_id || data?.no_surat_tugas || noSuratTugas;
                await api.post('/operasional/surat-tugas/update-status-proses', {
                    no_surat_tugas: targetNo
                });

                Swal.fire({
                    icon: 'success',
                    title: 'TUGAS BERJALAN!',
                    text: 'Surat Tugas berhasil diaktifkan (PROSES).',
                    timer: 1800,
                    showConfirmButton: false
                }).then(() => {
                    setData(prev => ({ ...prev, status: 'PROSES' }));
                });
            } catch (err) {
                Swal.fire('Gagal', err.response?.data?.message || 'Gagal mengaktifkan surat tugas.', 'error');
            } finally {
                setProcessing(false);
            }
        }
    };

    const handleBatal = () => {
        stopKoliScanner();
        if (isLoadingMode) {
            setIsLoadingMode(false);
            return;
        }
        if (window.history.length > 1) {
            window.history.back();
        } else {
            setSearchParams({});
            setData(null);
        }
    };

    const getFormattedNo = () => {
        const raw = String(data?.no_surat_tugas || noSuratTugas || '').trim();
        if (raw.includes('JC') && raw.length >= 15) return raw;
        const digits = raw.replace(/\D/g, '');
        const urut = digits.length >= 4 ? digits.slice(-4) : '0001';

        let yyyymm = '202611';
        if (data?.tgl_berangkat) {
            const d = new Date(data.tgl_berangkat);
            if (!isNaN(d.getTime())) {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                yyyymm = `${y}${m}`;
            }
        }
        return `001JC${yyyymm}${urut}`;
    };

    const isSudahProses = data?.status === 'PROSES' && (data?.btt_list?.length || 0) > 0 && isLoadingFinished;

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 p-4 pb-28 font-sans max-w-md mx-auto">
            {/* 1. Bar Identitas Petugas Checker */}
            <div className="flex items-center justify-between px-3.5 py-2.5 mb-3 bg-white rounded-2xl border border-slate-200 text-xs shadow-xs">
                <div className="flex items-center gap-2 font-bold text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>PETUGAS: <b className="text-[#004b84] uppercase">{loggedUser}</b></span>
                </div>
                <span className="font-bold text-slate-400 font-mono text-[10px] uppercase">
                    {loggedCabang}
                </span>
            </div>

            {/* 2. Form Input & Kamera Scan jika data belum dipilih */}
            {!noSuratTugas && !data && (
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4 mb-4">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">
                        Scan / Masukkan No. Surat Tugas :
                    </label>

                    {!isCameraOpen ? (
                        <button
                            type="button"
                            onClick={startScanner}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Camera size={18} />
                            <span>Buka Kamera Scan QR</span>
                        </button>
                    ) : (
                        <div className="space-y-2">
                            <div className="relative w-full aspect-square max-w-[260px] mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500 bg-black flex items-center justify-center">
                                <div id="qr-reader-box" className="w-full h-full"></div>
                                {cameraLoading && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-xs gap-2">
                                        <RefreshCw size={24} className="animate-spin text-emerald-400" />
                                        <span>Menyiapkan Kamera...</span>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={stopScanner}
                                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <X size={16} /> Tutup Kamera
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-2 py-1">
                        <div className="flex-1 border-t border-slate-200"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Atau Ketik Manual</span>
                        <div className="flex-1 border-t border-slate-200"></div>
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Contoh: 001JC2026117033"
                            value={inputManualNo}
                            onChange={(e) => setInputManualNo(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && inputManualNo.trim()) {
                                    setSearchParams({ no: inputManualNo.trim() });
                                }
                            }}
                            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-xs outline-none focus:border-[#004b84]"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                if (inputManualNo.trim()) {
                                    setSearchParams({ no: inputManualNo.trim() });
                                }
                            }}
                            className="px-5 py-2.5 bg-[#004b84] hover:bg-[#003863] text-white font-bold rounded-xl text-xs uppercase cursor-pointer transition active:scale-95"
                        >
                            Cari
                        </button>
                    </div>
                </div>
            )}

            {/* 3. Loading State */}
            {loading && (
                <div className="bg-white rounded-2xl shadow-sm p-8 text-center space-y-3 border border-slate-200">
                    <RefreshCw size={24} className="animate-spin text-[#004b84] mx-auto" />
                    <p className="text-xs font-bold text-slate-500">Memuat rincian surat tugas...</p>
                </div>
            )}

            {/* 4. Tampilan Detail Surat Tugas & Proses Muat Barang */}
            {!loading && data && (
                <div className="space-y-3">
                    {/* KARTU BIRU HEADER */}
                    <div className="bg-[#004b84] text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold tracking-wider uppercase text-sky-200 block">
                                {isLoadingMode ? 'PROSES MUAT BARANG' : 'VALIDASI SURAT TUGAS'}
                            </span>
                            <h1 className="text-base font-black font-mono tracking-wide">
                                {getFormattedNo()}
                            </h1>
                            {loadingId && (
                                <span className="text-[10px] font-mono text-emerald-300 font-bold block mt-0.5">
                                    LOADING ID: {loadingId}
                                </span>
                            )}
                        </div>
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 ${data.status === 'PROSES' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-900'
                            }`}>
                            <CheckCircle2 size={14} />
                            {data.status || 'DRAFT'}
                        </span>
                    </div>

                    {/* DETAIL ARMADA & DRIVER */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-[11px] font-bold text-slate-700 space-y-2.5">
                        <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-100">
                            <div>
                                <span className="text-[10px] text-slate-400 block font-semibold uppercase">TANGGAL MUAT :</span>
                                <span className="font-mono text-slate-900">{data.tgl_berangkat ? data.tgl_berangkat.slice(0, 10) : '-'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 block font-semibold uppercase">NOMOR KENDARAAN :</span>
                                <span className="font-mono font-black text-slate-900">{data.no_kendaraan || '-'}</span>
                            </div>
                        </div>

                        <div className="pb-2 border-b border-slate-100">
                            <span className="text-[10px] text-slate-400 block font-semibold uppercase">DRIVER :</span>
                            <span className="text-slate-900 font-black">
                                {data.pengemudi || data.pengemudi_1 || '-'} {data.nip_pengemudi && data.nip_pengemudi !== '-' ? `(${data.nip_pengemudi})` : ''}
                            </span>
                        </div>

                        <div className="pb-2 border-b border-slate-100">
                            <span className="text-[10px] text-slate-400 block font-semibold uppercase">KETERANGAN :</span>
                            <span className="text-slate-800 font-bold uppercase">
                                {data.tugas || 'Loper'} — {data.keterangan || 'LOPER DALAM KOTA'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div>
                                <span className="text-slate-400 block font-semibold uppercase">RUTE UTAMA :</span>
                                <span className="text-slate-800 font-bold">{data.trayek_nama || '-'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block font-semibold uppercase">RUTE CADANGAN :</span>
                                <span className="text-slate-500 font-medium">-</span>
                            </div>
                        </div>
                    </div>

                    {/* 🌟 TOMBOL "TAMBAH RINCIAN" (GAMBAR 2 ASP LAWAS) */}
                    {!isLoadingMode && (
                        <div className="bg-white p-3.5 rounded-2xl border border-sky-200 shadow-xs flex items-center justify-between gap-2">
                            <div>
                                <div className="font-black text-xs text-slate-800 uppercase">Muatan Koli BTT</div>
                                <div className="text-[10px] text-slate-500">Scan QR / Barcode stiker koli BTT</div>
                            </div>
                            <button
                                type="button"
                                onClick={handleTambahRincian}
                                className="px-4 py-2.5 bg-[#00668c] hover:bg-[#004b66] text-white font-black rounded-xl text-xs uppercase flex items-center gap-1.5 shadow-sm cursor-pointer transition active:scale-95 shrink-0"
                            >
                                <PlusCircle size={15} /> TAMBAH RINCIAN
                            </button>
                        </div>
                    )}

                    {/* 🌟 AREA SCANNER QR / BARCODE KOLI BTT (AKTIF SAAT KLIK TAMBAH RINCIAN) */}
                    {isLoadingMode && (
                        <div className="bg-sky-50 border-2 border-sky-400 p-3.5 rounded-2xl space-y-2.5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="font-black text-[11px] text-sky-950 uppercase flex items-center gap-1">
                                    <QrCode size={15} className="text-sky-600" /> Scan QR / Barcode Koli
                                </span>
                                {!isKoliCameraOpen ? (
                                    <button
                                        type="button"
                                        onClick={startKoliScanner}
                                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] uppercase flex items-center gap-1 cursor-pointer"
                                    >
                                        <Camera size={12} /> Kamera QR
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={stopKoliScanner}
                                        className="px-2.5 py-1.5 bg-rose-600 text-white font-bold rounded-lg text-[10px] uppercase flex items-center gap-1 cursor-pointer"
                                    >
                                        <X size={12} /> Tutup
                                    </button>
                                )}
                            </div>

                            {isKoliCameraOpen && (
                                <div className="w-full max-w-[230px] mx-auto rounded-xl overflow-hidden border-2 border-emerald-500 bg-black">
                                    <div id="koli-qr-reader-box" className="w-full"></div>
                                </div>
                            )}

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleScanKoliSubmit(koliInput);
                                }}
                                className="flex gap-1.5"
                            >
                                <input
                                    ref={koliInputRef}
                                    type="text"
                                    value={koliInput}
                                    onChange={(e) => setKoliInput(e.target.value.toUpperCase())}
                                    placeholder="Scan / Ketik Kode Koli BTT..."
                                    className="flex-1 p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs uppercase outline-none focus:border-sky-600"
                                />
                                <button
                                    type="submit"
                                    disabled={scanningKoli || !koliInput.trim()}
                                    className="px-4 py-2.5 bg-[#004b84] text-white font-black rounded-xl text-xs uppercase cursor-pointer disabled:opacity-50"
                                >
                                    {scanningKoli ? '...' : 'OK'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* 📦 TABEL JUMLAH BTT TERDAFTAR */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-sky-50/80 px-4 py-2 border-b border-sky-100 flex items-center justify-between">
                            <span className="font-black text-sky-900 text-xs uppercase tracking-wide">
                                JUMLAH BTT TERDAFTAR : {data.btt_list?.length || 0}
                            </span>
                            {isLoadingFinished && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                    ✓ Selesai Scan
                                </span>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px] border-collapse">
                                <thead className="bg-[#004b84] text-white font-bold uppercase text-[10px]">
                                    <tr>
                                        <th className="py-2.5 px-2.5">NO BTT</th>
                                        <th className="py-2.5 px-2">TUJUAN</th>
                                        <th className="py-2.5 px-1 text-center">COLLY</th>
                                        <th className="py-2.5 px-1 text-center">DISCAN</th>
                                        <th className="py-2.5 px-1 text-center">KURANG</th>
                                        <th className="py-2.5 px-1.5 text-center">KET</th>
                                        {isLoadingMode && <th className="py-2.5 px-1.5 text-center">HAPUS</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                    {(!data.btt_list || data.btt_list.length === 0) ? (
                                        <tr>
                                            <td colSpan={isLoadingMode ? 7 : 6} className="text-center py-6 text-slate-400 italic font-normal">
                                                Belum ada BTT muatan yang terdaftar pada surat tugas ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        data.btt_list.map((btt, bIdx) => {
                                            const isSesuai = Number(btt.kurang) === 0 && Number(btt.discan) > 0;
                                            return (
                                                <tr key={bIdx} className={bIdx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                                                    <td className="py-2 px-2.5 font-mono font-bold text-sky-800">{btt.no_btt}</td>
                                                    <td className="py-2 px-2 uppercase text-slate-800 font-bold">{btt.tujuan}</td>
                                                    <td className="py-2 px-1 text-center font-bold text-slate-900">{btt.colly}</td>
                                                    <td className="py-2 px-1 text-center font-bold text-emerald-600">{btt.discan}</td>
                                                    <td className="py-2 px-1 text-center font-bold text-rose-500">
                                                        {btt.kurang > 0 ? btt.kurang : ''}
                                                    </td>
                                                    <td className="py-2 px-1.5 text-center">
                                                        {isSesuai ? (
                                                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-500 text-white font-bold text-[10px]">
                                                                ✓
                                                            </span>
                                                        ) : (
                                                            <span className="text-[9px] font-bold text-amber-600">-{btt.kurang}</span>
                                                        )}
                                                    </td>
                                                    {isLoadingMode && (
                                                        <td className="py-2 px-1.5 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveBTT(btt.no_btt)}
                                                                className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* FOOTER TOMBOL FLOATING: BATAL | SELESAI (CHECKER) / JALANKAN TUGAS (KA. OPERASIONAL) */}
                    <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 max-w-md mx-auto flex items-center gap-3 z-30">
                        <button
                            type="button"
                            onClick={handleBatal}
                            className="flex-1 py-3 bg-[#e2e8f0] hover:bg-slate-300 active:scale-98 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer text-center shadow-xs"
                        >
                            BATAL
                        </button>

                        {isLoadingMode ? (
                            <button
                                type="button"
                                onClick={handleSelesaiScanChecker}
                                className="flex-1 py-3 bg-[#16a34a] hover:bg-emerald-700 active:scale-98 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <PackageCheck size={16} />
                                <span>SELESAI</span>
                            </button>
                        ) : isSudahProses ? (
                            <button
                                type="button"
                                disabled
                                className="flex-1 py-3 bg-[#94a3b8] text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-90"
                            >
                                <CheckCircle2 size={16} />
                                <span>SUDAH PROSES</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={processing}
                                onClick={handleJalankanTugas}
                                className="flex-1 py-3 bg-[#059669] hover:bg-emerald-700 active:scale-98 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <Play size={15} />
                                <span>{processing ? 'MEMPROSES...' : 'JALANKAN TUGAS'}</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* 5. Tampilan jika Nomor Dicari tapi Tidak Ada di Database */}
            {!loading && noSuratTugas && !data && (
                <div className="bg-white rounded-2xl shadow-sm p-6 text-center space-y-4 border border-slate-200">
                    <XCircle size={44} className="text-rose-500 mx-auto" />
                    <h2 className="text-sm font-black text-slate-800">DATA TIDAK DITEMUKAN</h2>
                    <p className="text-xs text-slate-500 font-mono">Nomor: {noSuratTugas}</p>
                    <button
                        type="button"
                        onClick={() => {
                            setSearchParams({});
                            setInputManualNo('');
                        }}
                        className="w-full py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl text-xs uppercase cursor-pointer"
                    >
                        Coba Nomor Lain
                    </button>
                </div>
            )}
        </div>
    );
};

export default MobileValidasiSuratTugas;