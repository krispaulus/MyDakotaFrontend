import React, { useState, useEffect, useRef } from 'react';
import { Edit3, Printer, Filter, RefreshCw, Trash2, QrCode } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';
import { useDarkMode } from "../context/DarkModeContext";
import BttFormModal from '../components/organisms/BttFormModal';
import api from '../api/axios';


const MarketingBTT = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // State Modal (Create & Edit)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBtt, setSelectedBtt] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);

    // Filter Form State
    const [showFilter, setShowFilter] = useState(true);

    const now = new Date();
    const firstDayStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    const [filterStartDate, setFilterStartDate] = useState(todayStr);
    const [filterEndDate, setFilterEndDate] = useState(todayStr);
    const [filterCabang, setFilterCabang] = useState('');
    const [filterJenisBtt, setFilterJenisBtt] = useState('');
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterNoBtt, setFilterNoBtt] = useState('');
    const [filterKota, setFilterKota] = useState('');
    const [bypassTanggal, setBypassTanggal] = useState(false);
    const [cabangList, setCabangList] = useState([]);

    const fetchCabangList = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/gl/agen-ca?stt=', { headers: { Authorization: `Bearer ${token}` } })
                .catch(() => api.get('/agens?limit=1000', { headers: { Authorization: `Bearer ${token}` } }));
            setCabangList(res.data?.data || res.data || []);
        } catch (err) {
            console.warn("Gagal load cabang:", err);
        }
    };

    useEffect(() => {
        fetchCabangList();
    }, []);

    // 🖨️ FUNGSI CETAK RESI BTT
    const handlePrintBTT = (item) => {
        const targetResiID = item.id || item.no_btt || "";
        const activePtFromStorage =
            localStorage.getItem('active_pt_nama') ||
            localStorage.getItem('pt_nama') ||
            localStorage.getItem('company_name');

        const headerTitleElement = document.querySelector('h1, .page-title, header');
        const headerText = headerTitleElement ? headerTitleElement.innerText : "";
        const ptNamaFix = activePtFromStorage || (headerText.includes("Dakota") ? headerText.split('\n')[0] : "");

        const payloadFormatPrint = {
            pt_nama: item.pt_nama || ptNamaFix || "DAKOTA LOGISTIK INDONESIA (DLI)",
            bttt_tanggal: item.tanggal || item.bttt_tanggal,
            bttt_nosuratjalan: item.no_surat_jalan || item.nosuratjalan || item.bttt_nosuratjalan || "",
            bttt_ket: item.keterangan || item.ket || item.bttt_ket || "",
            bttt_isikiriman: item.nama_barang || item.isikiriman || item.bttt_isikiriman || "",
            bttt_jmlkoli: parseInt(item.jumlah_koli || item.jmlkoli || item.bttt_jmlkoli) || 1,
            bttt_berat: parseFloat(item.berat || item.bttt_berat) || 1,
            bttt_beratvol: parseFloat(item.berat_volume || item.beratvol || item.bttt_beratvol) || 0,
            bttt_ukuran: parseFloat(item.kubikasi || item.ukuran || item.bttt_ukuran) || 0,
            bttt_harga: parseFloat(item.harga || item.bttt_harga) || 0,
            bttt_biayapenerus: parseFloat(item.biaya_penerus || item.biayatambahan || item.bttt_biayapenerus) || 0,
            bttt_biayapacking: parseFloat(item.biaya_packing || item.biayapacking || item.bttt_biayapacking) || 0,
            bttt_paketyn: item.jenis_layanan === 'REGULER' || item.paketyn === 'Y' || item.bttt_paketyn === 'Y' ? 'Y' : 'N',
            bttt_layanan_nama: item.jenis_layanan || item.layanan || (item.bttt_paketyn === 'N' ? 'CARTER' : 'REGULER'),
            bttt_jenisharga: item.bttt_jenisharga ? String(item.bttt_jenisharga).trim() : (item.metode_pembayaran === 'TUNAI' ? '0' : item.metode_pembayaran === 'KREDIT' ? '2' : '2'),
            bttt_jeniskiriman: item.jenis_kiriman || item.bttt_jeniskiriman || 'BERAT',
            bttt_asalname: item.asal_name || item.bttt_asalname || "",
            bttt_asaltelp: item.asal_telp || item.bttt_asaltelp || "",
            bttt_asalalamat: item.asal_alamat || item.bttt_asalalamat || "",
            bttt_asalkota: item.asal_kota || item.bttt_asalkota || "",
            bttt_inisial_asal: "DLI PUSAT",
            bttt_tujuannama: item.tujuan_nama || item.bttt_tujuannama || "",
            bttt_up_penerima: item.bttt_up_penerima || item.up || item.bttt_up || "",
            bttt_tujuantelp: item.tujuan_telp || item.bttt_tujuantelp || "",
            bttt_tujuanalamat: item.tujuan_alamat || item.bttt_tujuanalamat || "",
            bttt_tujuankelurahan: item.tujuan_kelurahan || item.bttt_tujuankelurahan || "",
            bttt_tujuankecamatan: item.tujuan_kecamatan || item.bttt_tujuankecamatan || "",
            bttt_tujuankota: item.tujuan_kota || item.bttt_tujuankota || "",
            bttt_tujuankodepos: item.tujuan_kodepos || item.bttt_tujuankodepos || "",
            bttt_tujuanpropinsi: item.tujuan_propinsi || item.bttt_tujuanpropinsi || "",
            ket_do_kembali: item.ket_do_kembali || item.keterangan || item.bttt_ket || '',
            lampiran_keterangan: item.keterangan || item.bttt_ket || '',
            bttt_biayapacking: parseFloat(item.biaya_packing || item.bttt_biayapacking || 0),
            estimasihari: item.estimasihari || item.lead_time || 2
        };

        localStorage.setItem('print_btt_payload', JSON.stringify(payloadFormatPrint));
        localStorage.setItem('print_btt_number', targetResiID);
        window.open(`/marketing/btt/print?id=${targetResiID}`, '_blank');
    };

    // ✏️ FUNGSI BUKA MODAL EDIT BTT
    const handleOpenEditBTT = (row) => {
        setSelectedBtt(row);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    // 🗑️ FUNGSI HAPUS / NON-AKTIFKAN BTT (TONG SAMPAH)
    const handleDeleteBTT = (row) => {
        const targetBttID = row.id || row.bttt_id;
        Swal.fire({
            title: 'Non-Aktifkan / Hapus BTT?',
            html: `Apakah Anda yakin ingin menghapus BTT <b>${targetBttID}</b>?<br/><span style="font-size:12px;color:#64748b;">Penerima: ${row.tujuan_nama || '-'}</span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Hapus BTT!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete(`/marketing/btt/${encodeURIComponent(targetBttID)}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Terhapus!', `BTT ${targetBttID} berhasil dinonaktifkan.`, 'success');
                    fetchBTT(filterAgenId);
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || err.response?.data?.error || 'Gagal menghapus BTT', 'error');
                }
            }
        });
    };

    // 🏷️ FUNGSI CETAK BARCODE KOLI (TOMBOL BARCODE)
    const handlePrintBarcodeKoli = (row) => {
        const targetBttID = row.id || row.bttt_id;
        localStorage.setItem('print_barcode_btt_id', targetBttID);
        localStorage.setItem('print_barcode_payload', JSON.stringify(row));
        window.open(`/marketing/btt/barcode?id=${encodeURIComponent(targetBttID)}`, '_blank');
    };

    // ➕ FUNGSI BUKA MODAL TAMBAH BTT
    const handleOpenCreateBTT = () => {
        const activeAgenId = localStorage.getItem('active_agen_id') || '';
        const activeAgenNama = localStorage.getItem('active_agen_nama') || '';
        const activeCabangId = localStorage.getItem('active_cabang_id') || '';
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
                            Unit <b>PUSAT DAKOTA (HOLDING)</b> dikhususkan untuk fungsi pengawasan dan manajemen internal. Penerbitan BTT hanya dapat dilakukan melalui unit <b>Agen / Cabang Operasional</b>.
                        </p>
                    </div>
                `,
                icon: 'info',
                confirmButtonColor: '#2563eb',
                confirmButtonText: 'Paham & Lanjutkan',
                customClass: { container: 'z-[999999]' }
            });
            return;
        }

        setSelectedBtt(null);
        setIsEditMode(false);
        setIsModalOpen(true);
    };

    // Definisi Kolom Tabel (Termasuk Kolom ACTION dengan Cetak & Edit)
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
        {
            header: 'CREATED BY',
            accessor: 'create_by',
            render: (item) => (
                <span className="font-bold text-slate-800 bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-0.5 rounded text-[11px] uppercase tracking-wide">
                    {item.create_by || 'SYSTEM'}
                </span>
            )
        },
        {
            header: 'ACTION',
            accessor: 'action',
            render: (row) => (
                <div className="flex items-center justify-center gap-1.5">
                    {/* 1. Tombol Cetak Resi */}
                    <button
                        type="button"
                        onClick={() => handlePrintBTT(row)}
                        title="Cetak BTT / Resi"
                        className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                    >
                        <Printer size={15} />
                    </button>

                    {/* 2. Tombol Edit BTT */}
                    <button
                        type="button"
                        onClick={() => handleOpenEditBTT(row)}
                        title="Edit Data BTT"
                        className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                    >
                        <Edit3 size={15} />
                    </button>

                    {/* 3. Tombol Hapus / Non-Aktifkan BTT (Tong Sampah Merah) */}
                    <button
                        type="button"
                        onClick={() => handleDeleteBTT(row)}
                        title="Hapus / Non-Aktifkan BTT"
                        className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    >
                        <Trash2 size={15} />
                    </button>

                    {/* 4. Tombol Cetak Barcode Koli */}
                    <button
                        type="button"
                        onClick={() => handlePrintBarcodeKoli(row)}
                        title="Cetak Label Barcode Koli"
                        className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                    >
                        <QrCode size={15} />
                    </button>
                </div>
            )
        }
    ];

    const [filterAgenId, setFilterAgenId] = useState(
        localStorage.getItem('active_agen_id') || sessionStorage.getItem('active_agen_id') || ''
    );

    const fetchBTT = async (targetAgenId, customParams = {}) => {
        setLoading(true);
        try {
            const currentToken = localStorage.getItem('token');
            const agenIdFix = targetAgenId || localStorage.getItem('active_agen_id') || '';

            // Tentukan cabang yang difilter
            const selectedBranch = customParams.cabang !== undefined ? customParams.cabang : filterCabang;

            const queryParams = new URLSearchParams({
                agen_id: agenIdFix,
                start_date: bypassTanggal ? '' : (customParams.start_date ?? filterStartDate),
                end_date: bypassTanggal ? '' : (customParams.end_date ?? filterEndDate),
                bypass_tanggal: bypassTanggal ? 'Y' : 'N',
                cabang: selectedBranch || '', // Kirim string kosong jika "-- SEMUA CABANG --"
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
        fetchCabangList();
        const initialAgen = localStorage.getItem('active_agen_id') || '';

        // Panggil pertama kali dengan bypass tanggal aktif
        fetchBTT(initialAgen, { bypass_tanggal: 'Y' });

        const handleAgenChange = () => {
            const latestAgenId = localStorage.getItem('active_agen_id') || '';
            setFilterAgenId(latestAgenId);
            fetchBTT(latestAgenId, { bypass_tanggal: 'Y' });
        };

        window.addEventListener('storage', handleAgenChange);
        window.addEventListener('agen_changed', handleAgenChange);

        return () => {
            window.removeEventListener('storage', handleAgenChange);
            window.removeEventListener('agen_changed', handleAgenChange);
        };
    }, [filterAgenId]);

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
        setFilterStartDate(firstDayStr);
        setFilterEndDate(todayStr);
        setFilterCabang('');
        setFilterJenisBtt('');
        setFilterCustomer('');
        setFilterNoBtt('');
        setFilterKota('');

        // Tetap true agar data tidak kosong saat reset
        setBypassTanggal(true);

        fetchBTT(filterAgenId, {
            start_date: '',
            end_date: '',
            cabang: '',
            bypass_tanggal: 'Y'
        });
    };

    const [custSuggestions, setCustSuggestions] = useState([]);
    const [showCustDropdown, setShowCustDropdown] = useState(false);
    const custDropdownRef = useRef(null);

    useEffect(() => {
        const q = (filterCustomer || "").trim();
        if (q.length < 2) {
            setCustSuggestions([]);
            setShowCustDropdown(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await api.get(`/marketing/transport-planning/suggest-customer?q=${encodeURIComponent(q)}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setCustSuggestions(res.data?.data || []);
                setShowCustDropdown(true);
            } catch (err) {
                console.error("Gagal memuat suggestion customer:", err);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [filterCustomer]);

    return (
        <div className="relative space-y-4">
            {/* FORM FILTER */}
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
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <label className="font-bold text-slate-500 block mb-1">TGL AWAL</label>
                                <input
                                    type="date"
                                    disabled={bypassTanggal}
                                    value={filterStartDate}
                                    onChange={(e) => setFilterStartDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'}`}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="font-bold text-slate-500 block mb-1">TGL AKHIR</label>
                                <input
                                    type="date"
                                    disabled={bypassTanggal}
                                    value={filterEndDate}
                                    onChange={(e) => setFilterEndDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'}`}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CABANG</label>
                            <select
                                value={filterCabang}
                                onChange={(e) => setFilterCabang(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white outline-none focus:border-sky-500 cursor-pointer"
                            >
                                <option value="">-- SEMUA CABANG --</option>
                                {cabangList.map((cab, idx) => (
                                    <option key={idx} value={cab.agen_id || cab.AgenID}>
                                        {String(cab.agen_id || cab.AgenID).padStart(3, '0')} - {cab.agen_nama || cab.AgenNama}
                                    </option>
                                ))}
                            </select>
                        </div>

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

                        <div className="relative" ref={custDropdownRef}>
                            <label className="font-bold text-slate-500 block mb-1">
                                CUSTOMER
                            </label>
                            <input
                                type="text"
                                autoComplete="off"
                                placeholder="Ketik nama customer..."
                                value={filterCustomer}
                                onChange={(e) => setFilterCustomer(e.target.value)}
                                onFocus={() => {
                                    if (custSuggestions.length > 0) setShowCustDropdown(true);
                                }}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white outline-none focus:border-sky-500"
                            />

                            {showCustDropdown && custSuggestions.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto z-50 divide-y divide-slate-100 text-xs">
                                    {custSuggestions.map((item, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                setFilterCustomer(item.cust_name);
                                                setShowCustDropdown(false);
                                            }}
                                            className="px-3 py-2 hover:bg-sky-50 cursor-pointer text-slate-700 font-semibold transition"
                                        >
                                            <span className="font-mono text-sky-700 font-bold">[{item.cust_id}]</span>{" "}
                                            {item.cust_name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. BTT</label>
                            <input
                                type="text"
                                placeholder="Cari nomor resi BTT..."
                                value={filterNoBtt}
                                onChange={(e) => setFilterNoBtt(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">KOTA TUJUAN</label>
                            <input
                                type="text"
                                placeholder="Cari kota tujuan..."
                                value={filterKota}
                                onChange={(e) => setFilterKota(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white outline-none focus:border-sky-500"
                            />
                        </div>

                        <div className="flex items-center">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 mt-2">
                                <input
                                    type="checkbox"
                                    checked={bypassTanggal}
                                    onChange={(e) => setBypassTanggal(e.target.checked)}
                                    className="w-4 h-4 text-sky-600 rounded border-slate-300"
                                />
                                Bypass Filter Tanggal
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
                </form>
            )}

            {/* TABEL DATA */}
            <DataTableTemplate
                title="BUKTI TANDA TERIMA (BTT)"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onFilter={() => setShowFilter((prev) => !prev)}
                showFilter={showFilter}
                onAdd={handleOpenCreateBTT}
            // Catatan: prop onEdit dan actions dihapus dari sini karena tombol Print dan Edit sudah ditangani di dalam array columns
            />

            {/* MODAL BTT (CREATE & EDIT) */}
            <BttFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                isDarkMode={isDarkMode}
                initialData={selectedBtt}
                isEditMode={isEditMode}
                onSave={() => fetchBTT(filterAgenId)}
            />
        </div>
    );
};

export default MarketingBTT;