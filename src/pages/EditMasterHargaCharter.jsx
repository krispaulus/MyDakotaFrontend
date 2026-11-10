import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Trash2, Search, RefreshCw, Save, Truck, X } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../api/axios';

const EditMasterHargaCharter = ({ customer, onBack }) => {
    const token = localStorage.getItem('token');
    const [tarifList, setTarifList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [optKendaraan, setOptKendaraan] = useState([]);

    const [formNew, setFormNew] = useState({
        jns_kend: 'K0001',
        propinsi: '',
        kota: '',
        harga: 0,
        harga_dg: 0,
        kg_max: 0,
        harga_over_kg_max: 0,
        estimasihari: '2'
    });

    const fetchTarifCharter = async () => {
        if (!customer?.cust_id) return;
        setLoading(true);
        try {
            const res = await api.get(`/tarif-customer/charter/detail?customer_id=${customer.cust_id}`, {
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
        fetchTarifCharter();
        // Load master jenis kendaraan
        api.get('/kendaraan/options', { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setOptKendaraan(res.data?.data || []))
            .catch(() => setOptKendaraan([
                { kode: 'K0001', nama: 'BUILD UP' },
                { kode: 'K0002', nama: 'COLT DIESEL' },
                { kode: 'K0003', nama: 'FUSO' },
                { kode: 'K0004', nama: 'TRONTON' },
                { kode: 'K0005', nama: 'WING BOX' }
            ]));
    }, [customer]);

    const handleFieldBlur = async (id, fieldName, value) => {
        try {
            await api.post('/tarif-customer/charter/update-field', {
                id,
                field: fieldName,
                value: parseFloat(value) || 0
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error('Gagal autosave charter:', err);
        }
    };

    const handleLocalChange = (id, fieldName, newVal) => {
        setTarifList(prev => prev.map(item => item.id === id ? { ...item, [fieldName]: newVal } : item));
    };

    const handleDeleteRow = (item) => {
        Swal.fire({
            title: 'Hapus Tarif Charter?',
            html: `Hapus armada <b>${item.jns_kend}</b> tujuan <b>${item.tujuan_kabupaten}</b>?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Ya, Hapus'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    await api.post('/tarif-customer/charter/delete', { id: item.id }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setTarifList(prev => prev.filter(x => x.id !== item.id));
                    Swal.fire('Terhapus', 'Rute charter dihapus.', 'success');
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || err.message, 'error');
                }
            }
        });
    };

    const handleSaveNew = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/tarif-customer/charter/save', {
                customer_id: customer.cust_id,
                ...formNew,
                harga: parseFloat(formNew.harga) || 0,
                harga_dg: parseFloat(formNew.harga_dg) || 0,
                kg_max: parseFloat(formNew.kg_max) || 0,
                harga_over_kg_max: parseFloat(formNew.harga_over_kg_max) || 0
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.status === 'success') {
                setIsAddModalOpen(false);
                Swal.fire('Sukses', 'Tarif charter baru berhasil disimpan.', 'success');
                fetchTarifCharter();
            }
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || err.message, 'error');
        }
    };

    const filtered = useMemo(() => {
        const q = searchTerm.toLowerCase();
        return tarifList.filter(item =>
            item.jns_kend?.toLowerCase().includes(q) ||
            item.tujuan_propinsi?.toLowerCase().includes(q) ||
            item.tujuan_kabupaten?.toLowerCase().includes(q)
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
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800">
                            CHARTER ARMADA
                        </span>
                        <h2 className="text-lg font-black text-slate-800 uppercase mt-0.5">
                            {customer?.cust_id} - {customer?.cust_name}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                        <Plus size={15} /> Tambah Tarif Charter
                    </button>
                    <button
                        onClick={onBack}
                        className="px-5 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                        Kembali
                    </button>
                </div>
            </div>

            {/* Filter & Total */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between text-xs">
                <div className="relative w-72">
                    <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari armada / kota tujuan..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-sky-500 font-semibold"
                    />
                </div>
                <div className="text-slate-500 font-bold">
                    Total Rute Charter: <b className="text-sky-600">{tarifList.length}</b>
                </div>
            </div>

            {/* Tabel Data */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
                <div className="overflow-x-auto max-h-[65vh]">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead className="bg-[#004b84] text-white text-[11px] font-bold uppercase sticky top-0 z-10 text-center">
                            <tr>
                                <th className="p-3 text-left w-36">Jenis Kendaraan</th>
                                <th className="p-3 text-left w-40">Propinsi</th>
                                <th className="p-3 text-left w-40">Kota / Kabupaten</th>
                                <th className="p-3 text-right w-32">Harga Umum (Rp)</th>
                                <th className="p-3 text-right w-32">Harga B3/DG (Rp)</th>
                                <th className="p-3 text-right w-24">Kg Max</th>
                                <th className="p-3 text-right w-28">Tarif/Kg Lebih</th>
                                <th className="p-3 text-center w-20">Est. Hari</th>
                                <th className="p-3 text-center w-16">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-10 text-slate-400">
                                        <RefreshCw size={20} className="animate-spin inline mr-2 text-sky-600" /> Memuat tarif charter...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-10 text-slate-400">
                                        Belum ada tarif charter armada untuk customer ini.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-2.5 font-bold text-indigo-700">{row.jns_kend}</td>
                                        <td className="p-2.5">{row.tujuan_propinsi}</td>
                                        <td className="p-2.5 font-bold text-slate-900">{row.tujuan_kabupaten}</td>
                                        <td className="p-1.5 text-right">
                                            <input
                                                type="number"
                                                value={row.harga}
                                                onChange={(e) => handleLocalChange(row.id, 'harga', e.target.value)}
                                                onBlur={(e) => handleFieldBlur(row.id, 'harga', e.target.value)}
                                                className="w-full p-1.5 text-right border border-slate-300 rounded-lg font-bold text-emerald-700 outline-none focus:border-sky-500"
                                            />
                                        </td>
                                        <td className="p-1.5 text-right">
                                            <input
                                                type="number"
                                                value={row.harga_dg}
                                                onChange={(e) => handleLocalChange(row.id, 'harga_dg', e.target.value)}
                                                onBlur={(e) => handleFieldBlur(row.id, 'harga_dg', e.target.value)}
                                                className="w-full p-1.5 text-right border border-amber-300 rounded-lg font-bold text-amber-700 outline-none focus:border-sky-500"
                                            />
                                        </td>
                                        <td className="p-1.5 text-right">
                                            <input
                                                type="number"
                                                value={row.kg_max}
                                                onChange={(e) => handleLocalChange(row.id, 'kg_max', e.target.value)}
                                                onBlur={(e) => handleFieldBlur(row.id, 'kg_max', e.target.value)}
                                                className="w-full p-1.5 text-right border border-slate-300 rounded-lg font-mono outline-none focus:border-sky-500"
                                            />
                                        </td>
                                        <td className="p-1.5 text-right">
                                            <input
                                                type="number"
                                                value={row.harga_over_kg_max}
                                                onChange={(e) => handleLocalChange(row.id, 'harga_over_kg_max', e.target.value)}
                                                onBlur={(e) => handleFieldBlur(row.id, 'harga_over_kg_max', e.target.value)}
                                                className="w-full p-1.5 text-right border border-slate-300 rounded-lg font-mono outline-none focus:border-sky-500"
                                            />
                                        </td>
                                        <td className="p-1.5 text-center">
                                            <input
                                                type="text"
                                                value={row.estimasihari}
                                                onChange={(e) => handleLocalChange(row.id, 'estimasihari', e.target.value)}
                                                onBlur={(e) => handleFieldBlur(row.id, 'estimasihari', e.target.value)}
                                                className="w-16 p-1.5 text-center border border-slate-300 rounded-lg font-bold outline-none focus:border-sky-500"
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
                                <Truck size={18} className="text-sky-600" /> Tambah Tarif Charter
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveNew} className="space-y-3">
                            <div>
                                <label className="block font-bold text-slate-600 uppercase mb-1">Jenis Kendaraan *</label>
                                <select
                                    value={formNew.jns_kend}
                                    onChange={(e) => setFormNew(prev => ({ ...prev, jns_kend: e.target.value }))}
                                    className="w-full p-2.5 border rounded-xl font-bold"
                                >
                                    {optKendaraan.map(k => (
                                        <option key={k.kode || k} value={k.kode || k}>
                                            {k.kode ? `${k.kode} - ${k.nama}` : k}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
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
                                <div>
                                    <label className="block font-bold text-slate-600 uppercase mb-1">Kota / Kabupaten *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: BEKASI"
                                        value={formNew.kota}
                                        onChange={(e) => setFormNew(prev => ({ ...prev, kota: e.target.value.toUpperCase() }))}
                                        className="w-full p-2 border rounded-xl uppercase font-semibold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-600 uppercase mb-1">Harga Barang Umum (Rp) *</label>
                                    <input
                                        type="number"
                                        required
                                        value={formNew.harga}
                                        onChange={(e) => setFormNew(prev => ({ ...prev, harga: e.target.value }))}
                                        className="w-full p-2 border rounded-xl text-right font-black text-emerald-700"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-600 uppercase mb-1">Harga B3/DG (Rp)</label>
                                    <input
                                        type="number"
                                        value={formNew.harga_dg}
                                        onChange={(e) => setFormNew(prev => ({ ...prev, harga_dg: e.target.value }))}
                                        className="w-full p-2 border rounded-xl text-right font-black text-amber-700"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold text-slate-600">
                                    Batal
                                </button>
                                <button type="submit" className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold">
                                    Simpan Rute Charter
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditMasterHargaCharter;