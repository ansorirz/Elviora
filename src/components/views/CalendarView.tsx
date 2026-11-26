import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { type Order, formatDateId, formatRupiah, getTodayISO } from '../../types';

interface CalendarViewProps {
  orders: Order[];
  onNewOrderForDate: (dueDateISO: string) => void;
  onSelectOrderForInvoice: (orderId: string) => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function CalendarView({
  orders,
  onNewOrderForDate,
  onSelectOrderForInvoice,
}: CalendarViewProps) {
  const today = getTodayISO();
  const [todayY, todayM] = today.split('-').map(Number);
  const [year, setYear] = useState(todayY);
  const [month, setMonth] = useState(todayM - 1);
  const [selectedDate, setSelectedDate] = useState(today);

  const ordersByDueDate = useMemo(() => {
    const map = new Map<string, Order[]>();
    orders.forEach((o) => {
      const list = map.get(o.dueDate) || [];
      list.push(o);
      map.set(o.dueDate, list);
    });
    return map;
  }, [orders]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { day: number | null; iso: string }[] = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, iso: `empty-start-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      cells.push({ day: d, iso: `${year}-${mm}-${dd}` });
    }
    return cells;
  }, [year, month]);

  const selectedDayOrders = ordersByDueDate.get(selectedDate) || [];

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-xl text-[#233126] dark:text-[#F8FAF7]">
            Kalender Pesanan
          </h2>
          <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
            Pantau jadwal pengiriman buket dan serah terima hantaran agar tidak bentrok.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNewOrderForDate(selectedDate)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-medium btn-3d-primary cursor-pointer self-start sm:self-auto whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Jadwalkan di {formatDateId(selectedDate)}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Monthly Calendar Grid */}
        <div className="xl:col-span-8 bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-5 surface-3d">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7]">
              {MONTH_NAMES[month]} {year}
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Bulan sebelumnya"
                className="p-2 rounded-xl bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] text-[#556257] dark:text-[#D4DFD6] btn-3d-secondary cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setYear(todayY);
                  setMonth(todayM - 1);
                  setSelectedDate(today);
                }}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] text-xs font-medium text-[#233126] dark:text-[#F8FAF7] btn-3d-secondary cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Bulan berikutnya"
                className="p-2 rounded-xl bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] text-[#556257] dark:text-[#D4DFD6] btn-3d-secondary cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold text-[#7D877E] dark:text-[#BCC8BF] mb-2">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1.5">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((cell) => {
              if (cell.day === null) {
                return (
                  <div
                    key={cell.iso}
                    className="h-20 sm:h-24 rounded-xl bg-[#FAF8F4]/40 dark:bg-[#1F2B23]/30"
                  />
                );
              }
              const dayOrders = ordersByDueDate.get(cell.iso) || [];
              const isSelected = selectedDate === cell.iso;
              const isToday = today === cell.iso;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => setSelectedDate(cell.iso)}
                  className={`h-20 sm:h-24 rounded-xl border p-2 text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'border-accent bg-accent-soft surface-3d-subtle'
                      : 'border-[#EFEAE1] dark:border-[#344639] bg-white/80 dark:bg-[#16201A]/80 hover:bg-[#FAF8F4] dark:hover:bg-[#222C24]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-mono font-semibold tabular-nums ${
                        isToday
                          ? 'text-accent-fg underline'
                          : isSelected
                            ? 'text-[#233126] dark:text-[#F8FAF7]'
                            : 'text-[#556257] dark:text-[#D4DFD6]'
                      }`}
                    >
                      {cell.day}
                    </span>
                    {dayOrders.length > 0 && (
                      <span className="text-[10px] font-mono font-semibold text-[#A88035] dark:text-[#F0C975]">
                        {dayOrders.length}x
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 w-full overflow-hidden">
                    {dayOrders.slice(0, 2).map((o) => (
                      <div
                        key={o.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate ${
                          o.orderStatus === 'Selesai'
                            ? 'bg-accent-soft text-accent-fg'
                            : o.orderStatus === 'Dibatalkan'
                              ? 'bg-[#F4EFE6] dark:bg-[#1F2B23] text-[#7D877E] dark:text-[#B2C0B5] line-through'
                              : 'bg-[#FBF7EC] dark:bg-[#C69C4D]/20 text-[#9E7628] dark:text-[#F0C975]'
                        }`}
                      >
                        {o.customerName}
                      </div>
                    ))}
                    {dayOrders.length > 2 && (
                      <p className="text-[9px] text-[#7D877E] dark:text-[#BCC8BF]">
                        +{dayOrders.length - 2} lainnya
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Agenda */}
        <div className="xl:col-span-4 bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-5 surface-3d space-y-4">
          <div className="pb-3 border-b border-[#EFEAE1] dark:border-[#344639]">
            <p className="text-[11px] font-semibold text-[#7D877E] dark:text-[#BCC8BF]">
              JADWAL PENGIRIMAN
            </p>
            <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7] mt-0.5">
              {formatDateId(selectedDate)}
            </h3>
          </div>

          {selectedDayOrders.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
                Tidak ada jadwal pengiriman pada tanggal ini.
              </p>
              <button
                type="button"
                onClick={() => onNewOrderForDate(selectedDate)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs font-medium text-accent-fg hover:bg-accent-soft btn-3d-secondary cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Pesanan di Tanggal Ini
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayOrders.map((o) => (
                <div
                  key={o.id}
                  className="rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] p-3.5 space-y-1.5 surface-3d-subtle"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-[#233126] dark:text-[#F8FAF7]">
                      {o.productName}
                    </p>
                    <span className="text-[11px] font-mono text-[#7D877E] dark:text-[#BCC8BF] shrink-0">
                      {o.invoiceNumber}
                    </span>
                  </div>
                  <p className="text-xs text-[#556257] dark:text-[#D4DFD6]">
                    Pelanggan:{' '}
                    <strong className="text-[#233126] dark:text-[#F8FAF7]">
                      {o.customerName}
                    </strong>{' '}
                    ({o.quantity}x)
                  </p>
                  <div className="flex items-center justify-between pt-1.5 text-[11px]">
                    <span className="text-[#616E63] dark:text-[#BCC8BF]">
                      {o.orderStatus} · {o.paymentStatus}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectOrderForInvoice(o.id)}
                      className="font-medium text-accent-fg hover:underline cursor-pointer"
                    >
                      Lihat Invoice ({formatRupiah(o.totalAmount)})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
