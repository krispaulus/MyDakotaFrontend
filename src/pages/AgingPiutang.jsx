import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Filter, Printer, DollarSign, Calendar, Building, User, CheckSquare } from 'lucide-react';
import Swal from 'sweetalert2';

const AgingPiutang = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [bypassTanggal, setBypassTanggal] = useState(false);
    const [selectedCabang, setSelectedCabang] = useState('');
    const [selectedCust, setSelectedCust] = useState('');
    const [cabangList, setCabangList] = useState([]);
    const [custList, setCustList] = useState([]);

    const [loading, setLoading] = useState(false);
    const [agingData, setAgingData] = useState([]);
    const [summary, setSummary] = useState({
        total_current: 0,
        total_31_60: 0,
        total_61_90: 0,
        total_over_90: 0,
        grand_total: 0
    });

    useEffect(() => {
        const fetchOptions = async () => {
            const token = localStorage.getItem('token');
            try {
                const [resCabang, resCust] = await Promise.all([
                    api.get('/gl/agen-ca?stt=', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/gl/customers?limit=1000', { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setCabangList(resCabang.data?.data || []);
                setCustList(resCust.data?.data || []);
            } catch (err) {
                console.error("Gagal load opsi filter:", err);
            }
        };
        fetchOptions();
    }, []);

    const fetchAgingData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            let url = `/piutang/aging?pt_id=${ptId}&bypass_tanggal=${bypassTanggal}`;

            if (!bypassTanggal) {
                url += `&start_date=${startDate}&end_date=${endDate}`;
            }
            if (selectedCabang) url += `&cabang_id=${selectedCabang}`;
            if (selectedCust) url += `&cust_id=${selectedCust}`;

            const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setAgingData(res.data?.data || []);
            setSummary(res.data?.summary || {});
        } catch (err) {
            console.error("Gagal mengambil data aging piutang:", err);
            Swal.fire({ title: 'Error', text: 'Gagal mengambil data aging piutang.', icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        fetchAgingData();
    };

    return (
        <div className="space-y-6">
            {/* Header & Filter Card */}
            <form onSubmit={handleFilterSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 text-xs">
                <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-800 tracking-wider">
                        <Filter size={18} className="text-sky-600" />
                        FILTER LAPORAN AGING PIUTANG
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Filter Tanggal */}
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <label className="font-bold text-slate-600 block mb-1">TGL AWAL</label>
                            <input
                                type="date"
                                disabled={bypassTanggal}
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={`w-full p-2.5 border rounded-lg font-bold outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'}`}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="font-bold text-slate-600 block mb-1">TGL AKHIR</label>
                            <input
                                type="date"
                                disabled={bypassTanggal}
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className={`w-full p-2.5 border rounded-lg font-bold outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'}`}
                            />
                        </div>
                    </div>

                    {/* Filter Cabang */}
                    <div>
                        <label className="font-bold text-slate-600 block mb-1">AGEN / CABANG</label>
                        <select
                            value={selectedCabang}
                            onChange={(e) => setSelectedCabang(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-sky-500"
                        >
                            <option value="">-- SEMUA CABANG (ALL) --</option>
                            {cabangList.map((c, i) => (
                                <option key={i} value={c.agen_id || c.AgenID}>{c.agen_nama || c.AgenNama}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filter Customer */}
                    <div>
                        <label className="font-bold text-slate-600 block mb-1">CUSTOMER</label>
                        <select
                            value={selectedCust}
                            onChange={(e) => setSelectedCust(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-sky-500"
                        >
                            <option value="">-- SEMUA CUSTOMER (ALL) --</option>
                            {custList.map((cust, i) => (
                                <option key={i} value={cust.cust_id}>{cust.cust_name} [{cust.cust_id}]</option>
                            ))}
                        </select>
                    </div>

                    {/* Bypass Checkbox & Action */}
                    <div className="flex flex-col justify-between">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 mt-6">
                            <input
                                type="checkbox"
                                checked={bypassTanggal}
                                onChange={(e) => setBypassTanggal(e.target.checked)}
                                className="w-4 h-4 text-sky-600 rounded"
                            />
                            Bypass Filter Tanggal
                        </label>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition flex items-center gap-1.5"
                    >
                        <Printer size={14} /> Cetak Laporan
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition uppercase"
                    >
                        PROSES AGING
                    </button>
                </div>
            </form>

            {/* Aging Summary KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs font-sans">
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                    <span className="text-emerald-700 font-bold block mb-1">0 - 30 HARI (CURRENT)</span>
                    <span className="text-base font-black font-mono text-emerald-800">Rp {Number(summary.total_current || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl">
                    <span className="text-sky-700 font-bold block mb-1">31 - 60 HARI</span>
                    <span className="text-base font-black font-mono text-sky-800">Rp {Number(summary.total_31_60 || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                    <span className="text-amber-700 font-bold block mb-1">61 - 90 HARI</span>
                    <span className="text-base font-black font-mono text-amber-800">Rp {Number(summary.total_61_90 || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl">
                    <span className="text-rose-700 font-bold block mb-1">&gt; 90 HARI (OVERDUE)</span>
                    <span className="text-base font-black font-mono text-rose-800">Rp {Number(summary.total_over_90 || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md">
                    <span className="text-slate-300 font-bold block mb-1">TOTAL OUTSTANDING</span>
                    <span className="text-base font-black font-mono text-emerald-400">Rp {Number(summary.grand_total || 0).toLocaleString('id-ID')}</span>
                </div>
            </div>

            {/* Tabel Detail Aging */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-xs">
                <div className="p-4 bg-slate-800 text-white font-bold tracking-wider uppercase">
                    RINCIAN AGING PIUTANG PER CUSTOMER
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                            <tr>
                                <th className="p-3">CUSTOMER</th>
                                <th className="p-3">CABANG</th>
                                <th className="p-3">NO. INVOICE</th>
                                <th className="p-3">TGL INVOICE</th>
                                <th className="p-3 text-right">TOTAL TAGIHAN</th>
                                <th className="p-3 text-right text-emerald-700">0 - 30 HARI</th>
                                <th className="p-3 text-right text-sky-700">31 - 60 HARI</th>
                                <th className="p-3 text-right text-amber-700">61 - 90 HARI</th>
                                <th className="p-3 text-right text-rose-700">&gt; 90 HARI</th>
                                <th className="p-3 text-right font-black">SISA PIUTANG</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {agingData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-3 font-bold text-slate-800">{row.cust_name}</td>
                                    <td className="p-3 font-medium text-slate-600 uppercase">{row.cabang_nama}</td>
                                    <td className="p-3 font-mono font-bold text-sky-600">{row.no_invoice}</td>
                                    <td className="p-3 font-mono text-slate-600">{row.tgl_invoice}</td>
                                    <td className="p-3 text-right font-mono font-bold">Rp {Number(row.total_tagihan).toLocaleString('id-ID')}</td>
                                    <td className="p-3 text-right font-mono text-emerald-600">{row.bucket_current ? `Rp ${Number(row.bucket_current).toLocaleString('id-ID')}` : '-'}</td>
                                    <td className="p-3 text-right font-mono text-sky-600">{row.bucket_31_60 ? `Rp ${Number(row.bucket_31_60).toLocaleString('id-ID')}` : '-'}</td>
                                    <td className="p-3 text-right font-mono text-amber-600">{row.bucket_61_90 ? `Rp ${Number(row.bucket_61_90).toLocaleString('id-ID')}` : '-'}</td>
                                    <td className="p-3 text-right font-mono font-bold text-rose-600">{row.bucket_over_90 ? `Rp ${Number(row.bucket_over_90).toLocaleString('id-ID')}` : '-'}</td>
                                    <td className="p-3 text-right font-mono font-black text-slate-900 bg-slate-50">Rp {Number(row.sisa_piutang).toLocaleString('id-ID')}</td>
                                </tr>
                            ))}
                            {agingData.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                                        {loading ? 'Memuat data aging piutang...' : 'Tidak ada data piutang outstanding untuk filter yang dipilih.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AgingPiutang;