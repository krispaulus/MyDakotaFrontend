import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import {
    Search, CheckCircle2, Clock, X, RefreshCw, Plus, Printer,
    FileSpreadsheet, Download, AlertTriangle, LogOut, FileText
} from 'lucide-react';
import Swal from 'sweetalert2';
import { exportDataToExcel, exportDataToCSV } from '../utils/exportTableHelper';

const LaporanLSBP = () => {
    const { isDarkMode } = useDarkMode();
    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter States
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const [filterTgla, setFilterTgla] = useState(firstDay);
    const [filterTgle, setFilterTgle] = useState(lastDay);
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterNobtt, setFilterNobtt] = useState('');
    const [filterSpb, setFilterSpb] = useState('');
    const [filterNosj, setFilterNosj] = useState('');
    const [filterService, setFilterService] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    // State Suggestion Customer
    const [custSuggestions, setCustSuggestions] = useState([]);
    const [showCustSuggestions, setShowCustSuggestions] = useState(false);

    // Modal Form States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({
        id: 0,
        cust_name: 'AA - ROBERT BOSCH - DB SCH',
        nodo: '',
        tanggal_handover: today.toISOString().split('T')[0],
        tanggal_berangkat: '',
        tanggal_kendaraan_tiba: '',
        tanggal_pi_disetujui: '',
        hari_libur: 0,
        noskb: '',
        pickup_from: 'WH MARUNDA',
        keterangan: '',
        inv: false,
        grn: false,
        faktur_pajak: false,
        dokumen_lain: false,
        hari_libur_do: 0
    });

    // 1. FETCH DATA LAPORAN LSBP
    const fetchReport = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/laporan-lspb/list', {
                params: {
                    tgla: filterTgla,
                    tgle: filterTgle,
                    customer: filterCustomer,
                    nobtt: filterNobtt,
                    spb: filterSpb,
                    nosj: filterNosj,
                    service: filterService,
                    status: filterStatus,
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data;
            setDataList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Gagal memuat Laporan LSBP:", err);
            setDataList([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    // Autocomplete Customer
    useEffect(() => {
        if (!filterCustomer || filterCustomer.trim().length < 2) {
            setCustSuggestions([]);
            setShowCustSuggestions(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await api.get(`/marketing/transport-planning/suggest-customer?q=${encodeURIComponent(filterCustomer)}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCustSuggestions(res.data?.data || []);
                setShowCustSuggestions(true);
            } catch (err) {
                console.error("Gagal cari customer:", err);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [filterCustomer]);

    // Tambah & Edit Form Handlers
    const handleAdd = () => {
        setIsEditMode(false);
        setFormData({
            id: 0,
            cust_name: 'AA - ROBERT BOSCH - DB SCH',
            nodo: '',
            tanggal_handover: new Date().toISOString().split('T')[0],
            tanggal_berangkat: '',
            tanggal_kendaraan_tiba: '',
            tanggal_pi_disetujui: '',
            hari_libur: 0,
            noskb: '',
            pickup_from: 'WH MARUNDA',
            keterangan: '',
            inv: false,
            grn: false,
            faktur_pajak: false,
            dokumen_lain: false,
            hari_libur_do: 0
        });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setIsEditMode(true);
        setFormData({
            id: item.id || 0,
            cust_name: item.cust_name || 'AA - ROBERT BOSCH - DB SCH',
            nodo: item.dn_od_sj || item.nodo || '',
            tanggal_handover: item.tanggal_handover ? item.tanggal_handover.split(' ')[0] : '',
            tanggal_berangkat: item.tanggal_berangkat ? item.tanggal_berangkat.split(' ')[0] : '',
            tanggal_kendaraan_tiba: item.tanggal_kend_tiba ? item.tanggal_kend_tiba.split(' ')[0] : '',
            tanggal_pi_disetujui: item.artih_tgl_acc ? item.artih_tgl_acc.split(' ')[0] : '',
            hari_libur: item.hari_libur || 0,
            noskb: item.nomorbtt || item.noskb || '',
            pickup_from: item.pickup_from || 'WH MARUNDA',
            keterangan: item.keterangan || '',
            inv: item.inv === 'Y' || item.inv === true,
            grn: item.grn === 'Y' || item.grn === true,
            faktur_pajak: item.fp === 'Y' || item.faktur_pajak === true,
            dokumen_lain: item.dll === 'Y' || item.dokumen_lain === true,
            hari_libur_do: item.hari_libur_do || 0
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nodo.trim()) {
            return Swal.fire('Peringatan', 'DN / OD / SJ Number wajib diisi!', 'warning');
        }

        try {
            const token = localStorage.getItem('token');
            await api.post('/operasional/laporan-lspb/save', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses', `LSPB Nomor ${formData.nodo} berhasil disimpan!`, 'success');
            setIsModalOpen(false);
            fetchReport();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan LSPB', 'error');
        }
    };

    const handleDelete = (item) => {
        const nodo = item.dn_od_sj || item.nodo;
        Swal.fire({
            title: 'Hapus Data LSBP?',
            text: `Apakah Anda yakin ingin menghapus data No. DN/OD/SJ: ${nodo}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete(`/operasional/laporan-lspb/delete/${nodo}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Sukses', 'Data LSBP berhasil dihapus', 'success');
                    fetchReport();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus data', 'error');
                }
            }
        });
    };

    // 🌟 DAFTAR KOLOM YANG DITAMPILKAN (13 KOLOM TIDAK PENTING SUDAH DIELIMINASI)
    const columns = [
        {
            header: 'DN OD SJ',
            accessor: 'dn_od_sj',
            render: (r) => (
                <span
                    onClick={() => handleEdit(r)}
                    title="Klik untuk lihat / edit detail BTT"
                    className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 hover:bg-sky-100 cursor-pointer underline"
                >
                    {r.dn_od_sj || '-'}
                </span>
            )
        },
        { header: 'CUSTOMER NAME', accessor: 'cust_name', render: (r) => <span className="font-bold uppercase">{r.cust_name || '-'}</span> },
        { header: 'TANGGAL HANDOVER', accessor: 'tanggal_handover' },
        { header: 'NO. BTT', accessor: 'nomorbtt', render: (r) => <span className="font-mono font-bold">{r.nomorbtt || '-'}</span> },
        { header: 'PICKUP FROM', accessor: 'pickup_from' },
        { header: 'TUJUAN KEPADA', accessor: 'bttt_tujuannama', render: (r) => <span className="font-bold">{r.bttt_tujuannama || '-'}</span> },
        { header: 'TUJUAN KOTA', accessor: 'bttt_tujuan_kota', render: (r) => <span className="font-bold uppercase text-slate-800">{r.bttt_tujuan_kota || '-'}</span> },
        { header: 'SERV', accessor: 'serv_name', render: (r) => <span className="font-bold text-indigo-900">{r.serv_name || '-'}</span> },
        { header: 'DARAT', accessor: 'darat', align: 'center' },
        { header: 'LAUT', accessor: 'laut', align: 'center' },
        { header: 'UDARA', accessor: 'udara', align: 'center' },
        { header: 'HARI LIBUR', accessor: 'hari_libur', align: 'center' },
        { header: 'TANGGAL DITERIMA', accessor: 'tanggal_diterima' },
        { header: 'ESTIMASI TIBA', accessor: 'tanggal_sampai_harusnya' },
        { header: 'REALISASI TIBA', accessor: 'realisasi_hari', align: 'center' },
        {
            header: 'ONTIME',
            accessor: 'on_time',
            align: 'center',
            render: (r) => r.tanggal_diterima ? <span className="text-emerald-700 font-black">1</span> : '0'
        },
        { header: 'MISS', accessor: 'miss_lead_time', align: 'center' },
        { header: 'GAGAL', accessor: 'gagal', align: 'center' },
        {
            header: 'DALAM PENGIRIMAN',
            accessor: 'dalam_pengiriman',
            align: 'center',
            render: (r) => !r.tanggal_diterima ? <span className="text-amber-600 font-black">1</span> : '0'
        },
        { header: 'NAMA PENERIMA', accessor: 'nama_penerima' },
        { header: 'KETERANGAN', accessor: 'keterangan' },
        { header: 'TANGGAL DOKUMEN WAJIB KEMBALI', accessor: 'tgl_dokumen_wajib_kembali' },
        { header: 'TANGGAL DOKUMEN KEMBALI', accessor: 'tb_tglkembali' },
        { header: 'HARI LIBUR PENGEMBALIAN DO', accessor: 'hari_libur_do', align: 'center' },
        { header: 'NOMOR SPB', accessor: 'spb_id' },
        { header: 'NO. KWITANSI', accessor: 'artih_nokw' },
        { header: 'NO MOBIL', accessor: 'no_mobil', render: (r) => <span className="font-mono font-bold">{r.no_mobil || '-'}</span> },
        { header: 'JUMLAH KOLI', accessor: 'bttt_jmlunit', align: 'center' },
        { header: 'BERAT VOLUME', accessor: 'bttt_beratvol', align: 'right' },
        { header: 'VOLUME', accessor: 'bttt_ukuran', align: 'right' },
        { header: 'BERAT', accessor: 'bttt_berat', align: 'right' },
        { header: 'NO SKB', accessor: 'noskb' }
    ];

    // Filter Search Box
    const filteredData = dataList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.dn_od_sj && item.dn_od_sj.toLowerCase().includes(q)) ||
            (item.cust_name && item.cust_name.toLowerCase().includes(q)) ||
            (item.nomorbtt && item.nomorbtt.toLowerCase().includes(q)) ||
            (item.bttt_tujuan_kota && item.bttt_tujuan_kota.toLowerCase().includes(q)) ||
            (item.nama_penerima && item.nama_penerima.toLowerCase().includes(q))
        );
    });

    return (
        <div className="space-y-4 font-sans">
            {/* PANEL FILTER ATAS */}
            <div className="p-4 bg-white rounded-2xl shadow-xs border border-slate-200 space-y-3 text-xs font-bold text-slate-600">
                <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">TGL HANDOVER AWAL</label>
                        <input
                            type="date"
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 font-medium"
                            value={filterTgla}
                            onChange={e => setFilterTgla(e.target.value)}
                        />
                    </div>
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">TGL HANDOVER AKHIR</label>
                        <input
                            type="date"
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 font-medium"
                            value={filterTgle}
                            onChange={e => setFilterTgle(e.target.value)}
                        />
                    </div>
                    <div className="col-span-3 relative">
                        <label className="block mb-1 text-slate-500 uppercase">NAMA CUSTOMER</label>
                        <input
                            type="text"
                            placeholder="CARI CUSTOMER..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none uppercase font-medium focus:border-indigo-500"
                            value={filterCustomer}
                            onChange={e => setFilterCustomer(e.target.value)}
                            onFocus={() => { if (custSuggestions.length > 0) setShowCustSuggestions(true); }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    setShowCustSuggestions(false);
                                    fetchReport();
                                }
                            }}
                        />

                        {/* Dropdown Suggestion */}
                        {showCustSuggestions && custSuggestions.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-indigo-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-slate-100 text-xs">
                                {custSuggestions.map((item, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            setFilterCustomer(item.cust_name);
                                            setShowCustSuggestions(false);
                                        }}
                                        className="p-2.5 hover:bg-indigo-50 cursor-pointer font-bold text-slate-700 flex justify-between items-center transition"
                                    >
                                        <span>🏢 {item.cust_name.toUpperCase()}</span>
                                        <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                                            [{item.cust_id}]
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">NO. DN / OD / SJ</label>
                        <input
                            type="text"
                            placeholder="NO. SURAT JALAN..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none uppercase font-medium"
                            value={filterNosj}
                            onChange={e => setFilterNosj(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">NO. BTT</label>
                        <input
                            type="text"
                            placeholder="NOMOR BTT..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none uppercase font-medium"
                            value={filterNobtt}
                            onChange={e => setFilterNobtt(e.target.value)}
                        />
                    </div>
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">SERVICE</label>
                        <select
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none font-medium cursor-pointer"
                            value={filterService}
                            onChange={e => setFilterService(e.target.value)}
                        >
                            <option value="">SEMUA SERVICE</option>
                            <option value="1">DARAT</option>
                            <option value="2">LAUT</option>
                            <option value="3">UDARA</option>
                        </select>
                    </div>
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">STATUS KIRIMAN</label>
                        <select
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none font-medium cursor-pointer"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="">SEMUA STATUS</option>
                            <option value="SHIPPED">SHIPPED</option>
                            <option value="DELIVERED">DELIVERED</option>
                        </select>
                    </div>
                    <div className="col-span-3 flex items-end">
                        <button
                            onClick={fetchReport}
                            className="w-full h-[42px] bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition uppercase cursor-pointer active:scale-95"
                        >
                            <Search size={14} /> CARI / REFRESH
                        </button>
                    </div>
                </div>
            </div>

            {/* 🌟 BARISAN TOMBOL FITUR PERSIS APLIKASI LAWAS GAMBAR 2 */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <button
                    type="button"
                    onClick={fetchReport}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
                >
                    <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> REFRESH
                </button>

                <button
                    type="button"
                    onClick={handleAdd}
                    className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-xl text-xs uppercase flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
                >
                    <Plus size={13} /> TAMBAH
                </button>

                <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
                >
                    <Printer size={13} /> PRINT
                </button>

                <button
                    type="button"
                    onClick={() => {
                        exportDataToExcel({
                            filename: `LSPB_With_Car_In_Out_${filterTgla}.xls`,
                            sheetName: 'LSPB Car In Out',
                            columns: columns,
                            data: filteredData
                        });
                    }}
                    className="px-4 py-2 bg-[#217346] hover:bg-[#1a5c37] text-white font-bold rounded-xl text-xs uppercase flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
                >
                    <FileSpreadsheet size={13} /> Export To Excel With Car In Out And Date Time
                </button>

                <button
                    type="button"
                    onClick={() => {
                        exportDataToExcel({
                            filename: `LSPB_With_Delivery_History_${filterTgla}.xls`,
                            sheetName: 'LSPB History',
                            columns: columns,
                            data: filteredData
                        });
                    }}
                    className="px-4 py-2 bg-[#217346] hover:bg-[#1a5c37] text-white font-bold rounded-xl text-xs uppercase flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
                >
                    <FileSpreadsheet size={13} /> Export To Excel With Delivery History
                </button>

                <button
                    type="button"
                    onClick={() => {
                        exportDataToCSV({
                            filename: `LSPB_Report_${filterTgla}.csv`,
                            columns: columns,
                            data: filteredData,
                            delimiter: ';'
                        });
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
                >
                    <Download size={13} /> GENERATE CSV
                </button>

                <button
                    type="button"
                    onClick={() => {
                        const dups = dataList.filter(d => d.is_double || (d.keterangan && d.keterangan.toLowerCase().includes('double')));
                        if (dups.length === 0) {
                            Swal.fire('Info', 'Tidak ditemukan nomor DN yang tidak sesuai atau ganda.', 'info');
                        } else {
                            setDataList(dups);
                        }
                    }}
                    className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-xl text-xs uppercase flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
                >
                    <AlertTriangle size={13} /> LSPB DN tidak sesuai/double
                </button>

                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="ml-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
                >
                    <LogOut size={13} /> KELUAR
                </button>
            </div>

            {/* TABEL DATA LENGKAP 37 KOLOM */}
            <DataTableTemplate
                title="INFORMASI & LAPORAN LSBP"
                columns={columns}
                data={filteredData}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
                onAdd={handleAdd}
                onEdit={(item) => handleEdit(item)}
                onDelete={(item) => handleDelete(item)}
            />

            {/* MODAL INPUT / EDIT LSPB */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden my-8">
                        <div className="p-4 bg-indigo-900 text-white flex items-center justify-between">
                            <h4 className="font-black text-sm uppercase tracking-wide">
                                {isEditMode ? `EDIT LSPB: ${formData.nodo}` : 'INPUT LSPB'}
                            </h4>
                            <button onClick={() => setIsModalOpen(false)} className="text-white hover:text-slate-300 cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-bold text-slate-700">
                            <div className="space-y-3 pb-3 border-b border-slate-200">
                                <div>
                                    <label className="block mb-1 text-slate-600 uppercase">NAMA CUSTOMER *</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white outline-none focus:border-indigo-600"
                                        value={formData.cust_name}
                                        onChange={e => setFormData({ ...formData, cust_name: e.target.value })}
                                    >
                                        <option value="AA - ROBERT BOSCH - DB SCH">AA - ROBERT BOSCH - DB SCH</option>
                                        <option value="PT KIMIA FARMA / CUSTOMER">PT KIMIA FARMA / CUSTOMER</option>
                                        <option value="PT MERCK CHEMICALS AND LIFE SCIENCES">PT MERCK CHEMICALS AND LIFE SCIENCES</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block mb-1 text-slate-600 uppercase">DN / OD / SJ NUMBER *</label>
                                        <input
                                            type="text"
                                            required
                                            maxLength={50}
                                            readOnly={isEditMode}
                                            className={`w-full p-2.5 border rounded-lg text-xs font-mono font-black ${isEditMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-amber-50 text-indigo-900 focus:border-indigo-600'}`}
                                            placeholder="50 CHARACTERS MAX..."
                                            value={formData.nodo}
                                            onChange={e => setFormData({ ...formData, nodo: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-slate-600 uppercase">TANGGAL HANDOVER</label>
                                        <input
                                            type="date"
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-white outline-none focus:border-indigo-600"
                                            value={formData.tanggal_handover}
                                            onChange={e => setFormData({ ...formData, tanggal_handover: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block mb-1 text-slate-600 uppercase">TANGGAL BERANGKAT</label>
                                        <input
                                            type="date"
                                            className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono bg-white outline-none focus:border-indigo-600"
                                            value={formData.tanggal_berangkat}
                                            onChange={e => setFormData({ ...formData, tanggal_berangkat: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-slate-600 uppercase">TANGGAL KENDARAAN TIBA</label>
                                        <input
                                            type="date"
                                            className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono bg-white outline-none focus:border-indigo-600"
                                            value={formData.tanggal_kendaraan_tiba}
                                            onChange={e => setFormData({ ...formData, tanggal_kendaraan_tiba: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-slate-600 uppercase">TANGGAL PI DISETUJUI</label>
                                        <input
                                            type="date"
                                            className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono bg-white outline-none focus:border-indigo-600"
                                            value={formData.tanggal_pi_disetujui}
                                            onChange={e => setFormData({ ...formData, tanggal_pi_disetujui: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pb-3 border-b border-slate-200">
                                <h5 className="font-black text-xs text-indigo-900 uppercase mb-2">INPUT HARI LIBUR</h5>
                                <div className="w-1/3">
                                    <label className="block mb-1 text-slate-600 uppercase">HARI LIBUR</label>
                                    <select
                                        className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:border-indigo-600"
                                        value={formData.hari_libur}
                                        onChange={e => setFormData({ ...formData, hari_libur: parseInt(e.target.value) })}
                                    >
                                        {[0, 1, 2, 3, 4, 5, 6, 7].map(num => (
                                            <option key={num} value={num}>{num}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3 pb-3 border-b border-slate-200">
                                <h5 className="font-black text-xs text-indigo-900 uppercase">CONSIGNMENT NOTE</h5>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block mb-1 text-slate-600 uppercase">NOMOR BTT</label>
                                        <input
                                            type="text"
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono uppercase"
                                            placeholder="NOMOR BTT..."
                                            value={formData.noskb}
                                            onChange={e => setFormData({ ...formData, noskb: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-slate-600 uppercase">PICKUP FROM</label>
                                        <input
                                            type="text"
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-xs uppercase"
                                            placeholder="LOKASI PICKUP..."
                                            value={formData.pickup_from}
                                            onChange={e => setFormData({ ...formData, pickup_from: e.target.value.toUpperCase() })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-600 uppercase">KETERANGAN</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs uppercase"
                                        placeholder="KETERANGAN TAMBAHAN..."
                                        value={formData.keterangan}
                                        onChange={e => setFormData({ ...formData, keterangan: e.target.value.toUpperCase() })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 border text-slate-600 font-bold rounded-lg uppercase cursor-pointer hover:bg-slate-100"
                                >
                                    RESET / BATAL
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg uppercase shadow-md cursor-pointer"
                                >
                                    SIMPAN
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LaporanLSBP;