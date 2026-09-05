import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { FileText, Download, Trash2, X, UploadCloud, FileSpreadsheet, HardDrive, Filter, RefreshCw, Eye, ExternalLink } from 'lucide-react';
import Swal from 'sweetalert2';

const DaftarFormHRD = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Deteksi Role
    const storedRole = (
        localStorage.getItem('role') ||
        localStorage.getItem('user_role') ||
        localStorage.getItem('level') ||
        localStorage.getItem('tipe') ||
        ''
    ).toUpperCase();

    const storedUser = (
        localStorage.getItem('username') ||
        localStorage.getItem('user_name') ||
        ''
    ).toLowerCase();

    const isAdmin =
        storedRole === 'S' ||
        storedRole === 'A' ||
        storedRole.includes('ADMIN') ||
        storedUser.includes('super') ||
        storedUser.includes('admin') ||
        storedRole === '';

    // State Filter
    const [showFilter, setShowFilter] = useState(false);
    const [filterKategori, setFilterKategori] = useState('ALL');
    const [filterKeyword, setFilterKeyword] = useState('');

    // State Modal Upload
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [formNama, setFormNama] = useState('');
    const [formKategori, setFormKategori] = useState('SOP & FORMULIR');
    const [formKeterangan, setFormKeterangan] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    // State Modal Preview
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewItem, setPreviewItem] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewLoading, setPreviewLoading] = useState(false);

    const fetchForms = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let url = '/hrd/form/list?';
            const params = [];

            if (filterKeyword.trim()) params.push(`search=${encodeURIComponent(filterKeyword.trim())}`);
            if (filterKategori !== 'ALL') params.push(`kategori=${encodeURIComponent(filterKategori)}`);

            url += params.join('&');

            const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setData(res.data?.data || []);
        } catch (err) {
            console.error('Gagal mengambil daftar form:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchForms();
    }, []);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        fetchForms();
    };

    const handleResetFilter = () => {
        setFilterKategori('ALL');
        setFilterKeyword('');
        setTimeout(() => {
            fetchForms();
        }, 50);
    };

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Handler View / Preview
    const handleView = async (item) => {
        const ext = String(item.form_filename || '').split('.').pop().toLowerCase();
        const canPreview = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'txt'].includes(ext);

        if (!canPreview) {
            Swal.fire({
                title: 'Tidak Mendukung Pratinjau',
                text: `File .${ext.toUpperCase()} tidak dapat ditampilkan di browser. Berkas akan langsung diunduh.`,
                icon: 'info',
                showCancelButton: true,
                confirmButtonText: 'Download Sekarang',
                cancelButtonText: 'Tutup'
            }).then((res) => {
                if (res.isConfirmed) handleDownload(item);
            });
            return;
        }

        setPreviewItem(item);
        setPreviewLoading(true);
        setPreviewModalOpen(true);

        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/hrd/form/view/${item.form_id}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            let mime = 'application/pdf';
            if (['jpg', 'jpeg'].includes(ext)) mime = 'image/jpeg';
            if (ext === 'png') mime = 'image/png';

            const fileBlob = new Blob([res.data], { type: mime });
            const url = window.URL.createObjectURL(fileBlob);
            setPreviewUrl(url);
        } catch (err) {
            Swal.fire({ title: 'Gagal Memuat', text: 'Berkas tidak dapat dipratinjau.', icon: 'error' });
            setPreviewModalOpen(false);
        } finally {
            setPreviewLoading(false);
        }
    };

    const closePreview = () => {
        if (previewUrl) {
            window.URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl('');
        setPreviewItem(null);
        setPreviewModalOpen(false);
    };

    // Handler Download
    const handleDownload = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/hrd/form/download/${item.form_id}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const blob = new Blob([res.data]);
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = item.form_filename || 'dokumen_hrd';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (err) {
            Swal.fire({ title: 'Gagal Download', text: 'Berkas formulir tidak ditemukan di server.', icon: 'error' });
        }
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus Form?',
            text: `Yakin ingin menghapus formulir "${item.form_nama}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete(`/hrd/form/delete/${item.form_id}`, { headers: { Authorization: `Bearer ${token}` } });
                    Swal.fire({ title: 'Terhapus!', text: 'Formulir berhasil dihapus.', icon: 'success' });
                    fetchForms();
                } catch (err) {
                    Swal.fire({ title: 'Gagal', text: 'Gagal menghapus formulir.', icon: 'error' });
                }
            }
        });
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            Swal.fire({ title: 'Pilih Berkas', text: 'Silakan pilih file yang akan diunggah.', icon: 'warning' });
            return;
        }

        setUploading(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('form_nama', formNama.toUpperCase());
            formData.append('form_kategori', formKategori);
            formData.append('form_keterangan', formKeterangan);
            formData.append('file', selectedFile);

            await api.post('/hrd/form/upload', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            Swal.fire({ title: 'Berhasil', text: 'Formulir baru berhasil diunggah.', icon: 'success' });
            setIsModalOpen(false);
            setFormNama('');
            setFormKeterangan('');
            setSelectedFile(null);
            fetchForms();
        } catch (err) {
            Swal.fire({ title: 'Gagal Upload', text: err.response?.data?.message || 'Terjadi kesalahan.', icon: 'error' });
        } finally {
            setUploading(false);
        }
    };

    const getFileIcon = (filename) => {
        const ext = String(filename || '').split('.').pop().toLowerCase();
        if (['xlsx', 'xls', 'csv'].includes(ext)) return <FileSpreadsheet className="text-emerald-600" size={18} />;
        if (['apk', 'exe', 'msi', 'rar', 'zip'].includes(ext)) return <HardDrive className="text-amber-600" size={18} />;
        return <FileText className="text-sky-600" size={18} />;
    };

    const columns = [
        {
            header: 'NAMA FORMULIR / BERKAS',
            accessor: 'form_nama',
            render: (item) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                        {getFileIcon(item.form_filename)}
                    </div>
                    <div>
                        <span className="font-bold uppercase text-slate-800 block text-xs">
                            {item.form_nama}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 block">
                            {item.form_filename}
                        </span>
                    </div>
                </div>
            )
        },
        {
            header: 'KATEGORI',
            accessor: 'form_kategori',
            render: (item) => (
                <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-block">
                    {item.form_kategori || 'UMUM'}
                </span>
            )
        },
        {
            header: 'UKURAN DATA',
            accessor: 'form_filesize',
            render: (item) => (
                <span className="font-mono text-xs font-bold text-slate-700">
                    {formatBytes(item.form_filesize)}
                </span>
            )
        },
        {
            header: 'TERAKHIR DIMODIFIKASI',
            accessor: 'form_createtime',
            render: (item) => (
                <span className="font-mono text-xs text-slate-600">
                    {item.form_createtime ? String(item.form_createtime).replace('T', ' ').substring(0, 19) : '-'}
                </span>
            )
        },
        {
            header: 'AKSI',
            accessor: 'action',
            render: (item) => (
                <div className="flex items-center gap-1">
                    {/* Icon View / Preview */}
                    <button
                        type="button"
                        onClick={() => handleView(item)}
                        className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                        title="Lihat / Pratinjau Dokumen"
                    >
                        <Eye size={17} />
                    </button>

                    {/* Icon Download */}
                    <button
                        type="button"
                        onClick={() => handleDownload(item)}
                        className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                        title="Download Berkas"
                    >
                        <Download size={17} />
                    </button>

                    {/* Icon Delete (Admin/Superadmin Only) */}
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Hapus Form"
                        >
                            <Trash2 size={17} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    // Modal Upload Form
    const modalUpload = isModalOpen ? (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/70" style={{ zIndex: 99999 }}>
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'}`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <UploadCloud size={18} className="text-sky-600" />
                        UNGGAH FORMULIR / DOKUMEN BARU
                    </h3>
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 text-xs">
                    <div className="space-y-1">
                        <label className="font-bold text-slate-600 block">Nama Formulir / Dokumen <span className="text-rose-500">*</span></label>
                        <input
                            type="text"
                            required
                            placeholder="MISAL: FORM LAPORAN KECELAKAAN KERJA TAHAP I"
                            value={formNama}
                            onChange={e => setFormNama(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-lg font-bold outline-none focus:border-sky-500 uppercase"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="font-bold text-slate-600 block">Kategori Formulir</label>
                        <select
                            value={formKategori}
                            onChange={e => setFormKategori(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-lg font-bold outline-none focus:border-sky-500 bg-white"
                        >
                            <option value="SOP & FORMULIR">SOP & FORMULIR HRD</option>
                            <option value="BPJS & ASURANSI">BPJS & ASURANSI</option>
                            <option value="APLIKASI & DRIVER">APLIKASI & DRIVER PENDUKUNG</option>
                            <option value="SURAT DINAS & CUTI">SURAT DINAS & CUTI</option>
                            <option value="LAIN-LAIN">LAIN-LAIN</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="font-bold text-slate-600 block">Pilih Berkas File <span className="text-rose-500">*</span></label>
                        <input
                            type="file"
                            required
                            onChange={e => setSelectedFile(e.target.files[0])}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-700 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
                        />
                        <span className="text-[10px] text-slate-400 block mt-1">Mendukung file PDF, Excel, Word, APK, RAR, ZIP, dll.</span>
                    </div>

                    <div className="space-y-1">
                        <label className="font-bold text-slate-600 block">Keterangan Tambahan</label>
                        <textarea
                            rows={2}
                            placeholder="Catatan petunjuk pengisian jika ada..."
                            value={formKeterangan}
                            onChange={e => setFormKeterangan(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-medium outline-none focus:border-sky-500"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-5 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl text-xs uppercase cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={uploading}
                            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs uppercase shadow-md cursor-pointer flex items-center gap-2"
                        >
                            {uploading ? 'Mengunggah...' : 'Unggah Formulir'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    ) : null;

    // Modal Preview Dokumen
    const modalPreview = previewModalOpen && previewItem ? (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs" style={{ zIndex: 99999 }}>
            <div className="w-full max-w-5xl h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header Preview */}
                <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        <FileText size={18} className="text-sky-400 shrink-0" />
                        <span className="font-bold text-xs uppercase truncate">{previewItem.form_nama}</span>
                        <span className="text-[11px] font-mono text-slate-400 truncate">({previewItem.form_filename})</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => handleDownload(previewItem)}
                            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                        >
                            <Download size={14} /> Download
                        </button>

                        <button
                            type="button"
                            onClick={closePreview}
                            className="p-1 text-slate-400 hover:text-white cursor-pointer transition"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Konten Preview */}
                <div className="flex-1 bg-slate-100 flex items-center justify-center overflow-hidden relative">
                    {previewLoading ? (
                        <div className="text-center font-bold text-xs text-slate-500 animate-pulse">
                            Memuat dokumen...
                        </div>
                    ) : previewUrl ? (
                        String(previewItem.form_filename || '').match(/\.(jpg|jpeg|png|webp)$/i) ? (
                            <div className="p-4 overflow-auto max-h-full max-w-full flex items-center justify-center">
                                <img
                                    src={previewUrl}
                                    alt={previewItem.form_nama}
                                    className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-md"
                                />
                            </div>
                        ) : (
                            <iframe
                                src={previewUrl}
                                title={previewItem.form_nama}
                                className="w-full h-full border-0"
                            />
                        )
                    ) : (
                        <div className="text-xs text-slate-500">Pratinjau tidak tersedia</div>
                    )}
                </div>
            </div>
        </div>
    ) : null;

    return (
        <div className="space-y-5">
            {/* Panel Filter Toggle */}
            {showFilter && (
                <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all">
                    <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                        <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                            <Filter size={16} className="text-sky-600" />
                            FILTER PENCARIAN FORMULIR HRD
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="font-bold text-slate-600 block mb-1">KATEGORI DOKUMEN</label>
                            <select
                                value={filterKategori}
                                onChange={e => setFilterKategori(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 bg-white"
                            >
                                <option value="ALL">-- SEMUA KATEGORI --</option>
                                <option value="SOP & FORMULIR">SOP & FORMULIR HRD</option>
                                <option value="BPJS & ASURANSI">BPJS & ASURANSI</option>
                                <option value="APLIKASI & DRIVER">APLIKASI & DRIVER PENDUKUNG</option>
                                <option value="SURAT DINAS & CUTI">SURAT DINAS & CUTI</option>
                                <option value="LAIN-LAIN">LAIN-LAIN</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-600 block mb-1">KATA KUNCI (NAMA / FILENAME)</label>
                            <input
                                type="text"
                                placeholder="Cari nama form atau nama berkas..."
                                value={filterKeyword}
                                onChange={e => setFilterKeyword(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 bg-white"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handleResetFilter}
                            className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer text-xs"
                        >
                            RESET
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5 text-xs"
                        >
                            <RefreshCw size={14} /> CARI DOKUMEN
                        </button>
                    </div>
                </form>
            )}

            <DataTableTemplate
                title="DAFTAR FORMULIR & DOKUMEN HRD"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={() => setIsModalOpen(true)}
                onFilter={() => setShowFilter(prev => !prev)}
            />

            {modalUpload && ReactDOM.createPortal(modalUpload, document.body)}
            {modalPreview && ReactDOM.createPortal(modalPreview, document.body)}
        </div>
    );
};

export default DaftarFormHRD;