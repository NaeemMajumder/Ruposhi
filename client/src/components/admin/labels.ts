/** Human labels for API enum values (bilingual). */
export const LABELS: Record<string, [string, string]> = {
  pending: ['Pending', 'পেন্ডিং'], confirmed: ['Confirmed', 'কনফার্মড'], processing: ['Processing', 'প্রসেসিং'], shipped: ['Shipped', 'শিপড'],
  delivered: ['Delivered', 'ডেলিভারড'], cancelled: ['Cancelled', 'বাতিল'], returned: ['Returned', 'রিটার্ন'],
  cod: ['Cash on delivery', 'ক্যাশ অন ডেলিভারি'], bkash_manual: ['bKash (manual)', 'বিকাশ (ম্যানুয়াল)'], nagad_manual: ['Nagad (manual)', 'নগদ (ম্যানুয়াল)'],
  bkash: ['bKash gateway', 'বিকাশ গেটওয়ে'], sslcommerz: ['Card / SSLCommerz', 'কার্ড / SSLCommerz'],
  unpaid: ['Unpaid', 'বকেয়া'], pending_verification: ['Verifying', 'যাচাই চলছে'], partial: ['Partial', 'আংশিক'], paid: ['Paid', 'পরিশোধিত'], refunded: ['Refunded', 'ফেরত'], failed: ['Failed', 'ব্যর্থ'],
  saree: ['Saree', 'শাড়ি'], panjabi: ['Panjabi', 'পাঞ্জাবি'], 'salwar-kameez': ['Salwar Kameez', 'সালোয়ার কামিজ'], kurti: ['Kurti', 'কুর্তি'],
  facebook: ['Facebook', 'ফেসবুক'], instagram: ['Instagram', 'ইনস্টাগ্রাম'], google: ['Google', 'গুগল'], direct: ['Direct', 'সরাসরি'], sms: ['SMS', 'SMS'],
  tiktok: ['TikTok', 'টিকটক'], referral: ['Referral', 'রেফারেল'], email: ['Email', 'ইমেইল'], youtube: ['YouTube', 'ইউটিউব'], organic: ['Organic', 'অর্গানিক'],
  steadfast: ['Steadfast', 'স্টেডফাস্ট'], pathao: ['Pathao', 'পাঠাও'], redx: ['RedX', 'রেডএক্স'],
  inside_dhaka: ['Inside Dhaka', 'ঢাকার ভেতরে'], dhaka_suburb: ['Dhaka suburb', 'ঢাকার আশপাশ'], outside_dhaka: ['Outside Dhaka', 'ঢাকার বাইরে'],
};
export const lbl = (v: string, lang: 'en' | 'bn') => LABELS[v]?.[lang === 'bn' ? 1 : 0] ?? v.replace(/[_-]/g, ' ');
export const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
export const PAY_METHODS = ['cod', 'bkash_manual', 'nagad_manual', 'bkash', 'sslcommerz'];
export const PAY_STATUSES = ['unpaid', 'pending_verification', 'partial', 'paid', 'refunded', 'failed'];
export const CHANNELS = ['facebook', 'instagram', 'google', 'tiktok', 'sms', 'email', 'referral', 'direct', 'organic'];
export const COURIERS = ['steadfast', 'pathao', 'redx'];
