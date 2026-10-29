import React, { useState, useEffect, useRef } from "react";
import {
    UploadCloud, CheckCircle2, RefreshCw, X, Building,
    ArrowRight, Table, Download, Info, ChevronDown, ChevronUp, AlertCircle,
    Edit3, Trash2, Check, AlertTriangle
} from "lucide-react";
import api from "../api/axios";
import Swal from "sweetalert2";

export default function UploadTransportPlanningCSV({ isDarkMode = false }) {
    // Autocomplete Principal
    const [queryCust, setQueryCust] = useState("");
    const [suggestList, setSuggestList] = useState([]);
    const [selectedCust, setSelectedCust] = useState(null);
    const [showSuggest, setShowSuggest] = useState(false);
    const suggestRef = useRef(null);

    // File
    const [fileCSV, setFileCSV] = useState(null);

    // State Data Hasil Parse
    const [loadingParse, setLoadingParse] = useState(false);
    const [dataValid, setDataValid] = useState([]);
    const [dataRejected, setDataRejected] = useState([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [activeTab, setActiveTab] = useState("valid"); // "valid" atau "rejected"

    // Inline Editing
    const [editIdx, setEditIdx] = useState(null);
    const [editRow, setEditRow] = useState({});

    const [savingBatch, setSavingBatch] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    // Suggest Customer Debounce
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
        setDataValid([]);
        setDataRejected([]);
        setShowReviewModal(false);
    };

    // Download Template CSV Resmi
    const handleDownloadTemplate = () => {
        const headers = [
            "No", "createdate", "orderkey", "dn", "Wave", "Colly", "so", "invoice_req",
            "consignee", "address", "storagecode", "weight", "volume", "Dalam Kota / Luar Kota",
            "up", "Telephone", "ServID", "layananID", "Packing", "Keterangan", "kode_kendaraan",
            "harga", "is_DG", "is_multidrop", "kode_packing", "kodeGroupCarter"
        ];

        const sampleRow1 = [
            "1", "2026-10-29", "ORD001", "DN-2026-001", "W1", "5", "SO-9901", "Y",
            "PT. GRAPARA LABORATORIUM GEMILANG", "BUKIT CIMANGGU CITY BLOK M-1 NO. 8RT 002 R CIBADAK", "ST01", "25.5", "0.08", "DALAM KOTA",
            "BAPAK BUDI", "081234567890", "1", "R", "0", "DO Copy Kembali Jatiasih", "",
            "150000", "N", "N", "", ""
        ];

        const sampleRow2 = [
            "2", "2026-10-29", "ORD002", "DN-2026-002", "W1", "10", "SO-9902", "N",
            "PT. CHEIL JEDANG INDONESIA", "DESA ARJOSARI, KECAMATAN . REJOSO", "ST02", "120.0", "0.45", "LUAR KOTA",
            "IBU SISKA", "0343-482333", "3", "C", "2", "DO Asli Kembali Jatiasih", "CDE",
            "2500000", "Y", "N", "MP0001", "CRT01"
        ];

        const csvString = [
            headers.join(";"),
            sampleRow1.join(";"),
            sampleRow2.join(";")
        ].join("\r\n");

        const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `TEMPLATE_TRANSPORT_PLANNING.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Eksekusi Parse CSV
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
            formData.append("file", fileCSV);

            const res = await api.post("/marketing/transport-planning/parse-csv", formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });

            const valid = res.data?.data_valid || [];
            const rejected = res.data?.data_rejected || [];

            setDataValid(valid);
            setDataRejected(rejected);

            if (valid.length === 0 && rejected.length === 0) {
                Swal.fire("Pemberitahuan", "Berkas CSV tidak memiliki baris data yang terbaca.", "info");
            } else {
                setActiveTab(valid.length > 0 ? "valid" : "rejected");
                setShowReviewModal(true);
            }
        } catch (err) {
            Swal.fire("Gagal", err.response?.data?.message || "Gagal memproses file CSV", "error");
        } finally {
            setLoadingParse(false);
        }
    };

    // Hapus Baris Valid
    const handleDeleteRow = (idx) => {
        setDataValid(prev => prev.filter((_, i) => i !== idx));
    };

    // Mulai Edit Baris
    const handleStartEdit = (idx, row) => {
        setEditIdx(idx);
        setEditRow({ ...row });
    };

    // Simpan Edit Baris
    const handleSaveEdit = (idx) => {
        setDataValid(prev => prev.map((item, i) => i === idx ? { ...editRow } : item));
        setEditIdx(null);
    };

    // Batal Edit
    const handleCancelEdit = () => {
        setEditIdx(null);
        setEditRow({});
    };

    // Download Data Tertolak (CSV)
    const handleDownloadRejected = () => {
        if (dataRejected.length === 0) return;

        const headers = ["No", "Consignee", "Alamat", "No DN/SJ", "Colly", "Weight", "Volume", "Dalam/Luar Kota", "Keterangan", "Alasan Penolakan"];
        const rows = dataRejected.map(r => [
            r.no,
            `"${(r.consignee || '').replace(/"/g, '""')}"`,
            `"${(r.address || '').replace(/"/g, '""')}"`,
            `"${(r.no_dn || '')}"`,
            r.colly,
            r.weight,
            r.volume,
            `"${r.dalam_kota || ''}"`,
            `"${(r.keterangan || '').replace(/"/g, '""')}"`,
            `"${r.alasan_tolak || ''}"`
        ]);

        const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `DATA_TERTOLAK_${selectedCust?.cust_id || 'CUSTOMER'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Simpan Batch ke DB
    const handleFinalSave = async () => {
        if (dataValid.length === 0) {
            Swal.fire("Perhatian", "Tidak ada baris data valid yang siap disimpan.", "warning");
            return;
        }

        const confirm = await Swal.fire({
            title: "Simpan ke Database?",
            text: `Yakin ingin memproses ${dataValid.length} BTT Transport Planning ke database?`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#059669",
            cancelButtonColor: "#64748b",
            confirmButtonText: "Ya, Simpan!",
            cancelButtonText: "Batal"
        });

        if (!confirm.isConfirmed) return;

        setSavingBatch(true);
        try {
            const token = localStorage.getItem("token");
            const payload = {
                customer_id: selectedCust.cust_id,
                customer_name: selectedCust.cust_name,
                rows: dataValid,
            };

            const res = await api.post("/marketing/transport-planning/save-batch", payload, {
                headers: { Authorization: `Bearer ${token}` },
            });

            Swal.fire({
                icon: "success",
                title: "Unggah Berhasil!",
                text: res.data?.message || "Data Transport Planning berhasil disimpan ke database.",
                confirmButtonColor: "#004b84",
            });

            setShowReviewModal(false);
            setDataValid([]);
            setDataRejected([]);
            setFileCSV(null);
            setQueryCust("");
            setSelectedCust(null);
        } catch (err) {
            Swal.fire("Gagal", err.response?.data?.message || "Gagal menyimpan batch", "error");
        } finally {
            setSavingBatch(false);
        }
    };

    return (
        <div className={`p-6 min-h-screen space-y-5 font-sans ${isDarkMode ? "bg-gray-900 text-white" : "bg-slate-50 text-slate-800"}`}>

            {/* Header Halaman */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-[#004b84] text-white rounded-2xl shadow-md">
                        <UploadCloud size={24} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black tracking-wide uppercase text-slate-900">Upload Transport Planning (CSV)</h1>
                        <p className="text-xs text-slate-500 font-medium">Import berkas pesanan massal dari principal logistik</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="h-10 px-4 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer uppercase tracking-wider shrink-0"
                >
                    <Download size={15} /> Download Template CSV
                </button>
            </div>

            {/* Panduan & Aturan Pengisian */}
            <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
                <button
                    type="button"
                    onClick={() => setShowGuide(prev => !prev)}
                    className="w-full px-5 py-3.5 bg-gradient-to-r from-sky-50 to-indigo-50/50 flex items-center justify-between text-left cursor-pointer transition hover:bg-sky-100/50"
                >
                    <div className="flex items-center gap-2.5">
                        <Info size={18} className="text-[#004b84]" />
                        <span className="text-xs font-black uppercase text-[#004b84] tracking-wide">
                            Panduan & Aturan Pengisian File CSV
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#004b84]">
                        <span>{showGuide ? "Sembunyikan" : "Buka Panduan"}</span>
                        {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                </button>

                {showGuide && (
                    <div className="p-5 text-xs text-slate-600 space-y-3.5 border-t border-sky-100 animate-in fade-in duration-200 leading-relaxed">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="font-bold text-slate-800 block mb-1">1. Format & Delimiter Berkas</span>
                                <p className="text-[11px] text-slate-500">
                                    File berekstensi <b>.csv</b>. Sistem otomatis mendeteksi pemisah <b>Koma ( , )</b> maupun <b>Titik Koma ( ; )</b>. Gunakan encoding <b>UTF-8</b>.
                                </p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="font-bold text-slate-800 block mb-1">2. Baris Header</span>
                                <p className="text-[11px] text-slate-500">
                                    Baris pertama wajib berisi 26 nama kolom (otomatis dilewati oleh sistem).
                                </p>
                            </div>
                        </div>

                        {/* Urutan Kolom */}
                        <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-200">
                            <span className="font-bold text-sky-900 block mb-1.5 uppercase text-[11px]">
                                Urutan Kolom (Wajib Sama Persis 26 Kolom):
                            </span>
                            <div className="flex flex-wrap gap-1 font-mono text-[10px] text-slate-700">
                                {[
                                    "No", "createdate", "orderkey", "dn", "Wave", "Colly", "so", "invoice_req",
                                    "consignee", "address", "storagecode", "weight", "volume", "Dalam Kota / Luar Kota",
                                    "up", "Telephone", "ServID", "layananID", "Packing", "Keterangan", "kode_kendaraan",
                                    "harga", "is_DG", "is_multidrop", "kode_packing", "kodeGroupCarter"
                                ].map((col, idx) => (
                                    <span key={idx} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-800 font-semibold">
                                        {col}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Aturan Detail Data */}
                        <div className="space-y-1.5 text-[11px]">
                            <span className="font-bold text-slate-800 uppercase block">Aturan Pengisian Data:</span>
                            <ul className="list-disc pl-4 space-y-1 text-slate-600">
                                <li><b>consignee</b>: Nama penerima <u>wajib persis</u> dengan data "Anak Customer" yang terdaftar di sistem.</li>
                                <li><b>weight & volume</b>: Hanya isi dengan angka murni (gunakan tanda titik <code>.</code> untuk desimal).</li>
                                <li><b>Dalam Kota / Luar Kota</b>: Wajib diisi <code>DALAM KOTA</code> atau <code>LUAR KOTA</code>.</li>
                                <li><b>harga</b>: (Opsional) Nilai ongkir/harga. Isi dengan angka bulat tanpa titik atau koma.</li>
                                <li><b>is_DG</b>: Isi <code>Y</code> untuk barang berbahaya (B3/Dangerous Goods) atau <code>N</code> untuk barang umum.</li>
                                <li><b>is_multidrop</b>: Isi <code>Y</code> (Multi Drop Reguler), <code>E</code> (Multi Drop Express), atau <code>N</code>.</li>
                                <li><b>kode_packing</b>: Wajib diisi kode jenis packing jika kolom <b>Packing</b> &gt; 0.</li>
                                <li><b>kodeGroupCarter</b>: Khusus layanan Carter (<code>layananID=C</code>). Baris dengan consignee + alamat + kodeGroupCarter sama akan otomatis digabung menjadi 1 BTT.</li>
                            </ul>
                        </div>

                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 font-bold text-[11px]">
                            <AlertCircle size={15} className="shrink-0" />
                            <span>* Data yang consignee-nya tidak terdaftar sebagai anak customer dari principal yang dipilih akan dipisahkan ke tab "Data Tertolak".</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Form Input Upload */}
            <form onSubmit={handleParseAndReview} className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-5">

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
                            className="w-full h-11 pl-10 pr-3 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-[#004b84] bg-white transition"
                        />
                    </div>

                    {showSuggest && suggestList.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-slate-100 text-xs">
                            {suggestList.map((item, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleSelectCustomer(item)}
                                    className="p-3 hover:bg-sky-50 cursor-pointer font-semibold text-slate-700 transition"
                                >
                                    <span className="font-mono text-sky-700 font-bold">[{item.cust_id}]</span> {item.cust_name.toUpperCase()}
                                </div>
                            ))}
                        </div>
                    )}
                </div>


                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        Pilih File CSV Transport Planning <span className="text-rose-500">*</span>
                    </label>
                    <input
                        type="file"
                        accept=".csv"
                        required
                        onChange={handleFileChange}
                        className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-[#004b84] hover:file:bg-sky-100 cursor-pointer border border-slate-200 rounded-xl p-2 bg-white"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                        * Sistem secara otomatis membaca, memvalidasi, dan mengelompokkan data berdasarkan <b>Consignee + Address</b> serta menentukan status <b>Dalam Kota / Luar Kota</b> hanya untuk anak customer dari Customer yang dipilih.
                    </p>
                </div>


                <div className="flex justify-end pt-3 border-t border-slate-100">
                    <button
                        type="submit"
                        disabled={loadingParse}
                        className="px-6 h-11 bg-[#004b84] hover:bg-[#003863] text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition active:scale-95"
                    >
                        {loadingParse ? <RefreshCw size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                        {loadingParse ? "Membaca CSV..." : "UPLOAD & REVIEW"}
                    </button>
                </div>
            </form>

            {/* 🌟 MODAL POP-UP FULL WIDTH (HORIZONTAL SCROLLABLE & 24 KOLOM LENGKAP) 🌟 */}
            {showReviewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-[98vw] max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                        {/* Header Modal & Tabs */}
                        <div className="px-6 py-3.5 bg-[#004b84] text-white flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md shrink-0">
                            <div className="flex items-center gap-2.5">
                                <Table size={20} className="text-sky-200" />
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-wider">
                                        Review Transport Planning &mdash; {selectedCust?.cust_name}
                                    </h2>
                                    <p className="text-[11px] text-sky-200 font-medium">
                                        {dataValid.length} BTT Terbentuk (Hasil Grouping) &bull; {dataRejected.length} Baris Tertolak
                                    </p>
                                </div>
                            </div>


                            <div className="flex items-center gap-2 bg-black/20 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("valid")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${activeTab === "valid" ? "bg-white text-[#004b84] shadow-xs" : "text-sky-100 hover:text-white"
                                        }`}
                                >
                                    <CheckCircle2 size={14} className={activeTab === "valid" ? "text-emerald-600" : ""} />
                                    <span>Data Valid ({dataValid.length})</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("rejected")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${activeTab === "rejected" ? "bg-white text-rose-700 shadow-xs" : "text-sky-100 hover:text-white"
                                        }`}
                                >
                                    <AlertTriangle size={14} className={activeTab === "rejected" ? "text-rose-600" : ""} />
                                    <span>Data Tertolak ({dataRejected.length})</span>
                                </button>
                            </div>
                        </div>

                        {/* Konten Tabel dengan Scroll Horizontal & Vertikal Lengkap */}
                        <div className="p-4 overflow-y-auto overflow-x-auto flex-1">

                            {/* TAB 1: DATA VALID (24 KOLOM RESMI DAKOTA LOGISTIK) */}
                            {activeTab === "valid" && (
                                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs min-w-max">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead className="bg-[#004b84] text-white text-[11px] font-bold uppercase sticky top-0 z-20">
                                            <tr>
                                                <th className="p-2.5 text-center border-r border-sky-800">NO</th>
                                                <th className="p-2.5 text-center border-r border-sky-800">AKSI</th>
                                                <th className="p-2.5 border-r border-sky-800 w-[300px] min-w-[280px] max-w-[320px]">CONSIGNEE (ANAK CUSTOMER)</th>
                                                <th className="p-2.5 border-r border-sky-800 min-w-[240px]">ADDRESS</th>
                                                <th className="p-2.5 border-r border-sky-800 min-w-[130px]">PROPINSI</th>
                                                <th className="p-2.5 border-r border-sky-800 min-w-[130px]">KOTA/KABUPATEN</th>
                                                <th className="p-2.5 border-r border-sky-800 min-w-[130px]">KECAMATAN</th>
                                                <th className="p-2.5 border-r border-sky-800 min-w-[130px]">KELURAHAN</th>
                                                <th className="p-2.5 border-r border-sky-800 min-w-[80px]">KODEPOS</th>
                                                <th className="p-2.5 text-center border-r border-sky-800">SERVID</th>
                                                <th className="p-2.5 text-center border-r border-sky-800">LAYANANID</th>
                                                <th className="p-2.5 text-center border-r border-sky-800">TOTAL COLLY</th>
                                                <th className="p-2.5 text-right border-r border-sky-800">TOTAL WEIGHT</th>
                                                <th className="p-2.5 text-right border-r border-sky-800">TOTAL VOLUME</th>
                                                <th className="p-2.5 text-right border-r border-sky-800">TOTAL PACKING</th>
                                                <th className="p-2.5 text-center border-r border-sky-800 min-w-[90px]">KODE KENDARAAN</th>
                                                <th className="p-2.5 text-right border-r border-sky-800 min-w-[90px]">HARGA</th>
                                                <th className="p-2.5 text-center border-r border-sky-800">DG (B3)</th>
                                                <th className="p-2.5 text-center border-r border-sky-800">MULTIDROP / EXPRESS</th>
                                                <th className="p-2.5 text-center border-r border-sky-800 min-w-[90px]">KODE PACKING</th>
                                                <th className="p-2.5 border-r border-sky-800 min-w-[120px]">UP</th>
                                                <th className="p-2.5 border-r border-sky-800 min-w-[120px]">TELEPON</th>
                                                <th className="p-2.5 text-center border-r border-sky-800 min-w-[120px]">ZONASI</th>
                                                <th className="p-2.5 border-r border-sky-800 min-w-[180px]">KETERANGAN</th>
                                                <th className="p-2.5 text-center min-w-[120px]">KODE GROUP CARTER</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {dataValid.map((row, idx) => {
                                                const isEditing = editIdx === idx;
                                                return (
                                                    <tr key={idx} className="hover:bg-sky-50/50 transition">
                                                        <td className="p-2.5 text-center font-bold text-slate-500 border-r border-slate-100">{idx + 1}</td>

                                                        {/* Tombol Aksi Edit & Delete */}
                                                        <td className="p-2.5 text-center border-r border-slate-100">
                                                            {isEditing ? (
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSaveEdit(idx)}
                                                                        className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition cursor-pointer"
                                                                        title="Simpan"
                                                                    >
                                                                        <Check size={14} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleCancelEdit}
                                                                        className="p-1 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded transition cursor-pointer"
                                                                        title="Batal"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleStartEdit(idx, row)}
                                                                        className="p-1 text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                                                                        title="Edit"
                                                                    >
                                                                        <Edit3 size={14} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteRow(idx)}
                                                                        className="p-1 text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                                                        title="Hapus"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>

                                                        <td className="p-2.5 font-bold text-slate-800 uppercase border-r border-slate-100 w-[300px] min-w-[280px] max-w-[320px] whitespace-normal">
                                                            <div className="leading-tight">{row.consignee}</div>
                                                            {row.dn_list && (
                                                                <div className="mt-1 text-[10px] text-sky-700 font-mono font-normal break-words leading-relaxed bg-sky-50/70 p-1 rounded border border-sky-100">
                                                                    <span className="font-bold text-slate-600">DN: </span>{row.dn_list}
                                                                </div>
                                                            )}
                                                        </td>

                                                        <td className="p-2.5 text-slate-600 border-r border-slate-100 max-w-xs truncate" title={row.address}>
                                                            {row.address || "-"}
                                                        </td>

                                                        {/* Wilayah Editable */}
                                                        <td className="p-2.5 border-r border-slate-100">
                                                            {isEditing ? (
                                                                <input
                                                                    type="text"
                                                                    value={editRow.propinsi || ""}
                                                                    onChange={(e) => setEditRow({ ...editRow, propinsi: e.target.value })}
                                                                    className="w-full p-1 border border-sky-400 rounded text-xs"
                                                                />
                                                            ) : (row.propinsi || "-")}
                                                        </td>
                                                        <td className="p-2.5 border-r border-slate-100">
                                                            {isEditing ? (
                                                                <input
                                                                    type="text"
                                                                    value={editRow.kota || ""}
                                                                    onChange={(e) => setEditRow({ ...editRow, kota: e.target.value })}
                                                                    className="w-full p-1 border border-sky-400 rounded text-xs"
                                                                />
                                                            ) : (row.kota || "-")}
                                                        </td>
                                                        <td className="p-2.5 border-r border-slate-100">
                                                            {isEditing ? (
                                                                <input
                                                                    type="text"
                                                                    value={editRow.kecamatan || ""}
                                                                    onChange={(e) => setEditRow({ ...editRow, kecamatan: e.target.value })}
                                                                    className="w-full p-1 border border-sky-400 rounded text-xs"
                                                                />
                                                            ) : (row.kecamatan || "-")}
                                                        </td>
                                                        <td className="p-2.5 border-r border-slate-100">
                                                            {isEditing ? (
                                                                <input
                                                                    type="text"
                                                                    value={editRow.kelurahan || ""}
                                                                    onChange={(e) => setEditRow({ ...editRow, kelurahan: e.target.value })}
                                                                    className="w-full p-1 border border-sky-400 rounded text-xs"
                                                                />
                                                            ) : (row.kelurahan || "-")}
                                                        </td>
                                                        <td className="p-2.5 border-r border-slate-100">
                                                            {isEditing ? (
                                                                <input
                                                                    type="text"
                                                                    value={editRow.kodepos || ""}
                                                                    onChange={(e) => setEditRow({ ...editRow, kodepos: e.target.value })}
                                                                    className="w-20 p-1 border border-sky-400 rounded text-xs text-center"
                                                                />
                                                            ) : (row.kodepos || "-")}


                                                        </td>

                                                        <td className="p-2.5 text-center font-bold border-r border-slate-100">{row.serv_id}</td>
                                                        <td className="p-2.5 text-center font-bold border-r border-slate-100">{row.layanan_id}</td>
                                                        <td className="p-2.5 text-center font-bold text-slate-800 border-r border-slate-100">{row.total_colly}</td>
                                                        <td className="p-2.5 text-right font-mono font-bold border-r border-slate-100">{row.total_weight}</td>
                                                        <td className="p-2.5 text-right font-mono border-r border-slate-100">{row.total_volume}</td>
                                                        <td className="p-2.5 text-right font-mono border-r border-slate-100">{row.total_packing}</td>
                                                        <td className="p-2.5 text-center font-mono border-r border-slate-100">{row.kode_kendaraan || "-"}</td>
                                                        <td className="p-2.5 text-right font-mono border-r border-slate-100">{Number(row.harga || 0).toLocaleString("id-ID")}</td>
                                                        <td className="p-2.5 text-center font-bold border-r border-slate-100">{row.is_dg}</td>
                                                        <td className="p-2.5 text-center font-bold border-r border-slate-100">{row.is_multidrop}</td>
                                                        <td className="p-2.5 text-center font-mono border-r border-slate-100">{row.kode_packing || "-"}</td>
                                                        <td className="p-2.5 border-r border-slate-100">{row.up || "-"}</td>
                                                        <td className="p-2.5 border-r border-slate-100 font-mono text-[11px]">{row.telp || "-"}</td>
                                                        <td className="p-2.5 text-center border-r border-slate-100">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${row.status_wilayah === "DALAM KOTA" ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"}`}>
                                                                {row.status_wilayah}
                                                            </span>
                                                        </td>
                                                        <td className="p-2.5 text-slate-600 border-r border-slate-100">{row.keterangan || "-"}</td>
                                                        <td className="p-2.5 text-center font-mono font-bold text-slate-700">{row.kode_group_carter || "-"}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* TAB 2: DATA TERTOLAK */}
                            {activeTab === "rejected" && (
                                <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                                        <div className="flex items-center gap-2.5 text-rose-800 text-xs">
                                            <AlertCircle size={20} className="shrink-0" />
                                            <span>
                                                Sebanyak <b>{dataRejected.length} baris dokumen</b> tidak diproses karena nama Consignee tidak ditemukan di database sebagai Anak Customer dari <b>{selectedCust?.cust_name}</b>.
                                            </span>
                                        </div>
                                        {dataRejected.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleDownloadRejected}
                                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-xs cursor-pointer uppercase shrink-0"
                                            >
                                                <Download size={14} /> Download Data Tertolak (CSV)
                                            </button>
                                        )}
                                    </div>

                                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-rose-700 text-white text-[11px] font-bold uppercase sticky top-0">
                                                <tr>
                                                    <th className="p-2.5 text-center">NO</th>
                                                    <th className="p-2.5">CONSIGNEE (DI CSV)</th>
                                                    <th className="p-2.5">ALAMAT</th>
                                                    <th className="p-2.5">NO. DN / SJ</th>
                                                    <th className="p-2.5 text-center">KOLLI</th>
                                                    <th className="p-2.5 text-right">BERAT</th>
                                                    <th className="p-2.5">ALASAN PENOLAKAN</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {dataRejected.map((r, idx) => (
                                                    <tr key={idx} className="hover:bg-rose-50/50 transition">
                                                        <td className="p-2.5 text-center font-bold text-slate-500">{r.no}</td>
                                                        <td className="p-2.5 font-bold text-rose-900 uppercase">{r.consignee}</td>
                                                        <td className="p-2.5 text-slate-600 max-w-xs truncate" title={r.address}>{r.address || "-"}</td>
                                                        <td className="p-2.5 font-mono font-bold text-slate-700">{r.no_dn || "-"}</td>
                                                        <td className="p-2.5 text-center font-bold text-slate-800">{r.colly}</td>
                                                        <td className="p-2.5 text-right font-mono font-semibold">{r.weight}</td>
                                                        <td className="p-2.5 text-rose-700 font-semibold">{r.alasan_tolak}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Footer Modal */}
                        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowReviewModal(false)}
                                disabled={savingBatch}
                                className="px-5 h-10 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
                            >
                                BATAL
                            </button>
                            <button
                                type="button"
                                onClick={handleFinalSave}
                                disabled={savingBatch || dataValid.length === 0}
                                className="px-6 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                            >
                                {savingBatch ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                                {savingBatch ? "MENYIMPAN BATCH..." : `KONFIRMASI & SIMPAN (${dataValid.length} BTT)`}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}