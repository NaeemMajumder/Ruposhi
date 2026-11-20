import type { I18n } from '@/lib/types';

/** Static, bilingual site copy (policies, FAQ, journal). Easy to move into the CMS later. */
type Block = { h?: I18n; p: I18n[] };

export const POLICIES: Record<string, { title: I18n; intro: I18n; blocks: Block[] }> = {
  shipping: {
    title: { en: 'Shipping & delivery', bn: 'শিপিং ও ডেলিভারি' },
    intro: { en: 'We deliver to all 64 districts of Bangladesh through Pathao, Steadfast and RedX.', bn: 'পাঠাও, স্টেডফাস্ট ও রেডএক্স-এর মাধ্যমে আমরা বাংলাদেশের ৬৪ জেলায় ডেলিভারি দিই।' },
    blocks: [
      { h: { en: 'Delivery time', bn: 'ডেলিভারির সময়' }, p: [{ en: 'Inside Dhaka: 1–2 working days. Dhaka suburbs (Savar, Gazipur, Narayanganj, Keraniganj): 2–3 days. Outside Dhaka: 2–4 days. Pre-order pieces ship within 10 days.', bn: 'ঢাকার ভেতরে: ১–২ কর্মদিবস। ঢাকার আশপাশ (সাভার, গাজীপুর, নারায়ণগঞ্জ, কেরানীগঞ্জ): ২–৩ দিন। ঢাকার বাইরে: ২–৪ দিন। প্রি-অর্ডার পণ্য ১০ দিনের মধ্যে পাঠানো হয়।' }] },
      { h: { en: 'Delivery charge', bn: 'ডেলিভারি চার্জ' }, p: [{ en: 'Inside Dhaka ৳70, suburbs ৳100, outside Dhaka ৳130. Orders over ৳5,000 ship free anywhere in Bangladesh.', bn: 'ঢাকার ভেতরে ৳৭০, আশপাশে ৳১০০, ঢাকার বাইরে ৳১৩০। ৳৫,০০০-এর বেশি অর্ডারে সারা দেশে ফ্রি।' }] },
      { h: { en: 'Order confirmation', bn: 'অর্ডার কনফার্মেশন' }, p: [{ en: 'Every Cash on Delivery order is verified by OTP and a short confirmation call from our team before dispatch. You receive SMS updates when your order is confirmed, shipped and delivered.', bn: 'প্রতিটি ক্যাশ অন ডেলিভারি অর্ডার OTP ও আমাদের টিমের ছোট একটি কনফার্মেশন কলের মাধ্যমে যাচাই করা হয়। কনফার্ম, শিপ ও ডেলিভারির সময় আপনি SMS আপডেট পাবেন।' }] },
    ],
  },
  returns: {
    title: { en: 'Returns & exchange', bn: 'রিটার্ন ও এক্সচেঞ্জ' },
    intro: { en: 'Not the right fit? Exchange within 7 days of delivery — simply and politely.', bn: 'ফিট ঠিক হয়নি? ডেলিভারির ৭ দিনের মধ্যে সহজেই এক্সচেঞ্জ করুন।' },
    blocks: [
      { h: { en: 'What can be exchanged', bn: 'কী এক্সচেঞ্জ করা যাবে' }, p: [{ en: 'Unworn, unwashed pieces with original tags and packaging. Size and colour exchanges are free inside Dhaka; outside Dhaka the courier charge applies.', bn: 'না-পরা, না-ধোয়া, ট্যাগ ও প্যাকেজিংসহ পণ্য। ঢাকার ভেতরে সাইজ/রং এক্সচেঞ্জ ফ্রি; ঢাকার বাইরে কুরিয়ার চার্জ প্রযোজ্য।' }] },
      { h: { en: 'Returns & refunds', bn: 'রিটার্ন ও রিফান্ড' }, p: [{ en: 'If a piece arrives damaged or different from the photos, we refund in full to bKash or your card within 3–5 working days.', bn: 'পণ্য ক্ষতিগ্রস্ত বা ছবির থেকে আলাদা হলে ৩–৫ কর্মদিবসে বিকাশ বা কার্ডে পূর্ণ টাকা ফেরত দেওয়া হয়।' }] },
      { h: { en: 'Not eligible', bn: 'যা ফেরতযোগ্য নয়' }, p: [{ en: 'Custom-stitched blouses, altered pieces and items bought in final clearance.', bn: 'মাপমতো সেলাই করা ব্লাউজ, অল্টার করা পণ্য ও ফাইনাল ক্লিয়ারেন্সের পণ্য।' }] },
    ],
  },
  privacy: {
    title: { en: 'Privacy policy', bn: 'প্রাইভেসি পলিসি' },
    intro: { en: 'We collect only what we need to deliver your order and improve your experience.', bn: 'অর্ডার পৌঁছে দিতে ও অভিজ্ঞতা উন্নত করতে যতটুকু দরকার, শুধু ততটুকুই তথ্য আমরা নিই।' },
    blocks: [
      { h: { en: 'What we collect', bn: 'যা সংগ্রহ করি' }, p: [{ en: 'Name, phone, delivery address and optional email; order history; and anonymous browsing events to understand which pages help shoppers.', bn: 'নাম, ফোন, ডেলিভারি ঠিকানা ও ঐচ্ছিক ইমেইল; অর্ডারের ইতিহাস; এবং কোন পেজ ক্রেতাদের কাজে লাগে তা বুঝতে বেনামি ব্রাউজিং ইভেন্ট।' }] },
      { h: { en: 'Advertising measurement', bn: 'বিজ্ঞাপন পরিমাপ' }, p: [{ en: 'We use Meta Pixel / Conversions API and Google Analytics. Contact details sent for matching are SHA-256 hashed — never in plain text.', bn: 'আমরা মেটা পিক্সেল / কনভার্সন API ও গুগল অ্যানালিটিক্স ব্যবহার করি। ম্যাচিংয়ের জন্য পাঠানো তথ্য SHA-256 হ্যাশ করা থাকে — কখনো সরাসরি নয়।' }] },
      { h: { en: 'Your choices', bn: 'আপনার অধিকার' }, p: [{ en: 'Ask us anytime to see, correct or delete your data: hello@ruposhi.com.bd.', bn: 'যেকোনো সময় আপনার তথ্য দেখতে, সংশোধন বা মুছতে বলুন: hello@ruposhi.com.bd।' }] },
    ],
  },
  terms: {
    title: { en: 'Terms of service', bn: 'শর্তাবলি' },
    intro: { en: 'By placing an order with Ruposhi you agree to these terms.', bn: 'রূপসীতে অর্ডার করলে আপনি এই শর্তাবলিতে সম্মত হচ্ছেন।' },
    blocks: [
      { h: { en: 'Pricing', bn: 'মূল্য' }, p: [{ en: 'Prices are in BDT and include VAT. The price shown at checkout is final; we never change the price of a confirmed order.', bn: 'সব মূল্য টাকায় ও ভ্যাটসহ। চেকআউটে দেখানো মূল্যই চূড়ান্ত; কনফার্ম অর্ডারের দাম কখনো বদলানো হয় না।' }] },
      { h: { en: 'Colour accuracy', bn: 'রঙের নির্ভুলতা' }, p: [{ en: 'We film every piece in natural light. Slight variation can occur across screens; handloom pieces may show tiny irregularities that are a mark of hand-weaving.', bn: 'প্রতিটি পোশাক প্রাকৃতিক আলোয় ধারণ করা। স্ক্রিনভেদে সামান্য পার্থক্য হতে পারে; হাতে বোনা কাপড়ে ছোট অসমতা তাঁতের স্বাক্ষর।' }] },
      { h: { en: 'Order cancellation', bn: 'অর্ডার বাতিল' }, p: [{ en: 'You can cancel any time before dispatch by calling us. Repeated refused deliveries may restrict Cash on Delivery for that number.', bn: 'পাঠানোর আগে যেকোনো সময় কল করে বাতিল করা যাবে। বারবার ডেলিভারি না নিলে সেই নম্বরে ক্যাশ অন ডেলিভারি বন্ধ হতে পারে।' }] },
    ],
  },
};

