// سحب البيانات من الـ LocalStorage
let dataStore = JSON.parse(localStorage.getItem("invoiceDataStore")) || {};

// متغيرات حالة التعديل والـ Modal
let editCustomer = null;
let editIndex = null;
let currentPayCustomerName = null; // للاحتفاظ باسم العميل الحالي أثناء الدفع

// دالة مساعدة للحصول على التاريخ الحالي بصيغة تفهمها خانة الـ date
function getLocalISOString() {
  const tzoffset = new Date().getTimezoneOffset() * 60000; // فرق التوقيت بالملي ثانية
  return new Date(Date.now() - tzoffset).toISOString().slice(0, 10); // YYYY-MM-DD تم التعديل لتجلب التاريخ فقط
}

// دالة ذكية لإصلاح وترقية البيانات القديمة في LocalStorage إن وجدت
function formalizeDataStore() {
  let updated = false;
  for (const key in dataStore) {
    if (Array.isArray(dataStore[key])) {
      let randomCode = Math.floor(1000 + Math.random() * 9000).toString();
      dataStore[key] = {
        code: randomCode,
        invoices: dataStore[key],
      };
      updated = true;
    }
  }
  if (updated) {
    localStorage.setItem("invoiceDataStore", JSON.stringify(dataStore));
  }
}
formalizeDataStore();

