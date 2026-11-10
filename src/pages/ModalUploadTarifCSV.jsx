import React, { useState } from 'react';
import { Upload, X, Download, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../api/axios';

const ModalUploadTarifCSV = ({ isOpen, onClose, customer, onSuccess }) => {
    const [uploadType, setUploadType] = useState('cargo'); // 'cargo' | 'charter' | 'multidrop'
    const [csvFile, setCsvFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const token = localStorage.getItem('token');

    if (!isOpen || !customer) return null;

    const handleUploadCSV = async (e) => {
        e.preventDefault();
        if (!csvFile) {
            Swal.fire('Peringatan', 'Silakan pilih berkas CSV terlebih dahulu.', 'warning');
            return;
        }

        setUploading(true);
        const formPayload = new FormData();
        formPayload.append('file_csv', csvFile);
        formPayload.append('customer_id', customer.cust_id);
        formPayload.append('jenis_tarif', uploadType);

        try {
            const res = await api.post('/tarif/upload-csv', formPayload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.data?.status === "success") {
                onClose();
                setCsvFile(null);
                Swal.fire('Sukses!', `${res.data.inserted_count || 0} baris tarif berhasil disinkronisasi ke master database.`, 'success');
                if (onSuccess) onSuccess();
            }
        } catch (err) {
            Swal.fire('Gagal Unggah', err.response?.data?.message || err.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white text-slate-800 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-5 bg-[#004b84] text-white flex justify-between items-center">
                    <h3 className="font-black text-sm uppercase flex items-center gap-2">
                        <Upload size={18} /> Upload Master Tarif Customer
                    </h3>
                    <button onClick={onClose} className="text-white hover:text-rose-200 cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleUploadCSV} className="p-6 space-y-4 text-xs">
                    <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl">
                        <span className="font-bold text-sky-900 block">Customer Target:</span>
                        <span className="font-mono text-sky-700 font-bold">{customer.cust_id} - {customer.cust_name}</span>
                    </div>

                    <div>
                        <label className="block font-bold text-slate-700 uppercase mb-2">1. Pilih Kategori Tarif Yang Diunggah</label>
                        <div className="grid grid-cols-3 gap-2.5">
                            <label className={`p-3 border-2 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer font-bold text-center transition ${uploadType === 'cargo' ? 'border-[#004b84] bg-sky-50 text-[#004b84]' : 'border-slate-200 text-slate-600'}`}>
                                <input type="radio" name="uploadType" value="cargo" checked={uploadType === 'cargo'} onChange={() => setUploadType('cargo')} className="hidden" />
                                <span>📦 CARGO / REGULER</span>
                                <span className="text-[10px] font-normal text-slate-500">Berat, Volume, Kubikasi</span>
                            </label>

                            <label className={`p-3 border-2 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer font-bold text-center transition ${uploadType === 'charter' ? 'border-[#004b84] bg-sky-50 text-[#004b84]' : 'border-slate-200 text-slate-600'}`}>
                                <input type="radio" name="uploadType" value="charter" checked={uploadType === 'charter'} onChange={() => setUploadType('charter')} className="hidden" />
                                <span>🚚 CHARTER</span>
                                <span className="text-[10px] font-normal text-slate-500">Armada & Kota</span>
                            </label>

                            <label className={`p-3 border-2 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer font-bold text-center transition ${uploadType === 'multidrop' ? 'border-[#004b84] bg-sky-50 text-[#004b84]' : 'border-slate-200 text-slate-600'}`}>
                                <input type="radio" name="uploadType" value="multidrop" checked={uploadType === 'multidrop'} onChange={() => setUploadType('multidrop')} className="hidden" />
                                <span>🔀 MULTIDROP</span>
                                <span className="text-[10px] font-normal text-slate-500">Drop Point & Express</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div>
                            <span className="font-bold text-slate-700 block">Belum punya berkas template?</span>
                            <span className="text-[11px] text-slate-500">Unduh template CSV yang sudah terisi ID customer ini.</span>
                        </div>
                        <a
                            href={`${api.defaults.baseURL}/master/tarif/download-template?jenis=${uploadType}&customer_id=${customer.cust_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-sm text-[11px]"
                        >
                            <Download size={13} /> Download Template
                        </a>
                    </div>

                    <div>
                        <label className="block font-bold text-slate-700 uppercase mb-1">2. Pilih Berkas CSV (.csv)</label>
                        <input
                            type="file"
                            accept=".csv"
                            required
                            onChange={(e) => setCsvFile(e.target.files[0])}
                            className="w-full p-2.5 border border-slate-300 rounded-xl file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-sky-100 file:text-sky-800 file:font-bold hover:file:bg-sky-200 cursor-pointer"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
                            Batal
                        </button>
                        <button type="submit" disabled={uploading} className="px-5 py-2 bg-[#004b84] hover:bg-[#003863] text-white rounded-xl font-bold flex items-center gap-1.5 shadow cursor-pointer">
                            {uploading ? <RefreshCw className="animate-spin" size={14} /> : <Upload size={14} />}
                            {uploading ? 'Memproses...' : 'Upload & Sinkronisasi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ModalUploadTarifCSV;