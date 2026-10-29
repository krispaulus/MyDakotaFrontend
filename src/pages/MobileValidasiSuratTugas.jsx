import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { CheckCircle2, XCircle, Truck, Calendar, MapPin, User, Search, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

const MobileValidasiSuratTugas = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const noSuratTugas = searchParams.get('no') || '';

    const [inputManualNo, setInputManualNo] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Ambil identitas petugas yang login di browser
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

    // Handle tombol PROSES
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
                const targetNo = data?.no_surat_tugas || noSuratTugas;
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

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 p-4 pb-24 font-sans max-w-md mx-auto">
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

            {/* 2. Form Input Manual jika URL dibuka tanpa ?no=... */}
            {!noSuratTugas && !data && (
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3 mb-4">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">
                        Scan / Masukkan No. Surat Tugas :
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Contoh: 001JC2026108439"
                            value={inputManualNo}
                            onChange={(e) => setInputManualNo(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setSearchParams({ no: inputManualNo });
                                }
                            }}
                            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-xs outline-none focus:border-[#004b84]"
                        />
                        <button
                            type="button"
                            onClick={() => setSearchParams({ no: inputManualNo })}
                            className="px-4 py-2.5 bg-[#004b84] hover:bg-[#003863] text-white font-bold rounded-xl text-xs uppercase cursor-pointer"
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

            {/* 4. Tampilan Data Ditemukan */}
            {!loading && data && (
                <div className="space-y-4">
                    {/* Header Kartu Status */}
                    <div className="bg-[#004b84] text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold tracking-wider uppercase text-sky-200 block">
                                VALIDASI SURAT TUGAS
                            </span>
                            <h1 className="text-base font-black font-mono tracking-wide">
                                {data.no_surat_tugas || noSuratTugas}
                            </h1>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${data.status === 'PROSES' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-900'
                            }`}>
                            {data.status || 'DRAFT'}
                        </span>
                    </div>

                    {/* Rincian Penugasan */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3.5 text-xs">
                        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
                            <Truck size={17} className="text-sky-600 shrink-0" />
                            <div>
                                <span className="text-[10px] text-slate-400 block font-bold">KENDARAAN & TUGAS</span>
                                <span className="font-black text-slate-800">{data.no_kendaraan || '-'} ({data.tugas || 'CHARTER'})</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
                            <User size={17} className="text-sky-600 shrink-0" />
                            <div>
                                <span className="text-[10px] text-slate-400 block font-bold">PENGEMUDI (SUPIR)</span>
                                <span className="font-bold text-slate-800">{data.pengemudi || data.pengemudi_1 || '-'}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
                            <MapPin size={17} className="text-sky-600 shrink-0" />
                            <div>
                                <span className="text-[10px] text-slate-400 block font-bold">TRAYEK / TUJUAN</span>
                                <span className="font-bold text-slate-800">{data.trayek_nama || '-'}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <Calendar size={17} className="text-sky-600 shrink-0" />
                            <div>
                                <span className="text-[10px] text-slate-400 block font-bold">TGL. BERANGKAT</span>
                                <span className="font-mono font-bold text-slate-800">{data.tgl_berangkat || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tombol Floating Aksi */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 max-w-md mx-auto flex gap-3 z-30">
                        <button
                            type="button"
                            onClick={handleBatal}
                            className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                        >
                            BATAL
                        </button>
                        <button
                            type="button"
                            disabled={processing || data.status === 'PROSES'}
                            onClick={handleProses}
                            className={`flex-1 py-3 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer ${data.status === 'PROSES'
                                    ? 'bg-slate-400 cursor-not-allowed'
                                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
                                }`}
                        >
                            <CheckCircle2 size={16} />
                            {data.status === 'PROSES' ? 'SUDAH PROSES' : (processing ? 'MEMPROSES...' : 'PROSES')}
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
                        onClick={() => setSearchParams({})}
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