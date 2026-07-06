// سحب البيانات من الـ LocalStorage
let dataStore = JSON.parse(localStorage.getItem("invoiceDataStore")) || {};

// متغيرات حالة التعديل والـ Modal
let editCustomer = null;
let editIndex = null;
let currentPayCustomerName = null; // للاحتفاظ باسم العميل الحالي أثناء الدفع

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
function renderTables() {
  const container = document.getElementById("customersContainer");
  container.innerHTML = "";

  if (Object.keys(dataStore).length === 0) {
    container.innerHTML = `<div class="col-12 text-center text-muted my-5">لا توجد فواتير مسجلة حالياً. ابدأ بإضافة حركة جديدة فوق!</div>`;
    return;
  }

  let cardCounter = 0;

  for (const customerName in dataStore) {
    cardCounter++;
    const customerData = dataStore[customerName];
    const customerCode = customerData.code || "---";
    const currentCardId = `customer_card_${cardCounter}`;

    let rowsHtml = "";
    let totalTaken = 0;
    let totalPaid = 0;

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

      totalTaken += calculatedTaken;
      totalPaid += rowPaid;

      // فحص إذا كانت الحركة عبارة عن دفعة سداد فقط (بدون صنف أو كمية)
      if (calculatedTaken === 0 && rowPaid > 0) {
        rowsHtml += `
            <tr class="table-success-subtle">
                <td colspan="4" class="text-start ps-4 py-2 ">
                    <span class="badge bg-success fw-bold me-2">${invoiceDate}</span>
                    <strong class="text-success">💵 تم سداد دفعة نقدية من الحساب</strong>
                </td>
                <td class="text-muted fw-semibold">-</td>
                <td class="text-success fw-bold fs-5 py-2">${rowPaid} ج.م</td>
                <td class="text-success fw-bold py-2">دفعة ↓</td>
                <td>
                    <div class="d-flex gap-1 justify-content-center">
                        <button onclick="editRow('${customerName}', ${index})" class="btn btn-sm btn-outline-warning py-0 px-2 text-dark" title="تعديل">✏️</button>
                        <button onclick="deleteRow('${customerName}', ${index})" class="btn btn-sm btn-outline-danger py-0 px-2" title="حذف">×</button>
                    </div>
                </td>
            </tr>
        `;
      } else {
        let currentBalance = calculatedTaken - rowPaid;
        let balanceColor =
          currentBalance > 0
            ? "text-danger fw-bold"
            : currentBalance < 0
              ? "text-success fw-bold"
              : "text-muted";
        let balanceText =
          currentBalance > 0
            ? `${currentBalance} ج.م`
            : currentBalance < 0
              ? `${Math.abs(currentBalance)} ج.م (زيادة)`
              : "خ خالص ✨";

        rowsHtml += `
            <tr>
                <td><small class="badge bg-light text-dark border fw-bold px-2 py-1">${invoiceDate}</small></td>
                <td>${invoice.item}</td>
                <td>${qty}</td>
                <td>${price > 0 ? price + " ج.م" : "-"}</td>
                <td class="text-danger fw-semibold">${calculatedTaken > 0 ? calculatedTaken + " ج.م" : "-"}</td>
                <td class="text-success fw-bold">${rowPaid > 0 ? rowPaid + " ج.م" : "-"}</td>
                <td class="${balanceColor}">${balanceText}</td>
                <td>
                    <div class="d-flex gap-1 justify-content-center">
                        <button onclick="editRow('${customerName}', ${index})" class="btn btn-sm btn-outline-warning py-0 px-2 text-dark" title="تعديل">✏️</button>
                        <button onclick="deleteRow('${customerName}', ${index})" class="btn btn-sm btn-outline-danger py-0 px-2" title="حذف">×</button>
                    </div>
                </td>
            </tr>
        `;
      }
    });

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
                    <button onclick="captureScreenshot('${currentCardId}', '${customerName}')" class="btn btn-sm btn-success py-1 px-3 rounded-pill fw-bold dynamic-screenshot-btn" style="font-size: 0.8rem;">
                        📸 حفظ كصورة كاملة
                    </button>
                </div>
                <span class="badge border px-3 py-2 rounded-pill ${badgeClass}">
                    ${finalBalanceText}
                </span>
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
                            <tr class="align-middle">
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
        
        <!-- الإدارة الأولى -->
        <div class="text-center text-sm-end">
            <h6 class="fw-bold text-dark mb-1" style="font-size: 0.9rem;">إدارة / مصطفى موسى</h6>
            <p class="text-primary fw-bold mb-0" style="font-size: 0.85rem; direction: ltr;">
                01288382254 
            </p>
        </div>

        <!-- الفاصل واللوجو في المنتصف -->
        <div class="d-flex align-items-center gap-3">
            <div class="vr opacity-25 d-none d-sm-block" style="height: 45px;"></div>
            <div class="bg-white p-1 rounded border shadow-sm mx-2">
                <img src="./image/مصطفي موسي.png" alt="شعار مصطفى موسى" class="img-fluid" style="max-height: 45px; object-fit: contain;">
            </div>
            <div class="vr opacity-25 d-none d-sm-block" style="height: 45px;"></div>
        </div>

        <!-- الإدارة الثانية -->
        <div class="text-center text-sm-start">
            <h6 class="fw-bold text-dark mb-1" style="font-size: 0.9rem;">إدارة / محمد عطا</h6>
            <p class="text-primary fw-bold mb-0" style="font-size: 0.85rem; direction: ltr;">
                01113879699 
            </p>
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

