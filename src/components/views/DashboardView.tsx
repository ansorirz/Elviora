import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  Crown,
  Download,
  FileText,
  Image as ImageIcon,
  Lightbulb,
  Plus,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  type Material,
  type NavSection,
  type Order,
  type OrderCategory,
  type StoreSettings,
  type Transaction,
  ORDER_CATEGORIES,
  addDaysISO,
  formatCompactRupiah,
  formatDateId,
  formatRupiah,
  getProductImage,
  getTodayISO,
} from '../../types';
import {
  CategoryDonutChart,
  FinancialTrendChart,
  OrderStatusGauge,
  Sparkline,
  type TrendPoint,
} from '../Charts';
import { Card3D } from '../Card3D';
import { Category3DScene } from '../Category3DScene';
import { MonthlyIncomeD3Chart } from '../MonthlyIncomeD3Chart';
import { exportElementToPDF, exportElementToPNG } from '../../utils/exportUtils';

interface DashboardViewProps {
  ownerName: string;
  settings: StoreSettings | null;
  orders: Order[];
  transactions: Transaction[];
  materials: Material[];
  theme: 'light' | 'dark';
  accentHex: string;
  onOpenNewOrder: () => void;
  onExportSummaryPDF: () => void;
  onExportSummaryImage: () => Promise<void>;
  onNavigate: (section: NavSection) => void;
  onSelectOrderForInvoice: (orderId: string) => void;
}

