import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  type AppNotification,
  type CatalogProduct,
  type Customer,
  type Material,
  type Order,
  type PaymentStatus,
  type ProductionModal,
  type PublicStoreInfo,
  type StoreSettings,
  type Transaction,
  DEFAULT_CATALOG_PRODUCTS,
  LIMITS,
  addDaysISO,
  getTodayISO,
} from '../types';

export const ADMIN_PRIMARY_EMAIL = 'ansori20030511@gmail.com';

export async function checkIsAdminUser(uid: string, email?: string | null): Promise<boolean> {
  if (email && email.trim().toLowerCase() === ADMIN_PRIMARY_EMAIL) {
    return true;
  }
  try {
    const adminSnap = await getDoc(doc(db, 'admins', uid));
    return adminSnap.exists();
  } catch {
    return false;
  }
}

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function cleanStr(val: string | undefined, maxLen: number, fallback = ''): string {
  const trimmed = (val ?? fallback).trim();
  return trimmed.slice(0, maxLen);
}

function nonNeg(val: number | string | undefined, fallback = 0): number {
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.round(num);
}

function userCol(uid: string, name: string) {
  return collection(db, 'users', uid, name);
}

function userDoc(uid: string, name: string, id: string) {
  return doc(db, 'users', uid, name, id);
}

export function subscribeAllCollections(
  uid: string,
  callbacks: {
    onSettings: (settings: StoreSettings | null) => void;
    onCustomers: (items: Customer[]) => void;
    onOrders: (items: Order[]) => void;
    onTransactions: (items: Transaction[]) => void;
    onMaterials: (items: Material[]) => void;
    onProductionModals: (items: ProductionModal[]) => void;
    onNotifications: (items: AppNotification[]) => void;
  }
): Unsubscribe[] {
  const unsubs: Unsubscribe[] = [];

  const settingsPath = `users/${uid}/settings`;
  unsubs.push(
    onSnapshot(
      query(userCol(uid, 'settings'), where('ownerId', '==', uid)),
      (snap) => {
        const first = snap.docs[0];
        if (!first) {
          callbacks.onSettings(null);
          return;
        }
        callbacks.onSettings({ id: first.id, ...(first.data() as Omit<StoreSettings, 'id'>) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, settingsPath)
    )
  );

  const customersPath = `users/${uid}/customers`;
  unsubs.push(
    onSnapshot(
      query(userCol(uid, 'customers'), where('ownerId', '==', uid)),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Customer, 'id'>) }));
        items.sort((a, b) => a.name.localeCompare(b.name, 'id'));
        callbacks.onCustomers(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, customersPath)
    )
  );

  const ordersPath = `users/${uid}/orders`;
  unsubs.push(
    onSnapshot(
      query(userCol(uid, 'orders'), where('ownerId', '==', uid)),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }));
        items.sort((a, b) => b.orderDate.localeCompare(a.orderDate) || b.invoiceNumber.localeCompare(a.invoiceNumber));
        callbacks.onOrders(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, ordersPath)
    )
  );

  const txPath = `users/${uid}/transactions`;
  unsubs.push(
    onSnapshot(
      query(userCol(uid, 'transactions'), where('ownerId', '==', uid)),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Transaction, 'id'>) }));
        items.sort((a, b) => b.date.localeCompare(a.date));
        callbacks.onTransactions(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, txPath)
    )
  );

  const matPath = `users/${uid}/materials`;
  unsubs.push(
    onSnapshot(
      query(userCol(uid, 'materials'), where('ownerId', '==', uid)),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Material, 'id'>) }));
        items.sort((a, b) => a.name.localeCompare(b.name, 'id'));
        callbacks.onMaterials(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, matPath)
    )
  );

  const modalPath = `users/${uid}/productionModals`;
  unsubs.push(
    onSnapshot(
      query(userCol(uid, 'productionModals'), where('ownerId', '==', uid)),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProductionModal, 'id'>) }));
        items.sort((a, b) => a.productName.localeCompare(b.productName, 'id'));
        callbacks.onProductionModals(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, modalPath)
    )
  );

  const notifPath = `users/${uid}/notifications`;
  unsubs.push(
    onSnapshot(
      query(userCol(uid, 'notifications'), where('ownerId', '==', uid)),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, 'id'>) }));
        items.sort((a, b) => b.date.localeCompare(a.date));
        callbacks.onNotifications(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, notifPath)
    )
  );

  return unsubs;
}

