import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import Swal from 'sweetalert2';
import {
    Truck, Package, Phone, CheckCircle2,
    Navigation, RefreshCw, Search, ClipboardList, UserCheck, ChevronRight
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

    // Opsional untuk Admin mengecek tampilan sopir tertentu
    const [sopirList, setSopirList] = useState([]);
    const [selectedSimulasiNip, setSelectedSimulasiNip] = useState('');

    // Data Surat Tugas & Resi Loper
    const [suratTugasList, setSuratTugasList] = useState([]);
    const [selectedNoST, setSelectedNoST] = useState('');
    const [loperResiList, setLoperResiList] = useState([]);
    const [searchResi, setSearchResi] = useState('');

    useEffect(() => {
        fetchDriverData('');
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
            setLoperResiList(resLoper.data?.data || []);

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

    const handleUpdateStatusAntar = (resi) => {
        Swal.fire({
            title: 'Konfirmasi Antar',
            html: `
                <div class="text-left text-xs space-y-3">
                    <div class="p-3 bg-slate-100 rounded-2xl border border-slate-200">
                        <div class="font-mono font-black text-sm text-[#004b84]">${resi.no_btt}</div>
                        <div class="text-slate-600 mt-0.5">Penerima: <b>${resi.penerima}</b></div>
                    </div>
                    <div>
                        <label class="font-bold text-slate-700 block mb-1">STATUS PENGANTARAN</label>
                        <select id="swal-status" class="swal2-input !m-0 !w-full !text-xs !font-bold !rounded-xl">
                            <option value="TERKIRIM">TERKIRIM / DITERIMA</option>
                            <option value="KENDALA">KENDALA PENGIRIMAN</option>
                        </select>
                    </div>
                    <div>
                        <label class="font-bold text-slate-700 block mb-1">NAMA PENERIMA DI LOKASI *</label>
                        <input id="swal-penerima" class="swal2-input !m-0 !w-full !text-xs uppercase !rounded-xl" placeholder="Nama penerima..." value="${resi.penerima || ''}" />
                    </div>
                    <div>
                        <label class="font-bold text-slate-700 block mb-1">CATATAN (OPSIONAL)</label>
                        <input id="swal-catatan" class="swal2-input !m-0 !w-full !text-xs !rounded-xl" placeholder="Diterima satpam / keluarga..." />
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'SIMPAN STATUS',
            confirmButtonColor: '#059669',
            cancelButtonText: 'BATAL',
            preConfirm: () => {
                const penerima = document.getElementById('swal-penerima').value.trim();
                const status = document.getElementById('swal-status').value;
                const catatan = document.getElementById('swal-catatan').value.trim();
                if (!penerima) {
                    Swal.showValidationMessage('Nama penerima wajib diisi!');
                }
                return { penerima, status, catatan };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.post('/driver/loper-resi/deliver', {
                        no_btt: resi.no_btt,
                        no_loper: resi.no_loper,
                        nama_penerima: result.value.penerima,
                        status_antar: result.value.status,
                        catatan: result.value.catatan
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire({ icon: 'success', title: 'Tersimpan!', text: `Resi ${resi.no_btt} diperbarui.`, timer: 1500, showConfirmButton: false });
                    fetchDriverData(selectedSimulasiNip, selectedNoST);
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan status', 'error');
                }
            }
        });
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

    const totalTerkirim = loperResiList.filter((r) => r.status_antar === 'TERKIRIM').length;
    const totalPending = loperResiList.length - totalTerkirim;

    return (
        <div className="min-h-screen bg-[#f4f7fb] py-4 px-3 sm:px-4 pb-24 font-sans text-slate-800">
            {/* MOBILE CONTAINER (Menyamakan layout Scan Surat Tugas Image 2) */}
            <div className="max-w-md mx-auto space-y-3.5">

                {/* 1. TOP STATUS BAR PILL (Persis seperti PETUGAS: SUPERDLI | DLI PUSAT) */}
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

                {/* 2. MODE ADMIN: PILIH SOPIR (Muncul hanya jika akun admin yang membuka) */}
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

                {/* 3. RINGKASAN STATISTIK 3 KOLOM */}
                <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                        <div className="text-[10px] font-extrabold text-slate-400 uppercase">SURAT TUGAS</div>
                        <div className="text-xl font-black text-[#004b84] mt-0.5">{suratTugasList.length}</div>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                        <div className="text-[10px] font-extrabold text-slate-400 uppercase">BELUM ANTAR</div>
                        <div className="text-xl font-black text-amber-600 mt-0.5">{totalPending}</div>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                        <div className="text-[10px] font-extrabold text-slate-400 uppercase">TERKIRIM</div>
                        <div className="text-xl font-black text-emerald-600 mt-0.5">{totalTerkirim}</div>
                    </div>
                </div>

                {/* 4. SEGMENTED TAB SWITCHER MOBILE (1. SURAT TUGAS | 2. LOPER RESI) */}
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
                {/* KONTEN TAB 1: SURAT TUGAS SAYA (TAMPILAN KARTU MOBILE)                */}
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
                                    {/* Header Kartu ST */}
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase block">NO. SURAT TUGAS</span>
                                            <span className="font-mono font-black text-sm text-[#004b84]">{st.no_surat_tugas}</span>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${st.complete_yn === 'Y'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-amber-100 text-amber-800'
                                            }`}>
                                            {st.complete_yn === 'Y' ? 'SELESAI' : 'AKTIF JALAN'}
                                        </span>
                                    </div>

                                    {/* Rute & Armada */}
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

                                    {/* Tombol Aksi Mobile Full Width */}
                                    <button
                                        type="button"
                                        onClick={() => handlePilihSuratTugas(st.no_surat_tugas)}
                                        className="w-full py-3 px-4 bg-[#004b84] hover:bg-blue-900 active:scale-[0.99] text-white font-black rounded-2xl text-xs uppercase flex items-center justify-between cursor-pointer transition shadow-xs"
                                    >
                                        <span>BUKA DAFTAR RESI ({st.total_resi_muat} BTT)</span>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ===================================================================== */}
                {/* KONTEN TAB 2: LOPER & TITIK PENGIRIMAN RESI (MOBILE CARDS)            */}
                {/* ===================================================================== */}
                {activeTab === 'loper' && (
                    <div className="space-y-3">
                        {/* Kotak Pencarian Mobile */}
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

                        {/* Daftar Kartu Titik Pengiriman */}
                        {filteredResi.length === 0 ? (
                            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center space-y-2">
                                <Package size={32} className="mx-auto text-slate-300" />
                                <p className="text-xs font-bold text-slate-500">
                                    Belum ada resi loper / loading barang untuk diantar.
                                </p>
                            </div>
                        ) : (
                            filteredResi.map((resi, idx) => {
                                const isDelivered = resi.status_antar === 'TERKIRIM';
                                const cleanPhone = String(resi.telp_penerima || '').replace(/\D/g, '').replace(/^0/, '62');
                                const mapsQuery = encodeURIComponent(`${resi.alamat_tujuan} ${resi.kota_tujuan}`);

                                return (
                                    <div
                                        key={idx}
                                        className={`bg-white rounded-3xl border p-4 shadow-2xs space-y-3 ${isDelivered ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200/90'
                                            }`}
                                    >
                                        {/* Header Resi */}
                                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                                    TITIK #{idx + 1} • NO. RESI
                                                </span>
                                                <span className="font-mono font-black text-sm text-[#004b84]">{resi.no_btt}</span>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${isDelivered ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                {resi.status_antar}
                                            </span>
                                        </div>

                                        {/* Info Penerima & Alamat */}
                                        <div className="space-y-1.5 text-xs">
                                            <div className="font-black text-slate-900 uppercase text-sm">{resi.penerima}</div>
                                            <p className="text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                {resi.alamat_tujuan} — <b>{resi.kota_tujuan}</b>
                                            </p>
                                            <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-bold">
                                                <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700">
                                                    {resi.koli} Koli • {resi.berat} Kg
                                                </span>
                                                {Number(resi.nominal_cod) > 0 && (
                                                    <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-mono">
                                                        COD Rp {Number(resi.nominal_cod).toLocaleString('id-ID')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Tombol Aksi Mobile Ramah Jempol */}
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
                                                onClick={() => handleUpdateStatusAntar(resi)}
                                                className={`w-full py-3 px-4 rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2 cursor-pointer transition ${isDelivered
                                                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                                    : 'bg-[#059669] hover:bg-emerald-700 text-white shadow-xs'
                                                    }`}
                                            >
                                                <CheckCircle2 size={16} />
                                                {isDelivered ? 'UPDATE STATUS POD' : 'KONFIRMASI TERKIRIM (POD)'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverPortal;