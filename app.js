// ⚠️ هام: ضع هنا رابط تطبيق الويب (Web App URL) الخاص بك
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbypNxrpZWpyIpgde0Lgz27BCc8j2tZLBUVYxHcLkSRynt38vm48NvNe4QD_WzUqh24/exec';

let currentExtractedData = null; 
let imageBase64Data = "";

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active-screen'));
    document.getElementById(screenId).classList.add('active-screen');
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active-tab'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active-tab');
    event.currentTarget.classList.add('active');
    if (tabId === 'stats-tab') loadStats();
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
    } catch (error) { errorMsg.innerText = "خطأ في الاتصال بالخادم."; }
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

// 1. تحليل الصورة وعرض المعاينة
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

function renderEditForm(data) {
    const ind = (data.individuals && data.individuals[0]) ? data.individuals[0] : {};
    
    let html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="input-group"><input type="text" id="edit-trans-num" value="${data.transaction_number || ''}" placeholder="رقم المعاملة"></div>
            <div class="input-group"><input type="text" id="edit-date" value="${data.receipt_date || ''}" placeholder="تاريخ الاستلام"></div>
            
            <div class="input-group"><input type="text" id="edit-ben-count" value="${data.beneficiaries_count || ''}" placeholder="عدد المستفيدين"></div>
            <div class="input-group"><input type="text" id="edit-branch" value="${data.branch || ''}" placeholder="الفرع"></div>
            
            <div class="input-group"><input type="text" id="edit-type" value="${data.transaction_type || ''}" placeholder="نوع المعاملة"></div>
            <div class="input-group"><input type="text" id="edit-source" value="${data.source || ''}" placeholder="المصدر"></div>
            
            <div class="input-group"><input type="text" id="edit-receiver" value="${data.receiver || ''}" placeholder="المستلم"></div>
            <div class="input-group"><input type="text" id="edit-deliverer" value="${data.deliverer || ''}" placeholder="المُسلّم"></div>
            
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

// اعتماد البيانات بعد التعديل وحفظها
async function saveEditedData() {
    document.getElementById('edit-preview-section').style.display = 'none';
    document.getElementById('loading-spinner').style.display = 'block';

    // تحديث الكائن بكافة البيانات من المربعات
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
            alert("تم حفظ البيانات بنجاح!");
        } else {
            alert("خطأ أثناء الحفظ: " + result.message);
            document.getElementById('edit-preview-section').style.display = 'block';
        }
    } catch (error) { alert("حدث خطأ."); }
}
function formatWhatsAppText(data) {
    let text = `*بيانات المعاملة العسكرية*\n===================\n`;
    text += `*رقم المعاملة:* ${data.transaction_number || data['رقم المعاملة'] || 'غير متوفر'}\n`;
    text += `*التاريخ:* ${data.receipt_date || data['تاريخ الاستلام'] || 'غير متوفر'}\n`;
    text += `*نوع المعاملة:* ${data.transaction_type || data['نوع المعاملة'] || 'غير متوفر'}\n`;
    text += `*الاسم:* ${data.individuals ? data.individuals[0].name : (data['الاسم'] || 'غير متوفر')}\n`;
    const milNum = data.individuals ? data.individuals[0].military_number : (data['الرقم العسكري'] || '');
    if(milNum) text += `*الرقم العسكري:* ${milNum}\n`;
    return encodeURIComponent(text);
}

function shareViaWhatsApp() {
    if (!currentExtractedData) return;
    window.open(`https://wa.me/?text=${formatWhatsAppText(currentExtractedData)}`, '_blank');
}

function shareSearchViaWhatsApp(encodedData) {
    const data = JSON.parse(decodeURIComponent(encodedData));
    window.open(`https://wa.me/?text=${formatWhatsAppText(data)}`, '_blank');
}

