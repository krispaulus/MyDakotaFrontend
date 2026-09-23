import React, { useState } from 'react';
import { UploadCloud, FileCheck, CheckCircle2, RefreshCw, ArrowLeft, Truck, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import Swal from 'sweetalert2';

export default function UploadHasilLoperCSV({ isDarkMode = false }) {
    const [fileCSV, setFileCSV] = useState(null);
    const [loadingParse, setLoadingParse] = useState(false);
    const [parsedData, setParsedData] = useState([]);
    const [savingBatch, setSavingBatch] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && !file.name.toLowerCase().endsWith('.csv')) {
            Swal.fire({
                icon: 'warning',
                title: 'Format Salah',
                text: 'Hanya berkas berformat .csv yang diperbolehkan!',
                confirmButtonColor: '#f59e0b'
            });
            e.target.value = '';
            setFileCSV(null);
            return;
        }
        setFileCSV(file);
        setParsedData([]);
    };

    const handleParseCSV = async (e) => {
        e.preventDefault();
        if (!fileCSV) {
            Swal.fire({
                icon: 'warning',
                title: 'Berkas Kosong',
                text: 'Silakan pilih berkas CSV hasil loperan supir terlebih dahulu',
                confirmButtonColor: '#f59e0b'
            });
            return;
        }

        setLoadingParse(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', fileCSV);

            const res = await api.post('/marketing/hasil-loper/parse-csv', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            const data = res.data?.data || [];
            setParsedData(data);
            if (data.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'Pemberitahuan',
                    text: 'Tidak ada baris data pengantaran yang ditemukan di berkas ini',
                    confirmButtonColor: '#3b82f6'
                });
            }
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Gagal Membaca CSV',
                text: err.response?.data?.message || 'Terjadi kesalahan saat memproses berkas',
                confirmButtonColor: '#ef4444'
            });
        } finally {
            setLoadingParse(false);
        }
    };

    const handleSaveBatch = async () => {
        if (parsedData.length === 0) return;

        setSavingBatch(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/marketing/hasil-loper/save-batch', {
                rows: parsedData
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                icon: 'success',
                title: 'Berhasil Disimpan!',
                text: res.data?.message || 'Data hasil pengantaran supir berhasil diperbarui ke sistem',
                confirmButtonColor: '#10b981'
            });

            setParsedData([]);
            setFileCSV(null);
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Gagal Menyimpan',
                text: err.response?.data?.message || 'Terjadi kendala saat menyimpan data hasil loper',
                confirmButtonColor: '#ef4444'
            });
        } finally {
            setSavingBatch(false);
        }
    };

    return (
        <div className={`p-6 min-h-screen space-y-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-[#f8fafc] text-slate-800'}`}>
            {/* Header Judul */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500 text-slate-900 rounded-xl shadow-md">
                        <Truck size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-wide uppercase">Upload CSV Data Loperan Supir</h1>
                        <p className="text-xs text-slate-400">Sinkronisasi berkas tanda terima barang (POD) hasil pengantaran supir kargo</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="px-4 h-10 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition shadow-sm"
                >
                    <ArrowLeft size={16} /> Kembali
                </button>
            </div>

            {/* Form Upload */}
            <form onSubmit={handleParseCSV} className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-5">
                <div className="text-xs font-black text-amber-600 uppercase tracking-widest border-b pb-2.5 flex items-center gap-2">
                    <FileCheck size={16} />
                    <span>Unggah Berkas Loperan</span>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-700 uppercase block mb-1.5">
                        Pilih File CSV yang dikirim oleh supir loperan : <span className="text-rose-500">*</span>[cite: 12]
                    </label>
                    <input
                        type="file"
                        accept=".csv"
                        required
                        onChange={handleFileChange}
                        className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200 cursor-pointer border border-slate-200 rounded-xl p-2"
                    />
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 text-slate-600">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <AlertCircle size={15} className="text-amber-500" />
                        <span>Format Kolom Berkas:</span>
                    </div>
                    <p className="font-mono text-[11px] text-slate-500">
                        Nomor BTT; Tanggal Terima; Nama Penerima; Status Kirim (DELIVERED / FAILED); Keterangan
                    </p>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                        type="submit"
                        disabled={loadingParse || !fileCSV}
                        className="px-6 h-11 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black rounded-xl shadow-md text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition"
                    >
                        {loadingParse ? <RefreshCw size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                        {loadingParse ? 'Memproses Berkas...' : 'Upload & Periksa Data'}
                    </button>
                </div>
            </form>

            {/* Tabel Pratinjau Hasil Parsing */}
            {parsedData.length > 0 && (
                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4 animate-in fade-in duration-200">
                    <div className="flex flex-wrap justify-between items-center pb-3 border-b border-slate-100 gap-2">
                        <span className="text-xs font-bold uppercase text-slate-700">
                            Pratinjau Hasil Pembacaan ({parsedData.length} Baris Dokumen)
                        </span>
                        <button
                            type="button"
                            onClick={handleSaveBatch}
                            disabled={savingBatch}
                            className="px-6 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition"
                        >
                            {savingBatch ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            {savingBatch ? 'Menyimpan...' : 'Konfirmasi & Sinkronkan Status'}
                        </button>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase sticky top-0">
                                <tr>
                                    <th className="p-3">NO. BTT</th>
                                    <th className="p-3">TANGGAL TERIMA</th>
                                    <th className="p-3">NAMA PENERIMA</th>
                                    <th className="p-3 text-center">STATUS KIRIM</th>
                                    <th className="p-3">KETERANGAN</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {parsedData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-3 font-mono font-bold text-indigo-600">{row.nomor_btt}</td>
                                        <td className="p-3 font-medium text-slate-700">{row.tanggal_terima}</td>
                                        <td className="p-3 font-bold text-slate-800 uppercase">{row.nama_penerima}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.status_kirim === 'DELIVERED'
                                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                                    : 'bg-rose-100 text-rose-700 border border-rose-300'
                                                }`}>
                                                {row.status_kirim}
                                            </span>
                                        </td>
                                        <td className="p-3 text-slate-500 italic">{row.keterangan || '-'}</td>
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