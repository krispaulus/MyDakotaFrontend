import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, Printer } from 'lucide-react';
import Swal from 'sweetalert2';

const InsentifLoper = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [driverList, setDriverList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter State
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [selectedDriver, setSelectedDriver] = useState('');
    const [isFilterActive, setIsFilterActive] = useState(false);

    // State Modal Form (Popup)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({
        lopins_id: '',
        lopins_tanggal: today,
        lopins_nip: '',
        lopins_startperiode: today,
        lopins_endperiode: today,
        lopins_cbid: '',
        lopins_keterangan: ''
    });

    const fetchDriverList = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/gl/insentif-loper/driver-options', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDriverList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load driver options:", err);
        }
    };

    const fetchInsentifData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let queryParams = `/gl/insentif-loper?limit=500`;

            if (isFilterActive) {
                if (startDate && endDate) queryParams += `&start_date=${startDate}&end_date=${endDate}`;
                if (selectedDriver) queryParams += `&nip_driver=${selectedDriver}`;
            }

            const res = await api.get(queryParams, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal tarik data Insentif Loper:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDriverList();
    }, []);

    useEffect(() => {
        fetchInsentifData();
    }, [isFilterActive]);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        setIsFilterActive(true);
        fetchInsentifData();
    };

    const handleResetFilter = () => {
        setStartDate(today);
        setEndDate(today);
        setSelectedDriver('');
        setIsFilterActive(false);
    };

    // Buka Modal Tambah
    const handleAdd = () => {
        setIsEditMode(false);
        setFormData({
            lopins_id: '',
            lopins_tanggal: today,
            lopins_nip: '',
            lopins_startperiode: today,
            lopins_endperiode: today,
            lopins_cbid: '',
            lopins_keterangan: ''
        });
        setIsModalOpen(true);
    };

    // Buka Modal Edit
    const handleEdit = (item) => {
        setIsEditMode(true);
        setFormData({
            lopins_id: item.lopins_id,
            lopins_tanggal: item.lopins_tanggal || today,
            lopins_nip: item.lopins_nip || '',
            lopins_startperiode: item.lopins_start_periode || today,
            lopins_endperiode: item.lopins_end_periode || today,
            lopins_cbid: item.lopins_cbid !== '-' ? item.lopins_cbid : '',
            lopins_keterangan: ''
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
                await api.post('/gl/insentif-loper/update', formData, { headers });
            } else {
                await api.post('/gl/insentif-loper/create', formData, { headers });
            }

            Swal.fire({
                title: 'BERHASIL!',
                text: `Data Insentif Loper berhasil ${isEditMode ? 'diperbarui' : 'ditambahkan'}.`,
                icon: 'success',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });

            setIsModalOpen(false);
            fetchInsentifData();
        } catch (err) {
            Swal.fire({
                title: 'GAGAL!',
                text: err.response?.data?.message || 'Gagal menyimpan data insentif.',
                icon: 'error',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
        }
    };

    const handlePrint = (item) => {
        Swal.fire({
            title: 'CETAK INSENTIF',
            text: `Mencetak dokumen Insentif Loper untuk Kode ${item.lopins_id}...`,
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
            title: 'Hapus Data Insentif?',
            text: `Apakah Anda yakin ingin menghapus data insentif ${item.lopins_id} (${item.kry_nama})?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal',
            didOpen: () => {
                const container = document.querySelector('.swal2-container');
                if (container) container.style.zIndex = '9999999';
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.delete(`/gl/insentif-loper/${item.lopins_id}`);
                    Swal.fire({
                        title: 'TERHAPUS!',
                        text: 'Data insentif loper berhasil dihapus.',
                        icon: 'success',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });
                    fetchInsentifData();
                } catch (err) {
                    Swal.fire({
                        title: 'GAGAL!',
                        text: err.response?.data?.message || 'Gagal menghapus data.',
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
            header: 'KODE',
            accessor: 'lopins_id',
            render: (item) => <span className="font-mono font-bold text-sky-600">{item.lopins_id}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'lopins_tanggal',
            render: (item) => <span className="font-mono text-slate-800">{formatDate(item.lopins_tanggal)}</span>
        },
        {
            header: 'NAMA DRIVER',
            accessor: 'kry_nama',
            render: (item) => <span className="font-bold text-slate-800 uppercase">{item.kry_nama}</span>
        },
        {
            header: 'NIP DRIVER',
            accessor: 'lopins_nip',
            render: (item) => <span className="font-mono text-slate-600">{item.lopins_nip}</span>
        },
        {
            header: 'PERIODE MULAI',
            accessor: 'lopins_start_periode',
            render: (item) => <span className="font-mono text-slate-600">{formatDate(item.lopins_start_periode)}</span>
        },
        {
            header: 'PERIODE SELESAI',
            accessor: 'lopins_end_periode',
            render: (item) => <span className="font-mono text-slate-600">{formatDate(item.lopins_end_periode)}</span>
        },
        {
            header: 'KOMISI (RP)',
            accessor: 'komisi',
            render: (item) => <span className="font-mono font-bold text-emerald-600">Rp {(item.komisi || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'KAS KELUAR',
            accessor: 'lopins_cbid',
            render: (item) => <span className="font-mono font-bold text-indigo-600">{item.lopins_cbid}</span>
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

    // 🌟 UI/UX MODAL DENGAN DESAIN TEMPLATE GAMBAR 2
    const modalElement = isModalOpen ? (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            style={{ zIndex: 99999 }}
        >
            <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden transition-all transform ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'}`}>
                {/* Header Modal Standar Gambar 2 */}
                <div className="px-8 py-6 border-b border-slate-100">
                    <h2 className="text-base font-black uppercase tracking-wider text-slate-800">
                        {isEditMode ? `EDIT INSENTIF LOPER INFO (${formData.lopins_id})` : 'ADD INSENTIF LOPER INFO'}
                    </h2>
                </div>

                {/* Form Body 2 Kolom Standar Template */}
                <form onSubmit={handleSaveForm} className="p-8 space-y-5 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Driver / Sopir Dropdown */}
                        <div className="md:col-span-2">
                            <label className="font-bold text-slate-700 block mb-1.5">
                                Pilih Driver / Sopir
                            </label>
                            <select
                                required
                                value={formData.lopins_nip}
                                onChange={(e) => setFormData({ ...formData, lopins_nip: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                            >
                                <option value="">Select Option</option>
                                {driverList.map((driver, idx) => (
                                    <option key={idx} value={driver.nip_sopir}>
                                        {driver.display}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Tanggal Transaksi */}
                        <div>
                            <label className="font-bold text-slate-700 block mb-1.5">
                                Tanggal Transaksi
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.lopins_tanggal}
                                onChange={(e) => setFormData({ ...formData, lopins_tanggal: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                            />
                        </div>

                        {/* Kas Keluar (CBID) */}
                        <div>
                            <label className="font-bold text-slate-700 block mb-1.5">
                                Kas Keluar (CBID)
                            </label>
                            <input
                                type="text"
                                placeholder="Masukkan nomor kas keluar..."
                                value={formData.lopins_cbid}
                                onChange={(e) => setFormData({ ...formData, lopins_cbid: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                            />
                        </div>

                        {/* Periode Mulai */}
                        <div>
                            <label className="font-bold text-slate-700 block mb-1.5">
                                Periode Mulai
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.lopins_startperiode}
                                onChange={(e) => setFormData({ ...formData, lopins_startperiode: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                            />
                        </div>

                        {/* Periode Selesai */}
                        <div>
                            <label className="font-bold text-slate-700 block mb-1.5">
                                Periode Selesai
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.lopins_endperiode}
                                onChange={(e) => setFormData({ ...formData, lopins_endperiode: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                            />
                        </div>
                    </div>

                    {/* Footer Buttons Standar Gambar 2 */}
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
                            {isEditMode ? 'UPDATE INSENTIF' : 'ADD INSENTIF'}
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
                    FILTER INSENTIF LOPER
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <label className="font-bold text-slate-500 block mb-1">DRIVER / SOPIR</label>
                        <select
                            value={selectedDriver}
                            onChange={(e) => setSelectedDriver(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        >
                            <option value="">-- SEMUA DRIVER --</option>
                            {driverList.map((driver, idx) => (
                                <option key={idx} value={driver.nip_sopir}>
                                    {driver.display}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-end gap-2">
                        <button
                            type="submit"
                            className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer"
                        >
                            TAMPILKAN
                        </button>
                        <button
                            type="button"
                            onClick={handleResetFilter}
                            className="px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer"
                        >
                            RESET
                        </button>
                    </div>
                </div>
            </form>

            {/* DataTableTemplate Standar */}
            <DataTableTemplate
                title="INSENTIF LOPER / DRIVER"
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

export default InsentifLoper;