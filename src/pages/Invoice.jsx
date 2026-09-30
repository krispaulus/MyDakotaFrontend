import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import {
    Filter, CheckCircle2, XCircle, Search, RefreshCw, Printer,
    X, Plus, Trash2, FileText, Calendar, CheckSquare, Square,
    Download, Lock, Unlock, ArrowRight, Edit3
} from 'lucide-react';
import Swal from 'sweetalert2';
import dakotaLogo from '../assets/new_logo 2.png';

function terbilangIndonesia(angka) {
    const bilangan = Math.floor(Math.abs(Number(angka) || 0));
    const kata = ['', 'SATU', 'DUA', 'TIGA', 'EMPAT', 'LIMA', 'ENAM', 'TUJUH', 'DELAPAN', 'SEMBILAN', 'SEPULUH', 'SEBELAS'];

    if (bilangan < 12) {
        return kata[bilangan];
    } else if (bilangan < 20) {
        return terbilangIndonesia(bilangan - 10) + ' BELAS';
    } else if (bilangan < 100) {
        return terbilangIndonesia(Math.floor(bilangan / 10)) + ' PULUH ' + kata[bilangan % 10];
    } else if (bilangan < 200) {
        return 'SERATUS ' + terbilangIndonesia(bilangan - 100);
    } else if (bilangan < 1000) {
        return terbilangIndonesia(Math.floor(bilangan / 100)) + ' RATUS ' + terbilangIndonesia(bilangan % 100);
    } else if (bilangan < 2000) {
        return 'SERIBU ' + terbilangIndonesia(bilangan - 1000);
    } else if (bilangan < 1000000) {
        return terbilangIndonesia(Math.floor(bilangan / 1000)) + ' RIBU ' + terbilangIndonesia(bilangan % 1000);
    } else if (bilangan < 1000000000) {
        return terbilangIndonesia(Math.floor(bilangan / 1000000)) + ' JUTA ' + terbilangIndonesia(bilangan % 1000000);
    } else if (bilangan < 1000000000000) {
        return terbilangIndonesia(Math.floor(bilangan / 1000000000)) + ' MILYAR ' + terbilangIndonesia(bilangan % 1000000000);
    }
    return '';
}

// Helper format tanggal Indonesia formal (contoh: 29 September 2026)
function formatTanggalIndonesia(dateStr) {
    if (!dateStr) return '-';
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;

    const bulanIndo = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = bulanIndo[dateObj.getMonth()];
    const y = dateObj.getFullYear();

    return `${d} ${m} ${y}`;
}

// Helper standarisasi Nomor Invoice ke format resmi: [agen3digit][urut4digit]/[bulan]/[tahun4digit]/FP
function formatNomorInvoiceResmi(rawId, rawDate) {
    if (!rawId) return '-';
    let clean = String(rawId).trim();

    // Jika sudah sesuai format baru (.../FP), langsung kembalikan
    if (clean.includes('/FP')) return clean;

    // Ambil tahun dan bulan dari tanggal invoice
    const d = rawDate ? new Date(rawDate) : new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());

    // Ambil angka urut dari ID (misal OTA09260010 -> ambil 4 digit terakhir: 0010)
    const digits = clean.replace(/\D/g, '');
    let urut = '0001';
    if (digits.length >= 4) {
        urut = digits.slice(-4);
    }

    return `001${urut}/${mm}/${yyyy}/FP`;
}