export const FAQ: { q: I18n; a: I18n }[] = [
  { q: { en: 'Is Cash on Delivery available everywhere?', bn: 'ক্যাশ অন ডেলিভারি কি সব জায়গায় আছে?' }, a: { en: 'Yes — across all 64 districts. We verify COD orders with a quick OTP so your order is never placed by mistake.', bn: 'হ্যাঁ — ৬৪ জেলাতেই। ভুল অর্ডার এড়াতে COD অর্ডার একটি দ্রুত OTP দিয়ে যাচাই করা হয়।' } },
  { q: { en: 'Will the colour match the photos?', bn: 'রং কি ছবির মতো হবে?' }, a: { en: 'Every piece is photographed and filmed in natural light, so what you see is what you get. If it is different, we take it back free.', bn: 'প্রতিটি পোশাক প্রাকৃতিক আলোয় ছবি ও ভিডিও করা — যা দেখছেন তাই পাবেন। ভিন্ন হলে ফ্রিতে ফেরত নিই।' } },
  { q: { en: 'How do I pick my panjabi size?', bn: 'পাঞ্জাবির সাইজ কীভাবে বাছব?' }, a: { en: 'Panjabi sizes are your chest measurement (38–46). See the size guide on every product page.', bn: 'পাঞ্জাবির সাইজ মানে আপনার বুকের মাপ (৩৮–৪৬)। প্রতিটি পণ্যের পেজে সাইজ গাইড আছে।' } },
  { q: { en: 'Can I exchange a size?', bn: 'সাইজ এক্সচেঞ্জ করা যাবে?' }, a: { en: 'Yes, within 7 days of delivery for unworn pieces with tags.', bn: 'হ্যাঁ, ডেলিভারির ৭ দিনের মধ্যে, ট্যাগসহ না-পরা পণ্য।' } },
  { q: { en: 'How do I pay with bKash?', bn: 'বিকাশে কীভাবে পেমেন্ট করব?' }, a: { en: 'Choose bKash at checkout. You can pay instantly through the bKash gateway, or Send Money and submit the Transaction ID.', bn: 'চেকআউটে বিকাশ বাছুন। বিকাশ গেটওয়েতে সরাসরি পে করতে পারেন, অথবা সেন্ড মানি করে ট্রানজেকশন আইডি দিন।' } },
  { q: { en: 'How can I track my order?', bn: 'অর্ডার কীভাবে ট্র্যাক করব?' }, a: { en: 'Use the Track order page with your order number and phone, or see live status in your account.', bn: 'ট্র্যাক অর্ডার পেজে অর্ডার নম্বর ও ফোন দিন, অথবা অ্যাকাউন্টে লাইভ স্ট্যাটাস দেখুন।' } },
  { q: { en: 'Do you take pre-orders?', bn: 'প্রি-অর্ডার নেন?' }, a: { en: 'Selected pieces are available on pre-order and ship within 10 days.', bn: 'নির্বাচিত কিছু পণ্য প্রি-অর্ডারে পাওয়া যায়, ১০ দিনের মধ্যে পাঠানো হয়।' } },
];

