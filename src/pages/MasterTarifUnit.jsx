import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Plus, Filter, Search, Copy, MapPin, Building2, ShieldCheck, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from "../context/DarkModeContext";
import Swal from 'sweetalert2';
import { MENU_LIST } from '../constants/menuList';


const MasterTarifUnit = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchTarif = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/tarif/unit`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
        } catch (err) {
            console.error("Gagal tarik data unit:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTarif(); }, []);

    const columns = [
        { header: 'KATEGORI', accessor: 'nama_kategori' },
        { 
            header: 'JENIS UNIT', 
            accessor: 'jenis',
            render: (item) => <span className="font-bold text-slate-700">{item.jenis}</span>
        },
        { header: 'SATUAN', accessor: 'satuan' },
        { 
            header: 'HARGA UNIT', 
            accessor: 'harga',
            render: (item) => (
                <span className="text-indigo-600 font-bold">
                    {/* Pakai optional chaining (?) atau default value 0 */}
                    Rp {(item.harga || 0).toLocaleString()}
                </span>
            )
        },
        { 
            header: 'KETERANGAN', 
            accessor: 'keterangan',
            render: (item) => <span className="text-xs text-slate-400">{item.keterangan || '-'}</span>
        },
    ];

    return (
        <DataTableTemplate 
            title="MASTER TARIF UNIT"
            columns={columns}
            data={data}
            loading={loading}
            isDarkMode={isDarkMode}
            onAdd={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
        />
    );
};

export default MasterTarifUnit;