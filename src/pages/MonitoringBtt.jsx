import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, RefreshCw, Printer, AlertTriangle, CheckCircle2, Clock, Truck, XCircle, DollarSign } from 'lucide-react';

const MonitoringBtt = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    // Filter State
    const [useTanggal, setUseTanggal] = useState(false);
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [customer, setCustomer] = useState('');
    const [custOptions, setCustOptions] = useState([]);
    const [tujuanKota, setTujuanKota] = useState('');
    const [kotaOptions, setKotaOptions] = useState([]);
    const [noBtt, setNoBtt] = useState('');
    const [noSJ, setNoSJ] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // State View
    const [showFilter, setShowFilter] = useState(true);
    const [loading, setLoading] = useState(false);
    const [dataList, setDataList] = useState([]);
    const [summary, setSummary] = useState({
        total_barang: 0,
        diterima: 0,
        proses: 0,
        gagal: 0,
        blm_berangkat: 0,
        total_cod: 0
    });

    useEffect(() => {
        const loadInitData = async () => {
            try {
                const token = localStorage.getItem('token');
                const [resCust, resKota] = await Promise.all([
                    api.get('/marketing/monitoring-btt/combo-customer', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/laporan/penjualan/combo-kota', { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setCustOptions(resCust.data?.data || []);
                setKotaOptions(resKota.data?.data || []);
            } catch (err) {
                console.error("Gagal load opsi filter:", err);
            }
        };
        loadInitData();
    }, []);

    const fetchData = async () => {
        // Validasi 30 hari sesuai ketentuan ASP lama
        if (useTanggal && startDate && endDate) {
            const diffDays = Math.ceil(Math.abs(new Date(endDate) - new Date(startDate)) / (1000 * 3600 * 24));
            if (diffDays > 30) {
                alert("MAKSIMAL PERIODE YANG DIIZINKAN UNTUK DITAMPILKAN ADALAH 30 HARI");
                return;
            }
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                use_tanggal: useTanggal ? 'true' : 'false',
                start_date: startDate,
                end_date: endDate,
                customer: customer,
                tujuan: tujuanKota,
                nobtt: noBtt,
                nosj: noSJ,
                status: statusFilter
            });

            const res = await api.get(`/marketing/monitoring-btt/data?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDataList(res.data?.data || []);
            if (res.data?.summary) {
                setSummary(res.data.summary);
            }
        } catch (err) {
            console.error("Gagal load monitoring btt:", err);
            setDataList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const columns = [
        {
            header: 'NO BTT',
            accessor: 'bttt_id',
            render: (item) => <span className="font-mono font-black text-blue-700">{item.bttt_id}</span>
        },
        {
            header: 'TGL BTT',
            accessor: 'bttt_tanggal',
            render: (item) => <span className="font-mono font-bold text-black whitespace-nowrap">{item.bttt_tanggal}</span>
        },
        {
            header: 'PENGIRIM',
            accessor: 'bttt_asalname',
            render: (item) => (
                <div className="flex flex-col">
                    <span className="font-black text-black">{item.bttt_asalname}</span>
                    {item.cust_name && item.cust_name !== '-' && (
                        <span className="font-mono text-[10px] text-slate-500">{item.cust_name}</span>
                    )}
                </div>
            )
        },
        {
            header: 'NO SJ / PCKG #ID',
            accessor: 'bttt_nosuratjalan',
            render: (item) => <span className="font-mono font-bold text-slate-800">{item.bttt_nosuratjalan}</span>
        },
        {
            header: 'ISI KIRIMAN',
            accessor: 'bttt_namabarang',
            render: (item) => <span className="font-bold text-black text-xs uppercase">{item.bttt_namabarang}</span>
        },
        {
            header: 'KOLI',
            accessor: 'bttt_jmlunit',
            render: (item) => <span className="font-mono font-black text-right block">{item.bttt_jmlunit}</span>
        },
        {
            header: 'BERAT',
            accessor: 'bttt_berat',
            render: (item) => <span className="font-mono font-bold text-right block">{item.bttt_berat.toFixed(1)} Kg</span>
        },
        {
            header: 'TUJUAN',
            accessor: 'bttt_tujuankota',
            render: (item) => <span className="font-bold text-black">{item.bttt_tujuankota}</span>
        },
        {
            header: 'PENERIMA',
            accessor: 'bttt_tujuannama',
            render: (item) => <span className="font-bold text-black">{item.bttt_tujuannama}</span>
        },
        {
            header: 'COD',
            accessor: 'bttt_tagihtujuan',
            render: (item) => (
                <span className="font-mono font-bold text-right block">
                    {item.bttt_tagihtujuan > 0 ? `Rp ${Math.round(item.bttt_tagihtujuan).toLocaleString('id-ID')}` : '-'}
                </span>
            )
        },
        {
            header: 'TGL HISTORY',
            accessor: 'hist_tanggal',
            render: (item) => <span className="font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">{item.hist_tanggal || '-'}</span>
        },
        {
            header: 'KETERANGAN',
            accessor: 'keterangan',
            render: (item) => <span className="text-xs font-bold text-slate-800 block max-w-[150px] truncate" title={item.keterangan}>{item.keterangan}</span>
        },
        {
            header: 'POSISI BARANG',
            accessor: 'posisi_barang',
            render: (item) => <span className="font-black text-xs text-blue-900 uppercase">{item.posisi_barang}</span>
        },
        {
            header: 'STATUS',
            accessor: 'status_tracking',
            render: (item) => {
                let badgeStyle = "bg-slate-100 text-slate-800 border-slate-300";
                if (item.status_kategori === 'diterima') badgeStyle = "bg-emerald-100 text-emerald-900 border-emerald-400";
                else if (item.status_kategori === 'proses') badgeStyle = "bg-blue-100 text-blue-900 border-blue-400";
                else if (item.status_kategori === 'gagal') badgeStyle = "bg-rose-100 text-rose-900 border-rose-400";
                else if (item.status_kategori === 'blm_berangkat') badgeStyle = "bg-amber-100 text-amber-900 border-amber-400";

                return (
                    <span className={`inline-block px-2.5 py-1 rounded font-black text-xs border whitespace-nowrap ${badgeStyle}`}>
                        {item.status_tracking}
                    </span>
                );
            }
        }
    ];

    return (
        <div className="space-y-5">
            {/* FORM FILTER */}
            {showFilter && (
                <form onSubmit={(e) => { e.preventDefault(); fetchData(); }} className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm space-y-4 text-xs no-print">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-900 tracking-wider text-sm border-b border-slate-100 pb-3">
                        <Filter size={16} className="text-blue-600" />
                        <span>FILTER PARAMETER MONITORING BTT</span>
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
                            <label className="font-bold text-slate-900 mb-1 block">CUSTOMER :</label>
                            <select
                                value={customer}
                                onChange={(e) => setCustomer(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 focus:border-blue-600 cursor-pointer"
                            >
                                <option value="">-- SEMUA CUSTOMER --</option>
                                {custOptions.map((c, idx) => (<option key={idx} value={c}>{c}</option>))}
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-900 mb-1 block">KOTA TUJUAN :</label>
                            <select
                                value={tujuanKota}
                                onChange={(e) => setTujuanKota(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 focus:border-blue-600 cursor-pointer"
                            >
                                <option value="">Semua Kota Tujuan</option>
                                {kotaOptions.map((k, idx) => (<option key={idx} value={k}>{k}</option>))}
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-900 mb-1 block">STATUS PENGIRIMAN :</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 focus:border-blue-600 cursor-pointer"
                            >
                                <option value="">Semua Status</option>
                                <option value="Diterima">Diterima</option>
                                <option value="Dalam Proses">Dalam Proses</option>
                                <option value="Gagal Diantar">Gagal Diantar</option>
                                <option value="Belum Diberangkatkan">Belum Diberangkatkan</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                        <div>
                            <label className="font-bold text-slate-900 mb-1 block">NOMOR BTT :</label>
                            <input
                                type="text"
                                placeholder="Ketik No BTT..."
                                value={noBtt}
                                onChange={(e) => setNoBtt(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 focus:border-blue-600 font-mono"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-900 mb-1 block">NO SJ / PACKAGE ID :</label>
                            <input
                                type="text"
                                placeholder="Ketik No SJ / Package ID..."
                                value={noSJ}
                                onChange={(e) => setNoSJ(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 focus:border-blue-600 font-mono"
                            />
                        </div>

                        <div className="md:col-span-2 flex items-end justify-end gap-2">
                            <button type="button" onClick={() => window.print()} className="px-5 py-2 border border-slate-400 text-slate-900 hover:bg-slate-100 font-black rounded-xl transition flex items-center gap-1.5 uppercase cursor-pointer text-xs">
                                <Printer size={15} /> Cetak
                            </button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5 text-xs">
                                <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> REFRESH DATA
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* KPI STATISTIK MONITORING */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 no-print">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-[11px] font-black text-slate-800 uppercase block mb-1">TOTAL RESI</span>
                    <span className="text-xl font-black font-mono text-slate-900">{summary.total_barang} BTT</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-[11px] font-black text-emerald-800 uppercase block mb-1">DITERIMA</span>
                    <span className="text-xl font-black font-mono text-emerald-700">{summary.diterima}</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-[11px] font-black text-blue-800 uppercase block mb-1">DALAM PROSES</span>
                    <span className="text-xl font-black font-mono text-blue-700">{summary.proses}</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-[11px] font-black text-amber-800 uppercase block mb-1">BLM BERANGKAT</span>
                    <span className="text-xl font-black font-mono text-amber-700">{summary.blm_berangkat}</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-[11px] font-black text-rose-800 uppercase block mb-1">GAGAL ANTAR</span>
                    <span className="text-xl font-black font-mono text-rose-700">{summary.gagal}</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-[11px] font-black text-purple-800 uppercase block mb-1">TOTAL COD</span>
                    <span className="text-xl font-black font-mono text-purple-700">Rp {Math.round(summary.total_cod).toLocaleString('id-ID')}</span>
                </div>
            </div>

            {/* TABEL DATA HASIL */}
            <div className="no-print">
                <DataTableTemplate
                    title="MONITORING STATUS PERJALANAN BTT"
                    columns={columns}
                    data={dataList}
                    loading={loading}
                    isDarkMode={isDarkMode}
                    isAddDisabled={true}
                    hideAddButton={true}
                    onFilter={() => setShowFilter(prev => !prev)}
                />
            </div>
        </div>
    );
};

export default MonitoringBtt;