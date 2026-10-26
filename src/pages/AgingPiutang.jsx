import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useDarkMode } from '../context/DarkModeContext';
import {
    Filter, Printer, RefreshCw, ChevronDown, ChevronRight,
    Search, Download, Building2, Calendar, User, FileText, ArrowUpDown
} from 'lucide-react';
import Swal from 'sweetalert2';
import dakotaLogo from '../assets/new_logo 2.png';

// Helper format resmi nomor invoice
function formatNomorInvoiceResmi(rawId, rawDate, fallbackAgenId = '') {
    if (!rawId) return '-';
    let clean = String(rawId).trim();
    if (clean.includes('/FP')) return clean;

    const digits = clean.replace(/\D/g, '');
    const d = rawDate ? new Date(rawDate) : new Date();
    let mm = String(d.getMonth() + 1).padStart(2, '0');
    let yyyy = String(d.getFullYear());

    let agen = '';
    if (clean.length >= 3 && !isNaN(Number(clean.slice(0, 3)))) {
        agen = clean.slice(0, 3);
    } else if (fallbackAgenId) {
        agen = String(fallbackAgenId).padStart(3, '0').slice(-3);
    } else {
        const sessionAgen = localStorage.getItem('active_cabang_id') || localStorage.getItem('active_agen_id') || '';
        agen = sessionAgen ? String(sessionAgen).padStart(3, '0').slice(-3) : clean.slice(0, 3);
    }

    let urut = '0001';
    if (digits.length >= 11) {
        agen = digits.slice(0, 3);
        const bulanId = digits.slice(3, 5);
        const tahunId = digits.slice(5, 7);
        urut = digits.slice(7);
        if (Number(bulanId) >= 1 && Number(bulanId) <= 12) mm = bulanId;
        yyyy = `20${tahunId}`;
    } else if (digits.length >= 7) {
        agen = digits.slice(0, 3);
        urut = digits.slice(-4);
    } else if (digits.length > 0) {
        urut = digits.padStart(4, '0').slice(-4);
    }

    return `${agen}${urut}/${mm}/${yyyy}/FP`;
}

function hitungHari(tglJtStr) {
    if (!tglJtStr) return 0;
    const tglJt = new Date(tglJtStr);
    if (isNaN(tglJt.getTime())) return 0;
    const today = new Date();
    const diffTime = today - tglJt;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
}

