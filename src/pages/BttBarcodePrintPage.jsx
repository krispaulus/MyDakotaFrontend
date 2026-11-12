import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, PlusSquare, MinusSquare, RefreshCw, ArrowUp } from 'lucide-react';
import api from '../api/axios';

const BttBarcodePrintPage = () => {
    const [searchParams] = useSearchParams();
    const bttId = searchParams.get('id') || localStorage.getItem('print_barcode_btt_id') || '';

    const [items, setItems] = useState([]);
    const [bttInfo, setBttInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    // Pengaturan cetak (persis fitur ASP lawas: Tambah Ruang, Urutan Koli, & Mode A4 / Zebra)
    const [emptySlots, setEmptySlots] = useState(0);
    const [fromKoli, setFromKoli] = useState(1);
    const [toKoli, setToKoli] = useState(0);
    const [printMode, setPrintMode] = useState('A4'); // 'A4' | 'ZEBRA'

    const fetchKoliData = async (f = 1, t = 0) => {
        if (!bttId) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/marketing/btt/${encodeURIComponent(bttId)}/barcode-koli`, {
                params: { from: f, to: t },
                headers: { Authorization: `Bearer ${token}` }
            });

            const list = res.data?.items || [];
            const info = res.data?.btt || null;
            setItems(list);
            setBttInfo(info);
            if (t === 0 && info?.bttt_jmlunit) {
                setToKoli(info.bttt_jmlunit);
            }
        } catch (err) {
            // Fallback jika API belum dipanggil / offline dari payload localStorage
            const cached = JSON.parse(localStorage.getItem('print_barcode_payload') || 'null');
            if (cached) {
                const jml = parseInt(cached.jumlah_koli || cached.bttt_jmlkoli || 1, 10);
                const maxT = t > 0 && t <= jml ? t : jml;
                const generated = [];
                for (let i = f; i <= maxT; i++) {
                    generated.push({
                        koli_id: `${bttId}${String(i).padStart(4, '0')}`,
                        urutan: i,
                        total_koli: jml,
                        bttt_id: bttId,
                        agen_asal: cached.agen_nama || 'DLI PUSAT',
                        agen_tujuan: cached.tujuan_kota || 'DLI PUSAT',
                        tujuan_nama: cached.tujuan_nama || cached.bttt_tujuannama || '',
                        tujuan_kota: cached.tujuan_kota || cached.bttt_tujuankota || '',
                        server_id: cached.asal_agen_id || '1'
                    });
                }
                setItems(generated);
                setBttInfo({ bttt_id: bttId, bttt_jmlunit: jml });
                if (t === 0) setToKoli(jml);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKoliData(1, 0);
    }, [bttId]);

    const handleRefreshRange = () => {
        fetchKoliData(Number(fromKoli) || 1, Number(toKoli) || 0);
    };

    const handleResetRange = () => {
        const maxJml = bttInfo?.bttt_jmlunit || 0;
        setFromKoli(1);
        setToKoli(maxJml);
        setEmptySlots(0);
        fetchKoliData(1, 0);
    };

    // =========================================================================
    // 🖨️ CETAK BERSIH VIA POPUP WINDOW (BEBAS SCROLLBAR & MENCETAK SEMUA HALAMAN)
    // =========================================================================
    const handlePrintLabels = () => {
        const printArea = document.getElementById('barcode-print-area');
        if (!printArea) {
            window.print();
            return;
        }

        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map((el) => el.outerHTML)
            .join('\n');

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            alert('Pop-up browser terblokir! Mohon izinkan pop-up untuk mencetak label.');
            return;
        }

        const isZebra = printMode === 'ZEBRA';

        printWindow.document.open();
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cetak Label Barcode Koli - ${bttId}</title>
                ${styles}
                <style>
                    @page {
                        size: ${isZebra ? '80mm 50mm' : 'A4 portrait'};
                        margin: ${isZebra ? '0mm' : '5mm'};
                    }
                    * {
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        height: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        overflow: visible !important;
                    }
                    .print-sheet {
                        box-shadow: none !important;
                        border: none !important;
                        padding: 0 !important;
                        margin: ${isZebra ? '0' : '0 auto'} !important;
                        width: ${isZebra ? '100%' : '793px'} !important;
                    }
                    .label-card {
                        border-color: transparent !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    ${isZebra ? `
                    .zebra-sheet {
                        display: block !important;
                        width: 100% !important;
                    }
                    .zebra-label-item {
                        width: 100% !important;
                        height: 49mm !important;
                        margin: 0 !important;
                        padding: 2mm 3mm !important;
                        border: none !important;
                        page-break-after: always !important;
                        break-after: page !important;
                    }
                    .zebra-label-item:last-child {
                        page-break-after: auto !important;
                        break-after: auto !important;
                    }
                    ` : ''}
                </style>
            </head>
            <body>
                ${printArea.innerHTML}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 350);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (loading) {
        return <div className="p-10 text-center font-bold text-slate-600">Memuat label barcode koli {bttId}...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-100 p-4 font-serif text-slate-900">
            {/* PANEL PENGATURAN CETAK */}
            <div className="no-print max-w-[820px] mx-auto mb-5 bg-white border border-slate-300 rounded-2xl shadow-md p-4 font-sans text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                        <h2 className="font-black text-sm text-indigo-950 uppercase">
                            PENGATURAN CETAK LABEL BARCODE KOLI — BTT: {bttId}
                        </h2>
                        <p className="text-[11px] text-slate-500">
                            Gunakan <b>Tambah Ruang</b> untuk melompati stiker yang sudah terpakai pada kertas label A4.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={printMode}
                            onChange={(e) => setPrintMode(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 bg-slate-50 cursor-pointer"
                        >
                            <option value="A4">Format Kertas A4 (3 Kolom)</option>
                            <option value="ZEBRA">Format Printer Thermal Zebra</option>
                        </select>

                        <button
                            type="button"
                            onClick={handlePrintLabels}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow flex items-center gap-1.5 cursor-pointer"
                        >
                            <Printer size={15} /> CETAK LABEL
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-3">
                    {/* Kontrol Spacer Kertas Label */}
                    {printMode === 'A4' && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setEmptySlots((prev) => prev + 1)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                            >
                                <PlusSquare size={14} className="text-sky-600" /> Tambah Ruang ({emptySlots})
                            </button>
                            <button
                                type="button"
                                onClick={() => setEmptySlots((prev) => Math.max(0, prev - 1))}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                            >
                                <MinusSquare size={14} className="text-rose-600" /> Hapus Ruang
                            </button>
                        </div>
                    )}

                    {/* Filter Urutan Koli */}
                    <div className="flex items-center gap-2 ml-auto">
                        <span className="font-bold text-slate-600">Cetak Urutan Ke:</span>
                        <input
                            type="number"
                            min={1}
                            value={fromKoli}
                            onChange={(e) => setFromKoli(e.target.value)}
                            className="w-16 p-1.5 border border-slate-300 rounded-lg text-center font-bold"
                        />
                        <span className="font-bold text-slate-600">Sampai:</span>
                        <input
                            type="number"
                            min={1}
                            value={toKoli}
                            onChange={(e) => setToKoli(e.target.value)}
                            className="w-16 p-1.5 border border-slate-300 rounded-lg text-center font-bold"
                        />
                        <button
                            type="button"
                            onClick={handleRefreshRange}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                            <RefreshCw size={13} /> Refresh
                        </button>
                        <button
                            type="button"
                            onClick={handleResetRange}
                            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg cursor-pointer"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* AREA KERTAS CETAK (DIAMBIL OLEH handlePrintLabels) */}
            <div id="barcode-print-area">
                {printMode === 'A4' ? (
                    /* LAYOUT A4 (3 KOLOM) */
                    <div className="print-sheet bg-white mx-auto shadow-lg border border-slate-200 p-2 grid grid-cols-3 gap-2" style={{ width: '793px' }}>
                        {/* Slot Kosong (Spacer) */}
                        {Array.from({ length: emptySlots }).map((_, idx) => (
                            <div key={`empty-${idx}`} className="label-card border border-dashed border-slate-300 rounded flex items-center justify-center text-slate-300 text-xs font-sans" style={{ height: '254px' }}>
                                [ Ruang Kosong #{idx + 1} ]
                            </div>
                        ))}

                        {/* Kartu Label Koli */}
                        {items.map((koli) => (
                            <div
                                key={koli.koli_id}
                                className="label-card border border-dashed border-slate-300 p-2 text-center flex flex-col justify-between bg-white"
                                style={{ height: '254px' }}
                            >
                                <div className="pt-2">
                                    <p className="text-[11px] leading-tight">Asal: {koli.agen_asal}</p>
                                    <p className="text-[11px] font-mono leading-tight">{koli.koli_id}</p>
                                </div>

                                <div className="flex justify-center my-0.5">
                                    <Barcode value={koli.koli_id} format="CODE128" width={1.25} height={42} displayValue={false} margin={0} />
                                </div>

                                <div>
                                    <p className="text-[11px] uppercase leading-tight">TUJUAN {koli.agen_tujuan}</p>
                                    <p className="text-[15px] font-bold leading-tight mt-0.5">BTT : {koli.bttt_id}</p>
                                    <p className="text-[12px] leading-tight mt-0.5">
                                        Penerima : <b className="uppercase">{koli.tujuan_nama}</b>
                                    </p>
                                </div>

                                <div className="grid grid-cols-12 items-center pt-1">
                                    <div className="col-span-3 flex justify-center">
                                        <div className="border-2 border-black p-1 inline-flex flex-col items-center">
                                            <div className="flex gap-0.5">
                                                <ArrowUp size={13} strokeWidth={3} />
                                                <ArrowUp size={13} strokeWidth={3} />
                                            </div>
                                            <div className="w-6 h-[2px] bg-black mt-0.5" />
                                        </div>
                                    </div>

                                    <div className="col-span-4 flex justify-center">
                                        <QRCodeSVG value={koli.koli_id} size={58} level="M" />
                                    </div>

                                    <div className="col-span-5 text-left pl-1">
                                        <p className="text-[14px] font-bold leading-none mb-1.5">
                                            {koli.urutan} / {koli.total_koli} Koli
                                        </p>
                                        <img
                                            src="/src/assets/new_logo 2.png"
                                            alt="Dakota"
                                            className="h-3.5 object-contain"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                        <p className="text-[7.5px] leading-tight">www.dakotacargo.co.id</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* LAYOUT ZEBRA / HONEYWELL THERMAL */
                    <div className="print-sheet zebra-sheet mx-auto space-y-3" style={{ width: '300px' }}>
                        {items.map((koli) => (
                            <div
                                key={koli.koli_id}
                                className="label-card zebra-label-item bg-white border border-slate-300 p-2 text-slate-900 flex flex-col justify-between"
                                style={{ width: '280px', height: '185px' }}
                            >
                                <div className="text-center text-[10px] font-bold uppercase leading-none">
                                    ASAL {koli.agen_asal}
                                </div>

                                <div className="grid grid-cols-12 items-center my-0.5">
                                    <div className="col-span-4 text-center leading-none">
                                        <div className="text-[22px] font-black">{koli.urutan}/</div>
                                        <div className="text-[10px] font-bold">{koli.total_koli}</div>
                                        <div className="text-[9px]">Koli</div>
                                    </div>
                                    <div className="col-span-8 text-right">
                                        <div className="text-[11px] font-mono font-bold leading-none mb-0.5">{koli.koli_id}</div>
                                        <div className="flex justify-end">
                                            <Barcode value={koli.koli_id} format="CODE128" width={1.05} height={32} displayValue={false} margin={0} />
                                        </div>
                                        <div className="text-[8.5px] font-bold mt-0.5">
                                            {koli.server_id} | Kota : {koli.tujuan_kota}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 items-center gap-1 pt-0.5">
                                    <div className="col-span-5 flex justify-center">
                                        <QRCodeSVG value={koli.koli_id} size={66} level="M" />
                                    </div>
                                    <div className="col-span-7 text-left leading-tight">
                                        <div className="text-[8px]">Tujuan :</div>
                                        <div className="text-[10.5px] font-black uppercase truncate">{koli.agen_tujuan}</div>
                                        <div className="text-[8px]">To :</div>
                                        <div className="text-[9px] font-bold uppercase line-clamp-1">{koli.tujuan_nama}</div>

                                        <div className="flex items-center justify-between mt-1">
                                            <div>
                                                <img
                                                    src="/src/assets/new_logo 2.png"
                                                    alt="Dakota"
                                                    className="h-3 object-contain"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                                <div className="text-[7px]">www.dakotacargo.co.id</div>
                                            </div>
                                            <div className="border border-black p-0.5 inline-flex flex-col items-center">
                                                <div className="flex">
                                                    <ArrowUp size={10} strokeWidth={3} />
                                                    <ArrowUp size={10} strokeWidth={3} />
                                                </div>
                                                <div className="w-4 h-[1.5px] bg-black" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BttBarcodePrintPage;