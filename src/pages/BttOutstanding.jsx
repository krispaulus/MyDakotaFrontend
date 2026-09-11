import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, RefreshCw, Printer, AlertTriangle, Package, CheckCircle2, Clock } from 'lucide-react';

const BttOutstanding = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    // Filter Parameter
    const [useTanggal, setUseTanggal] = useState(false);
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [selectedCabang, setSelectedCabang] = useState('');
    const [cabangOptions, setCabangOptions] = useState([]);
    const [tujuanKota, setTujuanKota] = useState('');
    const [kotaOptions, setKotaOptions] = useState([]);
    const [pengirim, setPengirim] = useState('');
    const [noBtt, setNoBtt] = useState('');
    const [pembayaranVal, setPembayaranVal] = useState('');

    // State View
    const [showFilter, setShowFilter] = useState(true);
    const [loading, setLoading] = useState(false);
    const [dataList, setDataList] = useState([]);

    useEffect(() => {
        const loadInitData = async () => {
            try {
                const token = localStorage.getItem('token');
                const [resCabang, resKota] = await Promise.all([
                    api.get('/laporan/btt-counter/combo-cabang', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/laporan/penjualan/combo-kota', { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setCabangOptions(resCabang.data?.data || []);
                setKotaOptions(resKota.data?.data || []);
            } catch (err) {
                console.error("Gagal load opsi filter:", err);
            }
        };
        loadInitData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                use_tanggal: useTanggal ? 'true' : 'false',
                start_date: startDate,
                end_date: endDate,
                cabang: selectedCabang,
                tujuan: tujuanKota,
                pengirim: pengirim,
                nobtt: noBtt,
                pembayaran: pembayaranVal
            });

            const res = await api.get(`/laporan/btt-outstanding/data?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDataList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load data btt outstanding:", err);
            setDataList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Perhitungan KPI Ringkasan
    const totalColly = useMemo(() => dataList.reduce((acc, i) => acc + (i.bttt_jmlunit || 0), 0), [dataList]);
    const totalBerat = useMemo(() => dataList.reduce((acc, i) => acc + (i.bttt_berat || 0), 0), [dataList]);
    const totalBiaya = useMemo(() => dataList.reduce((acc, i) => acc + (i.bttt_harga || 0), 0), [dataList]);

    const columns = [
        {
            header: 'NO BTT',
            accessor: 'bttt_id',
            render: (item) => <span className="font-mono font-black text-blue-700">{item.bttt_id}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'bttt_tanggal',
            render: (item) => <span className="font-mono font-bold text-black whitespace-nowrap">{item.bttt_tanggal}</span>
        },
        {
            header: 'COLLY',
            accessor: 'bttt_jmlunit',
            render: (item) => <span className="font-mono font-black text-right block">{item.bttt_jmlunit}</span>
        },
        {
            header: 'BERAT',
            accessor: 'bttt_berat',
            render: (item) => <span className="font-mono font-bold text-right block">{item.bttt_berat.toFixed(0)} Kg</span>
        },
        {
            header: 'ISI BARANG',
            accessor: 'bttt_namabarang',
            render: (item) => <span className="font-bold text-black uppercase text-xs">{item.bttt_namabarang}</span>
        },
        {
            header: 'TUJUAN',
            accessor: 'bttt_tujuankota',
            render: (item) => <span className="font-bold text-black">{item.bttt_tujuankota}</span>
        },
        {
            header: 'CABANG PENERIMA',
            accessor: 'agen_nama2',
            render: (item) => <span className="font-black text-slate-800">{item.agen_nama2}</span>
        },
        {
            header: 'ALAMAT TUJUAN',
            accessor: 'bttt_tujuanalamat',
            render: (item) => <span className="text-xs font-semibold text-slate-600 truncate max-w-[200px] block" title={item.bttt_tujuanalamat}>{item.bttt_tujuanalamat}</span>
        },
        {
            header: 'BIAYA',
            accessor: 'bttt_harga',
            render: (item) => <span className="font-mono font-black text-right block">Rp {Math.round(item.bttt_harga).toLocaleString('id-ID')}</span>
        },
        {
            header: 'PENGIRIM',
            accessor: 'bttt_asalname',
            render: (item) => <span className="font-bold text-black">{item.bttt_asalname}</span>
        },
        {
            header: 'PEMBAYARAN',
            accessor: 'pembayaran_label',
            render: (item) => (
                <span className={`inline-block px-2 py-0.5 rounded font-black text-xs ${item.pembayaran_label === 'TUNAI' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        item.pembayaran_label === 'KREDIT' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            'bg-sky-100 text-sky-800 border border-sky-300'
                    }`}>
                    {item.pembayaran_label}
                </span>
            )
        },
        {
            header: 'STATUS BAYAR',
            accessor: 'status_bayar',
            render: (item) => (
                <span className={`inline-block px-2 py-0.5 rounded font-black text-xs ${item.status_bayar === 'BELUM' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                    {item.status_bayar}
                </span>
            )
        }
    ];

    return (
        <div className="space-y-5">
            {/* FILTER PARAMETER */}
            {showFilter && (
                <form onSubmit={(e) => { e.preventDefault(); fetchData(); }} className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm space-y-4 text-xs no-print">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-900 tracking-wider text-sm border-b border-slate-100 pb-3">
                        <Filter size={16} className="text-blue-600" />
                        <span>FILTER PARAMETER BTT KIRIM OUTSTANDING</span>
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
                            <label className="font-bold text-slate-900 mb-1 block">CABANG / AGEN PENGIRIM :</label>
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
                            <label className="font-bold text-slate-900 mb-1 block">METODE PEMBAYARAN :</label>
                            <select
                                value={pembayaranVal}
                                onChange={(e) => setPembayaranVal(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 focus:border-blue-600 cursor-pointer"
                            >
                                <option value="">Semua Metode</option>
                                <option value="1">Tunai</option>
                                <option value="2">Kredit</option>
                                <option value="3">Tagih</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                        <div>
                            <label className="font-bold text-slate-900 mb-1 block">NAMA PENGIRIM :</label>
                            <input
                                type="text"
                                placeholder="Cari nama pengirim..."
                                value={pengirim}
                                onChange={(e) => setPengirim(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 focus:border-blue-600"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-900 mb-1 block">NOMOR BTT :</label>
                            <input
                                type="text"
                                placeholder="Ketik nomor resi..."
                                value={noBtt}
                                onChange={(e) => setNoBtt(e.target.value)}
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

            {/* KPI STATISTIK OUTSTANDING */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL BTT OUTSTANDING</span>
                    <span className="text-2xl font-black font-mono text-rose-700">{dataList.length} Resi</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL COLLY TERTUNDA</span>
                    <span className="text-2xl font-black font-mono text-blue-700">{totalColly.toLocaleString('id-ID')} Koli</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL BERAT</span>
                    <span className="text-2xl font-black font-mono text-slate-900">{totalBerat.toFixed(0)} Kg</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL BIAYA KIRIM</span>
                    <span className="text-2xl font-black font-mono text-emerald-700">Rp {Math.round(totalBiaya).toLocaleString('id-ID')}</span>
                </div>
            </div>

            {/* TABEL DATA OUTSTANDING */}
            <div className="no-print">
                <DataTableTemplate
                    title="DAFTAR BTT KIRIM OUTSTANDING (BELUM TERIMA DI TUJUAN)"
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

export default BttOutstanding;