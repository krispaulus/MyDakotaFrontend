import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Info, CheckCircle2, RefreshCw, Building, ShieldCheck } from 'lucide-react';
import api from '../api/axios';
import Swal from 'sweetalert2';

export default function BTTUploadV2({ isDarkMode = false }) {
    const [showSOP, setShowSOP] = useState(true);

    const [queryCust, setQueryCust] = useState('');
    const [suggestList, setSuggestList] = useState([]);
    const [selectedCust, setSelectedCust] = useState(null);
    const [showSuggest, setShowSuggest] = useState(false);
    const suggestRef = useRef(null);

    const [delimiter, setDelimiter] = useState('titikkoma');
    const [tipe, setTipe] = useState('1'); // 1: Luar Kota, 2: Dalam Kota, 3: Dedicated
    const [fileCSV, setFileCSV] = useState(null);

    const [loadingParse, setLoadingParse] = useState(false);
    const [parsedData, setParsedData] = useState([]);
    const [savingBatch, setSavingBatch] = useState(false);

    useEffect(() => {
        if (queryCust.length < 2 || (selectedCust && queryCust === selectedCust.cust_name)) {
            setSuggestList([]);
            setShowSuggest(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await api.get(`/marketing/btt-upload-v2/suggest-customer?q=${encodeURIComponent(queryCust)}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSuggestList(res.data?.data || []);
                setShowSuggest(true);
            } catch (err) {
                console.error("Gagal cari customer:", err);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [queryCust]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (suggestRef.current && !suggestRef.current.contains(e.target)) {
                setShowSuggest(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectCust = (c) => {
        setSelectedCust(c);
        setQueryCust(c.cust_name);
        setShowSuggest(false);
    };

    const handleParseCSV = async (e) => {
        e.preventDefault();
        if (!selectedCust) {
            Swal.fire("Perhatian", "Pilih Customer terlebih dahulu!", "warning");
            return;
        }
        if (!fileCSV) {
            Swal.fire("Perhatian", "Pilih berkas CSV terlebih dahulu!", "warning");
            return;
        }

        setLoadingParse(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('customer_id', selectedCust.cust_id);
            formData.append('delimiter', delimiter);
            formData.append('tipe', tipe);
            formData.append('file', fileCSV);

            const res = await api.post('/marketing/btt-upload-v2/parse-csv', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setParsedData(res.data?.data || []);
            if ((res.data?.data || []).length === 0) {
                Swal.fire("Info", "Tidak ada baris data yang terbaca dari berkas ini.", "info");
            }
        } catch (err) {
            Swal.fire("Gagal", err.response?.data?.message || "Gagal membaca berkas CSV", "error");
        } finally {
            setLoadingParse(false);
        }
    };

    const handleSaveBatch = async () => {
        if (parsedData.length === 0) return;

        setSavingBatch(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/marketing/btt-upload-v2/save-batch', {
                customer_id: selectedCust.cust_id,
                tipe: tipe,
                rows: parsedData
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                icon: 'success',
                title: 'Berhasil Diproses!',
                text: res.data?.message || 'Data BTT Upload V2 siap diterbitkan menjadi BTT.',
                confirmButtonColor: '#10b981'
            });

            setParsedData([]);
            setFileCSV(null);
        } catch (err) {
            Swal.fire("Gagal", err.response?.data?.message || "Gagal menyimpan batch BTT", "error");
        } finally {
            setSavingBatch(false);
        }
    };

    return (
        <div className={`p-6 min-h-screen space-y-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-[#f8fafc] text-slate-800'}`}>
            {/* Header Halaman */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md">
                        <FileSpreadsheet size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-wide uppercase">Upload Data Untuk Pembuatan BTT</h1>
                        <p className="text-xs text-slate-400">Modul BTT Upload V2 (Luar Kota 32 Kolom, Dalam Kota & Dedicated 33 Kolom)</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setShowSOP(true)}
                    className="px-4 h-10 border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition"
                >
                    <Info size={16} /> SOP Upload BTT
                </button>
            </div>

            {/* Modal SOP Bawaan Sistem Lawas */}
            {showSOP && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 p-6 animate-in zoom-in-95 duration-200 space-y-4">
                        <div className="text-center pb-2 border-b border-slate-100">
                            <h2 className="text-base font-black text-blue-600 uppercase">SOP Upload CSV BTT</h2>
                        </div>
                        <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed font-medium">
                            <li>Pilih customer terlebih dahulu.</li>
                            <li>Tentukan delimiter yang digunakan pada file .csv (Koma atau Titik Koma).</li>
                            <li>Pilih tipe pengiriman yang tersedia: <b>LUAR KOTA (32 Kolom)</b>, <b>DALAM KOTA (33 Kolom)</b>, atau <b>DEDICATED (33 Kolom)</b>.</li>
                            <li>Jika semua kolom input sudah terisi, pilih file .csv yang ingin diupload dan klik tombol <b>Upload</b>.</li>
                        </ol>
                        <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-[11px] leading-relaxed font-semibold">
                            * Catatan: Kolom Req_Invoice menentukan kategori GRN. Nilai YA/Y/E-Faktur/0 menghasilkan Copy GRN (Y), sedangkan TIDAK/T/YTFC menghasilkan Asli GRN (N).
                        </div>
                        <div className="flex justify-center pt-2">
                            <button
                                type="button"
                                onClick={() => setShowSOP(false)}
                                className="px-6 h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase cursor-pointer"
                            >
                                Mengerti
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Form Upload Input */}
            <form onSubmit={handleParseCSV} className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs font-bold">
                    {/* Customer Picker */}
                    <div className="relative" ref={suggestRef}>
                        <label className="text-slate-600 uppercase block mb-1.5">
                            PILIH CUSTOMER : <span className="text-rose-500">(*Required)</span>
                        </label>
                        <div className="relative">
                            <Building size={16} className="absolute left-3 top-3 text-slate-400" />
                            <input
                                type="text"
                                required
                                placeholder="Ketik nama customer..."
                                value={queryCust}
                                onChange={(e) => {
                                    setQueryCust(e.target.value);
                                    setSelectedCust(null);
                                }}
                                className="w-full h-11 pl-9 pr-3 border border-slate-200 rounded-xl uppercase outline-none focus:border-blue-500"
                            />
                        </div>
                        {showSuggest && suggestList.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 divide-y divide-slate-100 text-xs">
                                {suggestList.map((c, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleSelectCust(c)}
                                        className="p-3 hover:bg-blue-50 cursor-pointer font-bold text-slate-700"
                                    >
                                        [{c.cust_id}] {c.cust_name.toUpperCase()}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Delimiter */}
                    <div>
                        <label className="text-slate-600 uppercase block mb-1.5">
                            Delimiter yang anda gunakan : <span className="text-rose-500">(*Required)</span>
                        </label>
                        <select
                            value={delimiter}
                            onChange={(e) => setDelimiter(e.target.value)}
                            className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white text-slate-700"
                        >
                            <option value="titikkoma">2 . TITIK KOMA ;</option>
                            <option value="koma">1 . KOMA ,</option>
                        </select>
                    </div>

                    {/* Tipe Pengiriman */}
                    <div>
                        <label className="text-slate-600 uppercase block mb-1.5">
                            Tipe : <span className="text-rose-500">(*Required)</span>
                        </label>
                        <select
                            value={tipe}
                            onChange={(e) => setTipe(e.target.value)}
                            className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white text-slate-700"
                        >
                            <option value="1">LUAR KOTA (32 Kolom)</option>
                            <option value="2">DALAM KOTA (33 Kolom)</option>
                            <option value="3">DEDICATED (33 Kolom)</option>
                        </select>
                    </div>
                </div>

                {/* Upload File Input */}
                <div>
                    <label className="text-slate-600 uppercase block mb-1.5 text-xs font-bold">
                        Pilih Berkas CSV : <span className="text-rose-500">(*Required)</span>
                    </label>
                    <input
                        type="file"
                        accept=".csv"
                        required
                        onChange={(e) => {
                            setFileCSV(e.target.files[0] || null);
                            setParsedData([]);
                        }}
                        className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-xl p-2"
                    />
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                        type="submit"
                        disabled={loadingParse}
                        className="px-6 h-11 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black rounded-xl shadow-md text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition"
                    >
                        {loadingParse ? <RefreshCw size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                        {loadingParse ? "Sedang Proses Data..." : "UPLOAD"}
                    </button>
                </div>
            </form>

            {/* Tabel Pratinjau Parsing 32 / 33 Kolom */}
            {parsedData.length > 0 && (
                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <span className="text-xs font-bold uppercase text-blue-700">
                            Pratinjau Data ({parsedData.length} Baris Dokumen Siap Diproses)
                        </span>
                        <button
                            type="button"
                            onClick={handleSaveBatch}
                            disabled={savingBatch}
                            className="px-6 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {savingBatch ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            {savingBatch ? "Menyimpan..." : "Konfirmasi & Simpan Batch"}
                        </button>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase sticky top-0">
                                <tr>
                                    <th className="p-3">NO. DN #</th>
                                    <th className="p-3">PENERIMA</th>
                                    <th className="p-3">KOTA TUJUAN</th>
                                    <th className="p-3 text-center">KOLI</th>
                                    <th className="p-3 text-right">BERAT (KG)</th>
                                    <th className="p-3 text-center">SERVICE</th>
                                    {(tipe === "2" || tipe === "3") && <th className="p-3 text-right">HARGA (RP)</th>}
                                    <th className="p-3">REQ INVOICE</th>
                                    <th className="p-3 text-center">GRN</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {parsedData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-3 font-mono font-bold text-blue-600">{row.no_dn}</td>
                                        <td className="p-3 font-bold text-slate-800 uppercase">{row.nama_penerima}</td>
                                        <td className="p-3 uppercase">{row.kota_tujuan || "-"}</td>
                                        <td className="p-3 text-center font-bold">{row.koli}</td>
                                        <td className="p-3 text-right font-mono">{row.berat}</td>
                                        <td className="p-3 text-center font-bold text-slate-700">{row.service || "R"}</td>
                                        {(tipe === "2" || tipe === "3") && (
                                            <td className="p-3 text-right font-mono font-bold text-emerald-700">
                                                Rp {Number(row.harga || 0).toLocaleString('id-ID')}
                                            </td>
                                        )}
                                        <td className="p-3 uppercase font-mono text-slate-600">{row.req_invoice || "-"}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.kategori_grn === 'Y'
                                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                                : 'bg-amber-100 text-amber-700 border border-amber-200'
                                                }`}>
                                                {row.kategori_grn === 'Y' ? 'COPY' : 'ASLI'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}