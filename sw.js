const CACHE_NAME = 'invoice-app-v3'; // رفعنا الإصدار لضمان تحديث المتصفح فوراً

// تحويل المسارات لنسبية (بدون / في الأول) لضمان اشتغالها على جيت هاب أو أي استضافة
const ASSETS = [
  './', 
  'index.html',
  'css/bootstrap.min.css',
  'css/all.min.css',
  'css/style.css',
  'js/bootstrap.bundle.min.js',
  'js/html2canvas.min.js',
  'js/dom.js',
  'image/مصطفي موسي.png',
  'image/invoice.png', // 👈 ضفنا الأيقونة هنا عشان المتصفح يلاقيها ويوافق على التثبيت
  'manifest.json'
];

// تثبيت الـ Service Worker وحفظ الملفات في الكاش
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('جاري حفظ الملفات في الكاش...');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});