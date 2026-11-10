import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Trash2, Search, RefreshCw, Split, X } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../api/axios';

const EditMasterHargaMultidrop = ({ customer, onBack }) => {
    const token = localStorage.getItem('token');
    const [tarifList, setTarifList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const [formNew, setFormNew] = useState({
        propinsi: '',
        kabupaten: '',
        kecamatan: '',
        harga_kg: 0,
        kg_min: 0,
        kg_max: 0,
        harga_over_kg_max: 0,
        harga_kg_dg: 0
    });

    const fetchTarifMultidrop = async () => {
        if (!customer?.cust_id) return;
        setLoading(true);
        try {
            const res = await api.get(`/tarif-customer/multidrop/detail?customer_id=${customer.cust_id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.status === 'success') {
                setTarifList(res.data.data || []);
            } else {
                setTarifList([]);
            }
        } catch (err) {
            console.error(err);
            setTarifList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTarifMultidrop();
    }, [customer]);

    const handleFieldBlur = async (id, fieldName, value) => {
        try {
            await api.post('/tarif-customer/multidrop/update-field', {
                id,
                field: fieldName,
                value: parseFloat(value) || 0
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error('Gagal autosave multidrop:', err);
        }
    };

    const handleLocalChange = (id, fieldName, newVal) => {
        setTarifList(prev => prev.map(item => item.id === id ? { ...item, [fieldName]: newVal } : item));
    };

    const handleDeleteRow = (item) => {
        Swal.fire({
            title: 'Hapus Rute Multidrop?',
            html: `Hapus tarif tujuan <b>${item.tujuan_kecamatan || item.tujuan_kabupaten}</b>?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Ya, Hapus'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    await api.post('/tarif-customer/multidrop/delete', { id: item.id }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setTarifList(prev => prev.filter(x => x.id !== item.id));
                    Swal.fire('Terhapus', 'Rute multidrop dihapus.', 'success');
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || err.message, 'error');
                }
            }
        });
    };

    const handleSaveNew = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/tarif-customer/multidrop/save', {
                customer_id: customer.cust_id,
                ...formNew,
                harga_kg: parseFloat(formNew.harga_kg) || 0,
                kg_min: parseFloat(formNew.kg_min) || 0,
                kg_max: parseFloat(formNew.kg_max) || 0,
                harga_over_kg_max: parseFloat(formNew.harga_over_kg_max) || 0,
                harga_kg_dg: parseFloat(formNew.harga_kg_dg) || 0
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.status === 'success') {
                setIsAddModalOpen(false);
                Swal.fire('Sukses', 'Tarif multidrop berhasil disimpan.', 'success');
                fetchTarifMultidrop();
            }
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || err.message, 'error');
        }
    };

    const filtered = useMemo(() => {
        const q = searchTerm.toLowerCase();
        return tarifList.filter(item =>
            item.tujuan_propinsi?.toLowerCase().includes(q) ||
            item.tujuan_kabupaten?.toLowerCase().includes(q) ||
            item.tujuan_kecamatan?.toLowerCase().includes(q)
        );
    }, [tarifList, searchTerm]);

    return (
        <div className="p-6 bg-slate-50 min-h-screen space-y-4 animate-in fade-in duration-200">
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800">
                            MULTIDROP & EXPRESS
                        </span>
                        <h2 className="text-lg font-black text-slate-800 uppercase mt-0.5">
                            {customer?.cust_id} - {customer?.cust_name}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                        <Plus size={15} /> Tambah Rute Multidrop
                    </button>
                    <button
                        onClick={onBack}
                        className="px-5 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                        Kembali
                    </button>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between text-xs">
                <div className="relative w-72">
                    <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari tujuan kecamatan / kota..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-purple-500 font-semibold"
                    />
                </div>
                <div className="text-slate-500 font-bold">
                    Total Titik Drop: <b className="text-purple-600">{tarifList.length}</b>
                </div>
            </div>

            {/* Tabel */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
                <div className="overflow-x-auto max-h-[65vh]">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead className="bg-[#004b84] text-white text-[11px] font-bold uppercase sticky top-0 z-10 text-center">
                            <tr>
                                <th className="p-3 text-left w-36">Propinsi</th>
                                <th className="p-3 text-left w-36">Kota</th>
                                <th className="p-3 text-left w-40">Kecamatan</th>
                                <th className="p-3 text-right w-28">Harga/Kg (Rp)</th>
                                <th className="p-3 text-right w-24">Kg Min</th>
                                <th className="p-3 text-right w-24">Kg Max</th>
                                <th className="p-3 text-right w-28">Tarif/Kg Lebih</th>
                                <th className="p-3 text-right w-28">Harga B3/DG</th>
                                <th className="p-3 text-center w-16">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-10 text-slate-400">
                                        <RefreshCw size={20} className="animate-spin inline mr-2 text-purple-600" /> Memuat tarif multidrop...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-10 text-slate-400">
                                        Belum ada data tarif multidrop terdaftar.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-2.5">{row.tujuan_propinsi}</td>
                                        <td className="p-2.5">{row.tujuan_kabupaten}</td>
                                        <td className="p-2.5 font-bold text-purple-900">{row.tujuan_kecamatan || '(Semua)'}</td>
                                        <td className="p-1.5 text-right">
                                            <input
                                                type="number"
                                                value={row.harga_kg}
                                                onChange={(e) => handleLocalChange(row.id, 'harga_kg', e.target.value)}
                                                onBlur={(e) => handleFieldBlur(row.id, 'harga_kg', e.target.value)}
                                                className="w-full p-1.5 text-right border rounded-lg font-bold text-emerald-700 outline-none"
                                            />
                                        </td>
                                        <td className="p-1.5 text-right">
                                            <input
                                                type="number"
                                                value={row.kg_min}
                                                onChange={(e) => handleLocalChange(row.id, 'kg_min', e.target.value)}
                                                onBlur={(e) => handleFieldBlur(row.id, 'kg_min', e.target.value)}
                                                className="w-full p-1.5 text-right border rounded-lg outline-none font-mono"
                                            />
                                        </td>
                                        <td className="p-1.5 text-right">
                                            <input
                                                type="number"
                                                value={row.kg_max}
                                                onChange={(e) => handleLocalChange(row.id, 'kg_max', e.target.value)}
                                                onBlur={(e) => handleFieldBlur(row.id, 'kg_max', e.target.value)}
                                                className="w-full p-1.5 text-right border rounded-lg outline-none font-mono"
                                            />
                                        </td>
                                        <td className="p-1.5 text-right">
                                            <input
                                                type="number"
                                                value={row.harga_over_kg_max}
                                                onChange={(e) => handleLocalChange(row.id, 'harga_over_kg_max', e.target.value)}
                                                onBlur={(e) => handleFieldBlur(row.id, 'harga_over_kg_max', e.target.value)}
                                                className="w-full p-1.5 text-right border rounded-lg outline-none font-mono"
                                            />
                                        </td>
                                        <td className="p-1.5 text-right">
                                            <input
                                                type="number"
                                                value={row.harga_kg_dg || 0}
                                                onChange={(e) => handleLocalChange(row.id, 'harga_kg_dg', e.target.value)}
                                                onBlur={(e) => handleFieldBlur(row.id, 'harga_kg_dg', e.target.value)}
                                                className="w-full p-1.5 text-right border border-amber-300 rounded-lg text-amber-800 font-bold outline-none"
                                            />
                                        </td>
                                        <td className="p-2.5 text-center">
                                            <button
                                                onClick={() => handleDeleteRow(row)}
                                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Tambah */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white text-slate-800 w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-4 text-xs">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">
                                <Split size={18} className="text-purple-600" /> Tambah Rute Multidrop
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveNew} className="space-y-3">
                            <div>
                                <label className="block font-bold text-slate-600 uppercase mb-1">Propinsi *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: JAWA BARAT"
                                    value={formNew.propinsi}
                                    onChange={(e) => setFormNew(prev => ({ ...prev, propinsi: e.target.value.toUpperCase() }))}
                                    className="w-full p-2 border rounded-xl uppercase font-semibold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-600 uppercase mb-1">Kota / Kabupaten *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: BEKASI"
                                        value={formNew.kabupaten}
                                        onChange={(e) => setFormNew(prev => ({ ...prev, kabupaten: e.target.value.toUpperCase() }))}
                                        className="w-full p-2 border rounded-xl uppercase font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-600 uppercase mb-1">Kecamatan (Boleh Kosong)</label>
                                    <input
                                        type="text"
                                        placeholder="Kosongkan jika semua kecamatan"
                                        value={formNew.kecamatan}
                                        onChange={(e) => setFormNew(prev => ({ ...prev, kecamatan: e.target.value.toUpperCase() }))}
                                        className="w-full p-2 border rounded-xl uppercase font-semibold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-600 uppercase mb-1">Harga per Kg (Rp) *</label>
                                    <input
                                        type="number"
                                        required
                                        value={formNew.harga_kg}
                                        onChange={(e) => setFormNew(prev => ({ ...prev, harga_kg: e.target.value }))}
                                        className="w-full p-2 border rounded-xl text-right font-black text-emerald-700"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-600 uppercase mb-1">Harga B3/DG (Rp)</label>
                                    <input
                                        type="number"
                                        value={formNew.harga_kg_dg}
                                        onChange={(e) => setFormNew(prev => ({ ...prev, harga_kg_dg: e.target.value }))}
                                        className="w-full p-2 border rounded-xl text-right font-black text-amber-700"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold text-slate-600">
                                    Batal
                                </button>
                                <button type="submit" className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold">
                                    Simpan Multidrop
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditMasterHargaMultidrop;