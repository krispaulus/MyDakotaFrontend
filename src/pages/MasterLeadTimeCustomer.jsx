import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Clock, Search } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from "../context/DarkModeContext";
import Swal from 'sweetalert2';

const MasterLeadTimeCustomer = () => {
    const { isDarkMode } = useDarkMode();
    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [customerOptions, setCustomerOptions] = useState([]);

    // Filter Query Server (Grid Atas)
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterKotaAsal, setFilterKotaAsal] = useState('');
    const [filterKotaTujuan, setFilterKotaTujuan] = useState('');

    // Local Search State untuk Input di Tabel
    const [globalSearch, setGlobalSearch] = useState('');

    // State Modal CRUD
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // State Suggest Geografi (Menggunakan endpoint BTT /btt/search-geo)
    const [geoSuggestions, setGeoSuggestions] = useState([]);
    const [focusedField, setFocusedField] = useState(null); // 'kabupaten' | 'kota_asal' | 'kota_tujuan'

    const [formData, setFormData] = useState({
        customer_id: '',
        kota_asal: '',
        kota_tujuan: '',
        kabupaten: '',
        darat: 0,
        laut: 0,
        udara: 0
    });

    const [editFormData, setEditFormData] = useState({
        darat: 0,
        laut: 0,
        udara: 0
    });

    const fetchLeadTime = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = {};
            if (filterCustomer && filterCustomer.trim() !== '') params.customer_id = filterCustomer.trim();
            if (filterKotaAsal && filterKotaAsal.trim() !== '') params.kota_asal = filterKotaAsal.trim();
            if (filterKotaTujuan && filterKotaTujuan.trim() !== '') params.kota_tujuan = filterKotaTujuan.trim();

            const res = await api.get('/master/leadtime-customer/list', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            const list = res.data?.data;
            if (Array.isArray(list)) {
                setDataList(list);
            } else if (Array.isArray(res.data)) {
                setDataList(res.data);
            } else {
                setDataList([]);
            }
        } catch (err) {
            console.error("Gagal memuat data lead time:", err);
            setDataList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await api.get('/master/customer/active-list', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCustomerOptions(res.data?.data || res.data || []);
            } catch (e) {
                console.error("Gagal load master customer", e);
            }
        };
        fetchCustomers();
        fetchLeadTime();
    }, []);

    // 🚀 FUNGSI LIVE SEARCH WILAYAH (MENGGUNAKAN ENDPOINT BTT)
    const handleLiveSearchGeo = async (fieldName, value) => {
        const upperVal = (value || '').toUpperCase();
        setFormData(prev => ({ ...prev, [fieldName]: upperVal }));
        setFocusedField(fieldName);

        if (!upperVal || upperVal.trim().length < 2) {
            setGeoSuggestions([]);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/btt/search-geo?q=${encodeURIComponent(upperVal.trim())}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.status === "success") {
                const rawList = Array.isArray(res.data.data) ? res.data.data : [];
                // Hilangkan duplikat Kabupaten/Kota agar list rapi untuk master lead time
                const uniqueMap = new Map();
                rawList.forEach(item => {
                    const key = `${item.kabupaten}-${item.propinsi}`;
                    if (!uniqueMap.has(key) && item.kabupaten) {
                        uniqueMap.set(key, item);
                    }
                });
                setGeoSuggestions(Array.from(uniqueMap.values()));
            } else {
                setGeoSuggestions([]);
            }
        } catch (err) {
            console.error("Gagal memuat suggest wilayah:", err);
            setGeoSuggestions([]);
        }
    };

    // FILTER CLIENT-SIDE (Pencarian Instant dari Input Tabel)
    const filteredData = dataList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.customer_id && item.customer_id.toLowerCase().includes(q)) ||
            (item.cust_name && item.cust_name.toLowerCase().includes(q)) ||
            (item.kota_asal && item.kota_asal.toLowerCase().includes(q)) ||
            (item.kota_tujuan && item.kota_tujuan.toLowerCase().includes(q)) ||
            (item.kabupaten && item.kabupaten.toLowerCase().includes(q))
        );
    });

    // ➕ SUBMIT TAMBAH
    const handleAddSubmit = async (e) => {
        e.preventDefault();
        if (!formData.customer_id || !formData.kota_asal || !formData.kota_tujuan) {
            return Swal.fire('Peringatan', 'Customer, Kota Asal, dan Kota Tujuan wajib diisi!', 'warning');
        }
        try {
            const token = localStorage.getItem('token');
            // Sesuai logic ASP lawas: jika kabupaten kosong, samakan dengan kota_tujuan
            const payload = {
                ...formData,
                kabupaten: formData.kabupaten.trim() || formData.kota_tujuan.trim()
            };
            await api.post('/master/leadtime-customer/add', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire('Sukses', 'Data lead time baru berhasil disimpan', 'success');
            setIsAddModalOpen(false);
            setFormData({ customer_id: '', kota_asal: '', kota_tujuan: '', kabupaten: '', darat: 0, laut: 0, udara: 0 });
            setGeoSuggestions([]);
            fetchLeadTime();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menambah data lead time baru', 'error');
        }
    };

    // 📝 TRIGGER EDIT
    const handleEditTrigger = (item) => {
        setSelectedItem(item);
        setEditFormData({
            darat: item.darat || 0,
            laut: item.laut || 0,
            udara: item.udara || 0
        });
        setIsEditModalOpen(true);
    };

    // 💾 SUBMIT EDIT
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const payload = {
                customer_id: selectedItem.customer_id,
                kota_asal: selectedItem.kota_asal,
                kota_tujuan: selectedItem.kota_tujuan,
                kabupaten: selectedItem.kabupaten || '',
                darat: parseInt(editFormData.darat) || 0,
                laut: parseInt(editFormData.laut) || 0,
                udara: parseInt(editFormData.udara) || 0
            };
            await api.put('/master/leadtime-customer/update', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire('Sukses', 'Data lead time berhasil diperbarui!', 'success');
            setIsEditModalOpen(false);
            fetchLeadTime();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal meng-update data lead time', 'error');
        }
    };

    // 🗑️ SUBMIT DELETE
    const handleDeleteTrigger = (item) => {
        Swal.fire({
            title: 'Hapus Lead Time?',
            text: `Data rute ${item.kota_asal} ke ${item.kota_tujuan} (${item.customer_id}) akan dihapus!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete('/master/leadtime-customer/delete', {
                        headers: { Authorization: `Bearer ${token}` },
                        params: {
                            customer_id: item.customer_id,
                            kota_asal: item.kota_asal,
                            kota_tujuan: item.kota_tujuan,
                            kabupaten: item.kabupaten || ''
                        }
                    });
                    Swal.fire('Sukses', 'Data lead time berhasil dihapus', 'success');
                    fetchLeadTime();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus data lead time', 'error');
                }
            }
        });
    };

    const columns = [
        {
            header: 'CUSTOMER',
            accessor: 'cust_name',
            render: (item) => (
                <span className="font-bold text-indigo-600 text-sm cursor-pointer hover:underline" onClick={() => handleEditTrigger(item)}>
                    {item.cust_name || item.customer_id}
                    <span className="block text-xs font-normal text-slate-400">ID: {item.customer_id}</span>
                </span>
            )
        },
        { header: 'KOTA ASAL', accessor: 'kota_asal' },
        { header: 'KOTA TUJUAN', accessor: 'kota_tujuan' },
        { header: 'KABUPATEN', accessor: 'kabupaten', render: (item) => item.kabupaten || '-' },
        {
            header: 'DARAT (HARI)',
            accessor: 'darat',
            render: (item) => <span className="font-bold text-amber-600">{item.darat} HARI</span>
        },
        {
            header: 'LAUT (HARI)',
            accessor: 'laut',
            render: (item) => <span className="font-bold text-blue-600">{item.laut} HARI</span>
        },
        {
            header: 'UDARA (HARI)',
            accessor: 'udara',
            render: (item) => (
                <span className="font-bold text-cyan-600">
                    {item.udara > 999 ? '-' : `${item.udara} HARI`}
                </span>
            )
        },
    ];

    // Komponen Dropdown Melayang ala BTT
    const renderGeoDropdown = (onSelectCallback) => {
        if (!Array.isArray(geoSuggestions) || geoSuggestions.length === 0) return null;
        return (
            <div className="absolute left-0 right-0 top-[62px] bg-white border-2 border-teal-400 text-slate-900 rounded-xl shadow-2xl z-[99999] max-h-48 overflow-y-auto text-xs text-left">
                {geoSuggestions.map((item, idx) => (
                    <div
                        key={idx}
                        onMouseDown={() => {
                            onSelectCallback(item);
                            setGeoSuggestions([]);
                            setFocusedField(null);
                        }}
                        className="p-2.5 hover:bg-teal-50 cursor-pointer border-b last:border-b-0 font-bold text-slate-800 transition-colors"
                    >
                        📍 <span className="text-teal-700">{item.kabupaten}</span>
                        <span className="block text-[10px] text-slate-400 font-normal pl-4">
                            {item.propinsi} {item.kecamatan ? `(Kec. ${item.kecamatan})` : ''}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen p-4 space-y-4 bg-slate-50 text-slate-800">
            {/* Header Menu */}
            <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                <h3 className="text-base font-black text-slate-700 flex items-center gap-2 uppercase">
                    <Clock size={20} className="text-indigo-600" /> Master Data Lead Time Customer
                </h3>
            </div>

            {/* GRID FILTER PENCARIAN SERVER */}
            <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200 grid grid-cols-4 gap-4 items-end text-xs font-bold text-slate-600">
                <div>
                    <label className="block mb-1 text-slate-500 uppercase">CUSTOMER</label>
                    <select
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:border-indigo-500 bg-white outline-none"
                        value={filterCustomer}
                        onChange={e => setFilterCustomer(e.target.value)}
                    >
                        <option value="">-- SEMUA CUSTOMER --</option>
                        {customerOptions.map(c => (
                            <option key={c.Cust_ID || c.cust_id} value={c.Cust_ID || c.cust_id}>
                                {c.Cust_Name || c.cust_name} ({c.Cust_ID || c.cust_id})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block mb-1 text-slate-500 uppercase">KOTA ASAL</label>
                    <input
                        type="text"
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:border-indigo-500 bg-white outline-none"
                        placeholder="Cari Kota Asal..."
                        value={filterKotaAsal}
                        onChange={e => setFilterKotaAsal(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && fetchLeadTime()}
                    />
                </div>
                <div>
                    <label className="block mb-1 text-slate-500 uppercase">KOTA TUJUAN</label>
                    <input
                        type="text"
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:border-indigo-500 bg-white outline-none"
                        placeholder="Cari Kota Tujuan..."
                        value={filterKotaTujuan}
                        onChange={e => setFilterKotaTujuan(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && fetchLeadTime()}
                    />
                </div>
                <div>
                    <button onClick={fetchLeadTime} className="w-full h-[42px] bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition uppercase">
                        <Search size={14} /> CARI DATA
                    </button>
                </div>
            </div>

            {/* RENDERING TEMPLATE */}
            <DataTableTemplate
                title="MASTER LEAD TIME CUSTOMER"
                columns={columns}
                data={filteredData}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
                onAdd={() => {
                    setGeoSuggestions([]);
                    setFocusedField(null);
                    setIsAddModalOpen(true);
                }}
                onEdit={handleEditTrigger}
                onDelete={(item) => handleDeleteTrigger(item)}
            />

            {/* MODAL TAMBAH DENGAN SUGGEST ALA BTT */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-3xl p-6 bg-white rounded-2xl shadow-2xl border flex flex-col my-8">
                        <div className="text-center border-b pb-3 mb-4">
                            <span className="px-4 py-1.5 border border-dashed border-blue-400 text-blue-700 font-bold text-sm tracking-wide rounded-sm uppercase">TAMBAH MASTER LEAD TIME</span>
                        </div>
                        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-bold text-slate-700">
                            <div className="grid grid-cols-2 gap-3">
                                {/* CUSTOMER */}
                                <div>
                                    <label className="block mb-1">CUSTOMER</label>
                                    <select
                                        required
                                        className="w-full p-2 border rounded bg-white font-bold text-sm uppercase outline-none focus:border-indigo-500"
                                        value={formData.customer_id}
                                        onChange={e => setFormData({ ...formData, customer_id: e.target.value })}
                                    >
                                        <option value="">-- PILIH CUSTOMER --</option>
                                        {customerOptions.map(c => (
                                            <option key={c.Cust_ID || c.cust_id} value={c.Cust_ID || c.cust_id}>
                                                {c.Cust_Name || c.cust_name} ({c.Cust_ID || c.cust_id})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* KABUPATEN DENGAN SUGGEST */}
                                <div className="relative">
                                    <label className="block mb-1">KABUPATEN</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded font-bold uppercase outline-none focus:border-teal-500"
                                        placeholder="Ketik kabupaten... (Contoh: BOGOR)"
                                        value={formData.kabupaten}
                                        onChange={e => handleLiveSearchGeo('kabupaten', e.target.value)}
                                        onFocus={() => setFocusedField('kabupaten')}
                                        onBlur={() => setTimeout(() => setFocusedField(null), 200)}
                                    />
                                    {focusedField === 'kabupaten' && renderGeoDropdown((item) => {
                                        const kab = (item.kabupaten || '').toUpperCase();
                                        setFormData(prev => ({
                                            ...prev,
                                            kabupaten: kab,
                                            kota_tujuan: prev.kota_tujuan || kab
                                        }));
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* KOTA ASAL DENGAN SUGGEST */}
                                <div className="relative">
                                    <label className="block mb-1">KOTA ASAL</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-2 border rounded font-bold uppercase outline-none focus:border-teal-500"
                                        placeholder="Ketik kota asal... (Contoh: BEKASI)"
                                        value={formData.kota_asal}
                                        onChange={e => handleLiveSearchGeo('kota_asal', e.target.value)}
                                        onFocus={() => setFocusedField('kota_asal')}
                                        onBlur={() => setTimeout(() => setFocusedField(null), 200)}
                                    />
                                    {focusedField === 'kota_asal' && renderGeoDropdown((item) => {
                                        const kab = (item.kabupaten || '').toUpperCase();
                                        setFormData(prev => ({ ...prev, kota_asal: kab }));
                                    })}
                                </div>

                                {/* KOTA TUJUAN DENGAN SUGGEST */}
                                <div className="relative">
                                    <label className="block mb-1">KOTA TUJUAN</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-2 border rounded font-bold uppercase outline-none focus:border-teal-500"
                                        placeholder="Ketik kota tujuan... (Contoh: SURABAYA)"
                                        value={formData.kota_tujuan}
                                        onChange={e => handleLiveSearchGeo('kota_tujuan', e.target.value)}
                                        onFocus={() => setFocusedField('kota_tujuan')}
                                        onBlur={() => setTimeout(() => setFocusedField(null), 200)}
                                    />
                                    {focusedField === 'kota_tujuan' && renderGeoDropdown((item) => {
                                        const kab = (item.kabupaten || '').toUpperCase();
                                        setFormData(prev => ({
                                            ...prev,
                                            kota_tujuan: kab,
                                            kabupaten: kab // Otomatis sinkron seperti di file lawas
                                        }));
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border">
                                <div>
                                    <label className="block mb-1 text-amber-700">🚚 DARAT (HARI)</label>
                                    <input type="number" min="0" className="w-full p-2 border rounded font-bold text-center" value={formData.darat} onChange={e => setFormData({ ...formData, darat: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block mb-1 text-blue-700">🚢 LAUT (HARI)</label>
                                    <input type="number" min="0" className="w-full p-2 border rounded font-bold text-center" value={formData.laut} onChange={e => setFormData({ ...formData, laut: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block mb-1 text-cyan-700">✈️ UDARA (HARI)</label>
                                    <input type="number" min="0" className="w-full p-2 border rounded font-bold text-center" value={formData.udara} onChange={e => setFormData({ ...formData, udara: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div className="flex items-center justify-center gap-3 pt-4 border-t mt-6">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-2 border text-slate-600 font-bold rounded-lg bg-white hover:bg-slate-50 text-xs uppercase">CANCEL</button>
                                <button type="submit" className="px-6 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg text-xs uppercase shadow-md">SAVE LEAD TIME</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL EDIT */}
            {isEditModalOpen && selectedItem && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-3xl p-6 bg-white rounded-2xl shadow-2xl border flex flex-col my-8">
                        <div className="text-center border-b pb-3 mb-4">
                            <span className="px-4 py-1.5 border border-dashed border-amber-500 text-amber-700 font-bold text-sm tracking-wide rounded-sm uppercase">EDIT LEAD TIME: {selectedItem.cust_name || selectedItem.customer_id} ({selectedItem.kota_asal} ➔ {selectedItem.kota_tujuan})</span>
                        </div>
                        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-bold text-slate-700">
                            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border">
                                <div>
                                    <label className="block mb-1 text-amber-700">🚚 DARAT (HARI)</label>
                                    <input type="number" min="0" className="w-full p-2 border rounded font-bold text-center" value={editFormData.darat} onChange={e => setEditFormData({ ...editFormData, darat: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block mb-1 text-blue-700">🚢 LAUT (HARI)</label>
                                    <input type="number" min="0" className="w-full p-2 border rounded font-bold text-center" value={editFormData.laut} onChange={e => setEditFormData({ ...editFormData, laut: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block mb-1 text-cyan-700">✈️ UDARA (HARI)</label>
                                    <input type="number" min="0" className="w-full p-2 border rounded font-bold text-center" value={editFormData.udara} onChange={e => setEditFormData({ ...editFormData, udara: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div className="flex items-center justify-center gap-3 pt-4 border-t mt-6">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-6 py-2 border text-slate-600 font-bold rounded-lg bg-white hover:bg-slate-50 text-xs uppercase">CANCEL</button>
                                <button type="submit" className="px-6 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg text-xs uppercase shadow-md">UPDATE LEAD TIME</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterLeadTimeCustomer;