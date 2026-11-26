import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import {
  COLOR_PALETTES,
  DEFAULT_CATALOG_PRODUCTS,
  DEFAULT_CUSTOM_COLORS,
  type AppNotification,
  type CatalogProduct,
  type ColorPalette,
  type CustomPaletteColors,
  type Customer,
  type Material,
  type NavSection,
  type Order,
  type ProductionModal,
  type PublicStoreInfo,
  type StoreSettings,
  type Transaction,
} from './types';
import {
  adjustMaterialStock,
  checkIsAdminUser,
  createCatalogProduct,
  createCustomer,
  createMaterial,
  createOrder,
  createProductionModal,
  createTransaction,
  deleteCatalogProduct,
  deleteCustomer,
  deleteMaterial,
  deleteOrder,
  deleteProductionModal,
  deleteTransaction,
  ensureSeededForUser,
  markAllNotificationsRead,
  markNotificationRead,
  saveStoreSettings,
  seedDefaultCatalogProducts,
  seedDemoData,
  settleOrderPayment,
  subscribeAdminCatalog,
  subscribeAllCollections,
  subscribePublicStorefront,
  updateCatalogProduct,
  updateCustomer,
  updateMaterial,
  updateOrder,
  updateOrderStatusQuick,
  updateProductionModal,
  updateProfilePhoto,
  updateStoreLogo,
  updateTransaction,
} from './services/firestoreService';
import { exportFinancialSummaryImage, exportFinancialSummaryPDF } from './utils/exportUtils';
import { applyCustomPaletteTokens, clearCustomPaletteTokens } from './utils/colorUtils';
import { AmbientBackdrop } from './components/AmbientBackdrop';
import { AdminAuthModal } from './components/AdminAuthModal';
import { StorefrontHome } from './components/StorefrontHome';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { OrderModal } from './components/OrderModal';
import { DashboardView } from './components/views/DashboardView';
import { CatalogAdminView } from './components/views/CatalogAdminView';
import { OrdersView } from './components/views/OrdersView';
import { CustomersView } from './components/views/CustomersView';
import { TransactionsView } from './components/views/TransactionsView';
import { ProductionModalView } from './components/views/ProductionModalView';
import { MaterialsView } from './components/views/MaterialsView';
import { InvoiceView } from './components/views/InvoiceView';
import { CalendarView } from './components/views/CalendarView';
import { ReportsView } from './components/views/ReportsView';
import { SettingsView } from './components/views/SettingsView';

const SECTION_TITLES: Record<NavSection, string> = {
  dashboard: 'Dashboard',
  katalog: 'Katalog Produk',
  pesanan: 'Data Pesanan',
  pelanggan: 'Data Pelanggan',
  pemasukan: 'Pemasukan',
  pengeluaran: 'Pengeluaran',
  modal_produksi: 'Modal Produksi',
  stok_bahan: 'Stok Bahan',
  invoice: 'Invoice',
  kalender: 'Kalender Pesanan',
  laporan: 'Laporan Keuangan',
  pengaturan: 'Pengaturan',
};

const VALID_PALETTES: ColorPalette[] = ['sage', 'rose', 'gold', 'lavender', 'ocean', 'custom'];

