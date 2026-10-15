// ⚠️ ضع هنا رابط تطبيق الويب (Web App URL) 
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbypNxrpZWpyIpgde0Lgz27BCc8j2tZLBUVYxHcLkSRynt38vm48NvNe4QD_WzUqh24/exec';

let currentExtractedData = null; 
let imageBase64Data = "";
let allTransactionsData = [];
let currentLogLimit = 5;

// ==========================================
// 🛡️ قسم الحماية والمصادقة الأمنية
// ==========================================
window.onload = function() {
    if(!sessionStorage.getItem('military_auth_token')) {
        showScreen('login-section');
    } else {
        showScreen('app-section');
    }
};

async function secureFetch(bodyData) {
    const token = sessionStorage.getItem('military_auth_token');
    if (!token && bodyData.action !== 'login') {
        logout();
        alert("انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً لدواعي أمنية.");
        throw new Error("Unauthorized");
    }
    if(token) bodyData.token = token;

    const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST', body: JSON.stringify(bodyData)
    });
    const result = await response.json();
    if(result.success === false && result.message && result.message.includes("غير مصرح")) {
        logout();
        alert(result.message);
        throw new Error("Unauthorized");
    }
    return result;
}

async function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');
    if (!user || !pass) return errorMsg.innerText = "يرجى إدخال البيانات.";
    
    errorMsg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحقق...';
    try {
        const result = await secureFetch({ action: 'login', username: user, password: pass });
        if (result.success) { 
            sessionStorage.setItem('military_auth_token', result.token);
            errorMsg.innerText = ""; 
            showScreen('app-section'); 
        } 
        else errorMsg.innerText = result.message;
    } catch (error) { errorMsg.innerText = "خطأ في الاتصال أو رفض أمني."; }
}

function logout() {
    sessionStorage.removeItem('military_auth_token');
    document.getElementById('username').value = ''; 
    document.getElementById('password').value = ''; 
    showScreen('login-section');
}

// ==========================================
// التنقل والواجهة
// ==========================================
function toggleMenu() { document.getElementById('nav-links').classList.toggle('show'); }

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active-screen'));
    document.getElementById(screenId).classList.add('active-screen');
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active-tab'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active-tab');
    event.currentTarget.classList.add('active');
    document.getElementById('nav-links').classList.remove('show'); 
    
    if (tabId === 'stats-tab') loadStats();
    if (tabId === 'log-tab') loadTransactionLog(); 
    if (tabId === 'settings-tab') loadUsers();
}

// ==========================================
// مسح ومعالجة المستندات
// ==========================================
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
        const result = await secureFetch({ action: 'analyze_image', imageBase64: imageBase64Data });
        document.getElementById('loading-spinner').style.display = 'none';
        if (result.success) {
            currentExtractedData = result.data;
            renderEditForm(currentExtractedData);
        } else {
            alert("خطأ: " + result.message);
            document.getElementById('process-btn').style.display = 'block';
        }
    } catch (error) {
        alert("حدث خطأ أمني أو في الاتصال.");
        document.getElementById('process-btn').style.display = 'block';
        document.getElementById('loading-spinner').style.display = 'none';
    }
}

function renderEditForm(data) {
    const ind = (data.individuals && data.individuals[0]) ? data.individuals[0] : {};
    let html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="input-group" style="grid-column: span 2;"><input type="text" id="edit-phone" placeholder="رقم هاتف صاحب المعاملة (إدخال يدوي)" style="border-color: var(--accent-color);"></div>
            <div class="input-group" style="grid-column: span 2;"><input type="text" id="edit-notes" placeholder="ملاحظات إضافية أو نواقص (اختياري)" style="border-color: var(--accent-color); background-color: #fff9e6;"></div>
            <div class="input-group"><input type="text" id="edit-extracted-date" value="${data.extracted_date || ''}" placeholder="تاريخ أسفل الورقة (إن وجد)"></div>
            <div class="input-group"><input type="text" id="edit-subject" value="${data.memo_subject || ''}" placeholder="موضوع المذكرة"></div>
            <div class="input-group"><input type="text" id="edit-trans-num" value="${data.transaction_number || ''}" placeholder="رقم المعاملة"></div>
            <div class="input-group"><input type="text" id="edit-date" value="${data.receipt_date || ''}" placeholder="تاريخ الاستلام"></div>
            <div class="input-group"><input type="text" id="edit-ben-count" value="${data.beneficiaries_count || ''}" placeholder="عدد المستفيدين"></div>
            <div class="input-group"><input type="text" id="edit-branch" value="${data.branch || ''}" placeholder="الفرع / الجهة"></div>
            <div class="input-group"><input type="text" id="edit-type" value="${data.transaction_type || ''}" placeholder="نوع المعاملة"></div>
            <div class="input-group"><input type="text" id="edit-source" value="${data.source || ''}" placeholder="المصدر"></div>
            <div class="input-group"><input type="text" id="edit-receiver" value="${data.receiver || ''}" placeholder="المستلم"></div>
            <div class="input-group"><input type="text" id="edit-deliverer" value="${data.deliverer || ''}" placeholder="المُسلّم"></div>
            <div class="input-group"><input type="text" id="edit-mil-num" value="${ind.military_number || ''}" placeholder="الرقم العسكري"></div>
            <div class="input-group"><input type="text" id="edit-rank" value="${ind.rank || ''}" placeholder="الرتبة"></div>
            <div class="input-group" style="grid-column: span 2;"><input type="text" id="edit-name" value="${ind.name || ''}" placeholder="الاسم"></div>
            <div class="input-group"><input type="text" id="edit-main-unit" value="${ind.main_unit || ''}" placeholder="الوحدة الرئيسية"></div>
            <div class="input-group"><input type="text" id="edit-sub-unit" value="${ind.sub_unit || ''}" placeholder="الوحدة الفرعية"></div>
        </div>`;
    document.getElementById('edit-fields').innerHTML = html;
    document.getElementById('edit-preview-section').style.display = 'block';
}

async function saveEditedData() {
    document.getElementById('edit-preview-section').style.display = 'none';
    document.getElementById('loading-spinner').style.display = 'block';

    currentExtractedData.phoneNumber = document.getElementById('edit-phone').value;
    currentExtractedData.notes = document.getElementById('edit-notes').value; 
    currentExtractedData.extracted_date = document.getElementById('edit-extracted-date').value;
    currentExtractedData.memo_subject = document.getElementById('edit-subject').value;
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
        const result = await secureFetch({ action: 'save_record', data: currentExtractedData, imageBase64: imageBase64Data });
        document.getElementById('loading-spinner').style.display = 'none';
        if (result.success) {
            document.getElementById('result-box').style.display = 'block';
            document.getElementById('image-preview').style.display = 'none';
        } else {
            alert("خطأ أثناء الحفظ: " + result.message);
            document.getElementById('edit-preview-section').style.display = 'block';
        }
    } catch (error) { 
        document.getElementById('loading-spinner').style.display = 'none';
        document.getElementById('edit-preview-section').style.display = 'block';
    }
}

// ==========================================
// استيراد الإكسل
// ==========================================
async function importExcel(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('import-status').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري قراءة الملف...';
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const excelData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
            
            if(excelData.length < 2) return document.getElementById('import-status').innerText = 'الملف فارغ أو لا يحتوي على بيانات.';

            document.getElementById('import-status').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الرفع إلى قاعدة البيانات...';
            
            const result = await secureFetch({ action: 'import_excel', data: excelData });
            
            if(result.success) {
                document.getElementById('import-status').innerHTML = `<span style="color: green;"><i class="fa-solid fa-check"></i> تم استيراد ${result.count} صف بنجاح.</span>`;
                loadTransactionLog(); 
            } else {
                document.getElementById('import-status').innerText = 'خطأ: ' + result.message;
            }
        } catch(error) {
            document.getElementById('import-status').innerText = 'حدث خطأ في قراءة الملف.';
        }
    };
    reader.readAsArrayBuffer(file);
}

// ==========================================
// سجل المعاملات (عرض 5 والبحث المتقدم)
// ==========================================
async function loadTransactionLog() {
    document.getElementById('log-results').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري جلب السجل...';
    try {
        const result = await secureFetch({ action: 'get_all' });
        if (result.success) {
            allTransactionsData = result.data; 
            currentLogLimit = 5; 
            renderLogTable();    
        }
    } catch (e) { document.getElementById('log-results').innerHTML = 'خطأ أمني أو انقطاع اتصال.'; }
}

function renderLogTable(dataToRender = allTransactionsData, isSearch = false) {
    if (!dataToRender || dataToRender.length === 0) {
        document.getElementById('log-results').innerHTML = '<p style="text-align:center; padding:20px;">لا توجد بيانات لعرضها.</p>';
        return;
    }

    let limit = isSearch ? dataToRender.length : currentLogLimit;

    let table = `<table class="report-table">
        <tr>
            <th>رقم المعاملة</th><th>الرتبة</th><th>الرقم العسكري</th><th>الاسم</th>
            <th>الوحدة الرئيسية</th><th>الوحدة الفرعية</th><th>نوع المعاملة</th>
            <th>موضوع المذكرة</th><th>رقم الهاتف</th><th>المصدر</th>
            <th>المسلم</th><th>المستلم</th><th>الفرع</th><th>عدد المستفيدين</th>
            <th>تاريخ الاستلام</th><th style="color: #c5a059;">الملاحظات</th>
            <th style="color: #b33939;">النواقص</th><th>الحالة</th><th>إجراء</th>
        </tr>`;
    
    for (let i = 0; i < dataToRender.length; i++) {
        if (i >= limit) break; 
        
        const row = dataToRender[i];
        const originalIndex = allTransactionsData.indexOf(row);
        const rowIndex = originalIndex + 2; 

        const status = row[17] || "مستمرة"; 
        let cleanDate = row[1] || '-';
        if (typeof cleanDate === 'string' && cleanDate.includes('T')) cleanDate = cleanDate.split('T')[0];
        
        const statusBtn = status.includes("مستمرة") 
            ? `<button id="complete-btn-${rowIndex}" onclick="markCompleted(${rowIndex})" class="primary-btn" style="padding: 5px; background: #27ae60; font-size:12px; margin-bottom: 5px; width: 100%;">إتمام</button>` 
            : `<button class="secondary-btn" style="padding: 5px; background: #7f8c8d; color: white; border: none; font-size:12px; margin-bottom: 5px; width: 100%; cursor: default;" disabled><i class="fa-solid fa-check-double"></i> مكتمل</button>`;
        
        const editBtn = `<button onclick="openEditModal(${rowIndex})" class="secondary-btn" style="padding: 5px; background: #2980b9; color: white; border: none; border-radius: 4px; font-size:12px; width: 100%; margin-bottom: 5px;">تعديل</button>`;
        const docLink = row[13] ? `<a href="${row[13]}" target="_blank" class="secondary-btn" style="padding: 5px; background: #8e44ad; color: white; border: none; border-radius: 4px; font-size:12px; width: 100%; text-decoration:none; display:inline-block; text-align:center;">المستند</a>` : '-';

        table += `<tr>
            <td>${row[0] || '-'}</td><td>${row[9] || '-'}</td><td>${row[8] || '-'}</td>
            <td><strong>${row[10] || '-'}</strong></td><td>${row[11] || '-'}</td>
            <td>${row[12] || '-'}</td><td>${row[4] || '-'}</td><td>${row[19] || '-'}</td>
            <td>${row[15] || '-'}</td><td>${row[5] || '-'}</td><td>${row[7] || '-'}</td>
            <td>${row[6] || '-'}</td><td>${row[3] || '-'}</td><td>${row[2] || '-'}</td>
            <td>${cleanDate}</td><td style="background-color: #fff9e6;">${row[18] || '-'}</td>
            <td style="background-color: #ffeaea; color: #b33939;">${row[20] || '-'}</td>
            <td id="status-${rowIndex}" style="font-weight:bold;">${status}</td>
            <td style="min-width: 80px;"><div id="status-container-${rowIndex}">${statusBtn}</div>${editBtn} ${docLink}</td>
        </tr>`;
    }
    
    table += `</table>`;

    if (!isSearch && dataToRender.length > limit) {
        table += `
        <div style="text-align: center; margin-top: 20px;">
            <button onclick="showMoreLog()" class="secondary-btn" style="background-color: var(--primary-color); color: white; width: auto; padding: 10px 40px; border-radius: 20px;">
                <i class="fa-solid fa-angle-down"></i> عرض المزيد (${dataToRender.length - limit} معاملة متبقية)
            </button>
        </div>`;
    }

    document.getElementById('log-results').innerHTML = table;
}

function showMoreLog() {
    currentLogLimit += 10; 
    renderLogTable();      
}

function filterLogTable() {
    const input = document.getElementById("log-search-input").value.toLowerCase();
    if (input.trim() === '') {
        renderLogTable(); 
        return;
    }
    let filteredData = allTransactionsData.filter(row => {
        const nameCell = (row[10] || '').toString().toLowerCase();
        const transNumCell = (row[0] || '').toString().toLowerCase();
        return nameCell.includes(input) || transNumCell.includes(input);
    });
    renderLogTable(filteredData, true); 
}

// ==========================================
// الأرشيف والبحث (الشاشة المخصصة)
// ==========================================
async function searchRecords() {
    const query = document.getElementById('search-query').value;
    if (!query) return;
    document.getElementById('search-loading').style.display = 'block';
    document.getElementById('search-results').innerHTML = '';

    try {
        const result = await secureFetch({ action: 'search', query: query });
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
                        <input type="text" id="note-${record.rowIndex}" placeholder="اكتب النواقص المطلوبة هنا..." class="input-group" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; border-right: 3px solid #b33939;">
                    </div>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <button onclick="shareSearchViaWhatsApp('${encodedRecord}', ${record.rowIndex})" class="whatsapp-btn" style="margin-top:0; padding:8px;"><i class="fa-brands fa-whatsapp"></i> إرسال النواقص</button>
                        <a href="${record['رابط الصورة']}" target="_blank" class="secondary-btn" style="text-align:center; text-decoration:none; padding:8px;">المستند</a>
                    </div>
                </div>`;
            });
            document.getElementById('search-results').innerHTML = html;
        } else { document.getElementById('search-results').innerHTML = '<p>لا توجد نتائج.</p>'; }
    } catch (error) { document.getElementById('search-loading').style.display = 'none'; }
}