// دالة عرض ورسم الجداول بالـ Bootstrap مع إضافة سطر المجاميع وحساب رصيد الحركة المفردة
// دالة عرض ورسم الجداول بالـ Bootstrap مع إضافة سطر المجاميع وسطر "حركات اليوم / آخر تاريخ"
// دالة عرض ورسم الجداول بالـ Bootstrap مع إضافة (لوحة يومية النظام العامة) وسطور المجاميع
function renderTables() {
  const container = document.getElementById("customersContainer");
  container.innerHTML = "";

  if (Object.keys(dataStore).length === 0) {
    container.innerHTML = `<div class="col-12 text-center text-muted my-5">لا توجد فواتير مسجلة حالياً. ابدأ بإضافة حركة جديدة فوق!</div>`;
    return;
  }

  let cardCounter = 0;
  // جلب تاريخ اليوم المنسق للمقارنة الصحيحة
  const todayFormatted = formatCustomDate(getLocalISOString());

  // ==========================================
  // 1️⃣ حساب إجمالي حركات اليوم للنظام بالكامل (اليومية العامة)
  // ==========================================
  let globalTodayTaken = 0;
  let globalTodayPaid = 0;
  let globalTodayOperations = 0;

  for (const name in dataStore) {
    if (dataStore[name].invoices) {
      dataStore[name].invoices.forEach((invoice) => {
        let invoiceDate =
          invoice.date ||
          new Date().toLocaleDateString("ar-EG", {
            weekday: "long",
            year: "numeric",
            month: "numeric",
            day: "numeric",
          });

        // إذا كانت الحركة تخص اليوم الحالي، نجمعها في اليومية العامة
        if (invoiceDate === todayFormatted) {
          let qty = Number(invoice.qty) || 0;
          let price = Number(invoice.price) || Number(invoice.taken) || 0;
          globalTodayTaken += qty * price;
          globalTodayPaid += Number(invoice.paid || 0);
          globalTodayOperations++;
        }
      });
    }
  }

  // ==========================================
  // 2️⃣ رسم كارت إجمالي حركات اليوم (اليومية العامة) في أعلى الحسابات
  // ==========================================
  let globalDashboardHtml = `
    <div class="col-12 mb-4">
      <div class="card border-0 shadow-sm text-white rounded-3" style="background: linear-gradient(135deg, #1e3a8a, #3b82f6);">
        <div class="card-body p-4">
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h4 class="mb-1 fw-bold fs-5">📊 تقرير حركات اليومية العام</h4>
              <p class="mb-0 small text-white-50">تاريخ اليوم: ${todayFormatted} | عدد عمليات اليوم: (${globalTodayOperations})</p>
            </div>
            <div class="d-flex gap-3 flex-wrap">
              <div class="bg-white bg-opacity-10 px-3 py-2 rounded border border-white border-opacity-10 text-center">
                <small class="d-block text-white-50" style="font-size: 0.75rem;">إجمالي مبيعات اليوم (البضاعة)</small>
                <b class="fs-5">${globalTodayTaken} ج.م</b>
              </div>
              <div class="bg-white bg-opacity-10 px-3 py-2 rounded border border-white border-opacity-10 text-center">
                <small class="d-block text-white-50" style="font-size: 0.75rem;">إجمالي التحصيلات (الخزنة دخلها)</small>
                <b class="fs-5 text-warning">${globalTodayPaid} ج.م</b>
              </div>
              <div class="bg-white bg-opacity-10 px-3 py-2 rounded border border-white border-opacity-10 text-center">
                <small class="d-block text-white-50" style="font-size: 0.75rem;">صافي حركة اليوم</small>
                <b class="fs-5">${globalTodayTaken - globalTodayPaid} ج.م</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // إضافة كارت اليومية أول شيء في الحاوية
  container.innerHTML += globalDashboardHtml;

  // ==========================================
  // 3️⃣ بناء الجداول الفردية للعملاء كالمعتاد
  // ==========================================
  for (const customerName in dataStore) {
    cardCounter++;
    const customerData = dataStore[customerName];
    const customerCode = customerData.code || "---";
    const currentCardId = `customer_card_${cardCounter}`;

    let rowsHtml = "";
    let totalTaken = 0;
    let totalPaid = 0;
    let uniqueDates = [];

    customerData.invoices.forEach((invoice, index) => {
      let qty = Number(invoice.qty) || 0;
      let price = Number(invoice.price) || Number(invoice.taken) || 0;
      let calculatedTaken = qty * price;
      let rowPaid = Number(invoice.paid || 0);

      let invoiceDate =
        invoice.date ||
        new Date().toLocaleDateString("ar-EG", {
          weekday: "long",
          year: "numeric",
          month: "numeric",
          day: "numeric",
        });

      if (!uniqueDates.includes(invoiceDate)) {
        uniqueDates.push(invoiceDate);
      }

      totalTaken += calculatedTaken;
      totalPaid += rowPaid;

      // سداد دفعة نقدية فقط
      if (calculatedTaken === 0 && rowPaid > 0) {
        rowsHtml += `
            <tr class="table-move table-success-subtle">
                <td colspan="4" class="text-start ps-4 py-2">
                    <span class="badge bg-success fw-bold me-2">${invoiceDate}</span>
                    <strong class="text-success">💵 تم سداد دفعة نقدية من الحساب</strong>
                </td>
                <td class="text-muted fw-semibold">-</td>
                <td class="text-success fw-bold fs-5 py-2">${rowPaid} ج.م</td>
                <td class="text-success fw-bold py-2">دفعة ↓</td>
                <td class="action-column">
                    <div class="d-flex gap-1 justify-content-center">
                        <button onclick="editRow('${customerName}', ${index})" class="btn btn-sm btn-outline-warning py-0 px-2 text-dark" title="تعديل">✏️</button>
                        <button onclick="deleteRow('${customerName}', ${index})" class="btn btn-sm btn-outline-danger py-0 px-2" title="حذف">×</button>
                    </div>
                </td>
            </tr>
        `;
      } else {
        // حركة بيع عادية
        let currentBalance = calculatedTaken - rowPaid;
        let balanceColor =
          currentBalance > 0
            ? "text-danger fw-bold"
            : currentBalance < 0
              ? "text-success fw-bold"
              : "text-muted";
        let balanceText =
          currentBalance > 0
            ? `${currentBalance} ج.m`
            : currentBalance < 0
              ? `${Math.abs(currentBalance)} ج.م (زيادة)`
              : "خ خالص ✨";

        rowsHtml += `
            <tr class="table-move">
                <td><small class="badge bg-light text-dark border fw-bold px-2 py-1">${invoiceDate}</small></td>
                <td>${invoice.item}</td>
                <td>${qty}</td>
                <td>${price > 0 ? price + " ج.م" : "-"}</td>
                <td class="text-danger fw-semibold">${calculatedTaken > 0 ? calculatedTaken + " ج.م" : "-"}</td>
                <td class="text-success fw-bold">${rowPaid > 0 ? rowPaid + " ج.م" : "-"}</td>
                <td class="${balanceColor}">${balanceText}</td>
                <td class="action-column">
                    <div class="d-flex gap-1 justify-content-center">
                        <button onclick="editRow('${customerName}', ${index})" class="btn btn-sm btn-outline-warning py-0 px-2 text-dark" title="تعديل">✏️</button>
                        <button onclick="deleteRow('${customerName}', ${index})" class="btn btn-sm btn-outline-danger py-0 px-2" title="حذف">×</button>
                    </div>
                </td>
            </tr>
        `;
      }
    });

    // حساب مجموع حركات هذا العميل لليوم الحالي (أو لآخر تاريخ مسجل عنده)
    let targetDate = todayFormatted;
    let dateLabel = "حركات الـيـوم:";

    if (!uniqueDates.includes(todayFormatted) && uniqueDates.length > 0) {
      targetDate = uniqueDates[uniqueDates.length - 1];
      dateLabel = `حركات آخر تاريخ (${targetDate}):`;
    }

    let dailyTaken = 0;
    let dailyPaid = 0;

    customerData.invoices.forEach((invoice) => {
      let invoiceDate =
        invoice.date ||
        new Date().toLocaleDateString("ar-EG", {
          weekday: "long",
          year: "numeric",
          month: "numeric",
          day: "numeric",
        });
      if (invoiceDate === targetDate) {
        let qty = Number(invoice.qty) || 0;
        let price = Number(invoice.price) || Number(invoice.taken) || 0;
        dailyTaken += qty * price;
        dailyPaid += Number(invoice.paid || 0);
      }
    });

    let dailyBalance = dailyTaken - dailyPaid;
    let dailyBalanceText =
      dailyBalance > 0
        ? `${dailyBalance} ج.م (مطلوب)`
        : dailyBalance < 0
          ? `${Math.abs(dailyBalance)} ج.م (زيادة)`
          : "متوازن 🤝";
    let dailyBalanceColor =
      dailyBalance > 0
        ? "text-danger"
        : dailyBalance < 0
          ? "text-success"
          : "text-muted";

    let finalBalance = totalTaken - totalPaid;
    let badgeClass =
      finalBalance > 0
        ? "bg-danger-subtle text-danger border-danger"
        : finalBalance < 0
          ? "bg-success-subtle text-success border-success"
          : "bg-light text-secondary border-secondary";
    let finalBalanceText =
      finalBalance > 0
        ? `متبقي عليه: ${finalBalance} ج.م`
        : finalBalance < 0
          ? `ليه طرفنا: ${Math.abs(finalBalance)} ج.م`
          : "الحساب خالص ✨";

    let finalRowBalanceColor =
      finalBalance > 0
        ? "table-danger text-danger fw-bold"
        : finalBalance < 0
          ? "table-success text-success fw-bold"
          : "text-muted fw-bold";
    let finalRowBalanceText =
      finalBalance > 0
        ? `${finalBalance} (عليه)`
        : finalBalance < 0
          ? `${Math.abs(finalBalance)} (ليه)`
          : "خالص";

    const colDiv = document.createElement("div");
    colDiv.className = "col-12 customer-card";
    colDiv.setAttribute("data-name", customerName.toLowerCase());
    colDiv.setAttribute("data-code", customerCode.toLowerCase());

    colDiv.innerHTML = `
        <div id="${currentCardId}" class="card invoice-card rounded-3 bg-white shadow-sm border mb-3 p-2">
            <div class="card-header bg-white d-flex justify-content-between align-items-center py-3 border-bottom flex-wrap gap-2">
                <div class="d-flex align-items-center gap-3 flex-wrap">
                    <h5 class="mb-0 text-dark fw-bold">👤 [${customerCode}] - ${customerName}</h5>
                    <button onclick="quickAdd('${customerName}', '${customerCode}')" class="btn btn-sm btn-outline-primary py-1 px-2 rounded-pill fw-semibold" style="font-size: 0.8rem;">+ حركة جديدة</button>
                    <button onclick="openQuickPayModal('${customerName}')" class="btn btn-sm btn-success py-1 px-2 rounded-pill fw-semibold text-white fs-7" style="font-size: 0.8rem;">💵 دفع دفعة مالية</button>
                    <button onclick="captureScreenshot('${currentCardId}', '${customerName}')" class="btn btn-sm btn-success py-1 px-3 rounded-pill fw-bold dynamic-screenshot-btn" style="font-size: 0.8rem;">📸 حفظ كصورة كاملة</button>
                </div>
                <span class="badge border px-3 py-2 rounded-pill ${badgeClass}">${finalBalanceText}</span>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0 text-center align-middle">
                        <thead class="table-light">
                            <tr>
                                <th>تاريخ وميعاد الحركة</th>
                                <th>البيان / الصنف</th>
                                <th>الكمية</th>
                                <th>سعر القطعة</th>
                                <th>إجمالي السعر</th>
                                <th class="table-success text-success">المدفوع (واصل)</th>
                                <th class="table-danger text-danger">باقي الحركة</th>
                                <th style="width: 90px;" class="action-column">إجراء</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                        <tfoot class="table-light border-top text-center fw-bold">
                            <!-- مجموع حركات اليوم / أو آخر تاريخ للعميل الحالي -->
                            <tr class="align-middle table-warning-subtle text-dark" style="background-color: #fffbeb;">
                                <td colspan="4" class="text-warning-emphasis py-2 text-end pe-4" style="font-size: 0.85rem;">${dateLabel}</td>
                                <td class="text-danger py-2">${dailyTaken > 0 ? dailyTaken + " ج.م" : "-"}</td>
                                <td class="text-success py-2">${dailyPaid > 0 ? dailyPaid + " ج.م" : "-"}</td>
                                <td class="${dailyBalanceColor} py-2">${dailyBalanceText}</td>
                                <td class="action-column"></td>
                            </tr>
                            <!-- المجموع الكلي الثابت للعميل -->
                            <tr class="align-middle border-top">
                                <td colspan="4" class="text-secondary py-3 text-end pe-4">المجموع الـكـلـي:</td>
                                <td class="text-danger text-decoration-underline py-3">${totalTaken} ج.م</td>
                                <td class="text-success text-decoration-underline py-3">${totalPaid} ج.م</td>
                                <td class="${finalRowBalanceColor} py-3">${finalRowBalanceText}</td>
                                <td class="action-column"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div class="card-footer bg-white border-top-0 pt-3 pb-2 text-center footer-signature-area">
                <div class="d-flex align-items-center justify-content-center gap-4 flex-wrap">
                    <div class="text-center text-sm-end">
                        <h6 class="fw-bold text-dark mb-1" style="font-size: 0.9rem;">إدارة / مصطفى موسى</h6>
                        <p class="text-primary fw-bold mb-0" style="font-size: 0.85rem; direction: ltr;">01288382254</p>
                    </div>
                    <div class="d-flex align-items-center gap-3">
                        <div class="vr opacity-25 d-none d-sm-block" style="height: 45px;"></div>
                        <div class="bg-white p-1 rounded border shadow-sm mx-2">
                            <img src="./image/مصطفي موسي.png" alt="شعار مصطفى موسى" class="img-fluid" style="max-height: 45px; object-fit: contain;">
                        </div>
                        <div class="vr opacity-25 d-none d-sm-block" style="height: 45px;"></div>
                    </div>
                    <div class="text-center text-sm-start">
                        <h6 class="fw-bold text-dark mb-1" style="font-size: 0.9rem;">إدارة / محمد عطا</h6>
                        <p class="text-primary fw-bold mb-0" style="font-size: 0.85rem; direction: ltr;">01113879699</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    container.appendChild(colDiv);
  }
}