// دالة تأكيد وحفظ الدفعة النقدية من الفورم المخفي
function submitQuickPay() {
  const amount = Number(document.getElementById("modalPaidAmount").value) || 0;
  if (amount <= 0) {
    alert("برجاء إدخال مبلغ صحيح أكبر من الصفر!");
    return;
  }

  // توليد تاريخ الدفع بدقة بالغة مع اسم اليوم والساعة والسابقة
  const currentDateTime = new Date().toLocaleString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // إضافة حركة الدفع المباشرة للعميل
  if (dataStore[currentPayCustomerName]) {
    dataStore[currentPayCustomerName].invoices.push({
      date: currentDateTime,
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

// دالة إضافة الفاتورة أو تحديثها العادية
function addInvoice(event) {
  event.preventDefault();

  const code = document.getElementById("clientCode").value.trim();
  const name = document.getElementById("clientName").value.trim();
  const item = document.getElementById("itemName").value.trim();
  const qty = Number(document.getElementById("itemQty").value) || 0;
  const price = Number(document.getElementById("unitPrice").value) || 0;
  const paid = Number(document.getElementById("paidAmount").value) || 0;

  if (!name || !code || !item) return;

  const taken = qty * price;

  const currentDateTime = new Date().toLocaleString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  if (editCustomer !== null && editIndex !== null) {
    const oldDate =
      dataStore[editCustomer].invoices[editIndex].date || currentDateTime;

    dataStore[editCustomer].code = code;
    dataStore[editCustomer].invoices[editIndex] = {
      date: oldDate,
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
    if (!dataStore[name]) {
      dataStore[name] = { code: code, invoices: [] };
    }
    dataStore[name].code = code;
    dataStore[name].invoices.push({
      date: currentDateTime,
      item,
      qty,
      price,
      taken,
      paid,
    });
  }

  localStorage.setItem("invoiceDataStore", JSON.stringify(dataStore));
  renderTables();
  document.getElementById("invoiceForm").reset();
  document.getElementById("itemQty").value = 1;
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

function editRow(customerName, index) {
  const record = dataStore[customerName].invoices[index];

  document.getElementById("clientCode").value = dataStore[customerName].code;
  document.getElementById("clientName").value = customerName;
  document.getElementById("itemName").value = record.item;
  document.getElementById("itemQty").value = record.qty || 0;
  document.getElementById("unitPrice").value = record.price || "";
  document.getElementById("paidAmount").value = record.paid || "";

  editCustomer = customerName;
  editIndex = index;

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.innerHTML = "💾 تحديث الحركة الحالية";
  submitBtn.className =
    "btn btn-warning btn-sm w-100 font-weight-bold text-dark";
  document.getElementById("cancelEditBtn").classList.remove("d-none");

  document.getElementById("invoiceForm").scrollIntoView({ behavior: "smooth" });
}

function cancelEdit() {
  editCustomer = null;
  editIndex = null;
  document.getElementById("invoiceForm").reset();
  document.getElementById("itemQty").value = 1;

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

function captureScreenshot(elementId, customerName) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const screenshotBtn = element.querySelector(".dynamic-screenshot-btn");
  const actionColumns = element.querySelectorAll(".action-column");

  if (screenshotBtn) screenshotBtn.style.visibility = "hidden";
  actionColumns.forEach((col) => (col.style.visibility = "hidden"));

  html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  })
    .then((canvas) => {
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");

      link.download = `فاتورة_العميل_${customerName}.png`;
      link.href = image;
      link.click();

      if (screenshotBtn) screenshotBtn.style.visibility = "visible";
      actionColumns.forEach((col) => (col.style.visibility = "visible"));
    })
    .catch((err) => {
      console.error("خطأ أثناء حفظ الصورة:", err);
      if (screenshotBtn) screenshotBtn.style.visibility = "visible";
      actionColumns.forEach((col) => (col.style.visibility = "visible"));
    });
}

// التشغيل الافتراضي عند فتح الصفحة
renderTables();