// 3. البحث
async function searchRecords() {
    const query = document.getElementById('search-query').value;
    if (!query) return alert("يرجى إدخال مصطلح للبحث.");
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
                    <p><strong>الرقم العسكري:</strong> ${record['الرقم العسكري']}</p>
                    <p><strong>رقم المعاملة:</strong> ${record['رقم المعاملة']}</p>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <button onclick="shareSearchViaWhatsApp('${encodedRecord}')" class="whatsapp-btn" style="margin-top:0; padding:8px;"><i class="fa-brands fa-whatsapp"></i> مشاركة</button>
                        <a href="${record['رابط الصورة']}" target="_blank" class="secondary-btn" style="text-align:center; text-decoration:none; padding:8px;">عرض المستند</a>
                    </div>
                </div>`;
            });
            document.getElementById('search-results').innerHTML = html;
        } else { document.getElementById('search-results').innerHTML = '<p>لم يتم العثور على نتائج.</p>'; }
    } catch (error) { document.getElementById('search-loading').style.display = 'none'; }
}

// 4. الإحصائيات والتقارير
async function loadStats() {
    fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'stats' }) })
    .then(res => res.json()).then(result => {
        if (result.success) {
            document.getElementById('stat-today').innerText = result.stats.today;
            document.getElementById('stat-month').innerText = result.stats.month;
            document.getElementById('stat-total').innerText = result.stats.total;
        }
    });
}

async function getReport(type) {
    document.getElementById('report-results').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري استخراج التقرير...';
    try {
        const response = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'report', type: type }) });
        const result = await response.json();
        if (result.success && result.data.length > 0) {
            let table = `<table class="report-table">
                <tr><th>رقم المعاملة</th><th>نوع المعاملة</th><th>اسم الشخص</th><th>تاريخ المعاملة</th></tr>`;
            result.data.forEach(row => {
                table += `<tr><td>${row['رقم المعاملة']}</td><td>${row['نوع المعاملة']}</td><td>${row['الاسم']}</td><td>${row['تاريخ الاستلام']}</td></tr>`;
            });
            table += `</table>`;
            document.getElementById('report-results').innerHTML = table;
        } else {
            document.getElementById('report-results').innerHTML = '<p>لا توجد بيانات لهذه الفترة.</p>';
        }
    } catch (e) { document.getElementById('report-results').innerHTML = 'خطأ في جلب التقرير.'; }
}

// 5. المذكرات الصادرة والذكاء الاصطناعي
async function refineMemo() {
    const text = document.getElementById('memo-body').value;
    if(!text) return alert('يرجى كتابة نص المذكرة أولاً.');
    
    document.getElementById('memo-loading').style.display = 'block';
    document.getElementById('ai-feedback').style.display = 'none';
    
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST', body: JSON.stringify({ action: 'refine_memo', text: text })
        });
        const result = await response.json();
        document.getElementById('memo-loading').style.display = 'none';
        
        if (result.success) {
            document.getElementById('memo-body').value = result.refinedText;
            document.getElementById('ai-details').innerText = result.changesDetails;
            document.getElementById('ai-feedback').style.display = 'block';
        } else { alert('خطأ من الذكاء الاصطناعي: ' + result.message); }
    } catch (e) { document.getElementById('memo-loading').style.display = 'none'; alert('فشل الاتصال.'); }
}

async function exportMemo() {
    const to = document.getElementById('memo-to').value;
    const subject = document.getElementById('memo-subject').value;
    const body = document.getElementById('memo-body').value;
    if(!to || !subject || !body) return alert('يرجى تعبئة جميع الحقول.');

    document.getElementById('memo-loading').style.display = 'block';
    document.getElementById('memo-links').style.display = 'none';

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST', body: JSON.stringify({ action: 'export_memo', to: to, subject: subject, body: body })
        });
        const result = await response.json();
        document.getElementById('memo-loading').style.display = 'none';
        
        if (result.success) {
            document.getElementById('memo-links').innerHTML = `
                <a href="${result.pdfUrl}" target="_blank" class="primary-btn" style="text-decoration:none; text-align:center; background-color:#e74c3c;">تحميل PDF</a>
                <a href="${result.wordUrl}" target="_blank" class="primary-btn" style="text-decoration:none; text-align:center; background-color:#2980b9;">تحميل Word</a>
            `;
            document.getElementById('memo-links').style.display = 'flex';
        } else { alert('خطأ أثناء التصدير: ' + result.message); }
    } catch (e) { document.getElementById('memo-loading').style.display = 'none'; }
}