// دالة فتح الفورم المخفي (النافذة المنبثقة) لتسجيل الدفع
function openQuickPayModal(customerName) {
  currentPayCustomerName = customerName;
  document.getElementById("modalCustomerName").value = customerName;
  document.getElementById("modalPaidAmount").value = "";

  // تشغيل المودال الخاص بـ Bootstrap
  let payModal = new bootstrap.Modal(document.getElementById("quickPayModal"));
  payModal.show();

  // تركيز المؤشر داخل خانة المبلغ مباشرة
  setTimeout(() => {
    document.getElementById("modalPaidAmount").focus();
  }, 500);
}

// دالة تأكيد وحفظ الدفعة النقدية من الفورم المخفي (محدثة لدعم التعديل اللاحق للتاريخ)
function submitQuickPay() {
  const amount = Number(document.getElementById("modalPaidAmount").value) || 0;
  if (amount <= 0) {
    alert("برجاء إدخال مبلغ صحيح أكبر من الصفر!");
    return;
  }

  // توليد التاريخ والوقت الحالي بصيغة الـ ISO والـ الصيغة العربي المنسقة
  const nowStr = getLocalISOString();
  const currentDateTime = formatCustomDate(nowStr);

  // إضافة حركة الدفع المباشرة للعميل
  if (dataStore[currentPayCustomerName]) {
    dataStore[currentPayCustomerName].invoices.push({
      date: currentDateTime,
      rawDate: nowStr, // حفظ التاريخ الخام لتسهيل تعديله لاحقاً
      item: "سداد دفعة نقدية",
      qty: 0,
      price: 0,
      taken: 0,
      paid: amount,
    });

    localStorage.setItem("invoiceDataStore", JSON.stringify(dataStore));
    renderTables();

    // إغلاق النافذة المنبثقة بعد النجاح
    let myModalEl = document.getElementById("quickPayModal");
    let modal = bootstrap.Modal.getInstance(myModalEl);
    modal.hide();
  }
}

