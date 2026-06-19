import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Plus, Filter, Search, Copy, MapPin, Building2, ShieldCheck, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';
import { MENU_LIST } from '../constants/menuList';
import { useDarkMode } from "../context/DarkModeContext";
import BttFormModal from '../components/organisms/BttFormModal';
import api from '../api/axios' // 🚀 Instance ini sudah siap pakai, Master!

const MarketingBTT = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false); 
    const [listKecamatanTujuan, setListKecamatanTujuan] = useState([]); // Menampung data dari backend
    const [selectedKecamatan, setSelectedKecamatan] = useState('');
    const [kodePosTujuan, setKodePosTujuan] = useState('');
    const token = localStorage.getItem('token');


    useEffect(() => {
        if (token) {
            setLoading(true);
            fetch('http://localhost:8080/api/marketing/btt', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            .then(res => res.json())
            .then(resData => {
                // Sesuaikan jika response backend kamu dibungkus objek lagi
                if (Array.isArray(resData)) {
                    setData(resData);
                } else if (resData && Array.isArray(resData.data)) {
                    setData(resData.data);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Gagal load list BTT:", err);
                setLoading(false);
            });
        }
    }, [token]);

    const columns = [
        { header: 'NO. BTT', accessor: 'id' },
        { header: 'TANGGAL', accessor: 'tanggal', render: (item) => new Date(item.tanggal).toLocaleDateString('id-ID') },
        { header: 'PENGIRIM', accessor: 'asal_name' },
        { header: 'PENERIMA', accessor: 'tujuan_nama' },
        { header: 'TUJUAN', accessor: 'tujuan_kota' },
        { header: "BARANG", accessor: "nama_barang" },
        { 
            header: 'HARGA', 
            accessor: 'harga', 
            render: (item) => <span className="font-bold text-green-600">Rp {(item.harga || 0).toLocaleString()}</span> 
        },
    ];

    const fetchBTT = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // JEDERRR! Arahkan ke endpoint BTT yang sudah kita buat di Go tadi
            const res = await axios.get(`http://localhost:8080/api/marketing/btt`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
        } catch (err) {
            console.error("Gagal tarik data BTT:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBTT();
    }, []);


    const handleSimpanBTT = () => {
        const token = localStorage.getItem('token');
        
        // Ambil kode agen penugasan aktif dari dropdown header atas kamu
        const activeAgenId = localStorage.getItem('active_agen_id') || ''; 

        // Bungkus payload data mengikuti tag json file btt.go kamu bro!
        const payload = {
            asal_name: namaPengirim,       // Cocok dengan json:"id" / json:"asal_name" di btt.go
            asal_kota: asalKotaState,     
            tujuan_nama: namaPenerima,     
            tujuan_kota: tujuanKotaState,  
            tujuan_kecamatan: tujuanKecState, 
            nama_barang: namaBarangState,  
            jml_pck: parseInt(jumlahPckState) || 0,
            berat: parseFloat(beratFinalState) || 0, // Ambil berat chargeable/final hitungan tarif
            harga: parseFloat(grandTotalHargaState) || 0, // Ambil harga total ongkir rupiah
            biaya_penerus: parseFloat(biayaPenerusState) || 0
        };

        console.log("Mengirim payload transaksi BTT ke Golang:", payload);

        fetch('http://localhost:8080/api/btt/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        })
        .then(res => {
            if (!res.ok) throw new Error("Gagal menyimpan transaksi kargo");
            return res.json();
        })
        .then(result => {
            if (result.status === "success") {
                alert(`🎉 JEDERRR! Transaksi Berhasil! Nomor Seri BTT: ${result.btt_no}`);
                window.location.reload(); // Refresh halaman biar list datatable utamamu ter-update!
            }
        })
        .catch(err => {
            console.error("Gagal insert data BTT:", err);
            alert("Mogok! Gagal melakukan simpan transaksi ke PostgreSQL.");
        });
    };

    // 🚀 INTERSEPTOR VALIDASI GERBANG LOKET HARIAN (SINKRON OPERASIONAL PUSAT)
    const handleKlikTambahBttDuaArah = async () => {
        const sessionAgenId = localStorage.getItem('active_agen_id') || sessionStorage.getItem('active_agen_id') || '839';
        
        try {
        const token = localStorage.getItem('token');
        // Tembak API pengecekan gerbang closing kemarin
        const response = await axios.get(`http://localhost:8080/api/btt/check-closing-gate?agen_id=${sessionAgenId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data && response.data.status === "blocked") {
            // 🛑 JEDERRR!!! BLOKIR TRANSKASI JALUR DARAT NASIONAL!
            Swal.fire({
            title: '🚨 GERBANG LOKET TERKUNCI!',
            html: `
                <div style="font-family: sans-serif; text-align: left; font-size: 13px; padding: 5px;">
                <p style="color: #ef4444; font-weight: 800; font-size: 14px; margin-bottom: 8px;">TRANSAKSI BTT BARU DITOLAK SISTEM!</p>
                <p style="color: #4b5563; leading: 1.5;">${response.data.message}</p>
                <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 8px; margin-top: 10px; border-radius: 4px; color: #c2410c; font-weight: bold;">
                    💡 Solusi: Masuk ke menu Marketing ➡️ Closing Harian Agen, lalu lakukan proses tutup buku untuk transaksi hari kemarin terlebih dahulu!
                </div>
                </div>
            `,
            icon: 'error',
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'SIAP, SAYA CLOSING DAHULU',
            customClass: { container: 'z-[999999]' }
            });
            return; // 🛑 KUNCI MATI JALUR: Batalkan pembukaan modal form input BTT!
        }

        // 🟢 JALUR AMAN: Jika allowed, silakan buka modal input BTT baru seperti biasa, Master!
        setIsModalBttOpen(true); // Ganti dengan nama state pengontrol buka modal BTT di file lu

        } catch (err) {
        console.error("Gagal verifikasi gerbang closing harian:", err);
        // Fallback aman: jika koneksi server gangguan, biarkan masuk atau kunci sesuai kebijakan audit
        setIsModalBttOpen(true);
        }
    };

    return (
        <div className="relative">
        <DataTableTemplate 
            title="BUKTI TANDA TERIMA (BTT)"
            columns={columns}
            data={data}
            loading={loading}
            isDarkMode={isDarkMode}
            actionMode="readonly_print"
            onAdd={async () => {
                // 1. Tarik parameter kasta role akses, identitas agen aktif, dan id cabang induk dari storage
                const currentRole = localStorage.getItem('role_akses');     
                const activeAgenId = localStorage.getItem('active_agen_id'); 
                const activeCabangId = localStorage.getItem('active_cabang_id'); // 🚀 Ambil Cabang ID dari session (e.g., 'PST001', 'HO')

                // =========================================================================
                // 🛡️ INTERCEPTOR MURNI 1: VALIDASI HOLDING SECARA DINAMIS (ANTI-HARDCODE)
                // =========================================================================
                // Cek secara dinamis: Jika cabang ID admin adalah holding pusat, blokir input BTT!
                if (!activeAgenId || activeAgenId === activeCabangId) {
                    Swal.fire({
                        title: 'SOP Kantor Pusat Terdeteksi!',
                        text: 'Mohon maaf, otoritas Kantor Pusat (Holding) tidak diperbolehkan menerbitkan atau membuat transaksi BTT baru secara langsung. Silakan pilih unit Agen atau Cabang operasional terlebih dahulu pada menu dropdown di pojok kanan atas untuk melanjutkan.',
                        icon: 'warning',
                        confirmButtonColor: '#4f46e5',
                        confirmButtonText: 'SIAP, SAYA PAHAM',
                        allowOutsideClick: false
                    });
                    return; // 🛑 KUNCI MATI JALUR!
                }

                // =========================================================================
                // 🛡️ INTERCEPTOR MURNI 2: CEGAT GERBANG CLOSING HARIAN H-1 DENGAN DYNAMIC ID
                // =========================================================================
                try {
                    setLoading(true);
                    // Gunakan axios instance 'api' agar token JWT otomatis menempel di header
                    const response = await api.get(`/btt/check-closing-gate?agen_id=${activeAgenId}`);

                    if (response.data && response.data.status === "blocked") {
                        // 🛑 BLOKIR JALUR JALAN: Hari kemarin belum closing harian!
                        Swal.fire({
                            title: '🚨 GERBANG LOKET TERKUNCI!',
                            html: `
                                <div style="font-family: sans-serif; text-align: left; font-size: 13px; padding: 5px;">
                                    <p style="color: #ef4444; font-weight: 800; font-size: 14px; margin-bottom: 8px;">TRANSAKSI BTT BARU DITOLAK SISTEM!</p>
                                    <p style="color: #4b5563; line-height: 1.5;">${response.data.message}</p>
                                    <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 8px; margin-top: 10px; border-radius: 4px; color: #c2410c; font-weight: bold;">
                                        💡 Solusi: Selesaikan proses tutup buku / closing harian untuk transaksi hari kemarin terlebih dahulu pada modul Closing Agen!
                                    </div>
                                </div>
                            `,
                            icon: 'error',
                            confirmButtonColor: '#ef4444',
                            confirmButtonText: 'SIAP, SAYA CLOSING DAHULU',
                            customClass: { container: 'z-[999999]' }
                        });
                        setLoading(false);
                        return; // 🛑 KUNCI MATI JALUR BTT BARU!
                    }

                } catch (err) {
                    console.error("Gagal melakukan verifikasi gerbang closing harian:", err);
                } finally {
                        setLoading(false);
                }

                // 🟢 Jika lolos seluruh rangkaian validasi dinamis, izinkan membuka modal form input data baru
                console.log("[MarketingBTT] Lolos seluruh saringan SOP dinamis untuk agen:", activeAgenId); //
                setIsModalOpen(true); //
            }}

            onEdit={(item) => {
                const targetResiID = item.id || "";
                console.log("🚀 [BTT Printer Compass] Membuka lembaran layout resi secara aman untuk ID:", targetResiID);

                const payloadFormatPrint = {
                    bttt_tanggal: item.tanggal,
                    bttt_nosuratjalan: item.no_surat_jalan || item.nosuratjalan || "",
                    bttt_ket: item.keterangan || item.ket || "",
                    bttt_isikiriman: item.nama_barang || item.isikiriman || "",
                    bttt_jmlkoli: parseInt(item.jumlah_koli || item.jmlkoli) || 1,
                    bttt_berat: parseFloat(item.berat) || 1,
                    bttt_beratvol: parseFloat(item.berat_volume || item.beratvol) || 0,
                    bttt_ukuran: parseFloat(item.kubikasi || item.ukuran) || 0,
                    bttt_harga: parseFloat(item.harga) || 0,
                    bttt_biayapenerus: parseFloat(item.biaya_penerus || item.biayatambahan) || 0,
                    bttt_biayapacking: parseFloat(item.biaya_packing || item.biayapacking) || 0,
                    bttt_paketyn: item.jenis_layanan === 'REGULER' || item.paketyn === 'Y' ? 'Y' : 'N',
                    bttt_jenisharga: item.metode_pembayaran === 'TUNAI' ? '0' : item.metode_pembayaran === 'KREDIT' ? '2' : '1',
                    
                    // Alamat Pengirim
                    bttt_asalname: item.asal_name || "UMUM",
                    bttt_asaltelp: item.asal_telp || "",
                    bttt_asalalamat: item.asal_alamat || "",
                    bttt_asalkota: item.asal_kota || "",
                    bttt_inisial_asal: item.inisial_asal || "GORONTALO",
                    
                    // Alamat Penerima
                    bttt_tujuannama: item.tujuan_nama || "",
                    bttt_tujuantelp: item.tujuan_telp || "",
                    bttt_tujuanalamat: item.tujuan_alamat || "",
                    bttt_tujuankelurahan: item.tujuan_kelurahan || "",
                    bttt_tujuankecamatan: item.tujuan_kecamatan || "",
                    bttt_tujuankota: item.tujuan_kota || "",
                    bttt_tujuankodepos: item.tujuan_kodepos || "",
                    bttt_tujuanpropinsi: item.tujuan_propinsi || ""
                };

                // 💾 INJECT DATA KE STORAGE: Pasok data ke dalam dua key penampung utama BttPrintPage!
                localStorage.setItem('print_btt_payload', JSON.stringify(payloadFormatPrint));
                localStorage.setItem('print_btt_number', targetResiID);
                
                // Buka tab baru langsung mengarah ke halaman cetak nota rangkap 3 bawaan Go lu!
                window.open(`/marketing/btt/print?id=${targetResiID}`, '_blank');
            }}            
        />

        <BttFormModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                isDarkMode={isDarkMode}
            />
        </div>
    );
};

export default MarketingBTT;