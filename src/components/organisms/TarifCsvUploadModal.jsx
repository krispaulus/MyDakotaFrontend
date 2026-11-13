import React, { useState } from 'react';
import { Upload, Download, FileSpreadsheet, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../../api/axios';
import Swal from 'sweetalert2';

// Konfigurasi Template & Kolom untuk ke-7 Master Tarif
const TARIF_CONFIGS = {
    CARTER: {
        title: 'Master Tarif Carter',
        filename: 'Template_Tarif_Carter.csv',
        headers: ['agenid_asal', 'kend_jenis', 'tujuan_propinsi', 'tujuan_kabupaten', 'hargapokok', 'keterangan'],
        sample: [
            ['001', 'K0005', 'JAWA BARAT', 'BEKASI', '2500000', 'FUSO LONG JABODETABEK'],
            ['001', 'K0002', 'BANTEN', 'CILEGON', '1850000', 'CDD VIA TOL MERAK'],
        ],
    },
    CUSTOMER: {
        title: 'Master Tarif Customer',
        filename: 'Template_Tarif_Customer.csv',
        headers: ['cust_id', 'tujuan_kabupaten', 'tujuan_kecamatan', 'tujuan_kelurahan', 'tujuan_kodepos', 'min_charge', 'tarif_kg', 'jns_kend', 'harga_dg'],
        sample: [
            ['0010000021', 'SURABAYA', 'GUBENG', 'AIRLANGGA', '60286', '10', '4500', '', '0'],
            ['0010000021', 'CILEGON', 'PULOMERAK', '', '42436', '0', '1650000', 'GMAX1', '1850000'],
        ],
    },
    PAKET: {
        title: 'Master Tarif Paket (Reguler)',
        filename: 'Template_Tarif_Paket.csv',
        headers: ['agenid_asal', 'tujuan_propinsi', 'tujuan_kabupaten', 'tujuan_kecamatan', 'hargapokok', 'hargakgselanjutnya', 'minimalkg', 'biayatambahan', 'estimasihari'],
        sample: [
            ['001', 'JAWA TIMUR', 'SIDOARJO', 'BUDURAN', '4500', '4000', '10', '0', '2'],
        ],
    },
    PAKET_EKONOMIS: {
        title: 'Master Tarif Paket Ekonomis',
        filename: 'Template_Tarif_Paket_Ekonomis.csv',
        headers: ['agenid_asal', 'tujuan_propinsi', 'tujuan_kabupaten', 'tujuan_kecamatan', 'hargapokok', 'hargakgselanjutnya', 'minimalkg', 'biayatambahan', 'estimasihari'],
        sample: [
            ['001', 'JAWA TENGAH', 'SEMARANG', 'TEMBALANG', '3000', '2800', '30', '0', '3'],
        ],
    },
    PAKET_UMUM: {
        title: 'Master Tarif Paket Umum',
        filename: 'Template_Tarif_Paket_Umum.csv',
        headers: ['agenid_asal', 'tujuan_propinsi', 'tujuan_kabupaten', 'tujuan_kecamatan', 'hargapokok', 'hargakgselanjutnya', 'minimalkg', 'biayatambahan', 'estimasihari'],
        sample: [
            ['001', 'DKI JAKARTA', 'JAKARTA TIMUR', 'JATINEGARA', '2500', '2500', '5', '0', '1'],
        ],
    },
    UNIT: {
        title: 'Master Tarif Unit',
        filename: 'Template_Tarif_Unit.csv',
        headers: ['agenid_asal', 'tujuan_kabupaten', 'tujuan_kecamatan', 'jenis_unit', 'harga', 'keterangan'],
        sample: [
            ['001', 'BANDUNG', 'COBLONG', 'MOTOR BEBEK / MATIC', '450000', 'PER UNIT MOTOR'],
        ],
    },
    JENIS_KENDARAAN: {
        title: 'Master Jenis Kendaraan Carter',
        filename: 'Template_Jenis_Kendaraan_Carter.csv',
        headers: ['jenis_id', 'jenis_merk', 'jenis_model', 'jenis_hargasewa'],
        sample: [
            ['K0015', 'GRAN MAX', 'BLIND VAN / BOX', '1200000'],
        ],
    },
};

export default function TarifCsvUploadModal({ tarifType = 'CARTER', onSuccess, buttonLabel = 'Upload CSV' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [file, setFile] = useState(null);
    const [previewRows, setPreviewRows] = useState([]);
    const [previewHeaders, setPreviewHeaders] = useState([]);
    const [uploading, setUploading] = useState(false);

    const cfg = TARIF_CONFIGS[tarifType] || TARIF_CONFIGS.CARTER;

    const handleDownloadTemplate = () => {
        const csvLines = [
            cfg.headers.join(';'),
            ...cfg.sample.map((r) => r.join(';')),
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvLines], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = cfg.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleFileChange = (e) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        setFile(selected);

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = String(evt.target?.result || '').replace(/^\uFEFF/, '');
            const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
            if (lines.length === 0) return;

            const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
            const parsed = lines.slice(0, 16).map((line) => line.split(sep).map((c) => c.trim()));
            setPreviewHeaders(parsed[0] || []);
            setPreviewRows(parsed.slice(1));
        };
        reader.readAsText(selected);
    };

    const handleUpload = async () => {
        if (!file) {
            return Swal.fire('Peringatan', 'Pilih file CSV terlebih dahulu!', 'warning');
        }

        setUploading(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('tarif_type', tarifType);

            const res = await api.post('/master/tarif/import-csv', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });

            const { inserted = 0, updated = 0, skipped = 0, errors = [] } = res.data || {};
            setIsOpen(false);
            setFile(null);
            setPreviewRows([]);

            Swal.fire({
                icon: 'success',
                title: `Import ${cfg.title} Selesai!`,
                html: `
                    <div class="text-left text-xs space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div>✅ Data Baru Ditambahkan: <b class="text-emerald-600">${inserted} baris</b></div>
                        <div>🔄 Data Lama Diperbarui: <b class="text-sky-600">${updated} baris</b></div>
                        <div>⚠️ Baris Dilewati: <b class="text-amber-600">${skipped} baris</b></div>
                        ${errors.length > 0 ? `<div class="mt-2 pt-2 border-t text-rose-600 max-h-28 overflow-y-auto">${errors.slice(0, 10).join('<br/>')}</div>` : ''}
                    </div>
                `,
            });

            if (onSuccess) onSuccess();
        } catch (err) {
            Swal.fire('Gagal Import CSV', err.response?.data?.message || err.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
            {/* TOMBOL PEMICU UPLOAD CSV */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95"
            >
                <Upload size={14} /> {buttonLabel}
            </button>

            {/* MODAL UPLOAD & PREVIEW CSV */}
            {isOpen && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-3.5 bg-[#004b84] text-white flex items-center justify-between">
                            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider">
                                <FileSpreadsheet size={16} /> IMPORT MASSAL CSV — {cfg.title}
                            </div>
                            <button type="button" onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto text-xs">
                            {/* Langkah 1: Download Template */}
                            <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="font-black text-sky-900 uppercase">1. Unduh Format Template CSV</div>
                                    <div className="text-[11px] text-sky-700 mt-0.5">
                                        Kolom wajib: <span className="font-mono font-bold">{cfg.headers.join(', ')}</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg text-xs uppercase flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Download size={14} /> Download Template CSV
                                </button>
                            </div>

                            {/* Langkah 2: Pilih File CSV */}
                            <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl space-y-2">
                                <label className="font-black text-slate-700 uppercase block">2. Pilih File CSV yang Sudah Diisi</label>
                                <input
                                    type="file"
                                    accept=".csv,text/csv"
                                    onChange={handleFileChange}
                                    className="w-full text-xs text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-900 file:text-white hover:file:bg-indigo-950 cursor-pointer"
                                />
                            </div>

                            {/* Preview Tabel */}
                            {previewRows.length > 0 && (
                                <div className="space-y-1.5">
                                    <div className="font-black text-slate-700 uppercase">
                                        Preview Data ({previewRows.length} baris pertama):
                                    </div>
                                    <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-56">
                                        <table className="w-full text-left border-collapse text-[11px]">
                                            <thead className="bg-slate-100 text-slate-700 font-bold uppercase sticky top-0">
                                                <tr>
                                                    {previewHeaders.map((h, idx) => (
                                                        <th key={idx} className="p-2 border-b">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-mono">
                                                {previewRows.map((r, rIdx) => (
                                                    <tr key={rIdx} className="hover:bg-slate-50">
                                                        {previewHeaders.map((_, cIdx) => (
                                                            <td key={cIdx} className="p-2">{r[cIdx] || '-'}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="px-5 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs uppercase cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={!file || uploading}
                                onClick={handleUpload}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black rounded-xl text-xs uppercase flex items-center gap-1.5 cursor-pointer"
                            >
                                {uploading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                {uploading ? 'Memproses...' : 'Proses & Simpan ke Database'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}