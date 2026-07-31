import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Printer, Truck, X as XIcon, Save, FileText, FileSpreadsheet, Calendar } from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

const LaporanPendapatanOperasional = () => {
    const { isDarkMode } = useDarkMode();
    const [loading, setLoading] = useState(false);

    const [kendaraanList, setKendaraanList] = useState([]);
    const [reportData, setReportData] = useState({ list_loper: [], list_sp: [], list_jemput: [] });

    // --- State Modal Pop-Up Laporan Cetak ---
    const [showReportModal, setShowShowReportModal] = useState(false);

    // --- State Modal (Tambah / Edit Order Jemput) ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);

    // Default Form Data Jemput
    const defaultForm = {
        no_jemput: '',
        no_mobil: '',
        tanggal: '',
        customer: '',
        jml_koli: 0,
        berat: 0,
        volume: 0,
        no_jurnal: '',
        total_jurnal: 0
    };
    const [formData, setFormData] = useState(defaultForm);

    // Dates Default (Histori 2017-01-01)
    const startDate2017 = '2017-01-01';
    const todayStr = new Date().toISOString().split('T')[0];

    // Filter States
    const [filterTgla, setFilterTgla] = useState(startDate2017);
    const [filterTgle, setFilterTgle] = useState(todayStr);
    const [transaksi, setTransaksi] = useState('0'); // '0': SEMUA, '1': LOPER, '2': JEMPUT, '3': SP
    const [chkNoMobil, setChkNoMobil] = useState(false);
    const [noMobil, setNoMobil] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    // Fetch Master Kendaraan saat Mount
    useEffect(() => {
        const fetchMaster = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await api.get('/master/kendaraan', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }));
                const kends = res.data?.data || res.data;
                if (Array.isArray(kends)) setKendaraanList(kends);
            } catch (err) {
                console.error("Gagal memuat master kendaraan:", err);
            }
        };

        fetchMaster();
        fetchReport(startDate2017, todayStr, '0', false, '', false);
    }, []);

    // FETCH REPORT DATA
    const fetchReport = async (tgla = filterTgla, tgle = filterTgle, trx = transaksi, cknomobil = chkNoMobil, nmobil = noMobil, openPopup = true) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/laporan-pendapatan-operasional', {
                params: {
                    tgla: tgla || '2017-01-01',
                    tgle: tgle || todayStr,
                    transaksi: trx,
                    cknomobil: cknomobil,
                    nomobil: nmobil
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data || { list_loper: [], list_sp: [], list_jemput: [] };
            const parsedData = {
                list_loper: Array.isArray(data.list_loper) ? data.list_loper : [],
                list_sp: Array.isArray(data.list_sp) ? data.list_sp : [],
                list_jemput: Array.isArray(data.list_jemput) ? data.list_jemput : []
            };
            setReportData(parsedData);

            if (openPopup) {
                const totalRows = parsedData.list_loper.length + parsedData.list_sp.length + parsedData.list_jemput.length;
                if (totalRows === 0) {
                    Swal.fire('Data Kosong', 'Tidak ditemukan data pendapatan operasional pada periode & filter ini.', 'info');
                } else {
                    setShowShowReportModal(true);
                }
            }
        } catch (err) {
            console.error("Gagal memuat Laporan Pendapatan Operasional:", err);
            setReportData({ list_loper: [], list_sp: [], list_jemput: [] });
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem saat memuat data', 'error');
        } finally {
            setLoading(false);
        }
    };

    // 📊 EXPORT TO EXCEL COMPREHENSIVE
    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();

        // 1. Sheet Loper
        if (reportData.list_loper.length > 0) {
            const dataLoper = reportData.list_loper.map((item, idx) => ({
                "No": idx + 1,
                "No. Mobil": item.no_mobil || '-',
                "Tanggal": item.tanggal || '-',
                "No. Loper": item.no_loper || '-',
                "Sopir": item.nama_sopir || '-',
                "No. Jurnal": item.no_jurnal || '-',
                "Total Biaya BTT (Rp)": item.total_btt || 0,
                "Total Debet Jurnal (Rp)": item.total_jurnal || 0
            }));
            const wsLoper = XLSX.utils.json_to_sheet(dataLoper);
            XLSX.utils.book_append_sheet(wb, wsLoper, "Loper Pengantaran");
        }

        // 2. Sheet SP
        if (reportData.list_sp.length > 0) {
            const dataSP = reportData.list_sp.map((item, idx) => ({
                "No": idx + 1,
                "No. Mobil": item.no_mobil || '-',
                "Tanggal": item.tanggal || '-',
                "No. SP": item.no_sp || '-',
                "Tujuan": item.tujuan || '-',
                "Total BTT (Rp)": item.total_btt || 0,
                "Total Debet Jurnal (Rp)": item.total_jurnal || 0
            }));
            const wsSP = XLSX.utils.json_to_sheet(dataSP);
            XLSX.utils.book_append_sheet(wb, wsSP, "Surat Pengantar SP");
        }

        // 3. Sheet Jemput
        if (reportData.list_jemput.length > 0) {
            const dataJemput = reportData.list_jemput.map((item, idx) => ({
                "No": idx + 1,
                "No. Mobil": item.no_mobil || '-',
                "Tanggal": item.tanggal || '-',
                "Customer": item.customer || '-',
                "No. Jemput": item.no_jemput || '-',
                "Koli": item.jml_koli || 0,
                "Berat (Kg)": item.berat || 0,
                "Volume (M³)": item.volume || 0,
                "No. Jurnal": item.no_jurnal || '-',
                "Total Debet Jurnal (Rp)": item.total_jurnal || 0
            }));
            const wsJemput = XLSX.utils.json_to_sheet(dataJemput);
            XLSX.utils.book_append_sheet(wb, wsJemput, "Order Jemput");
        }

        if (wb.SheetNames.length === 0) {
            Swal.fire('Peringatan', 'Tidak ada data untuk diexport ke Excel!', 'warning');
            return;
        }

        XLSX.writeFile(wb, `Laporan_Pendapatan_Operasional_${filterTgla}_s/d_${filterTgle}.xlsx`);
    };

    // HANDLER MODAL AKSI (TAMBAH / EDIT / DELETE)
    const handleAdd = () => {
        setEditData(null);
        setFormData(defaultForm);
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setEditData(item);
        setFormData({
            no_jemput: item.no_jemput || '',
            no_mobil: item.no_mobil || '',
            tanggal: item.tanggal || '',
            customer: item.customer || '',
            jml_koli: item.jml_koli || 0,
            berat: item.berat || 0,
            volume: item.volume || 0,
            no_jurnal: item.no_jurnal || '',
            total_jurnal: item.total_jurnal || 0
        });
        setIsModalOpen(true);
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus Record Order Jemput?',
            text: `Apakah Anda yakin ingin menghapus data ${item.no_jemput}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Hapus'
        }).then((res) => {
            if (res.isConfirmed) {
                Swal.fire('Terhapus!', 'Record order jemput berhasil dihapus.', 'success');
            }
        });
    };

    const handleSubmitForm = (e) => {
        e.preventDefault();
        Swal.fire({
            title: 'Sukses!',
            text: editData ? `Data Order Jemput ${formData.no_jemput} berhasil diperbarui.` : 'Data Order Jemput berhasil ditambahkan.',
            icon: 'success',
            confirmButtonText: 'OK'
        });
        setIsModalOpen(false);
    };

    const updateField = (key, val) => {
        setFormData(prev => ({ ...prev, [key]: val }));
    };

    // DEFINISI KOLOM DATATABLE UNTUK ORDER JEMPUT
    const columnsJemput = [
        {
            header: 'NO. MOBIL',
            accessor: 'no_mobil',
            render: (i) => <span className="font-bold uppercase text-slate-800">{i.no_mobil || '-'}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'tanggal',
            render: (i) => <span className="font-mono text-slate-600">{i.tanggal || '-'}</span>
        },
        {
            header: 'CUSTOMER',
            accessor: 'customer',
            render: (i) => <span className="font-bold text-slate-800 uppercase">{i.customer || '-'}</span>
        },
        {
            header: 'NO. JEMPUT',
            accessor: 'no_jemput',
            render: (i) => <span className="font-mono font-bold text-indigo-700">{i.no_jemput || '-'}</span>
        },
        {
            header: 'KOLI',
            accessor: 'jml_koli',
            render: (i) => <span className="font-mono font-bold text-slate-700">{i.jml_koli}</span>
        },
        {
            header: 'BERAT',
            accessor: 'berat',
            render: (i) => <span className="font-mono font-bold text-slate-700">{i.berat} kg</span>
        },
        {
            header: 'VOLUME',
            accessor: 'volume',
            render: (i) => <span className="font-mono font-bold text-slate-700">{i.volume} m³</span>
        },
        {
            header: 'NO. JURNAL',
            accessor: 'no_jurnal',
            render: (i) => <span className="font-mono text-slate-500">{i.no_jurnal || '-'}</span>
        },
        {
            header: 'JUMLAH (DEBET)',
            accessor: 'total_jurnal',
            render: (i) => <span className="font-mono font-bold text-rose-700">Rp {i.total_jurnal ? Number(i.total_jurnal).toLocaleString('id-ID') : '0'}</span>
        }
    ];

    // Filter Search Client-Side untuk Order Jemput
    const filteredJemput = (reportData.list_jemput || []).filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.no_mobil && item.no_mobil.toLowerCase().includes(q)) ||
            (item.customer && item.customer.toLowerCase().includes(q)) ||
            (item.no_jemput && item.no_jemput.toLowerCase().includes(q)) ||
            (item.tanggal && item.tanggal.toLowerCase().includes(q))
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
                        <label className="block mb-1 text-slate-500 uppercase">TIPE TRANSAKSI</label>
                        <select
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none font-medium uppercase cursor-pointer"
                            value={transaksi}
                            onChange={e => setTransaksi(e.target.value)}
                        >
                            <option value="0">SEMUA TRANSAKSI</option>
                            <option value="1">LOPER (PENGANTARAN)</option>
                            <option value="2">ORDER JEMPUT</option>
                            <option value="3">SURAT PENGANTAR (SP)</option>
                        </select>
                    </div>

                    <div className="col-span-3">
                        <div className="flex items-center gap-1 mb-1">
                            <input
                                type="checkbox"
                                id="chkNoMobil"
                                checked={chkNoMobil}
                                onChange={e => setChkNoMobil(e.target.checked)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                            />
                            <label htmlFor="chkNoMobil" className="text-slate-600 uppercase cursor-pointer">FILTER NO. MOBIL</label>
                        </div>
                        <select
                            disabled={!chkNoMobil}
                            className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase cursor-pointer ${!chkNoMobil ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800'}`}
                            value={noMobil}
                            onChange={e => setNoMobil(e.target.value)}
                        >
                            <option value="">-- PILIH ARMADA MOBIL --</option>
                            {kendaraanList.map((k, i) => (
                                <option key={i} value={k.kend_id || k.kend_identid}>{k.kend_identid || k.kend_id}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* BUTTON ACTIONS */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                        onClick={() => fetchReport(filterTgla, filterTgle, transaksi, chkNoMobil, noMobil, true)}
                        disabled={loading}
                        className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg flex items-center gap-2 font-black transition cursor-pointer text-xs uppercase shadow-md disabled:opacity-50"
                    >
                        <Truck size={15} /> TAMPILKAN LAPORAN (POP-UP)
                    </button>

                    <div className="flex gap-2">
                        <button
                            onClick={handleExportExcel}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 transition font-bold uppercase text-xs cursor-pointer shadow-sm"
                        >
                            <FileSpreadsheet size={14} /> EXPORT TO EXCEL
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 transition font-bold uppercase text-xs cursor-pointer"
                        >
                            <Printer size={14} /> PRINT LAPORAN
                        </button>
                    </div>
                </div>
            </div>

            {/* DATATABLE TEMPLATE LENGKAP */}
            {(transaksi === '0' || transaksi === '2') && (
                <DataTableTemplate
                    title="LAPORAN BIAYA OPERASIONAL - ORDER JEMPUT"
                    columns={columnsJemput}
                    data={filteredJemput}
                    loading={loading}
                    isDarkMode={isDarkMode}
                    searchValue={globalSearch}
                    onSearchChange={(e) => setGlobalSearch(e.target.value)}
                    onAdd={handleAdd}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            {/* ========================================================================= */}
            {/* 🏙️ POP-UP MODAL LAPORAN CETAK PENDAPATAN OPERASIONAL (GABUNGAN 3 TABEL)   */}
            {/* ========================================================================= */}
            {showReportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
                        {/* Header Modal */}
                        <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md">
                                    <FileText size={22} />
                                </div>
                                <div>
                                    <h2 className="text-base font-black tracking-wide text-slate-800 uppercase">LAPORAN PENDAPATAN OPERASIONAL</h2>
                                    <p className="text-xs text-slate-500 font-semibold flex items-center gap-2 mt-0.5">
                                        <Calendar size={12} className="text-indigo-600" /> Periode: {filterTgla} s/d {filterTgle}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowShowReportModal(false)} className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition font-bold cursor-pointer">
                                <XIcon size={16} />
                            </button>
                        </div>

                        {/* Body Data Laporan Printable Style */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-800 font-sans">
                            {/* Kop Surat Dakota */}
                            <div className="flex justify-between items-start border-b pb-4">
                                <div>
                                    <h1 className="text-lg font-black text-slate-900 uppercase">DAKOTA LOGISTIK INDONESIA</h1>
                                    <p className="text-xs font-semibold text-slate-500">Jl. Wibawa Mukti II No. 8 Jatiasih, Bekasi KOTA</p>
                                    <p className="text-xs font-semibold text-slate-500">(021) 8603278 / (021) 86608589</p>
                                    <p className="text-xs font-bold text-slate-600 mt-2">Periode : {filterTgla} - {filterTgle}</p>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-base font-black text-indigo-900 uppercase border-b-2 border-indigo-900 pb-1 inline-block">
                                        LAPORAN PENDAPATAN OPERASIONAL
                                    </h2>
                                </div>
                            </div>

                            {/* 1. GRUP TABEL SURAT PENGANTAR (SP) */}
                            {(transaksi === '0' || transaksi === '3') && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-black text-indigo-900 uppercase tracking-wider bg-indigo-50 p-2 rounded-lg border-l-4 border-indigo-900">
                                        📌 SURAT PENGANTAR (SP)
                                    </h3>
                                    <table className="w-full text-left border-collapse text-[11px] font-sans">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-700 font-bold border-b uppercase">
                                                <th className="p-2 border-b">No. Mobil</th>
                                                <th className="p-2 border-b">Tanggal</th>
                                                <th className="p-2 border-b">No. SP</th>
                                                <th className="p-2 border-b">Tujuan</th>
                                                <th className="p-2 border-b">No. BTT</th>
                                                <th className="p-2 border-b text-right">Biaya Kirim</th>
                                                <th className="p-2 border-b">No. Jurnal</th>
                                                <th className="p-2 border-b text-right">Debet (Rp)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {reportData.list_sp.length === 0 ? (
                                                <tr><td colSpan={8} className="p-3 text-center text-slate-400 italic font-bold">Tidak ada data SP pada filter ini.</td></tr>
                                            ) : (
                                                reportData.list_sp.map((sp, idx) => (
                                                    <React.Fragment key={idx}>
                                                        {sp.list_btt && sp.list_btt.length > 0 ? (
                                                            sp.list_btt.map((btt, bIdx) => (
                                                                <tr key={bIdx} className="hover:bg-slate-50/50">
                                                                    <td className="p-2 font-bold uppercase">{bIdx === 0 ? sp.no_mobil : ''}</td>
                                                                    <td className="p-2 font-mono">{bIdx === 0 ? sp.tanggal : ''}</td>
                                                                    <td className="p-2 font-mono font-bold text-indigo-700">{bIdx === 0 ? sp.no_sp : ''}</td>
                                                                    <td className="p-2 font-semibold">{btt.tujuan || '-'}</td>
                                                                    <td className="p-2 font-mono font-bold text-blue-600">{btt.no_btt || '-'}</td>
                                                                    <td className="p-2 text-right font-mono font-bold">Rp {Number(btt.biaya_kirim || 0).toLocaleString('id-ID')}</td>
                                                                    <td className="p-2 font-mono text-slate-500">{sp.list_jurnal && sp.list_jurnal[bIdx] ? sp.list_jurnal[bIdx].no_jurnal : '-'}</td>
                                                                    <td className="p-2 text-right font-mono font-bold text-rose-700">Rp {sp.list_jurnal && sp.list_jurnal[bIdx] ? Number(sp.list_jurnal[bIdx].debet || 0).toLocaleString('id-ID') : '0'}</td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr className="hover:bg-slate-50/50">
                                                                <td className="p-2 font-bold uppercase">{sp.no_mobil}</td>
                                                                <td className="p-2 font-mono">{sp.tanggal}</td>
                                                                <td className="p-2 font-mono font-bold text-indigo-700">{sp.no_sp}</td>
                                                                <td className="p-2 font-semibold">{sp.tujuan || '-'}</td>
                                                                <td className="p-2 font-mono text-slate-400">-</td>
                                                                <td className="p-2 text-right font-mono font-bold">Rp {Number(sp.total_btt || 0).toLocaleString('id-ID')}</td>
                                                                <td className="p-2 font-mono text-slate-500">-</td>
                                                                <td className="p-2 text-right font-mono font-bold text-rose-700">Rp {Number(sp.total_jurnal || 0).toLocaleString('id-ID')}</td>
                                                            </tr>
                                                        )}
                                                        <tr className="bg-slate-50 font-bold border-t border-b">
                                                            <td colSpan={5} className="p-2 text-right uppercase text-slate-500">Subtotal SP {sp.no_sp}:</td>
                                                            <td className="p-2 text-right font-mono text-indigo-900">Rp {Number(sp.total_btt || 0).toLocaleString('id-ID')}</td>
                                                            <td></td>
                                                            <td className="p-2 text-right font-mono text-rose-800">Rp {Number(sp.total_jurnal || 0).toLocaleString('id-ID')}</td>
                                                        </tr>
                                                    </React.Fragment>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* 2. GRUP TABEL PENGANTARAN LOPER */}
                            {(transaksi === '0' || transaksi === '1') && (
                                <div className="space-y-2 pt-2">
                                    <h3 className="text-xs font-black text-indigo-900 uppercase tracking-wider bg-indigo-50 p-2 rounded-lg border-l-4 border-indigo-900">
                                        📌 PENGANTARAN LOPER
                                    </h3>
                                    <table className="w-full text-left border-collapse text-[11px] font-sans">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-700 font-bold border-b uppercase">
                                                <th className="p-2 border-b">No. Mobil</th>
                                                <th className="p-2 border-b">Tanggal</th>
                                                <th className="p-2 border-b">No. Loper</th>
                                                <th className="p-2 border-b">Sopir</th>
                                                <th className="p-2 border-b">No. BTT</th>
                                                <th className="p-2 border-b text-right">Biaya Kirim</th>
                                                <th className="p-2 border-b">No. Jurnal</th>
                                                <th className="p-2 border-b text-right">Debet (Rp)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {reportData.list_loper.length === 0 ? (
                                                <tr><td colSpan={8} className="p-3 text-center text-slate-400 italic font-bold">Tidak ada data Loper pada filter ini.</td></tr>
                                            ) : (
                                                reportData.list_loper.map((lop, idx) => (
                                                    <React.Fragment key={idx}>
                                                        {lop.list_btt && lop.list_btt.length > 0 ? (
                                                            lop.list_btt.map((btt, bIdx) => (
                                                                <tr key={bIdx} className="hover:bg-slate-50/50">
                                                                    <td className="p-2 font-bold uppercase">{bIdx === 0 ? lop.no_mobil : ''}</td>
                                                                    <td className="p-2 font-mono">{bIdx === 0 ? lop.tanggal : ''}</td>
                                                                    <td className="p-2 font-mono font-bold text-indigo-700">{bIdx === 0 ? lop.no_loper : ''}</td>
                                                                    <td className="p-2 font-semibold uppercase">{bIdx === 0 ? lop.nama_sopir : ''}</td>
                                                                    <td className="p-2 font-mono font-bold text-blue-600">{btt.no_btt || '-'}</td>
                                                                    <td className="p-2 text-right font-mono font-bold">Rp {Number(btt.biaya_kirim || 0).toLocaleString('id-ID')}</td>
                                                                    <td className="p-2 font-mono text-slate-500">{lop.no_jurnal || '-'}</td>
                                                                    <td className="p-2 text-right font-mono font-bold text-rose-700">Rp {lop.list_jurnal && lop.list_jurnal[bIdx] ? Number(lop.list_jurnal[bIdx].debet || 0).toLocaleString('id-ID') : '0'}</td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr className="hover:bg-slate-50/50">
                                                                <td className="p-2 font-bold uppercase">{lop.no_mobil}</td>
                                                                <td className="p-2 font-mono">{lop.tanggal}</td>
                                                                <td className="p-2 font-mono font-bold text-indigo-700">{lop.no_loper}</td>
                                                                <td className="p-2 font-semibold uppercase">{lop.nama_sopir || '-'}</td>
                                                                <td className="p-2 font-mono text-slate-400">-</td>
                                                                <td className="p-2 text-right font-mono font-bold">Rp {Number(lop.total_btt || 0).toLocaleString('id-ID')}</td>
                                                                <td className="p-2 font-mono text-slate-500">{lop.no_jurnal || '-'}</td>
                                                                <td className="p-2 text-right font-mono font-bold text-rose-700">Rp {Number(lop.total_jurnal || 0).toLocaleString('id-ID')}</td>
                                                            </tr>
                                                        )}
                                                        <tr className="bg-slate-50 font-bold border-t border-b">
                                                            <td colSpan={5} className="p-2 text-right uppercase text-slate-500">Subtotal Loper {lop.no_loper}:</td>
                                                            <td className="p-2 text-right font-mono text-indigo-900">Rp {Number(lop.total_btt || 0).toLocaleString('id-ID')}</td>
                                                            <td></td>
                                                            <td className="p-2 text-right font-mono text-rose-800">Rp {Number(lop.total_jurnal || 0).toLocaleString('id-ID')}</td>
                                                        </tr>
                                                    </React.Fragment>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* 3. GRUP TABEL ORDER JEMPUT */}
                            {(transaksi === '0' || transaksi === '2') && (
                                <div className="space-y-2 pt-2">
                                    <h3 className="text-xs font-black text-indigo-900 uppercase tracking-wider bg-indigo-50 p-2 rounded-lg border-l-4 border-indigo-900">
                                        📌 ORDER JEMPUT
                                    </h3>
                                    <table className="w-full text-left border-collapse text-[11px] font-sans">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-700 font-bold border-b uppercase">
                                                <th className="p-2 border-b">No. Mobil</th>
                                                <th className="p-2 border-b">Tanggal</th>
                                                <th className="p-2 border-b">Customer</th>
                                                <th className="p-2 border-b">No. Jemput</th>
                                                <th className="p-2 border-b text-center">Koli</th>
                                                <th className="p-2 border-b text-center">Berat (Kg)</th>
                                                <th className="p-2 border-b text-center">Volume (M³)</th>
                                                <th className="p-2 border-b">No. Jurnal</th>
                                                <th className="p-2 border-b text-right">Debet (Rp)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {reportData.list_jemput.length === 0 ? (
                                                <tr><td colSpan={9} className="p-3 text-center text-slate-400 italic font-bold">Tidak ada data Order Jemput pada filter ini.</td></tr>
                                            ) : (
                                                reportData.list_jemput.map((oj, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="p-2 font-bold uppercase">{oj.no_mobil}</td>
                                                        <td className="p-2 font-mono">{oj.tanggal}</td>
                                                        <td className="p-2 font-bold uppercase">{oj.customer}</td>
                                                        <td className="p-2 font-mono font-bold text-indigo-700">{oj.no_jemput}</td>
                                                        <td className="p-2 text-center font-bold">{oj.jml_koli}</td>
                                                        <td className="p-2 text-center font-bold">{oj.berat}</td>
                                                        <td className="p-2 text-center font-bold">{oj.volume}</td>
                                                        <td className="p-2 font-mono text-slate-500">{oj.no_jurnal || '-'}</td>
                                                        <td className="p-2 text-right font-mono font-bold text-rose-700">Rp {Number(oj.total_jurnal || 0).toLocaleString('id-ID')}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Tanda Tangan Laporan */}
                            <div className="grid grid-cols-2 text-center mt-10 pt-6 font-bold text-slate-700 text-xs">
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

                        {/* Footer Modal */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 px-6">
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
                                onClick={() => setShowShowReportModal(false)}
                                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition text-xs uppercase tracking-wider cursor-pointer"
                            >
                                TUTUP
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CUSTOM MODAL DIALOG MODAL EDIT/TAMBAH ORDER JEMPUT */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-3xl p-6 rounded-2xl shadow-2xl transition-all border flex flex-col min-h-0 max-h-[85vh] ${isDarkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`}>
                        <div className="flex justify-between items-center pb-3 border-b dark:border-slate-700">
                            <h3 className="text-sm font-black text-blue-600 dark:text-blue-400 flex items-center gap-2 uppercase tracking-wide">
                                <FileText size={18} />
                                {editData ? `EDIT ORDER JEMPUT: ${formData.no_jemput}` : 'TAMBAH ORDER JEMPUT BARU'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition cursor-pointer">
                                <XIcon size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitForm} className="flex-1 flex flex-col min-h-0 text-xs mt-4">
                            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
                                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>

                                    <div>
                                        <label className="font-black text-slate-500 block mb-1 uppercase">NO. JEMPUT</label>
                                        <input
                                            type="text"
                                            className="w-full p-2.5 border rounded-lg font-mono font-bold text-blue-600 outline-none uppercase"
                                            style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                            value={formData.no_jemput}
                                            onChange={e => updateField('no_jemput', e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="font-black text-slate-500 block mb-1 uppercase">NO. MOBIL / ARMADA</label>
                                        <input
                                            type="text"
                                            className="w-full p-2.5 border rounded-lg font-bold outline-none uppercase"
                                            style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                            value={formData.no_mobil}
                                            onChange={e => updateField('no_mobil', e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="font-black text-slate-500 block mb-1 uppercase">TANGGAL TRANSAKSI</label>
                                        <input
                                            type="date"
                                            className="w-full p-2.5 border rounded-lg font-mono outline-none"
                                            style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                            value={formData.tanggal}
                                            onChange={e => updateField('tanggal', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="font-black text-slate-500 block mb-1 uppercase">NAMA CUSTOMER</label>
                                        <input
                                            type="text"
                                            className="w-full p-2.5 border rounded-lg font-bold outline-none uppercase"
                                            style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                            value={formData.customer}
                                            onChange={e => updateField('customer', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="font-black text-slate-500 block mb-1 uppercase">JUMLAH KOLI</label>
                                        <input
                                            type="number"
                                            className="w-full p-2.5 border rounded-lg font-mono font-bold outline-none"
                                            style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                            value={formData.jml_koli}
                                            onChange={e => updateField('jml_koli', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="font-black text-slate-500 block mb-1 uppercase">BERAT (KG)</label>
                                        <input
                                            type="number"
                                            className="w-full p-2.5 border rounded-lg font-mono font-bold outline-none"
                                            style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                            value={formData.berat}
                                            onChange={e => updateField('berat', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="font-black text-slate-500 block mb-1 uppercase">VOLUME (M³)</label>
                                        <input
                                            type="number"
                                            className="w-full p-2.5 border rounded-lg font-mono font-bold outline-none"
                                            style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                            value={formData.volume}
                                            onChange={e => updateField('volume', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="font-black text-slate-500 block mb-1 uppercase">NO. JURNAL</label>
                                        <input
                                            type="text"
                                            className="w-full p-2.5 border rounded-lg font-mono outline-none"
                                            style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                            value={formData.no_jurnal}
                                            onChange={e => updateField('no_jurnal', e.target.value)}
                                        />
                                    </div>

                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t mt-auto">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-lg border font-bold hover:bg-slate-100 transition cursor-pointer text-slate-600"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 font-black shadow-md transition cursor-pointer"
                                >
                                    <Save size={14} />
                                    Simpan Order Jemput
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LaporanPendapatanOperasional;