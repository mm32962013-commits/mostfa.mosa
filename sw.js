const CACHE_NAME = 'invoice-app-v4'; // 👈 رفعنا الإصدار لـ v4 لضمان تحديث المتصفح فوراً وحذف الكاش القديم

// المسارات النظيفة بعد حذف مكتبة التصوير
const ASSETS = [
  './', 
  'index.html',
  'css/bootstrap.min.css',
  'css/all.min.css',
  'css/style.css',
  'js/bootstrap.bundle.min.js',
  'js/dom.js', // 👈 تم حذف سطر html2canvas من هنا بنجاح
  'image/مصطفي موسي.png',
  'image/invoice.png', 
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