import React, { useState, useEffect, useMemo } from 'react';
import {
    RefreshCw, Save, ArrowLeft, Trash2, Search, X,
    ChevronLeft, ChevronRight, MapPin, Copy, Sliders, TrendingUp, TrendingDown
} from 'lucide-react';
import api from '../api/axios';
import Swal from 'sweetalert2';

const EditMasterHargaCargo = ({ customer, jenisHarga = '0', onBack }) => {
    const token = localStorage.getItem('token');
    const [layanan, setLayanan] = useState('1'); // 1: Darat, 2: Laut, 3: Udara
    const [tarifList, setTarifList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter & Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 100;

    // State Modal Tambah Tarif
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('kt'); // 'kt' (Kota) atau 'kc' (Kecamatan)

    // State Modal Penyesuaian Tarif Wilayah
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [adjustMode, setAdjustMode] = useState('kt'); // 'kt' atau 'kc'
    const [adjustForm, setAdjustForm] = useState({
        propinsi: '',
        kota: '',
        kecamatan: '',
        tipe_aksi: '+',
        persentase: 5
    });

    // Opsi Wilayah
    const [optPropinsi, setOptPropinsi] = useState([]);
    const [optKota, setOptKota] = useState([]);
    const [optKecamatan, setOptKecamatan] = useState([]);

    // Form State Tambah Tarif
    const [formTarif, setFormTarif] = useState({
        propinsi: '',
        kota: '',
        kecamatan: '',
        minimalkg: 100,
        hargapokok: 0,
        bypasskg: 0,
        hargakgselanjutnya: 0,
        estimasihari: '3',
        biayatambahan: 0,
        keterangan: ''
    });

    // Modal Import Tarif Cust Lain
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [sourceCustList, setSourceCustList] = useState([]);
    const [selectedSourceCust, setSelectedSourceCust] = useState('');

    const getJudulJenis = () => {
        if (jenisHarga === '1') return { nama: 'Harga Volume', satuan: 'm³' };
        if (jenisHarga === '2') return { nama: 'Harga Kubikasi', satuan: 'm³' };
        return { nama: 'Harga Berat', satuan: 'Kg' };
    };

    const { nama: namaJenis, satuan } = getJudulJenis();

    const fetchTarif = async () => {
        if (!customer?.cust_id) return;
        setLoading(true);
        try {
            const res = await api.get(`/tarif-customer/cargo/detail?customer_id=${customer.cust_id}&serv_id=${layanan}&jenis_harga=${jenisHarga}`, {
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
        fetchTarif();
        setCurrentPage(1);
    }, [customer, layanan, jenisHarga]);

    // Ambil Propinsi saat modal dibuka
    useEffect(() => {
        if (isAddModalOpen || isAdjustModalOpen) {
            api.get('/wilayah/propinsi', { headers: { Authorization: `Bearer ${token}` } })
                .then(res => setOptPropinsi(res.data?.data || []))
                .catch(err => console.error(err));
        }
    }, [isAddModalOpen, isAdjustModalOpen]);

    // Handle Perubahan Wilayah Tambah
    const handlePropinsiChange = (prop) => {
        setFormTarif(prev => ({ ...prev, propinsi: prop, kota: '', kecamatan: '' }));
        setOptKota([]);
        setOptKecamatan([]);
        if (prop) {
            api.get(`/wilayah/kota?propinsi=${encodeURIComponent(prop)}`, { headers: { Authorization: `Bearer ${token}` } })
                .then(res => setOptKota(res.data?.data || []));
        }
    };

    const handleKotaChange = (kota) => {
        setFormTarif(prev => ({ ...prev, kota: kota, kecamatan: '' }));
        setOptKecamatan([]);
        if (kota && modalMode === 'kc') {
            api.get(`/wilayah/kecamatan?propinsi=${encodeURIComponent(formTarif.propinsi)}&kota=${encodeURIComponent(kota)}`, { headers: { Authorization: `Bearer ${token}` } })
                .then(res => setOptKecamatan(res.data?.data || []));
        }
    };

    // Handle Perubahan Wilayah Penyesuaian
    const handleAdjustPropinsiChange = (prop) => {
        setAdjustForm(prev => ({ ...prev, propinsi: prop, kota: '', kecamatan: '' }));
        setOptKota([]);
        setOptKecamatan([]);
        if (prop) {
            api.get(`/wilayah/kota?propinsi=${encodeURIComponent(prop)}`, { headers: { Authorization: `Bearer ${token}` } })
                .then(res => setOptKota(res.data?.data || []));
        }
    };

    const handleAdjustKotaChange = (kota) => {
        setAdjustForm(prev => ({ ...prev, kota: kota, kecamatan: '' }));
        setOptKecamatan([]);
        if (kota && adjustMode === 'kc') {
            api.get(`/wilayah/kecamatan?propinsi=${encodeURIComponent(adjustForm.propinsi)}&kota=${encodeURIComponent(kota)}`, { headers: { Authorization: `Bearer ${token}` } })
                .then(res => setOptKecamatan(res.data?.data || []));
        }
    };

    // Autosave inline
    const handleFieldBlur = async (id, fieldName, value) => {
        try {
            await api.post('/tarif-customer/cargo/update-field', {
                id,
                field: fieldName,
                value: fieldName === 'keterangan' || fieldName === 'estimasihari' ? String(value) : (parseFloat(value) || 0)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error('Gagal autosave:', err);
        }
    };

    const handleLocalChange = (id, fieldName, newVal) => {
        setTarifList(prev => prev.map(item => item.id === id ? { ...item, [fieldName]: newVal } : item));
    };

    // Hapus rute
    const handleDeleteRow = (item) => {
        Swal.fire({
            title: 'Hapus Tarif Rute Ini?',
            html: `Hapus rute: <b class="text-rose-600">${item.tujuan_propinsi} - ${item.tujuan_kabupaten} (${item.tujuan_kecamatan})</b>?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Hapus Data',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const res = await api.post('/tarif-customer/cargo/delete-bulk', { ids: [item.id] }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.data?.status === 'success') {
                        setTarifList(prev => prev.filter(x => x.id !== item.id));
                        Swal.fire('Terhapus', 'Rute berhasil dihapus', 'success');
                    }
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || err.message, 'error');
                }
            }
        });
    };

    // Submit Tambah Rute
    const handleSubmitTarif = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                customer_id: customer.cust_id,
                serv_id: layanan,
                jenis_harga: jenisHarga,
                mode: modalMode,
                ...formTarif,
                minimalkg: parseFloat(formTarif.minimalkg) || 0,
                hargapokok: parseFloat(formTarif.hargapokok) || 0,
                bypasskg: parseFloat(formTarif.bypasskg) || 0,
                hargakgselanjutnya: parseFloat(formTarif.hargakgselanjutnya) || 0,
                biayatambahan: parseFloat(formTarif.biayatambahan) || 0
            };

            const res = await api.post('/tarif-customer/simpan-rute', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.status === 'success') {
                setIsAddModalOpen(false);
                Swal.fire('Berhasil', res.data.message, 'success');
                fetchTarif();
            }
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || err.message, 'error');
        }
    };

    // 🌟 SUBMIT PENYESUAIAN TARIF WILAYAH (%)
    const handleSubmitAdjust = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                customer_id: customer.cust_id,
                serv_id: layanan,
                jenis_harga: jenisHarga,
                mode: adjustMode,
                propinsi: adjustForm.propinsi,
                kota: adjustForm.kota,
                kecamatan: adjustForm.kecamatan,
                tipe_aksi: adjustForm.tipe_aksi,
                persentase: parseFloat(adjustForm.persentase) || 0
            };

            const res = await api.post('/tarif-customer/penyesuaian-wilayah', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.status === 'success') {
                setIsAdjustModalOpen(false);
                Swal.fire('Berhasil Disesuaikan', res.data.message, 'success');
                fetchTarif();
            }
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || err.message, 'error');
        }
    };

    // Modal Import Cust Lain
    const handleOpenImportModal = async () => {
        try {
            const res = await api.get('/customer/with-tarif?agen_id=ALL&role_akses=PUSAT', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const allCust = res.data?.data || [];
            setSourceCustList(allCust.filter(c => c.cust_id !== customer.cust_id));
            setIsImportModalOpen(true);
        } catch (err) {
            Swal.fire('Gagal', 'Tidak dapat memuat daftar customer', 'error');
        }
    };

    const handleExecuteImport = async (e) => {
        e.preventDefault();
        if (!selectedSourceCust) return;

        try {
            const res = await api.post('/tarif-customer/salin-tarif', {
                target_cust_id: customer.cust_id,
                source_cust_id: selectedSourceCust,
                serv_id: layanan,
                jenis_harga: jenisHarga
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.status === 'success') {
                setIsImportModalOpen(false);
                Swal.fire('Berhasil Disalin!', res.data.message, 'success');
                fetchTarif();
            }
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || err.message, 'error');
        }
    };

    const filteredTarif = useMemo(() => {
        if (!searchTerm.trim()) return tarifList;
        const q = searchTerm.toLowerCase();
        return tarifList.filter(item =>
            item.tujuan_propinsi?.toLowerCase().includes(q) ||
            item.tujuan_kabupaten?.toLowerCase().includes(q) ||
            item.tujuan_kecamatan?.toLowerCase().includes(q)
        );
    }, [tarifList, searchTerm]);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredTarif.slice(start, start + pageSize);
    }, [filteredTarif, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredTarif.length / pageSize) || 1;

    return (
        <div className="p-6 bg-slate-50 min-h-screen space-y-5 animate-in fade-in duration-200">
            {/* JUDUL */}
            <div className="text-center">
                <h1 className="text-2xl font-black text-emerald-600 tracking-tight">
                    Edit Master {namaJenis}
                </h1>
            </div>

            {/* DATA CUSTOMER */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="inline-block border-b-2 border-sky-500 pb-1">
                    <span className="text-xs font-black uppercase text-sky-700 tracking-wider">
                        DATA CUSTOMER
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs font-bold text-slate-700">
                    <div className="md:col-span-2">
                        <label className="block mb-1 text-slate-500 uppercase">KODE CUSTOMER :</label>
                        <input
                            type="text"
                            readOnly
                            value={customer?.cust_id || ''}
                            className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-xl font-mono text-slate-800 outline-none"
                        />
                    </div>
                    <div className="md:col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">NAMA CUSTOMER :</label>
                        <input
                            type="text"
                            readOnly
                            value={customer?.cust_name || ''}
                            className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-800 outline-none uppercase"
                        />
                    </div>
                    <div className="md:col-span-7">
                        <label className="block mb-1 text-slate-500 uppercase">ALAMAT :</label>
                        <input
                            type="text"
                            readOnly
                            value={`${customer?.cust_alamat1 || ''} ${customer?.cust_alamat2 || ''}`}
                            className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-800 outline-none"
                        />
                    </div>
                </div>

                <div className="w-48 text-xs font-bold">
                    <label className="block mb-1 text-slate-500 uppercase">JENIS HARGA :</label>
                    <select
                        value={layanan}
                        onChange={(e) => setLayanan(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 outline-none focus:border-sky-500 cursor-pointer"
                    >
                        <option value="1">Darat</option>
                        <option value="2">Laut</option>
                        <option value="3">Udara</option>
                    </select>
                </div>
            </div>

            {/* ACTION BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => Swal.fire('Info', 'Semua perubahan tersimpan otomatis saat Anda mengetik.', 'info')}
                        className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-extrabold text-xs rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5"
                    >
                        <Save size={14} /> Simpan
                    </button>

                    <button
                        onClick={() => {
                            setModalMode('kt');
                            setFormTarif(prev => ({ ...prev, propinsi: '', kota: '', kecamatan: '' }));
                            setIsAddModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                    >
                        Tambah Per Kota
                    </button>

                    <button
                        onClick={() => {
                            setModalMode('kc');
                            setFormTarif(prev => ({ ...prev, propinsi: '', kota: '', kecamatan: '' }));
                            setIsAddModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                    >
                        Tambah Per Kecamatan
                    </button>

                    <button
                        onClick={handleOpenImportModal}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                    >
                        Import Harga Cust Lain
                    </button>

                    {/* 🌟 TOMBOL PENYESUAIAN KOTA */}
                    <button
                        onClick={() => {
                            setAdjustMode('kt');
                            setAdjustForm({ propinsi: '', kota: '', kecamatan: '', tipe_aksi: '+', persentase: 5 });
                            setIsAdjustModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                    >
                        Penyesuaian Per Kota
                    </button>

                    {/* 🌟 TOMBOL PENYESUAIAN KECAMATAN */}
                    <button
                        onClick={() => {
                            setAdjustMode('kc');
                            setAdjustForm({ propinsi: '', kota: '', kecamatan: '', tipe_aksi: '+', persentase: 5 });
                            setIsAdjustModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                    >
                        Penyesuaian Per Kecamatan
                    </button>
                </div>

                <button
                    onClick={onBack}
                    className="px-6 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                    <ArrowLeft size={14} /> Keluar
                </button>
            </div>

            {/* TABEL DATA */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
                <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                        <input
                            type="text"
                            placeholder="Cari Propinsi / Kota / Kecamatan..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                    </div>

                    <div className="text-xs text-slate-600 font-bold">
                        Total Rute Terdaftar: <span className="text-sky-600 font-extrabold">{tarifList.length.toLocaleString('id-ID')}</span>
                        {searchTerm && (
                            <span className="text-slate-400 ml-1">
                                (Ditemukan: {filteredTarif.length.toLocaleString('id-ID')})
                            </span>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#1e4e79] text-white font-bold uppercase text-[11px] tracking-wider text-center border-b border-slate-300">
                            <tr>
                                <th rowSpan="2" className="p-3 border-r border-sky-900/50">PROPINSI</th>
                                <th rowSpan="2" className="p-3 border-r border-sky-900/50">KOTA</th>
                                <th rowSpan="2" className="p-3 border-r border-sky-900/50">KECAMATAN</th>
                                <th colSpan="4" className="p-2 border-b border-sky-900/50">HARGA ASLI</th>
                                <th rowSpan="2" className="p-3 border-r border-sky-900/50">TAMBAHAN</th>
                                <th rowSpan="2" className="p-3 border-r border-sky-900/50">KETERANGAN</th>
                                <th rowSpan="2" className="p-3 border-r border-sky-900/50">EST. HARI</th>
                                <th rowSpan="2" className="p-3 text-center w-16">ACTION</th>
                            </tr>
                            <tr className="bg-[#6b7280] text-white text-[10px]">
                                <th className="p-1.5 border-r border-slate-500 font-bold">Min {satuan}</th>
                                <th className="p-1.5 border-r border-slate-500 font-bold">Hrg Min</th>
                                <th className="p-1.5 border-r border-slate-500 font-bold">Bypass</th>
                                <th className="p-1.5 border-r border-slate-500 font-bold">Per {satuan}</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-200 text-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="11" className="text-center py-12 text-slate-400 font-semibold">
                                        <RefreshCw className="animate-spin inline mr-2" size={16} /> Memuat data tarif...
                                    </td>
                                </tr>
                            ) : paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan="11" className="text-center py-12 text-slate-400 font-semibold">
                                        {searchTerm ? 'Tidak ada rute yang cocok dengan pencarian.' : 'Belum Ada Data Harga Yang Terdaftar Pada Layanan Ini.'}
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((item) => (
                                    <tr key={item.id} className="hover:bg-sky-50/50 transition-colors">
                                        <td className="p-2.5 font-bold uppercase">{item.tujuan_propinsi}</td>
                                        <td className="p-2.5 uppercase text-slate-700">{item.tujuan_kabupaten}</td>
                                        <td className="p-2.5 uppercase text-slate-700">{item.tujuan_kecamatan}</td>

                                        <td className="p-1.5">
                                            <input
                                                type="number"
                                                value={item.minimalkg}
                                                onChange={(e) => handleLocalChange(item.id, 'minimalkg', e.target.value)}
                                                onBlur={(e) => handleFieldBlur(item.id, 'minimalkg', e.target.value)}
                                                className="w-20 p-1.5 border border-slate-300 rounded text-right font-mono font-bold focus:border-sky-500 outline-none"
                                            />
                                        </td>
                                        <td className="p-1.5">
                                            <input
                                                type="number"
                                                value={item.hargapokok}
                                                onChange={(e) => handleLocalChange(item.id, 'hargapokok', e.target.value)}
                                                onBlur={(e) => handleFieldBlur(item.id, 'hargapokok', e.target.value)}
                                                className="w-24 p-1.5 border border-slate-300 rounded text-right font-mono font-bold text-emerald-700 focus:border-sky-500 outline-none"
                                            />
                                        </td>
                                        <td className="p-1.5">
                                            <input
                                                type="number"
                                                value={item.bypasskg}
                                                onChange={(e) => handleLocalChange(item.id, 'bypasskg', e.target.value)}
                                                onBlur={(e) => handleFieldBlur(item.id, 'bypasskg', e.target.value)}
                                                className="w-16 p-1.5 border border-slate-300 rounded text-right font-mono focus:border-sky-500 outline-none"
                                            />
                                        </td>
                                        <td className="p-1.5">
                                            <input
                                                type="number"
                                                value={item.hargakgselanjutnya}
                                                onChange={(e) => handleLocalChange(item.id, 'hargakgselanjutnya', e.target.value)}
                                                onBlur={(e) => handleFieldBlur(item.id, 'hargakgselanjutnya', e.target.value)}
                                                className="w-24 p-1.5 border border-slate-300 rounded text-right font-mono font-bold text-sky-700 focus:border-sky-500 outline-none"
                                            />
                                        </td>
                                        <td className="p-1.5">
                                            <input
                                                type="number"
                                                value={item.biayatambahan}
                                                onChange={(e) => handleLocalChange(item.id, 'biayatambahan', e.target.value)}
                                                onBlur={(e) => handleFieldBlur(item.id, 'biayatambahan', e.target.value)}
                                                className="w-20 p-1.5 border border-slate-300 rounded text-right font-mono focus:border-sky-500 outline-none"
                                            />
                                        </td>
                                        <td className="p-1.5">
                                            <input
                                                type="text"
                                                maxLength="150"
                                                value={item.keterangan}
                                                onChange={(e) => handleLocalChange(item.id, 'keterangan', e.target.value)}
                                                onBlur={(e) => handleFieldBlur(item.id, 'keterangan', e.target.value)}
                                                className="w-40 p-1.5 border border-slate-300 rounded focus:border-sky-500 outline-none"
                                            />
                                        </td>
                                        <td className="p-1.5 text-center">
                                            <input
                                                type="text"
                                                value={item.estimasihari}
                                                onChange={(e) => handleLocalChange(item.id, 'estimasihari', e.target.value)}
                                                onBlur={(e) => handleFieldBlur(item.id, 'estimasihari', e.target.value)}
                                                className="w-14 p-1.5 border border-slate-300 rounded text-center font-bold focus:border-sky-500 outline-none"
                                            />
                                        </td>
                                        <td className="p-2.5 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteRow(item)}
                                                title={`Hapus rute ${item.tujuan_kecamatan}`}
                                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-bold">
                        <div>
                            Menampilkan baris {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredTarif.length)} dari {filteredTarif.length} rute
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 border rounded-lg bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="px-3 py-1 bg-white border rounded-lg font-mono">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 border rounded-lg bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* 🌟 MODAL MODERN: PENYESUAIAN TARIF (%) PER KOTA / KECAMATAN               */}
            {/* ========================================================================= */}
            {isAdjustModalOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white text-slate-800 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        {/* Header Modal */}
                        <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-sm uppercase flex items-center gap-2">
                                    <Sliders size={18} /> Penyesuaian Tarif {namaJenis} {adjustMode === 'kt' ? 'Per Kota' : 'Per Kecamatan'}
                                </h3>
                                <p className="text-[11px] text-emerald-100 mt-0.5">
                                    {customer?.cust_id} - {customer?.cust_name} ({layanan === '1' ? 'Darat' : layanan === '2' ? 'Laut' : 'Udara'})
                                </p>
                            </div>
                            <button
                                onClick={() => setIsAdjustModalOpen(false)}
                                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form Penyesuaian */}
                        <form onSubmit={handleSubmitAdjust} className="p-6 space-y-4 text-xs">
                            {/* Area Wilayah */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block font-bold text-slate-600 uppercase mb-1">PROPINSI *</label>
                                        <select
                                            required
                                            value={adjustForm.propinsi}
                                            onChange={(e) => handleAdjustPropinsiChange(e.target.value)}
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold outline-none focus:border-emerald-500 cursor-pointer"
                                        >
                                            <option value="">-- Pilih Propinsi --</option>
                                            {optPropinsi.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block font-bold text-slate-600 uppercase mb-1">KOTA / KABUPATEN *</label>
                                        <select
                                            required
                                            disabled={!adjustForm.propinsi}
                                            value={adjustForm.kota}
                                            onChange={(e) => handleAdjustKotaChange(e.target.value)}
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold outline-none focus:border-emerald-500 disabled:bg-slate-100 cursor-pointer"
                                        >
                                            <option value="">-- Pilih Kota --</option>
                                            {optKota.map(k => <option key={k} value={k}>{k}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {adjustMode === 'kc' ? (
                                    <div>
                                        <label className="block font-bold text-slate-600 uppercase mb-1">KECAMATAN *</label>
                                        <select
                                            required
                                            disabled={!adjustForm.kota}
                                            value={adjustForm.kecamatan}
                                            onChange={(e) => setAdjustForm(prev => ({ ...prev, kecamatan: e.target.value }))}
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold outline-none focus:border-emerald-500 disabled:bg-slate-100 cursor-pointer"
                                        >
                                            <option value="">-- Pilih Kecamatan --</option>
                                            {optKecamatan.map(kc => <option key={kc} value={kc}>{kc}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="text-[11px] text-emerald-800 font-semibold p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                                        ℹ️ Semua kecamatan yang termasuk di dalam kota terpilih akan ikut ter-update secara otomatis.
                                    </div>
                                )}
                            </div>

                            {/* Pilihan Aksi & Persentase */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                <div>
                                    <label className="block font-bold text-slate-600 uppercase mb-1.5">ARAH PENYESUAIAN</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setAdjustForm(prev => ({ ...prev, tipe_aksi: '+' }))}
                                            className={`p-2.5 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition cursor-pointer ${adjustForm.tipe_aksi === '+'
                                                ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            <TrendingUp size={16} className="text-emerald-600" /> Naik (+)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAdjustForm(prev => ({ ...prev, tipe_aksi: '-' }))}
                                            className={`p-2.5 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition cursor-pointer ${adjustForm.tipe_aksi === '-'
                                                ? 'border-rose-600 bg-rose-50 text-rose-800'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            <TrendingDown size={16} className="text-rose-600" /> Turun (-)
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-600 uppercase mb-1.5">JUMLAH PERSENTASE (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            max="1000"
                                            step="1"
                                            required
                                            value={adjustForm.persentase}
                                            onChange={(e) => setAdjustForm(prev => ({ ...prev, persentase: e.target.value }))}
                                            className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-right text-base font-black text-slate-800 pr-8 outline-none focus:border-emerald-500"
                                        />
                                        <span className="absolute right-3 top-3 font-black text-slate-400">%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tombol Simpan & Batal */}
                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsAdjustModalOpen(false)}
                                    className="px-5 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition cursor-pointer"
                                >
                                    Simpan Penyesuaian
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL TAMBAH RUTE PER KOTA / KECAMATAN */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white text-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 bg-gradient-to-r from-sky-600 to-sky-700 text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-sm uppercase flex items-center gap-2">
                                    <MapPin size={18} /> Tambah Tarif {namaJenis} {modalMode === 'kt' ? 'Per Kota' : 'Per Kecamatan'}
                                </h3>
                                <p className="text-[11px] text-sky-100 mt-0.5">
                                    {customer?.cust_id} - {customer?.cust_name} ({layanan === '1' ? 'Darat' : layanan === '2' ? 'Laut' : 'Udara'})
                                </p>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitTarif} className="p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                <div>
                                    <label className="block font-bold text-slate-600 uppercase mb-1">PROPINSI *</label>
                                    <select
                                        required
                                        value={formTarif.propinsi}
                                        onChange={(e) => handlePropinsiChange(e.target.value)}
                                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold outline-none focus:border-sky-500 cursor-pointer"
                                    >
                                        <option value="">-- Pilih Propinsi --</option>
                                        {optPropinsi.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-600 uppercase mb-1">KOTA / KABUPATEN *</label>
                                    <select
                                        required
                                        disabled={!formTarif.propinsi}
                                        value={formTarif.kota}
                                        onChange={(e) => handleKotaChange(e.target.value)}
                                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold outline-none focus:border-sky-500 disabled:bg-slate-100 cursor-pointer"
                                    >
                                        <option value="">-- Pilih Kota --</option>
                                        {optKota.map(k => <option key={k} value={k}>{k}</option>)}
                                    </select>
                                </div>

                                {modalMode === 'kc' ? (
                                    <div>
                                        <label className="block font-bold text-slate-600 uppercase mb-1">KECAMATAN *</label>
                                        <select
                                            required
                                            disabled={!formTarif.kota}
                                            value={formTarif.kecamatan}
                                            onChange={(e) => setFormTarif(prev => ({ ...prev, kecamatan: e.target.value }))}
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold outline-none focus:border-sky-500 disabled:bg-slate-100 cursor-pointer"
                                        >
                                            <option value="">-- Pilih Kecamatan --</option>
                                            {optKecamatan.map(kc => <option key={kc} value={kc}>{kc}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="flex items-center text-sky-700 font-semibold p-2 bg-sky-50 rounded-xl border border-sky-100">
                                        <span>ℹ️ Semua kecamatan di dalam kota terpilih akan otomatis tersimpan.</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-600 uppercase mb-1">MIN {satuan}</label>
                                    <input
                                        type="number"
                                        required
                                        value={formTarif.minimalkg}
                                        onChange={(e) => setFormTarif(prev => ({ ...prev, minimalkg: e.target.value }))}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-right font-bold outline-none focus:border-sky-500"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-600 uppercase mb-1">HRG MIN (RP)</label>
                                    <input
                                        type="number"
                                        required
                                        value={formTarif.hargapokok}
                                        onChange={(e) => setFormTarif(prev => ({ ...prev, hargapokok: e.target.value }))}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-right font-bold text-emerald-700 outline-none focus:border-sky-500"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-600 uppercase mb-1">BYPASS</label>
                                    <input
                                        type="number"
                                        value={formTarif.bypasskg}
                                        onChange={(e) => setFormTarif(prev => ({ ...prev, bypasskg: e.target.value }))}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-right outline-none focus:border-sky-500"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-600 uppercase mb-1">SELANJUTNYA (PER {satuan})</label>
                                    <input
                                        type="number"
                                        required
                                        value={formTarif.hargakgselanjutnya}
                                        onChange={(e) => setFormTarif(prev => ({ ...prev, hargakgselanjutnya: e.target.value }))}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-right font-bold text-sky-700 outline-none focus:border-sky-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-600 uppercase mb-1">ESTIMASI HARI</label>
                                    <input
                                        type="text"
                                        value={formTarif.estimasihari}
                                        onChange={(e) => setFormTarif(prev => ({ ...prev, estimasihari: e.target.value }))}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-center outline-none focus:border-sky-500"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-600 uppercase mb-1">BIAYA TAMBAHAN</label>
                                    <input
                                        type="number"
                                        value={formTarif.biayatambahan}
                                        onChange={(e) => setFormTarif(prev => ({ ...prev, biayatambahan: e.target.value }))}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-right outline-none focus:border-sky-500"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-600 uppercase mb-1">KETERANGAN</label>
                                    <input
                                        type="text"
                                        maxLength="150"
                                        value={formTarif.keterangan}
                                        onChange={(e) => setFormTarif(prev => ({ ...prev, keterangan: e.target.value }))}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-sky-500"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-5 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow transition cursor-pointer"
                                >
                                    Simpan Rute Tarif
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL MODERN: IMPORT DARI CUSTOMER LAIN */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white text-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
                        {/* Header Modal */}
                        <div className="p-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-sm uppercase flex items-center gap-2">
                                    <Copy size={18} /> Import Tarif Dari Customer Lain
                                </h3>
                                <p className="text-[11px] text-indigo-100 mt-0.5">
                                    Target: <span className="font-mono font-bold">{customer?.cust_id}</span> - {customer?.cust_name}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsImportModalOpen(false)}
                                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleExecuteImport} className="p-6 space-y-4 text-xs">
                            {/* Penjelasan Logika Merge */}
                            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-900 leading-relaxed space-y-1">
                                <div className="font-bold flex items-center gap-1.5 text-indigo-950">
                                    <span>Layanan Aktif:</span>
                                    <span className="px-2 py-0.5 bg-indigo-200/70 rounded text-[11px]">
                                        {layanan === '1' ? 'Darat' : layanan === '2' ? 'Laut' : 'Udara'} - {namaJenis}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-600">
                                    Sistem hanya akan menyalin rute-rute yang <b>belum ada</b> pada customer ini. Tarif rute yang sudah pernah dibuat tidak akan tertimpa atau hilang.
                                </p>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 uppercase mb-1.5">
                                    PILIH CUSTOMER SUMBER (ASAL TARIF) *
                                </label>
                                <select
                                    required
                                    value={selectedSourceCust}
                                    onChange={(e) => setSelectedSourceCust(e.target.value)}
                                    className="w-full p-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
                                >
                                    <option value="">-- Pilih Customer Sumber --</option>
                                    {sourceCustList.map(c => (
                                        <option key={c.customer_id} value={c.customer_id}>
                                            {c.customer_id} - {c.cust_name} ({c.total_rute} Rute)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsImportModalOpen(false)}
                                    className="px-5 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={!selectedSourceCust}
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow transition cursor-pointer"
                                >
                                    Salin Rute Sekarang
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditMasterHargaCargo;