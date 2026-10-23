import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    Users, Search, CheckSquare, Square, Plus, Edit2, Trash2,
    X, Save, Building, Phone, Package, FileText, ShieldCheck, User
} from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from "../context/DarkModeContext";
import Swal from 'sweetalert2';

const defaultFormState = {
    cust_id: '',
    cust_name: '',
    cust_alamat1: '',
    cust_alamat2: '',
    cust_kotaid: '',
    kota_name: '',
    cust_telp1: '',
    cust_telp2: '',
    cust_fax1: '',
    cust_fax2: '',
    cust_contactperson: '',
    cust_memo: '',
    cust_kgmin: 0,
    cust_email: '',
    cust_npwp: '',
    cust_namanpwp: '',
    cust_pic: '',
    pic_display: '',
    cust_top: 30,
    nopo: ''
};

const MasterCustomerNew = () => {
    const { isDarkMode } = useDarkMode();
    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Master Dropdown List
    const [kotaList, setKotaList] = useState([]);
    const [karyawanList, setKaryawanList] = useState([]);

    // Filter Controls
    const [filterAktif, setFilterAktif] = useState('Y');
    const [filterNama, setFilterNama] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState(defaultFormState);

    // 1. FETCH DATA MASTER KOTA & KARYAWAN
    const fetchMasterSupport = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [resKota, resKaryawan] = await Promise.all([
                api.get('/master/kota', { headers }).catch(() => api.get('/kota', { headers })).catch(() => ({ data: [] })),
                api.get('/master/karyawan', { headers }).catch(() => api.get('/karyawan', { headers })).catch(() => ({ data: [] }))
            ]);

            setKotaList(resKota.data?.data || resKota.data || []);
            setKaryawanList(resKaryawan.data?.data || resKaryawan.data || []);
        } catch (err) {
            console.warn("Gagal memuat master pendukung:", err);
        }
    };

    // 2. FETCH DATA CUSTOMER
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
            setDataList(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error("Gagal memuat customer:", err);
            setDataList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMasterSupport();
        fetchCustomers();
    }, [filterAktif]);

    // 3. TOGGLE HARI KERJA REALTIME (AJAX CHECKBOX)
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

    // 4. BUKA MODAL TAMBAH (ADD)
    const handleOpenAdd = () => {
        setIsEditMode(false);
        setFormData(defaultFormState);
        setIsModalOpen(true);
    };

    // 5. BUKA MODAL EDIT
    const handleOpenEdit = (item) => {
        setIsEditMode(true);
        const picName = item.kry_nama || item.pic_nama || '';
        const picNip = item.cust_pic || item.pic || '';
        const picDisplay = picNip && picName ? `${picNip} - ${picName}` : picNip;

        setFormData({
            cust_id: item.cust_id || '',
            cust_name: item.cust_name || item.cust_nama || '',
            cust_alamat1: item.cust_alamat1 || item.alamat1 || '',
            cust_alamat2: item.cust_alamat2 || item.alamat2 || '',
            cust_kotaid: item.cust_kotaid || item.kotaid || '',
            kota_name: item.kota_name || item.kotaname || '',
            cust_telp1: item.cust_telp1 || item.telp1 || '',
            cust_telp2: item.cust_telp2 || item.telp2 || '',
            cust_fax1: item.cust_fax1 || item.fax1 || '',
            cust_fax2: item.cust_fax2 || item.fax2 || '',
            cust_contactperson: item.cust_contactperson || item.kontak || '',
            cust_memo: item.cust_memo || item.keterangan || '',
            cust_kgmin: parseFloat(item.cust_kgmin || item.minkg || 0),
            cust_email: item.cust_email || item.email || '',
            cust_npwp: item.cust_npwp || item.npwp || '',
            cust_namanpwp: item.cust_namanpwp || item.namanpwp || '',
            cust_pic: picNip,
            pic_display: picDisplay,
            cust_top: item.cust_top || item.top || 30,
            nopo: item.nopo || item.no_po || ''
        });
        setIsModalOpen(true);
    };

    // 6. SUBMIT FORM (CREATE ATAU UPDATE)
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const endpoint = isEditMode ? '/customer/update' : '/customer/create';

            // Payload lengkap diselaraskan dengan backend & asp lawas
            const payload = {
                kdcust: formData.cust_id,
                cust_id: formData.cust_id,
                nama: formData.cust_name,
                cust_name: formData.cust_name,
                alamat1: formData.cust_alamat1,
                cust_alamat1: formData.cust_alamat1,
                alamat2: formData.cust_alamat2 || '',
                cust_alamat2: formData.cust_alamat2 || '',
                kotaid: formData.cust_kotaid,
                cust_kotaid: formData.cust_kotaid,
                kotaname: formData.kota_name,
                telp1: formData.cust_telp1,
                cust_telp1: formData.cust_telp1,
                telp2: formData.cust_telp2 || '',
                cust_telp2: formData.cust_telp2 || '',
                fax1: formData.cust_fax1 || '',
                cust_fax1: formData.cust_fax1 || '',
                fax2: formData.cust_fax2 || '',
                cust_fax2: formData.cust_fax2 || '',
                kontak: formData.cust_contactperson || '',
                cust_contactperson: formData.cust_contactperson || '',
                keterangan: formData.cust_memo || '',
                cust_memo: formData.cust_memo || '',
                minkg: parseFloat(formData.cust_kgmin) || 0,
                cust_kgmin: parseFloat(formData.cust_kgmin) || 0,
                email: formData.cust_email || '',
                cust_email: formData.cust_email || '',
                npwp: formData.cust_npwp || '',
                cust_npwp: formData.cust_npwp || '',
                namanpwp: formData.cust_namanpwp || '',
                cust_namanpwp: formData.cust_namanpwp || '',
                pic: formData.cust_pic || '',
                cust_pic: formData.cust_pic || '',
                top: parseInt(formData.cust_top) || 0,
                cust_top: parseInt(formData.cust_top) || 0,
                nopo: formData.nopo || ''
            };

            const res = await api.post(endpoint, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                title: 'Berhasil!',
                text: res.data?.message || (isEditMode ? 'Data customer berhasil diperbarui.' : 'Customer baru berhasil ditambahkan.'),
                icon: 'success',
                confirmButtonColor: '#004b84'
            });

            setIsModalOpen(false);
            fetchCustomers();
        } catch (err) {
            Swal.fire('Gagal!', err.response?.data?.message || 'Gagal menyimpan data customer.', 'error');
        }
    };

    // 7. SUBMIT DELETE
    const handleDeleteTrigger = (item) => {
        Swal.fire({
            title: 'Hapus Customer?',
            html: `Apakah Anda yakin ingin menghapus customer <b>${item.cust_name || item.cust_id}</b>?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.post('/customer/delete', { cust_id: item.cust_id }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Terhapus!', 'Customer berhasil dihapus.', 'success');
                    fetchCustomers();
                } catch (err) {
                    Swal.fire('Gagal!', err.response?.data?.message || 'Gagal menghapus customer.', 'error');
                }
            }
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
            (item.cust_telp1 && item.cust_telp1.toLowerCase().includes(q)) ||
            (item.cust_contactperson && item.cust_contactperson.toLowerCase().includes(q))
        );
    });

    const columns = [
        {
            header: 'KODE & NAMA CUSTOMER',
            accessor: 'cust_name',
            render: (item) => (
                <div>
                    <span
                        className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer text-xs block uppercase"
                        onClick={() => handleOpenEdit(item)}
                    >
                        {item.cust_name || item.cust_nama}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">ID: {item.cust_id}</span>
                </div>
            )
        },
        { header: 'NPWP', accessor: 'cust_npwp', render: (item) => <span className="font-mono text-xs">{item.cust_npwp || '-'}</span> },
        { header: 'TELP 1', accessor: 'cust_telp1', render: (item) => <span className="font-mono text-xs">{item.cust_telp1 || '-'}</span> },
        { header: 'TELP 2', accessor: 'cust_telp2', render: (item) => <span className="font-mono text-xs">{item.cust_telp2 || '-'}</span> },
        { header: 'CONTACT PERSON', accessor: 'cust_contactperson', render: (item) => <span className="uppercase text-xs">{item.cust_contactperson || '-'}</span> },
        {
            header: 'STATUS',
            accessor: 'cust_aktifyn',
            render: (item) => (
                <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${item.cust_aktifyn === 'Y' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {item.cust_aktifyn === 'Y' ? 'AKTIF' : 'NON-AKTIF'}
                </span>
            )
        },
        {
            header: 'SABTU',
            accessor: 'sabtuyn',
            render: (item) => {
                const isChecked = item.work_days?.sabtuyn === 'Y';
                return (
                    <button
                        type="button"
                        onClick={(e) => handleToggleWorkDays(item.cust_id, 'sabtuyn', item.work_days?.sabtuyn, e)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer"
                        title="Toggle Hari Kerja Sabtu"
                    >
                        {isChecked ? <CheckSquare size={16} className="text-emerald-600" /> : <Square size={16} className="text-slate-300" />}
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
                        type="button"
                        onClick={(e) => handleToggleWorkDays(item.cust_id, 'mingguyn', item.work_days?.mingguyn, e)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer"
                        title="Toggle Hari Kerja Minggu"
                    >
                        {isChecked ? <CheckSquare size={16} className="text-emerald-600" /> : <Square size={16} className="text-slate-300" />}
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
                        type="button"
                        onClick={(e) => handleToggleWorkDays(item.cust_id, 'liburyn', item.work_days?.liburyn, e)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer"
                        title="Toggle Hari Kerja Libur"
                    >
                        {isChecked ? <CheckSquare size={16} className="text-emerald-600" /> : <Square size={16} className="text-slate-300" />}
                    </button>
                );
            }
        },
        {
            header: 'ACTION',
            accessor: 'action',
            render: (item) => (
                <div className="flex items-center gap-1.5 justify-center">
                    <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        title="Edit Customer"
                    >
                        <Edit2 size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeleteTrigger(item)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        title="Hapus Customer"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="min-h-screen p-4 space-y-4 bg-slate-50 text-slate-800">
            {/* Header Menu */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
                <h3 className="text-base font-black text-slate-700 flex items-center gap-2 uppercase tracking-wide">
                    <Users size={20} className="text-[#004b84]" /> Master Customer
                </h3>
            </div>

            {/* FILTER PANEL */}
            <div className="p-4 bg-white rounded-2xl shadow-xs border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-end text-xs font-bold text-slate-600">
                <div className="md:col-span-3">
                    <label className="block mb-1 text-slate-500 uppercase">STATUS AKTIF :</label>
                    <div className="flex items-center gap-4 h-[40px] px-3 border border-slate-200 rounded-xl bg-white">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                                type="radio"
                                name="aktifFilter"
                                value="Y"
                                checked={filterAktif === 'Y'}
                                onChange={e => setFilterAktif(e.target.value)}
                                className="text-blue-600 cursor-pointer"
                            /> Ya
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                                type="radio"
                                name="aktifFilter"
                                value="N"
                                checked={filterAktif === 'N'}
                                onChange={e => setFilterAktif(e.target.value)}
                                className="text-blue-600 cursor-pointer"
                            /> Tidak
                        </label>
                    </div>
                </div>

                <div className="md:col-span-6">
                    <label className="block mb-1 text-slate-500 uppercase">CARI NAMA / ID CUSTOMER :</label>
                    <input
                        type="text"
                        className="w-full h-[40px] px-3 border border-slate-200 rounded-xl text-xs font-medium focus:border-blue-500 bg-white outline-none"
                        placeholder="Ketik Nama, NPWP, atau ID Customer..."
                        value={filterNama}
                        onChange={e => setFilterNama(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && fetchCustomers()}
                    />
                </div>

                <div className="md:col-span-3">
                    <button
                        type="button"
                        onClick={fetchCustomers}
                        className="w-full h-[40px] bg-[#004b84] hover:bg-[#003863] active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition uppercase text-xs cursor-pointer shadow-sm"
                    >
                        <Search size={14} /> CARI DATA
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
                onAdd={handleOpenAdd}
                addButtonText="Tambah MASTER CUSTOMER"
            />

            {/* ============================================================== */}
            {/* 🌟 UNIFIED MODAL (TAMBAH & EDIT CUSTOMER LENGKAP)             */}
            {/* ============================================================== */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 max-h-[92vh]">

                        {/* Header Modal */}
                        <div className="px-8 py-4 bg-[#004b84] text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-xl">
                                    <User className="text-emerald-300" size={20} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-wider">
                                        {isEditMode ? 'Edit Data Customer' : 'Tambah Customer Baru'}
                                    </h2>
                                    <p className="text-[11px] text-sky-100 font-mono">
                                        {isEditMode
                                            ? `Kode Customer: ${formData.cust_id || '-'}`
                                            : 'Form kelengkapan pendaftaran customer baru PT Dakota Logistik Indonesia'
                                        }
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer font-bold"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form Body - Scrollable */}
                        <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-4 text-xs font-semibold text-slate-700 flex-1">

                            {/* 1. KELOMPOK: IDENTITAS PERUSAHAAN & ALAMAT */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
                                <span className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 text-xs border-b border-slate-200 pb-2">
                                    <Building size={14} className="text-[#004b84]" /> Identitas Perusahaan & Alamat
                                </span>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                    {isEditMode && (
                                        <div className="md:col-span-3">
                                            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">KODE CUSTOMER :</label>
                                            <input
                                                type="text"
                                                value={formData.cust_id}
                                                readOnly
                                                className="w-full h-9 px-3 bg-slate-200/70 border border-slate-300 rounded-xl font-mono font-bold text-slate-700 outline-none"
                                            />
                                        </div>
                                    )}
                                    <div className={isEditMode ? "md:col-span-9" : "md:col-span-12"}>
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                                            NAMA CUSTOMER : <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.cust_name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, cust_name: e.target.value.toUpperCase() }))}
                                            placeholder="Contoh: PT. MERCK CHEMICALS AND LIFE SCIENCES..."
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-bold uppercase outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                                        />
                                    </div>

                                    <div className="md:col-span-6">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                                            ALAMAT 1 (UTAMA) : <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.cust_alamat1}
                                            onChange={(e) => setFormData(prev => ({ ...prev, cust_alamat1: e.target.value.toUpperCase() }))}
                                            placeholder="Jalan, Gedung, No, RT/RW, Kelurahan..."
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs uppercase outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="md:col-span-6">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                                            ALAMAT 2 (CABANG / GUDANG) :
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.cust_alamat2}
                                            onChange={(e) => setFormData(prev => ({ ...prev, cust_alamat2: e.target.value.toUpperCase() }))}
                                            placeholder="Alamat gudang / patokan tambahan..."
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs uppercase outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 2. KELOMPOK: WILAYAH & KONTAK KOMUNIKASI */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
                                <span className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 text-xs border-b border-slate-200 pb-2">
                                    <Phone size={14} className="text-[#004b84]" /> Wilayah & Kontak Komunikasi
                                </span>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                    <div className="md:col-span-4">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                                            KOTA : <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            list="kota-list-dropdown"
                                            required
                                            placeholder="Ketik atau pilih nama kota..."
                                            value={formData.kota_name}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const match = kotaList.find(k => (k.kota_name || k.nama) === val);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    kota_name: val,
                                                    cust_kotaid: match ? (match.kota_id || match.id) : prev.cust_kotaid
                                                }));
                                            }}
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-bold uppercase outline-none focus:border-blue-500"
                                        />
                                        <datalist id="kota-list-dropdown">
                                            {kotaList.map((k, idx) => (
                                                <option key={idx} value={k.kota_name || k.nama} />
                                            ))}
                                        </datalist>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                                            TELP 1 : <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.cust_telp1}
                                            onChange={(e) => setFormData(prev => ({ ...prev, cust_telp1: e.target.value.replace(/\D/g, '') }))}
                                            placeholder="0218400081"
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-mono outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">TELP 2 :</label>
                                        <input
                                            type="text"
                                            value={formData.cust_telp2}
                                            onChange={(e) => setFormData(prev => ({ ...prev, cust_telp2: e.target.value.replace(/\D/g, '') }))}
                                            placeholder="081234567..."
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-mono outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">FAX 1 :</label>
                                        <input
                                            type="text"
                                            value={formData.cust_fax1}
                                            onChange={(e) => setFormData(prev => ({ ...prev, cust_fax1: e.target.value }))}
                                            placeholder="0218400492"
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-mono outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">FAX 2 :</label>
                                        <input
                                            type="text"
                                            value={formData.cust_fax2}
                                            onChange={(e) => setFormData(prev => ({ ...prev, cust_fax2: e.target.value }))}
                                            placeholder="0218402095"
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-mono outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 3. KELOMPOK: OPERASIONAL, PIC & KETENTUAN KIRIM */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
                                <span className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 text-xs border-b border-slate-200 pb-2">
                                    <Package size={14} className="text-[#004b84]" /> Operasional & Ketentuan Kirim
                                </span>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                    <div className="md:col-span-4">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">KONTAK PERSON :</label>
                                        <input
                                            type="text"
                                            value={formData.cust_contactperson}
                                            onChange={(e) => setFormData(prev => ({ ...prev, cust_contactperson: e.target.value.toUpperCase() }))}
                                            placeholder="RITA DWI NUGROHOWATI..."
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl uppercase outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="md:col-span-3">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">KETERANGAN / MEMO :</label>
                                        <input
                                            type="text"
                                            value={formData.cust_memo}
                                            onChange={(e) => setFormData(prev => ({ ...prev, cust_memo: e.target.value }))}
                                            placeholder="MERCK (CROSS DOCKING)..."
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">BERAT MINIMUM (KG) :</label>
                                        <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            value={formData.cust_kgmin}
                                            onChange={(e) => setFormData(prev => ({ ...prev, cust_kgmin: e.target.value }))}
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-mono font-bold text-center outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="md:col-span-3">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">EMAIL RESMI :</label>
                                        <input
                                            type="email"
                                            value={formData.cust_email}
                                            onChange={(e) => setFormData(prev => ({ ...prev, cust_email: e.target.value }))}
                                            placeholder="customer@perusahaan.com"
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 4. KELOMPOK: PERPAJAKAN & NPWP */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
                                <span className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 text-xs border-b border-slate-200 pb-2">
                                    <FileText size={14} className="text-[#004b84]" /> Data Perpajakan (NPWP)
                                </span>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                    <div className="md:col-span-4">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">NOMOR NPWP :</label>
                                        <input
                                            type="text"
                                            value={formData.cust_npwp}
                                            onChange={(e) => setFormData(prev => ({ ...prev, cust_npwp: e.target.value }))}
                                            placeholder="02.648.319.8-056.000"
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-mono font-bold outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="md:col-span-8">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">NAMA PT SESUAI NPWP :</label>
                                        <input
                                            type="text"
                                            value={formData.cust_namanpwp}
                                            onChange={(e) => setFormData(prev => ({ ...prev, cust_namanpwp: e.target.value.toUpperCase() }))}
                                            placeholder="PT. MERCK CHEMICALS AND LIFE SCIENCES..."
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl uppercase font-bold outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 5. KELOMPOK: PENAGIHAN, TOP & MARKETING PIC */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
                                <span className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 text-xs border-b border-slate-200 pb-2">
                                    <ShieldCheck size={14} className="text-[#004b84]" /> Penagihan, TOP & Marketing PIC
                                </span>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                    <div className="md:col-span-6">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                                            PIC MARKETING / KARYAWAN :
                                        </label>
                                        <input
                                            type="text"
                                            list="karyawan-pic-dropdown"
                                            placeholder="Ketik NIP / Nama PIC Marketing..."
                                            value={formData.pic_display}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    pic_display: val,
                                                    cust_pic: val.includes(' - ') ? val.split(' - ')[0].trim() : val
                                                }));
                                            }}
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-bold uppercase outline-none focus:border-blue-500"
                                        />
                                        <datalist id="karyawan-pic-dropdown">
                                            {karyawanList.map((kry, idx) => (
                                                <option key={idx} value={`${kry.kry_nip} - ${kry.kry_nama}`} />
                                            ))}
                                        </datalist>
                                    </div>

                                    <div className="md:col-span-3">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                                            T O P (HARI / TIME OF PAYMENT) :
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.cust_top}
                                            onChange={(e) => setFormData(prev => ({ ...prev, cust_top: e.target.value }))}
                                            placeholder="Contoh: 30"
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-mono font-bold text-center outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="md:col-span-3">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                                            NOMOR PO :
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.nopo}
                                            onChange={(e) => setFormData(prev => ({ ...prev, nopo: e.target.value }))}
                                            placeholder="Nomor PO (opsional)..."
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-mono outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer Modal Buttons */}
                            <div className="pt-3 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white py-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl text-xs uppercase transition cursor-pointer"
                                >
                                    BATAL
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-2.5 bg-[#004b84] hover:bg-[#003863] active:scale-95 text-white font-black rounded-xl text-xs uppercase flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                                >
                                    <Save size={15} /> {isEditMode ? 'UPDATE CUSTOMER' : 'SIMPAN CUSTOMER'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterCustomerNew;