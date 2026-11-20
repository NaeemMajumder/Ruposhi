# রূপসী · Ruposhi — Full-stack E-commerce (Demo-ready, production-grade)

Premium Bangladeshi ethnic wear store — শাড়ি, পাঞ্জাবি, সালোয়ার কামিজ, কুর্তি।
**Stack:** Next.js 16 + React 19 + TypeScript + Tailwind v4 (`client/`) · Express 5 + TypeScript + Zod (`server/`) · MongoDB-ready (runs on a built-in in-memory DB by default).

---

## ১. চালু করবেন কীভাবে (Quick start)

দরকার: **Node.js 20+** (22 LTS recommended)। দুটো টার্মিনাল খুলুন।

```bash
# Terminal 1 — API (http://localhost:5000)
cd server
npm install
npm run dev
```

```bash
# Terminal 2 — Website + Admin (http://localhost:3000)
cd client
npm install
npm run dev
```

- স্টোর: <http://localhost:3000>
- অ্যাডমিন প্যানেল: <http://localhost:3000/admin>
- API health: <http://localhost:5000/api/v1/health>

> ডেমো চালাতে কোনো `.env` লাগবে না — দুটো অ্যাপেই localhost-এর জন্য নিরাপদ ডিফল্ট আছে।
> আসল কী/URL বসাতে চাইলে টেমপ্লেট কপি করুন (Windows):
> `copy server\.env.example server\.env` আর `copy client\.env.example client\.env.local` — তারপর মান বদলান।
> Production-like run: `npm run build && npm start` (দুই ফোল্ডারেই)।

### ⚡ স্পিড: `npm run dev` বনাম আসল (production) মোড
`npm run dev` হলো **ডেভেলপমেন্ট মোড** — প্রতিটা পেজ প্রথমবার খুললে সেটা তখনই কম্পাইল হয় (তাই প্রথমবার কয়েক সেকেন্ড লাগে, উপরে লোডিং বার দেখায়)। এটা কোড লেখার জন্য, স্পিড মাপার জন্য না।
ক্লায়েন্টকে দেখানো বা স্পিড চেক করার সময় production মোডে চালান:

```bash
cd server && npm run preview     # build + start (API)
cd client && npm run preview     # build + start (website) → http://localhost:3000
```

মাপা ফলাফল (একই মেশিনে): dev মোডে প্রথমবার হোম ~৭ সেকেন্ড, অ্যাডমিন ~৩ সেকেন্ড · production মোডে প্রতিটা পেজ **০.০২–০.০৭ সেকেন্ড**।
Production-এ লিংকে হোভার/স্ক্রল করলেই পরের পেজ আগে থেকে লোড (prefetch) হয়ে থাকে, তাই ক্লিক করলে প্রায় সাথে সাথে খোলে।

**Windows-এ dev মোড আরও ধীর হওয়ার কারণ ও সমাধান**
- প্রজেক্টটা **OneDrive ফোল্ডারে** (Desktop) আছে — OneDrive হাজার হাজার `node_modules` / `.next` ফাইল সিঙ্ক করতে থাকে। প্রজেক্টটা OneDrive-এর বাইরে রাখুন, যেমন `C:\dev\ruposhi2` (সবচেয়ে বড় পার্থক্য এটাতেই)।
- **Windows Defender** প্রতিটা ফাইল স্ক্যান করে: Settings → Virus & threat protection → Exclusions → প্রজেক্ট ফোল্ডার যোগ করুন।
- Node.js 22 LTS ব্যবহার করুন।

### ডেমো ডেটা রিসেট
ডেমো ডেটা `server/.data/` এ JSON হিসেবে সেভ থাকে (অর্ডার দিলে/এডিট করলে টিকে থাকে)।
শুরুর অবস্থায় ফেরাতে: `cd server && npm run reset-data` তারপর আবার `npm run dev`।

---

## ২. ডেমো কীভাবে দেখাবেন (Demo guide)

