import React, { useState, useEffect, useRef } from "react";
import { UploadCloud, FileText, CheckCircle2, RefreshCw, X, Building, ArrowRight, Table } from "lucide-react";
import api from "../api/axios";
import Swal from "sweetalert2";

export default function UploadTransportPlanningCSV({ isDarkMode = false }) {
    // Autocomplete Principal
    const [queryCust, setQueryCust] = useState("");
    const [suggestList, setSuggestList] = useState([]);
    const [selectedCust, setSelectedCust] = useState(null);
    const [showSuggest, setShowSuggest] = useState(false);
    const suggestRef = useRef(null);

    // File & Delimiter
    const [delimiter, setDelimiter] = useState("koma");
    const [fileCSV, setFileCSV] = useState(null);

    // Status Parsing & Data Review
    const [loadingParse, setLoadingParse] = useState(false);
    const [parsedData, setParsedData] = useState([]);
    const [savingBatch, setSavingBatch] = useState(false);

    // Suggest debouncing
    useEffect(() => {
        if (queryCust.length < 2 || (selectedCust && queryCust === `${selectedCust.cust_id} - ${selectedCust.cust_name}`)) {
            setSuggestList([]);
            setShowSuggest(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await api.get(`/marketing/transport-planning/suggest-customer?q=${encodeURIComponent(queryCust)}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setSuggestList(res.data?.data || []);
                setShowSuggest(true);
            } catch (err) {
                console.error("Gagal cari customer:", err);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [queryCust]);

    // Klik di luar menutup dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (suggestRef.current && !suggestRef.current.contains(e.target)) {
                setShowSuggest(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelectCustomer = (cust) => {
        setSelectedCust(cust);
        setQueryCust(`${cust.cust_id} - ${cust.cust_name}`);
        setShowSuggest(false);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && !file.name.toLowerCase().endsWith(".csv")) {
            Swal.fire("Perhatian", "Hanya berkas berformat .csv yang diperbolehkan", "warning");
            e.target.value = "";
            setFileCSV(null);
            return;
        }
        setFileCSV(file);
        setParsedData([]); // Reset review jika ganti file
    };

    const handleParseAndReview = async (e) => {
        e.preventDefault();
        if (!selectedCust) {
            Swal.fire("Perhatian", "Silakan pilih Customer Principal terlebih dahulu", "warning");
            return;
        }
        if (!fileCSV) {
            Swal.fire("Perhatian", "Pilih file CSV yang akan diunggah", "warning");
            return;
        }

        setLoadingParse(true);
        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append("customer_id", selectedCust.cust_id);
            formData.append("delimiter", delimiter);
            formData.append("file", fileCSV);

            const res = await api.post("/marketing/transport-planning/parse-csv", formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });

            setParsedData(res.data?.data || []);
            if ((res.data?.data || []).length === 0) {
                Swal.fire("Pemberitahuan", "Tidak ada baris data yang terbaca dari file CSV ini", "info");
            }
        } catch (err) {
            Swal.fire("Gagal", err.response?.data?.message || "Gagal membaca berkas CSV", "error");
        } finally {
            setLoadingParse(false);
        }
    };

    const handleFinalSave = async () => {
        if (parsedData.length === 0) return;

        setSavingBatch(true);
        try {
            const token = localStorage.getItem("token");
            const payload = {
                customer_id: selectedCust.cust_id,
                customer_name: selectedCust.cust_name,
                delimiter: delimiter,
                rows: parsedData,
            };

            const res = await api.post("/marketing/transport-planning/save-batch", payload, {
                headers: { Authorization: `Bearer ${token}` },
            });

            Swal.fire({
                icon: "success",
                title: "Unggah Berhasil!",
                text: res.data?.message || "Data Transport Planning siap diproses menjadi BTT.",
                confirmButtonColor: "#4f46e5",
            });

            // Reset
            setParsedData([]);
            setFileCSV(null);
            setQueryCust("");
            setSelectedCust(null);
        } catch (err) {
            Swal.fire("Gagal", err.response?.data?.message || "Gagal menyimpan batch transport planning", "error");
        } finally {
            setSavingBatch(false);
        }
    };

    return (
        <div className={`p-6 min-h-screen space-y-6 ${isDarkMode ? "bg-gray-900 text-white" : "bg-[#f8fafc] text-slate-800"}`}>
            {/* Header Halaman */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md">
                    <UploadCloud size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-black tracking-wide uppercase">Upload Transport Planning (CSV)</h1>
                    <p className="text-xs text-slate-400">Import berkas pesanan massal dari principal logistik</p>
                </div>
            </div>

            {/* Form Upload */}
            <form onSubmit={handleParseAndReview} className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-5">
                {/* Pilih Principal Shipper */}
                <div className="relative" ref={suggestRef}>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        Pilih Customer (Principal/Shipper) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                        <Building size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                            type="text"
                            required
                            autoComplete="off"
                            placeholder="Ketik minimal 2 huruf nama Customer / PT..."
                            value={queryCust}
                            onChange={(e) => {
                                setQueryCust(e.target.value);
                                setSelectedCust(null);
                            }}
                            className="w-full h-11 pl-10 pr-3 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-indigo-500"
                        />
                    </div>

                    {/* Pop-up Suggestion */}
                    {showSuggest && suggestList.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 divide-y divide-slate-100 text-xs">
                            {suggestList.map((item, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleSelectCustomer(item)}
                                    className="p-3 hover:bg-indigo-50 cursor-pointer font-semibold text-slate-700"
                                >
                                    <span className="font-mono text-indigo-600">[{item.cust_id}]</span> {item.cust_name.toUpperCase()}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pilihan Delimiter */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        Pilih Delimiter File CSV <span className="text-rose-500">*</span>
                    </label>
                    <select
                        value={delimiter}
                        onChange={(e) => setDelimiter(e.target.value)}
                        className="w-full h-11 px-3 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 bg-white"
                    >
                        <option value="koma">Koma ( , )</option>
                        <option value="titikkoma">Titik Koma ( ; )</option>
                    </select>
                </div>

                {/* File Input */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        Pilih File CSV Transport Planning <span className="text-rose-500">*</span>
                    </label>
                    <input
                        type="file"
                        accept=".csv"
                        required
                        onChange={handleFileChange}
                        className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-xl p-2"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                        * Sistem akan membaca DO/DN, Consignee, Alamat, serta menentukan status <b>Dalam Kota / Luar Kota</b> secara otomatis.
                    </p>
                </div>

                {/* Tombol Eksekusi Review */}
                <div className="flex justify-end pt-3 border-t border-slate-100">
                    <button
                        type="submit"
                        disabled={loadingParse}
                        className="px-6 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition"
                    >
                        {loadingParse ? <RefreshCw size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                        {loadingParse ? "Membaca CSV..." : "UPLOAD & REVIEW"}
                    </button>
                </div>
            </form>

            {/* Tabel Review Data Parsed */}
            {parsedData.length > 0 && (
                <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-4 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Table size={18} className="text-indigo-600" />
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                                Review Hasil Ekstraksi CSV ({parsedData.length} Baris Dokumen)
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={handleFinalSave}
                            disabled={savingBatch}
                            className="px-6 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition"
                        >
                            {savingBatch ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            {savingBatch ? "Menyimpan..." : "Konfirmasi & Simpan Batch"}
                        </button>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase sticky top-0">
                                <tr>
                                    <th className="p-3">NO. DO / DN</th>
                                    <th className="p-3">PENERIMA (CONSIGNEE)</th>
                                    <th className="p-3">ALAMAT PENGIRIMAN</th>
                                    <th className="p-3">KOTA</th>
                                    <th className="p-3 text-center">KOLI</th>
                                    <th className="p-3 text-right">BERAT (KG)</th>
                                    <th className="p-3 text-center">ZONASI</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {parsedData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition">
                                        <td className="p-3 font-mono font-bold text-indigo-600">{row.no_do_dn}</td>
                                        <td className="p-3 font-bold text-slate-800 uppercase">{row.nama_penerima}</td>
                                        <td className="p-3 text-slate-600 max-w-xs truncate">{row.alamat || "-"}</td>
                                        <td className="p-3 text-slate-700 uppercase font-semibold">{row.kota_tujuan || "-"}</td>
                                        <td className="p-3 text-center font-bold">{row.koli}</td>
                                        <td className="p-3 text-right font-mono">{row.berat}</td>
                                        <td className="p-3 text-center">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.status_wilayah === "DALAM KOTA"
                                                        ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                                                        : "bg-blue-100 text-blue-700 border border-blue-300"
                                                    }`}
                                            >
                                                {row.status_wilayah}
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