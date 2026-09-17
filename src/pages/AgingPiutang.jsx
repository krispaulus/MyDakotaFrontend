import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, Printer, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';
import dakotaLogo from '../assets/new_logo 2.png';

const AgingPiutang = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [cabangList, setCabangList] = useState([]);
    const [custList, setCustList] = useState([]);
    const [agingData, setAgingData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilter, setShowFilter] = useState(false);

    function getActiveAgen() {
        const activeAgenId = localStorage.getItem('active_agen_id') || localStorage.getItem('agen_id') || '';
        const activeCabangId = localStorage.getItem('active_cabang_id') || localStorage.getItem('cabang_id') || '';
        const sessionCabangNama = localStorage.getItem('active_cabang_nama')
            || localStorage.getItem('cabang_nama')
            || localStorage.getItem('active_agen_nama')
            || '';

        if (sessionCabangNama) {
            return {
                id: activeCabangId || activeAgenId || '',
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
                id: String(found.agen_id || found.AgenID),
                nama: String(found.agen_nama || found.AgenNama).toUpperCase()
            };
        }

        if (activeAgenId && activeAgenId.toUpperCase().includes('PUSAT')) {
            return { id: '001', nama: 'PUSAT DAKOTA' };
        }

        return {
            id: activeCabangId || activeAgenId || '',
            nama: activeAgenId ? `AGEN ${activeAgenId.toUpperCase()}` : ''
        };
    }

    const currentActiveAgen = getActiveAgen();
    const isHoldingUser =
        String(currentActiveAgen.nama || '').toUpperCase().includes('PUSAT') ||
        String(currentActiveAgen.nama || '').toUpperCase().includes('HOLDING') ||
        String(currentActiveAgen.id || '') === '001' ||
        String(localStorage.getItem('active_agen_id') || '').toUpperCase().includes('PUSAT') ||
        (!currentActiveAgen.id && !currentActiveAgen.nama);

    // Filter States
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [bypassTanggal, setBypassTanggal] = useState(false);
    const [selectedCabang, setSelectedCabang] = useState(isHoldingUser ? '' : currentActiveAgen.id);
    const [selectedCust, setSelectedCust] = useState('');

    const [summary, setSummary] = useState({
        total_current: 0,
        total_31_60: 0,
        total_61_90: 0,
        total_over_90: 0,
        grand_total: 0
    });

    useEffect(() => {
        if (!isHoldingUser && currentActiveAgen.id) {
            setSelectedCabang(currentActiveAgen.id);
        }
    }, [isHoldingUser, currentActiveAgen.id, cabangList]);

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
            setAgingData(res.data?.data || []);
            setSummary(res.data?.summary || {});
        } catch (err) {
            console.error('Gagal mengambil data aging piutang:', err);
            Swal.fire({ title: 'Error', text: 'Gagal mengambil data aging piutang.', icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOptions();
        fetchAgingData();
    }, []);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        fetchAgingData();
    };

    const handleResetFilter = () => {
        setStartDate(firstDay);
        setEndDate(today);
        setBypassTanggal(false);
        setSelectedCabang(isHoldingUser ? '' : currentActiveAgen.id);
        setSelectedCust('');
        fetchAgingData();
    };

    // 🖨️ CETAK RESMI AGING PIUTANG (POP-UP A4 LANDSCAPE DI TENGAH MONITOR)
    const handlePrintAging = async () => {
        if (!agingData || agingData.length === 0) {
            Swal.fire({
                title: 'DATA KOSONG',
                text: 'Tidak ada data aging piutang yang dapat dicetak.',
                icon: 'warning',
                confirmButtonColor: '#2563eb'
            });
            return;
        }

        // Convert logo ke Base64
        let base64Logo = '';
        try {
            const logoImg = new Image();
            logoImg.src = dakotaLogo;
            await new Promise((resolve) => {
                if (logoImg.complete) {
                    resolve();
                } else {
                    logoImg.onload = () => resolve();
                    logoImg.onerror = () => resolve();
                }
            });

            if (logoImg.naturalWidth > 0) {
                const canvas = document.createElement('canvas');
                canvas.width = logoImg.naturalWidth;
                canvas.height = logoImg.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(logoImg, 0, 0);
                base64Logo = canvas.toDataURL('image/png');
            }
        } catch {
            base64Logo = dakotaLogo;
        }

        // 📐 Posisi Tengah Layar
        const width = 1150;
        const height = 800;
        const left = Math.max(0, Math.round((window.screen.width - width) / 2));
        const top = Math.max(0, Math.round((window.screen.height - height) / 2));

        const printWindow = window.open(
            '',
            '_blank',
            `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
        );

        if (!printWindow) {
            Swal.fire('Popup Diblokir', 'Mohon izinkan popup browser untuk mencetak dokumen ini.', 'warning');
            return;
        }

        const todayFormatted = new Date().toLocaleDateString('id-ID', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });

        const activeFilterCabang = !isHoldingUser ? currentActiveAgen.id : selectedCabang;
        const foundCabang = cabangList.find(c => String(c.agen_id || c.AgenID) === String(activeFilterCabang));
        const namaCabang = activeFilterCabang ? (foundCabang?.agen_nama || foundCabang?.AgenNama || `CABANG ${activeFilterCabang}`) : 'KONSOLIDASI (SEMUA CABANG)';
        const periodeStr = bypassTanggal ? 'SEMUA PERIODE (BYPASS TANGGAL)' : `${startDate} s/d ${endDate}`;

        const rowsHtml = agingData.map((item, idx) => `
            <tr style="font-family: monospace; font-size: 10px;">
                <td style="border: 1px solid #333; padding: 5px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #333; padding: 5px; font-family: sans-serif; font-weight: bold;">${item.cust_name || '-'}</td>
                <td style="border: 1px solid #333; padding: 5px; text-transform: uppercase;">${item.cabang_nama || '-'}</td>
                <td style="border: 1px solid #333; padding: 5px; font-weight: bold; color: #0284c7;">${item.no_invoice || '-'}</td>
                <td style="border: 1px solid #333; padding: 5px; text-align: center;">${item.tgl_invoice || '-'}</td>
                <td style="border: 1px solid #333; padding: 5px; text-align: right; font-weight: bold;">${(Number(item.total_tagihan) || 0).toLocaleString('id-ID')}</td>
                <td style="border: 1px solid #333; padding: 5px; text-align: right; color: #059669; font-weight: bold;">${item.bucket_current ? Number(item.bucket_current).toLocaleString('id-ID') : '-'}</td>
                <td style="border: 1px solid #333; padding: 5px; text-align: right; color: #0284c7;">${item.bucket_31_60 ? Number(item.bucket_31_60).toLocaleString('id-ID') : '-'}</td>
                <td style="border: 1px solid #333; padding: 5px; text-align: right; color: #d97706;">${item.bucket_61_90 ? Number(item.bucket_61_90).toLocaleString('id-ID') : '-'}</td>
                <td style="border: 1px solid #333; padding: 5px; text-align: right; color: #dc2626; font-weight: bold;">${item.bucket_over_90 ? Number(item.bucket_over_90).toLocaleString('id-ID') : '-'}</td>
                <td style="border: 1px solid #333; padding: 5px; text-align: right; font-weight: 900; background-color: #f1f5f9;">${(Number(item.sisa_piutang) || 0).toLocaleString('id-ID')}</td>
            </tr>
        `).join('');

        const totalTagihanAll = agingData.reduce((acc, curr) => acc + (Number(curr.total_tagihan) || 0), 0);

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Laporan Aging Piutang - ${namaCabang}</title>
                <style>
                    @page { 
                        margin: 8mm 10mm 10mm 10mm; 
                    }
                    * { 
                        box-sizing: border-box; 
                    }
                    html, body { 
                        width: 100%;
                        margin: 0; 
                        padding: 0; 
                        font-family: Arial, Helvetica, sans-serif; 
                        font-size: 11px; 
                        color: #000; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                    }
                    th {
                        padding: 7px 5px;
                        font-size: 10.5px;
                        background-color: #cbd5e1 !important;
                    }
                    td {
                        padding: 6px 5px;
                        font-size: 10px;
                    }
                    .header-kop {
                        border-bottom: 2px solid #000;
                        padding-bottom: 6px;
                        margin-bottom: 10px;
                    }
                    .kpi-container {
                        display: flex;
                        gap: 8px;
                        margin-bottom: 12px;
                    }
                    .kpi-box {
                        flex: 1;
                        border: 1px solid #94a3b8;
                        padding: 6px 8px;
                        border-radius: 5px;
                    }
                </style>
            </head>
            <body>
                <div class="header-kop">
                    <table style="width: 100%; border: none;">
                        <tr>
                            <td style="width: 55%; vertical-align: middle; border: none;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    ${base64Logo ? `<img src="${base64Logo}" alt="Logo Dakota" style="height: 42px; width: auto; object-fit: contain;" />` : ''}
                                    <div>
                                        <div style="font-size: 13px; font-weight: bold; color: #000; letter-spacing: 0.5px;">PT DAKOTA LOGISTIK INDONESIA</div>
                                        <div style="font-size: 10px; color: #333; margin-top: 1px;">Jl. Wibawa Mukti II No. 99, Jatiasih, Bekasi - BEKASI KOTA</div>
                                        <div style="font-size: 10px; color: #333;">Telp: (021) 8603278 / (021) 86608589</div>
                                    </div>
                                </div>
                            </td>
                            <td style="width: 45%; text-align: right; vertical-align: middle; border: none;">
                                <div style="font-size: 14px; font-weight: 900; text-decoration: underline; letter-spacing: 0.5px;">LAPORAN AGING PIUTANG USAHA</div>
                                <div style="font-size: 11px; margin-top: 2px; font-weight: bold; color: #111;">${namaCabang}</div>
                                <div style="font-size: 10px; color: #222; margin-top: 2px;">PERIODE: ${periodeStr}</div>
                                <div style="font-size: 9px; color: #555; margin-top: 1px;">Tanggal Cetak: ${todayFormatted}</div>
                            </td>
                        </tr>
                    </table>
                </div>

                <div class="kpi-container">
                    <div class="kpi-box" style="background-color: #ecfdf5; border-color: #a7f3d0;">
                        <div style="font-size: 9px; font-weight: bold; color: #047857;">0 – 30 HARI (CURRENT)</div>
                        <div style="font-size: 12px; font-weight: 900; font-family: monospace; color: #065f46; margin-top: 2px;">Rp ${(Number(summary.total_current) || 0).toLocaleString('id-ID')}</div>
                    </div>
                    <div class="kpi-box" style="background-color: #f0f9ff; border-color: #bae6fd;">
                        <div style="font-size: 9px; font-weight: bold; color: #0369a1;">31 – 60 HARI</div>
                        <div style="font-size: 12px; font-weight: 900; font-family: monospace; color: #075985; margin-top: 2px;">Rp ${(Number(summary.total_31_60) || 0).toLocaleString('id-ID')}</div>
                    </div>
                    <div class="kpi-box" style="background-color: #fffbeb; border-color: #fde68a;">
                        <div style="font-size: 9px; font-weight: bold; color: #b45309;">61 – 90 HARI</div>
                        <div style="font-size: 12px; font-weight: 900; font-family: monospace; color: #92400e; margin-top: 2px;">Rp ${(Number(summary.total_61_90) || 0).toLocaleString('id-ID')}</div>
                    </div>
                    <div class="kpi-box" style="background-color: #fef2f2; border-color: #fecaca;">
                        <div style="font-size: 9px; font-weight: bold; color: #b91c1c;">> 90 HARI (OVERDUE)</div>
                        <div style="font-size: 12px; font-weight: 900; font-family: monospace; color: #991b1b; margin-top: 2px;">Rp ${(Number(summary.total_over_90) || 0).toLocaleString('id-ID')}</div>
                    </div>
                    <div class="kpi-box" style="background-color: #0369a1; border-color: #0284c7; color: #fff;">
                        <div style="font-size: 9px; font-weight: bold; color: #e0f2fe;">TOTAL OUTSTANDING</div>
                        <div style="font-size: 12px; font-weight: 900; font-family: monospace; color: #ffffff; margin-top: 2px;">Rp ${(Number(summary.grand_total) || 0).toLocaleString('id-ID')}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr style="background-color: #cbd5e1; font-weight: bold; font-size: 10px; text-align: center;">
                            <th style="border: 1px solid #475569; padding: 6px 4px; width: 3%;">NO</th>
                            <th style="border: 1px solid #475569; padding: 6px 5px; width: 19%;">NAMA CUSTOMER</th>
                            <th style="border: 1px solid #475569; padding: 6px 4px; width: 10%;">CABANG</th>
                            <th style="border: 1px solid #475569; padding: 6px 5px; width: 11%;">NO. INVOICE</th>
                            <th style="border: 1px solid #475569; padding: 6px 4px; width: 8%;">TGL. INV</th>
                            <th style="border: 1px solid #475569; padding: 6px 5px; width: 11%; text-align: right;">TAGIHAN (RP)</th>
                            <th style="border: 1px solid #475569; padding: 6px 5px; width: 9%; text-align: right;">0–30 HARI</th>
                            <th style="border: 1px solid #475569; padding: 6px 5px; width: 9%; text-align: right;">31–60 HARI</th>
                            <th style="border: 1px solid #475569; padding: 6px 5px; width: 9%; text-align: right;">61–90 HARI</th>
                            <th style="border: 1px solid #475569; padding: 6px 5px; width: 9%; text-align: right;">>90 HARI</th>
                            <th style="border: 1px solid #475569; padding: 6px 6px; width: 11%; text-align: right;">SISA PIUTANG</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #f1f5f9; font-weight: bold; font-size: 10px; font-family: monospace;">
                            <td colspan="5" style="border: 1px solid #475569; padding: 6px; text-align: center;">TOTAL AGING PIUTANG :</td>
                            <td style="border: 1px solid #475569; padding: 6px; text-align: right;">Rp ${totalTagihanAll.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid #475569; padding: 6px; text-align: right; color: #047857;">Rp ${(Number(summary.total_current) || 0).toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid #475569; padding: 6px; text-align: right; color: #0369a1;">Rp ${(Number(summary.total_31_60) || 0).toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid #475569; padding: 6px; text-align: right; color: #b45309;">Rp ${(Number(summary.total_61_90) || 0).toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid #475569; padding: 6px; text-align: right; color: #b91c1c;">Rp ${(Number(summary.total_over_90) || 0).toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid #475569; padding: 6px; text-align: right; font-weight: 900; background-color: #e2e8f0;">Rp ${(Number(summary.grand_total) || 0).toLocaleString('id-ID')}</td>
                        </tr>
                    </tfoot>
                </table>

                <div style="margin-top: 25px; page-break-inside: avoid;">
                    <table style="width: 100%; border: none; font-size: 11px;">
                        <tr style="text-align: center; border: none;">
                            <td style="width: 33%; border: none;">
                                <div>Dibuat Oleh,</div>
                                <div style="height: 44px;"></div>
                                <div style="font-weight: bold; text-decoration: underline;">( Staff Piutang / AR )</div>
                            </td>
                            <td style="width: 33%; border: none;">
                                <div>Diperiksa Oleh,</div>
                                <div style="height: 44px;"></div>
                                <div style="font-weight: bold; text-decoration: underline;">( Supervisor Piutang )</div>
                            </td>
                            <td style="width: 33%; border: none;">
                                <div>Disetujui Oleh,</div>
                                <div style="height: 44px;"></div>
                                <div style="font-weight: bold; text-decoration: underline;">( Manager Keuangan )</div>
                            </td>
                        </tr>
                    </table>
                </div>

                <script>
                    window.onload = () => {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const columns = [
        {
            header: 'CUSTOMER',
            accessor: 'cust_name',
            render: (item) => <span className="font-bold text-slate-800">{item.cust_name}</span>
        },
        {
            header: 'CABANG',
            accessor: 'cabang_nama',
            render: (item) => <span className="font-semibold uppercase text-slate-600">{item.cabang_nama}</span>
        },
        {
            header: 'NO. INVOICE',
            accessor: 'no_invoice',
            render: (item) => <span className="font-mono font-bold text-sky-600">{item.no_invoice}</span>
        },
        {
            header: 'TGL. INVOICE',
            accessor: 'tgl_invoice',
            render: (item) => <span className="font-mono text-slate-600">{item.tgl_invoice}</span>
        },
        {
            header: 'TOTAL TAGIHAN (RP)',
            accessor: 'total_tagihan',
            render: (item) => <span className="font-mono font-bold text-slate-800">Rp {Number(item.total_tagihan || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: '0 – 30 HARI',
            accessor: 'bucket_current',
            render: (item) => <span className="font-mono text-emerald-600 font-semibold">{item.bucket_current ? `Rp ${Number(item.bucket_current).toLocaleString('id-ID')}` : '-'}</span>
        },
        {
            header: '31 – 60 HARI',
            accessor: 'bucket_31_60',
            render: (item) => <span className="font-mono text-sky-600 font-semibold">{item.bucket_31_60 ? `Rp ${Number(item.bucket_31_60).toLocaleString('id-ID')}` : '-'}</span>
        },
        {
            header: '61 – 90 HARI',
            accessor: 'bucket_61_90',
            render: (item) => <span className="font-mono text-amber-600 font-semibold">{item.bucket_61_90 ? `Rp ${Number(item.bucket_61_90).toLocaleString('id-ID')}` : '-'}</span>
        },
        {
            header: '> 90 HARI',
            accessor: 'bucket_over_90',
            render: (item) => <span className="font-mono font-bold text-rose-600">{item.bucket_over_90 ? `Rp ${Number(item.bucket_over_90).toLocaleString('id-ID')}` : '-'}</span>
        },
        {
            header: 'SISA PIUTANG (RP)',
            accessor: 'sisa_piutang',
            render: (item) => <span className="font-mono font-black text-slate-900">Rp {Number(item.sisa_piutang || 0).toLocaleString('id-ID')}</span>
        }
    ];

    return (
        <div className="space-y-5">
            {/* Panel Filter */}
            {showFilter && (
                <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                        <Filter size={16} className="text-sky-600" />
                        FILTER LAPORAN AGING PIUTANG
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Tanggal */}
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <label className="font-bold text-slate-500 block mb-1">TGL AWAL</label>
                                <input
                                    type="date"
                                    disabled={bypassTanggal}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'
                                        }`}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="font-bold text-slate-500 block mb-1">TGL AKHIR</label>
                                <input
                                    type="date"
                                    disabled={bypassTanggal}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'
                                        }`}
                                />
                            </div>
                        </div>

                        {/* Cabang Filter */}
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CABANG</label>
                            <select
                                value={!isHoldingUser && currentActiveAgen.id ? currentActiveAgen.id : selectedCabang}
                                disabled={!isHoldingUser}
                                onChange={(e) => setSelectedCabang(e.target.value)}
                                className={`w-full p-2 border rounded-lg font-bold outline-none ${!isHoldingUser
                                    ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                                    : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500 cursor-pointer'
                                    }`}
                                title={!isHoldingUser ? 'Filter cabang terkunci sesuai lokasi login Anda' : 'Pilih cabang untuk monitoring'}
                            >
                                {isHoldingUser && (
                                    <option value="">-- SEMUA CABANG --</option>
                                )}

                                {!isHoldingUser ? (
                                    <option value={currentActiveAgen.id}>
                                        {currentActiveAgen.nama || 'CABANG AKTIF'}
                                    </option>
                                ) : (
                                    cabangList.map((c, i) => (
                                        <option key={i} value={c.agen_id || c.AgenID}>
                                            {c.agen_nama || c.AgenNama}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        {/* Customer Filter */}
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CUSTOMER</label>
                            <select
                                value={selectedCust}
                                onChange={(e) => setSelectedCust(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer"
                            >
                                <option value="">-- SEMUA CUSTOMER --</option>
                                {custList.map((cust, i) => (
                                    <option key={i} value={cust.cust_id}>
                                        {cust.cust_name} [{cust.cust_id}]
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Bypass Checkbox */}
                        <div className="flex items-center">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 mt-5">
                                <input
                                    type="checkbox"
                                    checked={bypassTanggal}
                                    onChange={(e) => setBypassTanggal(e.target.checked)}
                                    className="w-4 h-4 text-sky-600 rounded cursor-pointer"
                                />
                                Bypass Filter Tanggal
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handlePrintAging}
                            className="px-5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl transition flex items-center gap-1.5 uppercase cursor-pointer"
                        >
                            <Printer size={14} /> Cetak Laporan
                        </button>
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
                </form>
            )}

            {/* Aging Summary KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs font-sans">
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-xs">
                    <span className="text-emerald-700 font-bold block mb-1">0 – 30 HARI (CURRENT)</span>
                    <span className="text-base font-black font-mono text-emerald-800">Rp {Number(summary.total_current || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl shadow-xs">
                    <span className="text-sky-700 font-bold block mb-1">31 – 60 HARI</span>
                    <span className="text-base font-black font-mono text-sky-800">Rp {Number(summary.total_31_60 || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-xs">
                    <span className="text-amber-700 font-bold block mb-1">61 – 90 HARI</span>
                    <span className="text-base font-black font-mono text-amber-800">Rp {Number(summary.total_61_90 || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl shadow-xs">
                    <span className="text-rose-700 font-bold block mb-1">&gt; 90 HARI (OVERDUE)</span>
                    <span className="text-base font-black font-mono text-rose-800">Rp {Number(summary.total_over_90 || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-sky-700 border border-sky-800 text-white p-4 rounded-xl shadow-md">
                    <span className="text-sky-100 font-bold block mb-1">TOTAL OUTSTANDING</span>
                    <span className="text-base font-black font-mono text-white">Rp {Number(summary.grand_total || 0).toLocaleString('id-ID')}</span>
                </div>
            </div>

            {/* Tabel Detail Aging */}
            <div>
                <DataTableTemplate
                    title="RINCIAN AGING PIUTANG PER CUSTOMER"
                    columns={columns}
                    data={agingData}
                    loading={loading}
                    isDarkMode={isDarkMode}
                    isAddDisabled={true}
                    hideAddButton={true}
                    hideActions={true}
                    hideActionColumn={true}
                    onFilter={() => setShowFilter(prev => !prev)}
                />
            </div>
        </div>
    );
};

export default AgingPiutang;