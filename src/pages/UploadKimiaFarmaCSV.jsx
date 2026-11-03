import React, { useState, useEffect } from 'react';
import {
    Upload, FileText, Download, AlertCircle, CheckCircle2,
    X, RefreshCw, ChevronDown, ChevronUp, Info, HelpCircle
} from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../api/axios';
import { useDarkMode } from '../context/DarkModeContext';

const UploadKimiaFarmaCSV = () => {
    const { isDarkMode } = useDarkMode();

    // State Input Form
    const [selectedCustomer, setSelectedCustomer] = useState({
        id: '0010000073',
        name: 'PT. KIMIA FARMA TBK - NDC'
    });
    const [searchCustQuery, setSearchCustQuery] = useState('PT. KIMIA FARMA');
    const [showCustDropdown, setShowCustDropdown] = useState(false);
    const [custList, setCustList] = useState([]);
    const [searchingCust, setSearchingCust] = useState(false);

    const [delimiter, setDelimiter] = useState(';');
    const [tipePengiriman, setTipePengiriman] = useState('DALAM_KOTA'); // DALAM_KOTA (38 kol) | LUAR_KOTA (37 kol)
    const [selectedFile, setSelectedFile] = useState(null);

    // State UI & Preview
    const [showGuideline, setShowGuideline] = useState(true);
    const [showSOPModal, setShowSOPModal] = useState(true); // Otomatis muncul seperti file ASP lawas
    const [loadingUpload, setLoadingUpload] = useState(false);
    const [previewData, setPreviewData] = useState([]);

    // Live search customer
    useEffect(() => {
        const query = searchCustQuery.trim();
        if (query.length < 2) return;

        const delay = setTimeout(async () => {
            setSearchingCust(true);
            try {
                const token = localStorage.getItem('token');
                const clean = query.replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
                const res = await api.get(`/customer?search=${encodeURIComponent(clean)}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCustList(res.data?.data || []);
            } catch (err) {
                console.warn("Gagal load customer:", err);
            } finally {
                setSearchingCust(false);
            }
        }, 300);

        return () => clearTimeout(delay);
    }, [searchCustQuery]);

    // Handle File Change & Quick Parsing
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.csv')) {
            Swal.fire('File Tidak Valid', 'Hanya diperbolehkan mengunggah file berekstensi .csv', 'warning');
            e.target.value = '';
            setSelectedFile(null);
            setPreviewData([]);
            return;
        }

        setSelectedFile(file);

        // Baca 5 baris pertama untuk preview visual
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target.result;
            const lines = text.split(/\r\n|\n/).filter(l => l.trim() !== '');
            if (lines.length > 0) {
                const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
                const rows = [];
                for (let i = 1; i < Math.min(lines.length, 6); i++) {
                    const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
                    const rowObj = {};
                    headers.forEach((h, idx) => {
                        rowObj[h] = cols[idx] || '';
                    });
                    rows.push(rowObj);
                }
                setPreviewData(rows);
            }
        };
        reader.readAsText(file);
    };

    // Download Template CSV Resmi
    const handleDownloadTemplate = () => {
        let headers = [];
        let sampleRow = [];

        if (tipePengiriman === 'DALAM_KOTA') {
            headers = [
                'GroupDN', 'NoDN', 'Pengirim', 'AlamatPengirim', 'KotaPengirim', 'TelpPengirim',
                'Penerima', 'Kategori', 'UpPenerima', 'AlamatPenerima', 'TelpPenerima', 'Propinsi',
                'KotaPenerima', 'Kecamatan', 'Kelurahan', 'Kodepos', 'IsiKiriman', 'Koli',
                'Berat', 'BeratVol', 'Volume', 'BiayaPenerus', 'PackingYN', 'BahanPacking',
                'BiayaPacking', 'AsuransiYN', 'NilaiAsuransi', 'PickupFrom', 'LayananID',
                'Keterangan', 'Service', 'Harga', 'Tanggal', 'NoMobil', 'JamMasuk', 'JamTiba', 'JamKeluar', 'NoSKB'
            ];
            sampleRow = [
                '1', '3000069221', 'PT. KIMIA FARMA TBK - NDC 1', 'JL VETERAN NO. 9, GAMBIR', 'JAKARTA PUSAT', '021123456',
                'KFTD SERANG', 'KFTD', '-', 'Jl. Ranca Utama No. 1', '081317173683', 'BANTEN',
                'SERANG KOTA', 'TAKTAKAN', 'PANGGUNGJATI', '42162', 'OBAT', '92',
                '819', '0', '4.999', '0', 'N', '-',
                '0', 'N', '0', 'PULO GADUNG', '1',
                'SINGLE DROP', 'R', '1411575', '10/30/2026', 'B9337KXU', '09:00', '09:00', '17:00', '3000069221'
            ];
        } else {
            headers = [
                'GroupDN', 'NoDN', 'Pengirim', 'AlamatPengirim', 'KotaPengirim', 'TelpPengirim',
                'Penerima', 'Kategori', 'UpPenerima', 'AlamatPenerima', 'TelpPenerima', 'Propinsi',
                'KotaPenerima', 'Kecamatan', 'Kelurahan', 'Kodepos', 'IsiKiriman', 'Koli',
                'Berat', 'BeratVol', 'Volume', 'BiayaPenerus', 'PackingYN', 'BahanPacking',
                'BiayaPacking', 'AsuransiYN', 'NilaiAsuransi', 'PickupFrom', 'LayananID',
                'Keterangan', 'Service', 'Tanggal', 'NoMobil', 'JamMasuk', 'JamTiba', 'JamKeluar', 'NoSKB'
            ];
            sampleRow = [
                '1', '3000069221', 'PT. KIMIA FARMA TBK - NDC 1', 'JL VETERAN NO. 9, GAMBIR', 'JAKARTA PUSAT', '021123456',
                'KFTD MEDAN', 'KFTD', 'RINI', 'Jl. Kemuning No. 18', '082345679047', 'SUMATERA UTARA',
                'MEDAN', 'MEDAN MAIMUN', 'MEDAN MAIMUN', '20115', 'OBAT', '25',
                '80', '95', '50', '34000', 'Y', 'KARDUS',
                '150000', 'Y', '8500000', 'WH MARUNDA', '1',
                'DO Asli Kembali Jatiasih', 'R', '10/30/2026', 'B1234ABC', '08:30', '16:00', '17:45', 'SKB001'
            ];
        }

        const csvContent = headers.join(delimiter) + '\r\n' + sampleRow.join(delimiter);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `TEMPLATE_CSV_KIMIA_FARMA_${tipePengiriman}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Submit Upload ke Backend
    const handleUploadReview = async (e) => {
        e.preventDefault();

        if (!selectedCustomer.id) {
            Swal.fire('Peringatan', 'Silakan pilih Customer Principal terlebih dahulu!', 'warning');
            return;
        }

        if (!selectedFile) {
            Swal.fire('Peringatan', 'Silakan pilih file CSV yang ingin diunggah!', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('cust_id', selectedCustomer.id);
        formData.append('cust_name', selectedCustomer.name);
        formData.append('delimiter', delimiter);
        formData.append('tipe_pengiriman', tipePengiriman);

        setLoadingUpload(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const res = await api.post(`/marketing/upload-kf-csv?pt_id=${ptId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });

            Swal.fire({
                title: 'BERHASIL DIUNGGAH!',
                text: res.data?.message || 'Data pesanan Kimia Farma berhasil diproses ke sistem.',
                icon: 'success',
                confirmButtonColor: '#0284c7'
            });

            setSelectedFile(null);
            setPreviewData([]);
            const fileInput = document.getElementById('csvFileInput');
            if (fileInput) fileInput.value = '';

        } catch (err) {
            Swal.fire('Gagal Upload', err.response?.data?.message || 'Terjadi kesalahan saat memproses file CSV.', 'error');
        } finally {
            setLoadingUpload(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* SOP MODAL POP-UP (Persis Logika ASP Lawas) */}
            {showSOPModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
                        <div className="bg-[#004b84] p-4 text-white flex justify-between items-center">
                            <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                                <HelpCircle size={18} className="text-amber-300" />
                                SOP Upload CSV Khusus Kimia Farma
                            </h3>
                            <button onClick={() => setShowSOPModal(false)} className="text-white/80 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 text-xs text-slate-700 space-y-3 leading-relaxed">
                            <ol className="list-decimal pl-4 space-y-2 font-medium">
                                <li>Pilih customer <b>PT. KIMIA FARMA TBK</b> terlebih dahulu.</li>
                                <li>Pilih <b>Delimiter</b> yang digunakan file CSV Anda (biasanya Titik Koma <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">;</code>).</li>
                                <li>Tentukan <b>Tipe Pengiriman</b> yang sesuai: <b>DALAM KOTA</b> (38 Kolom) atau <b>LUAR KOTA</b> (37 Kolom).</li>
                                <li>Pastikan format tanggal berformat <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">MM/DD/YYYY</code> (contoh: 10/30/2026).</li>
                                <li>Klik tombol <b>Download Template CSV</b> jika Anda belum memiliki format resminya.</li>
                            </ol>
                            <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded text-[11px] text-rose-800 font-bold mt-3">
                                * Catatan: Untuk kolom desimal (Berat/Volume), gunakan titik (.) bukan koma. Nilai kosong pada angka wajib diisi angka 0.
                            </div>
                            <div className="pt-3 text-center">
                                <button
                                    onClick={() => setShowSOPModal(false)}
                                    className="px-6 py-2.5 bg-[#004b84] hover:bg-[#003863] text-white font-bold rounded-xl uppercase transition shadow"
                                >
                                    SAYA MENGERTI
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER ATAS */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-sky-50 text-sky-700 rounded-xl border border-sky-100">
                        <Upload size={24} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-800 tracking-wide uppercase">
                            UPLOAD TRANSPORT PLANNING KHUSUS KIMIA FARMA (CSV)
                        </h1>
                        <p className="text-xs text-slate-500">
                            Import berkas pesanan massal dari principal logistik PT. Kimia Farma Tbk (38 Kolom)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowSOPModal(true)}
                        className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                        <HelpCircle size={14} className="text-sky-600" /> SOP Upload
                    </button>
                    <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
                    >
                        <Download size={14} /> DOWNLOAD TEMPLATE CSV
                    </button>
                </div>
            </div>

            {/* PANEL PANDUAN PENGISIAN */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
                <div
                    onClick={() => setShowGuideline(!showGuideline)}
                    className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center cursor-pointer select-none"
                >
                    <div className="flex items-center gap-2 font-black text-slate-700 tracking-wider uppercase text-[11px]">
                        <Info size={16} className="text-sky-600" />
                        PANDUAN & ATURAN PENGISIAN FILE CSV KIMIA FARMA
                    </div>
                    <button type="button" className="text-slate-400 hover:text-slate-600">
                        {showGuideline ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                {showGuideline && (
                    <div className="p-5 space-y-4 text-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="font-bold text-slate-800 mb-1">1. Format & Delimiter Berkas</div>
                                <div className="text-[11px] text-slate-500">
                                    File berekstensi <code className="font-mono text-rose-600 font-bold">.csv</code>.
                                    Gunakan pemisah <b>Titik Koma (;)</b> sesuai standar template resmi Kimia Farma dengan encoding UTF-8.
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="font-bold text-slate-800 mb-1">2. Baris Header & Jumlah Kolom</div>
                                <div className="text-[11px] text-slate-500">
                                    Baris pertama wajib berisi nama header kolom persis
                                    <b> {tipePengiriman === 'DALAM_KOTA' ? '38 Kolom (Termasuk Harga)' : '37 Kolom'}</b>.
                                </div>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                            <div className="font-bold text-slate-800 mb-2 uppercase text-[10px] tracking-wide">
                                URUTAN KOLOM RESMI FILE CSV ({tipePengiriman === 'DALAM_KOTA' ? '38 KOLOM' : '37 KOLOM'}):
                            </div>
                            <div className="p-2.5 bg-white border border-slate-200 rounded-lg font-mono text-[9.5px] text-slate-600 leading-relaxed overflow-x-auto whitespace-nowrap">
                                GroupDN; NoDN; Pengirim; AlamatPengirim; KotaPengirim; TelpPengirim; Penerima; Kategori; UpPenerima; AlamatPenerima; TelpPenerima; Propinsi; KotaPenerima; Kecamatan; Kelurahan; Kodepos; IsiKiriman; Koli; Berat; BeratVol; Volume; BiayaPenerus; PackingYN; BahanPacking; BiayaPacking; AsuransiYN; NilaiAsuransi; PickupFrom; LayananID; Keterangan; Service; {tipePengiriman === 'DALAM_KOTA' && 'Harga; '}Tanggal; NoMobil; JamMasuk; JamTiba; JamKeluar; NoSKB
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* FORM UPLOAD BERKAS */}
            <form onSubmit={handleUploadReview} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* 1. Customer */}
                    <div className="relative">
                        <label className="font-bold text-slate-700 block mb-1.5 uppercase text-[11px]">
                            PILIH CUSTOMER (PRINCIPAL/SHIPPER) <span className="text-rose-600 font-bold">*</span>
                        </label>
                        <input
                            type="text"
                            value={searchCustQuery}
                            onFocus={() => setShowCustDropdown(true)}
                            onChange={(e) => {
                                setSearchCustQuery(e.target.value);
                                setShowCustDropdown(true);
                            }}
                            placeholder="Ketik nama customer..."
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-sky-500 uppercase"
                        />
                        {showCustDropdown && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl max-h-52 overflow-y-auto z-50 divide-y divide-slate-100 text-xs">
                                {searchingCust ? (
                                    <div className="p-3 text-center text-slate-400 font-bold italic">Mencari...</div>
                                ) : custList.length > 0 ? (
                                    custList.map((c, i) => (
                                        <div
                                            key={i}
                                            onClick={() => {
                                                setSelectedCustomer({ id: c.cust_id, name: c.cust_name });
                                                setSearchCustQuery(`${c.cust_name} [${c.cust_id}]`);
                                                setShowCustDropdown(false);
                                            }}
                                            className="p-2.5 hover:bg-sky-50 cursor-pointer font-bold text-slate-800 flex justify-between items-center"
                                        >
                                            <span>{c.cust_name}</span>
                                            <span className="font-mono text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-[10px]">
                                                {c.cust_id}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-center text-slate-400 italic">Customer tidak ditemukan</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 2. Delimiter */}
                    <div>
                        <label className="font-bold text-slate-700 block mb-1.5 uppercase text-[11px]">
                            DELIMITER PEMISAH <span className="text-rose-600 font-bold">*</span>
                        </label>
                        <select
                            value={delimiter}
                            onChange={(e) => setDelimiter(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer"
                        >
                            <option value=";">TITIK KOMA ( ; ) — Rekomendasi Kimia Farma</option>
                            <option value=",">KOMA ( , )</option>
                        </select>
                    </div>

                    {/* 3. Tipe Pengiriman */}
                    <div>
                        <label className="font-bold text-slate-700 block mb-1.5 uppercase text-[11px]">
                            TIPE PENGIRIMAN <span className="text-rose-600 font-bold">*</span>
                        </label>
                        <select
                            value={tipePengiriman}
                            onChange={(e) => setTipePengiriman(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer"
                        >
                            <option value="DALAM_KOTA">DALAM KOTA (38 Kolom Termasuk Nilai Harga)</option>
                            <option value="LUAR_KOTA">LUAR KOTA (37 Kolom - Tarif Mengikuti Master)</option>
                        </select>
                    </div>
                </div>

                {/* File Input Box */}
                <div>
                    <label className="font-bold text-slate-700 block mb-1.5 uppercase text-[11px]">
                        PILIH FILE CSV KIMIA FARMA <span className="text-rose-600 font-bold">*</span>
                    </label>
                    <div className="border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-2xl p-6 text-center bg-slate-50/50 transition cursor-pointer relative">
                        <input
                            id="csvFileInput"
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div className="flex flex-col items-center justify-center space-y-2">
                            <FileText size={32} className="text-sky-600" />
                            <div className="font-bold text-slate-700 text-xs">
                                {selectedFile ? selectedFile.name : 'Klik atau seret berkas CSV Kimia Farma ke area ini'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                                {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Format wajib .csv berstandar UTF-8'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* PREVIEW TABEL 5 DATA PERTAMA */}
                {previewData.length > 0 && (
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wide">
                                PREVIEW FORMAT DATA TERBACA (5 BARIS PERTAMA)
                            </span>
                            <span className="font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold">
                                {Object.keys(previewData[0] || {}).length} Kolom Terdeteksi
                            </span>
                        </div>
                        <div className="border border-slate-300 rounded-lg overflow-x-auto max-h-48 bg-white text-[10px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#004b84] text-white uppercase font-bold sticky top-0">
                                    <tr>
                                        {Object.keys(previewData[0] || {}).map((col, idx) => (
                                            <th key={idx} className="p-2 border-r border-slate-600 whitespace-nowrap">{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-mono">
                                    {previewData.map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-sky-50">
                                            {Object.values(row).map((val, cIdx) => (
                                                <td key={cIdx} className="p-2 border-r border-slate-200 whitespace-nowrap">{val}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TOMBOL SUBMIT */}
                <div className="flex justify-end pt-3 border-t border-slate-100">
                    <button
                        type="submit"
                        disabled={loadingUpload || !selectedFile}
                        className={`px-8 py-2.5 font-black rounded-xl uppercase transition shadow-md text-xs flex items-center gap-2 ${loadingUpload || !selectedFile
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed select-none'
                                : 'bg-[#004b84] hover:bg-[#003863] text-white cursor-pointer active:scale-95'
                            }`}
                    >
                        {loadingUpload ? (
                            <>
                                <RefreshCw size={14} className="animate-spin" />
                                MEMPROSES UPLOAD...
                            </>
                        ) : (
                            <>
                                <Upload size={14} />
                                UPLOAD & PROSES DATA BTT
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default UploadKimiaFarmaCSV;