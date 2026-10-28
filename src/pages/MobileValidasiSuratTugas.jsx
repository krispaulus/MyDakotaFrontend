import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { CheckCircle2, XCircle, Truck, Calendar, MapPin, User, ArrowLeft } from 'lucide-react';
import Swal from 'sweetalert2';

const MobileValidasiSuratTugas = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const noSuratTugas = searchParams.get('no');

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!noSuratTugas) {
            setLoading(false);
            return;
        }

        api.get(`/operasional/surat-tugas/public-detail?no=${encodeURIComponent(noSuratTugas)}`)
            .then(res => {
                setData(res.data?.data || null);
            })
            .catch(() => {
                setData(null);
            })
            .finally(() => setLoading(false));
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
                await api.post('/operasional/surat-tugas/update-status-proses', {
                    no_surat_tugas: noSuratTugas
                });

                Swal.fire({
                    icon: 'success',
                    title: 'BERHASIL DIPROSES',
                    text: 'Status surat tugas berhasil diperbarui ke database.',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    // Update tampilan status lokal
                    setData(prev => ({ ...prev, status: 'PROSES' }));
                });
            } catch (err) {
                Swal.fire('Gagal', err.response?.data?.message || 'Gagal memproses data.', 'error');
            } finally {
                setProcessing(false);
            }
        }
    };

    // Handle tombol BATAL
    const handleBatal = () => {
        // Jika dibuka dari web browser, tutup tab atau redirect ke scanner
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="text-center font-bold text-slate-600">Memuat data surat tugas...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow p-6 max-w-sm w-full text-center space-y-4">
                    <XCircle size={48} className="text-rose-500 mx-auto" />
                    <h2 className="text-base font-black text-slate-800">DATA TIDAK DITEMUKAN</h2>
                    <p className="text-xs text-slate-500">Nomor: {noSuratTugas || '-'}</p>
                    <button
                        onClick={handleBatal}
                        className="w-full py-2.5 bg-slate-700 text-white font-bold rounded-xl text-xs uppercase"
                    >
                        Kembali
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 p-4 pb-24 font-sans max-w-md mx-auto">
            {/* Header Mobile Card */}
            <div className="bg-[#004b84] text-white p-4 rounded-2xl shadow-md mb-4 flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-sky-200 block">VALIDASI SURAT TUGAS</span>
                    <h1 className="text-base font-black font-mono">{noSuratTugas}</h1>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${data.status === 'PROSES' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-900'
                    }`}>
                    {data.status || 'DRAFT'}
                </span>
            </div>

            {/* Rincian Detail Surat Tugas */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3.5 text-xs">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
                    <Truck size={16} className="text-sky-600 shrink-0" />
                    <div>
                        <span className="text-[10px] text-slate-400 block font-bold">KENDARAAN & TUGAS</span>
                        <span className="font-black text-slate-800">{data.no_kendaraan || '-'} ({data.tugas || 'CHARTER'})</span>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
                    <User size={16} className="text-sky-600 shrink-0" />
                    <div>
                        <span className="text-[10px] text-slate-400 block font-bold">PENGEMUDI (SUPIR)</span>
                        <span className="font-bold text-slate-800">{data.pengemudi_1 || data.pengemudi || '-'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
                    <MapPin size={16} className="text-sky-600 shrink-0" />
                    <div>
                        <span className="text-[10px] text-slate-400 block font-bold">TRAYEK / TUJUAN</span>
                        <span className="font-bold text-slate-800">{data.trayek_nama || data.tujuan || '-'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <Calendar size={16} className="text-sky-600 shrink-0" />
                    <div>
                        <span className="text-[10px] text-slate-400 block font-bold">TGL. BERANGKAT</span>
                        <span className="font-mono font-bold text-slate-800">{String(data.tgl_berangkat || '').split('T')[0]}</span>
                    </div>
                </div>
            </div>

            {/* Floating Action Button (PROSES & BATAL) */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 max-w-md mx-auto flex gap-3">
                <button
                    type="button"
                    onClick={handleBatal}
                    className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition"
                >
                    BATAL
                </button>
                <button
                    type="button"
                    disabled={processing || data.status === 'PROSES'}
                    onClick={handleProses}
                    className={`flex-1 py-3 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-1.5 ${data.status === 'PROSES'
                            ? 'bg-slate-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
                        }`}
                >
                    <CheckCircle2 size={16} />
                    {data.status === 'PROSES' ? 'SUDAH PROSES' : (processing ? 'MEMPROSES...' : 'PROSES')}
                </button>
            </div>
        </div>
    );
};

export default MobileValidasiSuratTugas;