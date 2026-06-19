import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Plus, Filter, Search, Copy, MapPin, Building2, ShieldCheck, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from "../context/DarkModeContext";
import Swal from 'sweetalert2';
import { MENU_LIST } from '../constants/menuList';


const MasterKodePos = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchKodePos = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:8080/api/kodepos`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
        } catch (err) {
            console.error("Gagal tarik data kodepos:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchKodePos(); }, []);

    const columns = [
        { header: 'KODE POS', accessor: 'kodepos', render: (item) => <span className="font-bold text-indigo-600">{item.kodepos}</span> },
        { header: 'KELURAHAN', accessor: 'desakelurahan' },
        { header: 'KECAMATAN', accessor: 'kecamatandistrik' },
        { header: 'KOTA/KAB', accessor: 'kotakabupaten' },
        { header: 'PROPINSI', accessor: 'propinsi' },
        { header: 'AREA', accessor: 'area' },
    ];

    return (
        <DataTableTemplate 
            title="MASTER DATA KODE POS"
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

export default MasterKodePos;