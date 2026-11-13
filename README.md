# Auto Parts — shop inventory, stock & billing

Two apps:

| Folder | Stack | Port |
| --- | --- | --- |
| `backend/` | Express + TypeORM + MySQL (same structure and style as `aripra-backend`) | 5050 |
| `frontend/` | Next.js 16 + TypeScript + Tailwind v4 | 3001 |

## Run it

```bash
# 1. API
cd backend
cp .env.example .env          # set DB_PASSWORD, TOKEN_SECRET_KEY (32+ random chars, required), ADMIN_EMAIL / ADMIN_PASSWORD
npm install
npm run migration:run         # creates the tables in DB_NAME (create the empty database first)
npm run seed                  # permissions, admin user, shop settings
npm run seed -- --demo        # (optional) two demo shops with managers, stock, suppliers and customers
npm run dev

# 2. Web
cd ../frontend
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:5050
npm install
npm run dev                   # http://localhost:3001
```

Default admin login comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `backend/.env`.

### Tests

```bash
cd backend
npm test          # unit tests + integration tests against a throwaway <DB_NAME>_test database
npm run test:unit # no database needed
```

The integration tests create, migrate and seed `<DB_NAME>_test`, then drop it (set `KEEP_TEST_DB=1` to
keep it). `.github/workflows/ci.yml` runs the same checks on GitHub, plus the frontend lint, typecheck and
build, and `npm audit` for both apps.

### Sign-in and sessions

- Sessions last 7 days. Changing your password, an admin resetting it, or **Sign out other devices** (user
  menu) ends every other session at once.
- After 10 wrong passwords in 15 minutes an account is paused for 15 minutes (20 failures per address).
- Emailing invoices (30 an hour) and PDFs (60 per 10 minutes) are limited per user.

### Emailing invoices

