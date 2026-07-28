// ⚠️ ضع هنا رابط تطبيق الويب (Web App URL) بعد التحديث الأخير
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbypNxrpZWpyIpgde0Lgz27BCc8j2tZLBUVYxHcLkSRynt38vm48NvNe4QD_WzUqh24/exec';

let currentExtractedData = null; 
let imageBase64Data = "";
let allTransactionsData = []; // لحفظ البيانات للإكسل

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
        if (result.success) { errorMsg.innerText = ""; showScreen('app-section'); } 
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

// سجل المعاملات (محدث لعرض جميع الأعمدة الموجودة في قوقل شيت ديناميكياً)
async function loadTransactionLog() {
    document.getElementById('log-results').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري جلب السجل...';
    try {
        const response = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'get_all' }) });
        const result = await response.json();
        
        if (result.success) {
            allTransactionsData = result.data; 
            
            let table = `<table class="report-table">
                <tr>`;
            
            // 1. جلب وبناء عناوين الجدول تلقائياً من الصف الأول في الشيت
            if (result.headers) {
                result.headers.forEach(header => {
                    table += `<th>${header || 'بدون عنوان'}</th>`;
                });
            }
            // إضافة عمود الإجراءات في نهاية الجدول
            table += `<th>إجراء</th></tr>`; 
            
            // 2. جلب وبناء صفوف البيانات
            result.data.forEach((row, index) => {
                const rowIndex = index + 2; // +2 لأن الصف 1 في الشيت للعناوين
                
                // حالة المعاملة موجودة في العمود 17 (العمود R) بناءً على صورتك
                const statusIndex = 17; 
                const status = row[statusIndex] || "مستمرة"; 
                const btnHtml = status.includes("مستمرة") 
                    ? `<button onclick="markCompleted(${rowIndex})" class="primary-btn" style="padding: 5px; background: #27ae60; font-size:12px;">إتمام المعاملة</button>` 
                    : `<span style="color:#27ae60; font-size:12px;"><i class="fa-solid fa-check-double"></i> مكتملة</span>`;
                
                table += `<tr>`;
                
                // عرض كل الخلايا للعميل
                row.forEach((cell, cellIndex) => {
                    // إذا كان العمود هو رابط الصورة (العمود رقم 13 أو N)، نجعله رابطاً قابل للنقر
                    if (cellIndex === 13 && cell) {
                        table += `<td><a href="${cell}" target="_blank" style="color:var(--accent-color); text-decoration:none;"><i class="fa-solid fa-link"></i> عرض</a></td>`;
                    } 
                    // تمييز خلية الحالة لكي تتحدث عند الضغط على الزر
                    else if (cellIndex === statusIndex) {
                        table += `<td id="status-${rowIndex}">${status}</td>`;
                    }
                    // عرض باقي البيانات بشكل طبيعي
                    else {
                        table += `<td>${cell || '-'}</td>`;
                    }
                });
                
                // إضافة زر الإجراء في نهاية الصف
                table += `<td id="action-${rowIndex}">${btnHtml}</td></tr>`;
            });
            
            table += `</table>`;
            document.getElementById('log-results').innerHTML = table;
        }
    } catch (e) { 
        document.getElementById('log-results').innerHTML = 'خطأ في جلب السجل.'; 
    }
}
async function markCompleted(rowIndex) {
    document.getElementById(`action-${rowIndex}`).innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    try {
        const response = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'update_status', rowIndex: rowIndex }) });
        const result = await response.json();
        if(result.success) {
            document.getElementById(`status-${rowIndex}`).innerText = result.newStatus;
            document.getElementById(`action-${rowIndex}`).innerHTML = `<span style="color:#27ae60; font-size:12px;"><i class="fa-solid fa-check-double"></i> مكتملة</span>`;
            
            // تحديث البيانات في الذاكرة المحلية حتى يظهر في التقرير كـ "مكتملة" بدون إعادة تحميل
            const targetRow = allTransactionsData.find(r => r.originalRowIndex === rowIndex);
            if(targetRow) targetRow[17] = result.newStatus;
        }
    } catch (e) { alert("فشل تحديث الحالة."); }
}
// ==========================================
// البحث وإضافة الملاحظات
// ==========================================
async function searchRecords() {
    const query = document.getElementById('search-query').value;
    if (!query) return;
    document.getElementById('search-loading').style.display = 'block';
    document.getElementById('search-results').innerHTML = '';

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST', body: JSON.stringify({ action: 'search', query: query }),
        });
        const result = await response.json();
        document.getElementById('search-loading').style.display = 'none';

        if (result.success && result.results.length > 0) {
            let html = '';
            result.results.forEach(record => {
                const encodedRecord = encodeURIComponent(JSON.stringify(record));
                html += `
                <div class="result-card">
                    <h4><i class="fa-solid fa-user-shield"></i> ${record['الاسم']}</h4>
                    <p><strong>الجهة/الموضوع:</strong> ${record['موضوع المذكرة'] || record['نوع المعاملة']}</p>
                    <p><strong>الرقم العسكري:</strong> ${record['الرقم العسكري']}</p>
                    <p><strong>رقم الهاتف:</strong> ${record['الهاتف'] || 'غير مسجل'}</p>
                    
                    <div style="margin-top: 10px;">
                        <input type="text" id="note-${record.rowIndex}" placeholder="اكتب نواقص أو ملاحظات هنا..." class="input-group" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                    </div>

                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <button onclick="shareSearchViaWhatsApp('${encodedRecord}', ${record.rowIndex})" class="whatsapp-btn" style="margin-top:0; padding:8px;"><i class="fa-brands fa-whatsapp"></i> مشاركة</button>
                        <a href="${record['رابط الصورة']}" target="_blank" class="secondary-btn" style="text-align:center; text-decoration:none; padding:8px;">عرض المستند</a>
                    </div>
                </div>`;
            });
            document.getElementById('search-results').innerHTML = html;
        } else { document.getElementById('search-results').innerHTML = '<p>لا توجد نتائج.</p>'; }
    } catch (error) { document.getElementById('search-loading').style.display = 'none'; }
}

