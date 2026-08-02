// ⚠️ ضع هنا رابط تطبيق الويب (Web App URL) بعد التحديث الأخير
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbypNxrpZWpyIpgde0Lgz27BCc8j2tZLBUVYxHcLkSRynt38vm48NvNe4QD_WzUqh24/exec';
let currentUserRole = "";
let currentUserName = "";
let currentExtractedData = null; 
let imageBase64Data = "";
let allTransactionsData = []; // لحفظ البيانات للإكسل
// دالة الذكاء لتوحيد مسميات المعاملات (محدثة لتجاهل الهمزات والمسافات)
function normalizeTransactionType(text) {
    let originalText = String(text || "").trim();
    
    // توحيد الحروف (تحويل الهمزات إلى ألف عادية، والتاء المربوطة إلى هاء) لغرض الفحص فقط
    let t = originalText.replace(/أ|إ|آ/g, "ا").replace(/ة/g, "ه");

    if (t.includes("احاله") || t.includes("رعايه")) return "إحالة على الرعاية";
    if (t.includes("اعاده") || t.includes("قوه")) return "إعادة على القوة";
    if (t.includes("ترقيه") || t.includes("تسويه") || t.includes("تسويات")) return "ترقيات وتسويات";
    if (t.includes("ازدواج")) return "حالات الازدواج الوظيفي";
    if (t.includes("نقل") || t.includes("مواصله") || t.includes("بدل فاقد")) return "نقل ومواصلة";
    if (t.includes("استماره") || t.includes("جريح")) return "استمارة جريح";
    if (t.includes("مذكره")) return "مذكرات عامة";

    // إذا كان نوع المعاملة مختلفاً عما سبق، نعيده كما هو ولكن بدون مسافات زائدة
    return originalText; 
}
// الكود المصحح
function toggleMenu() {
    const navLinks = document.getElementById('nav-links');
    navLinks.classList.toggle('show');
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active-screen'));
    document.getElementById(screenId).classList.add('active-screen');
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active-tab'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active-tab');
    event.currentTarget.classList.add('active');
    
    document.getElementById('nav-links').classList.remove('show'); // إغلاق القائمة في الجوال
    
    if (tabId === 'stats-tab') loadStats();
    if (tabId === 'log-tab') loadTransactionLog(); // جلب السجل عند فتح التبويب
}

async function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');
    if (!user || !pass) return errorMsg.innerText = "يرجى إدخال البيانات.";
    
    errorMsg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحقق...';
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST', body: JSON.stringify({ action: 'login', username: user, password: pass }),
        });
        const result = await response.json();
        if (result.success) { 
            errorMsg.innerText = ""; 
            currentUserRole = result.role;
            currentUserName = result.name;
            applyPermissions(); // تطبيق الصلاحيات
            showScreen('app-section'); 
        } 
        else errorMsg.innerText = result.message;
    } catch (error) { errorMsg.innerText = "خطأ في الاتصال."; }
}

function logout() {
    document.getElementById('username').value = ''; document.getElementById('password').value = ''; showScreen('login-section');
}

function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('image-preview').src = e.target.result;
            document.getElementById('image-preview').style.display = 'block';
            imageBase64Data = e.target.result;
            document.getElementById('process-btn').style.display = 'block';
            document.getElementById('result-box').style.display = 'none';
            document.getElementById('edit-preview-section').style.display = 'none';
        }
        reader.readAsDataURL(file);
    }
}

async function processDocument() {
    if (!imageBase64Data) return alert("يرجى اختيار صورة.");
    document.getElementById('process-btn').style.display = 'none';
    document.getElementById('loading-spinner').style.display = 'block';

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST', body: JSON.stringify({ action: 'analyze_image', imageBase64: imageBase64Data }),
        });
        const result = await response.json();
        document.getElementById('loading-spinner').style.display = 'none';

        if (result.success) {
            currentExtractedData = result.data;
            renderEditForm(currentExtractedData);
        } else {
            alert("خطأ: " + result.message);
            document.getElementById('process-btn').style.display = 'block';
        }
    } catch (error) {
        alert("خطأ في الاتصال.");
        document.getElementById('process-btn').style.display = 'block';
    }
}

