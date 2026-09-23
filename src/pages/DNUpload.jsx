import React, { useState, useEffect } from 'react';
import { UploadCloud, Calendar, RefreshCw, FileText, CheckCircle2, Building, ShieldAlert } from 'lucide-react';
import api from '../api/axios';
import Swal from 'sweetalert2';

export default function DNUpload({ isDarkMode = false }) {
    const getTanggalDefault = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const lastDay = String(new Date(y, d.getMonth() + 1, 0).getDate()).padStart(2, '0');
        return { awal: `${y}-${m}-01`, akhir: `${y}-${m}-${lastDay}` };
    };

    const defTgl = getTanggalDefault();

    const [customerList, setCustomerList] = useState([]);
    const [selectedCust, setSelectedCust] = useState('');
    const [fileCSV, setFileCSV] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Filter Antrean Belum Masuk LSPB
    const [chkTgl, setChkTgl] = useState(false);
    const [tglStart, setTglStart] = useState(defTgl.awal);
    const [tglEnd, setTglEnd] = useState(defTgl.akhir);
    const [tableData, setTableData] = useState([]);
    const [loadingTable, setLoadingTable] = useState(false);

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await api.get('/customer', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCustomerList(res.data?.data || []);
            } catch (err) {
                console.error("Gagal load customer:", err);
            }
        };
        fetchCustomers();
        fetchOutstanding();
    }, []);

    const fetchOutstanding = async () => {
        setLoadingTable(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/marketing/dn-upload/outstanding', {
                params: {
                    customer_id: selectedCust,
                    tgl_awal: tglStart,
                    tgl_akhir: tglEnd,
                    chk_tgl: chkTgl
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setTableData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load DN belum masuk LSPB:", err);
            setTableData([]);
        } finally {
            setLoadingTable(false);
        }
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCust) {
            Swal.fire("Perhatian", "Pilih customer terlebih dahulu!", "warning");
            return;
        }
        if (!fileCSV) {
            Swal.fire("Perhatian", "Pilih berkas CSV terlebih dahulu!", "warning");
            return;
        }

        setUploading(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('customer_id', selectedCust);
            formData.append('file', fileCSV);

            const res = await api.post('/marketing/dn-upload/upload', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            Swal.fire({
                icon: 'success',
                title: 'Upload Berhasil!',
                text: res.data?.message || 'Data DN/OJ berhasil diunggah.',
                confirmButtonColor: '#10b981'
            });

            setFileCSV(null);
            fetchOutstanding();
        } catch (err) {
            Swal.fire("Gagal", err.response?.data?.message || "Gagal mengunggah berkas", "error");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={`p-6 min-h-screen space-y-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-[#f8fafc] text-slate-800'}`}>
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500 text-slate-900 rounded-xl shadow-md">
                    <FileText size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-black tracking-wide uppercase">Upload DN / OJ</h1>
                    <p className="text-xs text-slate-400">Import Delivery Note / Order Jemput dan monitoring dokumen belum masuk LSPB</p>
                </div>
            </div>

            {/* Bagian 1: Form Upload CSV */}
            <form onSubmit={handleUploadSubmit} className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-5">
                <div className="text-xs font-black text-amber-600 uppercase tracking-widest border-b pb-2.5">
                    UPLOAD FILE CSV
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-bold">
                    <div>
                        <label className="text-slate-600 uppercase block mb-1.5">
                            Pilih Customer : <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={selectedCust}
                            onChange={(e) => setSelectedCust(e.target.value)}
                            required
                            className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-amber-500 bg-white font-bold text-slate-700 uppercase"
                        >
                            <option value="">-- PILIH CUSTOMER --</option>
                            {customerList.map((c) => (
                                <option key={c.cust_id} value={c.cust_id}>
                                    {c.cust_name.toUpperCase()} ({c.cust_id})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-slate-600 uppercase block mb-1.5">
                            Pilih Berkas CSV : <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="file"
                            accept=".csv"
                            required
                            onChange={(e) => setFileCSV(e.target.files[0] || null)}
                            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200 cursor-pointer border border-slate-200 rounded-xl p-2"
                        />
                    </div>
                </div>

                {/* Contoh Format CSV Sesuai Sistem Lawas */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                    <span className="font-bold text-slate-700 uppercase">Contoh Format CSV (Separator Titik Koma ;) :</span>
                    <div className="overflow-x-auto font-mono text-[11px]">
                        <table className="w-full text-left bg-white border border-slate-200">
                            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                                <tr>
                                    <th className="p-2 border-r">DN No#;</th>
                                    <th className="p-2 border-r">OUT ID#;</th>
                                    <th className="p-2 border-r">TANGGALHANDOVER;</th>
                                    <th className="p-2 border-r">consignee;</th>
                                    <th className="p-2 border-r">addrees;</th>
                                    <th className="p-2">Mark Transport Planning;</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-700">
                                <tr>
                                    <td className="p-2 border-r">6370321018;</td>
                                    <td className="p-2 border-r">bolehDikosongkan;</td>
                                    <td className="p-2 border-r">05/30/2026;</td>
                                    <td className="p-2 border-r">CV. MITRA MEGAH MANDIRI;</td>
                                    <td className="p-2 border-r">KOMPLEKS PERGUDANGAN INDOSERENA;</td>
                                    <td className="p-2">Yes/Y/E-Invoice/NO/N/Blank;</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                        type="submit"
                        disabled={uploading}
                        className="px-6 h-11 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black rounded-xl shadow-md text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition"
                    >
                        {uploading ? <RefreshCw size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                        {uploading ? "Sedang Proses Data..." : "UPLOAD"}
                    </button>
                </div>
            </form>

            {/* Bagian 2: Monitoring Antrean DN Belum Masuk LSPB */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
                <div className="flex flex-wrap justify-between items-center pb-3 border-b border-slate-100 gap-4">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                        DAFTAR DN/OJ BELUM MASUK LSPB ({tableData.length} Baris)
                    </span>

                    {/* Filter Rentang Tanggal */}
                    <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                            <input
                                type="checkbox"
                                checked={chkTgl}
                                onChange={(e) => setChkTgl(e.target.checked)}
                                className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                            />
                            <span>Tanggal Handover</span>
                        </label>

                        <input
                            type="date"
                            disabled={!chkTgl}
                            value={tglStart}
                            onChange={(e) => setTglStart(e.target.value)}
                            className="h-9 px-2 border border-slate-200 rounded-lg outline-none focus:border-amber-500 disabled:bg-slate-100"
                        />
                        <span className="text-slate-400">Sampai</span>
                        <input
                            type="date"
                            disabled={!chkTgl}
                            value={tglEnd}
                            onChange={(e) => setTglEnd(e.target.value)}
                            className="h-9 px-2 border border-slate-200 rounded-lg outline-none focus:border-amber-500 disabled:bg-slate-100"
                        />

                        <button
                            type="button"
                            onClick={fetchOutstanding}
                            className="px-4 h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition shadow-sm"
                        >
                            <RefreshCw size={13} className={loadingTable ? "animate-spin" : ""} /> REFRESH
                        </button>
                    </div>
                </div>

                {/* Tabel Rekonsiliasi */}
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                    {loadingTable ? (
                        <div className="p-8 text-center text-xs text-slate-400">Memuat antrean DN/OJ...</div>
                    ) : tableData.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400">
                            Tidak ada dokumen DN/OJ yang berstatus belum masuk LSPB.
                        </div>
                    ) : (
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase sticky top-0">
                                <tr>
                                    <th className="p-3">Cust.ID</th>
                                    <th className="p-3">No. DN/OJ</th>
                                    <th className="p-3 text-right">Jml Barang</th>
                                    <th className="p-3">Tgl. Handover</th>
                                    <th className="p-3">Penerima</th>
                                    <th className="p-3">Alamat</th>
                                    <th className="p-3 text-center">Invoice (yes/no)</th>
                                    <th className="p-3 text-center">DO Original (yes/no)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tableData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-3 font-mono font-bold text-amber-600">{row.customer_id}</td>
                                        <td className="p-3 font-mono font-bold text-blue-600">{row.dn_od_sj}</td>
                                        <td className="p-3 text-right font-mono font-bold">{row.jml}</td>
                                        <td className="p-3">
                                            {row.handover ? new Date(row.handover).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                                        </td>
                                        <td className="p-3 font-bold text-slate-800 uppercase">{row.penerima}</td>
                                        <td className="p-3 text-slate-600 max-w-xs truncate">{row.alamat}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.invoice_yn === 'YES' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {row.invoice_yn}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.do_asli_yn === 'YES' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {row.do_asli_yn}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}