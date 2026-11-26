import React, { useMemo, useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Printer } from 'lucide-react';
import {
  type Order,
  type StoreSettings,
  type Transaction,
  ORDER_CATEGORIES,
  formatDateId,
  formatRupiah,
  getTodayISO,
} from '../../types';
import { exportElementToPDF, exportElementToPNG } from '../../utils/exportUtils';

interface ReportsViewProps {
  orders: Order[];
  transactions: Transaction[];
  settings: StoreSettings | null;
  theme: 'light' | 'dark';
  onSelectOrderForInvoice: (orderId: string) => void;
}

export function ReportsView({
  orders,
  transactions,
  settings,
  theme,
  onSelectOrderForInvoice,
}: ReportsViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [exportingType, setExportingType] = useState<'pdf' | 'png' | null>(null);

  const report = useMemo(() => {
    const incomeList = transactions.filter((t) => t.type === 'pemasukan');
    const expenseList = transactions.filter((t) => t.type === 'pengeluaran');

    const totalIncome = incomeList.reduce((s, t) => s + t.amount, 0);
    const totalExpense = expenseList.reduce((s, t) => s + t.amount, 0);
    const netCashProfit = totalIncome - totalExpense;

    const activeOrders = orders.filter((o) => o.orderStatus !== 'Dibatalkan');
    const grossOrderSales = activeOrders.reduce((s, o) => s + o.totalAmount, 0);
    const totalHppOrders = activeOrders.reduce(
      (s, o) => s + o.productionCost * o.quantity,
      0
    );
    const receivablesList = activeOrders
      .filter((o) => o.totalAmount - o.paidAmount > 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const totalReceivables = receivablesList.reduce(
      (s, o) => s + Math.max(0, o.totalAmount - o.paidAmount),
      0
    );

    const byCategory = ORDER_CATEGORIES.map((cat) => {
      const catOrders = activeOrders.filter((o) => o.category === cat);
      const rev = catOrders.reduce((s, o) => s + o.totalAmount, 0);
      const hpp = catOrders.reduce((s, o) => s + o.productionCost * o.quantity, 0);
      return {
        category: cat,
        count: catOrders.length,
        revenue: rev,
        hpp,
        grossProfit: rev - hpp,
      };
    });

    const expenseByCatMap = new Map<string, number>();
    expenseList.forEach((t) => {
      expenseByCatMap.set(t.category, (expenseByCatMap.get(t.category) || 0) + t.amount);
    });
    const expenseBreakdown = Array.from(expenseByCatMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalIncome,
      totalExpense,
      netCashProfit,
      grossOrderSales,
      totalHppOrders,
      totalReceivables,
      receivablesList,
      byCategory,
      expenseBreakdown,
    };
  }, [orders, transactions]);

  const target = settings?.monthlyTarget || 35000000;
  const targetPct = target > 0 ? Math.min(100, Math.round((report.totalIncome / target) * 100)) : 0;

  const handleExport = async (type: 'pdf' | 'png') => {
    if (!reportRef.current) return;
    setExportingType(type);
    try {
      const bg = theme === 'dark' ? '#111713' : '#FAF8F4';
      const storeName = settings?.storeName || 'Elviora';
      const fileBase = `Laporan-Keuangan-${storeName}-${getTodayISO()}`;
      if (type === 'pdf') {
        await exportElementToPDF(reportRef.current, fileBase, bg, 'portrait');
      } else {
        await exportElementToPNG(reportRef.current, fileBase, bg);
      }
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h2 className="font-display font-bold text-xl text-[#233126] dark:text-[#F8FAF7]">
            Laporan Keuangan
          </h2>
          <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
            Ringkasan Laba Rugi, performa kategori buket &amp; hantaran, serta daftar piutang aktif.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/88 dark:bg-[#16201A]/88 border border-[#EAE4DA] dark:border-[#344639] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] text-xs font-medium text-[#233126] dark:text-[#F8FAF7] btn-3d-secondary cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4 text-accent-fg" />
            Cetak
          </button>
          <button
            type="button"
            disabled={exportingType !== null}
            onClick={() => handleExport('png')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/88 dark:bg-[#16201A]/88 border border-[#EAE4DA] dark:border-[#344639] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] text-xs font-medium text-[#233126] dark:text-[#F8FAF7] btn-3d-secondary cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            <ImageIcon className="w-4 h-4 text-[#C69C4D] dark:text-[#F0C975]" />
            {exportingType === 'png' ? 'Memproses...' : 'Unduh Gambar'}
          </button>
          <button
            type="button"
            disabled={exportingType !== null}
            onClick={() => handleExport('pdf')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-medium btn-3d-primary cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            <FileText className="w-4 h-4" />
            {exportingType === 'pdf' ? 'Memproses...' : 'Unduh PDF'}
          </button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6 print-area">
        {/* Profit & Loss Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d">
            <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">Pemasukan Kas Riil</p>
            <p className="font-display font-bold text-xl text-accent-fg tabular-nums mt-1.5">
              {formatRupiah(report.totalIncome)}
            </p>
          </div>
          <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d">
            <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">Pengeluaran Kas Riil</p>
            <p className="font-display font-bold text-xl text-[#B85D68] dark:text-[#F4B4BC] tabular-nums mt-1.5">
              {formatRupiah(report.totalExpense)}
            </p>
          </div>
          <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d">
            <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">
              Surplus / Laba Bersih Kas
            </p>
            <p className="font-display font-bold text-xl text-[#233126] dark:text-[#F8FAF7] tabular-nums mt-1.5">
              {formatRupiah(report.netCashProfit)}
            </p>
          </div>
          <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d">
            <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">
              Piutang Belum Tertagih
            </p>
            <p className="font-display font-bold text-xl text-[#A88035] dark:text-[#F0C975] tabular-nums mt-1.5">
              {formatRupiah(report.totalReceivables)}
            </p>
          </div>
        </div>

        {/* Target Progress */}
        <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-5 surface-3d">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div>
              <h3 className="font-display font-semibold text-sm text-[#233126] dark:text-[#F8FAF7]">
                Pencapaian Target Pendapatan Bulanan
              </h3>
              <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
                Target: {formatRupiah(target)} · Realisasi: {formatRupiah(report.totalIncome)}
              </p>
            </div>
            <span className="font-display font-bold text-base text-accent-fg tabular-nums">
              {targetPct}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-[#F4EFE6] dark:bg-[#1F2B23] overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${targetPct}%` }}
            />
          </div>
        </div>

        {/* Profitability by Category + Expense Breakdown */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-7 bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-5 surface-3d">
            <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7] mb-3">
              Profitabilitas per Kategori Produk
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#EAE4DA] dark:border-[#344639] text-[11px] font-semibold text-[#7D877E] dark:text-[#BCC8BF]">
                    <th className="py-2.5 pr-3">Kategori</th>
                    <th className="py-2.5 px-3 text-center">Order</th>
                    <th className="py-2.5 px-3 text-right">Omzet</th>
                    <th className="py-2.5 px-3 text-right">Est. HPP</th>
                    <th className="py-2.5 pl-3 text-right">Laba Kotor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4EFE6] dark:divide-[#2E3E32] text-[#233126] dark:text-[#F8FAF7]">
                  {report.byCategory.map((row) => (
                    <tr key={row.category}>
                      <td className="py-3 pr-3 font-medium text-[#233126] dark:text-[#F8FAF7]">
                        {row.category}
                      </td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums">{row.count}</td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {formatRupiah(row.revenue)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-[#7D877E] dark:text-[#BCC8BF]">
                        {formatRupiah(row.hpp)}
                      </td>
                      <td className="py-3 pl-3 text-right font-mono font-semibold tabular-nums text-accent-fg">
                        {formatRupiah(row.grossProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="xl:col-span-5 bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-5 surface-3d">
            <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7] mb-3">
              Rincian Pengeluaran Operasional
            </h3>
            <div className="space-y-3">
              {report.expenseBreakdown.length === 0 ? (
                <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF] py-6 text-center">
                  Belum ada pengeluaran.
                </p>
              ) : (
                report.expenseBreakdown.map((item) => {
                  const share =
                    report.totalExpense > 0
                      ? Math.round((item.amount / report.totalExpense) * 100)
                      : 0;
                  return (
                    <div key={item.category} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[#233126] dark:text-[#F8FAF7]">
                          {item.category}
                        </span>
                        <span className="font-mono text-[#B85D68] dark:text-[#F4B4BC] tabular-nums">
                          {formatRupiah(item.amount)} ({share}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#FDF4F5] dark:bg-[#1F2B23] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#D88C94]"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Receivables List */}
        <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-5 surface-3d">
          <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7] mb-3">
            Daftar Piutang Pelanggan ({report.receivablesList.length} Pesanan)
          </h3>
          {report.receivablesList.length === 0 ? (
            <p className="text-xs text-accent-fg py-4">
              Seluruh pesanan aktif telah lunas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#EAE4DA] dark:border-[#344639] text-[11px] font-semibold text-[#7D877E] dark:text-[#BCC8BF]">
                    <th className="py-2.5 pr-3">Invoice</th>
                    <th className="py-2.5 px-3">Pelanggan</th>
                    <th className="py-2.5 px-3">Jatuh Tempo</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-right">Sudah DP</th>
                    <th className="py-2.5 pl-3 text-right">Sisa Piutang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4EFE6] dark:divide-[#2E3E32] text-[#233126] dark:text-[#F8FAF7]">
                  {report.receivablesList.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-[#FAF8F4]/70 dark:hover:bg-[#222C24]/60"
                    >
                      <td className="py-3 pr-3 font-mono">
                        <button
                          type="button"
                          onClick={() => onSelectOrderForInvoice(o.id)}
                          className="text-accent-fg font-semibold hover:underline cursor-pointer"
                        >
                          {o.invoiceNumber}
                        </button>
                      </td>
                      <td className="py-3 px-3 font-medium text-[#233126] dark:text-[#F8FAF7]">
                        {o.customerName}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#616E63] dark:text-[#BCC8BF] tabular-nums">
                        {formatDateId(o.dueDate)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {formatRupiah(o.totalAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-accent-fg tabular-nums">
                        {formatRupiah(o.paidAmount)}
                      </td>
                      <td className="py-3 pl-3 text-right font-mono font-bold text-[#B85D68] dark:text-[#F4B4BC] tabular-nums">
                        {formatRupiah(Math.max(0, o.totalAmount - o.paidAmount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
