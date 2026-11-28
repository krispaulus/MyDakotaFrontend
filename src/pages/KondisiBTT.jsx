import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, CheckCircle2, XCircle, RefreshCw, Printer, FileSpreadsheet } from 'lucide-react';
import Swal from 'sweetalert2';
import dakotaLogo from '../assets/new_logo 2.png';

const KondisiBTT = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [showFilter, setShowFilter] = useState(true);
    const [cabangList, setCabangList] = useState([]);
    const [picList, setPicList] = useState([]);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // =========================================================================
    // HELPER: DETEKSI CABANG & STATUS HOLDING / PUSAT SECARA DINAMIS
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

    // 1. Filter Cabang Berwenang + Suggest Dropdown
    const [cabangBerwenang, setCabangBerwenang] = useState('');
    const [showCabangBerwenangDropdown, setShowCabangBerwenangDropdown] = useState(false);

    // 2. Filter Customer + Suggest Dropdown
    const [searchCustomer, setSearchCustomer] = useState('');
    const [customerSuggestions, setCustomerSuggestions] = useState([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [searchingCustomer, setSearchingCustomer] = useState(false);

    const [bttKembali, setBttKembali] = useState('');
    const [selectedPIC, setSelectedPIC] = useState('');
    const [sudahInvoice, setSudahInvoice] = useState('');
    const [statusBayar, setStatusBayar] = useState('');
    const [metodeBayar, setMetodeBayar] = useState('');
    const [tglPelunasan, setTglPelunasan] = useState('');
    const [jenisNaikTurun, setJenisNaikTurun] = useState('S'); // S = Semua, N = Naik, T = Turun
    const [showBTT, setShowBTT] = useState(true);
    const [showOrderJemput, setShowOrderJemput] = useState(true);

    useEffect(() => {
        if (!isHoldingUser && currentActiveAgen.id) {
            setSelectedCabang(currentActiveAgen.id);
        }
    }, [isHoldingUser, currentActiveAgen.id, cabangList]);

    // Tutup dropdown suggest saat klik di luar
    useEffect(() => {
        const closeAllDropdowns = () => {
            setShowCabangBerwenangDropdown(false);
            setShowCustomerDropdown(false);
        };
        window.addEventListener('click', closeAllDropdowns);
        return () => window.removeEventListener('click', closeAllDropdowns);
    }, []);

    // Live Search Autocomplete Customer
    useEffect(() => {
        const query = searchCustomer.trim();
        if (query.length < 2) {
            setCustomerSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            setSearchingCustomer(true);
            try {
                const token = localStorage.getItem('token');
                const cleanKeyword = query.replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
                const res = await api.get(`/customer?search=${encodeURIComponent(cleanKeyword)}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCustomerSuggestions((res.data?.data || []).slice(0, 20));
            } catch (err) {
                console.warn('Gagal load suggest customer:', err);
            } finally {
                setSearchingCustomer(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [searchCustomer]);

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const [resCabang, resPIC] = await Promise.all([
                api.get('/gl/agen-ca?stt=', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/piutang/kondisi-btt/options', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setCabangList(resCabang.data?.data || []);
            setPicList(resPIC.data?.pic_list || []);
        } catch (err) {
            console.error('Gagal load opsi filter:', err);
        }
    };

    const fetchData = async (override = null) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const fStart = override ? override.startDate : startDate;
            const fEnd = override ? override.endDate : endDate;
            const fBypass = override ? override.bypassTanggal : bypassTanggal;
            const fCabang = override ? override.selectedCabang : (!isHoldingUser ? currentActiveAgen.id : selectedCabang);
            const fCabBerwenang = override ? override.cabangBerwenang : cabangBerwenang;
            const fKembali = override ? override.bttKembali : bttKembali;
            const fPic = override ? override.selectedPIC : selectedPIC;
            const fCust = override ? override.searchCustomer : searchCustomer;
            const fInv = override ? override.sudahInvoice : sudahInvoice;
            const fBayar = override ? override.statusBayar : statusBayar;
            const fMetode = override ? override.metodeBayar : metodeBayar;
            const fLunas = override ? override.tglPelunasan : tglPelunasan;
            const fJenis = override ? override.jenisNaikTurun : jenisNaikTurun;
            const fShowBtt = override ? override.showBTT : showBTT;
            const fShowOj = override ? override.showOrderJemput : showOrderJemput;

            let url = `/piutang/kondisi-btt?pt_id=${ptId}&bypass_tanggal=${fBypass}&show_btt=${fShowBtt}&show_oj=${fShowOj}&jenis=${fJenis}`;

            if (!fBypass && fStart && fEnd) {
                url += `&start_date=${fStart}&end_date=${fEnd}`;
            }
            if (fCabang) url += `&cabang_asal=${encodeURIComponent(fCabang)}`;
            if (fCabBerwenang) url += `&cabang_berwenang=${encodeURIComponent(fCabBerwenang)}`;
            if (fKembali) url += `&btt_kembali=${encodeURIComponent(fKembali)}`;
            if (fPic) url += `&pic=${encodeURIComponent(fPic)}`;
            if (fCust) url += `&customer=${encodeURIComponent(fCust)}`;
            if (fInv) url += `&sudah_invoice=${encodeURIComponent(fInv)}`;
            if (fBayar) url += `&bayar=${encodeURIComponent(fBayar)}`;
            if (fMetode) url += `&pembayaran=${encodeURIComponent(fMetode)}`;
            if (fLunas) url += `&tgl_pelunasan=${encodeURIComponent(fLunas)}`;

            const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setData(res.data?.data || []);
        } catch (err) {
            console.error('Gagal load data kondisi BTT:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOptions();
        fetchData();
    }, []);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        fetchData();
    };

    const handleResetFilter = () => {
        const defaultCabang = isHoldingUser ? '' : currentActiveAgen.id;
        setStartDate(firstDay);
        setEndDate(today);
        setBypassTanggal(false);
        setSelectedCabang(defaultCabang);
        setCabangBerwenang('');
        setBttKembali('');
        setSelectedPIC('');
        setSearchCustomer('');
        setCustomerSuggestions([]);
        setSudahInvoice('');
        setStatusBayar('');
        setMetodeBayar('');
        setTglPelunasan('');
        setJenisNaikTurun('S');
        setShowBTT(true);
        setShowOrderJemput(true);

        fetchData({
            startDate: firstDay,
            endDate: today,
            bypassTanggal: false,
            selectedCabang: defaultCabang,
            cabangBerwenang: '',
            bttKembali: '',
            selectedPIC: '',
            searchCustomer: '',
            sudahInvoice: '',
            statusBayar: '',
            metodeBayar: '',
            tglPelunasan: '',
            jenisNaikTurun: 'S',
            showBTT: true,
            showOrderJemput: true
        });
    };

    const formatTanggalSlash = (dateVal) => {
        if (!dateVal) return '';
        const str = String(dateVal).split('T')[0];
        if (!str || str === '0001-01-01') return '';
        const parts = str.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return str;
    };

    // ✅ EXPORT EXCEL IDENTIK DENGAN FORMAT 30 KOLOM WEB LAWAS (kondisi BTT WEB LAMA.xlsx)
    const getDakotaLogoBase64 = () => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                try {
                    const natW = img.naturalWidth || 160;
                    const natH = img.naturalHeight || 115;
                    const targetH = 36;
                    const targetW = Math.round((natW / natH) * targetH);
                    const canvas = document.createElement('canvas');
                    canvas.width = natW;
                    canvas.height = natH;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const dataUrl = canvas.toDataURL('image/png');
                    resolve({ b64: dataUrl.split(',')[1] || '', width: targetW, height: targetH });
                } catch {
                    resolve({ b64: '', width: 64, height: 46 });
                }
            };
            img.onerror = () => resolve({ b64: '', width: 64, height: 46 });
            img.src = dakotaLogo;
        });
    };

    // ✅ EXPORT EXCEL MODERN + LOGO + KOP PERUSAHAAN + 30 KOLOM LENGKAP
    const handleExportExcel = async () => {
        if (!data || data.length === 0) {
            Swal.fire({
                title: 'DATA KOSONG',
                text: 'Tidak ada data Kondisi BTT & Order Jemput yang dapat di-export ke Excel.',
                icon: 'warning',
                confirmButtonColor: '#059669'
            });
            return;
        }

        const logoInfo = await getDakotaLogoBase64();
        const activeFilterCabang = !isHoldingUser ? currentActiveAgen.id : selectedCabang;
        const foundCabang = cabangList.find(c => String(c.agen_id || c.AgenID) === String(activeFilterCabang));
        const namaCabangHeader = activeFilterCabang
            ? (foundCabang?.agen_nama || foundCabang?.AgenNama || `CABANG ${activeFilterCabang}`)
            : 'KONSOLIDASI (SEMUA CABANG)';
        const periodeHeader = bypassTanggal
            ? 'SEMUA PERIODE (BYPASS TANGGAL)'
            : `${formatTanggalSlash(startDate)} - ${formatTanggalSlash(endDate)}`;

        let totalPackingAll = 0;
        let totalBiayaKirimAll = 0;
        let totalTerbayarAll = 0;
        let totalKoliAll = 0;
        let totalBeratAll = 0;
        let lastGroupType = '';

        const rowsHtml = data.map((item, idx) => {
            const groupType = item.tipe_dokumen || 'BTT NAIK';
            let groupBanner = '';
            if (groupType !== lastGroupType) {
                lastGroupType = groupType;
                groupBanner = `
                    <tr>
                        <td colspan="30" style="background-color:#e0f2fe; color:#004b84; font-weight:bold; font-size:10pt; padding:6px 8px; border:1px solid #94a3b8; text-align:left;">
                            ▸ ${groupType}
                        </td>
                    </tr>
                `;
            }

            const byPacking = Number(item.by_packing || 0);
            const byKirim = Number(item.by_kirim ?? item.total_biaya ?? 0);
            const terbayar = Number(item.terbayar_nominal || 0);
            const koli = Number(item.koli || 0);
            const berat = Number(item.berat || 0);

            totalPackingAll += byPacking;
            totalBiayaKirimAll += byKirim;
            totalTerbayarAll += terbayar;
            totalKoliAll += koli;
            totalBeratAll += berat;

            const tglDok = formatTanggalSlash(item.tgl_dokumen);
            const tglKw = formatTanggalSlash(item.tgl_kwitansi);
            const tglTT = formatTanggalSlash(item.tgl_tt);
            const tglBayar = formatTanggalSlash(item.tgl_bayar);
            const tglKembali = formatTanggalSlash(item.tgl_btt_kembali);
            const umurBTT = item.btt_kembali_yn === 'Y' ? '' : (item.umur_btt ?? '');
            const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';

            return `
                ${groupBanner}
                <tr style="background-color:${rowBg};">
                    <td style="text-align:center; font-weight:bold; color:#334155;">${groupType}</td>
                    <td style="text-align:center; mso-number-format:'\\@';">${tglDok}</td>
                    <td style="mso-number-format:'\\@'; font-weight:bold; color:#0284c7;">${item.no_dokumen || ''}</td>
                    <td>${item.agen_asal_nama || ''}</td>
                    <td style="text-align:center; mso-number-format:'\\@';">${item.cust_id || ''}</td>
                    <td style="font-weight:bold;">${item.cust_name || ''}</td>
                    <td style="text-align:center;">${item.layanan || ''}</td>
                    <td style="text-align:center; font-weight:bold;">${item.metode_bayar || ''}</td>
                    <td style="mso-number-format:'\\@';">${item.packing_id || ''}</td>
                    <td style="text-align:right; mso-number-format:'#,##0';">${byPacking}</td>
                    <td style="mso-number-format:'\\@';">${item.no_kwitansi || ''}</td>
                    <td style="text-align:center; mso-number-format:'\\@';">${tglKw}</td>
                    <td style="mso-number-format:'\\@';">${item.no_tt || ''}</td>
                    <td style="text-align:center; mso-number-format:'\\@';">${tglTT}</td>
                    <td style="mso-number-format:'\\@';">${item.no_pembayaran || ''}</td>
                    <td style="text-align:center; mso-number-format:'\\@';">${tglBayar}</td>
                    <td style="text-align:right; mso-number-format:'#,##0'; font-weight:bold;">${byKirim}</td>
                    <td style="text-align:right; mso-number-format:'#,##0';">${Number(item.uang_muka || 0) || ''}</td>
                    <td style="text-align:right; mso-number-format:'#,##0'; color:#059669; font-weight:bold;">${terbayar}</td>
                    <td style="text-align:right; mso-number-format:'#,##0';">${Number(item.dikembalikan || 0) || ''}</td>
                    <td style="text-align:right; mso-number-format:'#,##0';">${koli}</td>
                    <td style="text-align:right; mso-number-format:'#,##0.##';">${berat}</td>
                    <td>${item.kota_tujuan || ''}</td>
                    <td>${item.penerima || ''}</td>
                    <td style="text-align:center; mso-number-format:'\\@';">${tglKembali}</td>
                    <td style="mso-number-format:'\\@';">${item.no_spb || ''}</td>
                    <td style="text-align:center;">${umurBTT}</td>
                    <td style="mso-number-format:'\\@';">${item.btt_dbs || ''}</td>
                    <td style="mso-number-format:'\\@';">${item.pic || ''}</td>
                    <td style="font-weight:bold;">${item.cabang_berwenang || ''}</td>
                </tr>
            `;
        }).join('');

        const logoCellHtml = logoInfo.b64
            ? `<td colspan="3" rowspan="4" style="text-align:center; vertical-align:middle; padding:4px 8px;">
                <img src="http://dakota.local/logo.png" width="${logoInfo.width}" height="${logoInfo.height}" />
            </td>`
            : '';
        const kopColSpan = logoInfo.b64 ? 13 : 16;

        const htmlBody = `
            <!DOCTYPE html>
            <html xmlns:o="urn:schemas-microsoft-com:office:office"
                  xmlns:x="urn:schemas-microsoft-com:office:excel">
            <head>
                <meta charset="UTF-8" />
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9.5pt; color: #0f172a; }
                    table { border-collapse: collapse; }
                    th.tbl-hdr {
                        background-color: #004b84;
                        color: #ffffff;
                        font-weight: bold;
                        border: 1px solid #00355e;
                        padding: 7px 6px;
                        text-align: center;
                        font-size: 9pt;
                    }
                    #tblKondisi td {
                        border: 1px solid #cbd5e1;
                        padding: 5px 6px;
                        font-size: 9pt;
                        vertical-align: middle;
                    }
                </style>
            </head>
            <body>
                <table>
                    <tr>
                        ${logoCellHtml}
                        <td colspan="${kopColSpan}" style="font-size:13pt; font-weight:bold; color:#004b84; padding-top:4px;">
                            PT DAKOTA LOGISTIK INDONESIA
                        </td>
                        <td colspan="14" rowspan="4" style="text-align:right; vertical-align:middle; padding-right:8px;">
                            <span style="font-size:15pt; font-weight:bold; color:#004b84;">KONDISI BTT &amp; ORDER JEMPUT</span><br/>
                            <span style="font-size:9.5pt; font-weight:bold; color:#334155;">CABANG: ${namaCabangHeader}</span><br/>
                            <span style="font-size:9.5pt; color:#475569;">PERIODE: ${periodeHeader}</span>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="${kopColSpan}" style="font-size:9pt; color:#475569;">
                            Jl. Wibawa Mukti II No. 8 Jatiasih, Bekasi - Jawa Barat
                        </td>
                    </tr>
                    <tr>
                        <td colspan="${kopColSpan}" style="font-size:9pt; color:#475569;">
                            BEKASI KOTA
                        </td>
                    </tr>
                    <tr>
                        <td colspan="${kopColSpan}" style="font-size:9pt; color:#475569; padding-bottom:6px;">
                            Telp: (021) 8603278 / (021) 86608589
                        </td>
                    </tr>
                    <tr><td colspan="30" style="height:6px; border-top:2px solid #004b84;"></td></tr>
                </table>

                <table id="tblKondisi">
                <colgroup>
                     <col style="width:85px;" />
                     <col style="width:85px;" />
                     <col style="width:145px;" />
                     <col style="width:120px;" />
                     <col style="width:95px;" />
                     <col style="width:230px;" />
                 </colgroup>
                    <thead>
                        <tr>
                            <th class="tbl-hdr">Jenis</th>
                            <th class="tbl-hdr">Tanggal</th>
                            <th class="tbl-hdr">No Transaksi</th>
                            <th class="tbl-hdr">Cabang Asal</th>
                            <th class="tbl-hdr">Kode Pelanggan</th>
                            <th class="tbl-hdr">Nama Pelanggan</th>
                            <th class="tbl-hdr">Layanan</th>
                            <th class="tbl-hdr">Bayar</th>
                            <th class="tbl-hdr">Packing</th>
                            <th class="tbl-hdr">By Packing</th>
                            <th class="tbl-hdr">No Kwitansi</th>
                            <th class="tbl-hdr">Tgl Kwitansi</th>
                            <th class="tbl-hdr">No TT</th>
                            <th class="tbl-hdr">Tgl TT</th>
                            <th class="tbl-hdr">No Pembayaran</th>
                            <th class="tbl-hdr">Tgl Bayar</th>
                            <th class="tbl-hdr">By Kirim</th>
                            <th class="tbl-hdr">Uang Muka</th>
                            <th class="tbl-hdr">Terbayar</th>
                            <th class="tbl-hdr">Dikembalikan</th>
                            <th class="tbl-hdr">Koli</th>
                            <th class="tbl-hdr">Berat</th>
                            <th class="tbl-hdr">Tujuan</th>
                            <th class="tbl-hdr">Penerima</th>
                            <th class="tbl-hdr">Tgl BTT Kembali</th>
                            <th class="tbl-hdr">No. SPB</th>
                            <th class="tbl-hdr">Umur BTT</th>
                            <th class="tbl-hdr">BTT DBS</th>
                            <th class="tbl-hdr">PIC</th>
                            <th class="tbl-hdr">Cabang Berwenang</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                    <tfoot>
                        <tr style="background-color:#e2e8f0; font-weight:bold; color:#0f172a;">
                            <td colspan="9" style="text-align:right; padding:6px 8px; color:#004b84;">TOTAL (${data.length} DATA) :</td>
                            <td style="text-align:right; mso-number-format:'#,##0';">${totalPackingAll}</td>
                            <td colspan="6"></td>
                            <td style="text-align:right; mso-number-format:'#,##0'; color:#004b84;">${totalBiayaKirimAll}</td>
                            <td></td>
                            <td style="text-align:right; mso-number-format:'#,##0'; color:#059669;">${totalTerbayarAll}</td>
                            <td></td>
                            <td style="text-align:right; mso-number-format:'#,##0';">${totalKoliAll}</td>
                            <td style="text-align:right; mso-number-format:'#,##0.##';">${totalBeratAll}</td>
                            <td colspan="8"></td>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>
        `;

        const boundary = '----=_NextPart_DAKOTA_KONDISI_001';
        const b64Wrapped = logoInfo.b64 ? logoInfo.b64.replace(/(.{76})/g, '$1\r\n') : '';
        const mhtml =
            'MIME-Version: 1.0\r\n' +
            `Content-Type: multipart/related; boundary="${boundary}"\r\n\r\n` +
            `--${boundary}\r\n` +
            'Content-Type: text/html; charset="utf-8"\r\n' +
            'Content-Transfer-Encoding: 8bit\r\n\r\n' +
            htmlBody + '\r\n\r\n' +
            (b64Wrapped
                ? `--${boundary}\r\n` +
                'Content-Location: http://dakota.local/logo.png\r\n' +
                'Content-Type: image/png\r\n' +
                'Content-Transfer-Encoding: base64\r\n\r\n' +
                b64Wrapped + '\r\n\r\n'
                : '') +
            `--${boundary}--`;

        const blob = new Blob([mhtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dateStamp = today.replace(/-/g, '');
        link.href = downloadUrl;
        link.download = `Kondisi_BTT_OrderJemput_${dateStamp}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
    };

    // 🖨️ CETAK LAPORAN RESMI KONDISI BTT & ORDER JEMPUT
    const handlePrintReport = async () => {
        if (!data || data.length === 0) {
            Swal.fire({
                title: 'DATA KOSONG',
                text: 'Tidak ada data Kondisi BTT & Order Jemput yang dapat dicetak.',
                icon: 'warning',
                confirmButtonColor: '#2563eb'
            });
            return;
        }

        let base64Logo = '';
        try {
            const logoImg = new Image();
            logoImg.src = dakotaLogo;
            await new Promise((resolve) => {
                if (logoImg.complete) resolve();
                else {
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

        const printWindow = window.open('', '_blank', 'width=1150,height=800,scrollbars=yes,resizable=yes');
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

        let totalKoliAll = 0;
        let totalBeratAll = 0;
        let totalBiayaAll = 0;

        const rowsHtml = data.map((item, idx) => {
            const koli = Number(item.koli || 0);
            const berat = Number(item.berat || 0);
            const biaya = Number(item.total_biaya || 0);

            totalKoliAll += koli;
            totalBeratAll += berat;
            totalBiayaAll += biaya;

            const isKembali = item.btt_kembali_yn === 'Y';
            const isLunas = item.terbayar_yn === 'Y';
            const isFaktur = item.sudah_invoice_yn === 'Y';

            return `
                <tr style="font-family: monospace; font-size: 10px;">
                    <td style="border: 1px solid #333; padding: 5px; text-align: center;">${idx + 1}</td>
                    <td style="border: 1px solid #333; padding: 5px; font-weight: bold; color: #0284c7;">
                        ${item.no_dokumen || '-'}
                        <span style="display: block; font-size: 9px; color: #64748b; font-family: sans-serif;">${item.tipe_dokumen || ''}</span>
                    </td>
                    <td style="border: 1px solid #333; padding: 5px; text-align: center;">${String(item.tgl_dokumen || '').split('T')[0] || '-'}</td>
                    <td style="border: 1px solid #333; padding: 5px; font-family: sans-serif;">
                        <div style="font-weight: bold; color: #111;">${item.cust_name || '-'}</div>
                        <div style="font-size: 9px; color: #475569;">Tujuan: ${item.penerima || '-'} (${item.kota_tujuan || '-'})</div>
                    </td>
                    <td style="border: 1px solid #333; padding: 5px; text-align: center; text-transform: uppercase;">${item.pic || '-'}</td>
                    <td style="border: 1px solid #333; padding: 5px; text-align: center;">${koli} Koli / ${berat} Kg</td>
                    <td style="border: 1px solid #333; padding: 5px; text-align: center; font-weight: bold; font-size: 9.5px;">${item.metode_bayar || '-'}</td>
                    <td style="border: 1px solid #333; padding: 5px; text-align: center; font-weight: bold; color: ${isKembali ? '#059669' : '#d97706'};">
                        ${isKembali ? 'KEMBALI' : 'BELUM'}
                    </td>
                    <td style="border: 1px solid #333; padding: 5px; text-align: center;">
                        ${isFaktur ? `<span style="color: #059669; font-weight: bold;">${item.no_invoice || 'FAKTUR'}</span>` : '<span style="color: #94a3b8;">UNBILLED</span>'}
                    </td>
                    <td style="border: 1px solid #333; padding: 5px; text-align: center; font-weight: bold; color: ${isLunas ? '#059669' : '#e11d48'};">
                        ${isLunas ? 'LUNAS' : 'BELUM'}
                    </td>
                    <td style="border: 1px solid #333; padding: 5px; text-align: right; font-weight: bold;">
                        Rp ${biaya.toLocaleString('id-ID')}
                    </td>
                </tr>
            `;
        }).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Laporan Kondisi BTT & Order Jemput - ${namaCabang}</title>
                <style>
                    @page { margin: 8mm 10mm 10mm 10mm; }
                    * { box-sizing: border-box; }
                    html, body { 
                        width: 100%; margin: 0; padding: 0; 
                        font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; 
                        -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; 
                    }
                    table { width: 100%; border-collapse: collapse; }
                    th { padding: 7px 5px; font-size: 10px; background-color: #cbd5e1 !important; }
                    td { padding: 6px 5px; font-size: 10px; }
                    .header-kop { border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 12px; }
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
                                <div style="font-size: 14px; font-weight: 900; text-decoration: underline; letter-spacing: 0.5px;">LAPORAN KONDISI BTT & ORDER JEMPUT</div>
                                <div style="font-size: 11px; margin-top: 2px; font-weight: bold; color: #111;">${namaCabang}</div>
                                <div style="font-size: 10px; color: #222; margin-top: 2px;">PERIODE: ${periodeStr}</div>
                                <div style="font-size: 9px; color: #555; margin-top: 1px;">Tanggal Cetak: ${todayFormatted}</div>
                            </td>
                        </tr>
                    </table>
                </div>

                <table>
                    <thead>
                        <tr style="background-color: #cbd5e1; font-weight: bold; font-size: 10px; text-align: center;">
                            <th style="border: 1px solid #475569; padding: 6px 4px; width: 3%;">NO</th>
                            <th style="border: 1px solid #475569; padding: 6px 5px; width: 12%;">NO. DOKUMEN</th>
                            <th style="border: 1px solid #475569; padding: 6px 4px; width: 8%;">TANGGAL</th>
                            <th style="border: 1px solid #475569; padding: 6px 5px; width: 22%;">PELANGGAN / TUJUAN</th>
                            <th style="border: 1px solid #475569; padding: 6px 4px; width: 10%;">PIC MARKETING</th>
                            <th style="border: 1px solid #475569; padding: 6px 4px; width: 10%;">KOLI / BERAT</th>
                            <th style="border: 1px solid #475569; padding: 6px 4px; width: 8%;">METODE</th>
                            <th style="border: 1px solid #475569; padding: 6px 4px; width: 7%;">BTT FISIK</th>
                            <th style="border: 1px solid #475569; padding: 6px 4px; width: 8%;">FAKTUR</th>
                            <th style="border: 1px solid #475569; padding: 6px 4px; width: 6%;">LUNAS</th>
                            <th style="border: 1px solid #475569; padding: 6px 5px; width: 11%; text-align: right;">TOTAL BIAYA</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #f1f5f9; font-weight: bold; font-size: 10px; font-family: monospace;">
                            <td colspan="5" style="border: 1px solid #475569; padding: 6px; text-align: center;">TOTAL (${data.length} TRANSAKSI) :</td>
                            <td style="border: 1px solid #475569; padding: 6px; text-align: center;">${totalKoliAll} Koli / ${totalBeratAll} Kg</td>
                            <td colspan="4" style="border: 1px solid #475569; padding: 6px; text-align: center;">-</td>
                            <td style="border: 1px solid #475569; padding: 6px; text-align: right; font-weight: 900; color: #e11d48;">Rp ${totalBiayaAll.toLocaleString('id-ID')}</td>
                        </tr>
                    </tfoot>
                </table>

                <script>
                    window.onload = () => { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const filteredCabangBerwenang = cabangList.filter(c => {
        const nama = String(c.agen_nama || c.AgenNama || '').toLowerCase();
        const id = String(c.agen_id || c.AgenID || '').toLowerCase();
        const q = cabangBerwenang.trim().toLowerCase();
        return !q || nama.includes(q) || id.includes(q);
    });

    const columns = [
        {
            header: 'NO. DOKUMEN',
            accessor: 'no_dokumen',
            render: (item) => (
                <div>
                    <span className="font-mono font-bold text-sky-600 block">{item.no_dokumen}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.tipe_dokumen}</span>
                </div>
            )
        },
        {
            header: 'TANGGAL',
            accessor: 'tgl_dokumen',
            render: (item) => <span className="font-mono text-slate-600">{String(item.tgl_dokumen || '').split('T')[0]}</span>
        },
        {
            header: 'PELANGGAN / PENGIRIM',
            accessor: 'cust_name',
            render: (item) => (
                <div>
                    <span className="font-bold text-slate-800 block">{item.cust_name}</span>
                    <span className="text-[11px] text-slate-500">Tujuan: {item.penerima} ({item.kota_tujuan})</span>
                </div>
            )
        },
        {
            header: 'CABANG BERWENANG',
            accessor: 'cabang_berwenang',
            render: (item) => <span className="font-bold text-slate-700 uppercase text-[11px]">{item.cabang_berwenang || '-'}</span>
        },
        {
            header: 'PIC MARKETING',
            accessor: 'pic',
            render: (item) => <span className="font-bold text-slate-700 uppercase">{item.pic || '-'}</span>
        },
        {
            header: 'KOLI / BERAT',
            accessor: 'koli',
            render: (item) => <span className="font-mono text-slate-700">{item.koli} Koli / {item.berat} Kg</span>
        },
        {
            header: 'TOTAL BIAYA',
            accessor: 'total_biaya',
            render: (item) => <span className="font-mono font-black text-rose-600">Rp {Number(item.total_biaya || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'METODE',
            accessor: 'metode_bayar',
            render: (item) => <span className="font-bold text-sky-800 uppercase text-[10px] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">{item.metode_bayar}</span>
        },
        {
            header: 'BTT KEMBALI',
            accessor: 'btt_kembali_yn',
            render: (item) => item.btt_kembali_yn === 'Y' ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                    <CheckCircle2 size={12} /> KEMBALI
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px]">
                    <XCircle size={12} /> BELUM
                </span>
            )
        },
        {
            header: 'STATUS INVOICE',
            accessor: 'sudah_invoice_yn',
            render: (item) => item.sudah_invoice_yn === 'Y' ? (
                <div>
                    <span className="font-bold text-emerald-600 block text-[10px]">FAKTUR</span>
                    <span className="font-mono text-[9px] text-slate-500">{item.no_invoice}</span>
                </div>
            ) : (
                <span className="font-bold text-slate-400 text-[10px]">UNBILLED</span>
            )
        },
        {
            header: 'LUNAS',
            accessor: 'terbayar_yn',
            render: (item) => item.terbayar_yn === 'Y' ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                    <CheckCircle2 size={12} /> LUNAS
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px]">
                    <XCircle size={12} /> BELUM
                </span>
            )
        }
    ];

    return (
        <div className="space-y-5">
            {showFilter && (
                <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                            <Filter size={16} className="text-sky-600" />
                            FILTER KONDISI BTT & ORDER JEMPUT
                        </div>
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

                        {/* Cabang Asal */}
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CABANG ASAL</label>
                            <select
                                value={!isHoldingUser && currentActiveAgen.id ? currentActiveAgen.id : selectedCabang}
                                disabled={!isHoldingUser}
                                onChange={(e) => setSelectedCabang(e.target.value)}
                                className={`w-full p-2 border rounded-lg font-bold outline-none ${!isHoldingUser
                                    ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                                    : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500 cursor-pointer'
                                    }`}
                            >
                                {isHoldingUser && <option value="">-- SEMUA CABANG ASAL --</option>}
                                {!isHoldingUser ? (
                                    <option value={currentActiveAgen.id}>{currentActiveAgen.nama || 'CABANG AKTIF'}</option>
                                ) : (
                                    cabangList.map((c, i) => (
                                        <option key={i} value={c.agen_id || c.AgenID}>{c.agen_nama || c.AgenNama}</option>
                                    ))
                                )}
                            </select>
                        </div>

                        {/* 1. CABANG BERWENANG + AUTOCOMPLETE SUGGEST */}
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <label className="font-bold text-slate-500 block mb-1">CABANG BERWENANG</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Ketik / pilih cabang berwenang..."
                                    value={cabangBerwenang}
                                    onFocus={() => setShowCabangBerwenangDropdown(true)}
                                    onChange={(e) => {
                                        setCabangBerwenang(e.target.value);
                                        setShowCabangBerwenangDropdown(true);
                                    }}
                                    className="w-full p-2 pr-7 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 uppercase"
                                />
                                {cabangBerwenang && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCabangBerwenang('');
                                            setShowCabangBerwenangDropdown(false);
                                        }}
                                        className="absolute right-2 top-2 text-slate-400 hover:text-rose-600 font-bold cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            {showCabangBerwenangDropdown && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-50 divide-y divide-slate-100 text-xs">
                                    {filteredCabangBerwenang.length > 0 ? (
                                        filteredCabangBerwenang.map((c, i) => {
                                            const nama = c.agen_nama || c.AgenNama || '';
                                            const kode = c.agen_id || c.AgenID || '';
                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => {
                                                        setCabangBerwenang(nama);
                                                        setShowCabangBerwenangDropdown(false);
                                                    }}
                                                    className="p-2.5 hover:bg-sky-50 cursor-pointer font-bold text-slate-800 flex justify-between items-center transition"
                                                >
                                                    <span>{nama}</span>
                                                    <span className="font-mono text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-[10px]">
                                                        {kode}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-3 text-center text-slate-400 italic">Cabang tidak ditemukan</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">BTT TELAH KEMBALI</label>
                            <select
                                value={bttKembali}
                                onChange={(e) => setBttKembali(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="">-- SEMUA STATUS FISIK --</option>
                                <option value="Y">Sudah Kembali (POD)</option>
                                <option value="N">Belum Kembali</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">PIC MARKETING</label>
                            <select
                                value={selectedPIC}
                                onChange={(e) => setSelectedPIC(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="">-- SEMUA PIC --</option>
                                {picList.map((pic, i) => (
                                    <option key={i} value={pic}>{pic}</option>
                                ))}
                            </select>
                        </div>

                        {/* 2. CUSTOMER + AUTOCOMPLETE SUGGEST */}
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <label className="font-bold text-slate-500 block mb-1">CUSTOMER</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Ketik minimal 2 huruf (misal: MERCK)..."
                                    value={searchCustomer}
                                    onFocus={() => setShowCustomerDropdown(true)}
                                    onChange={(e) => {
                                        setSearchCustomer(e.target.value);
                                        setShowCustomerDropdown(true);
                                    }}
                                    className="w-full p-2 pr-7 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 uppercase"
                                />
                                {searchCustomer && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchCustomer('');
                                            setCustomerSuggestions([]);
                                            setShowCustomerDropdown(false);
                                        }}
                                        className="absolute right-2 top-2 text-slate-400 hover:text-rose-600 font-bold cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            {showCustomerDropdown && searchCustomer.trim().length >= 2 && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50 divide-y divide-slate-100 text-xs">
                                    {searchingCustomer ? (
                                        <div className="p-3 text-center text-slate-400 font-bold italic animate-pulse">
                                            Mencari customer...
                                        </div>
                                    ) : customerSuggestions.length > 0 ? (
                                        customerSuggestions.map((cust, i) => {
                                            const cName = cust.cust_name || cust.CustName || '';
                                            const cId = cust.cust_id || cust.CustID || '';
                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => {
                                                        setSearchCustomer(cName);
                                                        setShowCustomerDropdown(false);
                                                    }}
                                                    className="p-2.5 hover:bg-sky-50 cursor-pointer font-bold text-slate-800 flex justify-between items-center gap-2 transition"
                                                >
                                                    <span className="truncate">{cName}</span>
                                                    <span className="font-mono text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-[10px] shrink-0">
                                                        {cId}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-3 text-center text-slate-400 italic">Customer tidak ditemukan</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">STATUS FAKTUR INVOICE</label>
                            <select
                                value={sudahInvoice}
                                onChange={(e) => setSudahInvoice(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="">-- SEMUA STATUS FAKTUR --</option>
                                <option value="Y">Sudah Dibuatkan Invoice</option>
                                <option value="N">Belum Difakturkan (Unbilled)</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">STATUS BAYAR</label>
                            <select
                                value={statusBayar}
                                onChange={(e) => setStatusBayar(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="">-- SEMUA STATUS LUNAS --</option>
                                <option value="Y">Sudah Lunas</option>
                                <option value="N">Belum Lunas</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">METODE PEMBAYARAN</label>
                            <select
                                value={metodeBayar}
                                onChange={(e) => setMetodeBayar(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="">-- SEMUA METODE --</option>
                                <option value="TUNAI">TUNAI</option>
                                <option value="KREDIT">KREDIT</option>
                                <option value="TAGIH TURUN">TAGIH TURUN (COD)</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">TGL PELUNASAN</label>
                            <input
                                type="date"
                                value={tglPelunasan}
                                onChange={(e) => setTglPelunasan(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        {/* Barang Naik / Turun (Sesuai Web Lawas) */}
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">BARANG NAIK / TURUN</label>
                            <div className="flex items-center gap-3 pt-2 font-bold text-slate-700">
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="jenis_naik_turun"
                                        checked={jenisNaikTurun === 'S'}
                                        onChange={() => setJenisNaikTurun('S')}
                                    /> Semua
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="jenis_naik_turun"
                                        checked={jenisNaikTurun === 'N'}
                                        onChange={() => setJenisNaikTurun('N')}
                                    /> Naik
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="jenis_naik_turun"
                                        checked={jenisNaikTurun === 'T'}
                                        onChange={() => setJenisNaikTurun('T')}
                                    /> Turun
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mt-5">
                            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={showBTT}
                                    onChange={(e) => setShowBTT(e.target.checked)}
                                    className="w-4 h-4 text-sky-600 rounded"
                                />
                                BTT
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={showOrderJemput}
                                    onChange={(e) => setShowOrderJemput(e.target.checked)}
                                    className="w-4 h-4 text-sky-600 rounded"
                                />
                                Order Jemput
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={bypassTanggal}
                                    onChange={(e) => setBypassTanggal(e.target.checked)}
                                    className="w-4 h-4 text-sky-600 rounded"
                                />
                                Bypass Tgl
                            </label>
                        </div>
                    </div>

                    {/* 3. HANYA 1 TOMBOL EXPORT EXCEL DI BAR AKSI */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center gap-1.5 uppercase shadow-sm cursor-pointer"
                        >
                            <FileSpreadsheet size={14} /> Export Excel
                        </button>
                        <button
                            type="button"
                            onClick={handlePrintReport}
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

            {/* Tabel List Monitoring */}
            <DataTableTemplate
                title="KONDISI BTT DAN ORDER JEMPUT"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                isAddDisabled={true}
                hideAddButton={true}
                hideActions={true}
                hideActionColumn={true}
                onFilter={null}
                onEdit={(item) => {
                    Swal.fire({
                        title: `Detail Resi ${item.no_dokumen}`,
                        html: `
                            <div style="text-align: left; font-size: 12px; line-height: 1.8;">
                                <p><strong>Pelanggan:</strong> ${item.cust_name} (${item.cust_id || '-'})</p>
                                <p><strong>Cabang Berwenang:</strong> ${item.cabang_berwenang || '-'}</p>
                                <p><strong>Penerima:</strong> ${item.penerima} - ${item.kota_tujuan}</p>
                                <p><strong>Muatan:</strong> ${item.koli} Koli / ${item.berat} Kg</p>
                                <p><strong>Total Biaya:</strong> Rp ${Number(item.total_biaya || 0).toLocaleString('id-ID')}</p>
                                <p><strong>Metode Bayar:</strong> ${item.metode_bayar}</p>
                                <p><strong>Status Invoice:</strong> ${item.no_invoice !== '-' ? item.no_invoice : 'Belum dibuatkan faktur'}</p>
                                <p><strong>Status Lunas:</strong> ${item.terbayar_yn === 'Y' ? 'Sudah Lunas' : 'Belum Lunas'}</p>
                            </div>
                        `,
                        icon: 'info',
                        confirmButtonText: 'Tutup'
                    });
                }}
                onDelete={null}
            />
        </div>
    );
};

export default KondisiBTT;