async function shareSearchViaWhatsApp(encodedData, rowIndex) {
    const data = JSON.parse(decodeURIComponent(encodedData));
    const note = document.getElementById(`note-${rowIndex}`).value;
    
    // حفظ الملاحظة في الخلفية بصمت
    if(note) fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'update_notes', rowIndex: rowIndex, notes: note }) });

    let text = `*بيانات المعاملة*\n===================\n`;
    text += `*الاسم:* ${data['الاسم'] || 'غير متوفر'}\n`;
    text += `*رقم المعاملة:* ${data['رقم المعاملة'] || 'غير متوفر'}\n`;
    text += `*النوع/الموضوع:* ${data['نوع المعاملة'] || 'غير متوفر'}\n`;
    if(data['الهاتف']) text += `*هاتف:* ${data['الهاتف']}\n`;
    if(note) text += `\n*ملاحظات هامة (نواقص):*\n${note}\n`;

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
// ==========================================
// تصدير وعرض التقارير (إحصائي + تفصيلي) وتحميلها كملف Excel
// ==========================================
function exportExcel(type) {
    if (!allTransactionsData || allTransactionsData.length === 0) {
        document.getElementById('report-results').innerHTML = '<p style="color:var(--accent-color);"><i class="fa-solid fa-spinner fa-spin"></i> جاري جلب البيانات من الأرشيف... يرجى إعادة الضغط بعد ثوانٍ.</p>';
        loadTransactionLog();
        return;
    }

    let exportData = allTransactionsData;
    let excelHTML = '<table border="1">'; // إضافة حدود للجدول لكي تظهر في الإكسل
    let fileName = "";

    // التقرير التفصيلي
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
        exportData.forEach(row => {
            excelHTML += `
                <tr>
                    <td>${row[10] || '-'}</td>
                    <td>${row[0] || '-'}</td>
                    <td>${row[4] || '-'}</td>
                    <td>${row[3] || '-'}</td>
                    <td>${row[17] || 'مستمرة'}</td>
                </tr>`;
        });
    } 
    // التقرير الإحصائي
    else if (type === 'stats') {
        fileName = "تقرير_إحصائي.xls";
        excelHTML += `
            <tr>
                <th style="background-color:#2b3a2f; color:white;">نوع المعاملة / الموضوع</th>
                <th style="background-color:#2b3a2f; color:white;">الجهة</th>
                <th style="background-color:#2b3a2f; color:white;">المعاملات المكتملة</th>
                <th style="background-color:#2b3a2f; color:white;">المعاملات المستمرة</th>
                <th style="background-color:#2b3a2f; color:white;">الإجمالي</th>
            </tr>
        `;
        
        let grouped = {};
        exportData.forEach(row => {
            if(!row) return;
            let typeKey = String(row[4] || "غير محدد");
            let branchKey = String(row[3] || "غير محدد");
            let status = String(row[17] || "مستمرة"); 
            
            let key = typeKey + "|||" + branchKey;
            
            if (!grouped[key]) {
                grouped[key] = { completed: 0, ongoing: 0, total: 0 };
            }
            
            grouped[key].total += 1;
            
            if (status.includes("مستمرة")) {
                grouped[key].ongoing += 1;
            } else {
                grouped[key].completed += 1;
            }
        });

        for (let k in grouped) {
            let parts = k.split("|||");
            excelHTML += `
                <tr>
                    <td>${parts[0]}</td>
                    <td>${parts[1]}</td>
                    <td style="color: green; font-weight: bold;">${grouped[k].completed}</td>
                    <td style="color: red; font-weight: bold;">${grouped[k].ongoing}</td>
                    <td style="background-color: #f0f0f0;"><strong>${grouped[k].total}</strong></td>
                </tr>
            `;
        }
    }
    
    excelHTML += '</table>';
    
    // 1. عرض التقرير في الشاشة للمعاينة
    document.getElementById('report-results').innerHTML = excelHTML.replace('<table border="1">', '<table class="report-table">');

    // 2. كود تحميل الملف كـ Excel (يدعم اللغة العربية والاتجاه من اليمين لليسار)
    let excelFile = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <style>
                body, table { direction: rtl; font-family: Arial, sans-serif; text-align: right; }
            </style>
        </head>
        <body>
            ${excelHTML}
        </body>
        </html>
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
function filterLogTable() {
    const input = document.getElementById("log-search-input").value.toLowerCase();
    const table = document.querySelector("#log-results .report-table");
    
    // إذا لم يكن الجدول محملاً بعد، نوقف العملية
    if (!table) return; 
    
    const trs = table.getElementsByTagName("tr");
    
    // نبدأ من 1 لتخطي صف العناوين الأول (رأس الجدول)
    for (let i = 1; i < trs.length; i++) {
        const tds = trs[i].getElementsByTagName("td");
        let rowContainsSearchTerm = false;
        
        if (tds.length > 0) {
            // tds[0] هو الاسم، و tds[2] هو رقم المعاملة (بناءً على ترتيب الجدول)
            const nameCell = tds[0].textContent || tds[0].innerText;
            const transNumCell = tds[2].textContent || tds[2].innerText;
            
            // التحقق مما إذا كان النص المدخل موجوداً في الاسم أو في رقم المعاملة
            if (nameCell.toLowerCase().includes(input) || transNumCell.toLowerCase().includes(input)) {
                rowContainsSearchTerm = true;
            }
        }
        
        // إظهار أو إخفاء الصف بناءً على نتيجة البحث
        trs[i].style.display = rowContainsSearchTerm ? "" : "none";
    }
}
