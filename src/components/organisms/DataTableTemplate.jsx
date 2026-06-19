import React, { useState } from 'react';
import { Plus, Filter, Search, Copy, MapPin, Building2, ShieldCheck, Edit, Trash2, Eye, EyeOff, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

// 🟢 FIX UTAMA: Ditambahkan 'actionMode' ke dalam list parameter agar dikenali oleh sistem!
const DataTableTemplate = ({ title, columns, data, onAdd, onEdit, onDelete, renderExtraActions, loading, isDarkMode, actionMode }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // 1. Logika Search
    const filteredData = data.filter(item =>
        Object.values(item).some(val => 
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    // 2. Logika Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;

    // Definisi Warna berdasarkan Mode
    const theme = {
        bg: isDarkMode ? 'bg-[#1e293b]' : 'bg-[#f8fafc]',
        card: isDarkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-gray-100',
        text: isDarkMode ? 'text-slate-200' : 'text-gray-800',
        textMuted: isDarkMode ? 'text-slate-400' : 'text-gray-500',
        tableHead: isDarkMode ? 'bg-slate-800/50 text-slate-300' : 'bg-gray-50/50 text-gray-800',
        border: isDarkMode ? 'border-slate-700' : 'border-gray-100',
        hover: isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50/50',
    };

    const startIndex = (currentPage - 1) * itemsPerPage; 
    const currentItems = filteredData.slice(startIndex, startIndex + itemsPerPage);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    const getPaginationGroup = () => {
        const sideNeighbors = 1; 
        const pages = [];

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (currentPage > totalPages - 3) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - sideNeighbors, currentPage, currentPage + sideNeighbors, '...', totalPages);
            }
        }
        return pages;
    };

    return (
        <div className={`p-8 min-h-screen transition-all duration-300 ${theme.bg} ${theme.text} font-['Inter']`}>
            {/* HEADER: Button & Filter di Atas */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex gap-4">
                    <button 
                        onClick={onAdd} 
                        className="flex items-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold transition-all shadow-sm"
                    >
                        <Plus size={18} /> {title === 'USER MANAGEMENT' ? 'Add User' : `Tambah ${title}`}
                    </button>
                    <button 
                        className="bg-white border border-gray-200 text-blue-600 px-6 py-2.5 rounded-lg flex items-center gap-2 font-semibold shadow-sm hover:bg-gray-50 transition-all"
                    >
                        <Filter size={18} /> Filter
                    </button>
                </div>
            </div>

            {/* TABEL AREA */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                <div className="p-6 flex justify-between items-center border-b border-gray-50">
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">{title}</h2>
                    <div className="relative w-72">
                        <input 
                            type="text" 
                            placeholder="Cari data..." 
                            className="w-full pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
                    </div>
                </div>

                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-100 text-gray-800 font-bold bg-gray-50/50 uppercase text-[16px] tracking-wider">
                            {columns.map((col, index) => (
                                <th key={index} className="px-6 py-4">{col.header}</th>
                            ))}
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {currentItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors text-gray-600">
                                {columns.map((col, colIdx) => (
                                    <td key={colIdx} className="px-6 py-5">
                                        {col.render ? col.render(item) : item[col.accessor]}
                                    </td>
                                ))}
                                <td className="px-6 py-5 text-right">
                                    <div className="flex justify-end gap-3 text-gray-400">
                                        
                                        {/* 🚀 LOGIKA STRATEGIS FILTER SAKRAL (ANTI BENTROK SE-INDONESIA) */}
                                        {actionMode === 'readonly_print' ? (
                                            // A. Jika dipanggil oleh menu BTT: Tampilkan murni hanya icon print kertas tunggal!
                                            <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-800" title="View & Cetak Resi">
                                                <FileText size={18} />
                                            </button>
                                        ) : (
                                            // B. Jika dipanggil oleh menu LAIN (User, Customer, dll): Tampilkan icon pensil bawaan normal!
                                            <button onClick={() => onEdit(item)} className="text-blue-500 hover:text-blue-400">
                                                <Edit size={18} />
                                            </button>
                                        )}

                                        {renderExtraActions && renderExtraActions(item)}                                        
                                        
                                        {/* Sembunyikan tombol sampah murni hanya jika berada di mode readonly_print BTT */}
                                        {actionMode !== 'readonly_print' && (
                                            <button onClick={() => onDelete(item)} className="text-red-500 hover:text-red-400">
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* FOOTER CONTAINER */}
            <div className={`p-6 border-t ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'} flex items-center justify-between`}>
                <div className="text-sm text-gray-400 font-medium w-1/4">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} entries
                </div>

                <div className="flex items-center justify-center gap-1 flex-1">
                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="flex items-center gap-1 px-3 py-1 text-sm font-semibold text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-colors">
                        <ChevronLeft size={16} /> Prev
                    </button>

                    <div className="flex items-center gap-1">
                        {getPaginationGroup().map((item, index) => (
                            <button key={index} onClick={() => typeof item === 'number' && setCurrentPage(item)} className={`w-9 h-9 rounded-lg text-sm font-bold transition-all duration-200 ${currentPage === item ? 'bg-[#1e293b] text-white shadow-md scale-105' : item === '...' ? 'cursor-default text-gray-400' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}>
                                {item}
                            </button>
                        ))}
                    </div>

                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="flex items-center gap-1 px-3 py-1 text-sm font-semibold text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-colors">
                        Next <ChevronRight size={16} />
                    </button>
                </div>

                <div className="flex items-center justify-end gap-3 w-1/4">
                    <span className="text-sm text-gray-400 font-medium">Go to Page</span>
                    <input type="number" min="1" max={totalPages} className={`w-14 h-9 border rounded-lg text-center font-bold outline-none transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' : 'bg-white border-gray-200 text-gray-700 focus:border-blue-500 shadow-sm'}`} onKeyDown={(e) => { if (e.key === 'Enter') { const val = parseInt(e.target.value); if (val > 0 && val <= totalPages) setCurrentPage(val); } }} />
                </div>
            </div>
        </div>
    );
};

export default DataTableTemplate;