| কী দেখাবেন | কীভাবে |
|---|---|
| **Customer রেজিস্ট্রেশন** | `/register` → নাম, ইমেইল, ফোন, পাসওয়ার্ড → ফোনে OTP (ডেমো কোড **222222**) → অ্যাকাউন্ট তৈরি ও সাইন ইন |
| **Customer login** | `/login` → ইমেইল **অথবা** ফোন + পাসওয়ার্ড। ডেমো: `nusrat@ruposhi.demo` / `01711000000` · `Demo@1234` |
| **পাসওয়ার্ড ভুলে গেলে** | `/forgot-password` → ফোন → কোড 222222 → নতুন পাসওয়ার্ড |
| **COD অর্ডার + OTP** | প্রোডাক্ট → Add to bag → Checkout → ফোন দিলে OTP → ভেরিফাই → Place order → সাকসেস পেজে গোল্ডেন পাপড়ির অ্যানিমেশন |
| **bKash / Card পেমেন্ট** | Checkout-এ *bKash payment* বা *Card* বাছুন → ডেমো গেটওয়ে পেজ (HMAC-signed) → *Simulate successful payment* |
| **bKash/Nagad Send Money** | পেমেন্ট মেথড *bKash (Send money)* → অর্ডার পেজে TrxID দিন → অ্যাডমিনে *Approve* |
| **Admin login** | `/admin/login` → ডেমো বাটনে এক ক্লিক, বা: `owner@ruposhi.com.bd` / `Owner@1234` · `rafiq@ruposhi.com.bd` / `Manager@1234` · `shila@ruposhi.com.bd` / `Orders@1234` · `mitu@ruposhi.com.bd` / `Content@1234` — রোল অনুযায়ী মেনু ও API পারমিশন বদলায় |
| **Excel** | Orders/Products/Customers/Inventory/Reports/Audit → *Export Excel*; Products → *Import Excel* (এডিট করা শিট ফেরত আপলোড); Backup → পুরো ডেটার `.xlsx` / `.json` |
| **কুপন** | `WELCOME10`, `EID500`, `FREESHIP`, `SAREE15` (মেয়াদোত্তীর্ণ: `BOISHAKH20`) |
| **Light / Dark mode** | হেডারের ☀/☾/🖥 আইকন (মোবাইলে মেনুর ভেতরে) — সিস্টেম থিমও ফলো করে |
| **বাংলা / English** | হেডারের `EN | বাং` টগল |
| **Banglish search** | সার্চে লিখুন `punjabi sada`, `jamdhani`, `shari` |

---

## 🔐 Authentication (Passport.js)

- **Customer:** নাম + ইমেইল + ফোন + পাসওয়ার্ড দিয়ে রেজিস্ট্রেশন, ফোন OTP দিয়ে যাচাই। লগইন: ইমেইল **বা** ফোন + পাসওয়ার্ড। আগে গেস্ট হিসেবে অর্ডার করা ফোন দিয়ে রেজিস্টার করলে পুরোনো অর্ডারগুলো অ্যাকাউন্টে চলে আসে।
- **Staff:** আলাদা `/admin/login`, আলাদা কুকি ও আলাদা secret — কাস্টমারের সেশন দিয়ে অ্যাডমিনে ঢোকা যায় না। Owner নতুন স্টাফ বানানোর সময় প্রাথমিক পাসওয়ার্ড দেন।
- **কীভাবে কাজ করে:** Passport `local` (লগইন) + `jwt` (প্রতিটি রিকোয়েস্ট) স্ট্র্যাটেজি। টোকেন থাকে **httpOnly কুকিতে** (`rp_session`, `rp_staff`) — জাভাস্ক্রিপ্ট পড়তে পারে না, তাই XSS দিয়ে চুরি হয় না। ব্রাউজার শুধু `/api/v1` (একই ডোমেইন) কল করে, Next.js সেটা API-তে পাঠায়।
- **নিরাপত্তা:** bcrypt (cost 12) · ৫ বার ভুল পাসওয়ার্ড দিলে ১৫ মিনিট লক · IP rate-limit · CSRF origin check · পাসওয়ার্ড বদলালে/রিসেট করলে অন্য সব ডিভাইস থেকে সাইন আউট · স্টাফের রোল বদলালে বা নিষ্ক্রিয় করলে সাথে সাথে সাইন আউট · শেষ Owner-কে সরানো যায় না · কোনো API রেসপন্স বা Excel ব্যাকআপে পাসওয়ার্ড হ্যাশ যায় না · অ্যাকাউন্ট আছে কি না সেটা "forgot password" দিয়ে বোঝা যায় না।
- **ডেমো OTP:** `DEMO_MODE=true` থাকলে কোড সবসময় `222222` (`DEMO_OTP_CODE` দিয়ে বদলানো যায়)। LIVE মোডে র‍্যান্ডম কোড SMS-এ যাবে।
- **Production-এ:** `JWT_SECRET` ও `JWT_ADMIN_SECRET` অবশ্যই ৩২+ অক্ষরের র‍্যান্ডম হতে হবে, নাহলে API চালু হবে না। ডেমো পাসওয়ার্ডগুলো শুধু DEMO মোডে বসে।

---

## ৩. কী কী আছে (Features)