const AgingPiutang = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [cabangList, setCabangList] = useState([]);
    const [custList, setCustList] = useState([]);
    const [agingRawData, setAgingRawData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [searchTable, setSearchTable] = useState('');
    const [collapsedGroups, setCollapsedGroups] = useState({});

    // Sesi Cabang Aktif
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
            return (
                (activeAgenId && (cId === activeAgenId.toLowerCase() || cKode === activeAgenId.toLowerCase() || cNama.includes(activeAgenId.toLowerCase()))) ||
                (activeCabangId && (cId === activeCabangId.toLowerCase() || cKode === activeCabangId.toLowerCase() || cNama.includes(activeCabangId.toLowerCase())))
            );
        });

        if (found) {
            return {
                id: String(found.agen_id || found.AgenID),
                nama: String(found.agen_nama || found.AgenNama).toUpperCase()
            };
        }

        return { id: '001', nama: 'PUSAT DAKOTA' };
    }

    const currentActiveAgen = getActiveAgen();
    const isHoldingUser =
        String(currentActiveAgen.nama || '').toUpperCase().includes('PUSAT') ||
        String(currentActiveAgen.nama || '').toUpperCase().includes('HOLDING') ||
        String(currentActiveAgen.id || '') === '001' ||
        (!currentActiveAgen.id && !currentActiveAgen.nama);

    // Filter Parameter
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [bypassTanggal, setBypassTanggal] = useState(false);
    const [selectedCabang, setSelectedCabang] = useState(isHoldingUser ? '' : currentActiveAgen.id);
    const [selectedCust, setSelectedCust] = useState('');

    const fetchOptions = async () => {
        const token = localStorage.getItem('token');
        try {
            const [resCabang, resCust] = await Promise.all([
                api.get('/gl/agen-ca?stt=', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
                api.get('/gl/customers?limit=1000', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } }))
            ]);
            setCabangList(resCabang.data?.data || []);
            setCustList(resCust.data?.data || []);
        } catch (err) {
            console.error('Gagal load opsi filter:', err);
        }
    };

    const fetchAgingData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            let url = `/piutang/aging?pt_id=${ptId}&bypass_tanggal=${bypassTanggal}`;

            if (!bypassTanggal) {
                url += `&start_date=${startDate}&end_date=${endDate}`;
            }
            const activeFilterCabang = !isHoldingUser ? currentActiveAgen.id : selectedCabang;
            if (activeFilterCabang) url += `&cabang_id=${encodeURIComponent(activeFilterCabang)}`;
            if (selectedCust) url += `&cust_id=${encodeURIComponent(selectedCust)}`;

            const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setAgingRawData(res.data?.data || []);
        } catch (err) {
            console.error('Gagal load data aging:', err);
            Swal.fire({ title: 'Error', text: 'Gagal mengambil data aging piutang.', icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOptions();
        fetchAgingData();
    }, []);

    // =========================================================================
    // PENGELOMPOKAN DATA BERDASARKAN CUSTOMER (PERSIS SISTEM LAWAS)
    // =========================================================================
    const groupedData = useMemo(() => {
        const groups = {};

        const filteredList = agingRawData.filter(item => {
            if (!searchTable.trim()) return true;
            const q = searchTable.toLowerCase();
            return (
                String(item.cust_name || '').toLowerCase().includes(q) ||
                String(item.no_invoice || '').toLowerCase().includes(q) ||
                String(item.cust_id || '').toLowerCase().includes(q) ||
                String(item.cabang_nama || '').toLowerCase().includes(q)
            );
        });

        filteredList.forEach(item => {
            const key = item.cust_id || item.cust_name || 'UNKNOWN';
            if (!groups[key]) {
                groups[key] = {
                    cust_id: item.cust_id || '-',
                    cust_name: item.cust_name || item.artih_custname || 'CUSTOMER TANPA NAMA',
                    saldo_awal: Number(item.saldo_awal || 0),
                    items: [],
                    subtotal_nilai: 0,
                    subtotal_b0_30: 0,
                    subtotal_b31_60: 0,
                    subtotal_b61_90: 0,
                    subtotal_b91_180: 0,
                    subtotal_b181_360: 0,
                    subtotal_bover_360: 0,
                    subtotal_sisa: 0
                };
            }

            const sisa = Number(item.sisa_piutang || item.total_tagihan || 0);
            const nilai = Number(item.total_tagihan || sisa);
            const umurHari = item.umur_hari !== undefined ? Number(item.umur_hari) : hitungHari(item.tgl_jt || item.tgl_invoice);

            // Klasifikasi Bucket 6 Kelompok (Persis Sistem Lawas Gambar 2)
            let b0_30 = 0, b31_60 = 0, b61_90 = 0, b91_180 = 0, b181_360 = 0, bover_360 = 0;
            if (umurHari <= 30) b0_30 = sisa;
            else if (umurHari <= 60) b31_60 = sisa;
            else if (umurHari <= 90) b61_90 = sisa;
            else if (umurHari <= 180) b91_180 = sisa;
            else if (umurHari <= 360) b181_360 = sisa;
            else bover_360 = sisa;

            groups[key].items.push({
                ...item,
                official_invoice_no: formatNomorInvoiceResmi(item.no_invoice || item.artih_id, item.tgl_invoice, item.cabang_id),
                umur_hari: umurHari,
                b0_30, b31_60, b61_90, b91_180, b181_360, bover_360,
                sisa
            });

            groups[key].subtotal_nilai += nilai;
            groups[key].subtotal_b0_30 += b0_30;
            groups[key].subtotal_b31_60 += b31_60;
            groups[key].subtotal_b61_90 += b61_90;
            groups[key].subtotal_b91_180 += b91_180;
            groups[key].subtotal_b181_360 += b181_360;
            groups[key].subtotal_bover_360 += bover_360;
            groups[key].subtotal_sisa += sisa;
        });

        return Object.values(groups);
    }, [agingRawData, searchTable]);

    // KPI Summary
    const summaryCalculated = useMemo(() => {
        let tot0_30 = 0, tot31_60 = 0, tot61_90 = 0, totOver90 = 0, grandTotal = 0;
        groupedData.forEach(g => {
            tot0_30 += g.subtotal_b0_30;
            tot31_60 += g.subtotal_b31_60;
            tot61_90 += g.subtotal_b61_90;
            totOver90 += (g.subtotal_b91_180 + g.subtotal_b181_360 + g.subtotal_bover_360);
            grandTotal += g.subtotal_sisa;
        });
        return { tot0_30, tot31_60, tot61_90, totOver90, grandTotal };
    }, [groupedData]);

    const toggleGroup = (key) => {
        setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // 🖨️ CETAK RESMI FORMAT SISTEM LAWAS (A4 LANDSCAPE)
    const handlePrintAging = () => {
        if (!groupedData || groupedData.length === 0) {
            Swal.fire('Data Kosong', 'Tidak ada data aging untuk dicetak.', 'warning');
            return;
        }

        const printWindow = window.open('', '_blank', 'width=1300,height=850,scrollbars=yes');
        if (!printWindow) return;

        const periodeStr = bypassTanggal ? 'SEMUA PERIODE' : `${startDate} s/d ${endDate}`;
        const activeFilterCabang = !isHoldingUser ? currentActiveAgen.id : selectedCabang;
        const foundCabang = cabangList.find(c => String(c.agen_id || c.AgenID) === String(activeFilterCabang));
        const namaCabang = activeFilterCabang ? (foundCabang?.agen_nama || `CABANG ${activeFilterCabang}`) : 'KONSOLIDASI (SEMUA CABANG)';

        let grandTotalTagihan = 0;
        let grandB0_30 = 0, grandB31_60 = 0, grandB61_90 = 0, grandB91_180 = 0, grandB181_360 = 0, grandBover = 0;

        const groupsHtml = groupedData.map(group => {
            const rows = group.items.map(item => `
                <tr style="font-size: 9.5px; font-family: monospace;">
                    <td style="border: 1px solid #999; padding: 4px;">${item.cabang_nama || item.agen_nama || 'DLI PUSAT'}</td>
                    <td style="border: 1px solid #999; padding: 4px;">${group.cust_id}</td>
                    <td style="border: 1px solid #999; padding: 4px;">${group.cust_name}</td>
                    <td style="border: 1px solid #999; padding: 4px; text-align: center;">${String(item.tgl_invoice || '').split('T')[0]}</td>
                    <td style="border: 1px solid #999; padding: 4px; font-weight: bold; color: #004b84;">${item.official_invoice_no}</td>
                    <td style="border: 1px solid #999; padding: 4px; text-align: center;">${String(item.tgl_tukar || '-').split('T')[0]}</td>
                    <td style="border: 1px solid #999; padding: 4px; text-align: center;">${String(item.tgl_jt || '-').split('T')[0]}</td>
                    <td style="border: 1px solid #999; padding: 4px; text-align: right;">${item.sisa.toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid #999; padding: 4px; text-align: right;">${item.b0_30 > 0 ? item.b0_30.toLocaleString('id-ID') : '0'}</td>
                    <td style="border: 1px solid #999; padding: 4px; text-align: right;">${item.b31_60 > 0 ? item.b31_60.toLocaleString('id-ID') : '0'}</td>
                    <td style="border: 1px solid #999; padding: 4px; text-align: right;">${item.b61_90 > 0 ? item.b61_90.toLocaleString('id-ID') : '0'}</td>
                    <td style="border: 1px solid #999; padding: 4px; text-align: right;">${item.b91_180 > 0 ? item.b91_180.toLocaleString('id-ID') : '0'}</td>
                    <td style="border: 1px solid #999; padding: 4px; text-align: right;">${item.b181_360 > 0 ? item.b181_360.toLocaleString('id-ID') : '0'}</td>
                    <td style="border: 1px solid #999; padding: 4px; text-align: right;">${item.bover_360 > 0 ? item.bover_360.toLocaleString('id-ID') : '0'}</td>
                    <td style="border: 1px solid #999; padding: 4px; text-align: center; font-weight: bold;">${item.umur_hari} Hari</td>
                </tr>
            `).join('');

            grandTotalTagihan += group.subtotal_sisa;
            grandB0_30 += group.subtotal_b0_30;
            grandB31_60 += group.subtotal_b31_60;
            grandB61_90 += group.subtotal_b61_90;
            grandB91_180 += group.subtotal_b91_180;
            grandB181_360 += group.subtotal_b181_360;
            grandBover += group.subtotal_bover_360;

            return `
                <tr style="background-color: #f1f5f9; font-weight: bold; font-size: 10px;">
                    <td colspan="7" style="border: 1px solid #999; padding: 5px;">
                        PELANGGAN: ${group.cust_name} [${group.cust_id}] — SALDO AWAL:
                    </td>
                    <td style="border: 1px solid #999; padding: 5px; text-align: right;" colspan="8">
                        Rp ${group.saldo_awal.toLocaleString('id-ID')}
                    </td>
                </tr>
                ${rows}
                <tr style="background-color: #e2e8f0; font-weight: bold; font-size: 9.5px; font-family: monospace;">
                    <td colspan="7" style="border: 1px solid #999; padding: 4px; text-align: right;">SUB TOTAL :</td>
                    <td style="border: 1px solid #999; padding: 4px; text-align: right;">${group.subtotal_sisa.toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid #999; padding: 4px; text-align: right;">${group.subtotal_b0_30.toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid #999; padding: 4px; text-align: right;">${group.subtotal_b31_60.toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid #999; padding: 4px; text-align: right;">${group.subtotal_b61_90.toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid #999; padding: 4px; text-align: right;">${group.subtotal_b91_180.toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid #999; padding: 4px; text-align: right;">${group.subtotal_b181_360.toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid #999; padding: 4px; text-align: right;">${group.subtotal_bover_360.toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid #999; padding: 4px; text-align: center;">-</td>
                </tr>
            `;
        }).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>LAPORAN UMUR PIUTANG USAHA - DAKOTA LOGISTIK</title>
                <style>
                    @page { size: A4 landscape; margin: 8mm; }
                    body { font-family: Arial, sans-serif; font-size: 10px; margin: 0; padding: 10px; color: #000; }
                    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
                    th { border: 1px solid #000; background: #cbd5e1; padding: 5px 2px; text-align: center; font-size: 9px; font-weight: bold; }
                    @media print { .no-print { display: none !important; } }
                </style>
            </head>
            <body>
                <div class="no-print" style="margin-bottom: 12px; text-align: right;">
                    <button style="background: #16a34a; color: white; padding: 6px 16px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;" onclick="window.print()">PRINT</button>
                    <button style="background: #e11d48; color: white; padding: 6px 16px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;" onclick="window.close()">TUTUP</button>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #000; padding-bottom: 6px;">
                    <div>
                        <h2 style="margin:0; font-size: 14px; font-weight: 900;">PT DAKOTA LOGISTIK INDONESIA</h2>
                        <div style="font-size: 10px; color: #333;">Jl. Wibawa Mukti II No. 99, Jatiasih, Bekasi</div>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="margin:0; font-size: 15px; font-weight: 900; text-decoration: underline;">LAPORAN UMUR PIUTANG USAHA</h2>
                        <div style="font-size: 10px; font-weight: bold;">Periode : ${periodeStr} | ${namaCabang}</div>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th rowspan="2" style="width: 7%;">Cabang</th>
                            <th colspan="2">Pelanggan</th>
                            <th colspan="4">Transaksi</th>
                            <th rowspan="2" style="width: 7%;">Nilai Piutang</th>
                            <th colspan="6">Umur Piutang (Hari)</th>
                            <th rowspan="2" style="width: 4%;">Aktual</th>
                        </tr>
                        <tr>
                            <th style="width: 6%;">Cust ID</th>
                            <th style="width: 14%;">Nama Pelanggan</th>
                            <th style="width: 6%;">Tanggal</th>
                            <th style="width: 11%;">No. Invoice</th>
                            <th style="width: 6%;">Tgl Tk.Faktur</th>
                            <th style="width: 6%;">Tgl Jt.Tempo</th>
                            <th style="width: 6%;">0-30</th>
                            <th style="width: 6%;">31-60</th>
                            <th style="width: 6%;">61-90</th>
                            <th style="width: 6%;">91-180</th>
                            <th style="width: 6%;">181-360</th>
                            <th style="width: 6%;">> 1 Tahun</th>
                        </tr>
                    </thead>
                    <tbody>${groupsHtml}</tbody>
                    <tfoot>
                        <tr style="background-color: #cbd5e1; font-weight: bold; font-family: monospace; font-size: 10px;">
                            <td colspan="7" style="border: 1px solid #000; padding: 6px; text-align: center;">TOTAL KESELURUHAN :</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right;">${grandTotalTagihan.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right;">${grandB0_30.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right;">${grandB31_60.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right;">${grandB61_90.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right;">${grandB91_180.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right;">${grandB181_360.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right;">${grandBover.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: center;">-</td>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="space-y-5">
            {/* 1. AGING SUMMARY KPI CARDS (MODERN) */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 text-xs font-sans">
                <div className="bg-emerald-50/80 border border-emerald-200/90 p-4 rounded-2xl shadow-xs transition hover:shadow-md">
                    <span className="text-emerald-700 font-bold block mb-1 tracking-wider text-[11px]">0 – 30 HARI (CURRENT)</span>
                    <span className="text-lg font-black font-mono text-emerald-800">Rp {summaryCalculated.tot0_30.toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-sky-50/80 border border-sky-200/90 p-4 rounded-2xl shadow-xs transition hover:shadow-md">
                    <span className="text-sky-700 font-bold block mb-1 tracking-wider text-[11px]">31 – 60 HARI</span>
                    <span className="text-lg font-black font-mono text-sky-800">Rp {summaryCalculated.tot31_60.toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-amber-50/80 border border-amber-200/90 p-4 rounded-2xl shadow-xs transition hover:shadow-md">
                    <span className="text-amber-700 font-bold block mb-1 tracking-wider text-[11px]">61 – 90 HARI</span>
                    <span className="text-lg font-black font-mono text-amber-800">Rp {summaryCalculated.tot61_90.toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-rose-50/80 border border-rose-200/90 p-4 rounded-2xl shadow-xs transition hover:shadow-md">
                    <span className="text-rose-700 font-bold block mb-1 tracking-wider text-[11px]">&gt; 90 HARI (OVERDUE)</span>
                    <span className="text-lg font-black font-mono text-rose-800">Rp {summaryCalculated.totOver90.toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-[#004b84] border border-[#003761] text-white p-4 rounded-2xl shadow-md transition hover:shadow-lg">
                    <span className="text-sky-200 font-bold block mb-1 tracking-wider text-[11px]">TOTAL OUTSTANDING</span>
                    <span className="text-lg font-black font-mono text-white">Rp {summaryCalculated.grandTotal.toLocaleString('id-ID')}</span>
                </div>
            </div>

            {/* 2. PANEL FILTER (PERSIS ALUR INPUT GAMBAR 1) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
                <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                    <div className="font-black uppercase tracking-wider text-slate-800 text-sm flex items-center gap-2">
                        <Filter size={17} className="text-sky-600" />
                        PARAMETER AGING PIUTANG
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrintAging}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl uppercase transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                            <Printer size={14} /> Cetak Laporan
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-semibold text-slate-700">
                    <div>
                        <label className="block mb-1 text-slate-500 font-bold">TANGGAL AWAL :</label>
                        <input
                            type="date"
                            disabled={bypassTanggal}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold outline-none focus:border-sky-500"
                        />
                    </div>
                    <div>
                        <label className="block mb-1 text-slate-500 font-bold">SAMPAI :</label>
                        <input
                            type="date"
                            disabled={bypassTanggal}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold outline-none focus:border-sky-500"
                        />
                    </div>
                    <div>
                        <label className="block mb-1 text-slate-500 font-bold">AGEN / CABANG :</label>
                        <select
                            value={!isHoldingUser && currentActiveAgen.id ? currentActiveAgen.id : selectedCabang}
                            disabled={!isHoldingUser}
                            onChange={(e) => setSelectedCabang(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold outline-none focus:border-sky-500"
                        >
                            {isHoldingUser && <option value="">-- SEMUA CABANG (ALL) --</option>}
                            {!isHoldingUser ? (
                                <option value={currentActiveAgen.id}>{currentActiveAgen.nama}</option>
                            ) : (
                                cabangList.map((c, i) => (
                                    <option key={i} value={c.agen_id || c.AgenID}>{c.agen_nama || c.AgenNama}</option>
                                ))
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1 text-slate-500 font-bold">CUSTOMER :</label>
                        <select
                            value={selectedCust}
                            onChange={(e) => setSelectedCust(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold outline-none focus:border-sky-500"
                        >
                            <option value="">-- SEMUA CUSTOMER (ALL) --</option>
                            {custList.map((c, i) => (
                                <option key={i} value={c.cust_id}>{c.cust_name} [{c.cust_id}]</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600">
                        <input
                            type="checkbox"
                            checked={bypassTanggal}
                            onChange={(e) => setBypassTanggal(e.target.checked)}
                            className="w-4 h-4 rounded text-sky-600"
                        />
                        <span>Bypass Filter Tanggal</span>
                    </label>

                    <button
                        type="button"
                        onClick={fetchAgingData}
                        className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        PROSES
                    </button>
                </div>
            </div>

            {/* 3. TABEL DATA AGING BERKELOMPOK (GROUPED & INTERAKTIF) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
                {/* Search Bar Atas Tabel */}
                <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="font-black text-slate-800 uppercase tracking-wider text-xs">
                        RINCIAN UMUR PIUTANG USAHA ({groupedData.length} PELANGGAN)
                    </div>
                    <div className="relative w-72">
                        <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari Customer / No. Invoice..."
                            value={searchTable}
                            onChange={(e) => setSearchTable(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-xs outline-none focus:border-sky-500"
                        />
                    </div>
                </div>

                {/* Table Container */}
                <div className="overflow-x-auto max-h-[68vh]">
                    <table className="w-full text-left border-collapse text-[11px]">
                        <thead className="bg-[#004b84] text-white font-bold sticky top-0 z-20 text-[10px] uppercase tracking-wider">
                            <tr>
                                <th className="p-2.5 text-center w-10">AKSI</th>
                                <th className="p-2.5">CABANG</th>
                                <th className="p-2.5">TANGGAL</th>
                                <th className="p-2.5">NO. INVOICE</th>
                                <th className="p-2.5 text-center">TGL TK.FAKTUR</th>
                                <th className="p-2.5 text-center">TGL JT.TEMPO</th>
                                <th className="p-2.5 text-right">TAGIHAN (RP)</th>
                                <th className="p-2.5 text-right text-emerald-300">0 – 30</th>
                                <th className="p-2.5 text-right text-sky-200">31 – 60</th>
                                <th className="p-2.5 text-right text-amber-300">61 – 90</th>
                                <th className="p-2.5 text-right text-rose-300">&gt; 90</th>
                                <th className="p-2.5 text-center">UMUR AKTUAL</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-200 font-medium">
                            {groupedData.map((group, gIdx) => {
                                const isCollapsed = collapsedGroups[group.cust_id];
                                return (
                                    <React.Fragment key={gIdx}>
                                        {/* HEADER CUSTOMER + SALDO AWAL (PERSIS GAMBAR 2) */}
                                        <tr
                                            onClick={() => toggleGroup(group.cust_id)}
                                            className="bg-slate-100/90 hover:bg-slate-200/80 cursor-pointer transition-colors font-bold text-slate-800"
                                        >
                                            <td className="p-2 text-center">
                                                {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                                            </td>
                                            <td colSpan={5} className="p-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sky-700 font-black">{group.cust_name}</span>
                                                    <span className="text-slate-400 font-mono text-[10px]">[{group.cust_id}]</span>
                                                    <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-bold ml-2">
                                                        {group.items.length} Invoice
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-2 text-right font-mono text-slate-500 text-[10px]">
                                                SALDO AWAL:
                                            </td>
                                            <td colSpan={5} className="p-2 text-right font-mono font-black text-slate-900 pr-4">
                                                Rp {group.saldo_awal.toLocaleString('id-ID')}
                                            </td>
                                        </tr>

                                        {/* DETAIL DAFTAR INVOICE DALAM GROUP */}
                                        {!isCollapsed && group.items.map((item, iIdx) => (
                                            <tr key={iIdx} className="hover:bg-sky-50/50 transition-colors text-slate-700">
                                                <td className="p-2 text-center text-slate-300 font-mono text-[9px]">{iIdx + 1}</td>
                                                <td className="p-2 uppercase font-semibold text-slate-600 text-[10px]">{item.cabang_nama || 'DLI PUSAT'}</td>
                                                <td className="p-2 font-mono text-slate-600 text-[10px]">{String(item.tgl_invoice || '').split('T')[0]}</td>
                                                <td className="p-2 font-mono font-bold text-sky-600 select-all">{item.official_invoice_no}</td>
                                                <td className="p-2 text-center font-mono text-slate-600 text-[10px]">{String(item.tgl_tukar || '-').split('T')[0]}</td>
                                                <td className="p-2 text-center font-mono text-slate-600 text-[10px]">{String(item.tgl_jt || '-').split('T')[0]}</td>
                                                <td className="p-2 text-right font-mono font-bold text-slate-900">
                                                    {item.sisa.toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-2 text-right font-mono text-emerald-600 font-semibold">
                                                    {item.b0_30 > 0 ? item.b0_30.toLocaleString('id-ID') : '-'}
                                                </td>
                                                <td className="p-2 text-right font-mono text-sky-600 font-semibold">
                                                    {item.b31_60 > 0 ? item.b31_60.toLocaleString('id-ID') : '-'}
                                                </td>
                                                <td className="p-2 text-right font-mono text-amber-600 font-semibold">
                                                    {item.b61_90 > 0 ? item.b61_90.toLocaleString('id-ID') : '-'}
                                                </td>
                                                <td className="p-2 text-right font-mono text-rose-600 font-bold">
                                                    {(item.b91_180 + item.b181_360 + item.bover_360) > 0
                                                        ? (item.b91_180 + item.b181_360 + item.bover_360).toLocaleString('id-ID')
                                                        : '-'}
                                                </td>
                                                <td className="p-2 text-center font-mono font-black text-slate-800">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] ${item.umur_hari > 90 ? 'bg-rose-100 text-rose-800' :
                                                            item.umur_hari > 60 ? 'bg-amber-100 text-amber-800' :
                                                                item.umur_hari > 30 ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                                                        }`}>
                                                        {item.umur_hari} Hari
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}

                                        {/* SUB TOTAL GROUP (PERSIS GAMBAR 2) */}
                                        <tr className="bg-slate-200/60 font-bold text-[10.5px] border-b-2 border-slate-300">
                                            <td colSpan={6} className="p-2 text-right text-slate-700 tracking-wider">
                                                SUB TOTAL ({group.cust_name}) :
                                            </td>
                                            <td className="p-2 text-right font-mono font-black text-slate-900">
                                                Rp {group.subtotal_sisa.toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-2 text-right font-mono text-emerald-700">
                                                {group.subtotal_b0_30 > 0 ? group.subtotal_b0_30.toLocaleString('id-ID') : '0'}
                                            </td>
                                            <td className="p-2 text-right font-mono text-sky-700">
                                                {group.subtotal_b31_60 > 0 ? group.subtotal_b31_60.toLocaleString('id-ID') : '0'}
                                            </td>
                                            <td className="p-2 text-right font-mono text-amber-700">
                                                {group.subtotal_b61_90 > 0 ? group.subtotal_b61_90.toLocaleString('id-ID') : '0'}
                                            </td>
                                            <td className="p-2 text-right font-mono text-rose-700">
                                                {(group.subtotal_b91_180 + group.subtotal_b181_360 + group.subtotal_bover_360) > 0
                                                    ? (group.subtotal_b91_180 + group.subtotal_b181_360 + group.subtotal_bover_360).toLocaleString('id-ID')
                                                    : '0'}
                                            </td>
                                            <td className="p-2 text-center text-slate-400 font-mono">-</td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })}

                            {groupedData.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={12} className="p-8 text-center text-slate-400 font-bold italic">
                                        Tidak ada data piutang untuk filter yang dipilih. Silakan klik tombol PROSES.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AgingPiutang;