import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, Printer, X } from 'lucide-react';
import Swal from 'sweetalert2';

const PembayaranVendor = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [cabangList, setCabangList] = useState([]);
    const [vendorList, setVendorList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter State
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [selectedCabang, setSelectedCabang] = useState('');
    const [searchVendor, setSearchVendor] = useState('');
    const [searchNoPayment, setSearchNoPayment] = useState('');
    const [searchNoInvoice, setSearchNoInvoice] = useState('');
    const [selectedPosting, setSelectedPosting] = useState('');
    const [isFilterActive, setIsFilterActive] = useState(false);

    // Modal Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({
        tpayh_cbid: '',        // 🌟 Kode / ID Cabang
        tpayh_no: '',
        tpayh_tanggal: today,
        tpayh_vendname: '',
        tpayh_keterangan: '',
        total_dpp: 0,
        nilai_ppn: 0,
        nilai_pph: 0,
        invoice_ids: ''
    });

    const fetchCabangList = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/gl/agen-ca?stt=2', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const list = res.data?.data || [];
            setCabangList(list);

            // Set default cabang jika ada
            if (list.length > 0 && !formData.tpayh_cbid) {
                setFormData(prev => ({ ...prev, tpayh_cbid: list[0].agen_id || list[0].agen_nama }));
            }
        } catch (err) {
            console.error("Gagal load cabang options:", err);
        }
    };

    const fetchVendorList = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/gl/pembayaran-vendor/vendor-options', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVendorList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load vendor options:", err);
        }
    };

    const fetchPembayaranVendorData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let queryParams = `/gl/pembayaran-vendor?limit=500`;

            if (isFilterActive) {
                if (startDate && endDate) queryParams += `&start_date=${startDate}&end_date=${endDate}`;
                if (searchVendor) queryParams += `&vend_name=${searchVendor}`;
                if (searchNoPayment) queryParams += `&no_payment=${searchNoPayment}`;
                if (searchNoInvoice) queryParams += `&no_invoice=${searchNoInvoice}`;
                if (selectedPosting) queryParams += `&posting_yn=${selectedPosting}`;
            }

            const res = await api.get(queryParams, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal tarik data Pembayaran Vendor:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCabangList();
        fetchVendorList();
    }, []);

    useEffect(() => {
        fetchPembayaranVendorData();
    }, [isFilterActive]);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        setIsFilterActive(true);
        fetchPembayaranVendorData();
    };

    const handleResetFilter = () => {
        setStartDate(today);
        setEndDate(today);
        setSelectedCabang('');
        setSearchVendor('');
        setSearchNoPayment('');
        setSearchNoInvoice('');
        setSelectedPosting('');
        setIsFilterActive(false);
    };

    const handleAdd = () => {
        setIsEditMode(false);
        setFormData({
            tpayh_cbid: cabangList.length > 0 ? (cabangList[0].agen_id || cabangList[0].agen_nama) : '',
            tpayh_no: '',
            tpayh_tanggal: today,
            tpayh_vendname: '',
            tpayh_keterangan: '',
            total_dpp: 0,
            nilai_ppn: 0,
            nilai_pph: 0,
            invoice_ids: ''
        });
        setIsModalOpen(true);
    };

    // 🎯 Buka Modal untuk Edit
    const handleEdit = (item) => {
        setIsEditMode(true);

        // Ambil string invoice (jika bernilai '-' atau kosong, jadikan string kosong)
        const rawInvoice = item.no_invoice && item.no_invoice !== '-' ? item.no_invoice : '';

        setFormData({
            tpayh_cbid: item.tpayh_cbid || (cabangList.length > 0 ? (cabangList[0].agen_id || cabangList[0].agen_nama) : ''),
            tpayh_no: item.tpayh_no,
            tpayh_tanggal: item.tpayh_tanggal || today,
            tpayh_vendname: item.tpayh_vendname !== '-' ? item.tpayh_vendname : '',
            tpayh_keterangan: item.tpayh_keterangan !== '-' ? item.tpayh_keterangan : '',
            total_dpp: item.total_dpp || 0,
            nilai_ppn: 0,
            nilai_pph: 0,
            invoice_ids: rawInvoice // 👈 Populasikan nomor invoice yang tersimpan
        });
        setIsModalOpen(true);
    };

    const handleSaveForm = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const invoiceArr = formData.invoice_ids ? formData.invoice_ids.split(',').map(s => s.trim()).filter(Boolean) : [];

            const payload = {
                ...formData,
                total_dpp: parseFloat(formData.total_dpp) || 0,
                nilai_ppn: parseFloat(formData.nilai_ppn) || 0,
                nilai_pph: parseFloat(formData.nilai_pph) || 0,
                invoice_ids: invoiceArr
            };

            // 🌟 JIKA EDIT MODE GUNAKAN PUT, JIKA ADD GUNAKAN POST
            if (isEditMode) {
                await api.put('/gl/pembayaran-vendor/update', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await api.post('/gl/pembayaran-vendor/create', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            Swal.fire({
                title: 'BERHASIL!',
                text: isEditMode ? 'Pembayaran Vendor Berhasil Diperbarui.' : 'Pembayaran Vendor Berhasil Disimpan.',
                icon: 'success',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });

            setIsModalOpen(false);
            fetchPembayaranVendorData();
        } catch (err) {
            Swal.fire({
                title: 'GAGAL!',
                text: err.response?.data?.message || 'Gagal menyimpan transaksi.',
                icon: 'error',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
        }
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Batalkan Pembayaran Vendor?',
            text: `Apakah Anda yakin ingin membatalkan pembayaran No ${item.tpayh_no}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Batalkan!',
            cancelButtonText: 'Batal',
            didOpen: () => {
                const container = document.querySelector('.swal2-container');
                if (container) container.style.zIndex = '9999999';
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.delete(`/gl/pembayaran-vendor/${item.tpayh_no}`);
                    Swal.fire({
                        title: 'TERHAPUS!',
                        text: 'Pembayaran Vendor berhasil dibatalkan.',
                        icon: 'success',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });
                    fetchPembayaranVendorData();
                } catch (err) {
                    Swal.fire({
                        title: 'GAGAL!',
                        text: err.response?.data?.message || 'Gagal membatalkan transaksi.',
                        icon: 'error',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });
                }
            }
        });
    };

    const handlePrint = (item) => {
        Swal.fire({
            title: 'PRINT PEMBAYARAN VENDOR',
            text: `Mencetak bukti pembayaran untuk No ${item.tpayh_no}...`,
            icon: 'info',
            confirmButtonColor: '#0284c7',
            didOpen: () => {
                const container = document.querySelector('.swal2-container');
                if (container) container.style.zIndex = '9999999';
            }
        });
    };

    const formatDate = (dateString) => {
        if (!dateString || dateString === '-') return '-';
        const parts = dateString.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateString;
    };

    const columns = [
        {
            header: 'NO. PEMBAYARAN',
            accessor: 'tpayh_no',
            render: (item) => <span className="font-mono font-bold text-sky-600">{item.tpayh_no}</span>
        },
        {
            header: 'NO. INVOICE VENDOR',
            accessor: 'no_invoice',
            render: (item) => <span className="font-mono text-slate-700">{item.no_invoice}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'tpayh_tanggal',
            render: (item) => <span className="font-mono text-slate-800">{formatDate(item.tpayh_tanggal)}</span>
        },
        {
            header: 'NAMA VENDOR',
            accessor: 'tpayh_vendname',
            render: (item) => <span className="font-bold text-slate-800 uppercase">{item.tpayh_vendname}</span>
        },
        {
            header: 'DPP (RP)',
            accessor: 'total_dpp',
            render: (item) => <span className="font-mono text-slate-700">Rp {(item.total_dpp || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'TOTAL HARUS BAYAR (RP)',
            accessor: 'total_harus_bayar',
            render: (item) => <span className="font-mono font-bold text-emerald-600">Rp {(item.total_harus_bayar || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'KETERANGAN',
            accessor: 'tpayh_keterangan',
            render: (item) => <span className="text-slate-600">{item.tpayh_keterangan}</span>
        },
        {
            header: 'STATUS',
            accessor: 'tpayh_deleteyn',
            render: (item) => item.tpayh_deleteyn === 'Y' ? (
                <span className="font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px]">BATAL</span>
            ) : (
                <span className="font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">AKTIF</span>
            )
        },
        {
            header: 'NO. JURNAL',
            accessor: 'tpayh_tjurhno',
            render: (item) => <span className="font-mono text-indigo-600 font-bold">{item.tpayh_tjurhno}</span>
        },
        {
            header: 'POSTING',
            accessor: 'tpayh_postingyn',
            render: (item) => item.tpayh_postingyn === 'Y' ? (
                <span className="font-bold text-sky-600 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded text-[10px]">POSTING</span>
            ) : (
                <span className="font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px]">UNPOSTED</span>
            )
        },
        {
            header: 'PRINT',
            accessor: 'print_action',
            render: (item) => (
                <button
                    onClick={() => handlePrint(item)}
                    className="p-1.5 bg-sky-50 text-sky-600 border border-sky-200 rounded-lg hover:bg-sky-100 transition cursor-pointer flex items-center gap-1 mx-auto font-bold text-xs"
                >
                    <Printer size={14} /> Print
                </button>
            )
        }
    ];

    // Modal Popup Template
    const modalElement = isModalOpen ? (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            style={{ zIndex: 99999 }}
        >
            <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden transition-all transform ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'}`}>
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-base font-black uppercase tracking-wider text-slate-800">
                        {isEditMode ? `EDIT PEMBAYARAN VENDOR (${formData.tpayh_no})` : 'ADD PEMBAYARAN VENDOR INFO'}
                    </h2>
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSaveForm} className="p-8 space-y-5 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                        {/* 🌟 1. KODE CABANG (POSISI PALING AWAL SEBELUM TANGGAL) */}
                        {/* Kode Cabang Select Option */}
                        <div className="md:col-span-2">
                            <label className="font-bold text-slate-700 block mb-1.5">Kode Cabang</label>
                            <select
                                required
                                value={formData.tpayh_cbid}
                                onChange={(e) => setFormData({ ...formData, tpayh_cbid: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-800 uppercase outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                            >
                                <option value="">-- Pilih Kode Cabang --</option>
                                {cabangList.map((cabang, idx) => {
                                    const idVal = cabang.agen_id ? String(cabang.agen_id) : '1';
                                    return (
                                        <option key={idx} value={idVal}>
                                            {cabang.agen_nama} ({idVal})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {isEditMode && (
                            <div className="md:col-span-2">
                                <label className="font-bold text-slate-700 block mb-1.5">No. Pembayaran</label>
                                <input
                                    type="text"
                                    disabled
                                    value={formData.tpayh_no}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-slate-100 font-bold text-slate-700 font-mono"
                                />
                            </div>
                        )}

                        {/* 2. TANGGAL PEMBAYARAN */}
                        <div>
                            <label className="font-bold text-slate-700 block mb-1.5">Tanggal Pembayaran</label>
                            <input
                                type="date"
                                required
                                value={formData.tpayh_tanggal}
                                onChange={(e) => setFormData({ ...formData, tpayh_tanggal: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                            />
                        </div>

                        {/* 3. NAMA VENDOR */}
                        <div>
                            <label className="font-bold text-slate-700 block mb-1.5">Nama Vendor</label>
                            <select
                                required
                                value={formData.tpayh_vendname}
                                onChange={(e) => setFormData({ ...formData, tpayh_vendname: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-800 uppercase outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                            >
                                <option value="">-- Pilih Vendor --</option>
                                {vendorList.map((vendor, idx) => (
                                    <option key={idx} value={vendor.vend_name}>
                                        {vendor.vend_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 4. NOMINAL DPP */}
                        <div>
                            <label className="font-bold text-slate-700 block mb-1.5">Nominal DPP (Rp)</label>
                            <input
                                type="number"
                                required
                                value={formData.total_dpp}
                                onChange={(e) => setFormData({ ...formData, total_dpp: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-mono font-bold text-emerald-600 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                            />
                        </div>

                        {/* 5. NO. INVOICE VENDOR */}
                        <div>
                            <label className="font-bold text-slate-700 block mb-1.5">No. Invoice Vendor (Dipisah koma)</label>
                            <input
                                type="text"
                                placeholder="Contoh: INV001, INV002"
                                value={formData.invoice_ids}
                                onChange={(e) => setFormData({ ...formData, invoice_ids: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-mono font-bold text-slate-800 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                            />
                        </div>

                        {/* 6. KETERANGAN */}
                        <div className="md:col-span-2">
                            <label className="font-bold text-slate-700 block mb-1.5">Keterangan</label>
                            <textarea
                                rows={3}
                                placeholder="Masukkan rincian keterangan pelunasan..."
                                value={formData.tpayh_keterangan}
                                onChange={(e) => setFormData({ ...formData, tpayh_keterangan: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-6">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-8 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition uppercase cursor-pointer"
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg transition shadow-md uppercase cursor-pointer"
                        >
                            {isEditMode ? 'UPDATE PEMBAYARAN' : 'ADD PEMBAYARAN'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    ) : null;

    return (
        <div className="space-y-4">
            {/* Filter Panel */}
            <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
                <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                    <Filter size={16} className="text-sky-600" />
                    FILTER PEMBAYARAN VENDOR
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <label className="font-bold text-slate-500 block mb-1">TGL MULAI</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="font-bold text-slate-500 block mb-1">TGL SAMPAI</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">CABANG / AGEN</label>
                        <select
                            value={selectedCabang}
                            onChange={(e) => setSelectedCabang(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        >
                            <option value="">-- SEMUA CABANG --</option>
                            {cabangList.map((cabang, idx) => (
                                <option key={idx} value={cabang.agen_nama}>
                                    {cabang.agen_nama}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">NAMA VENDOR</label>
                        <select
                            value={searchVendor}
                            onChange={(e) => setSearchVendor(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        >
                            <option value="">-- SEMUA VENDOR --</option>
                            {vendorList.map((vendor, idx) => (
                                <option key={idx} value={vendor.vend_name}>
                                    {vendor.vend_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">NO. PEMBAYARAN</label>
                        <input
                            type="text"
                            placeholder="Ketik No Pembayaran..."
                            value={searchNoPayment}
                            onChange={(e) => setSearchNoPayment(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={handleResetFilter}
                        className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer"
                    >
                        RESET
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer"
                    >
                        TAMPILKAN TRANSAKSI
                    </button>
                </div>
            </form>

            <DataTableTemplate
                title="PEMBAYARAN VENDOR"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            {modalElement && ReactDOM.createPortal(modalElement, document.body)}
        </div>
    );
};

export default PembayaranVendor;