Add an outgoing mail account to `backend/.env` and restart the API. With Gmail (free): turn on 2-step
verification, create an **app password**, then:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=yourshop@gmail.com
SMTP_PASS=<the 16-character app password>
MAIL_FROM=yourshop@gmail.com
```

Invoices go out with the shop's name as the sender name, and replies go to the shop's email if one is
set. To try it without sending anything, set `MAIL_TRANSPORT=log`: each email is saved to
`backend/logs/mail/*.eml` (open it in any mail app).

## Shops, admin and managers

- **Shops.** The business runs several shops. Each shop has its own **stock, purchases, invoices
  (and invoice numbering), customers, stock history and printed details** (name, address, GSTIN,
  terms). The **product catalog, categories, brands and suppliers are shared** by every shop.
- **Admin (root).** One admin, created by the seed. Sees and manages everything: a business
  overview across all shops, consolidated and per-shop reports, and can switch into any shop
  (sidebar switcher) to bill, receive stock or adjust stock there. Only the admin manages shops,
  managers and business-wide settings.
- **Manager = one shop.** Adding a manager creates their shop in the same form (or hands them an
  existing shop that has no manager). A manager only ever sees and acts on their own shop. This is
  enforced by the API (`authenticate` resolves the shop for every request), not just hidden in the UI.
- **Removing a manager** keeps the shop and all its data; the next manager can take it over.
  **Closing a shop** blocks its manager's sign-in without deleting anything.
- **Permissions** still apply inside a shop: managers get every permission by default and the admin
  can switch any off per manager (Shops & managers → Permissions). Without *See purchase cost*, every
  cost, average cost, stock value and profit field is removed from every API response in one place
  (`middlewares/hide-cost.middleware.ts`); purchase bills, being cost documents, still show their prices.
- The admin picks a shop with the `x-shop-id` request header (the frontend sends it from the
  sidebar switcher); managers' requests are pinned to their own shop whatever they send.

## What's in it

- **Products**: SKU, part no., brand, category, vehicle fitment (searchable), HSN, GST rate, MRP,
  rack/bin, reorder level. Soft delete keeps history intact.
- **Stock**: kept per shop (`shop_stock`: quantity, reorder level, rack, average cost). Every
  movement is written to an append-only ledger (`stock_transaction`) under a row lock, so the
  on-hand quantity always matches history.
- **Purchases**: recording a supplier bill brings stock in and updates weighted-average cost. Track
  what you owe each supplier and record payments.
- **Invoices**: fast keyboard billing (type, ↑/↓, Enter; ⌘/Ctrl+Enter to save). Prices are
  GST-inclusive; tax is carved out per line. Walk-in or saved customers, vehicle number, partial
  payments with payment terms (due date, Overdue filter), "Bill again", cancel (returns stock, and
  records the refund of anything paid, in the mode it was given back).
- **GST**: the place of supply is the registered customer's state (from their GSTIN), the shop's own
  state for counter sales, or chosen on the bill. Another state than the shop's means **IGST**;
  otherwise CGST + SGST. The invoice, PDF and GST report follow it.
- **Editing invoices and purchases**: an issued invoice or a recorded purchase can be edited (Edit button on
  its page): items, quantities, prices, discounts, customer or supplier details, notes. The number stays the
  same and stock moves by the difference only. On a purchase the shop's average cost is redone as if it had
  been entered that way; a quantity can't be cut below what is still in stock. Payments stay as recorded, so a
  total can't drop below what has been paid. An invoice keeps its kind (GST or not) and date; cancelled
  invoices can't be edited. Every edit is kept in an *Edit history* on the page (who, when, what changed).
  Permissions *Edit issued invoices* and *Edit recorded purchases* are on for managers by default.
- **With and without GST, one stock**: every purchase and every sale is marked *With GST* or *Without GST*
  (a switch on the purchase and billing screens; each screen remembers the last choice). Both kinds move the
  same stock and the same average cost.
  - A purchase without GST is taken at 0%: the price paid is the cost. With GST the cost is before tax.
  - A sale without GST carries no tax, prints as a plain **BILL** (no GSTIN, HSN or GST columns) and is
    numbered in its own series (shop setting *Non-GST bill prefix*, default `BILL`), so the GST invoice
    series stays unbroken.
  - Reports split sales and purchases into with/without GST. *GST on sales* counts GST invoices only;
    *GST on purchases* shows input tax from supplier bills with GST.
  - Billing without GST is a permission (*Make bills without GST*), on for managers by default.
- **The invoice document**: each invoice page shows the actual GST tax invoice the customer gets: shop
  logo, seller/buyer GSTIN, HSN, per-line taxable value and GST, CGST/SGST summary, amount in words,
  bank details, a **UPI QR code for the balance due**, terms, signature, Original/Duplicate copy label.
  - **Print**: A4 invoice, duplicate copy, or **80 mm thermal receipt**, straight from the page.
  - **PDF**: download, or on a phone **share** it to WhatsApp/Gmail. PDFs are drawn server-side with
    pdfmake (no headless browser, so it runs on small/free servers).
  - **Email**: sends the PDF with an editable message; every send is logged on the invoice.
  - **Logo**: each person sets their **business logo on their profile** (Settings → Business logo).
    A manager's logo is their shop's and prints on that shop's invoices; the admin's is the business
    logo, printed on invoices of any shop without its own. The admin can also set it while editing a
    manager (Shops & managers → Edit manager) or their own details.
  - Bank details and UPI id are set per shop in **Settings** (or Shops & managers → Edit shop details).
- **Reports**: sales, gross profit, GST summary, collections by payment mode, best sellers.
- **Settings**: shop details printed on invoices, invoice/purchase number prefixes, defaults.

## Backend layout (mirrors aripra-backend)

```
server/
  configs/        express, logger
  constants/      application paths, cookie keys, sequences
  controllers/    one per module, IController handlers
  data-source/    DataSource + repository registry
  entities/       <module>/<name>.entity.ts
  errors/         StringError (400), ForbiddenError (403)
  interfaces/     IRequest, IController
  middlewares/    authenticate, async handler, permission guard, joi + api error handlers
  migrations/     TypeORM migrations (synchronize is off)
  routes/         <module>/<module>.route.ts, wired in index.route.ts
  seeds/          permissions, admin, demo catalog
  services/       <module>/<name>.service.ts — all business rules live here
  types/          T-prefixed types and enums
  utilities/      ApiResponse, ApiUtility, encryption, dates
  validations/    joi schemas per module
```

After changing an entity: `npm run migration:generate -- server/migrations/<Name>` then
`npm run migration:run`.
