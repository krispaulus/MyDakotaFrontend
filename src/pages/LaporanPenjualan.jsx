import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, RefreshCw, Printer, Calendar, BarChart2, AlertCircle } from 'lucide-react';

const LaporanPenjualan = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    // Filter Form State
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [tipeLaporan, setTipeLaporan] = useState('1'); // 1: Detail, 2: Rekap Omset, 4: BTT Batal[cite: 9, 10]
    const [selectedCabang, setSelectedCabang] = useState('');
    const [cabangOptions, setCabangOptions] = useState([]);
    const [penjualanVal, setPenjualanVal] = useState('0'); // 0: Semua, 1: Tunai, 2: Kredit, 3: Tagih[cite: 7, 10]
    const [tujuanKota, setTujuanKota] = useState('');
    const [kotaOptions, setKotaOptions] = useState([]);
    const [urutVal, setUrutVal] = useState('1'); // 1: Nama Customer, 2: Biaya Kirim[cite: 7, 10]

    // Tambahkan checkbox aktif tanggal
    const [useTanggal, setUseTanggal] = useState(false);

    // State View
    const [showFilter, setShowFilter] = useState(true);
    const [loading, setLoading] = useState(false);
    const [dataList, setDataList] = useState([]);

    // Load Dropdowns
    useEffect(() => {
        const loadInitData = async () => {
            try {
                const token = localStorage.getItem('token');
                const [resCabang, resKota] = await Promise.all([
                    api.get('/laporan/btt-counter/combo-cabang', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/laporan/penjualan/combo-kota', { headers: { Authorization: `Bearer ${token}` } })
                ]);
                const cList = resCabang.data?.data || [];
                setCabangOptions(cList);
                // Default ke Semua Cabang agar langsung memuat transaksi
                setSelectedCabang('');
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
                tipe: tipeLaporan,
                use_tanggal: useTanggal ? 'true' : 'false',
                start_date: startDate,
                end_date: endDate,
                cabang: selectedCabang,
                penjualan: penjualanVal,
                tujuan_kota: tujuanKota,
                urut: urutVal
            });

            const res = await api.get(`/laporan/penjualan/data?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDataList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load data penjualan:", err);
            setDataList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [tipeLaporan]);

    // KPI Card Totals
    const totalBerat = useMemo(() => dataList.reduce((acc, i) => acc + (i.berat || 0), 0), [dataList]);
    const totalOmset = useMemo(() => {
        if (tipeLaporan === '2' || tipeLaporan === '3') {
            return dataList.reduce((acc, i) => acc + (i.total_omset || 0), 0);
        }
        return dataList.reduce((acc, i) => acc + (i.total || 0), 0);
    }, [dataList, tipeLaporan]);
    const totalCollyOrBtt = useMemo(() => {
        if (tipeLaporan === '2' || tipeLaporan === '3') {
            return dataList.reduce((acc, i) => acc + (i.jumlah_btt || 0), 0);
        }
        return dataList.reduce((acc, i) => acc + (i.colly || 0), 0);
    }, [dataList, tipeLaporan]);

    // Kolom Dinamis Berdasarkan Tipe Laporan[cite: 7, 8, 11]
    const columns = useMemo(() => {
        // TIPE 2 & 3: REKAPITULASI OMSET CABANG[cite: 11]
        if (tipeLaporan === '2' || tipeLaporan === '3') {
            return [
                {
                    header: 'CABANG / AGEN / COUNTER',
                    accessor: 'agen_nama',
                    render: (item) => <span className="font-black text-black">{item.agen_nama}</span>
                },
                {
                    header: 'TUNAI (KIRIM)',
                    accessor: 'harga_tunai',
                    render: (item) => <span className="font-mono font-bold text-right block">Rp {Math.round(item.harga_tunai).toLocaleString('id-ID')}</span>
                },
                {
                    header: 'TUNAI (PENERUS)',
                    accessor: 'penerus_tunai',
                    render: (item) => <span className="font-mono font-bold text-right block">Rp {Math.round(item.penerus_tunai).toLocaleString('id-ID')}</span>
                },
                {
                    header: 'KREDIT (KIRIM)',
                    accessor: 'harga_kredit',
                    render: (item) => <span className="font-mono font-bold text-right block">Rp {Math.round(item.harga_kredit).toLocaleString('id-ID')}</span>
                },
                {
                    header: 'TAGIH (KIRIM)',
                    accessor: 'harga_tagih',
                    render: (item) => <span className="font-mono font-bold text-right block">Rp {Math.round(item.harga_tagih).toLocaleString('id-ID')}</span>
                },
                {
                    header: 'PACKING',
                    accessor: 'packing',
                    render: (item) => <span className="font-mono font-bold text-right block">Rp {Math.round(item.packing).toLocaleString('id-ID')}</span>
                },
                {
                    header: 'TOTAL OMSET',
                    accessor: 'total_omset',
                    render: (item) => <span className="font-mono font-black text-emerald-800 text-right block">Rp {Math.round(item.total_omset).toLocaleString('id-ID')}</span>
                },
                {
                    header: 'BERAT (KG)',
                    accessor: 'berat',
                    render: (item) => <span className="font-mono font-bold text-right block">{item.berat.toFixed(1)}</span>
                },
                {
                    header: 'JML. BTT',
                    accessor: 'jumlah_btt',
                    render: (item) => <span className="font-mono font-black text-blue-800 text-right block">{item.jumlah_btt}</span>
                }
            ];
        }

        // TIPE 4: LAPORAN RESI DIBATALKAN / NONAKTIF[cite: 8]
        if (tipeLaporan === '4') {
            return [
                {
                    header: 'NO. BTT / RESI',
                    accessor: 'bttt_id',
                    render: (item) => <span className="font-mono font-black text-rose-700">{item.bttt_id}</span>
                },
                {
                    header: 'CUSTOMER',
                    accessor: 'cust_name',
                    render: (item) => <span className="font-black text-black">{item.cust_name}</span>
                },
                {
                    header: 'PEMBAYARAN',
                    accessor: 'jnbayar',
                    render: (item) => <span className="inline-block px-2 py-0.5 rounded font-black text-xs bg-slate-200 text-slate-800">{item.jnbayar}</span>
                },
                {
                    header: 'TANGGAL',
                    accessor: 'bttt_tanggal',
                    render: (item) => <span className="font-mono font-bold text-black">{item.bttt_tanggal}</span>
                },
                {
                    header: 'DINONAKTIFKAN OLEH',
                    accessor: 'bttt_updateid',
                    render: (item) => (
                        <div className="flex flex-col">
                            <span className="font-black text-rose-900">{item.bttt_updateid}</span>
                            <span className="font-mono text-[10px] text-slate-500">{item.bttt_updatetime}</span>
                        </div>
                    )
                },
                {
                    header: 'BERAT',
                    accessor: 'berat',
                    render: (item) => <span className="font-mono font-bold text-right block">{item.berat.toFixed(1)} Kg</span>
                },
                {
                    header: 'COLLY',
                    accessor: 'colly',
                    render: (item) => <span className="font-mono font-bold text-right block">{item.colly}</span>
                },
                {
                    header: 'TOTAL NOMINAL',
                    accessor: 'total',
                    render: (item) => <span className="font-mono font-black text-right block text-rose-800 line-through">Rp {Math.round(item.total).toLocaleString('id-ID')}</span>
                }
            ];
        }

        // TIPE 1: DETAIL RESI PENJUALAN (DEFAULT)[cite: 7]
        return [
            {
                header: 'NO. BTT',
                accessor: 'bttt_id',
                render: (item) => <span className="font-mono font-black text-blue-700">{item.bttt_id}</span>
            },
            {
                header: 'CUSTOMER',
                accessor: 'cust_name',
                render: (item) => (
                    <div className="flex flex-col">
                        <span className="font-black text-black">{item.cust_name}</span>
                        <span className="font-mono text-[10px] text-slate-400">{item.bttt_asalcustid}</span>
                    </div>
                )
            },
            {
                header: 'PENERIMA',
                accessor: 'bttt_tujuannama',
                render: (item) => (
                    <span className="font-bold text-black block min-w-[120px]">
                        {item.bttt_tujuannama && item.bttt_tujuannama !== '-' ? item.bttt_tujuannama : '-'}
                    </span>
                )
            },
            {
                header: 'TUJUAN',
                accessor: 'bttt_tujuankota',
                render: (item) => (
                    <span className="font-bold text-black block min-w-[100px]">
                        {item.bttt_tujuankota && item.bttt_tujuankota !== '-' ? item.bttt_tujuankota : '-'}
                    </span>
                )
            },
            {
                header: 'BAYAR',
                accessor: 'jnbayar',
                render: (item) => {
                    const bayar = item.jnbayar && item.jnbayar !== '-' ? item.jnbayar : 'Tunai';
                    return (
                        <span className={`inline-block px-2.5 py-0.5 rounded font-black text-xs whitespace-nowrap ${bayar === 'Tunai'
                            ? 'bg-emerald-200 text-emerald-950 border border-emerald-400'
                            : bayar === 'Kredit'
                                ? 'bg-amber-200 text-amber-950 border border-amber-400'
                                : 'bg-rose-200 text-rose-950 border border-rose-400'
                            }`}>
                            {bayar}
                        </span>
                    );
                }
            },
            {
                header: 'TANGGAL',
                accessor: 'bttt_tanggal',
                render: (item) => <span className="font-mono font-black text-black whitespace-nowrap">{item.bttt_tanggal}</span>
            },
            {
                header: 'COLLY',
                accessor: 'colly',
                render: (item) => <span className="font-mono font-black text-right block">{item.colly}</span>
            },
            {
                header: 'BERAT',
                accessor: 'berat',
                render: (item) => <span className="font-mono font-black text-right block">{item.berat.toFixed(1)} Kg</span>
            },
            {
                header: 'B. KIRIM',
                accessor: 'biaya_kirim',
                render: (item) => <span className="font-mono font-bold text-right block">Rp {Math.round(item.biaya_kirim).toLocaleString('id-ID')}</span>
            },
            {
                header: 'TOTAL BIAYA',
                accessor: 'total',
                render: (item) => <span className="font-mono font-black text-black text-right block">Rp {Math.round(item.total).toLocaleString('id-ID')}</span>
            }
        ];
    }, [tipeLaporan]);

    return (
        <div className="space-y-5">
            {/* FORM FILTER PARAMETER */}
            {showFilter && (
                <form onSubmit={(e) => { e.preventDefault(); fetchData(); }} className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm space-y-4 text-xs transition-all no-print">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-900 tracking-wider text-sm border-b border-slate-100 pb-3">
                        <Filter size={16} className="text-blue-600" />
                        <span>FILTER PARAMETER LAPORAN PENJUALAN</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="font-bold text-slate-900 mb-1 block">TIPE LAPORAN :</label>
                            <select value={tipeLaporan} onChange={(e) => setTipeLaporan(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 focus:border-blue-600 cursor-pointer">
                                <option value="1">Tipe 1: Detail Transaksi Per Resi</option>
                                <option value="2">Tipe 2: Rekapitulasi Omset Cabang</option>
                                <option value="4">Tipe 4: BTT Batal / Nonaktif</option>
                            </select>
                        </div>

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
                            <label className="font-bold text-slate-900 mb-1 block">CABANG / AGEN ASAL :</label>
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
                            <label className="font-bold text-slate-900 mb-1 block">METODE PEMBAYARAN :</label>
                            <select value={penjualanVal} onChange={(e) => setPenjualanVal(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 focus:border-blue-600 cursor-pointer">
                                <option value="0">Semua Metode</option>
                                <option value="1">Tunai</option>
                                <option value="2">Kredit</option>
                                <option value="3">Tagih Tujuan</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                        <div>
                            <label className="font-bold text-slate-900 mb-1 block">KOTA TUJUAN :</label>
                            <select value={tujuanKota} onChange={(e) => setTujuanKota(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 focus:border-blue-600 cursor-pointer">
                                <option value="">Semua Kota Tujuan</option>
                                {kotaOptions.map((k, idx) => (<option key={idx} value={k}>{k}</option>))}
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-900 mb-1 block">URUTKAN BERDASARKAN :</label>
                            <select value={urutVal} onChange={(e) => setUrutVal(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 focus:border-blue-600 cursor-pointer">
                                <option value="1">Nama Customer</option>
                                <option value="2">Nominal Biaya Kirim Terbesar</option>
                            </select>
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

            {/* KPI REKAPITULASI */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL BARIS DATA</span>
                    <span className="text-2xl font-black font-mono text-slate-900">{dataList.length} Baris</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">
                        {tipeLaporan === '2' || tipeLaporan === '3' ? 'TOTAL RESI' : 'TOTAL COLLY'}
                    </span>
                    <span className="text-2xl font-black font-mono text-blue-700">
                        {totalCollyOrBtt.toLocaleString('id-ID')} {tipeLaporan === '2' || tipeLaporan === '3' ? 'BTT' : 'Koli'}
                    </span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL BERAT</span>
                    <span className="text-2xl font-black font-mono text-slate-900">{totalBerat.toFixed(1)} Kg</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL OMSET / PENJUALAN</span>
                    <span className={`text-2xl font-black font-mono ${tipeLaporan === '4' ? 'text-rose-700 line-through' : 'text-emerald-700'}`}>
                        Rp {Math.round(totalOmset).toLocaleString('id-ID')}
                    </span>
                </div>
            </div>

            {/* TABEL DATA UTAMA */}
            <div className="no-print">
                <DataTableTemplate
                    title={
                        tipeLaporan === '2' || tipeLaporan === '3' ? 'REKAPITULASI OMSET PENJUALAN CABANG' :
                            tipeLaporan === '4' ? 'LAPORAN RESI PENJUALAN DIBATALKAN / NONAKTIF' :
                                'LAPORAN PENJUALAN HARIAN (DETAIL RESI)'
                    }
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

export default LaporanPenjualan;