**Storefront** — mobile-first (মোবাইলে ২টা কার্ড পাশাপাশি), SSR + ISR, bilingual, light/dark
- Home: hero, category arches, flash sale + live countdown, new arrivals, bestsellers, lookbook, occasions, testimonials, newsletter
- Shop / Category / Search: URL-driven filters (category, price range, size, colour, fabric, occasion, stock, sale, new, rating), sort, pagination, Banglish search, active-filter chips, mobile filter bottom-sheet
- Product: swipe gallery, hover zoom, full-screen lightbox, **motion film** (real video if `videoUrl` set, otherwise a cinematic animated film of the photos), variants with live stock, size guide, notify-me (back-in-stock SMS), delivery estimate, sticky mobile add-to-bag, fly-to-bag animation, reviews (write + verified badge), complete-the-look, related, recently viewed
- Cart & Checkout: server-priced quote, coupons, gift wrap, free-shipping bar, 64-district location cascade, delivery by zone, **COD OTP**, bKash/SSLCommerz (demo gateway), manual bKash/Nagad TrxID, idempotent order creation, abandoned-cart capture
- Order success, order tracking, account (orders, addresses, wishlist, rewards/loyalty, referral, profile), wishlist, about, contact, FAQ, size guide, policies, journal
- SEO: per-page metadata, canonical, Open Graph, JSON-LD (Store, WebSite search, Product + Offer + Reviews, Breadcrumb, FAQ, Article), sitemap.xml, robots.txt, web manifest; filtered/sorted pages are `noindex`

**Admin panel** (`/admin`) — every list has filters + date range + Excel export
- Dashboard: 8 KPIs with previous-period change, revenue/profit trend, orders/day, donut charts (payment, category, UTM channel), status, top districts, conversion funnel, top products, low stock, to-do tasks
- Orders: status tabs with counts, search, date range, payment/pay-status/channel/courier/risk filters, bulk status, detail page with timeline, notes, fraud check (store + courier network), call-confirm, payment approve, courier booking (Steadfast/Pathao/RedX demo), item editing, invoice print
- Products (create/edit, bilingual, colour × size variant matrix, SEO preview), editable Excel import, bulk price, duplicate · Categories · Inventory (levels, adjustments, movement log) · Customers (tags, block, notes, history)
- Coupons · Flash sales · Reviews moderation · Marketing (abandoned carts + reminder SMS, SMS campaigns with segment & cost preview, SMS log, subscribers, messages, stock alerts)
- Reports (sales, profit, products, categories, payments, districts, channels/UTM, couriers, coupons, customers/RFM) · Tracking events (Meta CAPI / GA4 dedup) · Homepage CMS · Settings (store, delivery, payments, OTP, pixel IDs, SMS templates) · Staff & roles · Audit log · Backup & restore

**Motion** — page transitions, skeleton shimmer on every route (`loading.tsx`), image develop-in, scroll reveals (pure CSS, no JS), enter/exit animations on every drawer/modal/toast, count-up numbers, animated charts. Everything respects *reduce motion*.

**Security** — Helmet + strict CSP, CORS whitelist, rate limits (global/OTP/checkout/write/search), Zod validation on every input, NoSQL-injection sanitising, server-side pricing & atomic stock reservation, HMAC-hashed OTP with attempts/cooldown, HMAC-signed payment tokens & webhooks, RBAC on every admin route, audit log with before/after, cost price never exposed, upload whitelist (xlsx/json, 5 MB).

---

## ৪. পরে যা যুক্ত করবেন (Plug-in points)

| কাজ | কোথায় |
|---|---|
| **ছবি আপলোড (Cloudinary)** | `server/.env`-এ `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` দিলে অ্যাডমিনে প্রোডাক্ট/ক্যাটাগরি/হোমপেজে "ছবি আপলোড" বাটন আসে। ছবি ব্রাউজারেই ছোট হয় (২০০০px, WebP), তারপর server-এর সই করা লিংক দিয়ে সরাসরি Cloudinary-তে যায় — secret কখনো ব্রাউজারে যায় না |
| **SMS gateway (OTP)** | `server/src/services/notification.service.ts` → `sendSms()`; `.env`-এ `SMS_API_URL`, `SMS_API_KEY`, `SMS_SENDER_ID` দিয়ে `DEMO_MODE=false` করলে আসল OTP যাবে |
| **MongoDB Atlas** | `server/.env`: `DATA_SOURCE=mongo` + `MONGODB_URI=...` → একবার `npm run seed:mongo` (ডেমো ডেটা) — কোডে আর কিছু বদলাতে হবে না |
| **SMS gateway** | `server/.env`: `SMS_API_URL`, `SMS_API_KEY`, `SMS_SENDER_ID`; ফাংশন `server/src/services/notification.service.ts` |
| **Courier (Steadfast/Pathao/RedX)** | `server/.env` কী + `server/src/services/order.service.ts` → `bookCourier()` |
| **bKash / SSLCommerz** | `server/.env` কী + `server/src/services/payment.service.ts` → `initGateway()` (এখন ডেমো পেজে রিডাইরেক্ট করে) |
| **Meta Pixel + Conversions API / GA4** | Pixel/GA4 ID অ্যাডমিন → Settings থেকে বা `client/.env.local`; CAPI token ও GA4 API secret শুধু `server/.env`-এ |
| **নিজের ইমেজ হোস্ট/CDN** | `client/next.config.ts` → `images.remotePatterns` এ ডোমেইন যোগ করুন (এখন শুধু `images.pexels.com`) |
| **Production URL** | `client/.env.local` → `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`; `server/.env` → `CLIENT_URL`, `CORS_ORIGINS` |