// 1. تحديث نموذج الإدخال ليشمل حقل الملاحظات
function renderEditForm(data) {
    const ind = (data.individuals && data.individuals[0]) ? data.individuals[0] : {};
    
    let html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <!-- الحقول الجديدة للإضافة اليدوية والمستخرجة حديثاً -->
            <div class="input-group" style="grid-column: span 2;">
                <input type="text" id="edit-phone" placeholder="رقم هاتف صاحب المعاملة (إدخال يدوي)" style="border-color: var(--accent-color);">
            </div>
            
            <!-- حقل الملاحظات الجديد -->
            <div class="input-group" style="grid-column: span 2;">
                <input type="text" id="edit-notes" placeholder="ملاحظات إضافية أو نواقص (اختياري)" style="border-color: var(--accent-color); background-color: #fff9e6;">
            </div>

            <div class="input-group"><input type="text" id="edit-extracted-date" value="${data.extracted_date || ''}" placeholder="تاريخ أسفل الورقة (إن وجد)"></div>
            <div class="input-group"><input type="text" id="edit-subject" value="${data.memo_subject || ''}" placeholder="موضوع المذكرة"></div>
            
            <!-- الحقول الأساسية الأصلية -->
            <div class="input-group"><input type="text" id="edit-trans-num" value="${data.transaction_number || ''}" placeholder="رقم المعاملة"></div>
            <div class="input-group"><input type="text" id="edit-date" value="${data.receipt_date || ''}" placeholder="تاريخ الاستلام"></div>
            
            <div class="input-group"><input type="text" id="edit-ben-count" value="${data.beneficiaries_count || ''}" placeholder="عدد المستفيدين"></div>
            <div class="input-group"><input type="text" id="edit-branch" value="${data.branch || ''}" placeholder="الفرع / الجهة"></div>
            
            <div class="input-group"><input type="text" id="edit-type" value="${data.transaction_type || ''}" placeholder="نوع المعاملة"></div>
            <div class="input-group"><input type="text" id="edit-source" value="${data.source || ''}" placeholder="المصدر"></div>
            
            <div class="input-group"><input type="text" id="edit-receiver" value="${data.receiver || ''}" placeholder="المستلم"></div>
            <div class="input-group"><input type="text" id="edit-deliverer" value="${data.deliverer || ''}" placeholder="المُسلّم"></div>
            
            <!-- بيانات الفرد -->
            <div class="input-group"><input type="text" id="edit-mil-num" value="${ind.military_number || ''}" placeholder="الرقم العسكري"></div>
            <div class="input-group"><input type="text" id="edit-rank" value="${ind.rank || ''}" placeholder="الرتبة"></div>
            
            <div class="input-group" style="grid-column: span 2;"><input type="text" id="edit-name" value="${ind.name || ''}" placeholder="الاسم"></div>
            
            <div class="input-group"><input type="text" id="edit-main-unit" value="${ind.main_unit || ''}" placeholder="الوحدة الرئيسية"></div>
            <div class="input-group"><input type="text" id="edit-sub-unit" value="${ind.sub_unit || ''}" placeholder="الوحدة الفرعية"></div>
        </div>
    `;
    document.getElementById('edit-fields').innerHTML = html;
    document.getElementById('edit-preview-section').style.display = 'block';
}

// 2. دالة حفظ البيانات الشاملة (مع الملاحظات)
async function saveEditedData() {
    document.getElementById('edit-preview-section').style.display = 'none';
    document.getElementById('loading-spinner').style.display = 'block';

    // تحديث الكائن بالبيانات الجديدة والملاحظات
    currentExtractedData.phoneNumber = document.getElementById('edit-phone').value;
    currentExtractedData.notes = document.getElementById('edit-notes').value; // جلب الملاحظة
    currentExtractedData.extracted_date = document.getElementById('edit-extracted-date').value;
    currentExtractedData.memo_subject = document.getElementById('edit-subject').value;

    // تحديث الكائن بالبيانات الأصلية
    currentExtractedData.transaction_number = document.getElementById('edit-trans-num').value;
    currentExtractedData.receipt_date = document.getElementById('edit-date').value;
    currentExtractedData.beneficiaries_count = document.getElementById('edit-ben-count').value;
    currentExtractedData.branch = document.getElementById('edit-branch').value;
    currentExtractedData.transaction_type = document.getElementById('edit-type').value;
    currentExtractedData.source = document.getElementById('edit-source').value;
    currentExtractedData.receiver = document.getElementById('edit-receiver').value;
    currentExtractedData.deliverer = document.getElementById('edit-deliverer').value;

    if(!currentExtractedData.individuals) currentExtractedData.individuals = [{}];
    currentExtractedData.individuals[0].military_number = document.getElementById('edit-mil-num').value;
    currentExtractedData.individuals[0].rank = document.getElementById('edit-rank').value;
    currentExtractedData.individuals[0].name = document.getElementById('edit-name').value;
    currentExtractedData.individuals[0].main_unit = document.getElementById('edit-main-unit').value;
    currentExtractedData.individuals[0].sub_unit = document.getElementById('edit-sub-unit').value;

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST', body: JSON.stringify({ action: 'save_record', data: currentExtractedData, imageBase64: imageBase64Data }),
        });
        const result = await response.json();
        document.getElementById('loading-spinner').style.display = 'none';

        if (result.success) {
            document.getElementById('result-box').style.display = 'block';
            document.getElementById('image-preview').style.display = 'none';
        } else {
            alert("خطأ أثناء الحفظ.");
            document.getElementById('edit-preview-section').style.display = 'block';
        }
    } catch (error) { 
        alert("حدث خطأ."); 
        document.getElementById('loading-spinner').style.display = 'none';
        document.getElementById('edit-preview-section').style.display = 'block';
    }
}

// بناء جدول السجل بالترتيب الشامل وتنظيف التواريخ
// متغيرات التحكم في الصفحات (توضع قبل الدالة لكي يتعرف عليها النظام)
let currentPage = 1;
const RECORDS_PER_PAGE = 20;

// 1. الدالة الأساسية (نفس اسم دالتك الأصلية للحفاظ على توافق النظام)
async function loadTransactionLog() {
    const logContainer = document.getElementById('log-results');
    
    // أ- جلب البيانات من الذاكرة المحلية (تضمن فتح السجل بأقل من ثانية)
    const cachedData = localStorage.getItem('militaryArchiveData');
    if (cachedData) {
        allTransactionsData = JSON.parse(cachedData);
        renderTablePage(currentPage); // رسم الجدول فوراً
    } else {
        logContainer.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري جلب السجل...';
    }

    // ب- المزامنة مع السيرفر في الخلفية لجلب أي معاملات جديدة
    try {
        const response = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'get_all' }) });
        const result = await response.json();
        
        if (result.success) {
            // تحديث الواجهة فقط إذا كان هناك بيانات جديدة لم يتم تخزينها بعد
            if (JSON.stringify(allTransactionsData) !== JSON.stringify(result.data)) {
                allTransactionsData = result.data; 
                localStorage.setItem('militaryArchiveData', JSON.stringify(allTransactionsData));
                renderTablePage(currentPage);
            }
        }
    } catch (e) { 
        if (!cachedData) {
            logContainer.innerHTML = 'خطأ في جلب السجل.'; 
        }
    }
}

// 2. دالة الرسم المساعدة (تحتوي على نفس الكود الخاص بك حرفياً لرسم الجدول مع إضافة ميزة العكس والتقسيم)
function renderTablePage(page, customData = null) {
    // جلب البيانات وعكس ترتيبها (.reverse()) لكي يظهر الأحدث أولاً
    const dataToRender = [...(customData || allTransactionsData)].reverse();
    
    if (!dataToRender || dataToRender.length === 0) {
        document.getElementById('log-results').innerHTML = '<p>لا توجد بيانات للعرض.</p>';
        return;
    }

    // حساب بداية ونهاية الـ 20 سجل
    const startIndex = (page - 1) * RECORDS_PER_PAGE;
    const endIndex = startIndex + RECORDS_PER_PAGE;
    const currentData = dataToRender.slice(startIndex, endIndex);
    const totalPages = Math.ceil(dataToRender.length / RECORDS_PER_PAGE);

    // نفس رأس الجدول الذي صممته أنت بدون أي تغيير
    let table = `<table class="report-table">
        <tr>
            <th>رقم المعاملة</th>
            <th>الرتبة</th>
            <th>الرقم العسكري</th>
            <th>الاسم</th>
            <th>الوحدة الرئيسية</th>
            <th>الوحدة الفرعية</th>
            <th>نوع المعاملة</th>
            <th>موضوع المذكرة</th>
            <th>رقم الهاتف</th>
            <th>المصدر</th>
            <th>المسلم</th>
            <th>المستلم</th>
            <th>الفرع</th>
            <th>عدد المستفيدين</th>
            <th>تاريخ الاستلام</th>
            <th style="color: #c5a059;">الملاحظات (العمود S)</th>
            <th style="color: #b33939;">النواقص (العمود U)</th>
            <th>الحالة</th>
            <th>إجراء</th>
        </tr>`;
    
    // بناء الصفوف للـ 20 معاملة
    currentData.forEach((row) => {
        // البحث عن الترتيب الأصلي في الشيت لضمان عمل أزرار التعديل والإتمام بدقة
        const originalIndex = allTransactionsData.indexOf(row);
        const rowIndex = originalIndex + 2; 
        const status = row[17] || "مستمرة"; 
        
        // تنظيف التاريخ بنفس طريقتك
        let cleanDate = row[1] || '-';
        if (typeof cleanDate === 'string' && cleanDate.includes('T')) {
            cleanDate = cleanDate.split('T')[0];
        }
        
        const statusBtn = status.includes("مستمرة") 
            ? `<button id="complete-btn-${rowIndex}" onclick="markCompleted(${rowIndex})" class="primary-btn" style="padding: 5px; background: #27ae60; font-size:12px; margin-bottom: 5px; width: 100%;">إتمام</button>` 
            : `<button class="secondary-btn" style="padding: 5px; background: #7f8c8d; color: white; border: none; font-size:12px; margin-bottom: 5px; width: 100%; cursor: default;" disabled><i class="fa-solid fa-check-double"></i> مكتمل</button>`;
        
        const editBtn = `<button onclick="openEditModal(${rowIndex})" class="secondary-btn" style="padding: 5px; background: #2980b9; color: white; border: none; border-radius: 4px; font-size:12px; width: 100%; margin-bottom: 5px;">تعديل</button>`;
        
        const docLink = row[13] ? `<a href="${row[13]}" target="_blank" class="secondary-btn" style="padding: 5px; background: #8e44ad; color: white; border: none; border-radius: 4px; font-size:12px; width: 100%; text-decoration:none; display:inline-block; text-align:center;">المستند</a>` : '-';

        table += `<tr>
            <td>${row[0] || '-'}</td>
            <td>${row[9] || '-'}</td>
            <td>${row[8] || '-'}</td>
            <td><strong>${row[10] || '-'}</strong></td>
            <td>${row[11] || '-'}</td>
            <td>${row[12] || '-'}</td>
            <td>${row[4] || '-'}</td>
            <td>${row[19] || '-'}</td>
            <td>${row[15] || '-'}</td>
            <td>${row[5] || '-'}</td>
            <td>${row[7] || '-'}</td>
            <td>${row[6] || '-'}</td>
            <td>${row[3] || '-'}</td>
            <td>${row[2] || '-'}</td>
            <td>${cleanDate}</td>
            <td style="background-color: #fff9e6;">${row[18] || '-'}</td>
            <td style="background-color: #ffeaea; color: #b33939;">${row[20] || '-'}</td>
            <td id="status-${rowIndex}" style="font-weight:bold;">${status}</td>
            <td style="min-width: 80px;">
                <div id="status-container-${rowIndex}">${statusBtn}</div>
                ${editBtn} 
                ${docLink}
            </td>
        </tr>`;
    });
    
    table += `</table>`;

    // 3. إضافة أزرار التنقل (عرض المزيد / السابق)
    let paginationHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding: 10px; background: #fff; border-radius: 6px;">
        <button onclick="changePage(-1)" class="secondary-btn" style="width: auto; padding: 8px 20px; background: #2b3a2f; color: white;" ${page === 1 ? 'disabled' : ''}><i class="fa-solid fa-arrow-right"></i> الأحدث</button>
        <span style="font-weight: bold; color: #2b3a2f;">صفحة ${page} من ${totalPages} (الإجمالي: ${dataToRender.length} معاملة)</span>
        <button onclick="changePage(1)" class="secondary-btn" style="width: auto; padding: 8px 20px; background: #2b3a2f; color: white;" ${page === totalPages || totalPages === 0 ? 'disabled' : ''}>الأقدم <i class="fa-solid fa-arrow-left"></i></button>
    </div>`;

    document.getElementById('log-results').innerHTML = table + paginationHTML;
}

// 4. دالة التنقل بين الصفحات
function changePage(direction) {
    currentPage += direction;
    // التأكد من استمرار عمل فلتر البحث المباشر في حال تفعيل التنقل
    const input = document.getElementById("log-search-input").value.toLowerCase();
    if (input) {
        filterLogTable(); 
    } else {
        renderTablePage(currentPage);
    }
}
// تعديل البحث ليعرض النواقص
// استبدل دالة searchRecords للبحث العميق بسرعة الصاروخ عبر الذاكرة
async function searchRecords() {
    const query = document.getElementById('search-query').value.toLowerCase().trim();
    if (!query) return;
    
    document.getElementById('search-loading').style.display = 'block';
    document.getElementById('search-results').innerHTML = '';

    // إذا لم تكن البيانات في الذاكرة لسبب ما، نجلبها
    if (allTransactionsData.length === 0) {
        await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'get_all' }) })
            .then(res => res.json())
            .then(res => { if(res.success) allTransactionsData = res.data; });
    }

    document.getElementById('search-loading').style.display = 'none';

    // البحث في كامل المصفوفة (يستغرق أجزاء من الثانية)
    const results = allTransactionsData.map((row, index) => {
        return { row: row, rowIndex: index + 2 };
    }).filter(item => {
        const row = item.row;
        return (row[10] && String(row[10]).toLowerCase().includes(query)) || 
               (row[8]  && String(row[8]).toLowerCase().includes(query)) || 
               (row[19] && String(row[19]).toLowerCase().includes(query)) ||
               (row[0]  && String(row[0]).toLowerCase().includes(query));
    });

    if (results.length > 0) {
        let html = '';
        results.forEach(item => {
            const row = item.row;
            // تجهيز البيانات لزر الواتساب بنفس التنسيق القديم ليظل يعمل
            const recordData = {
                'الاسم': row[10], 'موضوع المذكرة': row[19], 'نوع المعاملة': row[4],
                'الرقم العسكري': row[8], 'الهاتف': row[15], 'رابط الصورة': row[13], 'rowIndex': item.rowIndex
            };
            const encodedRecord = encodeURIComponent(JSON.stringify(recordData));
            
            html += `
            <div class="result-card">
                <h4><i class="fa-solid fa-user-shield"></i> ${row[10] || '-'}</h4>
                <p><strong>الجهة/الموضوع:</strong> ${row[19] || row[4] || '-'}</p>
                <p><strong>الرقم العسكري:</strong> ${row[8] || '-'}</p>
                <p><strong>رقم الهاتف:</strong> ${row[15] || 'غير مسجل'}</p>
                
                <div style="margin-top: 10px;">
                    <input type="text" id="note-${item.rowIndex}" value="${row[20] || ''}" placeholder="اكتب النواقص المطلوبة هنا..." class="input-group" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; border-right: 3px solid #b33939;">
                </div>

                <div style="display:flex; gap:10px; margin-top:10px;">
                    <button onclick="shareSearchViaWhatsApp('${encodedRecord}', ${item.rowIndex})" class="whatsapp-btn" style="margin-top:0; padding:8px;"><i class="fa-brands fa-whatsapp"></i> إرسال النواقص</button>
                    <a href="${row[13] || '#'}" target="_blank" class="secondary-btn" style="text-align:center; text-decoration:none; padding:8px;">عرض المستند</a>
                </div>
            </div>`;
        });
        document.getElementById('search-results').innerHTML = html;
    } else { 
        document.getElementById('search-results').innerHTML = '<p>لا توجد نتائج مطابقة في قاعدة البيانات.</p>'; 
    }
}
// دالة المشاركة للواتساب لتعتمد تسمية "النواقص"
async function shareSearchViaWhatsApp(encodedData, rowIndex) {
    const data = JSON.parse(decodeURIComponent(encodedData));
    const missing = document.getElementById(`note-${rowIndex}`).value;
    
    if(missing) fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'update_notes', rowIndex: rowIndex, notes: missing }) });

    let text = `*بيانات المعاملة*\n===================\n`;
    text += `*الاسم:* ${data['الاسم'] || 'غير متوفر'}\n`;
    text += `*رقم المعاملة:* ${data['رقم المعاملة'] || 'غير متوفر'}\n`;
    text += `*النوع/الموضوع:* ${data['نوع المعاملة'] || 'غير متوفر'}\n`;
    if(data['الهاتف']) text += `*هاتف:* ${data['الهاتف']}\n`;
    if(missing) text += `\n*النواقص المطلوبة:*\n${missing}\n`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}
