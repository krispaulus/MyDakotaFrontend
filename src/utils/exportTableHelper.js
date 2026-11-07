/**
 * exportTableHelper.js
 * Utility Helper Reusable untuk Export Data Tabel ke Excel (.xlsx / HTML Table) & CSV
 * Bisa dipanggil di Preview 2 Transport Planning, Kimia Farma, maupun modul lainnya.
 */

// Helper pembersih format angka & teks
const cleanValue = (val) => {
    if (val === null || val === undefined) return '';
    return String(val).trim();
};

/**
 * 1. EXPORT TO CSV
 * Mendukung pembuka BOM UTF-8 (\uFEFF) agar simbol Rp dan format angka tidak corrupt di Excel.
 */
export const exportDataToCSV = ({
    filename = 'DATA_EXPORT.csv',
    columns = [],
    data = [],
    delimiter = ';'
}) => {
    if (!data || data.length === 0) {
        alert('Tidak ada data yang dapat diekspor.');
        return;
    }

    // Baris Header
    const headerRow = columns.map(col => `"${cleanValue(col.header).replace(/"/g, '""')}"`).join(delimiter);

    // Baris-baris Data
    const dataRows = data.map((row, index) => {
        return columns.map(col => {
            let val = '';
            if (typeof col.accessor === 'function') {
                val = col.accessor(row, index);
            } else if (col.key === 'no') {
                val = index + 1;
            } else {
                val = row[col.key] !== undefined ? row[col.key] : '';
            }

            // Hindari error pada teks ber-quote
            const strVal = cleanValue(val).replace(/"/g, '""');
            return `"${strVal}"`;
        }).join(delimiter);
    });

    const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * 2. EXPORT TO EXCEL (.xls / XML Spreadsheet)
 * Menghasilkan file Excel rapi dengan styling header biru tua (#004b84) dan border tabel otomatis
 * tanpa perlu dependensi library npm berat tambahan.
 */
export const exportDataToExcel = ({
    filename = 'DATA_EXPORT.xls',
    sheetName = 'Preview Data',
    title = 'DATA TRANSPORT PLANNING',
    customerName = '',
    columns = [],
    data = []
}) => {
    if (!data || data.length === 0) {
        alert('Tidak ada data yang dapat diekspor.');
        return;
    }

    const thHtml = columns.map(col => `
        <th style="background-color: #004b84; color: #ffffff; border: 1px solid #333333; padding: 6px 8px; font-size: 11px; text-transform: uppercase;">
            ${cleanValue(col.header)}
        </th>
    `).join('');

    const trHtml = data.map((row, index) => {
        const tdCells = columns.map(col => {
            let val = '';
            if (typeof col.accessor === 'function') {
                val = col.accessor(row, index);
            } else if (col.key === 'no') {
                val = index + 1;
            } else {
                val = row[col.key] !== undefined ? row[col.key] : '';
            }

            const align = col.align || 'left';
            return `<td style="border: 1px solid #cccccc; padding: 5px 8px; font-size: 11px; text-align: ${align};">${cleanValue(val)}</td>`;
        }).join('');

        return `<tr>${tdCells}</tr>`;
    }).join('');

    const excelTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" 
              xmlns:x="urn:schemas-microsoft-com:office:excel" 
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>${sheetName}</x:Name>
                            <x:WorksheetOptions>
                                <x:DisplayGridlines/>
                            </x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
        </head>
        <body style="font-family: Arial, sans-serif;">
            <table style="margin-bottom: 10px;">
                <tr><td colspan="${columns.length}" style="font-size: 14px; font-weight: bold; color: #004b84;">${title}</td></tr>
                ${customerName ? `<tr><td colspan="${columns.length}" style="font-size: 12px; font-weight: bold;">CUSTOMER: ${customerName}</td></tr>` : ''}
                <tr><td colspan="${columns.length}" style="font-size: 10px; color: #666666;">Dicetak pada: ${new Date().toLocaleString('id-ID')}</td></tr>
            </table>
            <table border="1" style="border-collapse: collapse;">
                <thead>
                    <tr>${thHtml}</tr>
                </thead>
                <tbody>
                    ${trHtml}
                </tbody>
            </table>
        </body>
        </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename.endsWith('.xls') || filename.endsWith('.xlsx') ? filename : `${filename}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};