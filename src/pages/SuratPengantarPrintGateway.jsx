import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const SuratPengantarPrintGateway = () => {
    const [noSP, setNoSP] = useState('');
    const navigate = useNavigate();
    const inputRef = useRef(null);

    // Otomatis focus kursor ke input box begitu halaman dibuka (Scanner Ready!)
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const handleExecutePrint = (e) => {
        if (e) e.preventDefault();
        if (!noSP.trim()) return;

        // Banting rute langsung ke halaman template cetak dengan menyertakan ID SP riil!
        navigate(`/operasional/sp-terima/print-nota/${noSP.trim().toUpperCase()}`);
    };

    const handleScannerKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleExecutePrint(); // Laser scanner otomatis memicu submit cetak!
        }
    };

    return (
        <div className="space-y-6 text-slate-800">
            <div className="p-6 max-w-md mx-auto rounded-xl border border-gray-200 bg-white shadow-sm text-xs font-semibold mt-10">
                
                <div className="text-center mb-6">
                    <span className="bg-blue-600 text-white px-6 py-2 font-black text-sm rounded shadow-sm tracking-widest uppercase">
                        GATEWAY CETAK MANIFEST SP
                    </span>
                </div>

                <form onSubmit={handleExecutePrint} className="space-y-4">
                    <div className="space-y-2">
                        <label className="block text-gray-500 uppercase tracking-wider font-bold">
                            Masukkan / Scan Nomor SP:
                        </label>
                        <input
                            ref={inputRef}
                            type="text"
                            maxLength={15}
                            placeholder="Tembak Barcode Surat Pengiriman..."
                            value={noSP}
                            onChange={(e) => setNoSP(e.target.value)}
                            onKeyDown={handleScannerKeyPress}
                            className="w-full p-3 border border-gray-300 rounded-lg bg-transparent outline-none uppercase font-black text-sm tracking-widest text-blue-600 focus:border-blue-500 text-center"
                        />
                        <p className="text-[10px] text-gray-400 italic text-center mt-1">
                            Arahkan mesin laser scanner ke barcode dokumen SP atau ketik manual lalu enter
                        </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="submit"
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow transition uppercase tracking-wider"
                        >
                            Cetak SP
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
};

export default SuratPengantarPrintGateway;