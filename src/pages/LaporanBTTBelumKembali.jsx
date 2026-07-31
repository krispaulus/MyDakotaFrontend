import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Printer, Layers, FileText, UserCheck, Building } from 'lucide-react';
import Swal from 'sweetalert2';

const LaporanBTTBelumKembali = () => {
    const { isDarkMode } = useDarkMode();
    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState('detail'); // 'detail' | 'rekap_cabang' | 'rekap_pic'

    const [picList, setPicList] = useState([]);
    const [cabangList, setCabangList] = useState([]);

    // Dates
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = today.toISOString().split('T')[0];

    // Filter Checkboxes & Values
    const [filterTgla, setFilterTgla] = useState(firstDay);
    const [filterTgle, setFilterTgle] = useState(lastDay);
    const [chkPic, setChkPic] = useState(false);
    const [pic, setPic] = useState('');
    const [chkInv, setChkInv] = useState(false);
    const [inv, setInv] = useState('Y');
    const [chkAgen, setChkAgen] = useState(false);
    const [agen, setAgen] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    // Fetch Master PIC & Cabang
    useEffect(() => {
        const fetchMaster = async () => {
            try {
                const token = localStorage.getItem('token');
                const [resAgen, resPic] = await Promise.all([
                    api.get('/agens', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/customers/pic-list', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
                ]);

                const agens = resAgen.data?.data || resAgen.data;
                if (Array.isArray(agens)) {
                    setCabangList(agens);
                    if (agens.length > 0) setAgen(agens[0].agen_id);
                }

                const pics = resPic.data?.data || resPic.data;
                if (Array.isArray(pics)) setPicList(pics);
            } catch (err) {
                console.error("Gagal memuat master agen/pic:", err);
            }
        };

        fetchMaster();
    }, []);

    // FETCH REPORT DATA
    const fetchReport = async (type = reportType) => {
        setLoading(true);
        setReportType(type);
        try {
            const token = localStorage.getItem('token');
            let endpoint = '/operasional/laporan-btt-belum-kembali/detail';
            let params = {
                tgla: filterTgla,
                tgle: filterTgle,
                ckpic: chkPic,
                pic: pic,
                ckinv: chkInv,
                inv: inv,
                ckagen: chkAgen,
                agen: agen
            };

            if (type === 'rekap_cabang') {
                endpoint = '/operasional/laporan-btt-belum-kembali/rekap';
                params.group_by = 'cabang';
            } else if (type === 'rekap_pic') {
                endpoint = '/operasional/laporan-btt-belum-kembali/rekap';
                params.group_by = 'pic';
            }

            const res = await api.get(endpoint, {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data;
            setDataList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Gagal memuat Laporan BTT Belum Kembali:", err);
            setDataList([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem saat memuat data', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport('detail');
    }, []);

    // DEFINISI KOLOM DETAIL
    const columnsDetail = [
        {
            header: 'TANGGAL',
            accessor: 'bttt_tanggal',
            render: (item) => <span className="font-mono text-slate-600">{item.bttt_tanggal || '-'}</span>
        },
        {
            header: 'NO. BTT',
            accessor: 'bttt_id',
            render: (item) => <span className="font-mono font-bold text-indigo-600">{item.bttt_id || '-'}</span>
        },
        {
            header: 'NO. SURAT JALAN',
            accessor: 'bttt_nosuratjalan',
            render: (item) => <span className="font-mono font-bold text-slate-700">{item.bttt_nosuratjalan || '-'}</span>
        },
        {
            header: 'PENGIRIM',
            accessor: 'cust_name',
            render: (item) => <span className="font-bold text-slate-800 uppercase">{item.cust_name || '-'}</span>
        },
        {
            header: 'BIAYA',
            accessor: 'jharga',
            render: (item) => <span className="font-mono font-bold text-indigo-900">Rp {item.jharga ? item.jharga.toLocaleString() : '0'}</span>
        },
        {
            header: 'COLLY',
            accessor: 'bttt_jml_unit',
            render: (item) => <span className="font-bold text-slate-800">{item.bttt_jml_unit || 0}</span>
        },
        {
            header: 'BERAT (KG)',
            accessor: 'jberat',
            render: (item) => <span className="font-mono">{item.jberat || 0}</span>
        },
        {
            header: 'PENERIMA',
            accessor: 'bttt_tujuan_nama',
            render: (item) => <span className="font-bold text-slate-700 uppercase">{item.bttt_tujuan_nama || '-'}</span>
        },
        {
            header: 'KOTA TUJUAN',
            accessor: 'bttt_tujuan_kota',
            render: (item) => <span className="font-semibold text-slate-700 uppercase">{item.bttt_tujuan_kota || '-'}</span>
        },
        {
            header: 'CABANG BERWENANG',
            accessor: 'agen_nama',
            render: (item) => <span className="font-bold text-slate-800 uppercase">{item.agen_nama || '-'}</span>
        },
        {
            header: 'PIC',
            accessor: 'cust_pic',
            render: (item) => <span className="font-bold text-slate-600 uppercase">{item.cust_pic || '-'}</span>
        },
        {
            header: 'INVOICE',
            accessor: 'invoice_no',
            render: (item) => <span className="font-mono font-bold text-emerald-700">{item.invoice_no || '-'}</span>
        },
        {
            header: 'UMUR (HARI)',
            accessor: 'umur',
            render: (item) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${item.umur > 14 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                    {item.umur || 0} Hari
                </span>
            )
        },
    ];

    // DEFINISI KOLOM REKAP
    const columnsRekap = [
        {
            header: reportType === 'rekap_cabang' ? 'CABANG BERWENANG' : 'PIC CUSTOMER',
            accessor: 'group_key',
            render: (item) => <span className="font-bold text-slate-800 uppercase">{item.group_key || 'TIDAK DIKETAHUI'}</span>
        },
        {
            header: 'JUMLAH BTT',
            accessor: 'jml_btt',
            render: (item) => <span className="font-mono font-bold text-indigo-700">{item.jml_btt || 0}</span>
        },
        {
            header: 'TOTAL NOMINAL BIAYA',
            accessor: 'jharga',
            render: (item) => <span className="font-mono font-black text-emerald-700">Rp {item.jharga ? item.jharga.toLocaleString() : '0'}</span>
        },
    ];

    // Filter Client Search
    const filteredData = dataList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.bttt_id && item.bttt_id.toLowerCase().includes(q)) ||
            (item.bttt_nosuratjalan && item.bttt_nosuratjalan.toLowerCase().includes(q)) ||
            (item.cust_name && item.cust_name.toLowerCase().includes(q)) ||
            (item.agen_nama && item.agen_nama.toLowerCase().includes(q)) ||
            (item.group_key && item.group_key.toLowerCase().includes(q))
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

                    {/* FILTER BY PIC */}
                    <div className="col-span-3">
                        <div className="flex items-center gap-1 mb-1">
                            <input
                                type="checkbox"
                                id="chkPic"
                                checked={chkPic}
                                onChange={e => setChkPic(e.target.checked)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded"
                            />
                            <label htmlFor="chkPic" className="text-slate-600 uppercase cursor-pointer">BY PIC</label>
                        </div>
                        <select
                            disabled={!chkPic}
                            className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium cursor-pointer ${!chkPic ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800'}`}
                            value={pic}
                            onChange={e => setPic(e.target.value)}
                        >
                            <option value="">-- PILIH PIC --</option>
                            {picList.map((p, i) => (
                                <option key={i} value={p.cust_pic}>{p.cust_pic}</option>
                            ))}
                        </select>
                    </div>

                    {/* FILTER BY INVOICE */}
                    <div className="col-span-3">
                        <div className="flex items-center gap-1 mb-1">
                            <input
                                type="checkbox"
                                id="chkInv"
                                checked={chkInv}
                                onChange={e => setChkInv(e.target.checked)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded"
                            />
                            <label htmlFor="chkInv" className="text-slate-600 uppercase cursor-pointer">BY STATUS INVOICE</label>
                        </div>
                        <select
                            disabled={!chkInv}
                            className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium cursor-pointer ${!chkInv ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800'}`}
                            value={inv}
                            onChange={e => setInv(e.target.value)}
                        >
                            <option value="Y">SUDAH INVOICE</option>
                            <option value="N">BELUM INVOICE</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-3 pt-1">
                    {/* FILTER BY CABANG BERWENANG */}
                    <div className="col-span-6">
                        <div className="flex items-center gap-1 mb-1">
                            <input
                                type="checkbox"
                                id="chkAgen"
                                checked={chkAgen}
                                onChange={e => setChkAgen(e.target.checked)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded"
                            />
                            <label htmlFor="chkAgen" className="text-slate-600 uppercase cursor-pointer">BY CABANG BERWENANG</label>
                        </div>
                        <select
                            disabled={!chkAgen}
                            className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase cursor-pointer ${!chkAgen ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800'}`}
                            value={agen}
                            onChange={e => setAgen(e.target.value)}
                        >
                            {cabangList.map((c, i) => (
                                <option key={i} value={c.agen_id}>{c.agen_nama}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* BUTTON ACTIONS */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex gap-2">
                        <button
                            onClick={() => fetchReport('detail')}
                            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 font-black transition cursor-pointer text-xs uppercase ${reportType === 'detail' ? 'bg-indigo-900 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                            <FileText size={14} /> TAMPILKAN LAPORAN (DETAIL)
                        </button>
                        <button
                            onClick={() => fetchReport('rekap_cabang')}
                            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 font-black transition cursor-pointer text-xs uppercase ${reportType === 'rekap_cabang' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                            <Building size={14} /> REKAP BY CABANG
                        </button>
                        <button
                            onClick={() => fetchReport('rekap_pic')}
                            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 font-black transition cursor-pointer text-xs uppercase ${reportType === 'rekap_pic' ? 'bg-emerald-700 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                            <UserCheck size={14} /> REKAP BY PIC
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
                title={
                    reportType === 'detail'
                        ? 'LAPORAN BTT BELUM KEMBALI (DETAIL)'
                        : reportType === 'rekap_cabang'
                            ? 'REKAP BTT BELUM KEMBALI BY CABANG BERWENANG'
                            : 'REKAP BTT BELUM KEMBALI BY PIC CUSTOMER'
                }
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

export default LaporanBTTBelumKembali;