async function shareSearchViaWhatsApp(encodedData, rowIndex) {
    const data = JSON.parse(decodeURIComponent(encodedData));
    const missing = document.getElementById(`note-${rowIndex}`).value;
    
    if(missing) secureFetch({ action: 'update_notes', rowIndex: rowIndex, notes: missing });

    let text = `*بيانات المعاملة*\n===================\n`;
    text += `*الاسم:* ${data['الاسم'] || 'غير متوفر'}\n`;
    text += `*رقم المعاملة:* ${data['رقم المعاملة'] || 'غير متوفر'}\n`;
    text += `*النوع/الموضوع:* ${data['نوع المعاملة'] || 'غير متوفر'}\n`;
    if(data['الهاتف']) text += `*هاتف:* ${data['الهاتف']}\n`;
    if(missing) text += `\n*النواقص المطلوبة:*\n${missing}\n`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

// ==========================================
// التعديل والإتمام
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
    overlay.appendChild(modal); document.body.appendChild(overlay);
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
        name: document.getElementById('edit-m-name').value, transNum: document.getElementById('edit-m-trans').value,
        branch: document.getElementById('edit-m-branch').value, notes: document.getElementById('edit-m-notes').value,
        missing: document.getElementById('edit-m-missing').value
    };

    try {
        const result = await secureFetch({ action: 'edit_record', rowIndex: rowIndex, newData: newData });
        if(result.success) { closeEditModal(); loadTransactionLog(); } 
        else { alert("حدث خطأ أثناء التعديل."); btn.innerText = 'حفظ التعديلات'; btn.disabled = false; }
    } catch (e) { alert("خطأ في الاتصال الأمني."); closeEditModal(); }
}