function MainApplication() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorizedAdminUser, setIsAuthorizedAdminUser] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [authError, setAuthError] = useState('');

  // Server-issued Admin Bearer token kept strictly in JS memory (never localStorage)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'storefront' | 'admin'>('storefront');

  const [publicCatalog, setPublicCatalog] = useState<CatalogProduct[]>([]);
  const [adminCatalog, setAdminCatalog] = useState<CatalogProduct[]>([]);
  const [publicStoreInfo, setPublicStoreInfo] = useState<PublicStoreInfo | null>(null);

  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved =
        localStorage.getItem('elviora-theme') || localStorage.getItem('floreakas-theme');
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [colorPalette, setColorPalette] = useState<ColorPalette>(() => {
    try {
      const saved = (localStorage.getItem('elviora-palette') ||
        localStorage.getItem('floreakas-palette')) as ColorPalette | null;
      return saved && VALID_PALETTES.includes(saved) ? saved : 'sage';
    } catch {
      return 'sage';
    }
  });
  const [customColors, setCustomColors] = useState<CustomPaletteColors>(() => {
    try {
      const raw = localStorage.getItem('elviora-custom-colors');
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CustomPaletteColors>;
        if (parsed.primaryHex && parsed.secondaryHex && parsed.backdropHex) {
          return {
            primaryHex: parsed.primaryHex,
            secondaryHex: parsed.secondaryHex,
            backdropHex: parsed.backdropHex,
          };
        }
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_CUSTOM_COLORS;
  });

  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [productionModals, setProductionModals] = useState<ProductionModal[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [defaultDueDate, setDefaultDueDate] = useState<string | undefined>(undefined);
  const [selectedInvoiceOrderId, setSelectedInvoiceOrderId] = useState('');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('elviora-theme', theme);
    } catch {
      // Ignore storage failures
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-palette', colorPalette);
    if (colorPalette === 'custom') {
      applyCustomPaletteTokens(customColors, theme);
    } else {
      clearCustomPaletteTokens();
    }
    try {
      localStorage.setItem('elviora-palette', colorPalette);
      localStorage.setItem('elviora-custom-colors', JSON.stringify(customColors));
    } catch {
      // Ignore storage failures
    }
  }, [colorPalette, customColors, theme]);

  // Public Storefront subscription (always available to visitors without login)
  useEffect(() => {
    const unsubs = subscribePublicStorefront({
      onProducts: setPublicCatalog,
      onStoreInfo: setPublicStoreInfo,
    });
    return () => unsubs.forEach((u) => u());
  }, []);

  // Auth listener with strict Admin authorization check
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsAuthorizedAdminUser(false);
        setDataReady(false);
        setViewMode('storefront');
        setAuthLoading(false);
        return;
      }

      const allowed = await checkIsAdminUser(currentUser.uid, currentUser.email);
      setIsAuthorizedAdminUser(allowed);
      if (!allowed) {
        setDataReady(false);
        setViewMode('storefront');
      }
      setAuthLoading(false);
    });
    return () => unsubAuth();
  }, []);

  // Load private Admin collections ONLY when BOTH server passcode token AND authorized admin Google user exist
  useEffect(() => {
    if (!user || !isAuthorizedAdminUser || !adminToken) return;
    let active = true;
    let unsubs: (() => void)[] = [];

    (async () => {
      try {
        await ensureSeededForUser(user.uid, user.displayName);
        if (!active) return;
        unsubs = [
          ...subscribeAllCollections(user.uid, {
            onSettings: setSettings,
            onCustomers: setCustomers,
            onOrders: setOrders,
            onTransactions: setTransactions,
            onMaterials: setMaterials,
            onProductionModals: setProductionModals,
            onNotifications: setNotifications,
          }),
          subscribeAdminCatalog(setAdminCatalog),
        ];
        setDataReady(true);
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Gagal memuat database.');
      }
    })();

    return () => {
      active = false;
      unsubs.forEach((u) => u());
    };
  }, [user, isAuthorizedAdminUser, adminToken]);

  const storefrontProducts = useMemo<CatalogProduct[]>(() => {
    if (isAuthorizedAdminUser && adminToken && adminCatalog.length > 0) {
      return adminCatalog;
    }
    if (publicCatalog.length > 0) return publicCatalog;
    return DEFAULT_CATALOG_PRODUCTS.map((item) => ({ ...item, ownerId: 'default' }));
  }, [isAuthorizedAdminUser, adminToken, adminCatalog, publicCatalog]);

  const activePrimaryHex =
    colorPalette === 'custom'
      ? customColors.primaryHex
      : (COLOR_PALETTES.find((p) => p.id === colorPalette) || COLOR_PALETTES[0]).primaryHex;

  const handleGoogleSignIn = async () => {
    setAuthError('');
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const allowed = await checkIsAdminUser(cred.user.uid, cred.user.email);
      setIsAuthorizedAdminUser(allowed);
      if (allowed && adminToken) {
        setAdminModalOpen(false);
        setViewMode('admin');
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Gagal masuk dengan Google.');
    }
  };

  const handleSignOut = async () => {
    if (adminToken) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      } catch {
        // Ignore network errors on logout
      }
    }
    setAdminToken(null);
    setViewMode('storefront');
    setDataReady(false);
    await signOut(auth);
  };

  const handleSignOutNonAdmin = async () => {
    setAuthError('');
    setIsAuthorizedAdminUser(false);
    await signOut(auth);
  };

  const handleOpenAdminGate = () => {
    if (adminToken && user && isAuthorizedAdminUser) {
      setViewMode('admin');
      return;
    }
    setAuthError('');
    setAdminModalOpen(true);
  };

  const handleAdminTokenIssued = (token: string) => {
    setAdminToken(token);
    if (user && isAuthorizedAdminUser) {
      setAdminModalOpen(false);
      setViewMode('admin');
    }
  };

  const canRenderAdminDashboard = Boolean(
    viewMode === 'admin' && adminToken && user && isAuthorizedAdminUser
  );

  // Loading state ONLY when transitioning into Admin Dashboard
  if (canRenderAdminDashboard && (authLoading || !dataReady)) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-6 transition-colors">
        <AmbientBackdrop theme={theme} />
        <div className="w-full max-w-md bg-white/88 dark:bg-[#16201A] backdrop-blur-md rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-8 text-center surface-3d space-y-4">
          {authError ? (
            <>
              <p className="font-display font-semibold text-base text-[#B85D68] dark:text-[#F4B4BC]">
                Gagal Memuat Data Studio
              </p>
              <p className="text-xs text-[#616E63] dark:text-[#BCC8BF] break-words">{authError}</p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-xl text-white text-xs font-medium btn-3d-primary cursor-pointer"
                >
                  Coba Lagi
                </button>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="px-4 py-2 rounded-xl border border-[#EAE4DA] dark:border-[#344639] text-xs font-medium text-[#556257] dark:text-[#D4DFD6] btn-3d-secondary cursor-pointer"
                >
                  Kembali ke Beranda
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-accent-gradient mx-auto flex items-center justify-center icon-3d">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7]">
                Menyiapkan Studio Elviora
              </p>
              <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
                Menghubungkan data pesanan, katalog, kas, dan stok bahan Anda...
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Public Beranda Katalog Storefront (default entry before entering Admin)
  if (!canRenderAdminDashboard) {
    const unlockedAdminUid = adminToken && user && isAuthorizedAdminUser ? user.uid : null;
    return (
      <>
        <StorefrontHome
          products={storefrontProducts}
          storeInfo={publicStoreInfo}
          theme={theme}
          onToggleTheme={setTheme}
          onOpenAdminGate={handleOpenAdminGate}
          isAdminUnlocked={Boolean(unlockedAdminUid)}
          onReturnToAdminDashboard={() => setViewMode('admin')}
          onAdminCreateProduct={
            unlockedAdminUid ? (p) => createCatalogProduct(unlockedAdminUid, p) : undefined
          }
          onAdminUpdateProduct={
            unlockedAdminUid ? (id, p) => updateCatalogProduct(id, p, unlockedAdminUid) : undefined
          }
          onAdminDeleteProduct={
            unlockedAdminUid ? (id) => deleteCatalogProduct(id) : undefined
          }
        />

        <AdminAuthModal
          open={adminModalOpen}
          onClose={() => setAdminModalOpen(false)}
          storeName={publicStoreInfo?.storeName || 'Elviora Jasa Buket & Hantaran'}
          storeLogoUrl={publicStoreInfo?.storeLogoUrl}
          adminToken={adminToken}
          onAdminTokenIssued={handleAdminTokenIssued}
          user={user}
          isAuthorizedAdminUser={isAuthorizedAdminUser}
          authError={authError}
          onGoogleSignIn={handleGoogleSignIn}
          onSignOutNonAdmin={handleSignOutNonAdmin}
        />
      </>
    );
  }

  const uid = user!.uid;
  const ownerName = settings?.ownerName || user!.displayName || 'Nadia Kusuma';
  const storeName = settings?.storeName || 'Elviora & Hantaran';
  const activePhotoURL = settings?.profilePhotoUrl || user!.photoURL;

  const handleOpenNewOrder = (dueDate?: string) => {
    setEditingOrder(null);
    setDefaultDueDate(dueDate);
    setOrderModalOpen(true);
  };

  const handleSaveOrder = async (
    payload: Omit<Order, 'id' | 'ownerId'>,
    options: { recordIncomeTx: boolean; newCustomerName?: string; newCustomerPhone?: string }
  ) => {
    let finalCustomerId = payload.customerId;
    let finalCustomerName = payload.customerName;

    if (!editingOrder && options.newCustomerName && options.newCustomerPhone) {
      finalCustomerId = await createCustomer(uid, {
        name: options.newCustomerName,
        phone: options.newCustomerPhone,
        email: '',
        address: '',
        segment: 'Reguler',
        notes: 'Ditambahkan saat input pesanan.',
      });
      finalCustomerName = options.newCustomerName;
    }

    const finalPayload = {
      ...payload,
      customerId: finalCustomerId,
      customerName: finalCustomerName,
    };

    if (editingOrder) {
      await updateOrder(uid, editingOrder.id, finalPayload);
    } else {
      await createOrder(uid, finalPayload, options.recordIncomeTx);
    }
  };

  const handleExportSummaryPDF = () => {
    exportFinancialSummaryPDF(orders, transactions, settings, activePrimaryHex);
  };

  const handleExportSummaryImage = async () => {
    await exportFinancialSummaryImage(
      orders,
      transactions,
      settings,
      theme,
      activePrimaryHex
    );
  };

  const handleSelectOrderForInvoice = (orderId: string) => {
    setSelectedInvoiceOrderId(orderId);
    setActiveSection('invoice');
  };

  return (
    <div className="relative min-h-screen text-[#233126] dark:text-[#F8FAF7] flex transition-colors">
      <AmbientBackdrop theme={theme} />

      <Sidebar
        active={activeSection}
        onSelect={setActiveSection}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        storeName={storeName}
        storeLogoUrl={settings?.storeLogoUrl}
        onExportPDF={handleExportSummaryPDF}
        onExportImage={handleExportSummaryImage}
        onViewStorefront={() => setViewMode('storefront')}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          pageTitle={SECTION_TITLES[activeSection]}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          notifications={notifications}
          onMarkRead={(id) => markNotificationRead(uid, id)}
          onMarkAllRead={() => markAllNotificationsRead(uid, notifications)}
          onNavigate={setActiveSection}
          ownerName={ownerName}
          ownerEmail={user!.email || ''}
          photoURL={activePhotoURL}
          onSignOut={() => void handleSignOut()}
          orders={orders}
          customers={customers}
          materials={materials}
          onViewStorefront={() => setViewMode('storefront')}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {activeSection === 'dashboard' && (
            <DashboardView
              ownerName={ownerName}
              settings={settings}
              orders={orders}
              transactions={transactions}
              materials={materials}
              theme={theme}
              accentHex={activePrimaryHex}
              onOpenNewOrder={() => handleOpenNewOrder()}
              onExportSummaryPDF={handleExportSummaryPDF}
              onExportSummaryImage={handleExportSummaryImage}
              onNavigate={setActiveSection}
              onSelectOrderForInvoice={handleSelectOrderForInvoice}
            />
          )}

          {activeSection === 'katalog' && (
            <CatalogAdminView
              products={adminCatalog}
              onCreate={(p) => createCatalogProduct(uid, p)}
              onUpdate={(id, p) => updateCatalogProduct(id, p, uid)}
              onDelete={(id) => deleteCatalogProduct(id)}
              onSeedDefaults={() => seedDefaultCatalogProducts(uid, false)}
              onPreviewStorefront={() => setViewMode('storefront')}
            />
          )}

          {activeSection === 'pesanan' && (
            <OrdersView
              orders={orders}
              customers={customers}
              settings={settings}
              globalSearch={globalSearch}
              onNewOrder={() => handleOpenNewOrder()}
              onEditOrder={(order) => {
                setEditingOrder(order);
                setOrderModalOpen(true);
              }}
              onDeleteOrder={(id) => deleteOrder(uid, id)}
              onSettlePayment={(order, amount) => settleOrderPayment(uid, order, amount)}
              onQuickStatus={(id, status) => updateOrderStatusQuick(uid, id, status)}
              onOpenInvoice={handleSelectOrderForInvoice}
            />
          )}

          {activeSection === 'pelanggan' && (
            <CustomersView
              customers={customers}
              orders={orders}
              globalSearch={globalSearch}
              onCreateCustomer={(p) => createCustomer(uid, p)}
              onUpdateCustomer={(id, p) => updateCustomer(uid, id, p)}
              onDeleteCustomer={(id) => deleteCustomer(uid, id)}
            />
          )}

          {activeSection === 'pemasukan' && (
            <TransactionsView
              mode="pemasukan"
              transactions={transactions}
              globalSearch={globalSearch}
              onCreateTransaction={(p) => createTransaction(uid, p)}
              onUpdateTransaction={(id, p) => updateTransaction(uid, id, p)}
              onDeleteTransaction={(id) => deleteTransaction(uid, id)}
            />
          )}

          {activeSection === 'pengeluaran' && (
            <TransactionsView
              mode="pengeluaran"
              transactions={transactions}
              globalSearch={globalSearch}
              onCreateTransaction={(p) => createTransaction(uid, p)}
              onUpdateTransaction={(id, p) => updateTransaction(uid, id, p)}
              onDeleteTransaction={(id) => deleteTransaction(uid, id)}
            />
          )}

          {activeSection === 'modal_produksi' && (
            <ProductionModalView
              items={productionModals}
              onCreate={(p) => createProductionModal(uid, p)}
              onUpdate={(id, p) => updateProductionModal(uid, id, p)}
              onDelete={(id) => deleteProductionModal(uid, id)}
            />
          )}

          {activeSection === 'stok_bahan' && (
            <MaterialsView
              materials={materials}
              globalSearch={globalSearch}
              onCreate={(p) => createMaterial(uid, p)}
              onUpdate={(id, p) => updateMaterial(uid, id, p)}
              onAdjustStock={(id, s) => adjustMaterialStock(uid, id, s)}
              onDelete={(id) => deleteMaterial(uid, id)}
            />
          )}

          {activeSection === 'invoice' && (
            <InvoiceView
              orders={orders}
              customers={customers}
              settings={settings}
              theme={theme}
              selectedOrderId={selectedInvoiceOrderId}
              onSelectOrder={setSelectedInvoiceOrderId}
            />
          )}

          {activeSection === 'kalender' && (
            <CalendarView
              orders={orders}
              onNewOrderForDate={(due) => handleOpenNewOrder(due)}
              onSelectOrderForInvoice={handleSelectOrderForInvoice}
            />
          )}

          {activeSection === 'laporan' && (
            <ReportsView
              orders={orders}
              transactions={transactions}
              settings={settings}
              theme={theme}
              onSelectOrderForInvoice={handleSelectOrderForInvoice}
            />
          )}

          {activeSection === 'pengaturan' && (
            <SettingsView
              settings={settings}
              onSave={(p) => saveStoreSettings(uid, p)}
              onUpdateProfilePhoto={(url) => updateProfilePhoto(uid, url)}
              onUpdateStoreLogo={(url) => updateStoreLogo(uid, url)}
              onResetDemoData={() => seedDemoData(uid, ownerName, true)}
              ownerEmail={user!.email || ''}
              googlePhotoURL={user!.photoURL}
              theme={theme}
              onToggleTheme={setTheme}
              colorPalette={colorPalette}
              onChangePalette={setColorPalette}
              customColors={customColors}
              onChangeCustomColors={setCustomColors}
            />
          )}
        </main>
      </div>

      <OrderModal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        customers={customers}
        productionModals={productionModals}
        invoicePrefix={settings?.invoicePrefix || 'FLR'}
        existingOrdersCount={orders.length}
        editingOrder={editingOrder}
        defaultDueDate={defaultDueDate}
        onSaveOrder={handleSaveOrder}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApplication />
    </ErrorBoundary>
  );
}
