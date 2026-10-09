import React, { useState, useEffect } from 'react';
import { X, Save, Package, MapPin, Layers, Calculator, FileText, Search, Loader2 } from 'lucide-react';
import api from '../../api/axios';
import Swal from 'sweetalert2';

// Helper format YYYY-MM-DD standar waktu lokal
const formatDateToYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const BttFormModal = ({ isOpen, onClose, onSave, isDarkMode }) => {
    if (!isOpen) return null;

    // 🌟 Helper tanggal hari ini dan kemarin (H-1)
    const nowObj = new Date();
    const todayStr = formatDateToYMD(nowObj);

    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayStr = formatDateToYMD(yesterdayObj);

    // 🌟 State Pengontrol Alur BTT & Tarif
    const [generatedBttNum, setGeneratedBttNum] = useState('');
    const [tarifRegulerData, setTarifRegulerData] = useState(null);
    const [tarifEkonomisData, setTarifEkonomisData] = useState(null);

    const [emailPenerimaError, setEmailPenerimaError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [isPopUpPackingOpen, setIsPopUpPackingOpen] = useState(false);

    // 🚀 State Live Search Multi-Field Geografi
    const [geoSuggestions, setGeoSuggestions] = useState([]);
    const [kelurahanSuggestions, setKelurahanSuggestions] = useState([]);
    const [focusedField, setFocusedField] = useState(null);

    // 📦 State Autocomplete Pelanggan & Agen
    const [keywordCustomer, setKeywordCustomer] = useState('');
    const [rekomendasiCustomer, setRekomendasiCustomer] = useState([]);
    const [isCustomerSelected, setIsCustomerSelected] = useState(false);

    const [keywordKecamatan, setKeywordKecamatan] = useState('');
    const [rekomendasiArea, setRekomendasiArea] = useState([]);
    const [isKecamatanSelected, setIsKecamatanSelected] = useState(false);

    const [errors, setErrors] = useState({});
    const [loadingTarif, setLoadingTarif] = useState(false);

    // Inisialisasi Data Form BTT
    const [formData, setFormData] = useState({
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
        bttt_up_pengirim: '',

        bttt_tujuanpropinsi: '',
        bttt_tujuanpulau: '',
        bttt_tujuanagenid: '',
        bttt_kodecabangagen: '',

        bttt_paketyn: 'Y',
        bttt_pilihcarter: '', // '' = PAKET, bila ada isi (misal 'BUILD UP') = CARTER
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
        bttt_harga: 0,
        bttt_biayapenerus: 0,
        bttt_biayapacking: 0
    });

    // 🎯 ATURAN TANGGAL PENGIRIMAN:
    // Jika PAKET (bttt_pilihcarter kosong): minDate = kemarin (H-1)
    // Jika CARTER (bttt_pilihcarter terisi): minDate = hari ini (H)
    const isLayananPaket = formData.bttt_pilihcarter === '';
    const minDate = isLayananPaket ? yesterdayStr : todayStr;
    const maxDate = todayStr; // Terkunci tidak bisa memilih tanggal esok / masa depan

    // Proteksi: Jika user beralih ke CARTER saat tanggal masih terpasang kemarin, otomatis reset ke hari ini
    useEffect(() => {
        if (!isLayananPaket && formData.bttt_tanggal < todayStr) {
            setFormData(prev => ({ ...prev, bttt_tanggal: todayStr }));
        }
    }, [isLayananPaket]);

    // Auto generate ID Pelanggan awal
    const pemicuGenerateID = () => {
        const token = localStorage.getItem('token');
        const kodeAgenAktif = localStorage.getItem('active_agen_id') || '';

        api.get(`/btt/generate-custid?kode_agen=${kodeAgenAktif}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (res.data && res.data.status === "success") {
                    setFormData(prev => ({ ...prev, bttt_asalcustid: res.data.generated_id || res.data.cust_id }));
                }
            })
            .catch(err => console.warn("Gagal auto-generate ID awal", err.message));
    };

    useEffect(() => {
        pemicuGenerateID();
    }, []);

    // Sinkronisasi Sesi Agen Pengirim Aktif
    useEffect(() => {
        if (isOpen) {
            const sessionAgenId = localStorage.getItem('active_agen_id') || sessionStorage.getItem('active_agen_id') || '1';
            const sessionAgenNama = localStorage.getItem('active_agen_nama') || sessionStorage.getItem('active_agen_nama') || 'DENPASAR DLI AGEN';

            setFormData(prev => ({
                ...prev,
                bttt_asalagenid: sessionAgenId,
                bttt_asalkota: sessionAgenNama,
                bttt_tanggal: prev.bttt_tanggal || todayStr
            }));
        }
    }, [isOpen]);

    // Live search Pelanggan
    useEffect(() => {
        const namaPelanggan = keywordCustomer.trim();

        if (isCustomerSelected) {
            setIsCustomerSelected(false);
            return;
        }

        // 🛑 HANYA generate ID otomatis jika form memang sedang dalam mode UMUM murni dan belum punya ID
        if ((namaPelanggan === "" || namaPelanggan.toUpperCase() === "UMUM") && formData.bttt_asalname === 'UMUM' && !formData.bttt_asalcustid) {
            const token = localStorage.getItem('token');
            const kodeAgenAktif = localStorage.getItem('active_agen_id') || 'JKT';

            api.get(`/btt/generate-custid?kode_agen=${kodeAgenAktif}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => {
                    if (res.data && res.data.status === "success") {
                        const idOtomatis = res.data.generated_id || res.data.cust_id || '';
                        setFormData(prev => ({
                            ...prev,
                            bttt_asalname: 'UMUM',
                            bttt_asalcustid: idOtomatis
                        }));
                    }
                })
                .catch(err => console.warn("Gagal inisialisasi default retail ID:", err));
        }

        if (keywordCustomer && keywordCustomer.length >= 1) {
            const token = localStorage.getItem('token');
            const activeAgen = localStorage.getItem('active_agen_id') || '';
            const roleAkses = localStorage.getItem('role_akses') === 'S' ? 'SUPERADMIN' : 'USER';
            const searchUrl = `/btt/search-customer?search=${encodeURIComponent(keywordCustomer)}&agen_id=${encodeURIComponent(activeAgen)}&role_akses=${encodeURIComponent(roleAkses)}`;

            api.get(searchUrl, {
                headers: { Authorization: `Bearer ${token}` }
            })
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

    // Hitung otomatis Berat Volume (bisa dari PxLxT atau langsung dari Kubikasi M3)
    useEffect(() => {
        const p = parseFloat(formData.bttt_panjang) || 0;
        const l = parseFloat(formData.bttt_lebar) || 0;
        const t = parseFloat(formData.bttt_tinggi) || 0;
        const m3 = parseFloat(formData.bttt_ukuran) || 0;

        if (p > 0 && l > 0 && t > 0) {
            // Hitung dari dimensi P x L x T (cm)
            const volFromDimensi = (p * l * t) / 4000;
            const kubikasiFromDimensi = (p * l * t) / 1000000;
            setFormData(prev => ({
                ...prev,
                bttt_beratvol: parseFloat(volFromDimensi.toFixed(2)),
                bttt_ukuran: parseFloat(kubikasiFromDimensi.toFixed(2))
            }));
        } else if (m3 > 0) {
            // Hitung dari Kubikasi M3 (1 M3 = 250 Kg Darat Reguler)
            const volFromM3 = m3 * 250;
            setFormData(prev => ({
                ...prev,
                bttt_beratvol: parseFloat(volFromM3.toFixed(2))
            }));
        }
    }, [formData.bttt_panjang, formData.bttt_lebar, formData.bttt_tinggi, formData.bttt_ukuran]);

    const handlePilihCustomer = (cust) => {
        const idPelanggan = cust.cust_id || cust.id || cust.kode_customer || '';
        const namaPelanggan = cust.cust_nama || cust.nama || '';

        setIsCustomerSelected(true);
        setKeywordCustomer(namaPelanggan);
        setRekomendasiCustomer([]);

        setFormData(prev => ({
            ...prev,
            bttt_asalcustid: String(idPelanggan).trim(), // '001000021'
            bttt_asalname: namaPelanggan,
            bttt_asalalamat: cust.cust_alamat || '',
            bttt_asalkota: cust.cust_kota || '',
            bttt_asaltelp: cust.cust_telp || ''
        }));

        if (formData.bttt_tujuankecamatan) {
            fetchTarifOtomatis(formData.bttt_tujuankecamatan);
        }
    };

    const validateEmailPenerima = (emailVal) => {
        if (!emailVal || emailVal.trim() === "") {
            setEmailPenerimaError('');
            return true;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailVal.trim())) {
            setEmailPenerimaError("Format email salah! Harus mengandung '@' dan nama domain (contoh: penerima@email.com)");
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
            setEmailError("Format email salah! Harus mengandung '@' dan nama domain (contoh: pengirim@email.com)");
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

        // 🔒 1. Validasi Telepon: Hapus huruf & simbol, hanya izinkan angka 0-9
        if (kolomsTelepon.includes(name)) {
            finalValue = finalValue.replace(/\D/g, ''); // \D = buang semua karakter non-angka
        }

        // 🔠 2. Auto Uppercase untuk kolom tertentu
        if (typeof finalValue === 'string' && kolomsUppercase.includes(name)) {
            finalValue = finalValue.toUpperCase();
        }

        setFormData((prev) => ({ ...prev, [name]: finalValue }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }

        // ✉️ 3. Validasi Email Realtime
        if (name === 'bttt_tujuanemail') {
            validateEmailPenerima(finalValue);
        }
        if (name === 'bttt_asalemail') {
            validateEmailPengirim(finalValue);
        }
    };

    const handleHitungTarif = async () => {
        if (!formData.bttt_asalagenid || !formData.bttt_tujuankecamatan) {
            Swal.fire({
                title: 'INFO BRO',
                text: 'Pilih Kecamatan Tujuan terlebih dahulu sebelum melakukan kalkulasi tarif kargo!',
                icon: 'warning',
                confirmButtonColor: '#4f46e5',
                customClass: { container: 'z-[999999] font-sans' }
            });
            return;
        }

        setLoadingTarif(true);
        try {
            const token = localStorage.getItem('token');
            const response = await api.post('/btt/calculate-tarif', {
                asal_kota: String(formData.bttt_asalagenid || "").trim(),
                tujuan_kecamatan: formData.bttt_tujuankecamatan,
                tujuan_kec: formData.bttt_tujuankecamatan,
                agen_id: String(formData.bttt_asalagenid || "").trim(),
                cust_id: String(formData.bttt_asalcustid || "").trim(),
                berat_asli: Math.max(parseFloat(formData.bttt_berat) || 0, parseFloat(formData.bttt_beratvol) || 0, 1),
                panjang: parseFloat(formData.bttt_panjang) || 0,
                lebar: parseFloat(formData.bttt_lebar) || 0,
                tinggi: parseFloat(formData.bttt_tinggi) || 0,
                jenis_layanan: formData.bttt_paketyn === 'Y' ? 'REGULER' : 'EKONOMIS'
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = response.data;
            if (response.status === 200) {
                const hargaFinal = data.grand_total || 0;
                setTarifRegulerData(data.reguler_row || null);
                setTarifEkonomisData(data.ekonomis_row || null);

                setFormData(prev => ({
                    ...prev,
                    bttt_harga: hargaFinal,
                    bttt_status_hitung: data.status_hitung || "TERHITUNG OTOMATIS",
                    reguler_lt: data.reguler_row?.estimasihari || data.reguler_row?.estimasi_hari || 0,
                    ekonomis_lt: data.ekonomis_row?.estimasihari || data.ekonomis_row?.estimasi_hari || 0
                }));

                Swal.fire({
                    title: 'TARIF BERHASIL DIHITUNG!',
                    html: `Total Biaya: <b class="text-xl text-indigo-600">Rp ${hargaFinal.toLocaleString('id-ID')}</b>`,
                    icon: 'success',
                    confirmButtonColor: '#4f46e5',
                    customClass: { container: 'z-[999999] font-sans' }
                });
            } else {
                Swal.fire({
                    title: 'Gagal Hitung',
                    text: data.error || 'Rute belum terdaftar di database kargo Dakota!',
                    icon: 'error',
                    confirmButtonColor: '#4f46e5',
                    customClass: { container: 'z-[999999] font-sans' }
                });
            }
        } catch (err) {
            Swal.fire({
                title: 'Gagal Hitung',
                text: err.response?.data?.error || 'Terjadi kesalahan jaringan atau rute tidak terdaftar, bro...',
                icon: 'error',
                confirmButtonColor: '#4f46e5',
                customClass: { container: 'z-[999999] font-sans' }
            });
        } finally {
            setLoadingTarif(false);
        }
    };

    const fetchTarifRute = async (agenIdRaw, tujuanKecamatan, overrideCustId) => {
        if (!tujuanKecamatan) return;

        try {
            const token = localStorage.getItem('token');
            const cleanAgenID = String(agenIdRaw || formData.bttt_asalagenid || "").trim();
            // Ambil cust_id dari override (jika baru dipilih) atau dari state formData
            const customerId = String(overrideCustId !== undefined ? overrideCustId : (formData.bttt_asalcustid || "")).trim();

            const response = await api.post('/btt/calculate-tarif', {
                asal_kota: cleanAgenID,
                tujuan_kecamatan: tujuanKecamatan,
                tujuan_kec: tujuanKecamatan,
                agen_id: cleanAgenID,
                cust_id: customerId, // 👈 WAJIB DITAMBAHKAN AGAR MERCK TERBACA
                berat_asli: parseFloat(formData.bttt_berat) || 1,
                jenis_layanan: formData.bttt_paketyn === 'Y' ? 'REGULER' : 'EKONOMIS'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data && response.data.status === "success") {
                const d = response.data;
                setTarifRegulerData(d.reguler_row || null);
                setTarifEkonomisData(d.ekonomis_row || null);

                setFormData(prev => ({
                    ...prev,
                    bttt_harga: d.grand_total || 0,
                    bttt_biayatambahan: d.biaya_penerus || 0
                }));
            }
        } catch (err) {
            console.warn("Gagal fetch tarif otomatis:", err);
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
            } else {
                setGeoSuggestions([]);
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

    const handleSelectKelurahan = async (subItem) => {
        setFormData(prev => ({
            ...prev,
            bttt_tujuankelurahan: subItem.kelurahan,
            bttt_tujuankodepos: subItem.kodepos,
            bttt_kodecabangagen: "DK-" + subItem.kodepos
        }));

        setFocusedField(null);
        const agenIdFix = localStorage.getItem('active_agen_id') || "";
        if (formData.bttt_tujuankecamatan) {
            await fetchTarifRute(agenIdFix, formData.bttt_tujuankecamatan);
        }
    };

    const executeFinalSaveDataToGolang = async (payloadKargo, finalResiID) => {
        setLoadingTarif(true);
        try {
            const token = localStorage.getItem('token');
            const sessionAgenId = localStorage.getItem('active_agen_id') || sessionStorage.getItem('active_agen_id');

            if (!sessionAgenId) {
                Swal.fire({
                    title: 'Sesi Loket Hilang!',
                    text: 'Identitas kode agen aktif tidak terdeteksi di browser Anda. Mohon login ulang akun loket Anda demi keamanan audit!',
                    icon: 'error',
                    confirmButtonColor: '#ef4444',
                    customClass: { container: 'z-[999999]' }
                });
                return;
            }

            const parsedAgenId = parseInt(sessionAgenId);
            const validAgenId = !isNaN(parsedAgenId) && parsedAgenId > 0 ? parsedAgenId : sessionAgenId;

            const response = await api.post('/btt/add', {
                id: finalResiID,
                bttt_tanggal: payloadKargo.bttt_tanggal,
                bttt_asalagenid: validAgenId,
                bttt_nosuratjalan: payloadKargo.bttt_nosuratjalan,
                bttt_ket: payloadKargo.bttt_ket,
                bttt_nobttmanual: payloadKargo.bttt_nobttmanual,
                bttt_dliexpryn: payloadKargo.bttt_dliexpryn,
                bttt_promoid: payloadKargo.bttt_promoid,
                bttt_asalcustid: payloadKargo.bttt_asalcustid,
                bttt_asalname: payloadKargo.bttt_asalname,
                bttt_asalalamat: payloadKargo.bttt_asalalamat,
                bttt_asalkota: payloadKargo.bttt_asalkota,
                bttt_asaltelp: payloadKargo.bttt_asaltelp,
                bttt_tujuannama: payloadKargo.bttt_tujuannama,
                bttt_up: payloadKargo.bttt_up,
                bttt_tujuanalamat: payloadKargo.bttt_tujuanalamat,
                bttt_tujuankota: payloadKargo.bttt_tujuankota,
                bttt_tujuankelurahan: payloadKargo.bttt_tujuankelurahan,
                bttt_tujuankecamatan: payloadKargo.bttt_tujuankecamatan,
                bttt_tujuankodepos: payloadKargo.bttt_tujuankodepos,
                bttt_tujuanemail: payloadKargo.bttt_tujuanemail,
                bttt_tujuantelp: payloadKargo.bttt_tujuantelp,
                bttt_tujuanpropinsi: payloadKargo.bttt_tujuanpropinsi,
                bttt_tujuanagenid: payloadKargo.bttt_tujuanagenid,
                bttt_kodecabangagen: payloadKargo.bttt_kodecabangagen,
                bttt_paketyn: payloadKargo.bttt_paketyn,
                bttt_pilihcarter: payloadKargo.bttt_pilihcarter,
                bttt_jenisharga: payloadKargo.bttt_jenisharga,
                bttt_isikiriman: payloadKargo.bttt_isikiriman,
                bttt_jmlkoli: parseInt(payloadKargo.bttt_jmlkoli) || 1,
                bttt_berat: parseFloat(payloadKargo.bttt_berat) || 1,
                bttt_beratvol: parseFloat(payloadKargo.bttt_beratvol) || 0,
                bttt_ukuran: parseFloat(payloadKargo.bttt_ukuran) || 0,
                bttt_harga: parseFloat(payloadKargo.bttt_harga) || 0,
                bttt_biayatambahan: parseFloat(payloadKargo.bttt_biayapenerus) || 0,
                bttt_biayapacking: parseFloat(payloadKargo.bttt_biayapacking) || 0
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data && response.data.status === "success") {
                const nomorBttResmiDariGo = response.data.btt_no || finalResiID;

                localStorage.setItem('print_btt_payload', JSON.stringify(payloadKargo));
                localStorage.setItem('print_btt_number', nomorBttResmiDariGo);

                onClose();

                Swal.fire({
                    title: 'SUKSES SIMPAN DATABASE!',
                    html: `
                    <div style="font-family: sans-serif; padding: 5px;">
                        <p style="color: #4b5563; margin-bottom: 8px;">Data transaksi BTT logistik berhasil disimpan dengan nomor resi sah:</p>
                        <h2 style="font-size: 24px; font-weight: 900; color: #059669; background-color: #ecfdf5; padding: 10px; border-radius: 8px; border: 1px solid #a7f3d0; letter-spacing: 1px;">${nomorBttResmiDariGo}</h2>
                        <p style="font-size: 13px; color: #6b7280; margin-top: 5px;">Membuka dokumen layout cetak resi kargo 3 rangkap...</p>
                    </div>
                `,
                    icon: 'success',
                    confirmButtonColor: '#4f46e5',
                    confirmButtonText: 'OK, CETAK RESI!',
                    customClass: { container: 'z-[999999]' }
                }).then(() => {
                    window.open(`/marketing/btt/print?id=${nomorBttResmiDariGo}`, '_blank');
                    if (onSave) onSave(payloadKargo);
                });
            }
        } catch (error) {
            Swal.fire({
                title: 'PROSES SIMPAN GAGAL!',
                text: error.response?.data?.error || 'Terjadi kesalahan sistem saat menyimpan BTT.',
                icon: 'error',
                confirmButtonColor: '#ef4444',
                customClass: { container: 'z-[999999]' }
            });
        } finally {
            setLoadingTarif(false);
        }
    };

    // 🛡️ Helper SweetAlert agar PASTI berada di atas modal (z-index 999999)
    const showWarningAlert = (pesan) => {
        Swal.fire({
            icon: 'warning',
            title: 'Data Belum Lengkap',
            text: pesan,
            confirmButtonColor: '#004b84',
            confirmButtonText: 'OKE, SAYA LENGKAPI',
            customClass: {
                container: 'z-[999999]' // 👈 Kunci agar popup tampil di paling depan modal!
            }
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // 🛑 Guard Validasi Lengkap dengan z-index di depan modal
        if (!formData.bttt_up?.trim()) {
            showWarningAlert('Nama Pengirim / UP wajib diisi!');
            return;
        }

        if (!formData.bttt_asalalamat?.trim()) {
            showWarningAlert('Alamat Pengirim wajib diisi!');
            return;
        }

        if (!formData.bttt_asaltelp?.trim()) {
            showWarningAlert('Nomor Telepon Pengirim wajib diisi!');
            return;
        }

        if (!formData.bttt_tujuannama?.trim()) {
            showWarningAlert('Nama Penerima wajib diisi!');
            return;
        }

        if (!formData.bttt_tujuanalamat?.trim()) {
            showWarningAlert('Alamat Lengkap Penerima wajib diisi!');
            return;
        }

        if (!formData.bttt_tujuantelp?.trim()) {
            showWarningAlert('Nomor Telepon Penerima wajib diisi!');
            return;
        }

        if (!formData.bttt_tujuankecamatan?.trim() || !formData.bttt_tujuankelurahan?.trim()) {
            showWarningAlert('Kecamatan dan Kelurahan tujuan pengiriman wajib dipilih dari daftar!');
            return;
        }

        if (!formData.bttt_isikiriman?.trim()) {
            showWarningAlert('Isi kiriman barang wajib diisi!');
            return;
        }

        if (!formData.bttt_harga || parseFloat(formData.bttt_harga) <= 0) {
            showWarningAlert('Klik tombol "HITUNG TARIF OTOMATIS" terlebih dahulu sebelum mencetak bukti terima!');
            return;
        }

        // =========================================================================
        // 🔒 VALIDASI TAMBAHAN: FORMAT EMAIL & TELEPON (DILETAKKAN DI SINI)
        // =========================================================================

        // 🛑 Validasi Format Email Pengirim (jika diisi)
        if (formData.bttt_asalemail && !validateEmailPengirim(formData.bttt_asalemail)) {
            showWarningAlert('Format Email Pengirim tidak valid! Gunakan format email yang benar (contoh: pengirim@email.com)');
            return;
        }

        // 🛑 Validasi Format Email Penerima (jika diisi)
        if (formData.bttt_tujuanemail && !validateEmailPenerima(formData.bttt_tujuanemail)) {
            showWarningAlert('Format Email Penerima tidak valid! Gunakan format email yang benar (contoh: penerima@email.com)');
            return;
        }

        // 🛑 Validasi Nomor Telepon Pengirim (minimal 8 digit angka)
        if (formData.bttt_asaltelp.replace(/\D/g, '').length < 8) {
            showWarningAlert('Nomor Telepon Pengirim minimal 8 digit angka dan tidak boleh mengandung huruf!');
            return;
        }

        // 🛑 Validasi Nomor Telepon Penerima (minimal 8 digit angka)
        if (formData.bttt_tujuantelp.replace(/\D/g, '').length < 8) {
            showWarningAlert('Nomor Telepon Penerima minimal 8 digit angka dan tidak boleh mengandung huruf!');
            return;
        }

        // =========================================================================
        // 🚀 Lolos seluruh validasi: proses generate ID dan simpan ke database
        // =========================================================================
        const activeAgenId =
            localStorage.getItem('active_agen_id') ||
            sessionStorage.getItem('active_agen_id') ||
            formData.bttt_asalagenid ||
            '';

        // Validasi jika agen belum ada, jangan hitung tarif sembarangan
        if (!activeAgenId) {
            console.warn("Kode agen aktif tidak ditemukan pada sesi pengguna.");
            return;
        }
        const tanggalMentah = formData.bttt_tanggal;
        const komponenTanggal = tanggalMentah.split('-');
        const tahunYY = komponenTanggal[0] ? komponenTanggal[0].substring(2, 4) : "26";
        const bulanMM = komponenTanggal[1] ? komponenTanggal[1] : "06";
        const prefixID = "A" + activeAgenId + bulanMM + tahunYY;

        executeFinalSaveDataToGolang(formData, prefixID + "00001");
    };

    const angkaKeTerbilang = (nominal) => {
        const angka = Math.floor(parseFloat(nominal) || 0);
        if (angka === 0) return "Nol Rupiah";

        const konversiPecahan = (n) => {
            const kata = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
            let hasil = "";
            if (n < 12) {
                hasil = " " + kata[n];
            } else if (n < 20) {
                hasil = konversiPecahan(n - 10) + " Belas";
            } else if (n < 100) {
                hasil = konversiPecahan(Math.floor(n / 10)) + " Puluh" + konversiPecahan(n % 10);
            } else if (n < 200) {
                hasil = " Seratus" + konversiPecahan(n - 100);
            } else if (n < 1000) {
                hasil = konversiPecahan(Math.floor(n / 100)) + " Ratus" + konversiPecahan(n % 100);
            } else if (n < 2000) {
                hasil = " Seribu" + konversiPecahan(n - 1000);
            } else if (n < 1000000) {
                hasil = konversiPecahan(Math.floor(n / 1000)) + " Ribu" + konversiPecahan(n % 1000);
            } else if (n < 1000000000) {
                hasil = konversiPecahan(Math.floor(n / 1000000)) + " Juta" + konversiPecahan(n % 1000000);
            } else if (n < 1000000000000) {
                hasil = konversiPecahan(Math.floor(n / 1000000000)) + " Milyar" + konversiPecahan(n % 1000000000);
            }
            return hasil;
        };

        const hasilTeksMentah = konversiPecahan(angka) + " Rupiah";
        return hasilTeksMentah.trim().replace(/\s+/g, ' ');
    };

    const RenderDropdownMelayang = () => {
        if (!Array.isArray(geoSuggestions) || geoSuggestions.length === 0) return null;

        return (
            <div className="absolute left-0 right-0 top-[60px] bg-white border-2 border-teal-400 text-slate-900 rounded-xl shadow-2xl z-[99999] max-h-48 overflow-y-auto text-sm text-left block">
                {geoSuggestions.map((item, idx) => (
                    <div
                        key={idx}
                        onClick={() => handleSelectGeo(item)}
                        className="p-3 hover:bg-teal-100 cursor-pointer border-b last:border-b-0 font-bold text-slate-800 transition-colors py-3.5"
                    >
                        📍 <span className="text-teal-600">{item?.kecamatan || '-'}</span> - <span className="text-gray-500 text-xs font-normal">{item?.kelurahan || ''}, {item?.kabupaten || ''}, {item?.propinsi || ''} [{item?.kodepos || ''}]</span>
                    </div>
                ))}
            </div>
        );
    };

    const fetchTarifOtomatis = async (kecamatanTujuan) => {
        const kec = kecamatanTujuan || formData.bttt_tujuankecamatan;
        if (!kec) return;

        const activeAgenId = localStorage.getItem('active_agen_id') || formData.bttt_asalagenid || 'BDO004';
        const beratAsli = parseFloat(formData.bttt_berat) || 0;
        const beratVolManual = parseFloat(formData.bttt_beratvol) || 0;
        const p = parseFloat(formData.bttt_panjang) || 0;
        const l = parseFloat(formData.bttt_lebar) || 0;
        const t = parseFloat(formData.bttt_tinggi) || 0;
        const beratVolumeDimensi = (p * l * t) / 4000;
        const beratFinal = Math.max(beratAsli, beratVolManual, beratVolumeDimensi, 1);

        // 🚀 1. Set loading aktif saat request dimulai
        setLoadingTarif(true);

        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/btt/calculate-tarif', {
                agen_id: String(activeAgenId).trim(),
                asal_kota: String(activeAgenId).trim(),
                cust_id: String(formData.bttt_asalcustid || '').trim(),
                tujuan_kec: kec.trim(),
                tujuan_kecamatan: kec.trim(),
                berat_asli: beratFinal,
                panjang: p,
                lebar: l,
                tinggi: t,
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

                setFormData(prev => ({
                    ...prev,
                    bttt_harga: (prev.bttt_paketyn === 'N' ? ekoRow.hargapokok : regRow.hargapokok) || data.grand_total || 0,
                    bttt_biayapenerus: regRow.biayatambahan || data.biaya_penerus || 0
                }));
            }
        } catch (err) {
            console.error("❌ Gagal hitung tarif:", err);
        } finally {
            // 🚀 2. Matikan loading saat selesai
            setLoadingTarif(false);
        }
    };

    // 🎯 HANYA 1 EFFECT DEBOUNCE UNTUK TARIF OTOMATIS (DUPLIKAT SUDAH DIHAPUS)
    useEffect(() => {
        if (isOpen && formData.bttt_tujuankecamatan) {
            const delayDebounceFn = setTimeout(() => {
                fetchTarifOtomatis(formData.bttt_tujuankecamatan);
            }, 350);

            return () => clearTimeout(delayDebounceFn);
        }
    }, [
        isOpen,
        formData.bttt_tujuankecamatan,
        formData.bttt_asalcustid,
        formData.bttt_berat,
        formData.bttt_beratvol,
        formData.bttt_pilihcarter,
        formData.bttt_panjang,
        formData.bttt_lebar,
        formData.bttt_tinggi,
        formData.bttt_paketyn
    ]);

    // 🔍 Validasi Field Wajib: Pengirim, Penerima, Wilayah Tujuan, Isi Barang, & Tarif
    // 🔍 Validasi Field Wajib & Format Email/Telepon
    const isFormValid = Boolean(
        formData.bttt_tanggal &&
        formData.bttt_asalname?.trim() &&
        formData.bttt_up?.trim() &&
        formData.bttt_asalalamat?.trim() &&
        formData.bttt_asaltelp?.replace(/\D/g, '').length >= 8 &&
        formData.bttt_tujuannama?.trim() &&
        formData.bttt_tujuanalamat?.trim() &&
        formData.bttt_tujuantelp?.replace(/\D/g, '').length >= 8 &&
        formData.bttt_tujuankecamatan?.trim() &&
        formData.bttt_tujuankelurahan?.trim() &&
        formData.bttt_isikiriman?.trim() &&
        (parseFloat(formData.bttt_berat) > 0) &&
        (parseFloat(formData.bttt_harga) > 0) &&
        // Jika email diisi, format harus valid; jika kosong, tetap dianggap valid (opsional)
        (!formData.bttt_asalemail || validateEmailPengirim(formData.bttt_asalemail)) &&
        (!formData.bttt_tujuanemail || validateEmailPenerima(formData.bttt_tujuanemail))
    );

    // 🚚 Auto-fill Berat Volume saat Jenis Carter dipilih
    const MIN_BERAT_CARTER = {
        'BUILD UP': 16000,
        'COLT DIESEL': 4000,
        'FUSO': 7000,
        'FREEZER BOX': 4000,
        'TRONTON': 11000,
        'WING BOX': 16000
    };

    useEffect(() => {
        if (formData.bttt_pilihcarter && MIN_BERAT_CARTER[formData.bttt_pilihcarter]) {
            const beratDefaultCarter = MIN_BERAT_CARTER[formData.bttt_pilihcarter];
            setFormData(prev => ({
                ...prev,
                bttt_beratvol: beratDefaultCarter
            }));
        }
    }, [formData.bttt_pilihcarter]);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
            <div className="bg-white w-full max-w-[95vw] xl:max-w-7xl max-h-[96vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">

                {/* 🎯 1. HEADER BIRU ELEGAN KHAS INVOICE */}
                <div className="px-6 py-3.5 bg-[#004b84] text-white flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">+</span>
                        <h2 className="text-sm font-black uppercase tracking-wider">ENTRY BUKTI TANDA TERIMA (BTT)</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-red-200 p-1 rounded-lg transition-colors text-lg font-bold cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                {/* 🎯 2. BODY KONTEN FORM */}
                <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-800">

                    {/* CARD 1: PENGIRIM, PENERIMA & TANGGAL PENGIRIMAN */}
                    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">

                        {/* Baris Tanggal Pengiriman */}
                        <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-slate-100">
                            <label className="text-[11px] font-bold text-red-600 tracking-tight uppercase">
                                * TANGGAL PENGIRIMAN :
                            </label>
                            <input
                                type="date"
                                name="bttt_tanggal"
                                value={formData.bttt_tanggal}
                                onChange={handleChange}
                                min={minDate}
                                max={maxDate}
                                className="p-1.5 border border-slate-300 rounded-lg font-bold text-sky-800 bg-white outline-none focus:border-sky-500 text-xs shadow-2xs"
                            />
                            {isLayananPaket ? (
                                <span className="text-[11px] text-emerald-700 font-semibold italic">
                                    (Layanan Paket: bisa pilih H-1 kemarin atau hari ini)
                                </span>
                            ) : (
                                <span className="text-[11px] text-amber-700 font-semibold italic">
                                    (Layanan Carter: hanya bisa memilih tanggal hari ini)
                                </span>
                            )}
                        </div>

                        {/* Grid Informasi Pengirim vs Penerima */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* KOLOM KIRI: INFORMASI PENGIRIM */}
                            <div className="space-y-3">
                                <div className="text-center font-bold text-slate-700 text-xs tracking-wider uppercase pb-1 border-b border-slate-200">
                                    INFORMASI PENGIRIM BARANG
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* Pelanggan Autocomplete */}
                                    <div className="relative">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">CUSTOMER :</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-slate-300 rounded-lg font-bold uppercase text-slate-800 bg-white outline-none focus:border-sky-500"
                                            value={keywordCustomer || formData.bttt_asalname}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setKeywordCustomer(val);
                                                setFormData(prev => ({ ...prev, bttt_asalname: val }));
                                            }}
                                            placeholder="Cari Pelanggan..."
                                        />
                                        {Array.isArray(rekomendasiCustomer) && rekomendasiCustomer.length > 0 && (
                                            <div className="absolute top-[58px] left-0 w-full bg-white border border-sky-400 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto text-xs">
                                                {rekomendasiCustomer.map((cust, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="p-2 hover:bg-sky-50 cursor-pointer border-b last:border-b-0 font-bold text-slate-800"
                                                        onClick={() => {
                                                            const namaTerpilih = cust.cust_name ? cust.cust_name.toUpperCase() : '';
                                                            setIsCustomerSelected(true);
                                                            if (namaTerpilih === 'UMUM' || namaTerpilih === '') {
                                                                setKeywordCustomer('UMUM');
                                                                setFormData(prev => ({ ...prev, bttt_asalname: 'UMUM' }));
                                                                pemicuGenerateID();
                                                            } else {
                                                                const fixName = cust.cust_name || cust.cust_nama || "";
                                                                const fixAlamat = cust.cust_alamat1 || cust.CustAlamat1 || "";
                                                                const fixKota = cust.cust_kotaid || cust.CustKotaID || "";
                                                                const fixTelp = cust.cust_telp1 || cust.CustTelp1 || "";
                                                                const fixTelp2 = cust.cust_telp2 || cust.CustTelp2 || "";
                                                                const fixEmail = cust.cust_email || cust.CustEmail || "";

                                                                setKeywordCustomer(fixName);
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    bttt_asalname: fixName.toUpperCase(),
                                                                    bttt_asalcustid: cust.cust_id,
                                                                    bttt_asalalamat: fixAlamat.toUpperCase(),
                                                                    bttt_asalkota: fixKota.toUpperCase(),
                                                                    bttt_asaltelp: fixTelp,
                                                                    bttt_asaltelp2: fixTelp2,
                                                                    bttt_asalemail: fixEmail,
                                                                    bttt_up: fixName.toUpperCase()
                                                                }));
                                                            }
                                                            setRekomendasiCustomer([]);
                                                        }}
                                                    >
                                                        🏢 {cust.cust_name} <span className="text-red-600 font-mono">[{cust.cust_id}]</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Cust ID */}
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">CUST ID :</label>
                                        <input
                                            type="text"
                                            readOnly
                                            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-red-600 cursor-not-allowed outline-none"
                                            value={formData.bttt_asalcustid}
                                            placeholder="Generate ID..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">NAMA PENGIRIM / UP :</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-slate-300 rounded-lg font-bold uppercase text-slate-800 bg-white outline-none focus:border-sky-500"
                                        value={formData.bttt_up || ""}
                                        onChange={(e) => setFormData(prev => ({ ...prev, bttt_up: e.target.value }))}
                                        placeholder="Nama PIC Pengirim..."
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">ALAMAT LENGKAP PENGIRIM :</label>
                                    <textarea
                                        name="bttt_asalalamat"
                                        value={formData.bttt_asalalamat || ""}
                                        onChange={handleChange}
                                        className="w-full p-2 border border-slate-300 rounded-lg uppercase text-slate-800 bg-white outline-none focus:border-sky-500 text-xs"
                                        rows="2"
                                        placeholder="Alamat gudang/kantor pengirim..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">KOTA ASAL :</label>
                                        <input
                                            type="text"
                                            name="bttt_asalkota"
                                            value={formData.bttt_asalkota || ""}
                                            onChange={handleChange}
                                            className="w-full p-2 border border-slate-300 rounded-lg font-bold uppercase text-slate-800 bg-white outline-none focus:border-sky-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">TELEPON PENGIRIM :</label>
                                        <input
                                            type="text"
                                            name="bttt_asaltelp"
                                            value={formData.bttt_asaltelp || ""}
                                            onChange={handleChange}
                                            className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-slate-800 bg-white outline-none focus:border-sky-500"
                                            placeholder="08xxxxxxxxxx"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">TELEPON 2 :</label>
                                        <input
                                            type="text"
                                            name="bttt_asaltelp2"
                                            value={formData.bttt_asaltelp2 || ""}
                                            onChange={handleChange}
                                            className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 bg-white outline-none focus:border-sky-500"
                                            placeholder="Opsional"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">EMAIL PENGIRIM :</label>
                                        <input
                                            type="email"
                                            name="bttt_asalemail"
                                            value={formData.bttt_asalemail || ''}
                                            onChange={handleChange}
                                            placeholder="pengirim@email.com"
                                            className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors ${emailError ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
                                                }`}
                                        />
                                        {emailError && (
                                            <p className="text-red-500 text-xs mt-1 font-semibold">{emailError}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* KOLOM KANAN: INFORMASI PENERIMA */}
                            <div className="space-y-3">
                                <div className="text-center font-bold text-slate-700 text-xs tracking-wider uppercase pb-1 border-b border-slate-200">
                                    INFORMASI PENERIMA BARANG
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">PENERIMA :</label>
                                        <input
                                            type="text"
                                            name="bttt_tujuannama"
                                            value={formData.bttt_tujuannama}
                                            onChange={handleChange}
                                            className="w-full p-2 border border-slate-300 rounded-lg font-bold uppercase text-slate-800 bg-white outline-none focus:border-sky-500"
                                            placeholder="Nama Perusahaan/Toko..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">UP / NAMA :</label>
                                        <input
                                            type="text"
                                            name="bttt_up_penerima"
                                            value={formData.bttt_up_penerima}
                                            onChange={handleChange}
                                            className="w-full p-2 border border-slate-300 rounded-lg font-bold uppercase text-slate-800 bg-white outline-none focus:border-sky-500"
                                            placeholder="Nama Penerima..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">EMAIL PENERIMA :</label>
                                    <input
                                        type="email"
                                        name="bttt_tujuanemail"
                                        value={formData.bttt_tujuanemail || ''}
                                        onChange={handleChange}
                                        placeholder="penerima@email.com"
                                        className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors ${emailPenerimaError ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
                                            }`}
                                    />
                                    {emailPenerimaError && (
                                        <p className="text-red-500 text-xs mt-1 font-semibold">{emailPenerimaError}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">* ALAMAT LENGKAP PENERIMA :</label>
                                    <textarea
                                        name="bttt_tujuanalamat"
                                        value={formData.bttt_tujuanalamat || ""}
                                        onChange={handleChange}
                                        className="w-full p-2 border border-slate-300 rounded-lg uppercase text-slate-800 bg-white outline-none focus:border-sky-500 text-xs"
                                        rows="2"
                                        placeholder="Nama Jalan, Blok, No Rumah, RT/RW..."
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">TELEPON 1 :</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            name="bttt_tujuantelp"
                                            value={formData.bttt_tujuantelp || ''}
                                            onChange={handleChange}
                                            placeholder="08xxxxxxxxxx"
                                            maxLength={15}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">TELEPON 2 :</label>
                                        <input
                                            type="text"
                                            name="bttt_tujuantelp2"
                                            value={formData.bttt_tujuantelp2 || ""}
                                            onChange={handleChange}
                                            className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 bg-white outline-none focus:border-sky-500"
                                            placeholder="Opsional"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">TELEPON 3 :</label>
                                        <input
                                            type="text"
                                            name="bttt_tujuantelp3"
                                            value={formData.bttt_tujuantelp3 || ""}
                                            onChange={handleChange}
                                            className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 bg-white outline-none focus:border-sky-500"
                                            placeholder="Opsional"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CARD 2: TUJUAN AREA KIRIM */}
                    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">
                        <div className="text-center font-bold text-[#004b84] text-xs tracking-wider uppercase pb-1 border-b border-slate-200">
                            INFORMASI TUJUAN AREA KIRIM
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                            {/* Kecamatan Utama */}
                            <div className="relative">
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">KECAMATAN :</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white outline-none focus:border-sky-500 uppercase"
                                    placeholder="Ketik kecamatan..."
                                    value={formData.bttt_tujuankecamatan || ''}
                                    onChange={(e) => handleLiveSearchGeo('bttt_tujuankecamatan', e.target.value)}
                                    onFocus={() => setFocusedField('bttt_tujuankecamatan')}
                                />
                                {focusedField === 'bttt_tujuankecamatan' && Array.isArray(geoSuggestions) && geoSuggestions.length > 0 && <RenderDropdownMelayang />}
                            </div>

                            {/* Provinsi */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">PROVINSI :</label>
                                <input
                                    type="text"
                                    readOnly
                                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-700 cursor-not-allowed outline-none"
                                    placeholder="Otomatis..."
                                    value={formData.bttt_tujuanpropinsi || ''}
                                />
                            </div>

                            {/* Kota / Kabupaten */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">KOTA / KABUPATEN :</label>
                                <input
                                    type="text"
                                    readOnly
                                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-700 cursor-not-allowed outline-none"
                                    placeholder="Otomatis..."
                                    value={formData.bttt_tujuankota || ''}
                                />
                            </div>

                            {/* Kelurahan */}
                            <div className="relative">
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">KELURAHAN :</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white outline-none focus:border-sky-500 uppercase"
                                    placeholder="Pilih kelurahan..."
                                    value={formData.bttt_tujuankelurahan || ''}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase();
                                        setFormData(prev => ({ ...prev, bttt_tujuankelurahan: val }));
                                        setFocusedField('bttt_tujuankelurahan');
                                    }}
                                    onFocus={() => setFocusedField('bttt_tujuankelurahan')}
                                />
                                {focusedField === 'bttt_tujuankelurahan' && Array.isArray(kelurahanSuggestions) && kelurahanSuggestions.length > 0 && (
                                    <div className="absolute left-0 right-0 top-[58px] bg-white border border-sky-400 text-slate-900 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto text-xs">
                                        {kelurahanSuggestions
                                            .filter(item => (item?.kelurahan || '').toUpperCase().includes((formData.bttt_tujuankelurahan || '').toUpperCase()))
                                            .map((subItem, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => handleSelectKelurahan(subItem)}
                                                    className="p-2 hover:bg-sky-50 cursor-pointer border-b last:border-b-0 font-bold text-slate-800"
                                                >
                                                    🏘️ {subItem?.kelurahan} - <span className="text-slate-500">[{subItem?.kodepos}]</span>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Rincian Pos dan Cabang */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">KODE POS :</label>
                                <input
                                    type="text"
                                    readOnly
                                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-700 cursor-not-allowed outline-none"
                                    value={formData.bttt_tujuankodepos || ''}
                                    placeholder="Otomatis..."
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">CABANG / AGEN TUJUAN :</label>
                                <input
                                    type="text"
                                    readOnly
                                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-700 cursor-not-allowed outline-none"
                                    value={formData.bttt_tujuanagenid || ''}
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">KODE CABANG :</label>
                                <input
                                    type="text"
                                    readOnly
                                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-700 cursor-not-allowed outline-none"
                                    value={formData.bttt_kodecabangagen || ''}
                                />
                            </div>
                        </div>
                    </div>

                    {/* CARD 3: INFORMASI KIRIMAN & LAYANAN */}
                    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">
                        <div className="text-center font-bold text-[#004b84] text-xs tracking-wider uppercase pb-1 border-b border-slate-200">
                            INFORMASI KIRIMAN & LAYANAN
                        </div>

                        {/* Pilihan Pelayanan & Carter */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-2">JENIS PELAYANAN :</label>
                                <div className="flex items-center gap-6 h-9">
                                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                                        <input
                                            type="radio"
                                            name="jenis_pelayanan_radio"
                                            checked={formData.bttt_pilihcarter === ''}
                                            onChange={() => setFormData(prev => ({ ...prev, bttt_pilihcarter: '' }))}
                                            className="w-4 h-4 text-sky-600 border-slate-300 focus:ring-sky-500"
                                        />
                                        <span>PAKET</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                                        <input
                                            type="radio"
                                            name="jenis_pelayanan_radio"
                                            checked={formData.bttt_pilihcarter !== ''}
                                            onChange={() => setFormData(prev => ({ ...prev, bttt_pilihcarter: 'BUILD UP' }))}
                                            className="w-4 h-4 text-sky-600 border-slate-300 focus:ring-sky-500"
                                        />
                                        <span>CARTER</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">PILIH CARTER :</label>
                                <select
                                    name="bttt_pilihcarter"
                                    value={formData.bttt_pilihcarter}
                                    onChange={handleChange}
                                    disabled={formData.bttt_pilihcarter === ''}
                                    className={`w-full p-2 border rounded-lg font-bold outline-none text-xs ${formData.bttt_pilihcarter === ''
                                        ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                                        : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'
                                        }`}
                                >
                                    <option value="">-- BUKAN MODAL CARTER (PAKET) --</option>
                                    <option value="BUILD UP">1. BUILD UP</option>
                                    <option value="COLT DIESEL">2. COLT DIESEL</option>
                                    <option value="FUSO">3. FUSO</option>
                                    <option value="FREEZER BOX">4. FREEZER BOX</option>
                                    <option value="TRONTON">5. TRONTON</option>
                                    <option value="WING BOX">6. WING BOX</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">JENIS KIRIMAN :</label>
                                <select
                                    name="bttt_jeniskiriman"
                                    value={formData.bttt_jeniskiriman}
                                    onChange={handleChange}
                                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white outline-none focus:border-sky-500"
                                >
                                    <option value="BERAT">BERAT</option>
                                    <option value="UNIT">UNIT</option>
                                </select>
                            </div>
                        </div>

                        {/* Isi Kiriman, Surat Jalan, Keterangan */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">ISI KIRIMAN :</label>
                                <input
                                    type="text"
                                    name="bttt_isikiriman"
                                    value={formData.bttt_isikiriman}
                                    onChange={handleChange}
                                    className="w-full p-2 border border-slate-300 rounded-lg font-semibold uppercase text-slate-800 bg-white outline-none focus:border-sky-500"
                                    placeholder="Isi kiriman..."
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">NO. SURAT JALAN :</label>
                                <input
                                    type="text"
                                    name="bttt_nosuratjalan"
                                    value={formData.bttt_nosuratjalan}
                                    onChange={handleChange}
                                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-semibold text-slate-800 bg-white outline-none focus:border-sky-500"
                                    placeholder="Nomor surat jalan..."
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-700">KETERANGAN :</label>
                                <input
                                    type="text"
                                    name="bttt_ket"
                                    value={formData.bttt_ket ?? ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        bttt_ket: e.target.value
                                    }))}
                                    placeholder="Keterangan..."
                                    className="w-full px-3 py-1.5 bg-white text-gray-800 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
                                />
                            </div>
                        </div>

                        {/* Ukuran & Berat */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">JUMLAH KOLI :</label>
                                <input
                                    type="number"
                                    name="bttt_jmlkoli"
                                    value={formData.bttt_jmlkoli}
                                    onChange={handleChange}
                                    min="1"
                                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white outline-none focus:border-sky-500"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">BERAT ASLI (KG) :</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="bttt_berat"
                                    value={formData.bttt_berat}
                                    onChange={handleChange}
                                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white outline-none focus:border-sky-500"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                                    BERAT VOLUME (KG) :
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="bttt_beratvol"
                                    value={formData.bttt_beratvol ?? ''}
                                    onChange={handleChange}
                                    placeholder="0"
                                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white outline-none focus:border-sky-500"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">KUBIKASI (M3) :</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="bttt_ukuran"
                                    value={formData.bttt_ukuran || ''}
                                    onChange={handleChange}
                                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white outline-none focus:border-sky-500"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* CARD 4: TABEL INFORMASI TARIF DASAR */}
                    <div className="relative p-5 bg-white border border-emerald-400 rounded-xl shadow-2xs space-y-4 overflow-hidden">

                        {/* Header Judul Rute & Status Loading */}
                        <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                            <div className="text-center flex-1 font-bold text-emerald-700 text-xs tracking-wider uppercase">
                                INFORMASI TARIF DASAR (RUTE: {formData.bttt_asalkota || localStorage.getItem('active_agen_nama') || 'PUSAT'} ➡ {formData.bttt_tujuankecamatan || '-'})
                            </div>
                            {loadingTarif && (
                                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-700 text-[10px] font-bold animate-pulse">
                                    <Loader2 size={12} className="animate-spin text-amber-600" />
                                    <span>MENGHITUNG TARIF...</span>
                                </div>
                            )}
                        </div>

                        {/* 🌟 OVERLAY LOADING HALUS KETIKA PROSES HITUNG */}
                        {loadingTarif && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-20 flex flex-col items-center justify-center gap-2">
                                <div className="p-3 bg-white shadow-xl rounded-2xl border border-emerald-200 flex items-center gap-3">
                                    <Loader2 size={24} className="animate-spin text-emerald-600" />
                                    <div className="text-left">
                                        <div className="text-xs font-black text-slate-800 uppercase tracking-wide">
                                            Menghitung Tarif Dakota...
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-medium">
                                            Mengkalkulasi berat & jarak rute tujuan
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Blok Reguler */}
                        <div className="space-y-1.5">
                            <div className="text-[11px] font-black uppercase text-purple-700 tracking-wider">
                                [1] DARAT REGULER
                            </div>
                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="w-full text-left border-collapse min-w-[1100px]">
                                    <thead className="bg-[#004b84] text-white text-[11px] font-bold uppercase">
                                        <tr>
                                            <th className="p-2 text-center w-12">PILIH</th>
                                            <th className="p-2 text-center w-14">LT</th>
                                            <th className="p-2 text-right">DASAR</th>
                                            <th className="p-2 text-center">KG MIN</th>
                                            <th className="p-2 text-center">KG NEXT</th>
                                            <th className="p-2 text-center">AMBIL SDR</th>
                                            <th className="p-2 text-right">DISKON-1 RP</th>
                                            <th className="p-2 text-right">DISKON-2 RP</th>
                                            <th className="p-2 text-right">HARGA PENERUS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs font-semibold text-slate-800">
                                        <tr className="hover:bg-slate-50 transition-colors">
                                            <td className="p-2 text-center">
                                                <input
                                                    type="radio"
                                                    name="pilih_tarif_layanan"
                                                    checked={formData.bttt_paketyn === 'Y' || formData.bttt_paketyn === 'REGULER'}
                                                    onChange={() => setFormData(prev => ({
                                                        ...prev,
                                                        bttt_paketyn: 'Y',
                                                        bttt_harga: tarifRegulerData?.hargapokok || 0
                                                    }))}
                                                    className="w-4 h-4 text-purple-600 cursor-pointer"
                                                />
                                            </td>
                                            <td className="p-2 text-center">{tarifRegulerData?.estimasihari || '-'}</td>
                                            <td className="p-2 text-right">Rp {(Number(tarifRegulerData?.hargapokok) || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-2 text-center">{tarifRegulerData?.minimalkg || 0}</td>
                                            <td className="p-2 text-center">Rp {(Number(tarifRegulerData?.hargakgselanjutnya) || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-2 text-center font-mono">{tarifRegulerData?.flag_ds || 'N'}</td>
                                            <td className="p-2 text-right">Rp {(Number(tarifRegulerData?.harga1kg) || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-2 text-right">Rp {(Number(tarifRegulerData?.harga2kg) || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-2 text-right text-orange-600 font-bold">Rp {(Number(tarifRegulerData?.biayatambahan) || 0).toLocaleString('id-ID')}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Blok Ekonomis */}
                        <div className="space-y-1.5 pt-2">
                            <div className="text-[11px] font-black uppercase text-emerald-700 tracking-wider">
                                [2] DARAT EKONOMIS
                            </div>
                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="w-full text-left border-collapse min-w-[1100px]">
                                    <thead className="bg-[#004b84] text-white text-[11px] font-bold uppercase">
                                        <tr>
                                            <th className="p-2 text-center w-12">PILIH</th>
                                            <th className="p-2 text-center w-14">LT</th>
                                            <th className="p-2 text-right">DASAR</th>
                                            <th className="p-2 text-center">KG MIN</th>
                                            <th className="p-2 text-center">KG NEXT</th>
                                            <th className="p-2 text-center">AMBIL SDR</th>
                                            <th className="p-2 text-right">DISKON-1 RP</th>
                                            <th className="p-2 text-right">DISKON-2 RP</th>
                                            <th className="p-2 text-right">HARGA PENERUS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs font-semibold text-slate-800">
                                        <tr className="hover:bg-slate-50 transition-colors">
                                            <td className="p-2 text-center">
                                                <input
                                                    type="radio"
                                                    name="pilih_tarif_layanan"
                                                    checked={formData.bttt_paketyn === 'N' || formData.bttt_paketyn === 'EKONOMIS'}
                                                    onChange={() => setFormData(prev => ({
                                                        ...prev,
                                                        bttt_paketyn: 'N',
                                                        bttt_harga: tarifEkonomisData?.hargapokok || 0
                                                    }))}
                                                    className="w-4 h-4 text-emerald-600 cursor-pointer"
                                                />
                                            </td>
                                            <td className="p-2 text-center">{tarifEkonomisData?.estimasihari || '-'}</td>
                                            <td className="p-2 text-right">Rp {(Number(tarifEkonomisData?.hargapokok) || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-2 text-center">{tarifEkonomisData?.minimalkg || 0}</td>
                                            <td className="p-2 text-center">Rp {(Number(tarifEkonomisData?.hargakgselanjutnya) || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-2 text-center font-mono">{tarifEkonomisData?.flag_ds || 'N'}</td>
                                            <td className="p-2 text-right">Rp {(Number(tarifEkonomisData?.harga1kg) || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-2 text-right">Rp {(Number(tarifEkonomisData?.harga2kg) || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-2 text-right text-orange-600 font-bold">Rp {(Number(tarifEkonomisData?.biayatambahan) || 0).toLocaleString('id-ID')}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* CARD 5: INFORMASI PEMBAYARAN & PACKING */}
                    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">
                        <div className="text-center font-bold text-[#004b84] text-xs tracking-wider uppercase pb-1 border-b border-slate-200">
                            INFORMASI PEMBAYARAN & PACKING
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">METODE PEMBAYARAN :</label>
                                <select
                                    value={formData.bttt_jenisharga}
                                    onChange={(e) => setFormData(prev => ({ ...prev, bttt_jenisharga: e.target.value }))}
                                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white outline-none focus:border-sky-500"
                                >
                                    <option value="0">TUNAI (CASH)</option>
                                    <option value="2">KREDIT (TEMPO)</option>
                                    <option value="1">TAGIH TUJUAN (COD)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">BIAYA KIRIM :</label>
                                <input
                                    type="text"
                                    readOnly
                                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-700 cursor-not-allowed outline-none"
                                    value={`Rp ${(formData.bttt_harga || 0).toLocaleString('id-ID')}`}
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">BIAYA PENERUS / LAIN :</label>
                                <input
                                    type="number"
                                    name="bttt_biayapenerus"
                                    value={formData.bttt_biayapenerus || 0}
                                    onChange={handleChange}
                                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white outline-none focus:border-sky-500"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">BIAYA PACKING :</label>
                                <div className="flex gap-1.5">
                                    <input
                                        type="number"
                                        name="bttt_biayapacking"
                                        value={formData.bttt_biayapacking || 0}
                                        onChange={handleChange}
                                        className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white outline-none focus:border-sky-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsPopUpPackingOpen(true)}
                                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg font-bold text-[10px] uppercase text-slate-700 transition cursor-pointer"
                                    >
                                        PILIH
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Perhitungan Total & Tombol Kalkulasi */}
                        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
                            <div>
                                <span className="text-[11px] font-bold text-slate-500 uppercase block">TOTAL BIAYA KESELURUHAN :</span>
                                <span className="text-xl font-black text-emerald-600">
                                    Rp {(formData.bttt_harga + (parseFloat(formData.bttt_biayapenerus) || 0) + (parseFloat(formData.bttt_biayapacking) || 0)).toLocaleString('id-ID')}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={handleHitungTarif}
                                disabled={loadingTarif}
                                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
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
                        className="px-5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-200 font-bold rounded-xl uppercase text-xs transition cursor-pointer"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!isFormValid || loadingTarif}
                        title={!isFormValid ? "Lengkapi seluruh data wajib dan hitung tarif sebelum mencetak" : ""}
                        className={`px-6 py-2 rounded-xl uppercase text-xs shadow-xs transition flex items-center gap-2 font-bold ${!isFormValid || loadingTarif
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed select-none'
                            : 'bg-[#004b84] hover:bg-[#003863] text-white cursor-pointer'
                            }`}
                    >
                        <FileText size={15} /> Cetak Bukti Terima
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