async function markCompleted(rowIndex) {
    const btn = document.getElementById(`complete-btn-${rowIndex}`);
    if(!btn) return;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; 
    try {
        const result = await secureFetch({ action: 'update_status', rowIndex: rowIndex });
        if(result.success) {
            document.getElementById(`status-${rowIndex}`).innerText = result.newStatus;
            document.getElementById(`status-container-${rowIndex}`).innerHTML = `<button class="secondary-btn" style="padding: 5px; background: #7f8c8d; color: white; border: none; font-size:12px; margin-bottom: 5px; width: 100%; cursor: default;" disabled><i class="fa-solid fa-check-double"></i> مكتمل</button>`;
            if (allTransactionsData[rowIndex - 2]) allTransactionsData[rowIndex - 2][17] = result.newStatus;
        }
    } catch (e) { alert("فشل أمني في تحديث الحالة."); btn.innerHTML = 'إتمام'; }
}

// ==========================================
// الإحصائيات والتصدير والمذكرات
// ==========================================
async function loadStats() {
    secureFetch({ action: 'stats' }).then(result => {
        if (result.success) {
            document.getElementById('stat-today').innerText = result.stats.today;
            document.getElementById('stat-month').innerText = result.stats.month;
            document.getElementById('stat-total').innerText = result.stats.total;
        }
    });
    if(allTransactionsData.length === 0) loadTransactionLog();
}

function exportExcel(type) {
    if (!allTransactionsData || allTransactionsData.length === 0) {
        document.getElementById('report-results').innerHTML = '<p style="color:var(--accent-color);"><i class="fa-solid fa-spinner fa-spin"></i> جاري جلب البيانات من الأرشيف...</p>';
        loadTransactionLog();
        return;
    }

    let wb = XLSX.utils.book_new(); 
    let ws_data = []; 
    let fileName = "";
    let sheetName = "";

    if (type === 'detailed') {
        fileName = "سجل_الارشيف_التفصيلي.xlsx";
        sheetName = "المعاملات";
        ws_data.push(["الرقم", "الاسم", "رقم المعاملة", "الرقم العسكري", "نوع المعاملة", "الجهة", "رقم الهاتف", "موضوع المذكرة", "تاريخ الاستلام", "الحالة"]);
        
        allTransactionsData.forEach((row, index) => {
            if(!row) return;
            let cleanDate = row[1] || '-';
            if (typeof cleanDate === 'string' && cleanDate.includes('T')) cleanDate = cleanDate.split('T')[0];
            ws_data.push([
                index + 1, row[10] || '-', row[0] || '-', row[8] || '-', row[4] || '-', row[3] || '-', row[15] || '-', row[19] || '-', cleanDate, row[17] || 'مستمرة'
            ]);
        });
    } else if (type === 'stats') {
        fileName = "التقرير_الاحصائي_للجهات.xlsx";
        sheetName = "إحصائيات";
        ws_data.push(["نوع المعاملة / الموضوع", "الجهة", "المعاملات المكتملة", "المعاملات المستمرة", "إجمالي المعاملات"]);
        
        let grouped = {};
        allTransactionsData.forEach(row => {
            if(!row) return;
            let typeKey = String(row[4] || "غير محدد");
            let branchKey = String(row[3] || "غير محدد");
            let status = String(row[17] || "مستمرة"); 
            let key = typeKey + "|||" + branchKey;
            
            if (!grouped[key]) grouped[key] = { completed: 0, ongoing: 0, total: 0 };
            grouped[key].total += 1;
            if (status.includes("مستمرة")) grouped[key].ongoing += 1; else grouped[key].completed += 1;
        });

        for (let k in grouped) {
            let parts = k.split("|||");
            ws_data.push([parts[0], parts[1], grouped[k].completed, grouped[k].ongoing, grouped[k].total]);
        }
    }

    let ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!dir'] = 'rtl';
    ws['!cols'] = ws_data[0].map(() => ({ wch: 22 })); 
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName); 
    document.getElementById('report-results').innerHTML = `<p style="color: var(--success); font-weight: bold; padding: 15px; background: #e8f8f5; border-radius: 6px; text-align: center;"><i class="fa-solid fa-check-circle"></i> تم تصدير وتحميل ملف الإكسل ( ${fileName} ) بنجاح.</p>`;
}

async function refineMemo() {
    const text = document.getElementById('memo-body').value;
    if(!text) return alert('يرجى كتابة نص المذكرة أولاً.');
    document.getElementById('memo-loading').style.display = 'block';
    try {
        const result = await secureFetch({ action: 'refine_memo', text: text });
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
        const result = await secureFetch({ action: 'export_memo', to: to, subject: subject, body: body });
        document.getElementById('memo-loading').style.display = 'none';
        if (result.success) {
            document.getElementById('memo-links').innerHTML = `
                <a href="${result.pdfUrl}" target="_blank" class="primary-btn" style="text-decoration:none; text-align:center; background-color:#e74c3c;">تحميل PDF</a>
                <a href="${result.wordUrl}" target="_blank" class="primary-btn" style="text-decoration:none; text-align:center; background-color:#2980b9;">تحميل Word</a>`;
            document.getElementById('memo-links').style.display = 'flex';
        }
    } catch (e) { document.getElementById('memo-loading').style.display = 'none'; }
}

// ==========================================
// غرفة المراسلة المشتركة 
// ==========================================
function sendChatMessage() {
    const input = document.getElementById('chat-input');
    if(!input.value.trim()) return;
    const chatBox = document.getElementById('chat-messages');
    chatBox.innerHTML += `<div style="background: #dcf8c6; padding: 10px; border-radius: 8px; max-width: 80%; align-self: flex-start;"><strong>أنت:</strong><br>${input.value}</div>`;
    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;
}
// ==========================================
// تحميل نموذج استيراد فارغ
// ==========================================
function exportTemplate() {
    let wb = XLSX.utils.book_new(); 
    
    // ترتيب الأعمدة تماماً كما طلبت وكما هي في قاعدة البيانات
    let ws_data = [
        [
            "رقم المعاملة", "تاريخ الاستلام", "عدد المستفيدين", "الفرع", 
            "نوع المعاملة", "المصدر", "المستلم", "المُسلّم", "الرقم العسكري", 
            "الرتبة", "الاسم", "الوحدة الرئيسية", "الوحدة الفرعية", "رابط الصورة", 
            "تاريخ الإضافة", "رقم الهاتف", "التاريخ الموجود في الاسفل", "الحالة", 
            "الملاحظات", "موضوع المذكرة", "النواقص", "اجراء"
        ]
    ];

    let ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    // جعل اتجاه الشيت من اليمين لليسار (RTL)
    ws['!dir'] = 'rtl';
    
    // توسيع عرض الأعمدة تلقائياً لتكون واضحة عند الطباعة أو الكتابة
    ws['!cols'] = ws_data[0].map(() => ({ wch: 18 })); 
    
    XLSX.utils.book_append_sheet(wb, ws, "نموذج_فارغ");
    XLSX.writeFile(wb, "نموذج_استيراد_معاملات.xlsx");
}
function applyPermissions() {
    const role = sessionStorage.getItem('user_role');
    const memoBtn = document.getElementById('nav-memo');
    const settingsBtn = document.getElementById('nav-settings'); // زر الإعدادات
    
    if (role !== 'مدير النظام') {
        if(memoBtn) memoBtn.style.display = 'none';
        if(settingsBtn) settingsBtn.style.display = 'none'; // إخفاء عن المندوب
        
        // إرجاع المندوب للشاشة الرئيسية إذا حاول التلاعب وفتح الأقسام المخفية
        if(document.getElementById('memo-tab').classList.contains('active-tab') || 
           document.getElementById('settings-tab').classList.contains('active-tab')) {
            showTab('scan-tab'); 
        }
    } else {
        if(memoBtn) memoBtn.style.display = 'inline-block';
        if(settingsBtn) settingsBtn.style.display = 'inline-block'; // إظهار للمدير
    }
}
// ==========================================
// ⚙️ إدارة المستخدمين من الواجهة (للمدير فقط)
// ==========================================
async function loadUsers() {
    document.getElementById('users-loading').style.display = 'block';
    document.getElementById('users-list').innerHTML = '';
    try {
        const result = await secureFetch({ action: 'get_users' });
        document.getElementById('users-loading').style.display = 'none';
        if(result.success) {
            let table = `<table class="report-table">
                <tr><th>الرقم</th><th>اسم المستخدم</th><th>الصلاحية</th><th>تغيير الصلاحية</th><th>حذف</th></tr>`;
            result.users.forEach((u, index) => {
                const rIndex = index + 2; // رقم الصف في جوجل شيت
                table += `<tr>
                    <td>${index + 1}</td>
                    <td><strong>${u.username}</strong></td>
                    <td>${u.role}</td>
                    <td>
                        <select onchange="changeUserRole(${rIndex}, this.value)" style="padding:5px; border-radius:4px; border: 1px solid #ccc;">
                            <option value="مندوب" ${u.role !== 'مدير النظام' ? 'selected' : ''}>مندوب</option>
                            <option value="مدير النظام" ${u.role === 'مدير النظام' ? 'selected' : ''}>مدير النظام</option>
                        </select>
                    </td>
                    <td>
                        <button onclick="deleteUser(${rIndex}, '${u.username}')" class="secondary-btn" style="background:#e74c3c; color:white; padding:5px 15px; border:none;">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
            });
            table += `</table>`;
            document.getElementById('users-list').innerHTML = table;
        }
    } catch(e) { document.getElementById('users-loading').style.display = 'none'; }
}

async function addUser() {
    const username = document.getElementById('new-username').value.trim();
    const password = document.getElementById('new-password').value.trim();
    const role = document.getElementById('new-role').value;
    const msg = document.getElementById('user-msg');
    
    if(!username || !password) return msg.innerText = "يرجى تعبئة اسم المستخدم وكلمة المرور.";
    if(password.length < 4) return msg.innerText = "كلمة المرور يجب أن تكون 4 رموز على الأقل.";
    
    msg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري إضافة المستخدم وتشفير الباسورد...';
    
    try {
        const result = await secureFetch({ action: 'add_user', newUsername: username, newPassword: password, newRole: role });
        if(result.success) {
            msg.style.color = "green";
            msg.innerHTML = `<i class="fa-solid fa-check"></i> تم إضافة المستخدم بنجاح.`;
            document.getElementById('new-username').value = '';
            document.getElementById('new-password').value = '';
            loadUsers();
        } else {
            msg.style.color = "red";
            msg.innerText = result.message;
        }
    } catch(e) { msg.style.color = "red"; msg.innerText = "حدث خطأ في الاتصال."; }
}

async function changeUserRole(rowIndex, newRole) {
    if(!confirm("هل أنت متأكد من تعديل صلاحية هذا المستخدم؟")) return loadUsers();
    try {
        const result = await secureFetch({ action: 'change_user_role', rowIndex: rowIndex, newRole: newRole });
        if(result.success) loadUsers();
        else alert("خطأ: " + result.message);
    } catch(e) { alert("حدث خطأ."); }
}

async function deleteUser(rowIndex, username) {
    if(!confirm(`هل أنت متأكد من حذف المستخدم ( ${username} ) نهائياً؟ لا يمكن التراجع عن هذا الإجراء!`)) return;
    try {
        const result = await secureFetch({ action: 'delete_user', rowIndex: rowIndex });
        if(result.success) loadUsers();
        else alert("خطأ: " + result.message);
    } catch(e) { alert("حدث خطأ."); }
}
