import React, { useState, useEffect, useRef } from "react";
import { UserCheck, Upload, AlertCircle, PauseCircle, Clock, FileUp, RefreshCw, X, ShieldAlert } from "lucide-react";
import api from "../api/axios";
import Swal from "sweetalert2";

export default function CustomerKhusus({ isDarkMode = false }) {
    const [queryCust, setQueryCust] = useState("");
    const [suggestList, setSuggestList] = useState([]);
    const [selectedCust, setSelectedCust] = useState(null);
    const [showSuggest, setShowSuggest] = useState(false);
    const suggestRef = useRef(null);

    // Tab Menu Interaktif: 'upload', 'unprocessed', 'hold'
    const [activeTab, setActiveTab] = useState("upload");

    // State Upload
    const [fileCSV, setFileCSV] = useState(null);
    const [uploading, setUploading] = useState(false);

    // State Data Tab
    const [unprocessedData, setUnprocessedData] = useState([]);
    const [loadingUnprocessed, setLoadingUnprocessed] = useState(false);
    const [holdData, setHoldData] = useState([]);
    const [loadingHold, setLoadingHold] = useState(false);

    // Suggest Debounce
    useEffect(() => {
        if (queryCust.length < 2 || (selectedCust && queryCust === selectedCust.cust_name)) {
            setSuggestList([]);
            setShowSuggest(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await api.get(`/marketing/customer-khusus/suggest?q=${encodeURIComponent(queryCust)}`, {
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
        setQueryCust(cust.cust_name);
        setShowSuggest(false);
    };

    const handleResetCustomer = () => {
        setSelectedCust(null);
        setQueryCust("");
        setUnprocessedData([]);
        setHoldData([]);
    };

    // Muat data saat tab berubah atau customer dipilih
    useEffect(() => {
        if (!selectedCust) return;

        if (activeTab === "unprocessed") {
            fetchUnprocessed();
        } else if (activeTab === "hold") {
            fetchHold();
        }
    }, [selectedCust, activeTab]);

    const fetchUnprocessed = async () => {
        if (!selectedCust) return;
        setLoadingUnprocessed(true);
        try {
            const token = localStorage.getItem("token");
            const res = await api.get(`/marketing/customer-khusus/unprocessed?cust_id=${selectedCust.cust_id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUnprocessedData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal memuat antrean BTT:", err);
            setUnprocessedData([]);
        } finally {
            setLoadingUnprocessed(false);
        }
    };

    const fetchHold = async () => {
        if (!selectedCust) return;
        setLoadingHold(true);
        try {
            const token = localStorage.getItem("token");
            const res = await api.get(`/marketing/customer-khusus/hold-list?cust_id=${selectedCust.cust_id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setHoldData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal memuat BTT Hold:", err);
            setHoldData([]);
        } finally {
            setLoadingHold(false);
        }
    };

    // Submit Upload CSV
    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCust) {
            Swal.fire("Perhatian", "Pilih Customer Khusus terlebih dahulu!", "warning");
            return;
        }
        if (!fileCSV) {
            Swal.fire("Perhatian", "Pilih file CSV yang akan diunggah!", "warning");
            return;
        }

        // Validasi regex nama file: YYYYMMDDHHmm.csv (12 digit angka)
        const fileName = fileCSV.name.toLowerCase();
        const regexFileName = /^\d{12}\.csv$/;
        if (!regexFileName.test(fileName)) {
            Swal.fire({
                icon: "error",
                title: "Format Nama File Salah!",
                html: `Nama file CSV harus berupa <b>12 digit angka</b> (TahunBulanTanggalJamMenit.csv).<br/><br/>Contoh yang benar: <b class="font-mono text-indigo-600">202609221530.csv</b>`,
            });
            return;
        }

        setUploading(true);
        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append("customer_id", selectedCust.cust_id);
            formData.append("file", fileCSV);

            const res = await api.post("/marketing/customer-khusus/upload", formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });

            Swal.fire({
                icon: "success",
                title: "Upload Berhasil!",
                text: res.data?.message || "File CSV Customer Khusus berhasil diproses.",
                confirmButtonColor: "#10b981",
            });

            setFileCSV(null);
            setActiveTab("unprocessed");
            fetchUnprocessed();
        } catch (err) {
            Swal.fire("Gagal Upload", err.response?.data?.message || "Terjadi kesalahan saat memproses CSV", "error");
        } finally {
            setUploading(false);
        }
    };

    // Toggle Hold
    const handleToggleHold = async (row, targetHoldYN) => {
        let alasan = "";
        if (targetHoldYN === "Y") {
            const { value: inputAlasan } = await Swal.fire({
                title: "Tahan Baris BTT Ini?",
                input: "text",
                inputLabel: "Alasan Hold (Opsional):",
                inputPlaceholder: "Contoh: Alamat belum jelas / Hold tarif",
                showCancelButton: true,
                confirmButtonColor: "#ef4444",
                confirmButtonText: "Ya, Masukkan Hold",
            });
            if (inputAlasan === undefined) return;
            alasan = inputAlasan || "Ditahan Operasional";
        }

        try {
            const token = localStorage.getItem("token");
            await api.post("/marketing/customer-khusus/toggle-hold", {
                id: row.id,
                hold_yn: targetHoldYN,
                alasan: alasan,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            Swal.fire("Berhasil", "Status baris berhasil diperbarui", "success");
            if (activeTab === "unprocessed") fetchUnprocessed();
            if (activeTab === "hold") fetchHold();
        } catch {
            Swal.fire("Gagal", "Gagal memperbarui status", "error");
        }
    };

    return (
        <div className={`p-6 min-h-screen space-y-6 ${isDarkMode ? "bg-gray-900 text-white" : "bg-[#f8fafc] text-slate-800"}`}>
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500 text-slate-900 rounded-xl shadow-md">
                    <UserCheck size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-black tracking-wide uppercase">Customer Khusus</h1>
                    <p className="text-xs text-slate-400">Manajemen impor berkas manifest dan monitoring antrean BTT pelanggan korporat</p>
                </div>
            </div>

            {/* Bagian 1: Pemilihan Customer Khusus */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
                <div className="text-xs font-black text-amber-600 uppercase tracking-widest border-b pb-2.5 flex items-center gap-2">
                    <span>Pilih Customer Khusus</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold">
                    <div className="md:col-span-3 relative" ref={suggestRef}>
                        <label className="text-slate-600 uppercase block mb-1.5">Ketik Nama Pelanggan :</label>
                        <input
                            type="text"
                            placeholder="Ketik minimal 2 huruf nama Customer..."
                            value={queryCust}
                            onChange={(e) => {
                                setQueryCust(e.target.value);
                                setSelectedCust(null);
                            }}
                            className="w-full h-11 px-3 border border-slate-200 rounded-xl uppercase outline-none focus:border-amber-500 font-bold text-slate-800"
                        />

                        {/* Sugesti Dropdown */}
                        {showSuggest && suggestList.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto z-50 divide-y divide-slate-100">
                                {suggestList.map((c, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleSelectCustomer(c)}
                                        className="p-3 hover:bg-amber-50 cursor-pointer font-bold text-slate-700 flex justify-between items-center"
                                    >
                                        <span>{c.cust_name.toUpperCase()}</span>
                                        <span className="font-mono text-amber-600 text-[11px]">[{c.cust_id}]</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-slate-600 uppercase block mb-1.5">ID Cust :</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                readOnly
                                placeholder="ID Auto"
                                value={selectedCust ? selectedCust.cust_id : ""}
                                className="w-full h-11 px-3 border border-slate-200 bg-slate-50 rounded-xl font-mono font-bold text-indigo-600 outline-none text-center cursor-not-allowed"
                            />
                            {selectedCust && (
                                <button
                                    type="button"
                                    onClick={handleResetCustomer}
                                    className="px-3 h-11 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                                    title="Ganti Customer"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Kotak Catatan Aturan Penamaan File */}
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle size={15} />
                        <span>Catatan Penamaan File CSV:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-800">
                        Setiap pelanggan memiliki struktur kolom tersendiri. Berkas CSV yang diunggah <b>wajib</b> diubah namanya menggunakan format waktu 12 digit: <b>TahunBulanTanggalJamMenit.csv</b> (contoh: <b className="font-mono text-amber-950">202609221530.csv</b>).
                    </p>
                </div>

                {/* 3 Tombol Aksi Navigasi Sesuai Sistem Aslinya */}
                {selectedCust && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                        <button
                            type="button"
                            onClick={() => setActiveTab("upload")}
                            className={`px-5 h-11 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition shadow-sm ${activeTab === "upload"
                                    ? "bg-amber-500 text-slate-900 ring-2 ring-amber-300"
                                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                                }`}
                        >
                            <Upload size={14} /> Lanjutkan Upload File CSV
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("unprocessed")}
                            className={`px-5 h-11 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition shadow-sm ${activeTab === "unprocessed"
                                    ? "bg-indigo-600 text-white ring-2 ring-indigo-300"
                                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                                }`}
                        >
                            <Clock size={14} /> Daftar Barang Belum Dibuat BTT
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("hold")}
                            className={`px-5 h-11 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition shadow-sm ${activeTab === "hold"
                                    ? "bg-slate-900 text-white ring-2 ring-slate-400"
                                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                                }`}
                        >
                            <PauseCircle size={14} /> Daftar BTT Hold
                        </button>
                    </div>
                )}
            </div>

            {/* Bagian 2: Konten Berdasarkan Tab yang Aktif */}
            {selectedCust && (
                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm animate-in fade-in duration-200">
                    {/* TAB 1: FORM UPLOAD CSV */}
                    {activeTab === "upload" && (
                        <form onSubmit={handleUploadSubmit} className="space-y-4 max-w-xl">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase mb-2">
                                <FileUp size={16} className="text-amber-500" />
                                <span>Upload File CSV Untuk Customer: {selectedCust.cust_name}</span>
                            </div>

                            <div>
                                <input
                                    type="file"
                                    accept=".csv"
                                    required
                                    onChange={(e) => setFileCSV(e.target.files[0] || null)}
                                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200 cursor-pointer border border-slate-200 rounded-xl p-2"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Pilih file CSV dengan nama berformat 12 digit (contoh: <b>202609221530.csv</b>)
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={uploading || !fileCSV}
                                className="px-6 h-11 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black rounded-xl shadow-md text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition"
                            >
                                {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                                {uploading ? "Memproses Unggahan..." : "Upload & Masukkan Antrean BTT"}
                            </button>
                        </form>
                    )}

                    {/* TAB 2: DAFTAR BARANG BELUM DIBUAT BTT */}
                    {activeTab === "unprocessed" && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                <span className="text-xs font-bold uppercase text-indigo-700">
                                    Antrean Pengiriman Siap Dibuat BTT ({unprocessedData.length} Baris)
                                </span>
                                <button
                                    type="button"
                                    onClick={fetchUnprocessed}
                                    className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <RefreshCw size={13} /> Refresh Data
                                </button>
                            </div>

                            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                                {loadingUnprocessed ? (
                                    <div className="p-8 text-center text-xs text-slate-400">Memuat antrean barang...</div>
                                ) : unprocessedData.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-slate-400">
                                        Tidak ada barang yang berstatus belum dibuat BTT untuk customer ini.
                                    </div>
                                ) : (
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase sticky top-0">
                                            <tr>
                                                <th className="p-3">NO. SJ / DO</th>
                                                <th className="p-3">PENERIMA</th>
                                                <th className="p-3">KOTA</th>
                                                <th className="p-3 text-center">KOLI</th>
                                                <th className="p-3 text-right">BERAT</th>
                                                <th className="p-3 text-center">AKSI</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {unprocessedData.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="p-3 font-mono font-bold text-indigo-600">{row.no_sj}</td>
                                                    <td className="p-3 font-bold text-slate-800 uppercase">{row.penerima}</td>
                                                    <td className="p-3 uppercase">{row.kota || "-"}</td>
                                                    <td className="p-3 text-center font-bold">{row.koli}</td>
                                                    <td className="p-3 text-right font-mono">{row.berat} kg</td>
                                                    <td className="p-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleHold(row, "Y")}
                                                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 cursor-pointer transition"
                                                        >
                                                            Tahan (Hold)
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 3: DAFTAR BTT HOLD */}
                    {activeTab === "hold" && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                <span className="text-xs font-bold uppercase text-rose-700 flex items-center gap-1.5">
                                    <ShieldAlert size={14} /> Daftar Pengiriman yang Ditahan (Hold) ({holdData.length} Baris)
                                </span>
                                <button
                                    type="button"
                                    onClick={fetchHold}
                                    className="text-xs text-slate-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <RefreshCw size={13} /> Refresh Data
                                </button>
                            </div>

                            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                                {loadingHold ? (
                                    <div className="p-8 text-center text-xs text-slate-400">Memuat daftar barang hold...</div>
                                ) : holdData.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-slate-400">
                                        Tidak ada transaksi BTT yang berstatus hold untuk customer ini.
                                    </div>
                                ) : (
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase sticky top-0">
                                            <tr>
                                                <th className="p-3">NO. SJ / DO</th>
                                                <th className="p-3">PENERIMA</th>
                                                <th className="p-3">KOTA</th>
                                                <th className="p-3">ALASAN DITAHAN (HOLD)</th>
                                                <th className="p-3 text-center">AKSI</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {holdData.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="p-3 font-mono font-bold text-rose-600">{row.no_sj}</td>
                                                    <td className="p-3 font-bold text-slate-800 uppercase">{row.penerima}</td>
                                                    <td className="p-3 uppercase">{row.kota || "-"}</td>
                                                    <td className="p-3 text-slate-600 italic">{row.hold_alasan}</td>
                                                    <td className="p-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleHold(row, "N")}
                                                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 cursor-pointer transition"
                                                        >
                                                            Lepas Hold
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}