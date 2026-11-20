import type {
  AbandonedCart, AuditLog, Category, Cms, ContactMessage, Coupon, Customer, FlashSale, InventoryLog, Order, OrderStatus,
  PaymentMethod, Product, Review, Settings, SmsLog, Staff, StockAlert, Subscriber, TrackingEvent, TrafficSource,
} from '../types/domain.js';
import { DIVISIONS, areasFor, zoneFor } from './locations.js';
import { buildDemoProducts } from './products.demo.js';

/** Deterministic PRNG so the demo data is identical on every reset. */
const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rand = rng(20261119);
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
const between = (a: number, b: number) => Math.floor(a + rand() * (b - a + 1));
const iso = (d: Date) => d.toISOString();
const daysAgo = (now: Date, d: number, h = between(9, 23), m = between(0, 59)) => {
  const x = new Date(now.getTime() - d * 86400000);
  x.setHours(h, m, between(0, 59), 0);
  return x;
};
const px = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1800`;

const FIRST_F = ['Nusrat', 'Tasnim', 'Farhana', 'Sadia', 'Ayesha', 'Maliha', 'Rumana', 'Sabrina', 'Nabila', 'Tahmina', 'Ishrat', 'Lamia', 'Mehjabin', 'Sumaiya', 'Anika', 'Raisa', 'Fariha', 'Jannat'];
const FIRST_M = ['Rahim', 'Tanvir', 'Fahim', 'Arif', 'Sakib', 'Nayeem', 'Imran', 'Rafi', 'Shuvo', 'Mahmud', 'Asif', 'Zahid', 'Sabbir', 'Rakib', 'Ehsan'];
const LAST = ['Ahmed', 'Rahman', 'Hossain', 'Islam', 'Chowdhury', 'Akter', 'Khan', 'Sarker', 'Siddiqui', 'Haque', 'Karim', 'Begum', 'Talukder', 'Mridha'];

const weightedDistrict = (): { division: string; district: string } => {
  const r = rand();
  if (r < 0.55) return { division: 'Dhaka', district: 'Dhaka' };
  if (r < 0.65) return { division: 'Dhaka', district: pick(['Gazipur', 'Narayanganj']) };
  if (r < 0.78) return { division: 'Chattogram', district: pick(['Chattogram', 'Cumilla', "Cox's Bazar"]) };
  if (r < 0.84) return { division: 'Sylhet', district: 'Sylhet' };
  const division = pick(Object.keys(DIVISIONS));
  return { division, district: pick(DIVISIONS[division]) };
};

const sourceFor = (): TrafficSource => {
  const r = rand();
  if (r < 0.46) return { channel: 'facebook', utm_source: 'facebook', utm_medium: 'paid_social', utm_campaign: pick(['eid_collection', 'bridal_season', 'retarget_viewers', 'new_arrivals']), fbclid: `fb.${between(100000, 999999)}` };
  if (r < 0.6) return { channel: 'instagram', utm_source: 'instagram', utm_medium: 'social', utm_campaign: 'lookbook' };
  if (r < 0.74) return { channel: 'google', utm_source: 'google', utm_medium: pick(['organic', 'cpc']), gclid: rand() > 0.5 ? `gc.${between(1000, 9999)}` : undefined };
  if (r < 0.8) return { channel: 'sms', utm_source: 'sms', utm_medium: 'sms', utm_campaign: 'repeat_customer' };
  if (r < 0.84) return { channel: 'tiktok', utm_source: 'tiktok', utm_medium: 'paid_social' };
  if (r < 0.88) return { channel: 'email', utm_source: 'newsletter', utm_medium: 'email' };
  return { channel: 'direct' };
};

const orderNoFor = (d: Date, n: number) =>
  `RP-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(n).padStart(4, '0')}`;

export interface SeedData {
  products: Product[];
  categories: Category[];
  customers: Customer[];
  orders: Order[];
  reviews: Review[];
  coupons: Coupon[];
  flashSales: FlashSale[];
  settings: Settings[];
  cms: Cms[];
  staff: Staff[];
  abandonedCarts: AbandonedCart[];
  events: TrackingEvent[];
  subscribers: Subscriber[];
  contacts: ContactMessage[];
  stockAlerts: StockAlert[];
  smsLogs: SmsLog[];
  auditLogs: AuditLog[];
  inventoryLogs: InventoryLog[];
}

let cache: SeedData | null = null;

export const buildSeed = (): SeedData => {
  if (cache) return cache;
  const now = new Date();
  const nowIso = iso(now);
  const products = buildDemoProducts(now);

  const categories: Category[] = [
    { slug: 'saree', name: { en: 'Saree', bn: 'শাড়ি' }, description: { en: 'Banarasi, Jamdani, Katan, Tant and more — woven heritage for every occasion.', bn: 'বেনারসি, জামদানি, কাতান, তাঁত — প্রতিটা উপলক্ষের জন্য বোনা ঐতিহ্য।' }, image: products[0].images[0].url, sortOrder: 1 },
    { slug: 'panjabi', name: { en: 'Panjabi', bn: 'পাঞ্জাবি' }, description: { en: 'Eid classics, wedding statements and everyday linen.', bn: 'ঈদের ক্লাসিক, বিয়ের স্টেটমেন্ট আর প্রতিদিনের লিনেন।' }, image: products[6].images[0].url, sortOrder: 2 },
    { slug: 'salwar-kameez', name: { en: 'Salwar Kameez', bn: 'সালোয়ার কামিজ' }, description: { en: 'Stitched three-pieces in lawn, georgette and organza.', bn: 'লন, জর্জেট আর অর্গাঞ্জায় সেলাই করা থ্রি-পিস।' }, image: products[12].images[0].url, sortOrder: 3 },
    { slug: 'kurti', name: { en: 'Kurti', bn: 'কুর্তি' }, description: { en: 'Easy, elegant kurtis from office to festivities.', bn: 'অফিস থেকে উৎসব — সহজ, মার্জিত কুর্তি।' }, image: products[16].images[0].url, sortOrder: 4 },
  ].map((c, i) => ({ ...c, _id: `cat_${i + 1}`, isActive: true, createdAt: nowIso, updatedAt: nowIso }));

  /* ---------------- customers ---------------- */
  const customers: Customer[] = [];
  const mkCustomer = (i: number, female: boolean, nameOverride?: string, phoneOverride?: string): Customer => {
    const name = nameOverride ?? `${pick(female ? FIRST_F : FIRST_M)} ${pick(LAST)}`;
    const loc = weightedDistrict();
    const area = pick(areasFor(loc.district));
    const created = daysAgo(now, between(30, 220));
    return {
      _id: `cus_${String(i).padStart(3, '0')}`,
      name,
      phone: phoneOverride ?? `01${pick(['3', '5', '6', '7', '8', '9'])}${String(between(10000000, 99999999))}`,
      email: rand() > 0.4 ? `${name.split(' ')[0].toLowerCase()}${between(10, 99)}@gmail.com` : undefined,
      addresses: [{ id: `adr_${i}`, label: 'Home', isDefault: true, ...loc, area, address: `House ${between(1, 120)}, Road ${between(1, 30)}` }],
      tags: [],
      blocked: false,
      loyaltyPoints: 0,
      referralCode: `RUP${String(1000 + i)}`,
      wishlist: [],
      totalSpent: 0,
      orderCount: 0,
      createdAt: iso(created),
      updatedAt: iso(created),
    };
  };
  customers.push(mkCustomer(0, true, 'Nusrat Jahan', '01711000000'));
  customers[0]._id = 'cus_demo';
  customers[0].addresses = [
    { id: 'adr_demo1', label: 'Home', isDefault: true, division: 'Dhaka', district: 'Dhaka', area: 'Dhanmondi', address: 'House 27, Road 9/A' },
    { id: 'adr_demo2', label: 'Office', isDefault: false, division: 'Dhaka', district: 'Dhaka', area: 'Gulshan', address: 'Level 6, Gulshan Avenue' },
  ];
  customers[0].email = 'nusrat.demo@ruposhi.com.bd';
  customers[0].wishlist = [products[1]._id, products[12]._id, products[5]._id];
  for (let i = 1; i <= 54; i++) customers.push(mkCustomer(i, rand() > 0.32));
  customers[7].blocked = true;
  customers[7].tags = ['fake-order'];

  /* ---------------- orders ---------------- */
  const orders: Order[] = [];
  const DAYS = 120;
  let seq = 1;
  for (let d = DAYS; d >= 0; d--) {
    // growth trend + weekend/Eid bumps
    const base = 0.6 + ((DAYS - d) / DAYS) * 1.6;
    const bump = d % 7 === 4 || d % 7 === 5 ? 0.8 : 0;
    const n = Math.max(0, Math.round(base + bump + rand() * 1.8 - 0.4));
    for (let k = 0; k < n; k++) {
      const created = daysAgo(now, d);
      const isDemo = rand() < 0.04;
      const cust = isDemo ? customers[0] : customers[between(1, customers.length - 1)];
      const itemsCount = rand() < 0.72 ? 1 : rand() < 0.8 ? 2 : 3;
      const items = Array.from({ length: itemsCount }, () => {
        const p = products[Math.floor(Math.pow(rand(), 1.3) * products.length)];
        const v = pick(p.variants);
        const qty = rand() < 0.88 ? 1 : 2;
        return {
          productId: p._id, slug: p.slug, name: p.name, image: p.images[0].url, sku: v.sku, color: v.color, size: v.size,
          price: p.price, costPrice: p.costPrice, qty, lineTotal: p.price * qty, category: p.category,
        };
      });
      const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
      const addr = cust.addresses[0];
      const zone = zoneFor(addr.district, addr.area);
      const deliveryCharge = subtotal >= 5000 ? 0 : zone === 'inside_dhaka' ? 70 : zone === 'dhaka_suburb' ? 100 : 130;
      const couponCode = rand() < 0.18 ? pick(['WELCOME10', 'EID500', 'FREESHIP']) : undefined;
      const discount = couponCode === 'WELCOME10' ? Math.min(500, Math.round(subtotal * 0.1)) : couponCode === 'EID500' && subtotal >= 5000 ? 500 : 0;
      const delivery = couponCode === 'FREESHIP' && subtotal >= 3000 ? 0 : deliveryCharge;
      const total = subtotal - discount + delivery;
      const method: PaymentMethod = (() => {
        const r = rand();
        return r < 0.58 ? 'cod' : r < 0.74 ? 'bkash_manual' : r < 0.86 ? 'bkash' : r < 0.94 ? 'sslcommerz' : 'nagad_manual';
      })();
      // status depends on age
      let status: OrderStatus;
      const r = rand();
      if (d > 6) status = r < 0.8 ? 'delivered' : r < 0.9 ? 'cancelled' : 'returned';
      else if (d > 3) status = r < 0.45 ? 'delivered' : r < 0.8 ? 'shipped' : r < 0.92 ? 'processing' : 'cancelled';
      else if (d > 1) status = r < 0.4 ? 'shipped' : r < 0.75 ? 'confirmed' : 'processing';
      else status = r < 0.65 ? 'pending' : 'confirmed';

      const flow: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
      const timeline = [] as Order['timeline'];
      const t = new Date(created);
      const stepTo = status === 'cancelled' ? 1 : status === 'returned' ? 4 : flow.indexOf(status);
      for (let s = 0; s <= stepTo; s++) {
        timeline.push({ status: flow[s], at: iso(t), by: s === 0 ? 'customer' : pick(['Shila (Orders)', 'Rafiq (Manager)', 'system']) });
        t.setTime(t.getTime() + between(3, 30) * 3600000);
      }
      if (status === 'cancelled') timeline.push({ status: 'cancelled', at: iso(t), by: 'Shila (Orders)', note: pick(['Customer unreachable', 'Customer cancelled', 'Duplicate order']) });
      if (status === 'returned') timeline.push({ status: 'returned', at: iso(t), by: 'courier', note: 'Customer refused delivery' });

      const paid = method === 'cod' ? (status === 'delivered' ? total : 0) : status === 'cancelled' ? 0 : total;
      const courier = ['shipped', 'delivered', 'returned'].includes(status) ? pick(['steadfast', 'pathao', 'redx'] as const) : undefined;
      const orderNo = orderNoFor(created, seq++);
      orders.push({
        _id: `ord_${String(seq).padStart(5, '0')}`,
        orderNo,
        customerId: cust._id,
        customer: { name: cust.name, phone: cust.phone, email: cust.email },
        shippingAddress: { division: addr.division, district: addr.district, area: addr.area, address: addr.address },
        items,
        pricing: { subtotal, discount, couponCode, deliveryCharge: delivery, giftWrap: 0, total, advancePaid: 0, due: total - paid },
        payment: {
          method,
          status: paid >= total ? 'paid' : method !== 'cod' && status === 'pending' ? 'pending_verification' : status === 'returned' && method !== 'cod' ? 'refunded' : 'unpaid',
          paidAmount: paid,
          trxId: method.includes('manual') || method === 'bkash' ? `TX${between(10000000, 99999999)}` : undefined,
        },
        status,
        timeline,
        shipping: {
          zone,
          courier,
          consignmentId: courier ? `${courier.slice(0, 2).toUpperCase()}${between(1000000, 9999999)}` : undefined,
          trackingUrl: courier ? `https://track.example.com/${courier}` : undefined,
          bookedAt: courier ? timeline[Math.min(3, timeline.length - 1)].at : undefined,
        },
        source: sourceFor(),
        flags: { otpVerified: method === 'cod', fraudRisk: rand() < 0.08 ? 'high' : rand() < 0.2 ? 'medium' : 'low', callConfirmed: status !== 'pending' },
        notes: [],
        giftWrap: false,
        deliveredAt: status === 'delivered' ? timeline[timeline.length - 1].at : undefined,
        createdAt: iso(created),
        updatedAt: timeline[timeline.length - 1].at,
      });
    }
  }

  // roll customer stats
  for (const c of customers) {
    const mine = orders.filter((o) => o.customerId === c._id && o.status !== 'cancelled');
    c.orderCount = mine.length;
    c.totalSpent = mine.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.pricing.total, 0);
    c.lastOrderAt = mine.length ? mine[mine.length - 1].createdAt : undefined;
    c.loyaltyPoints = Math.floor(c.totalSpent / 100);
    if (c.totalSpent > 25000) c.tags.push('vip');
    if (c.orderCount >= 3) c.tags.push('repeat');
  }

  /* ---------------- reviews ---------------- */
  const REVIEW_TEXT = [
    ['Exactly like the video', 'The colour and fabric are exactly what I saw in the product video. Packaging felt premium too.'],
    ['Wore it to my cousin’s wedding', 'So many compliments! The drape is beautiful and it was comfortable all evening.'],
    ['Perfect fit', 'Ordered my usual size and it fits perfectly. Stitching is very neat.'],
    ['Fast delivery in Dhaka', 'Got it the next day. Call confirmation was polite and the rider was on time.'],
    ['Fabric is premium', 'You can feel the quality. Worth the price for a special occasion.'],
    ['Lovely but slightly darker', 'Beautiful piece, the shade is a little deeper than my screen showed. Still love it.'],
    ['Gift for my mother', 'Bought this for Ammu for Eid — she loved it. Gift wrap was a nice touch.'],
  ];
  const reviews: Review[] = [];
  let rv = 1;
  for (const p of products) {
    const n = between(2, 5);
    for (let i = 0; i < n; i++) {
      const [title, body] = pick(REVIEW_TEXT);
      const c = customers[between(1, customers.length - 1)];
      const created = daysAgo(now, between(2, 100));
      reviews.push({
        _id: `rev_${rv++}`, productId: p._id, productSlug: p.slug, customerName: `${c.name.split(' ')[0]} ${c.name.split(' ')[1]?.[0] ?? ''}.`,
        customerId: c._id, rating: title.includes('darker') ? 4 : rand() < 0.8 ? 5 : 4, title, body, photos: rand() < 0.25 ? [p.images[0].url] : [],
        verified: rand() < 0.85, status: rand() < 0.9 ? 'approved' : 'pending', createdAt: iso(created), updatedAt: iso(created),
      });
    }
  }

  const coupons: Coupon[] = [
    { code: 'WELCOME10', type: 'percent', value: 10, maxDiscount: 500, minOrder: 1500, firstOrderOnly: true, categories: [], perCustomerLimit: 1, usedCount: 64, description: { en: '10% off your first order (up to ৳500)', bn: 'প্রথম অর্ডারে ১০% ছাড় (সর্বোচ্চ ৳৫০০)' } },
    { code: 'EID500', type: 'flat', value: 500, minOrder: 5000, firstOrderOnly: false, categories: [], perCustomerLimit: 2, usedCount: 41, description: { en: '৳500 off on orders over ৳5,000', bn: '৳৫,০০০+ অর্ডারে ৳৫০০ ছাড়' } },
    { code: 'FREESHIP', type: 'free_shipping', value: 0, minOrder: 3000, firstOrderOnly: false, categories: [], perCustomerLimit: 5, usedCount: 58, description: { en: 'Free delivery on orders over ৳3,000', bn: '৳৩,০০০+ অর্ডারে ফ্রি ডেলিভারি' } },
    { code: 'SAREE15', type: 'percent', value: 15, maxDiscount: 2500, minOrder: 3000, firstOrderOnly: false, categories: ['saree'], perCustomerLimit: 1, usedCount: 12, description: { en: '15% off sarees', bn: 'শাড়িতে ১৫% ছাড়' } },
    { code: 'BOISHAKH20', type: 'percent', value: 20, maxDiscount: 1000, minOrder: 2000, firstOrderOnly: false, categories: [], perCustomerLimit: 1, usedCount: 88, endsAt: iso(daysAgo(now, 30)), description: { en: 'Boishakh special (expired)', bn: 'বৈশাখী অফার (মেয়াদোত্তীর্ণ)' } },
  ].map((c, i) => ({ ...c, _id: `cpn_${i + 1}`, isActive: true, createdAt: nowIso, updatedAt: nowIso } as Coupon));

  const flashSales: FlashSale[] = [
    {
      _id: 'fls_1', title: { en: 'Weekend Heritage Edit', bn: 'উইকেন্ড হেরিটেজ এডিট' },
      productSlugs: ['royal-purple-katan-silk-saree', 'midnight-black-silk-panjabi', 'gulbahar-floral-three-piece', 'alta-red-cotton-kurti', 'rongdhonu-tant-cotton-saree'],
      discountPercent: 15, startsAt: iso(daysAgo(now, 1, 0, 0)), endsAt: iso(new Date(now.getTime() + 3 * 86400000 + 5 * 3600000)), isActive: true,
      createdAt: nowIso, updatedAt: nowIso,
    },
  ];

  const settings: Settings[] = [{
    _id: 'settings',
    store: { name: 'Ruposhi', email: 'hello@ruposhi.com.bd', phone: '+880 1711-000000', address: 'House 27, Road 9/A, Dhanmondi, Dhaka 1209', whatsapp: '8801711000000', facebook: 'https://facebook.com/ruposhi.bd', instagram: 'https://instagram.com/ruposhi.bd', youtube: 'https://youtube.com/@ruposhibd' },
    delivery: { insideDhaka: 70, dhakaSuburb: 100, outsideDhaka: 130, freeShippingThreshold: 5000, insideDays: '1–2', outsideDays: '2–4', giftWrapFee: 150 },
    payments: { cod: true, bkashManual: true, nagadManual: true, bkash: true, sslcommerz: true, codAdvanceDeliveryCharge: false, codOtpRequired: true, bkashNumber: '01711-000000', nagadNumber: '01711-000000' },
    tracking: { metaPixelId: '', ga4Id: '', gtmId: '', tiktokPixelId: '' },
    smsTemplates: {
      otp: 'Your Ruposhi code is {code}. Valid for 5 minutes. Do not share it.',
      order_placed: 'Dear {name}, your Ruposhi order {orderNo} (৳{total}) is placed. We will call to confirm shortly.',
      order_confirmed: 'Dear {name}, order {orderNo} is confirmed and being prepared. — Ruposhi',
      order_shipped: 'Your order {orderNo} has shipped via {courier}. Track: {trackingUrl} — Ruposhi',
      order_delivered: 'Order {orderNo} delivered. Loved it? Review it here: {reviewUrl} — Ruposhi',
      order_cancelled: 'Order {orderNo} has been cancelled. Questions? Call {storePhone}. — Ruposhi',
      abandoned_cart: 'Hi {name}, your Ruposhi bag is waiting! Complete your order: {cartUrl}',
      back_in_stock: 'Good news! {product} is back in stock at Ruposhi: {url}',
    },
    loyalty: { pointsPerTaka: 0.01, takaPerPoint: 1 },
    lowStockThreshold: 5,
    maintenanceMode: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  }];

  const cms: Cms[] = [{
    _id: 'cms',
    announcements: [
      { en: 'Free delivery on orders over ৳5,000 — all over Bangladesh', bn: '৳৫,০০০+ অর্ডারে সারা দেশে ফ্রি ডেলিভারি' },
      { en: 'Cash on Delivery · bKash · Nagad · Cards', bn: 'ক্যাশ অন ডেলিভারি · বিকাশ · নগদ · কার্ড' },
      { en: 'What you see is exactly what you get — every piece filmed in real light', bn: 'যা দেখছেন, ঠিক তাই পাবেন — প্রতিটা পোশাক আসল আলোয় ধারণ করা' },
    ],
    hero: [
      { eyebrow: { en: 'The Bridal Edit · 2026', bn: 'ব্রাইডাল এডিট · ২০২৬' }, title: { en: 'Heritage,\nworn beautifully.', bn: 'বাংলার রূপ,\nআপনার সাজে।' }, subtitle: { en: 'Banarasi, Jamdani and Katan — handpicked for the days you will remember forever.', bn: 'বেনারসি, জামদানি আর কাতান — যে দিনগুলো চিরকাল মনে থাকবে, তার জন্য বাছাই করা।' }, cta: { en: 'Shop the bridal edit', bn: 'ব্রাইডাল কালেকশন দেখুন' }, href: '/shop?occasion=wedding', image: px(14694822) },
      { eyebrow: { en: 'Eid Collection', bn: 'ঈদ কালেকশন' }, title: { en: 'Made for\nmornings of Eid.', bn: 'ঈদের সকালের\nজন্য তৈরি।' }, subtitle: { en: 'Panjabis and three-pieces in soft cotton, linen and lawn.', bn: 'নরম সুতি, লিনেন আর লনে পাঞ্জাবি ও থ্রি-পিস।' }, cta: { en: 'Explore Eid', bn: 'ঈদ কালেকশন' }, href: '/shop?occasion=eid', image: px(10336592) },
      { eyebrow: { en: 'Gaye Holud', bn: 'গায়ে হলুদ' }, title: { en: 'Turmeric,\nmarigold & joy.', bn: 'হলুদ, গাঁদা\nআর আনন্দ।' }, subtitle: { en: 'Sunny yellows for the most colourful night of the wedding.', bn: 'বিয়ের সবচেয়ে রঙিন রাতের জন্য রোদেলা হলুদ।' }, cta: { en: 'Shop holud', bn: 'হলুদের পোশাক' }, href: '/shop?occasion=gaye-holud', image: px(33885315) },
    ],
    lookbook: [
      { image: products[2].images[0].url, caption: { en: 'Emerald Jamdani, morning light', bn: 'ভোরের আলোয় পান্না জামদানি' }, productSlug: products[2].slug },
      { image: products[6].images[0].url, caption: { en: 'Ivory chikankari for Eid', bn: 'ঈদের আইভরি চিকনকারি' }, productSlug: products[6].slug },
      { image: products[12].images[0].url, caption: { en: 'Gulbahar florals', bn: 'গুলবাহার ফুলেল' }, productSlug: products[12].slug },
      { image: products[1].images[0].url, caption: { en: 'Katan in the garden', bn: 'বাগানে কাতান' }, productSlug: products[1].slug },
      { image: products[7].images[0].url, caption: { en: 'Midnight silk', bn: 'মিডনাইট সিল্ক' }, productSlug: products[7].slug },
      { image: products[16].images[0].url, caption: { en: 'Alta red, everyday', bn: 'প্রতিদিনের আলতা লাল' }, productSlug: products[16].slug },
    ],
    testimonials: [
      { name: 'Farhana R.', city: 'Dhanmondi, Dhaka', rating: 5, text: { en: 'The Jamdani was exactly like the video — not a shade different. Ruposhi is the first online store I trust for sarees.', bn: 'জামদানিটা ভিডিওর সাথে হুবহু মিলেছে — একটুও রং আলাদা না। শাড়ির জন্য রূপসীই প্রথম অনলাইন দোকান যাকে বিশ্বাস করি।' } },
      { name: 'Tanvir A.', city: 'Chattogram', rating: 5, text: { en: 'Ordered panjabis for my whole family for Eid. Delivered in two days, fit was perfect.', bn: 'ঈদে পুরো পরিবারের জন্য পাঞ্জাবি নিয়েছি। দুই দিনে পেয়েছি, ফিট একদম পারফেক্ট।' } },
      { name: 'Sadia K.', city: 'Sylhet', rating: 5, text: { en: 'Packaging felt like a gift. The call confirmation was so polite. Will order again!', bn: 'প্যাকেজিংটা উপহারের মতো লেগেছে। কনফার্মেশন কলটাও খুব ভদ্র। আবার অর্ডার করব!' } },
    ],
    promises: [
      { title: { en: 'What you see is what you get', bn: 'যা দেখছেন, তাই পাবেন' }, text: { en: 'Every piece photographed and filmed in real light.', bn: 'প্রতিটা পোশাক আসল আলোয় ছবি ও ভিডিও করা।' } },
      { title: { en: 'Premium, without compromise', bn: 'আপসহীন প্রিমিয়াম' }, text: { en: 'Fabric, stitching and finishing checked by hand.', bn: 'কাপড়, সেলাই আর ফিনিশিং হাতে যাচাই করা।' } },
      { title: { en: 'Shop without worry', bn: 'নিশ্চিন্ত কেনাকাটা' }, text: { en: 'Cash on delivery, bKash, cards and 7-day easy exchange.', bn: 'ক্যাশ অন ডেলিভারি, বিকাশ, কার্ড আর ৭ দিনের সহজ এক্সচেঞ্জ।' } },
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  }];

  const staff: Staff[] = [
    { name: 'Naeem Majumder', email: 'owner@ruposhi.com.bd', role: 'owner' as const, ordersHandled: 0 },
    { name: 'Rafiq (Manager)', email: 'rafiq@ruposhi.com.bd', role: 'manager' as const, ordersHandled: 212 },
    { name: 'Shila (Orders)', email: 'shila@ruposhi.com.bd', role: 'order_staff' as const, ordersHandled: 386 },
    { name: 'Mitu (Content)', email: 'mitu@ruposhi.com.bd', role: 'content_editor' as const, ordersHandled: 0 },
  ].map((s, i) => ({ ...s, _id: `stf_${i + 1}`, active: true, lastLoginAt: iso(daysAgo(now, i)), lastLoginIp: `103.12${i}.4.${10 + i}`, createdAt: nowIso, updatedAt: nowIso }));

  const abandonedCarts: AbandonedCart[] = Array.from({ length: 9 }, (_, i) => {
    const p = products[between(0, products.length - 1)];
    const c = customers[between(1, customers.length - 1)];
    const created = daysAgo(now, between(0, 12));
    const qty = 1;
    return {
      _id: `abc_${i + 1}`, phone: c.phone, name: c.name,
      items: [{ slug: p.slug, name: p.name.en, qty, price: p.price, size: p.sizes[0], color: p.colors[0].name.en }],
      value: p.price * qty, recovered: i % 4 === 0, remindersSent: i % 3, lastReminderAt: i % 3 ? iso(created) : undefined,
      createdAt: iso(created), updatedAt: iso(created),
    };
  });

  /* ---------------- funnel events (first-party tracking) ---------------- */
  const events: TrackingEvent[] = [];
  let ev = 1;
  for (let d = 119; d >= 0; d--) {
    const day = daysAgo(now, d, 12, 0);
    const views = between(120, 260) + Math.round((119 - d) * 1.2);
    const counts = { page_view: views, view_content: Math.round(views * 0.62), add_to_cart: Math.round(views * 0.11), initiate_checkout: Math.round(views * 0.055) };
    for (const [name, n] of Object.entries(counts)) {
      // store aggregated "bucket" events to keep the demo store light
      events.push({
        _id: `evt_${ev++}`, name, eventId: `seed_${name}_${d}`, count: n, source: sourceFor(),
        sentToMeta: 'dry-run', sentToGa4: 'dry-run', createdAt: iso(day), updatedAt: iso(day),
      });
    }
  }

  const subscribers: Subscriber[] = Array.from({ length: 28 }, (_, i) => {
    const c = customers[(i * 3) % customers.length];
    const created = daysAgo(now, between(1, 90));
    return { _id: `sub_${i + 1}`, contact: c.email ?? c.phone, source: pick(['footer', 'popup', 'checkout']), createdAt: iso(created), updatedAt: iso(created) };
  });

  const contacts: ContactMessage[] = [
    { name: 'Lamia H.', phone: '01819234567', subject: 'Bridal saree customisation', message: 'Can the Crimson Banarasi blouse be stitched to my measurements?', status: 'new' },
    { name: 'Arif K.', phone: '01912345678', subject: 'Bulk order for Eid', message: 'I need 12 panjabis for my family in different sizes. Is there a discount?', status: 'read' },
    { name: 'Ishrat J.', phone: '01556789012', subject: 'Exchange request', message: 'Size M is a bit tight, I want to exchange for L.', status: 'replied' },
  ].map((m, i) => ({ ...m, status: m.status as ContactMessage['status'], _id: `msg_${i + 1}`, createdAt: iso(daysAgo(now, i + 1)), updatedAt: iso(daysAgo(now, i + 1)) }));

  const stockAlerts: StockAlert[] = [
    { productSlug: 'festive-rang-a-line-kurti', phone: '01711223344', size: 'M' },
    { productSlug: 'festive-rang-a-line-kurti', phone: '01822334455', size: 'L' },
    { productSlug: 'maroon-zari-embroidered-panjabi', phone: '01933445566', size: '46' },
  ].map((a, i) => ({ ...a, _id: `stk_${i + 1}`, notified: false, createdAt: iso(daysAgo(now, i + 2)), updatedAt: iso(daysAgo(now, i + 2)) }));

  const smsLogs: SmsLog[] = orders.slice(-25).map((o, i) => ({
    _id: `sms_${i + 1}`, to: o.customer.phone, template: 'order_placed', message: `Dear ${o.customer.name}, your Ruposhi order ${o.orderNo} (৳${o.pricing.total}) is placed.`,
    status: 'demo', cost: 0.35, createdAt: o.createdAt, updatedAt: o.createdAt,
  }));

  const auditLogs: AuditLog[] = [
    { actor: 'Rafiq (Manager)', role: 'manager', action: 'product.price_changed', entity: 'product', entityId: products[1]._id, before: { price: 13500 }, after: { price: 12800 } },
    { actor: 'Shila (Orders)', role: 'order_staff', action: 'order.status_changed', entity: 'order', entityId: orders[orders.length - 3]?._id ?? '', before: { status: 'pending' }, after: { status: 'confirmed' } },
    { actor: 'Mitu (Content)', role: 'content_editor', action: 'cms.updated', entity: 'cms', entityId: 'cms', before: null, after: { section: 'hero' } },
    { actor: 'Naeem Majumder', role: 'owner', action: 'coupon.created', entity: 'coupon', entityId: 'cpn_4', before: null, after: { code: 'SAREE15' } },
  ].map((a, i) => ({ ...a, _id: `aud_${i + 1}`, ip: '103.120.4.10', createdAt: iso(daysAgo(now, 4 - i)), updatedAt: iso(daysAgo(now, 4 - i)) }));

  const inventoryLogs: InventoryLog[] = products.slice(0, 8).map((p, i) => ({
    _id: `inv_${i + 1}`, sku: p.variants[0].sku, productSlug: p.slug, change: 10, before: Math.max(0, p.variants[0].stock - 10), after: p.variants[0].stock,
    reason: 'restock', ref: `PO-26${String(i + 1).padStart(3, '0')}`, actor: 'Rafiq (Manager)', createdAt: iso(daysAgo(now, 10 + i)), updatedAt: iso(daysAgo(now, 10 + i)),
  }));

  cache = { products, categories, customers, orders, reviews, coupons, flashSales, settings, cms, staff, abandonedCarts, events, subscribers, contacts, stockAlerts, smsLogs, auditLogs, inventoryLogs };
  return cache;
};
