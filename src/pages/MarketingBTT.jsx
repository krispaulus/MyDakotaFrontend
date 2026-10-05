import React, { useState, useEffect } from 'react';
import { Edit, Printer, Filter, RefreshCw, RotateCcw } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';
import { useDarkMode } from "../context/DarkModeContext";
import BttFormModal from '../components/organisms/BttFormModal';
import api from '../api/axios';

const MarketingBTT = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 🎯 1. DEFAULT AKTIF (TERBUKA). JIKA TOMBOL FILTER DIKLIK BARU HIDDEN
    const [showFilter, setShowFilter] = useState(true);

    // Filter Form State identik Invoice
    const todayStr = new Date().toISOString().split('T')[0];
    const [filterStartDate, setFilterStartDate] = useState(todayStr);
    const [filterEndDate, setFilterEndDate] = useState(todayStr);
    const [filterCabang, setFilterCabang] = useState('');
    const [filterJenisBtt, setFilterJenisBtt] = useState('');
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterNoBtt, setFilterNoBtt] = useState('');
    const [filterKota, setFilterKota] = useState('');
    const [bypassTanggal, setBypassTanggal] = useState(false);

    const columns = [
        { header: 'NO. BTT', accessor: 'id' },
        {
            header: 'TANGGAL',
            accessor: 'tanggal',
            render: (item) => new Date(item.tanggal).toLocaleDateString('id-ID')
        },
        { header: 'PENGIRIM', accessor: 'asal_name' },
        { header: 'PENERIMA', accessor: 'tujuan_nama' },
        { header: 'TUJUAN', accessor: 'tujuan_kota' },
        { header: "BARANG", accessor: "nama_barang" },
        {
            header: 'HARGA',
            accessor: 'harga',
            render: (item) => (
                <span className="font-bold text-emerald-600">
                    Rp {(item.harga || 0).toLocaleString('id-ID')}
                </span>
            )
        },
    ];

    const [filterAgenId, setFilterAgenId] = useState(
        localStorage.getItem('active_agen_id') || sessionStorage.getItem('active_agen_id') || ''
    );

    const fetchBTT = async (targetAgenId, customParams = {}) => {
        setLoading(true);
        try {
            const currentToken = localStorage.getItem('token');
            const agenIdFix = targetAgenId || localStorage.getItem('active_agen_id') || '';

            const queryParams = new URLSearchParams({
                agen_id: agenIdFix,
                start_date: bypassTanggal ? '' : (customParams.start_date ?? filterStartDate),
                end_date: bypassTanggal ? '' : (customParams.end_date ?? filterEndDate),
                bypass_tanggal: bypassTanggal ? 'Y' : 'N',
                ...(customParams.cabang && { cabang: customParams.cabang }),
                ...(customParams.jenis_btt && { jenis_btt: customParams.jenis_btt }),
                ...(customParams.customer && { customer: customParams.customer }),
                ...(customParams.no_btt && { no_btt: customParams.no_btt }),
                ...(customParams.kota && { kota: customParams.kota }),
            }).toString();

            const res = await api.get(`/marketing/btt?${queryParams}`, {
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
            console.error("Gagal menarik data BTT:", err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

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
    }, [filterAgenId, bypassTanggal]);

    const handleApplyFilter = () => {
        fetchBTT(filterAgenId, {
            start_date: filterStartDate,
            end_date: filterEndDate,
            cabang: filterCabang,
            jenis_btt: filterJenisBtt,
            customer: filterCustomer,
            no_btt: filterNoBtt,
            kota: filterKota
        });
    };

    const handleResetFilter = () => {
        setFilterStartDate(todayStr);
        setFilterEndDate(todayStr);
        setFilterCabang('');
        setFilterJenisBtt('');
        setFilterCustomer('');
        setFilterNoBtt('');
        setFilterKota('');
        setBypassTanggal(false);
        fetchBTT(filterAgenId, { start_date: todayStr, end_date: todayStr });
    };

    return (
        <div className="relative space-y-4">
            {/* 🎯 FORM FILTER PERSIS 100% SEPERTI HALAMAN INVOICE */}
            {showFilter && (
                <form
                    onSubmit={(e) => { e.preventDefault(); handleApplyFilter(); }}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all mb-4"
                >
                    <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                        <Filter size={16} className="text-sky-600" />
                        FILTER BUKTI TANDA TERIMA (BTT)
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* 1. Tgl Awal & Tgl Akhir */}
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <label className="font-bold text-slate-500 block mb-1">TGL AWAL</label>
                                <input
                                    type="date"
                                    disabled={bypassTanggal}
                                    value={filterStartDate}
                                    onChange={(e) => setFilterStartDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal
                                        ? 'bg-slate-100 text-slate-400 border-slate-200'
                                        : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'
                                        }`}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="font-bold text-slate-500 block mb-1">TGL AKHIR</label>
                                <input
                                    type="date"
                                    disabled={bypassTanggal}
                                    value={filterEndDate}
                                    onChange={(e) => setFilterEndDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal
                                        ? 'bg-slate-100 text-slate-400 border-slate-200'
                                        : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'
                                        }`}
                                />
                            </div>
                        </div>

                        {/* 2. Cabang */}
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CABANG</label>
                            <select
                                value={filterCabang}
                                onChange={(e) => setFilterCabang(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white outline-none focus:border-sky-500 cursor-pointer"
                            >
                                <option value="">-- SEMUA CABANG --</option>
                                <option value="001">001 - DLI PUSAT</option>
                            </select>
                        </div>

                        {/* 3. Jenis Pembayaran */}
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">JENIS PEMBAYARAN</label>
                            <select
                                value={filterJenisBtt}
                                onChange={(e) => setFilterJenisBtt(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white outline-none focus:border-sky-500 cursor-pointer"
                            >
                                <option value="">-- SEMUA JENIS --</option>
                                <option value="0">BTT Tunai</option>
                                <option value="1">BTT Tagih Turun</option>
                                <option value="2">BTT Kredit</option>
                            </select>
                        </div>

                        {/* 4. Customer */}
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CUSTOMER</label>
                            <input
                                type="text"
                                placeholder="Cari nama customer..."
                                value={filterCustomer}
                                onChange={(e) => setFilterCustomer(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white placeholder-slate-400 outline-none focus:border-sky-500"
                            />
                        </div>

                        {/* 5. No BTT */}
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. BTT</label>
                            <input
                                type="text"
                                placeholder="Cari nomor resi BTT..."
                                value={filterNoBtt}
                                onChange={(e) => setFilterNoBtt(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white placeholder-slate-400 outline-none focus:border-sky-500"
                            />
                        </div>

                        {/* 6. Kota Tujuan */}
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">KOTA TUJUAN</label>
                            <input
                                type="text"
                                placeholder="Cari kota tujuan..."
                                value={filterKota}
                                onChange={(e) => setFilterKota(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white placeholder-slate-400 outline-none focus:border-sky-500"
                            />
                        </div>

                        {/* 7. Checkbox Bypass Tanggal */}
                        <div className="flex items-center">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 mt-2">
                                <input
                                    type="checkbox"
                                    checked={bypassTanggal}
                                    onChange={(e) => setBypassTanggal(e.target.checked)}
                                    className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                                />
                                Bypass Filter Tanggal
                            </label>
                        </div>
                    </div>

                    {/* Footer Tombol Aksi */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleResetFilter}
                                className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer"
                            >
                                RESET
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5"
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> REFRESH DATA
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Template Tabel Utama */}
            <DataTableTemplate
                title="BUKTI TANDA TERIMA (BTT)"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                actionMode="readonly_print"

                // 🎯 3. TOGGLE VISIBILITAS FILTER (Default True, Klik = Hidden/Toggle)
                onFilter={() => setShowFilter((prev) => !prev)}
                showFilter={showFilter}

                onAdd={async () => {
                    const activeAgenId = localStorage.getItem('active_agen_id') || '';
                    const activeAgenNama = localStorage.getItem('active_agen_nama') || '';
                    const activeCabangId = localStorage.getItem('active_cabang_id') || '';

                    // 🎯 SAKELAR PENGATURAN:
                    // true  = PUSAT BISA INPUT BTT (Batasan dicabut)
                    // false = PUSAT DIBATASI (Batasan dipasang kembali)
                    const allowPusatConfig = localStorage.getItem('allow_pusat_create_btt') === 'Y';

                    const isPusat =
                        !allowPusatConfig && (
                            activeAgenId === '839' ||
                            activeAgenId === '1' ||
                            !activeAgenId ||
                            activeAgenId === activeCabangId ||
                            activeAgenNama.toUpperCase().includes('PUSAT') ||
                            activeAgenNama.toUpperCase().includes('HOLDING')
                        );

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
                                        💡 <b>Petunjuk:</b> Jika kantor pusat diizinkan menerbitkan BTT, aktifkan fiturnya di menu <b>Settings &rarr; Aturan Operasional</b>.
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
                        const response = await api.get(`/btt/check-closing-gate?agen_id=${activeAgenId || '001'}`);

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

                    const payloadFormatPrint = {
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
                        bttt_asalname: item.asal_name || "",
                        bttt_asaltelp: item.asal_telp || "",
                        bttt_asalalamat: item.asal_alamat || "",
                        bttt_asalkota: item.asal_kota || "",
                        bttt_inisial_asal: item.agen_nama || item.inisial_asal || localStorage.getItem('active_agen_nama') || "",
                        bttt_tujuannama: item.tujuan_nama || "",
                        bttt_tujuantelp: item.tujuan_telp || "",
                        bttt_tujuanalamat: item.tujuan_alamat || "",
                        bttt_tujuankelurahan: item.tujuan_kelurahan || "",
                        bttt_tujuankecamatan: item.tujuan_kecamatan || "",
                        bttt_tujuankota: item.tujuan_kota || "",
                        bttt_tujuankodepos: item.tujuan_kodepos || "",
                        bttt_tujuanpropinsi: item.tujuan_propinsi || ""
                    };

                    localStorage.setItem('print_btt_payload', JSON.stringify(payloadFormatPrint));
                    localStorage.setItem('print_btt_number', targetResiID);
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