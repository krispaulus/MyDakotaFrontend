import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import {
    Search, X, RefreshCw, Plus, Printer,
    FileSpreadsheet, Download, AlertTriangle, LogOut,
    Truck, PackageCheck, FileCheck2, ClipboardList, UserCheck
} from 'lucide-react';
import Swal from 'sweetalert2';
import { exportDataToExcel, exportDataToCSV } from '../utils/exportTableHelper';

// Helper normalisasi format tanggal dari berbagai format DB (MM/DD/YYYY atau YYYY-MM-DD) ke YYYY-MM-DD
const normalizeDateForInput = (rawDate) => {
    if (!rawDate) return '';
    const str = String(rawDate).trim().split(' ')[0];
    if (!str || str === '-' || str === 'null') return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
            const [m, d, y] = parts;
            if (y.length === 4) {
                return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
        }
    }
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
    }
    return '';
};

const LaporanLSPB = () => {
    const { isDarkMode } = useDarkMode();
    const [dataList, setDataList] = useState([]);
    const [customerList, setCustomerList] = useState([]);
    const [loading, setLoading] = useState(false);

    const currentUsername = (
        localStorage.getItem('user_nama') ||
        localStorage.getItem('username') ||
        'ADMIN'
    ).toUpperCase();

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

    // State Suggestion Customer Filter
    const [custSuggestions, setCustSuggestions] = useState([]);
    const [showCustSuggestions, setShowCustSuggestions] = useState(false);

    // Modal Form States (Lengkap sesuai form ASP lawas)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        is_edit: false,
        original_nodo: '',
        original_nobtt: '',
        customer_id: '',
        cust_name: '',
        nodo: '',
        tanggal_handover: today.toISOString().split('T')[0],
        noskb: '',
        pickup_from: 'WH MARUNDA',
        keterangan: '',
        tanggal_berangkat: '',
        tanggal_kendaraan_tiba: '',
        tanggal_pi_disetujui: '',
        hari_libur: 0,
        tanggal_diterima: '',
        nama_penerima: '',
        inv: false,
        grn: false,
        faktur_pajak: false,
        dokumen_lain: false
    });

    // 1. FETCH DATA LAPORAN LSPB & MASTER CUSTOMER
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
            console.error("Gagal memuat Laporan LSPB:", err);
            setDataList([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/laporan-lspb/customers', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (Array.isArray(res.data?.data)) {
                setCustomerList(res.data.data);
            }
        } catch (err) {
            console.warn("Gagal memuat master customer LSPB:", err);
        }
    };

    useEffect(() => {
        fetchReport();
        fetchCustomers();
    }, []);

    // Autocomplete Customer di Filter Atas
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

    // Tambah Form Handler
    const handleAdd = () => {
        setIsEditMode(false);
        setFormData({
            is_edit: false,
            original_nodo: '',
            original_nobtt: '',
            customer_id: customerList[0]?.cust_id || '',
            cust_name: customerList[0]?.cust_name || 'PT. MERCK CHEMICALS AND LIFE SCIENCES',
            nodo: '',
            tanggal_handover: new Date().toISOString().split('T')[0],
            noskb: '',
            pickup_from: 'WH MARUNDA',
            keterangan: '',
            tanggal_berangkat: new Date().toISOString().split('T')[0],
            tanggal_kendaraan_tiba: '',
            tanggal_pi_disetujui: '',
            hari_libur: 0,
            tanggal_diterima: '',
            nama_penerima: '',
            inv: false,
            grn: false,
            faktur_pajak: false,
            dokumen_lain: false
        });
        setIsModalOpen(true);
    };

    // Edit Form Handler (Mengisi seluruh field seperti web lawas)
    const handleEdit = (item) => {
        setIsEditMode(true);
        const nodoVal = (item.dn_od_sj || item.nodo || '').trim();
        const bttVal = (item.nomorbtt || item.noskb || '').trim();

        setFormData({
            is_edit: true,
            original_nodo: nodoVal,
            original_nobtt: bttVal,
            customer_id: item.customer_id || '',
            cust_name: (item.cust_name || '').trim(),
            nodo: nodoVal,
            tanggal_handover: normalizeDateForInput(item.tanggal_handover),
            noskb: bttVal,
            pickup_from: (item.pickup_from || 'WH MARUNDA').trim(),
            keterangan: item.keterangan && item.keterangan !== '-' ? item.keterangan : '',
            tanggal_berangkat: normalizeDateForInput(item.tanggal_berangkat),
            tanggal_kendaraan_tiba: normalizeDateForInput(item.tanggal_kendaraan_tiba),
            tanggal_pi_disetujui: normalizeDateForInput(item.artih_tgl_acc),
            hari_libur: parseInt(item.hari_libur, 10) || 0,
            tanggal_diterima: normalizeDateForInput(item.tanggal_diterima),
            nama_penerima: item.nama_penerima && item.nama_penerima !== '-' ? item.nama_penerima : '',
            inv: item.inv === 'Y' || item.inv === true,
            grn: item.grn === 'Y' || item.grn === true,
            faktur_pajak: item.fp === 'Y' || item.faktur_pajak === true,
            dokumen_lain: item.dll === 'Y' || item.dokumen_lain === true
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nodo.trim()) {
            return Swal.fire({
                icon: 'warning',
                title: 'Peringatan',
                text: 'DN / OD / SJ Number wajib diisi!',
                customClass: { container: 'z-[999999]' }
            });
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await api.post('/operasional/laporan-lspb/save', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setIsModalOpen(false);
            Swal.fire({
                icon: 'success',
                title: 'Berhasil Disimpan!',
                text: `Data LSPB Nomor ${formData.nodo} berhasil diperbarui.`,
                confirmButtonColor: '#1e1b4b',
                customClass: { container: 'z-[999999]' }
            });
            fetchReport();
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Gagal Menyimpan',
                text: err.response?.data?.message || 'Gagal menyimpan LSPB',
                customClass: { container: 'z-[999999]' }
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (item) => {
        const nodo = item.dn_od_sj || item.nodo;
        Swal.fire({
            title: 'Hapus Data LSPB?',
            text: `Apakah Anda yakin ingin menghapus data No. DN/OD/SJ: ${nodo}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete(`/operasional/laporan-lspb/delete/${encodeURIComponent(nodo)}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Sukses', 'Data LSPB berhasil dihapus', 'success');
                    fetchReport();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus data', 'error');
                }
            }
        });
    };

    const columns = [
        {
            header: 'DN OD SJ',
            accessor: 'dn_od_sj',
            render: (r) => (
                <span
                    onClick={() => handleEdit(r)}
                    title="Klik untuk edit detail LSPB"
                    className="font-mono font-bold text-white bg-sky-600 hover:bg-sky-700 px-2.5 py-1 rounded-md shadow-2xs cursor-pointer inline-block transition"
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
            render: (r) => Number(r.on_time) === 1 ? <span className="text-emerald-700 font-black">1</span> : '0'
        },
        {
            header: 'MISS',
            accessor: 'miss_lead_time',
            align: 'center',
            render: (r) => Number(r.miss_lead_time) === 1 ? <span className="text-rose-600 font-black">1</span> : '0'
        },
        {
            header: 'GAGAL',
            accessor: 'gagal',
            align: 'center',
            render: (r) => Number(r.gagal) === 1 ? <span className="text-rose-700 font-black">1</span> : '0'
        },
        {
            header: 'DALAM PENGIRIMAN',
            accessor: 'dalam_pengiriman',
            align: 'center',
            render: (r) => Number(r.dalam_pengiriman) === 1 ? <span className="text-amber-600 font-black">1</span> : '0'
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
                    {/* <div className="col-span-3 flex items-end">
                        <button
                            onClick={fetchReport}
                            className="w-full h-[42px] bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition uppercase cursor-pointer active:scale-95"
                        >
                            <Search size={14} /> CARI / REFRESH
                        </button>
                    </div> */}
                </div>
            </div>

            {/* BARISAN TOMBOL FITUR */}
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

            {/* TABEL DATA */}
            <DataTableTemplate
                title="INFORMASI & LAPORAN LSPB"
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

            {/* MODAL INPUT / EDIT LSPB (DESIGN MODERN WEB BARU + SUSUNAN KOLOM & FUNCTION WEB LAWAS) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden my-6 max-h-[92vh]">
                        {/* HEADER UNGU MODERN */}
                        <div className="p-4 bg-indigo-900 text-white flex items-center justify-between shrink-0">
                            <h4 className="font-black text-sm uppercase tracking-wide">
                                {isEditMode ? `EDIT LSPB: ${formData.original_nodo}` : 'INPUT LSPB'}
                            </h4>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="text-white hover:text-slate-300 cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs font-bold text-slate-700">
                            {/* 1. IDENTITAS CUSTOMER, DN/OD/SJ & TANGGAL HANDOVER */}
                            <div className="space-y-3 pb-3 border-b border-slate-200">
                                <div>
                                    <label className="block mb-1 text-slate-600 uppercase">NAMA CUSTOMER *</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white outline-none focus:border-indigo-600"
                                        value={formData.cust_name}
                                        onChange={e => {
                                            const selectedName = e.target.value;
                                            const found = customerList.find(c => c.cust_name === selectedName);
                                            setFormData({
                                                ...formData,
                                                cust_name: selectedName,
                                                customer_id: found ? found.cust_id : formData.customer_id
                                            });
                                        }}
                                    >
                                        {formData.cust_name && !customerList.some(c => c.cust_name === formData.cust_name) && (
                                            <option value={formData.cust_name}>{formData.cust_name}</option>
                                        )}
                                        {customerList.map((cust, idx) => (
                                            <option key={idx} value={cust.cust_name}>
                                                {cust.cust_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block mb-1 text-slate-600 uppercase">DN / OD / SJ NUMBER *</label>
                                        <input
                                            type="text"
                                            required
                                            maxLength={50}
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono font-black text-indigo-950 bg-white outline-none focus:border-indigo-600"
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
                            </div>

                            {/* 2. CONSIGNMENT NOTE */}
                            <div className="space-y-3 pb-3 border-b border-slate-200">
                                <h5 className="font-black text-xs text-indigo-900 uppercase">CONSIGNMENT NOTE</h5>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block mb-1 text-slate-600 uppercase">NOMOR BTT</label>
                                        <input
                                            type="text"
                                            maxLength={20}
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono uppercase bg-white outline-none focus:border-indigo-600"
                                            placeholder="NOMOR BTT..."
                                            value={formData.noskb}
                                            onChange={e => setFormData({ ...formData, noskb: e.target.value.toUpperCase() })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-slate-600 uppercase">PICKUP FROM</label>
                                        <input
                                            type="text"
                                            maxLength={150}
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-xs uppercase bg-white outline-none focus:border-indigo-600"
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
                                        maxLength={150}
                                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs uppercase bg-white outline-none focus:border-indigo-600"
                                        placeholder="KETERANGAN TAMBAHAN..."
                                        value={formData.keterangan}
                                        onChange={e => setFormData({ ...formData, keterangan: e.target.value.toUpperCase() })}
                                    />
                                </div>
                            </div>

                            {/* 3. DELIVERY INFO */}
                            <div className="space-y-3 pb-3 border-b border-slate-200">
                                <h5 className="font-black text-xs text-indigo-900 uppercase">DELIVERY INFO</h5>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block mb-1 text-slate-600 uppercase">TANGGAL BERANGKAT</label>
                                        <input
                                            type="date"
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-white outline-none focus:border-indigo-600"
                                            value={formData.tanggal_berangkat}
                                            onChange={e => setFormData({ ...formData, tanggal_berangkat: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-slate-600 uppercase">TANGGAL KENDARAAN TIBA</label>
                                        <input
                                            type="date"
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-white outline-none focus:border-indigo-600"
                                            value={formData.tanggal_kendaraan_tiba}
                                            onChange={e => setFormData({ ...formData, tanggal_kendaraan_tiba: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-slate-600 uppercase">TANGGAL PI DISETUJUI</label>
                                        <input
                                            type="date"
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-white outline-none focus:border-indigo-600"
                                            value={formData.tanggal_pi_disetujui}
                                            onChange={e => setFormData({ ...formData, tanggal_pi_disetujui: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 4. RECEIVE INFO */}
                            <div className="space-y-3 pb-3 border-b border-slate-200">
                                <h5 className="font-black text-xs text-indigo-900 uppercase">RECEIVE INFO</h5>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block mb-1 text-slate-600 uppercase">TANGGAL DITERIMA</label>
                                        <input
                                            type="date"
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-white outline-none focus:border-indigo-600"
                                            value={formData.tanggal_diterima}
                                            onChange={e => setFormData({ ...formData, tanggal_diterima: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-slate-600 uppercase">NAMA PENERIMA</label>
                                        <input
                                            type="text"
                                            maxLength={50}
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-xs uppercase bg-white outline-none focus:border-indigo-600"
                                            placeholder="Contoh: TTD..."
                                            value={formData.nama_penerima}
                                            onChange={e => setFormData({ ...formData, nama_penerima: e.target.value.toUpperCase() })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 5. INV & DO ORIGINAL/COPY INFO */}
                            <div className="space-y-2.5 pb-2">
                                <div className="flex items-center justify-between">
                                    <h5 className="font-black text-xs text-indigo-900 uppercase">
                                        INV &amp; DO ORIGINAL/COPY INFO
                                    </h5>
                                    <span className="px-3 py-1 bg-[#04AA6D] text-white text-[10px] font-black rounded-md uppercase tracking-wide">
                                        UBAH MARK Invoice &amp; DO Copy/Original
                                    </span>
                                </div>
                                <div className="grid grid-cols-4 gap-2.5 pt-1">
                                    {[
                                        { key: 'inv', label: 'INVOICE (INV)' },
                                        { key: 'grn', label: 'GRN' },
                                        { key: 'faktur_pajak', label: 'FAKTUR PAJAK' },
                                        { key: 'dokumen_lain', label: 'DO COPY / ORIG' }
                                    ].map(doc => {
                                        const active = Boolean(formData[doc.key]);
                                        return (
                                            <label
                                                key={doc.key}
                                                className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${active
                                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                                                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <span className="text-[11px] font-bold">{doc.label}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={active}
                                                    onChange={e => setFormData(prev => ({ ...prev, [doc.key]: e.target.checked }))}
                                                    className="w-4 h-4 accent-[#04AA6D] cursor-pointer"
                                                />
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* FOOTER TOMBOL + USER INPUT INFORMATION */}
                            <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-4">
                                <span className="text-[11px] font-semibold text-slate-500">
                                    User Input Information : <b className="text-indigo-900 font-mono">{currentUsername}</b>
                                </span>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-5 py-2.5 border border-slate-300 text-slate-600 font-bold rounded-lg uppercase cursor-pointer hover:bg-slate-100"
                                    >
                                        RESET / BATAL
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-6 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg uppercase shadow-md cursor-pointer disabled:opacity-60"
                                    >
                                        {saving ? 'MENYIMPAN...' : 'SIMPAN'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LaporanLSPB;