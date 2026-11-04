import React, { useState, useEffect } from 'react';
import {
    Upload, FileText, Download, X, RefreshCw,
    ChevronDown, ChevronUp, Info, HelpCircle, CheckCircle2, Printer
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

    // Auto-detect delimiter (; atau ,)
    const [detectedDelimiter, setDetectedDelimiter] = useState(';');
    const [tipePengiriman, setTipePengiriman] = useState('DALAM_KOTA');
    const [selectedFile, setSelectedFile] = useState(null);

    // State UI & Preview
    const [showGuideline, setShowGuideline] = useState(true);
    const [showSOPModal, setShowSOPModal] = useState(false);
    const [loadingUpload, setLoadingUpload] = useState(false);
    const [previewData, setPreviewData] = useState([]);
    const [summaryData, setSummaryData] = useState({
        totalDN: 0,
        totalKoli: 0,
        totalBerat: 0,
        totalHarga: 0
    });

    // Live search customer
    useEffect(() => {
        const query = searchCustQuery.trim();
        if (query.length < 2 || query.includes('[')) return;

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

    // Deteksi Delimiter
    const detectCsvDelimiter = (firstLine) => {
        const countSemicolon = (firstLine.match(/;/g) || []).length;
        const countComma = (firstLine.match(/,/g) || []).length;
        return countSemicolon >= countComma ? ';' : ',';
    };

    const cleanNumber = (val) => {
        if (!val) return 0;
        const sanitized = String(val).replace(/\./g, '').replace(',', '.').trim();
        const num = parseFloat(sanitized);
        return isNaN(num) ? 0 : num;
    };

    // Handle File Change & Auto-detect Delimiter
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

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target.result;
            const lines = text.split(/\r\n|\n/).filter(l => l.trim() !== '');
            if (lines.length > 0) {
                const autoSep = detectCsvDelimiter(lines[0]);
                setDetectedDelimiter(autoSep);

                const headers = lines[0].split(autoSep).map(h => h.trim().replace(/^"|"$/g, ''));
                const rows = [];
                let totKoli = 0;
                let totBerat = 0;
                let totHarga = 0;

                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].split(autoSep).map(c => c.trim().replace(/^"|"$/g, ''));
                    if (cols.length < 5) continue;

                    const rowObj = {};
                    headers.forEach((h, idx) => {
                        rowObj[h] = cols[idx] || '';
                    });

                    totKoli += parseInt(cleanNumber(rowObj['Koli'])) || 1;
                    totBerat += cleanNumber(rowObj['Berat']);
                    totHarga += cleanNumber(rowObj['Harga']);

                    rows.push(rowObj);
                }

                setPreviewData(rows);
                setSummaryData({
                    totalDN: rows.length,
                    totalKoli: totKoli,
                    totalBerat: totBerat,
                    totalHarga: totHarga
                });
            }
        };
        reader.readAsText(file);
    };

    // Download Template CSV Resmi
    const handleDownloadTemplate = () => {
        let headers = [
            'GroupDN', 'NoDN', 'Pengirim', 'AlamatPengirim', 'KotaPengirim', 'TelpPengirim',
            'Penerima', 'Kategori', 'UpPenerima', 'AlamatPenerima', 'TelpPenerima', 'Propinsi',
            'KotaPenerima', 'Kecamatan', 'Kelurahan', 'Kodepos', 'IsiKiriman', 'Koli',
            'Berat', 'BeratVol', 'Volume', 'BiayaPenerus', 'PackingYN', 'BahanPacking',
            'BiayaPacking', 'AsuransiYN', 'NilaiAsuransi', 'PickupFrom', 'LayananID',
            'Keterangan', 'Service', 'Harga', 'Tanggal', 'NoMobil', 'JamMasuk', 'JamTiba', 'JamKeluar', 'NoSKB'
        ];
        let sampleRow = [
            '1', '3000069221', 'PT. KIMIA FARMA TBK - NDC 1', 'JL VETERAN NO. 9, GAMBIR', 'JAKARTA PUSAT', '021123456',
            'KFTD SERANG', 'KFTD', '-', 'Jl. Ranca Utama Link. Ranca Tales No. 1', '081317173683', 'BANTEN',
            'SERANG KOTA', 'TAKTAKAN', 'PANGGUNGJATI', '42162', 'OBAT', '92',
            '819', '0', '4.999', '0', 'N', '-',
            '0', 'N', '0', 'PULO GADUNG', '1',
            'SINGLE DROP', 'R', '1411575', '11/03/2026', 'B9337KXU', '09:00', '09:00', '17:00', '3000069221'
        ];

        const csvContent = headers.join(';') + '\r\n' + sampleRow.join(';');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `TEMPLATE_CSV_KIMIA_FARMA.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Tombol BATAL
    const handleBatal = () => {
        setSelectedFile(null);
        setPreviewData([]);
        setSummaryData({ totalDN: 0, totalKoli: 0, totalBerat: 0, totalHarga: 0 });
        const fileInput = document.getElementById('csvFileInput');
        if (fileInput) fileInput.value = '';
    };

    // Tombol PROSES & PRINT
    const handleEksekusiSimpan = async (autoPrint = false) => {
        if (!selectedCustomer.id) {
            Swal.fire('Peringatan', 'Silakan pilih Customer Principal terlebih dahulu!', 'warning');
            return;
        }

        if (!selectedFile || previewData.length === 0) {
            Swal.fire('Peringatan', 'Silakan pilih file CSV yang ingin diunggah!', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('cust_id', selectedCustomer.id);
        formData.append('cust_name', selectedCustomer.name);
        formData.append('delimiter', detectedDelimiter);
        formData.append('tipe_pengiriman', tipePengiriman);

        setLoadingUpload(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const res = await api.post(`/marketing/customer-upload-CSV/upload-kimia-farma-csv?pt_id=${ptId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });

            const createdBtts = res.data?.btt_list || res.data?.data || [];

            Swal.fire({
                title: 'BERHASIL DISIMPAN!',
                text: res.data?.message || 'Data pesanan Kimia Farma berhasil masuk ke database BTT.',
                icon: 'success',
                confirmButtonColor: '#004b84'
            });

            if (autoPrint) {
                handlePrintManifest(previewData, createdBtts);
            }

            handleBatal();
        } catch (err) {
            Swal.fire('Gagal Menyimpan BTT', err.response?.data?.message || err.message, 'error');
        } finally {
            setLoadingUpload(false);
        }
    };

    // Cetak Manifest
    const handlePrintManifest = (rows, bttListGenerated) => {
        const printWindow = window.open('', '_blank', 'width=1150,height=850');
        if (!printWindow) return;

        const tableRowsHtml = rows.map((r, i) => {
            const bttNo = bttListGenerated[i]?.btt_id || bttListGenerated[i] || r['NoDN'] || '-';
            return `
                <tr style="font-size: 10px; font-family: monospace;">
                    <td style="border: 1px solid #333; padding: 4px; text-align: center;">${i + 1}</td>
                    <td style="border: 1px solid #333; padding: 4px; font-weight: bold; color: #004b84;">${bttNo}</td>
                    <td style="border: 1px solid #333; padding: 4px;">${r['NoDN'] || '-'}</td>
                    <td style="border: 1px solid #333; padding: 4px;">${r['Tanggal'] || '-'}</td>
                    <td style="border: 1px solid #333; padding: 4px;">${r['Penerima'] || '-'}</td>
                    <td style="border: 1px solid #333; padding: 4px;">${r['KotaPenerima'] || '-'}</td>
                    <td style="border: 1px solid #333; padding: 4px; text-align: center;">${r['Koli'] || 1}</td>
                    <td style="border: 1px solid #333; padding: 4px; text-align: right;">${cleanNumber(r['Berat']).toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid #333; padding: 4px; text-align: right; font-weight: bold;">Rp ${cleanNumber(r['Harga']).toLocaleString('id-ID')}</td>
                </tr>
            `;
        }).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>BUKTI MANIFEST UPLOAD KIMIA FARMA</title>
                <style>
                    @page { size: A4 portrait; margin: 8mm; }
                    body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 10px; color: #1e293b; }
                    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                    th { border: 1px solid #000; padding: 6px 3px; background-color: #e2e8f0; font-size: 9.5px; text-align: center; }
                    @media print { .no-print { display: none !important; } }
                </style>
            </head>
            <body>
                <div class="no-print" style="margin-bottom: 12px; text-align: right;">
                    <button style="background:#16a34a;color:white;padding:6px 16px;border:none;border-radius:4px;font-weight:bold;cursor:pointer;" onclick="window.print()">PRINT</button>
                    <button style="background:#e11d48;color:white;padding:6px 16px;border:none;border-radius:4px;font-weight:bold;cursor:pointer;margin-left:4px;" onclick="window.close()">TUTUP</button>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #004b84; padding-bottom:6px;">
                    <div>
                        <h2 style="margin:0; font-size:15px; font-weight:900; color:#004b84;">PT DAKOTA LOGISTIK INDONESIA</h2>
                        <div style="font-size:10px; color:#64748b;">BUKTI SERAH TERIMA / MANIFEST UPLOAD CSV KIMIA FARMA</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:10px; font-weight:bold;">TANGGAL PROSES: ${new Date().toLocaleDateString('id-ID')}</div>
                        <div style="font-size:10px; color:#64748b;">CUSTOMER: PT. KIMIA FARMA TBK</div>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width:3%;">NO</th>
                            <th style="width:16%;">NO. BTT</th>
                            <th style="width:13%;">NO. DN</th>
                            <th style="width:10%;">TANGGAL</th>
                            <th style="width:18%;">PENERIMA</th>
                            <th style="width:14%;">TUJUAN</th>
                            <th style="width:5%;">KOLI</th>
                            <th style="width:8%;">BERAT (KG)</th>
                            <th style="width:13%;">TARIF</th>
                        </tr>
                    </thead>
                    <tbody>${tableRowsHtml}</tbody>
                    <tfoot>
                        <tr style="background:#f8fafc; font-weight:bold; font-size:10px;">
                            <td colspan="6" style="border:1px solid #333; padding:5px; text-align:center;">TOTAL KESELURUHAN :</td>
                            <td style="border:1px solid #333; padding:5px; text-align:center;">${summaryData.totalKoli}</td>
                            <td style="border:1px solid #333; padding:5px; text-align:right;">${summaryData.totalBerat.toLocaleString('id-ID')}</td>
                            <td style="border:1px solid #333; padding:5px; text-align:right; color:#b91c1c;">Rp ${summaryData.totalHarga.toLocaleString('id-ID')}</td>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="space-y-6">
            {/* SOP MODAL POP-UP */}
            {showSOPModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
                        <div className="bg-[#004b84] p-4 text-white flex justify-between items-center">
                            <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                                <HelpCircle size={18} className="text-amber-300" />
                                SOP UPLOAD CSV KHUSUS KIMIA FARMA
                            </h3>
                            <button onClick={() => setShowSOPModal(false)} className="text-white/80 hover:text-white cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 text-xs text-slate-700 space-y-3 leading-relaxed">
                            <ol className="list-decimal pl-4 space-y-2 font-medium">
                                <li>Pilih customer <b>PT. KIMIA FARMA TBK</b>[cite: 14].</li>
                                <li>Tentukan <b>Tipe Pengiriman</b> yang sesuai: <b>DALAM KOTA</b> (38 Kolom) atau <b>LUAR KOTA</b> (37 Kolom)[cite: 14].</li>
                                <li>Pilih file CSV. Sistem otomatis mengenali pemisah titik koma (;) maupun koma (,) secara otomatis[cite: 14].</li>
                                <li>Pastikan format tanggal berformat <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">MM/DD/YYYY</code> atau <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">DD/MM/YYYY</code>[cite: 14].</li>
                                <li>Klik tombol <b>Download Template CSV</b> jika Anda ingin melihat susunan kolom standar[cite: 14].</li>
                            </ol>
                            <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded text-[11px] text-rose-800 font-bold mt-3">
                                * Catatan: Untuk kolom desimal (Berat/Volume), gunakan titik (.) bukan koma. Nilai kosong pada angka wajib diisi angka 0[cite: 13, 14].
                            </div>
                            <div className="pt-3 text-center">
                                <button
                                    onClick={() => setShowSOPModal(false)}
                                    className="px-6 py-2.5 bg-[#004b84] hover:bg-[#003863] text-white font-bold rounded-xl uppercase transition shadow cursor-pointer"
                                >
                                    SAYA MENGERTI
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER ATAS IDENTIK TAMPILAN AWAL (GAMBAR 1) */}
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
                            Import berkas pesanan massal dari principal logistik PT. Kimia Farma Tbk (Auto-Detect Delimiter)
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

            {/* PANEL PANDUAN PENGISIAN IDENTIK TAMPILAN AWAL */}
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
                                <div className="font-bold text-slate-800 mb-1">1. Format & Delimiter Berkas (Smart Auto-Detect)</div>
                                <div className="text-[11px] text-slate-500">
                                    File berekstensi <code className="font-mono text-rose-600 font-bold">.csv</code>. Sistem secara otomatis mendeteksi pemisah <b>Titik Koma (;)</b> maupun <b>Koma (,)</b>[cite: 14].
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="font-bold text-slate-800 mb-1">2. Baris Header & Jumlah Kolom</div>
                                <div className="text-[11px] text-slate-500">
                                    Baris pertama berisi nama header kolom persis
                                    <b> {tipePengiriman === 'DALAM_KOTA' ? '38 Kolom (Termasuk Nilai Harga)' : '37 Kolom (Tarif Master)'}</b>[cite: 14].
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

            {/* FORM UPLOAD BERKAS UTAMA IDENTIK GAMBAR 1 & 2 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Customer Picker */}
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

                    {/* Tipe Pengiriman */}
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

                {/* Box Drag & Drop File */}
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
                                {selectedFile
                                    ? `${(selectedFile.size / 1024).toFixed(1)} KB — Pemisah: "${detectedDelimiter}"`
                                    : 'Format wajib .csv berstandar UTF-8 (Pemisah Titik Koma atau Koma terdeteksi otomatis)'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* PREVIEW TABEL DATA REALTIME (TAMPIL DI BAWAH KOTAK FILE) */}
                {previewData.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden space-y-3 bg-white p-4 shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-emerald-600" />
                                <span className="font-black text-slate-800 text-xs uppercase tracking-wide">
                                    PRATINJAU DATA BTT ({summaryData.totalDN} RESI TERDETEKSI)
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px]">
                                <span className="text-slate-600 font-bold">Total Koli: <b>{summaryData.totalKoli}</b></span>
                                <span className="text-slate-600 font-bold">Total Berat: <b>{summaryData.totalBerat.toLocaleString('id-ID')} Kg</b></span>
                                <span className="text-rose-600 font-black">Total Tarif: <b>Rp {summaryData.totalHarga.toLocaleString('id-ID')}</b></span>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-56 bg-white text-[10px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#004b84] text-white uppercase font-bold sticky top-0 z-10">
                                    <tr>
                                        <th className="p-2 text-center w-8">NO</th>
                                        <th className="p-2">NO. DN / DO</th>
                                        <th className="p-2">TANGGAL</th>
                                        <th className="p-2">PENERIMA</th>
                                        <th className="p-2">ALAMAT</th>
                                        <th className="p-2">TUJUAN</th>
                                        <th className="p-2 text-center">KOLI</th>
                                        <th className="p-2 text-right">BERAT</th>
                                        <th className="p-2 text-right">VOLUME</th>
                                        <th className="p-2 text-right">HARGA (RP)</th>
                                        <th className="p-2">NO. MOBIL</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-mono">
                                    {previewData.map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-sky-50/50">
                                            <td className="p-2 text-center text-slate-500">{rIdx + 1}</td>
                                            <td className="p-2 font-bold text-sky-700">{row['NoDN'] || '-'}</td>
                                            <td className="p-2 text-slate-700">{row['Tanggal'] || '-'}</td>
                                            <td className="p-2 font-bold text-slate-800">{row['Penerima'] || '-'}</td>
                                            <td className="p-2 text-slate-600 max-w-xs truncate" title={row['AlamatPenerima']}>
                                                {row['AlamatPenerima'] || '-'}
                                            </td>
                                            <td className="p-2 text-slate-700">{row['KotaPenerima'] || '-'}</td>
                                            <td className="p-2 text-center font-bold">{row['Koli'] || 1}</td>
                                            <td className="p-2 text-right">{cleanNumber(row['Berat']).toLocaleString('id-ID')}</td>
                                            <td className="p-2 text-right">{row['Volume'] || '0'}</td>
                                            <td className="p-2 text-right font-bold text-emerald-700">
                                                {cleanNumber(row['Harga']).toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-2 text-slate-700">{row['NoMobil'] || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TOMBOL AKSI: BATAL, PRINT, PROSES */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                    <button
                        type="button"
                        disabled={loadingUpload || !selectedFile}
                        onClick={handleBatal}
                        className={`px-5 py-2.5 font-bold rounded-xl text-xs uppercase transition cursor-pointer flex items-center gap-1.5 ${!selectedFile
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                            }`}
                    >
                        <X size={14} /> BATAL
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={loadingUpload || !selectedFile}
                            onClick={() => handleEksekusiSimpan(true)}
                            className={`px-5 py-2.5 font-bold rounded-xl text-xs uppercase transition shadow-sm flex items-center gap-1.5 ${!selectedFile || loadingUpload
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed select-none'
                                : 'bg-sky-600 hover:bg-sky-700 text-white cursor-pointer active:scale-95'
                                }`}
                        >
                            <Printer size={14} /> PRINT (SIMPAN & CETAK)
                        </button>

                        <button
                            type="button"
                            disabled={loadingUpload || !selectedFile}
                            onClick={() => handleEksekusiSimpan(false)}
                            className={`px-7 py-2.5 font-black rounded-xl text-xs uppercase transition shadow-md flex items-center gap-2 ${!selectedFile || loadingUpload
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed select-none'
                                : 'bg-[#004b84] hover:bg-[#003863] text-white cursor-pointer active:scale-95'
                                }`}
                        >
                            {loadingUpload ? (
                                <>
                                    <RefreshCw size={14} className="animate-spin" />
                                    MEMPROSES...
                                </>
                            ) : (
                                <>
                                    <Upload size={14} />
                                    PROSES SIMPAN BTT
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadKimiaFarmaCSV;