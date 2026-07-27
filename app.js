// ⚠️ ضع هنا رابط تطبيق الويب (Web App URL) بعد التحديث الأخير
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbypNxrpZWpyIpgde0Lgz27BCc8j2tZLBUVYxHcLkSRynt38vm48NvNe4QD_WzUqh24/exec';

let currentExtractedData = null; 
let imageBase64Data = "";
let allTransactionsData = []; // لحفظ البيانات للإكسل

function toggleMenu() {
    const navLinks = document.getElementById('nav-links');
    if (navLinks.style.display === 'flex') {
        navLinks.style.display = 'none';
    } else {
        navLinks.style.display = 'flex';
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '100%';
        navLinks.style.left = '0';
        navLinks.style.width = '100%';
        navLinks.style.background = '#2b3a2f'; // لون الخلفية الزيتي
        navLinks.style.zIndex = '9999'; // لضمان ظهورها فوق كل شيء
    }
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

// تحديث نموذج الإدخال ليشمل رقم الهاتف والتاريخ المستخرج
function renderEditForm(data) {
    const ind = (data.individuals && data.individuals[0]) ? data.individuals[0] : {};
    
    let html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="input-group" style="grid-column: span 2;">
                <input type="text" id="edit-phone" placeholder="رقم هاتف صاحب المعاملة (إدخال يدوي)" style="border-color: var(--accent-color);">
            </div>
            <div class="input-group"><input type="text" id="edit-extracted-date" value="${data.extracted_date || ''}" placeholder="تاريخ أسفل الورقة (إن وجد)"></div>
            <div class="input-group"><input type="text" id="edit-subject" value="${data.memo_subject || ''}" placeholder="موضوع المذكرة"></div>
            
            <div class="input-group"><input type="text" id="edit-trans-num" value="${data.transaction_number || ''}" placeholder="رقم المعاملة"></div>
            <div class="input-group"><input type="text" id="edit-date" value="${data.receipt_date || ''}" placeholder="تاريخ الاستلام"></div>
            
            <div class="input-group"><input type="text" id="edit-type" value="${data.transaction_type || ''}" placeholder="نوع المعاملة"></div>
            <div class="input-group"><input type="text" id="edit-branch" value="${data.branch || ''}" placeholder="الفرع / الجهة"></div>
            
            <div class="input-group" style="grid-column: span 2;"><input type="text" id="edit-name" value="${ind.name || ''}" placeholder="الاسم"></div>
            <div class="input-group"><input type="text" id="edit-mil-num" value="${ind.military_number || ''}" placeholder="الرقم العسكري"></div>
        </div>
    `;
    document.getElementById('edit-fields').innerHTML = html;
    document.getElementById('edit-preview-section').style.display = 'block';
}

async function saveEditedData() {
    document.getElementById('edit-preview-section').style.display = 'none';
    document.getElementById('loading-spinner').style.display = 'block';

    currentExtractedData.phoneNumber = document.getElementById('edit-phone').value;
    currentExtractedData.extracted_date = document.getElementById('edit-extracted-date').value;
    currentExtractedData.memo_subject = document.getElementById('edit-subject').value;
    currentExtractedData.transaction_number = document.getElementById('edit-trans-num').value;
    currentExtractedData.receipt_date = document.getElementById('edit-date').value;
    currentExtractedData.transaction_type = document.getElementById('edit-type').value;
    currentExtractedData.branch = document.getElementById('edit-branch').value;

    if(!currentExtractedData.individuals) currentExtractedData.individuals = [{}];
    currentExtractedData.individuals[0].name = document.getElementById('edit-name').value;
    currentExtractedData.individuals[0].military_number = document.getElementById('edit-mil-num').value;

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
    } catch (error) { alert("حدث خطأ."); }
}

// ==========================================
// سجل المعاملات (تحديث الحالة)
// ==========================================
async function loadTransactionLog() {
    document.getElementById('log-results').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري جلب السجل...';
    try {
        const response = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'get_all' }) });
        const result = await response.json();
        if (result.success) {
            allTransactionsData = result.data; // حفظها للإكسل
            let table = `<table class="report-table">
                <tr><th>الاسم</th><th>نوع المعاملة</th><th>رقم المعاملة</th><th>الجهة</th><th>حالة المعاملة</th><th>إجراء</th></tr>`;
            
            result.data.forEach((row, index) => {
                const rowIndex = index + 2; // +2 لأن الصف 1 هو العناوين في الشيت
                const status = row[17] || "مستمرة"; // العمود 17 هو الحالة
                const btnHtml = status === "مستمرة" 
                    ? `<button onclick="markCompleted(${rowIndex})" class="primary-btn" style="padding: 5px; background: #27ae60; font-size:12px;">إتمام المعاملة</button>` 
                    : `<span style="color:#27ae60; font-size:12px;"><i class="fa-solid fa-check-double"></i> مكتملة</span>`;
                
                table += `<tr>
                    <td>${row[10] || '-'}</td>
                    <td>${row[4] || '-'}</td>
                    <td>${row[0] || '-'}</td>
                    <td>${row[3] || '-'}</td>
                    <td id="status-${rowIndex}">${status}</td>
                    <td id="action-${rowIndex}">${btnHtml}</td>
                </tr>`;
            });
            table += `</table>`;
            document.getElementById('log-results').innerHTML = table;
        }
    } catch (e) { document.getElementById('log-results').innerHTML = 'خطأ في جلب السجل.'; }
}

async function markCompleted(rowIndex) {
    document.getElementById(`action-${rowIndex}`).innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    try {
        const response = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'update_status', rowIndex: rowIndex }) });
        const result = await response.json();
        if(result.success) {
            document.getElementById(`status-${rowIndex}`).innerText = result.newStatus;
            document.getElementById(`action-${rowIndex}`).innerHTML = `<span style="color:#27ae60; font-size:12px;"><i class="fa-solid fa-check-double"></i> مكتملة</span>`;
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

function exportExcel(type) {
    if(allTransactionsData.length === 0) return alert("لا توجد بيانات للتصدير حالياً.");
    
    let ws_data = [];
    
    if(type === 'detailed') {
        // تقرير تفصيلي (اسم، نوع، رقم، جهة)
        ws_data.push(["الاسم", "نوع المعاملة", "رقم المعاملة", "الجهة/الفرع", "التاريخ", "الحالة"]);
        allTransactionsData.forEach(row => {
            ws_data.push([row[10]||"", row[4]||"", row[0]||"", row[3]||"", row[14]||"", row[17]||""]);
        });
    } 
    else if(type === 'stats') {
        // تقرير إحصائي (تجميع حسب النوع والجهة)
        ws_data.push(["نوع المعاملة / الموضوع", "الجهة", "العدد المنجز"]);
        
        let grouped = {};
        allTransactionsData.forEach(row => {
            let typeKey = row[4] || "غير محدد";
            let branchKey = row[3] || "غير محدد";
            let key = typeKey + "|" + branchKey;
            grouped[key] = (grouped[key] || 0) + 1;
        });

        for(let k in grouped) {
            let parts = k.split("|");
            ws_data.push([parts[0], parts[1], grouped[k]]);
        }
    }

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التقرير");
    XLSX.writeFile(wb, type === 'detailed' ? "تقرير_تفصيلي.xlsx" : "تقرير_احصائي.xlsx");
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
