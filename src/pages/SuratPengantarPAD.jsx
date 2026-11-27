import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import {
    Search, Truck, QrCode, PackageCheck, Printer,
    Edit3, Trash2, Save, X as XIcon, ScanBarcode
} from 'lucide-react';
import Swal from 'sweetalert2';
import dliLogo from '../assets/logoDLI.png';
import { QRCodeSVG } from 'qrcode.react';
import { renderToStaticMarkup } from 'react-dom/server';

const SuratPengantarPAD = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { isDarkMode } = useDarkMode();

    const formatNamaAgen = (nama, id = '') => {
        const cleanNama = String(nama || '').trim().toUpperCase();
        const cleanId = String(id || '').trim().toUpperCase();
        if (cleanNama === 'PUSAT DAKOTA' || cleanId === '001' || cleanId === 'PST001' || cleanId === '1') {
            return 'DLI PUSAT';
        }
        return String(nama || '').trim() || 'DLI PUSAT';
    };

    const [currentActiveAgen] = useState(() => {
        const rawAgen = localStorage.getItem('active_agen_nama') || localStorage.getItem('kode_cabang') || 'DLI PUSAT';
        const rawId = localStorage.getItem('active_agen_id') || '';
        return formatNamaAgen(rawAgen, rawId);
    });

    const now = new Date();
    const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const today = now.toISOString().split('T')[0];

    const [loading, setLoading] = useState(false);
    const [vendors, setVendors] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [draftBTTList, setDraftBTTList] = useState([]);
    const [inputBarcode, setInputBarcode] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    const [filterData, setFilterData] = useState({
        dariTanggal: firstDayOfMonth,
        sampaiTanggal: today,
        noSP: '',
        noBTT: '',
        ekspedisiLain: ''
    });

    const [configPAD, setConfigPAD] = useState({
        vendorEkspedisi: '',
        noResiVendor: '',
        driverVendor: '',
        noSuratTugas: '',
        loadHID: ''
    });

    // Modal Edit SP PAD Existing (opr_t_sp_pad_e.asp)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editHeader, setEditHeader] = useState(null);
    const [editItems, setEditItems] = useState([]);
    const [editScanBtt, setEditScanBtt] = useState('');
    const [selectedRemoveBtts, setSelectedRemoveBtts] = useState([]);

    useEffect(() => {
        fetchVendors();
        fetchHistorySPPAD();
    }, []);

    const fetchVendors = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/master/vendor/list', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const dataVendor = res.data?.data || res.data || [];
            if (Array.isArray(dataVendor) && dataVendor.length > 0) {
                setVendors(dataVendor);
            } else {
                setVendors([
                    { id: 'DBS', vendor_nama: 'DBS LOGISTIK' },
                    { id: 'JNE', vendor_nama: 'JNE LOGISTIK' },
                    { id: 'TIKI', vendor_nama: 'TIKI LOGISTIK' },
                    { id: 'INDONESIA_CARGO', vendor_nama: 'PT. INDONESIA CARGO REKANAN' }
                ]);
            }
        } catch (err) {
            setVendors([
                { id: 'DBS', vendor_nama: 'DBS LOGISTIK' },
                { id: 'JNE', vendor_nama: 'JNE LOGISTIK' },
                { id: 'TIKI', vendor_nama: 'TIKI LOGISTIK' },
                { id: 'INDONESIA_CARGO', vendor_nama: 'PT. INDONESIA CARGO REKANAN' }
            ]);
        }
    };

    // 1. Tarik Daftar Histori SP PAD (opr_t_sp_pad.asp)
    const fetchHistorySPPAD = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/sp-pad', {
                params: {
                    dariTanggal: filterData.dariTanggal,
                    sampaiTanggal: filterData.sampaiTanggal,
                    noSP: filterData.noSP,
                    noBTT: filterData.noBTT,
                    ekspedisiLain: filterData.ekspedisiLain
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const resData = res.data?.data || res.data || [];
            setTableData(Array.isArray(resData) ? resData : []);
            if (e) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Ditemukan ${resData.length} dokumen SP PAD`, showConfirmButton: false, timer: 1800 });
            }
        } catch (err) {
            setTableData([]);
        } finally {
            setLoading(false);
        }
    };

    // 2. Tambah SP PAD dari Proses Loading Barang (Pop-up Modal seperti Surat Pengantar - Pengiriman)
    const handleLoadFromLoadingPAD = () => {
        Swal.fire({
            title: 'Tambah SP PAD Dari Proses Loading',
            input: 'text',
            inputLabel: 'Masukkan Nomor Loading Barang (LoadH_ID) atau Nomor Surat Tugas:',
            inputPlaceholder: 'Contoh: LC0012026110000038 atau 001JC2026...',
            showCancelButton: true,
            confirmButtonText: 'Tarik Data Loading',
            confirmButtonColor: '#2563eb',
            showLoaderOnConfirm: true,
            preConfirm: async (val) => {
                const cleanCode = String(val || '').trim().toUpperCase();
                if (!cleanCode) {
                    Swal.showValidationMessage('Nomor Loading / Surat Tugas wajib diisi!');
                    return false;
                }
                try {
                    const token = localStorage.getItem('token');
                    const resp = await api.get('/operasional/sp-pad/from-loading', {
                        params: { load_id: cleanCode },
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    return resp.data;
                } catch (err) {
                    const msg = err.response?.data?.message || err.message || 'Data loading tidak ditemukan';
                    Swal.showValidationMessage(msg);
                    return false;
                }
            },
            allowOutsideClick: () => !Swal.isLoading()
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const hdr = result.value?.header || {};
                const btts = Array.isArray(result.value?.btts) ? result.value.btts : [];

                const sopirGabung = [hdr.sopir1_nama, hdr.sopir2_nama].filter(Boolean).join(' / ');
                setConfigPAD({
                    vendorEkspedisi: '',
                    noResiVendor: '',
                    driverVendor: sopirGabung || '',
                    noMobil: hdr.no_mobil || '',
                    noSuratTugas: hdr.surat_tugas || '',
                    loadHID: hdr.load_id || ''
                });

                setDraftBTTList(btts.map((b, idx) => ({
                    no: idx + 1,
                    btt_id: b.btt_id,
                    no_sj: b.no_sj || '-',
                    tgl_btt: b.tgl_btt || '-',
                    pengirim: b.pengirim || '-',
                    penerima: b.penerima || '-',
                    alamat: b.alamat || '-',
                    kota: b.kota || '-',
                    telp: b.telp || '-',
                    service_nama: b.service_nama || 'DARAT',
                    koli: b.koli || 1,
                    berat: b.berat || 0
                })));

                setIsCreateModalOpen(true);

                if (hdr.existing_sp) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'info',
                        title: `Info: Loading ${hdr.load_id} sebelumnya tercatat di ${hdr.existing_sp}.`,
                        showConfirmButton: false,
                        timer: 3000
                    });
                }
            }
        });
    };

    // 3. Scan Barcode BTT Langsung (opr_t_sp_pad_a_BTT.asp)
    const handleScanMuat = (e) => {
        if (e) e.preventDefault();
        const rawScan = inputBarcode.trim().toUpperCase();
        if (!rawScan) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Ketik atau scan nomor BTT terlebih dahulu!', showConfirmButton: false, timer: 1600 });
            return;
        }
        const cleanBTT = rawScan.slice(0, 16);

        if (draftBTTList.some(item => item.btt_id === cleanBTT)) {
            Swal.fire('Duplikasi BTT', `Resi ${cleanBTT} sudah ada dalam daftar muatan SP PAD!`, 'warning');
            setInputBarcode('');
            return;
        }

        setDraftBTTList(prev => [
            ...prev,
            {
                no: prev.length + 1,
                btt_id: cleanBTT,
                no_sj: '-',
                tgl_btt: new Date().toLocaleDateString('id-ID'),
                pengirim: '-',
                penerima: '-',
                kota: '-',
                service_nama: 'DARAT',
                koli: 1,
                berat: 0,
                sumber: 'SCAN MANUAL'
            }
        ]);
        setInputBarcode('');
    };

    // 4. Simpan & Terbitkan SP PAD Final (p-opr_t_sp_pad_loading_f.asp)
    const handleSaveSPPAD = async () => {
        if (!configPAD.vendorEkspedisi) {
            Swal.fire('PERINGATAN', 'Pilih atau ketik Vendor Ekspedisi Lain terlebih dahulu!', 'warning');
            return;
        }
        if (draftBTTList.length === 0) {
            Swal.fire('PERINGATAN', 'Daftar BTT masih kosong! Tarik dari Loading atau scan barcode BTT terlebih dahulu.', 'warning');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                spp_asal_agen: currentActiveAgen,
                spp_expedisilain: configPAD.vendorEkspedisi,
                spp_noresi_vendor: configPAD.noResiVendor,
                spp_sopir: configPAD.driverVendor,
                spp_surattugas: configPAD.noSuratTugas,
                spp_loadhid: configPAD.loadHID,
                daftar_btt: draftBTTList.map(i => i.btt_id)
            };

            const res = await api.post('/operasional/sp-pad', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.status === 'success') {
                Swal.fire('BERHASIL', `Surat Pengantar PAD ${res.data.no_sp || ''} Berhasil Terbit!`, 'success');
                setIsCreateModalOpen(false);
                setDraftBTTList([]);
                setConfigPAD({ vendorEkspedisi: '', noResiVendor: '', driverVendor: '', noMobil: '', noSuratTugas: '', loadHID: '' });
                fetchHistorySPPAD();
            }
        } catch (err) {
            Swal.fire('GAGAL', err.response?.data?.message || 'Gagal menyimpan Surat Pengantar PAD', 'error');
        } finally {
            setLoading(false);
        }
    };

    // 5. Buka Modal Edit SP PAD Existing (opr_t_sp_pad_e.asp)
    const handleOpenEditSPPAD = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/sp-pad/detail', {
                params: { sp_id: item.no_sp_pad },
                headers: { Authorization: `Bearer ${token}` }
            });
            setEditHeader(res.data?.header || {});
            setEditItems(res.data?.items || []);
            setSelectedRemoveBtts([]);
            setEditScanBtt('');
            setIsEditModalOpen(true);
        } catch (err) {
            Swal.fire('Gagal', 'Tidak dapat memuat detail SP PAD', 'error');
        }
    };

    const handleScanAddToSPPAD = async (e) => {
        e.preventDefault();
        if (!editScanBtt.trim() || !editHeader) return;
        try {
            const token = localStorage.getItem('token');
            const res = await api.put('/operasional/sp-pad/update', {
                no_sp_pad: editHeader.no_sp_pad,
                add_btt: editScanBtt.trim()
            }, { headers: { Authorization: `Bearer ${token}` } });

            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: res.data?.message, showConfirmButton: false, timer: 1800 });
            setEditScanBtt('');
            handleOpenEditSPPAD({ no_sp_pad: editHeader.no_sp_pad });
            fetchHistorySPPAD();
        } catch (err) {
            Swal.fire('Peringatan', err.response?.data?.message || 'Gagal menambah BTT', 'warning');
        }
    };

    const handleSaveEditSPPAD = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.put('/operasional/sp-pad/update', {
                no_sp_pad: editHeader.no_sp_pad,
                expedisi_lain: editHeader.expedisi_lain,
                surat_tugas: editHeader.surat_tugas,
                remove_btts: selectedRemoveBtts
            }, { headers: { Authorization: `Bearer ${token}` } });

            Swal.fire('Tersimpan!', 'Perubahan SP PAD berhasil disimpan.', 'success');
            setIsEditModalOpen(false);
            fetchHistorySPPAD();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan perubahan SP PAD', 'error');
        }
    };

    // 6. Non-Aktifkan SP PAD (p-opr_t_sp_pad_h.asp)
    const handleDeleteRow = (item) => {
        Swal.fire({
            title: 'Non-Aktifkan SP PAD?',
            text: `Dokumen ${item.no_sp_pad} akan dinonaktifkan.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Ya, Non-Aktifkan!'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete('/operasional/sp-pad/delete', {
                        params: { sp_id: item.no_sp_pad },
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Berhasil', 'SP PAD dinonaktifkan.', 'success');
                    fetchHistorySPPAD();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus SP PAD', 'error');
                }
            }
        });
    };

    // 7. Cetak Dokumen SP PAD (Header 3 Kolom + QR Code)
    const handlePrintSPPAD = async (item) => {
        const targetNoSP = String(item?.no_sp_pad || '').trim();
        if (!targetNoSP) return;

        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/sp-pad/detail', {
                params: { sp_id: targetNoSP },
                headers: { Authorization: `Bearer ${token}` }
            });
            const hdr = res.data?.header || {};
            const items = Array.isArray(res.data?.items) ? res.data.items : [];

            const totKoli = items.reduce((a, b) => a + Number(b.koli || 0), 0);
            const totBeratAsli = items.reduce((a, b) => a + Number(b.berat_asli || 0), 0);
            const totBeratVol = items.reduce((a, b) => a + Number(b.berat_vol || 0), 0);
            const totHarga = items.reduce((a, b) => a + Number(b.harga_kirim || 0), 0);

            const sopir1Text = hdr.sopir1 && hdr.sopir1 !== '-' ? hdr.sopir1 : '-';
            const sopir2Text = hdr.sopir2 && hdr.sopir2 !== '-' ? hdr.sopir2 : sopir1Text;
            const finalNoSP = hdr.no_sp_pad || targetNoSP;

            // Render QR Code SVG langsung dari library qrcode.react
            const qrCodeSVG = renderToStaticMarkup(
                <QRCodeSVG value={finalNoSP} size={64} level="M" />
            );

            const win = window.open('', '_blank', 'width=1050,height=780');
            if (!win) {
                Swal.fire('Pop-up Diblokir', 'Izinkan pop-up browser untuk mencetak SP PAD.', 'warning');
                return;
            }

            win.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Surat Pengantar PAD - ${finalNoSP}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 18px 22px; font-size: 11px; color: #000; }
                        .header-wrap {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            border-bottom: 2px solid #000;
                            padding-bottom: 10px;
                            gap: 14px;
                        }
                        .col-left {
                            width: 34%;
                            display: flex;
                            flex-direction: column;
                            align-items: flex-start;
                        }
                        .col-center {
                            width: 28%;
                            text-align: center;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                        }
                        .col-right {
                            width: 38%;
                            font-size: 11px;
                            line-height: 1.45;
                        }
                        .info-table { width: 100%; border-collapse: collapse; margin: 0; }
                        .info-table td { border: none; padding: 1px 2px; vertical-align: top; }
                        .info-label { font-weight: bold; width: 92px; white-space: nowrap; }
                        .info-val { font-weight: bold; }
                        table.manifest { width: 100%; border-collapse: collapse; margin-top: 12px; }
                        table.manifest th, table.manifest td { border: 1px solid #333; padding: 5px 6px; }
                        table.manifest th { background: #004b84; color: #fff; font-size: 10px; text-transform: uppercase; }
                        table.manifest tfoot td { font-weight: bold; background: #f1f5f9; }
                    </style>
                </head>
                <body onload="window.print()">
                    <div class="header-wrap">
                        <!-- KOLOM KIRI: LOGO DLI (SUDAH ADA TEKS LOGO) + ALAMAT DI BAWAHNYA -->
                        <div class="col-left">
                            <img src="${dliLogo}" alt="Logo DLI" style="height:40px; max-width:100%; object-fit:contain;" />
                            <div style="font-size:10px; font-weight:bold; color:#000; margin-top:4px;">PT. DAKOTA LOGISTIK INDONESIA</div>
                            <div style="font-size:9px; color:#222; margin-top:1px;">${hdr.asal_alamat || ''} - ${hdr.asal_kota || ''}</div>
                        </div>

                        <!-- KOLOM TENGAH: JUDUL, QR CODE & NOMOR SP PAD -->
                        <div class="col-center">
                            <div style="font-size:11px; font-weight:bold; color:#004b84; margin-bottom:5px; white-space:nowrap;">SURAT PENGANTAR PAD (EKSPEDISI LAIN)</div>
                            <div>${qrCodeSVG}</div>
                            <div style="font-size:10px; margin-top:5px;">Nomor SP PAD: <b>${finalNoSP}</b></div>
                        </div>

                        <!-- KOLOM KANAN: DETAIL PENGIRIMAN -->
                        <div class="col-right">
                            <table class="info-table">
                                <tr>
                                    <td class="info-label">Asal / Dari</td>
                                    <td class="info-val">: ${hdr.asal_agen || item.cabang_asal || '-'}</td>
                                </tr>
                                <tr>
                                    <td class="info-label">Ekspedisi Lain</td>
                                    <td class="info-val">: ${hdr.expedisi_lain || item.vendor_expedisi_lain || '-'}</td>
                                </tr>
                                <tr>
                                    <td class="info-label">Tanggal SP</td>
                                    <td class="info-val">: ${hdr.tanggal_sp || item.tanggal_sp || '-'}</td>
                                </tr>
                                <tr>
                                    <td class="info-label">Pengemudi 1</td>
                                    <td class="info-val">: ${sopir1Text}</td>
                                </tr>
                                <tr>
                                    <td class="info-label">Pengemudi 2</td>
                                    <td class="info-val">: ${sopir2Text}</td>
                                </tr>
                            </table>
                            <div style="font-weight:bold; margin-top:2px;">
                                No. Polisi: ${hdr.no_mobil || '-'} | No. Surat Tugas: ${hdr.surat_tugas || '-'}
                            </div>
                        </div>
                    </div>

                    <table class="manifest">
                        <thead>
                            <tr>
                                <th width="28">NO</th>
                                <th>BTT</th>
                                <th>SURAT JALAN (NO. OD)</th>
                                <th>PENGIRIM</th>
                                <th>PENERIMA</th>
                                <th width="45">KOLI</th>
                                <th width="65">BERAT ASLI</th>
                                <th width="65">BERAT VOL</th>
                                <th width="85">HARGA KIRIM</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map((r, i) => `
                                <tr>
                                    <td align="center">${i + 1}.</td>
                                    <td><b>${r.btt_id || '-'}</b></td>
                                    <td>${r.no_sj || '-'}</td>
                                    <td>${r.pengirim || '-'}</td>
                                    <td>${r.penerima || '-'}</td>
                                    <td align="right">${Number(r.koli || 0).toLocaleString('id-ID')}</td>
                                    <td align="right">${Number(r.berat_asli || 0).toLocaleString('id-ID')}</td>
                                    <td align="right">${Number(r.berat_vol || 0).toLocaleString('id-ID')}</td>
                                    <td align="right">${Number(r.harga_kirim || 0).toLocaleString('id-ID')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="5" align="right">TOTAL (${items.length} BTT) :</td>
                                <td align="right">${totKoli.toLocaleString('id-ID')}</td>
                                <td align="right">${totBeratAsli.toLocaleString('id-ID')}</td>
                                <td align="right">${totBeratVol.toLocaleString('id-ID')}</td>
                                <td align="right">${totHarga.toLocaleString('id-ID')}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div style="font-style:italic; font-size:10px; margin-top:8px;">
                        Melalui SURAT PENGANTAR PENGIRIMAN / MANIFEST ini, kami memberangkatkan barang sesuai dengan yang tertera pada daftar di atas dan benar adanya.
                    </div>

                    <div style="display:flex; justify-content:space-between; margin-top:30px; text-align:center;">
                        <div style="width:30%;">
                            <div>Pembuat SP-PAD,</div>
                            <div style="margin-top:48px;">( ${hdr.update_id || '___________________'} )</div>
                        </div>
                        <div style="width:30%;">
                            <div>Supir / Pengemudi,</div>
                            <div style="margin-top:48px;">( ${sopir1Text !== '-' ? sopir1Text : '___________________'} )</div>
                        </div>
                        <div style="width:30%;">
                            <div>Diterima dengan baik oleh,</div>
                            <div style="margin-top:48px;">( ___________________ )</div>
                        </div>
                    </div>
                </body>
                </html>
            `);

            win.document.close();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyiapkan cetakan SP PAD', 'error');
        }
    };

    const columns = [
        {
            header: 'NO. SP PAD',
            accessor: 'no_sp_pad',
            render: (i) => (
                <button
                    type="button"
                    onClick={() => handleOpenEditSPPAD(i)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold text-xs rounded-lg cursor-pointer transition"
                >
                    {i.no_sp_pad || '-'}
                </button>
            )
        },
        {
            header: 'TANGGAL SP',
            accessor: 'tanggal_sp',
            render: (i) => <span className="font-mono text-xs font-bold text-slate-700">{i.tanggal_sp || '-'}</span>
        },
        {
            header: 'CABANG ASAL',
            accessor: 'cabang_asal',
            render: (i) => <span className="font-bold text-slate-700 uppercase">{i.cabang_asal || currentActiveAgen}</span>
        },
        {
            header: 'VENDOR / EKSPEDISI LAIN',
            accessor: 'vendor_expedisi_lain',
            render: (i) => <span className="font-black text-emerald-800 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{i.vendor_expedisi_lain || '-'}</span>
        },
        {
            header: 'BTT',
            accessor: 'jumlah_btt',
            render: (i) => <span className="font-mono font-bold text-indigo-700">{i.jumlah_btt ?? 0}</span>
        },
        {
            header: 'STATUS',
            accessor: 'status_aktif',
            render: (i) => (
                <span className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase border ${i.status_aktif === 'Aktif' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'}`}>
                    {i.status_aktif || 'Aktif'}
                </span>
            )
        },
        {
            header: 'ACTION',
            accessor: 'action',
            render: (item) => (
                <div className="flex items-center justify-center gap-1.5">
                    <button type="button" onClick={() => handleOpenEditSPPAD(item)} title="Edit / Scan BTT SP PAD" className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer">
                        <Edit3 size={15} />
                    </button>
                    <button type="button" onClick={() => handlePrintSPPAD(item)} title="Cetak Surat Pengantar PAD" className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg cursor-pointer">
                        <Printer size={15} />
                    </button>
                    {item.status_aktif === 'Aktif' && (
                        <button type="button" onClick={() => handleDeleteRow(item)} title="Non-Aktifkan SP PAD" className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer">
                            <Trash2 size={15} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    const filteredTableData = tableData.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.no_sp_pad && item.no_sp_pad.toLowerCase().includes(q)) ||
            (item.vendor_expedisi_lain && item.vendor_expedisi_lain.toLowerCase().includes(q)) ||
            (item.cabang_asal && item.cabang_asal.toLowerCase().includes(q))
        );
    });

    return (
        <div className={`p-6 space-y-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>

            {/* Title Page Header */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                    <h1 className="text-base font-black uppercase tracking-wider text-indigo-600">
                        SURAT PENGANTAR - SP PAD (EKSPEDISI LAIN)
                    </h1>
                    <p className="text-[11px] text-gray-400 font-medium">
                        Modul pelimpahan pengiriman kargo internal DAKOTA Cargo kepada Vendor / Ekspedisi Rekanan Pihak Ketiga.
                    </p>
                </div>
            </div>

            {/* 🔍 PANEL 1: FILTER & PENCARIAN DOKUMEN OPERASIONAL */}
            <div className={`p-5 rounded-2xl border shadow-xs space-y-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2 text-indigo-600 font-black tracking-wider border-b border-slate-100 pb-2 text-xs">
                    <Search size={16} />
                    <span>PANEL FILTER & PENCARIAN DOKUMEN OPERASIONAL</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">DARI TANGGAL</label>
                        <input type="date" value={filterData.dariTanggal} onChange={e => setFilterData({ ...filterData, dariTanggal: e.target.value })} className="w-full mt-1 p-2 border rounded-lg bg-transparent text-xs" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">SAMPAI TANGGAL</label>
                        <input type="date" value={filterData.sampaiTanggal} onChange={e => setFilterData({ ...filterData, sampaiTanggal: e.target.value })} className="w-full mt-1 p-2 border rounded-lg bg-transparent text-xs" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">NO. SP PAD</label>
                        <input type="text" placeholder="Cari No SP..." value={filterData.noSP} onChange={e => setFilterData({ ...filterData, noSP: e.target.value.toUpperCase() })} onKeyDown={e => e.key === 'Enter' && fetchHistorySPPAD(e)} className="w-full mt-1 p-2 border rounded-lg bg-transparent text-xs uppercase font-mono" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">NO. BTT / RESI</label>
                        <input type="text" placeholder="Cari No BTT..." value={filterData.noBTT} onChange={e => setFilterData({ ...filterData, noBTT: e.target.value.toUpperCase() })} onKeyDown={e => e.key === 'Enter' && fetchHistorySPPAD(e)} className="w-full mt-1 p-2 border rounded-lg bg-transparent text-xs uppercase font-mono" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">EKSPEDISI LAIN</label>
                        <input type="text" placeholder="Cari Vendor..." value={filterData.ekspedisiLain} onChange={e => setFilterData({ ...filterData, ekspedisiLain: e.target.value.toUpperCase() })} onKeyDown={e => e.key === 'Enter' && fetchHistorySPPAD(e)} className="w-full mt-1 p-2 border rounded-lg bg-transparent text-xs uppercase" />
                    </div>
                </div>
                <div className="flex flex-wrap justify-between items-center gap-2">
                    <button type="button" onClick={handleLoadFromLoadingPAD} className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer">
                        <PackageCheck size={15} /> TAMBAH SP PAD DARI PROSES LOADING
                    </button>
                    <button type="button" onClick={fetchHistorySPPAD} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-xs cursor-pointer">
                        🚀 JALANKAN FILTER DATA
                    </button>
                </div>
            </div>

            {/* 📊 PANEL 3: DATATABLE HISTORI SP PAD */}
            <DataTableTemplate
                title={`DATALIST SURAT PENGANTAR PAD (${filteredTableData.length} ITEMS)`}
                columns={columns}
                data={filteredTableData}
                loading={loading}
                isDarkMode={isDarkMode}
                hideAddButton={true}
            />
            {/* MODAL PEMBUATAN SP PAD BARU (DARI PROSES LOADING / SCAN BTT) */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
                        <div className="px-6 py-4 bg-indigo-900 text-white flex justify-between items-center">
                            <h3 className="font-black text-sm uppercase flex items-center gap-2">
                                <Truck size={18} /> PEMBUATAN SURAT PENGANTAR PAD (EKSPEDISI LAIN)
                            </h3>
                            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full cursor-pointer">
                                <XIcon size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-xs font-bold text-slate-700 overflow-y-auto">
                            {/* Baris 1: Cabang Asal, No. Mobil, No. Surat Tugas, Loading ID */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block mb-1 text-slate-500">CABANG ASAL</label>
                                    <input type="text" readOnly value={currentActiveAgen} className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-500">NO. MOBIL</label>
                                    <input type="text" readOnly value={configPAD.noMobil || '-'} className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-500">NO. SURAT TUGAS</label>
                                    <input type="text" value={configPAD.noSuratTugas} onChange={e => setConfigPAD({ ...configPAD, noSuratTugas: e.target.value.toUpperCase() })} className="w-full p-2.5 border border-slate-300 rounded-xl font-mono uppercase" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-500">ID LOADING</label>
                                    <input type="text" readOnly value={configPAD.loadHID || 'MANUAL BTT'} className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono" />
                                </div>
                            </div>

                            {/* Baris 2: Ekspedisi Lain (Wajib), Sopir / Pengemudi, No Resi Luar */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl">
                                <div>
                                    <label className="block mb-1 text-indigo-900">EKSPEDISI LAIN / VENDOR REKANAN *</label>
                                    <input
                                        type="text"
                                        list="list-vendor-pad"
                                        autoFocus
                                        placeholder="PILIH ATAU KETIK EKSPEDISI LAIN..."
                                        value={configPAD.vendorEkspedisi}
                                        onChange={e => setConfigPAD({ ...configPAD, vendorEkspedisi: e.target.value.toUpperCase() })}
                                        className="w-full p-2.5 border-2 border-indigo-400 rounded-xl bg-white text-slate-900 uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-600">SUPIR / PENGEMUDI</label>
                                    <input
                                        type="text"
                                        value={configPAD.driverVendor}
                                        onChange={e => setConfigPAD({ ...configPAD, driverVendor: e.target.value.toUpperCase() })}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl bg-white uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-600">NO. RESI VENDOR LUAR (OPSIONAL)</label>
                                    <input
                                        type="text"
                                        placeholder="OPSIONAL..."
                                        value={configPAD.noResiVendor}
                                        onChange={e => setConfigPAD({ ...configPAD, noResiVendor: e.target.value.toUpperCase() })}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono uppercase"
                                    />
                                </div>
                            </div>

                            {/* Tambah Scan BTT Tambahan jika diperlukan */}
                            <form onSubmit={handleScanMuat} className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="block mb-1 text-indigo-700">SCAN BARCODE / TAMBAH NOMOR BTT :</label>
                                    <input
                                        type="text"
                                        placeholder="Scan atau ketik nomor BTT lalu tekan Enter..."
                                        value={inputBarcode}
                                        onChange={e => setInputBarcode(e.target.value)}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl font-mono uppercase"
                                    />
                                </div>
                                <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl uppercase cursor-pointer">
                                    + TAMBAH BTT
                                </button>
                            </form>

                            {/* Tabel Rincian BTT */}
                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-left border-collapse text-[11px]">
                                    <thead className="bg-slate-800 text-white">
                                        <tr>
                                            <th className="p-2.5">NO</th>
                                            <th className="p-2.5">NO. BTT</th>
                                            <th className="p-2.5">SURAT JALAN</th>
                                            <th className="p-2.5">TGL BTT</th>
                                            <th className="p-2.5">PENGIRIM</th>
                                            <th className="p-2.5">PENERIMA</th>
                                            <th className="p-2.5">KOTA</th>
                                            <th className="p-2.5 text-right">JUMLAH</th>
                                            <th className="p-2.5 text-right">BERAT</th>
                                            <th className="p-2.5 text-center">HAPUS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {draftBTTList.length === 0 ? (
                                            <tr><td colSpan="10" className="p-4 text-center text-slate-400">Belum ada BTT dalam daftar muatan</td></tr>
                                        ) : draftBTTList.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-2.5 font-mono">{idx + 1}</td>
                                                <td className="p-2.5 font-mono font-bold">
                                                    <button
                                                        type="button"
                                                        onClick={() => Swal.fire({
                                                            title: `Detail Resi ${row.btt_id}`,
                                                            html: `
                                                    <div class="text-left text-xs space-y-1.5 bg-slate-50 p-3 rounded-xl border">
                                                        <div><b>No. Surat Jalan:</b> ${row.no_sj || '-'}</div>
                                                        <div><b>Tanggal BTT:</b> ${row.tgl_btt || '-'}</div>
                                                        <div><b>Pengirim:</b> ${row.pengirim || '-'}</div>
                                                        <div><b>Penerima:</b> ${row.penerima || '-'}</div>
                                                        <div><b>Alamat:</b> ${row.alamat || '-'}</div>
                                                        <div><b>Kota Tujuan:</b> ${row.kota || '-'}</div>
                                                        <div><b>No. Telp:</b> ${row.telp || '-'}</div>
                                                        <div><b>Jumlah / Berat:</b> ${row.koli || 1} Koli / ${row.berat || 0} Kg</div>
                                                    </div>
                                                `,
                                                            confirmButtonText: 'Tutup'
                                                        })}
                                                        className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded underline cursor-pointer"
                                                    >
                                                        {row.btt_id}
                                                    </button>
                                                </td>
                                                <td className="p-2.5">{row.no_sj}</td>
                                                <td className="p-2.5 font-mono">{row.tgl_btt}</td>
                                                <td className="p-2.5">{row.pengirim}</td>
                                                <td className="p-2.5">{row.penerima}</td>
                                                <td className="p-2.5">{row.kota}</td>
                                                <td className="p-2.5 text-right font-mono">{row.koli}</td>
                                                <td className="p-2.5 text-right font-mono">{row.berat}</td>
                                                <td className="p-2.5 text-center">
                                                    <button type="button" onClick={() => setDraftBTTList(draftBTTList.filter((_, i) => i !== idx))} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2.5 border border-slate-300 rounded-xl uppercase cursor-pointer">
                                    BATAL
                                </button>
                                <button type="button" onClick={handleSaveSPPAD} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 uppercase cursor-pointer">
                                    <Save size={15} /> PROSES & TERBITKAN SP PAD ({draftBTTList.length} BTT)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL EDIT & SCAN BTT SP PAD (opr_t_sp_pad_e.asp) */}
            {isEditModalOpen && editHeader && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
                        <div className="px-6 py-4 bg-indigo-900 text-white flex justify-between items-center">
                            <h3 className="font-black text-sm uppercase">
                                EDIT SURAT PENGANTAR PAD : <span className="font-mono text-amber-300">{editHeader.no_sp_pad}</span>
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full cursor-pointer">
                                <XIcon size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEditSPPAD} className="p-6 space-y-4 text-xs font-bold text-slate-700 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block mb-1 text-slate-500">NO. SP PAD</label>
                                    <input type="text" readOnly value={editHeader.no_sp_pad} className="w-full p-2.5 bg-slate-100 border rounded-xl font-mono" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-600">EKSPEDISI LAIN / VENDOR</label>
                                    <input type="text" value={editHeader.expedisi_lain} onChange={e => setEditHeader({ ...editHeader, expedisi_lain: e.target.value.toUpperCase() })} className="w-full p-2.5 border rounded-xl uppercase" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-600">NO. SURAT TUGAS</label>
                                    <input type="text" value={editHeader.surat_tugas} onChange={e => setEditHeader({ ...editHeader, surat_tugas: e.target.value.toUpperCase() })} className="w-full p-2.5 border rounded-xl font-mono uppercase" />
                                </div>
                            </div>

                            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex gap-2 items-center">
                                <ScanBarcode size={20} className="text-indigo-700" />
                                <input
                                    type="text"
                                    placeholder="Scan Barcode BTT untuk ditambahkan ke SP PAD ini..."
                                    value={editScanBtt}
                                    onChange={e => setEditScanBtt(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleScanAddToSPPAD(e)}
                                    className="flex-1 p-2 bg-white border border-indigo-300 rounded-lg font-mono uppercase"
                                />
                                <button type="button" onClick={handleScanAddToSPPAD} className="px-4 py-2 bg-indigo-700 text-white rounded-lg uppercase cursor-pointer">
                                    SCAN TAMBAH
                                </button>
                            </div>

                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-left border-collapse text-[11px]">
                                    <thead className="bg-slate-800 text-white">
                                        <tr>
                                            <th className="p-2">NO</th>
                                            <th className="p-2">NO. BTT</th>
                                            <th className="p-2">SURAT JALAN</th>
                                            <th className="p-2">PENGIRIM</th>
                                            <th className="p-2">PENERIMA</th>
                                            <th className="p-2 text-right">KOLI</th>
                                            <th className="p-2 text-right">BERAT</th>
                                            <th className="p-2 text-center">HAPUS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {editItems.map((b, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2 font-mono">{idx + 1}</td>
                                                <td className="p-2 font-mono font-bold text-indigo-700">{b.btt_id}</td>
                                                <td className="p-2">{b.no_sj}</td>
                                                <td className="p-2">{b.pengirim}</td>
                                                <td className="p-2">{b.penerima}</td>
                                                <td className="p-2 text-right font-mono">{b.koli}</td>
                                                <td className="p-2 text-right font-mono">{b.berat_asli}</td>
                                                <td className="p-2 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRemoveBtts.includes(b.btt_id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedRemoveBtts([...selectedRemoveBtts, b.btt_id]);
                                                            else setSelectedRemoveBtts(selectedRemoveBtts.filter(id => id !== b.btt_id));
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                <span className="text-slate-600">Total BTT Terdaftar: <b>{editItems.length}</b></span>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => handlePrintSPPAD(editHeader)} className="px-4 py-2.5 bg-sky-600 text-white rounded-xl uppercase cursor-pointer">
                                        CETAK SP PAD
                                    </button>
                                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 border border-slate-300 rounded-xl uppercase cursor-pointer">
                                        KELUAR
                                    </button>
                                    <button type="submit" className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl uppercase cursor-pointer">
                                        SIMPAN PERUBAHAN
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuratPengantarPAD;