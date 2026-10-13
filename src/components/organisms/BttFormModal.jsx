import React, { useState, useEffect } from 'react';
import { X, Save, Package, MapPin, Layers, Calculator, FileText, Search, Loader2, Edit3, Lock, ShieldAlert } from 'lucide-react';
import api from '../../api/axios';
import Swal from 'sweetalert2';

// Helper format YYYY-MM-DD standar waktu lokal
const formatDateToYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const BttFormModal = ({ isOpen, onClose, onSave, isDarkMode, initialData = null, isEditMode = false }) => {
    if (!isOpen) return null;

    // 🌟 Role & Kewenangan User (Admin vs Supervisor)
    const userRole = (localStorage.getItem('role_akses') || sessionStorage.getItem('role_akses') || 'ADMIN').toUpperCase();
    const isSupervisor = userRole === 'SUPERVISOR' || userRole === 'MANAGER' || userRole === 'SUPERADMIN' || userRole === 'S';

    // 🌟 Helper tanggal hari ini dan kemarin (H-1)
    const nowObj = new Date();
    const todayStr = formatDateToYMD(nowObj);

    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayStr = formatDateToYMD(yesterdayObj);

    // 🌟 State Pengontrol Alur BTT & Tarif
    const [tarifRegulerData, setTarifRegulerData] = useState(null);
    const [tarifEkonomisData, setTarifEkonomisData] = useState(null);

    const [emailPenerimaError, setEmailPenerimaError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [isPopUpPackingOpen, setIsPopUpPackingOpen] = useState(false);

    // State Live Search Multi-Field Geografi
    const [geoSuggestions, setGeoSuggestions] = useState([]);
    const [kelurahanSuggestions, setKelurahanSuggestions] = useState([]);
    const [focusedField, setFocusedField] = useState(null);

    // State Autocomplete Pelanggan
    const [keywordCustomer, setKeywordCustomer] = useState('');
    const [rekomendasiCustomer, setRekomendasiCustomer] = useState([]);
    const [isCustomerSelected, setIsCustomerSelected] = useState(false);

    const [errors, setErrors] = useState({});
    const [loadingTarif, setLoadingTarif] = useState(false);

    // Inisialisasi Data Form BTT (Mendukung Create Baru dan Edit)
    const [formData, setFormData] = useState({
        bttt_nobtt: '',
        bttt_tanggal: todayStr,
        bttt_nosuratjalan: '',
        bttt_ket: 'SURAT JALAN KEMBALI',
        bttt_nobttmanual: '',
        bttt_dliexpryn: 'N',
        bttt_promoid: '',

        bttt_asalcustid: '',
        bttt_asalname: 'UMUM',
        bttt_asalalamat: '',
        bttt_asalkota: '',
        bttt_asaltelp: '',
        bttt_asaltelp2: '',
        bttt_asalemail: '',

        bttt_tujuannama: '',
        bttt_up: '',
        bttt_tujuanalamat: '',
        bttt_tujuankota: '',
        bttt_tujuankelurahan: '',
        bttt_tujuankecamatan: '',
        bttt_tujuankodepos: '',
        bttt_tujuanemail: '',
        bttt_tujuantelp: '',
        bttt_tujuantelp2: '',
        bttt_tujuantelp3: '',
        bttt_up_penerima: '',

        bttt_tujuanpropinsi: '',
        bttt_tujuanpulau: '',
        bttt_tujuanagenid: '',
        bttt_kodecabangagen: '',

        bttt_paketyn: 'Y',
        bttt_pilihcarter: '',
        bttt_jenisharga: '0',
        bttt_jeniskiriman: 'BERAT',
        bttt_isikiriman: '',
        bttt_jmlkoli: 1,
        bttt_berat: 1.00,
        bttt_beratvol: 1.00,
        bttt_panjang: 0,
        bttt_lebar: 0,
        bttt_tinggi: 0,
        bttt_ukuran: '',
        bttt_harga: 0, // Biaya Kirim
        bttt_biayapenerus: 0,
        bttt_biayapacking: 0,
        bttt_alasan_override: '',
        original_harga: 0 // Menyimpan harga asli untuk deteksi override
    });

    // Populate Data Jika Masuk Mode Edit
    useEffect(() => {
        if (isEditMode && initialData) {
            setFormData({
                bttt_nobtt: initialData.no_btt || initialData.id || '',
                bttt_tanggal: initialData.tanggal ? formatDateToYMD(new Date(initialData.tanggal)) : todayStr,
                bttt_nosuratjalan: initialData.no_surat_jalan || '',
                bttt_ket: initialData.keterangan || 'SURAT JALAN KEMBALI',
                bttt_nobttmanual: initialData.no_btt_manual || '',
                bttt_dliexpryn: initialData.dli_expr_yn || 'N',
                bttt_promoid: initialData.promo_id || '',

                bttt_asalcustid: initialData.asal_cust_id || initialData.customer_id || '',
                bttt_asalname: initialData.pengirim_nama || initialData.customer_nama || 'UMUM',
                bttt_asalalamat: initialData.pengirim_alamat || '',
                bttt_asalkota: initialData.asal_kota || '',
                bttt_asaltelp: initialData.pengirim_telp || '',
                bttt_asaltelp2: initialData.pengirim_telp2 || '',
                bttt_asalemail: initialData.pengirim_email || '',

                bttt_tujuannama: initialData.penerima_nama || '',
                bttt_up: initialData.up_pengirim || initialData.pengirim_nama || '',
                bttt_tujuanalamat: initialData.penerima_alamat || '',
                bttt_tujuankota: initialData.tujuan_kota || '',
                bttt_tujuankelurahan: initialData.tujuan_kelurahan || '',
                bttt_tujuankecamatan: initialData.tujuan_kecamatan || '',
                bttt_tujuankodepos: initialData.tujuan_kodepos || '',
                bttt_tujuanemail: initialData.penerima_email || '',
                bttt_tujuantelp: initialData.penerima_telp || '',
                bttt_tujuantelp2: initialData.penerima_telp2 || '',
                bttt_tujuantelp3: initialData.penerima_telp3 || '',
                bttt_up_penerima: initialData.up_penerima || '',

                bttt_tujuanpropinsi: initialData.tujuan_propinsi || '',
                bttt_tujuanpulau: initialData.tujuan_pulau || '',
                bttt_tujuanagenid: initialData.tujuan_agen_id || '',
                bttt_kodecabangagen: initialData.kode_cabang_agen || '',

                bttt_paketyn: initialData.paket_yn || 'Y',
                bttt_pilihcarter: initialData.pilih_carter || '',
                bttt_jenisharga: String(initialData.jenis_harga ?? '0'),
                bttt_jeniskiriman: initialData.jenis_kiriman || 'BERAT',
                bttt_isikiriman: initialData.barang || initialData.isi_kiriman || '',
                bttt_jmlkoli: initialData.koli || initialData.jml_koli || 1,
                bttt_berat: initialData.berat || 1.00,
                bttt_beratvol: initialData.berat_vol || 1.00,
                bttt_panjang: initialData.panjang || 0,
                bttt_lebar: initialData.lebar || 0,
                bttt_tinggi: initialData.tinggi || 0,
                bttt_ukuran: initialData.kubikasi || '',
                bttt_harga: initialData.biaya_kirim || initialData.harga || 0,
                bttt_biayapenerus: initialData.biaya_penerus || 0,
                bttt_biayapacking: initialData.biaya_packing || 0,
                bttt_alasan_override: initialData.alasan_override || '',
                original_harga: initialData.biaya_kirim || initialData.harga || 0
            });
            setKeywordCustomer(initialData.pengirim_nama || initialData.customer_nama || '');
            setIsCustomerSelected(true);
        }
    }, [isEditMode, initialData]);

    const isLayananPaket = formData.bttt_pilihcarter === '';
    const minDate = isLayananPaket ? yesterdayStr : todayStr;
    const maxDate = todayStr;

    // Hitung Otomatis Berat Volume
    useEffect(() => {
        const p = parseFloat(formData.bttt_panjang) || 0;
        const l = parseFloat(formData.bttt_lebar) || 0;
        const t = parseFloat(formData.bttt_tinggi) || 0;
        const m3 = parseFloat(formData.bttt_ukuran) || 0;

        if (p > 0 && l > 0 && t > 0) {
            const volFromDimensi = (p * l * t) / 4000;
            const kubikasiFromDimensi = (p * l * t) / 1000000;
            setFormData(prev => ({
                ...prev,
                bttt_beratvol: parseFloat(volFromDimensi.toFixed(2)),
                bttt_ukuran: parseFloat(kubikasiFromDimensi.toFixed(2))
            }));
        } else if (m3 > 0) {
            const volFromM3 = m3 * 250;
            setFormData(prev => ({
                ...prev,
                bttt_beratvol: parseFloat(volFromM3.toFixed(2))
            }));
        }
    }, [formData.bttt_panjang, formData.bttt_lebar, formData.bttt_tinggi, formData.bttt_ukuran]);

    // Live search Pelanggan
    useEffect(() => {
        if (isCustomerSelected) {
            setIsCustomerSelected(false);
            return;
        }

        if (keywordCustomer && keywordCustomer.length >= 1) {
            const token = localStorage.getItem('token');
            const activeAgen = localStorage.getItem('active_agen_id') || '';
            const roleAkses = localStorage.getItem('role_akses') === 'S' ? 'SUPERADMIN' : 'USER';
            const searchUrl = `/btt/search-customer?search=${encodeURIComponent(keywordCustomer)}&agen_id=${encodeURIComponent(activeAgen)}&role_akses=${encodeURIComponent(roleAkses)}`;

            api.get(searchUrl, { headers: { Authorization: `Bearer ${token}` } })
                .then(res => {
                    if (res.data && res.data.status === "success") {
                        setRekomendasiCustomer(res.data.data || []);
                    }
                })
                .catch(err => console.warn("Search Customer Error:", err));
        } else {
            setRekomendasiCustomer([]);
        }
    }, [keywordCustomer]);

    const handlePilihCustomer = (cust) => {
        const idPelanggan = cust.cust_id || cust.id || '';
        const fixName = cust.cust_name || cust.cust_nama || '';

        setIsCustomerSelected(true);
        setKeywordCustomer(fixName);
        setRekomendasiCustomer([]);

        setFormData(prev => ({
            ...prev,
            bttt_asalcustid: String(idPelanggan).trim(),
            bttt_asalname: fixName.toUpperCase(),
            bttt_asalalamat: (cust.cust_alamat1 || cust.CustAlamat1 || '').toUpperCase(),
            bttt_asalkota: (cust.cust_kotaid || cust.CustKotaID || '').toUpperCase(),
            bttt_asaltelp: cust.cust_telp1 || cust.CustTelp1 || '',
            bttt_asaltelp2: cust.cust_telp2 || cust.CustTelp2 || '',
            bttt_asalemail: cust.cust_email || cust.CustEmail || '',
            bttt_up: fixName.toUpperCase()
        }));

        if (formData.bttt_tujuankecamatan) {
            fetchTarifOtomatis(formData.bttt_tujuankecamatan, String(idPelanggan).trim());
        }
    };

    const validateEmailPenerima = (emailVal) => {
        if (!emailVal || emailVal.trim() === "") {
            setEmailPenerimaError('');
            return true;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailVal.trim())) {
            setEmailPenerimaError("Format email tidak valid (contoh: penerima@email.com)");
            return false;
        }
        setEmailPenerimaError('');
        return true;
    };

    const validateEmailPengirim = (emailVal) => {
        if (!emailVal || emailVal.trim() === "") {
            setEmailError('');
            return true;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailVal.trim())) {
            setEmailError("Format email tidak valid (contoh: pengirim@email.com)");
            return false;
        }
        setEmailError('');
        return true;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const kolomsUppercase = ['bttt_asalname', 'bttt_asalalamat', 'bttt_asalkota', 'bttt_up', 'bttt_isikiriman'];
        const kolomsTelepon = ['bttt_asaltelp', 'bttt_asaltelp2', 'bttt_tujuantelp', 'bttt_tujuantelp2', 'bttt_tujuantelp3'];

        let finalValue = type === 'checkbox' ? (checked ? 'Y' : 'N') : value;

        if (kolomsTelepon.includes(name)) {
            finalValue = finalValue.replace(/\D/g, '');
        }

        if (typeof finalValue === 'string' && kolomsUppercase.includes(name)) {
            finalValue = finalValue.toUpperCase();
        }

        setFormData((prev) => ({ ...prev, [name]: finalValue }));

        if (name === 'bttt_tujuanemail') validateEmailPenerima(finalValue);
        if (name === 'bttt_asalemail') validateEmailPengirim(finalValue);
    };

    // Kalkulasi Tarif Otomatis dari Master Tarif
    const fetchTarifOtomatis = async (kecamatanTujuan, custIdOverride) => {
        const kec = kecamatanTujuan || formData.bttt_tujuankecamatan;
        if (!kec) return;

        const activeAgenId = localStorage.getItem('active_agen_id') || formData.bttt_asalagenid || '1';
        const targetCust = custIdOverride || formData.bttt_asalcustid;
        const beratFinal = Math.max(parseFloat(formData.bttt_berat) || 0, parseFloat(formData.bttt_beratvol) || 0, 1);

        setLoadingTarif(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/btt/calculate-tarif', {
                agen_id: String(activeAgenId).trim(),
                asal_kota: String(activeAgenId).trim(),
                cust_id: String(targetCust || '').trim(),
                tujuan_kec: kec.trim(),
                tujuan_kecamatan: kec.trim(),
                berat_asli: beratFinal,
                panjang: parseFloat(formData.bttt_panjang) || 0,
                lebar: parseFloat(formData.bttt_lebar) || 0,
                tinggi: parseFloat(formData.bttt_tinggi) || 0,
                jenis_layanan: formData.bttt_paketyn === 'N' ? 'EKONOMIS' : 'REGULER'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.status === "success") {
                const data = res.data;
                const regRow = data.reguler_row || data.data_reguler || {};
                const ekoRow = data.ekonomis_row || data.data_ekonomis || {};

                setTarifRegulerData(regRow);
                setTarifEkonomisData(ekoRow);

                const finalBiayaKirim = (formData.bttt_paketyn === 'N' ? ekoRow.hargapokok : regRow.hargapokok) || data.grand_total || 0;
                setFormData(prev => ({
                    ...prev,
                    bttt_harga: finalBiayaKirim,
                    original_harga: finalBiayaKirim,
                    bttt_biayapenerus: regRow.biayatambahan || data.biaya_penerus || 0
                }));
            }
        } catch (err) {
            console.error("Gagal hitung tarif:", err);
        } finally {
            setLoadingTarif(false);
        }
    };

    const handleLiveSearchGeo = async (fieldName, value) => {
        setFormData(prev => ({ ...prev, [fieldName]: (value || '').toUpperCase() }));
        setFocusedField(fieldName);

        if (!value || value.trim().length < 1) {
            setGeoSuggestions([]);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/btt/search-geo?q=${encodeURIComponent(value)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data && res.data.status === "success") {
                setGeoSuggestions(Array.isArray(res.data.data) ? res.data.data : []);
            }
        } catch (err) {
            setGeoSuggestions([]);
        }
    };

    const handleSelectGeo = async (item) => {
        setFormData(prev => ({
            ...prev,
            bttt_tujuanpropinsi: item.propinsi || '',
            bttt_tujuankota: item.kabupaten || '',
            bttt_tujuankecamatan: item.kecamatan || '',
            bttt_tujuankelurahan: '',
            bttt_tujuankodepos: '',
            bttt_tujuanagenid: "CABANG " + (item.kabupaten || ''),
            bttt_kodecabangagen: ""
        }));

        setGeoSuggestions([]);
        setFocusedField(null);
        fetchTarifOtomatis(item.kecamatan);

        if (item.kecamatan) {
            try {
                const token = localStorage.getItem('token');
                const res = await api.get(`/btt/get-kelurahan?kecamatan=${encodeURIComponent(item.kecamatan)}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data && res.data.status === "success") {
                    setKelurahanSuggestions(res.data.data);
                }
            } catch (err) {
                console.warn("Gagal memuat sub-kelurahan", err);
            }
        }
    };

    const handleSelectKelurahan = (subItem) => {
        setFormData(prev => ({
            ...prev,
            bttt_tujuankelurahan: subItem.kelurahan,
            bttt_tujuankodepos: subItem.kodepos,
            bttt_kodecabangagen: "DK-" + subItem.kodepos
        }));
        setFocusedField(null);
    };

    const showWarningAlert = (pesan) => {
        Swal.fire({
            icon: 'warning',
            title: 'Data Belum Lengkap',
            text: pesan,
            confirmButtonColor: '#004b84',
            customClass: { container: 'z-[999999]' }
        });
    };

    // Validasi Submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.bttt_up?.trim()) return showWarningAlert('Nama Pengirim / UP wajib diisi!');
        if (!formData.bttt_asalalamat?.trim()) return showWarningAlert('Alamat Pengirim wajib diisi!');
        if (!formData.bttt_asaltelp?.trim()) return showWarningAlert('Nomor Telepon Pengirim wajib diisi!');
        if (!formData.bttt_tujuannama?.trim()) return showWarningAlert('Nama Penerima wajib diisi!');
        if (!formData.bttt_tujuanalamat?.trim()) return showWarningAlert('Alamat Lengkap Penerima wajib diisi!');
        if (!formData.bttt_tujuantelp?.trim()) return showWarningAlert('Nomor Telepon Penerima wajib diisi!');
        if (!formData.bttt_tujuankecamatan?.trim() || !formData.bttt_tujuankelurahan?.trim()) return showWarningAlert('Kecamatan dan Kelurahan tujuan pengiriman wajib dipilih!');
        if (!formData.bttt_isikiriman?.trim()) return showWarningAlert('Isi kiriman barang wajib diisi!');
        if (parseFloat(formData.bttt_harga) <= 0) return showWarningAlert('Biaya kirim tidak boleh 0! Lakukan hitung tarif terlebih dahulu.');

        // 🛑 Wajib isi alasan jika Supervisor melakukan bypass harga manual
        const isBypassed = isSupervisor && parseFloat(formData.bttt_harga) !== parseFloat(formData.original_harga);
        if (isBypassed && !formData.bttt_alasan_override?.trim()) {
            return showWarningAlert('Anda melakukan bypass tarif manual. Silakan isi alasan perubahan tarif!');
        }

        const totalBiayaFinal = parseFloat(formData.bttt_harga) + parseFloat(formData.bttt_biayapenerus || 0) + parseFloat(formData.bttt_biayapacking || 0);

        setLoadingTarif(true);
        try {
            const token = localStorage.getItem('token');
            const endpoint = isEditMode ? '/btt/update' : '/btt/add';
            const payload = {
                no_btt: formData.bttt_nobtt,
                id: formData.bttt_nobtt,
                ...formData,
                total_biaya: totalBiayaFinal,
                bttt_harga: parseFloat(formData.bttt_harga),
                bttt_biayapenerus: parseFloat(formData.bttt_biayapenerus || 0),
                bttt_biayapacking: parseFloat(formData.bttt_biayapacking || 0)
            };

            const res = await api.post(endpoint, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.status === "success") {
                const noBttResmi = res.data.btt_no || formData.bttt_nobtt;
                onClose();

                Swal.fire({
                    title: isEditMode ? 'BTT BERHASIL DIPERBARUI!' : 'SUKSES SIMPAN BTT!',
                    html: `<div class="p-2"><p>Nomor Resi BTT:</p><h2 class="text-2xl font-black text-emerald-600 font-mono mt-1">${noBttResmi}</h2></div>`,
                    icon: 'success',
                    confirmButtonColor: '#004b84',
                    customClass: { container: 'z-[999999]' }
                }).then(() => {
                    if (onSave) onSave(payload);
                });
            }
        } catch (err) {
            Swal.fire({
                title: 'Gagal Menyimpan',
                text: err.response?.data?.message || err.message,
                icon: 'error',
                confirmButtonColor: '#ef4444',
                customClass: { container: 'z-[999999]' }
            });
        } finally {
            setLoadingTarif(false);
        }
    };

    const isPriceOverridden = isSupervisor && parseFloat(formData.bttt_harga) !== parseFloat(formData.original_harga);
    const totalBiayaKeseluruhan = (parseFloat(formData.bttt_harga) || 0) + (parseFloat(formData.bttt_biayapenerus) || 0) + (parseFloat(formData.bttt_biayapacking) || 0);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
            <div className="bg-white w-full max-w-[95vw] xl:max-w-7xl max-h-[96vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">

                {/* 🎯 HEADER */}
                <div className={`px-6 py-3.5 text-white flex items-center justify-between shadow-xs ${isEditMode ? 'bg-amber-600' : 'bg-[#004b84]'}`}>
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{isEditMode ? '✏️' : '+'}</span>
                        <h2 className="text-sm font-black uppercase tracking-wider">
                            {isEditMode ? `EDIT BUKTI TANDA TERIMA (BTT) - ${formData.bttt_nobtt}` : 'ENTRY BUKTI TANDA TERIMA (BTT)'}
                        </h2>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest ${isSupervisor ? 'bg-amber-400 text-slate-900' : 'bg-sky-200 text-sky-900'}`}>
                            LEVEL: {userRole}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-white hover:text-red-200 p-1 rounded-lg text-lg font-bold cursor-pointer">
                        ✕
                    </button>
                </div>

                {/* 🎯 BODY */}
                <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-800">

                    {/* CARD 1: PENGIRIM & PENERIMA */}
                    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">
                        <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-slate-100">
                            <label className="text-[11px] font-bold text-red-600 uppercase">* TANGGAL PENGIRIMAN :</label>
                            <input
                                type="date"
                                name="bttt_tanggal"
                                value={formData.bttt_tanggal}
                                onChange={handleChange}
                                min={minDate}
                                max={maxDate}
                                className="p-1.5 border border-slate-300 rounded-lg font-bold text-sky-800 bg-white outline-none text-xs"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* PENGIRIM */}
                            <div className="space-y-3">
                                <div className="text-center font-bold text-slate-700 text-xs tracking-wider uppercase pb-1 border-b">
                                    INFORMASI PENGIRIM BARANG
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">CUSTOMER :</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-slate-300 rounded-lg font-bold uppercase text-slate-800 bg-white outline-none"
                                            value={keywordCustomer || formData.bttt_asalname}
                                            onChange={(e) => {
                                                setKeywordCustomer(e.target.value);
                                                setFormData(prev => ({ ...prev, bttt_asalname: e.target.value }));
                                            }}
                                            placeholder="Cari Pelanggan..."
                                        />
                                        {Array.isArray(rekomendasiCustomer) && rekomendasiCustomer.length > 0 && (
                                            <div className="absolute top-[58px] left-0 w-full bg-white border border-sky-400 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto text-xs">
                                                {rekomendasiCustomer.map((cust, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="p-2 hover:bg-sky-50 cursor-pointer border-b font-bold text-slate-800"
                                                        onClick={() => handlePilihCustomer(cust)}
                                                    >
                                                        🏢 {cust.cust_name} <span className="text-red-600 font-mono">[{cust.cust_id}]</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">CUST ID :</label>
                                        <input
                                            type="text"
                                            readOnly
                                            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-red-600 cursor-not-allowed outline-none"
                                            value={formData.bttt_asalcustid}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">NAMA PENGIRIM / UP :</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-slate-300 rounded-lg font-bold uppercase text-slate-800"
                                        value={formData.bttt_up || ""}
                                        onChange={(e) => setFormData(prev => ({ ...prev, bttt_up: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">ALAMAT PENGIRIM :</label>
                                    <textarea
                                        name="bttt_asalalamat"
                                        value={formData.bttt_asalalamat || ""}
                                        onChange={handleChange}
                                        className="w-full p-2 border border-slate-300 rounded-lg uppercase text-xs"
                                        rows="2"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">KOTA ASAL :</label>
                                        <input type="text" name="bttt_asalkota" value={formData.bttt_asalkota || ""} onChange={handleChange} className="w-full p-2 border rounded-lg font-bold uppercase" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">TELEPON PENGIRIM :</label>
                                        <input type="text" name="bttt_asaltelp" value={formData.bttt_asaltelp || ""} onChange={handleChange} className="w-full p-2 border rounded-lg font-semibold" placeholder="08xxxxxxxxxx" />
                                    </div>
                                </div>
                            </div>

                            {/* PENERIMA */}
                            <div className="space-y-3">
                                <div className="text-center font-bold text-slate-700 text-xs tracking-wider uppercase pb-1 border-b">
                                    INFORMASI PENERIMA BARANG
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">PENERIMA :</label>
                                        <input type="text" name="bttt_tujuannama" value={formData.bttt_tujuannama} onChange={handleChange} className="w-full p-2 border rounded-lg font-bold uppercase" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">UP / NAMA :</label>
                                        <input type="text" name="bttt_up_penerima" value={formData.bttt_up_penerima} onChange={handleChange} className="w-full p-2 border rounded-lg font-bold uppercase" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">* ALAMAT LENGKAP PENERIMA :</label>
                                    <textarea name="bttt_tujuanalamat" value={formData.bttt_tujuanalamat || ""} onChange={handleChange} className="w-full p-2 border rounded-lg uppercase text-xs" rows="2" />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">TELEPON 1 :</label>
                                        <input type="text" name="bttt_tujuantelp" value={formData.bttt_tujuantelp || ''} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="08xxxxxxxxxx" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">EMAIL PENERIMA :</label>
                                        <input type="email" name="bttt_tujuanemail" value={formData.bttt_tujuanemail || ''} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="penerima@email.com" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CARD 2: TUJUAN AREA */}
                    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">
                        <div className="text-center font-bold text-[#004b84] text-xs uppercase pb-1 border-b">
                            INFORMASI TUJUAN AREA KIRIM
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                            <div className="relative">
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">KECAMATAN :</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-slate-300 rounded-lg font-bold uppercase"
                                    placeholder="Ketik kecamatan..."
                                    value={formData.bttt_tujuankecamatan || ''}
                                    onChange={(e) => handleLiveSearchGeo('bttt_tujuankecamatan', e.target.value)}
                                    onFocus={() => setFocusedField('bttt_tujuankecamatan')}
                                />
                                {focusedField === 'bttt_tujuankecamatan' && Array.isArray(geoSuggestions) && geoSuggestions.length > 0 && (
                                    <div className="absolute left-0 right-0 top-[60px] bg-white border border-teal-400 rounded-xl shadow-2xl z-[99999] max-h-48 overflow-y-auto text-xs">
                                        {geoSuggestions.map((item, idx) => (
                                            <div key={idx} onClick={() => handleSelectGeo(item)} className="p-2.5 hover:bg-teal-50 cursor-pointer border-b font-bold">
                                                📍 {item.kecamatan} - <span className="text-gray-500 font-normal">{item.kabupaten}, {item.propinsi}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">PROVINSI :</label>
                                <input type="text" readOnly className="w-full p-2 bg-slate-50 border rounded-lg font-bold text-slate-700" value={formData.bttt_tujuanpropinsi || ''} />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">KOTA / KABUPATEN :</label>
                                <input type="text" readOnly className="w-full p-2 bg-slate-50 border rounded-lg font-bold text-slate-700" value={formData.bttt_tujuankota || ''} />
                            </div>

                            <div className="relative">
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">KELURAHAN :</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-slate-300 rounded-lg font-bold uppercase"
                                    value={formData.bttt_tujuankelurahan || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, bttt_tujuankelurahan: e.target.value.toUpperCase() }))}
                                    onFocus={() => setFocusedField('bttt_tujuankelurahan')}
                                />
                                {focusedField === 'bttt_tujuankelurahan' && Array.isArray(kelurahanSuggestions) && kelurahanSuggestions.length > 0 && (
                                    <div className="absolute left-0 right-0 top-[58px] bg-white border border-sky-400 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto text-xs">
                                        {kelurahanSuggestions.map((sub, idx) => (
                                            <div key={idx} onClick={() => handleSelectKelurahan(sub)} className="p-2 hover:bg-sky-50 cursor-pointer border-b font-bold">
                                                🏘️ {sub.kelurahan} - [{sub.kodepos}]
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* CARD 3: INFORMASI KIRIMAN */}
                    <div className="bg-white border rounded-lg p-4 shadow-sm mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">ISI KIRIMAN : <span className="text-red-500">*</span></label>
                                <input type="text" required value={formData.bttt_isikiriman || ""} onChange={(e) => setFormData(prev => ({ ...prev, bttt_isikiriman: e.target.value }))} className="w-full px-3 py-1.5 border rounded-md" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">NO. SURAT JALAN :</label>
                                <input type="text" value={formData.bttt_nosuratjalan || ""} onChange={(e) => setFormData(prev => ({ ...prev, bttt_nosuratjalan: e.target.value }))} className="w-full px-3 py-1.5 border rounded-md" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">KETERANGAN :</label>
                                <input type="text" value={formData.bttt_ket || ""} onChange={(e) => setFormData(prev => ({ ...prev, bttt_ket: e.target.value }))} className="w-full px-3 py-1.5 border rounded-md" />
                            </div>
                        </div>
                    </div>

                    {/* CARD 4: TABEL INFORMASI TARIF DASAR */}
                    <div className="relative p-5 bg-white border border-emerald-400 rounded-xl shadow-2xs space-y-4">
                        <div className="flex items-center justify-between pb-1 border-b">
                            <div className="font-bold text-emerald-700 text-xs uppercase">
                                INFORMASI TARIF DASAR (RUTE: {formData.bttt_asalkota || 'PUSAT'} ➡ {formData.bttt_tujuankecamatan || '-'})
                            </div>
                            {loadingTarif && (
                                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-700 text-[10px] font-bold">
                                    <Loader2 size={12} className="animate-spin text-amber-600" />
                                    <span>MENGHITUNG TARIF...</span>
                                </div>
                            )}
                        </div>

                        {/* Rincian Reguler */}
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead className="bg-[#004b84] text-white text-[11px] font-bold uppercase">
                                    <tr>
                                        <th className="p-2 text-center w-12">PILIH</th>
                                        <th className="p-2 text-center w-14">LT</th>
                                        <th className="p-2 text-right">DASAR</th>
                                        <th className="p-2 text-center">KG MIN</th>
                                        <th className="p-2 text-center">KG NEXT</th>
                                        <th className="p-2 text-right">HARGA PENERUS</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs font-semibold text-slate-800">
                                    <tr>
                                        <td className="p-2 text-center">
                                            <input type="radio" checked={formData.bttt_paketyn === 'Y'} onChange={() => setFormData(prev => ({ ...prev, bttt_paketyn: 'Y', bttt_harga: tarifRegulerData?.hargapokok || prev.bttt_harga }))} />
                                        </td>
                                        <td className="p-2 text-center">{tarifRegulerData?.estimasihari || '-'}</td>
                                        <td className="p-2 text-right">Rp {(Number(tarifRegulerData?.hargapokok) || 0).toLocaleString('id-ID')}</td>
                                        <td className="p-2 text-center">{tarifRegulerData?.minimalkg || 0}</td>
                                        <td className="p-2 text-center">Rp {(Number(tarifRegulerData?.hargakgselanjutnya) || 0).toLocaleString('id-ID')}</td>
                                        <td className="p-2 text-right text-orange-600 font-bold">Rp {(Number(tarifRegulerData?.biayatambahan) || 0).toLocaleString('id-ID')}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* CARD 5: INFORMASI PEMBAYARAN & PACKING (DENGAN PROTEKSI LEVEL SUPERVISOR) */}
                    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                            <div className="font-bold text-[#004b84] text-xs uppercase">
                                INFORMASI PEMBAYARAN & PACKING
                            </div>
                            {!isSupervisor ? (
                                <span className="flex items-center gap-1 text-[11px] text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                    <Lock size={13} className="text-slate-400" /> Biaya Terkunci (Level Admin)
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-[11px] text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300">
                                    <ShieldAlert size={13} className="text-amber-600" /> Mode Supervisor (Bypass Tarif Aktif)
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">METODE PEMBAYARAN :</label>
                                <select
                                    value={formData.bttt_jenisharga}
                                    onChange={(e) => setFormData(prev => ({ ...prev, bttt_jenisharga: e.target.value }))}
                                    className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white"
                                >
                                    <option value="0">TUNAI (CASH)</option>
                                    <option value="2">KREDIT (TEMPO)</option>
                                    <option value="1">TAGIH TUJUAN (COD)</option>
                                </select>
                            </div>

                            {/* FIELD BIAYA KIRIM (ADMIN = READONLY, SUPERVISOR = EDITABLE) */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                                    BIAYA KIRIM : {isSupervisor && <span className="text-amber-600 font-bold">*Bypass</span>}
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        readOnly={!isSupervisor}
                                        value={formData.bttt_harga || 0}
                                        onChange={(e) => setFormData(prev => ({ ...prev, bttt_harga: parseFloat(e.target.value) || 0 }))}
                                        className={`w-full p-2 border rounded-lg font-mono font-bold text-right outline-none ${isSupervisor
                                            ? 'bg-amber-50 border-amber-400 text-slate-900 focus:ring-2 focus:ring-amber-200'
                                            : 'bg-slate-100 border-slate-300 text-slate-600 cursor-not-allowed'
                                            }`}
                                    />
                                    {!isSupervisor && <Lock size={12} className="absolute left-2.5 top-3 text-slate-400" />}
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">BIAYA PENERUS / LAIN :</label>
                                <input
                                    type="number"
                                    name="bttt_biayapenerus"
                                    readOnly={!isSupervisor}
                                    value={formData.bttt_biayapenerus || 0}
                                    onChange={handleChange}
                                    className={`w-full p-2 border rounded-lg font-bold text-right ${isSupervisor ? 'bg-white' : 'bg-slate-100 cursor-not-allowed'}`}
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">BIAYA PACKING :</label>
                                <div className="flex gap-1.5">
                                    <input
                                        type="number"
                                        name="bttt_biayapacking"
                                        readOnly={!isSupervisor}
                                        value={formData.bttt_biayapacking || 0}
                                        onChange={handleChange}
                                        className={`w-full p-2 border rounded-lg font-bold text-right ${isSupervisor ? 'bg-white' : 'bg-slate-100 cursor-not-allowed'}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsPopUpPackingOpen(true)}
                                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border rounded-lg font-bold text-[10px] uppercase"
                                    >
                                        PILIH
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* INPUT ALASAN OVERRIDE JIKA SUPERVISOR MENGUBAH HARGA MANUAL */}
                        {isPriceOverridden && (
                            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-1 animate-in fade-in">
                                <label className="block text-[11px] font-bold text-amber-900 uppercase">
                                    ALASAN PERUBAHAN / BYPASS TARIF * :
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Diskon muatan volume atas persetujuan Kacab / Kontrak Ad-Hoc"
                                    value={formData.bttt_alasan_override || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, bttt_alasan_override: e.target.value }))}
                                    className="w-full p-2 border border-amber-400 rounded-lg bg-white font-medium text-xs text-slate-800 outline-none"
                                />
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t">
                            <div>
                                <span className="text-[11px] font-bold text-slate-500 uppercase block">TOTAL BIAYA KESELURUHAN :</span>
                                <span className="text-xl font-black text-emerald-600 font-mono">
                                    Rp {totalBiayaKeseluruhan.toLocaleString('id-ID')}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => fetchTarifOtomatis()}
                                disabled={loadingTarif}
                                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase text-xs flex items-center gap-1.5 shadow-sm transition"
                            >
                                <Calculator size={14} />
                                {loadingTarif ? 'MENGHITUNG...' : 'HITUNG TARIF OTOMATIS'}
                            </button>
                        </div>
                    </div>

                </div>

                {/* 🎯 FOOTER TOMBOL AKSI */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-200 font-bold rounded-xl uppercase text-xs transition"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loadingTarif}
                        className={`px-6 py-2 rounded-xl uppercase text-xs shadow-xs transition flex items-center gap-2 font-bold ${isEditMode
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : 'bg-[#004b84] hover:bg-[#003863] text-white'
                            }`}
                    >
                        {isEditMode ? <Save size={15} /> : <FileText size={15} />}
                        {isEditMode ? 'Simpan Perubahan BTT' : 'Cetak Bukti Terima'}
                    </button>
                </div>
            </div>

            <OrderPackingModal
                isOpen={isPopUpPackingOpen}
                onClose={() => setIsPopUpPackingOpen(false)}
                parentData={formData}
                isDarkMode={isDarkMode}
                onSavePacking={(namaPacking, hargaPacking) => {
                    setFormData(prev => ({
                        ...prev,
                        bttt_promoid: "PCK-" + namaPacking.toUpperCase(),
                        bttt_biayapacking: hargaPacking
                    }));
                }}
            />
        </div>
    );
};

export default BttFormModal;


// =========================================================================
// 📦 SUB-MODAL COMPONENT: ORDER PACKING
// =========================================================================
const OrderPackingModal = ({ isOpen, onClose, parentData, onSavePacking }) => {
    if (!isOpen) return null;

    const [jenisPacking, setJenisPacking] = useState('Kayu');
    const [biayaPacking, setBiayaPacking] = useState(0);

    const handleSimpanPacking = () => {
        const nominal = parseFloat(biayaPacking) || 0;
        if (nominal < 0) {
            Swal.fire({ icon: 'warning', title: 'Info Bro', text: 'Biaya packing minimal adalah 0!' });
            return;
        }
        onSavePacking(jenisPacking, nominal);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-5xl rounded-[32px] shadow-2xl flex flex-col overflow-hidden bg-white text-slate-800 border border-gray-200">
                <div className="p-6 bg-indigo-600 text-white flex items-center justify-between">
                    <h3 className="text-lg font-black tracking-wider uppercase flex items-center gap-2">
                        📦 FORM RINCIAN ORDER PACKING BARANG
                    </h3>
                    <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors font-bold text-xl outline-none">✕</button>
                </div>

                <div className="p-8 overflow-y-auto space-y-6 max-h-[80vh] text-xs bg-white">
                    <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
                        <label className="font-black text-slate-600 uppercase tracking-wider">TANGGAL PACKING :</label>
                        <input
                            type="text"
                            readOnly
                            className="w-full md:w-1/4 mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold cursor-not-allowed outline-none text-indigo-600"
                            value={parentData.bttt_tanggal}
                        />
                    </div>

                    <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-4">
                        <div className="text-center font-black text-cyan-600 text-sm tracking-widest uppercase border-b border-gray-100 pb-2">
                            INFORMASI PELANGGAN
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="font-bold text-slate-500 uppercase">PELANGGAN :</label>
                                <input type="text" readOnly className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-600 font-bold uppercase cursor-not-allowed outline-none" value={parentData.bttt_asalname} />
                            </div>
                            <div>
                                <label className="font-bold text-slate-500 uppercase">CUST ID :</label>
                                <input type="text" readOnly className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-600 font-mono font-bold cursor-not-allowed outline-none" value={parentData.bttt_asalcustid} />
                            </div>
                            <div>
                                <label className="font-bold text-slate-500 uppercase">NAMA PELANGGAN :</label>
                                <input type="text" readOnly className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-600 font-bold uppercase cursor-not-allowed outline-none" value={parentData.bttt_asalname} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                                <label className="font-bold text-slate-500 uppercase">ALAMAT :</label>
                                <input type="text" readOnly className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-600 cursor-not-allowed outline-none" value={parentData.bttt_asalalamat} />
                            </div>
                            <div>
                                <label className="font-bold text-slate-500 uppercase">TELEPON :</label>
                                <input type="text" readOnly className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-600 cursor-not-allowed outline-none" value={parentData.bttt_asaltelp} />
                            </div>
                            <div>
                                <label className="font-bold text-slate-500 uppercase">KOTA :</label>
                                <input type="text" readOnly className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-600 font-bold cursor-not-allowed outline-none" value={parentData.bttt_asalkota} />
                            </div>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-4">
                        <div className="text-center font-black text-cyan-600 text-sm tracking-widest uppercase border-b border-gray-100 pb-2">
                            INFORMASI BARANG
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="font-bold text-slate-600 uppercase">ISI KIRIMAN :</label>
                                <input type="text" readOnly className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-600 cursor-not-allowed outline-none font-bold uppercase" value={parentData.bttt_isikiriman} />
                            </div>
                            <div>
                                <label className="font-black text-indigo-600 uppercase">JENIS PACKING :</label>
                                <select
                                    value={jenisPacking}
                                    onChange={(e) => setJenisPacking(e.target.value)}
                                    className="w-full mt-1.5 p-3 bg-white border-2 border-indigo-400 rounded-xl text-indigo-600 font-black outline-none shadow-md focus:ring-4 focus:ring-indigo-100"
                                >
                                    <option value="Kayu">1. Kayu</option>
                                    <option value="Kardus">2. Kardus</option>
                                    <option value="Carton">3. Carton</option>
                                </select>
                            </div>
                        </div>

                        <div className="text-center font-bold text-slate-400 py-1 border-t border-dashed border-gray-100 mt-2">
                            Kondisi barang sebelum di packing
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="font-bold text-slate-500 uppercase">JUMLAH KOLI :</label>
                                <input type="text" readOnly className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-600 font-black text-center cursor-not-allowed outline-none" value={parentData.bttt_jmlkoli} />
                            </div>
                            <div>
                                <label className="font-bold text-slate-500 uppercase">BERAT :</label>
                                <input type="text" readOnly className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-600 font-black text-center cursor-not-allowed outline-none" value={parentData.bttt_berat} />
                            </div>
                            <div>
                                <label className="font-bold text-slate-500 uppercase">VOLUME :</label>
                                <input type="text" readOnly className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-600 font-black text-center cursor-not-allowed outline-none" value={parentData.bttt_beratvol} />
                            </div>
                            <div>
                                <label className="font-bold text-slate-500 uppercase">KUBIKASI :</label>
                                <input type="text" readOnly className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-600 font-black text-center cursor-not-allowed outline-none" value={parentData.bttt_ukuran || 0} />
                            </div>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-3">
                        <div className="text-center font-black text-cyan-600 text-sm tracking-widest uppercase border-b border-gray-100 pb-2">
                            INFORMASI PEMBAYARAN ORDER PACKING
                        </div>
                        <div>
                            <label className="font-black text-indigo-600 uppercase">BIAYA ORDER PACKING BARANG :</label>
                            <input
                                type="number"
                                min="0"
                                value={biayaPacking}
                                onChange={(e) => setBiayaPacking(e.target.value)}
                                className="w-full mt-2 p-3.5 border-2 border-indigo-400 bg-white text-slate-900 rounded-xl font-black text-base outline-none focus:ring-4 focus:ring-indigo-50"
                                placeholder="Biaya packing barang"
                            />
                        </div>
                    </div>

                    <div className="flex justify-center pt-2">
                        <button
                            type="button"
                            onClick={handleSimpanPacking}
                            className="w-48 h-12 bg-amber-500 hover:bg-amber-600 text-white font-black text-sm rounded-xl shadow-lg hover:shadow-xl uppercase tracking-wider transition-all transform active:scale-95"
                        >
                            SIMPAN DATA
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};