export async function ensureSeededForUser(uid: string, displayName?: string | null): Promise<void> {
  const settingsRef = userDoc(uid, 'settings', 'store');
  let settingsData: Partial<StoreSettings> | null = null;
  try {
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      settingsData = snap.data() as Partial<StoreSettings>;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}/settings/store`);
  }

  if (!settingsData) {
    await seedDemoData(uid, displayName || 'Nadia Kusuma', false);
  } else {
    // Ensure publicStore/info and catalogProducts exist for public Beranda
    try {
      const publicInfoSnap = await getDoc(doc(db, 'publicStore', 'info'));
      if (!publicInfoSnap.exists()) {
        await syncPublicStoreInfo(uid, {
          storeName: settingsData.storeName || 'Elviora Jasa Buket & Hantaran',
          tagline: 'Buket Bunga Segar, Hantaran Lamaran & Hampers Eksklusif',
          storeLogoUrl: settingsData.storeLogoUrl || '',
          whatsappPhone: settingsData.phone || '0812-8840-2310',
          address: settingsData.address || 'Jl. Kemang Timur No. 42, Jakarta Selatan',
        });
      }
      const catalogSnap = await getDocs(collection(db, 'catalogProducts'));
      if (catalogSnap.empty) {
        await seedDefaultCatalogProducts(uid, false);
      }
    } catch {
      // Non-fatal sync check
    }
  }
}

export async function seedDemoData(
  uid: string,
  ownerNameInput: string,
  clearExisting: boolean
): Promise<void> {
  const today = getTodayISO();
  const ownerName = cleanStr(ownerNameInput, LIMITS.ownerName, 'Nadia Kusuma');

  if (clearExisting) {
    const colNames = [
      'orders',
      'customers',
      'transactions',
      'materials',
      'productionModals',
      'notifications',
    ];
    for (const cName of colNames) {
      const path = `users/${uid}/${cName}`;
      try {
        const existingSnap = await getDocs(query(userCol(uid, cName), where('ownerId', '==', uid)));
        const delBatch = writeBatch(db);
        existingSnap.docs.forEach((d) => delBatch.delete(d.ref));
        if (!existingSnap.empty) await delBatch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    }
  }

  const batch1 = writeBatch(db);
  const ts = serverTimestamp();

  batch1.set(userDoc(uid, 'settings', 'store'), {
    ownerId: uid,
    storeName: 'Elviora Jasa Buket & Hantaran',
    ownerName,
    phone: '0812-8840-2310',
    address: 'Jl. Kemang Timur No. 42, Jakarta Selatan',
    taxRate: 0,
    invoicePrefix: 'FLR',
    bankName: 'BCA',
    bankAccount: '5420-8812-90',
    bankHolder: ownerName,
    monthlyTarget: 35000000,
    createdAt: ts,
    updatedAt: ts,
  });

  const customersData = [
    { id: 'cust-1', name: 'Clarissa Wijaya', phone: '0811-9023-4411', email: 'clarissa.w@mail.id', address: 'Pondok Indah, Jakarta Selatan', segment: 'VIP', notes: 'Langganan buket mawar pastel dan hantaran keluarga.' },
    { id: 'cust-2', name: 'Raka Pratama & Dinda', phone: '0813-4421-8890', email: 'raka.dinda@mail.id', address: 'Bintaro Sektor 9, Tangerang', segment: 'VIP', notes: 'Paket lamaran 6 box akrilik tema sage & gold.' },
    { id: 'cust-3', name: 'PT Harmoni Nusantara', phone: '021-5790-3321', email: 'procurement@harmoni.co.id', address: 'SCBD Lot 14, Jakarta Pusat', segment: 'Korporat', notes: 'Pesanan hampers eksekutif dan papan ucapan rutin.' },
    { id: 'cust-4', name: 'Salsabila Putri', phone: '0856-7712-9034', email: 'salsa.putri@mail.id', address: 'Depok Margonda', segment: 'Reguler', notes: 'Suka wrapping warna cream dan pita satin.' },
    { id: 'cust-5', name: 'Boutique Anggun', phone: '0819-3310-5582', email: 'anggun.shop@mail.id', address: 'Kemang Raya, Jakarta', segment: 'Reseller', notes: 'Order grosir buket wisuda dan bunga kering.' },
    { id: 'cust-6', name: 'Farhan Ramadhan', phone: '0812-6674-1120', email: 'farhan.r@mail.id', address: 'Menteng, Jakarta Pusat', segment: 'Reguler', notes: 'Pesanan kejutan ulang tahun dan anniversary.' },
  ];

  for (const { id, ...cust } of customersData) {
    batch1.set(userDoc(uid, 'customers', id), {
      ownerId: uid,
      ...cust,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  const txData = [
    { id: 'tx-1', type: 'pemasukan', title: 'Pelunasan Hantaran Lamaran (Raka & Dinda)', category: 'Hantaran Lamaran', amount: 4850000, date: addDaysISO(today, -12), paymentMethod: 'Transfer Bank', orderId: 'ord-1', notes: 'Transfer BCA masuk.' },
    { id: 'tx-2', type: 'pengeluaran', title: 'Belanja Box Akrilik Gold & Kain Silk (6 Set)', category: 'Box & Hantaran', amount: 1850000, date: addDaysISO(today, -11), paymentMethod: 'Transfer Bank', orderId: 'ord-1', notes: 'Supplier Jakarta Barat.' },
    { id: 'tx-3', type: 'pemasukan', title: 'Penjualan 3x Buket Mawar Blush (Clarissa)', category: 'Buket Bunga', amount: 1950000, date: addDaysISO(today, -10), paymentMethod: 'QRIS', orderId: 'ord-2', notes: 'Lunas via QRIS studio.' },
    { id: 'tx-4', type: 'pengeluaran', title: 'Stok Bunga Segar Rawa Belong (Mawar & Eucalyptus)', category: 'Bunga Segar', amount: 1450000, date: addDaysISO(today, -9), paymentMethod: 'Tunai', orderId: '', notes: 'Kulakan bunga mingguan.' },
    { id: 'tx-5', type: 'pemasukan', title: 'DP 70% Hampers Korporat PT Harmoni', category: 'Hampers Musiman', amount: 4200000, date: addDaysISO(today, -6), paymentMethod: 'Transfer Bank', orderId: 'ord-3', notes: 'Invoice FLR-2026-103.' },
    { id: 'tx-6', type: 'pengeluaran', title: 'Pembelian Keranjang Rotan & Jar Madu Artisan', category: 'Box & Hantaran', amount: 2650000, date: addDaysISO(today, -5), paymentMethod: 'Transfer Bank', orderId: 'ord-3', notes: 'Stok hampers korporat.' },
    { id: 'tx-7', type: 'pemasukan', title: 'Penjualan 2x Buket Uang Kipas Pastel', category: 'Buket Uang & Snack', amount: 1040000, date: addDaysISO(today, -4), paymentMethod: 'E-Wallet', orderId: 'ord-4', notes: 'GoPay lunas.' },
    { id: 'tx-8', type: 'pemasukan', title: 'DP 50% Buket Wisuda Boutique Anggun', category: 'Buket Bunga', amount: 1625000, date: addDaysISO(today, -3), paymentMethod: 'Transfer Bank', orderId: 'ord-5', notes: 'Termin pertama.' },
    { id: 'tx-9', type: 'pengeluaran', title: 'Kertas Wrapping Korea & Pita Satin Gold (20 Roll)', category: 'Wrapping & Pita', amount: 780000, date: addDaysISO(today, -2), paymentMethod: 'QRIS', orderId: '', notes: 'Restock perlengkapan rangkai.' },
    { id: 'tx-10', type: 'pemasukan', title: 'Standing Flower Sage Boutique Anggun', category: 'Dekorasi & Custom', amount: 2500000, date: addDaysISO(today, -2), paymentMethod: 'Transfer Bank', orderId: 'ord-9', notes: 'Lunas di muka.' },
    { id: 'tx-11', type: 'pengeluaran', title: 'Upah Freelance Florist & Kurir Mobil', category: 'Operasional & Gaji', amount: 950000, date: addDaysISO(today, -1), paymentMethod: 'Transfer Bank', orderId: '', notes: '2 hari kerja asisten florist.' },
    { id: 'tx-12', type: 'pemasukan', title: 'Buket Mawar Blush Same-Day (Farhan)', category: 'Buket Bunga', amount: 1300000, date: today, paymentMethod: 'QRIS', orderId: 'ord-6', notes: 'Transaksi hari ini.' },
    { id: 'tx-13', type: 'pemasukan', title: 'DP 50% Seserahan Velvet Sage (Clarissa)', category: 'Hantaran Lamaran', amount: 1700000, date: today, paymentMethod: 'Transfer Bank', orderId: 'ord-7', notes: 'DP masuk hari ini.' },
    { id: 'tx-14', type: 'pengeluaran', title: 'Bunga Segar Tambahan & Oasis Foam', category: 'Bunga Segar', amount: 420000, date: today, paymentMethod: 'Tunai', orderId: '', notes: 'Belanja pagi hari ini.' },
  ];

  for (const { id, ...tx } of txData) {
    batch1.set(userDoc(uid, 'transactions', id), {
      ownerId: uid,
      ...tx,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  const materialsData = [
    { id: 'mat-1', name: 'Mawar Blush Pink Semi-Holland', category: 'Bunga Segar', unit: 'tangkai', stock: 120, minStock: 40, unitCost: 12000, supplier: 'Rawa Belong Flora' },
    { id: 'mat-2', name: 'Eucalyptus Silver Dollar', category: 'Bunga Segar', unit: 'ikat', stock: 14, minStock: 10, unitCost: 35000, supplier: 'Kebun Lembang' },
    { id: 'mat-3', name: 'Kertas Wrapping Korea Matte Cream', category: 'Kertas Wrapping', unit: 'lembar', stock: 18, minStock: 30, unitCost: 4500, supplier: 'Toko Pita Indah' },
    { id: 'mat-4', name: 'Kertas Wrapping Sage Green', category: 'Kertas Wrapping', unit: 'lembar', stock: 85, minStock: 25, unitCost: 4800, supplier: 'Toko Pita Indah' },
    { id: 'mat-5', name: 'Pita Satin Champagne Gold 2.5cm', category: 'Pita & Aksesori', unit: 'roll', stock: 6, minStock: 10, unitCost: 22000, supplier: 'Grosir Ribbon JKT' },
    { id: 'mat-6', name: 'Box Hantaran Akrilik Frame Gold', category: 'Box & Keranjang', unit: 'pcs', stock: 12, minStock: 5, unitCost: 245000, supplier: 'Kriya Akrilik' },
    { id: 'mat-7', name: 'Keranjang Rotan Oval Premium', category: 'Box & Keranjang', unit: 'pcs', stock: 15, minStock: 6, unitCost: 85000, supplier: 'Cirebon Rattan' },
    { id: 'mat-8', name: 'Baby Breath Kering Impor', category: 'Bunga Kering', unit: 'ikat', stock: 22, minStock: 8, unitCost: 48000, supplier: 'Dried Flora Studio' },
  ];

  for (const { id, ...mat } of materialsData) {
    batch1.set(userDoc(uid, 'materials', id), {
      ownerId: uid,
      ...mat,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  const modalsData = [
    {
      id: 'mod-1',
      productName: 'Buket Mawar Blush & Eucalyptus Premium',
      category: 'Buket Bunga',
      materialCost: 185000,
      packagingCost: 35000,
      laborCost: 45000,
      overheadCost: 15000,
      totalHpp: 280000,
      sellingPrice: 650000,
      notes: '12 tangkai mawar + 1 ikat eucalyptus + wrapping Korea.',
    },
    {
      id: 'mod-2',
      productName: 'Paket Hantaran Lamaran Akrilik Gold (6 Box)',
      category: 'Hantaran Lamaran',
      materialCost: 1620000,
      packagingCost: 280000,
      laborCost: 350000,
      overheadCost: 100000,
      totalHpp: 2350000,
      sellingPrice: 4850000,
      notes: 'Sewa/beli box akrilik, bunga hias, silk alas, jasa tata.',
    },
    {
      id: 'mod-3',
      productName: 'Buket Uang Kipas Pastel & Baby Breath',
      category: 'Buket Uang & Snack',
      materialCost: 95000,
      packagingCost: 45000,
      laborCost: 55000,
      overheadCost: 15000,
      totalHpp: 210000,
      sellingPrice: 520000,
      notes: 'Di luar nominal uang isian (jasa & material rangkai).',
    },
    {
      id: 'mod-4',
      productName: 'Hampers Rotan Eksekutif & Madu Artisan',
      category: 'Hampers Musiman',
      materialCost: 265000,
      packagingCost: 65000,
      laborCost: 40000,
      overheadCost: 20000,
      totalHpp: 390000,
      sellingPrice: 750000,
      notes: 'Keranjang rotan, madu, teh artisan, tag segel emas.',
    },
  ];

  for (const { id, ...pm } of modalsData) {
    batch1.set(userDoc(uid, 'productionModals', id), {
      ownerId: uid,
      ...pm,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  const notifsData = [
    {
      id: 'not-1',
      title: 'Stok Kertas Wrapping Cream Menipis',
      message: 'Tersisa 18 lembar (di bawah batas minimum 30 lembar). Segera lakukan restock.',
      type: 'stok',
      isRead: false,
      date: today,
    },
    {
      id: 'not-2',
      title: 'Stok Pita Satin Gold Menipis',
      message: 'Tersisa 6 roll (batas minimum 10 roll).',
      type: 'stok',
      isRead: false,
      date: today,
    },
    {
      id: 'not-3',
      title: 'Jatuh Tempo Besok: Boutique Anggun',
      message: '5x Buket Mawar Blush (sisa tagihan Rp 1.625.000) dijadwalkan kirim besok pagi.',
      type: 'pesanan',
      isRead: false,
      date: today,
    },
    {
      id: 'not-4',
      title: 'Pembayaran Masuk Hari Ini',
      message: 'Clarissa Wijaya mengirim DP Rp 1.700.000 untuk Hantaran Seserahan Velvet Sage.',
      type: 'pembayaran',
      isRead: true,
      date: today,
    },
  ];

  for (const { id, ...notif } of notifsData) {
    batch1.set(userDoc(uid, 'notifications', id), {
      ownerId: uid,
      ...notif,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  try {
    await batch1.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}/batch-seed-base`);
  }

  const ordersData = [
    {
      id: 'ord-1',
      invoiceNumber: 'FLR-2026-101',
      customerId: 'cust-2',
      customerName: 'Raka Pratama & Dinda',
      productName: 'Paket Hantaran Lamaran Akrilik Gold (6 Box)',
      category: 'Hantaran Lamaran',
      quantity: 1,
      unitPrice: 4850000,
      productionCost: 2350000,
      totalAmount: 4850000,
      paidAmount: 4850000,
      paymentStatus: 'Lunas',
      orderStatus: 'Selesai',
      orderDate: addDaysISO(today, -12),
      dueDate: addDaysISO(today, -8),
      notes: 'Tema sage green, bunga artificial premium + silk cream.',
      imageKey: 'hantaranLamaran',
    },
    {
      id: 'ord-2',
      invoiceNumber: 'FLR-2026-102',
      customerId: 'cust-1',
      customerName: 'Clarissa Wijaya',
      productName: 'Buket Mawar Blush & Eucalyptus Premium',
      category: 'Buket Bunga',
      quantity: 3,
      unitPrice: 650000,
      productionCost: 280000,
      totalAmount: 1950000,
      paidAmount: 1950000,
      paymentStatus: 'Lunas',
      orderStatus: 'Selesai',
      orderDate: addDaysISO(today, -10),
      dueDate: addDaysISO(today, -9),
      notes: 'Kartu ucapan tulisan tangan tinta emas.',
      imageKey: 'buketMawar',
    },
    {
      id: 'ord-3',
      invoiceNumber: 'FLR-2026-103',
      customerId: 'cust-3',
      customerName: 'PT Harmoni Nusantara',
      productName: 'Hampers Rotan Eksekutif & Madu Artisan',
      category: 'Hampers Musiman',
      quantity: 8,
      unitPrice: 750000,
      productionCost: 390000,
      totalAmount: 6000000,
      paidAmount: 4200000,
      paymentStatus: 'DP',
      orderStatus: 'Diproses',
      orderDate: addDaysISO(today, -6),
      dueDate: addDaysISO(today, 2),
      notes: 'DP 70% sudah masuk, pelunasan saat serah terima.',
      imageKey: 'hampersLebaran',
    },
    {
      id: 'ord-4',
      invoiceNumber: 'FLR-2026-104',
      customerId: 'cust-4',
      customerName: 'Salsabila Putri',
      productName: 'Buket Uang Kipas Pastel & Baby Breath',
      category: 'Buket Uang & Snack',
      quantity: 2,
      unitPrice: 520000,
      productionCost: 210000,
      totalAmount: 1040000,
      paidAmount: 1040000,
      paymentStatus: 'Lunas',
      orderStatus: 'Selesai',
      orderDate: addDaysISO(today, -5),
      dueDate: addDaysISO(today, -4),
      notes: 'Jasa rangkai + bunga segar tambahan.',
      imageKey: 'buketUang',
    },
    {
      id: 'ord-5',
      invoiceNumber: 'FLR-2026-105',
      customerId: 'cust-5',
      customerName: 'Boutique Anggun',
      productName: 'Buket Mawar Blush & Eucalyptus Premium',
      category: 'Buket Bunga',
      quantity: 5,
      unitPrice: 650000,
      productionCost: 280000,
      totalAmount: 3250000,
      paidAmount: 1625000,
      paymentStatus: 'DP',
      orderStatus: 'Diproses',
      orderDate: addDaysISO(today, -3),
      dueDate: addDaysISO(today, 1),
      notes: 'Pengiriman kurir mobil pagi pukul 09.00.',
      imageKey: 'buketMawar',
    },
    {
      id: 'ord-6',
      invoiceNumber: 'FLR-2026-106',
      customerId: 'cust-6',
      customerName: 'Farhan Ramadhan',
      productName: 'Buket Mawar Blush & Eucalyptus Premium',
      category: 'Buket Bunga',
      quantity: 2,
      unitPrice: 650000,
      productionCost: 280000,
      totalAmount: 1300000,
      paidAmount: 1300000,
      paymentStatus: 'Lunas',
      orderStatus: 'Selesai',
      orderDate: today,
      dueDate: today,
      notes: 'Pesanan same-day anniversary.',
      imageKey: 'buketMawar',
    },
    {
      id: 'ord-7',
      invoiceNumber: 'FLR-2026-107',
      customerId: 'cust-1',
      customerName: 'Clarissa Wijaya',
      productName: 'Hantaran Seserahan Box Velvet Sage',
      category: 'Hantaran Lamaran',
      quantity: 1,
      unitPrice: 3400000,
      productionCost: 1650000,
      totalAmount: 3400000,
      paidAmount: 1700000,
      paymentStatus: 'DP',
      orderStatus: 'Diproses',
      orderDate: today,
      dueDate: addDaysISO(today, 4),
      notes: 'Menunggu pelunasan H-1 sebelum dikirim.',
      imageKey: 'hantaranLamaran',
    },
    {
      id: 'ord-8',
      invoiceNumber: 'FLR-2026-108',
      customerId: 'cust-4',
      customerName: 'Salsabila Putri',
      productName: 'Hampers Rotan Eksekutif & Madu Artisan',
      category: 'Hampers Musiman',
      quantity: 2,
      unitPrice: 750000,
      productionCost: 390000,
      totalAmount: 1500000,
      paidAmount: 0,
      paymentStatus: 'Belum Bayar',
      orderStatus: 'Menunggu',
      orderDate: today,
      dueDate: addDaysISO(today, 5),
      notes: 'Invoice sudah dikirim via WhatsApp.',
      imageKey: 'hampersLebaran',
    },
    {
      id: 'ord-9',
      invoiceNumber: 'FLR-2026-109',
      customerId: 'cust-5',
      customerName: 'Boutique Anggun',
      productName: 'Dekorasi Meja & Standing Flower Sage',
      category: 'Dekorasi & Custom',
      quantity: 2,
      unitPrice: 1250000,
      productionCost: 600000,
      totalAmount: 2500000,
      paidAmount: 2500000,
      paymentStatus: 'Lunas',
      orderStatus: 'Selesai',
      orderDate: addDaysISO(today, -2),
      dueDate: addDaysISO(today, -1),
      notes: 'Grand opening butik.',
      imageKey: 'buketMawar',
    },
    {
      id: 'ord-10',
      invoiceNumber: 'FLR-2026-110',
      customerId: 'cust-6',
      customerName: 'Farhan Ramadhan',
      productName: 'Buket Uang Kipas Pastel & Baby Breath',
      category: 'Buket Uang & Snack',
      quantity: 1,
      unitPrice: 520000,
      productionCost: 210000,
      totalAmount: 520000,
      paidAmount: 0,
      paymentStatus: 'Belum Bayar',
      orderStatus: 'Dibatalkan',
      orderDate: addDaysISO(today, -7),
      dueDate: addDaysISO(today, -5),
      notes: 'Reschedule oleh pelanggan ke bulan depan.',
      imageKey: 'buketUang',
    },
  ];

  const batch2 = writeBatch(db);
  for (const { id, ...ord } of ordersData) {
    batch2.set(userDoc(uid, 'orders', id), {
      ownerId: uid,
      ...ord,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  try {
    await batch2.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}/batch-seed-orders`);
  }

  try {
    await syncPublicStoreInfo(uid, {
      storeName: 'Elviora Jasa Buket & Hantaran',
      tagline: 'Buket Bunga Segar, Hantaran Lamaran & Hampers Eksklusif',
      storeLogoUrl: '',
      whatsappPhone: '0812-8840-2310',
      address: 'Jl. Kemang Timur No. 42, Jakarta Selatan',
    });
    const existingCatalog = await getDocs(collection(db, 'catalogProducts'));
    if (existingCatalog.empty || clearExisting) {
      await seedDefaultCatalogProducts(uid, clearExisting);
    }
  } catch {
    // Ignore if non-admin user runs personal seed
  }
}

// --- Settings CRUD ---
export async function saveStoreSettings(
  uid: string,
  payload: Omit<StoreSettings, 'id' | 'ownerId'>
): Promise<void> {
  const path = `users/${uid}/settings/store`;
  try {
    const updateData: Record<string, unknown> = {
      storeName: cleanStr(payload.storeName, LIMITS.storeName, 'Elviora Jasa Buket & Hantaran'),
      ownerName: cleanStr(payload.ownerName, LIMITS.ownerName, 'Owner'),
      phone: cleanStr(payload.phone, LIMITS.phone),
      address: cleanStr(payload.address, LIMITS.address),
      taxRate: Math.min(100, nonNeg(payload.taxRate, 0)),
      invoicePrefix: cleanStr(payload.invoicePrefix, LIMITS.invoicePrefix, 'FLR'),
      bankName: cleanStr(payload.bankName, LIMITS.bankName),
      bankAccount: cleanStr(payload.bankAccount, LIMITS.bankAccount),
      bankHolder: cleanStr(payload.bankHolder, LIMITS.bankHolder),
      monthlyTarget: nonNeg(payload.monthlyTarget, 0),
      updatedAt: serverTimestamp(),
    };
    if (payload.profilePhotoUrl !== undefined) {
      updateData.profilePhotoUrl = cleanStr(payload.profilePhotoUrl, LIMITS.profilePhotoUrl);
    }
    if (payload.storeLogoUrl !== undefined) {
      updateData.storeLogoUrl = cleanStr(payload.storeLogoUrl, LIMITS.storeLogoUrl);
    }
    await updateDoc(userDoc(uid, 'settings', 'store'), updateData);
    await syncPublicStoreInfo(uid, {
      storeName: String(updateData.storeName),
      whatsappPhone: String(updateData.phone || ''),
      address: String(updateData.address || ''),
      ...(payload.storeLogoUrl !== undefined
        ? { storeLogoUrl: String(updateData.storeLogoUrl || '') }
        : {}),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateProfilePhoto(uid: string, profilePhotoUrl: string): Promise<void> {
  const path = `users/${uid}/settings/store`;
  try {
    await updateDoc(userDoc(uid, 'settings', 'store'), {
      profilePhotoUrl: cleanStr(profilePhotoUrl, LIMITS.profilePhotoUrl),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateStoreLogo(uid: string, storeLogoUrl: string): Promise<void> {
  const path = `users/${uid}/settings/store`;
  const cleanedLogo = cleanStr(storeLogoUrl, LIMITS.storeLogoUrl);
  try {
    await updateDoc(userDoc(uid, 'settings', 'store'), {
      storeLogoUrl: cleanedLogo,
      updatedAt: serverTimestamp(),
    });
    await syncPublicStoreInfo(uid, { storeLogoUrl: cleanedLogo });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// --- Customer CRUD ---
export async function createCustomer(
  uid: string,
  payload: Omit<Customer, 'id' | 'ownerId'>
): Promise<string> {
  const id = makeId('cust');
  const path = `users/${uid}/customers/${id}`;
  try {
    await setDoc(userDoc(uid, 'customers', id), {
      ownerId: uid,
      name: cleanStr(payload.name, LIMITS.name, 'Pelanggan'),
      phone: cleanStr(payload.phone, LIMITS.phone, '0800000000'),
      email: cleanStr(payload.email, LIMITS.email),
      address: cleanStr(payload.address, LIMITS.address),
      segment: payload.segment,
      notes: cleanStr(payload.notes, LIMITS.notes),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateCustomer(
  uid: string,
  id: string,
  payload: Omit<Customer, 'id' | 'ownerId'>
): Promise<void> {
  const path = `users/${uid}/customers/${id}`;
  try {
    await updateDoc(userDoc(uid, 'customers', id), {
      name: cleanStr(payload.name, LIMITS.name, 'Pelanggan'),
      phone: cleanStr(payload.phone, LIMITS.phone, '0800000000'),
      email: cleanStr(payload.email, LIMITS.email),
      address: cleanStr(payload.address, LIMITS.address),
      segment: payload.segment,
      notes: cleanStr(payload.notes, LIMITS.notes),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteCustomer(uid: string, id: string): Promise<void> {
  const path = `users/${uid}/customers/${id}`;
  try {
    await deleteDoc(userDoc(uid, 'customers', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- Order CRUD ---
export async function createOrder(
  uid: string,
  payload: Omit<Order, 'id' | 'ownerId'>,
  recordIncomeTx: boolean
): Promise<string> {
  const id = makeId('ord');
  const path = `users/${uid}/orders/${id}`;
  const quantity = Math.max(1, nonNeg(payload.quantity, 1));
  const unitPrice = nonNeg(payload.unitPrice, 0);
  const grossSubtotal = quantity * unitPrice;
  const discountType = payload.discountType || 'none';
  const rawDiscountVal = nonNeg(payload.discountValue, 0);
  const discountValue =
    discountType === 'percent' ? Math.min(100, rawDiscountVal) : rawDiscountVal;
  const discountAmount = Math.min(grossSubtotal, nonNeg(payload.discountAmount, 0));
  const totalAmount = nonNeg(payload.totalAmount, Math.max(0, grossSubtotal - discountAmount));
  const paidAmount = Math.min(totalAmount, nonNeg(payload.paidAmount, 0));
  const paymentStatus: PaymentStatus =
    paidAmount >= totalAmount && totalAmount > 0
      ? 'Lunas'
      : paidAmount > 0
        ? 'DP'
        : 'Belum Bayar';

  try {
    const batch = writeBatch(db);
    batch.set(userDoc(uid, 'orders', id), {
      ownerId: uid,
      invoiceNumber: cleanStr(payload.invoiceNumber, LIMITS.invoiceNumber, `FLR-${Date.now()}`),
      customerId: payload.customerId,
      customerName: cleanStr(payload.customerName, LIMITS.name, 'Pelanggan'),
      productName: cleanStr(payload.productName, LIMITS.productName, 'Buket Custom'),
      category: payload.category,
      quantity,
      unitPrice,
      productionCost: nonNeg(payload.productionCost, 0),
      totalAmount,
      paidAmount,
      paymentStatus,
      orderStatus: payload.orderStatus,
      orderDate: payload.orderDate,
      dueDate: payload.dueDate,
      notes: cleanStr(payload.notes, LIMITS.notes),
      imageKey: cleanStr(payload.imageKey, 60),
      discountType,
      discountValue,
      discountAmount,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (recordIncomeTx && paidAmount > 0) {
      const txId = makeId('tx');
      batch.set(userDoc(uid, 'transactions', txId), {
        ownerId: uid,
        type: 'pemasukan',
        title: `${paymentStatus === 'Lunas' ? 'Pembayaran' : 'DP'} ${cleanStr(payload.productName, 80)} (${cleanStr(payload.customerName, 40)})`,
        category: payload.category,
        amount: paidAmount,
        date: payload.orderDate,
        paymentMethod: 'Transfer Bank',
        orderId: id,
        notes: `Otomatis dari pesanan ${cleanStr(payload.invoiceNumber, 30)}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateOrder(
  uid: string,
  id: string,
  payload: Omit<Order, 'id' | 'ownerId'>
): Promise<void> {
  const path = `users/${uid}/orders/${id}`;
  const quantity = Math.max(1, nonNeg(payload.quantity, 1));
  const unitPrice = nonNeg(payload.unitPrice, 0);
  const grossSubtotal = quantity * unitPrice;
  const discountType = payload.discountType || 'none';
  const rawDiscountVal = nonNeg(payload.discountValue, 0);
  const discountValue =
    discountType === 'percent' ? Math.min(100, rawDiscountVal) : rawDiscountVal;
  const discountAmount = Math.min(grossSubtotal, nonNeg(payload.discountAmount, 0));
  const totalAmount = nonNeg(payload.totalAmount, Math.max(0, grossSubtotal - discountAmount));
  const paidAmount = Math.min(totalAmount, nonNeg(payload.paidAmount, 0));
  const paymentStatus: PaymentStatus =
    paidAmount >= totalAmount && totalAmount > 0
      ? 'Lunas'
      : paidAmount > 0
        ? 'DP'
        : 'Belum Bayar';

  try {
    await updateDoc(userDoc(uid, 'orders', id), {
      customerId: payload.customerId,
      customerName: cleanStr(payload.customerName, LIMITS.name, 'Pelanggan'),
      productName: cleanStr(payload.productName, LIMITS.productName, 'Buket Custom'),
      category: payload.category,
      quantity,
      unitPrice,
      productionCost: nonNeg(payload.productionCost, 0),
      totalAmount,
      paidAmount,
      paymentStatus,
      orderStatus: payload.orderStatus,
      orderDate: payload.orderDate,
      dueDate: payload.dueDate,
      notes: cleanStr(payload.notes, LIMITS.notes),
      imageKey: cleanStr(payload.imageKey, 60),
      discountType,
      discountValue,
      discountAmount,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function settleOrderPayment(
  uid: string,
  order: Order,
  addPaymentAmount: number
): Promise<void> {
  const path = `users/${uid}/orders/${order.id}`;
  const safeAdd = nonNeg(addPaymentAmount, 0);
  const newPaid = Math.min(order.totalAmount, order.paidAmount + safeAdd);
  const newStatus: PaymentStatus =
    newPaid >= order.totalAmount ? 'Lunas' : newPaid > 0 ? 'DP' : 'Belum Bayar';

  try {
    const batch = writeBatch(db);
    batch.update(userDoc(uid, 'orders', order.id), {
      paidAmount: newPaid,
      paymentStatus: newStatus,
      updatedAt: serverTimestamp(),
    });
    if (safeAdd > 0) {
      const txId = makeId('tx');
      batch.set(userDoc(uid, 'transactions', txId), {
        ownerId: uid,
        type: 'pemasukan',
        title: `Pelunasan ${order.invoiceNumber} (${order.customerName})`,
        category: order.category,
        amount: safeAdd,
        date: getTodayISO(),
        paymentMethod: 'Transfer Bank',
        orderId: order.id,
        notes: `Pembayaran lanjutan untuk ${order.productName}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateOrderStatusQuick(
  uid: string,
  id: string,
  orderStatus: Order['orderStatus']
): Promise<void> {
  const path = `users/${uid}/orders/${id}`;
  try {
    await updateDoc(userDoc(uid, 'orders', id), {
      orderStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteOrder(uid: string, id: string): Promise<void> {
  const path = `users/${uid}/orders/${id}`;
  try {
    await deleteDoc(userDoc(uid, 'orders', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- Transaction CRUD ---
export async function createTransaction(
  uid: string,
  payload: Omit<Transaction, 'id' | 'ownerId'>
): Promise<string> {
  const id = makeId('tx');
  const path = `users/${uid}/transactions/${id}`;
  try {
    await setDoc(userDoc(uid, 'transactions', id), {
      ownerId: uid,
      type: payload.type,
      title: cleanStr(payload.title, LIMITS.title, 'Transaksi'),
      category: cleanStr(payload.category, LIMITS.category, 'Umum'),
      amount: nonNeg(payload.amount, 0),
      date: payload.date,
      paymentMethod: payload.paymentMethod,
      orderId: cleanStr(payload.orderId, 128),
      notes: cleanStr(payload.notes, LIMITS.notes),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateTransaction(
  uid: string,
  id: string,
  payload: Omit<Transaction, 'id' | 'ownerId'>
): Promise<void> {
  const path = `users/${uid}/transactions/${id}`;
  try {
    await updateDoc(userDoc(uid, 'transactions', id), {
      type: payload.type,
      title: cleanStr(payload.title, LIMITS.title, 'Transaksi'),
      category: cleanStr(payload.category, LIMITS.category, 'Umum'),
      amount: nonNeg(payload.amount, 0),
      date: payload.date,
      paymentMethod: payload.paymentMethod,
      orderId: cleanStr(payload.orderId, 128),
      notes: cleanStr(payload.notes, LIMITS.notes),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteTransaction(uid: string, id: string): Promise<void> {
  const path = `users/${uid}/transactions/${id}`;
  try {
    await deleteDoc(userDoc(uid, 'transactions', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- Material CRUD ---
export async function createMaterial(
  uid: string,
  payload: Omit<Material, 'id' | 'ownerId'>
): Promise<string> {
  const id = makeId('mat');
  const path = `users/${uid}/materials/${id}`;
  try {
    await setDoc(userDoc(uid, 'materials', id), {
      ownerId: uid,
      name: cleanStr(payload.name, LIMITS.materialName, 'Bahan Baru'),
      category: payload.category,
      unit: cleanStr(payload.unit, LIMITS.unit, 'pcs'),
      stock: nonNeg(payload.stock, 0),
      minStock: nonNeg(payload.minStock, 0),
      unitCost: nonNeg(payload.unitCost, 0),
      supplier: cleanStr(payload.supplier, LIMITS.supplier),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateMaterial(
  uid: string,
  id: string,
  payload: Omit<Material, 'id' | 'ownerId'>
): Promise<void> {
  const path = `users/${uid}/materials/${id}`;
  try {
    await updateDoc(userDoc(uid, 'materials', id), {
      name: cleanStr(payload.name, LIMITS.materialName, 'Bahan'),
      category: payload.category,
      unit: cleanStr(payload.unit, LIMITS.unit, 'pcs'),
      stock: nonNeg(payload.stock, 0),
      minStock: nonNeg(payload.minStock, 0),
      unitCost: nonNeg(payload.unitCost, 0),
      supplier: cleanStr(payload.supplier, LIMITS.supplier),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function adjustMaterialStock(
  uid: string,
  id: string,
  newStock: number
): Promise<void> {
  const path = `users/${uid}/materials/${id}`;
  try {
    await updateDoc(userDoc(uid, 'materials', id), {
      stock: nonNeg(newStock, 0),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteMaterial(uid: string, id: string): Promise<void> {
  const path = `users/${uid}/materials/${id}`;
  try {
    await deleteDoc(userDoc(uid, 'materials', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- Production Modal (HPP) CRUD ---
export async function createProductionModal(
  uid: string,
  payload: Omit<ProductionModal, 'id' | 'ownerId'>
): Promise<string> {
  const id = makeId('mod');
  const path = `users/${uid}/productionModals/${id}`;
  const materialCost = nonNeg(payload.materialCost, 0);
  const packagingCost = nonNeg(payload.packagingCost, 0);
  const laborCost = nonNeg(payload.laborCost, 0);
  const overheadCost = nonNeg(payload.overheadCost, 0);
  const totalHpp = materialCost + packagingCost + laborCost + overheadCost;

  try {
    await setDoc(userDoc(uid, 'productionModals', id), {
      ownerId: uid,
      productName: cleanStr(payload.productName, LIMITS.productName, 'Produk Baru'),
      category: payload.category,
      materialCost,
      packagingCost,
      laborCost,
      overheadCost,
      totalHpp,
      sellingPrice: nonNeg(payload.sellingPrice, 0),
      notes: cleanStr(payload.notes, LIMITS.notes),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateProductionModal(
  uid: string,
  id: string,
  payload: Omit<ProductionModal, 'id' | 'ownerId'>
): Promise<void> {
  const path = `users/${uid}/productionModals/${id}`;
  const materialCost = nonNeg(payload.materialCost, 0);
  const packagingCost = nonNeg(payload.packagingCost, 0);
  const laborCost = nonNeg(payload.laborCost, 0);
  const overheadCost = nonNeg(payload.overheadCost, 0);
  const totalHpp = materialCost + packagingCost + laborCost + overheadCost;

  try {
    await updateDoc(userDoc(uid, 'productionModals', id), {
      productName: cleanStr(payload.productName, LIMITS.productName, 'Produk'),
      category: payload.category,
      materialCost,
      packagingCost,
      laborCost,
      overheadCost,
      totalHpp,
      sellingPrice: nonNeg(payload.sellingPrice, 0),
      notes: cleanStr(payload.notes, LIMITS.notes),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteProductionModal(uid: string, id: string): Promise<void> {
  const path = `users/${uid}/productionModals/${id}`;
  try {
    await deleteDoc(userDoc(uid, 'productionModals', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- Notification Updates ---
export async function markNotificationRead(uid: string, id: string): Promise<void> {
  const path = `users/${uid}/notifications/${id}`;
  try {
    await updateDoc(userDoc(uid, 'notifications', id), {
      isRead: true,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function markAllNotificationsRead(
  uid: string,
  items: AppNotification[]
): Promise<void> {
  const unread = items.filter((n) => !n.isRead);
  if (unread.length === 0) return;
  try {
    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(userDoc(uid, 'notifications', n.id), {
        isRead: true,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/notifications`);
  }
}

// --- Public Storefront & Catalog Management ---
export function subscribePublicStorefront(callbacks: {
  onProducts: (items: CatalogProduct[]) => void;
  onStoreInfo: (info: PublicStoreInfo | null) => void;
}): Unsubscribe[] {
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(
      query(collection(db, 'catalogProducts'), where('isActive', '==', true)),
      (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CatalogProduct, 'id'>),
        }));
        items.sort(
          (a, b) =>
            Number(b.isFeatured) - Number(a.isFeatured) ||
            b.soldCount - a.soldCount ||
            a.title.localeCompare(b.title, 'id')
        );
        callbacks.onProducts(items);
      },
      (err) => {
        console.warn('Public catalog subscription notice:', err.message);
      }
    )
  );

  unsubs.push(
    onSnapshot(
      doc(db, 'publicStore', 'info'),
      (snap) => {
        if (!snap.exists()) {
          callbacks.onStoreInfo(null);
          return;
        }
        callbacks.onStoreInfo({
          id: snap.id,
          ...(snap.data() as Omit<PublicStoreInfo, 'id'>),
        });
      },
      (err) => {
        console.warn('Public store info subscription notice:', err.message);
      }
    )
  );

  return unsubs;
}

export function subscribeAdminCatalog(onProducts: (items: CatalogProduct[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'catalogProducts'),
    (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CatalogProduct, 'id'>),
      }));
      items.sort(
        (a, b) =>
          Number(b.isActive) - Number(a.isActive) ||
          Number(b.isFeatured) - Number(a.isFeatured) ||
          a.title.localeCompare(b.title, 'id')
      );
      onProducts(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'catalogProducts')
  );
}

export async function syncPublicStoreInfo(
  uid: string,
  partial: Partial<Omit<PublicStoreInfo, 'id' | 'ownerId'>>
): Promise<void> {
  const ref = doc(db, 'publicStore', 'info');
  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        ownerId: uid,
        storeName: cleanStr(partial.storeName, LIMITS.storeName, 'Elviora Jasa Buket & Hantaran'),
        tagline: cleanStr(
          partial.tagline,
          LIMITS.tagline,
          'Buket Bunga Segar, Hantaran Lamaran & Hampers Eksklusif'
        ),
        storeLogoUrl: cleanStr(partial.storeLogoUrl, LIMITS.storeLogoUrl),
        whatsappPhone: cleanStr(partial.whatsappPhone, LIMITS.phone, '0812-8840-2310'),
        address: cleanStr(partial.address, LIMITS.address, 'Jl. Kemang Timur No. 42, Jakarta Selatan'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const updatePayload: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      if (partial.storeName !== undefined) {
        updatePayload.storeName = cleanStr(
          partial.storeName,
          LIMITS.storeName,
          'Elviora Jasa Buket & Hantaran'
        );
      }
      if (partial.tagline !== undefined) {
        updatePayload.tagline = cleanStr(partial.tagline, LIMITS.tagline);
      }
      if (partial.storeLogoUrl !== undefined) {
        updatePayload.storeLogoUrl = cleanStr(partial.storeLogoUrl, LIMITS.storeLogoUrl);
      }
      if (partial.whatsappPhone !== undefined) {
        updatePayload.whatsappPhone = cleanStr(partial.whatsappPhone, LIMITS.phone);
      }
      if (partial.address !== undefined) {
        updatePayload.address = cleanStr(partial.address, LIMITS.address);
      }
      await updateDoc(ref, updatePayload);
    }
  } catch {
    // Non-fatal if user is not an admin
  }
}

