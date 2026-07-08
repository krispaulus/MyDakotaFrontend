import React, { useState, useEffect } from 'react';
import { X, Save, Package, MapPin, Layers, Calculator, FileText, Search } from 'lucide-react';
import axios from 'axios';

const Swal = window.Swal || {
    fire: (options) => {
        console.log("Sokongan Swal Diaktifkan:", options);
        const title = options.title || '';
        const text = options.text || (typeof options.html === 'string' ? options.html.replace(/<[^>]*>/g, '') : '') || '';
        alert(`${title}\n\n${text}`);
        return Promise.resolve({ isConfirmed: true });
    }
};

const BttFormModal = ({ isOpen, onClose, onSave, isDarkMode }) => {
    if (!isOpen) return null;

    // 🌟 State pengontrol Alur Asuransi Baru
    const [generatedBttNum, setGeneratedBttNum] = useState(''); // 1D Kode PT + 3d KODE AGEN + 3d nomor urut AGEN +  MM + YY + 5D nomor urut Fallback number default
    const [tarifRegulerData, setTarifRegulerData] = useState(null);
    const [tarifEkonomisData, setTarifEkonomisData] = useState(null);

    const [emailPenerimaError, setEmailPenerimaError] = useState('');
    const [isPopUpPackingOpen, setIsPopUpPackingOpen] = useState(false);
    // 🚀 STATE MANAJEMEN LIVE SEARCH MULTI-FIELD GEOGRAFI
    const [geoSuggestions, setGeoSuggestions] = useState([]);
    const [kelurahanSuggestions, setKelurahanSuggestions] = useState([]);
    const [focusedField, setFocusedField] = useState(null);

    // 📦 States Baru untuk Autocomplete Pelanggan (mkt_m_customer)
    const [keywordCustomer, setKeywordCustomer] = useState('');
    const [rekomendasiCustomer, setRekomendasiCustomer] = useState([]);
    const [isCustomerSelected, setIsCustomerSelected] = useState(false);

    // 2. 📦 States Autocomplete 2: Histori Nama Pengirim / UP (mkt_t_econote) - BARU!
    const [keywordSender, setKeywordSender] = useState('');
    const [rekomendasiSenderHistory, setRekomendasiSenderHistory] = useState([]);

    // States untuk menghidupkan Autocomplete area kirim Dakota
    const [keywordKecamatan, setKeywordKecamatan] = useState('');
    const [rekomendasiArea, setRekomendasiArea] = useState([]);
    const [isKecamatanSelected, setIsKecamatanSelected] = useState(false);

    // 🏢 States untuk Autocomplete Agen/Cabang Penerima (glb_m_agen)
    const [keywordAgen, setKeywordAgen] = useState('');
    const [rekomendasiAgen, setRekomendasiAgen] = useState([]);

    const [errors, setErrors] = useState({});
    const [loadingTarif, setLoadingTarif] = useState(false);

    // Ambil tanggal hari ini berdasarkan zona waktu lokal komputer
    const hariIniObj = new Date();
    const besokObj = new Date();
    besokObj.setDate(hariIniObj.getDate() + 1);
    const lusaObj = new Date();
    lusaObj.setDate(hariIniObj.getDate() + 2);

    const formatDateStr = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const strHariIni = formatDateStr(hariIniObj);
    const strLusa = formatDateStr(lusaObj);

    const [formData, setFormData] = useState({
        bttt_tanggal: strHariIni,
        bttt_nosuratjalan: '',
        bttt_ket: '',
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
        bttt_harga: 0,
        bttt_biayapenerus: 0,
        bttt_biayapacking: 0
    });

    // --- ⚡ TRIGGER AUTOMATIC GENERATE ID DI AWAL (PAS KLIK TAMBAH BTT) ---
    const pemicuGenerateID = () => {
        const token = localStorage.getItem('token');
        const kodeAgenAktif = localStorage.getItem('active_agen_id') || '';

        api.get(`/btt/generate-custid?kode_agen=${kodeAgenAktif}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        })
            .then(res => res.json())
            .then(res => {
                if (res && res.status === "success") {
                    setFormData(prev => ({ ...prev, bttt_asalcustid: res.generated_id }));
                }
            })
            .catch(err => console.warn("Gagal auto-generate ID awal", err.message));
    };

    useEffect(() => {
        pemicuGenerateID();
    }, []);

    // 🌟 REKAYASA PENYELARASAN AGEN AKTIF
    useEffect(() => {
        if (isOpen) {
            const sessionAgenId = localStorage.getItem('active_agen_id') || sessionStorage.getItem('active_agen_id') || '';

            console.log("🛸 [SESSION DETECTED] Mengunci Kode Agen ID untuk BTT:", sessionAgenId);

            setFormData(prev => ({
                ...prev,
                bttt_asalagenid: sessionAgenId,
                bttt_tanggal: prev.bttt_tanggal || new Date().toISOString().split('T')[0]
            }));
        }
    }, [isOpen]);

    // --- 🔍 EFFECT 1: Autocomplete PELANGGAN (mkt_m_customer) ---
    useEffect(() => {
        const namaPelanggan = keywordCustomer.trim();

        if (isCustomerSelected) {
            setIsCustomerSelected(false);
            return;
        }

        if (namaPelanggan === "") {
            const token = localStorage.getItem('token');
            const kodeAgenAktif = localStorage.getItem('active_agen_id') || '';

            console.log("⚙️ [BTT Engine] Kolom kosong, mengunci ke mode retail UMUM...");

            api.get(`/btt/generate-custid?kode_agen=${kodeAgenAktif}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => {
                    if (res.data && res.data.status === "success") {
                        setFormData(prev => ({ ...prev, bttt_asalcustid: res.data.cust_id }));
                    }
                })
                .catch(err => console.warn("Gagal inisialisasi default retail ID:", err));
        }

        if (keywordCustomer && keywordCustomer.length >= 1) {
            const token = localStorage.getItem('token');
            api.get(`/btt/search-customer?search=${encodeURIComponent(keywordCustomer)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            })
                .then(res => res.json())
                .then(response => {
                    if (response && response.status === "success") {
                        setRekomendasiCustomer(response.data);
                    }
                }).catch(err => console.warn(err));
        } else {
            setRekomendasiCustomer([]);
        }
    }, [keywordCustomer]);

    // 2. Efek Autocomplete Area Kirim (Kecamatan)
    useEffect(() => {
        if (isKecamatanSelected) {
            setIsKecamatanSelected(false);
            return;
        }

        if (keywordKecamatan && keywordKecamatan.length >= 3) {
            const token = localStorage.getItem('token');
            api.get(`/btt/search-area?search=${encodeURIComponent(keywordKecamatan)}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            })
                .then(res => {
                    if (!res.ok) throw new Error(`Server backend Go merespon dengan status: ${res.status}`);
                    return res.json();
                })
                .then(response => {
                    if (response && response.status === "success") {
                        setRekomendasiArea(response.data);
                    }
                })
                .catch(err => {
                    console.warn("[BttFormModal] Info: Backend Go belum aktif atau rute belum siap.", err.message);
                    setRekomendasiArea([]);
                });
        } else {
            setRekomendasiArea([]);
        }
    }, [keywordKecamatan]);

    // 4. Efek hitung otomatis Berat Volume
    useEffect(() => {
        const p = parseFloat(formData.bttt_panjang) || 0;
        const l = parseFloat(formData.bttt_lebar) || 0;
        const t = parseFloat(formData.bttt_tinggi) || 0;
        if (p > 0 && l > 0 && t > 0) {
            const vol = (p * l * t) / 4000;
            setFormData(prev => ({ ...prev, bttt_beratvol: parseFloat(vol.toFixed(2)) }));
        } else {
            setFormData(prev => ({ ...prev, bttt_beratvol: 0 }));
        }
    }, [formData.bttt_panjang, formData.bttt_lebar, formData.bttt_tinggi]);

    const validateEmailPenerima = (emailVal) => {
        if (!emailVal || emailVal.trim() === "") {
            setEmailPenerimaError('');
            return true;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailVal.trim())) {
            setEmailPenerimaError("Format email salah! Harus mengandung '@' dan nama domain (contoh: penerima@email.com)");
            return false;
        } else {
            setEmailPenerimaError('');
            return true;
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const kolomsUppercase = ['bttt_asalname', 'bttt_asalalamat', 'bttt_asalkota', 'bttt_up', 'bttt_isikiriman'];
        let finalValue = type === 'checkbox' ? (checked ? 'Y' : 'N') : value;

        if (typeof finalValue === 'string' && kolomsUppercase.includes(name)) {
            finalValue = finalValue.toUpperCase();
        }

        setFormData((prev) => ({ ...prev, [name]: finalValue }));
        if (errors[name]) { setErrors(prev => ({ ...prev, [name]: null })); }
        if (name === 'bttt_tujuanemail') { validateEmailPenerima(finalValue); }
    };

    const handleHitungTarif = async () => {
        if (!formData.bttt_asalagenid || !formData.bttt_tujuankecamatan) {
            console.warn("⚠️ [Tarif Guard] Perhitungan ditolak! Kode agen atau kecamatan masih kosong.");
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
            const res = await api.get('/btt/calculate-tarif', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    asal_kota: String(formData.bttt_asalagenid || "").trim(),
                    tujuan_kecamatan: formData.bttt_tujuankecamatan,
                    agen_id: String(formData.bttt_asalagenid || "").trim(),
                    berat_asli: parseFloat(formData.bttt_berat) || 1,
                    panjang: parseFloat(formData.bttt_panjang) || 0,
                    lebar: parseFloat(formData.bttt_lebar) || 0,
                    tinggi: parseFloat(formData.bttt_tinggi) || 0,
                    jenis_layanan: formData.bttt_paketyn === 'Y' ? 'REGULER' : 'EKONOMIS'
                })
            });

            const data = await res.json();
            if (res.ok) {
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
            console.error("Gagal hitung tarif:", err);
        } finally {
            setLoadingTarif(false);
        }
    };

    // 🌟 REKAYASA TOTAL: FE BERSURAT MURNI, 100% DINAMIS BEBAS HARDCODE SE-INDONESIA
    const fetchTarifRute = async (agenIdRaw, tujuanKecamatan) => {
        if (!tujuanKecamatan) return;

        try {
            const token = localStorage.getItem('token');
            const cleanAgenID = String(agenIdRaw || formData.bttt_asalagenid || "").trim();

            console.log(`📡 [DYNAMIC API ROUTE] Menembak Kode Agen: "${cleanAgenID}" ➡️ Kecamatan: "${tujuanKecamatan}"`);

            const response = await axios.post(
                ,
                {
                    asal_kota: cleanAgenID,
                    tujuan_kecamatan: tujuanKecamatan,
                    agen_id: cleanAgenID,
                    berat_asli: parseFloat(formData.bttt_berat) || 1,
                    jenis_layanan: formData.bttt_paketyn === 'Y' ? 'REGULER' : 'EKONOMIS'
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

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

    // Pemicu AJAX saat user mengetik di kolom mana saja
    const handleLiveSearchGeo = async (fieldName, value) => {
        setFormData(prev => ({ ...prev, [fieldName]: value.toUpperCase() }));
        setFocusedField(fieldName);

        // 🟢 UBAH DI SINI: Cukup ketik minimal 1 huruf langsung tembus ke backend!
        if (value.trim().length < 1) {
            setGeoSuggestions([]);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/btt/search-geo?q=${encodeURIComponent(value)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data && res.data.status === "success") {
                setGeoSuggestions(res.data.data);
            }
        } catch (err) {
            setGeoSuggestions([]);
        }
    };

    // Pemicu saat salah satu item dropdown database di-klik oleh user
    const handleSelectGeo = async (item) => {
        console.log("🎯 KECAMATAN TERKUNCI:", item);

        setFormData(prev => ({
            ...prev,
            bttt_tujuanpropinsi: item.propinsi || '',
            bttt_tujuankota: item.kabupaten || '',
            bttt_tujuankecamatan: item.kecamatan || '',
            bttt_tujuankelurahan: '', // 🟢 Kosongkan agar user mencari kelurahannya sendiri
            bttt_tujuankodepos: '',   // 🟢 Menunggu kelurahan dipilih
            bttt_tujuanagenid: "CABANG " + (item.kabupaten || ''),
            bttt_kodecabangagen: ""   // 🟢 Menunggu kodepos kelurahan sah
        }));

        setGeoSuggestions([]);
        setFocusedField(null);

        // Ambil data kelurahan dari backend berdasarkan kecamatan yang baru saja dikunci
        if (item.kecamatan) {
            try {
                const token = localStorage.getItem('token');
                const res = await api.get(`/btt/get-kelurahan?kecamatan=${encodeURIComponent(item.kecamatan)}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data && res.data.status === "success") {
                    setKelurahanSuggestions(res.data.data); // Simpan list kelurahan sedesa
                }
            } catch (err) {
                console.warn("Gagal memuat sub-kelurahan", err);
            }
        }
    };

    // 🟢 BARU: Aksi ketika item kelurahan dipilih dari drop-down gambar 2
    const handleSelectKelurahan = async (subItem) => {
        setFormData(prev => ({
            ...prev,
            bttt_tujuankelurahan: subItem.kelurahan,
            bttt_tujuankodepos: subItem.kodepos,
            bttt_kodecabangagen: "DK-" + subItem.kodepos
        }));

        setFocusedField(null);

        // 🚀 Pemicu Hitung Tarif Otomatis langsung jalan setelah kelurahan & kodepos sah!
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
                    text: 'Identitas kode agen aktif tidak terdeteksi di browser Anda. Mohon lakukan login ulang akun loket Anda demi keamanan audit transaksi kargo!',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
                return;
            }

            console.log("🚀 Data sukses melewati asuransi flow, menembak database Go:", payloadKargo);

            const response = await axios.post(
                ,
                {
                    id: finalResiID,
                    bttt_tanggal: payloadKargo.bttt_tanggal,
                    bttt_asalagenid: parseInt(sessionAgenId),

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
                },
                { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
            );

            if (response.data && response.data.status === "success") {
                const nomorBttResmiDariGo = response.data.btt_no || finalResiID;
                console.log("🦅 Nomor Sah yang Berhasil Masuk DB:", nomorBttResmiDariGo);

                localStorage.setItem('print_btt_payload', JSON.stringify(payloadKargo));
                localStorage.setItem('print_btt_number', nomorBttResmiDariGo);

                onClose();

                Swal.fire({
                    title: 'SUKSES SIMPAN DATABASE!',
                    html: `
            <div style="font-family: sans-serif; padding: 5px;">
                <p style="color: #4b5563; margin-bottom: 8px;">Data transaksi BTT logistik berhasil disimpan dengan nomor resi sah:</p>
                <h2 style="font-size: 24px; font-weight: 900; color: #059669; background-color: #ecfdf5; padding: 10px; border-radius: 8px; border: 1px solid #a7f3d0; tracking-spacing: 1px;">${nomorBttResmiDariGo}</h2>
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
            Swal.fire('PROSES CLOSING GAGAL!', error.response?.data?.error || 'Gagal', 'error');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const activeAgenId = localStorage.getItem('active_agen_id') || '839';
        const activeUser = localStorage.getItem('active_user_name') || 'LOKET_ADMIN';

        // Auto generate ID murni
        const tanggalMentah = formData.bttt_tanggal;
        const komponenTanggal = tanggalMentah.split('-');
        const tahunYY = komponenTanggal[0] ? komponenTanggal[0].substring(2, 4) : "26";
        const bulanMM = komponenTanggal[1] ? komponenTanggal[1] : "06";
        const prefixID = "A" + activeAgenId + bulanMM + tahunYY;

        executeFinalSaveDataToGolang(formData, prefixID + "00001");
    };

    const handleHitungTarifOtomatis = () => {
        handleHitungTarif();
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

    const RenderDropdownMelayang = () => (
        <div className="absolute left-0 right-0 top-[60px] bg-white border-2 border-teal-400 text-slate-900 rounded-xl shadow-2xl z-[99999] max-h-48 overflow-y-auto text-sm text-left block">
            {geoSuggestions.map((item, idx) => (
                <div
                    key={idx}
                    onClick={() => handleSelectGeo(item)}
                    className="p-3 hover:bg-teal-100 cursor-pointer border-b last:border-b-0 font-bold text-slate-800 transition-colors py-3.5"
                >
                    📍 <span className="text-teal-600">{item.kecamatan}</span> - <span className="text-gray-500 text-xs font-normal">{item.kelurahan}, {item.kabupaten}, {item.propinsi} [{item.kodepos}]</span>
                </div>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'} w-full max-w-[95vw] xl:max-w-7xl max-h-[95vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden transition-all duration-500`}>

                {/* Header */}
                <div className="p-8 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <Package className="text-indigo-600" size={24} />
                        </div>
                        <h2 className="text-xl font-bold">Entry Bukti Tanda Terima (BTT)</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-10 pb-20 overflow-y-auto space-y-10 scrollbar-thin scrollbar-thumb-gray-300">

                    {/* ROW 1: TANGGAL PENGIRIMAN */}
                    <div className="p-6 rounded-2xl border-2 border-gray-100 dark:border-gray-800">
                        <label className="text-sm font-bold text-red-600 uppercase">* Tanggal Pengiriman : </label>
                        <input
                            type="date"
                            name="bttt_tanggal"
                            value={formData.bttt_tanggal}
                            onChange={handleChange}
                            min={strHariIni}
                            max={strLusa}
                            className="w-full md:w-1/3 mt-3 p-4 text-lg rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none transition-all shadow-sm font-bold text-indigo-700 bg-indigo-50/50"
                        />
                    </div>

                    {/* ROW 2: INFORMASI PENGIRIM VS PENERIMA */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* SECTION PENGIRIM */}
                        <div className="p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                            <h3 className="text-center font-black text-red-600 text-lg tracking-widest uppercase pb-2 border-b-2 border-red-50">📦 Informasi Pengirim Barang</h3>
                            <div className="grid grid-cols-2 gap-5">

                                {/* 1. AUTOCOMPLETE PELANGGAN */}
                                <div className="relative w-full flex flex-col">
                                    <label className="text-xs font-black text-gray-500 uppercase">Pelanggan</label>
                                    <input
                                        type="text"
                                        className="w-full mt-1 p-3 border rounded-xl font-bold uppercase"
                                        value={keywordCustomer || formData.bttt_asalname}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setKeywordCustomer(val);
                                            setFormData(prev => ({ ...prev, bttt_asalname: val }));
                                        }}
                                        placeholder="Ketik Pelanggan / Kosongkan = UMUM"
                                    />

                                    {Array.isArray(rekomendasiCustomer) && rekomendasiCustomer.length > 0 && (
                                        <div className="absolute top-[75px] left-0 w-full bg-white border-2 border-red-400 rounded-xl shadow-2xl z-[999999] max-h-40 overflow-y-auto text-sm">
                                            {rekomendasiCustomer.map((cust, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-3 hover:bg-red-50 cursor-pointer border-b last:border-b-0 font-bold text-slate-800 transition-colors"
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
                                                    🏢 {cust.cust_name} <span className="text-xs text-red-600 font-mono">[{cust.cust_id}]</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {errors.bttt_asalname && (
                                        <span className="text-xs font-bold text-red-500 mt-1">{errors.bttt_asalname}</span>
                                    )}
                                </div>

                                {/* 2. CUST ID */}
                                <div className="flex flex-col">
                                    <label className="text-xs font-black text-gray-500 uppercase">Cust ID</label>
                                    <input type="text" readOnly className="w-full mt-1 p-3 bg-gray-100 border border-red-300 rounded-xl font-mono font-bold text-red-700 cursor-not-allowed" value={formData.bttt_asalcustid} placeholder="Mencari / Generate..." />
                                </div>

                                {/* 3. NAMA PENGIRIM */}
                                <div className="col-span-2 relative w-full flex flex-col">
                                    <label className="text-xs font-black text-red-600 uppercase">* Nama Pengirim / UP</label>
                                    <input
                                        type="text"
                                        className="w-full mt-1 p-3 border-2 border-amber-300 rounded-xl font-bold outline-none uppercase"
                                        value={formData.bttt_up || ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setFormData(prev => ({ ...prev, bttt_up: val }));
                                        }}
                                        placeholder="Cari Riwayat Pengirim / Ketik Baru..."
                                    />
                                </div>

                                {/* ALAMAT LENGKAP PENGIRIM */}
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Alamat Lengkap Pengirim</label>
                                    <textarea
                                        name="bttt_asalalamat"
                                        value={formData.bttt_asalalamat || ""}
                                        onChange={handleChange}
                                        className="w-full mt-1 p-3 border rounded-xl uppercase"
                                        rows="2"
                                        placeholder="Alamat gudang/rumah pengirim..."
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Kota Asal</label>
                                    <input
                                        type="text"
                                        name="bttt_asalkota"
                                        value={formData.bttt_asalkota || ""}
                                        onChange={handleChange}
                                        className="w-full mt-1 p-3 border rounded-xl font-bold uppercase"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Telepon Pengirim</label>
                                    <input
                                        type="text"
                                        name="bttt_asaltelp"
                                        value={formData.bttt_asaltelp || ""}
                                        onChange={handleChange}
                                        className="w-full mt-1 p-3 border rounded-xl"
                                        placeholder="08xxxxxxxxxx"
                                    />
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <label className="text-xs font-black text-gray-500 uppercase">Telepon 2</label>
                                    <input type="text" name="bttt_asaltelp2" value={formData.bttt_asaltelp2} onChange={handleChange} className="w-full mt-1.5 p-4 border-2 border-gray-200 rounded-xl text-lg" placeholder="0812..." />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="text-xs font-black text-gray-500 uppercase">Email Pengirim</label>
                                    <input
                                        type="email"
                                        name="bttt_asalemail"
                                        value={formData.asal_email || formData.bttt_asalemail || ""}
                                        onChange={handleChange}
                                        className="w-full mt-1.5 p-4 border-2 border-gray-200 rounded-xl text-lg"
                                        placeholder="contoh@email.com"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION PENERIMA */}
                        <div className="p-6 rounded-3xl border-t-8 border-blue-600 shadow-xl shadow-gray-100 dark:shadow-none border-x border-b border-gray-100 dark:border-gray-800 space-y-6">
                            <h3 className="text-center font-black text-blue-600 text-lg tracking-widest uppercase pb-2 border-b-2 border-blue-50">Informasi Penerima Barang</h3>
                            <div className="grid grid-cols-6 gap-5">
                                <div className="col-span-6">
                                    <label className="text-xs font-black text-blue-600 uppercase">Penerima</label>
                                    <input
                                        type="text"
                                        name="bttt_tujuannama"
                                        value={formData.bttt_tujuannama}
                                        onChange={handleChange}
                                        className="w-full mt-1.5 p-4 border-2 border-gray-200 rounded-xl text-lg focus:border-blue-400 outline-none"
                                        placeholder="Masukkan Nama Penerima..."
                                    />
                                </div>
                                <div className="col-span-6">
                                    <label className="text-xs font-black text-gray-500 uppercase">UP / Nama</label>
                                    <input
                                        type="text"
                                        name="bttt_up_penerima"
                                        value={formData.bttt_up_penerima}
                                        onChange={handleChange}
                                        className="w-full mt-1.5 p-4 border-2 border-gray-200 rounded-xl text-lg"
                                        placeholder="Masukkan UP / Nama..."
                                    />
                                </div>
                                <div className="col-span-6">
                                    <label className="text-xs font-black text-gray-500 uppercase">Email Penerima</label>
                                    <input
                                        type="text"
                                        name="bttt_tujuanemail"
                                        value={formData.bttt_tujuanemail || ""}
                                        onChange={(e) => {
                                            handleChange(e);
                                            validateEmailPenerima(e.target.value);
                                        }}
                                        className={`w-full mt-1.5 p-4 border-2 rounded-xl text-lg outline-none transition-all duration-300 ${emailPenerimaError
                                            ? 'border-red-500 bg-red-50/20 text-red-900 focus:ring-4 focus:ring-red-100'
                                            : formData.bttt_tujuanemail && !emailPenerimaError
                                                ? 'border-emerald-500 bg-emerald-50/10 text-emerald-900 focus:ring-4 focus:ring-emerald-100'
                                                : 'border-gray-200 bg-white text-gray-900 focus:border-blue-400'
                                            }`}
                                        placeholder="contohepenerima@email.com"
                                    />
                                    {emailPenerimaError && (
                                        <span className="text-xs font-bold text-red-500 mt-1.5 block animate-in fade-in slide-in-from-top-1 duration-200">
                                            ⚠️ {emailPenerimaError}
                                        </span>
                                    )}
                                </div>

                                <div className="col-span-6">
                                    <label className="text-xs font-black text-blue-600 uppercase">* Alamat Lengkap Penerima</label>
                                    <textarea
                                        name="bttt_tujuanalamat"
                                        value={formData.bttt_tujuanalamat || ""}
                                        onChange={handleChange}
                                        className={`w-full mt-1.5 p-4 border-2 rounded-xl text-lg outline-none focus:border-blue-400 ${errors.bttt_tujuanalamat ? 'border-red-500 bg-red-50/10' : 'border-gray-200'
                                            }`}
                                        rows="2"
                                        placeholder="Nama Jalan, RT/RW, Nomor Rumah, Patokan Wilayah..."
                                    />
                                    {errors.bttt_tujuanalamat && (
                                        <span className="text-xs font-bold text-red-500 mt-1 block">⚠️ {errors.bttt_tujuanalamat}</span>
                                    )}
                                </div>

                                <div className="col-span-6 md:col-span-2">
                                    <label className="text-xs font-black text-blue-600 uppercase">* Telepon 1</label>
                                    <input
                                        type="text"
                                        name="bttt_tujuantelp"
                                        value={formData.bttt_tujuantelp || ""}
                                        onChange={handleChange}
                                        className={`w-full mt-1.5 p-4 border-2 rounded-xl text-lg outline-none focus:border-blue-400 ${errors.bttt_tujuantelp ? 'border-red-500 bg-red-50/10' : 'border-gray-200'
                                            }`}
                                        placeholder="08xxxxxxxxxx"
                                    />
                                    {errors.bttt_tujuantelp && (
                                        <span className="text-xs font-bold text-red-500 mt-1 block">⚠️ {errors.bttt_tujuantelp}</span>
                                    )}
                                </div>

                                <div className="col-span-6 md:col-span-2">
                                    <label className="text-xs font-black text-gray-500 uppercase">Telepon 2</label>
                                    <input type="text" name="bttt_tujuantelp2" value={formData.bttt_tujuantelp2 || ""} onChange={handleChange} className="w-full mt-1.5 p-4 border-2 border-gray-200 rounded-xl text-lg" placeholder="08..." />
                                </div>
                                <div className="col-span-6 md:col-span-2">
                                    <label className="text-xs font-black text-gray-500 uppercase">Telepon 3</label>
                                    <input type="text" name="bttt_tujuantelp3" value={formData.bttt_tujuantelp3 || ""} onChange={handleChange} className="w-full mt-1.5 p-4 border-2 border-gray-200 rounded-xl text-lg" placeholder="08..." />
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* 📍 ROW 3: AREA KIRIM                                                       */}
                    {/* ========================================================================= */}
                    <div className="p-8 rounded-3xl border-l-8 border-teal-500 bg-teal-50/20 border-y border-r border-gray-100 space-y-6 relative">
                        <div className="flex items-center gap-3 border-b border-teal-100 pb-3">
                            <MapPin className="text-teal-600" size={20} />
                            <span className="font-black text-teal-700 text-lg uppercase tracking-widest">TUJUAN AREA KIRIM</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">

                            {/* 🏢 1. KECAMATAN */}
                            <div className="flex flex-col gap-1 w-full relative">
                                <label className="text-xs font-black text-teal-600 uppercase">* Kecamatan Utama (Cari)</label>
                                <input
                                    type="text"
                                    className="w-full h-14 p-4 border-2 border-teal-300 rounded-xl text-lg focus:border-teal-500 outline-none bg-white font-bold text-teal-900 shadow-sm"
                                    placeholder="Ketik 1 huruf..." // 🟢 Ubah placeholder
                                    value={formData.bttt_tujuankecamatan || ''}
                                    onChange={(e) => handleLiveSearchGeo('bttt_tujuankecamatan', e.target.value)}
                                    onFocus={() => setFocusedField('bttt_tujuankecamatan')}
                                />
                                {focusedField === 'bttt_tujuankecamatan' && geoSuggestions.length > 0 && <RenderDropdownMelayang />}
                            </div>

                            {/* 🏢 2. PROVINSI (READ ONLY) */}
                            <div className="flex flex-col gap-1 w-full relative">
                                <label className="text-xs font-black text-teal-600 uppercase">Provinsi</label>
                                <input
                                    type="text"
                                    readOnly // 🟢 Kunci mati biar user gak bisa asal ketik
                                    className="w-full h-14 p-4 border border-teal-200 bg-gray-50/70 rounded-xl text-lg outline-none font-bold text-gray-600 shadow-sm cursor-not-allowed"
                                    placeholder="Otomatis mengikuti kecamatan..."
                                    value={formData.bttt_tujuanpropinsi || ''}
                                // 🟢 Bersihkan onChange & onFocus karena gak butuh search mandiri lagi
                                />
                            </div>

                            {/* 🏢 3. KOTA / KABUPATEN (READ ONLY) */}
                            <div className="flex flex-col gap-1 w-full relative">
                                <label className="text-xs font-black text-teal-600 uppercase">Kota / Kabupaten</label>
                                <input
                                    type="text"
                                    readOnly // 🟢 Kunci mati demi keamanan data master harga kargo
                                    className="w-full h-14 p-4 border border-teal-200 bg-gray-50/70 rounded-xl text-lg outline-none font-bold text-gray-600 shadow-sm cursor-not-allowed"
                                    placeholder="Otomatis mengikuti kecamatan..."
                                    value={formData.bttt_tujuankota || ''}
                                // 🟢 Bersihkan onChange & onFocus
                                />
                            </div>

                            {/* 🏢 4. KELURAHAN */}
                            <div className="flex flex-col gap-1 w-full relative">
                                <label className="text-xs font-black text-teal-600 uppercase">Kelurahan</label>
                                <input
                                    type="text"
                                    className="w-full h-14 p-4 border-2 border-teal-300 rounded-xl text-lg focus:border-teal-500 outline-none bg-white font-bold text-teal-900 shadow-sm"
                                    placeholder="Ketik 1 huruf/pilih..."
                                    value={formData.bttt_tujuankelurahan || ''}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase();
                                        setFormData(prev => ({ ...prev, bttt_tujuankelurahan: val }));
                                        setFocusedField('bttt_tujuankelurahan');
                                    }}
                                    onFocus={() => setFocusedField('bttt_tujuankelurahan')}
                                />
                                {focusedField === 'bttt_tujuankelurahan' && kelurahanSuggestions.length > 0 && (
                                    <div className="absolute left-0 right-0 top-[60px] bg-white border-2 border-teal-400 text-slate-900 rounded-xl shadow-2xl z-[99999] max-h-48 overflow-y-auto text-sm text-left block">
                                        {kelurahanSuggestions
                                            // 🟢 PERBAIKAN: Gunakan .toUpperCase() dua arah agar pencarian string selalu akurat
                                            .filter(item => item.kelurahan.toUpperCase().includes((formData.bttt_tujuankelurahan || '').toUpperCase()))
                                            .map((subItem, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => handleSelectKelurahan(subItem)}
                                                    className="p-3 hover:bg-teal-100 cursor-pointer border-b last:border-b-0 font-bold text-slate-800 transition-colors py-3.5"
                                                >
                                                    Base Camp Desa: 🏘️ <span className="text-teal-600">{subItem.kelurahan}</span> - <span className="text-gray-500 text-xs font-normal">Kodepos: [{subItem.kodepos}]</span>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* BARIS DATA BAWAH: KODEPOS, CABANG, KODE AGEN (TETAP AUTOFILL READONLY) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                            <div className="flex flex-col gap-1 w-full">
                                <label className="text-xs font-black text-gray-500 uppercase">Kode Pos</label>
                                <input type="text" readOnly className="w-full h-14 p-4 border-2 border-gray-100 rounded-xl bg-gray-100/70 text-lg font-mono font-bold text-gray-700 cursor-not-allowed outline-none shadow-sm" value={formData.bttt_tujuankodepos || ''} placeholder="Otomatis..." />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-dashed border-teal-200">
                            <div>
                                <label className="text-xs font-bold text-orange-600">🏢 Cabang / Agen Penerima</label>
                                <input type="text" readOnly className="w-full mt-1 p-3 border-2 border-orange-200 bg-orange-50/30 rounded-xl font-bold text-orange-900 cursor-not-allowed outline-none" value={formData.bttt_tujuanagenid || ''} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-orange-600">🔑 Kode Cabang / Agen</label>
                                <input type="text" readOnly className="w-full mt-1 p-3 border-2 border-orange-200 bg-orange-50/30 rounded-xl font-mono font-bold text-orange-900 cursor-not-allowed outline-none" value={formData.bttt_kodecabangagen || ''} />
                            </div>
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* 📦 SECTION 3: INFORMASI KIRIMAN DAN LAYANAN                               */}
                    {/* ========================================================================= */}
                    <div className="p-6 rounded-2xl border-l-8 border-indigo-500 bg-indigo-50/10 border-y border-r space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <Layers className="text-indigo-600" size={18} />
                            <span className="font-bold text-indigo-700 text-sm uppercase tracking-wider">Informasi Kiriman & Layanan</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-2 bg-transparent">
                            <div className="flex flex-col justify-between border-b-2 md:border-b-0 md:border-r border-gray-100 dark:border-gray-700/50 pb-4 md:pb-0 md:pr-4">
                                <label className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-2">
                                    Jenis Pelayanan :
                                </label>
                                <div className="flex items-center gap-6 h-12">
                                    <label className="flex items-center gap-2.5 cursor-pointer font-bold text-slate-700 dark:text-gray-200 group">
                                        <input
                                            type="radio"
                                            name="jenis_pelayanan_radio"
                                            checked={formData.bttt_pilihcarter === ''}
                                            onChange={() => setFormData(prev => ({ ...prev, bttt_pilihcarter: '' }))}
                                            className="w-5 h-5 text-indigo-600 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-indigo-500"
                                        />
                                        <span className="group-hover:text-indigo-600 transition-colors">PAKET</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 cursor-pointer font-bold text-slate-700 dark:text-gray-200 group">
                                        <input
                                            type="radio"
                                            name="jenis_pelayanan_radio"
                                            checked={formData.bttt_pilihcarter !== ''}
                                            onChange={() => setFormData(prev => ({ ...prev, bttt_pilihcarter: 'BUILD UP' }))}
                                            className="w-5 h-5 text-indigo-600 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-indigo-500"
                                        />
                                        <span className="group-hover:text-indigo-600 transition-colors">CARTER</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex flex-col justify-between border-b-2 md:border-b-0 md:border-r border-gray-100 dark:border-gray-700/50 pb-4 md:pb-0 md:pr-4">
                                <label className={`text-xs font-black uppercase tracking-wider block mb-1 ${formData.bttt_pilihcarter !== '' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                    Pilih Carter :
                                </label>
                                <select
                                    name="bttt_pilihcarter"
                                    value={formData.bttt_pilihcarter}
                                    onChange={handleChange}
                                    disabled={formData.bttt_pilihcarter === ''}
                                    className={`w-full p-3 border rounded-xl font-bold transition-all outline-none ${formData.bttt_pilihcarter === ''
                                        ? 'bg-gray-50 dark:bg-gray-800/40 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed select-none'
                                        : 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-500 focus:border-indigo-500 shadow-sm'
                                        }`}
                                >
                                    <option value="">-- BUKAN MODAL CARTER (PAKET ACTIVE) --</option>
                                    <option value="BUILD UP">1. BUILD UP</option>
                                    <option value="COLT DIESEL">2. COLT DIESEL</option>
                                    <option value="FUSO">3. FUSO</option>
                                    <option value="FREEZER BOX">4. FREEZER BOX</option>
                                    <option value="TRONTON">5. TRONTON</option>
                                    <option value="WING BOX">6. WING BOX</option>
                                </select>
                            </div>

                            <div className="flex flex-col justify-between">
                                <label className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                                    Jenis Kiriman :
                                </label>
                                <select
                                    name="bttt_jeniskiriman"
                                    value={formData.bttt_jeniskiriman}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl font-bold bg-white dark:bg-gray-700 text-slate-800 dark:text-gray-100 focus:border-indigo-500 outline-none shadow-sm"
                                >
                                    <option value="BERAT">BERAT</option>
                                    <option value="UNIT">UNIT</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-bold text-indigo-600">Isi Kiriman :</label>
                                <input type="text" name="bttt_isikiriman" value={formData.bttt_isikiriman} onChange={handleChange} className="w-full mt-1 p-3 border rounded-xl font-semibold uppercase" placeholder="Masukkan isi kiriman" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-indigo-600">No. Surat Jalan :</label>
                                <input type="text" name="bttt_nosuratjalan" value={formData.bttt_nosuratjalan} onChange={handleChange} className="w-full mt-1 p-3 border rounded-xl font-mono font-semibold" placeholder="Masukkan nomor surat jalan" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-indigo-600">Keterangan :</label>
                                <input
                                    type="text"
                                    name="bttt_ket"
                                    value={formData.bttt_ket}
                                    onChange={handleChange}
                                    onFocus={() => {
                                        if (!formData.bttt_ket || formData.bttt_ket.trim() === "") {
                                            setFormData(prev => ({
                                                ...prev,
                                                bttt_ket: "SURAT JALAN KEMBALI"
                                            }));
                                        }
                                    }}
                                    className="w-full mt-1 p-3 border rounded-xl font-semibold uppercase"
                                    placeholder="Contoh: SURAT JALAN KEMBALI"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                            <div>
                                <label className="text-xs font-bold text-slate-600">Jumlah Barang / Unit (Koli) :</label>
                                <input type="number" name="bttt_jmlkoli" value={formData.bttt_jmlkoli} onChange={handleChange} min="1"
                                    className="w-full mt-1 p-3 border border-indigo-200 rounded-xl font-bold" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600">Berat Asli (Kilogram) :</label>
                                <input type="number" step="0.01" name="bttt_berat" value={formData.bttt_berat} onChange={handleChange}
                                    className="w-full mt-1 p-3 border border-indigo-200 rounded-xl font-bold" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600">Panjang (cm) :</label>
                                <input type="number" name="bttt_panjang" value={formData.bttt_panjang || 0} onChange={handleChange} min="0"
                                    className="w-full mt-1 p-3 border border-indigo-200 rounded-xl font-bold" placeholder="0" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600">Lebar (cm) :</label>
                                <input type="number" name="bttt_lebar" value={formData.bttt_lebar || 0} onChange={handleChange} min="0"
                                    className="w-full mt-1 p-3 border border-indigo-200 rounded-xl font-bold" placeholder="0" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600">Tinggi (cm) :</label>
                                <input type="number" name="bttt_tinggi" value={formData.bttt_tinggi || 0} onChange={handleChange} min="0"
                                    className="w-full mt-1 p-3 border border-indigo-200 rounded-xl font-bold" placeholder="0" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-amber-600">Berat Volume (Kilogram / m3) :</label>
                                <input type="text" readOnly
                                    className="w-full mt-1 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl font-bold cursor-not-allowed" value={formData.bttt_beratvol} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600">Kubikasi (m3) :</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="bttt_ukuran"
                                    value={formData.bttt_ukuran || ''}
                                    onChange={handleChange}
                                    className="w-full mt-1 p-3 border border-indigo-200 rounded-xl font-bold"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* 📑 SECTION 4: INFORMASI TARIF DASAR                                       */}
                    {/* ========================================================================= */}
                    <div className="p-6 rounded-2xl border-l-8 border-teal-500 bg-teal-50/20 dark:bg-teal-950/20 border-y border-r border-teal-100 dark:border-teal-900/50 space-y-5">
                        <div className="flex items-center gap-2 border-b pb-2 border-teal-100 dark:border-gray-700">
                            <Layers className="text-teal-600 dark:text-teal-400" size={18} />
                            <span className="font-bold text-teal-700 dark:text-teal-300 text-sm uppercase tracking-wider">
                                Informasi Tarif Dasar (Rute: {formData.bttt_asalkota || 'BANDAR LAMPUNG'} ➡️ {formData.bttt_tujuankecamatan || 'CILANDAK'})
                            </span>
                        </div>

                        <div className="space-y-2">
                            <div className="w-full bg-purple-600 dark:bg-purple-700 text-white font-black text-xs uppercase p-2.5 rounded-lg tracking-widest text-left pl-4 shadow-sm select-none">
                                🟣 BLOK LAYANAN : DARAT REGULER
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-purple-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-sm">
                                <table className="w-full text-left border-collapse min-w-[1300px]">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700 text-[11px] font-black uppercase text-slate-700 dark:text-white tracking-wider bg-slate-50 dark:bg-gray-800/50">
                                            <th className="p-2 text-center w-12 rounded-l-lg">PILIH</th>
                                            <th className="p-2 text-center w-12">LT</th>
                                            <th className="p-2 text-right">DASAR</th>
                                            <th className="p-2 text-center">KG MIN</th>
                                            <th className="p-2 text-center">KG NEXT</th>
                                            <th className="p-2 text-center">AMBIL SDR</th>
                                            <th className="p-2 text-center text-purple-700 dark:text-purple-300">DISKON-1 KG</th>
                                            <th className="p-2 text-right text-purple-700 dark:text-purple-300">DISKON-1 RP</th>
                                            <th className="p-2 text-center text-indigo-700 dark:text-indigo-300">DISKON-2 KG</th>
                                            <th className="p-2 text-right text-indigo-700 dark:text-indigo-300">DISKON-2 RP</th>
                                            <th className="p-2 text-center text-teal-700 dark:text-teal-300">DISKON-3 KG</th>
                                            <th className="p-2 text-right text-teal-700 dark:text-teal-300">DISKON-3 RP</th>
                                            <th className="p-2 text-center">KET</th>
                                            <th className="p-2 text-right text-orange-600 dark:text-orange-400">HARGA PENERUS</th>
                                            <th className="p-2 text-center text-orange-600 dark:text-orange-400 rounded-r-lg">KG.MIN PENERUS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs font-bold text-slate-800 dark:text-gray-100">
                                        <tr className="hover:bg-slate-50/50 dark:hover:bg-gray-700/40 transition-colors">
                                            <td className="p-2 text-center">
                                                <input
                                                    type="radio"
                                                    name="pilih_tarif_layanan_reg"
                                                    checked={formData.bttt_paketyn === 'Y'}
                                                    onChange={() => setFormData(prev => ({ ...prev, bttt_paketyn: 'Y', bttt_harga: tarifRegulerData?.hargapokok || 0 }))}
                                                    className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500 cursor-pointer"
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input type="text" readOnly className="w-full p-2 text-right bg-white border border-gray-200 text-slate-900 rounded-lg font-bold shadow-sm" value={Math.round(tarifRegulerData?.estimasihari || 0).toLocaleString('id-ID')} />
                                            </td>
                                            <td className="p-1"><input type="text" readOnly className="w-full p-2 text-right bg-white border border-gray-200 text-slate-900 rounded-lg font-bold shadow-sm" value={Math.round(tarifRegulerData?.hargapokok || 0).toLocaleString('id-ID')} /></td>
                                            <td className="p-1"><input type="text" readOnly className="w-full p-2 text-center bg-white border border-gray-200 text-indigo-600 rounded-lg font-black shadow-sm" value={tarifRegulerData?.minimalkg || 0} /></td>
                                            <td className="p-1"><input type="text" readOnly className="w-full p-2 text-center bg-white border border-gray-200 text-slate-900 rounded-lg font-bold shadow-sm" value={Math.round(tarifRegulerData?.hargakgselanjutnya || 0).toLocaleString('id-ID')} /></td>
                                            <td className="p-1"><input type="text" readOnly className="w-full p-2 text-center bg-slate-100 border border-gray-200 text-slate-500 rounded-lg font-mono shadow-sm" value={tarifRegulerData?.flag_ds || 'N'} /></td>
                                            <td className="p-1"><input type="text" readOnly className="w-full p-2 text-center bg-white border border-purple-200 text-purple-600 rounded-lg shadow-sm" value={tarifRegulerData?.bypass1kg || 0} /></td>
                                            <td className="p-1"><input type="text" readOnly className="w-full p-2 text-right bg-white border border-purple-200 text-purple-600 rounded-lg shadow-sm" value={Math.round(tarifRegulerData?.harga1kg || 0).toLocaleString('id-ID')} /></td>
                                            <td className="p-1"><input type="text" readOnly className="w-full p-2 text-center bg-white border border-indigo-200 text-indigo-600 rounded-lg shadow-sm" value={tarifRegulerData?.bypass2kg || 0} /></td>
                                            <td className="p-1"><input type="text" readOnly className="w-full p-2 text-right bg-white border border-indigo-200 text-indigo-600 rounded-lg shadow-sm" value={Math.round(tarifRegulerData?.harga2kg || 0).toLocaleString('id-ID')} /></td>
                                            <td className="p-1"><input type="text" readOnly className="w-full p-2 text-center bg-white border border-teal-200 text-teal-600 rounded-lg shadow-sm" value={tarifRegulerData?.bypass3kg || 0} /></td>
                                            <td className="p-1"><input type="text" readOnly className="w-full p-2 text-right bg-white border border-teal-200 text-teal-600 rounded-lg shadow-sm" value={Math.round(tarifRegulerData?.harga3kg || 0).toLocaleString('id-ID')} /></td>
                                            <td className="p-1"><input type="text" readOnly className="w-full p-2 bg-slate-50 border border-gray-200 text-gray-400 rounded-lg text-center shadow-sm" value={tarifRegulerData?.keterangan || '---'} /></td>
                                            <td className="p-1"><input type="text" readOnly className="w-full p-2 text-right bg-white border border-gray-200 text-orange-600 rounded-lg font-bold shadow-sm" value={Math.round(tarifRegulerData?.biayatambahan || 0).toLocaleString('id-ID')} /></td>
                                            <td className="p-1"><input type="text" readOnly className="w-full p-2 text-center bg-white border border-gray-200 text-orange-600 rounded-lg shadow-sm" value="0" /></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <div className="w-full bg-emerald-600 text-white font-black text-xs uppercase p-2.5 rounded-lg tracking-widest text-left pl-4 shadow-sm select-none">
                                🟢 BLOK LAYANAN : DARAT EKONOMIS
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-emerald-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-sm">
                                <table className="w-full text-left border-collapse min-w-[1300px]">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700 text-[11px] font-black uppercase text-slate-700 dark:text-white tracking-wider bg-slate-50 dark:bg-gray-800/50">
                                            <th className="p-2 text-center w-12 rounded-l-lg">PILIH</th>
                                            <th className="p-2 text-center w-12">LT</th>
                                            <th className="p-2 text-right">DASAR</th>
                                            <th className="p-2 text-center">KG MIN</th>
                                            <th className="p-2 text-center">KG NEXT</th>
                                            <th className="p-2 text-center">AMBIL SDR</th>
                                            <th className="p-2 text-center text-emerald-600 dark:text-emerald-300">DISKON-1 KG</th>
                                            <th className="p-2 text-right text-emerald-600 dark:text-emerald-300">DISKON-1 RP</th>
                                            <th className="p-2 text-center text-indigo-600 dark:text-indigo-300">DISKON-2 KG</th>
                                            <th className="p-2 text-right text-indigo-600 dark:text-indigo-300">DISKON-2 RP</th>
                                            <th className="p-2 text-center text-teal-600 dark:text-teal-300">DISKON-3 KG</th>
                                            <th className="p-2 text-right text-teal-600 dark:text-teal-300">DISKON-3 RP</th>
                                            <th className="p-2 text-center">KET</th>
                                            <th className="p-2 text-right text-orange-600 dark:text-orange-400">HARGA PENERUS</th>
                                            <th className="p-2 text-center text-orange-600 dark:text-orange-400 rounded-r-lg">KG.MIN PENERUS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs font-bold text-slate-800 dark:text-gray-100">
                                        <tr className="hover:bg-slate-50/50 dark:hover:bg-gray-700/40 transition-colors">
                                            <td className="p-2 text-center">
                                                <input
                                                    type="radio"
                                                    name="pilih_tarif_layanan_eko"
                                                    checked={formData.bttt_paketyn === 'N'}
                                                    onChange={() => setFormData(prev => ({ ...prev, bttt_paketyn: 'N', bttt_harga: tarifEkonomisData?.hargapokok || 0 }))}
                                                    className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer"
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className="w-full p-2 text-right bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-slate-900 dark:text-white rounded-lg outline-none font-bold shadow-sm"
                                                    value={Math.round(tarifEkonomisData?.estimasihari || 0).toLocaleString('id-ID')}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className="w-full p-2 text-right bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-slate-900 dark:text-white rounded-lg outline-none font-bold shadow-sm"
                                                    value={Math.round(tarifEkonomisData?.hargapokok || 0).toLocaleString('id-ID')}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className="w-full p-2 text-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-indigo-600 dark:text-indigo-400 rounded-lg outline-none font-black shadow-sm"
                                                    value={tarifEkonomisData?.minimalkg || 0}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className="w-full p-2 text-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-slate-900 dark:text-white rounded-lg outline-none font-bold shadow-sm"
                                                    value={Math.round(tarifEkonomisData?.hargakgselanjutnya || 0).toLocaleString('id-ID')}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className="w-full p-2 text-center bg-slate-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-slate-500 dark:text-gray-300 rounded-lg font-mono outline-none shadow-sm"
                                                    value={tarifEkonomisData?.flag_ds || 'N'}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className="w-full p-2 text-center bg-white dark:bg-gray-700 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-lg outline-none shadow-sm font-bold"
                                                    value={tarifEkonomisData?.bypass1kg || 0}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className="w-full p-2 text-right bg-white dark:bg-gray-700 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-lg outline-none shadow-sm font-bold"
                                                    value={Math.round(tarifEkonomisData?.harga1kg || 0).toLocaleString('id-ID')}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className="w-full p-2 text-center bg-white dark:bg-gray-700 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-lg outline-none shadow-sm font-bold"
                                                    value={tarifEkonomisData?.bypass2kg || 0}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className="w-full p-2 text-right bg-white dark:bg-gray-700 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-lg outline-none shadow-sm font-bold"
                                                    value={Math.round(tarifEkonomisData?.harga2kg || 0).toLocaleString('id-ID')}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className="w-full p-2 text-center bg-white dark:bg-gray-700 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 rounded-lg outline-none shadow-sm font-bold"
                                                    value={tarifEkonomisData?.bypass3kg || 0}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className="w-full p-2 text-right bg-white dark:bg-gray-700 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 rounded-lg outline-none shadow-sm font-bold"
                                                    value={Math.round(tarifEkonomisData?.harga3kg || 0).toLocaleString('id-ID')}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className="w-full p-2 bg-slate-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-gray-400 rounded-lg text-center outline-none shadow-sm"
                                                    value={tarifEkonomisData?.keterangan || '---'}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className="w-full p-2 text-right bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-orange-600 dark:text-orange-400 rounded-lg outline-none font-bold shadow-sm"
                                                    value={Math.round(tarifEkonomisData?.biayatambahan || 0).toLocaleString('id-ID')}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className="w-full p-2 text-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-orange-600 dark:text-orange-400 rounded-lg outline-none shadow-sm"
                                                    value="0"
                                                />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* 💳 SECTION 5: INFORMASI PEMBAYARAN KIRIMAN                                */}
                    {/* ========================================================================= */}
                    <div className="p-6 rounded-2xl border-l-8 border-amber-500 bg-amber-50/10 border-y border-r space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <Layers className="text-amber-600" size={18} />
                            <span className="font-bold text-amber-700 text-sm uppercase tracking-wider">Informasi Pembayaran Kiriman</span>
                        </div>

                        <div className="p-4 bg-white rounded-xl border border-amber-100 space-y-4">
                            <div>
                                <label className="text-xs font-black text-amber-700 uppercase tracking-wider block mb-2">Pembayaran :</label>
                                <div className="flex items-center gap-8 font-bold text-sm text-slate-700">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="bttt_payment_group_modal" checked={formData.bttt_jenisharga === '0'} onChange={() => setFormData(prev => ({ ...prev, bttt_jenisharga: '0' }))} className="w-4 h-4 text-indigo-600" />
                                        <span>TUNAI</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="bttt_payment_group_modal" checked={formData.bttt_jenisharga === '2'} onChange={() => setFormData(prev => ({ ...prev, bttt_jenisharga: '2' }))} className="w-4 h-4 text-indigo-600" />
                                        <span>KREDIT</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="bttt_payment_group_modal" checked={formData.bttt_jenisharga === '1'} onChange={() => setFormData(prev => ({ ...prev, bttt_jenisharga: '1' }))} className="w-4 h-4 text-indigo-600" />
                                        <span>TAGIH TUJUAN</span>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="text-xs font-bold text-slate-500">BIAYA KIRIM :</label>
                                    <input type="text" readOnly className="w-full mt-1 p-3 bg-gray-50 border rounded-xl font-bold text-lg text-slate-700 cursor-not-allowed" value={`Rp ${(formData.bttt_harga).toLocaleString('id-ID')}`} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 flex items-center justify-between">
                                        <span>BIAYA LAIN-LAIN :</span>
                                        <label className="inline-flex items-center gap-1 text-xs font-normal text-slate-600 italic cursor-pointer">
                                            <input type="checkbox" name="bttt_dliexpryn" checked={formData.bttt_dliexpryn === 'Y'} onChange={(e) => setFormData(prev => ({ ...prev, bttt_dliexpryn: e.target.checked ? 'Y' : 'N' }))} className="rounded text-indigo-600" />
                                            <span>Sebagai Handling</span>
                                        </label>
                                    </label>
                                    <input type="number" name="bttt_biayapenerus" value={formData.bttt_biayapenerus || 0} onChange={handleChange} className="w-full mt-1 p-3 border rounded-xl font-bold text-lg text-slate-700" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-dashed">
                                {(() => {
                                    const totalNominalAkhir = formData.bttt_harga + (parseFloat(formData.bttt_biayapenerus) || 0) + (parseFloat(formData.bttt_biayapacking) || 0);
                                    return (
                                        <>
                                            <div>
                                                <label className="text-xs font-black text-indigo-600">TOTAL BIAYA :</label>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className="w-full mt-1 p-4 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl font-black text-xl cursor-not-allowed outline-none shadow-sm"
                                                    value={`Rp ${totalNominalAkhir.toLocaleString('id-ID')}`}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-black text-indigo-600">TERBILANG :</label>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className="w-full mt-1 p-4 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl font-bold text-sm cursor-not-allowed outline-none shadow-sm capitalize"
                                                    value={angkaKeTerbilang(totalNominalAkhir)}
                                                />
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            <div className="flex items-end pb-1.5">
                                <button
                                    type="button"
                                    onClick={handleHitungTarifOtomatis}
                                    disabled={loadingTarif}
                                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-base shadow-indigo-100"
                                >
                                    <Calculator size={20} />
                                    {loadingTarif ? 'Menghitung...' : 'Hitung Tarif Sekarang'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* 📦 SECTION 6: INFORMASI PACKING                                            */}
                    {/* ========================================================================= */}
                    <div className="p-6 rounded-2xl border-l-8 border-emerald-500 bg-emerald-50/10 border-y border-r space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <Layers className="text-emerald-600" size={18} />
                            <span className="font-bold text-emerald-700 text-sm uppercase tracking-wider">Informasi Packing</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-xl border border-emerald-100 items-end">
                            <div>
                                <label className="text-xs font-bold text-emerald-700">KODE PACKING :</label>
                                <input type="text" name="bttt_promoid" value={formData.bttt_promoid || ""} onChange={handleChange} className="w-full mt-1 p-3 border border-emerald-200 bg-emerald-50/20 rounded-xl font-bold font-mono" placeholder="Contoh: PCK-WOOD" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-emerald-700">BIAYA PACKING :</label>
                                <input type="number" name="bttt_biayapacking" value={formData.bttt_biayapacking || 0} onChange={handleChange} min="0" className="w-full mt-1 p-3 border border-gray-200 rounded-xl font-bold text-lg text-slate-700" />
                            </div>
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setIsPopUpPackingOpen(true)}
                                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 tracking-wide uppercase text-sm"
                                >
                                    TAMBAH PACKING
                                </button>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Batal</button>
                    <button
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center gap-2"
                        onClick={handleSubmit}>
                        <FileText size={18} />
                        Cetak Bukti Terima
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
// 📦 SUB-MODAL COMPONENT: POP-UP ORDER PACKING (PERMANEN BACKGROUND PUTIH BERSIH)
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