import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, Scan, CheckCircle2, X } from 'lucide-react';
import Swal from 'sweetalert2';

const KalkulasiKomisiSopir = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter State
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [searchNoSP, setSearchNoSP] = useState('');
    const [isFilterActive, setIsFilterActive] = useState(false);

    // Modal Popup State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [scanNoSP, setScanNoSP] = useState('');
    const [spDetail, setSpDetail] = useState(null);
    const [inputKomisi, setInputKomisi] = useState(0);
    const [inputKeterangan, setInputKeterangan] = useState('');

    const fetchKomisiData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let queryParams = `/gl/komisi-sopir?limit=500`;

            if (isFilterActive) {
                if (startDate && endDate) queryParams += `&start_date=${startDate}&end_date=${endDate}`;
                if (searchNoSP) queryParams += `&no_sp=${searchNoSP}`;
            }

            const res = await api.get(queryParams, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal tarik data Komisi Sopir:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKomisiData();
    }, [isFilterActive]);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        setIsFilterActive(true);
        fetchKomisiData();
    };

    const handleResetFilter = () => {
        setStartDate(today);
        setEndDate(today);
        setSearchNoSP('');
        setIsFilterActive(false);
    };

    // Buka Modal Input Komisi
    const handleAdd = () => {
        setScanNoSP('');
        setSpDetail(null);
        setInputKomisi(0);
        setInputKeterangan('');
        setIsModalOpen(true);
    };

    // Lookup SP via Scanner/Input
    const handleLookupSP = async (noSPValue) => {
        const cleanNoSP = noSPValue.trim();
        if (cleanNoSP.length < 5) return;

        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/gl/komisi-sopir/lookup-sp/${cleanNoSP}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const detail = res.data?.data;
            setSpDetail(detail);
            if (detail) {
                setInputKomisi(detail.estimasi_komisi || 0);
            }
        } catch (err) {
            setSpDetail(null);
            console.error("Gagal lookup SP:", err);
        }
    };

    // Simpan Kalkulasi Komisi
    const handleSaveKomisi = async (e) => {
        e.preventDefault();
        if (!spDetail) {
            Swal.fire('PERHATIAN!', 'Silakan scan/pilih Nomor SP terlebih dahulu.', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');

            const payload = {
                ub_kode: spDetail.no_sp || scanNoSP,
                ub_supirnama: spDetail.namaSopir || spDetail.nama_sopir || 'DR. AHMAD FADILAH',
                ub_tglsp: spDetail.tglSP || spDetail.tgl_sp || today,
                ub_jmlbtt: parseFloat(spDetail.jmlBTT || spDetail.jml_btt) || 0,
                ub_total: parseFloat(spDetail.totalSP || spDetail.total_sp) || 0,
                ub_berat: parseFloat(spDetail.berat) || 0,
                ub_komisibtt: 0,
                ub_komsipct: 0,
                ub_komisitotal: parseFloat(inputKomisi) || 0
            };

            await api.post('/gl/komisi-sopir/create', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                title: 'BERHASIL!',
                text: 'Kalkulasi Komisi Supir Berhasil Disimpan.',
                icon: 'success',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });

            setIsModalOpen(false);
            fetchKomisiData();
        } catch (err) {
            Swal.fire({
                title: 'GAGAL!',
                text: err.response?.data?.message || 'Gagal menyimpan komisi.',
                icon: 'error',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
        }
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus Record Komisi?',
            text: `Apakah Anda yakin ingin menghapus komisi untuk SP ${item.ub_kode}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal',
            didOpen: () => {
                const container = document.querySelector('.swal2-container');
                if (container) container.style.zIndex = '9999999';
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.delete(`/gl/komisi-sopir/${item.ub_kode}`);
                    Swal.fire({
                        title: 'TERHAPUS!',
                        text: 'Data komisi berhasil dihapus.',
                        icon: 'success',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });
                    fetchKomisiData();
                } catch (err) {
                    Swal.fire({
                        title: 'GAGAL!',
                        text: err.response?.data?.message || 'Gagal menghapus data.',
                        icon: 'error',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });
                }
            }
        });
    };

    const formatDate = (dateString) => {
        if (!dateString || dateString === '-') return '-';
        const parts = dateString.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateString;
    };

    // 🌟 DEFINISI KOLOM DISESUAIKAN DENGAN ACCESSOR UB_...
    const columns = [
        {
            header: 'NO. SP / BTT',
            accessor: 'ub_kode',
            render: (item) => <span className="font-mono font-bold text-sky-600">{item.ub_kode || '-'}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'ub_tglsp',
            render: (item) => <span className="font-mono text-slate-800">{formatDate(item.ub_tglsp)}</span>
        },
        {
            header: 'NAMA SOPIR',
            accessor: 'ub_supirnama',
            render: (item) => <span className="font-bold text-slate-800 uppercase">{item.ub_supirnama || '-'}</span>
        },
        {
            header: 'JML BTT',
            accessor: 'ub_jmlbtt',
            render: (item) => <span className="font-mono text-slate-700">{item.ub_jmlbtt || 0}</span>
        },
        {
            header: 'TOTAL (RP)',
            accessor: 'ub_total',
            render: (item) => <span className="font-mono text-slate-700">Rp {(item.ub_total || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'KOMISI (RP)',
            accessor: 'ub_komisitotal',
            render: (item) => <span className="font-mono font-bold text-emerald-600">Rp {(item.ub_komisitotal || 0).toLocaleString('id-ID')}</span>
        }
    ];

    // Modal Popup
    const modalElement = isModalOpen ? (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            style={{ zIndex: 99999 }}
        >
            <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden transition-all transform ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'}`}>
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-base font-black uppercase tracking-wider text-slate-800">
                        ADD KALKULASI KOMISI SOPIR INFO
                    </h2>
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSaveKomisi} className="p-8 space-y-5 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="font-bold text-slate-700 block mb-1.5">
                                Scan / Masukkan Nomor SP (15 Digit)
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Contoh: SP2300000000001"
                                    value={scanNoSP}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase();
                                        setScanNoSP(val);
                                        if (val.length >= 5) handleLookupSP(val);
                                    }}
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg bg-white font-mono font-bold text-slate-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                                />
                                <Scan className="absolute left-3 top-3 text-slate-400" size={16} />
                            </div>
                        </div>

                        {spDetail && (
                            <div className="md:col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                    <CheckCircle2 size={16} /> SP Ditemukan!
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-700">
                                    <p><b>SOPIR:</b> {spDetail.namaSopir || spDetail.nama_sopir}</p>
                                    <p><b>TUJUAN:</b> {spDetail.kotaTujuan || '-'}</p>
                                    <p><b>TANGGAL SP:</b> {spDetail.tglSP || spDetail.tgl_sp}</p>
                                    <p><b>STATUS:</b> {spDetail.isAlreadyKomisi ? <span className="text-amber-600 font-bold">Sudah Di-Kalkulasi</span> : <span className="text-emerald-600 font-bold">Belum Di-Kalkulasi</span>}</p>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="font-bold text-slate-700 block mb-1.5">Nominal Komisi (Rp)</label>
                            <input
                                type="number"
                                required
                                value={inputKomisi}
                                onChange={(e) => setInputKomisi(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-mono font-bold text-emerald-600 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-700 block mb-1.5">Keterangan</label>
                            <input
                                type="text"
                                placeholder="Masukkan catatan..."
                                value={inputKeterangan}
                                onChange={(e) => setInputKeterangan(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-6">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-8 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition uppercase cursor-pointer"
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg transition shadow-md uppercase cursor-pointer"
                        >
                            ADD KOMISI
                        </button>
                    </div>
                </form>
            </div>
        </div>
    ) : null;

    return (
        <div className="space-y-4">
            {/* Filter Panel */}
            <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
                <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                    <Filter size={16} className="text-sky-600" />
                    FILTER KALKULASI KOMISI SOPIR
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <label className="font-bold text-slate-500 block mb-1">TGL MULAI</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="font-bold text-slate-500 block mb-1">TGL SAMPAI</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">CARI NO. SP / BTT</label>
                        <input
                            type="text"
                            placeholder="Ketik Nomor SP..."
                            value={searchNoSP}
                            onChange={(e) => setSearchNoSP(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        />
                    </div>

                    <div className="flex items-end gap-2">
                        <button
                            type="submit"
                            className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer"
                        >
                            TAMPILKAN
                        </button>
                        <button
                            type="button"
                            onClick={handleResetFilter}
                            className="px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer"
                        >
                            RESET
                        </button>
                    </div>
                </div>
            </form>

            <DataTableTemplate
                title="KALKULASI KOMISI SOPIR"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleAdd}
                onDelete={handleDelete}
            />

            {modalElement && ReactDOM.createPortal(modalElement, document.body)}
        </div>
    );
};

export default KalkulasiKomisiSopir;