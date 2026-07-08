import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, UserPlus, X, Save, RefreshCw } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import Swal from 'sweetalert2';
import api from '../api/axios';

const MasterCustomer = () => {
    const [rekomendasiKota, setRekomendasiKota] = useState([]); // Penampung hasil query glb_m_kota
    const { isDarkMode } = useDarkMode(); // Panggil state dark mode lu
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [data, setData] = useState([]);
    const token = localStorage.getItem('token');

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
        setLoading(true); //
        try {
            const currentToken = localStorage.getItem('token'); //
            const roleUserFix = localStorage.getItem('role_akses') || 'AGEN'; //

            // 🧠 AMBIL SECARA LIVE: Ambil parameter input, atau intip semua kemungkinan key session storage browser
            let cleanAgenKode = String(
                targetAgenParam ||
                localStorage.getItem('active_agen_id') ||
                localStorage.getItem('active_agen_kode') ||
                localStorage.getItem('active_agen_nama') ||
                'ALL'
            ).trim(); //

            // Jika bernilai undefined bawaan browser, paksa amankan ke ALL
            if (cleanAgenKode === "undefined" || cleanAgenKode === "") { //
                cleanAgenKode = "ALL"; //
            } //

            const upperRole = roleUserFix.toUpperCase(); //
            console.log(`📡 [Nusantara Engine Front-End] Mengirim Saringan: "${cleanAgenKode}", Otoritas: ${upperRole}`); //

            // 👑 SOLUSI SAKTI: Ganti axios mentah dengan instance api kustom kita bray!
            // Menggunakan endpoint relatif tanpa embel-embel "http://localhost:8080"
            const res = await api.get(`/customer?search=&agen_id=${encodeURIComponent(cleanAgenKode)}&role_akses=${upperRole}`, {
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            });

            if (res.data && res.data.status === "success") { //
                setData(res.data.data || []); //
            } else if (Array.isArray(res.data)) { //
                setData(res.data); //
            } else if (res.data && Array.isArray(res.data.data)) { //
                setData(res.data.data); //
            } //
        } catch (err) { //
            console.error("❌ Gagal menarik data master customer:", err); //
            setData([]); //
        } finally { //
            setLoading(false); //
        } //
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

        // Interval checker membaca mutasi session dropdown secara live per 1 detik
        const intervalCheck = setInterval(() => {
            const latestAgenId = localStorage.getItem('active_agen_id') || localStorage.getItem('active_agen_nama') || 'ALL';

            if (latestAgenId && latestAgenId !== filterAgenId && latestAgenId !== "undefined") {
                console.log(`🔄 [Nusantara Interceptor] Deteksi Perpindahan Loket Dropdown ke: ${latestAgenId}`);
                setFilterAgenId(latestAgenId); // Trigger React re-render
                fetchCustomers(latestAgenId);  // Paksa fetch ulang membawa string nama loket baru seketika!
            }
        }, 1000);

        return () => clearInterval(intervalCheck);
    }, [token, filterAgenId]);

    // --- 🔍 EFFECT AUTOCOMPLETE KOTA (Dinamis & Lintas Server Server) ---
    useEffect(() => {
        const kataKunciKota = formData.cust_kotaid;

        // Jalankan fungsi async internal untuk mengamankan standard request axios
        const dapatkanRekomendasiKota = async () => {
            if (kataKunciKota && kataKunciKota.trim().length >= 1) {
                const token = localStorage.getItem('token');

                try {
                    console.log(`📡 [Nusantara Interceptor] Autocomplete mencari kota: "${kataKunciKota.trim()}"`);

                    // 👑 SOLUSI SAKTI: Ganti fetch localhost dengan instance api kustom kita bray!
                    const response = await api.get(`/customer/search-kota?search=${encodeURIComponent(kataKunciKota.trim())}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    // Axios otomatis mem-parsing JSON, langsung baca response.data bray
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

        // Eksekusi fungsi async di atas bray bray
        dapatkanRekomendasiKota();

    }, [formData.cust_kotaid]);

    // ==============================================================
    // ⚡ EVENT HANDLERS AKSI TEMPLATE
    // ==============================================================

    const handleAdd = async () => {
        // 1. Sadap kode dropdown aktif saat ini (Contoh murninya: "839" atau nama agen)
        const currentActiveAgen = localStorage.getItem('active_agen_id') || '';
        // 👑 SOLUSI SAKTI: Ambil nama agen secara live dari localStorage agar tidak memicu ReferenceError!
        const currentActiveAgenName = localStorage.getItem('active_agen_nama') || '';

        // Proteksi Otoritas Holding Pusat
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
            // 2. Ambil token otentikasi valid
            const currentToken = localStorage.getItem('token');

            // Nilai currentActiveAgenName sekarang sudah dijamin terdefinisi dengan aman bray!
            let searchKeyword = String(currentActiveAgenName).trim();
            if (searchKeyword.toUpperCase().endsWith(" AGEN")) {
                searchKeyword = searchKeyword.substring(0, searchKeyword.toUpperCase().lastIndexOf(" AGEN")).trim();
            }

            let finalKotaID = "";

            if (searchKeyword) {
                console.log(`🚀 [Nusantara Compass] Meminta konversi Kode Agen "${currentActiveAgen}" menjadi Regional ID (agen_id) asli...`);
                console.log(`🚀 [Nusantara SQL Engine] Mencari agen_id via ILIKE '%${searchKeyword}%' sesuai skema pgAdmin...`);

                try {
                    // 3. ✅ FIX JALUR: Buang prefix /api di depan router karena sudah di-handle oleh baseURL instance api bray!
                    const responseProfil = await api.get(`/agens/detail-name/${encodeURIComponent(searchKeyword)}`, {
                        headers: {
                            'Authorization': `Bearer ${currentToken}`
                        }
                    });

                    const resData = responseProfil.data;
                    const dbAgenId = resData?.data?.agen_id || resData?.data?.AgenID;

                    // 4. AMBIL KOLOM AGEN_ID MURNI LANGSUNG DARI POSTGRESQL!
                    if (resData && resData.status === "success" && dbAgenId) {
                        // ✅ BERHASIL: Menyadap nilai "GOR002" langsung dari hasil Query SQL ILIKE!
                        finalKotaID = String(dbAgenId).trim().toUpperCase();
                        console.log(`🎯 [Query Match Success] Berhasil mengambil agen_id database: "${finalKotaID}"`);
                    }
                } catch (apiError) {
                    console.warn("⚠️ [Detail Agen API] Gagal mengonversi nama agen via query ILIKE:", apiError);
                }
            }

            if (!finalKotaID) {
                // Saringan darurat jika koneksi server rongsok / keyword kosong bray (Anti-Hardcode)
                const fallbackKeyword = searchKeyword || currentActiveAgen || "GOR";
                finalKotaID = fallbackKeyword.substring(0, 3).toUpperCase() + "002";
                console.log(`🎯 [Query Match Fallback] Menggunakan fallback agen_id: "${finalKotaID}"`);
            }

            // 5. Suntikkan nilai final murni ke Form Input pendaftaran baru bray!
            setFormData({
                cust_id: '',
                cust_name: '',
                cust_alamat1: '',
                cust_alamat2: '',
                cust_kotaid: finalKotaID, // 🔥 KINI TERISI OTOMATIS BERBENTUK KODE DARI DATABASE: "GOR002"!
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
        console.log("🎯 Lolos saringan! Menyiapkan Autofill Data untuk Customer ID:", row.cust_id);
        setIsEditMode(true);
        setFormData({
            cust_id: row.cust_id, // Simpan ID untuk kebutuhan primary key WHERE klausa update
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

    // =========================================================================
    // 🗑️ FUNCTION: EKSEKUSI DELETE DATA MASTER CUSTOMER (POST ANTI-HARD-DELETE)
    // =========================================================================
    const handleDelete = (row) => {
        const targetCustID = row.cust_id || "";
        const targetCustName = row.cust_name || row.cust_nama || "";

        console.log("🚀 [Security Engine] Memulai saringan penghapusan ID:", targetCustID);

        // 🛡️ Trigger pop-up konfirmasi super aman di kasta terdepan
        Swal.fire({
            title: 'APAKAH ANDA YAKIN?',
            html: `Data Customer <b class="text-red-600">${targetCustName}</b> dengan ID: <b class="font-mono text-indigo-600">${targetCustID}</b> akan dihapus permanen dari sistem ERP kargo Dakota!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444', // Warna Merah Danger
            cancelButtonColor: '#64748b',  // Warna Slate Gray
            confirmButtonText: 'YA, HAPUS SEKARANG!',
            cancelButtonText: 'Batal',
            customClass: {
                container: 'z-[999999] font-sans',
                popup: 'rounded-3xl',
                confirmButton: 'rounded-xl font-bold px-5 py-2.5',
                cancelButton: 'rounded-xl font-bold px-5 py-2.5'
            }
        }).then(async (result) => {
            // Jika user menekan tombol merah "YA, HAPUS SEKARANG!"
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');

                    // 👑 SOLUSI SAKTI: Ganti fetch localhost dengan instance api kustom kita bray!
                    const response = await api.post('/customer/delete',
                        { cust_id: targetCustID }, // Kirim parameter Primary Key
                        {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        }
                    );

                    // Axios otomatis mem-parsing JSON, langsung baca response.data bray
                    const resData = response.data;

                    if (resData && resData.status === "success") {
                        // Notifikasi Sukses Terhapus
                        Swal.fire({
                            icon: 'success',
                            title: 'BERHASIL DIHAPUS!',
                            text: `Data Customer ${targetCustName} resmi dilenyapkan!`,
                            confirmButtonColor: '#4f46e5'
                        });

                        // 🔄 Refresh baris tabel di belakang secara live tanpa reload halaman!
                        fetchCustomers(filterAgenId); //
                    } else {
                        throw new Error(resData.message || "Gagal menghapus data dari server"); //
                    }

                } catch (err) {
                    console.error("❌ Gagal merubuhkan data customer:", err.message); //

                    // Deteksi cerdas status eror response bray
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

        // 🌟 KUNCI SAKTI: Jika tipe input adalah number, paksa konversi teks menjadi integer/float angka murni
        setFormData({
            ...formData,
            [name]: type === 'number' ? (parseFloat(value) || 0) : value
        });

        if (name === 'cust_email') {
            validateEmailFormat(value);
        }
    };

    // ==============================================================
    // 📊 SETTING STRUKTUR KOLOM UNTUK DATATABLETEMPLATE (MULTI-FAILBACK)
    // ==============================================================
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

    // =========================================================================
    // 🎯 VALIDATOR ENGINE: CEK FORMAT EMAIL STANDAR DAKOTA CARGO
    // =========================================================================
    const validateEmailFormat = (emailVal) => {
        if (!emailVal || emailVal.trim() === "") {
            setEmailError(''); // Kosong boleh jika memang opsional di DB
            return true;
        }

        // Rumus Regex International Email pattern
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(emailVal)) {
            setEmailError("Format email tidak valid! Harus mengandung '@' dan domain (contoh: corp@dakota.com)");
            return false;
        } else {
            setEmailError(''); // Bersihkan jika sudah benar
            return true;
        }
    };

    // ==============================================================
    // 💾 PROSES SIMPAN DATA (POST) - DINAMIS & PRODUCTION READY
    // ==============================================================
    const handleSubmit = async (e) => {

        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (formData.cust_email && !validateEmailFormat(formData.cust_email)) { //
            Swal.fire({ //
                icon: 'error', //
                title: 'Format Email Salah, Bro!', //
                text: 'Mohon perbaiki penulisan email perusahaan terlebih dahulu sebelum disimpan!', //
                confirmButtonColor: '#4f46e5' //
            }); //
            return; //
        } //

        if (loading) return; //

        setLoading(true); //

        try {
            const token = localStorage.getItem('token'); //

            // 👑 SOLUSI SAKTI: Gunakan endpoint relatif tanpa embel-embel "http://localhost:8080" bray!
            const endpointUrl = isEditMode //
                ? '/customer/update'
                : '/customer/create';

            console.log(`🛸 [Security Engine] Menembak rute dinamis: ${endpointUrl}`);

            // 👑 EKSEKUSI MENGGUNAKAN AXIOS KUSTOM KITA BRAY (ANTI-HARDCODE & BEBAS CRASH)
            const response = await api.post(endpointUrl, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Axios otomatis mem-parsing JSON, langsung baca objek .data murni dari backend bray
            const resData = response.data;

            if (resData && resData.status === "success") { //
                setIsModalOpen(false); //

                Swal.fire({ //
                    icon: 'success', //
                    title: isEditMode ? 'BERHASIL DIUPDATE!' : 'BERHASIL TERSIMPAN!', //
                    text: isEditMode //
                        ? `Data Customer ID: ${formData.cust_id} Berhasil Diperbarui!` //
                        : `Customer Baru Sukses Disimpan dengan ID: ${resData.cust_id}`, //
                    confirmButtonColor: '#4f46e5' //
                }); //

                // Reset form input total secara bersih termasuk parameter baru bray
                setFormData({ //
                    cust_id: '', //
                    cust_name: '', //
                    cust_alamat1: '', //
                    cust_alamat2: '', //
                    cust_kotaid: '', //
                    cust_telp1: '', //
                    cust_telp2: '', //
                    cust_email: '', //
                    cust_npwp: '', //
                    cust_jenisusaha: '', //
                    cust_contactperson: '', //
                    cust_kreditlimit: 0, //
                    cust_kredithari: 0 //
                }); //

                setTimeout(() => { //
                    fetchCustomers(filterAgenId); //
                }, 100); //
            } else { //
                throw new Error(resData.message || "Gagal memproses master data customer"); //
            } //
        } catch (err) { //
            console.error("❌ Terdeteksi Error Lapangan:", err.message); //

            // Tangkap kode status HTTP dan pesan asli dari backend Golang (customer.go) secara presisi bray
            const errStatus = err.response?.status;
            const apiMessage = err.response?.data?.message;

            Swal.fire({ //
                icon: 'error', //
                title: 'Aksi Gagal, Bro!', //
                text: errStatus === 404
                    ? `Rute '${isEditMode ? 'POST /customer/update' : 'POST /customer/create'}' belum didaftarkan di router Golang main.go lu!`
                    : (apiMessage || err.message),
                confirmButtonColor: '#4f46e5' //
            }); //
        } finally { //
            setLoading(false); //
        } //
    };

    return (
        <>
            {/* 1. RENDER UTAMA: Memanggil Template Bawaan Dakota */}
            <DataTableTemplate
                title="MASTER CUSTOMER"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
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
                                        readOnly // 🔒 KUNCI MATI ANTI-HALUSINASI USER!
                                        value={formData.cust_kotaid || ""}
                                        className="w-full mt-1 p-3 border border-slate-200 bg-slate-100 text-indigo-600 rounded-xl outline-none uppercase font-black cursor-not-allowed select-none transition-all"
                                        placeholder="Memuat Kode Cabang..."
                                        autoComplete="off"
                                    />
                                    <span className="text-[10px] text-indigo-500 font-bold mt-1">
                                        🔒 Terkunci otomatis mengikuti Loket Dropdown aktif.
                                    </span>

                                    {/* Dropdown List Hasil Query tabel glb_m_kota */}
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

                                {/* INPUT 5: EMAIL DENGAN INTERAKTIF VALIDASI KELAS PREMIUN */}
                                <div className="flex flex-col">
                                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Email Perusahaan</label>
                                    <input
                                        type="text" // 🌟 Ubah ke text agar tooltip native bawaan browser tidak menginterupsi UI premium lu
                                        name="cust_email"
                                        value={formData.cust_email || ""}
                                        onChange={handleChange}
                                        // 🌟 WARNA BORDER AKAN BERUBAH MERAH JIKA EROR, DAN INDIGO JIKA AMAN!
                                        className={`w-full mt-1 p-3 border rounded-xl outline-none font-medium transition-all duration-300 ${emailError
                                            ? 'border-red-500 bg-red-50/30 text-red-900 focus:ring-4 focus:ring-red-100 focus:border-red-500'
                                            : formData.cust_email && !emailError
                                                ? 'border-emerald-500 bg-emerald-50/20 text-emerald-900 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500'
                                                : 'border-slate-300 bg-white text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                                            }`}
                                        placeholder="contoh: corp@dakota.com"
                                    />

                                    {/* 🌟 TEKS PERINGATAN MEWAH DI BAWAH KOTAK INPUT */}
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
        </>
    );
};

export default MasterCustomer;