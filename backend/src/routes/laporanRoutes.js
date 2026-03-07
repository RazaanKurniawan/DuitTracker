const express = require('express');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const pool = require('../db');
const router = express.Router();

// Helper: build WHERE clause from query params (reusable filter logic)
function buildWhereClause(query, userId) {
  const { bulan, tahun, tipe, kategori_id, dompet_id, q } = query;
  let whereClause = 'WHERE t.user_id = $1';
  const params = [userId];
  let counter = 2;

  if (bulan && tahun) {
    whereClause += ` AND EXTRACT(MONTH FROM t.tanggal) = $${counter++} AND EXTRACT(YEAR FROM t.tanggal) = $${counter++}`;
    params.push(bulan, tahun);
  } else if (tahun) {
    whereClause += ` AND EXTRACT(YEAR FROM t.tanggal) = $${counter++}`;
    params.push(tahun);
  }

  if (q) {
    const tags = q.split(',').map(t => t.trim()).filter(t => t.length > 0);
    if (tags.length > 0) {
      const tagConditions = tags.map(tag => {
        params.push(`%${tag}%`);
        return `t.keterangan ILIKE $${counter++}`;
      });
      whereClause += ` AND (${tagConditions.join(' OR ')})`;
    }
  }

  if (tipe) {
    whereClause += ` AND t.tipe = $${counter++}`;
    params.push(tipe);
  }

  if (kategori_id) {
    const ids = kategori_id.split(',').map(id => Number.parseInt(id.trim())).filter(id => !Number.isNaN(id));
    if (ids.length > 0) {
      whereClause += ` AND t.kategori_id = ANY($${counter++}::int[])`;
      params.push(ids);
    }
  }

  if (dompet_id) {
    whereClause += ` AND t.dompet_id = $${counter++}`;
    params.push(dompet_id);
  }

  return { whereClause, params };
}

// Helper: fetch filtered transactions
async function getFilteredTransactions(query, userId) {
  const { whereClause, params } = buildWhereClause(query, userId);

  const dataQuery = `
    SELECT t.tanggal, t.tipe, t.jumlah, t.keterangan,
           k.nama as kategori_nama, k.ikon as kategori_ikon,
           d.nama as dompet_nama, d.ikon as dompet_ikon
    FROM transaksi t
    LEFT JOIN kategori k ON t.kategori_id = k.id
    LEFT JOIN dompet d ON t.dompet_id = d.id
    ${whereClause}
    ORDER BY t.tanggal DESC, t.created_at DESC
  `;
  const { rows } = await pool.query(dataQuery, params);
  return rows;
}

// Helper: fetch summary
async function getSummary(query, userId) {
  const { whereClause, params } = buildWhereClause(query, userId);

  const totalsQuery = `
    SELECT
      COALESCE(SUM(CASE WHEN t.tipe = 'pemasukan' THEN t.jumlah ELSE 0 END), 0) as total_pemasukan,
      COALESCE(SUM(CASE WHEN t.tipe = 'pengeluaran' THEN t.jumlah ELSE 0 END), 0) as total_pengeluaran
    FROM transaksi t
    ${whereClause}
  `;
  const totals = await pool.query(totalsQuery, params);
  const { total_pemasukan, total_pengeluaran } = totals.rows[0];
  return {
    total_pemasukan: Number.parseFloat(total_pemasukan),
    total_pengeluaran: Number.parseFloat(total_pengeluaran),
    saldo: Number.parseFloat(total_pemasukan) - Number.parseFloat(total_pengeluaran),
  };
}

// Helper: format currency
function formatRupiah(val) {
  return 'Rp ' + Number(val).toLocaleString('id-ID');
}

