import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Search, Printer, Layers, FileText } from 'lucide-react';
import Swal from 'sweetalert2';

const LaporanBarangTurun = () => {
    const { isDarkMode } = useDarkMode();
    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState('detail'); // 'detail' (Tipe 1) | 'rekap' (Tipe 2)
    const [cabangList, setCabangList] = useState([]);

    // Default Dates (Bulan Berjalan)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    // Filter States
    const [filterTgla, setFilterTgla] = useState(firstDay);
    const [filterTgle, setFilterTgle] = useState(lastDay);
    const [filterTransit, setFilterTransit] = useState('SEMUA');
    const [filterCabang, setFilterCabang] = useState('PUSAT DAKOTA');
    const [globalSearch, setGlobalSearch] = useState('');

    // 1. FETCH DATA LAPORAN BARANG TURUN
    const fetchReport = async (type = reportType, targetCabang = filterCabang) => {
        setLoading(true);
        setReportType(type);
        try {
            const token = localStorage.getItem('token');
            const endpoint = type === 'detail'
                ? '/operasional/laporan-barang-turun/detail'
                : '/operasional/laporan-barang-turun/rekap';

            const res = await api.get(endpoint, {
                params: {
                    tgla: filterTgla,
                    tgle: filterTgle,
                    transit: filterTransit,
                    cabang: targetCabang
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data;
            setDataList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Gagal memuat Laporan Barang Turun:", err);
            setDataList([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem saat memuat data', 'error');
        } finally {
            setLoading(false);
        }
    };

    // 2. FETCH LIST CABANG/AGEN & USER PROFILE
    useEffect(() => {
        const initData = async () => {
            try {
                const token = localStorage.getItem('token');

                // Fetch Profile untuk dapatkan Cabang User Login
                const profileRes = await api.get('/profile', { headers: { Authorization: `Bearer ${token}` } });
                const userCabang = profileRes.data?.data?.kode_cabang || profileRes.data?.division || 'PUSAT DAKOTA';

                // Fetch List Cabang
                const res = await api.get('/agens', { headers: { Authorization: `Bearer ${token}` } });
                const data = res.data?.data || res.data;
                if (Array.isArray(data)) {
                    setCabangList(data);
                }

                setFilterCabang(userCabang);
                fetchReport('detail', userCabang);
            } catch (err) {
                console.error("Gagal inisialisasi data:", err);
                fetchReport('detail', 'PUSAT DAKOTA');
            }
        };

        initData();
    }, []);

    // DEFINISI KOLOM TIPE 1 (DETAIL)
    const columnsDetail = [
        {
            header: 'NO. SP',
            accessor: 'sp_eid',
            render: (item) => <span className="font-mono font-bold text-indigo-600">{item.sp_eid || '-'}</span>
        },
        {
            header: 'TGL SP',
            accessor: 'spt_tanggal',
            render: (item) => <span className="font-mono text-slate-600">{item.spt_tanggal || '-'}</span>
        },
        {
            header: 'ASAL',
            accessor: 'agen_nama',
            render: (item) => <span className="font-bold text-slate-800 uppercase">{item.agen_nama || '-'}</span>
        },
        {
            header: 'PROPINSI TUJUAN',
            accessor: 'tujuan_propinsi',
            render: (item) => <span className="font-bold text-slate-700 uppercase">{item.tujuan_propinsi || '-'}</span>
        },
        {
            header: 'KOTA TUJUAN',
            accessor: 'bttt_tujuan_kota',
            render: (item) => <span className="font-semibold text-slate-700 uppercase">{item.bttt_tujuan_kota || '-'}</span>
        },
        {
            header: 'VIA',
            accessor: 'via_text',
            render: (item) => <span className="font-black text-indigo-900 uppercase">{item.via_text || '-'}</span>
        },
        {
            header: 'NO. BTT',
            accessor: 'sp_bttid',
            render: (item) => <span className="font-mono font-bold text-slate-800">{item.sp_bttid || '-'}</span>
        },
        {
            header: 'TGL BTT',
            accessor: 'bttt_tanggal',
            render: (item) => <span className="font-mono">{item.bttt_tanggal || '-'}</span>
        },
        {
            header: 'PENGIRIM',
            accessor: 'cust_name',
            render: (item) => <span className="font-bold text-slate-700 uppercase">{item.cust_name || '-'}</span>
        },
        {
            header: 'PENERIMA',
            accessor: 'bttt_tujuan_nama',
            render: (item) => <span className="font-bold text-slate-700 uppercase">{item.bttt_tujuan_nama || '-'}</span>
        },
        {
            header: 'COLLY',
            accessor: 'bttt_jml_unit',
            render: (item) => <span className="font-bold text-slate-800">{item.bttt_jml_unit}</span>
        },
        {
            header: 'BERAT (KG)',
            accessor: 'bttt_berat',
            render: (item) => <span className="font-mono">{item.bttt_berat}</span>
        },
        {
            header: 'VOLUME',
            accessor: 'bttt_berat_vol',
            render: (item) => <span className="font-mono">{item.bttt_berat_vol}</span>
        },
        {
            header: 'KREDIT / TUNAI',
            accessor: 'kredit_tunai',
            render: (item) => <span className="font-mono font-bold text-slate-800">Rp {item.kredit_tunai ? item.kredit_tunai.toLocaleString() : '0'}</span>
        },
        {
            header: 'TAGIH',
            accessor: 'tagih',
            render: (item) => <span className="font-mono font-bold text-amber-700">Rp {item.tagih ? item.tagih.toLocaleString() : '0'}</span>
        },
        {
            header: 'PENERUS',
            accessor: 'biaya_penerus',
            render: (item) => <span className="font-mono">Rp {item.biaya_penerus ? item.biaya_penerus.toLocaleString() : '0'}</span>
        },
        {
            header: 'TRANSIT',
            accessor: 'transit_yn',
            render: (item) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${item.transit_yn === 'Ya' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {item.transit_yn}
                </span>
            )
        },
        {
            header: 'TARIF HANDLING',
            accessor: 'tarif_desc',
            render: (item) => <span className="text-[10px] font-mono text-slate-500">{item.tarif_desc || '-'}</span>
        },
        {
            header: 'JASA HANDLING',
            accessor: 'jasa_handling',
            render: (item) => <span className="font-mono font-black text-indigo-700">Rp {item.jasa_handling ? item.jasa_handling.toLocaleString() : '0'}</span>
        },
    ];

    // DEFINISI KOLOM TIPE 2 (REKAP)
    const columnsRekap = [
        {
            header: 'CABANG / AGEN',
            accessor: 'agen_nama',
            render: (item) => <span className="font-bold text-slate-800 uppercase">{item.agen_nama || '-'}</span>
        },
        {
            header: 'JML BTT',
            accessor: 'jml_btt',
            render: (item) => <span className="font-mono font-bold text-indigo-700">{item.jml_btt || 0}</span>
        },
        {
            header: 'COLLY',
            accessor: 'colly',
            render: (item) => <span className="font-bold text-slate-800">{item.colly || 0}</span>
        },
        {
            header: 'BERAT (KG)',
            accessor: 'berat',
            render: (item) => <span className="font-mono">{item.berat || 0}</span>
        },
        {
            header: 'VOLUME',
            accessor: 'volume',
            render: (item) => <span className="font-mono">{item.volume || 0}</span>
        },
        {
            header: 'KREDIT / TUNAI',
            accessor: 'kredit_tunai',
            render: (item) => <span className="font-mono font-bold text-slate-800">Rp {item.kredit_tunai ? item.kredit_tunai.toLocaleString() : '0'}</span>
        },
        {
            header: 'TAGIH',
            accessor: 'tagih',
            render: (item) => <span className="font-mono font-bold text-amber-700">Rp {item.tagih ? item.tagih.toLocaleString() : '0'}</span>
        },
        {
            header: 'PENERUS',
            accessor: 'biaya_penerus',
            render: (item) => <span className="font-mono">Rp {item.biaya_penerus ? item.biaya_penerus.toLocaleString() : '0'}</span>
        },
        {
            header: 'JASA HANDLING',
            accessor: 'jasa_handling',
            render: (item) => <span className="font-mono font-black text-indigo-700">Rp {item.jasa_handling ? item.jasa_handling.toLocaleString() : '0'}</span>
        },
    ];

    // Filter Client Search
    const filteredData = dataList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.sp_eid && item.sp_eid.toLowerCase().includes(q)) ||
            (item.sp_bttid && item.sp_bttid.toLowerCase().includes(q)) ||
            (item.agen_nama && item.agen_nama.toLowerCase().includes(q)) ||
            (item.bttt_tujuan_kota && item.bttt_tujuan_kota.toLowerCase().includes(q)) ||
            (item.cust_name && item.cust_name.toLowerCase().includes(q))
        );
    });

    return (
        <div className="space-y-4 font-sans">
            {/* PANEL FILTER ATAS */}
            <div className="p-4 bg-white rounded-2xl shadow-xs border border-slate-200 space-y-3 text-xs font-bold text-slate-600">
                <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">PERIODE TANGGAL AWAL</label>
                        <input
                            type="date"
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 font-medium"
                            value={filterTgla}
                            onChange={e => setFilterTgla(e.target.value)}
                        />
                    </div>
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">PERIODE TANGGAL AKHIR</label>
                        <input
                            type="date"
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 font-medium"
                            value={filterTgle}
                            onChange={e => setFilterTgle(e.target.value)}
                        />
                    </div>
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">TRANSIT</label>
                        <select
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none font-medium cursor-pointer"
                            value={filterTransit}
                            onChange={e => setFilterTransit(e.target.value)}
                        >
                            <option value="SEMUA">SEMUA TRANSIT</option>
                            <option value="YA">YA (TRANSIT)</option>
                            <option value="TIDAK">TIDAK (DIRECT)</option>
                        </select>
                    </div>
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">AGEN / CABANG</label>
                        <select
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none font-medium uppercase cursor-pointer"
                            value={filterCabang}
                            onChange={e => setFilterCabang(e.target.value)}
                        >
                            <option value="SEMUA">-- SEMUA AGEN / CABANG --</option>
                            {cabangList.map((c, i) => (
                                <option key={i} value={c.agen_nama}>{c.agen_nama}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex gap-2">
                        <button
                            onClick={() => fetchReport('detail')}
                            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 font-black transition cursor-pointer text-xs uppercase ${reportType === 'detail' ? 'bg-indigo-900 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                            <FileText size={14} /> TAMPILKAN LAPORAN (TIPE 1)
                        </button>
                        <button
                            onClick={() => fetchReport('rekap')}
                            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 font-black transition cursor-pointer text-xs uppercase ${reportType === 'rekap' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                            <Layers size={14} /> TAMPILKAN TIPE 2 (REKAP)
                        </button>
                    </div>

                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 transition font-bold uppercase text-xs cursor-pointer"
                    >
                        <Printer size={14} /> PRINT LAPORAN
                    </button>
                </div>
            </div>

            {/* TABLE TEMPLATE DINAMIS */}
            <DataTableTemplate
                title={reportType === 'detail' ? `LAPORAN BARANG TURUN - ${filterCabang}` : `REKAP LAPORAN BARANG TURUN`}
                columns={reportType === 'detail' ? columnsDetail : columnsRekap}
                data={filteredData}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
            />
        </div>
    );
};

export default LaporanBarangTurun;