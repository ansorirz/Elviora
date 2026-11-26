import React, { useMemo, useState } from 'react';
import { Edit2, Plus, Search, Trash2, TrendingDown, TrendingUp, X } from 'lucide-react';
import {
  type PaymentMethod,
  type Transaction,
  type TransactionType,
  PAYMENT_METHODS,
  formatDateId,
  formatRupiah,
  getTodayISO,
} from '../../types';

interface TransactionsViewProps {
  mode: TransactionType;
  transactions: Transaction[];
  globalSearch: string;
  onCreateTransaction: (payload: Omit<Transaction, 'id' | 'ownerId'>) => Promise<string>;
  onUpdateTransaction: (id: string, payload: Omit<Transaction, 'id' | 'ownerId'>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
}

const INCOME_CATEGORIES = [
  'Buket Bunga',
  'Hantaran Lamaran',
  'Buket Uang & Snack',
  'Hampers Musiman',
  'Dekorasi & Custom',
  'Pelunasan DP',
  'Lainnya',
];

const EXPENSE_CATEGORIES = [
  'Bunga Segar',
  'Bunga Kering',
  'Wrapping & Pita',
  'Box & Hantaran',
  'Operasional & Gaji',
  'Kurir & Pengiriman',
  'Pemasaran',
  'Lainnya',
];

export function TransactionsView({
  mode,
  transactions,
  globalSearch,
  onCreateTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
}: TransactionsViewProps) {
  const isIncome = mode === 'pemasukan';
  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const today = getTodayISO();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Semua');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [amount, setAmount] = useState(250000);
  const [date, setDate] = useState(today);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Transfer Bank');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const modeTx = useMemo(
    () => transactions.filter((t) => t.type === mode),
    [transactions, mode]
  );

  const queryText = (search || globalSearch).trim().toLowerCase();

