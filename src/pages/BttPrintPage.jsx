import React, { useEffect, useState } from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import dakotaLogo from '../assets/logo.png';

const BttPrintPage = () => {
  const [bttData, setBttData] = useState(null);
  const [bttNum, setBttNum] = useState('');
  const [waktuCetak, setWaktuCetak] = useState('00:00:00');

  useEffect(() => {
    const rawData = localStorage.getItem('print_btt_payload');
    const rawNum = localStorage.getItem('print_btt_number');

    if (rawData) {
      const parsedData = JSON.parse(rawData);
      setBttData(parsedData);
      setBttNum(rawNum || parsedData.bttt_id || parsedData.no_btt || '');

      const sekarang = new Date();
      const jamStr = String(sekarang.getHours()).padStart(2, '0');
      const menitStr = String(sekarang.getMinutes()).padStart(2, '0');
      const detikStr = String(sekarang.getSeconds()).padStart(2, '0');
      setWaktuCetak(`${jamStr}:${menitStr}:${detikStr}`);

      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, []);

  if (!bttData) return <div className="p-10 font-bold text-center">Memuat dokumen cetak resi Dakota Cargo...</div>;

  // Tanggal Terima Estimasi (BTT Tanggal + Lead Time)
  const hitungTanggalTerimaObj = () => {
    try {
      if (!bttData.bttt_tanggal) return new Date();
      const komponen = bttData.bttt_tanggal.split('-');
      const d = new Date(parseInt(komponen[0], 10), parseInt(komponen[1], 10) - 1, parseInt(komponen[2], 10));
      const leadTime = parseInt(bttData.estimasihari || 2, 10);
      d.setDate(d.getDate() + leadTime);
      return d;
    } catch {
      return new Date();
    }
  };

  const tglTerimaObj = hitungTanggalTerimaObj();
  const tglTerimaStr = tglTerimaObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const tglWajibKembaliStr = tglTerimaObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const dapatkanTanggalKirimFormat = () => {
    try {
      const komponen = bttData.bttt_tanggal.split('-');
      return `${parseInt(komponen[2])}/${parseInt(komponen[1])}/${komponen[0]}`;
    } catch {
      return new Date().toLocaleDateString('id-ID');
    }
  };

  const rawKetDb = (bttData.keterangan_csv || bttData.bttt_ket || '').trim();
  const cleanKet = rawKetDb
    .replace(/\[B\.PACKING:.*?\]/gi, '')
    .replace(/^.*?\(\d+\s*KOLI\)\s*-\s*CABANG:\s*[^\s-]+(?:\s*-\s*CARTER:\s*[^\n]+)?\s*/i, '')
    .trim();

  const hasilMappingDO = (bttData.ket_do_kembali || '').trim();

  const usernameMarketing = bttData.username || localStorage.getItem('user_nama') || localStorage.getItem('username') || 'SUPERDLI';
  const layananText = bttData.bttt_layanan_nama || (bttData.bttt_paketyn === 'Y' ? 'REGULER' : 'CARTER');
  const keteranganFinal = bttData.bttt_ket || '';

  // 🌟 Validasi: Deteksi apakah isi kiriman mengandung kata 'CHEMICALS' / 'CHEMICAL'
  const teksKiriman = (bttData.bttt_isikiriman || '').toUpperCase();
  // const isDangerousGoods = teksKiriman.includes('CHEMICAL');

  // 🌟 1. Keterangan Atas: Berasal dari mapping storagecode (Default: DO Asli/Copy Kembali Jatiasih)
  const keteranganAtas = cleanKet || rawKetDb || '-';

  // 🌟 2. Keterangan Bawah: Berasal dari teks kolom keterangan di CSV
  const keteranganBawah = hasilMappingDO || '';

  // 🌟 3. Biaya Packing: Dari kolom packing file CSV
  const biayaPacking = parseFloat(bttData.bttt_biayapacking || bttData.biaya_packing || 0);

  // 🌟 1. EKSTRAK ISI KIRIMAN & JUMLAH KOLI DARI KETERANGAN JIKA MASIH DEFAULT
  const rawKetAll = `${bttData.lampiran_keterangan || ''} ${bttData.bttt_ket || ''}`.trim();
  const matchKetBarangKoli = rawKetAll.match(/^([A-Z0-9\s/&-]+?)\s*\((\d+)\s*KOLI\)/i);

  let isiKirimanFinal = (bttData.bttt_isikiriman || '').trim();
  if ((!isiKirimanFinal || isiKirimanFinal.toUpperCase() === 'PRODUK FARMASI / KESEHATAN') && matchKetBarangKoli) {
    isiKirimanFinal = matchKetBarangKoli[1].trim().toUpperCase();
  }
  if (!isiKirimanFinal) isiKirimanFinal = 'PRODUK FARMASI / KESEHATAN';

  let jumlahKoliFinal = parseInt(bttData.bttt_jmlkoli, 10) || 0;
  if (jumlahKoliFinal <= 1 && matchKetBarangKoli) {
    const parsedKoliFromKet = parseInt(matchKetBarangKoli[2], 10);
    if (parsedKoliFromKet > 0) jumlahKoliFinal = parsedKoliFromKet;
  }
  if (jumlahKoliFinal < 1) jumlahKoliFinal = 1;

  // 🌟 2. MAPPING TUJUAN WILAYAH (PROVINSI) DARI DB / ALAMAT / KOTA PENERIMA
  const resolveTujuanWilayah = () => {
    const propDb = (bttData.bttt_tujuanpropinsi || '').trim().toUpperCase();
    if (propDb && propDb !== '-') return propDb;

    const fullDestText = `${bttData.bttt_tujuanalamat || ''} ${bttData.bttt_tujuankota || ''}`.toUpperCase();
    const daftarProvinsi = [
      'DKI JAKARTA', 'JAWA BARAT', 'BANTEN', 'JAWA TENGAH', 'DI YOGYAKARTA', 'YOGYAKARTA', 'JAWA TIMUR',
      'ACEH', 'SUMATERA UTARA', 'SUMATERA BARAT', 'RIAU', 'KEPULAUAN RIAU', 'JAMBI', 'SUMATERA SELATAN',
      'BENGKULU', 'LAMPUNG', 'KEPULAUAN BANGKA BELITUNG', 'BALI', 'NUSA TENGGARA BARAT', 'NUSA TENGGARA TIMUR',
      'KALIMANTAN BARAT', 'KALIMANTAN TENGAH', 'KALIMANTAN SELATAN', 'KALIMANTAN TIMUR', 'KALIMANTAN UTARA',
      'SULAWESI UTARA', 'SULAWESI TENGAH', 'SULAWESI SELATAN', 'SULAWESI TENGGARA', 'GORONTALO', 'SULAWESI BARAT',
      'MALUKU', 'MALUKU UTARA', 'PAPUA', 'PAPUA BARAT'
    ];
    const foundProv = daftarProvinsi.find((p) => fullDestText.includes(p));
    if (foundProv) return foundProv;

    const kota = (bttData.bttt_tujuankota || '').toUpperCase();
    if (/BEKASI|BOGOR|DEPOK|BANDUNG|CIMAHI|CIKARANG|KARAWANG|PURWAKARTA|SUBANG|SUKABUMI|CIANJUR|GARUT|TASIKMALAYA|CIAMIS|BANJAR|KUNINGAN|CIREBON|MAJALENGKA|SUMEDANG|INDRAMAYU/.test(kota)) {
      return 'JAWA BARAT';
    }
    if (/JAKARTA/.test(kota)) return 'DKI JAKARTA';
    if (/TANGERANG|SERANG|CILEGON|LEBAK|PANDEGLANG/.test(kota)) return 'BANTEN';
    if (/SEMARANG|SOLO|SURAKARTA|MAGELANG|PEKALONGAN|TEGAL|SALATIGA|BANYUMAS|PURWOKERTO|CILACAP|KUDUS|JEPARA|PATI|KLATEN|SUKOHARJO|BOYOLALI|SRAGEN|WONOGIRI|KARANGANYAR|KEBUMEN|PURWOREJO|WONOSOBO|TEMANGGUNG|KENDAL|BATANG|PEMALANG|BREBES/.test(kota)) {
      return 'JAWA TENGAH';
    }
    if (/YOGYAKARTA|SLEMAN|BANTUL|GUNUNGKIDUL|KULON PROGO/.test(kota)) return 'DI YOGYAKARTA';
    if (/SURABAYA|SIDOARJO|GRESIK|MALANG|BATU|PASURUAN|PROBOLINGGO|MOJOKERTO|JOMBANG|KEDIRI|BLITAR|TULUNGAGUNG|NGANJUK|MADIUN|NGAWI|MAGETAN|PONOROGO|PACITAN|BOJONEGORO|TUBAN|LAMONGAN|JEMBER|BANYUWANGI|BONDOWOSO|SITUBONDO|LUMAJANG|BANGKALAN|SAMPANG|PAMEKASAN|SUMENEP/.test(kota)) {
      return 'JAWA TIMUR';
    }
    return '-';
  };
  const tujuanWilayahFinal = resolveTujuanWilayah();

  // 🌟 Validasi: Deteksi apakah isi kiriman mengandung kata 'CHEMICALS' / 'CHEMICAL'
  const isDangerousGoods = isiKirimanFinal.toUpperCase().includes('CHEMICAL');
  const tipeLembaran = [
    { label: "Untuk Pengirim", kasta: "Lembar 1 dari 3", isHarga: true, isStempel: false },
    { label: "Kembali Ke Cab. Pengirim", kasta: "Lembar 2 dari 3", isHarga: false, isStempel: true },
    { label: "Untuk Arsip", kasta: "Lembar 3 dari 3", isHarga: false, isStempel: false }
  ];

  return (
    <div className="bg-white text-slate-900 font-sans text-[9px] leading-tight p-0">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 6mm 4mm 6mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print { display: none !important; }
          .invoice-box {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
        .separator-line {
          border-top: 1px dashed #94a3b8;
          margin: 3px 0;
          position: relative;
        }
          .watermark-stamp {
              opacity: 1 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }

          .watermark-stamp {
            pointer-events: none;
            user-select: none;
          }
      `}</style>

      {/* TOOLBAR NO-PRINT */}
      <div className="no-print mb-4 p-3 bg-blue-50 rounded-xl flex justify-between items-center border border-blue-200 max-w-[850px] mx-auto">
        <span className="font-bold text-blue-800 text-xs">Doc ID: {bttNum} 📄 Mode Cetak Bukti Tanda Terima (BTT) 3 Rangkap</span>
        <button onClick={() => window.print()} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 cursor-pointer text-xs">
          Cetak Dokumen BTT
        </button>
      </div>

      {/* CONTAINER A4 */}
      <div className="w-full max-w-[850px] mx-auto flex flex-col justify-between bg-white" style={{ height: '286mm' }}>
        {tipeLembaran.map((item, index) => (
          <React.Fragment key={index}>
            <div className="invoice-box border border-slate-300 p-2.5 bg-white rounded-xl relative flex flex-col justify-between overflow-hidden" style={{ height: '91mm' }}>

              {/* 🌟 1. STEMPEL DANGEROUS GOODS (KHUSUS LEMBAR 1 JIKA ISI KIRIMAN CHEMICALS) */}
              {index === 0 && isDangerousGoods && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-30"
                  style={{ top: '10mm', bottom: '5mm' }}
                >
                  <div
                    className="transform -rotate-[16deg] border-[6px] border-amber-600 rounded-2xl px-12 py-3 text-center bg-white/30"
                    style={{
                      opacity: 0.30,
                      mixBlendMode: 'multiply'
                    }}
                  >
                    <span className="block font-black text-amber-600 text-[32px] tracking-[4px] uppercase leading-none font-mono">
                      DANGEROUS GOODS
                    </span>
                    <span className="block font-black text-amber-700 text-[16px] tracking-[2px] mt-1 uppercase font-mono">
                      [ B3 - CHEMICALS HAZARDOUS ]
                    </span>
                  </div>
                </div>
              )}

              {/* 🌟 STEMPEL CAP BASAH TIMPA DI ATAS (FOREGROUND OVERLAY 50% OPACITY) */}
              {item.isStempel && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none select-none overflow-hidden">
                  <div
                    className="transform -rotate-[16deg] border-[5px] border-red-600 rounded-2xl px-8 py-2.5 text-center bg-transparent"
                    style={{
                      opacity: 0.30,
                      mixBlendMode: 'multiply' // Efek cap tinta menyatu natural dengan kertas & teks di bawahnya
                    }}
                  >
                    <span className="block font-black text-red-600 text-[26px] tracking-[3px] uppercase leading-none font-mono">
                      DOKUMEN WAJIB KEMBALI
                    </span>
                    <span className="block font-black text-red-600 text-[15px] tracking-[1.5px] mt-1 uppercase font-mono">
                      SEBELUM : {tglWajibKembaliStr}
                    </span>
                  </div>
                </div>
              )}

              {/* 🌟 1. HEADER ALAMAT RESMI DLI PUSAT (ANTI TUMPANG TINDIH) */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-1.5">
                <div className="flex gap-2.5 items-center max-w-[62%]">
                  <img
                    src={dakotaLogo}
                    alt="Dakota Cargo Logo"
                    className="w-24 h-auto object-contain shrink-0"
                  />
                  <div className="text-left">
                    <span className="text-[11.5px] font-black block text-slate-900 tracking-tight uppercase leading-none mb-0.5">
                      DAKOTA LOGISTIK INDONESIA (DLI)
                    </span>
                    <span className="font-extrabold block text-slate-800 text-[9.5px] uppercase leading-tight">
                      DLI PUSAT
                    </span>
                    <span className="text-[8px] text-slate-600 block leading-tight font-medium">
                      Jl. Wibawa Mukti II No. 8 Jatiasih, Bekasi
                    </span>
                    <span className="text-[8px] text-slate-600 block leading-tight">
                      BEKASI KOTA - Telp: (021) 8603278 / (021) 86608589
                    </span>
                  </div>
                </div>

                {/* BARCODE ATAS NOMOR RESI */}
                <div className="flex flex-col items-end justify-center">
                  <span className="font-mono text-[7.5px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">[ NOMOR RESI PENGIRIMAN ]</span>
                  <Barcode value={bttNum} format="CODE128" width={1.2} height={20} displayValue={false} margin={0} />
                  <span className="font-mono font-black text-xs tracking-widest text-slate-900 mt-0.5">{bttNum}</span>
                </div>
              </div>

              {/* 2. BARIS TRACKING INFORMASI DASAR */}
              <div className="grid grid-cols-5 gap-2 bg-slate-50 p-1.5 border border-slate-200 rounded-md font-bold text-slate-700 text-left text-[8px]">
                <div>
                  <span className="text-gray-400 block font-normal uppercase text-[7px]">TGL KIRIM :</span>
                  <span className="text-slate-900 font-black font-mono">{dapatkanTanggalKirimFormat()} {waktuCetak}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-normal uppercase text-[7px]">EST. TGL TERIMA :</span>
                  <span className="text-indigo-700 font-black">{tglTerimaStr}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-normal uppercase text-[7px]">CAB. PENGIRIM :</span>
                  <span className="text-slate-900 font-extrabold uppercase">DLI PUSAT</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-normal uppercase text-[7px]">CAB. PENERIMA :</span>
                  <span className="text-slate-900 font-extrabold uppercase">{bttData.bttt_tujuankota || ''}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-normal uppercase text-[7px]">TUJUAN WILAYAH :</span>
                  <span className="text-amber-700 font-black uppercase">{tujuanWilayahFinal}</span>
                </div>
              </div>

              {/* 3. BARIS STATUS MANIFEST */}
              <div className="grid grid-cols-12 gap-1 bg-white p-1 border border-slate-200 rounded-md font-bold text-slate-600 text-left text-[8px]">
                <div className="col-span-4">
                  Layanan: <span className="text-indigo-600 font-black">{layananText}</span><br />
                  Pembayaran: <span className="text-emerald-600 font-black">{bttData.bttt_jenisharga === '0' ? 'TUNAI' : bttData.bttt_jenisharga === '2' ? 'KREDIT' : 'TAGIH TUJUAN'}</span>
                </div>
                <div className="col-span-4">
                  Kiriman: <span className="uppercase text-slate-900 font-black">{isiKirimanFinal}</span><br />
                  Via: <span className="text-amber-600 font-black">DARAT</span>
                </div>
                <div className="col-span-4 text-right">
                  {item.kasta}<br />
                  <span className="text-purple-700 uppercase font-mono text-[7.5px] font-black bg-purple-50 px-1 py-0.5 rounded border border-purple-200 inline-block">
                    {item.label}
                  </span>
                </div>
              </div>

              {/* 4. ALAMAT PENGIRIM & PENERIMA (DILENGKAPI BAPAK BONY SEBAGAI UP PENERIMA) */}
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="p-1.5 bg-slate-50/50 border border-slate-200 rounded-lg space-y-0.5">
                  <div className="font-black text-red-600 text-[7.5px] uppercase">[ PENGIRIM ]</div>
                  <div className="font-black text-slate-900 text-[9.5px] leading-tight">{bttData.bttt_asalname || ''}</div>
                  <div className="font-mono text-slate-700 font-bold text-[7.5px]">{bttData.bttt_asaltelp || ''}</div>
                  <div className="text-slate-500 uppercase font-medium text-[7.5px] leading-tight truncate">
                    {bttData.bttt_asalalamat || ''}
                  </div>
                </div>

                <div className="p-1.5 bg-slate-50/50 border border-slate-200 rounded-lg space-y-0.5">
                  <div className="font-black text-blue-600 text-[7.5px] uppercase">[ PENERIMA ]</div>
                  <div className="font-black text-slate-900 text-[9.5px] leading-tight">
                    {bttData.bttt_tujuannama || ''}
                    {bttData.bttt_up_penerima && (
                      <span className="text-slate-700 font-bold ml-1 text-[8.5px]">
                        (UP: {bttData.bttt_up_penerima})
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-slate-700 font-bold text-[7.5px]">{bttData.bttt_tujuantelp || ''}</div>
                  <div className="text-slate-500 uppercase font-medium text-[7.5px] leading-tight line-clamp-1">
                    {bttData.bttt_tujuanalamat || ''}
                  </div>
                </div>
              </div>

              {/* 5. RINCIAN TABEL FISIK, KETERANGAN LENGKAP & STEMPEL DOKUMEN WAJIB KEMBALI */}
              <div className="grid grid-cols-12 gap-2.5 items-start text-left relative">

                {/* Tabel Fisik & Info Kiriman Lengkap (Sesuai Gambar 6) */}
                <div className="col-span-7 space-y-1">
                  <table className="w-full text-center border-collapse border border-gray-300 text-[8px]">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-slate-600 border-b border-gray-300">
                        <th className="p-1 border-r border-gray-300">Jumlah Koli</th>
                        <th className="p-1 border-r border-gray-300">Berat Asli</th>
                        <th className="p-1 border-r border-gray-300">Berat Volume</th>
                        <th className="p-1">Volume Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="font-black text-slate-800">
                        <td className="p-1 border-r border-gray-300 bg-slate-50/50">{jumlahKoliFinal} Koli</td>
                        <td className="p-1 border-r border-gray-300">{bttData.bttt_berat || 0} kg</td>
                        <td className="p-1 border-r border-gray-300">{bttData.bttt_beratvol || 0} kg</td>
                        <td className="p-1">{bttData.bttt_ukuran || 0} m³</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* KOTAK RINCIAN DETAIL (ISI KIRIMAN, KETERANGAN, JENIS HARGA) */}
                  <div className="p-1.5 border border-slate-200 rounded bg-slate-50/50 text-[7.5px] font-semibold text-slate-700 leading-tight space-y-0.5">
                    <div><b>Isi Kiriman :</b> {isiKirimanFinal}</div>
                    <div><b>Keterangan :</b> {keteranganAtas}</div>
                    <div><b>Jenis Harga :</b> {bttData.bttt_jeniskiriman || 'BERAT'}</div>
                  </div>
                </div>

                {/* Kolom Kanan: Rincian Biaya (Lembar 1) ATAU Kotak Tanda Terima (Lembar 2 & 3) */}
                {item.isHarga ? (
                  <div className="col-span-5 bg-slate-50 p-2 rounded-lg border border-gray-200 text-[8px] font-bold space-y-0.5 text-slate-600">
                    <div className="flex justify-between">
                      <span>Biaya Kirim :</span>
                      <span className="font-mono text-slate-900">Rp {Math.round(bttData.bttt_harga || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Biaya Penerus :</span>
                      <span className="font-mono text-slate-900">Rp {Math.round(bttData.bttt_biayapenerus || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Packing :</span>
                      <span className="font-mono text-slate-900">Rp {Math.round(bttData.bttt_biayapacking || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-slate-950 font-black text-[9.5px] pt-1 border-t border-dashed border-slate-300">
                      <span>Total Biaya :</span>
                      <span className="font-mono text-indigo-700">
                        {/* Rp {Math.round((parseFloat(bttData.bttt_harga) || 0) + (parseFloat(bttData.bttt_biayapenerus) || 0) + (parseFloat(bttData.bttt_biayapacking) || 0)).toLocaleString('id-ID')} */}
                        Rp {Math.round((parseFloat(bttData.bttt_harga) || 0) + (parseFloat(bttData.bttt_biayapenerus) || 0) + (parseFloat(biayaPacking) || 0)).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="col-span-5 bg-slate-50 p-2 rounded-lg border border-slate-300 text-center flex flex-col justify-between" style={{ minHeight: '68px' }}>
                    <div className="font-bold text-slate-800 text-[7.5px] leading-tight uppercase">
                      DENGAN INI BARANG / PAKET KIRIMAN SUDAH DITERIMA DALAM KONDISI BAIK OLEH :
                    </div>
                    <div className="text-[7px] font-bold text-slate-500 uppercase mt-0.5">
                      PARAF & NAMA JELAS PENERIMA
                    </div>
                    <div className="mt-3 border-b border-dashed border-slate-400 w-32 mx-auto"></div>
                    <div className="text-[7px] text-slate-400 mt-0.5">[ ............................................. ]</div>
                  </div>
                )}


              </div>

              {/* 🌟 6. BARIS LAMPIRAN SESUAI PERMINTAAN (GAMBAR 5 & 6) */}
              <div className="p-1 border border-dashed border-slate-300 rounded bg-slate-50/70 text-[7.5px] font-bold text-slate-700 text-left space-y-0.5">
                <div>
                  <span className="text-slate-500">Lampiran Surat Jalan :</span>{' '}
                  <span className="font-mono text-indigo-700">{bttData.bttt_nosuratjalan || ''}</span>
                </div>
                <div>
                  <span className="text-slate-500">Lampiran Keterangan :</span>{' '}
                  <span className="text-slate-900 font-extrabold">{keteranganBawah}</span> |{' '}
                  <span className="text-slate-500">Layanan:</span>{' '}
                  <span className="text-indigo-700 font-extrabold">{layananText}</span>
                </div>
              </div>

              {/* 7. FOOTER SIGNATURE & QR TRACKING */}
              <div className="flex justify-between items-end text-[7px] font-semibold text-slate-400 pt-0.5">
                <div className="text-left leading-tight max-w-[38%]">
                  <div>Pelacakan kiriman secara live: <span className="text-blue-600 underline">www.dakotacargo.co.id</span></div>
                  <div className="text-[6.5px] text-slate-400 mt-0.5">Terima kasih telah mempercayakan jasa layanan kami.</div>
                </div>

                <div className="flex items-center gap-1.5 border border-slate-200 p-0.5 rounded bg-white shadow-2xs">
                  <QRCodeSVG value={`https://www.dakotacargo.co.id/tracking?id=${bttNum}`} size={26} level={"M"} />
                  <span className="font-mono text-[6px] text-slate-500 font-bold leading-none text-left">SCAN<br />TRACKING</span>
                </div>

                {item.isHarga ? (
                  <div className="flex gap-3 text-center font-bold text-slate-600 uppercase text-[7.5px]">
                    <div>
                      MARKETING
                      <div className="h-3.5"></div>
                      <div className="border-b border-gray-300 w-16 font-mono text-[6.5px] text-indigo-600 uppercase">
                        [{usernameMarketing}]
                      </div>
                    </div>
                    <div>CUSTOMER<div className="h-3.5"></div><div className="border-b border-gray-300 w-16"></div></div>
                    <div>PENERIMA<div className="h-3.5"></div><div className="border-b border-gray-300 w-16"></div></div>
                  </div>
                ) : (
                  <div className="flex gap-4 text-center font-bold text-slate-600 uppercase text-[7px]">
                    <div>
                      PENGANTAR PAKET
                      <div className="h-3.5"></div>
                      <div className="border-b border-gray-300 w-20 text-[6px] text-slate-400">(Paraf & Nama Kurir)</div>
                    </div>
                    <div>
                      CUSTOMER
                      <div className="h-3.5"></div>
                      <div className="border-b border-gray-300 w-20 text-[6px] text-slate-400">(Paraf & Nama Pengirim)</div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* GARIS GUNTING ANTAR LEMBAR */}
            {index < 2 && (
              <div className="separator-line no-print">
                <span className="absolute left-1/2 -top-2 -translate-x-1/2 bg-white px-2 text-[7px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  ✂️ Gunting Batas Potongan Lembaran Rangkap
                </span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default BttPrintPage;