> সব secret শুধু `.env`-এ — কোনো API কী ডেটাবেস বা ব্রাউজারে যায় না। `.env` git-এ যায় না (`.gitignore`)।

---

## ৫. Folder structure

```
Ruposhi 2/
├─ server/                     Express 5 + TypeScript API
│  ├─ src/config/              env (Zod-validated), database
│  ├─ src/api/routes|controllers|middlewares|validators
│  ├─ src/services/            business logic (catalog, pricing, order, payment, otp, tracking, analytics, excel, admin…)
│  ├─ src/repositories + db/   storage-agnostic repository (memory ⇄ MongoDB)
│  └─ src/data/                20 demo products, 64 districts, seed generator
└─ client/                     Next.js 16 App Router
   ├─ src/app/(store)/         storefront routes (+ loading.tsx skeletons)
   ├─ src/app/admin/           admin routes
   ├─ src/components/          ui · layout · home · shop · product · cart · checkout · order · account · admin
   ├─ src/i18n/                bn/en dictionaries (cookie-based)
   ├─ src/theme/               light/dark (cookie + system)
   └─ src/lib, src/store       API clients, tracking, motion helpers, zustand stores
```

## ৬. Quality (measured locally, production build)
- Lighthouse **desktop**: Performance 97–99 · Accessibility 100 · Best Practices 96–100 · SEO 100
- Lighthouse **mobile** (DevTools throttling): Performance 83–91 · Accessibility 100 · SEO 100 · CLS 0
- Typecheck: `npm run typecheck` (both folders) — clean

ছবিগুলো Pexels-এর ফ্রি স্টক ইমেজ (লিংক হিসেবে), কন্টাক্ট তথ্য ডামি।

## ৭. Vercel-এ deploy (দুটো আলাদা project, একই GitHub repo)

| Vercel project | Root Directory | Framework (auto) |
|---|---|---|
| `ruposhi-api` | `server` | Express — `src/app.ts`-এর default export একটা function হিসেবে চলে, `vercel.json` লাগে না |
| `ruposhi-shop` | `client` | Next.js |

**আগে server, তারপর client** (client build-এর সময় API থেকে পেজের ডেটা নেয়)।

**Server env (Vercel → Settings → Environment Variables):**
`DATA_SOURCE=mongo` · `MONGODB_URI` · `MONGODB_DB=ruposhi` · `DEMO_MODE=true` ·
`OTP_SECRET` `WEBHOOK_SECRET` `PAYMENT_SECRET` `JWT_SECRET` `JWT_ADMIN_SECRET` (প্রতিটা 32+ অক্ষর) ·
`PROXY_SECRET` · `CLIENT_URL` ও `CORS_ORIGINS` = storefront-এর https URL ·
`CLOUDINARY_CLOUD_NAME` `CLOUDINARY_API_KEY` `CLOUDINARY_API_SECRET` `CLOUDINARY_FOLDER`.
`NODE_ENV` আর `PORT` দেবেন না (Vercel নিজে সেট করে)।

**Client env:** `NEXT_PUBLIC_API_URL=https://<api-domain>/api/v1` · `NEXT_PUBLIC_SITE_URL=https://<shop-domain>` · `PROXY_SECRET` (server-এর সাথে একই মান)।

**MongoDB Atlas → Network Access:** `0.0.0.0/0` allow করুন (Vercel-এর IP নির্দিষ্ট নয়)।
**Region:** দুটো project-এর Function Region Atlas cluster-এর কাছাকাছি রাখুন (Mumbai → `bom1`, Singapore → `sin1`)।

নোট: Vercel-এ JSON demo store চলে না (disk read-only) — তাই সেখানে `DATA_SOURCE=mongo` বাধ্যতামূলক, না দিলে server পরিষ্কার error দেখায়।
