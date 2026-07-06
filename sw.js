const CACHE_NAME = 'invoice-app-v2'; // قمنا بتغيير الإصدار لكي يستشعر الموبايل التحديث فوراً

const ASSETS = [
  '/',                     // 👈 أهم سطر! لحفظ الرابط الرئيسي للموقع
  '/index.html',           // حفظ الملف باسمه الصريح
  '/css/bootstrap.min.css',
  '/css/all.min.css',
  '/css/style.css',
  '/js/bootstrap.bundle.min.js',
  '/js/html2canvas.min.js',
  '/js/dom.js',
  '/image/مصطفي موسي.png', // تأكد أن الاسم مطابق تماماً للمجلد عندك بنفس المسافات
  '/manifest.json'
];

// تثبيت الـ Service Worker وحفظ الملفات في الكاش
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('جاري حفظ الملفات في الكاش...');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // تجعل الـ Service Worker الجديد يشتغل فوراً بدون انتظار إغلاق التطبيق
});

// تنظيف الكاش القديم (v1) لكي لا يأخذ مساحة من الموبايل
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('جاري حذف الكاش القديم:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// قراءة الملفات من الكاش مباشرة عند تشغيل الأوفلاين
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      // إذا وجد الملف في الكاش يعيده فوراً، وإلا يطلبه من السيرفر
      return response || fetch(e.request);
    })
  );
});