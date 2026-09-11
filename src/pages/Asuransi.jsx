
import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import {
    Filter, RefreshCw, Printer, Plus, ShieldCheck,
    X, CheckCircle2, AlertCircle, Edit3, Trash2
} from 'lucide-react';

const Asuransi = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    // Filter State
    const [useTanggal, setUseTanggal] = useState(false);
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [custOptions, setCustOptions] = useState([]);
    const [noBtt, setNoBtt] = useState('');
    const [bayarFilter, setBayarFilter] = useState('');

    // Table Data State
    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilter, setShowFilter] = useState(true);

    // Modal Form State
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [formData, setFormData] = useState({
        noasuransi: '',
        tanggalasuransi: today,
        namacust: '',
        namacustterima: '',
        totalbiaya: 0,
        jenisbarang: '',
        rutepengiriman: '',
        tanggalpengiriman: today,
        bttt_id: '',
        asuransi_bayaryn: 'N'
    });

    // Load Customer Options
    useEffect(() => {
        const fetchMasters = async () => {
            try {
                const token = localStorage.getItem('token');
                const resCust = await api.get('/marketing/monitoring-btt/combo-customer', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCustOptions(resCust.data?.data || []);
            } catch (err) {
                console.error("Gagal load opsi customer:", err);
            }
        };
        fetchMasters();
    }, []);

    // Load Data Asuransi
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                use_tanggal: useTanggal ? 'true' : 'false',
                start_date: startDate,
                end_date: endDate,
                customer: selectedCustomer,
                nobtt: noBtt,
                bayar: bayarFilter
            });

            const res = await api.get(`/marketing/asuransi/data?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDataList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load data asuransi:", err);
            setDataList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // KPI Metrik
    const totalPremi = useMemo(() => dataList.reduce((acc, i) => acc + (Number(i.totalbiaya) || 0), 0), [dataList]);
    const sudahBayarCount = useMemo(() => dataList.filter(i => i.asuransi_bayaryn === 'Y').length, [dataList]);
    const belumBayarCount = useMemo(() => dataList.filter(i => i.asuransi_bayaryn !== 'Y').length, [dataList]);

    // Handle Modal
    const handleOpenAdd = () => {
        setIsEdit(false);
        setFormData({
            noasuransi: '',
            tanggalasuransi: today,
            namacust: '',
            namacustterima: '',
            totalbiaya: 0,
            jenisbarang: '',
            rutepengiriman: '',
            tanggalpengiriman: today,
            bttt_id: '',
            asuransi_bayaryn: 'N'
        });
        setShowModal(true);
    };

    const handleOpenEdit = (item) => {
        setIsEdit(true);
        setFormData({
            noasuransi: item.noasuransi,
            tanggalasuransi: item.tanggalasuransi,
            namacust: item.namacust,
            namacustterima: item.namacustterima,
            totalbiaya: item.totalbiaya,
            jenisbarang: item.jenisbarang,
            rutepengiriman: item.rutepengiriman,
            tanggalpengiriman: item.tanggalpengiriman,
            bttt_id: item.bttt_id,
            asuransi_bayaryn: item.asuransi_bayaryn
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/marketing/asuransi/save', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(res.data?.message || "Data asuransi berhasil disimpan");
            setShowModal(false);
            fetchData();
        } catch (err) {
            alert(`Gagal simpan asuransi: ${err.response?.data?.error || err.message}`);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(`Yakin ingin menonaktifkan asuransi nomor ${id}?`)) return;
        try {
            const token = localStorage.getItem('token');
            await api.delete(`/marketing/asuransi/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (err) {
            alert(`Gagal menghapus: ${err.response?.data?.error || err.message}`);
        }
    };

    const columns = [
        {
            header: 'NO. ASURANSI',
            accessor: 'noasuransi',
            render: (item) => (
                <span className="font-mono font-black text-blue-700 block whitespace-nowrap">
                    {item.noasuransi}
                </span>
            )
        },
        {
            header: 'TGL. ASURANSI',
            accessor: 'tanggalasuransi',
            render: (item) => <span className="font-mono font-bold text-black whitespace-nowrap">{item.tanggalasuransi}</span>
        },
        {
            header: 'CUSTOMER PENGIRIM',
            accessor: 'namacust',
            render: (item) => <span className="font-black text-slate-900">{item.namacust}</span>
        },
        {
            header: 'CUSTOMER TUJUAN',
            accessor: 'namacustterima',
            render: (item) => <span className="font-bold text-slate-800">{item.namacustterima}</span>
        },
        {
            header: 'BIAYA ASURANSI (PREMI)',
            accessor: 'totalbiaya',
            render: (item) => <span className="font-mono font-black text-right block text-emerald-700">Rp {Math.round(item.totalbiaya || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'JENIS BARANG',
            accessor: 'jenisbarang',
            render: (item) => <span className="font-bold text-xs uppercase text-slate-800">{item.jenisbarang}</span>
        },
        {
            header: 'RUTE KIRIM',
            accessor: 'rutepengiriman',
            render: (item) => <span className="font-bold text-xs text-slate-700">{item.rutepengiriman}</span>
        },
        {
            header: 'TGL. KIRIM',
            accessor: 'tanggalpengiriman',
            render: (item) => <span className="font-mono text-xs text-slate-600 whitespace-nowrap">{item.tanggalpengiriman}</span>
        },
        {
            header: 'NO. BTT',
            accessor: 'bttt_id',
            render: (item) => <span className="font-mono font-black text-purple-700">{item.bttt_id}</span>
        },
        {
            header: 'STATUS BAYAR',
            accessor: 'asuransi_bayaryn',
            render: (item) => (
                <span className={`inline-block px-2 py-0.5 rounded font-black text-xs border ${item.asuransi_bayaryn === 'Y'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                    {item.asuransi_bayaryn === 'Y' ? 'Sudah' : 'Belum'}
                </span>
            )
        },
        {
            header: 'AKSI',
            accessor: 'noasuransi',
            render: (item) => (
                <div className="flex items-center gap-1.5 justify-center">
                    <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded transition cursor-pointer"
                        title="Edit Data"
                    >
                        <Edit3 size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDelete(item.noasuransi)}
                        className="p-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded transition cursor-pointer"
                        title="Hapus Data"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-5">
            {/* AREA FILTER */}
            {showFilter && (
                <form onSubmit={(e) => { e.preventDefault(); fetchData(); }} className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm space-y-4 text-xs no-print">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 font-black uppercase text-slate-900 tracking-wider text-sm">
                            <Filter size={16} className="text-blue-600" />
                            <span>FILTER PENGAJUAN ASURANSI BARANG</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleOpenAdd}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl uppercase transition flex items-center gap-1.5 cursor-pointer text-xs shadow-sm"
                        >
                            <Plus size={14} /> TAMBAH PENGAJUAN
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="flex items-center gap-2 font-bold text-slate-900 mb-1 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useTanggal}
                                    onChange={(e) => setUseTanggal(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span>PERIODE TANGGAL :</span>
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    disabled={!useTanggal}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold text-xs ${!useTanggal ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-900'}`}
                                />
                                <span className="font-bold text-slate-400">s/d</span>
                                <input
                                    type="date"
                                    disabled={!useTanggal}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold text-xs ${!useTanggal ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-900'}`}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="font-bold text-slate-900 mb-1 block">CUSTOMER PENGIRIM :</label>
                            <select
                                value={selectedCustomer}
                                onChange={(e) => setSelectedCustomer(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 focus:border-blue-600 cursor-pointer"
                            >
                                <option value="">-- SEMUA CUSTOMER --</option>
                                {custOptions.map((c, idx) => (<option key={idx} value={c}>{c}</option>))}
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-900 mb-1 block">NO. BTT / NO. ASURANSI :</label>
                            <input
                                type="text"
                                placeholder="Cari No. BTT atau Polis..."
                                value={noBtt}
                                onChange={(e) => setNoBtt(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 focus:border-blue-600 font-mono"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-900 mb-1 block">STATUS BAYAR PREMI :</label>
                            <select
                                value={bayarFilter}
                                onChange={(e) => setBayarFilter(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 focus:border-blue-600 cursor-pointer"
                            >
                                <option value="">Semua Status Bayar</option>
                                <option value="Y">Sudah Bayar</option>
                                <option value="N">Belum Bayar</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => window.print()} className="px-5 py-2 border border-slate-400 text-slate-900 hover:bg-slate-100 font-black rounded-xl transition flex items-center gap-1.5 uppercase cursor-pointer text-xs">
                            <Printer size={15} /> CETAK
                        </button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5 text-xs">
                            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> REFRESH DATA
                        </button>
                    </div>
                </form>
            )}

            {/* KPI STATISTIK ASURANSI */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL PENGAJUAN</span>
                    <span className="text-2xl font-black font-mono text-slate-900">{dataList.length} Polis</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL PREMI TERKUMPUL</span>
                    <span className="text-2xl font-black font-mono text-emerald-700">Rp {Math.round(totalPremi).toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">SUDAH LUNAS PREMI</span>
                    <span className="text-2xl font-black font-mono text-blue-700">{sudahBayarCount} Polis</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">BELUM LUNAS PREMI</span>
                    <span className="text-2xl font-black font-mono text-rose-700">{belumBayarCount} Polis</span>
                </div>
            </div>

            {/* TABEL DATA ASURANSI */}
            <div className="no-print">
                <DataTableTemplate
                    title="DAFTAR PENGAJUAN ASURANSI BARANG KIRIMAN"
                    columns={columns}
                    data={dataList}
                    loading={loading}
                    isDarkMode={isDarkMode}
                    isAddDisabled={true}
                    hideAddButton={true}
                    onFilter={() => setShowFilter(prev => !prev)}
                />
            </div>

            {/* MODAL ENTRI ASURANSI (TAMBAH & EDIT) */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm no-print">
                    <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-300 shadow-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="text-blue-600" size={20} />
                                <h3 className="font-black text-sm text-slate-900 uppercase">
                                    {isEdit ? `EDIT ASURANSI (${formData.noasuransi})` : 'PENGAJUAN ASURANSI BARU'}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-800 block mb-1">NO. BTT RESMI (*)</label>
                                    <input
                                        type="text"
                                        value={formData.bttt_id}
                                        onChange={(e) => setFormData({ ...formData, bttt_id: e.target.value })}
                                        placeholder="Ketik No BTT..."
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-800 block mb-1">TANGGAL ASURANSI</label>
                                    <input
                                        type="date"
                                        value={formData.tanggalasuransi}
                                        onChange={(e) => setFormData({ ...formData, tanggalasuransi: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-800 block mb-1">CUSTOMER PENGIRIM (*)</label>
                                    <input
                                        type="text"
                                        value={formData.namacust}
                                        onChange={(e) => setFormData({ ...formData, namacust: e.target.value })}
                                        placeholder="Nama pengirim..."
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-800 block mb-1">CUSTOMER PENERIMA (*)</label>
                                    <input
                                        type="text"
                                        value={formData.namacustterima}
                                        onChange={(e) => setFormData({ ...formData, namacustterima: e.target.value })}
                                        placeholder="Nama penerima..."
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-800 block mb-1">JENIS BARANG (*)</label>
                                    <input
                                        type="text"
                                        value={formData.jenisbarang}
                                        onChange={(e) => setFormData({ ...formData, jenisbarang: e.target.value })}
                                        placeholder="Contoh: ELEKTRONIK / SPAREPART"
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold uppercase"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-800 block mb-1">RUTE PENGIRIMAN (*)</label>
                                    <input
                                        type="text"
                                        value={formData.rutepengiriman}
                                        onChange={(e) => setFormData({ ...formData, rutepengiriman: e.target.value })}
                                        placeholder="Contoh: JAKARTA - SURABAYA"
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold uppercase"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-800 block mb-1">BIAYA PREMI ASURANSI (RP)</label>
                                    <input
                                        type="number"
                                        value={formData.totalbiaya}
                                        onChange={(e) => setFormData({ ...formData, totalbiaya: parseFloat(e.target.value) || 0 })}
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-black font-mono text-emerald-700"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-800 block mb-1">STATUS PEMBAYARAN PREMI</label>
                                    <select
                                        value={formData.asuransi_bayaryn}
                                        onChange={(e) => setFormData({ ...formData, asuransi_bayaryn: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
                                    >
                                        <option value="N">Belum Lunas</option>
                                        <option value="Y">Sudah Lunas</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-slate-300 font-bold rounded-xl hover:bg-slate-100 uppercase"
                                >
                                    BATAL
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl uppercase transition shadow"
                                >
                                    SIMPAN ASURANSI
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Asuransi;