const Invoice = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [cabangList, setCabangList] = useState([]);
    const [custList, setCustList] = useState([]);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilter, setShowFilter] = useState(true);

    // Dropdown Cetak di Kolom Aksi
    const [activePrintMenuId, setActivePrintMenuId] = useState(null);

    // =========================================================================
    // HELPER: DETEKSI CABANG & STATUS HOLDING / PUSAT
    // =========================================================================
    function getActiveAgen() {
        const activeAgenId = localStorage.getItem('active_agen_id') || localStorage.getItem('agen_id') || '';
        const activeCabangId = localStorage.getItem('active_cabang_id') || localStorage.getItem('cabang_id') || '';
        const sessionCabangNama = localStorage.getItem('active_cabang_nama')
            || localStorage.getItem('cabang_nama')
            || localStorage.getItem('active_agen_nama')
            || '';

        if (sessionCabangNama) {
            return {
                id: activeCabangId || activeAgenId || '001',
                nama: sessionCabangNama.toUpperCase()
            };
        }

        const found = cabangList.find(c => {
            const cId = String(c.agen_id || c.AgenID || '').trim().toLowerCase();
            const cKode = String(c.agen_kode || c.AgenKode || '').trim().toLowerCase();
            const cNama = String(c.agen_nama || c.AgenNama || '').trim().toLowerCase();
            const targetAgen = activeAgenId.trim().toLowerCase();
            const targetCabang = activeCabangId.trim().toLowerCase();

            return (
                (targetAgen && (cId === targetAgen || cKode === targetAgen || cNama.includes(targetAgen))) ||
                (targetCabang && (cId === targetCabang || cKode === targetCabang || cNama.includes(targetCabang)))
            );
        });

        if (found) {
            return {
                id: String(found.agen_id || found.AgenID).padStart(3, '0'),
                nama: String(found.agen_nama || found.AgenNama).toUpperCase()
            };
        }

        if (activeAgenId && activeAgenId.toUpperCase().includes('PUSAT')) {
            return { id: '001', nama: 'PUSAT DAKOTA' };
        }

        return {
            id: (activeCabangId || activeAgenId || '001').padStart(3, '0'),
            nama: activeAgenId ? `AGEN ${activeAgenId.toUpperCase()}` : 'PUSAT DAKOTA'
        };
    }

    const currentActiveAgen = getActiveAgen();
    const isHoldingUser =
        String(currentActiveAgen.nama || '').toUpperCase().includes('PUSAT') ||
        String(currentActiveAgen.nama || '').toUpperCase().includes('HOLDING') ||
        String(currentActiveAgen.id || '') === '001' ||
        String(localStorage.getItem('active_agen_id') || '').toUpperCase().includes('PUSAT') ||
        (!currentActiveAgen.id && !currentActiveAgen.nama);

    // Filter Utama Dashboard
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [bypassTanggal, setBypassTanggal] = useState(false);
    const [selectedCabang, setSelectedCabang] = useState(isHoldingUser ? '' : currentActiveAgen.id);
    const [selectedJenis, setSelectedJenis] = useState('');
    const [selectedTerbayar, setSelectedTerbayar] = useState('');
    const [searchCustomer, setSearchCustomer] = useState('');
    const [searchInvoice, setSearchInvoice] = useState('');
    const [searchKwitansi, setSearchKwitansi] = useState('');
    const [searchBTT, setSearchBTT] = useState('');

    useEffect(() => {
        if (!isHoldingUser && currentActiveAgen.id) {
            setSelectedCabang(currentActiveAgen.id);
        }
    }, [isHoldingUser, currentActiveAgen.id, cabangList]);

    useEffect(() => {
        const handleOutsideClick = () => setActivePrintMenuId(null);
        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, []);

    // =========================================================================
    // STATE MODAL BUAT INVOICE BARU
    // =========================================================================
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addStep, setAddStep] = useState(1);
    const [bttStartDate, setBttStartDate] = useState(firstDay);
    const [bttEndDate, setBttEndDate] = useState(today);
    const [bttBypassTanggal, setBttBypassTanggal] = useState(true);
    const [bttDisplayType, setBttDisplayType] = useState('KREDIT');

    // Penanda invoice aktif yang baru tersimpan
    const [savedInvoiceId, setSavedInvoiceId] = useState(null);
    const [savedKwitansiNo, setSavedKwitansiNo] = useState(null);
    const [persistedSelectedBtts, setPersistedSelectedBtts] = useState([]);

    const [newInvoiceForm, setNewInvoiceForm] = useState({
        artih_tanggal: today,
        artih_custid: '',
        artih_custname: '',
        artih_agenid: currentActiveAgen.id,
        artih_agenname: currentActiveAgen.nama,
        artih_jenis: 'K',
        artih_fktpajak: '010.',
        artih_keterangan: '',
        selected_btts: []
    });

    const [unbilledBTTList, setUnbilledBTTList] = useState([]);
    const [loadingUnbilled, setLoadingUnbilled] = useState(false);

    // Modal Edit Invoice dari List
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeInvoice, setActiveInvoice] = useState(null);
    const [activeBTTList, setActiveBTTList] = useState([]);

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const [resCabang, resCust] = await Promise.all([
                api.get('/gl/agen-ca?stt=', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/gl/customers?limit=1000', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setCabangList(resCabang.data?.data || []);
            setCustList(resCust.data?.data || []);
        } catch (err) {
            console.error("Gagal load opsi filter:", err);
        }
    };

    const fetchInvoiceList = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            let url = `/piutang/invoice?pt_id=${ptId}&bypass_tanggal=${bypassTanggal}`;

            if (!bypassTanggal) {
                url += `&start_date=${startDate}&end_date=${endDate}`;
            }
            if (selectedCabang) url += `&agen_id=${encodeURIComponent(selectedCabang)}`;
            if (selectedJenis) url += `&jenis=${encodeURIComponent(selectedJenis)}`;
            if (selectedTerbayar) url += `&terbayar=${encodeURIComponent(selectedTerbayar)}`;
            if (searchCustomer) url += `&customer=${encodeURIComponent(searchCustomer)}`;
            if (searchInvoice) url += `&no_invoice=${encodeURIComponent(searchInvoice)}`;
            if (searchKwitansi) url += `&no_kwitansi=${encodeURIComponent(searchKwitansi)}`;
            if (searchBTT) url += `&no_btt=${encodeURIComponent(searchBTT)}`;

            const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load daftar invoice:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOptions();
        fetchInvoiceList();
    }, []);

    const handleApplyFilter = (e) => {
        if (e) e.preventDefault();
        fetchInvoiceList();
    };

    const handleResetFilter = () => {
        setStartDate(firstDay);
        setEndDate(today);
        setBypassTanggal(false);
        setSelectedCabang(isHoldingUser ? '' : currentActiveAgen.id);
        setSelectedJenis('');
        setSelectedTerbayar('');
        setSearchCustomer('');
        setSearchInvoice('');
        setSearchKwitansi('');
        setSearchBTT('');
        fetchInvoiceList();
    };

    // =========================================================================
    // 🖨️ CETAK SUMMARY REKAP FAKTUR
    // =========================================================================
    const handlePrintRekapRingkas = () => {
        if (!data || data.length === 0) {
            Swal.fire('Peringatan', 'Tidak ada data invoice untuk dicetak.', 'warning');
            return;
        }

        const printWindow = window.open('', '_blank', 'width=1200,height=800');
        if (!printWindow) return;

        let totalKoli = 0;
        let totalBerat = 0;
        let totalPacking = 0;
        let totalPenerus = 0;
        let totalBiayaKirim = 0;
        let grandTotal = 0;

        const rowsHtml = data.map((item, idx) => {
            const total = Number(item.artih_total || 0);
            const berat = Number(item.artih_berat || item.total_berat || 0);
            const koli = Number(item.artih_koli || item.total_koli || 1);
            const penerus = Number(item.artih_penerus || item.total_penerus || 0);
            const packing = Number(item.artih_packing || item.total_packing || 0);
            const biayaKirim = total - penerus - packing;

            totalKoli += koli;
            totalBerat += berat;
            totalPenerus += penerus;
            totalPacking += packing;
            totalBiayaKirim += biayaKirim;
            grandTotal += total;

            return `
                <tr style="font-family: monospace; font-size: 10px;">
                    <td style="border: 1px solid #333; padding: 4px; text-align: center;">${idx + 1}</td>
                    <td style="border: 1px solid #333; padding: 4px;">${item.artih_id}</td>
                    <td style="border: 1px solid #333; padding: 4px;">${item.cust_name || item.artih_custname || '-'}</td>
                    <td style="border: 1px solid #333; padding: 4px; font-weight: bold;">${item.bttt_id || item.artih_nobtt || '-'}</td>
                    <td style="border: 1px solid #333; padding: 4px; text-align: center;">${String(item.artih_tanggal || '').substring(0, 10)}</td>
                    <td style="border: 1px solid #333; padding: 4px;">${item.tujuan || item.artih_tujuan || '-'}</td>
                    <td style="border: 1px solid #333; padding: 4px;">${item.penerima || item.artih_penerima || '-'}</td>
                    <td style="border: 1px solid #333; padding: 4px; text-align: center;">DARAT</td>
                    <td style="border: 1px solid #333; padding: 4px; text-align: center;">${koli}</td>
                    <td style="border: 1px solid #333; padding: 4px; text-align: right;">${berat.toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid #333; padding: 4px; text-align: right;">0</td>
                    <td style="border: 1px solid #333; padding: 4px; text-align: right;">${packing.toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid #333; padding: 4px; text-align: right;">${penerus.toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid #333; padding: 4px; text-align: right;">${biayaKirim.toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid #333; padding: 4px; text-align: right; font-weight: bold;">${total.toLocaleString('id-ID')}</td>
                </tr>
            `;
        }).join('');

        const headerFakturNo = data[0]?.artih_id || '-';
        const headerKwitansiNo = data[0]?.artih_nokw || '-';
        const headerCustomer = data.length === 1 ? (data[0]?.cust_name || data[0]?.artih_custname) : 'SEMUA CUSTOMER (TERFILTER)';

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>FAKTUR PENAGIHAN - DAKOTA LOGISTIK INDONESIA</title>
                <style>
                    @page { size: A4 landscape; margin: 8mm; }
                    body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 10px; color: #000; }
                    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                    th { border: 1px solid #000; padding: 6px 3px; background-color: #cbd5e1; font-size: 9px; text-align: center; }
                    .btn-ctrl { padding: 7px 18px; font-weight: bold; border-radius: 6px; border: none; cursor: pointer; text-transform: uppercase; margin: 0 4px; }
                    @media print { .no-print { display: none !important; } }
                </style>
            </head>
            <body>
                <div class="no-print" style="margin-bottom: 12px; text-align: right;">
                    <button class="btn-ctrl" style="background:#16a34a; color:white;" onclick="window.print()">PRINT</button>
                    <button class="btn-ctrl" style="background:#e11d48; color:white;" onclick="window.close()">TUTUP</button>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #000; padding-bottom:6px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${dakotaLogo}" alt="Logo Dakota" style="height:42px; object-fit:contain;" />
                        <div>
                            <h2 style="margin:0; font-size:14px; font-weight:900;">PT DAKOTA LOGISTIK INDONESIA</h2>
                            <div style="font-size:10px; color:#444;">Jl. Wibawa Mukti II No. 99, Jatiasih, Bekasi</div>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <h2 style="margin:0; font-size:15px; font-weight:900; text-decoration:underline;">FAKTUR PENAGIHAN</h2>
                        <div style="font-size:10px; font-weight:bold; margin-top:2px;">NO. FAKTUR: ${headerFakturNo}</div>
                        <div style="font-size:10px; color:#444;">NO. KWITANSI: ${headerKwitansiNo}</div>
                        <div style="font-size:10px; color:#444;">CUSTOMER: ${headerCustomer}</div>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width:3%;">NO</th>
                            <th style="width:11%;">NO. INVOICE</th>
                            <th style="width:14%;">NAMA CUSTOMER</th>
                            <th style="width:9%;">NO. BTT</th>
                            <th style="width:8%;">TANGGAL</th>
                            <th style="width:9%;">KOTA TUJUAN</th>
                            <th style="width:12%;">PENERIMA</th>
                            <th style="width:5%;">SERVICE</th>
                            <th style="width:4%;">KOLI</th>
                            <th style="width:5%;">BERAT</th>
                            <th style="width:4%;">UKURAN</th>
                            <th style="width:5%;">PACKING</th>
                            <th style="width:5%;">PENERUS</th>
                            <th style="width:6%;">BIAYA KIRIM</th>
                            <th style="width:8%;">TOTAL BIAYA</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                    <tfoot>
                        <tr style="background-color:#f1f5f9; font-weight:bold; font-family:monospace; font-size:10px;">
                            <td colspan="8" style="border:1px solid #333; padding:6px; text-align:center;">JUMLAH TOTAL :</td>
                            <td style="border:1px solid #333; padding:6px; text-align:center;">${totalKoli}</td>
                            <td style="border:1px solid #333; padding:6px; text-align:right;">${totalBerat.toLocaleString('id-ID')}</td>
                            <td style="border:1px solid #333; padding:6px; text-align:right;">0</td>
                            <td style="border:1px solid #333; padding:6px; text-align:right;">${totalPacking.toLocaleString('id-ID')}</td>
                            <td style="border:1px solid #333; padding:6px; text-align:right;">${totalPenerus.toLocaleString('id-ID')}</td>
                            <td style="border:1px solid #333; padding:6px; text-align:right;">${totalBiayaKirim.toLocaleString('id-ID')}</td>
                            <td style="border:1px solid #333; padding:6px; text-align:right; font-weight:900; color:#b91c1c;">Rp ${grandTotal.toLocaleString('id-ID')}</td>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // =========================================================================
    // 🖨️ CETAK REKAP FAKTUR PAJAK
    // =========================================================================
    const handlePrintRekapFakturPajak = () => {
        if (!data || data.length === 0) {
            Swal.fire('Peringatan', 'Tidak ada data faktur untuk membuat rekap.', 'warning');
            return;
        }

        const printWindow = window.open('', '_blank', 'width=1350,height=850');
        if (!printWindow) return;

        let totalJasa = 0;
        let totalDiskon = 0;
        let totalPenerus = 0;
        let totalPacking = 0;
        let totalJumlah = 0;
        let totalPPN = 0;
        let totalPiutang = 0;
        let totalDPP = 0;

        const rowsHtml = data.map((item, idx) => {
            const sub = Number(item.artih_total || 0);
            const dpp = Number(item.artih_dpp || sub);
            const ppn = Number(item.artih_ppn_nominal || (dpp * 0.011));
            const piutang = sub + ppn;

            totalJasa += sub;
            totalJumlah += sub;
            totalDPP += dpp;
            totalPPN += ppn;
            totalPiutang += piutang;

            return `
                <tr style="font-size: 10px; font-family: monospace;">
                    <td style="border:1px solid #444; padding:3px; text-align:center;">${idx + 1}</td>
                    <td style="border:1px solid #444; padding:3px; text-align:center;">${item.artih_fktpajak || '010.'}</td>
                    <td style="border:1px solid #444; padding:3px;">${item.artih_nokw || '-'}</td>
                    <td style="border:1px solid #444; padding:3px; text-align:center;">${String(item.artih_tanggal || '').substring(0, 10)}</td>
                    <td style="border:1px solid #444; padding:3px;">${item.artih_id}</td>
                    <td style="border:1px solid #444; padding:3px;">${item.cust_name || item.artih_custname || '-'}</td>
                    <td style="border:1px solid #444; padding:3px; text-align:center;">-</td>
                    <td style="border:1px solid #444; padding:3px; text-align:center;">-</td>
                    <td style="border:1px solid #444; padding:3px; text-align:right;">${sub.toLocaleString('id-ID')}</td>
                    <td style="border:1px solid #444; padding:3px; text-align:right;">0</td>
                    <td style="border:1px solid #444; padding:3px; text-align:right;">0</td>
                    <td style="border:1px solid #444; padding:3px; text-align:right;">0</td>
                    <td style="border:1px solid #444; padding:3px; text-align:right; font-weight:bold;">${sub.toLocaleString('id-ID')}</td>
                    <td style="border:1px solid #444; padding:3px; text-align:right;">${sub.toLocaleString('id-ID')}</td>
                    <td style="border:1px solid #444; padding:3px; text-align:right;">${ppn.toLocaleString('id-ID')}</td>
                    <td style="border:1px solid #444; padding:3px; text-align:right; font-weight:bold;">${piutang.toLocaleString('id-ID')}</td>
                    <td style="border:1px solid #444; padding:3px; text-align:right;">${dpp.toLocaleString('id-ID')}</td>
                    <td style="border:1px solid #444; padding:3px;">${item.cust_name || item.artih_custname || '-'}</td>
                    <td style="border:1px solid #444; padding:3px; text-align:center;">-</td>
                    <td style="border:1px solid #444; padding:3px; text-align:center;">-</td>
                    <td style="border:1px solid #444; padding:3px; text-align:right;">0</td>
                </tr>
            `;
        }).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>REKAP FAKTUR PAJAK - DAKOTA LOGISTIK INDONESIA</title>
                <style>
                    @page { size: A3 landscape; margin: 8mm; }
                    body { font-family: Arial, sans-serif; font-size: 10px; margin: 10px; color: #000; }
                    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                    th { border: 1px solid #000; background: #cbd5e1; padding: 5px 2px; text-align:center; font-size:9px; }
                    .btn-print { background:#16a34a; color:#fff; border:none; padding:8px 18px; font-weight:bold; border-radius:6px; cursor:pointer; }
                    @media print { .no-print { display:none !important; } }
                </style>
            </head>
            <body>
                <div class="no-print" style="margin-bottom:12px; text-align:right;">
                    <button class="btn-print" onclick="window.print()">PRINT REKAP FAKTUR</button>
                    <button class="btn-print" style="background:#e11d48;" onclick="window.close()">TUTUP</button>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:6px; margin-bottom:8px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${dakotaLogo}" alt="Logo Dakota" style="height:42px; object-fit:contain;" />
                        <div>
                            <h2 style="margin:0; font-size:14px; font-weight:900;">PT DAKOTA LOGISTIK INDONESIA</h2>
                            <div style="font-size:10px; color:#444;">Jl. Wibawa Mukti II No. 99, Jatiasih, Bekasi</div>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <h2 style="margin:0; font-size:16px; font-weight:900; letter-spacing:0.5px;">REKAP FAKTUR PAJAK</h2>
                        <div style="font-size:10px; font-weight:bold; color:#444; margin-top:2px;">Periode : ${startDate} - ${endDate}</div>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th rowspan="2" style="width:2%;">No</th>
                            <th colspan="4">FAKTUR PAJAK</th>
                            <th rowspan="2" style="width:12%;">CUSTOMER</th>
                            <th rowspan="2" style="width:12%;">ALAMAT</th>
                            <th rowspan="2" style="width:7%;">NPWP</th>
                            <th colspan="5">RINCIAN</th>
                            <th rowspan="2" style="width:6%;">Harga Jual</th>
                            <th rowspan="2" style="width:5%;">UTANG PPN</th>
                            <th rowspan="2" style="width:6%;">PIUTANG USAHA</th>
                            <th style="width:5%;">PPN</th>
                            <th rowspan="2" style="width:11%;">Nama di BTT</th>
                            <th colspan="2">TUKAR FAKTUR</th>
                            <th rowspan="2" style="width:3%;">Asuransi</th>
                        </tr>
                        <tr>
                            <th style="width:4%;">No. Faktur</th>
                            <th style="width:8%;">Kwitansi</th>
                            <th style="width:5%;">Tanggal</th>
                            <th style="width:8%;">No. Invoice</th>
                            <th style="width:5%;">Jasa Kirim</th>
                            <th style="width:3%;">Diskon</th>
                            <th style="width:3%;">Penerus</th>
                            <th style="width:3%;">Packing</th>
                            <th style="width:5%;">JUMLAH</th>
                            <th>DPP</th>
                            <th style="width:4%;">Tanggal</th>
                            <th style="width:5%;">Nama</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                    <tfoot>
                        <tr style="background:#cbd5e1; font-weight:bold; font-size:10px; font-family:monospace;">
                            <td colspan="8" style="border:1px solid #444; padding:5px; text-align:right;">TOTAL KESELURUHAN</td>
                            <td style="border:1px solid #444; padding:5px; text-align:right;">${totalJasa.toLocaleString('id-ID')}</td>
                            <td style="border:1px solid #444; padding:5px; text-align:right;">${totalDiskon.toLocaleString('id-ID')}</td>
                            <td style="border:1px solid #444; padding:5px; text-align:right;">${totalPenerus.toLocaleString('id-ID')}</td>
                            <td style="border:1px solid #444; padding:5px; text-align:right;">${totalPacking.toLocaleString('id-ID')}</td>
                            <td style="border:1px solid #444; padding:5px; text-align:right;">${totalJumlah.toLocaleString('id-ID')}</td>
                            <td style="border:1px solid #444; padding:5px; text-align:right;">${totalJumlah.toLocaleString('id-ID')}</td>
                            <td style="border:1px solid #444; padding:5px; text-align:right;">${totalPPN.toLocaleString('id-ID')}</td>
                            <td style="border:1px solid #444; padding:5px; text-align:right;">${totalPiutang.toLocaleString('id-ID')}</td>
                            <td style="border:1px solid #444; padding:5px; text-align:right;">${totalDPP.toLocaleString('id-ID')}</td>
                            <td colspan="4" style="border:1px solid #444;"></td>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const loadUnbilledBTTByDate = async (custId, start, end, bypass, displayType, custNameParam, jenisParam) => {
        if (!custId) return;
        setLoadingUnbilled(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const activeName = custNameParam || newInvoiceForm.artih_custname || '';
            const activeJenis = jenisParam || newInvoiceForm.artih_jenis || 'K';

            let url = `/piutang/invoice/unbilled-btt?pt_id=${ptId}&cust_id=${encodeURIComponent(custId)}&cust_name=${encodeURIComponent(activeName)}&jenis=${activeJenis}&display_type=${displayType || 'KREDIT'}`;

            url += `&bypass_tanggal=${bypass}`;
            if (!bypass && start && end) {
                url += `&start_date=${start}&end_date=${end}`;
            }

            const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setUnbilledBTTList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load unbilled BTT:", err);
            setUnbilledBTTList([]);
        } finally {
            setLoadingUnbilled(false);
        }
    };

    const handleSelectCustomerForNewInvoice = (custId) => {
        const cust = custList.find(c => String(c.cust_id) === String(custId));
        setNewInvoiceForm(prev => ({
            ...prev,
            artih_custid: custId,
            artih_custname: cust ? (cust.cust_name || cust.CustName) : '',
            selected_btts: []
        }));
    };

    const handleProceedToDetails = () => {
        // 1. Validasi Customer wajib dipilih
        if (!newInvoiceForm.artih_custid) {
            Swal.fire({
                title: 'Peringatan',
                text: 'Silakan pilih Customer terlebih dahulu!',
                icon: 'warning',
                confirmButtonColor: '#eab308'
            });
            return;
        }

        // 2. Validasi Keterangan Wajib Diisi (Mandatory)
        if (!newInvoiceForm.artih_keterangan || newInvoiceForm.artih_keterangan.trim() === '') {
            Swal.fire({
                title: 'Keterangan Wajib Diisi!',
                text: 'Silakan isi Keterangan terlebih dahulu sebelum melanjutkan ke tambah rincian BTT.',
                icon: 'warning',
                confirmButtonColor: '#e11d48'
            });
            return;
        }

        // Lanjut ke Langkah 2 jika valid
        setAddStep(2);
        loadUnbilledBTTByDate(
            newInvoiceForm.artih_custid,
            bttStartDate,
            bttEndDate,
            bttBypassTanggal,
            bttDisplayType,
            newInvoiceForm.artih_custname,
            newInvoiceForm.artih_jenis
        );
    };

    const handleFilterBTTChange = (newStart, newEnd, newBypass, newType) => {
        setBttStartDate(newStart);
        setBttEndDate(newEnd);
        setBttBypassTanggal(newBypass);
        setBttDisplayType(newType);

        loadUnbilledBTTByDate(
            newInvoiceForm.artih_custid,
            newStart,
            newEnd,
            newBypass,
            newType,
            newInvoiceForm.artih_custname,
            newInvoiceForm.artih_jenis
        );
    };

    // =========================================================================
    // 💾 SIMPAN INVOICE BARU
    // =========================================================================
    const handleSaveNewInvoice = async (e) => {
        if (e) e.preventDefault();

        // Ambil objek BTT yang sedang dipilih
        const currentChosen = unbilledBTTList.filter(b => {
            const cleanId = String(b.bttt_id || '').trim();
            return newInvoiceForm.selected_btts.some(id => String(id).trim() === cleanId);
        });

        if (newInvoiceForm.selected_btts.length === 0 && persistedSelectedBtts.length === 0) {
            Swal.fire('Peringatan', 'Pilih minimal satu nomor resi BTT untuk difakturkan!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const dateObj = new Date(newInvoiceForm.artih_tanggal);
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const yyyy = String(dateObj.getFullYear());
            const yy = yyyy.substring(2);
            const agenKode = String(newInvoiceForm.artih_agenid || '001').padStart(3, '0');

            const payload = {
                artih_tanggal: newInvoiceForm.artih_tanggal,
                artih_custid: newInvoiceForm.artih_custid,
                artih_custname: newInvoiceForm.artih_custname,
                artih_agenid: agenKode,
                artih_jenis: newInvoiceForm.artih_jenis,
                artih_fktpajak: newInvoiceForm.artih_fktpajak || '010.',
                artih_keterangan: newInvoiceForm.artih_keterangan,
                btt_list: newInvoiceForm.selected_btts,
                format_meta: {
                    corp: 'DLI',
                    agen: agenKode,
                    month: mm,
                    year_full: yyyy,
                    year_short: yy
                }
            };

            const res = await api.post(`/piutang/invoice/save?pt_id=${ptId}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const newInvoiceId = res.data?.invoice_id || res.data?.id;
            const newNoKW = res.data?.nokw || res.data?.artih_nokw;

            Swal.fire({
                title: 'BERHASIL DISIMPAN!',
                text: `Invoice ${newInvoiceId || ''} berhasil disimpan sebagai Draft.`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });

            // 1. Simpan nomor faktur & kwitansi resmi yang baru terbentuk
            setSavedInvoiceId(newInvoiceId);
            if (newNoKW) setSavedKwitansiNo(newNoKW);

            // 2. Kunci data BTT yang dipilih agar TETAP TAMPIL di tabel atas
            setPersistedSelectedBtts(currentChosen);

            // 3. Refresh data tabel utama dan daftar unbilled bawah
            fetchInvoiceList();
            loadUnbilledBTTByDate(
                newInvoiceForm.artih_custid,
                bttStartDate,
                bttEndDate,
                bttBypassTanggal,
                bttDisplayType,
                newInvoiceForm.artih_custname,
                newInvoiceForm.artih_jenis
            );

        } catch (err) {
            Swal.fire('Gagal!', err.response?.data?.message || 'Gagal menyimpan invoice.', 'error');
        }
    };

    const handleOpenEditInvoice = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get(`/piutang/invoice/detail?id=${encodeURIComponent(item.artih_id)}&pt_id=${ptId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const header = res.data?.data?.header || res.data?.header || item;
            const btts = res.data?.data?.btt_list || res.data?.btt_list || [];

            // 🎯 Normalisasi nomor kwitansi: ganti /OTA/ menjadi /001/
            const rawKW = String(header.artih_nokw || '').trim();
            const cleanKW = rawKW.replace(/\/OTA\//g, '/001/');

            // 1. Simpan nomor faktur & nomor kwitansi yang sudah dinormalisasi
            setSavedInvoiceId(header.artih_id);
            setSavedKwitansiNo(cleanKW);

            // 2. Kunci data BTT yang ada
            const existingBttIds = btts.map(b => String(b.bttt_id).trim());
            setPersistedSelectedBtts(btts);

            // 3. Masukkan data ke form state
            setNewInvoiceForm({
                artih_tanggal: String(header.artih_tanggal || '').split('T')[0] || today,
                artih_custid: header.artih_custid || '',
                artih_custname: header.cust_name || header.artih_custname || '',
                artih_agenid: header.artih_agenid || '001',
                artih_agenname: header.agen_nama || 'PUSAT DAKOTA',
                artih_jenis: header.artih_jenis || 'K',
                artih_fktpajak: header.artih_fktpajak || '010.',
                artih_keterangan: header.artih_keterangan || '',
                selected_btts: existingBttIds
            });

            // 4. Buka modal langkah 2
            setAddStep(2);
            setIsAddModalOpen(true);

            // 5. Muat daftar BTT unbilled lain
            loadUnbilledBTTByDate(
                header.artih_custid,
                bttStartDate,
                bttEndDate,
                true,
                header.artih_jenis === 'B' ? 'TUNAI' : 'KREDIT',
                header.cust_name || header.artih_custname,
                header.artih_jenis
            );

        } catch (err) {
            Swal.fire('Error', 'Gagal mengambil detail invoice: ' + (err.message || err), 'error');
        }
    };

    const handlePostingInvoice = (invoiceId) => {
        const id = invoiceId || activeInvoice?.artih_id || savedInvoiceId;
        Swal.fire({
            title: 'Posting Invoice?',
            text: `Invoice ${id} akan diposting dan jurnal memorial otomatis terbentuk. Lanjutkan?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            confirmButtonText: 'Ya, POSTING SEKARANG',
            cancelButtonText: 'Batal'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    const ptId = localStorage.getItem('pt_id') || 'C';
                    const currentAgen = getActiveAgen();

                    const response = await api.post(`/piutang/invoice/posting?pt_id=${ptId}`, {
                        invoice_id: id,
                        agen_id: currentAgen.id
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Berhasil!', response.data?.message || 'Invoice resmi diposting!', 'success');
                    setIsEditModalOpen(false);
                    setIsAddModalOpen(false);
                    fetchInvoiceList();
                } catch (err) {
                    Swal.fire('Gagal!', err.response?.data?.message || 'Gagal memposting invoice.', 'error');
                }
            }
        });
    };

    const handleDeleteInvoice = (item) => {
        if (!item) return;

        Swal.fire({
            title: 'Hapus Invoice?',
            text: `Apakah Anda yakin ingin menghapus Invoice ${item.artih_id}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    const ptId = localStorage.getItem('pt_id') || 'C';
                    await api.delete(`/piutang/invoice?id=${encodeURIComponent(item.artih_id)}&pt_id=${ptId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Berhasil!', `Invoice ${item.artih_id} berhasil dihapus.`, 'success');
                    fetchInvoiceList();
                } catch (err) {
                    Swal.fire('Gagal!', err.response?.data?.message || 'Gagal menghapus invoice.', 'error');
                }
            }
        });
    };

    // =========================================================================
    // 🖨️ FUNGSI CETAK DOKUMEN (FAKTUR, KWITANSI TIPE 1, TIPE 2, SUMMARY)
    // =========================================================================
    const handlePrintDocument = async (invoiceItem, docType = 'FAKTUR') => {
        const item = invoiceItem || activeInvoice;
        if (!item || !item.artih_id) {
            Swal.fire('Peringatan', 'Data invoice tidak valid untuk dicetak.', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get(`/piutang/invoice/detail?id=${encodeURIComponent(item.artih_id)}&pt_id=${ptId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const header = res.data?.data?.header || res.data?.header || item;
            const btts = res.data?.data?.btt_list || res.data?.btt_list || persistedSelectedBtts || [];

            // 🎯 Nomor Kwitansi bersih global untuk semua jenis cetakan
            const rawNoKW = header.artih_nokw || savedKwitansiNo || '';
            const kwitansiDisplayNo = String(rawNoKW).trim().replace(/\/OTA\//g, '/001/');

            const printWindow = window.open('', '_blank', 'width=1150,height=850,scrollbars=yes');
            if (!printWindow) {
                Swal.fire('Popup Diblokir', 'Izinkan popup browser untuk mencetak dokumen ini.', 'warning');
                return;
            }

            // =====================================================================
            // 📄 1. CETAK KHUSUS: KWITANSI TIPE 1 (SESUAI ASP LAWAS + MODERN HEADER)
            // =====================================================================
            if (docType === 'KWITANSI_1') {
                let totalBiayaKirim = 0;
                let totalDiskon = 0;
                let totalAsuransi = 0;
                let totalPacking = 0;
                let totalBerat = 0;

                const kwitansiRowsHtml = btts.map((b, idx) => {
                    const biayaKirim = Number(b.bttt_harga || 0);
                    const diskon = Number(b.bttt_disc || 0);
                    const asuransi = Number(b.biaya_asuransi || 0);
                    const packing = Number(b.biaya_packing || 0);
                    const berat = Number(b.bttt_berat || 0);

                    totalBiayaKirim += biayaKirim;
                    totalDiskon += diskon;
                    totalAsuransi += asuransi;
                    totalPacking += packing;
                    totalBerat += berat;

                    return `
                        <tr style="font-size: 10px; font-family: Arial, sans-serif;">
                            <td style="border: 1px solid #cbd5e1; padding: 5px 3px; text-align: center;">${idx + 1}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; font-family: monospace; font-weight: bold; color: #0284c7;">${b.bttt_id}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 3px; text-align: center;">${formatTanggalIndonesia(b.bttt_tanggal)}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 4px;">${b.bttt_tujuankota || '-'}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; font-weight: 500;">${b.bttt_tujuannama || '-'}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 3px; text-align: center;">${b.bttt_nosuratjalan || '-'}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: right; font-family: monospace; font-weight: 600;">${biayaKirim.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: right; font-family: monospace;">${berat.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; color: #475569;">${b.bttt_namabarang || '-'}</td>
                        </tr>
                    `;
                }).join('');

                const nilaiJual = totalBiayaKirim - totalDiskon + totalAsuransi + totalPacking;
                const dpp = nilaiJual;
                const ppn = dpp * 0.011;
                const totalTagihan = Number(header.artih_total || (nilaiJual + ppn));

                // 🎯 1. Format Nomor Invoice Resmi (Bebas OTA)
                const noInvoiceResmi = formatNomorInvoiceResmi(header.artih_id, header.artih_tanggal);

                // 🎯 2. Format Nomor Faktur Pajak sesuai data e-Faktur
                let noFakturPajak = String(header.artih_fktpajak || '').trim();
                if (!noFakturPajak || noFakturPajak === '010.' || noFakturPajak === '010') {
                    noFakturPajak = '010.026.00.340034701';
                }

                // 🎯 3. Format Tanggal Indonesia (contoh: 29 September 2026)
                const tglKwitansiIndo = formatTanggalIndonesia(header.artih_tanggal);
                const tglJatuhTempoIndo = formatTanggalIndonesia(header.artih_tanggal);

                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>KWITANSI - ${kwitansiDisplayNo || noInvoiceResmi}</title>
                        <style>
                            @page { size: A4 landscape; margin: 8mm; }
                            body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 12px; color: #1e293b; }
                            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
                            th { border: 1px solid #94a3b8; padding: 6px 3px; background-color: #e2e8f0; font-size: 9.5px; text-align: center; font-weight: bold; color: #0f172a; text-transform: uppercase; }
                            .no-print { margin-bottom: 12px; text-align: right; }
                            .btn-print { padding: 7px 18px; font-weight: bold; border-radius: 6px; border: none; cursor: pointer; color: white; margin: 0 4px; font-size: 11px; text-transform: uppercase; }
                            @media print { .no-print { display: none !important; } }
                        </style>
                    </head>
                    <body>
                        <div class="no-print">
                            <button class="btn-print" style="background:#16a34a;" onclick="window.print()">PRINT</button>
                            <button class="btn-print" style="background:#e11d48;" onclick="window.close()">TUTUP</button>
                        </div>

                        <!-- 1. KOP RESMI DENGAN LOGO DAKOTA CARGO -->
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <img src="${dakotaLogo}" alt="Logo Dakota Cargo" style="height:44px; object-fit:contain;" />
                                <div>
                                    <h2 style="margin:0; font-size:15px; font-weight:900; color:#004b84; letter-spacing:0.3px;">PT DAKOTA LOGISTIK INDONESIA</h2>
                                    <div style="font-size:10px; color:#64748b; margin-top:2px;">Jl. Wibawa Mukti II No. 99, Jatiasih, Bekasi - Jawa Barat</div>
                                </div>
                            </div>
                            <div style="text-align:right;">
                                <h1 style="margin:0; font-size:18px; font-weight:900; letter-spacing:0.5px; color:#004b84;">KWITANSI PENAGIHAN</h1>
                                <div style="font-size:10px; font-weight:bold; color:#0284c7; margin-top:2px;">NO. KWITANSI: ${kwitansiDisplayNo || '-'}</div>
                            </div>
                        </div>

                        <div style="height:3px; background:#004b84; margin:8px 0 10px 0; border-radius:2px;"></div>

                        <!-- 2. DATA PELANGGAN (KIRI) & METADATA INVOICE RESMI (KANAN) -->
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; font-size:11px; background:#f8fafc; padding:8px 12px; border-radius:6px; border:1px solid #e2e8f0;">
                            <div style="width: 50%;">
                                <div style="color:#64748b; font-size:10px; text-transform:uppercase; font-weight:bold;">Nama Pelanggan :</div>
                                <div style="font-weight:900; font-size:13px; color:#0f172a; text-transform:uppercase; margin-top:2px;">${header.cust_name || header.artih_custname || '-'}</div>
                                <div style="font-size:10.5px; color:#475569; margin-top:2px;">${header.cust_alamat || 'KANTOR PUSAT OPERASIONAL'}</div>
                            </div>
                            <div style="width: 46%;">
                                <table style="width: 100%; border: none; margin: 0; font-size: 11px;">
                                    <tr>
                                        <td style="padding: 2px 0; width: 42%; color:#475569;">Tanggal Kwitansi</td>
                                        <td style="padding: 2px 0; width: 4%;">:</td>
                                        <td style="padding: 2px 0; font-weight: bold; color:#0f172a;">${tglKwitansiIndo}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 2px 0; color:#475569;">Nomor Invoice</td>
                                        <td style="padding: 2px 0;">:</td>
                                        <td style="padding: 2px 0; font-weight: 800; font-family: monospace; color:#0284c7;">${noInvoiceResmi}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 2px 0; color:#475569;">Nomor Faktur Pajak</td>
                                        <td style="padding: 2px 0;">:</td>
                                        <td style="padding: 2px 0; font-family: monospace; font-weight: 600; color:#0f172a;">${noFakturPajak}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 2px 0; color:#475569;">Tanggal Jatuh Tempo</td>
                                        <td style="padding: 2px 0;">:</td>
                                        <td style="padding: 2px 0; font-weight: bold; color:#b91c1c;">${tglJatuhTempoIndo}</td>
                                    </tr>
                                </table>
                            </div>
                        </div>

                        <!-- 3. TABEL DAFTAR RESI SESUAI FILE LAWAS ASP -->
                        <table>
                            <thead>
                                <tr>
                                    <th style="width:3%;">No Urut</th>
                                    <th style="width:14%;">No Resi Pengiriman</th>
                                    <th style="width:11%;">Tanggal Kirim</th>
                                    <th style="width:10%;">Kota Tujuan</th>
                                    <th style="width:18%;">Penerima</th>
                                    <th style="width:13%;">No Surat Jalan / POD</th>
                                    <th style="width:9%;">Biaya Kirim</th>
                                    <th style="width:6%;">Berat</th>
                                    <th style="width:16%;">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${kwitansiRowsHtml || '<tr><td colspan="9" style="text-align:center; padding:10px;">Tidak ada rincian resi</td></tr>'}
                            </tbody>
                        </table>

                        <!-- 4. FOOTER INFORMASI PEMBAYARAN, TANDA TANGAN & REKAP KEUANGAN -->
                        <div style="display:flex; border: 1px solid #94a3b8; border-top: none; font-size: 10px; background:#ffffff;">
                            <!-- Sisi Kiri: Rekening Bank -->
                            <div style="width: 35%; padding: 10px; border-right: 1px solid #cbd5e1; display:flex; flex-direction:column; justify-content:center;">
                                <div style="font-weight:bold; color:#004b84; margin-bottom:2px; font-size:11px;">Transfer ke :</div>
                                <div style="font-weight:bold; color:#0f172a;">DAKOTA LOGISTIK INDONESIA PT</div>
                                <div style="color:#334155;">BANK CENTRAL ASIA (BCA)</div>
                                <div style="color:#334155;">KCU KALIMALANG</div>
                                <div style="font-weight:900; font-family:monospace; color:#0284c7; font-size:12px; margin-top:3px;">
                                    NO REKENING : 2303937226
                                </div>
                            </div>

                            <!-- Sisi Tengah: Tanda Tangan -->
                            <div style="width: 35%; padding: 10px; text-align: center; display: flex; flex-direction: column; justify-content: space-between; border-right: 1px solid #cbd5e1;">
                                <div style="font-weight:bold; color:#0f172a;">PT. DAKOTA LOGISTIK INDONESIA</div>
                                <div>
                                    <div style="font-weight:bold; text-decoration:underline; color:#0f172a; font-size:11px;">BAYYINATHUL RAHMATULLAH</div>
                                    <div style="font-size:9.5px; color:#64748b;">Finance & Accounting</div>
                                </div>
                            </div>

                            <!-- Sisi Kanan: Rekap DPP, PPN, dan Total -->
                            <div style="width: 30%;">
                                <table style="width: 100%; border: none; margin: 0; font-size: 10px;">
                                    <tr>
                                        <td style="padding: 3px 6px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color:#334155;">JUMLAH</td>
                                        <td style="padding: 3px 6px; text-align: right; font-family: monospace; font-weight: bold; border-bottom: 1px solid #e2e8f0;">${totalBiayaKirim.toLocaleString('id-ID')}.00</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 2px 6px; border-bottom: 1px solid #e2e8f0; color:#64748b;">(-) DISKON</td>
                                        <td style="padding: 2px 6px; text-align: right; font-family: monospace; border-bottom: 1px solid #e2e8f0;">0.00</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 2px 6px; border-bottom: 1px solid #e2e8f0; color:#64748b;">(+) ASURANSI/LOLO</td>
                                        <td style="padding: 2px 6px; text-align: right; font-family: monospace; border-bottom: 1px solid #e2e8f0;">0.00</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 2px 6px; border-bottom: 1px solid #e2e8f0; color:#64748b;">(+) PACKING/BM/LAIN</td>
                                        <td style="padding: 2px 6px; text-align: right; font-family: monospace; border-bottom: 1px solid #e2e8f0;">${totalPacking.toLocaleString('id-ID')}.00</td>
                                    </tr>
                                    <tr style="background:#f8fafc;">
                                        <td style="padding: 3px 6px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color:#0f172a;">NILAI JUAL</td>
                                        <td style="padding: 3px 6px; text-align: right; font-family: monospace; font-weight: bold; border-bottom: 1px solid #e2e8f0;">${nilaiJual.toLocaleString('id-ID')}.00</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 2px 6px; border-bottom: 1px solid #e2e8f0; color:#64748b;">DPP 1.1%</td>
                                        <td style="padding: 2px 6px; text-align: right; font-family: monospace; border-bottom: 1px solid #e2e8f0;">${dpp.toLocaleString('id-ID')}.00</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 2px 6px; border-bottom: 1px solid #e2e8f0; color:#64748b;">PPN 1.1%</td>
                                        <td style="padding: 2px 6px; text-align: right; font-family: monospace; border-bottom: 1px solid #e2e8f0;">${ppn.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                    <tr style="background:#f1f5f9; font-weight: bold;">
                                        <td style="padding: 4px 6px; color:#004b84; font-size:10.5px;">TOTAL TAGIHAN</td>
                                        <td style="padding: 4px 6px; text-align: right; font-family: monospace; font-weight: 900; font-size: 11.5px; color:#b91c1c;">Rp ${totalTagihan.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </body>
                    </html>
                `);
                printWindow.document.close();
                return;
            }

            // =====================================================================
            // 📄 2. CETAK KHUSUS: KWITANSI TIPE 2 (PERSIS GAMBAR DENGAN KOP CENTER)
            // =====================================================================
            if (docType === 'KWITANSI_2') {
                const totalBiayaKirim = btts.reduce((s, b) => s + Number(b.bttt_harga || 0), 0);
                const totalDiskon = btts.reduce((s, b) => s + Number(b.bttt_disc || 0), 0);
                const totalAsuransi = btts.reduce((s, b) => s + Number(b.biaya_asuransi || 0), 0);
                const totalPacking = btts.reduce((s, b) => s + Number(b.biaya_packing || 0), 0);

                const nilaiJual = totalBiayaKirim - totalDiskon + totalAsuransi + totalPacking;
                const ppn = nilaiJual * 0.011;
                const grandTotal = Number(header.artih_total || (nilaiJual + ppn));
                const textTerbilang = (terbilangIndonesia(Math.round(grandTotal)).trim() + ' RUPIAH').replace(/\s+/g, ' ');

                // 🎯 1. Konversi Nomor Invoice resmi (bebas OTA)
                const noInvoiceResmi = formatNomorInvoiceResmi(header.artih_id, header.artih_tanggal);

                // 🎯 2. Format Tanggal Indonesia
                const tglCetakIndo = formatTanggalIndonesia(header.artih_tanggal);

                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>KWITANSI - ${kwitansiDisplayNo || noInvoiceResmi}</title>
                        <style>
                            @page { size: A4 landscape; margin: 10mm 15mm; }
                            body { 
                                font-family: 'Segoe UI', Arial, sans-serif; 
                                font-size: 12px; 
                                color: #1e293b; 
                                margin: 0; 
                                padding: 10px 15px; 
                            }
                            .no-print { margin-bottom: 15px; text-align: right; }
                            .btn-print { 
                                padding: 7px 18px; 
                                font-weight: bold; 
                                border-radius: 6px; 
                                border: none; 
                                cursor: pointer; 
                                color: white; 
                                margin: 0 4px; 
                                font-size: 11px; 
                                text-transform: uppercase; 
                            }
                            @media print { .no-print { display: none !important; } }
                        </style>
                    </head>
                    <body>
                        <div class="no-print">
                            <button class="btn-print" style="background:#16a34a;" onclick="window.print()">PRINT</button>
                            <button class="btn-print" style="background:#e11d48;" onclick="window.close()">TUTUP</button>
                        </div>

                        <!-- 1. KOP HEADER DI TENGAH (CENTER) -->
                        <div style="display:flex; justify-content:center; align-items:center; gap:16px; margin-bottom:12px;">
                            <img src="${dakotaLogo}" alt="Logo Dakota Cargo" style="height:44px; object-fit:contain;" />
                            <div style="text-align:left;">
                                <h2 style="margin:0; font-size:15px; font-weight:900; color:#004b84; letter-spacing:0.3px;">PT DAKOTA LOGISTIK INDONESIA</h2>
                                <div style="font-size:10.5px; color:#475569; margin-top:2px;">Jl. Wibawa Mukti II No. 99, Jatiasih</div>
                                <div style="font-size:10.5px; color:#475569;">Kota Bekasi - Jawa Barat</div>
                            </div>
                        </div>

                        <!-- GARIS PEMISAH DOBEL MEMBENTANG PENUH -->
                        <div style="border-top: 1px solid #004b84; border-bottom: 2px solid #004b84; height: 2px; margin: 0 0 20px 0;"></div>

                        <!-- 2. JUDUL KWITANSI PERSIS DI TENGAH -->
                        <div style="text-align:center; margin-bottom:24px;">
                            <span style="font-size:32px; font-weight:900; color:#004b84; letter-spacing:3px; display:inline-block; border-bottom:3px solid #004b84; padding-bottom:2px;">
                                KWITANSI
                            </span>
                        </div>

                        <!-- 3. DETAIL DATA RINCIAN KWITANSI -->
                        <div style="max-width: 95%; margin: 0 auto; line-height: 1.8; font-size: 12px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="width: 20%; color:#334155; padding: 4px 0;">Nomor Kwitansi</td>
                                    <td style="width: 3%; text-align: center;">:</td>
                                    <td style="width: 77%; font-family: monospace; font-weight: bold; font-size: 12.5px; color:#004b84;">
                                        ${kwitansiDisplayNo || '-'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="color:#334155; padding: 4px 0;">Sudah Terima Dari</td>
                                    <td style="text-align: center;">:</td>
                                    <td style="font-weight: 900; text-transform: uppercase; color:#0f172a; font-size: 12.5px;">
                                        ${header.cust_name || header.artih_custname || '-'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="color:#334155; padding: 4px 0; vertical-align: top;">Banyaknya Uang</td>
                                    <td style="text-align: center; vertical-align: top;">:</td>
                                    <td style="font-style: italic; font-weight: 700; color:#1e293b; background: #f8fafc; padding: 5px 10px; border-radius: 4px; border-left: 3px solid #0284c7;">
                                        # ${textTerbilang} #
                                    </td>
                                </tr>
                                <tr>
                                    <td style="color:#334155; padding: 6px 0 2px 0; vertical-align: top;">Untuk Pembayaran</td>
                                    <td style="text-align: center; vertical-align: top; padding-top: 6px;">:</td>
                                    <td style="padding-top: 6px; color:#1e293b;">
                                        <div style="font-weight: 800; color:#0f172a;">BIAYA PENGIRIMAN BARANG</div>
                                        <div style="color: #475569; font-size: 11px; margin-top: 2px;">
                                            Sesuai Faktur Penagihan : <span style="font-family: monospace; font-weight: bold; color:#0284c7;">${noInvoiceResmi}</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="color:#334155; padding: 4px 0;">Tanggal Jatuh Tempo</td>
                                    <td style="text-align: center;">:</td>
                                    <td style="font-weight: 500; color:#1e293b;">
                                        ${tglCetakIndo}
                                    </td>
                                </tr>
                            </table>

                            <!-- KOTAK BESAR NOMINAL RUPIAH DI SEBELAH KIRI -->
                            <div style="margin-top: 20px; display: flex; align-items: center;">
                                <div style="border: 2px solid #004b84; background: #f0fdf4; border-radius: 8px; padding: 10px 20px; min-width: 250px;">
                                    <div style="font-size: 9.5px; color:#15803d; font-weight: 800; text-transform: uppercase; margin-bottom: 2px;">JUMLAH TAGIHAN :</div>
                                    <div style="font-family: monospace; font-size: 23px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px;">
                                        Rp ${grandTotal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 4. FOOTER BAWAH DENGAN GARIS PUTUS-PUTUS PEMISAH -->
                        <div style="margin-top: 35px; border-top: 1px dashed #cbd5e1; padding-top: 15px; display:flex; justify-content:space-between; align-items:flex-end;">
                            <!-- Bagian Rekening Bank Kiri -->
                            <div style="width: 44%; background:#f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 10.5px;">
                                <div style="font-weight:bold; color:#004b84; margin-bottom: 2px;">Pembayaran Transfer ke:</div>
                                <div style="font-weight:bold; color:#0f172a;">DAKOTA LOGISTIK INDONESIA PT</div>
                                <div style="color:#334155;">BANK CENTRAL ASIA (BCA) - KCU KALIMALANG</div>
                                <div style="font-weight:900; font-family: monospace; color:#0284c7; font-size: 11.5px; margin-top: 2px;">
                                    NO REKENING : 2303937226
                                </div>
                            </div>

                            <!-- Bagian Tanda Tangan Kanan -->
                            <div style="width: 40%; text-align: center;">
                                <div style="font-size: 11px; color:#475569; margin-bottom: 2px;">
                                    Bekasi, ${tglCetakIndo}
                                </div>
                                <div style="font-weight: 800; color:#0f172a; font-size: 11.5px;">PT. DAKOTA LOGISTIK INDONESIA</div>
                                
                                <div style="height: 55px;"></div>

                                <div>
                                    <div style="font-weight: 900; text-decoration: underline; color:#0f172a; font-size: 12px; letter-spacing: 0.3px;">
                                        BAYYINATHUL RAHMATULLAH
                                    </div>
                                    <div style="font-size: 9.5px; color:#64748b; margin-top: 1px;">Finance & Accounting</div>
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>
                `);
                printWindow.document.close();
                return;
            }

            // =====================================================================
            // 📄 3. CETAK KHUSUS: FAKTUR TIPE 2 (DESAIN MODERN IDENTIK GAMBAR 2)
            // =====================================================================
            if (docType === 'FAKTUR_2') {
                let totalBiayaKirim = 0;
                let totalDiskon = 0;
                let totalPacking = 0;
                let totalKoli = 0;
                let totalBeratReal = 0;
                let totalBeratVol = 0;
                let totalBiayaPenerus = 0;

                const faktur2RowsHtml = btts.map((b, idx) => {
                    const harga = Number(b.bttt_harga || 0);
                    const disc = Number(b.bttt_disc || 0);
                    const penerus = Number(b.bttt_biayapenerus || 0);
                    const packing = Number(b.biaya_packing || 0);
                    const koli = Number(b.bttt_jmlunit || 1);
                    const berat = Number(b.bttt_berat || 0);
                    const beratVol = Number(b.bttt_ukuran || 0);

                    const diskonNominal = (harga * (disc / 100.0));
                    const biayaKirimBersih = (harga - diskonNominal) + penerus;

                    totalBiayaKirim += biayaKirimBersih;
                    totalDiskon += diskonNominal;
                    totalPacking += packing;
                    totalKoli += koli;
                    totalBeratReal += berat;
                    totalBeratVol += beratVol;
                    totalBiayaPenerus += penerus;

                    return `
                        <tr style="font-size: 9.5px; font-family: Arial, sans-serif;">
                            <td style="border: 1px solid #cbd5e1; padding: 5px 3px; text-align: center;">${idx + 1}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; font-family: monospace; font-weight: bold; color: #0284c7;">${b.bttt_id}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 3px; text-align: center;">${String(b.bttt_tanggal || '').substring(0, 10)}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center;">DKI JAKARTA</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 4px;">${b.bttt_tujuankota || '-'}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; font-weight: 500;">${b.bttt_tujuannama || '-'}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 3px; text-align: center;">${b.bttt_nosuratjalan || '-'}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 3px; text-align: center;">-</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 3px; text-align: center;">DARAT</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 3px; text-align: center; font-family: monospace;">${koli}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: right; font-family: monospace;">${berat.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: right; font-family: monospace;">0</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: right; font-family: monospace;">${beratVol}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 3px; text-align: center; font-family: monospace;">-</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 3px; text-align: center; font-family: monospace;">-</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: right; font-family: monospace; font-weight: 600;">${biayaKirimBersih.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; font-size: 8.5px; color: #475569;">${b.bttt_namabarang || '-'}</td>
                        </tr>
                    `;
                }).join('');

                const subtotalNilaiJual = totalBiayaKirim + totalPacking;
                const dpp = subtotalNilaiJual;
                const ppn = dpp * 0.011;
                const grandTotal = Number(header.artih_total || (subtotalNilaiJual + ppn));
                const textTerbilang = (terbilangIndonesia(Math.round(grandTotal)).trim() + ' RUPIAH').replace(/\s+/g, ' ');

                const noInvoiceResmi = formatNomorInvoiceResmi(header.artih_id, header.artih_tanggal);
                let noFakturPajak = String(header.artih_fktpajak || '').trim();
                if (!noFakturPajak || noFakturPajak === '010.' || noFakturPajak === '010') {
                    noFakturPajak = '010.026.00.340034701';
                }

                const tglCetakIndo = formatTanggalIndonesia(header.artih_tanggal);

                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>FAKTUR PENAGIHAN - ${noInvoiceResmi}</title>
                        <style>
                            @page { size: A4 landscape; margin: 8mm; }
                            body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 12px; color: #1e293b; }
                            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
                            th { border: 1px solid #94a3b8; padding: 5px 3px; background-color: #e2e8f0; font-size: 9px; text-align: center; font-weight: bold; color: #0f172a; text-transform: uppercase; }
                            .no-print { margin-bottom: 12px; text-align: right; }
                            .btn-print { padding: 7px 18px; font-weight: bold; border-radius: 6px; border: none; cursor: pointer; color: white; margin: 0 4px; font-size: 11px; text-transform: uppercase; }
                            @media print { .no-print { display: none !important; } }
                        </style>
                    </head>
                    <body>
                        <div class="no-print">
                            <button class="btn-print" style="background:#16a34a;" onclick="window.print()">PRINT</button>
                            <button class="btn-print" style="background:#e11d48;" onclick="window.close()">TUTUP</button>
                        </div>

                        <!-- 1. KOP RESMI DENGAN LOGO DAKOTA CARGO & TITLE BESAR -->
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <img src="${dakotaLogo}" alt="Logo Dakota Cargo" style="height:44px; object-fit:contain;" />
                                <div>
                                    <h2 style="margin:0; font-size:15px; font-weight:900; color:#004b84; letter-spacing:0.3px;">PT DAKOTA LOGISTIK INDONESIA</h2>
                                    <div style="font-size:10px; color:#64748b; margin-top:2px;">Jl. Wibawa Mukti II No. 99, Jatiasih, Bekasi - Jawa Barat</div>
                                </div>
                            </div>
                            <div style="text-align:right;">
                                <h1 style="margin:0; font-size:20px; font-weight:900; letter-spacing:0.5px; color:#004b84;">FAKTUR PENAGIHAN</h1>
                                <div style="font-size:10px; font-weight:bold; color:#0284c7; margin-top:2px;">NO. KWITANSI: ${kwitansiDisplayNo || '-'}</div>
                            </div>
                        </div>

                        <!-- Garis Pembatas Aksen Biru Dakota -->
                        <div style="height:3px; background:#004b84; margin:8px 0 10px 0; border-radius:2px;"></div>

                        <!-- 2. DATA PELANGGAN (KIRI) & METADATA INVOICE (KANAN) -->
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; font-size:10.5px; background:#f8fafc; padding:8px 10px; border-radius:6px; border:1px solid #e2e8f0;">
                            <div style="width: 52%;">
                                <div style="color:#64748b; font-size:10px; font-weight:bold; text-transform:uppercase;">NAMA PELANGGAN :</div>
                                <div style="font-weight:900; font-size:13px; color:#0f172a; text-transform:uppercase; margin-top:1px;">${header.cust_name || header.artih_custname || '-'}</div>
                                <div style="font-size:10px; color:#475569; margin-top:2px;">${header.cust_alamat || 'KANTOR PUSAT OPERASIONAL'}</div>
                            </div>
                            <div style="width: 44%;">
                                <table style="width: 100%; border: none; margin: 0; font-size: 10.5px;">
                                    <tr>
                                        <td style="padding: 1px 0; width: 44%; color:#475569;">Tanggal Kwitansi</td>
                                        <td style="padding: 1px 0; width: 3%;">:</td>
                                        <td style="padding: 1px 0; font-weight: bold; color:#0f172a;">${tglCetakIndo}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 1px 0; color:#475569;">Nomor Invoice</td>
                                        <td style="padding: 1px 0;">:</td>
                                        <td style="padding: 1px 0; font-weight: 800; font-family: monospace; color:#0284c7;">${noInvoiceResmi}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 1px 0; color:#475569;">Nomor Faktur Pajak</td>
                                        <td style="padding: 1px 0;">:</td>
                                        <td style="padding: 1px 0; font-family: monospace; font-weight: 600;">${noFakturPajak}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 1px 0; color:#475569;">Tanggal Jatuh Tempo</td>
                                        <td style="padding: 1px 0;">:</td>
                                        <td style="padding: 1px 0; font-weight: bold; color:#b91c1c;">${tglCetakIndo}</td>
                                    </tr>
                                </table>
                            </div>
                        </div>

                        <!-- 3. TABEL MULTI-HEADER DENGAN HEADER SLATE MODERN -->
                        <table>
                            <thead>
                                <tr>
                                    <th rowspan="3" style="width:2.5%;">No</th>
                                    <th rowspan="3" style="width:11%;">Nomor<br/>STKB/AWB</th>
                                    <th rowspan="3" style="width:7%;">TANGGAL</th>
                                    <th rowspan="3" style="width:6%;">PROVINSI</th>
                                    <th rowspan="3" style="width:8%;">KOTA<br/>TUJUAN</th>
                                    <th rowspan="3" style="width:12%;">PENERIMA</th>
                                    <th rowspan="3" style="width:12%;">NOMOR SURAT</th>
                                    <th rowspan="3" style="width:7%;">NOMOR PI<br/>/KET LAIN</th>
                                    <th rowspan="3" style="width:5%;">SERVICE</th>
                                    <th colspan="4" style="width:15%;">JUMLAH DIKIRIM</th>
                                    <th colspan="2" style="width:7%;">TARIF PENGIRIMAN</th>
                                    <th rowspan="3" style="width:8%;">JUMLAH<br/>TAGIHAN<br/>(Rp.)</th>
                                    <th rowspan="3" style="width:8%;">KETERANGAN</th>
                                </tr>
                                <tr>
                                    <th rowspan="2" style="width:3%;">KOLI<br/>/PALET</th>
                                    <th colspan="2">BERAT REAL</th>
                                    <th rowspan="2" style="width:3%;">BERAT<br/>VOL</th>
                                    <th rowspan="2" style="width:4%;">MINIMUM<br/>/CARTER</th>
                                    <th rowspan="2" style="width:3%;">LANJUTAN</th>
                                </tr>
                                <tr>
                                    <th style="width:4%;">(KG)</th>
                                    <th style="width:3%;">(M3)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${faktur2RowsHtml || '<tr><td colspan="17" style="text-align:center; padding:10px;">Tidak ada data resi</td></tr>'}
                                
                                <!-- Baris Rekapitulasi Keuangan Bawah Tabel (Tanpa Kotak Kosong Kanan) -->
                                <tr>
                                    <td colspan="13" rowspan="7" style="border: 1px solid #94a3b8; padding: 10px 12px; vertical-align: bottom; font-size: 10.5px; background:#f8fafc;">
                                        <span style="color:#64748b;">Terbilang: </span> <span style="font-weight:bold; font-style:italic; color:#0f172a;">${textTerbilang}</span>
                                    </td>
                                    <td colspan="3" style="border: 1px solid #94a3b8; padding: 3px 6px; font-size: 9.5px; color:#64748b; border-bottom: 1px solid #cbd5e1;">Diskon</td>
                                    <td style="border: 1px solid #94a3b8; padding: 3px 6px; text-align: right; font-family: monospace; font-size: 9.5px; border-bottom: 1px solid #cbd5e1;">${totalDiskon.toLocaleString('id-ID')}.00</td>
                                </tr>
                                <tr>
                                    <td colspan="3" style="border: 1px solid #94a3b8; padding: 3px 6px; font-weight: bold; font-size: 9.5px; color:#334155; border-bottom: 1px solid #cbd5e1;">JUMLAH BIAYA KIRIM</td>
                                    <td style="border: 1px solid #94a3b8; padding: 3px 6px; text-align: right; font-family: monospace; font-weight: bold; font-size: 9.5px; border-bottom: 1px solid #cbd5e1;">${totalBiayaKirim.toLocaleString('id-ID')}.00</td>
                                </tr>
                                <tr>
                                    <td colspan="3" style="border: 1px solid #94a3b8; padding: 3px 6px; font-size: 9.5px; color:#64748b; border-bottom: 1px solid #cbd5e1;">Ditambah Packing</td>
                                    <td style="border: 1px solid #94a3b8; padding: 3px 6px; text-align: right; font-family: monospace; font-size: 9.5px; border-bottom: 1px solid #cbd5e1;">${totalPacking.toLocaleString('id-ID')}.00</td>
                                </tr>
                                <tr style="background:#f8fafc;">
                                    <td colspan="3" style="border: 1px solid #94a3b8; padding: 3px 6px; font-weight: bold; font-size: 9.5px; color:#0f172a; border-bottom: 1px solid #cbd5e1;">NILAI JUAL</td>
                                    <td style="border: 1px solid #94a3b8; padding: 3px 6px; text-align: right; font-family: monospace; font-weight: bold; font-size: 9.5px; border-bottom: 1px solid #cbd5e1;">${subtotalNilaiJual.toLocaleString('id-ID')}.00</td>
                                </tr>
                                <tr>
                                    <td colspan="3" style="border: 1px solid #94a3b8; padding: 3px 6px; font-size: 9.5px; color:#64748b; border-bottom: 1px solid #cbd5e1;">DPP 1.1%</td>
                                    <td style="border: 1px solid #94a3b8; padding: 3px 6px; text-align: right; font-family: monospace; font-size: 9.5px; border-bottom: 1px solid #cbd5e1;">${dpp.toLocaleString('id-ID')}.00</td>
                                </tr>
                                <tr>
                                    <td colspan="3" style="border: 1px solid #94a3b8; padding: 3px 6px; font-size: 9.5px; color:#64748b; border-bottom: 1px solid #cbd5e1;">PPN 1.1%</td>
                                    <td style="border: 1px solid #94a3b8; padding: 3px 6px; text-align: right; font-family: monospace; border-bottom: 1px solid #cbd5e1;">${ppn.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                                <tr style="background:#f1f5f9; font-weight: bold;">
                                    <td colspan="3" style="border: 1px solid #94a3b8; padding: 4px 6px; color:#004b84; font-size: 10px;">TOTAL TAGIHAN</td>
                                    <td style="border: 1px solid #94a3b8; padding: 4px 6px; text-align: right; font-family: monospace; font-weight: 900; font-size: 11px; color:#b91c1c;">Rp ${grandTotal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                            </tbody>
                        </table>

                        <!-- 4. FOOTER 3 KOLOM MODERN IDENTIK GAMBAR 2 -->
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-top:16px; font-size:10px;">
                            <!-- Kolom 1: Rekening Bank BCA -->
                            <div style="width: 32%; background:#f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                                <div style="font-weight:bold; color:#004b84; margin-bottom:2px; font-size:10.5px;">Pembayaran Transfer ke:</div>
                                <div style="font-weight:bold; color:#0f172a;">DAKOTA LOGISTIK INDONESIA PT</div>
                                <div style="color:#334155;">BANK CENTRAL ASIA (BCA)</div>
                                <div style="color:#334155;">KCU KALIMALANG</div>
                                <div style="font-weight:900; font-family:monospace; color:#0284c7; font-size:11.5px; margin-top:2px;">
                                    NO REKENING : 2303937226
                                </div>
                            </div>

                            <!-- Kolom 2: Bukti Pembayaran -->
                            <div style="width: 32%; background:#f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                                <div style="font-weight:bold; color:#004b84; margin-bottom:2px; font-size:10.5px;">Bukti Pembayaran Mohon:</div>
                                <div style="color:#334155;">FAX KE : (021) 82401076</div>
                                <div style="color:#334155; margin-top:1px;">Atau Email Ke :</div>
                                <div style="font-weight:bold; color:#0284c7; font-size:10.5px; margin-top:2px;">marketing.pusat@dakotacargo.co.id</div>
                            </div>

                            <!-- Kolom 3: Tanda Tangan -->
                            <div style="width: 30%; text-align: center;">
                                <div style="font-size:10.5px; color:#475569; margin-bottom:2px;">Bekasi, ${tglCetakIndo}</div>
                                <div style="font-weight:bold; color:#0f172a; font-size:11px;">PT DAKOTA LOGISTIK INDONESIA</div>
                                <div style="height: 48px;"></div>
                                <div>
                                    <div style="font-weight:bold; text-decoration:underline; color:#0f172a; font-size:11px;">TRI SUGIARTI</div>
                                    <div style="font-size:9px; color:#64748b;">Finance & Accounting</div>
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>
                `);
                printWindow.document.close();
                return;
            }

            // =====================================================================
            // 📄 4. CETAK KHUSUS: SUMMARY BILLING (20 KOLOM PERSIS FILE ASP LAWAS)
            // =====================================================================
            if (docType === 'SUMMARY') {
                let totalKoli = 0;
                let totalVolume = 0;
                let totalBerat = 0;
                let totalTagihan = 0;

                const noInvoiceResmi = formatNomorInvoiceResmi(header.artih_id, header.artih_tanggal);
                const tglInvoiceIndo = formatTanggalIndonesia(header.artih_tanggal);

                const summaryRowsHtml = btts.map((b, idx) => {
                    const koli = Number(b.bttt_jmlunit || 1);
                    const volume = Number(b.bttt_ukuran || 0);
                    const berat = Number(b.bttt_berat || 0);
                    const harga = Number(b.subtotal || b.bttt_harga || 0);

                    totalKoli += koli;
                    totalVolume += volume;
                    totalBerat += berat;
                    totalTagihan += harga;

                    const tglKirim = b.bttt_tanggal ? String(b.bttt_tanggal).substring(0, 10) : '-';

                    return `
                        <tr style="font-size: 9px; font-family: Arial, sans-serif;">
                            <td style="border: 1px solid #cbd5e1; padding: 4px 2px; text-align: center;">${idx + 1}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 4px 3px; text-align: center;">${String(header.artih_tanggal || '').substring(0, 10)}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 4px 4px; font-family: monospace; font-weight: bold; color: #0284c7;">${noInvoiceResmi}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 4px 4px; font-family: monospace;">${kwitansiDisplayNo || '-'}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 4px 4px; font-family: monospace; font-weight: bold; color: #0f172a;">${b.bttt_id}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 4px 3px; text-align: center;">${tglKirim}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 4px 3px;">${b.bttt_asalname || header.cust_name || '-'}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 4px 3px; text-align: center;">${b.no_skb || b.bttt_nosuratjalan || '-'}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 4px 2px; text-align: center;">LAND REGULER</td>
                            <td style="border: 1px solid #cbd5e1; padding: 4px 3px;">${b.bttt_tujuannama || b.bttt_tujuankota || '-'}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 4px 2px; text-align: center;">REGULER</td>
                            <td style="border: 1px solid #cbd5e1; padding: 4px 2px; text-align: center; font-family: monospace;">${koli}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 4px 3px; text-align: right; font-family: monospace;">${volume}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 4px 3px; text-align: right; font-family: monospace;">${berat.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 4px 2px; text-align: center;">-</td>
                            <td style="border: 1px solid #cbd5e1; padding: 4px 2px; text-align: center;">-</td>
                            <td style="border: 1px solid #cbd5e1; padding: 4px 2px; text-align: center;">-</td>
                            <td style="border: 1px solid #cbd5e1; padding: 4px 2px; text-align: center;">-</td>
                            <td style="border: 1px solid #cbd5e1; padding: 4px 4px; text-align: right; font-family: monospace; font-weight: bold; color: #0f172a;">${harga.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 4px 3px; font-size: 8.5px; color: #475569;">${b.bttt_namabarang || '-'}</td>
                        </tr>
                    `;
                }).join('');

                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>SUMMARY BILLING - ${noInvoiceResmi}</title>
                        <style>
                            @page { size: A3 landscape; margin: 8mm; }
                            body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 10px; color: #1e293b; }
                            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
                            th { border: 1px solid #94a3b8; padding: 5px 2px; background-color: #e2e8f0; font-size: 8.5px; text-align: center; font-weight: bold; color: #0f172a; text-transform: uppercase; }
                            .no-print { margin-bottom: 12px; text-align: right; }
                            .btn-print { padding: 7px 18px; font-weight: bold; border-radius: 6px; border: none; cursor: pointer; color: white; margin: 0 4px; font-size: 11px; text-transform: uppercase; }
                            @media print { .no-print { display: none !important; } }
                        </style>
                    </head>
                    <body>
                        <div class="no-print">
                            <button class="btn-print" style="background:#16a34a;" onclick="window.print()">PRINT</button>
                            <button class="btn-print" style="background:#e11d48;" onclick="window.close()">TUTUP</button>
                        </div>

                        <!-- KOP RESMI DENGAN LOGO DAKOTA CARGO -->
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <img src="${dakotaLogo}" alt="Logo Dakota Cargo" style="height:44px; object-fit:contain;" />
                                <div>
                                    <h2 style="margin:0; font-size:15px; font-weight:900; color:#004b84; letter-spacing:0.3px;">PT DAKOTA LOGISTIK INDONESIA</h2>
                                    <div style="font-size:10px; color:#64748b; margin-top:2px;">Jl. Wibawa Mukti II No. 99, Jatiasih, Bekasi - Jawa Barat</div>
                                </div>
                            </div>
                            <div style="text-align:right;">
                                <h1 style="margin:0; font-size:20px; font-weight:900; letter-spacing:0.5px; color:#004b84;">SUMMARY BILLING</h1>
                                <div style="font-size:10px; font-weight:bold; color:#0f172a; margin-top:2px;">
                                    NO. FAKTUR: <span style="font-family:monospace; color:#0284c7;">${noInvoiceResmi}</span>
                                </div>
                                <div style="font-size:10px; color:#64748b;">
                                    NO. KWITANSI: <span style="font-family:monospace;">${kwitansiDisplayNo || '-'}</span> | CUSTOMER: <b>${header.cust_name || header.artih_custname || '-'}</b>
                                </div>
                            </div>
                        </div>

                        <div style="height:3px; background:#004b84; margin:8px 0 10px 0; border-radius:2px;"></div>

                        <!-- TABEL 20 KOLOM PERSIS FILE ASP LAWAS DENGAN STYLING MODERN -->
                        <table>
                            <thead>
                                <tr>
                                    <th style="width:2%;">No</th>
                                    <th style="width:5%;">Tanggal<br/>Invoice</th>
                                    <th style="width:9%;">Invoice<br/>Number</th>
                                    <th style="width:8%;">No.<br/>Kwitansi</th>
                                    <th style="width:8%;">No Resi</th>
                                    <th style="width:5%;">Tanggal<br/>Pengiriman</th>
                                    <th style="width:10%;">Pengirim</th>
                                    <th style="width:5%;">No.<br/>SKB</th>
                                    <th style="width:5%;">Jenis<br/>Pengiriman</th>
                                    <th style="width:9%;">Tujuan</th>
                                    <th style="width:4%;">Jenis<br/>Angkutan</th>
                                    <th style="width:3%;">Koli</th>
                                    <th style="width:3%;">Volume<br/>(Cbm)</th>
                                    <th style="width:4%;">Berat<br/>(Kg)</th>
                                    <th style="width:3%;">Berat<br/>Minimum</th>
                                    <th style="width:3%;">Charge<br/>Weight</th>
                                    <th style="width:3%;">Tarif</th>
                                    <th style="width:3%;">Additional<br/>Tarif</th>
                                    <th style="width:5%;">Total<br/>Tagihan</th>
                                    <th style="width:6%;">REMARK</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${summaryRowsHtml || '<tr><td colspan="20" style="text-align:center; padding:10px;">Tidak ada rincian data</td></tr>'}
                            </tbody>
                            <tfoot>
                                <tr style="background:#f1f5f9; font-weight:bold; font-size:9.5px;">
                                    <td colspan="11" style="border:1px solid #94a3b8; padding:5px; text-align:center; color:#004b84;">TOTAL KESELURUHAN :</td>
                                    <td style="border:1px solid #94a3b8; padding:5px; text-align:center; font-family:monospace;">${totalKoli}</td>
                                    <td style="border:1px solid #94a3b8; padding:5px; text-align:right; font-family:monospace;">${totalVolume}</td>
                                    <td style="border:1px solid #94a3b8; padding:5px; text-align:right; font-family:monospace;">${totalBerat.toLocaleString('id-ID')}</td>
                                    <td colspan="4" style="border:1px solid #94a3b8; text-align:center;">-</td>
                                    <td style="border:1px solid #94a3b8; padding:5px; text-align:right; font-family:monospace; color:#b91c1c; font-size:10.5px;">Rp ${totalTagihan.toLocaleString('id-ID')}</td>
                                    <td style="border:1px solid #94a3b8;"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </body>
                    </html>
                `);
                printWindow.document.close();
                return;
            }

            // =====================================================================
            // 📄 2. CETAK DEFAULT: FAKTUR PENAGIHAN, SUMMARY, DLL.
            // =====================================================================
            let totalBerat = 0;
            let totalUkuran = 0;
            let totalPacking = 0;
            let totalBiayaKirim = 0;
            let totalBiayaPenerus = 0;
            let grandTotal = 0;

            const rowsHtml = btts.map((b, idx) => {
                const sub = Number(b.subtotal || b.bttt_harga || 0);
                totalBerat += Number(b.bttt_berat || 0);
                totalUkuran += Number(b.bttt_ukuran || 0);
                totalPacking += Number(b.biaya_packing || 0);
                totalBiayaKirim += Number(b.bttt_harga || 0);
                totalBiayaPenerus += Number(b.bttt_biayapenerus || 0);
                grandTotal += sub;

                return `
                    <tr style="font-family: monospace; font-size: 10px;">
                        <td style="border: 1px solid #333; padding: 4px; text-align: center;">${idx + 1}</td>
                        <td style="border: 1px solid #333; padding: 4px;">${header.artih_id || '-'}</td>
                        <td style="border: 1px solid #333; padding: 4px;">${header.cust_name || header.artih_custname || '-'}</td>
                        <td style="border: 1px solid #333; padding: 4px; font-weight: bold;">${b.bttt_id}</td>
                        <td style="border: 1px solid #333; padding: 4px; text-align: center;">${String(b.bttt_tanggal).substring(0, 10)}</td>
                        <td style="border: 1px solid #333; padding: 4px;">${b.bttt_tujuankota || '-'}</td>
                        <td style="border: 1px solid #333; padding: 4px;">${b.bttt_tujuannama || '-'}</td>
                        <td style="border: 1px solid #333; padding: 4px; text-align: center;">DARAT</td>
                        <td style="border: 1px solid #333; padding: 4px; text-align: right;">${Number(b.bttt_jmlunit || 1)}</td>
                        <td style="border: 1px solid #333; padding: 4px; text-align: right;">${Number(b.bttt_berat || 0).toLocaleString('id-ID')}</td>
                        <td style="border: 1px solid #333; padding: 4px; text-align: right;">${Number(b.bttt_ukuran || 0)}</td>
                        <td style="border: 1px solid #333; padding: 4px; text-align: right;">${Number(b.biaya_packing || 0).toLocaleString('id-ID')}</td>
                        <td style="border: 1px solid #333; padding: 4px; text-align: right;">${Number(b.bttt_biayapenerus || 0).toLocaleString('id-ID')}</td>
                        <td style="border: 1px solid #333; padding: 4px; text-align: right;">${Number(b.bttt_harga || 0).toLocaleString('id-ID')}</td>
                        <td style="border: 1px solid #333; padding: 4px; text-align: right; font-weight: bold;">${sub.toLocaleString('id-ID')}</td>
                    </tr>
                `;
            }).join('');

            const titleHeader = docType === 'SUMMARY' ? 'SUMMARY BILLING' : 'FAKTUR PENAGIHAN';

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${titleHeader} - ${header.artih_id}</title>
                    <style>
                        @page { size: A4 landscape; margin: 8mm; }
                        body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 10px; color: #000; }
                        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                        th { border: 1px solid #000; padding: 5px 3px; background-color: #cbd5e1; font-size: 9px; text-align: center; }
                        .btn-ctrl { padding: 7px 18px; font-weight: bold; border-radius: 6px; border: none; cursor: pointer; text-transform: uppercase; margin: 0 4px; }
                        @media print { .no-print { display: none !important; } }
                    </style>
                </head>
                <body>
                    <div class="no-print" style="margin-bottom: 12px; text-align: right;">
                        <button class="btn-ctrl" style="background:#16a34a; color:white;" onclick="window.print()">PRINT</button>
                        <button class="btn-ctrl" style="background:#e11d48; color:white;" onclick="window.close()">TUTUP</button>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #000; padding-bottom:6px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${dakotaLogo}" alt="Logo" style="height:38px;" />
                            <div>
                                <h2 style="margin:0; font-size:14px; font-weight:900;">PT DAKOTA LOGISTIK INDONESIA</h2>
                                <div style="font-size:10px; color:#444;">Jl. Wibawa Mukti II No. 99, Jatiasih, Bekasi</div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <h2 style="margin:0; font-size:15px; font-weight:900; text-decoration:underline;">${titleHeader}</h2>
                            <div style="font-size:10px; font-weight:bold; margin-top:2px;">NO. FAKTUR: ${header.artih_id}</div>
                            <div style="font-size:10px; color:#555;">NO. KWITANSI: ${kwitansiDisplayNo || '-'}</div>
                            <div style="font-size:10px; color:#555;">CUSTOMER: ${header.cust_name || header.artih_custname}</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width:3%;">NO</th>
                                <th style="width:10%;">NO. INVOICE</th>
                                <th style="width:16%;">NAMA CUSTOMER</th>
                                <th style="width:10%;">NO. BTT</th>
                                <th style="width:8%;">TANGGAL</th>
                                <th style="width:9%;">KOTA TUJUAN</th>
                                <th style="width:12%;">PENERIMA</th>
                                <th style="width:5%;">SERVICE</th>
                                <th style="width:4%;">KOLI</th>
                                <th style="width:5%;">BERAT</th>
                                <th style="width:4%;">UKURAN</th>
                                <th style="width:6%;">PACKING</th>
                                <th style="width:6%;">PENERUS</th>
                                <th style="width:7%;">BIAYA KIRIM</th>
                                <th style="width:8%;">TOTAL BIAYA</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                        <tfoot>
                            <tr style="background-color:#f1f5f9; font-weight:bold; font-family:monospace; font-size:10px;">
                                <td colspan="8" style="border:1px solid #333; padding:5px; text-align:center;">JUMLAH TOTAL :</td>
                                <td style="border:1px solid #333; padding:5px; text-align:right;">-</td>
                                <td style="border:1px solid #333; padding:5px; text-align:right;">${totalBerat.toLocaleString('id-ID')}</td>
                                <td style="border:1px solid #333; padding:5px; text-align:right;">${totalUkuran}</td>
                                <td style="border:1px solid #333; padding:5px; text-align:right;">${totalPacking.toLocaleString('id-ID')}</td>
                                <td style="border:1px solid #333; padding:5px; text-align:right;">${totalBiayaPenerus.toLocaleString('id-ID')}</td>
                                <td style="border:1px solid #333; padding:5px; text-align:right;">${totalBiayaKirim.toLocaleString('id-ID')}</td>
                                <td style="border:1px solid #333; padding:5px; text-align:right; font-weight:900; color:#b91c1c;">Rp ${grandTotal.toLocaleString('id-ID')}</td>
                            </tr>
                        </tfoot>
                    </table>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (err) {
            console.error("Detail Error Print:", err);
            Swal.fire('Error', 'Gagal memuat dokumen cetak faktur: ' + (err.message || err), 'error');
        }
    };

    const handleDownloadRTF = (item) => {
        if (!item) return;

        const content = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0\\fnil\\fcharset0 Arial;}}
\\viewkind4\\uc1\\pard\\qc\\b\\fs24 PT DAKOTA LOGISTIK INDONESIA\\par
\\fs20 TANDA TERIMA TAGIHAN\\par\\b0\\par
\\pard\\fs18
Nomor Invoice : ${item.artih_id}\\par
Nomor Kwitansi: ${item.artih_nokw || '-'}\\par
Pelanggan     : ${item.cust_name || item.artih_custname}\\par
Tanggal       : ${String(item.artih_tanggal || '').substring(0, 10)}\\par
Total Tagihan : Rp ${Number(item.artih_total || 0).toLocaleString('id-ID')}\\par\\par
\\pard\\qc ( Lembar Asli Untuk Pembawa Tagihan )\\par
}`;

        const blob = new Blob([content], { type: 'application/rtf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TandaTerimaTagihan-${item.artih_id}.rtf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // =========================================================================
    // DEFINISI KOLOM GRID DASHBOARD
    // =========================================================================
    const columns = [
        {
            header: 'NO. INVOICE',
            accessor: 'artih_id',
            render: (item) => (
                <span className="font-mono font-bold text-sky-600 select-all">
                    {item.artih_id}
                </span>
            )
        },
        {
            header: 'TANGGAL',
            accessor: 'artih_tanggal',
            render: (item) => <span className="font-mono font-bold text-slate-800">{String(item.artih_tanggal || '').split('T')[0]}</span>
        },
        {
            header: 'PELANGGAN',
            accessor: 'cust_name',
            render: (item) => (
                <div>
                    <span className="font-bold text-slate-900 block">{item.cust_name || item.artih_custname}</span>
                    <span className="font-mono text-[10px] text-slate-500">ID: {item.artih_custid}</span>
                </div>
            )
        },
        {
            header: 'NO. KWITANSI',
            accessor: 'artih_nokw',
            render: (item) => <span className="font-mono font-bold text-emerald-700 select-all">{item.artih_nokw || '-'}</span>
        },
        {
            header: 'TOTAL TAGIHAN (RP)',
            accessor: 'artih_total',
            render: (item) => <span className="font-mono font-black text-rose-600">Rp {Number(item.artih_total || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'TERBAYAR (RP)',
            accessor: 'terbayar',
            render: (item) => <span className="font-mono font-bold text-slate-800">Rp {Number(item.terbayar || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'JENIS',
            accessor: 'artih_jenis',
            render: (item) => {
                if (item.artih_jenis === 'K') return <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded text-[10px] border border-sky-200">KREDIT</span>;
                if (item.artih_jenis === 'B') return <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-200">TUNAI</span>;
                return <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] border border-amber-200">TAGIH</span>;
            }
        },
        {
            header: 'STATUS POSTING',
            accessor: 'artih_postingyn',
            render: (item) => item.artih_postingyn === 'Y' ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                    <CheckCircle2 size={12} /> POSTED
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px]">
                    <XCircle size={12} /> DRAFT
                </span>
            )
        },
        {
            header: 'AKSI',
            accessor: 'artih_id',
            render: (item) => (
                <div className="flex items-center gap-1 justify-center relative" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setActivePrintMenuId(activePrintMenuId === item.artih_id ? null : item.artih_id);
                            }}
                            className="p-1.5 text-sky-600 hover:bg-sky-50 border border-sky-200 rounded-lg transition cursor-pointer shadow-2xs"
                            title="Pilihan Cetak Dokumen"
                        >
                            <Printer size={13} />
                        </button>

                        {activePrintMenuId === item.artih_id && (
                            <div className="absolute right-0 top-8 w-44 bg-white border border-slate-200 shadow-2xl rounded-xl py-1.5 z-[999] text-left text-xs font-bold divide-y divide-slate-100 animate-in fade-in">
                                <button
                                    type="button"
                                    onClick={() => { setActivePrintMenuId(null); handlePrintDocument(item, 'FAKTUR'); }}
                                    className="w-full px-3 py-1.5 text-slate-700 hover:bg-sky-50 hover:text-sky-600 text-left cursor-pointer flex items-center gap-1.5"
                                >
                                    <Printer size={12} className="text-sky-600" /> Faktur Penagihan
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setActivePrintMenuId(null); handlePrintDocument(item, 'KWITANSI_1'); }}
                                    className="w-full px-3 py-1.5 text-slate-700 hover:bg-amber-50 hover:text-amber-600 text-left cursor-pointer flex items-center gap-1.5"
                                >
                                    <FileText size={12} className="text-amber-500" /> Kwitansi Tipe 1
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setActivePrintMenuId(null); handlePrintDocument(item, 'KWITANSI_2'); }}
                                    className="w-full px-3 py-1.5 text-slate-700 hover:bg-sky-50 hover:text-sky-600 text-left cursor-pointer flex items-center gap-1.5"
                                >
                                    <FileText size={12} className="text-sky-500" /> Kwitansi Tipe 2
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setActivePrintMenuId(null); handlePrintDocument(item, 'FAKTUR_2'); }}
                                    className="w-full px-3 py-1.5 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 text-left cursor-pointer flex items-center gap-1.5"
                                >
                                    <Printer size={12} className="text-indigo-600" /> Faktur Tipe 2
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setActivePrintMenuId(null); handlePrintDocument(item, 'SUMMARY'); }}
                                    className="w-full px-3 py-1.5 text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 text-left cursor-pointer flex items-center gap-1.5"
                                >
                                    <CheckSquare size={12} className="text-emerald-600" /> Summary Billing
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => handleDownloadRTF(item)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-lg transition cursor-pointer shadow-2xs"
                        title="Unduh Tanda Terima Tagihan (.rtf)"
                    >
                        <Download size={13} />
                    </button>

                    <button
                        type="button"
                        onClick={() => handleOpenEditInvoice(item)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition cursor-pointer shadow-2xs"
                        title="Buka / Edit Rincian Invoice"
                    >
                        <Edit3 size={13} />
                    </button>

                    {item.artih_postingyn !== 'Y' && (
                        <button
                            type="button"
                            onClick={() => handlePostingInvoice(item.artih_id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition cursor-pointer shadow-2xs"
                            title="Posting Invoice"
                        >
                            <Lock size={13} />
                        </button>
                    )}

                    {item.artih_postingyn !== 'Y' && (
                        <button
                            type="button"
                            onClick={() => handleDeleteInvoice(item)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition cursor-pointer shadow-2xs"
                            title="Hapus Invoice"
                        >
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    // =========================================================================
    // ELEMEN MODAL EDIT INVOICE DARI LIST
    // =========================================================================
    const editModalElement = isEditModalOpen && activeInvoice ? (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs transition-opacity z-[1000]">
            <div className={`w-full max-w-7xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-slate-800'}`}>
                <div className="px-6 py-3 bg-[#004b84] text-white flex items-center justify-between">
                    <div className="font-black uppercase tracking-wider text-sm flex items-center gap-2">
                        <FileText size={18} className="text-sky-300" />
                        EDIT INVOICE — {activeInvoice.artih_id}
                    </div>
                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-slate-300 hover:text-white cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto text-xs flex-1">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CABANG / AGEN :</label>
                            <input type="text" readOnly value={activeInvoice.agen_nama || 'DLI PUSAT'} className="w-full p-2 bg-slate-100 border border-slate-200 rounded font-bold text-slate-700" />
                        </div>
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. FAKTUR :</label>
                            <input type="text" readOnly value={activeInvoice.artih_id} className="w-full p-2 bg-slate-100 border border-slate-200 rounded font-mono font-bold text-sky-700" />
                        </div>
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. KWITANSI :</label>
                            <input type="text" readOnly value={activeInvoice.artih_nokw || '-'} className="w-full p-2 bg-slate-100 border border-slate-200 rounded font-mono font-bold text-emerald-700" />
                        </div>
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">JENIS INVOICE :</label>
                            <input type="text" readOnly value={activeInvoice.artih_jenis === 'K' ? 'Kredit' : activeInvoice.artih_jenis === 'B' ? 'Tunai' : 'Tagih Turun'} className="w-full p-2 bg-slate-100 border border-slate-200 rounded font-bold text-slate-700" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="font-bold text-slate-500 block mb-1">CUSTOMER :</label>
                            <input type="text" readOnly value={`${activeInvoice.cust_name || activeInvoice.artih_custname} [${activeInvoice.artih_custid}]`} className="w-full p-2 bg-slate-100 border border-slate-200 rounded font-bold text-slate-800" />
                        </div>
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">TANGGAL INVOICE :</label>
                            <input type="date" readOnly value={activeInvoice.artih_tanggal} className="w-full p-2 bg-slate-100 border border-slate-200 rounded font-bold text-slate-800" />
                        </div>
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">STATUS :</label>
                            <span className={`inline-block p-2 text-center w-full font-black rounded ${activeInvoice.artih_postingyn === 'Y' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {activeInvoice.artih_postingyn === 'Y' ? 'POSTED' : 'OPEN / DRAFT'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-100 p-4 rounded-xl border border-slate-200 font-bold text-xs">
                        <div>
                            <span className="text-slate-500 block text-[10px]">TOTAL BIAYA KIRIM:</span>
                            <span className="font-mono text-slate-800">
                                Rp {activeBTTList.reduce((s, b) => s + Number(b.bttt_harga || 0), 0).toLocaleString('id-ID')}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[10px]">TOTAL BIAYA PENERUS:</span>
                            <span className="font-mono text-slate-800">
                                Rp {activeBTTList.reduce((s, b) => s + Number(b.bttt_biayapenerus || 0), 0).toLocaleString('id-ID')}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[10px]">TOTAL PACKING:</span>
                            <span className="font-mono text-slate-800">
                                Rp {activeBTTList.reduce((s, b) => s + Number(b.biaya_packing || 0), 0).toLocaleString('id-ID')}
                            </span>
                        </div>
                        <div className="text-right border-l pl-4 border-slate-300">
                            <span className="text-slate-500 block text-[10px]">TOTAL TAGIHAN INVOICE:</span>
                            <span className="font-mono font-black text-rose-600 text-base">
                                Rp {Number(activeInvoice.artih_total || 0).toLocaleString('id-ID')}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                        <div className="flex items-center gap-2">
                            {activeInvoice?.artih_postingyn !== 'Y' && (
                                <button
                                    type="button"
                                    onClick={() => handlePostingInvoice(activeInvoice.artih_id)}
                                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl uppercase transition cursor-pointer shadow-lg text-xs flex items-center gap-2"
                                >
                                    <Lock size={15} /> POSTING
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsEditModalOpen(false)}
                            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl uppercase transition cursor-pointer shadow-sm text-xs"
                        >
                            BATAL / KELUAR
                        </button>
                    </div>
                </div>
            </div>
        </div>
    ) : null;

    // =========================================================================
    // ELEMEN MODAL TAMBAH INVOICE
    // =========================================================================
    const currentSelectedTotal = unbilledBTTList
        .filter(b => newInvoiceForm.selected_btts.includes(b.bttt_id))
        .reduce((sum, b) => sum + Number(b.subtotal || b.bttt_harga || 0), 0);

    const addModalElement = isAddModalOpen ? (
        <div className="fixed inset-0 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-xs transition-opacity z-[1000]">
            <div className={`w-full max-w-7xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-slate-800'}`}>
                {/* Header Modal */}
                <div className="px-6 py-2.5 bg-[#004b84] text-white flex items-center justify-between">
                    <div className="font-black uppercase tracking-wider text-xs flex items-center gap-2">
                        <Plus size={16} />
                        {savedInvoiceId
                            ? `EDIT INVOICE — ${savedInvoiceId}`
                            : (addStep === 1 ? 'PEMBUATAN INVOICE (LANGKAH 1 DARI 2)' : 'BUAT INVOICE BARU')}
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setIsAddModalOpen(false);
                            setSavedInvoiceId(null);
                            setSavedKwitansiNo(null);
                            setPersistedSelectedBtts([]);
                        }}
                        className="text-white/80 hover:text-white cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* LANGKAH 1: PILIH CUSTOMER */}
                {addStep === 1 && (
                    <div className="p-6 space-y-5 overflow-y-auto text-xs flex-1">
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="font-bold text-slate-600 block mb-1">TANGGAL INVOICE :</label>
                                <input
                                    type="date"
                                    value={newInvoiceForm.artih_tanggal}
                                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, artih_tanggal: e.target.value })}
                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">CABANG / AGEN :</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={newInvoiceForm.artih_agenname || getActiveAgen().nama}
                                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 cursor-not-allowed select-none"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="font-bold text-slate-600 block mb-1">CUSTOMER :</label>
                                <select
                                    value={newInvoiceForm.artih_custid}
                                    onChange={(e) => handleSelectCustomerForNewInvoice(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                                >
                                    <option value="">-- PILIH CUSTOMER --</option>
                                    {custList.map((cust, i) => (
                                        <option key={i} value={cust.cust_id}>
                                            {cust.cust_name} [{cust.cust_id}]
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">CUST ID :</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={newInvoiceForm.artih_custid || '-'}
                                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-indigo-600 cursor-not-allowed select-none"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">NAMA :</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={newInvoiceForm.artih_custname || '-'}
                                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 cursor-not-allowed select-none"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">JENIS INVOICE :</label>
                                <div className="flex items-center gap-4 mt-2">
                                    <label className="flex items-center gap-1 font-bold cursor-pointer">
                                        <input
                                            type="radio"
                                            name="add_jenis"
                                            value="B"
                                            checked={newInvoiceForm.artih_jenis === 'B'}
                                            onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, artih_jenis: e.target.value })}
                                        /> Tunai
                                    </label>
                                    <label className="flex items-center gap-1 font-bold cursor-pointer">
                                        <input
                                            type="radio"
                                            name="add_jenis"
                                            value="K"
                                            checked={newInvoiceForm.artih_jenis === 'K'}
                                            onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, artih_jenis: e.target.value })}
                                        /> Kredit
                                    </label>
                                    <label className="flex items-center gap-1 font-bold cursor-pointer">
                                        <input
                                            type="radio"
                                            name="add_jenis"
                                            value="T"
                                            checked={newInvoiceForm.artih_jenis === 'T'}
                                            onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, artih_jenis: e.target.value })}
                                        /> Tagih Turun
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">
                                    KETERANGAN <span className="text-rose-600 font-black">*</span> :
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Pembayaran resi kargo..."
                                    value={newInvoiceForm.artih_keterangan}
                                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, artih_keterangan: e.target.value })}
                                    className={`w-full p-2.5 bg-white border rounded-lg font-bold text-slate-800 outline-none transition ${!newInvoiceForm.artih_keterangan.trim()
                                        ? 'border-rose-300 focus:border-rose-500 bg-rose-50/20'
                                        : 'border-slate-300 focus:border-blue-500'
                                        }`}
                                />
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={handleProceedToDetails}
                                className="px-6 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black rounded-xl uppercase transition cursor-pointer shadow-sm flex items-center gap-2"
                            >
                                TAMBAH RINCIAN <ArrowRight size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl uppercase transition cursor-pointer"
                            >
                                BATAL
                            </button>
                        </div>
                    </div>
                )}

                {/* LANGKAH 2: FORM LENGKAP IDENTIK DUA TABEL APLIKASI LAWAS */}
                {addStep === 2 && (() => {
                    // Filter BTT yang sudah dipilih oleh user
                    const selectedBTTObjects = savedInvoiceId && persistedSelectedBtts.length > 0
                        ? persistedSelectedBtts
                        : unbilledBTTList.filter(b => {
                            const cleanBTTId = String(b.bttt_id || '').trim();
                            return newInvoiceForm.selected_btts.some(id => String(id).trim() === cleanBTTId);
                        });

                    const totBiayaKirim = selectedBTTObjects.reduce((sum, b) => sum + Number(b.bttt_harga || 0), 0);
                    const totPenerus = selectedBTTObjects.reduce((sum, b) => sum + Number(b.bttt_biayapenerus || 0), 0);
                    const totPacking = selectedBTTObjects.reduce((sum, b) => sum + Number(b.biaya_packing || 0), 0);
                    const grandTotalSelected = selectedBTTObjects.reduce((sum, b) => sum + Number(b.subtotal || b.bttt_harga || 0), 0);

                    return (
                        <div className="p-5 space-y-4 overflow-y-auto text-[11px] flex-1">
                            {/* 1. KOTAK INFORMASI HEADER INVOICE */}
                            <div className="border border-slate-300 rounded-xl p-4 bg-white space-y-3 shadow-xs">
                                {/* Baris 1 */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">CABANG/AGEN :</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={newInvoiceForm.artih_agenname || 'PUSAT DAKOTA'}
                                            className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">NO. FAKTUR :</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={savedInvoiceId || "0010006/09/2026/FP"}
                                            className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-sky-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">NO. KWITANSI :</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={savedKwitansiNo || "0006/DLI/001/09/26"}
                                            className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-emerald-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">JENIS INVOICE :</label>
                                        <div className="flex items-center gap-3 pt-1 font-bold text-slate-700">
                                            <label className="flex items-center gap-1 cursor-pointer">
                                                <input type="radio" checked readOnly className="text-blue-600" />
                                                {newInvoiceForm.artih_jenis === 'B' ? 'Tunai' : newInvoiceForm.artih_jenis === 'T' ? 'Tagih Turun' : 'Kredit'}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Baris 2 */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">CUSTOMER :</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={newInvoiceForm.artih_custname || '-'}
                                            className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-bold text-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">CUST ID :</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={newInvoiceForm.artih_custid || '-'}
                                            className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">TGL JATUH TEMPO :</label>
                                        <input
                                            type="date"
                                            value={newInvoiceForm.artih_tanggal}
                                            onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, artih_tanggal: e.target.value })}
                                            className="w-full p-1.5 bg-white border border-slate-300 rounded font-bold text-slate-800 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">NO JURNAL :</label>
                                        <input
                                            type="text"
                                            readOnly
                                            placeholder="[Terbentuk Saat Posting]"
                                            className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded text-slate-400 font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Baris 3 */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">NAMA :</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={newInvoiceForm.artih_custname || '-'}
                                            className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-bold text-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">TANGGAL :</label>
                                        <input
                                            type="date"
                                            value={newInvoiceForm.artih_tanggal}
                                            onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, artih_tanggal: e.target.value })}
                                            className="w-full p-1.5 bg-white border border-slate-300 rounded font-bold text-slate-800 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">KETERANGAN :</label>
                                        <input
                                            type="text"
                                            value={newInvoiceForm.artih_keterangan}
                                            onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, artih_keterangan: e.target.value })}
                                            placeholder="Keterangan faktur..."
                                            className="w-full p-1.5 bg-white border border-slate-300 rounded font-medium text-slate-800 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">FAKTUR PAJAK :</label>
                                        <input
                                            type="text"
                                            value={newInvoiceForm.artih_fktpajak || '010.'}
                                            onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, artih_fktpajak: e.target.value })}
                                            className="w-full p-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Baris 4: Perhitungan Nilai Finansial */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1 border-t border-slate-200">
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">TOTAL TAGIHAN :</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={`Rp ${grandTotalSelected.toLocaleString('id-ID')}`}
                                            className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-black text-rose-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">DPP (%) :</label>
                                        <select
                                            defaultValue="100"
                                            className="w-full p-1.5 bg-white border border-slate-300 rounded font-bold text-slate-800 outline-none"
                                        >
                                            <option value="100">100 %</option>
                                            <option value="11">11 %</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">PPN (%) :</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value="1.1 %"
                                            className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-bold text-slate-700"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 2. TABEL ATAS: BTT YANG SUDAH DIPILIH (PERSIS GAMBAR 1 LAWAS) */}
                            <div className="border border-emerald-400 rounded-xl p-3 bg-emerald-50/20 space-y-2">
                                <div className="text-center font-bold text-emerald-800 uppercase tracking-wider text-xs">
                                    BTT YANG SUDAH DIPILIH ({selectedBTTObjects.length} RESI)
                                </div>
                                <div className="border border-slate-300 rounded-lg max-h-48 overflow-y-auto bg-white shadow-inner">
                                    <table className="w-full text-left border-collapse text-[10px]">
                                        <thead className="bg-[#004b84] text-white uppercase font-bold sticky top-0 z-10 text-[9px]">
                                            <tr>
                                                <th className="p-2">NO. BTT</th>
                                                <th className="p-2">TANGGAL</th>
                                                <th className="p-2">PENGIRIM</th>
                                                <th className="p-2">PENERIMA</th>
                                                <th className="p-2">ISI KIRIMAN</th>
                                                <th className="p-2">KOTA TUJUAN</th>
                                                <th className="p-2 text-center">BERAT</th>
                                                <th className="p-2 text-center">UKURAN</th>
                                                <th className="p-2 text-right">HARGA</th>
                                                <th className="p-2 text-right">DISKON</th>
                                                <th className="p-2 text-right">PENERUS</th>
                                                <th className="p-2 text-right">PACKING</th>
                                                <th className="p-2 text-right">JUMLAH</th>
                                                <th className="p-2 text-center w-12">HAPUS</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {selectedBTTObjects.map((btt, idx) => (
                                                <tr key={idx} className="hover:bg-emerald-50/50">
                                                    <td className="p-2 font-mono font-bold text-sky-700">{btt.bttt_id}</td>
                                                    <td className="p-2 font-mono text-slate-700">{String(btt.bttt_tanggal).split('T')[0]}</td>
                                                    <td className="p-2 text-slate-800">{btt.bttt_asalname}</td>
                                                    <td className="p-2 text-slate-700">{btt.bttt_tujuannama || '-'}</td>
                                                    <td className="p-2 text-slate-700">{btt.bttt_namabarang || '-'}</td>
                                                    <td className="p-2 text-slate-700">{btt.bttt_tujuankota}</td>
                                                    <td className="p-2 text-center font-mono">{btt.bttt_berat}</td>
                                                    <td className="p-2 text-center font-mono">0</td>
                                                    <td className="p-2 text-right font-mono">{Number(btt.bttt_harga || 0).toLocaleString('id-ID')}</td>
                                                    <td className="p-2 text-right font-mono">0.00</td>
                                                    <td className="p-2 text-right font-mono">{Number(btt.bttt_biayapenerus || 0).toLocaleString('id-ID')}</td>
                                                    <td className="p-2 text-right font-mono">{Number(btt.biaya_packing || 0).toLocaleString('id-ID')}</td>
                                                    <td className="p-2 text-right font-mono font-bold text-emerald-700">
                                                        {Number(btt.subtotal || btt.bttt_harga || 0).toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setNewInvoiceForm(prev => ({
                                                                    ...prev,
                                                                    selected_btts: prev.selected_btts.filter(id => id !== btt.bttt_id)
                                                                }));
                                                            }}
                                                            className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                                                            title="Keluarkan dari invoice"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {selectedBTTObjects.length === 0 && (
                                                <tr>
                                                    <td colSpan={14} className="p-4 text-center text-slate-400 font-bold italic">
                                                        Belum ada resi yang dipilih. Silakan centang nomor BTT pada tabel bawah.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 3. KOTAK 4 REKAP BIAYA & TOMBOL CETAK KWITANSI DAN FAKTUR */}
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-300 text-xs shadow-xs">
                                    <div>
                                        <label className="font-bold text-slate-700 block text-[10px] mb-1">TOTAL BIAYA KIRIM :</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={totBiayaKirim.toLocaleString('id-ID')}
                                            className="w-full p-1.5 bg-cyan-50/50 border border-slate-300 rounded font-mono font-bold text-right text-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 block text-[10px] mb-1">TOTAL DISKON BIAYA KIRIM :</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value="0.00"
                                            className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-right text-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 block text-[10px] mb-1">TOTAL BIAYA PENERUS :</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={totPenerus.toLocaleString('id-ID')}
                                            className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-right text-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 block text-[10px] mb-1">TOTAL PACKING :</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={totPacking.toLocaleString('id-ID')}
                                            className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-right text-slate-700"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 pt-1">
                                    <div className="inline-block px-2.5 py-0.5 border border-sky-300 bg-sky-50 text-sky-800 font-bold text-[11px] rounded tracking-wide">
                                        CETAK KWITANSI DAN FAKTUR
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={!savedInvoiceId}
                                            onClick={() => handlePrintDocument({ artih_id: savedInvoiceId, artih_nokw: savedKwitansiNo }, 'KWITANSI_1')}
                                            className={`px-5 py-2 font-bold rounded text-xs transition uppercase ${savedInvoiceId
                                                ? 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shadow-sm'
                                                : 'bg-amber-500/40 text-white/70 cursor-not-allowed'
                                                }`}
                                        >
                                            Kwitansi Tipe 1
                                        </button>

                                        <button
                                            type="button"
                                            disabled={!savedInvoiceId}
                                            onClick={() => handlePrintDocument({ artih_id: savedInvoiceId, artih_nokw: savedKwitansiNo }, 'KWITANSI_2')}
                                            className={`px-5 py-2 font-bold rounded text-xs transition uppercase ${savedInvoiceId
                                                ? 'bg-sky-500 hover:bg-sky-600 text-white cursor-pointer shadow-sm'
                                                : 'bg-sky-500/40 text-white/70 cursor-not-allowed'
                                                }`}
                                        >
                                            Kwitansi Tipe 2
                                        </button>

                                        <button
                                            type="button"
                                            disabled={!savedInvoiceId}
                                            onClick={() => handlePrintDocument({ artih_id: savedInvoiceId, artih_nokw: savedKwitansiNo }, 'FAKTUR_2')}
                                            className={`px-5 py-2 font-bold rounded text-xs transition uppercase ${savedInvoiceId
                                                ? 'bg-[#0088cc] hover:bg-[#0077b3] text-white cursor-pointer shadow-sm'
                                                : 'bg-[#0088cc]/40 text-white/70 cursor-not-allowed'
                                                }`}
                                        >
                                            Faktur Tipe 2
                                        </button>

                                        <button
                                            type="button"
                                            disabled={!savedInvoiceId}
                                            onClick={() => handlePrintDocument({ artih_id: savedInvoiceId, artih_nokw: savedKwitansiNo }, 'SUMMARY')}
                                            className={`px-5 py-2 font-bold rounded text-xs transition uppercase ${savedInvoiceId
                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm'
                                                : 'bg-emerald-600/40 text-white/70 cursor-not-allowed'
                                                }`}
                                        >
                                            Summary Billing
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 4. TABEL BAWAH: DAFTAR NOMOR BTT (UNTUK DICARI & DICENTANG) */}
                            <div className="border border-sky-300 rounded-xl p-3 bg-slate-50/60 space-y-3">
                                <div className="text-center font-bold text-sky-800 uppercase tracking-wider text-xs">
                                    DAFTAR NOMOR BTT
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <div>
                                            <label className="font-bold text-slate-700 block text-[10px] mb-1">TANGGAL BTT :</label>
                                            <input
                                                type="date"
                                                value={bttStartDate}
                                                onChange={(e) => handleFilterBTTChange(e.target.value, bttEndDate, bttBypassTanggal, bttDisplayType)}
                                                className="p-1.5 bg-white border border-slate-300 rounded font-bold text-slate-800 outline-none cursor-pointer"
                                            />
                                        </div>
                                        <div>
                                            <label className="font-bold text-slate-700 block text-[10px] mb-1">SAMPAI :</label>
                                            <input
                                                type="date"
                                                value={bttEndDate}
                                                onChange={(e) => handleFilterBTTChange(bttStartDate, e.target.value, bttBypassTanggal, bttDisplayType)}
                                                className="p-1.5 bg-white border border-slate-300 rounded font-bold text-slate-800 outline-none cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4">
                                        <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={bttBypassTanggal}
                                                onChange={(e) => handleFilterBTTChange(bttStartDate, bttEndDate, e.target.checked, bttDisplayType)}
                                                className="w-4 h-4 text-blue-600 rounded"
                                            />
                                            <span>Bypass Filter Tanggal</span>
                                        </label>

                                        <div className="flex items-center gap-3 bg-white px-3 py-1 rounded border border-slate-200">
                                            <span className="text-slate-500 font-bold uppercase text-[10px]">Tampilkan Daftar :</span>
                                            <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-700">
                                                <input
                                                    type="radio"
                                                    name="btt_type_modal"
                                                    checked={bttDisplayType !== 'PI'}
                                                    onChange={() => handleFilterBTTChange(bttStartDate, bttEndDate, bttBypassTanggal, 'UTAMA')}
                                                />
                                                {newInvoiceForm.artih_jenis === 'B' ? 'BTT Tunai' : newInvoiceForm.artih_jenis === 'T' ? 'BTT Tagih' : 'BTT Kredit'}
                                            </label>
                                            <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-700">
                                                <input
                                                    type="radio"
                                                    name="btt_type_modal"
                                                    checked={bttDisplayType === 'PI'}
                                                    onChange={() => handleFilterBTTChange(bttStartDate, bttEndDate, bttBypassTanggal, 'PI')}
                                                />
                                                Proforma Invoice
                                            </label>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => loadUnbilledBTTByDate(newInvoiceForm.artih_custid, bttStartDate, bttEndDate, bttBypassTanggal, bttDisplayType)}
                                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded uppercase flex items-center gap-1 cursor-pointer text-xs"
                                        >
                                            <RefreshCw size={12} className={loadingUnbilled ? 'animate-spin' : ''} /> REFRESH BTT
                                        </button>
                                    </div>
                                </div>

                                {/* GRID TABLE DAFTAR RESI BTT UNBILLED */}
                                <div className="border border-slate-300 rounded-lg max-h-56 overflow-y-auto bg-white shadow-inner">
                                    <table className="w-full text-left border-collapse text-[11px]">
                                        <thead className="bg-[#004b84] text-white uppercase font-bold sticky top-0 z-10 text-[10px]">
                                            <tr>
                                                <th className="p-2">NO. BTT</th>
                                                <th className="p-2">TANGGAL</th>
                                                <th className="p-2">PENGIRIM</th>
                                                <th className="p-2">ISI KIRIMAN</th>
                                                <th className="p-2">KOTA TUJUAN</th>
                                                <th className="p-2 text-center">BERAT</th>
                                                <th className="p-2 text-center">UKURAN</th>
                                                <th className="p-2 text-right">HARGA</th>
                                                <th className="p-2 text-right">PENERUS</th>
                                                <th className="p-2 text-right">JUMLAH</th>
                                                <th className="p-2 text-center w-14">PILIH</th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {unbilledBTTList.map((btt, idx) => {
                                                const cleanId = String(btt.bttt_id || '').trim();
                                                const isChecked = newInvoiceForm.selected_btts.some(id => String(id).trim() === cleanId);

                                                return (
                                                    <tr
                                                        key={idx}
                                                        className={`transition-colors ${isChecked ? 'bg-emerald-50/70 font-semibold' : 'hover:bg-sky-50/50'}`}
                                                    >
                                                        <td className="p-2 font-mono text-sky-700">{btt.bttt_id}</td>
                                                        <td className="p-2 font-mono text-slate-700">{String(btt.bttt_tanggal).split('T')[0]}</td>
                                                        <td className="p-2 text-slate-800">{btt.bttt_asalname}</td>
                                                        <td className="p-2 text-slate-700">{btt.bttt_namabarang || '-'}</td>
                                                        <td className="p-2 text-slate-700">{btt.bttt_tujuankota}</td>
                                                        <td className="p-2 text-center font-mono">{btt.bttt_berat}</td>
                                                        <td className="p-2 text-center font-mono">0</td>
                                                        <td className="p-2 text-right font-mono">{Number(btt.bttt_harga || 0).toLocaleString('id-ID')}</td>
                                                        <td className="p-2 text-right font-mono">{Number(btt.bttt_biayapenerus || 0).toLocaleString('id-ID')}</td>
                                                        <td className="p-2 text-right font-mono font-bold text-rose-600">
                                                            {Number(btt.subtotal || btt.bttt_harga || 0).toLocaleString('id-ID')}
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => {
                                                                    setNewInvoiceForm(prev => ({
                                                                        ...prev,
                                                                        selected_btts: isChecked
                                                                            ? prev.selected_btts.filter(id => String(id).trim() !== cleanId)
                                                                            : [...prev.selected_btts, cleanId]
                                                                    }));
                                                                }}
                                                                className="w-4 h-4 text-emerald-600 rounded cursor-pointer accent-emerald-600"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>

                                    </table>
                                </div>
                            </div>

                            {/* 5. FOOTER TOMBOL AKSI PALING BAWAH */}
                            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleSaveNewInvoice}
                                        className="px-7 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-black rounded uppercase transition cursor-pointer shadow-sm text-xs"
                                    >
                                        SIMPAN
                                    </button>

                                    <button
                                        type="button"
                                        disabled={!savedInvoiceId}
                                        onClick={() => handlePostingInvoice(savedInvoiceId)}
                                        className={`px-6 py-2 font-black rounded uppercase text-xs transition ${savedInvoiceId
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm'
                                            : 'bg-emerald-600/40 text-white/60 cursor-not-allowed'
                                            }`}
                                    >
                                        POSTING
                                    </button>

                                    <button
                                        type="button"
                                        disabled={!savedInvoiceId}
                                        onClick={() => handlePrintDocument({ artih_id: savedInvoiceId, artih_nokw: savedKwitansiNo }, 'FAKTUR')}
                                        className={`px-6 py-2 font-black rounded uppercase text-xs transition ${savedInvoiceId
                                            ? 'bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-sm'
                                            : 'bg-sky-600/40 text-white/70 cursor-not-allowed'
                                            }`}
                                    >
                                        CETAK
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setAddStep(1)}
                                        className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded uppercase transition cursor-pointer text-xs"
                                    >
                                        KEMBALI
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsAddModalOpen(false);
                                            setSavedInvoiceId(null);
                                            setSavedKwitansiNo(null);
                                            setPersistedSelectedBtts([]);
                                        }}
                                        className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded uppercase transition cursor-pointer text-xs"
                                    >
                                        BATAL
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

            </div>
        </div>
    ) : null;

    const modalRoot = document.getElementById('modal-root') || document.body;

    return (
        <div className="space-y-5">
            {/* Panel Filter */}
            {showFilter && (
                <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                        <Filter size={16} className="text-sky-600" />
                        FILTER INVOICE PENAGIHAN PIUTANG
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <label className="font-bold text-slate-500 block mb-1">TGL AWAL</label>
                                <input
                                    type="date"
                                    disabled={bypassTanggal}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'}`}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="font-bold text-slate-500 block mb-1">TGL AKHIR</label>
                                <input
                                    type="date"
                                    disabled={bypassTanggal}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'}`}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CABANG</label>
                            <select
                                value={selectedCabang}
                                disabled={!isHoldingUser}
                                onChange={(e) => setSelectedCabang(e.target.value)}
                                className={`w-full p-2 border rounded-lg font-bold outline-none ${!isHoldingUser ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed select-none' : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500 cursor-pointer'}`}
                            >
                                {isHoldingUser && <option value="">-- SEMUA CABANG --</option>}
                                {!isHoldingUser ? (
                                    <option value={currentActiveAgen.id}>{currentActiveAgen.nama}</option>
                                ) : (
                                    cabangList.map((c, i) => (
                                        <option key={i} value={c.agen_id || c.AgenID}>
                                            {c.agen_nama || c.AgenNama}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">JENIS INVOICE</label>
                            <select
                                value={selectedJenis}
                                onChange={(e) => setSelectedJenis(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="">-- SEMUA JENIS --</option>
                                <option value="K">Kredit (Langganan Tempo)</option>
                                <option value="B">Tunai (Cash)</option>
                                <option value="T">Tagih Turun (COD)</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">STATUS PEMBAYARAN</label>
                            <select
                                value={selectedTerbayar}
                                onChange={(e) => setSelectedTerbayar(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="">-- SEMUA STATUS --</option>
                                <option value="Y">Lunas</option>
                                <option value="N">Belum Lunas</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CUSTOMER</label>
                            <input
                                type="text"
                                placeholder="Cari nama customer..."
                                value={searchCustomer}
                                onChange={(e) => setSearchCustomer(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. INVOICE</label>
                            <input
                                type="text"
                                placeholder="Nomor invoice..."
                                value={searchInvoice}
                                onChange={(e) => setSearchInvoice(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. KWITANSI</label>
                            <input
                                type="text"
                                placeholder="Nomor kwitansi..."
                                value={searchKwitansi}
                                onChange={(e) => setSearchKwitansi(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. BTT</label>
                            <input
                                type="text"
                                placeholder="Cari nomor resi BTT..."
                                value={searchBTT}
                                onChange={(e) => setSearchBTT(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div className="flex items-center">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 mt-2">
                                <input
                                    type="checkbox"
                                    checked={bypassTanggal}
                                    onChange={(e) => setBypassTanggal(e.target.checked)}
                                    className="w-4 h-4 text-sky-600 rounded"
                                />
                                Bypass Filter Tanggal
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handlePrintRekapRingkas}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl uppercase transition shadow-sm cursor-pointer flex items-center gap-1.5"
                                title="Cetak Ringkasan Daftar Faktur Penagihan"
                            >
                                <Printer size={14} /> CETAK
                            </button>
                            <button
                                type="button"
                                onClick={handlePrintRekapFakturPajak}
                                className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-xl uppercase transition shadow-sm cursor-pointer flex items-center gap-1.5"
                                title="Cetak Rekap Faktur Pajak Komprehensif"
                            >
                                <FileText size={14} /> REKAP FAKTUR
                            </button>
                        </div>

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
                                <RefreshCw size={14} /> REFRESH DATA
                            </button>
                        </div>
                    </div>
                </form>
            )}

            <DataTableTemplate
                title="INVOICE PENAGIHAN"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                isAddDisabled={false}
                hideAddButton={false}
                onFilter={() => setShowFilter(prev => !prev)}
                onAdd={() => {
                    const currentAgen = getActiveAgen();
                    setSavedInvoiceId(null);
                    setSavedKwitansiNo(null);
                    setPersistedSelectedBtts([]); // <-- Tambahkan reset ini
                    setNewInvoiceForm({
                        artih_tanggal: today,
                        artih_custid: '',
                        artih_custname: '',
                        artih_agenid: currentAgen.id,
                        artih_agenname: currentAgen.nama,
                        artih_jenis: 'K',
                        artih_fktpajak: '010.',
                        artih_keterangan: '',
                        selected_btts: []
                    });
                    setAddStep(1);
                    setUnbilledBTTList([]);
                    setBttBypassTanggal(true);
                    setIsAddModalOpen(true);
                }}
            />

            {addModalElement && ReactDOM.createPortal(addModalElement, modalRoot)}

        </div>
    );
};

export default Invoice;