export async function seedDefaultCatalogProducts(uid: string, clearExisting = false): Promise<void> {
  try {
    if (clearExisting) {
      const snap = await getDocs(collection(db, 'catalogProducts'));
      if (!snap.empty) {
        const delBatch = writeBatch(db);
        snap.docs.forEach((d) => delBatch.delete(d.ref));
        await delBatch.commit();
      }
    }
    const batch = writeBatch(db);
    const ts = serverTimestamp();
    DEFAULT_CATALOG_PRODUCTS.forEach((item) => {
      const { id, ...rest } = item;
      batch.set(doc(db, 'catalogProducts', id), {
        ownerId: uid,
        ...rest,
        createdAt: ts,
        updatedAt: ts,
      });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'catalogProducts');
  }
}

function cleanGalleryImages(images?: string[], fallbackPrimary?: string): string[] {
  const result: string[] = [];
  if (fallbackPrimary?.trim()) {
    result.push(cleanStr(fallbackPrimary, LIMITS.catalogImageUrl));
  }
  if (Array.isArray(images)) {
    for (const item of images) {
      const cleaned = cleanStr(item, LIMITS.catalogImageUrl);
      if (cleaned && !result.includes(cleaned)) {
        result.push(cleaned);
      }
      if (result.length >= LIMITS.catalogMaxGalleryImages) break;
    }
  }
  return result.slice(0, LIMITS.catalogMaxGalleryImages);
}

export async function createCatalogProduct(
  uid: string,
  payload: Omit<CatalogProduct, 'id' | 'ownerId'>
): Promise<string> {
  const id = makeId('prod');
  const path = `catalogProducts/${id}`;
  const price = nonNeg(payload.price, 0);
  const originalPrice =
    payload.originalPrice !== undefined && Number(payload.originalPrice) > price
      ? nonNeg(payload.originalPrice, 0)
      : 0;
  const galleryImages = cleanGalleryImages(payload.galleryImages, payload.imageUrl);
  const primaryImageUrl = galleryImages[0] || cleanStr(payload.imageUrl, LIMITS.catalogImageUrl);

  try {
    await setDoc(doc(db, 'catalogProducts', id), {
      ownerId: uid,
      title: cleanStr(payload.title, LIMITS.title, 'Produk Buket Baru'),
      category: payload.category,
      description: cleanStr(payload.description, LIMITS.catalogDescription),
      price,
      originalPrice,
      badge: cleanStr(payload.badge, LIMITS.catalogBadge),
      rating: Math.min(5, Math.max(0, Number(payload.rating) || 5)),
      soldCount: nonNeg(payload.soldCount, 0),
      imageKey: cleanStr(payload.imageKey, 60, 'buketMawar'),
      imageUrl: primaryImageUrl,
      galleryImages,
      isActive: Boolean(payload.isActive),
      isFeatured: Boolean(payload.isFeatured),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateCatalogProduct(
  id: string,
  payload: Omit<CatalogProduct, 'id' | 'ownerId'>,
  ownerUid?: string
): Promise<void> {
  const path = `catalogProducts/${id}`;
  const price = nonNeg(payload.price, 0);
  const originalPrice =
    payload.originalPrice !== undefined && Number(payload.originalPrice) > price
      ? nonNeg(payload.originalPrice, 0)
      : 0;
  const galleryImages = cleanGalleryImages(payload.galleryImages, payload.imageUrl);
  const primaryImageUrl = galleryImages[0] || cleanStr(payload.imageUrl, LIMITS.catalogImageUrl);

  try {
    const docRef = doc(db, 'catalogProducts', id);
    const snap = await getDoc(docRef);
    if (!snap.exists() && ownerUid) {
      await setDoc(docRef, {
        ownerId: ownerUid,
        title: cleanStr(payload.title, LIMITS.title, 'Produk Buket'),
        category: payload.category,
        description: cleanStr(payload.description, LIMITS.catalogDescription),
        price,
        originalPrice,
        badge: cleanStr(payload.badge, LIMITS.catalogBadge),
        rating: Math.min(5, Math.max(0, Number(payload.rating) || 5)),
        soldCount: nonNeg(payload.soldCount, 0),
        imageKey: cleanStr(payload.imageKey, 60, 'buketMawar'),
        imageUrl: primaryImageUrl,
        galleryImages,
        isActive: Boolean(payload.isActive),
        isFeatured: Boolean(payload.isFeatured),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return;
    }

    await updateDoc(docRef, {
      title: cleanStr(payload.title, LIMITS.title, 'Produk Buket'),
      category: payload.category,
      description: cleanStr(payload.description, LIMITS.catalogDescription),
      price,
      originalPrice,
      badge: cleanStr(payload.badge, LIMITS.catalogBadge),
      rating: Math.min(5, Math.max(0, Number(payload.rating) || 5)),
      soldCount: nonNeg(payload.soldCount, 0),
      imageKey: cleanStr(payload.imageKey, 60, 'buketMawar'),
      imageUrl: primaryImageUrl,
      galleryImages,
      isActive: Boolean(payload.isActive),
      isFeatured: Boolean(payload.isFeatured),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteCatalogProduct(id: string): Promise<void> {
  const path = `catalogProducts/${id}`;
  try {
    await deleteDoc(doc(db, 'catalogProducts', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}


