import React, { useState, useEffect } from 'react';
import { Plus, UserPlus, X, Save, RefreshCw, Filter, RotateCcw } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import Swal from 'sweetalert2';
import api from '../api/axios';

const MasterCustomer = () => {
    const [rekomendasiKota, setRekomendasiKota] = useState([]);
    const { isDarkMode } = useDarkMode();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [data, setData] = useState([]);
    const token = localStorage.getItem('token');

    // 🌟 STATE TOGGLE FILTER & FILTER FIELDS
    const [showFilter, setShowFilter] = useState(false);
    const [searchNameOrId, setSearchNameOrId] = useState('');
    const [searchKota, setSearchKota] = useState('');
    const [searchTelp, setSearchTelp] = useState('');
    const [filterKreditLimit, setFilterKreditLimit] = useState('');

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
        cust_jenisusaha: '',
        cust_contactperson: '',
        cust_kreditlimit: 0,
        cust_kredithari: 0
    });

    // =========================================================================
    // 🟢 DYNAMIC TENANT COMPASS: Ambil Data Mengikuti Pergerakan Dropdown Header
    // =========================================================================
    const fetchCustomers = async (targetAgenParam) => {
        setLoading(true);
        try {
            const currentToken = localStorage.getItem('token');
            const roleUserFix = localStorage.getItem('role_akses') || 'AGEN';

            let cleanAgenKode = String(
                targetAgenParam ||
                localStorage.getItem('active_agen_id') ||
                localStorage.getItem('active_agen_kode') ||
                localStorage.getItem('active_agen_nama') ||
                'ALL'
            ).trim();

            if (cleanAgenKode === "undefined" || cleanAgenKode === "") {
                cleanAgenKode = "ALL";
            }

            const upperRole = roleUserFix.toUpperCase();
            let queryUrl = `/customer?search=${encodeURIComponent(searchNameOrId)}&agen_id=${encodeURIComponent(cleanAgenKode)}&role_akses=${upperRole}`;

            if (searchKota) queryUrl += `&kota=${encodeURIComponent(searchKota)}`;
            if (searchTelp) queryUrl += `&telp=${encodeURIComponent(searchTelp)}`;
            if (filterKreditLimit) queryUrl += `&has_credit_limit=${encodeURIComponent(filterKreditLimit)}`;

            const res = await api.get(queryUrl, {
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            });

            if (res.data && res.data.status === "success") {
                setData(res.data.data || []);
            } else if (Array.isArray(res.data)) {
                setData(res.data);
            } else if (res.data && Array.isArray(res.data.data)) {
                setData(res.data.data);
            }
        } catch (err) {
            console.error("❌ Gagal menarik data master customer:", err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    // =========================================================================
    // 🟢 AUTOMATIC SYNC INTERCEPTOR: Sinkronisasi Dropdown Secara Live Tanpa Reload
    // =========================================================================
    const [filterAgenId, setFilterAgenId] = useState(
        localStorage.getItem('active_agen_id') || localStorage.getItem('active_agen_nama') || 'ALL'
    );

    useEffect(() => {
        if (token) {
            fetchCustomers(filterAgenId);
        }

        const intervalCheck = setInterval(() => {
            const latestAgenId = localStorage.getItem('active_agen_id') || localStorage.getItem('active_agen_nama') || 'ALL';

            if (latestAgenId && latestAgenId !== filterAgenId && latestAgenId !== "undefined") {
                setFilterAgenId(latestAgenId);
                fetchCustomers(latestAgenId);
            }
        }, 1000);

        return () => clearInterval(intervalCheck);
    }, [token, filterAgenId]);

    // --- 🔍 EFFECT AUTOCOMPLETE KOTA ---
    useEffect(() => {
        const kataKunciKota = formData.cust_kotaid;

        const dapatkanRekomendasiKota = async () => {
            if (kataKunciKota && kataKunciKota.trim().length >= 1) {
                const token = localStorage.getItem('token');

                try {
                    const response = await api.get(`/customer/search-kota?search=${encodeURIComponent(kataKunciKota.trim())}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.data && response.data.status === "success") {
                        setRekomendasiKota(response.data.data);
                    } else {
                        setRekomendasiKota([]);
                    }
                } catch (err) {
                    console.warn("⚠️ Gagal fetch data kota via Axios kustom:", err);
                    setRekomendasiKota([]);
                }
            } else {
                setRekomendasiKota([]);
            }
        };

        dapatkanRekomendasiKota();
    }, [formData.cust_kotaid]);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        fetchCustomers(filterAgenId);
    };

    const handleResetFilter = () => {
        setSearchNameOrId('');
        setSearchKota('');
        setSearchTelp('');
        setFilterKreditLimit('');

        const currentToken = localStorage.getItem('token');
        const roleUserFix = localStorage.getItem('role_akses') || 'AGEN';
        const cleanAgenKode = String(
            filterAgenId ||
            localStorage.getItem('active_agen_id') ||
            localStorage.getItem('active_agen_nama') ||
            'ALL'
        ).trim();

        setLoading(true);
        api.get(`/customer?search=&agen_id=${encodeURIComponent(cleanAgenKode)}&role_akses=${roleUserFix.toUpperCase()}`, {
            headers: { Authorization: `Bearer ${currentToken}` }
        })
            .then(res => {
                setData(res.data?.data || res.data || []);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    const handleAdd = async () => {
        const currentActiveAgen = localStorage.getItem('active_agen_id') || '';
        const currentActiveAgenName = localStorage.getItem('active_agen_nama') || '';

        if (currentActiveAgen === 'PUSAT DAKOTA' || currentActiveAgen === '000' || currentActiveAgen.toUpperCase().includes("PUSAT")) {
            Swal.fire({
                icon: 'warning',
                title: 'AKSES DITOLAK!',
                text: 'Cabang PUSAT DAKOTA bertindak sebagai Holding dan tidak boleh menerbitkan master customer baru. Silakan beralih ke unit agen operasional terlebih dahulu pada dropdown menu di atas!',
                confirmButtonColor: '#4f46e5'
            });
            return;
        }

        setIsEditMode(false);
        setLoading(true);

        try {
            const currentToken = localStorage.getItem('token');
            let searchKeyword = String(currentActiveAgenName).trim();
            if (searchKeyword.toUpperCase().endsWith(" AGEN")) {
                searchKeyword = searchKeyword.substring(0, searchKeyword.toUpperCase().lastIndexOf(" AGEN")).trim();
            }

            let finalKotaID = "";

            if (searchKeyword) {
                try {
                    const responseProfil = await api.get(`/agens/detail-name/${encodeURIComponent(searchKeyword)}`, {
                        headers: {
                            'Authorization': `Bearer ${currentToken}`
                        }
                    });

                    const resData = responseProfil.data;
                    const dbAgenId = resData?.data?.agen_id || resData?.data?.AgenID;

                    if (resData && resData.status === "success" && dbAgenId) {
                        finalKotaID = String(dbAgenId).trim().toUpperCase();
                    }
                } catch (apiError) {
                    console.warn("⚠️ [Detail Agen API] Gagal mengonversi nama agen via query ILIKE:", apiError);
                }
            }

            if (!finalKotaID) {
                const fallbackKeyword = searchKeyword || currentActiveAgen || "GOR";
                finalKotaID = fallbackKeyword.substring(0, 3).toUpperCase() + "002";
            }

            setFormData({
                cust_id: '',
                cust_name: '',
                cust_alamat1: '',
                cust_alamat2: '',
                cust_kotaid: finalKotaID,
                cust_telp1: '',
                cust_telp2: '',
                cust_email: '',
                cust_npwp: '',
                cust_jenisusaha: '',
                cust_contactperson: '',
                cust_kreditlimit: 0,
                cust_kredithari: 0
            });

            setIsModalOpen(true);
        } catch (error) {
            console.error("❌ Gagal memproses data tambah customer:", error);
            setFormData({
                cust_id: '',
                cust_name: '', cust_alamat1: '', cust_alamat2: '', cust_kotaid: '',
                cust_telp1: '', cust_telp2: '', cust_email: '', cust_npwp: '',
                cust_jenisusaha: '', cust_contactperson: '', cust_kreditlimit: 0, cust_kredithari: 0
            });
            setIsModalOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (row) => {
        setIsEditMode(true);
        setFormData({
            cust_id: row.cust_id,
            cust_name: row.cust_name || row.cust_nama || "",
            cust_alamat1: row.cust_alamat1 || "",
            cust_alamat2: row.cust_alamat2 || "",
            cust_kotaid: row.cust_kotaid || "",
            cust_telp1: row.cust_telp1 || "",
            cust_telp2: row.cust_telp2 || "",
            cust_email: row.cust_email || "",
            cust_npwp: row.cust_npwp || "",
            cust_jenisusaha: row.cust_jenisusaha || "",
            cust_contactperson: row.cust_contactperson || "",
            cust_kreditlimit: parseFloat(row.cust_kreditlimit) || 0,
            cust_kredithari: parseInt(row.cust_kredithari) || 0
        });
        setIsModalOpen(true);
    };

    const handleDelete = (row) => {
        const targetCustID = row.cust_id || "";
        const targetCustName = row.cust_name || row.cust_nama || "";

        Swal.fire({
            title: 'APAKAH ANDA YAKIN?',
            html: `Data Customer <b class="text-red-600">${targetCustName}</b> dengan ID: <b class="font-mono text-indigo-600">${targetCustID}</b> akan dihapus permanen dari sistem ERP kargo Dakota!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'YA, HAPUS SEKARANG!',
            cancelButtonText: 'Batal',
            customClass: {
                container: 'z-[999999] font-sans',
                popup: 'rounded-3xl',
                confirmButton: 'rounded-xl font-bold px-5 py-2.5',
                cancelButton: 'rounded-xl font-bold px-5 py-2.5'
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    const response = await api.post('/customer/delete',
                        { cust_id: targetCustID },
                        {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        }
                    );

                    const resData = response.data;

                    if (resData && resData.status === "success") {
                        Swal.fire({
                            icon: 'success',
                            title: 'BERHASIL DIHAPUS!',
                            text: `Data Customer ${targetCustName} resmi dilenyapkan!`,
                            confirmButtonColor: '#4f46e5'
                        });

                        fetchCustomers(filterAgenId);
                    } else {
                        throw new Error(resData.message || "Gagal menghapus data dari server");
                    }

                } catch (err) {
                    console.error("❌ Gagal merubuhkan data customer:", err.message);
                    const errStatus = err.response?.status;
                    const apiMessage = err.response?.data?.message;

                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal Menghapus, Bro!',
                        text: errStatus === 404
                            ? "Rute 'POST /customer/delete' belum didaftarkan di router Golang main.go lu!"
                            : (apiMessage || err.message),
                        confirmButtonColor: '#4f46e5'
                    });
                }
            }
        });
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'number' ? (parseFloat(value) || 0) : value
        });

        if (name === 'cust_email') {
            validateEmailFormat(value);
        }
    };

    const columns = [
        {
            header: 'CUST ID',
            accessor: 'cust_id',
            render: row => <span className="font-mono font-bold text-indigo-600">{row.cust_id || row.CustID}</span>
        },
        {
            header: 'NAMA CUSTOMER',
            accessor: 'cust_name',
            render: row => row.cust_name || row.CustName || row.cust_nama
        },
        {
            header: 'ALAMAT LENGKAP',
            accessor: 'cust_alamat1',
            render: row => row.cust_alamat1 || row.CustAlamat1
        },
        {
            header: 'TELEPON',
            accessor: 'cust_telp1',
            render: row => row.cust_telp1 || row.CustTelp1
        },
        {
            header: 'KOTA',
            accessor: 'cust_kotaid',
            render: row => row.cust_kotaid || row.CustKotaID
        }
    ];

    const validateEmailFormat = (emailVal) => {
        if (!emailVal || emailVal.trim() === "") {
            setEmailError('');
            return true;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(emailVal)) {
            setEmailError("Format email tidak valid! Harus mengandung '@' dan domain (contoh: corp@dakota.com)");
            return false;
        } else {
            setEmailError('');
            return true;
        }
    };

    const handleSubmit = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (formData.cust_email && !validateEmailFormat(formData.cust_email)) {
            Swal.fire({
                icon: 'error',
                title: 'Format Email Salah, Bro!',
                text: 'Mohon perbaiki penulisan email perusahaan terlebih dahulu sebelum disimpan!',
                confirmButtonColor: '#4f46e5'
            });
            return;
        }

        if (loading) return;

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const endpointUrl = isEditMode ? '/customer/update' : '/customer/create';

            const response = await api.post(endpointUrl, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const resData = response.data;

            if (resData && resData.status === "success") {
                setIsModalOpen(false);

                Swal.fire({
                    icon: 'success',
                    title: isEditMode ? 'BERHASIL DIUPDATE!' : 'BERHASIL TERSIMPAN!',
                    text: isEditMode
                        ? `Data Customer ID: ${formData.cust_id} Berhasil Diperbarui!`
                        : `Customer Baru Sukses Disimpan dengan ID: ${resData.cust_id}`,
                    confirmButtonColor: '#4f46e5'
                });

                setFormData({
                    cust_id: '',
                    cust_name: '',
                    cust_alamat1: '',
                    cust_alamat2: '',
                    cust_kotaid: '',
                    cust_telp1: '',
                    cust_telp2: '',
                    cust_email: '',
                    cust_npwp: '',
                    cust_jenisusaha: '',
                    cust_contactperson: '',
                    cust_kreditlimit: 0,
                    cust_kredithari: 0
                });

                setTimeout(() => {
                    fetchCustomers(filterAgenId);
                }, 100);
            } else {
                throw new Error(resData.message || "Gagal memproses master data customer");
            }
        } catch (err) {
            console.error("❌ Terdeteksi Error Lapangan:", err.message);
            const errStatus = err.response?.status;
            const apiMessage = err.response?.data?.message;

            Swal.fire({
                icon: 'error',
                title: 'Aksi Gagal, Bro!',
                text: errStatus === 404
                    ? `Rute '${isEditMode ? 'POST /customer/update' : 'POST /customer/create'}' belum didaftarkan di router Golang main.go lu!`
                    : (apiMessage || err.message),
                confirmButtonColor: '#4f46e5'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* 🌟 PANEL FILTER BERSYARAT (TOGGLE BUKA/TUTUP) */}
            {showFilter && (
                <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                        <Filter size={16} className="text-sky-600" />
                        FILTER MASTER CUSTOMER
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CARI ID / NAMA CUSTOMER</label>
                            <input
                                type="text"
                                placeholder="Ketik ID atau nama..."
                                value={searchNameOrId}
                                onChange={(e) => setSearchNameOrId(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">KOTA / AGEN ID</label>
                            <input
                                type="text"
                                placeholder="Ketik kode kota/agen..."
                                value={searchKota}
                                onChange={(e) => setSearchKota(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. TELEPON</label>
                            <input
                                type="text"
                                placeholder="Ketik nomor telepon..."
                                value={searchTelp}
                                onChange={(e) => setSearchTelp(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">STATUS LIMIT KREDIT</label>
                            <select
                                value={filterKreditLimit}
                                onChange={(e) => setFilterKreditLimit(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer"
                            >
                                <option value="">-- SEMUA CUSTOMER --</option>
                                <option value="Y">Memiliki Limit Kredit (&gt; 0)</option>
                                <option value="N">Tanpa Limit Kredit (= 0)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handleResetFilter}
                            className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer flex items-center gap-1.5"
                        >
                            <RotateCcw size={14} /> RESET
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                            <RefreshCw size={14} /> REFRESH DATA
                        </button>
                    </div>
                </form>
            )}

            {/* 🌟 RENDER UTAMA: Memanggil Template Bawaan Dakota dengan prop onFilter */}
            <DataTableTemplate
                title="MASTER CUSTOMER"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onFilter={() => setShowFilter(prev => !prev)}
            />

            {/* ============================================================== */}
            {/* 2. INJECT DIALOG MODAL ENTRY BARU                              */}
            {/* ============================================================== */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white text-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100">

                        {/* HEADER MODAL */}
                        <div className="p-5 flex items-center justify-between border-b border-slate-200 bg-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-200">
                                    <UserPlus size={20} />
                                </div>
                                <h2 className="text-lg font-black text-slate-800">
                                    {isEditMode ? `Ubah Data Master Customer [ID: ${formData.cust_id}]` : 'Form Entri Master Customer Baru'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 text-slate-500 hover:bg-slate-200 rounded-full transition-colors font-bold"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* FORM INPUT BODY */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
                            <div className="grid grid-cols-2 gap-4">

                                {/* INPUT 1: NAMA */}
                                <div className="col-span-2 flex flex-col">
                                    <label className="text-xs font-black text-slate-600 uppercase">Nama Lengkap Customer / PT / CV *</label>
                                    <input
                                        type="text"
                                        name="cust_name"
                                        required
                                        value={formData.cust_name || ""}
                                        onChange={handleChange}
                                        className="w-full mt-1 p-3 border border-slate-300 bg-white text-slate-900 rounded-xl outline-none uppercase font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                                        placeholder="Contoh: PT INDOFOOD SUKSES MAKMUR"
                                    />
                                </div>

                                {/* INPUT 2: ALAMAT 1 */}
                                <div className="col-span-2 flex flex-col">
                                    <label className="text-xs font-black text-slate-600 uppercase">Alamat Utama *</label>
                                    <input
                                        type="text"
                                        name="cust_alamat1"
                                        required
                                        value={formData.cust_alamat1 || ""}
                                        onChange={handleChange}
                                        className="w-full mt-1 p-3 border border-slate-300 bg-white text-slate-900 rounded-xl outline-none uppercase font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                                        placeholder="Nama Jalan, Blok, Nomor..."
                                    />
                                </div>

                                {/* INPUT 3: ALAMAT 2 */}
                                <div className="col-span-2 flex flex-col">
                                    <label className="text-xs font-black text-slate-600 uppercase">Alamat Tambahan (Baris 2)</label>
                                    <input
                                        type="text"
                                        name="cust_alamat2"
                                        value={formData.cust_alamat2 || ""}
                                        onChange={handleChange}
                                        className="w-full mt-1 p-3 border border-slate-300 bg-white text-slate-900 rounded-xl outline-none uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                                        placeholder="Kecamatan, Kelurahan..."
                                    />
                                </div>

                                {/* INPUT 4: KOTA ID DENGAN DROPDOWN POSITION LOCK */}
                                <div className="flex flex-col" style={{ position: 'relative' }}>
                                    <label className="text-xs font-black text-slate-600 uppercase">AGEN ID (Otomatis Lock) *</label>
                                    <input
                                        type="text"
                                        name="cust_kotaid"
                                        required
                                        readOnly
                                        value={formData.cust_kotaid || ""}
                                        className="w-full mt-1 p-3 border border-slate-200 bg-slate-100 text-indigo-600 rounded-xl outline-none uppercase font-black cursor-not-allowed select-none transition-all"
                                        placeholder="Memuat Kode Cabang..."
                                        autoComplete="off"
                                    />
                                    <span className="text-[10px] text-indigo-500 font-bold mt-1">
                                        🔒 Terkunci otomatis mengikuti Loket Dropdown aktif.
                                    </span>

                                    {Array.isArray(rekomendasiKota) && rekomendasiKota.length > 0 && (
                                        <div
                                            className="absolute left-0 bg-white border-2 border-slate-200 rounded-xl shadow-2xl z-[999999] max-h-40 overflow-y-auto text-sm"
                                            style={{ top: '100%', width: '100%' }}
                                        >
                                            {rekomendasiKota.map((kt, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-3 hover:bg-indigo-50 cursor-pointer border-b last:border-b-0 font-bold text-slate-800 transition-colors flex justify-between items-center"
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, cust_kotaid: kt.kota_id }));
                                                        setRekomendasiKota([]);
                                                    }}
                                                >
                                                    <span className="text-indigo-600 font-black">{kt.kota_id}</span>
                                                    <span className="text-xs text-slate-500 font-semibold uppercase">{kt.kota_nama}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* INPUT 5: EMAIL */}
                                <div className="flex flex-col">
                                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Email Perusahaan</label>
                                    <input
                                        type="text"
                                        name="cust_email"
                                        value={formData.cust_email || ""}
                                        onChange={handleChange}
                                        className={`w-full mt-1 p-3 border rounded-xl outline-none font-medium transition-all duration-300 ${emailError
                                            ? 'border-red-500 bg-red-50/30 text-red-900 focus:ring-4 focus:ring-red-100 focus:border-red-500'
                                            : formData.cust_email && !emailError
                                                ? 'border-emerald-500 bg-emerald-50/20 text-emerald-900 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500'
                                                : 'border-slate-300 bg-white text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                                            }`}
                                        placeholder="contoh: corp@dakota.com"
                                    />

                                    {emailError && (
                                        <span className="text-[11px] font-bold text-red-500 mt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                            ⚠️ {emailError}
                                        </span>
                                    )}
                                </div>

                                {/* INPUT 6: TELP 1 */}
                                <div className="flex flex-col">
                                    <label className="text-xs font-black text-slate-600 uppercase">Telepon Utama *</label>
                                    <input
                                        type="text"
                                        name="cust_telp1"
                                        required
                                        value={formData.cust_telp1 || ""}
                                        onChange={handleChange}
                                        className="w-full mt-1 p-3 border border-slate-300 bg-white text-slate-900 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                                        placeholder="021xxxxxxxx"
                                    />
                                </div>

                                {/* INPUT 7: TELP 2 */}
                                <div className="flex flex-col">
                                    <label className="text-xs font-black text-slate-600 uppercase">Telepon Cadangan</label>
                                    <input
                                        type="text"
                                        name="cust_telp2"
                                        value={formData.cust_telp2 || ""}
                                        onChange={handleChange}
                                        className="w-full mt-1 p-3 border border-slate-300 bg-white text-slate-900 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                                        placeholder="08xxxxxxxx"
                                    />
                                </div>

                                {/* FIELD BARU: NPWP */}
                                <div className="flex flex-col">
                                    <label className="text-xs font-black text-slate-600 uppercase">NPWP Perusahaan</label>
                                    <input type="text" name="cust_npwp" value={formData.cust_npwp || ""} onChange={handleChange} className="w-full mt-1 p-3 border border-slate-300 bg-white text-slate-900 rounded-xl outline-none" placeholder="00.000.000.0-000.000" />
                                </div>

                                {/* FIELD BARU: JENIS USAHA */}
                                <div className="flex flex-col">
                                    <label className="text-xs font-black text-slate-600 uppercase">Jenis Usaha</label>
                                    <input type="text" name="cust_jenisusaha" value={formData.cust_jenisusaha || ""} onChange={handleChange} className="w-full mt-1 p-3 border border-slate-300 bg-white text-slate-900 rounded-xl outline-none uppercase font-medium" placeholder="Contoh: MANUFAKTUR / DISTRIBUTOR" />
                                </div>

                                {/* FIELD BARU: CONTACT PERSON */}
                                <div className="flex flex-col">
                                    <label className="text-xs font-black text-slate-600 uppercase">Contact Person (CP)</label>
                                    <input type="text" name="cust_contactperson" value={formData.cust_contactperson || ""} onChange={handleChange} className="w-full mt-1 p-3 border border-slate-300 bg-white text-slate-900 rounded-xl outline-none uppercase font-medium" placeholder="Nama PIC Hubungan" />
                                </div>

                                {/* FIELD BARU: LIMIT KREDIT (RP) */}
                                <div className="flex flex-col">
                                    <label className="text-xs font-black text-slate-600 uppercase">Limit Kredit (Rp)</label>
                                    <input type="number" name="cust_kreditlimit" value={formData.cust_kreditlimit || 0} onChange={handleChange} className="w-full mt-1 p-3 border border-slate-300 bg-white text-slate-900 rounded-xl outline-none font-bold text-red-600" />
                                </div>

                                {/* FIELD BARU: TEMPO HARI */}
                                <div className="flex flex-col">
                                    <label className="text-xs font-black text-slate-600 uppercase">Jangka Waktu Tempo (Hari)</label>
                                    <input type="number" name="cust_kredithari" value={formData.cust_kredithari || 0} onChange={handleChange} className="w-full mt-1 p-3 border border-slate-300 bg-white text-slate-900 rounded-xl outline-none" placeholder="Contoh: 30" />
                                </div>

                            </div>

                            {/* ACTION FOOTER BUTTONS */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-6 bg-white">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-indigo-100 transition-colors"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                                    {loading ? 'Menyimpan...' : (isEditMode ? 'Update Data Customer' : 'Simpan Customer')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterCustomer;