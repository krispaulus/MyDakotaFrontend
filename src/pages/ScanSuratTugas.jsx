import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, Camera, Keyboard, CheckCircle, AlertCircle, RefreshCw, Truck } from 'lucide-react';
import api from '../api/axios';
import Swal from 'sweetalert2';

export default function ScanSuratTugas() {
    const [scanMode, setScanMode] = useState('camera'); // 'camera' | 'manual'
    const [manualCode, setManualCode] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [documentData, setDocumentData] = useState(null);

    const html5QrCodeRef = useRef(null);

    // Inisialisasi & Start Kamera
    const startScanner = async () => {
        setCameraError('');
        try {
            const html5QrCode = new Html5Qrcode("qr-reader-container");
            html5QrCodeRef.current = html5QrCode;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            await html5QrCode.start(
                { facingMode: "environment" }, // Prioritas kamera belakang HP
                config,
                (decodedText) => {
                    // Berhasil scan!
                    handleCodeDetected(decodedText);
                },
                (errorMessage) => {
                    // Scanning berlangsung (abaikan error frame per frame)
                }
            );

            setIsScanning(true);
        } catch (err) {
            console.error("Gagal start kamera:", err);
            setCameraError("Kamera tidak dapat diakses atau izin ditolak. Silakan beralih ke Mode Input Manual.");
            setIsScanning(false);
        }
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current && isScanning) {
            try {
                await html5QrCodeRef.current.stop();
                html5QrCodeRef.current.clear();
            } catch (err) {
                console.warn("Stop scanner error:", err);
            }
            setIsScanning(false);
        }
    };

    useEffect(() => {
        if (scanMode === 'camera') {
            startScanner();
        } else {
            stopScanner();
        }

        return () => {
            stopScanner();
        };
    }, [scanMode]);

    // Handle Kode Hasil Scan / Input Manual
    const handleCodeDetected = async (code) => {
        await stopScanner();
        verifySuratTugas(code);
    };

    const verifySuratTugas = async (nomorSurat) => {
        const cleanNo = (nomorSurat || '').trim();
        if (!cleanNo) {
            Swal.fire('Peringatan', 'Nomor surat tugas tidak boleh kosong', 'warning');
            return;
        }

        setVerifying(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/operasional/surat-tugas/verify-scan', {
                no_surat_tugas: cleanNo
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.status === 'success') {
                setDocumentData(res.data.data);
                Swal.fire({
                    icon: 'success',
                    title: 'DOKUMEN VALID!',
                    text: `Surat Tugas [${cleanNo}] terverifikasi di sistem Dakota.`,
                    confirmButtonColor: '#004b84'
                });
            }
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Verifikasi Gagal',
                text: err.response?.data?.message || 'Nomor Surat Tugas tidak ditemukan atau tidak valid!',
                confirmButtonColor: '#ef4444'
            }).then(() => {
                // Restart kamera jika gagal agar bisa scan ulang
                if (scanMode === 'camera') startScanner();
            });
        } finally {
            setVerifying(false);
        }
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        verifySuratTugas(manualCode);
    };

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-5 font-sans pb-20">
            {/* Header Khusus Checker */}
            <div className="bg-[#004b84] text-white p-5 rounded-2xl shadow-md flex items-center justify-between">
                <div>
                    <span className="px-2 py-0.5 bg-sky-500/30 text-sky-200 border border-sky-400/40 rounded-full text-[10px] font-black uppercase tracking-wider">
                        Role: Operasional Checker
                    </span>
                    <h1 className="text-lg font-black uppercase mt-1 tracking-wide">Validasi QR Surat Tugas</h1>
                    <p className="text-xs text-sky-200">Verifikasi fisik kendaraan, supir & muatan loper</p>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl">
                    <Truck size={28} />
                </div>
            </div>

            {/* Switch Mode: Kamera vs Input Manual */}
            <div className="grid grid-cols-2 gap-2 bg-slate-200 p-1.5 rounded-2xl">
                <button
                    type="button"
                    onClick={() => { setScanMode('camera'); setDocumentData(null); }}
                    className={`py-2.5 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition cursor-pointer ${scanMode === 'camera' ? 'bg-[#004b84] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                        }`}
                >
                    <Camera size={16} /> Scan Kamera HP
                </button>
                <button
                    type="button"
                    onClick={() => { setScanMode('manual'); setDocumentData(null); }}
                    className={`py-2.5 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition cursor-pointer ${scanMode === 'manual' ? 'bg-[#004b84] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                        }`}
                >
                    <Keyboard size={16} /> Ketik Manual
                </button>
            </div>

            {/* AREA 1: KAMERA SCANNER */}
            {scanMode === 'camera' && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
                    <div className="relative w-full aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden border-2 border-dashed border-sky-500 bg-slate-900 flex items-center justify-center">
                        <div id="qr-reader-container" className="w-full h-full"></div>
                    </div>

                    {cameraError ? (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{cameraError}</span>
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500 font-medium">
                            Arahkan kamera ke QR Code Surat Tugas yang tercetak pada kertas fisik
                        </p>
                    )}

                    <div className="flex justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => { stopScanner(); startScanner(); }}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                        >
                            <RefreshCw size={14} /> Refresh Kamera
                        </button>
                    </div>
                </div>
            )}

            {/* AREA 2: INPUT MANUAL */}
            {scanMode === 'manual' && (
                <form onSubmit={handleManualSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                            Nomor Surat Tugas / Barcode :
                        </label>
                        <input
                            type="text"
                            required
                            autoFocus
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                            placeholder="Contoh: 001JC2026107321"
                            className="w-full p-3 border border-slate-300 rounded-xl font-mono font-bold text-center text-sm uppercase tracking-wider outline-none focus:border-[#004b84] focus:ring-2 focus:ring-sky-100"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={verifying || !manualCode.trim()}
                        className="w-full py-3 bg-[#004b84] hover:bg-[#003863] text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md transition disabled:opacity-50 cursor-pointer"
                    >
                        {verifying ? 'Memverifikasi...' : 'Verifikasi Surat Tugas'}
                    </button>
                </form>
            )}

            {/* HASIL VERIFIKASI DOKUMEN */}
            {documentData && (
                <div className="bg-white p-5 rounded-2xl border border-emerald-300 shadow-md space-y-4 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2 text-emerald-700 font-black text-xs uppercase">
                            <CheckCircle size={18} /> Dokumen Terverifikasi Sah
                        </div>
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {documentData.nomor_surat_tugas}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Tugas Operasional</span>
                            <span className="font-bold text-slate-800">{documentData.tugas || 'LOPER (DK)'}</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">No. Polisi Kendaraan</span>
                            <span className="font-black font-mono text-[#004b84]">{documentData.no_polisi || '-'}</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Supir / Pengemudi</span>
                            <span className="font-bold text-slate-800">{documentData.nama_supir || '-'}</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Status Keberangkatan</span>
                            <span className="font-bold text-emerald-600">{documentData.status_tugas || 'SIAP JALAN'}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}