// دالة تحويل التاريخ للتنسيق العربي الأنيق المعتاد في برنامجك (تاريخ فقط)
function formatCustomDate(inputDateTime) {
  let dateObj = inputDateTime ? new Date(inputDateTime) : new Date();

  return dateObj.toLocaleString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

// دالة إضافة الفاتورة أو تحديثها (محدثة بالكامل لدعم تصفير وإعادة تهيئة نوع الحقل لـ text)
function addInvoice(event) {
  event.preventDefault();

  const code = document.getElementById("clientCode").value.trim();
  const name = document.getElementById("clientName").value.trim();
  const item = document.getElementById("itemName").value.trim();
  const qty = Number(document.getElementById("itemQty").value) || 0;
  const price = Number(document.getElementById("unitPrice").value) || 0;
  const paid = Number(document.getElementById("paidAmount").value) || 0;
  const customDateValue = document.getElementById("invoiceCustomDate").value;

  if (!name || !code || !item) return;

  const taken = qty * price;

  if (editCustomer !== null && editIndex !== null) {
    // [حالة التعديل]
    const oldDate = dataStore[editCustomer].invoices[editIndex].date;
    const oldRawDate = dataStore[editCustomer].invoices[editIndex].rawDate;

    // إذا اختار الأدمن تاريخ جديد نغيره، وإلا نحتفظ بالتاريخ والوقت القديمين
    const finalDate = customDateValue
      ? formatCustomDate(customDateValue)
      : oldDate;
    const finalRawDate = customDateValue ? customDateValue : oldRawDate;

    dataStore[editCustomer].code = code;
    dataStore[editCustomer].invoices[editIndex] = {
      date: finalDate,
      rawDate: finalRawDate, // تحديث أو حفظ التاريخ الخام
      item,
      qty,
      price,
      taken,
      paid,
    };

    editCustomer = null;
    editIndex = null;
    const submitBtn = document.getElementById("submitBtn");
    submitBtn.innerHTML = "+ حفظ الحركة";
    submitBtn.className = "btn btn-primary btn-sm w-100 font-weight-bold";
    document.getElementById("cancelEditBtn").classList.add("d-none");
  } else {
    // [حالة حركة جديدة]
    const finalDate = customDateValue
      ? formatCustomDate(customDateValue)
      : formatCustomDate(getLocalISOString());
    const finalRawDate = customDateValue || getLocalISOString(); // إذا لم يحدد تاريخ يدوي نأخذ اللحظة الحالية

    if (!dataStore[name]) {
      dataStore[name] = { code: code, invoices: [] };
    }
    dataStore[name].code = code;
    dataStore[name].invoices.push({
      date: finalDate,
      rawDate: finalRawDate, // تخزين التاريخ الخام للحركات الجديدة
      item,
      qty,
      price,
      taken,
      paid,
    });
  }

  localStorage.setItem("invoiceDataStore", JSON.stringify(dataStore));
  renderTables();

  // تصفير وإعادة ضبط الفورم بالكامل وخاصة خانة التاريخ
  document.getElementById("invoiceForm").reset();
  document.getElementById("itemQty").value = 1;

  const dateInput = document.getElementById("invoiceCustomDate");
  dateInput.type = "text"; // إرجاع النوع لنص حتى لا يظهر ميعاد تلقائي فارغ
  dateInput.value = "";
}

function autoFillCustomerByCode() {
  const codeInput = document.getElementById("clientCode").value.trim();
  for (const name in dataStore) {
    if (dataStore[name].code === codeInput) {
      document.getElementById("clientName").value = name;
      return;
    }
  }
}

// دالة الربط التلقائي بالاسم
function autoFillCustomerByName() {
  const nameInput = document.getElementById("clientName").value.trim();
  if (dataStore[nameInput]) {
    document.getElementById("clientCode").value = dataStore[nameInput].code;
  }
}

// دالة زر التعديل ✏️ (محدثة لملء خانة التاريخ تلقائياً بالتاريخ المختار مسبقاً)
function editRow(customerName, index) {
  const record = dataStore[customerName].invoices[index];

  document.getElementById("clientCode").value = dataStore[customerName].code;
  document.getElementById("clientName").value = customerName;
  document.getElementById("itemName").value = record.item;
  document.getElementById("itemQty").value = record.qty || 0;
  document.getElementById("unitPrice").value = record.price || "";
  document.getElementById("paidAmount").value = record.paid || "";

  if (record.rawDate) {
    const dateInput = document.getElementById("invoiceCustomDate");
    dateInput.type = "date"; // تحويل النوع إلى تاريخ ليقرأ القيمة المرجعة بشكل صحيح
    dateInput.value = record.rawDate;
  } else {
    document.getElementById("invoiceCustomDate").type = "text";
    document.getElementById("invoiceCustomDate").value = "";
  }

  editCustomer = customerName;
  editIndex = index;

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.innerHTML = "💾 تحديث الحركة الحالية";
  submitBtn.className =
    "btn btn-warning btn-sm w-100 font-weight-bold text-dark";
  document.getElementById("cancelEditBtn").classList.remove("d-none");

  document.getElementById("invoiceForm").scrollIntoView({ behavior: "smooth" });
}

// دالة إلغاء التعديل وتصفير الحقول (محدثة لتهيئة خانة التاريخ وإخفاء الـ placeholder المزعج)
function cancelEdit() {
  editCustomer = null;
  editIndex = null;
  document.getElementById("invoiceForm").reset();
  document.getElementById("itemQty").value = 1;

  const dateInput = document.getElementById("invoiceCustomDate");
  dateInput.type = "text"; // إرجاع النوع لنص ليبقى المودال والتيبل منسقين
  dateInput.value = "";

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.innerHTML = "+ حفظ الحركة";
  submitBtn.className = "btn btn-primary btn-sm w-100 font-weight-bold";
  document.getElementById("cancelEditBtn").classList.add("d-none");
}

function quickAdd(customerName, customerCode) {
  cancelEdit();
  document.getElementById("clientCode").value = customerCode;
  document.getElementById("clientName").value = customerName;
  document.getElementById("itemName").focus();
  document.getElementById("invoiceForm").scrollIntoView({ behavior: "smooth" });
}

function deleteRow(customerName, index) {
  if (confirm("هل أنت متأكد من حذف هذه الحركة؟")) {
    dataStore[customerName].invoices.splice(index, 1);

    if (dataStore[customerName].invoices.length === 0) {
      delete dataStore[customerName];
    }

    localStorage.setItem("invoiceDataStore", JSON.stringify(dataStore));
    renderTables();
  }
}

function filterCustomers() {
  const searchText = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim();
  const cards = document.querySelectorAll(".customer-card");

  cards.forEach((card) => {
    const name = card.getAttribute("data-name");
    const code = card.getAttribute("data-code");

    if (name.includes(searchText) || code.includes(searchText)) {
      card.classList.remove("d-none");
    } else {
      card.classList.add("d-none");
    }
  });
}

function exportBackup() {
  if (Object.keys(dataStore).length === 0) {
    alert("لا توجد فواتير أو بيانات حالياً لتصديرها!");
    return;
  }

  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(dataStore, null, 2));
  const downloadAnchor = document.createElement("a");

  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `ترجيع_بيانات.json`);

  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function triggerImport() {
  document.getElementById("importFile").click();
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const importedData = JSON.parse(e.target.result);

      if (typeof importedData === "object" && importedData !== null) {
        if (
          confirm(
            "🚨 تحذير: استعادة هذه النسخة سيقوم بمسح البيانات الحالية على هذا المتصفح واستبدالها بالكامل بالملف الجديد. هل تود الاستمرار؟",
          )
        ) {
          dataStore = importedData;
          localStorage.setItem("invoiceDataStore", JSON.stringify(dataStore));

          formalizeDataStore();
          renderTables();
          alert("🎉 تم استعادة البيانات بنجاح وعرض كل فواتير العملاء الحالية!");
        }
      } else {
        alert("خطأ: محتوى الملف غير مدعوم أو تالف.");
      }
    } catch (error) {
      alert(
        "حدث خطأ أثناء قراءة الملف، تأكد من اختيار ملف نسخة احتياطية (.json) صحيح.",
      );
    }
  };

  reader.readAsText(file);
  event.target.value = "";
}
async function captureScreenshot(cardId, customerName) {
  const element = document.getElementById(cardId);
  if (!element) return;

  // 1️⃣ خيارات الجودة العالية لمنع البكسلة تماماً
  const options = {
    scale: 3, // جودة HD حادة جداً
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
  };

  // 2️⃣ جلب جميع السطور الفردية من الـ tbody
  const allRows = Array.from(element.querySelectorAll("tbody tr"));
  const chunkSize = 10; // عدد السطور في كل صورة

  // تاريخ اليوم لتسمية الملفات
  const today = new Date().toLocaleDateString("ar-EG").replace(/\//g, "-");

  // دالة مساعدة لالتقاط الصورة وتحميلها (أصبحت منفصلة لتكرارها)
  async function saveCanvas(targetElement, fileName) {
    // إخفاء أزرار التحكم والأكشن مؤقتاً في النسخة الحالية
    const actionElements = targetElement.querySelectorAll(".action-column, button, .dynamic-screenshot-btn");
    actionElements.forEach((el) => (el.style.visibility = "hidden"));

    try {
      const canvas = await html2canvas(targetElement, options);
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = fileName;
      link.click();
    } catch (err) {
      console.error("حدث خطأ أثناء التقاط الصورة:", err);
    } finally {
      // إعادة إظهار الأزرار
      actionElements.forEach((el) => (el.style.visibility = "visible"));
    }
  }

  // 3️⃣ التحقق: لو الحساب صغير (10 سطور أو أقل) يصوره مرة واحدة علطول
  if (allRows.length <= chunkSize) {
    await saveCanvas(element, `كشف_حساب_${customerName}_${today}.png`);
    return;
  }

  // 4️⃣ لو السطور أكتر من 10، هيبدأ التقسيم السحري هنا
  const totalParts = Math.ceil(allRows.length / chunkSize);

  for (let i = 0; i < totalParts; i++) {
    const startRow = i * chunkSize;
    const endRow = startRow + chunkSize;
    const chunkRows = allRows.slice(startRow, endRow);

    // إنشاء نسخة طبق الأصل من الكارت في الخلفية (Clone)
    const cloneCard = element.cloneNode(true);

    // ضبط استايل النسخة عشان تترسم صح في الخلفية من غير ما تظهر وتلغبط الشاشة
    cloneCard.style.position = "absolute";
    cloneCard.style.top = "0";
    cloneCard.style.left = "-9999px";
    cloneCard.style.width = element.offsetWidth + "px"; // الحفاظ على نفس العرض المتناسق
    document.body.appendChild(cloneCard);

    // تنظيف جدول النسخة ووضع الـ 10 سطور الخاصة بالجزء الحالي فقط
    const cloneTbody = cloneCard.querySelector("tbody");
    cloneTbody.innerHTML = "";
    chunkRows.forEach((row) => {
      cloneTbody.appendChild(row.cloneNode(true));
    });

    // إضافة ترقيم الصفحات في الهيدر عشان العميل يعرف (جزء 1 من 3 مثلاً)
    const headerTitle = cloneCard.querySelector(".card-header h5");
    if (headerTitle) {
      headerTitle.innerHTML += ` <span class="badge bg-secondary ms-2 fs-7" style="font-size:0.75rem;">جزء ${i + 1} من ${totalParts}</span>`;
    }

    // تصوير الجزء الحالي وتحميله تلقائياً
    await saveCanvas(cloneCard, `كشف_حساب_${customerName}_جزء_${i + 1}_من_${totalParts}_${today}.png`);

    // مسح النسخة الوهمية من الـ DOM لتخفيف الذاكرة
    cloneCard.remove();
  }
}
// التشغيل الافتراضي عند فتح الصفحة
renderTables();
