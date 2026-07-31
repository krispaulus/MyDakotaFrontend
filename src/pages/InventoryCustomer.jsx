import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Boxes, Search, X as XIcon, Save, RefreshCw, FileText, User, Package, Building } from 'lucide-react';
import Swal from 'sweetalert2';

const InventoryCustomer = () => {
    const { isDarkMode } = useDarkMode();
    const [invList, setInvList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter States
    const today = new Date().toISOString().split('T')[0];
    const [filterTgla, setFilterTgla] = useState('2025-01-01');
    const [filterTgle, setFilterTgle] = useState(today);
    const [filterCust, setFilterCust] = useState('');
    const [filterItem, setFilterItem] = useState('');

    const [chkTgl, setChkTgl] = useState(true);

    const [globalSearch, setGlobalSearch] = useState('');

    // --- State Modal (Tambah / Edit) ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Form Data States
    const defaultForm = {
        inv_id: 0,
        inv_tanggal: new Date().toISOString().slice(0, 16).replace('T', ' '),
        inv_cust_id: '',
        inv_cust_name: '',
        inv_item_id: '',
        inv_item_name: '',
        inv_qty: 0,
        inv_sup_id: '',
        inv_sup_name: '',
        inv_surat_jalan: ''
    };
    const [formData, setFormData] = useState(defaultForm);

    useEffect(() => {
        fetchInventoryData();
    }, []);

    // FETCH DATA INVENTORY
    const fetchInventoryData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/inventory-customer', {
                params: {
                    tgla: filterTgla,
                    tgle: filterTgle,
                    cust_id: filterCust,
                    item_id: filterItem,
                    chktgl: chkTgl
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data || [];
            setInvList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Gagal memuat Inventory Customer:", err);
            setInvList([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem saat memuat data', 'error');
        } finally {
            setLoading(false);
        }
    };

    // HANDLER MODAL AKSI (TAMBAH, EDIT, DELETE)
    const handleAdd = () => {
        setIsEditMode(false);
        setFormData(defaultForm);
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setIsEditMode(true);
        setFormData({
            inv_id: item.inv_id || 0,
            inv_tanggal: item.inv_tanggal || today,
            inv_cust_id: item.inv_cust_id || '',
            inv_cust_name: item.inv_cust_name || '',
            inv_item_id: item.inv_item_id || '',
            inv_item_name: item.inv_item_name || '',
            inv_qty: item.inv_qty || 0,
            inv_sup_id: item.inv_sup_id || '',
            inv_sup_name: item.inv_sup_name || '',
            inv_surat_jalan: item.inv_surat_jalan || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus Record Inventory?',
            text: `Apakah Anda yakin ingin menghapus stok ${item.inv_item_name} milik ${item.inv_cust_name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete('/operasional/inventory-customer-delete', {
                        params: { inv_id: item.inv_id },
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Terhapus!', 'Record inventory berhasil dihapus.', 'success');
                    fetchInventoryData();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus record', 'error');
                }
            }
        });
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!formData.inv_cust_id || !formData.inv_item_id || !formData.inv_surat_jalan) {
            Swal.fire('Peringatan', 'Cust ID, Item ID, dan No. Surat Jalan Wajib Diisi!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const endpoint = isEditMode ? '/operasional/inventory-customer-update' : '/operasional/inventory-customer-create';
            const method = isEditMode ? api.put : api.post;

            await method(endpoint, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses!', isEditMode ? 'Data Inventory berhasil diperbarui.' : 'Data Inventory baru berhasil ditambahkan.', 'success');
            setIsModalOpen(false);
            fetchInventoryData();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan data', 'error');
        }
    };

    const updateField = (key, val) => {
        setFormData(prev => ({ ...prev, [key]: val }));
    };

    // DEFINISI KOLOM TABLE
    const columns = [
        {
            header: 'TANGGAL MASUK',
            accessor: 'inv_tanggal',
            render: (i) => <span className="font-mono text-slate-600">{i.inv_tanggal}</span>
        },
        {
            header: 'NAMA CUSTOMER',
            accessor: 'inv_cust_name',
            render: (i) => <span className="font-bold text-slate-800 uppercase">{i.inv_cust_name} ({i.inv_cust_id})</span>
        },
        {
            header: 'NAMA ITEM / SKU',
            accessor: 'inv_item_name',
            render: (i) => <span className="font-bold text-indigo-700 uppercase">{i.inv_item_name} ({i.inv_item_id})</span>
        },
        {
            header: 'QTY',
            accessor: 'inv_qty',
            render: (i) => <span className="font-mono font-bold text-emerald-700 text-sm">{i.inv_qty} Unit</span>
        },
        {
            header: 'SUPPLIER',
            accessor: 'inv_sup_name',
            render: (i) => <span className="font-semibold text-slate-700 uppercase">{i.inv_sup_name !== '-' ? `${i.inv_sup_name}` : '-'}</span>
        },
        {
            header: 'NO. SURAT JALAN',
            accessor: 'inv_surat_jalan',
            render: (i) => <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border">{i.inv_surat_jalan}</span>
        },
        {
            header: 'PETUGAS',
            accessor: 'inv_update_id',
            render: (i) => <span className="font-semibold text-slate-600 uppercase">{i.inv_update_id}</span>
        }
    ];

    // Client-side Search Filter
    const filteredList = invList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.inv_cust_name && item.inv_cust_name.toLowerCase().includes(q)) ||
            (item.inv_item_name && item.inv_item_name.toLowerCase().includes(q)) ||
            (item.inv_surat_jalan && item.inv_surat_jalan.toLowerCase().includes(q))
        );
    });

    return (
        <div className="space-y-4 font-sans">
            {/* PANEL FILTER ATAS */}
            <div className="p-4 bg-white rounded-2xl shadow-xs border border-slate-200 space-y-3 text-xs font-bold text-slate-600">
                <div className="grid grid-cols-12 gap-3">

                    {/* FILTER TANGGAL */}
                    <div className="col-span-4">
                        <div className="flex items-center gap-1 mb-1">
                            <input
                                type="checkbox"
                                id="chkTgl"
                                checked={chkTgl}
                                onChange={e => setChkTgl(e.target.checked)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                            />
                            <label htmlFor="chkTgl" className="text-slate-600 uppercase cursor-pointer">FILTER PERIODE TANGGAL</label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="date"
                                disabled={!chkTgl}
                                className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium ${!chkTgl ? 'bg-slate-100 text-slate-400' : 'bg-white'}`}
                                value={filterTgla}
                                onChange={e => setFilterTgla(e.target.value)}
                            />
                            <input
                                type="date"
                                disabled={!chkTgl}
                                className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium ${!chkTgl ? 'bg-slate-100 text-slate-400' : 'bg-white'}`}
                                value={filterTgle}
                                onChange={e => setFilterTgle(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* FILTER CUSTOMER */}
                    <div className="col-span-4">
                        <label className="block mb-1 text-slate-500 uppercase">CARI CUSTOMER</label>
                        <input
                            type="text"
                            placeholder="NAMA ATAU CUST ID..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase bg-white"
                            value={filterCust}
                            onChange={e => setFilterCust(e.target.value)}
                        />
                    </div>

                    {/* FILTER ITEM */}
                    <div className="col-span-4">
                        <label className="block mb-1 text-slate-500 uppercase">CARI ITEM BARANG</label>
                        <input
                            type="text"
                            placeholder="NAMA ITEM ATAU SKU..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase bg-white"
                            value={filterItem}
                            onChange={e => setFilterItem(e.target.value)}
                        />
                    </div>
                </div>

                {/* BUTTON REFRESH */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                        onClick={fetchInventoryData}
                        className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg flex items-center gap-2 font-black transition cursor-pointer text-xs uppercase shadow-md"
                    >
                        <RefreshCw size={15} /> REFRESH INVENTORY
                    </button>
                </div>
            </div>

            {/* DATATABLE TEMPLATE DENGAN PAGINATION & MODAL ACTION */}
            <DataTableTemplate
                title="PENAMBAHAN INVENTORY BARANG CUSTOMER (INBOUND STOK)"
                columns={columns}
                data={filteredList}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            {/* CUSTOM MODAL EDIT / TAMBAH INVENTORY BARANG CUSTOMER */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-3xl p-6 rounded-2xl shadow-2xl transition-all border flex flex-col min-h-0 ${isDarkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`}>

                        {/* Title Header */}
                        <div className="flex justify-between items-center pb-3 border-b dark:border-slate-700">
                            <h3 className="text-sm font-black text-blue-600 dark:text-blue-400 flex items-center gap-2 uppercase tracking-wide">
                                <Boxes size={18} />
                                {isEditMode ? `EDIT INVENTORY ITEM: ${formData.inv_item_name}` : 'INPUT PENAMBAHAN INVENTORY BARANG CUSTOMER'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition cursor-pointer">
                                <XIcon size={18} />
                            </button>
                        </div>

                        {/* FORM INPUT BODY - GRID 2 KOLOM SEJAJAR SEED LENGKAP */}
                        <form onSubmit={handleSubmitForm} className="space-y-4 text-xs mt-4">
                            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">CUST ID</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg font-mono font-bold text-blue-600 outline-none uppercase bg-white"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        placeholder="Misal: CUST001"
                                        value={formData.inv_cust_id}
                                        onChange={e => updateField('inv_cust_id', e.target.value.toUpperCase())}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">NAMA CUSTOMER</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg font-bold uppercase outline-none bg-white"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        placeholder="Nama PT / Toko Customer..."
                                        value={formData.inv_cust_name}
                                        onChange={e => updateField('inv_cust_name', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">ITEM ID / SKU</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg font-mono font-bold uppercase outline-none bg-white"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        placeholder="Misal: ITM-01"
                                        value={formData.inv_item_id}
                                        onChange={e => updateField('inv_item_id', e.target.value.toUpperCase())}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">NAMA ITEM BARANG</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg font-bold uppercase outline-none bg-white"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        placeholder="Deskripsi barang..."
                                        value={formData.inv_item_name}
                                        onChange={e => updateField('inv_item_name', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">QUANTITY (QTY)</label>
                                    <input
                                        type="number"
                                        className="w-full p-2.5 border rounded-lg font-mono font-bold outline-none bg-white"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        placeholder="0"
                                        value={formData.inv_qty}
                                        onChange={e => updateField('inv_qty', e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">NO. SURAT JALAN SUPPLIER</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg font-mono font-bold uppercase outline-none bg-white"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        placeholder="Misal: SJ-SUP-2025-001"
                                        value={formData.inv_surat_jalan}
                                        onChange={e => updateField('inv_surat_jalan', e.target.value.toUpperCase())}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">SUPPLIER ID</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg font-mono outline-none uppercase bg-white"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        placeholder="Misal: SUP001"
                                        value={formData.inv_sup_id}
                                        onChange={e => updateField('inv_sup_id', e.target.value.toUpperCase())}
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">NAMA SUPPLIER</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg font-bold uppercase outline-none bg-white"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        placeholder="Nama Pemasok..."
                                        value={formData.inv_sup_name}
                                        onChange={e => updateField('inv_sup_name', e.target.value)}
                                    />
                                </div>

                            </div>

                            {/* FOOTER ACTION STICKY */}
                            <div className="flex justify-end gap-3 pt-3 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-lg border font-bold hover:bg-slate-100 transition cursor-pointer text-slate-600"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 font-black shadow-md transition cursor-pointer"
                                >
                                    <Save size={14} />
                                    {isEditMode ? 'Simpan Perubahan' : 'Simpan Inventory'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryCustomer;