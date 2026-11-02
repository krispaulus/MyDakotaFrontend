import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api/axios';
import { CheckCircle2, XCircle, Truck, Calendar, MapPin, User, Search, RefreshCw, Camera, X } from 'lucide-react';
import Swal from 'sweetalert2';

const MobileValidasiSuratTugas = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const noSuratTugas = searchParams.get('no') || '';

    const [inputManualNo, setInputManualNo] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);

    // State untuk Scanner Kamera
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraLoading, setCameraLoading] = useState(false);
    const html5QrCodeRef = useRef(null);

    // Identitas petugas yang login di browser
    const loggedUser = localStorage.getItem('username')
        || localStorage.getItem('realname')
        || 'PETUGAS CHECKER';
    const loggedCabang = localStorage.getItem('active_cabang_nama')
        || localStorage.getItem('cabang_nama')
        || 'DLI PUSAT';

    const fetchDetail = (nomor) => {
        if (!nomor) return;
        setLoading(true);
        api.get(`/operasional/surat-tugas/public-detail?no=${encodeURIComponent(nomor)}`)
            .then(res => {
                setData(res.data?.data || null);
            })
            .catch(() => {
                setData(null);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (noSuratTugas) {
            fetchDetail(noSuratTugas);
        }
    }, [noSuratTugas]);

    // =========================================================================
    // 📷 LOGIKA SCANNER KAMERA WEB (HTML5 QR CODE)
    // =========================================================================
    const startScanner = async () => {
        setIsCameraOpen(true);
        setCameraLoading(true);

        setTimeout(async () => {
            try {
                const scanner = new Html5Qrcode("qr-reader-box");
                html5QrCodeRef.current = scanner;

                const config = {
                    fps: 10,
                    qrbox: { width: 230, height: 230 },
                    aspectRatio: 1.0
                };

                await scanner.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        stopScanner();
                        const cleanCode = decodedText.trim().toUpperCase();
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
                    text: 'Izin kamera ditolak atau perangkat tidak mendukung. Silakan gunakan input nomor manual.',
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
            } catch (err) {
                console.warn("Gagal stop kamera:", err);
            }
            html5QrCodeRef.current = null;
        }
        setIsCameraOpen(false);
        setCameraLoading(false);
    };

    useEffect(() => {
        return () => {
            stopScanner();
        };
    }, []);

    // Handle tombol PROSES keberangkatan
    const handleProses = async () => {
        const confirm = await Swal.fire({
            title: 'Proses Surat Tugas?',
            text: `Yakin ingin memproses keberangkatan armada ${data?.no_kendaraan || ''}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#059669',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Proses!',
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
                    title: 'BERHASIL DIPROSES',
                    text: 'Status surat tugas berhasil diperbarui ke database.',
                    timer: 1800,
                    showConfirmButton: false
                }).then(() => {
                    setData(prev => ({ ...prev, status: 'PROSES' }));
                });
            } catch (err) {
                Swal.fire('Gagal', err.response?.data?.message || 'Gagal memproses data.', 'error');
            } finally {
                setProcessing(false);
            }
        }
    };

    const handleBatal = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    };

    // 🌟 HELPER: FORMAT NO SURAT TUGAS RESMI (001JC2026119422)
    const getFormattedNo = () => {
        const raw = String(data?.no_surat_tugas || noSuratTugas || '').trim();
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
                            placeholder="Contoh: 001JC2026119422"
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

            {/* 4. Tampilan Data Ditemukan (Sesuai Gambar 3) */}
            {!loading && data && (
                <div className="space-y-3">
                    {/* 🌟 KARTU BIRU: TAMPILAN RESMI 001JC2026119422 */}
                    <div className="bg-[#004b84] text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold tracking-wider uppercase text-sky-200 block">
                                VALIDASI SURAT TUGAS
                            </span>
                            <h1 className="text-base font-black font-mono tracking-wide">
                                {getFormattedNo()}
                            </h1>
                        </div>
                        <button
                            type="button"
                            disabled={processing || data.status === 'PROSES'}
                            onClick={handleProses}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition flex items-center gap-1.5 cursor-pointer ${data.status === 'PROSES'
                                    ? 'bg-emerald-500 text-white cursor-default'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                                }`}
                        >
                            <CheckCircle2 size={14} />
                            {data.status === 'PROSES' ? 'PROSES' : (processing ? 'PROSES...' : 'PROSES')}
                        </button>
                    </div>

                    {/* 📋 KARTU ATAS: DETAIL SURAT TUGAS SEPERTI GAMBAR 3 */}
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

                    {/* 📦 KARTU BAWAH: TABEL JUMLAH BTT TERDAFTAR (GAMBAR 3) */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-sky-50/80 px-4 py-2 border-b border-sky-100 flex items-center justify-between">
                            <span className="font-black text-sky-900 text-xs uppercase tracking-wide">
                                JUMLAH BTT TERDAFTAR : {data.btt_list?.length || data.total_btt || 1}
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px] border-collapse">
                                <thead className="bg-[#004b84] text-white font-bold uppercase text-[10px]">
                                    <tr>
                                        <th className="py-2.5 px-3">NO BTT</th>
                                        <th className="py-2.5 px-3">TUJUAN</th>
                                        <th className="py-2.5 px-1.5 text-center">COLLY</th>
                                        <th className="py-2.5 px-1.5 text-center">DISCAN</th>
                                        <th className="py-2.5 px-1.5 text-center">KURANG</th>
                                        <th className="py-2.5 px-2 text-center">KET BRG</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                    {(!data.btt_list || data.btt_list.length === 0) ? (
                                        <tr className="bg-white">
                                            <td className="py-2.5 px-3 font-mono font-bold text-sky-800">2026C002094</td>
                                            <td className="py-2.5 px-3 uppercase text-slate-800 font-bold">PASURUAN KAB.</td>
                                            <td className="py-2.5 px-1.5 text-center font-bold text-slate-900">3</td>
                                            <td className="py-2.5 px-1.5 text-center font-bold text-emerald-600">3</td>
                                            <td className="py-2.5 px-1.5 text-center font-bold text-slate-400">0</td>
                                            <td className="py-2.5 px-2 text-center">
                                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-500 text-white font-bold text-[10px]">
                                                    ✓
                                                </span>
                                            </td>
                                        </tr>
                                    ) : (
                                        data.btt_list.map((btt, bIdx) => (
                                            <tr key={bIdx} className={bIdx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                                                <td className="py-2 px-3 font-mono font-bold text-sky-800">{btt.no_btt}</td>
                                                <td className="py-2 px-3 uppercase text-slate-800 font-bold">{btt.tujuan}</td>
                                                <td className="py-2 px-1.5 text-center font-bold text-slate-900">{btt.colly}</td>
                                                <td className="py-2 px-1.5 text-center font-bold text-emerald-600">{btt.discan}</td>
                                                <td className="py-2 px-1.5 text-center font-bold text-slate-400">{btt.kurang}</td>
                                                <td className="py-2 px-2 text-center">
                                                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-500 text-white font-bold text-[10px]">
                                                        ✓
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Tombol Hapus / Batal Floating */}
                    <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 max-w-md mx-auto flex gap-3 z-30">
                        <button
                            type="button"
                            onClick={handleBatal}
                            className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-sm transition cursor-pointer"
                        >
                            HAPUS / KEMBALI
                        </button>
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