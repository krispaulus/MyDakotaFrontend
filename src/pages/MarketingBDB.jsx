import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, RotateCcw, RefreshCw, CheckCircle, XCircle, Layers, X, Plus } from 'lucide-react';
import Swal from 'sweetalert2';

const MarketingBDB = () => {
    const { isDarkMode } = useDarkMode();
    const [bdbList, setBdbList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    // 🌟 State Toggle Filter & Filter Parameters
    const [showFilter, setShowFilter] = useState(false);
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [searchNoBdb, setSearchNoBdb] = useState('');
    const [searchPengirim, setSearchPengirim] = useState('');
    const [filterService, setFilterService] = useState('');
    const [filterPosting, setFilterPosting] = useState('');

    // State Form Input Data BDB Baru
    const [formData, setFormData] = useState({
        BDB_NamaPengirim: '',
        BDB_AsalName: '',
        BDB_AsalTelp: '',
        BDB_TujuanAgenID: '',
        BDB_TujuanNama: '',
        BDB_Up: '',
        BDB_NamaBarang: '',
        BDB_JmlUnit: 1,
        BDB_JmlPck: 1,
        BDB_Berat: 0,
        BDB_Beratvol: 0,
        BDB_Ukuran: '',
        BDB_Service: '1',
        BDB_Ket: ''
    });

    const fetchBDBHistory = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let queryParams = `/marketing/bdb/list?limit=500`;

            if (startDate && endDate) queryParams += `&start_date=${startDate}&end_date=${endDate}`;
            if (searchNoBdb) queryParams += `&bdb_id=${encodeURIComponent(searchNoBdb)}`;
            if (searchPengirim) queryParams += `&pengirim=${encodeURIComponent(searchPengirim)}`;
            if (filterService) queryParams += `&service=${encodeURIComponent(filterService)}`;
            if (filterPosting) queryParams += `&posting_yn=${encodeURIComponent(filterPosting)}`;

            const res = await api.get(queryParams, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBdbList(res.data?.data || res.data || []);
        } catch (err) {
            console.error("Gagal load history BDB:", err);
            setBdbList([
                { BDB_ID: 'BDB0107260001', BDB_Tanggal: '2026-07-01', BDB_NamaPengirim: 'INTERNAL DAKOTA PUSAT', BDB_TujuanNama: 'CABANG BANDUNG', BDB_JmlUnit: 5, BDB_Berat: 45, BDB_PostingYN: 'Y', BDB_Service: '1' },
                { BDB_ID: 'BDB0107260002', BDB_Tanggal: '2026-07-02', BDB_NamaPengirim: 'SAMPLE MARKETING VENDOR', BDB_TujuanNama: 'AGEN BEKASI', BDB_JmlUnit: 2, BDB_Berat: 12, BDB_PostingYN: 'N', BDB_Service: '3' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBDBHistory();
    }, []);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        fetchBDBHistory();
    };

    const handleResetFilter = () => {
        setStartDate(firstDay);
        setEndDate(today);
        setSearchNoBdb('');
        setSearchPengirim('');
        setFilterService('');
        setFilterPosting('');

        const token = localStorage.getItem('token');
        setLoading(true);
        api.get('/marketing/bdb/list?limit=500', {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => setBdbList(res.data?.data || res.data || []))
            .catch(() => setBdbList([]))
            .finally(() => setLoading(false));
    };

    const handleSubmitBDB = async (e) => {
        e.preventDefault();
        const beratFinal = Math.max(Number(formData.BDB_Berat), Number(formData.BDB_Beratvol));
        if (beratFinal <= 0) {
            return Swal.fire('Peringatan', 'Berat kargo atau berat volume wajib diisi!', 'warning');
        }

        try {
            const token = localStorage.getItem('token');
            await api.post('/marketing/bdb/create', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('BERHASIL', 'Pengiriman Bebas Biaya (BDB) Berhasil Didaftarkan!', 'success');
            setShowAddModal(false);
            setFormData({
                BDB_NamaPengirim: '', BDB_AsalName: '', BDB_AsalTelp: '', BDB_TujuanAgenID: '',
                BDB_TujuanNama: '', BDB_Up: '', BDB_NamaBarang: '', BDB_JmlUnit: 1, BDB_JmlPck: 1,
                BDB_Berat: 0, BDB_Beratvol: 0, BDB_Ukuran: '', BDB_Service: '1', BDB_Ket: ''
            });
            fetchBDBHistory();
        } catch (err) {
            console.error("Gagal save BDB:", err);
            Swal.fire('ERROR', 'Gagal memproses pembuatan resi BDB', 'error');
        }
    };

    const columns = [
        {
            header: 'NOMOR BDB ID',
            accessor: 'BDB_ID',
            render: (item) => <span className="font-mono font-bold text-sky-600">{item.BDB_ID}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'BDB_Tanggal',
            render: (item) => <span className="font-mono text-slate-700">{String(item.BDB_Tanggal || '').split('T')[0]}</span>
        },
        {
            header: 'NAMA PENGIRIM',
            accessor: 'BDB_NamaPengirim',
            render: (item) => <span className="font-bold text-slate-800 uppercase">{item.BDB_NamaPengirim}</span>
        },
        {
            header: 'TUJUAN PENGIRIMAN',
            accessor: 'BDB_TujuanNama',
            render: (item) => <span className="font-semibold text-slate-700 uppercase">{item.BDB_TujuanNama}</span>
        },
        {
            header: 'LAYANAN',
            accessor: 'BDB_Service',
            render: (item) => {
                const serviceMap = { '1': 'DARAT', '2': 'LAUT', '3': 'UDARA' };
                return (
                    <span className="font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {serviceMap[item.BDB_Service] || item.BDB_Service || 'DARAT'}
                    </span>
                );
            }
        },
        {
            header: 'KOLI',
            accessor: 'BDB_JmlUnit',
            render: (item) => <span className="font-mono font-bold text-slate-800">{item.BDB_JmlUnit || 0}</span>
        },
        {
            header: 'BERAT (KG)',
            accessor: 'BDB_Berat',
            render: (item) => <span className="font-mono font-semibold text-slate-700">{item.BDB_Berat || 0} Kg</span>
        },
        {
            header: 'STATUS JURNAL',
            accessor: 'BDB_PostingYN',
            render: (item) => item.BDB_PostingYN === 'Y' ? (
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center justify-center gap-1 w-24">
                    <CheckCircle size={12} /> POSTED
                </span>
            ) : (
                <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center justify-center gap-1 w-24">
                    <XCircle size={12} /> WAITING
                </span>
            )
        }
    ];

    return (
        <div className="space-y-4">
            {/* 🌟 Panel Filter Bersyarat (Toggle Show/Hide) */}
            {showFilter && (
                <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                        <Filter size={16} className="text-sky-600" />
                        FILTER PENGIRIMAN BEBAS DARI BIAYA (BDB)
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                            <label className="font-bold text-slate-500 block mb-1">CARI NO. BDB</label>
                            <input
                                type="text"
                                placeholder="Ketik nomor BDB..."
                                value={searchNoBdb}
                                onChange={(e) => setSearchNoBdb(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NAMA PENGIRIM</label>
                            <input
                                type="text"
                                placeholder="Ketik nama pengirim..."
                                value={searchPengirim}
                                onChange={(e) => setSearchPengirim(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">MODA LAYANAN</label>
                            <select
                                value={filterService}
                                onChange={(e) => setFilterService(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer"
                            >
                                <option value="">-- SEMUA LAYANAN --</option>
                                <option value="1">DARAT</option>
                                <option value="2">LAUT</option>
                                <option value="3">UDARA</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handleResetFilter}
                            className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer flex items-center gap-1.5"
                        >
                            <RotateCcw size={14} /> RESET
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                            <RefreshCw size={14} /> REFRESH DATA
                        </button>
                    </div>
                </form>
            )}

            {/* 🌟 Template Standar DataTableTemplate */}
            <DataTableTemplate
                title="BEBAS DARI BIAYA (BDB) - PENGIRIMAN"
                columns={columns}
                data={bdbList}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={() => setShowAddModal(true)}
                onFilter={() => setShowFilter(prev => !prev)}
            />

            {/* MODAL TRANSAKSI FORM TAMBAH BDB */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-6 flex flex-col relative max-h-[90vh] overflow-y-auto">
                        <button
                            type="button"
                            onClick={() => setShowAddModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold p-1 rounded-lg"
                        >
                            <X size={18} />
                        </button>

                        <div className="text-center mb-5 border-b border-gray-100 pb-3">
                            <span className="bg-sky-600 text-white px-5 py-1.5 font-black text-xs rounded shadow-sm tracking-widest uppercase">
                                FORM ENTRY MUTASI RESI BDB BARU
                            </span>
                        </div>

                        <form onSubmit={handleSubmitBDB} className="space-y-4 text-xs font-semibold text-slate-700">
                            {/* SECTION A: DATA PENGIRIM */}
                            <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">Nama Pengirim BDB *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.BDB_NamaPengirim}
                                        onChange={(e) => setFormData({ ...formData, BDB_NamaPengirim: e.target.value })}
                                        placeholder="Internal/Nama Client..."
                                        className="p-2 border border-gray-300 rounded-md uppercase"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">Asal Perusahaan / Divisi</label>
                                    <input
                                        type="text"
                                        value={formData.BDB_AsalName}
                                        onChange={(e) => setFormData({ ...formData, BDB_AsalName: e.target.value })}
                                        placeholder="Contoh: Corcom/MKT..."
                                        className="p-2 border border-gray-300 rounded-md uppercase"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">No. Telepon Pengirim</label>
                                    <input
                                        type="text"
                                        value={formData.BDB_AsalTelp}
                                        onChange={(e) => setFormData({ ...formData, BDB_AsalTelp: e.target.value })}
                                        placeholder="Nomor HP/Ext..."
                                        className="p-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                            </div>

                            {/* SECTION B: DATA PENERIMA & LAYANAN */}
                            <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">ID Agen Tujuan *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.BDB_TujuanAgenID}
                                        onChange={(e) => setFormData({ ...formData, BDB_TujuanAgenID: e.target.value })}
                                        placeholder="Kode Agen..."
                                        className="p-2 border border-gray-300 rounded-md uppercase"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">Nama Penerima / Lokasi Tujuan *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.BDB_TujuanNama}
                                        onChange={(e) => setFormData({ ...formData, BDB_TujuanNama: e.target.value })}
                                        placeholder="Nama Cabang/Tujuan..."
                                        className="p-2 border border-gray-300 rounded-md uppercase"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">Person Dituju (UP)</label>
                                    <input
                                        type="text"
                                        value={formData.BDB_Up}
                                        onChange={(e) => setFormData({ ...formData, BDB_Up: e.target.value })}
                                        placeholder="Nama Staff UP..."
                                        className="p-2 border border-gray-300 rounded-md uppercase"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">Moda Layanan (Service) *</label>
                                    <select
                                        value={formData.BDB_Service}
                                        onChange={(e) => setFormData({ ...formData, BDB_Service: e.target.value })}
                                        className="p-2 border border-gray-300 rounded-md bg-white"
                                    >
                                        <option value="1">DARAT</option>
                                        <option value="2">LAUT</option>
                                        <option value="3">UDARA</option>
                                    </select>
                                </div>
                            </div>

                            {/* SECTION C: SPESIFIKASI BARANG */}
                            <div className="p-4 border border-gray-200 rounded-xl grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                    <label className="text-gray-400 text-[10px] uppercase">Nama Barang *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.BDB_NamaBarang}
                                        onChange={(e) => setFormData({ ...formData, BDB_NamaBarang: e.target.value })}
                                        placeholder="Isi kargo..."
                                        className="p-2 border border-gray-300 rounded-md uppercase"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">Jumlah Koli (Unit)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={formData.BDB_JmlUnit}
                                        onChange={(e) => setFormData({ ...formData, BDB_JmlUnit: Number(e.target.value) })}
                                        className="p-2 border border-gray-300 rounded-md font-bold"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">Berat Aktual (Kg)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={formData.BDB_Berat}
                                        onChange={(e) => setFormData({ ...formData, BDB_Berat: Number(e.target.value) })}
                                        className="p-2 border border-gray-300 rounded-md font-bold"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">Berat Volume (Kg)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={formData.BDB_Beratvol}
                                        onChange={(e) => setFormData({ ...formData, BDB_Beratvol: Number(e.target.value) })}
                                        className="p-2 border border-gray-300 rounded-md font-bold"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">Dimensi (PxLxT)</label>
                                    <input
                                        type="text"
                                        value={formData.BDB_Ukuran}
                                        onChange={(e) => setFormData({ ...formData, BDB_Ukuran: e.target.value })}
                                        placeholder="Contoh: 40x40x50"
                                        className="p-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-gray-400 text-[10px] uppercase">Keterangan / Alasan BDB</label>
                                <textarea
                                    rows={2}
                                    value={formData.BDB_Ket}
                                    onChange={(e) => setFormData({ ...formData, BDB_Ket: e.target.value })}
                                    placeholder="Tulis alasan kargo ini dibebaskan biaya..."
                                    className="p-2 border border-gray-300 rounded-md resize-none font-sans"
                                />
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="w-1/3 py-2 bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold rounded-xl transition uppercase tracking-wider text-[10px]"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="w-2/3 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow transition uppercase tracking-wider text-[10px]"
                                >
                                    Simpan Transaksi BDB
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketingBDB;