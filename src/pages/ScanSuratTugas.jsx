import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
    QrCode, Camera, Keyboard, CheckCircle, AlertCircle, RefreshCw,
    Truck, PlusCircle, Play, CheckCircle2, Trash2, PackageCheck, X
} from 'lucide-react';
import api from '../api/axios';
import Swal from 'sweetalert2';

export default function ScanSuratTugas() {
    const [searchParams] = useSearchParams();
    const initialNoFromUrl = searchParams.get('no') || '';

    // State Mode & Tahapan Proses
    const [scanMode, setScanMode] = useState('camera'); // 'camera' | 'manual'
    const [manualCode, setManualCode] = useState(initialNoFromUrl);
    const [isScanning, setIsScanning] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [verifying, setVerifying] = useState(false);

    // State Data Surat Tugas & Loading Muat Barang
    const [documentData, setDocumentData] = useState(null);
    const [isLoadingMode, setIsLoadingMode] = useState(false); // Aktif setelah klik TAMBAH RINCIAN
    const [loadingId, setLoadingId] = useState('');
    const [isLoadingFinished, setIsLoadingFinished] = useState(false); // Aktif setelah klik SELESAI
    const [koliInput, setKoliInput] = useState('');
    const [scanningKoli, setScanningKoli] = useState(false);

    const html5QrCodeRef = useRef(null);
    const koliScannerRef = useRef(null);
    const koliInputRef = useRef(null);

    // Otomatis load jika URL memiliki parameter ?no=... (dari hasil scan QR fisik)
    useEffect(() => {
        if (initialNoFromUrl) {
            fetchSuratTugasDetail(initialNoFromUrl);
        }
    }, [initialNoFromUrl]);

    // =========================================================================
    // 1. SCANNER SURAT TUGAS (TAHAP AWAL)
    // =========================================================================
    const startScanner = async () => {
        setCameraError('');
        try {
            const container = document.getElementById('qr-reader-container');
            if (!container) return;

            const html5QrCode = new Html5Qrcode('qr-reader-container');
            html5QrCodeRef.current = html5QrCode;

            await html5QrCode.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
                async (decodedText) => {
                    await stopScanner();
                    // Ekstrak nomor ST jika hasil scan berupa URL
                    let extractedNo = decodedText.trim();
                    if (extractedNo.includes('no=')) {
                        extractedNo = decodeURIComponent(extractedNo.split('no=')[1].split('&')[0]);
                    }
                    fetchSuratTugasDetail(extractedNo);
                },
                () => { }
            );
            setIsScanning(true);
        } catch (err) {
            setCameraError('Kamera tidak tersedia atau akses ditolak. Silakan gunakan tab Ketik Manual.');
            setIsScanning(false);
        }
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current && isScanning) {
            try {
                await html5QrCodeRef.current.stop();
                html5QrCodeRef.current.clear();
            } catch (e) { }
            setIsScanning(false);
        }
    };

    useEffect(() => {
        if (!documentData && scanMode === 'camera') {
            startScanner();
        } else {
            stopScanner();
        }
        return () => { stopScanner(); };
    }, [scanMode, documentData]);

    // Ambil Detail Surat Tugas beserta Daftar BTT Terdaftar
    const fetchSuratTugasDetail = async (nomorSurat) => {
        const cleanNo = (nomorSurat || '').trim();
        if (!cleanNo) return;

        setVerifying(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get(`/operasional/surat-tugas/detail-public`, {
                params: { no: cleanNo, pt_id: ptId },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.status === 'success') {
                setDocumentData(res.data.data);
            }
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Surat Tugas Tidak Ditemukan',
                text: err.response?.data?.message || `Nomor [${cleanNo}] tidak terdaftar di sistem.`
            }).then(() => {
                if (scanMode === 'camera') startScanner();
            });
        } finally {
            setVerifying(false);
        }
    };

    // =========================================================================
    // 2. KLIK "TAMBAH RINCIAN" -> MULAI PROSES MUAT BARANG (GAMBAR 2 -> GAMBAR 4)
    // =========================================================================
    const handleTambahRincian = async () => {
        if (!documentData) return;
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.post(`/operasional/surat-tugas/start-loading?pt_id=${ptId}`, {
                no_surat_tugas: documentData.raw_sjh_id || documentData.no_surat_tugas
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setLoadingId(res.data?.loading_id || `LC001${Date.now()}`);
            setIsLoadingMode(true);
            setIsLoadingFinished(false);

            // Auto-fokus ke input scan barcode/QR koli
            setTimeout(() => {
                if (koliInputRef.current) koliInputRef.current.focus();
            }, 200);
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal memulai proses muat barang', 'error');
        }
    };

    // =========================================================================
    // 3. SCAN QR / BARCODE KOLI BTT KE DALAM SURAT TUGAS (GAMBAR 3 & 4)
    // =========================================================================
    const handleScanKoliSubmit = async (kodeKoliRaw) => {
        const cleanKode = (kodeKoliRaw || '').trim().toUpperCase();
        if (!cleanKode || !documentData || scanningKoli) return;

        setScanningKoli(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.post(`/operasional/surat-tugas/scan-btt-koli?pt_id=${ptId}`, {
                no_surat_tugas: documentData.raw_sjh_id || documentData.no_surat_tugas,
                kode_scan: cleanKode
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Refresh daftar BTT pada Surat Tugas secara realtime
            await fetchSuratTugasDetail(documentData.raw_sjh_id || documentData.no_surat_tugas);
            setKoliInput('');

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: res.data?.message || 'Koli berhasil di-scan!',
                showConfirmButton: false,
                timer: 1500
            });
        } catch (err) {
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian',
                text: err.response?.data?.message || 'Gagal memindai QR Code Koli BTT',
                timer: 2200
            });
            setKoliInput('');
        } finally {
            setScanningKoli(false);
            if (koliInputRef.current) koliInputRef.current.focus();
        }
    };

    // Kamera Scan QR Koli BTT
    const [showKoliCamera, setShowKoliCamera] = useState(false);

    useEffect(() => {
        let scannerInstance = null;
        if (showKoliCamera && isLoadingMode) {
            const startKoliCam = async () => {
                try {
                    scannerInstance = new Html5Qrcode('koli-qr-reader');
                    koliScannerRef.current = scannerInstance;
                    await scannerInstance.start(
                        { facingMode: 'environment' },
                        { fps: 10, qrbox: { width: 220, height: 220 } },
                        async (decodedText) => {
                            await scannerInstance.stop();
                            setShowKoliCamera(false);
                            handleScanKoliSubmit(decodedText);
                        },
                        () => { }
                    );
                } catch (e) {
                    Swal.fire('Kamera Tidak Tersedia', 'Silakan gunakan scanner laser atau ketik nomor koli manual.', 'info');
                    setShowKoliCamera(false);
                }
            };
            startKoliCam();
        }
        return () => {
            if (scannerInstance) {
                scannerInstance.stop().catch(() => { });
            }
        };
    }, [showKoliCamera, isLoadingMode]);

    // Hapus BTT dari daftar muatan jika salah scan
    const handleRemoveBTT = async (noBtt) => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            await api.delete(`/operasional/surat-tugas/remove-btt`, {
                params: {
                    pt_id: ptId,
                    sjh_id: documentData.raw_sjh_id || documentData.no_surat_tugas,
                    no_btt: noBtt
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchSuratTugasDetail(documentData.raw_sjh_id || documentData.no_surat_tugas);
        } catch (err) {
            Swal.fire('Gagal', 'Tidak dapat menghapus BTT dari daftar muat', 'error');
        }
    };

    // =========================================================================
    // 4. SELESAI SCAN & AKTIFKAN "JALANKAN TUGAS" OLEH KEPALA OPERASIONAL
    // =========================================================================
    const handleSelesaiScanChecker = () => {
        if (!documentData?.btt_list || documentData.btt_list.length === 0) {
            Swal.fire('Peringatan', 'Belum ada BTT yang dipindai ke dalam surat tugas ini!', 'warning');
            return;
        }
        setIsLoadingMode(false);
        setIsLoadingFinished(true);
        setShowKoliCamera(false);

        Swal.fire({
            icon: 'success',
            title: 'Pemindaian Barang Selesai!',
            text: 'Data muatan telah terkunci. Kepala Operasional dapat menekan tombol "Jalankan Tugas" untuk mengaktifkan surat tugas.',
            confirmButtonColor: '#004b84'
        });
    };

    const handleJalankanTugas = () => {
        if (!documentData) return;

        Swal.fire({
            title: 'Jalankan Tugas Operasional?',
            html: `Surat Tugas <b>${documentData.no_surat_tugas}</b> akan diaktifkan ke status <b>PROSES</b> dan armada siap diberangkatkan.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Jalankan Tugas!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    const ptId = localStorage.getItem('pt_id') || 'C';
                    await api.post(`/operasional/surat-tugas/update-proses?pt_id=${ptId}`, {
                        no_surat_tugas: documentData.raw_sjh_id || documentData.no_surat_tugas
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    await fetchSuratTugasDetail(documentData.raw_sjh_id || documentData.no_surat_tugas);
                    Swal.fire({
                        icon: 'success',
                        title: 'TUGAS AKTIF / BERJALAN!',
                        text: `Surat Tugas ${documentData.no_surat_tugas} resmi berstatus PROSES.`,
                        confirmButtonColor: '#16a34a'
                    });
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal mengaktifkan surat tugas', 'error');
                }
            }
        });
    };

    const isSudahProses = documentData?.status === 'PROSES';

    return (
        <div className="max-w-3xl mx-auto p-4 space-y-4 font-sans pb-24">
            {/* HEADER CHECKER & OPERASIONAL */}
            <div className="bg-[#004b84] text-white p-5 rounded-2xl shadow-md flex items-center justify-between">
                <div>
                    <span className="px-2.5 py-0.5 bg-sky-500/30 text-sky-200 border border-sky-400/40 rounded-full text-[10px] font-black uppercase tracking-wider">
                        Operasional Checker & Kepala Operasional
                    </span>
                    <h1 className="text-lg font-black uppercase mt-1 tracking-wide">
                        {isLoadingMode ? 'Proses Muat Barang (Loading)' : 'Validasi & Muat Surat Tugas'}
                    </h1>
                    {loadingId && (
                        <p className="text-xs font-mono font-bold text-emerald-300 mt-0.5">
                            LOADING ID : {loadingId}
                        </p>
                    )}
                </div>
                <div className="p-3 bg-white/10 rounded-2xl">
                    <Truck size={28} />
                </div>
            </div>

            {/* TAHAP 1: FORM SCAN / INPUT SURAT TUGAS (JIKA BELUM ADA DOKUMEN AKTIF) */}
            {!documentData && (
                <>
                    <div className="grid grid-cols-2 gap-2 bg-slate-200 p-1.5 rounded-2xl">
                        <button
                            type="button"
                            onClick={() => setScanMode('camera')}
                            className={`py-2.5 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition cursor-pointer ${scanMode === 'camera' ? 'bg-[#004b84] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            <Camera size={16} /> Scan Kamera HP
                        </button>
                        <button
                            type="button"
                            onClick={() => setScanMode('manual')}
                            className={`py-2.5 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition cursor-pointer ${scanMode === 'manual' ? 'bg-[#004b84] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            <Keyboard size={16} /> Ketik Manual
                        </button>
                    </div>

                    {scanMode === 'camera' ? (
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
                            <div className="relative w-full aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden border-2 border-dashed border-sky-500 bg-slate-900 flex items-center justify-center">
                                <div id="qr-reader-container" className="w-full h-full"></div>
                            </div>
                            {cameraError && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <span>{cameraError}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <form
                            onSubmit={(e) => { e.preventDefault(); fetchSuratTugasDetail(manualCode); }}
                            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4"
                        >
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                                    Nomor Surat Tugas :
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={manualCode}
                                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                    placeholder="Contoh: 001JC2026119422"
                                    className="w-full p-3 border border-slate-300 rounded-xl font-mono font-bold text-center text-sm uppercase tracking-wider outline-none focus:border-[#004b84]"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={verifying || !manualCode.trim()}
                                className="w-full py-3 bg-[#004b84] hover:bg-[#003863] text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md transition cursor-pointer"
                            >
                                {verifying ? 'Memuat Detail...' : 'Cek Surat Tugas'}
                            </button>
                        </form>
                    )}
                </>
            )}

            {/* TAHAP 2 - 4: DETAIL SURAT TUGAS, PEMINDAIAN BTT & TOMBOL JALANKAN TUGAS */}
            {documentData && (
                <div className="space-y-4 animate-in fade-in">
                    {/* KARTU HEADER SURAT TUGAS (PERSIS GAMBAR 1 & GAMBAR 4) */}
                    <div className="bg-[#0a3d62] text-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold text-sky-200 uppercase block">VALIDASI SURAT TUGAS</span>
                            <span className="font-mono font-black text-lg tracking-wider">{documentData.no_surat_tugas}</span>
                        </div>
                        <span className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase flex items-center gap-1.5 ${isSudahProses ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-900'
                            }`}>
                            <CheckCircle size={14} /> {documentData.status}
                        </span>
                    </div>

                    {/* INFORMASI ARMADA & DRIVER */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">TANGGAL MUAT :</span>
                            <span className="font-bold text-slate-800 font-mono">{String(documentData.tgl_berangkat || '').split(' ')[0]}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">NOMOR KENDARAAN :</span>
                            <span className="font-black text-slate-900 font-mono">{documentData.no_kendaraan}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">DRIVER :</span>
                            <span className="font-bold text-slate-800">{documentData.pengemudi} ({documentData.nip_pengemudi})</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">KETERANGAN :</span>
                            <span className="font-bold text-slate-800 uppercase">{documentData.keterangan}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">RUTE UTAMA :</span>
                            <span className="font-bold text-indigo-900 uppercase">{documentData.trayek_nama}</span>
                        </div>
                    </div>

                    {/* TOMBOL "TAMBAH RINCIAN" (GAMBAR 2) — MUNCUL SAAT BELUM MODE LOADING & BELUM PROSES */}
                    {!isLoadingMode && !isSudahProses && (
                        <div className="bg-white p-4 rounded-2xl border border-sky-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="font-black text-xs text-slate-800 uppercase">Input Muatan Koli BTT</div>
                                <div className="text-[11px] text-slate-500">Klik Tambah Rincian untuk mulai memindai QR/Barcode BTT ke dalam surat jalan ini.</div>
                            </div>
                            <button
                                type="button"
                                onClick={handleTambahRincian}
                                className="px-5 py-2.5 bg-[#00668c] hover:bg-[#004b66] text-white font-black rounded-xl text-xs uppercase flex items-center gap-2 shadow-sm cursor-pointer transition active:scale-95"
                            >
                                <PlusCircle size={16} /> TAMBAH RINCIAN
                            </button>
                        </div>
                    )}

                    {/* AREA SCANNER QR / BARCODE KOLI BTT (GAMBAR 3 & 4) — AKTIF SAAT MODE LOADING */}
                    {isLoadingMode && (
                        <div className="bg-sky-50 border-2 border-sky-400 p-4 rounded-2xl space-y-3 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="font-black text-xs text-sky-950 uppercase flex items-center gap-1.5">
                                    <QrCode size={16} className="text-sky-600" /> Scan Barcode / QR Code Koli BTT
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowKoliCamera((prev) => !prev)}
                                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
                                >
                                    <Camera size={13} /> {showKoliCamera ? 'Tutup Kamera' : 'Buka Kamera QR'}
                                </button>
                            </div>

                            {showKoliCamera && (
                                <div className="w-full max-w-xs mx-auto rounded-xl overflow-hidden border-2 border-sky-600 bg-black">
                                    <div id="koli-qr-reader" className="w-full"></div>
                                </div>
                            )}

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleScanKoliSubmit(koliInput);
                                }}
                                className="flex gap-2"
                            >
                                <input
                                    ref={koliInputRef}
                                    type="text"
                                    value={koliInput}
                                    onChange={(e) => setKoliInput(e.target.value.toUpperCase())}
                                    placeholder="Scan Barcode / QR Koli (contoh: 0012611000690001)..."
                                    className="flex-1 p-3 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs uppercase outline-none focus:border-sky-600"
                                />
                                <button
                                    type="submit"
                                    disabled={scanningKoli || !koliInput.trim()}
                                    className="px-5 py-3 bg-[#004b84] hover:bg-[#003863] text-white font-black rounded-xl text-xs uppercase cursor-pointer disabled:opacity-50"
                                >
                                    {scanningKoli ? '...' : 'INPUT'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* TABEL DAFTAR BTT TERDAFTAR DALAM SURAT TUGAS (GAMBAR 1 & GAMBAR 4) */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <span className="font-black text-xs text-slate-800 uppercase">
                                JUMLAH BTT TERDAFTAR : {documentData.btt_list?.length || 0}
                            </span>
                            {isLoadingFinished && (
                                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                    ✓ Pemindaian Checker Selesai
                                </span>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-[#0a3d62] text-white text-[10px] font-bold uppercase">
                                        <th className="p-2.5">NO BTT</th>
                                        <th className="p-2.5">TUJUAN</th>
                                        <th className="p-2.5 text-center">COLLY</th>
                                        <th className="p-2.5 text-center">DISCAN</th>
                                        <th className="p-2.5 text-center">KURANG</th>
                                        <th className="p-2.5 text-center">KET BRG</th>
                                        {isLoadingMode && <th className="p-2.5 text-center">AKSI</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                                    {(!documentData.btt_list || documentData.btt_list.length === 0) ? (
                                        <tr>
                                            <td colSpan={isLoadingMode ? 7 : 6} className="p-6 text-center text-slate-400 italic text-xs">
                                                Belum ada BTT muatan yang terdaftar pada surat tugas ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        documentData.btt_list.map((btt, idx) => {
                                            const isSesuai = Number(btt.kurang) === 0 && Number(btt.discan) > 0;
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="p-2.5 font-mono font-bold text-sky-800">{btt.no_btt}</td>
                                                    <td className="p-2.5 uppercase">{btt.tujuan}</td>
                                                    <td className="p-2.5 text-center font-mono">{btt.colly}</td>
                                                    <td className="p-2.5 text-center font-mono font-bold text-emerald-700">{btt.discan}</td>
                                                    <td className="p-2.5 text-center font-mono text-rose-600">
                                                        {btt.kurang > 0 ? btt.kurang : ''}
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                        {isSesuai ? (
                                                            <span className="inline-flex items-center justify-center text-sky-600" title="SESUAI">
                                                                <CheckCircle2 size={18} />
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-amber-600 uppercase">
                                                                KURANG {btt.kurang}
                                                            </span>
                                                        )}
                                                    </td>
                                                    {isLoadingMode && (
                                                        <td className="p-2.5 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveBTT(btt.no_btt)}
                                                                className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                                                                title="Hapus BTT dari muatan"
                                                            >
                                                                <Trash2 size={14} />
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

                    {/* BARIS TOMBOL AKSI BAWAH: SELESAI (CHECKER) & JALANKAN TUGAS (KEPALA OPERASIONAL) */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setDocumentData(null);
                                setIsLoadingMode(false);
                                setIsLoadingFinished(false);
                                setManualCode('');
                            }}
                            className="py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-2xl text-xs uppercase cursor-pointer transition"
                        >
                            BATAL / SCAN ULANG
                        </button>

                        {isLoadingMode ? (
                            /* TOMBOL "SELESAI" OLEH CHECKER (PERSIS GAMBAR 4) */
                            <button
                                type="button"
                                onClick={handleSelesaiScanChecker}
                                className="py-3.5 bg-[#16a34a] hover:bg-[#15803d] text-white font-black rounded-2xl text-xs uppercase flex items-center justify-center gap-2 shadow-md cursor-pointer transition active:scale-95"
                            >
                                <PackageCheck size={17} /> SELESAI
                            </button>
                        ) : !isSudahProses ? (
                            /* TOMBOL "JALANKAN TUGAS" OLEH KEPALA OPERASIONAL */
                            <button
                                type="button"
                                onClick={handleJalankanTugas}
                                className="py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs uppercase flex items-center justify-center gap-2 shadow-md cursor-pointer transition active:scale-95"
                            >
                                <Play size={16} /> JALANKAN TUGAS
                            </button>
                        ) : (
                            /* STATUS SUDAH PROSES */
                            <button
                                type="button"
                                disabled
                                className="py-3.5 bg-slate-400 text-white font-black rounded-2xl text-xs uppercase flex items-center justify-center gap-2 cursor-not-allowed"
                            >
                                <CheckCircle size={16} /> SUDAH PROSES
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}