export function DashboardView({
  ownerName,
  settings,
  orders,
  transactions,
  materials,
  theme,
  accentHex,
  onOpenNewOrder,
  onExportSummaryPDF,
  onExportSummaryImage,
  onNavigate,
  onSelectOrderForInvoice,
}: DashboardViewProps) {
  const [chartRange, setChartRange] = useState<'7d' | '14d' | '30d'>('14d');
  const [showIncome, setShowIncome] = useState(true);
  const [showExpense, setShowExpense] = useState(true);
  const [showProfit, setShowProfit] = useState(true);
  const [categoryScope, setCategoryScope] = useState<'all' | 'active'>('all');
  const [categoryViewMode, setCategoryViewMode] = useState<'3d' | '2d'>('3d');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const dashboardRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const today = getTodayISO();
  const storeName = settings?.storeName || 'Elviora & Hantaran';

  const metrics = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === 'pemasukan')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'pengeluaran')
      .reduce((acc, t) => acc + t.amount, 0);

    const netProfit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

    const validOrders = orders.filter((o) => o.orderStatus !== 'Dibatalkan');
    const totalOrdersCount = orders.length;

    const todayRevenue = transactions
      .filter((t) => t.type === 'pemasukan' && t.date === today)
      .reduce((acc, t) => acc + t.amount, 0);

    const todayOrdersCount = orders.filter((o) => o.orderDate === today).length;

    const receivables = validOrders.reduce(
      (acc, o) => acc + Math.max(0, o.totalAmount - o.paidAmount),
      0
    );

    const lunasOrders = validOrders.filter((o) => o.paymentStatus === 'Lunas');
    const dpOrders = validOrders.filter((o) => o.paymentStatus === 'DP');
    const unpaidOrders = validOrders.filter((o) => o.paymentStatus === 'Belum Bayar');

    const dpCollected = dpOrders.reduce((acc, o) => acc + o.paidAmount, 0);
    const lunasCollected = lunasOrders.reduce((acc, o) => acc + o.totalAmount, 0);

    const lowStockCount = materials.filter((m) => m.stock <= m.minStock).length;

    return {
      totalIncome,
      totalExpense,
      netProfit,
      profitMargin,
      totalOrdersCount,
      todayRevenue,
      todayOrdersCount,
      receivables,
      lunasCount: lunasOrders.length,
      lunasCollected,
      dpCount: dpOrders.length,
      dpCollected,
      unpaidCount: unpaidOrders.length,
      lowStockCount,
    };
  }, [orders, transactions, materials, today]);

  const trendData: TrendPoint[] = useMemo(() => {
    const days = chartRange === '7d' ? 7 : chartRange === '14d' ? 14 : 30;
    const points: TrendPoint[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const dateStr = addDaysISO(today, -i);
      const dayIncome = transactions
        .filter((t) => t.type === 'pemasukan' && t.date === dateStr)
        .reduce((s, t) => s + t.amount, 0);
      const dayExpense = transactions
        .filter((t) => t.type === 'pengeluaran' && t.date === dateStr)
        .reduce((s, t) => s + t.amount, 0);
      const [, m, d] = dateStr.split('-');
      points.push({
        label: `${d}/${m}`,
        income: dayIncome,
        expense: dayExpense,
        profit: dayIncome - dayExpense,
      });
    }
    return points;
  }, [transactions, chartRange, today]);

  const peakIncome = useMemo(() => {
    return trendData.reduce(
      (best, cur) => (cur.income > best.income ? cur : best),
      { label: '-', income: 0, expense: 0, profit: 0 }
    );
  }, [trendData]);

  const categoryData = useMemo(() => {
    const palette: Record<OrderCategory, string> = {
      'Buket Bunga': accentHex,
      'Hantaran Lamaran': '#C69C4D',
      'Buket Uang & Snack': '#D88C94',
      'Hampers Musiman': '#8FA992',
      'Dekorasi & Custom': '#B5ADA0',
    };
    const scoped =
      categoryScope === 'active'
        ? orders.filter((o) => o.orderStatus !== 'Dibatalkan')
        : orders;

    const segments = ORDER_CATEGORIES.map((cat) => {
      const matching = scoped.filter((o) => o.category === cat);
      return {
        label: cat,
        count: matching.length,
        revenue: matching.reduce((s, o) => s + o.totalAmount, 0),
        color: palette[cat],
      };
    }).sort((a, b) => b.count - a.count);

    return {
      total: scoped.length,
      segments,
      top: segments[0] || null,
    };
  }, [orders, categoryScope, accentHex]);

  const topProducts = useMemo(() => {
    const map = new Map<
      string,
      {
        productName: string;
        category: OrderCategory;
        ordersCount: number;
        qty: number;
        revenue: number;
        imageKey: string;
      }
    >();
    orders
      .filter((o) => o.orderStatus !== 'Dibatalkan')
      .forEach((o) => {
        const cur = map.get(o.productName);
        if (cur) {
          cur.ordersCount += 1;
          cur.qty += o.quantity;
          cur.revenue += o.totalAmount;
        } else {
          map.set(o.productName, {
            productName: o.productName,
            category: o.category,
            ordersCount: 1,
            qty: o.quantity,
            revenue: o.totalAmount,
            imageKey: o.imageKey,
          });
        }
      });
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders]);

  const statusBreakdown = useMemo(() => {
    const completed = orders.filter((o) => o.orderStatus === 'Selesai').length;
    const processing = orders.filter((o) => o.orderStatus === 'Diproses').length;
    const pending = orders.filter((o) => o.orderStatus === 'Menunggu').length;
    const cancelled = orders.filter((o) => o.orderStatus === 'Dibatalkan').length;
    const total = orders.length || 1;
    return {
      completed,
      processing,
      pending,
      cancelled,
      pctCompleted: Math.round((completed / total) * 100),
      pctProcessing: Math.round((processing / total) * 100),
      pctPending: Math.round((pending / total) * 100),
      pctCancelled: Math.round((cancelled / total) * 100),
    };
  }, [orders]);

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  const targetProgress = useMemo(() => {
    const target = settings?.monthlyTarget || 35000000;
    return target > 0 ? Math.min(100, Math.round((metrics.totalIncome / target) * 100)) : 0;
  }, [settings, metrics.totalIncome]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  }, []);

  const handleDashboardSnapshot = async (format: 'pdf' | 'png') => {
    if (!dashboardRef.current) return;
    setExporting(true);
    setExportMenuOpen(false);
    try {
      const bg = theme === 'dark' ? '#111713' : '#FAF8F4';
      const fileBase = `Dashboard-${storeName}-${today}`;
      if (format === 'pdf') {
        await exportElementToPDF(dashboardRef.current, fileBase, bg, 'landscape');
      } else {
        await exportElementToPNG(dashboardRef.current, fileBase, bg);
      }
    } finally {
      setExporting(false);
    }
  };

  const handleSummaryExport = async (format: 'pdf' | 'img') => {
    setExporting(true);
    setExportMenuOpen(false);
    try {
      if (format === 'pdf') onExportSummaryPDF();
      else await onExportSummaryImage();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div ref={dashboardRef} className="space-y-6">
      {/* Greeting & Quick Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-[#233126] dark:text-[#F8FAF7] tracking-tight">
            {greeting}, {ownerName.split(' ')[0]}
          </h2>
          <p className="text-xs sm:text-sm text-[#616E63] dark:text-[#BCC8BF] mt-0.5">
            Pantau arus kas, pesanan buket &amp; hantaran, serta profitabilitas studio Anda hari ini.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 no-export">
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/88 dark:bg-[#16201A] backdrop-blur-sm border border-[#EAE4DA] dark:border-[#344639] text-xs font-medium text-[#556257] dark:text-[#C8D1C9] surface-3d-subtle whitespace-nowrap">
            <Calendar className="w-3.5 h-3.5 text-accent-fg" />
            <span>{formatDateId(today)}</span>
          </div>

          <div ref={exportMenuRef} className="relative">
            <button
              type="button"
              disabled={exporting}
              onClick={() => setExportMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/88 dark:bg-[#16201A] backdrop-blur-sm border border-[#EAE4DA] dark:border-[#344639] hover:bg-[#F4EFE6] dark:hover:bg-[#222C24] text-xs font-medium text-[#233126] dark:text-[#F8FAF7] btn-3d-secondary cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5 text-[#C69C4D] dark:text-[#F0C975]" />
              <span>{exporting ? 'Menyiapkan...' : 'Unduh Laporan'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#7D877E] dark:text-[#BCC8BF]" />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white/95 dark:bg-[#16201A] backdrop-blur-md rounded-2xl border border-[#EAE4DA] dark:border-[#344639] surface-3d p-2 z-50 space-y-1">
                <p className="px-2.5 pt-1 pb-1 text-[10px] font-semibold text-[#7D877E] dark:text-[#BCC8BF] uppercase tracking-wider">
                  Ekspor PDF &amp; Gambar
                </p>
                <button
                  type="button"
                  onClick={() => handleDashboardSnapshot('pdf')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#233126] dark:text-[#F8FAF7] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] text-left cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-accent-fg shrink-0" />
                  <div>
                    <p>Snapshot Dashboard (PDF)</p>
                    <p className="text-[10px] text-[#7D877E] dark:text-[#BCC8BF]">
                      Grafik, 3D diorama &amp; KPI
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleDashboardSnapshot('png')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#233126] dark:text-[#F8FAF7] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] text-left cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-[#C69C4D] dark:text-[#F0C975] shrink-0" />
                  <div>
                    <p>Snapshot Dashboard (Gambar PNG)</p>
                    <p className="text-[10px] text-[#7D877E] dark:text-[#BCC8BF]">
                      Simpan visual resolusi tinggi
                    </p>
                  </div>
                </button>
                <div className="my-1 border-t border-[#EFEAE1] dark:border-[#344639]" />
                <button
                  type="button"
                  onClick={() => handleSummaryExport('pdf')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#233126] dark:text-[#F8FAF7] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] text-left cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-accent-fg shrink-0" />
                  <div>
                    <p>Rekap Kas &amp; Piutang (PDF)</p>
                    <p className="text-[10px] text-[#7D877E] dark:text-[#BCC8BF]">
                      Tabel lengkap siap cetak A4
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSummaryExport('img')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#233126] dark:text-[#F8FAF7] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] text-left cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-[#C69C4D] dark:text-[#F0C975] shrink-0" />
                  <div>
                    <p>Rekap Kas &amp; Piutang (Gambar PNG)</p>
                    <p className="text-[10px] text-[#7D877E] dark:text-[#BCC8BF]">
                      Ringkasan tutup buku praktis
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenNewOrder}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-medium btn-3d-primary cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Pesanan
          </button>
        </div>
      </div>

      {/* Top 4 KPI Cards (Interactive 3D Perspective Tilt) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Pendapatan */}
        <Card3D className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d flex flex-col justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent-fg flex items-center justify-center icon-3d shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-[#556257] dark:text-[#D4DFD6]">
              Total Pendapatan
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-2">
            <div>
              <p className="font-display font-bold text-xl sm:text-[22px] text-[#233126] dark:text-[#F8FAF7] tabular-nums leading-tight">
                {formatRupiah(metrics.totalIncome)}
              </p>
              <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-accent-fg tabular-nums">
                <ArrowUpRight className="w-3.5 h-3.5" />
                Hari ini {formatCompactRupiah(metrics.todayRevenue)}
              </p>
            </div>
            <Sparkline
              id="rev"
              color={accentHex}
              data={trendData.slice(-7).map((d) => d.income)}
            />
          </div>
        </Card3D>

        {/* Card 2: Total Pengeluaran */}
        <Card3D className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d flex flex-col justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FDF4F5] dark:bg-[#D88C94]/15 text-[#C46F79] dark:text-[#F4B4BC] flex items-center justify-center icon-3d shrink-0">
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-[#556257] dark:text-[#D4DFD6]">
              Total Pengeluaran
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-2">
            <div>
              <p className="font-display font-bold text-xl sm:text-[22px] text-[#233126] dark:text-[#F8FAF7] tabular-nums leading-tight">
                {formatRupiah(metrics.totalExpense)}
              </p>
              <p className="mt-1.5 text-[11px] font-medium text-[#B85D68] dark:text-[#F4B4BC] tabular-nums">
                {metrics.totalIncome > 0
                  ? `${Math.round((metrics.totalExpense / metrics.totalIncome) * 100)}% dari pemasukan`
                  : 'Belum ada rasio'}
              </p>
            </div>
            <Sparkline
              id="exp"
              color="#D88C94"
              data={trendData.slice(-7).map((d) => d.expense)}
            />
          </div>
        </Card3D>

        {/* Card 3: Keuntungan Bersih */}
        <Card3D className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d flex flex-col justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FBF7EC] dark:bg-[#C69C4D]/15 text-[#C69C4D] dark:text-[#F0C975] flex items-center justify-center icon-3d shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-[#556257] dark:text-[#D4DFD6]">
              Keuntungan Bersih
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-2">
            <div>
              <p className="font-display font-bold text-xl sm:text-[22px] text-[#233126] dark:text-[#F8FAF7] tabular-nums leading-tight">
                {formatRupiah(metrics.netProfit)}
              </p>
              <p className="mt-1.5 text-[11px] font-medium text-[#9E7628] dark:text-[#F0C975] tabular-nums">
                Margin laba {metrics.profitMargin}%
              </p>
            </div>
            <Sparkline
              id="prof"
              color="#C69C4D"
              data={trendData.slice(-7).map((d) => Math.max(0, d.profit))}
            />
          </div>
        </Card3D>

        {/* Card 4: Total Pesanan */}
        <Card3D className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d flex flex-col justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-accent-fg flex items-center justify-center icon-3d shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-[#556257] dark:text-[#D4DFD6]">
              Total Pesanan
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-2">
            <div>
              <p className="font-display font-bold text-xl sm:text-[22px] text-[#233126] dark:text-[#F8FAF7] tabular-nums leading-tight">
                {metrics.totalOrdersCount}
              </p>
              <p className="mt-1.5 text-[11px] font-medium text-[#616E63] dark:text-[#BCC8BF] tabular-nums">
                {statusBreakdown.processing + statusBreakdown.pending} aktif diproses
              </p>
            </div>
            <Sparkline
              id="ord"
              color={accentHex}
              data={[3, 5, 4, 7, 6, 9, metrics.totalOrdersCount]}
            />
          </div>
        </Card3D>
      </div>

      {/* Middle Row: 8-col Financial Chart + 4-col Category 3D Diorama / Donut Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Left: Grafik Keuangan */}
        <div className="xl:col-span-8 bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-5 surface-3d flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7]">
                  Grafik Keuangan
                </h3>
                <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
                  Tren pemasukan, pengeluaran, dan keuntungan bersih studio
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] surface-3d-subtle">
                  {(['7d', '14d', '30d'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setChartRange(r)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                        chartRange === r
                          ? 'bg-white dark:bg-[#16201A] text-[#233126] dark:text-[#F8FAF7] surface-3d-subtle border border-[#EAE4DA] dark:border-[#364439]'
                          : 'text-[#616E63] dark:text-[#BCC8BF] hover:text-[#233126] dark:hover:text-[#F3EFE6]'
                      }`}
                    >
                      {r === '7d' ? '7 Hari' : r === '14d' ? '14 Hari' : '30 Hari'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Legend / Series Toggles */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <button
                type="button"
                onClick={() => setShowIncome((v) => !v)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-opacity cursor-pointer ${
                  showIncome
                    ? 'border-accent-soft bg-accent-soft text-accent-fg'
                    : 'border-[#EAE4DA] dark:border-[#344639] bg-white dark:bg-[#16201A] text-[#8E968F] opacity-60'
                }`}
              >
                <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: accentHex }} />
                Pemasukan
              </button>
              <button
                type="button"
                onClick={() => setShowExpense((v) => !v)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-opacity cursor-pointer ${
                  showExpense
                    ? 'border-[#F2CFD3] dark:border-[#D88C94]/40 bg-[#FDF4F5] dark:bg-[#D88C94]/15 text-[#B85D68] dark:text-[#F4B4BC]'
                    : 'border-[#EAE4DA] dark:border-[#344639] bg-white dark:bg-[#16201A] text-[#8E968F] opacity-60'
                }`}
              >
                <span className="w-2.5 h-0.5 bg-[#D88C94] rounded-full" />
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => setShowProfit((v) => !v)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-opacity cursor-pointer ${
                  showProfit
                    ? 'border-[#EEDCA9] dark:border-[#C69C4D]/40 bg-[#FBF7EC] dark:bg-[#C69C4D]/15 text-[#9E7628] dark:text-[#F0C975]'
                    : 'border-[#EAE4DA] dark:border-[#344639] bg-white dark:bg-[#16201A] text-[#8E968F] opacity-60'
                }`}
              >
                <span className="w-2.5 h-0.5 bg-[#C69C4D] rounded-full" />
                Keuntungan
              </button>
            </div>

            <FinancialTrendChart
              data={trendData}
              showIncome={showIncome}
              showExpense={showExpense}
              showProfit={showProfit}
              accentColor={accentHex}
            />
          </div>

          {/* Bottom 4-Column Summary Strip */}
          <div className="mt-4 pt-4 border-t border-[#EFEAE1] dark:border-[#344639] grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent-fg flex items-center justify-center icon-3d shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] truncate">
                  Pendapatan Hari Ini
                </p>
                <p className="font-display font-bold text-sm text-[#233126] dark:text-[#F8FAF7] tabular-nums truncate">
                  {formatRupiah(metrics.todayRevenue)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FDF4F5] dark:bg-[#D88C94]/15 text-[#C46F79] dark:text-[#F4B4BC] flex items-center justify-center icon-3d shrink-0">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] truncate">
                  Piutang Pelanggan
                </p>
                <p className="font-display font-bold text-sm text-[#B85D68] dark:text-[#F4B4BC] tabular-nums truncate">
                  {formatRupiah(metrics.receivables)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FBF7EC] dark:bg-[#C69C4D]/15 text-[#C69C4D] dark:text-[#F0C975] flex items-center justify-center icon-3d shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] truncate">
                  Pesanan Hari Ini
                </p>
                <p className="font-display font-bold text-sm text-[#233126] dark:text-[#F8FAF7] tabular-nums truncate">
                  {metrics.todayOrdersCount} Pesanan
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-accent-fg flex items-center justify-center icon-3d shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] truncate">
                  Puncak Harian
                </p>
                <p className="font-display font-bold text-sm text-[#233126] dark:text-[#F8FAF7] tabular-nums truncate">
                  {formatCompactRupiah(peakIncome.income)} · {peakIncome.label}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Kategori Buket & Hantaran (Interactive 3D Diorama — no backdrop-blur on WebGL card) */}
        <div className="xl:col-span-4 bg-white/92 dark:bg-[#16201A] rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-5 surface-3d flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7]">
                  Kategori Buket &amp; Hantaran
                </h3>
                <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
                  Proporsi pesanan per jenis produk
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className="inline-flex items-center p-0.5 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639]"
                  role="group"
                  aria-label="Mode visual kategori"
                >
                  <button
                    type="button"
                    onClick={() => setCategoryViewMode('3d')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      categoryViewMode === '3d'
                        ? 'text-white nav-item-3d-active'
                        : 'text-[#616E63] dark:text-[#BCC8BF]'
                    }`}
                  >
                    3D
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryViewMode('2d')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      categoryViewMode === '2d'
                        ? 'text-white nav-item-3d-active'
                        : 'text-[#616E63] dark:text-[#BCC8BF]'
                    }`}
                  >
                    2D
                  </button>
                </div>
                <select
                  value={categoryScope}
                  onChange={(e) => setCategoryScope(e.target.value as 'all' | 'active')}
                  aria-label="Filter kategori pesanan"
                  className="px-2 py-1.5 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-[11px] font-medium text-[#556257] dark:text-[#C8D1C9] focus:outline-none cursor-pointer"
                >
                  <option value="all">Semua</option>
                  <option value="active">Aktif</option>
                </select>
              </div>
            </div>

            {categoryViewMode === '3d' ? (
              <Category3DScene
                segments={categoryData.segments}
                totalCount={categoryData.total}
                theme={theme}
                accentHex={accentHex}
                hoveredLabel={hoveredCategory}
                onHoverLabel={setHoveredCategory}
              />
            ) : (
              <CategoryDonutChart
                segments={categoryData.segments}
                totalCount={categoryData.total}
              />
            )}
          </div>

          {categoryData.top && (
            <div className="mt-4 rounded-xl bg-[#FBF7EC] dark:bg-[#C69C4D]/10 border border-[#EFE2C2] dark:border-[#C69C4D]/25 p-3.5 flex items-start gap-3 surface-3d-subtle">
              <div className="w-8 h-8 rounded-lg bg-[#F5EBD0] dark:bg-[#C69C4D]/20 text-[#A88035] dark:text-[#F0C975] flex items-center justify-center icon-3d shrink-0">
                <Crown className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#233126] dark:text-[#F8FAF7]">
                  Kategori Terlaris
                </p>
                <p className="text-[11px] text-[#616E63] dark:text-[#D4DFD6] mt-0.5 leading-relaxed">
                  <strong className="text-[#233126] dark:text-[#F8FAF7]">
                    {categoryData.top.label}
                  </strong>{' '}
                  mendominasi dengan {categoryData.top.count} pesanan (
                  {formatCompactRupiah(categoryData.top.revenue)}).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* D3 Monthly Income Trend (Last 6 Months) */}
      <MonthlyIncomeD3Chart
        transactions={transactions}
        theme={theme}
        accentHex={accentHex}
      />

      {/* Bottom 3-Column Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Card 1: Pesanan Terlaris */}
        <div className="lg:col-span-4 bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-5 surface-3d flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7]">
              Pesanan Terlaris
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('pesanan')}
              className="text-xs font-medium text-accent-fg hover:underline cursor-pointer"
            >
              Lihat Semua
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {topProducts.length === 0 ? (
              <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF] py-8 text-center">
                Belum ada data pesanan.
              </p>
            ) : (
              topProducts.map((item, idx) => (
                <div
                  key={item.productName}
                  className="flex items-center justify-between gap-3 py-1"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center icon-3d shrink-0 tabular-nums ${
                        idx === 0
                          ? 'bg-accent text-white'
                          : idx === 1
                            ? 'bg-[#C69C4D] text-white'
                            : 'bg-[#F4EFE6] dark:bg-[#1F2B23] text-[#616E63] dark:text-[#BCC8BF]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <img
                      src={getProductImage(item.imageKey, item.category)}
                      alt={item.productName}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-xl object-cover bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] icon-3d shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#233126] dark:text-[#F8FAF7] truncate">
                        {item.productName}
                      </p>
                      <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] tabular-nums">
                        {item.qty} unit · {item.ordersCount} order
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#233126] dark:text-[#F8FAF7] tabular-nums shrink-0">
                    {formatRupiah(item.revenue)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 2: Status Pesanan (Gauge + 4 Tiles) */}
        <div className="lg:col-span-4 bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-5 surface-3d flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7]">
              Status Pesanan
            </h3>
            <span className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] tabular-nums">
              {orders.length} Total
            </span>
          </div>

          <div className="my-2">
            <OrderStatusGauge
              completed={statusBreakdown.completed}
              processing={statusBreakdown.processing}
              pending={statusBreakdown.pending}
              cancelled={statusBreakdown.cancelled}
              accentColor={accentHex}
            />
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('pesanan')}
              className="rounded-xl bg-accent-soft border border-accent-soft p-2.5 text-center surface-3d-subtle transition-transform hover:-translate-y-0.5 cursor-pointer"
            >
              <p className="text-[11px] font-semibold text-accent-fg tabular-nums">
                {statusBreakdown.pctCompleted}%
              </p>
              <p className="font-display font-bold text-base text-[#233126] dark:text-[#F8FAF7] tabular-nums mt-0.5">
                {statusBreakdown.completed}
              </p>
              <p className="text-[10px] text-[#556257] dark:text-[#D4DFD6] truncate">Selesai</p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('pesanan')}
              className="rounded-xl bg-[#FBF7EC] dark:bg-[#C69C4D]/15 border border-[#EFE2C2] dark:border-[#C69C4D]/30 p-2.5 text-center hover:bg-[#F5EBD0]/70 dark:hover:bg-[#C69C4D]/25 surface-3d-subtle transition-transform hover:-translate-y-0.5 cursor-pointer"
            >
              <p className="text-[11px] font-semibold text-[#A88035] dark:text-[#F0C975] tabular-nums">
                {statusBreakdown.pctProcessing}%
              </p>
              <p className="font-display font-bold text-base text-[#233126] dark:text-[#F8FAF7] tabular-nums mt-0.5">
                {statusBreakdown.processing}
              </p>
              <p className="text-[10px] text-[#556257] dark:text-[#D4DFD6] truncate">Diproses</p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('pesanan')}
              className="rounded-xl bg-[#FDF4F5] dark:bg-[#D88C94]/15 border border-[#F2CFD3] dark:border-[#D88C94]/30 p-2.5 text-center hover:bg-[#F9E5E7] dark:hover:bg-[#D88C94]/25 surface-3d-subtle transition-transform hover:-translate-y-0.5 cursor-pointer"
            >
              <p className="text-[11px] font-semibold text-[#B85D68] dark:text-[#F4B4BC] tabular-nums">
                {statusBreakdown.pctPending}%
              </p>
              <p className="font-display font-bold text-base text-[#233126] dark:text-[#F8FAF7] tabular-nums mt-0.5">
                {statusBreakdown.pending}
              </p>
              <p className="text-[10px] text-[#556257] dark:text-[#D4DFD6] truncate">Menunggu</p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('pesanan')}
              className="rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] p-2.5 text-center hover:bg-[#F4EFE6] dark:hover:bg-[#2A362D] surface-3d-subtle transition-transform hover:-translate-y-0.5 cursor-pointer"
            >
              <p className="text-[11px] font-semibold text-[#7D877E] dark:text-[#BCC8BF] tabular-nums">
                {statusBreakdown.pctCancelled}%
              </p>
              <p className="font-display font-bold text-base text-[#233126] dark:text-[#F8FAF7] tabular-nums mt-0.5">
                {statusBreakdown.cancelled}
              </p>
              <p className="text-[10px] text-[#556257] dark:text-[#D4DFD6] truncate">Batal</p>
            </button>
          </div>
        </div>

        {/* Card 3: Ringkasan Pembayaran & Bisnis */}
        <div className="lg:col-span-4 bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-5 surface-3d flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#FBF7EC] dark:bg-[#C69C4D]/15 text-[#C69C4D] dark:text-[#F0C975] flex items-center justify-center icon-3d shrink-0">
                <Lightbulb className="w-4 h-4" />
              </div>
              <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7]">
                Ringkasan Pembayaran
              </h3>
            </div>

            <div className="grid grid-cols-2 border border-[#EAE4DA] dark:border-[#344639] rounded-xl overflow-hidden surface-3d-subtle">
              <div className="p-3.5 border-b border-r border-[#EAE4DA] dark:border-[#344639]">
                <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">
                  Lunas ({metrics.lunasCount} order)
                </p>
                <p className="font-display font-bold text-sm text-accent-fg tabular-nums mt-1">
                  {formatRupiah(metrics.lunasCollected)}
                </p>
              </div>
              <div className="p-3.5 border-b border-[#EAE4DA] dark:border-[#344639]">
                <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">
                  DP Masuk ({metrics.dpCount} order)
                </p>
                <p className="font-display font-bold text-sm text-[#9E7628] dark:text-[#F0C975] tabular-nums mt-1">
                  {formatRupiah(metrics.dpCollected)}
                </p>
              </div>
              <div className="p-3.5 border-r border-[#EAE4DA] dark:border-[#344639]">
                <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">Piutang Pelanggan</p>
                <p className="font-display font-bold text-sm text-[#B85D68] dark:text-[#F4B4BC] tabular-nums mt-1">
                  {formatRupiah(metrics.receivables)}
                </p>
              </div>
              <div className="p-3.5">
                <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">Target Bulanan</p>
                <p className="font-display font-bold text-sm text-[#233126] dark:text-[#F8FAF7] tabular-nums mt-1">
                  {targetProgress}% tercapai
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] px-3.5 py-2.5 text-xs text-[#556257] dark:text-[#D4DFD6] surface-3d-subtle leading-relaxed">
            {metrics.lowStockCount > 0 ? (
              <span>
                Perhatian:{' '}
                <strong className="text-[#B85D68] dark:text-[#F4B4BC]">
                  {metrics.lowStockCount} bahan baku
                </strong>{' '}
                di bawah stok minimum.{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('stok_bahan')}
                  className="font-semibold text-accent-fg underline cursor-pointer"
                >
                  Cek Stok
                </button>
              </span>
            ) : (
              <span>Seluruh stok bahan baku dalam kondisi aman dan terkendali.</span>
            )}
          </div>
        </div>
      </div>

      {/* Pesanan Terbaru Table */}
      <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-5 surface-3d">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7]">
              Pesanan Terbaru
            </h3>
            <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
              Daftar transaksi pesanan terbaru beserta status pelunasan
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('pesanan')}
            className="text-xs font-medium text-accent-fg hover:underline cursor-pointer self-start sm:self-auto"
          >
            Kelola Semua Pesanan →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EFEAE1] dark:border-[#344639] text-[11px] font-semibold text-[#7D877E] dark:text-[#BCC8BF]">
                <th className="py-2.5 pr-4">Invoice</th>
                <th className="py-2.5 pr-4">Pelanggan</th>
                <th className="py-2.5 pr-4">Produk Buket / Hantaran</th>
                <th className="py-2.5 pr-4">Kirim</th>
                <th className="py-2.5 pr-4 text-right">Total</th>
                <th className="py-2.5 pr-4">Pembayaran</th>
                <th className="py-2.5 pr-4">Status</th>
                <th className="py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EFE6] dark:divide-[#2E3E32] text-xs">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#7D877E] dark:text-[#BCC8BF]">
                    Belum ada pesanan masuk.
                  </td>
                </tr>
              ) : (
                recentOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="hover:bg-[#FAF8F4]/70 dark:hover:bg-[#222C24]/60 transition-colors"
                  >
                    <td className="py-3 pr-4 font-mono font-medium text-[#233126] dark:text-[#F8FAF7] whitespace-nowrap">
                      {o.invoiceNumber}
                    </td>
                    <td className="py-3 pr-4 font-medium text-[#233126] dark:text-[#F8FAF7] whitespace-nowrap">
                      {o.customerName}
                    </td>
                    <td className="py-3 pr-4 text-[#556257] dark:text-[#D4DFD6] max-w-[240px] truncate">
                      {o.productName}
                    </td>
                    <td className="py-3 pr-4 text-[#7D877E] dark:text-[#BCC8BF] tabular-nums whitespace-nowrap">
                      {formatDateId(o.dueDate)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono font-semibold text-[#233126] dark:text-[#F8FAF7] tabular-nums whitespace-nowrap">
                      {formatRupiah(o.totalAmount)}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span
                        className={`text-xs font-medium ${
                          o.paymentStatus === 'Lunas'
                            ? 'text-accent-fg'
                            : o.paymentStatus === 'DP'
                              ? 'text-[#A88035] dark:text-[#F0C975]'
                              : 'text-[#B85D68] dark:text-[#F4B4BC]'
                        }`}
                      >
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span className="text-xs text-[#556257] dark:text-[#D4DFD6]">
                        {o.orderStatus}
                      </span>
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectOrderForInvoice(o.id)}
                        className="text-xs font-medium text-accent-fg hover:underline cursor-pointer"
                      >
                        Invoice
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
