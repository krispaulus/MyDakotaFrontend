import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import {
    Filter, RefreshCw, Printer, Plus, Truck,
    X, CheckCircle2, Edit3, Trash2, Calendar, MapPin
} from 'lucide-react';

const OrderJemput = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    // Filter State
    const [useTanggal, setUseTanggal] = useState(false);
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [selectedCabang, setSelectedCabang] = useState('');
    const [cabangOptions, setCabangOptions] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [custOptions, setCustOptions] = useState([]);
    const [noOrder, setNoOrder] = useState('');
    const [noReceipt, setNoReceipt] = useState('');
    const [aktifFilter, setAktifFilter] = useState('Y');

    // Table Data State
    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilter, setShowFilter] = useState(true);

    // Modal Form State
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [formData, setFormData] = useState({
        order_id: '',
        order_date: today,
        order_custid: '',
        order_name: '',
        order_note: '',
        order_koli: 1,
        order_berat: 0,
        order_volume: 0,
        order_amount: 0,
        order_supir: '',
        order_nopol: '',
        order_paidyn: 'N'
    });

    // Load Dropdown Options
    useEffect(() => {
        const fetchMasters = async () => {
            try {
                const token = localStorage.getItem('token');
                const [resCust, resCabang] = await Promise.all([
                    api.get('/marketing/monitoring-btt/combo-customer', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/laporan/btt-counter/combo-cabang', { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setCustOptions(resCust.data?.data || []);
                setCabangOptions(resCabang.data?.data || []);
            } catch (err) {
                console.error("Gagal load opsi master:", err);
            }
        };
        fetchMasters();
    }, []);

    // Load Data Order Jemput
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                use_tanggal: useTanggal ? 'true' : 'false',
                start_date: startDate,
                end_date: endDate,
                cabang: selectedCabang,
                customer: selectedCustomer,
                no_order: noOrder,
                no_receipt: noReceipt,
                aktif: aktifFilter
            });

            const res = await api.get(`/marketing/order-jemput/data?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDataList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load order jemput:", err);
            setDataList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // KPI Summary
    const totalOrder = dataList.length;
    const totalBiayaJemput = useMemo(() => dataList.reduce((acc, i) => acc + (Number(i.order_amount) || 0), 0), [dataList]);
    const totalKoli = useMemo(() => dataList.reduce((acc, i) => acc + (Number(i.order_koli) || 0), 0), [dataList]);
    const totalBerat = useMemo(() => dataList.reduce((acc, i) => acc + (Number(i.order_berat) || 0), 0), [dataList]);

    // Handle Modal
    const handleOpenAdd = () => {
        setIsEdit(false);
        setFormData({
            order_id: '',
            order_date: today,
            order_custid: '',
            order_name: '',
            order_note: '',
            order_koli: 1,
            order_berat: 0,
            order_volume: 0,
            order_amount: 0,
            order_supir: '',
            order_nopol: '',
            order_paidyn: 'N'
        });
        setShowModal(true);
    };

    const handleOpenEdit = (item) => {
        setIsEdit(true);
        setFormData({
            order_id: item.order_id,
            order_date: item.order_date,
            order_custid: '',
            order_name: item.cust_name,
            order_note: item.order_note,
            order_koli: item.order_koli,
            order_berat: item.order_berat,
            order_volume: item.order_volume,
            order_amount: item.order_amount,
            order_supir: item.order_supir,
            order_nopol: item.order_nopol,
            order_paidyn: item.order_paidyn
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/marketing/order-jemput/save', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(res.data?.message || "Order jemput berhasil disimpan");
            setShowModal(false);
            fetchData();
        } catch (err) {
            alert(`Gagal simpan order jemput: ${err.response?.data?.error || err.message}`);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(`Yakin ingin menonaktifkan order jemput nomor ${id}?`)) return;
        try {
            const token = localStorage.getItem('token');
            await api.delete(`/marketing/order-jemput/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (err) {
            alert(`Gagal menghapus: ${err.response?.data?.error || err.message}`);
        }
    };

    const columns = [
        {
            header: 'NO. ORDER',
            accessor: 'order_id',
            render: (item) => (
                <span className="font-mono font-black text-blue-700 whitespace-nowrap">
                    {item.order_id}
                </span>
            )
        },
        {
            header: 'CABANG / AGEN',
            accessor: 'agen_nama',
            render: (item) => <span className="font-bold text-xs text-slate-800 uppercase">{item.agen_nama}</span>
        },
        {
            header: 'TGL. ORDER',
            accessor: 'order_date',
            render: (item) => <span className="font-mono font-bold text-black whitespace-nowrap">{item.order_date}</span>
        },
        {
            header: 'CUSTOMER / PEMOHON',
            accessor: 'cust_name',
            render: (item) => (
                <div className="flex flex-col">
                    <span className="font-black text-slate-900">{item.cust_name}</span>
                    {item.cust_telp && item.cust_telp !== '-' && (
                        <span className="text-[10px] font-mono text-slate-500">{item.cust_telp}</span>
                    )}
                </div>
            )
        },
        {
            header: 'BIAYA JEMPUT',
            accessor: 'order_amount',
            render: (item) => (
                <span className="font-mono font-black text-right block text-emerald-700">
                    Rp {Math.round(item.order_amount || 0).toLocaleString('id-ID')}
                </span>
            )
        },
        {
            header: 'KOLI',
            accessor: 'order_koli',
            render: (item) => <span className="font-mono font-bold text-right block">{item.order_koli} Pcs</span>
        },
        {
            header: 'BERAT',
            accessor: 'order_berat',
            render: (item) => <span className="font-mono font-bold text-right block">{item.order_berat} Kg</span>
        },
        {
            header: 'SUPIR & ARMADA',
            accessor: 'order_supir',
            render: (item) => (
                <div className="flex flex-col">
                    <span className="font-bold text-xs text-slate-800 uppercase">{item.order_supir}</span>
                    <span className="font-mono font-semibold text-[10px] text-blue-700">{item.order_nopol}</span>
                </div>
            )
        },
        {
            header: 'NO. RECEIPT',
            accessor: 'no_receipt',
            render: (item) => <span className="font-mono text-xs text-slate-600">{item.no_receipt}</span>
        },
        {
            header: 'NO. JURNAL',
            accessor: 'order_tjurhno',
            render: (item) => <span className="font-mono text-xs text-slate-600">{item.order_tjurhno}</span>
        },
        {
            header: 'STATUS',
            accessor: 'order_activeyn',
            render: (item) => (
                <span className={`inline-block px-2 py-0.5 rounded font-black text-xs border ${item.order_activeyn === 'Y'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                    {item.order_activeyn === 'Y' ? 'Aktif' : 'Nonaktif'}
                </span>
            )
        },
        {
            header: 'AKSI',
            accessor: 'order_id',
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
                        onClick={() => handleDelete(item.order_id)}
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
                            <span>FILTER INSTRUKSI ORDER JEMPUT</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleOpenAdd}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl uppercase transition flex items-center gap-1.5 cursor-pointer text-xs shadow-sm"
                        >
                            <Plus size={14} /> ORDER JEMPUT BARU
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
                            <label className="font-bold text-slate-900 mb-1 block">CABANG / AGEN :</label>
                            <select
                                value={selectedCabang}
                                onChange={(e) => setSelectedCabang(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 focus:border-blue-600 cursor-pointer"
                            >
                                <option value="">-- SEMUA CABANG / AGEN --</option>
                                {cabangOptions.map((cb, idx) => (<option key={idx} value={cb}>{cb}</option>))}
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-900 mb-1 block">CUSTOMER PEMOHON :</label>
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
                            <label className="font-bold text-slate-900 mb-1 block">STATUS AKTIF :</label>
                            <select
                                value={aktifFilter}
                                onChange={(e) => setAktifFilter(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 focus:border-blue-600 cursor-pointer"
                            >
                                <option value="Y">Aktif (Ya)</option>
                                <option value="N">Nonaktif (Tidak)</option>
                                <option value="">Semua</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                        <div>
                            <label className="font-bold text-slate-900 mb-1 block">NO. ORDER JEMPUT :</label>
                            <input
                                type="text"
                                placeholder="Cari No. Order..."
                                value={noOrder}
                                onChange={(e) => setNoOrder(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 focus:border-blue-600 font-mono"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-900 mb-1 block">NO. RECEIPT / KUITANSI :</label>
                            <input
                                type="text"
                                placeholder="Cari No. Receipt..."
                                value={noReceipt}
                                onChange={(e) => setNoReceipt(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 focus:border-blue-600 font-mono"
                            />
                        </div>

                        <div className="md:col-span-2 flex items-end justify-end gap-2">
                            <button type="button" onClick={() => window.print()} className="px-5 py-2 border border-slate-400 text-slate-900 hover:bg-slate-100 font-black rounded-xl transition flex items-center gap-1.5 uppercase cursor-pointer text-xs">
                                <Printer size={15} /> CETAK
                            </button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5 text-xs">
                                <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> REFRESH DATA
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* KPI STATISTIK ORDER JEMPUT */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL ORDER JEMPUT</span>
                    <span className="text-2xl font-black font-mono text-blue-700">{totalOrder} Tugas</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL ESTIMASI KOLI</span>
                    <span className="text-2xl font-black font-mono text-slate-900">{totalKoli.toLocaleString('id-ID')} Pcs</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL ESTIMASI BERAT</span>
                    <span className="text-2xl font-black font-mono text-slate-900">{totalBerat.toFixed(1)} Kg</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL BIAYA JEMPUT</span>
                    <span className="text-2xl font-black font-mono text-emerald-700">Rp {Math.round(totalBiayaJemput).toLocaleString('id-ID')}</span>
                </div>
            </div>

            {/* TABEL DATA ORDER JEMPUT */}
            <div className="no-print">
                <DataTableTemplate
                    title="DAFTAR INSTRUKSI ORDER JEMPUT BARANG"
                    columns={columns}
                    data={dataList}
                    loading={loading}
                    isDarkMode={isDarkMode}
                    isAddDisabled={true}
                    hideAddButton={true}
                    onFilter={() => setShowFilter(prev => !prev)}
                />
            </div>

            {/* MODAL ENTRI ORDER JEMPUT */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm no-print">
                    <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-300 shadow-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <div className="flex items-center gap-2">
                                <Truck className="text-blue-600" size={20} />
                                <h3 className="font-black text-sm text-slate-900 uppercase">
                                    {isEdit ? `EDIT ORDER JEMPUT (${formData.order_id})` : 'PEMBUATAN ORDER JEMPUT BARU'}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-800 block mb-1">TANGGAL ORDER (*)</label>
                                    <input
                                        type="date"
                                        value={formData.order_date}
                                        onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-800 block mb-1">NAMA CUSTOMER / PEMOHON (*)</label>
                                    <input
                                        type="text"
                                        value={formData.order_name}
                                        onChange={(e) => setFormData({ ...formData, order_name: e.target.value })}
                                        placeholder="Nama customer/kantor..."
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="font-bold text-slate-800 block mb-1">JUMLAH KOLI</label>
                                    <input
                                        type="number"
                                        value={formData.order_koli}
                                        onChange={(e) => setFormData({ ...formData, order_koli: parseInt(e.target.value) || 1 })}
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-800 block mb-1">ESTIMASI BERAT (KG)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.order_berat}
                                        onChange={(e) => setFormData({ ...formData, order_berat: parseFloat(e.target.value) || 0 })}
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-800 block mb-1">BIAYA JEMPUT (RP)</label>
                                    <input
                                        type="number"
                                        value={formData.order_amount}
                                        onChange={(e) => setFormData({ ...formData, order_amount: parseFloat(e.target.value) || 0 })}
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-black font-mono text-emerald-700"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-800 block mb-1">NAMA SUPIR / KURIR PENJEMPUT</label>
                                    <input
                                        type="text"
                                        value={formData.order_supir}
                                        onChange={(e) => setFormData({ ...formData, order_supir: e.target.value })}
                                        placeholder="Nama supir..."
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-800 block mb-1">NO. POLISI ARMADA</label>
                                    <input
                                        type="text"
                                        value={formData.order_nopol}
                                        onChange={(e) => setFormData({ ...formData, order_nopol: e.target.value })}
                                        placeholder="Contoh: B 1234 ABC"
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold font-mono uppercase"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-slate-800 block mb-1">CATATAN / ALAMAT PENGAMBILAN</label>
                                <textarea
                                    value={formData.order_note}
                                    onChange={(e) => setFormData({ ...formData, order_note: e.target.value })}
                                    placeholder="Alamat lengkap lokasi jemput atau instruksi barang..."
                                    rows={3}
                                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold"
                                />
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
                                    SIMPAN ORDER JEMPUT
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderJemput;