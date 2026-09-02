import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import Swal from 'sweetalert2';

const SaldoAwalPiutang = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [agens, setAgens] = useState([]);
    const [customers, setCustomers] = useState([]);

    const currentYear = new Date().getFullYear();
    const [selectedTahun, setSelectedTahun] = useState(String(currentYear));
    const [selectedAgen, setSelectedAgen] = useState('ALL');

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const [resAgen, resCust] = await Promise.all([
                api.get(`/agens?pt_id=${ptId}`, { headers: { Authorization: `Bearer ${token}` } })
                    .catch(() => ({ data: { data: [] } })),
                api.get(`/pelanggan?pt_id=${ptId}`, { headers: { Authorization: `Bearer ${token}` } })
                    .catch(() => api.get(`/customers?pt_id=${ptId}`, { headers: { Authorization: `Bearer ${token}` } }))
                    .catch(() => ({ data: { data: [] } }))
            ]);

            setAgens(resAgen.data?.data || []);
            setCustomers(resCust.data?.data || []);
        } catch (err) {
            console.error("Gagal load opsi:", err);
        }
    };

    const fetchSaldoAwal = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get('/piutang/saldo-awal/list', {
                params: {
                    pt_id: ptId,
                    agen_id: selectedAgen,
                    tahun: selectedTahun
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal tarik data saldo awal:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOptions();
    }, []);

    useEffect(() => {
        fetchSaldoAwal();
    }, [selectedAgen, selectedTahun]);

    const handleFormSubmit = async (item = null) => {
        const isEdit = Boolean(item);
        const selectedThnVal = isEdit ? item.sa_tahun : selectedTahun;

        // 1. Generate Opsi Tahun Dinamis (2017 s/d Tahun Berjalan)
        const currentYearNum = new Date().getFullYear();
        const startYearNum = 2017;
        let yearOptionsHtml = '';
        for (let y = currentYearNum; y >= startYearNum; y--) {
            const isSelected = String(y) === String(selectedThnVal) ? 'selected' : '';
            yearOptionsHtml += `<option value="${y}" ${isSelected}>${y}</option>`;
        }

        // 2. Generate Opsi Customer
        const custOptionsHtml = customers.map(c =>
            `<option value="${c.cust_id}" ${isEdit && (item.sa_custid === c.cust_id) ? 'selected' : ''}>${c.cust_name} [${c.cust_id}]</option>`
        ).join('');

        // 3. Generate Opsi Agen
        const agenOptionsHtml = [
            '<option value="1">KANTOR PUSAT</option>',
            ...agens.map(a => `<option value="${a.agen_id}" ${isEdit && (item.sa_agenid === String(a.agen_id)) ? 'selected' : ''}>${a.agen_nama}</option>`)
        ].join('');

        const { value: formValues } = await Swal.fire({
            title: isEdit ? 'Edit Saldo Awal Piutang' : 'Set Saldo Awal Piutang',
            html: `
                <div style="text-align: left; font-size: 13px; font-weight: bold; display: flex; flex-direction: column; gap: 12px;">
                    <div>
                        <label style="display:block; margin-bottom: 4px;">Tahun Pembukuan :</label>
                        <select id="swal-tahun" class="swal2-input" style="margin: 0; width: 100%; height: 38px; font-size: 13px; font-family: monospace; font-weight: bold;">
                            ${yearOptionsHtml}
                        </select>
                    </div>
                    <div>
                        <label style="display:block; margin-bottom: 4px;">Cabang / Agen :</label>
                        <select id="swal-agen" class="swal2-input" style="margin: 0; width: 100%; height: 38px; font-size: 13px;">
                            ${agenOptionsHtml}
                        </select>
                    </div>
                    <div>
                        <label style="display:block; margin-bottom: 4px;">Customer / Pelanggan :</label>
                        <select id="swal-cust" class="swal2-input" style="margin: 0; width: 100%; height: 38px; font-size: 13px;" ${isEdit ? 'disabled' : ''}>
                            ${custOptionsHtml}
                        </select>
                    </div>
                    <div>
                        <label style="display:block; margin-bottom: 4px;">Nominal Saldo Awal (Rp) :</label>
                        <input id="swal-saldo" type="number" class="swal2-input" style="margin: 0; width: 100%; height: 38px; font-size: 13px;" value="${isEdit ? item.sa_awal : 0}" placeholder="0" />
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Simpan Saldo',
            cancelButtonText: 'Batal',
            preConfirm: () => {
                const tahun = document.getElementById('swal-tahun').value;
                const agen_id = document.getElementById('swal-agen').value;
                const cust_id = isEdit ? item.sa_custid : document.getElementById('swal-cust').value;
                const saldo_awal = document.getElementById('swal-saldo').value;

                if (!cust_id) {
                    Swal.showValidationMessage('Customer wajib dipilih');
                    return false;
                }
                if (saldo_awal === '') {
                    Swal.showValidationMessage('Nominal saldo awal wajib diisi');
                    return false;
                }

                return {
                    tahun: tahun || selectedTahun,
                    agen_id: agen_id || '1',
                    cust_id,
                    saldo_awal: Number(saldo_awal)
                };
            }
        });

        if (formValues) {
            try {
                const token = localStorage.getItem('token');
                const ptId = localStorage.getItem('pt_id') || 'C';

                await api.post('/piutang/saldo-awal/save', {
                    pt_id: ptId,
                    ...formValues
                }, { headers: { Authorization: `Bearer ${token}` } });

                Swal.fire('Sukses', 'Saldo Awal Piutang berhasil disimpan', 'success');
                fetchSaldoAwal();
            } catch (err) {
                console.error("Gagal simpan saldo:", err);
                Swal.fire('Error', 'Gagal menyimpan data saldo awal', 'error');
            }
        }
    };

    const handleAdd = () => handleFormSubmit(null);
    const handleEdit = (item) => handleFormSubmit(item);

    const columns = [
        {
            header: 'CUSTOMER / PELANGGAN',
            accessor: 'cust_name',
            render: (item) => (
                <div style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-bold flex flex-col">
                    <span>{item.cust_name}</span>
                    <span className="text-[10px] text-slate-500 font-mono font-normal">{item.sa_custid}</span>
                </div>
            )
        },
        {
            header: 'CABANG / AGEN',
            accessor: 'agen_nama',
            render: (item) => (
                <span style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-bold">
                    {item.agen_nama || '-'}
                </span>
            )
        },
        {
            header: 'TAHUN',
            accessor: 'sa_tahun',
            render: (item) => (
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {item.sa_tahun}
                </span>
            )
        },
        {
            header: 'SALDO AWAL',
            accessor: 'sa_awal',
            render: (item) => (
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                    Rp {Number(item.sa_awal || 0).toLocaleString('id-ID')}
                </span>
            )
        }
    ];

    return (
        <DataTableTemplate
            title={`SET SALDO AWAL PIUTANG PER CUSTOMER (${selectedTahun})`}
            columns={columns}
            data={data}
            loading={loading}
            isDarkMode={isDarkMode}
            onAdd={handleAdd}
            onEdit={handleEdit}
        />
    );
};

export default SaldoAwalPiutang;