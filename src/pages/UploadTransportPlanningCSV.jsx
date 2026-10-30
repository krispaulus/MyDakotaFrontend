import React, { useState, useEffect, useRef } from "react";
import {
    UploadCloud, CheckCircle2, RefreshCw, X, Building,
    ArrowRight, Table, Download, Info, ChevronDown, ChevronUp, AlertCircle,
    Edit3, Trash2, Check, AlertTriangle, ArrowLeft, DollarSign
} from "lucide-react";
import api from "../api/axios";
import Swal from "sweetalert2";
import EditWilayahModal from '../components/organisms/EditWilayahModal';

export default function UploadTransportPlanningCSV({ isDarkMode = false }) {
    const [queryCust, setQueryCust] = useState("");
    const [suggestList, setSuggestList] = useState([]);
    const [selectedCust, setSelectedCust] = useState(null);
    const [showSuggest, setShowSuggest] = useState(false);
    const suggestRef = useRef(null);

    const [fileCSV, setFileCSV] = useState(null);

    const [editingRowIndex, setEditingRowIndex] = useState(null);
    const [isEditWilayahOpen, setIsEditWilayahOpen] = useState(false);
    const [loadingParse, setLoadingParse] = useState(false);
    const [dataValid, setDataValid] = useState([]);
    const [dataRejected, setDataRejected] = useState([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [activeTab, setActiveTab] = useState("valid");

    // 🌟 State Alur Dua Tahap: Preview 1 vs Preview 2
    const [currentStep, setCurrentStep] = useState(1); // 1 = Preview 1, 2 = Preview 2
    const [loadingPreview2, setLoadingPreview2] = useState(false);
    const [summaryPreview2, setSummaryPreview2] = useState({
        totalAkanProses: 0,
        totalDilewati: 0,
        grandTotalHarga: 0,
        grandTotalPacking: 0
    });

    // Inline Editing di Preview 1
    const [editIdx, setEditIdx] = useState(null);
    const [editRow, setEditRow] = useState({});

    const [savingBatch, setSavingBatch] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

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
        setCurrentStep(1);
    };

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

    // Eksekusi PREVIEW 1
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
            setCurrentStep(1); // Mulai dari Preview 1

            if (valid.length === 0 && rejected.length === 0) {
                Swal.fire("Pemberitahuan", "Berkas CSV tidak memiliki baris data yang terbaca.", "info");
            } else {
                setActiveTab(valid.length > 0 ? "valid" : "rejected");
                setShowReviewModal(true);
            }
        } catch (err) {
            Swal.fire("Gagal", err.response?.data?.message || "Gagal membaca berkas CSV", "error");
        } finally {
            setLoadingParse(false);
        }
    };

    // 🌟 Masuk ke PREVIEW 2 (Kalkulasi Tarif Master & Biaya Packing & Cek Duplikat)
    const handleGoToPreview2 = async () => {
        if (dataValid.length === 0) return;

        setLoadingPreview2(true);
        try {
            const token = localStorage.getItem("token");
            const payload = {
                customer_id: selectedCust.cust_id,
                rows: dataValid,
            };

            const res = await api.post("/marketing/transport-planning/calculate-preview2", payload, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setDataValid(res.data?.rows || []);
            setSummaryPreview2({
                totalAkanProses: res.data?.total_akan_proses || 0,
                totalDilewati: res.data?.total_dilewati || 0,
                grandTotalHarga: res.data?.grand_total_harga || 0,
                grandTotalPacking: res.data?.grand_total_packing || 0,
            });

            setCurrentStep(2); // Pindah tampilan ke Preview 2
        } catch (err) {
            Swal.fire("Gagal", err.response?.data?.message || "Gagal mengkalkulasi tarif Preview 2", "error");
        } finally {
            setLoadingPreview2(false);
        }
    };

    const handleDeleteRow = (idx) => {
        setDataValid(prev => prev.filter((_, i) => i !== idx));
    };

    const handleStartEdit = (idx, row) => {
        setEditIdx(idx);
        setEditRow({ ...row });
    };

    const handleSaveEdit = (idx) => {
        setDataValid(prev => prev.map((item, i) => i === idx ? { ...editRow } : item));
        setEditIdx(null);
    };

    const handleCancelEdit = () => {
        setEditIdx(null);
        setEditRow({});
    };

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

    // Simpan Final ke Database (dari Preview 2)
    const handleFinalSave = async () => {
        if (summaryPreview2.totalAkanProses === 0) {
            Swal.fire("Perhatian", "Tidak ada data baru yang akan diproses (semua duplikat/dilewati).", "warning");
            return;
        }

        const confirm = await Swal.fire({
            title: "Konfirmasi Simpan ke Database?",
            text: `Anda akan memproses ${summaryPreview2.totalAkanProses} BTT ke database. Tindakan ini tidak dapat dibatalkan.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#059669",
            cancelButtonColor: "#64748b",
            confirmButtonText: "Ya, Proses ke Database!",
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
                title: "Berhasil Disimpan!",
                text: res.data?.message || "Data Transport Planning siap dibuatkan BTT.",
                confirmButtonColor: "#004b84",
            });

            setShowReviewModal(false);
            setDataValid([]);
            setDataRejected([]);
            setFileCSV(null);
            setQueryCust("");
            setSelectedCust(null);
            setCurrentStep(1);
        } catch (err) {
            Swal.fire("Gagal", err.response?.data?.message || "Gagal menyimpan batch", "error");
        } finally {
            setSavingBatch(false);
        }
    };

    const handleProceedToPreview2 = async () => {
        // 1. Validasi baris wilayah kosong
        const barisKosong = [];
        dataValid.forEach((row, index) => {
            const propinsiKosong = !row.propinsi || row.propinsi.trim() === '-' || row.propinsi.trim() === '';
            const kotaKosong = !row.kota || row.kota.trim() === '-' || row.kota.trim() === '';
            const kecamatanKosong = !row.kecamatan || row.kecamatan.trim() === '-' || row.kecamatan.trim() === '';
            const kelurahanKosong = !row.kelurahan || row.kelurahan.trim() === '-' || row.kelurahan.trim() === '';

            if (propinsiKosong || kotaKosong || kecamatanKosong || kelurahanKosong) {
                barisKosong.push({
                    no: index + 1,
                    consignee: row.consignee,
                    missing: [
                        propinsiKosong ? 'Propinsi' : null,
                        kotaKosong ? 'Kota' : null,
                        kecamatanKosong ? 'Kecamatan' : null,
                        kelurahanKosong ? 'Kelurahan' : null
                    ].filter(Boolean).join(', ')
                });
            }
        });

        if (barisKosong.length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Data Wilayah Belum Lengkap!',
                html: `
                <div class="text-left text-xs text-slate-700 space-y-2 p-3 bg-rose-50 border border-rose-200 rounded-xl mt-2 max-h-64 overflow-y-auto font-sans">
                    <p class="font-bold text-rose-800">
                        Ditemukan <b>${barisKosong.length} baris</b> dengan data wilayah belum lengkap. Seluruh wilayah wajib diisi sebelum masuk ke Preview 2!
                    </p>
                    <div class="divide-y divide-rose-100">
                        ${barisKosong.map((b) => `
                            <div class="py-1.5 flex items-start gap-2">
                                <span class="font-bold text-rose-600">[Baris ${b.no}]</span>
                                <div>
                                    <div class="font-bold text-slate-800">${b.consignee}</div>
                                    <div class="text-[11px] text-rose-600 font-medium">Kolom kosong: ${b.missing}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `,
                confirmButtonColor: '#004b84',
                confirmButtonText: 'OKE, SAYA LENGKAPI',
                customClass: { container: 'z-[999999]' }
            });
            return;
        }

        if (!selectedCust || !selectedCust.cust_id) {
            Swal.fire("Perhatian", "Customer Principal tidak terdeteksi. Silakan pilih ulang Customer.", "warning");
            return;
        }

        // 2. Kirim ke backend dengan selectedCust.cust_id
        setLoadingPreview2(true);
        console.log("%c🚀 [Frontend] Mengirim data ke /calculate-preview2...", "color: #0284c7; font-weight: bold;");
        console.log("Customer ID:", selectedCust.cust_id);
        console.log("Total Baris Valid:", dataValid.length);

        try {
            const token = localStorage.getItem('token');
            const payload = {
                customer_id: selectedCust.cust_id, // 👈 gunakan selectedCust.cust_id
                rows: dataValid
            };

            const res = await api.post('/marketing/transport-planning/calculate-preview2', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log("%c📥 [Frontend] Respon calculate-preview2:", "color: #10b981; font-weight: bold;", res.data);

            if (res.data && res.data.status === 'success') {
                setDataValid(res.data.rows || []);
                setSummaryPreview2({
                    totalAkanProses: res.data.total_akan_proses || 0,
                    totalDilewati: res.data.total_dilewati || 0,
                    grandTotalHarga: res.data.grand_total_harga || 0,
                    grandTotalPacking: res.data.grand_total_packing || 0
                });
                setCurrentStep(2); // Pindah ke tampilan Preview 2
            }
        } catch (err) {
            console.error("%c❌ [Frontend] Gagal calculate-preview2:", "color: #ef4444; font-weight: bold;", err);
            Swal.fire({
                icon: 'error',
                title: 'Gagal Kalkulasi Preview 2',
                text: err.response?.data?.message || err.message,
                confirmButtonColor: '#ef4444',
                customClass: { container: 'z-[999999]' }
            });
        } finally {
            setLoadingPreview2(false);
        }
    };

    const handleSaveUpdatedWilayah = async (updatedRow) => {
        // 1. Update tampilan lokal tabel Preview 1 seketika (responsif tanpa jeda)
        setDataValid(prev => {
            const next = [...prev];
            next[editingRowIndex] = updatedRow;
            return next;
        });

        // 2. Simpan permanen ke database mkt_m_customer_history_merck di latar belakang
        try {
            const token = localStorage.getItem('token');
            await api.post('/marketing/transport-planning/save-wilayah-history', {
                consignee: updatedRow.consignee,
                address: updatedRow.address,
                propinsi: updatedRow.propinsi,
                kota: updatedRow.kota,
                kecamatan: updatedRow.kecamatan,
                kelurahan: updatedRow.kelurahan,
                kodepos: updatedRow.kodepos
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log(`✅ [Auto-Learn] Wilayah untuk "${updatedRow.consignee}" berhasil disimpan permanen ke master database.`);
        } catch (err) {
            console.warn("⚠️ Gagal auto-save ke master wilayah:", err);
        }
    };

    return (
        <div className={`p-6 min-h-screen space-y-5 font-sans ${isDarkMode ? "bg-gray-900 text-white" : "bg-slate-50 text-slate-800"}`}>

            {/* Header Halaman & Action Download */}
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

            {/* 🌟 MODAL POP-UP (MENDUKUNG PREVIEW 1 & PREVIEW 2) 🌟 */}
            {showReviewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-[98vw] max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                        {/* Header Modal */}
                        <div className="px-6 py-3.5 bg-[#004b84] text-white flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md shrink-0">
                            <div className="flex items-center gap-2.5">
                                <Table size={20} className="text-sky-200" />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-sm font-black uppercase tracking-wider">
                                            {currentStep === 1 ? "PREVIEW 1 — REVIEW DATA TRANSPORT PLANNING" : "PREVIEW 2 — KONFIRMASI DATA & HARGA FINAL"}
                                        </h2>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${currentStep === 1 ? 'bg-amber-400 text-slate-900' : 'bg-emerald-400 text-slate-900'}`}>
                                            {currentStep === 1 ? "EDIT DATA" : "BELUM DISIMPAN KE DB"}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-sky-200 font-medium">
                                        Customer: {selectedCust?.cust_name} &bull; {dataValid.length} BTT Terbentuk (Hasil Grouping)
                                    </p>
                                </div>
                            </div>

                            {/* Tab Switcher (Hanya aktif di Preview 1) */}
                            {currentStep === 1 && (
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
                            )}
                        </div>

                        {/* Konten Modal */}
                        <div className="p-4 overflow-y-auto overflow-x-auto flex-1 space-y-4">

                            {/* 🌟 JIKA DI PREVIEW 2: TAMPILKAN 4 SUMMARY CARDS PERSIS ASP LAWAS 🌟 */}
                            {currentStep === 2 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 shrink-0">
                                    <div className="text-center p-3 bg-white rounded-xl shadow-xs border border-slate-100">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Akan Diproses</span>
                                        <span className="block text-2xl font-black text-emerald-600 mt-1">{summaryPreview2.totalAkanProses}</span>
                                    </div>
                                    <div className="text-center p-3 bg-white rounded-xl shadow-xs border border-slate-100">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Dilewati (Duplikat)</span>
                                        <span className="block text-2xl font-black text-amber-500 mt-1">{summaryPreview2.totalDilewati}</span>
                                    </div>
                                    <div className="text-center p-3 bg-white rounded-xl shadow-xs border border-slate-100">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total Baris</span>
                                        <span className="block text-2xl font-black text-[#004b84] mt-1">{dataValid.length}</span>
                                    </div>
                                    <div className="text-center p-3 bg-white rounded-xl shadow-xs border border-slate-100">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Estimasi Total Harga</span>
                                        <span className="block text-xl font-black text-sky-700 mt-1">
                                            Rp {Number(summaryPreview2.grandTotalHarga || 0).toLocaleString("id-ID")}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* TAB 1: DATA VALID (PREVIEW 1 & PREVIEW 2) */}
                            {activeTab === "valid" && (
                                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs min-w-max">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead className="bg-[#004b84] text-white text-[11px] font-bold uppercase sticky top-0 z-20">
                                            <tr>
                                                <th className="p-2.5 text-center border-r border-sky-800">NO</th>
                                                {currentStep === 1 && <th className="p-2.5 text-center border-r border-sky-800">AKSI</th>}
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
                                                <th className="p-2.5 text-center border-r border-sky-800">DG (B3)</th>
                                                <th className="p-2.5 text-center border-r border-sky-800">MULTIDROP</th>
                                                <th className="p-2.5 text-center border-r border-sky-800 min-w-[90px]">KODE PACKING</th>
                                                <th className="p-2.5 border-r border-sky-800 min-w-[120px]">UP</th>
                                                <th className="p-2.5 border-r border-sky-800 min-w-[120px]">TELEPON</th>
                                                <th className="p-2.5 text-center border-r border-sky-800 min-w-[120px]">KODE GROUP CARTER</th>

                                                {/* 🌟 KOLOM KHUSUS PREVIEW 2 (SUMBER HARGA, HARGA FINAL, BIAYA PACKING, STATUS) 🌟 */}
                                                {currentStep === 2 && (
                                                    <>
                                                        <th className="p-2.5 text-center border-r border-sky-800 min-w-[130px] bg-sky-900">SUMBER HARGA</th>
                                                        <th className="p-2.5 text-right border-r border-sky-800 min-w-[110px] bg-sky-900">HARGA FINAL (RP)</th>
                                                        <th className="p-2.5 text-right border-r border-sky-800 min-w-[110px] bg-sky-900">BIAYA PACKING</th>
                                                        <th className="p-2.5 text-center border-r border-sky-800 min-w-[120px] bg-sky-900">STATUS PROSES</th>
                                                    </>
                                                )}

                                                <th className="p-2.5 border-r border-sky-800 min-w-[180px]">KETERANGAN</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {dataValid.map((row, idx) => {
                                                const isEditing = editIdx === idx;
                                                const isRowDup = row.is_duplicate;
                                                return (
                                                    <tr key={idx} className={`transition ${isRowDup ? 'bg-amber-50/70 hover:bg-amber-100/70' : 'hover:bg-sky-50/50'}`}>
                                                        <td className="p-2.5 text-center font-bold text-slate-500 border-r border-slate-100">{idx + 1}</td>

                                                        {currentStep === 1 && (
                                                            <td className="p-2.5 text-center border-r border-slate-100 whitespace-nowrap">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    {/* Tombol Pensil: LANGSUNG BUKA MODAL AUTOCOMPLETE WILAYAH BTT */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setEditingRowIndex(idx);
                                                                            setIsEditWilayahOpen(true);
                                                                        }}
                                                                        title="Lengkapi Wilayah (Kecamatan, Kelurahan, Kodepos)"
                                                                        className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                                                    >
                                                                        <Edit3 size={15} />
                                                                    </button>

                                                                    {/* Tombol Hapus Baris */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteRow(idx)}
                                                                        title="Hapus Baris"
                                                                        className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                                    >
                                                                        <Trash2 size={15} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        )}

                                                        {/* Consignee dengan Wrap DN */}
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

                                                        {/* Wilayah */}
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

                                                        <td className="p-2.5 text-center font-bold border-r border-slate-100">{row.is_dg}</td>
                                                        <td className="p-2.5 text-center font-bold border-r border-slate-100">{row.is_multidrop}</td>
                                                        <td className="p-2.5 text-center font-mono border-r border-slate-100">{row.kode_packing || "-"}</td>
                                                        <td className="p-2.5 border-r border-slate-100">{row.up || "-"}</td>
                                                        <td className="p-2.5 border-r border-slate-100 font-mono text-[11px]">{row.telp || "-"}</td>
                                                        <td className="p-2.5 text-center font-mono font-bold text-slate-700 border-r border-slate-100">{row.kode_group_carter || "-"}</td>

                                                        {/* 🌟 DETAIL HARGA & STATUS DI PREVIEW 2 🌟 */}
                                                        {currentStep === 2 && (
                                                            <>
                                                                <td className="p-2.5 text-center border-r border-slate-100">
                                                                    {row.sumber_harga === "TARIF MASTER" && <span className="text-emerald-700 font-black">✓ MASTER TARIF</span>}
                                                                    {row.sumber_harga === "HARGA CSV" && <span className="text-amber-600 font-bold">⚠ HARGA CSV</span>}
                                                                    {row.sumber_harga === "TIDAK ADA" && <span className="text-rose-600 font-bold">✗ TIDAK ADA</span>}
                                                                </td>
                                                                <td className="p-2.5 text-right font-mono font-black text-slate-900 border-r border-slate-100">
                                                                    Rp {Number(row.harga_final || 0).toLocaleString("id-ID")}
                                                                </td>
                                                                <td className="p-2.5 text-right font-mono text-slate-700 border-r border-slate-100">
                                                                    {row.biaya_packing > 0 ? `Rp ${row.biaya_packing.toLocaleString("id-ID")}` : "-"}
                                                                </td>
                                                                <td className="p-2.5 text-center border-r border-slate-100">
                                                                    {row.is_duplicate ? (
                                                                        <div className="bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded text-[10px]">
                                                                            DILEWATI
                                                                            <span className="block text-[9px] font-mono">{row.existing_btt}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded text-[10px]">
                                                                            AKAN DIPROSES
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </>
                                                        )}

                                                        <td className="p-2.5 text-slate-600">{row.keterangan || "-"}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* TAB 2: DATA TERTOLAK */}
                            {activeTab === "rejected" && currentStep === 1 && (
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

                        {/* Footer Modal: Tombol Aksi Preview 1 & Preview 2 */}
                        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                            <div>
                                {currentStep === 2 && (
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(1)}
                                        className="px-4 h-10 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <ArrowLeft size={14} /> Kembali ke Preview 1 (Edit Data)
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowReviewModal(false)}
                                    disabled={savingBatch || loadingPreview2}
                                    className="px-5 h-10 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
                                >
                                    BATAL
                                </button>

                                {/* Di Preview 1: Tombol Lanjut ke Preview 2 */}
                                {currentStep === 1 && (
                                    <button
                                        type="button"
                                        onClick={handleProceedToPreview2}
                                        disabled={loadingPreview2 || dataValid.length === 0}
                                        className="px-6 h-10 bg-[#004b84] hover:bg-[#003863] text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                                    >
                                        {loadingPreview2 ? <RefreshCw size={15} className="animate-spin" /> : <DollarSign size={15} />}
                                        {loadingPreview2 ? "MENGHITUNG TARIF..." : "PREVIEW 2 (KONFIRMASI HARGA)"}
                                    </button>
                                )}

                                {/* Di Preview 2: Tombol Konfirmasi Simpan ke Database */}
                                {currentStep === 2 && (
                                    <button
                                        type="button"
                                        onClick={handleFinalSave}
                                        disabled={savingBatch || summaryPreview2.totalAkanProses === 0}
                                        className="px-6 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                                    >
                                        {savingBatch ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                                        {savingBatch ? "MENYIMPAN KE DATABASE..." : `KONFIRMASI & PROSES KE DATABASE (${summaryPreview2.totalAkanProses} BTT)`}
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            <EditWilayahModal
                isOpen={isEditWilayahOpen}
                onClose={() => {
                    setIsEditWilayahOpen(false);
                    setEditingRowIndex(null);
                }}
                rowData={editingRowIndex !== null ? dataValid[editingRowIndex] : null}
                onSave={handleSaveUpdatedWilayah}
            />

        </div>
    );
}