import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { PackageMinus, Search, X as XIcon, Save, RefreshCw, FileText, User, Package } from 'lucide-react';
import Swal from 'sweetalert2';

const PengeluaranInventoryCustomer = () => {
    const { isDarkMode } = useDarkMode();
    const [invOutList, setInvOutList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter States
    const today = new Date().toISOString().split('T')[0];
    const [filterTgla, setFilterTgla] = useState('2025-01-01');
    const [filterTgle, setFilterTgle] = useState(today);
    const [filterCust, setFilterCust] = useState('');
    const [filterItem, setFilterItem] = useState('');
    const [filterNoBtt, setFilterNoBtt] = useState('');

    const [chkTgl, setChkTgl] = useState(true);

    const [globalSearch, setGlobalSearch] = useState('');

    // --- State Modal (Tambah / Edit) ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Form Data States
    const defaultForm = {
        out_id: 0,
        out_tanggal: new Date().toISOString().slice(0, 16).replace('T', ' '),
        out_cust_id: '',
        out_cust_name: '',
        out_item_id: '',
        out_item_name: '',
        out_qty: 0,
        out_no_btt: ''
    };
    const [formData, setFormData] = useState(defaultForm);

    useEffect(() => {
        fetchInventoryOutData();
    }, []);

    // FETCH DATA PENGELUARAN INVENTORY
    const fetchInventoryOutData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/inventory-customer-out', {
                params: {
                    tgla: filterTgla,
                    tgle: filterTgle,
                    cust_id: filterCust,
                    item_id: filterItem,
                    no_btt: filterNoBtt,
                    chktgl: chkTgl
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data || [];
            setInvOutList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Gagal memuat Pengeluaran Inventory Customer:", err);
            setInvOutList([]);
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
            out_id: item.out_id || 0,
            out_tanggal: item.out_tanggal || today,
            out_cust_id: item.out_cust_id || '',
            out_cust_name: item.out_cust_name || '',
            out_item_id: item.out_item_id || '',
            out_item_name: item.out_item_name || '',
            out_qty: item.out_qty || 0,
            out_no_btt: item.out_no_btt || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus Record Pengeluaran?',
            text: `Apakah Anda yakin ingin menghapus pengeluaran stok ${item.out_item_name} dengan BTT ${item.out_no_btt}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete('/operasional/inventory-customer-out-delete', {
                        params: { out_id: item.out_id },
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Terhapus!', 'Record pengeluaran inventory berhasil dihapus.', 'success');
                    fetchInventoryOutData();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus record', 'error');
                }
            }
        });
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!formData.out_cust_id || !formData.out_item_id || !formData.out_no_btt) {
            Swal.fire('Peringatan', 'Cust ID, Item ID, dan No. BTT Wajib Diisi!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const endpoint = isEditMode ? '/operasional/inventory-customer-out-update' : '/operasional/inventory-customer-out-create';
            const method = isEditMode ? api.put : api.post;

            await method(endpoint, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses!', isEditMode ? 'Data Pengeluaran Inventory berhasil diperbarui.' : 'Data Pengeluaran Inventory baru berhasil ditambahkan.', 'success');
            setIsModalOpen(false);
            fetchInventoryOutData();
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
            header: 'TANGGAL KELUAR',
            accessor: 'out_tanggal',
            render: (i) => <span className="font-mono text-slate-600">{i.out_tanggal}</span>
        },
        {
            header: 'NAMA CUSTOMER',
            accessor: 'out_cust_name',
            render: (i) => <span className="font-bold text-slate-800 uppercase">{i.out_cust_name} ({i.out_cust_id})</span>
        },
        {
            header: 'NAMA ITEM / SKU',
            accessor: 'out_item_name',
            render: (i) => <span className="font-bold text-indigo-700 uppercase">{i.out_item_name} ({i.out_item_id})</span>
        },
        {
            header: 'QTY OUT',
            accessor: 'out_qty',
            render: (i) => <span className="font-mono font-bold text-indigo-700 text-sm">{i.out_qty} Unit</span>
        },
        {
            header: 'NO. BTT / RESI',
            accessor: 'out_no_btt',
            render: (i) => <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">{i.out_no_btt}</span>
        },
        {
            header: 'PETUGAS',
            accessor: 'out_update_id',
            render: (i) => <span className="font-semibold text-slate-600 uppercase">{i.out_update_id}</span>
        }
    ];

    // Client-side Search Filter
    const filteredList = invOutList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.out_cust_name && item.out_cust_name.toLowerCase().includes(q)) ||
            (item.out_item_name && item.out_item_name.toLowerCase().includes(q)) ||
            (item.out_no_btt && item.out_no_btt.toLowerCase().includes(q))
        );
    });

    return (
        <div className="space-y-4 font-sans">
            {/* PANEL FILTER ATAS */}
            <div className="p-4 bg-white rounded-2xl shadow-xs border border-slate-200 space-y-3 text-xs font-bold text-slate-600">
                <div className="grid grid-cols-12 gap-3">

                    {/* FILTER TANGGAL */}
                    <div className="col-span-3">
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
                    <div className="col-span-3">
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
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">CARI ITEM BARANG</label>
                        <input
                            type="text"
                            placeholder="NAMA ITEM ATAU SKU..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase bg-white"
                            value={filterItem}
                            onChange={e => setFilterItem(e.target.value)}
                        />
                    </div>

                    {/* FILTER NO BTT */}
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">CARI NO. BTT / RESI</label>
                        <input
                            type="text"
                            placeholder="NO. BTT RESI..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase bg-white"
                            value={filterNoBtt}
                            onChange={e => setFilterNoBtt(e.target.value)}
                        />
                    </div>
                </div>

                {/* BUTTON REFRESH */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                        onClick={fetchInventoryOutData}
                        className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg flex items-center gap-2 font-black transition cursor-pointer text-xs uppercase shadow-md"
                    >
                        <RefreshCw size={15} /> REFRESH PENGELUARAN
                    </button>
                </div>
            </div>

            {/* DATATABLE TEMPLATE DENGAN PAGINATION & MODAL ACTION */}
            <DataTableTemplate
                title="PENGELUARAN INVENTORY BARANG CUSTOMER (OUTBOUND STOK)"
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

            {/* MODAL DIALOG EDIT / TAMBAH DENGAN UI/UX BIRU / INDIGO DISAMAKAN DENGAN GAMBAR 3 */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">

                        {/* Title Header Modal */}
                        <div className="px-8 pt-8 pb-4 flex justify-between items-center border-b border-slate-100">
                            <h2 className="text-xl font-bold font-['Inter'] text-slate-900 tracking-wide uppercase">
                                {isEditMode ? 'EDIT PENGELUARAN INVENTORY INFO' : 'ADD PENGELUARAN INVENTORY INFO'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer">
                                <XIcon size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Body Form 2 Kolom Sejajar Presisi */}
                        <form onSubmit={handleSubmitForm} className="p-8 space-y-6 text-sm font-medium text-slate-700">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-5">

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">CUST ID</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all font-mono uppercase bg-white"
                                        placeholder="Contoh: CUST001"
                                        value={formData.out_cust_id}
                                        onChange={e => updateField('out_cust_id', e.target.value.toUpperCase())}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">NAMA CUSTOMER</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all bg-white"
                                        placeholder="NAMA PT / TOKO CUSTOMER..."
                                        value={formData.out_cust_name}
                                        onChange={e => updateField('out_cust_name', e.target.value)}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">ITEM ID / SKU</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all font-mono uppercase bg-white"
                                        placeholder="Contoh: ITM-01"
                                        value={formData.out_item_id}
                                        onChange={e => updateField('out_item_id', e.target.value.toUpperCase())}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">NAMA ITEM BARANG</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all bg-white"
                                        placeholder="DESKRIPSI BARANG..."
                                        value={formData.out_item_name}
                                        onChange={e => updateField('out_item_name', e.target.value)}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">QUANTITY OUT (QTY KELUAR)</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all font-mono bg-white"
                                        placeholder="0"
                                        value={formData.out_qty}
                                        onChange={e => updateField('out_qty', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">NO. BTT / RESI PENGIRIMAN</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all font-mono uppercase bg-white"
                                        placeholder="Contoh: 0060010/01/2025/OJ"
                                        value={formData.out_no_btt}
                                        onChange={e => updateField('out_no_btt', e.target.value.toUpperCase())}
                                        required
                                    />
                                </div>

                            </div>

                            {/* Action Buttons Footer di Tengah Bawah Sesuai Gambar 3 */}
                            <div className="flex justify-center items-center gap-4 pt-6 border-t border-slate-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-[160px] py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all uppercase tracking-wide cursor-pointer text-center text-xs"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="submit"
                                    className="w-[160px] py-3 bg-[#1e1b4b] hover:opacity-90 active:scale-98 text-white font-bold rounded-xl transition-all uppercase tracking-wide cursor-pointer text-center text-xs shadow-md"
                                >
                                    {isEditMode ? 'UPDATE ITEM' : 'ADD ITEM'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PengeluaranInventoryCustomer;