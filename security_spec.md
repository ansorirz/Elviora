# Security Specification — FloréaKas (Manajemen Keuangan Buket & Hantaran)

## 1. Data Invariants
1. **Strict Multi-Tenant Owner Isolation**: Every document in `/users/{userId}/{collection}/{docId}` must have `ownerId == userId == request.auth.uid`, and `request.auth.token.email_verified == true`.
2. **Temporal Integrity**: `createdAt` and `updatedAt` must equal `request.time` on creation. On update, `createdAt` and `ownerId` are immutable, and `updatedAt` must equal `request.time`.
3. **Referential Integrity on Orders**: Every `Order` must reference a valid `customerId` that exists (`existsAfter`) in `/users/{userId}/customers/{customerId}`.
4. **No Negative Financial Values**: `unitPrice`, `productionCost`, `totalAmount`, `paidAmount`, `amount`, `stock`, `minStock`, `unitCost`, `materialCost`, `packagingCost`, `laborCost`, `overheadCost`, `totalHpp`, `sellingPrice` must be `>= 0`. `quantity` must be `>= 1`.
5. **Terminal State Locking**: Cancelled orders (`orderStatus == 'Dibatalkan'`) and fully completed & paid orders (`orderStatus == 'Selesai' && paymentStatus == 'Lunas'`) are locked against modification unless performed by an authorized admin (`isAdmin()`).
6. **PII Isolation**: Customer PII (`phone`, `email`, `address`) resides strictly inside `/users/{userId}/customers/{customerId}` and cannot be read or listed by any other authenticated user.
7. **Public Storefront vs Admin Separation**: Only non-PII product catalog items (`/catalogProducts/{productId}`) and public store branding (`/publicStore/{docId}`) are publicly readable. All writes to `/catalogProducts` and `/publicStore` require verified Admin authentication (`isAdmin()`). Clients/customers cannot write to catalog or enter Admin routes.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Identity Spoofing on Create**: User A tries to create an order under `/users/UserB/orders/ord1` with `ownerId: "UserB"`. -> `PERMISSION_DENIED`
2. **OwnerId Hijack in Payload**: User A creates a customer under `/users/UserA/customers/cust1` with `ownerId: "UserB"`. -> `PERMISSION_DENIED`
3. **Shadow / Ghost Field Injection**: User A creates a material with extra field `isApproved: true`. -> `PERMISSION_DENIED`
4. **Unverified Email Bypass**: Authenticated user with `email_verified: false` tries to create a transaction. -> `PERMISSION_DENIED`
5. **Client Timestamp Forgery**: User A creates a transaction with `createdAt` set to a past date instead of `serverTimestamp()`. -> `PERMISSION_DENIED`
6. **Immutable Field Mutation**: User A updates an order and modifies `createdAt` or `ownerId`. -> `PERMISSION_DENIED`
7. **ID Poisoning / Resource Exhaustion**: User A requests `docId` of length > 128 or containing invalid characters (`../etc`). -> `PERMISSION_DENIED`
8. **Negative Amount / Financial Tampering**: User A creates an income transaction with `amount: -500000`. -> `PERMISSION_DENIED`
9. **Type Poisoning on Update**: User A updates an order's `totalAmount` to a string `"100000"`. -> `PERMISSION_DENIED`
10. **Orphaned Order Creation**: User A creates an order referencing a non-existent `customerId`. -> `PERMISSION_DENIED`
11. **Terminal State Violation**: Non-admin user tries to mutate an order whose `orderStatus` is already `'Dibatalkan'`. -> `PERMISSION_DENIED`
12. **Cross-Tenant List Scraping & Unauthorized Catalog Write**: User A runs a `list` query against `/users/UserB/customers` OR non-admin customer attempts to create/update `/catalogProducts/prod1`. -> `PERMISSION_DENIED`

