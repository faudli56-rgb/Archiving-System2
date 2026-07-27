// =========================================================================
// نظام الأرشفة العسكرية - ملف البرمجة (JavaScript)
// =========================================================================

// --- إعدادات النظام ---
// ⚠️ هام جداً: ضع هنا رابط تطبيق الويب (Web App URL) الذي نسخته من Google Apps Script في الخطوة الأولى
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbypNxrpZWpyIpgde0Lgz27BCc8j2tZLBUVYxHcLkSRynt38vm48NvNe4QD_WzUqh24/exec';

let currentExtractedData = null; // لتخزين البيانات مؤقتاً لمشاركتها عبر الواتساب

// =========================================================================
// 1. التنقل بين الشاشات والتبويبات
// =========================================================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active-screen');
    });
    document.getElementById(screenId).classList.add('active-screen');
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active-tab');
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabId).classList.add('active-tab');
    event.currentTarget.classList.add('active');

    // إذا تم فتح تبويب الإحصائيات، قم بتحديث الأرقام تلقائياً
    if (tabId === 'stats-tab') loadStats();
}

// =========================================================================
// 2. نظام تسجيل الدخول
// =========================================================================
async function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');

    if (!user || !pass) {
        errorMsg.innerText = "يرجى إدخال اسم المستخدم وكلمة المرور.";
        return;
    }

    errorMsg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحقق...';

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'login', username: user, password: pass }),
        });
        const result = await response.json();

        if (result.success) {
            errorMsg.innerText = "";
            showScreen('app-section');
        } else {
            errorMsg.innerText = result.message || "بيانات الدخول غير صحيحة.";
        }
    } catch (error) {
        errorMsg.innerText = "حدث خطأ في الاتصال بالخادم. تأكد من رابط السكربت.";
    }
}

function logout() {
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    showScreen('login-section');
}

// =========================================================================
// 3. التقاط الصورة ومعالجتها (Base64)
// =========================================================================
let imageBase64Data = "";

function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('image-preview');
            preview.src = e.target.result;
            preview.style.display = 'block';
            imageBase64Data = e.target.result; // تجهيز الصورة للإرسال
            document.getElementById('process-btn').style.display = 'block';
            document.getElementById('result-box').style.display = 'none';
        }
        reader.readAsDataURL(file);
    }
}

async function processDocument() {
    if (!imageBase64Data) {
        alert("يرجى التقاط أو اختيار صورة للمستند أولاً.");
        return;
    }

    document.getElementById('process-btn').style.display = 'none';
    document.getElementById('loading-spinner').style.display = 'block';

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'process_document', imageBase64: imageBase64Data }),
        });
        
        const result = await response.json();
        document.getElementById('loading-spinner').style.display = 'none';

        if (result.success) {
            currentExtractedData = result.data; // حفظ البيانات لزر الواتساب
            document.getElementById('result-box').style.display = 'block';
            
            // تفعيل زر المشاركة عبر الواتساب
            document.getElementById('whatsapp-btn').onclick = shareViaWhatsApp;
            
            alert("تم استخراج البيانات، حفظ الصورة، وتحديث الشيت بنجاح!");
        } else {
            alert("خطأ أثناء التحليل: " + result.message);
            document.getElementById('process-btn').style.display = 'block';
        }
    } catch (error) {
        alert("حدث خطأ في الاتصال بالخادم.");
        document.getElementById('loading-spinner').style.display = 'none';
        document.getElementById('process-btn').style.display = 'block';
    }
}

// =========================================================================
// 4. المشاركة التلقائية عبر الواتساب
// =========================================================================
function shareViaWhatsApp() {
    if (!currentExtractedData) return;

    // تنسيق النص بشكل احترافي للواتساب
    let text = `*بيانات المعاملة العسكرية*\n`;
    text += `===================\n`;
    text += `*رقم المعاملة:* ${currentExtractedData.transaction_number || 'غير متوفر'}\n`;
    text += `*تاريخ الاستلام:* ${currentExtractedData.receipt_date || 'غير متوفر'}\n`;
    text += `*الفرع:* ${currentExtractedData.branch || 'غير متوفر'}\n`;
    text += `*نوع المعاملة:* ${currentExtractedData.transaction_type || 'غير متوفر'}\n`;
    text += `*المستلم:* ${currentExtractedData.receiver || 'غير متوفر'}\n`;
    text += `*المُسلّم:* ${currentExtractedData.deliverer || 'غير متوفر'}\n`;
    text += `\n*بيانات الأفراد المرفقة:*\n`;
    
    currentExtractedData.individuals.forEach((ind, index) => {
        text += `${index + 1}- ${ind.rank} / ${ind.name}\n(الرقم العسكري: ${ind.military_number})\n`;
    });

    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
}

// =========================================================================
// 5. البحث في الأرشيف
// =========================================================================
async function searchRecords() {
    const query = document.getElementById('search-query').value;
    if (!query) {
        alert("يرجى إدخال اسم أو رقم للبحث.");
        return;
    }

    document.getElementById('search-loading').style.display = 'block';
    document.getElementById('search-results').innerHTML = '';

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'search', query: query }),
        });
        
        const result = await response.json();
        document.getElementById('search-loading').style.display = 'none';

        if (result.success && result.results.length > 0) {
            let html = '';
            result.results.forEach(record => {
                html += `
                <div class="result-card">
                    <h4><i class="fa-solid fa-user-shield"></i> ${record['الاسم']}</h4>
                    <p><strong>الرتبة:</strong> ${record['الرتبة']}</p>
                    <p><strong>الرقم العسكري:</strong> ${record['الرقم العسكري']}</p>
                    <p><strong>رقم المعاملة:</strong> ${record['رقم المعاملة']}</p>
                    <a href="${record['رابط الصورة']}" target="_blank" class="secondary-btn" style="display:inline-block; margin-top:10px; text-align:center; text-decoration:none;">
                        <i class="fa-solid fa-image"></i> عرض المستند الأصلي
                    </a>
                </div>`;
            });
            document.getElementById('search-results').innerHTML = html;
        } else {
            document.getElementById('search-results').innerHTML = '<p style="text-align:center; color:#666;">لم يتم العثور على نتائج مطابقة.</p>';
        }
    } catch (error) {
        document.getElementById('search-loading').style.display = 'none';
        alert("حدث خطأ أثناء البحث.");
    }
}

// =========================================================================
// 6. تحميل الإحصائيات للوحة التحكم
// =========================================================================
async function loadStats() {
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'stats' }),
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('stat-today').innerText = result.stats.today;
            document.getElementById('stat-month').innerText = result.stats.month;
            document.getElementById('stat-total').innerText = result.stats.total;
        }
    } catch (error) {
        console.error("تعذر جلب الإحصائيات", error);
    }
}
