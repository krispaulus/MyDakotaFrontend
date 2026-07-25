import React, { useState, useEffect } from 'react';
import { Edit, Printer } from 'lucide-react'; // 🌟 FIX: Import Edit & Printer dari lucide-react!
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';
import { useDarkMode } from "../context/DarkModeContext";
import BttFormModal from '../components/organisms/BttFormModal';
import api from '../api/axios'; // 🚀 Instance axios terintegrasi

const MarketingBTT = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const token = localStorage.getItem('token');

    const [showBttPrintModal, setShowBttPrintModal] = useState(false);
    const [modalNoBTT, setModalNoBTT] = useState('');
    const bttInputRef = React.useRef(null);

    useEffect(() => {
        if (showBttPrintModal && bttInputRef.current) {
            setTimeout(() => bttInputRef.current.focus(), 100);
        }
    }, [showBttPrintModal]);

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

    // =========================================================================
    // 🟢 SINKRONISASI FILTER AGEN REAL-TIME (SOLUSI DLI CIKARANG & PUSAT)
    // =========================================================================
    const [filterAgenId, setFilterAgenId] = useState(
        localStorage.getItem('active_agen_id') || sessionStorage.getItem('active_agen_id') || ''
    );

    const fetchBTT = async (targetAgenId) => {
        setLoading(true);
        try {
            const currentToken = localStorage.getItem('token');
            const agenIdFix = targetAgenId || localStorage.getItem('active_agen_id') || '';

            console.log(`📡 [Filter Agen] Memuat BTT khusus Agen ID: ${agenIdFix}`);

            const res = await api.get(`/marketing/btt?agen_id=${agenIdFix}`, {
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (Array.isArray(res.data)) {
                setData(res.data);
            } else if (res.data && Array.isArray(res.data.data)) {
                setData(res.data.data);
            } else {
                setData([]);
            }
        } catch (err) {
            console.error("Gagal menarik data BTT Spesifik Agen:", err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    // 🟢 MONITORING DROPDOWN REAL-TIME
    useEffect(() => {
        const initialAgen = localStorage.getItem('active_agen_id') || '';
        fetchBTT(initialAgen);

        const handleAgenChange = () => {
            const latestAgenId = localStorage.getItem('active_agen_id') || '';
            setFilterAgenId(latestAgenId);
            fetchBTT(latestAgenId);
        };

        window.addEventListener('storage', handleAgenChange);
        window.addEventListener('agen_changed', handleAgenChange);

        const intervalCheck = setInterval(() => {
            const latestAgenId = localStorage.getItem('active_agen_id') || '';
            if (latestAgenId !== filterAgenId) {
                setFilterAgenId(latestAgenId);
                fetchBTT(latestAgenId);
            }
        }, 500);

        return () => {
            window.removeEventListener('storage', handleAgenChange);
            window.removeEventListener('agen_changed', handleAgenChange);
            clearInterval(intervalCheck);
        };
    }, [filterAgenId]);

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
                    const activeAgenId = localStorage.getItem('active_agen_id') || '';
                    const activeAgenNama = localStorage.getItem('active_agen_nama') || '';
                    const activeCabangId = localStorage.getItem('active_cabang_id') || '';

                    // 🛡️ INTERCEPTOR PUSAT DAKOTA / HOLDING ELEGAN
                    const isPusat =
                        activeAgenId === '839' ||
                        activeAgenId === '1' ||
                        !activeAgenId ||
                        activeAgenId === activeCabangId ||
                        activeAgenNama.toUpperCase().includes('PUSAT') ||
                        activeAgenNama.toUpperCase().includes('HOLDING');

                    if (isPusat) {
                        Swal.fire({
                            title: 'Akses Dibatasi',
                            html: `
                                <div style="font-family: 'Inter', sans-serif; text-align: left; font-size: 13px; padding: 4px;">
                                    <p style="color: #1e293b; font-weight: 700; font-size: 14px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                                        Kebijakan Operasional Kantor Pusat
                                    </p>
                                    <p style="color: #475569; line-height: 1.6; margin-bottom: 12px;">
                                        Unit <b>PUSAT DAKOTA (HOLDING)</b> dikhususkan untuk fungsi pengawasan dan manajemen internal. Penerbitan Bukti Tanda Terima (BTT) hanya dapat dilakukan melalui unit <b>Agen / Cabang Operasional</b>.
                                    </p>
                                    <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 10px; border-radius: 6px; color: #334155; font-size: 12px;">
                                        💡 <b>Petunjuk:</b> Silakan beralih ke lokasi Agen atau Cabang Operasional melalui pemilih lokasi di pojok kanan atas.
                                    </div>
                                </div>
                            `,
                            icon: 'info',
                            iconColor: '#3b82f6',
                            confirmButtonColor: '#2563eb',
                            confirmButtonText: 'Paham & Lanjutkan',
                            customClass: { container: 'z-[999999]' }
                        });
                        return;
                    }

                    // 🛡️ INTERCEPTOR GERBANG CLOSING HARIAN H-1
                    try {
                        setLoading(true);
                        const response = await api.get(`/btt/check-closing-gate?agen_id=${activeAgenId}`);

                        if (response.data && response.data.status === "blocked") {
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
                            return;
                        }
                    } catch (err) {
                        console.error("Gagal verifikasi gerbang closing harian:", err);
                    } finally {
                        setLoading(false);
                    }

                    setIsModalOpen(true);
                }}

                onEdit={(item) => {
                    const targetResiID = item.id || "";

                    const activePtFromStorage =
                        localStorage.getItem('active_pt_nama') ||
                        localStorage.getItem('pt_nama') ||
                        localStorage.getItem('company_name');

                    const headerTitleElement = document.querySelector('h1, .page-title, header');
                    const headerText = headerTitleElement ? headerTitleElement.innerText : "";

                    const ptNamaFix = activePtFromStorage || (headerText.includes("Dakota") ? headerText.split('\n')[0] : "");

                    // 🌟 PAYLOAD PURE DYNAMIC NUSANTARA MULTI-TENANT (BEBAS HARDCODE)
                    const payloadFormatPrint = {
                        // PT Nama dijamin terisi nama Corporate aktif!
                        pt_nama: item.pt_nama || ptNamaFix || localStorage.getItem('active_agen_nama') || "",

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

                        // Identitas Agen Operasional Pengirim
                        bttt_asalname: item.asal_name || "",
                        bttt_asaltelp: item.asal_telp || "",
                        bttt_asalalamat: item.asal_alamat || "",
                        bttt_asalkota: item.asal_kota || "",
                        bttt_inisial_asal: item.agen_nama || item.inisial_asal || localStorage.getItem('active_agen_nama') || "",

                        // Identitas Penerima
                        bttt_tujuannama: item.tujuan_nama || "",
                        bttt_tujuantelp: item.tujuan_telp || "",
                        bttt_tujuanalamat: item.tujuan_alamat || "",
                        bttt_tujuankelurahan: item.tujuan_kelurahan || "",
                        bttt_tujuankecamatan: item.tujuan_kecamatan || "",
                        bttt_tujuankota: item.tujuan_kota || "",
                        bttt_tujuankodepos: item.tujuan_kodepos || "",
                        bttt_tujuanpropinsi: item.tujuan_propinsi || ""
                    };

                    console.log("🖨️ [Print Interceptor] Mengirim Payload ke Print Page:", payloadFormatPrint);

                    // Simpan payload dan nomor BTT ke LocalStorage
                    localStorage.setItem('print_btt_payload', JSON.stringify(payloadFormatPrint));
                    localStorage.setItem('print_btt_number', targetResiID);

                    // Buka halaman print di tab baru
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