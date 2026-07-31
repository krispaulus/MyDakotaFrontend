import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Printer, Users, X, FileText, Building2, Calendar, FileSpreadsheet } from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

const LaporanDataPenerimaCustomer = () => {
    const { isDarkMode } = useDarkMode();
    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);

    const [customerList, setCustomerList] = useState([]);
    const [cabangList, setCabangList] = useState([]);

    // Modal Pop-Up State
    const [showModal, setShowModal] = useState(false);

    // Dates Default (Kunci dari 2017-01-01 agar data histori terbawa)
    const startDate2017 = '2017-01-01';
    const todayStr = new Date().toISOString().split('T')[0];

    // Filter States
    const [filterTgla, setFilterTgla] = useState(startDate2017);
    const [filterTgle, setFilterTgle] = useState(todayStr);
    const [filterCabang, setFilterCabang] = useState('SEMUA');
    const [filterCustId, setFilterCustId] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    // Fetch Master Data Customer & Cabang saat mount
    useEffect(() => {
        const initData = async () => {
            try {
                const token = localStorage.getItem('token');

                // Fetch Agens & Customers
                const [resAgen, resCust] = await Promise.all([
                    api.get('/agens', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
                    api.get('/customer', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
                ]);

                const agens = resAgen.data?.data || resAgen.data;
                if (Array.isArray(agens)) setCabangList(agens);

                const custs = resCust.data?.data || resCust.data;
                if (Array.isArray(custs)) setCustomerList(custs);

                // Fetch Laporan langsung dari 2017 tanpa filter cabang ketat
                fetchReport(startDate2017, todayStr, 'SEMUA', '', false);
            } catch (err) {
                console.error("Gagal inisialisasi data:", err);
                fetchReport(startDate2017, todayStr, 'SEMUA', '', false);
            }
        };

        initData();
    }, []);

    // FETCH REPORT (Kirim Parameter tgla & tgle secara Presisi)
    const fetchReport = async (tgla = filterTgla, tgle = filterTgle, cabang = filterCabang, custId = filterCustId, openPopup = true) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/laporan-data-penerima-customer', {
                params: {
                    tgla: tgla || '2017-01-01',
                    tgle: tgle || todayStr,
                    cabang: cabang || 'SEMUA',
                    cust_id: custId || ''
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data || res.data || [];
            const resultData = Array.isArray(data) ? data : [];
            setDataList(resultData);

            if (openPopup) {
                if (resultData.length === 0) {
                    Swal.fire('Data Kosong', 'Tidak ditemukan data penerima customer pada periode & filter ini.', 'info');
                } else {
                    setShowModal(true);
                }
            }
        } catch (err) {
            console.error("Gagal memuat Laporan Data Penerima Customer:", err);
            setDataList([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem saat memuat data', 'error');
        } finally {
            setLoading(false);
        }
    };

    // 📊 EXPORT TO EXCEL
    const handleExportExcel = () => {
        if (dataList.length === 0) {
            Swal.fire('Peringatan', 'Tidak ada data untuk diexport!', 'warning');
            return;
        }

        const excelData = dataList.map((item, index) => ({
            "No": index + 1,
            "Customer": item.cust_name || '-',
            "Penerima": item.bttt_tujuan_nama || '-',
            "Alamat Penerima": item.bttt_tujuan_alamat || '-',
            "PIC / User": item.bttt_update_id || '-',
            "Tanggal": item.bttt_tanggal || '-'
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Penerima Customer");
        XLSX.writeFile(workbook, `Laporan_Penerima_Customer_${filterTgla}_s/d_${filterTgle}.xlsx`);
    };

    // DEFINISI KOLOM DATA TABLE
    const columns = [
        {
            header: 'NO',
            accessor: 'no',
            render: (item) => <span className="font-mono font-bold text-slate-500">{item.no}</span>
        },
        {
            header: 'CUSTOMER',
            accessor: 'cust_name',
            render: (item) => <span className="font-bold text-slate-800 uppercase">{item.cust_name || '-'}</span>
        },
        {
            header: 'PENERIMA',
            accessor: 'bttt_tujuan_nama',
            render: (item) => <span className="font-bold text-indigo-700 uppercase">{item.bttt_tujuan_nama || '-'}</span>
        },
        {
            header: 'ALAMAT PENERIMA',
            accessor: 'bttt_tujuan_alamat',
            render: (item) => <span className="text-slate-600 uppercase text-xs truncate max-w-[250px] block">{item.bttt_tujuan_alamat || '-'}</span>
        },
        {
            header: 'PIC / USER',
            accessor: 'bttt_update_id',
            render: (item) => <span className="font-semibold text-slate-700 uppercase">{item.bttt_update_id || '-'}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'bttt_tanggal',
            render: (item) => <span className="font-mono text-slate-600">{item.bttt_tanggal || '-'}</span>
        },
    ];

    // Filter Client Search
    const filteredData = dataList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.cust_name && item.cust_name.toLowerCase().includes(q)) ||
            (item.bttt_tujuan_nama && item.bttt_tujuan_nama.toLowerCase().includes(q)) ||
            (item.bttt_tujuan_alamat && item.bttt_tujuan_alamat.toLowerCase().includes(q)) ||
            (item.bttt_update_id && item.bttt_update_id.toLowerCase().includes(q))
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
                        <label className="block mb-1 text-slate-500 uppercase">CABANG ASAL</label>
                        <select
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none font-medium uppercase cursor-pointer"
                            value={filterCabang}
                            onChange={e => setFilterCabang(e.target.value)}
                        >
                            <option value="SEMUA">-- SEMUA CABANG --</option>
                            {cabangList.map((c, i) => (
                                <option key={i} value={c.agen_nama}>{c.agen_nama}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">CUSTOMER</label>
                        <select
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none font-medium uppercase cursor-pointer"
                            value={filterCustId}
                            onChange={e => setFilterCustId(e.target.value)}
                        >
                            <option value="">-- SEMUA CUSTOMER --</option>
                            {customerList.map((c, i) => (
                                <option key={i} value={c.cust_id}>{c.cust_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* BUTTON ACTIONS */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                        onClick={() => fetchReport(filterTgla, filterTgle, filterCabang, filterCustId, true)}
                        className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg flex items-center gap-2 font-black transition cursor-pointer text-xs uppercase shadow-md"
                    >
                        <Users size={15} /> TAMPILKAN LAPORAN (POP-UP)
                    </button>

                    <div className="flex gap-2">
                        <button
                            onClick={handleExportExcel}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 transition font-bold uppercase text-xs cursor-pointer shadow-sm"
                        >
                            <FileSpreadsheet size={14} /> EXPORT TO EXCEL
                        </button>
                        <button
                            onClick={() => fetchReport(filterTgla, filterTgle, filterCabang, filterCustId, true)}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 transition font-bold uppercase text-xs cursor-pointer"
                        >
                            <Printer size={14} /> PRINT LAPORAN
                        </button>
                    </div>
                </div>
            </div>

            {/* TABLE TEMPLATE DINAMIS */}
            <DataTableTemplate
                title={`LAPORAN DATA PENERIMA CUSTOMER - ${filterCabang}`}
                columns={columns}
                data={filteredData}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
            />

            {/* MODAL POP-UP LAPORAN */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
                        {/* Header Modal Laporan */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h2 className="text-base font-black tracking-wide text-slate-800 uppercase">LAPORAN DATA PENERIMA CUSTOMER</h2>
                                    <p className="text-xs text-slate-500 font-semibold flex items-center gap-3 mt-0.5">
                                        <span className="flex items-center gap-1"><Building2 size={12} className="text-indigo-600" /> Cabang: {filterCabang}</span>
                                        <span className="flex items-center gap-1"><Calendar size={12} className="text-indigo-600" /> Periode: {filterTgla} s/d {filterTgle}</span>
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-9 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition font-bold cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body Data Grid Laporan */}
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="mb-4 text-center border-b pb-4">
                                <h1 className="text-lg font-black text-slate-900 uppercase">DAKOTA LOGISTIK INDONESIA</h1>
                                <p className="text-xs font-semibold text-slate-500">Jl. Wibawa Mukti II No. 8 Jatiasih, Bekasi KOTA | (021) 8603278</p>
                                <h3 className="text-sm font-black text-indigo-900 mt-2 uppercase border-t pt-2 inline-block">
                                    LAPORAN DATA PENERIMA CUSTOMER
                                </h3>
                                <p className="text-xs font-bold text-slate-600">Periode: {filterTgla} s/d {filterTgle}</p>
                            </div>

                            <table className="w-full text-left border-collapse text-xs font-sans">
                                <thead>
                                    <tr className="bg-indigo-900 text-white font-black uppercase tracking-wider rounded-xl">
                                        <th className="p-3.5 rounded-l-xl text-center w-12">NO</th>
                                        <th className="p-3.5">CUSTOMER</th>
                                        <th className="p-3.5">PENERIMA</th>
                                        <th className="p-3.5">ALAMAT PENERIMA</th>
                                        <th className="p-3.5">PIC / USER</th>
                                        <th className="p-3.5 rounded-r-xl">TANGGAL</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {dataList.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-10 text-slate-400 font-bold">Tidak ada data penerima customer pada filter ini.</td>
                                        </tr>
                                    ) : (
                                        dataList.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="p-3.5 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                                                <td className="p-3.5 font-bold text-slate-800 uppercase">{item.cust_name || '-'}</td>
                                                <td className="p-3.5 font-bold text-indigo-700 uppercase">{item.bttt_tujuan_nama || '-'}</td>
                                                <td className="p-3.5 text-slate-600 uppercase text-xs">{item.bttt_tujuan_alamat || '-'}</td>
                                                <td className="p-3.5 font-semibold text-slate-700 uppercase">{item.bttt_update_id || '-'}</td>
                                                <td className="p-3.5 font-mono text-slate-600">{item.bttt_tanggal || '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>

                            {/* Tanda Tangan Laporan */}
                            <div className="grid grid-cols-2 text-center mt-12 pt-6 font-bold text-slate-700 text-xs">
                                <div>
                                    <p>PEMBUAT LAPORAN</p>
                                    <div className="h-16"></div>
                                    <p>( {localStorage.getItem('username') || 'ADMIN'} )</p>
                                </div>
                                <div>
                                    <p>MENGETAHUI</p>
                                    <div className="h-16"></div>
                                    <p>( _______________________ )</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer Modal Laporan */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center px-6">
                            <span className="text-xs font-bold text-slate-500">Total Data: {dataList.length} Items</span>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleExportExcel}
                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
                                >
                                    <FileSpreadsheet size={14} /> EXPORT TO EXCEL
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
                                >
                                    <Printer size={14} /> PRINT LAPORAN
                                </button>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition text-xs uppercase tracking-wider cursor-pointer"
                                >
                                    TUTUP
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LaporanDataPenerimaCustomer;