// ==========================================
// الإحصائيات وتصدير Excel (تفصيلي + إحصائي)
// ==========================================
async function loadStats() {
    fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'stats' }) })
    .then(res => res.json()).then(result => {
        if (result.success) {
            document.getElementById('stat-today').innerText = result.stats.today;
            document.getElementById('stat-month').innerText = result.stats.month;
            document.getElementById('stat-total').innerText = result.stats.total;
        }
    });
    // جلب البيانات الأساسية للتمكن من تصديرها لاحقاً
    if(allTransactionsData.length === 0) loadTransactionLog();
}
function exportExcel(type) {
    if (!allTransactionsData || allTransactionsData.length === 0) {
        document.getElementById('report-results').innerHTML = '<p style="color:var(--accent-color);"><i class="fa-solid fa-spinner fa-spin"></i> جاري جلب البيانات من الأرشيف... يرجى الانتظار.</p>';
        loadTransactionLog();
        return;
    }

    // جلب التواريخ لعنوان التقرير
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    let titleDate = (dateFrom && dateTo) ? `من (${dateFrom}) إلى (${dateTo})` : `الشامل لجميع الفترات`;

    let exportData = allTransactionsData;
    
    // فلترة السجلات بناءً على التاريخ المختار قبل تصدير الإكسل
    if (dateFrom && dateTo) {
        exportData = exportData.filter(row => {
            // استخدام row[14] الذي يمثل تاريخ إضافة المعاملة للنظام
            if (!row[14]) return false; 
            
            let rowDateStr = typeof row[14] === 'string' ? row[14].split('T')[0] : row[14];
            let rowDate = new Date(rowDateStr);
            
            let from = new Date(dateFrom);
            let to = new Date(dateTo);
            
            // ضبط الوقت لضمان شمول المعاملات في اليوم الأول واليوم الأخير بالكامل
            from.setHours(0, 0, 0, 0);
            to.setHours(23, 59, 59, 999);

            return rowDate >= from && rowDate <= to;
        });
    }
    let excelHTML = `<table border="1">
        <tr>
            <th colspan="5" style="font-size:18px; text-align:center; background-color:#c5a059; color:white; padding: 15px;">
                تقرير المعاملات - ${titleDate} | تاريخ التوليد: ${new Date().toLocaleDateString('ar-SA')}
            </th>
        </tr>`;
    
    let fileName = "";

    if (type === 'detailed') {
        fileName = "تقرير_تفصيلي.xls";
        excelHTML += `
            <tr>
                <th style="background-color:#2b3a2f; color:white;">الاسم</th>
                <th style="background-color:#2b3a2f; color:white;">رقم المعاملة</th>
                <th style="background-color:#2b3a2f; color:white;">نوع المعاملة</th>
                <th style="background-color:#2b3a2f; color:white;">الجهة</th>
                <th style="background-color:#2b3a2f; color:white;">الحالة</th>
            </tr>`;
            
        // عدادات لصف الإجمالي الكلي - التقرير التفصيلي
        let detailedCompleted = 0;
        let detailedOngoing = 0;
        let detailedTotal = 0;

        exportData.forEach(row => {
            // فحص الحالة الذكي (لقراءة المكتمل حتى لو كان مكتوباً في النواقص بالغلط)
            let statusText = String(row[17] || "");
            let bugText = String(row[20] || "");
            let isCompleted = (statusText.includes("تمت") || bugText.includes("تمت"));
            let finalStatus = isCompleted ? "مكتملة" : "مستمرة";
            
            // حساب الإحصائيات
            detailedTotal++;
            if (isCompleted) detailedCompleted++;
            else detailedOngoing++;

            excelHTML += `
                <tr>
                    <td>${row[10] || '-'}</td>
                    <td>${row[0] || '-'}</td>
                    <td>${row[4] || '-'}</td>
                    <td>${row[3] || '-'}</td>
                    <td>${finalStatus}</td>
                </tr>`;
        });

        // طباعة صف الإجمالي للتقرير التفصيلي
        excelHTML += `
            <tr style="background-color:#2b3a2f; color:white; font-weight:bold;">
                <td colspan="4" style="text-align:left; padding-left: 15px;">الإجمالي الكلي:</td>
                <td>المكتملة: ${detailedCompleted} | المستمرة: ${detailedOngoing} | الإجمالي: ${detailedTotal}</td>
            </tr>`;
    } 
    else if (type === 'stats') {
        fileName = "تقرير_إحصائي_ذكي.xls";
        excelHTML += `
            <tr>
                <th style="background-color:#2b3a2f; color:white;">نوع المعاملة / الموضوع</th>
                <th style="background-color:#2b3a2f; color:white;">الجهة</th>
                <th style="background-color:#2b3a2f; color:white;">المكتملة</th>
                <th style="background-color:#2b3a2f; color:white;">المستمرة</th>
                <th style="background-color:#2b3a2f; color:white;">الإجمالي</th>
            </tr>
        `;
        
        let grouped = {};
        
        // عدادات لصف الإجمالي الكلي - التقرير الإحصائي
        let grandCompleted = 0;
        let grandOngoing = 0;
        let grandTotal = 0;

        exportData.forEach(row => {
            if(!row) return;
            
            // استخدام الذكاء لتوحيد المسميات
            let typeKey = normalizeTransactionType(row[4] || row[19] || "غير محدد"); 
            
            // فحص الحالة الذكي (لقراءة المكتمل حتى لو كان مكتوباً في النواقص بالغلط)
            let statusText = String(row[17] || "");
            let bugText = String(row[20] || "");
            let isCompleted = (statusText.includes("تمت") || bugText.includes("تمت"));
            
            // التجميع يعتمد حصرياً على "نوع المعاملة" ولن ينظر للجهة أبداً
            let key = typeKey;
            
            if (!grouped[key]) grouped[key] = { completed: 0, ongoing: 0, total: 0 };
            
            grouped[key].total += 1;
            if (isCompleted) grouped[key].completed += 1;
            else grouped[key].ongoing += 1;
        });

        for (let k in grouped) {
            // تجميع الأرقام لصف الإجمالي النهائي
            grandCompleted += grouped[k].completed;
            grandOngoing += grouped[k].ongoing;
            grandTotal += grouped[k].total;

            excelHTML += `
                <tr>
                    <td>${k}</td>
                    <!-- تثبيت اسم الجهة لجميع المعاملات كما طلبت -->
                    <td>رئاسة الهيئة - دائرة شؤون الضباط - دائرة شؤون الافراد </td> 
                    <td style="color: green; font-weight: bold;">${grouped[k].completed}</td>
                    <td style="color: red; font-weight: bold;">${grouped[k].ongoing}</td>
                    <td style="background-color: #f0f0f0;"><strong>${grouped[k].total}</strong></td>
                </tr>
            `;
        }

        // طباعة صف الإجمالي الكلي في نهاية التقرير الإحصائي
        excelHTML += `
            <tr style="background-color:#2b3a2f; color:white; font-size: 16px;">
                <td colspan="2" style="text-align: left; font-weight: bold; padding-left: 20px;">الإجمالي الكلي:</td>
                <td style="font-weight: bold; color: #4cd137;">${grandCompleted}</td>
                <td style="font-weight: bold; color: #ff7675;">${grandOngoing}</td>
                <td style="font-weight: bold; background-color: #1f2a22;">${grandTotal}</td>
            </tr>
        `;
    }    
    excelHTML += '</table>';
    
    document.getElementById('report-results').innerHTML = excelHTML.replace('<table border="1">', '<table class="report-table">');

    let excelFile = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><style> body, table { direction: rtl; font-family: Arial, sans-serif; text-align: right; } </style></head>
        <body>${excelHTML}</body></html>
    `;
    
    let blob = new Blob([excelFile], { type: 'application/vnd.ms-excel' });
    let url = URL.createObjectURL(blob);
    let downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}
// ==========================================
// المذكرات الصادرة والذكاء الاصطناعي
// ==========================================
async function refineMemo() {
    const text = document.getElementById('memo-body').value;
    if(!text) return alert('يرجى كتابة نص المذكرة أولاً.');
    document.getElementById('memo-loading').style.display = 'block';
    
    try {
        const response = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'refine_memo', text: text }) });
        const result = await response.json();
        document.getElementById('memo-loading').style.display = 'none';
        if (result.success) {
            document.getElementById('memo-body').value = result.refinedText;
            document.getElementById('ai-details').innerText = result.changesDetails;
            document.getElementById('ai-feedback').style.display = 'block';
        }
    } catch (e) { document.getElementById('memo-loading').style.display = 'none'; }
}

async function exportMemo() {
    const to = document.getElementById('memo-to').value;
    const subject = document.getElementById('memo-subject').value;
    const body = document.getElementById('memo-body').value;
    if(!to || !subject || !body) return alert('يرجى تعبئة جميع الحقول.');

    document.getElementById('memo-loading').style.display = 'block';
    try {
        const response = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'export_memo', to: to, subject: subject, body: body }) });
        const result = await response.json();
        document.getElementById('memo-loading').style.display = 'none';
        if (result.success) {
            document.getElementById('memo-links').innerHTML = `
                <a href="${result.pdfUrl}" target="_blank" class="primary-btn" style="text-decoration:none; text-align:center; background-color:#e74c3c;">تحميل PDF</a>
                <a href="${result.wordUrl}" target="_blank" class="primary-btn" style="text-decoration:none; text-align:center; background-color:#2980b9;">تحميل Word</a>`;
            document.getElementById('memo-links').style.display = 'flex';
        }
    } catch (e) { document.getElementById('memo-loading').style.display = 'none'; }
}
// دالة البحث السريع (الفلترة) داخل جدول سجل المعاملات
// استبدل دالة الفلترة السريعة لتبحث في كامل الـ 10,000 سجل وتعرض لك النتائج مقسمة أيضاً
function filterLogTable() {
    const input = document.getElementById("log-search-input").value.toLowerCase();
    if (!input) {
        currentPage = 1;
        renderTablePage(currentPage); 
        return;
    }
    
    const filteredData = allTransactionsData.filter(row => {
        const nameCell = String(row[10] || '').toLowerCase();
        const transNumCell = String(row[0] || '').toLowerCase();
        return nameCell.includes(input) || transNumCell.includes(input);
    });
    
    // إرسال البيانات المفلترة لترسمها دالة العرض
    renderTablePage(1, filteredData); 
}
// ==========================================
// وظائف نافذة التعديل المنبثقة (دوال جديدة)
// ==========================================
function openEditModal(rowIndex) {
    const row = allTransactionsData[rowIndex - 2];
    if(!row) return;

    const overlay = document.createElement('div');
    overlay.id = 'edit-modal-overlay';
    overlay.style = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; display:flex; justify-content:center; align-items:center; direction:rtl;';
    
    const modal = document.createElement('div');
    modal.style = 'background:#fff; padding:25px; border-radius:10px; width:90%; max-width:450px; box-shadow:0 10px 30px rgba(0,0,0,0.2);';
    
    modal.innerHTML = `
        <h3 style="margin-bottom:20px; color:var(--primary-color);"><i class="fa-solid fa-pen-to-square"></i> تعديل بيانات المعاملة</h3>
        
        <div style="margin-bottom: 10px;"><label style="font-weight:bold; font-size:14px; color:#555;">الاسم:</label><input type="text" id="edit-m-name" value="${row[10] || ''}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; margin-top:5px;"></div>
        <div style="margin-bottom: 10px;"><label style="font-weight:bold; font-size:14px; color:#555;">رقم المعاملة:</label><input type="text" id="edit-m-trans" value="${row[0] || ''}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; margin-top:5px;"></div>
        <div style="margin-bottom: 10px;"><label style="font-weight:bold; font-size:14px; color:#555;">الجهة / الفرع:</label><input type="text" id="edit-m-branch" value="${row[3] || ''}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; margin-top:5px;"></div>
        <div style="margin-bottom: 10px;"><label style="font-weight:bold; font-size:14px; color:#c5a059;">الملاحظات (عند المسح):</label><input type="text" id="edit-m-notes" value="${row[18] || ''}" style="width:100%; padding:8px; border:1px solid #c5a059; border-radius:4px; margin-top:5px; background:#fff9e6;"></div>
        <div style="margin-bottom: 15px;"><label style="font-weight:bold; font-size:14px; color:#b33939;">النواقص (من البحث):</label><input type="text" id="edit-m-missing" value="${row[20] || ''}" style="width:100%; padding:8px; border:1px solid #b33939; border-radius:4px; margin-top:5px; background:#ffeaea;"></div>
        
        <div style="display:flex; gap:10px; margin-top:20px;">
            <button onclick="submitEdit(${rowIndex})" class="primary-btn" id="save-edit-btn" style="flex:1;">حفظ التعديلات</button>
            <button onclick="closeEditModal()" class="secondary-btn" style="background:#e74c3c; color:white; flex:1; border:none;">إلغاء</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

function closeEditModal() {
    const overlay = document.getElementById('edit-modal-overlay');
    if(overlay) overlay.remove();
}

async function submitEdit(rowIndex) {
    const btn = document.getElementById('save-edit-btn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';
    btn.disabled = true;
    
    const newData = {
        name: document.getElementById('edit-m-name').value,
        transNum: document.getElementById('edit-m-trans').value,
        branch: document.getElementById('edit-m-branch').value,
        notes: document.getElementById('edit-m-notes').value,
        missing: document.getElementById('edit-m-missing').value
    };

    try {
        const response = await fetch(APPS_SCRIPT_URL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'edit_record', rowIndex: rowIndex, newData: newData }) 
        });
        const result = await response.json();
        
        if(result.success) {
            closeEditModal();
            loadTransactionLog(); // إعادة تحميل السجل ليظهر التحديث فوراً
        } else {
            alert("حدث خطأ أثناء التعديل.");
            btn.innerText = 'حفظ التعديلات';
            btn.disabled = false;
        }
    } catch (e) {
        alert("خطأ في الاتصال.");
        closeEditModal();
    }
}
// دالة إتمام المعاملة الجديدة
async function markCompleted(rowIndex) {
    const btn = document.getElementById(`complete-btn-${rowIndex}`);
    if(!btn) return;
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; // شكل التحميل
    
    try {
        const response = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'update_status', rowIndex: rowIndex }) });
        const result = await response.json();
        
        if(result.success) {
            // 1. تحديث نص مربع الحالة
            document.getElementById(`status-${rowIndex}`).innerText = result.newStatus;
            
            // 2. تحويل الزر للون الرمادي بكلمة "مكتمل" وتعطيل الضغط عليه
            const container = document.getElementById(`status-container-${rowIndex}`);
            container.innerHTML = `<button class="secondary-btn" style="padding: 5px; background: #7f8c8d; color: white; border: none; font-size:12px; margin-bottom: 5px; width: 100%; cursor: default;" disabled><i class="fa-solid fa-check-double"></i> مكتمل</button>`;
            
            // 3. تحديث المصفوفة محلياً لكي لا يرجع الزر للأخضر إذا تم البحث في السجل
            if (allTransactionsData[rowIndex - 2]) {
                allTransactionsData[rowIndex - 2][17] = result.newStatus;
            }
        }
    } catch (e) { 
        alert("فشل تحديث الحالة."); 
        btn.innerHTML = 'إتمام'; // استرجاع النص في حال الفشل
    }
}
// دالة الصلاحيات
function applyPermissions() {
    loadChatMessages(); // تشغيل الشات للجميع

    const statsBtn = document.querySelector('button[onclick="showTab(\'stats-tab\')"]');
    const memoBtn = document.querySelector('button[onclick="showTab(\'memo-tab\')"]');

    if (currentUserRole === 'manager') {
        if(statsBtn) statsBtn.style.display = 'inline-block';
        if(memoBtn) memoBtn.style.display = 'inline-block';
    } else {
        // إخفاء التقارير والمذكرات عن المندوبين
        if(statsBtn) statsBtn.style.display = 'none';
        if(memoBtn) memoBtn.style.display = 'none';
    }
}

