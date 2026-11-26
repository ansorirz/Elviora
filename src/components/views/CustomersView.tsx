import React, { useMemo, useState } from 'react';
import { Edit2, Mail, MapPin, Phone, Plus, Search, Trash2, X } from 'lucide-react';
import {
  type Customer,
  type CustomerSegment,
  type Order,
  CUSTOMER_SEGMENTS,
  formatRupiah,
} from '../../types';

interface CustomersViewProps {
  customers: Customer[];
  orders: Order[];
  globalSearch: string;
  onCreateCustomer: (payload: Omit<Customer, 'id' | 'ownerId'>) => Promise<string>;
  onUpdateCustomer: (id: string, payload: Omit<Customer, 'id' | 'ownerId'>) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
}

export function CustomersView({
  customers,
  orders,
  globalSearch,
  onCreateCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
}: CustomersViewProps) {
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<'Semua' | CustomerSegment>('Semua');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [segment, setSegment] = useState<CustomerSegment>('Reguler');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const customerStats = useMemo(() => {
    const map = new Map<string, { orderCount: number; totalSpend: number; piutang: number }>();
    orders
      .filter((o) => o.orderStatus !== 'Dibatalkan')
      .forEach((o) => {
        const cur = map.get(o.customerId) || { orderCount: 0, totalSpend: 0, piutang: 0 };
        cur.orderCount += 1;
        cur.totalSpend += o.totalAmount;
        cur.piutang += Math.max(0, o.totalAmount - o.paidAmount);
        map.set(o.customerId, cur);
      });
    return map;
  }, [orders]);

  const queryText = (search || globalSearch).trim().toLowerCase();

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (segmentFilter !== 'Semua' && c.segment !== segmentFilter) return false;
      if (!queryText) return true;
      return (
        c.name.toLowerCase().includes(queryText) ||
        c.phone.toLowerCase().includes(queryText) ||
        c.address.toLowerCase().includes(queryText)
      );
    });
  }, [customers, segmentFilter, queryText]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setSegment('Reguler');
    setNotes('');
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email || '');
    setAddress(c.address || '');
    setSegment(c.segment);
    setNotes(c.notes || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSaving(true);
    try {
      const payload: Omit<Customer, 'id' | 'ownerId'> = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        segment,
        notes: notes.trim(),
      };
      if (editing) await onUpdateCustomer(editing.id, payload);
      else await onCreateCustomer(payload);
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
            Data Pelanggan
          </h2>
          <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
            Database kontak pelanggan, segmen VIP/Korporat, serta total transaksi dan piutang.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-medium btn-3d-primary cursor-pointer self-start sm:self-auto whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Tambah Pelanggan
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d-subtle flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7D877E] dark:text-[#B2C0B5] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, nomor WhatsApp, atau alamat pelanggan..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] placeholder:text-[#8E968F] dark:placeholder:text-[#93A397] focus:outline-none focus-border-accent"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639]">
          {(['Semua', ...CUSTOMER_SEGMENTS] as const).map((seg) => (
            <button
              key={seg}
              type="button"
              onClick={() => setSegmentFilter(seg)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                segmentFilter === seg
                  ? 'bg-white dark:bg-[#16201A] text-[#233126] dark:text-[#F8FAF7] shadow-xs border border-[#EAE4DA] dark:border-[#364439]'
                  : 'text-[#616E63] dark:text-[#BCC8BF] hover:text-[#233126] dark:hover:text-[#F3EFE6]'
              }`}
            >
              {seg}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-12 text-center text-xs text-[#7D877E] dark:text-[#BCC8BF] surface-3d">
          Belum ada data pelanggan yang sesuai.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const st = customerStats.get(c.id) || { orderCount: 0, totalSpend: 0, piutang: 0 };
            return (
              <div
                key={c.id}
                className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-5 surface-3d transition-transform duration-200 hover:-translate-y-0.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7]">
                        {c.name}
                      </h3>
                      <p className="text-[11px] font-medium text-[#A88035] dark:text-[#F0C975] mt-0.5">
                        Segmen {c.segment}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        title="Edit Pelanggan"
                        className="p-1.5 rounded-lg text-[#556257] dark:text-[#D4DFD6] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCustomer(c.id)}
                        title="Hapus Pelanggan"
                        className="p-1.5 rounded-lg text-[#C46F79] dark:text-[#F4B4BC] hover:bg-[#FDF4F5] dark:hover:bg-[#D88C94]/15 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-[#616E63] dark:text-[#D4DFD6]">
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-accent-fg shrink-0" />
                      <span className="font-mono">{c.phone}</span>
                    </p>
                    {c.email && (
                      <p className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-accent-fg shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </p>
                    )}
                    {c.address && (
                      <p className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-accent-fg shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{c.address}</span>
                      </p>
                    )}
                  </div>

                  {c.notes && (
                    <p className="mt-3 text-[11px] text-[#7D877E] dark:text-[#BCC8BF] bg-[#FAF8F4] dark:bg-[#1F2B23] rounded-xl px-3 py-2">
                      {c.notes}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3.5 border-t border-[#EFEAE1] dark:border-[#344639] grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-[#7D877E] dark:text-[#BCC8BF]">Pesanan</p>
                    <p className="font-display font-bold text-xs text-[#233126] dark:text-[#F8FAF7] tabular-nums mt-0.5">
                      {st.orderCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#7D877E] dark:text-[#BCC8BF]">Total Belanja</p>
                    <p className="font-mono font-semibold text-xs text-accent-fg tabular-nums mt-0.5">
                      {formatRupiah(st.totalSpend)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#7D877E] dark:text-[#BCC8BF]">Piutang</p>
                    <p
                      className={`font-mono font-semibold text-xs tabular-nums mt-0.5 ${
                        st.piutang > 0
                          ? 'text-[#B85D68] dark:text-[#F4B4BC]'
                          : 'text-[#7D877E] dark:text-[#BCC8BF]'
                      }`}
                    >
                      {formatRupiah(st.piutang)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add/Edit Customer */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#233126]/40 dark:bg-black/60 backdrop-blur-[2px]">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-[#16201A] rounded-2xl border border-[#EAE4DA] dark:border-[#344639] surface-3d w-full max-w-lg p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#EFEAE1] dark:border-[#344639]">
              <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7]">
                {editing ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-[#7D877E] dark:text-[#BCC8BF] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                  No. WhatsApp
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                  Segmen
                </label>
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value as CustomerSegment)}
                  className={inputCls}
                >
                  {CUSTOMER_SEGMENTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                  Email (Opsional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                  Alamat
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                  Catatan Preferensi
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