  const filtered = useMemo(() => {
    return modeTx.filter((t) => {
      if (catFilter !== 'Semua' && t.category !== catFilter) return false;
      if (!queryText) return true;
      return (
        t.title.toLowerCase().includes(queryText) ||
        t.category.toLowerCase().includes(queryText) ||
        t.notes.toLowerCase().includes(queryText)
      );
    });
  }, [modeTx, catFilter, queryText]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, t) => s + t.amount, 0);
    const todaySum = filtered.filter((t) => t.date === today).reduce((s, t) => s + t.amount, 0);
    const avg = filtered.length > 0 ? Math.round(total / filtered.length) : 0;

    const byCat = new Map<string, number>();
    filtered.forEach((t) => {
      byCat.set(t.category, (byCat.get(t.category) || 0) + t.amount);
    });
    const topCategories = Array.from(byCat.entries())
      .map(([name, val]) => ({ name, val }))
      .sort((a, b) => b.val - a.val)
      .slice(0, 4);

    return { total, todaySum, avg, count: filtered.length, topCategories };
  }, [filtered, today]);

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setCategory(categories[0]);
    setAmount(isIncome ? 500000 : 250000);
    setDate(today);
    setPaymentMethod('Transfer Bank');
    setNotes('');
    setModalOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setTitle(t.title);
    setCategory(t.category);
    setAmount(t.amount);
    setDate(t.date);
    setPaymentMethod(t.paymentMethod);
    setNotes(t.notes || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload: Omit<Transaction, 'id' | 'ownerId'> = {
        type: mode,
        title: title.trim(),
        category,
        amount: Math.max(0, Number(amount) || 0),
        date,
        paymentMethod,
        orderId: editing?.orderId || '',
        notes: notes.trim(),
      };
      if (editing) await onUpdateTransaction(editing.id, payload);
      else await onCreateTransaction(payload);
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] focus:outline-none focus-border-accent';

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-xl text-[#233126] dark:text-[#F8FAF7]">
            {isIncome ? 'Buku Pemasukan' : 'Buku Pengeluaran'}
          </h2>
          <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
            {isIncome
              ? 'Catatan seluruh uang masuk dari penjualan buket, hantaran, dan pelunasan DP.'
              : 'Catatan seluruh biaya kulakan bunga, perlengkapan wrapping, box, dan operasional.'}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-medium cursor-pointer self-start sm:self-auto whitespace-nowrap ${
            isIncome ? 'btn-3d-primary' : 'bg-[#C46F79] hover:bg-[#B25C66] shadow-sm'
          }`}
        >
          <Plus className="w-4 h-4" />
          {isIncome ? 'Catat Pemasukan' : 'Catat Pengeluaran'}
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d">
          <div className="flex items-center gap-2 text-xs text-[#7D877E] dark:text-[#BCC8BF]">
            {isIncome ? (
              <TrendingUp className="w-4 h-4 text-accent-fg" />
            ) : (
              <TrendingDown className="w-4 h-4 text-[#C46F79] dark:text-[#F4B4BC]" />
            )}
            <span>Total {isIncome ? 'Pemasukan' : 'Pengeluaran'}</span>
          </div>
          <p
            className={`font-display font-bold text-xl tabular-nums mt-2 ${
              isIncome ? 'text-accent-fg' : 'text-[#B85D68] dark:text-[#F4B4BC]'
            }`}
          >
            {formatRupiah(stats.total)}
          </p>
        </div>

        <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d">
          <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
            Hari Ini ({formatDateId(today)})
          </p>
          <p className="font-display font-bold text-xl text-[#233126] dark:text-[#F8FAF7] tabular-nums mt-2">
            {formatRupiah(stats.todaySum)}
          </p>
        </div>

        <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d">
          <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
            Rata-rata per Transaksi ({stats.count}x)
          </p>
          <p className="font-display font-bold text-xl text-[#233126] dark:text-[#F8FAF7] tabular-nums mt-2">
            {formatRupiah(stats.avg)}
          </p>
        </div>
      </div>

      {/* Category Breakdown Bar */}
      {stats.topCategories.length > 0 && (
        <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d">
          <p className="text-xs font-semibold text-[#233126] dark:text-[#F8FAF7] mb-3">
            Distribusi Kategori Terbesar
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.topCategories.map((c) => {
              const pct = stats.total > 0 ? Math.round((c.val / stats.total) * 100) : 0;
              return (
                <div
                  key={c.name}
                  className="rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] p-3 surface-3d-subtle"
                >
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[#233126] dark:text-[#F8FAF7] truncate">
                      {c.name}
                    </span>
                    <span className="font-mono text-[#7D877E] dark:text-[#BCC8BF] tabular-nums">
                      {pct}%
                    </span>
                  </div>
                  <p className="font-mono font-semibold text-sm text-[#233126] dark:text-[#F8FAF7] tabular-nums mt-1">
                    {formatRupiah(c.val)}
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-[#EAE4DA] dark:bg-[#2E3A30] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isIncome ? 'bg-accent' : 'bg-[#D88C94]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d-subtle flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7D877E] dark:text-[#B2C0B5] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Cari keterangan ${isIncome ? 'pemasukan' : 'pengeluaran'}...`}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] placeholder:text-[#8E968F] dark:placeholder:text-[#93A397] focus:outline-none focus-border-accent"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] focus:outline-none"
        >
          <option value="Semua">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Ledger Table */}
      <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] overflow-hidden surface-3d">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF8F4] dark:bg-[#1F2B23] border-b border-[#EAE4DA] dark:border-[#344639] text-[11px] font-semibold text-[#7D877E] dark:text-[#BCC8BF]">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Keterangan</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EFE6] dark:divide-[#2E3E32] text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#7D877E] dark:text-[#BCC8BF]">
                    Belum ada catatan {mode}.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-[#FAF8F4]/70 dark:hover:bg-[#222C24]/60 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-[#616E63] dark:text-[#BCC8BF] tabular-nums whitespace-nowrap">
                      {formatDateId(t.date)}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#233126] dark:text-[#F8FAF7]">{t.title}</p>
                      {t.notes && (
                        <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] mt-0.5">
                          {t.notes}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#556257] dark:text-[#D4DFD6] whitespace-nowrap">
                      {t.category}
                    </td>
                    <td className="py-3 px-4 text-[#616E63] dark:text-[#BCC8BF] whitespace-nowrap">
                      {t.paymentMethod}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                        isIncome ? 'text-accent-fg' : 'text-[#B85D68] dark:text-[#F4B4BC]'
                      }`}
                    >
                      {isIncome ? '+' : '-'} {formatRupiah(t.amount)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(t)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-[#556257] dark:text-[#D4DFD6] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTransaction(t.id)}
                          title="Hapus"
                          className="p-1.5 rounded-lg text-[#C46F79] dark:text-[#F4B4BC] hover:bg-[#FDF4F5] dark:hover:bg-[#D88C94]/15 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Transaction Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#233126]/40 dark:bg-black/60 backdrop-blur-[2px]">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-[#16201A] rounded-2xl border border-[#EAE4DA] dark:border-[#344639] surface-3d w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#EFEAE1] dark:border-[#344639]">
              <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7]">
                {editing
                  ? `Edit ${isIncome ? 'Pemasukan' : 'Pengeluaran'}`
                  : `Catat ${isIncome ? 'Pemasukan' : 'Pengeluaran'}`}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-[#7D877E] dark:text-[#BCC8BF] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                  Keterangan
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isIncome ? 'Mis. Pelunasan Buket Mawar' : 'Mis. Kulakan Bunga Segar'}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={inputCls}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                    Metode
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className={inputCls}
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                    Nominal (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    required
                    value={amount}
                    onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`${inputCls} font-mono`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                  Catatan
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] text-xs font-medium text-[#556257] dark:text-[#D4DFD6] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] btn-3d-secondary cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl text-white text-xs font-medium btn-3d-primary cursor-pointer"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