// دالة جلب وعرض الرسائل (تصميم فقاعات الواتساب)
async function loadChatMessages() {
    const chatContainer = document.getElementById('chat-messages');
    
    if (chatContainer.innerHTML.trim() === '') {
        chatContainer.innerHTML = '<div style="text-align:center; color:#c5a059;"><i class="fa-solid fa-spinner fa-spin"></i> جاري مزامنة الرسائل...</div>';
    }
    
    fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'get_chat' }) })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            chatContainer.innerHTML = ''; 
            result.messages.forEach(msg => {
                const isMe = msg[1] === currentUserName;
                
                const bubbleStyle = isMe 
                    ? 'align-self: flex-start; background: #2b3a2f; color: white; border-radius: 10px 0 10px 10px;' 
                    : 'align-self: flex-end; background: #ffffff; color: #333; border-radius: 0 10px 10px 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);';

                const senderName = isMe ? 'أنت' : `<span style="color: #c5a059; font-weight: bold;">${msg[1]}</span>`;

                chatContainer.innerHTML += `
                    <div style="max-width: 75%; padding: 10px 15px; margin-bottom: 5px; ${bubbleStyle}">
                        <div style="font-size: 11px; margin-bottom: 5px; display: flex; justify-content: space-between; gap: 15px;">
                            ${senderName}
                            <span style="opacity: 0.7; font-size: 9px;">${msg[0]}</span>
                        </div>
                        <div style="font-size: 15px; line-height: 1.4;">${msg[2]}</div>
                    </div>
                `;
            });
            chatContainer.scrollTop = chatContainer.scrollHeight; 
        }
    });
}

// دالة إرسال رسالة جديدة
async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    input.disabled = true;
    
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST', body: JSON.stringify({ action: 'add_chat', name: currentUserName, message: text })
        });
        const result = await response.json();
        if (result.success) {
            input.value = '';
            loadChatMessages(); 
        }
    } catch (e) {
        alert("فشل إرسال الملاحظة");
    } finally {
        input.disabled = false;
        input.focus();
    }
}