// Helper: format date
function formatTanggal(val) {
  return new Date(val).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// Helper: get period label
function getPeriodLabel(query) {
  const bulanNames = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  if (query.bulan && query.tahun) {
    return `${bulanNames[Number.parseInt(query.bulan)]} ${query.tahun}`;
  } else if (query.tahun) {
    return `Tahun ${query.tahun}`;
  }
  return 'Semua Periode';
}

/**
 * @swagger
 * /api/laporan/excel:
 *   get:
 *     summary: Export laporan transaksi ke Excel (.xlsx)
 *     tags: [Laporan]
 *     parameters:
 *       - in: query
 *         name: bulan
 *         schema: { type: integer }
 *       - in: query
 *         name: tahun
 *         schema: { type: integer }
 *       - in: query
 *         name: tipe
 *         schema: { type: string, enum: [pemasukan, pengeluaran] }
 *       - in: query
 *         name: kategori_id
 *         schema: { type: string }
 *       - in: query
 *         name: dompet_id
 *         schema: { type: integer }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: File Excel (.xlsx)
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet: {}
 */
router.get('/excel', async (req, res) => {
  try {
    const [rows, summary] = await Promise.all([
      getFilteredTransactions(req.query, req.user.id),
      getSummary(req.query, req.user.id),
    ]);

    const periodLabel = getPeriodLabel(req.query);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DuitTracker';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Laporan Transaksi');

    // Title
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Laporan Keuangan - DuitTracker';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FF4361EE' } };
    titleCell.alignment = { horizontal: 'center' };

    // Period
    sheet.mergeCells('A2:F2');
    const periodCell = sheet.getCell('A2');
    periodCell.value = `Periode: ${periodLabel}`;
    periodCell.font = { size: 12, color: { argb: 'FF666666' } };
    periodCell.alignment = { horizontal: 'center' };

    // Summary row
    sheet.addRow([]);
    const summaryRow = sheet.addRow([
      'Total Pemasukan', formatRupiah(summary.total_pemasukan),
      'Total Pengeluaran', formatRupiah(summary.total_pengeluaran),
      'Saldo', formatRupiah(summary.saldo),
    ]);
    summaryRow.font = { bold: true, size: 11 };
    summaryRow.getCell(2).font = { bold: true, color: { argb: 'FF00C897' } };
    summaryRow.getCell(4).font = { bold: true, color: { argb: 'FFFF4757' } };
    summaryRow.getCell(6).font = { bold: true, color: { argb: 'FF4361EE' } };

    sheet.addRow([]);

    // Table headers
    const headerRow = sheet.addRow(['No', 'Tanggal', 'Kategori', 'Dompet', 'Keterangan', 'Tipe', 'Jumlah']);
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4361EE' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF2A2A4A' } },
      };
    });

    // Data rows
    rows.forEach((row, idx) => {
      const dataRow = sheet.addRow([
        idx + 1,
        formatTanggal(row.tanggal),
        `${row.kategori_ikon || ''} ${row.kategori_nama || '-'}`.trim(),
        `${row.dompet_ikon || ''} ${row.dompet_nama || '-'}`.trim(),
        row.keterangan || '-',
        row.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
        Number(row.jumlah),
      ]);

      // Color the jumlah cell
      const jumlahCell = dataRow.getCell(7);
      jumlahCell.numFmt = '#,##0';
      jumlahCell.font = {
        bold: true,
        color: { argb: row.tipe === 'pemasukan' ? 'FF00C897' : 'FFFF4757' },
      };

      // Stripe rows
      if (idx % 2 === 1) {
        dataRow.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5FF' } };
        });
      }
    });

    // Column widths
    sheet.columns = [
      { width: 6 },   // No
      { width: 16 },  // Tanggal
      { width: 22 },  // Kategori
      { width: 20 },  // Dompet
      { width: 35 },  // Keterangan
      { width: 14 },  // Tipe
      { width: 18 },  // Jumlah
    ];

    // Response
    const filename = `Laporan_DuitTracker_${periodLabel.replaceAll(/\s+/g, '_')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error export Excel:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/laporan/pdf:
 *   get:
 *     summary: Export laporan transaksi ke PDF
 *     tags: [Laporan]
 *     parameters:
 *       - in: query
 *         name: bulan
 *         schema: { type: integer }
 *       - in: query
 *         name: tahun
 *         schema: { type: integer }
 *       - in: query
 *         name: tipe
 *         schema: { type: string, enum: [pemasukan, pengeluaran] }
 *       - in: query
 *         name: kategori_id
 *         schema: { type: string }
 *       - in: query
 *         name: dompet_id
 *         schema: { type: integer }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: File PDF
 *         content:
 *           application/pdf: {}
 */
router.get('/pdf', async (req, res) => {
  try {
    const [rows, summary] = await Promise.all([
      getFilteredTransactions(req.query, req.user.id),
      getSummary(req.query, req.user.id),
    ]);

    const periodLabel = getPeriodLabel(req.query);
    const filename = `Laporan_DuitTracker_${periodLabel.replaceAll(/\s+/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    doc.pipe(res);

    // Title
    doc.fontSize(20).font('Helvetica-Bold')
       .fillColor('#4361ee')
       .text('Laporan Keuangan - DuitTracker', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica')
       .fillColor('#666666')
       .text(`Periode: ${periodLabel}`, { align: 'center' });
    doc.moveDown(0.5);

    // Summary boxes
    const summaryY = doc.y;
    const boxWidth = 220;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const gap = (pageWidth - boxWidth * 3) / 2;

    const summaryItems = [
      { label: 'Total Pemasukan', value: formatRupiah(summary.total_pemasukan), color: '#00c897' },
      { label: 'Total Pengeluaran', value: formatRupiah(summary.total_pengeluaran), color: '#ff4757' },
      { label: 'Saldo', value: formatRupiah(summary.saldo), color: '#4361ee' },
    ];

    summaryItems.forEach((item, i) => {
      const x = doc.page.margins.left + i * (boxWidth + gap);
      // Box background
      doc.save();
      doc.roundedRect(x, summaryY, boxWidth, 50, 6).fill('#f5f5ff');
      doc.restore();

      // Top accent line
      doc.save();
      doc.rect(x, summaryY, boxWidth, 3).fill(item.color);
      doc.restore();

      // Label
      doc.fontSize(9).font('Helvetica').fillColor('#888888')
         .text(item.label, x + 12, summaryY + 10, { width: boxWidth - 24 });

      // Value
      doc.fontSize(14).font('Helvetica-Bold').fillColor(item.color)
         .text(item.value, x + 12, summaryY + 26, { width: boxWidth - 24 });
    });

    doc.y = summaryY + 65;
    doc.moveDown(0.5);

    // Table header
    const tableTop = doc.y;
    const colWidths = [30, 90, 120, 100, 200, 80, 100];
    const headers = ['No', 'Tanggal', 'Kategori', 'Dompet', 'Keterangan', 'Tipe', 'Jumlah'];
    const totalWidth = colWidths.reduce((a, b) => a + b, 0);

    // Header background
    doc.save();
    doc.rect(doc.page.margins.left, tableTop, totalWidth, 22).fill('#4361ee');
    doc.restore();

    let xPos = doc.page.margins.left;
    headers.forEach((header, i) => {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
         .text(header, xPos + 4, tableTop + 6, { width: colWidths[i] - 8, align: 'left' });
      xPos += colWidths[i];
    });

    let currentY = tableTop + 22;

    // Data rows
    rows.forEach((row, idx) => {
      // Check for page break
      if (currentY + 20 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        currentY = doc.page.margins.top;

        // Re-draw header on new page
        doc.save();
        doc.rect(doc.page.margins.left, currentY, totalWidth, 22).fill('#4361ee');
        doc.restore();

        xPos = doc.page.margins.left;
        headers.forEach((header, i) => {
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
             .text(header, xPos + 4, currentY + 6, { width: colWidths[i] - 8, align: 'left' });
          xPos += colWidths[i];
        });
        currentY += 22;
      }

      // Stripe
      if (idx % 2 === 1) {
        doc.save();
        doc.rect(doc.page.margins.left, currentY, totalWidth, 18).fill('#f8f8ff');
        doc.restore();
      }

      const rowData = [
        String(idx + 1),
        formatTanggal(row.tanggal),
        `${row.kategori_nama || '-'}`,
        `${row.dompet_nama || '-'}`,
        (row.keterangan || '-').substring(0, 40),
        row.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
        formatRupiah(row.jumlah),
      ];

      xPos = doc.page.margins.left;
      rowData.forEach((text, i) => {
        let color = '#333333';
        if (i === 6) color = row.tipe === 'pemasukan' ? '#00c897' : '#ff4757';
        if (i === 5) color = row.tipe === 'pemasukan' ? '#00c897' : '#ff4757';

        doc.fontSize(8).font(i === 6 ? 'Helvetica-Bold' : 'Helvetica').fillColor(color)
           .text(text, xPos + 4, currentY + 4, { width: colWidths[i] - 8, align: 'left', lineBreak: false });
        xPos += colWidths[i];
      });

      currentY += 18;
    });

    // Footer
    doc.moveDown(2);
    const footerY = currentY + 20;
    if (footerY < doc.page.height - doc.page.margins.bottom - 30) {
      doc.fontSize(8).font('Helvetica').fillColor('#aaaaaa')
         .text(`Digenerate oleh DuitTracker pada ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
           doc.page.margins.left, footerY, { align: 'center', width: totalWidth });
    }

    doc.end();
  } catch (err) {
    console.error('Error export PDF:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

module.exports = router;