export type Article = { slug: string; title: I18n; excerpt: I18n; image: string; date: string; minutes: number; body: I18n[] };
const px = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1400`;

export const JOURNAL: Article[] = [
  {
    slug: 'how-to-spot-real-jamdani',
    title: { en: 'How to spot a real Dhakai Jamdani', bn: 'আসল ঢাকাই জামদানি চেনার উপায়' },
    excerpt: { en: 'Five things to check before you buy — from the back of the weave to the weight in your hand.', bn: 'কেনার আগে পাঁচটি জিনিস দেখুন — বুননের উল্টো দিক থেকে হাতের ওজন পর্যন্ত।' },
    image: px(14694822), date: '2026-10-28', minutes: 5,
    body: [
      { en: 'Jamdani is woven on a handloom, motif by motif, with the pattern inserted by hand as the weft is laid. That is why no two are ever identical.', bn: 'জামদানি হাতের তাঁতে বোনা হয়, প্রতিটি মোটিফ হাতে বসানো। তাই দুটো জামদানি কখনো হুবহু এক হয় না।' },
      { en: 'Turn it over: on a real Jamdani the reverse looks almost the same as the front, with no loose floating threads. Machine copies leave long floats on the back.', bn: 'উল্টে দেখুন: আসল জামদানির উল্টো দিক প্রায় সামনের মতোই, ঝুলে থাকা সুতা নেই। মেশিনের নকলে পেছনে লম্বা সুতা থাকে।' },
      { en: 'Feel the weight: fine-count cotton Jamdani is airy and light. Look for small irregularities — they are the weaver’s signature, not a flaw.', bn: 'ওজন দেখুন: মিহি সুতার জামদানি হালকা ও বাতাসের মতো। ছোট অসমতা খুঁজুন — এগুলো তাঁতির স্বাক্ষর, খুঁত নয়।' },
    ],
  },
  {
    slug: 'eid-panjabi-style-guide',
    title: { en: 'The Eid panjabi style guide', bn: 'ঈদের পাঞ্জাবি স্টাইল গাইড' },
    excerpt: { en: 'Morning prayers, family lunch, evening visits — one wardrobe, three moods.', bn: 'সকালের নামাজ, পারিবারিক দুপুর, সন্ধ্যার বেড়ানো — এক পোশাকে তিন মেজাজ।' },
    image: px(10336592), date: '2026-10-12', minutes: 4,
    body: [
      { en: 'For the morning, choose ivory or sand linen — light, breathable and timeless. Pair with white pajama and leather sandals.', bn: 'সকালের জন্য আইভরি বা স্যান্ড লিনেন — হালকা, আরামদায়ক আর চিরন্তন। সাদা পায়জামা আর চামড়ার স্যান্ডেলের সাথে।' },
      { en: 'Evenings call for depth: midnight silk or maroon with zari at the neckline. Keep accessories minimal — a good watch is enough.', bn: 'সন্ধ্যায় গাঢ় রং: মিডনাইট সিল্ক বা গলায় জরির কাজ করা মেরুন। এক্সেসরিজ কম — একটা ভালো ঘড়িই যথেষ্ট।' },
    ],
  },
  {
    slug: 'caring-for-silk-sarees',
    title: { en: 'Caring for your silk sarees', bn: 'সিল্ক শাড়ির যত্ন' },
    excerpt: { en: 'Fold, air, store: simple habits that keep Banarasi and Katan beautiful for decades.', bn: 'ভাঁজ, বাতাস, সংরক্ষণ: যে সহজ অভ্যাসে বেনারসি আর কাতান যুগ যুগ সুন্দর থাকে।' },
    image: px(33885315), date: '2026-09-30', minutes: 3,
    body: [
      { en: 'Always dry-clean silk. Air it for an hour after wearing before folding, and refold along different lines every few months so the zari never cracks.', bn: 'সিল্ক সবসময় ড্রাই ক্লিন করুন। পরার পর ভাঁজ করার আগে এক ঘণ্টা বাতাসে রাখুন, আর কয়েক মাস পরপর ভাঁজ বদলান যাতে জরি না ফাটে।' },
      { en: 'Store in a muslin or cotton bag — never plastic — with a few neem leaves or cloves instead of naphthalene.', bn: 'মসলিন বা সুতির ব্যাগে রাখুন — প্লাস্টিকে কখনো নয় — ন্যাপথলিনের বদলে কয়েকটি নিমপাতা বা লবঙ্গ দিন।' },
    ],
  },
];
