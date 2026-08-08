import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, Printer, FileSpreadsheet, Plus, Edit2, X } from 'lucide-react';
import Swal from 'sweetalert2';

const Jurnal = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [cabangList, setCabangList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter State
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [selectedCabang, setSelectedCabang] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [searchNoJurnal, setSearchNoJurnal] = useState('');
    const [isFilterActive, setIsFilterActive] = useState(false);

    // State Modal Form (Popup)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({
        tjurh_no: '',
        tjurh_tanggal: today,
        tjurh_type: 'M',
        tjurh_keterangan: ''
    });

    const fetchCabangList = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/gl/agen-ca?stt=2', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCabangList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load cabang options:", err);
        }
    };

    const fetchJurnalData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let queryParams = `/gl/jurnal?limit=500`;

            if (isFilterActive) {
                if (startDate && endDate) queryParams += `&start_date=${startDate}&end_date=${endDate}`;
                if (selectedCabang) queryParams += `&cabang_nama=${selectedCabang}`;
                if (selectedType) queryParams += `&tipe_jurnal=${selectedType}`;
                if (searchNoJurnal) queryParams += `&no_jurnal=${searchNoJurnal}`;
            }

            const res = await api.get(queryParams, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal tarik data Jurnal:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCabangList();
    }, []);

    useEffect(() => {
        fetchJurnalData();
    }, [isFilterActive]);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        setIsFilterActive(true);
        fetchJurnalData();
    };

    const handleResetFilter = () => {
        setStartDate(today);
        setEndDate(today);
        setSelectedCabang('');
        setSelectedType('');
        setSearchNoJurnal('');
        setIsFilterActive(false);
    };

    // Buka Modal Tambah
    const handleAdd = () => {
        setIsEditMode(false);
        setFormData({
            tjurh_no: '',
            tjurh_tanggal: today,
            tjurh_type: 'M',
            tjurh_keterangan: ''
        });
        setIsModalOpen(true);
    };

    // Buka Modal Edit
    const handleEdit = (item) => {
        setIsEditMode(true);
        setFormData({
            tjurh_no: item.tjurh_no,
            tjurh_tanggal: item.tjurh_tanggal || today,
            tjurh_type: item.tjurh_type || 'M',
            tjurh_keterangan: item.tjurh_keterangan !== '-' ? item.tjurh_keterangan : ''
        });
        setIsModalOpen(true);
    };

    // Submit Form
    const handleSaveForm = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            if (isEditMode) {
                await api.post('/gl/jurnal/update', formData, { headers });
            } else {
                await api.post('/gl/jurnal/create', formData, { headers });
            }

            Swal.fire({
                title: 'BERHASIL!',
                text: `Data Jurnal berhasil ${isEditMode ? 'diperbarui' : 'ditambahkan'}.`,
                icon: 'success',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });

            setIsModalOpen(false);
            fetchJurnalData();
        } catch (err) {
            Swal.fire({
                title: 'GAGAL!',
                text: err.response?.data?.message || 'Gagal menyimpan jurnal.',
                icon: 'error',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
        }
    };

    const handlePrint = (item, format = 'A4') => {
        Swal.fire({
            title: `PRINT VOUCHER (${format})`,
            text: `Mencetak Voucher Jurnal Nomor ${item.tjurh_no}...`,
            icon: 'info',
            confirmButtonColor: '#0284c7',
            didOpen: () => {
                const container = document.querySelector('.swal2-container');
                if (container) container.style.zIndex = '9999999';
            }
        });
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Batalkan Jurnal?',
            text: `Apakah Anda yakin ingin membatalkan/void jurnal ${item.tjurh_no}?`,
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
                    await api.delete(`/gl/jurnal/${item.tjurh_no}`);
                    Swal.fire({
                        title: 'TERHAPUS!',
                        text: 'Jurnal berhasil dibatalkan.',
                        icon: 'success',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });
                    fetchJurnalData();
                } catch (err) {
                    Swal.fire({
                        title: 'GAGAL!',
                        text: err.response?.data?.message || 'Gagal membatalkan jurnal.',
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
            header: 'NO. JURNAL',
            accessor: 'tjurh_no',
            render: (item) => <span className="font-mono font-bold text-sky-600">{item.tjurh_no}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'tjurh_tanggal',
            render: (item) => <span className="font-mono text-slate-800">{formatDate(item.tjurh_tanggal)}</span>
        },
        {
            header: 'TYPE',
            accessor: 'tjurh_type',
            render: (item) => {
                const typeMap = { B: 'Pembelian', J: 'Penjualan', T: 'Terima Kas', K: 'Keluar Kas', M: 'Memorial' };
                return (
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {typeMap[item.tjurh_type] || item.tjurh_type}
                    </span>
                );
            }
        },
        {
            header: 'KETERANGAN',
            accessor: 'tjurh_keterangan',
            render: (item) => <span className="text-slate-600">{item.tjurh_keterangan}</span>
        },
        {
            header: 'STATUS',
            accessor: 'tjurh_deleteyn',
            render: (item) => item.tjurh_deleteyn === 'Y' ? (
                <span className="font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px]">BATAL</span>
            ) : (
                <span className="font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">AKTIF</span>
            )
        },
        {
            header: 'POSTING',
            accessor: 'tjurh_postyn',
            render: (item) => item.tjurh_postyn === 'Y' ? (
                <span className="font-bold text-sky-600 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded text-[10px]">POSTING</span>
            ) : (
                <span className="font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px]">UNPOSTED</span>
            )
        },
        {
            header: 'TOTAL (RP)',
            accessor: 'total_amount',
            render: (item) => <span className="font-mono font-bold text-emerald-600">Rp {(item.total_amount || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'PRINT',
            accessor: 'print_action',
            render: (item) => (
                <div className="flex items-center justify-center gap-1">
                    <button
                        onClick={() => handlePrint(item, 'A4')}
                        className="px-2 py-1 bg-sky-50 text-sky-600 border border-sky-200 rounded-md hover:bg-sky-100 transition cursor-pointer font-bold text-[10px] flex items-center gap-1"
                    >
                        <Printer size={12} /> A4
                    </button>
                    <button
                        onClick={() => handlePrint(item, 'Letter')}
                        className="px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-100 transition cursor-pointer font-bold text-[10px] flex items-center gap-1"
                    >
                        <Printer size={12} /> Letter
                    </button>
                </div>
            )
        }
    ];

    // 🌟 UI/UX MODAL DENGAN DESAIN TEMPLATE STANDAR
    const modalElement = isModalOpen ? (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            style={{ zIndex: 99999 }}
        >
            <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden transition-all transform ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'}`}>
                {/* Header Modal */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-base font-black uppercase tracking-wider text-slate-800">
                        {isEditMode ? `EDIT JURNAL INFO (${formData.tjurh_no})` : 'ADD JURNAL INFO'}
                    </h2>
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSaveForm} className="p-8 space-y-5 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {isEditMode && (
                            <div className="md:col-span-2">
                                <label className="font-bold text-slate-700 block mb-1.5">Nomor Jurnal</label>
                                <input
                                    type="text"
                                    disabled
                                    value={formData.tjurh_no}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-slate-100 font-bold text-slate-700 font-mono"
                                />
                            </div>
                        )}

                        <div>
                            <label className="font-bold text-slate-700 block mb-1.5">Tanggal Jurnal</label>
                            <input
                                type="date"
                                required
                                value={formData.tjurh_tanggal}
                                onChange={(e) => setFormData({ ...formData, tjurh_tanggal: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-700 block mb-1.5">Tipe Jurnal</label>
                            <select
                                required
                                value={formData.tjurh_type}
                                onChange={(e) => setFormData({ ...formData, tjurh_type: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                            >
                                <option value="B">Pembelian</option>
                                <option value="J">Penjualan</option>
                                <option value="T">Terima Kas</option>
                                <option value="K">Keluar Kas</option>
                                <option value="M">Memorial</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="font-bold text-slate-700 block mb-1.5">Keterangan Jurnal</label>
                            <textarea
                                rows={3}
                                placeholder="Masukkan keterangan jurnal..."
                                value={formData.tjurh_keterangan}
                                onChange={(e) => setFormData({ ...formData, tjurh_keterangan: e.target.value })}
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
                            {isEditMode ? 'UPDATE JURNAL' : 'ADD JURNAL'}
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
                    FILTER JURNAL KEUANGAN
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Tanggal Start & End */}
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

                    {/* Cabang Select */}
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

                    {/* Tipe Jurnal Radio Radio Group */}
                    <div>
                        <label className="font-bold text-slate-500 block mb-1">TIPE JURNAL</label>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        >
                            <option value="">-- SEMUA TIPE --</option>
                            <option value="B">Pembelian (B)</option>
                            <option value="J">Penjualan (J)</option>
                            <option value="T">Terima Kas (T)</option>
                            <option value="K">Keluar Kas (K)</option>
                            <option value="M">Memorial (M)</option>
                        </select>
                    </div>

                    {/* Cari No Jurnal */}
                    <div>
                        <label className="font-bold text-slate-500 block mb-1">CARI NO. JURNAL</label>
                        <input
                            type="text"
                            placeholder="Ketik Nomor Jurnal..."
                            value={searchNoJurnal}
                            onChange={(e) => setSearchNoJurnal(e.target.value)}
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
                        TAMPILKAN JURNAL
                    </button>
                </div>
            </form>

            {/* DataTableTemplate Standar */}
            <DataTableTemplate
                title="JURNAL KEUANGAN GENERAL LEDGER"
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

export default Jurnal;