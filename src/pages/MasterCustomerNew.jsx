import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Users, Search, CheckSquare, Square, Plus, Edit2, Trash2 } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from "../context/DarkModeContext";
import Swal from 'sweetalert2';

const MasterCustomerNew = () => {
    const { isDarkMode } = useDarkMode();
    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter Controls
    const [filterAktif, setFilterAktif] = useState('Y');
    const [filterNama, setFilterNama] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const [formData, setFormData] = useState({
        cust_id: '',
        cust_name: '',
        cust_alamat1: '',
        cust_alamat2: '',
        cust_kotaid: '',
        cust_telp1: '',
        cust_telp2: '',
        cust_email: '',
        cust_npwp: '',
        cust_contactperson: '',
        cust_jenisusaha: '',
        cust_kreditlimit: 0,
        cust_kredithari: 0
    });

    // 1. FETCH DATA CUSTOMER
    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/customer', {
                params: {
                    aktif: filterAktif,
                    search: filterNama
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const list = res.data?.data;
            if (Array.isArray(list)) {
                setDataList(list);
            } else {
                setDataList([]);
            }
        } catch (err) {
            console.error("Gagal memuat customer:", err);
            setDataList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [filterAktif]);

    // 2. TOGGLE HARI KERJA REALTIME (AJAX CHECKBOX)
    const handleToggleWorkDays = async (custId, field, currentValue, e) => {
        e.stopPropagation();
        const newValue = currentValue === 'Y' ? 'N' : 'Y';

        // Optimistic UI Update
        setDataList(prev => prev.map(item => {
            if (item.cust_id === custId) {
                const updatedWorkDays = {
                    ...(item.work_days || { cust_id: custId, sabtuyn: 'N', mingguyn: 'N', liburyn: 'N' }),
                    [field]: newValue
                };
                return { ...item, work_days: updatedWorkDays };
            }
            return item;
        }));

        try {
            const token = localStorage.getItem('token');
            await api.post('/customer/workdays/update', {
                cust_id: custId,
                field: field,
                value: newValue
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error("Gagal update hari kerja:", err);
            Swal.fire('Error', 'Gagal memperbarui status hari kerja', 'error');
            fetchCustomers();
        }
    };

    // 3. SUBMIT TAMBAH
    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.post('/customer/create', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire('Sukses', 'Customer baru berhasil ditambahkan', 'success');
            setIsAddModalOpen(false);
            resetForm();
            fetchCustomers();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan customer', 'error');
        }
    };

    // 4. SUBMIT EDIT
    const handleEditTrigger = (item) => {
        setSelectedCustomer(item);
        setFormData({
            cust_id: item.cust_id || '',
            cust_name: item.cust_name || item.cust_nama || '',
            cust_alamat1: item.cust_alamat1 || '',
            cust_alamat2: item.cust_alamat2 || '',
            cust_kotaid: item.cust_kotaid || '',
            cust_telp1: item.cust_telp1 || '',
            cust_telp2: item.cust_telp2 || '',
            cust_email: item.cust_email || '',
            cust_npwp: item.cust_npwp || '',
            cust_contactperson: item.cust_contactperson || '',
            cust_jenisusaha: item.cust_jenisusaha || '',
            cust_kreditlimit: item.cust_kreditlimit || 0,
            cust_kredithari: item.cust_kredithari || 0
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.post('/customer/update', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire('Sukses', 'Data customer berhasil diperbarui', 'success');
            setIsEditModalOpen(false);
            fetchCustomers();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal meng-update customer', 'error');
        }
    };

    // 5. SUBMIT DELETE
    const handleDeleteTrigger = (item) => {
        Swal.fire({
            title: 'Hapus Customer?',
            text: `Customer ${item.cust_name || item.cust_id} akan dihapus!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.post('/customer/delete', { cust_id: item.cust_id }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Sukses', 'Customer berhasil dihapus', 'success');
                    fetchCustomers();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus customer', 'error');
                }
            }
        });
    };

    const resetForm = () => {
        setFormData({
            cust_id: '', cust_name: '', cust_alamat1: '', cust_alamat2: '',
            cust_kotaid: '', cust_telp1: '', cust_telp2: '', cust_email: '',
            cust_npwp: '', cust_contactperson: '', cust_jenisusaha: '',
            cust_kreditlimit: 0, cust_kredithari: 0
        });
    };

    // Filter Local Client Search
    const filteredData = dataList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.cust_id && item.cust_id.toLowerCase().includes(q)) ||
            (item.cust_name && item.cust_name.toLowerCase().includes(q)) ||
            (item.cust_npwp && item.cust_npwp.toLowerCase().includes(q)) ||
            (item.cust_telp1 && item.cust_telp1.toLowerCase().includes(q))
        );
    });

    const columns = [
        {
            header: 'KODE & NAMA CUSTOMER',
            accessor: 'cust_name',
            render: (item) => (
                <div>
                    <span
                        className="font-bold text-indigo-600 hover:underline cursor-pointer text-sm block"
                        onClick={() => handleEditTrigger(item)}
                    >
                        {item.cust_name || item.cust_nama}
                    </span>
                    <span className="text-xs text-slate-400 font-mono font-bold">ID: {item.cust_id}</span>
                </div>
            )
        },
        { header: 'NPWP', accessor: 'cust_npwp', render: (item) => item.cust_npwp || '-' },
        { header: 'TELP 1', accessor: 'cust_telp1', render: (item) => item.cust_telp1 || '-' },
        { header: 'TELP 2', accessor: 'cust_telp2', render: (item) => item.cust_telp2 || '-' },
        { header: 'CONTACT PERSON', accessor: 'cust_contactperson', render: (item) => item.cust_contactperson || '-' },
        {
            header: 'STATUS',
            accessor: 'cust_aktifyn',
            render: (item) => (
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${item.cust_aktifyn === 'Y' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {item.cust_aktifyn === 'Y' ? 'AKTIF' : 'NON-AKTIF'}
                </span>
            )
        },
        // 🟢 HARI KERJA DARI CLASSIC ASP
        {
            header: 'SABTU',
            accessor: 'sabtuyn',
            render: (item) => {
                const isChecked = item.work_days?.sabtuyn === 'Y';
                return (
                    <button
                        onClick={(e) => handleToggleWorkDays(item.cust_id, 'sabtuyn', item.work_days?.sabtuyn, e)}
                        className="p-1 hover:bg-slate-100 rounded transition cursor-pointer"
                        title="Toggle Hari Kerja Sabtu"
                    >
                        {isChecked ? <CheckSquare size={18} className="text-emerald-600" /> : <Square size={18} className="text-slate-300" />}
                    </button>
                );
            }
        },
        {
            header: 'MINGGU',
            accessor: 'mingguyn',
            render: (item) => {
                const isChecked = item.work_days?.mingguyn === 'Y';
                return (
                    <button
                        onClick={(e) => handleToggleWorkDays(item.cust_id, 'mingguyn', item.work_days?.mingguyn, e)}
                        className="p-1 hover:bg-slate-100 rounded transition cursor-pointer"
                        title="Toggle Hari Kerja Minggu"
                    >
                        {isChecked ? <CheckSquare size={18} className="text-emerald-600" /> : <Square size={18} className="text-slate-300" />}
                    </button>
                );
            }
        },
        {
            header: 'LIBUR',
            accessor: 'liburyn',
            render: (item) => {
                const isChecked = item.work_days?.liburyn === 'Y';
                return (
                    <button
                        onClick={(e) => handleToggleWorkDays(item.cust_id, 'liburyn', item.work_days?.liburyn, e)}
                        className="p-1 hover:bg-slate-100 rounded transition cursor-pointer"
                        title="Toggle Hari Kerja Libur"
                    >
                        {isChecked ? <CheckSquare size={18} className="text-emerald-600" /> : <Square size={18} className="text-slate-300" />}
                    </button>
                );
            }
        },
    ];

    return (
        <div className="min-h-screen p-4 space-y-4 bg-slate-50 text-slate-800">
            {/* Header Menu */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
                <h3 className="text-base font-black text-slate-700 flex items-center gap-2 uppercase">
                    <Users size={20} className="text-indigo-600" /> Master Customer
                </h3>
            </div>

            {/* FILTER PANEL */}
            <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200 grid grid-cols-12 gap-4 items-end text-xs font-bold text-slate-600">
                <div className="col-span-3">
                    <label className="block mb-1 text-slate-500 uppercase">STATUS AKTIF</label>
                    <div className="flex items-center gap-4 h-[42px] px-3 border border-slate-200 rounded-lg bg-white">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                                type="radio"
                                name="aktifFilter"
                                value="Y"
                                checked={filterAktif === 'Y'}
                                onChange={e => setFilterAktif(e.target.value)}
                                className="text-indigo-600"
                            /> Ya
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                                type="radio"
                                name="aktifFilter"
                                value="N"
                                checked={filterAktif === 'N'}
                                onChange={e => setFilterAktif(e.target.value)}
                                className="text-indigo-600"
                            /> Tidak
                        </label>
                    </div>
                </div>

                <div className="col-span-6">
                    <label className="block mb-1 text-slate-500 uppercase">NAMA / ID CUSTOMER</label>
                    <input
                        type="text"
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:border-indigo-500 bg-white outline-none"
                        placeholder="Cari Nama atau ID Customer..."
                        value={filterNama}
                        onChange={e => setFilterNama(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && fetchCustomers()}
                    />
                </div>

                <div className="col-span-3">
                    <button
                        onClick={fetchCustomers}
                        className="w-full h-[42px] bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition uppercase"
                    >
                        <Search size={14} /> CARI / REFRESH
                    </button>
                </div>
            </div>

            {/* DATA TABLE TEMPLATE */}
            <DataTableTemplate
                title="MASTER CUSTOMER"
                columns={columns}
                data={filteredData}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
                onAdd={() => { resetForm(); setIsAddModalOpen(true); }}
                onEdit={handleEditTrigger}
                onDelete={handleDeleteTrigger}
            />

            {/* MODAL TAMBAH */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-2xl p-6 bg-white rounded-2xl shadow-2xl border flex flex-col my-8">
                        <div className="text-center border-b pb-3 mb-4">
                            <span className="px-4 py-1.5 border border-dashed border-indigo-400 text-indigo-700 font-bold text-sm tracking-wide rounded-sm uppercase">TAMBAH CUSTOMER BARU</span>
                        </div>
                        <form onSubmit={handleAddSubmit} className="space-y-3 text-xs font-bold text-slate-700">
                            <div>
                                <label className="block mb-1">NAMA CUSTOMER *</label>
                                <input type="text" required className="w-full p-2.5 border rounded bg-slate-50 uppercase font-black" placeholder="PT. EXAMPLE INDONESIA" value={formData.cust_name} onChange={e => setFormData({ ...formData, cust_name: e.target.value.toUpperCase() })} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1">KOTA ID *</label>
                                    <input type="text" required className="w-full p-2 border rounded uppercase" placeholder="JKT" value={formData.cust_kotaid} onChange={e => setFormData({ ...formData, cust_kotaid: e.target.value.toUpperCase() })} />
                                </div>
                                <div>
                                    <label className="block mb-1">CONTACT PERSON</label>
                                    <input type="text" className="w-full p-2 border rounded uppercase" placeholder="BAPAK BUDI" value={formData.cust_contactperson} onChange={e => setFormData({ ...formData, cust_contactperson: e.target.value.toUpperCase() })} />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1">ALAMAT UTAMA *</label>
                                <textarea required rows="2" className="w-full p-2 border rounded uppercase" placeholder="JL. RAYA BEKASI KM 20..." value={formData.cust_alamat1} onChange={e => setFormData({ ...formData, cust_alamat1: e.target.value.toUpperCase() })}></textarea>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1">TELP 1 *</label>
                                    <input type="text" required className="w-full p-2 border rounded" placeholder="021889988" value={formData.cust_telp1} onChange={e => setFormData({ ...formData, cust_telp1: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">TELP 2</label>
                                    <input type="text" className="w-full p-2 border rounded" placeholder="08123456789" value={formData.cust_telp2} onChange={e => setFormData({ ...formData, cust_telp2: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1">EMAIL</label>
                                    <input type="email" className="w-full p-2 border rounded" placeholder="info@example.com" value={formData.cust_email} onChange={e => setFormData({ ...formData, cust_email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">NPWP</label>
                                    <input type="text" className="w-full p-2 border rounded" placeholder="01.234.567.8-901.000" value={formData.cust_npwp} onChange={e => setFormData({ ...formData, cust_npwp: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-4 border-t mt-4">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2 border text-slate-600 font-bold rounded-lg bg-white hover:bg-slate-50 uppercase">BATAL</button>
                                <button type="submit" className="px-5 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg uppercase shadow-md">SIMPAN CUSTOMER</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL EDIT */}
            {isEditModalOpen && selectedCustomer && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-2xl p-6 bg-white rounded-2xl shadow-2xl border flex flex-col my-8">
                        <div className="text-center border-b pb-3 mb-4">
                            <span className="px-4 py-1.5 border border-dashed border-amber-500 text-amber-700 font-bold text-sm tracking-wide rounded-sm uppercase">EDIT CUSTOMER: {selectedCustomer.cust_id}</span>
                        </div>
                        <form onSubmit={handleEditSubmit} className="space-y-3 text-xs font-bold text-slate-700">
                            <div>
                                <label className="block mb-1">NAMA CUSTOMER *</label>
                                <input type="text" required className="w-full p-2.5 border rounded bg-amber-50 uppercase font-black" value={formData.cust_name} onChange={e => setFormData({ ...formData, cust_name: e.target.value.toUpperCase() })} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1">KOTA ID *</label>
                                    <input type="text" required className="w-full p-2 border rounded uppercase" value={formData.cust_kotaid} onChange={e => setFormData({ ...formData, cust_kotaid: e.target.value.toUpperCase() })} />
                                </div>
                                <div>
                                    <label className="block mb-1">CONTACT PERSON</label>
                                    <input type="text" className="w-full p-2 border rounded uppercase" value={formData.cust_contactperson} onChange={e => setFormData({ ...formData, cust_contactperson: e.target.value.toUpperCase() })} />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1">ALAMAT UTAMA *</label>
                                <textarea required rows="2" className="w-full p-2 border rounded uppercase" value={formData.cust_alamat1} onChange={e => setFormData({ ...formData, cust_alamat1: e.target.value.toUpperCase() })}></textarea>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1">TELP 1 *</label>
                                    <input type="text" required className="w-full p-2 border rounded" value={formData.cust_telp1} onChange={e => setFormData({ ...formData, cust_telp1: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">TELP 2</label>
                                    <input type="text" className="w-full p-2 border rounded" value={formData.cust_telp2} onChange={e => setFormData({ ...formData, cust_telp2: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-4 border-t mt-4">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2 border text-slate-600 font-bold rounded-lg bg-white hover:bg-slate-50 uppercase">BATAL</button>
                                <button type="submit" className="px-5 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg uppercase shadow-md">UPDATE CUSTOMER</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterCustomerNew;