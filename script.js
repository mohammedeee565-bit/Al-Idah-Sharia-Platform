// =============================================
// 🔒 نظام حماية متقدم - منصة الإيضاح (النسخة النهائية)
// =============================================
(function() {
        'use strict';

        // =============================================
        // 🛡️ نظام حماية Console المتقدم
        // =============================================
        const _0xDevMode = {
            active: false,
            secretKey: 'ALIDAH_DEV_2026',
            checkInterval: null,

            activate: function() {
                this.active = true;
                if (this.checkInterval) {
                    clearInterval(this.checkInterval);
                    this.checkInterval = null;
                }
            },

            protect: function() {
                const self = this;

                document.addEventListener('keydown', function(e) {
                    if (self.active) return;

                    if (e.key === 'F12' ||
                        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
                        (e.ctrlKey && (e.key === 'U' || e.key === 'u')) ||
                        (e.ctrlKey && e.shiftKey && (e.key === 'K' || e.key === 'k'))) {
                        e.preventDefault();
                        self._showWarning();
                        return false;
                    }
                });

                document.addEventListener('contextmenu', function(e) {
                    if (self.active) return;
                    e.preventDefault();
                    self._showWarning();
                    return false;
                });

                self.checkInterval = setInterval(function() {
                    if (self.active) return;

                    const start = performance.now();
                    debugger;
                    const end = performance.now();

                    if (end - start > 100) {
                        self._blockSite();
                    }
                }, 1000);

                const devtools = { open: false };
                const element = new Image();
                Object.defineProperty(element, 'id', {
                    get: function() {
                        if (!self.active) {
                            self._blockSite();
                        }
                    }
                });

                setInterval(function() {
                    if (!self.active) {
                        console.log('%c', element);
                    }
                }, 500);
            },

            _showWarning: function() {
                alert('⛔ عذراً، هذه الميزة معطلة لأسباب أمنية');
            },

            _blockSite: function() {
                document.body.innerHTML = `
                <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:#0a0e14;display:flex;align-items:center;justify-content:center;flex-direction:column;z-index:999999;">
                    <h1 style="color:#ef4444;font-size:48px;font-family:'Tajawal',sans-serif;margin-bottom:20px;">⛔ تم اكتشاف محاولة اختراق</h1>
                    <p style="color:#8b95a5;font-size:24px;font-family:'Tajawal',sans-serif;">عذراً، لا يمكنك الوصول إلى هذا المحتوى</p>
                </div>
            `;
                throw new Error('Security violation');
            }
        };

        _0xDevMode.protect();

        // =============================================
        // 🔐 إعدادات Firebase
        // =============================================
        const firebaseConfig = {
            apiKey: "AIzaSyCTZCt9aKNXPvOdx9g3p7RH4",
            authDomain: "alidah-99472.firebaseapp.com",
            projectId: "alidah-99472",
            storageBucket: "alidah-99472.firebasestorage.app",
            messagingSenderId: "696531426179",
            appId: "1:696531426179:web:7b2176188682adace2b4b6",
            measurementId: "G-HLC65V979V"
        };

        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();
        // ✅ لا نبتلع خطأ التخزين المؤقت بصمت - نسجّله حتى نعرف إن كان متعذراً
        db.enablePersistence({synchronizeTabs:true}).catch(function(e){
            console.warn('[Firestore] تعذر تفعيل التخزين المؤقت (سيستمر العمل بدونه):', (e && e.code) ? e.code : e);
        });
        const contentRef = db.collection("platform").doc("data");
        const studentsRef = db.collection("students");
        const resultsRef = db.collection("results");
        const virtualClassesRef = db.collection("virtualClasses");
        let _0xContentUnsub = null, _0xStudentUnsub = null, _0xResultUnsub = null;
        let _vcAdminUnsub = null, _vcStudentUnsub = null, _vcStudentSubKey = "";
        let _vcStudentClassesCache = [];

        // =============================================
        // 🔑 مصادقة Firebase المجهولة (Anonymous Auth)
        // هامة جداً: إذا كانت قواعد Firestore تتطلب request.auth != null للكتابة،
        // فهذه المصادقة تمنح المستخدم هوية مجهولة موثّقة تُمكّنه من الكتابة.
        // لا تكسر تسجيل دخول الإدارة (المحلي) ولا تسجيل الطلاب (Firestore).
        // =============================================
        let _0xAuthReady = false;
        let _0xAuthReadyPromise;
        try {
            _0xAuthReadyPromise = firebase.auth().signInAnonymously().then(function(cred){
                _0xAuthReady = true;
                console.log('[Auth] تمت المصادقة المجهولة بنجاح، uid:', cred && cred.user && cred.user.uid);
            }).catch(function(e){
                // لا نُسقط الصفحة - نُسجّل التحذير فقط. الكتابة ستحاول مع ذلك.
                console.warn('[Auth] تعذرت المصادقة المجهولة:', (e && e.code) ? e.code : e,
                    '\nإذا كانت قواعد Firestore تتطلب auth، فعليك تفعيل Anonymous من Firebase Console.');
            });
        } catch(e) {
            console.warn('[Auth] تعذر بدء المصادقة المجهولة:', e);
            _0xAuthReadyPromise = Promise.resolve();
        }

        // دالة تنتظر اكتمال المصادقة مع مهلة قصوى حتى لا تُعلّق العمليات
        async function _0xWaitForAuth(timeoutMs){
            if (_0xAuthReady) return true;
            timeoutMs = timeoutMs || 4000;
            try {
                await Promise.race([
                    _0xAuthReadyPromise,
                    new Promise(function(_, reject){ setTimeout(function(){ reject(new Error('auth-timeout')); }, timeoutMs); })
                ]);
            } catch(e){
                console.warn('[Auth] تجاوز مهلة انتظار المصادقة، سنحاول الكتابة على أي حال:', e);
            }
            return _0xAuthReady;
        }

        const _0xSec = {
            s1: [0x4b, 0x7e, 0x2a, 0x9f, 0x3c, 0x1d, 0x8b, 0x5e],
            s2: [0x6f, 0x3a, 0xc2, 0x4d, 0x9e, 0x7b, 0x1f, 0x5c],

            h1: "b310c94ebd4a386786bd0b36c2a0249966b275f5c2ee053b09f298029cbc137d",
            h2: "242bddda8a716b517444fd2f89d025663fe44a3e9344de89a1f4e723303fda68",

            iter: 100000
        };

        // =============================================
        async function _0xHash(password, saltArray) {
            const encoder = new TextEncoder();
            const passwordBuffer = encoder.encode(password);
            const saltBuffer = new Uint8Array(saltArray);

            const keyMaterial = await crypto.subtle.importKey(
                'raw', passwordBuffer, 'PBKDF2', false, ['deriveBits']
            );

            const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBuffer, iterations: _0xSec.iter, hash: 'SHA-256' },
                keyMaterial, 256
            );

            return Array.from(new Uint8Array(derivedBits))
                .map(b => b.toString(16).padStart(2, '0')).join('');
        }

        async function _0xCheck1(password) {
            try {
                return await _0xHash(password, _0xSec.s1) === _0xSec.h1;
            } catch { return false; }
        }

        async function _0xCheck2(password) {
            try {
                return await _0xHash(password, _0xSec.s2) === _0xSec.h2;
            } catch { return false; }
        }

        // =============================================
        // 🛡️ حماية XSS
        // =============================================
        function _0xSanitize(input) {
            if (typeof input !== 'string') return '';
            const div = document.createElement('div');
            div.textContent = input;
            return div.innerHTML;
        }

        // ✅ تحويل نوع المحتوى إلى اسم الحقل الصحيح في Firestore
        // مهم: "quiz" → "quizzes" (مش "quizs" لأن جمع quiz غير منتظم)
        // ده كان سبب الخطأ الأصلي: Cannot read properties of undefined (reading 'push')
        function _0xTypeToField(type) {
            const map = { book: 'books', video: 'videos', quiz: 'quizzes' };
            return map[type] || null;
        }

        // ✅ انتقال لأعلى الصفحة عند التنقل بين الأقسام/Views
        // مهم: نطبّقها بعد ما يتعرض المحتوى الجديد عشان الـ scroll يكون على المحتوى الصح
        // نستخدم 'auto' لسرعة + 'start' لضمان البداية. ولا نؤثر على Modals/التمرير الداخلي للقوائم.
        function _0xScrollTop() {
            try {
                window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                // ضمان إضافي للمتصفحات اللي قد لا تنفذ options object
                if (typeof window.scrollTo === 'function') {
                    window.scrollTo(0, 0);
                }
            } catch(e) { /* تجاهل */ }
        }

        function _0xValidateURL(url) {
            if (typeof url !== 'string') return false;
            try { const u = new URL(url.trim()); return (u.protocol === 'https:' || u.protocol === 'http:') && !!u.hostname; } catch { return false; }
        }
        function _0xValidateVideoURL(url) {
            if (!_0xValidateURL(url)) return false;
            try { const host = new URL(url).hostname.toLowerCase(); return host === 'youtube.com' || host === 'www.youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com'); } catch { return false; }
        }

        // =============================================
        // 📊 المتغيرات
        // =============================================
        let _0xData = {};
        let _0xView = 'home';
        let _0xGrade = null;
        let _0xSubject = null;
        let _0xLoggedIn = false;
        let _0xAdminEmail = null; // ✅ الإيميل/الحساب المتحقق منه لحساب الأدمن الحالي
        let _0xStep = 1;
        let _0xAttempts = 0;
        const _0xMaxAttempts = 5;
        let _0xLocked = false;
        let _0xLockTime = 0;
        let _0xAdminStudents = [];
    let _0xAdminResults = [];
    const _0xUserRoleKey = 'alidahUserRole';
    let _0xSelectedStudentGrade = 'الصف الأول الإعدادي';
    let _0xSelectedResultsGrade = 'الصف الأول الإعدادي';
    let _0xSelectedResultsQuiz = '';
        let _0xCurrentStudentReport = null;

        // ✅ قفل عام لمنع النشر المتكرر (double-click / re-entry)
        let _0xIsPublishing = false;
        // ✅ قائمة العناصر قيد النشر لحماية onSnapshot من حذفها قبل تأكيد الخادم
        let _0xPendingPublish = [];

        // =============================================
        // 📚 الصفوف والمواد
        // =============================================
        const _0xGrades = [
            "الصف الأول الإعدادي", "الصف الثاني الإعدادي", "الصف الثالث الإعدادي",
            "الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"
        ];

        const _0xSubjects = {
            "الصف الأول الإعدادي": ["الفقه", "التوحيد", "التفسير", "الحديث", "السيرة"],
            "الصف الثاني الإعدادي": ["الفقه", "التوحيد", "التفسير", "الحديث", "السيرة"],
            "الصف الثالث الإعدادي": ["الفقه", "التوحيد", "التفسير", "الحديث", "السيرة", "علم الميراث"],
            "الصف الأول الثانوي": ["الفقه", "التوحيد", "التفسير", "الحديث"],
            "الصف الثاني الثانوي": ["الفقه", "التوحيد", "التفسير", "الحديث"],
            "الصف الثالث الثانوي": ["الفقه", "التوحيد", "التفسير", "الحديث", "علم الميراث"]
        };

        // =============================================
        // 🎨 الأيقونات
        // =============================================
        const _0xIcons = {
            book: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
            video: '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
            play: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>',
            quiz: '<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
            arrow: '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>',
            home: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
            graduate: '<svg viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
            tafseer: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/></svg>',
            external: '<svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
            link: '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
        };

        // =============================================
        // 🔧 العناصر
        // =============================================
        const $ = id => document.getElementById(id);
        const _0xE = {
            main: $('main-content'),
            breadcrumb: $('breadcrumb'),
            loading: $('loading-screen'),
            scrollTop: $('scroll-top'),
            particles: $('particles'),
            loginModal: $('login-modal'),
            adminModal: $('admin-modal'),
            pwd1: $('password1-input'),
            pwd2: $('password2-input'),
            err1: $('login-error-1'),
            err2: $('login-error-2'),
            adminBtn: $('admin-header-btn'),
            loginClose: $('login-close'),
            adminClose: $('admin-close'),
            nextBtn: $('next-btn'),
            loginBtn: $('login-btn'),
            saveBtn: $('save-btn'),
            gradeSel: $('grade-select'),
            subjectSel: $('subject-select'),
            typeSel: $('type-select'),
            linkIn: $('link-input'),
            titleIn: $('title-input'),
            success: $('admin-success'),
            adminError: $('admin-error'),
            links: $('current-links'),
            linkGroup: $('link-group'), durationGroup: $('duration-group'), duration: $('quiz-duration'), builder: $('question-builder'),
            studentsList: $('students-list'), resultsList: $('results-list'), studentsCount: $('students-count'), activeStudentsCount: $('active-students-count'), blockedStudentsCount: $('blocked-students-count'), studentsSearch: $('students-search'), exportStudentsPdf: $('export-students-pdf'), studentGradeTabs: $('student-grade-tabs'), studentGradeSummary: $('student-grade-summary'), resultsGradeTabs: $('results-grade-tabs'), resultsGradeSummary: $('results-grade-summary'), resultsQuizTabs: $('results-quiz-tabs'), resultsQuizSummary: $('results-quiz-summary'), studentReportModal: $('student-report-modal'), studentReportClose: $('student-report-close'), studentReportContent: $('student-report-content'), studentReportPdf: $('student-report-pdf'),
            studentModal: $('student-modal'), studentName: $('student-name'), studentPhone: $('student-phone'), studentError: $('student-error'), studentSave: $('student-save'),
            studentGrade: $('student-grade'), studentYear: $('student-year'),
            blockedModal: $('blocked-modal'), blockedRetry: $('blocked-retry'),
            settingsYear: $('settings-year'), settingsStartMonth: $('settings-start-month'), settingsPassPercent: $('settings-pass-percent'), saveSettingsBtn: $('save-settings-btn'), settingsSuccess: $('settings-success'),
            cleanupYear: $('cleanup-year'), cleanupBtn: $('cleanup-btn'), cleanupSuccess: $('cleanup-success'),
            supervisorsCount: $('supervisors-count'), supervisorsList: $('supervisors-list'),
            vcGrade:$('vc-grade'), vcSubject:$('vc-subject'), vcTitle:$('vc-title'), vcDatetime:$('vc-datetime'), vcDuration:$('vc-duration'), vcMeetingUrl:$('vc-meeting-url'), vcStudentSearch:$('vc-student-search'), vcStudentPicker:$('vc-student-picker'), vcSelectAll:$('vc-select-all'), vcSelectedCount:$('vc-selected-count'), vcRecordEnabled:$('vc-record-enabled'), vcSave:$('vc-save'), vcFormStatus:$('vc-form-status'), vcAdminList:$('vc-admin-list'),
            resetPlatformBtn: $('reset-platform-btn'), resetPlatformStatus: $('reset-platform-status'),
            videoModal: $('video-modal'), videoFrame: $('video-frame'), videoTitle: $('video-title'), videoClose: $('video-close'),
            quizModal: $('quiz-modal'), quizTitle: $('quiz-title'), quizSubject: $('quiz-subject-label'), quizTimer: $('quiz-timer'), quizBody: $('quiz-body'), quizSubmit: $('quiz-submit'), quizResult: $('quiz-result'), themeToggle: $('theme-toggle'),
            adminEmail: $('admin-email-input'), adminLogout: $('admin-logout'),
            step1: $('step-1'),
            step2: $('step-2'),
            dot1: $('step-dot-1'),
            dot2: $('step-dot-2')
        };

        // =============================================
        // 📅 نظام السنة الدراسية + المراحل
        // =============================================
        // مراحل الصفوف (لمعرفة تسلسل التقدم)
        const _0xStages = {
            "الصف الأول الإعدادي": "إعدادي",
            "الصف الثاني الإعدادي": "إعدادي",
            "الصف الثالث الإعدادي": "إعدادي",
            "الصف الأول الثانوي": "ثانوي",
            "الصف الثاني الثانوي": "ثانوي",
            "الصف الثالث الثانوي": "ثانوي"
        };
        // ترتيب الصفوف داخل كل مرحلة (للتحكم في القفل والتقدم)
        const _0xStageOrder = {
            "إعدادي": ["الصف الأول الإعدادي", "الصف الثاني الإعدادي", "الصف الثالث الإعدادي"],
            "ثانوي": ["الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"]
        };

        // مرجع إعدادات النظام (يحوي السنة الدراسية الحالية وشهر البداية ونسبة النجاح)
        const settingsRef = db.collection("platform").doc("settings");

        // الإعدادات الافتراضية تُستخدم حتى تُقرأ من Firestore
        let _0xSettings = {
            currentYear: _0xComputeCurrentYear(8),   // افتراضياً تبدأ السنة في أغسطس
            startMonth: 8,
            passPercent: 50
        };
        let _0xSettingsUnsub = null;

        // حساب السنة الدراسية الحالية حسب شهر البداية
        // مثال: لو startMonth=8 (أغسطس)، فمن أغسطس 2026 ليوليو 2027 تكون "2026/2027"
        function _0xComputeCurrentYear(startMonth){
            startMonth = Number(startMonth) || 8;
            const now = new Date();
            const y = now.getFullYear();
            const m = now.getMonth() + 1; // 1-12
            if (m >= startMonth) {
                return y + '/' + (y + 1);
            } else {
                return (y - 1) + '/' + y;
            }
        }

        // قراءة إعدادات النظام من Firestore عند بدء التطبيق
        async function _0xLoadSettings(){
            try {
                const snap = await settingsRef.get();
                if (snap.exists && snap.data()) {
                    const d = snap.data();
                    _0xSettings.currentYear = d.currentYear || _0xComputeCurrentYear(d.startMonth || 8);
                    _0xSettings.startMonth = Number(d.startMonth) || 8;
                    _0xSettings.passPercent = (Number.isFinite(Number(d.passPercent)) && d.passPercent >= 30 && d.passPercent <= 90) ? Number(d.passPercent) : 50;
                } else {
                    // أول مرة: نكتب الإعدادات الافتراضية
                    await settingsRef.set({
                        currentYear: _0xSettings.currentYear,
                        startMonth: _0xSettings.startMonth,
                        passPercent: _0xSettings.passPercent,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }
            } catch(e) {
                console.warn('[Settings] تعذر قراءة إعدادات النظام، سنستخدم الافتراضية:', (e && e.code) ? e.code : e);
            }
        }

        // حفظ إعدادات النظام من لوحة الإدارة
        async function _0xSaveSettings(){
            if (!_0xLoggedIn) { alert('يجب تسجيل دخول الإدارة أولاً.'); return; }
            const year = String(_0xE.settingsYear.value || '').trim();
            const sm = parseInt(_0xE.settingsStartMonth.value, 10);
            const pp = parseInt(_0xE.settingsPassPercent.value, 10);
            if (!year || !/^\d{4}\/\d{4}$/.test(year)) {
                alert('صيغة السنة غير صحيحة. استخدم الصيغة: 2026/2027');
                return;
            }
            if (!(sm >= 1 && sm <= 12)) { alert('شهر بداية السنة يجب أن يكون بين 1 و 12.'); return; }
            if (!(pp >= 30 && pp <= 90)) { alert('نسبة النجاح يجب أن تكون بين 30 و 90.'); return; }
            const oldText = _0xE.saveSettingsBtn.textContent;
            _0xE.saveSettingsBtn.disabled = true;
            _0xE.saveSettingsBtn.textContent = 'جاري الحفظ...';
            try {
                await settingsRef.set({
                    currentYear: year,
                    startMonth: sm,
                    passPercent: pp,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                _0xSettings.currentYear = year;
                _0xSettings.startMonth = sm;
                _0xSettings.passPercent = pp;
                _0xE.settingsSuccess.textContent = '✅ تم حفظ الإعدادات بنجاح.';
                _0xE.settingsSuccess.classList.add('show');
                setTimeout(() => _0xE.settingsSuccess.classList.remove('show'), 3000);
            } catch(e) {
                console.error('[Settings] خطأ حفظ الإعدادات:', e);
                alert('تعذر حفظ الإعدادات:\n' + _0xFriendlyError(e));
            } finally {
                _0xE.saveSettingsBtn.disabled = false;
                _0xE.saveSettingsBtn.textContent = oldText;
            }
        }

        // مراقبة لحظية لإعدادات النظام (عندما يحدّث الأدمن السنة، ينعكس فوراً)
        function _0xSubscribeSettings(){
            if (_0xSettingsUnsub) return;
            _0xSettingsUnsub = settingsRef.onSnapshot(function(s){
                if (s.exists && s.data()) {
                    const d = s.data();
                    _0xSettings.currentYear = d.currentYear || _0xComputeCurrentYear(d.startMonth || 8);
                    _0xSettings.startMonth = Number(d.startMonth) || 8;
                    _0xSettings.passPercent = (Number.isFinite(Number(d.passPercent)) && d.passPercent >= 30 && d.passPercent <= 90) ? Number(d.passPercent) : 50;
                    // تحديث حقول الإدارة إن كانت مفتوحة
                    if (_0xE.settingsYear) _0xE.settingsYear.value = _0xSettings.currentYear;
                    if (_0xE.settingsStartMonth) _0xE.settingsStartMonth.value = _0xSettings.startMonth;
                    if (_0xE.settingsPassPercent) _0xE.settingsPassPercent.value = _0xSettings.passPercent;
                    // تحديث حقل السنة في نموذج الطالب
                    if (_0xE.studentYear) _0xE.studentYear.value = _0xSettings.currentYear;
                }
            }, function(e){
                console.error('[Settings] خطأ الاستماع:', e);
            });
        }

        // =============================================
        // 🧹 تنظيف بيانات السنوات القديمة (Admin-only)
        // =============================================
        async function _0xCleanupOldYear(){
            if (!_0xLoggedIn) { alert('يجب تسجيل دخول الإدارة أولاً.'); return; }
            const year = String(_0xE.cleanupYear.value || '').trim();
            if (!year || !/^\d{4}\/\d{4}$/.test(year)) {
                alert('صيغة السنة غير صحيحة. استخدم: 2024/2025');
                return;
            }
            if (year === _0xSettings.currentYear) {
                alert('لا يمكن حذف بيانات السنة الدراسية الحالية النشطة (' + year + ').');
                return;
            }
            const confirm1 = confirm('⚠️ تحذير\n\nهل أنت متأكد من حذف جميع سجلات الطلاب والنتائج المرتبطة بالسنة الدراسية: ' + year + '؟\n\nسيتم حذف البيانات نهائياً ولا يمكن التراجع.');
            if (!confirm1) return;
            const confirm2 = confirm('تأكيد نهائي:\n\nحذف كل سجلات سنة ' + year + '؟\n(الطلاب والنتائج المرتبطة بهذه السنة فقط)');
            if (!confirm2) return;

            const oldText = _0xE.cleanupBtn.textContent;
            _0xE.cleanupBtn.disabled = true;
            _0xE.cleanupBtn.textContent = 'جاري الحذف...';
            let deletedStudents = 0, deletedResults = 0;
            try {
                // حذف سجلات الطلاب المرتبطة بهذه السنة
                const studSnap = await studentsRef.where('academicYear', '==', year).get();
                const batch1 = db.batch();
                studSnap.forEach(function(d){ batch1.delete(d.ref); });
                if (studSnap.size > 0) await batch1.commit();
                deletedStudents = studSnap.size;

                // حذف النتائج المرتبطة بهذه السنة
                const resSnap = await resultsRef.where('academicYear', '==', year).get();
                const batch2 = db.batch();
                resSnap.forEach(function(d){ batch2.delete(d.ref); });
                if (resSnap.size > 0) await batch2.commit();
                deletedResults = resSnap.size;

                _0xE.cleanupSuccess.textContent = '✅ تم الحذف: ' + deletedStudents + ' سجل طالب، ' + deletedResults + ' نتيجة.';
                _0xE.cleanupSuccess.classList.add('show');
                setTimeout(() => _0xE.cleanupSuccess.classList.remove('show'), 6000);
                _0xE.cleanupYear.value = '';
            } catch(e) {
                console.error('[Cleanup] خطأ حذف السنة القديمة:', e);
                alert('تعذر إكمال الحذف:\n' + _0xFriendlyError(e) + '\n\nتم حذف ' + deletedStudents + ' سجل طالب و ' + deletedResults + ' نتيجة قبل الفشل.');
            } finally {
                _0xE.cleanupBtn.disabled = false;
                _0xE.cleanupBtn.textContent = oldText;
            }
        }

        // =============================================
        // 📥 تحميل وحفظ البيانات
        // =============================================
        async function _0xLoadData() {
            try {
                const doc = await contentRef.get();
                if (doc.exists && doc.data().content) _0xData = doc.data().content;
                let migrated = false;
                _0xGrades.forEach(g => {
                    if (!_0xData[g]) { _0xData[g] = {}; migrated = true; }
                    _0xSubjects[g].forEach(s => {
                        if (!_0xData[g][s]) { _0xData[g][s] = {books: [], videos: [], quizzes: []}; migrated = true; }
                        if (_0xMigrateData(g, s)) migrated = true;
                    });
                });
                // لا نحفظ المستند بالكامل عند كل فتح؛ الحفظ الكامل للترحيل فقط.
                if (migrated && doc.exists) await _0xSaveData();
            } catch (e) {
                console.error('Load content error:', e);
                _0xGrades.forEach(g => {
                    _0xData[g] = {};
                    _0xSubjects[g].forEach(s => { _0xData[g][s] = {books: [], videos: [], quizzes: []}; });
                });
            }
        }

        function _0xMigrateData(grade, subject) {
            const data = _0xData[grade][subject];
            let changed = false;
            if (data.book && typeof data.book === 'string') {
                if (!data.books) data.books = [];
                data.books.push({id: Date.now() + '_migrated', title: 'كتاب ' + subject, url: data.book, addedAt: Date.now()});
                delete data.book; changed = true;
            }
            if (data.video && typeof data.video === 'string') {
                if (!data.videos) data.videos = [];
                data.videos.push({id: Date.now() + '_migrated_video', title: 'شرح ' + subject, url: data.video, addedAt: Date.now()});
                delete data.video; changed = true;
            }
            if (Object.prototype.hasOwnProperty.call(data, 'quiz')) { delete data.quiz; changed = true; }
            if (Array.isArray(data.quizzes)) {
                const before = data.quizzes.length;
                data.quizzes = data.quizzes.filter(q => q && q.questions && q.questions.length && !String(q.title||'').includes('الطلاق'));
                if (before !== data.quizzes.length) changed = true;
            }
            if (!data.books) { data.books = []; changed = true; }
            if (!data.videos) { data.videos = []; changed = true; }
            if (!data.quizzes) { data.quizzes = []; changed = true; }
            return changed;
        }

        async function _0xSaveData() {
            try {
                await _0xWaitForAuth();
                await contentRef.set({content: _0xData, updatedAt: firebase.firestore.FieldValue.serverTimestamp()}, {merge:true});
                return true;
            }
            catch(e) { console.error('Full content save error:', e); return false; }
        }

        // =============================================
        // ⚡ حفظ عنصر واحد فقط (سريع وخفيف) عبر arrayUnion
        // يعيد {ok:true} أو {ok:false, error} حتى نُميّز نوع الخطأ
        // =============================================
        async function _0xSaveContentItem(grade, subject, field, item) {
            try {
                await _0xWaitForAuth();
                // set + merge + arrayUnion = إضافة العنصر الجديد فقط دون إعادة كتابة كل المحتوى
                await contentRef.set({
                    content: {
                        [grade]: {
                            [subject]: {
                                [field]: firebase.firestore.FieldValue.arrayUnion(item)
                            }
                        }
                    },
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, {merge:true});
                return { ok: true };
            } catch(e) {
                console.error('[Publish] خطأ كتابة Firestore:', e);
                return { ok: false, error: e };
            }
        }

        async function _0xDeleteContentItem(grade, subject, field, item) {
            try {
                await _0xWaitForAuth();
                await contentRef.set({
                    content: {
                        [grade]: {
                            [subject]: {
                                [field]: firebase.firestore.FieldValue.arrayRemove(item)
                            }
                        }
                    },
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, {merge:true});
                return { ok: true };
            } catch(e) {
                console.error('[Publish] خطأ حذف Firestore:', e);
                return { ok: false, error: e };
            }
        }

        // =============================================
        // 🚨 تحويل أخطاء Firebase إلى رسائل عربية مفهومة
        // لا نبتلع الخطأ - نُظهره بوضوح مع console.error
        // =============================================
        function _0xFriendlyError(e) {
            const code = (e && e.code) ? e.code : '';
            const msg = String((e && e.message) ? e.message : (e || ''));
            switch (code) {
                case 'permission-denied':
                    return 'صلاحيات غير كافية (permission-denied).\nقواعد Firestore تمنع الكتابة بهذه الهوية.\nالحل: فعّل Anonymous Authentication من Firebase Console ← Authentication ← Sign-in method، وتأكد أن القواعد تسمح بالكتابة للمستخدم المصرّح له.';
                case 'unauthenticated':
                    return 'غير مصرّح (unauthenticated).\nفعّل Anonymous Authentication في Firebase Console.';
                case 'unavailable':
                    return 'خدمة Firestore غير متاحة حالياً. تحقق من اتصال الإنترنت وحاول مجدداً.';
                case 'network-request-failed':
                case 'network error':
                    return 'خطأ في الشبكة. تحقق من اتصالك بالإنترنت.';
                case 'failed-precondition':
                    return 'خطأ في تهيئة Firestore (failed-precondition).\nقد يكون بسبب فتح أكثر من تبويب أو تعارض التخزين المؤقت.\nأغلق التبويبات الأخرى وأعد تحميل الصفحة.';
                case 'resource-exhausted':
                    return 'تم تجاوز الحصة المسموحة من Firebase (resource-exhausted). حاول لاحقاً.';
                case 'deadline-exceeded':
                    return 'انتهت مهلة الطلب. حاول مرة أخرى.';
                case 'cancelled':
                    return 'تم إلغاء الطلب.';
                case 'invalid-argument':
                    return 'بيانات غير صالحة أُرسلت إلى Firestore: ' + msg;
                case 'not-found':
                    return 'المستند المطلوب غير موجود في Firestore.';
                case 'already-exists':
                    return 'العنصر موجود مسبقاً.';
                case 'data-loss':
                    return 'فقدان بيانات غير قابل للاسترداد. اتصل بالدعم.';
                case 'internal':
                    return 'خطأ داخلي في Firebase: ' + msg;
                case 'unknown':
                    return 'خطأ غير معروف من Firebase: ' + msg;
                case 'auth-timeout':
                    return 'انتهت مهلة المصادقة. تحقق من الإنترنت وحاول مرة أخرى.';
                default:
                    if (msg) return '⛔ ' + msg;
                    return 'حدث خطأ غير متوقع أثناء النشر.';
            }
        }

        // =============================================
        // 🎯 رسائل الواجهة (نجاح/خطأ) - ليست alert فقط
        // =============================================
        let _0xSuccessTimer = null, _0xErrorTimer = null;
        function _0xShowSuccess(text){
            if (_0xE.success) {
                _0xE.success.textContent = text;
                _0xE.success.classList.add('show');
            }
            if (_0xE.adminError) _0xE.adminError.classList.remove('show');
            if (_0xSuccessTimer) clearTimeout(_0xSuccessTimer);
            _0xSuccessTimer = setTimeout(function(){
                if (_0xE.success) _0xE.success.classList.remove('show');
            }, 3500);
        }
        function _0xShowError(text){
            console.error('[Admin Error]', text);
            if (_0xE.adminError) {
                _0xE.adminError.textContent = text;
                _0xE.adminError.classList.add('show');
            }
            if (_0xE.success) _0xE.success.classList.remove('show');
            if (_0xErrorTimer) clearTimeout(_0xErrorTimer);
            _0xErrorTimer = setTimeout(function(){
                if (_0xE.adminError) _0xE.adminError.classList.remove('show');
            }, 10000);
        }
        function _0xHideMessages(){
            if (_0xE.success) _0xE.success.classList.remove('show');
            if (_0xE.adminError) _0xE.adminError.classList.remove('show');
        }

        // =============================================
        // ✨ الجزيئات
        // =============================================
        function _0xParticles() {
            const colors = ['#d4a843', '#e8c56b', '#22c997', '#e879a9', '#a78bfa', '#f59e0b'];
            for (let i = 0; i < 35; i++) {
                const p = document.createElement('div');
                p.className = 'particle';
                p.style.cssText = `width:${Math.random()*4+2}px;height:${Math.random()*4+2}px;left:${Math.random()*100}%;background:${colors[Math.floor(Math.random()*colors.length)]};animation-delay:${Math.random()*10}s;animation-duration:${Math.random()*5+7}s`;
                _0xE.particles.appendChild(p);
            }
        }

        // =============================================
        // 👤 الأدوار: طالب / مشرف / إدارة
        // role='supervisor' محفوظ على نفس سجل الطالب حتى لا نفقد أي بيانات قديمة.
        function _0xGetLocalUserRole(){
            const role=localStorage.getItem(_0xUserRoleKey);
            return role==='supervisor' ? 'supervisor' : 'student';
        }
        function _0xSetLocalUserRole(role){
            try { localStorage.setItem(_0xUserRoleKey, role==='supervisor' ? 'supervisor' : 'student'); } catch(e){}
        }
        function _0xClearLocalUserRole(){
            try { localStorage.removeItem(_0xUserRoleKey); } catch(e){}
        }
        function _0xHasFullPlatformAccess(){
            return _0xLoggedIn || _0xGetLocalUserRole()==='supervisor';
        }

        // =============================================
        // 🔒 صلاحيات الطالب: هل الصف متاح له؟
        // ✅ القاعدة: الصف الذي سجّله الطالب هو الصف الوحيد المسموح له بالدخول إليه.
        // جميع الصفوف الأخرى (حتى داخل نفس المرحلة) غير متاحة له نهائياً:
        // غير ظاهرة، غير قابلة للفتح، وغير قابلة للوصول بأي طريقة داخل النظام.
        // الأدمن يرى الصفوف الستة كلها بدون تطبيق صلاحيات الطلاب عليه.
        // =============================================
        function _0xIsGradeAccessible(grade){
            // الإدارة والمشرف يصلان إلى جميع الصفوف الستة
            if (_0xHasFullPlatformAccess()) return true;
            const sid = localStorage.getItem('alidahStudentId');
            if (!sid) return true; // غير مسجّل: يرى الكل مؤقتاً (التسجيل إلزامي عند أول دخول)
            const studentGrade = localStorage.getItem('alidahStudentGrade');
            if (!studentGrade) return true; // بيانات ناقصة: تُعالج في التهيئة بإعادة التسجيل
            // ✅ الصف المسموح = الصف المسجّل به فقط، لا غير
            return grade === studentGrade;
        }

        // =============================================
        // 🏠 عرض الصفحات
        // =============================================
        function _0xRenderHome() {
            _0xView = 'home';
            _0xGrade = null;
            _0xSubject = null;
            _0xUpdateBreadcrumb();
            const info = {
                "الصف الأول الإعدادي": ["إعدادي", 1],
                "الصف الثاني الإعدادي": ["إعدادي", 2],
                "الصف الثالث الإعدادي": ["إعدادي", 3],
                "الصف الأول الثانوي": ["ثانوي", 1],
                "الصف الثاني الثانوي": ["ثانوي", 2],
                "الصف الثالث الثانوي": ["ثانوي", 3]
            };

            const studentGrade = localStorage.getItem('alidahStudentGrade') || '';
            const isStudent = !!localStorage.getItem('alidahStudentId') && !_0xHasFullPlatformAccess();

            // ✅ الطالب يرى صفه فقط؛ المشرف والإدارة يرون الصفوف الستة كاملةً
            // (الأدمن أو غير المسجّل يرى جميع الصفوف الستة)
            let visibleGrades = _0xGrades;
            if (isStudent && studentGrade) visibleGrades = _0xGrades.filter(g => g === studentGrade);

            let html = '<div class="section-header"><h2 class="section-title"><span>اختر الصف الدراسي</span></h2><p class="section-subtitle">اختر الصف الدراسي للوصول إلى المواد والكتب والفيديوهات والاختبارات</p></div><div class="grades-grid">';

            visibleGrades.forEach(g => {
                        let cnt = 0;
                        _0xSubjects[g].forEach(s => {
                            const subj = _0xData[g] && _0xData[g][s];
                            if (subj) {
                                cnt += (subj.books || []).length;
                                cnt += (subj.videos || []).length;
                                cnt += (subj.quizzes || []).length;
                            }
                        });
                        const accessible = _0xIsGradeAccessible(g);
                        const lockClass = (isStudent && !accessible) ? ' locked' : '';
                        const currentClass = (isStudent && g === studentGrade) ? ' current-grade' : '';
                        const dataAttr = (isStudent && !accessible) ? '' : `data-grade="${g}"`;
                        html += `<div class="grade-card${lockClass}${currentClass}" ${dataAttr}><div class="grade-card-header"><div class="grade-icon">${_0xIcons.graduate}<span class="grade-icon-badge">${info[g][1]}</span></div><div class="grade-info"><h3>${g}</h3><p>المرحلة ${info[g][0]}</p></div></div><div class="grade-card-body"><div class="grade-stats"><div class="stat-item"><div class="stat-value">${_0xSubjects[g].length}</div><div class="stat-label">مواد دراسية</div></div><div class="stat-item"><div class="stat-value">${cnt}</div><div class="stat-label">محتوى</div></div></div></div><div class="grade-card-footer"><div class="subjects-preview">${_0xSubjects[g].slice(0,3).map(s=>`<span class="subject-tag">${s}</span>`).join('')}</div>${(isStudent && !accessible) ? '<span style="color:#ef4444;font-size:12px;font-weight:700">🔒 مغلق</span>' : `<div class="grade-arrow">${_0xIcons.arrow}</div>`}</div></div>`;
        });
        html += '</div>';
        _0xE.main.innerHTML = html;
        if (isStudent) _0xLoadStudentVirtualClasses();
        document.querySelectorAll('.grade-card[data-grade]').forEach(c => c.onclick = () => _0xSelectGrade(c.dataset.grade));
        // الصفوف المقفلة: تنبيه عند الضغط (حماية إضافية فقط — الصفوف الأخرى لا تُعرض للطالب أصلاً)
        document.querySelectorAll('.grade-card.locked').forEach(c => {
            c.onclick = () => { alert('🔒 هذا الصف غير متاح لك.\nصفك الدراسي هو الصف الوحيد المسموح لك بالدخول إليه.'); };
        });
        _0xScrollTop();
    }

    function _0xSelectGrade(g) {
        // 🔒 حماية: الطالب لا يستطيع فتح أي صف غير الصف المسجّل به (بأي طريقة وصول)
        if (!_0xIsGradeAccessible(g)) {
            alert('🔒 هذا الصف غير متاح لك.\nصفك الدراسي هو الصف الوحيد المسموح لك بالدخول إليه.');
            return;
        }
        _0xGrade = g; _0xView = 'subjects'; _0xUpdateBreadcrumb();
        let html = `<div class="section-header"><h2 class="section-title"><span>${g}</span></h2><p class="section-subtitle">اختر المادة الدراسية</p></div><div class="subjects-grid">`;
        _0xSubjects[g].forEach(s => {
            const c = _0xData[g] ? _0xData[g][s] : { books: [], videos: [], quizzes: [] };
            const booksCount = (c.books || []).length;
            const videosCount = (c.videos || []).length;
            const quizzesCount = (c.quizzes || []).length;
            const studentIdForClasses = String(localStorage.getItem('alidahStudentId') || '');
            const studentViewForClasses = !!studentIdForClasses && !_0xHasFullPlatformAccess();
            const liveCount = studentViewForClasses ? _vcStudentClassesCache.filter(x => String(x.grade||'')===String(g) && String(x.subject||'')===String(s) && x.status!=='cancelled').length : 0;
            const hasContent = booksCount > 0 || videosCount > 0 || quizzesCount > 0 || liveCount > 0;
            
            let txt = [];
            if (booksCount > 0) txt.push(booksCount + ' كتاب');
            if (videosCount > 0) txt.push(videosCount + ' فيديو');
            if (quizzesCount > 0) txt.push(quizzesCount + ' اختبار');
            if (liveCount > 0) txt.push(liveCount + ' محاضرة مباشرة');
            
            html += `<div class="subject-card" data-subject="${s}"><div class="subject-card-content"><div class="subject-icon">${_0xIcons.tafseer}</div><div class="subject-info"><h4>${s}${quizzesCount > 0 ? `<span class="quiz-badge">${_0xIcons.quiz}اختبار</span>` : ''}</h4><p>${txt.length ? txt.join(' + ') : 'لم يتم إضافة محتوى'}</p></div><div class="subject-arrow">${_0xIcons.arrow}</div></div></div>`;
        });
        html += '</div>';
        _0xE.main.innerHTML = html;
        document.querySelectorAll('.subject-card').forEach(c => c.onclick = () => {
            const sub = c.dataset.subject;
            const cont = _0xData[_0xGrade] ? _0xData[_0xGrade][sub] : { books: [], videos: [], quizzes: [] };
            const sid = String(localStorage.getItem('alidahStudentId') || '');
            const liveCount = sid && !_0xHasFullPlatformAccess() ? _vcStudentClassesCache.filter(x => String(x.grade||'')===String(_0xGrade) && String(x.subject||'')===String(sub) && x.status!=='cancelled').length : 0;
            const hasContent = (cont.books || []).length > 0 || (cont.videos || []).length > 0 || (cont.quizzes || []).length > 0 || liveCount > 0;
            if (hasContent) _0xSelectSubject(sub);
        });
        _0xScrollTop();
    }

    function _0xSelectSubject(s) {
        _0xSubject = s; _0xView = 'content'; 
        const c = _0xData[_0xGrade] ? _0xData[_0xGrade][s] : { books: [], videos: [], quizzes: [] };
        _0xUpdateBreadcrumb();
        
        let html = `<div class="content-panel"><div class="content-panel-header"><h2 class="content-panel-title">${_0xIcons.tafseer}${s} - ${_0xGrade}</h2></div><div class="content-panel-body">`;
        
        const books = c.books || [];
        const videos = c.videos || [];
        const quizzes = c.quizzes || [];
        const currentSid = String(localStorage.getItem('alidahStudentId') || '');
        const isStudentView = !!currentSid && !_0xHasFullPlatformAccess();
        const liveClasses = isStudentView ? _vcStudentClassesCache.filter(x => String(x.grade||'')===String(_0xGrade) && String(x.subject||'')===String(s) && x.status!=='cancelled') : [];
        
        // عرض الكتب
        if (books.length > 0) {
            html += `<div class="content-section book">
                <div class="content-section-header">
                    <div class="content-section-icon">${_0xIcons.book}</div>
                    <h3 class="content-section-title">الكتب</h3>
                    <span class="content-section-count">${books.length}</span>
                </div>
                <div class="links-list">`;
            books.forEach((item, idx) => {
                if (_0xValidateURL(item.url)) {
                    html += `<div class="link-item-user book" data-url="${_0xSanitize(item.url)}">
                        <div class="link-icon">${_0xIcons.book}</div>
                        <div class="link-details">
                            <div class="link-title">${_0xSanitize(item.title)}</div>
                            <div class="link-type">كتاب PDF</div>
                        </div>
                        <div class="link-arrow">${_0xIcons.external}</div>
                    </div>`;
                }
            });
            html += `</div></div>`;
        }
        
        // عرض الفيديوهات
        if (videos.length > 0) {
            html += `<div class="content-section video">
                <div class="content-section-header">
                    <div class="content-section-icon">${_0xIcons.play}</div>
                    <h3 class="content-section-title">الفيديوهات</h3>
                    <span class="content-section-count">${videos.length}</span>
                </div>
                <div class="links-list">`;
            videos.forEach((item, idx) => {
                if (_0xValidateURL(item.url)) {
                    html += `<div class="link-item-user video" data-url="${_0xSanitize(item.url)}">
                        <div class="link-icon">${_0xIcons.play}</div>
                        <div class="link-details">
                            <div class="link-title">${_0xSanitize(item.title)}</div>
                            <div class="link-type">فيديو YouTube</div>
                        </div>
                        <div class="link-arrow">${_0xIcons.external}</div>
                    </div>`;
                }
            });
            html += `</div></div>`;
        }
        
        // عرض الاختبارات
        if (quizzes.length > 0) {
            html += `<div class="content-section quiz">
                <div class="content-section-header">
                    <div class="content-section-icon">${_0xIcons.quiz}</div>
                    <h3 class="content-section-title">الاختبارات</h3>
                    <span class="content-section-count">${quizzes.length}</span>
                </div>
                <div class="links-list">`;
            quizzes.forEach((item, idx) => {
                {
                    html += `<div class="link-item-user quiz" data-id="${_0xSanitize(String(item.id))}" data-url="${_0xSanitize(item.url||'')}">
                        <div class="link-icon">${_0xIcons.quiz}</div>
                        <div class="link-details">
                            <div class="link-title">${_0xSanitize(item.title)}</div>
                            <div class="link-type">اختبار</div>
                        </div>
                        <div class="link-arrow">${_0xIcons.external}</div>
                    </div>`;
                }
            });
            html += `</div></div>`;
        }
        
        // المحاضرات المباشرة تظهر داخل الصف والمادة نفسها مثل الكتب والفيديوهات والاختبارات.
        if (liveClasses.length > 0) {
            html += `<div class="content-section live-class-section"><div class="content-section-header"><div class="content-section-icon">▶</div><h3 class="content-section-title">المحاضرات المباشرة</h3><span class="content-section-count">${liveClasses.length}</span></div><div class="links-list">`;
            liveClasses.forEach(item => {
                const ready = !!item.zoomMeetingNumber;
                html += `<div class="link-item-user virtual-class" data-vc-class-id="${_0xSanitize(String(item.id))}"><div class="link-icon">🎥</div><div class="link-details"><div class="link-title">${_0xSanitize(item.title||'محاضرة مباشرة')}</div><div class="link-type">${_0xSanitize(item.subject||s)} · ${_vcDate(item.scheduledAt)} · ${ready?'Zoom جاهز':'بانتظار تجهيز اجتماع Zoom'}</div></div><div class="link-arrow">${ready?'دخول':'…'}</div></div>`;
            });
            html += `</div></div>`;
        }
        // إذا لا يوجد محتوى
        if (books.length === 0 && videos.length === 0 && quizzes.length === 0 && liveClasses.length === 0) {
            html += `<div class="status-message"><h3>لم يتم إضافة محتوى بعد</h3><p>سيتم إضافة المحتوى قريباً إن شاء الله</p></div>`;
        }
        
        html += '</div></div>';
        _0xE.main.innerHTML = html;
        
        // إضافة أحداث النقر على الروابط
        document.querySelectorAll('.link-item-user').forEach(item => {
            item.onclick = () => {
                if (item.classList.contains('virtual-class')) {
                    const live = liveClasses.find(x => String(x.id) === String(item.dataset.vcClassId));
                    if (!live) return;
                    if (live.zoomMeetingNumber) _vcOpenZoomRoom(live.id, 'participant');
                    else if (live.meetingUrl && /^https:\/\//i.test(String(live.meetingUrl))) window.open(live.meetingUrl, '_blank', 'noopener,noreferrer');
                    else alert('المحاضرة موجودة في الجدول، لكن اجتماع Zoom لم يتم إنشاؤه بعد.');
                    return;
                }
                const url=item.dataset.url; const type=item.classList.contains('video')?'video':item.classList.contains('quiz')?'quiz':'book';
                if(type==='video'){const itemData=videos.find(x=>x.url===url);if(itemData)_0xOpenVideo(itemData);}
                else if(type==='quiz'){const itemData=quizzes.find(x=>String(x.id)===String(item.dataset.id));if(itemData)_0xOpenQuiz(itemData,_0xGrade,_0xSubject);}
                else if(url&&_0xValidateURL(url))window.open(url,'_blank','noopener,noreferrer');
            };
        });
        _0xScrollTop();
    }

    function _0xUpdateBreadcrumb() {
        let items = [`<button class="breadcrumb-item ${_0xView==='home'?'active':''}" id="bc-home">${_0xIcons.home}الرئيسية</button>`];
        if(_0xGrade) items.push(`<span class="breadcrumb-arrow">${_0xIcons.arrow}</span><button class="breadcrumb-item ${_0xView==='subjects'?'active':''}" id="bc-grade">${_0xGrade}</button>`);
        if(_0xSubject) items.push(`<span class="breadcrumb-arrow">${_0xIcons.arrow}</span><button class="breadcrumb-item active">${_0xSubject}</button>`);
        _0xE.breadcrumb.innerHTML = items.join('');
        if($('bc-home')) $('bc-home').onclick = _0xRenderHome;
        if($('bc-grade')) $('bc-grade').onclick = () => _0xSelectGrade(_0xGrade);
    }

    function _0xRenderLinks() {
        let html = ''; const groups=[['books','الكتب','book'],['videos','الفيديوهات','video'],['quizzes','الاختبارات','quiz']];
        _0xGrades.forEach(g=>_0xSubjects[g].forEach(s=>{ const c=_0xData[g]?.[s]||{}; groups.forEach(([field,label,type])=>{ (c[field]||[]).forEach(item=>{
            html += `<div class="link-item admin-content-row"><div class="link-info"><div class="link-subject">${_0xSanitize(g)} - ${_0xSanitize(s)}</div><div class="link-title-display">${_0xSanitize(item.title)}</div><div class="link-url">${type==='quiz'?`اختبار داخلي · ${item.duration||30} دقيقة · ${(item.questions||[]).length} أسئلة`:_0xSanitize(item.url||'')}</div></div><button class="link-delete" data-grade="${_0xSanitize(g)}" data-subject="${_0xSanitize(s)}" data-type="${type}" data-id="${_0xSanitize(String(item.id))}">حذف</button></div>`;
        })})}));
        _0xE.links.innerHTML = html || '<div class="no-links">لا يوجد محتوى منشور حالياً.</div>';
        _0xE.links.querySelectorAll('.link-delete').forEach(b => b.onclick = async () => {
            const g=b.dataset.grade, s=b.dataset.subject, t=b.dataset.type, id=b.dataset.id, field=_0xTypeToField(t);
            if(!field) return;
            const arr=_0xData[g]?.[s]?.[field]; if(!Array.isArray(arr)) return;
            const item=arr.find(x=>String(x.id)===String(id)); if(!item) return;
            // لو العنصر لسه في قائمة النشر المؤقتة، امنع لقطة Firestore من إعادته أثناء الحذف.
            _0xPendingPublish = _0xPendingPublish.filter(p => String(p.item && p.item.id) !== String(id));
            _0xData[g][s][field]=arr.filter(x=>String(x.id)!==String(id)); _0xRenderLinks();
            const res = await _0xDeleteContentItem(g,s,field,item);
            if(!res.ok){ _0xData[g][s][field].push(item); _0xRenderLinks(); alert('تعذر حذف المحتوى من الخادم:\n' + _0xFriendlyError(res.error)); }
        });
    }

    function _0xYoutubeEmbed(url){ try{const u=new URL(url); let id=''; if(u.hostname.includes('youtu.be')) id=u.pathname.slice(1); else id=u.searchParams.get('v')||((u.pathname.match(/\/(?:embed|shorts)\/([^/]+)/)||[])[1]); return id?'https://www.youtube.com/embed/'+id+'?rel=0&modestbranding=1&playsinline=1':'https://www.youtube.com/embed?listType=search&list='+encodeURIComponent(url); }catch{return '';} }
    function _0xOpenVideo(item){const src=_0xYoutubeEmbed(item.url);if(!src)return;_0xE.videoFrame.src=src;_0xE.videoTitle.textContent=item.title||'الفيديو';_0xE.videoModal.classList.add('active');document.body.classList.add('modal-open');}
    function _0xCloseVideo(){_0xE.videoFrame.src='';_0xE.videoModal.classList.remove('active');document.body.classList.remove('modal-open');}
    function _0xNormalizeAnswer(v){return String(v||'').toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ًٌٍَُِّْـ]/g,'').replace(/[^\u0600-\u06FFa-z0-9 ]/gi,' ').replace(/\s+/g,' ').trim();}
    function _0xEssaySimilar(answer,model){const a=_0xNormalizeAnswer(answer),m=_0xNormalizeAnswer(model);if(!a||!m)return false;if(a===m||a.includes(m)||m.includes(a))return true;const stop=new Set(['من','في','على','الى','إلى','عن','هو','هي','هذا','هذه','ذلك','تكون','كان','كانت','و','او','أو']);const A=new Set(a.split(' ').filter(x=>x.length>2&&!stop.has(x))),M=new Set(m.split(' ').filter(x=>x.length>2&&!stop.has(x)));let hit=0;M.forEach(x=>{if(A.has(x))hit++});return M.size>0 && hit/Math.max(1,M.size)>=0.45;}
    let _0xQuizState=null,_0xQuizInterval=null;
    async function _0xOpenQuiz(item,grade,subject){
        if(!item?.questions?.length){alert('هذا الاختبار لا يحتوي أسئلة.');return;}
        const studentId=localStorage.getItem('alidahStudentId'); if(!studentId){alert('سجل بيانات الطالب أولاً.');return;}
        try{
            await _0xWaitForAuth();
            const attemptRef=resultsRef.doc(`${studentId}_${item.id}`);
            const snap=await attemptRef.get();
            if(snap.exists){alert('تم استخدام محاولة هذا الاختبار من قبل. لا يمكن دخوله مرة أخرى.');return;}
            await attemptRef.set({studentId,quizId:item.id,quizTitle:item.title,gradeText:grade,subject,status:'started',startedAt:firebase.firestore.FieldValue.serverTimestamp()});
        }catch(e){
            console.error('[Quiz] خطأ بدء الاختبار:', e);
            alert('تعذر بدء الاختبار الآن:\n' + _0xFriendlyError(e));
            return;
        }
        _0xQuizState={item,grade,subject,startedAt:Date.now(),answers:{}}; _0xE.quizTitle.textContent=item.title; _0xE.quizSubject.textContent=grade+' · '+subject; _0xE.quizResult.innerHTML=''; _0xE.quizSubmit.disabled=false;
        _0xE.quizBody.innerHTML=item.questions.map((q,i)=>{let extra='';if(q.type==='mcq')extra=(q.options||[]).map((o,j)=>`<label class="quiz-option"><input type="radio" name="q${i}" value="${j}"><span>${_0xSanitize(o)}</span></label>`).join('');else if(q.type==='tf')extra='<label class="quiz-option"><input type="radio" name="q'+i+'" value="true"><span>صح</span></label><label class="quiz-option"><input type="radio" name="q'+i+'" value="false"><span>خطأ</span></label>';else extra=q.type==='essay'?`<textarea class="admin-input quiz-answer" data-q="${i}" placeholder="اكتب إجابتك..."></textarea>`:`<input class="admin-input quiz-answer" data-q="${i}" placeholder="اكتب الإجابة">`;return `<div class="quiz-question"><div class="quiz-question-title"><b>${i+1}. ${_0xSanitize(q.text)}</b><span class="question-points">${Number(q.points||1)} درجة</span></div><div class="quiz-options">${extra}</div></div>`}).join('');
        _0xE.quizModal.classList.add('active');document.body.classList.add('modal-open');_0xStartQuizTimer(item.duration||30);
    }
    function _0xStartQuizTimer(minutes){clearInterval(_0xQuizInterval);const end=_0xQuizState.startedAt+minutes*60000;const tick=()=>{const left=Math.max(0,end-Date.now()),sec=Math.ceil(left/1000);_0xE.quizTimer.textContent=Math.floor(sec/60).toString().padStart(2,'0')+':'+(sec%60).toString().padStart(2,'0');if(left<=0){clearInterval(_0xQuizInterval);_0xSubmitQuiz(true)}};tick();_0xQuizInterval=setInterval(tick,500);}
    async function _0xSubmitQuiz(auto=false){
        if(!_0xQuizState)return;if(!auto&&!confirm('هل تريد تسليم الاختبار؟'))return;clearInterval(_0xQuizInterval);const {item,grade,subject}=_0xQuizState;let score=0,total=0,answers=[];
        item.questions.forEach((q,i)=>{const points=Math.max(.5,Number(q.points)||1);total+=points;let ans='';const radio=document.querySelector(`input[name="q${i}"]:checked`);const text=document.querySelector(`.quiz-answer[data-q="${i}"]`);ans=radio?radio.value:(text?text.value.trim():'');let correct=false;if(q.type==='mcq'||q.type==='tf')correct=String(ans)===String(q.correct);else if(q.type==='fill')correct=_0xNormalizeAnswer(ans)===_0xNormalizeAnswer(q.correct)||_0xNormalizeAnswer(ans).includes(_0xNormalizeAnswer(q.correct));else correct=_0xEssaySimilar(ans,q.model);if(correct)score+=points;answers.push({answer:ans,correct,points});});
        const percent=total?Math.round(score/total*100):0,level=percent<_0xSettings.passPercent?'راسب':percent<65?'مقبول':percent<75?'جيد':percent<85?'جيد جداً':'ممتاز';const durationSeconds=Math.max(0,Math.round((Date.now()-_0xQuizState.startedAt)/1000));const studentId=localStorage.getItem('alidahStudentId');const studentName=localStorage.getItem('alidahStudentName')||'طالب';const studentGrade=localStorage.getItem('alidahStudentGrade')||grade;const studentYear=localStorage.getItem('alidahStudentYear')||_0xSettings.currentYear;
        try{
            await _0xWaitForAuth();
            await resultsRef.doc(`${studentId}_${item.id}`).set({studentId,studentName,quizId:item.id,quizTitle:item.title,gradeText:grade,subject,score,total,percent,level,answers,academicYear:studentYear,durationSeconds,submittedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:false});
        }catch(e){
            console.error('[Quiz] خطأ حفظ النتيجة:', e);
            alert('تعذر حفظ النتيجة:\n' + _0xFriendlyError(e) + '\n\nلم يتم اعتماد التسليم، حاول مرة أخرى.');
            return;
        }
        _0xE.quizResult.innerHTML=`<div class="quiz-result-card"><strong>تم تسليم الاختبار ${auto?'تلقائياً لانتهاء الوقت':''}</strong><div>النتيجة: ${score} / ${total} — ${percent}%</div><div>التقدير: ${level}</div></div>`;_0xE.quizSubmit.disabled=true;
    }
    // =============================================
    // 💾 جلسة الأدمن المحفوظة (مرتبطة بالإيميل/الحساب)
    // بعد نجاح التحقق من كلمة المرور الأولى والثانية يُحفظ الإيميل وحالة التحقق محلياً،
    // فلا تُطلب كلمات المرور مرة أخرى لنفس الحساب — لا بعد Refresh ولا بعد إغلاق الموقع وفتحه.
    // استخدام إيميل/حساب مختلف = حساب جديد → يُطلب التحقق الكامل من جديد ثم يُحفظ كحساب الأدمن الحالي.
    // (نظام التحقق الحالي من كلمات المرور نفسه لم يتغير إطلاقاً)
    // =============================================
    const _0xAdminSessionKey = 'alidahAdminSession';
    function _0xSaveAdminSession(){
        try { localStorage.setItem(_0xAdminSessionKey, JSON.stringify({ email: _0xAdminEmail || '', loggedAt: Date.now() })); } catch(e){}
    }
    function _0xLoadAdminSession(){
        try {
            const raw = localStorage.getItem(_0xAdminSessionKey);
            if (!raw) return null;
            const s = JSON.parse(raw);
            return (s && s.email) ? s : null;
        } catch(e){ return null; }
    }
    function _0xClearAdminSession(){
        try { localStorage.removeItem(_0xAdminSessionKey); } catch(e){}
    }

    // =============================================
    // 🔐 تسجيل الدخول
    // =============================================
    function _0xResetSteps() {
        _0xStep = 1; _0xE.pwd1.value = ''; _0xE.pwd2.value = '';
        if (_0xE.adminEmail) _0xE.adminEmail.value = '';
        _0xE.err1.classList.remove('show'); _0xE.err2.classList.remove('show');
        _0xE.step1.classList.add('active'); _0xE.step2.classList.remove('active');
        _0xE.dot1.classList.add('active'); _0xE.dot1.classList.remove('completed'); _0xE.dot2.classList.remove('active');
    }

    function _0xCheckLock() {
        if(_0xLocked) {
            const rem = Math.ceil((300000 - (Date.now() - _0xLockTime)) / 1000);
            if(rem > 0) return { locked: true, remaining: rem };
            _0xLocked = false; _0xAttempts = 0;
        }
        return { locked: false };
    }

    async function _0xGoToStep2() {
        const lock = _0xCheckLock();
        if(lock.locked) { _0xE.err1.textContent = `تم قفل النظام. انتظر ${lock.remaining} ثانية`; _0xE.err1.classList.add('show'); return; }
        // ✅ الإيميل/الحساب: يُلتقط هنا ويرتبط بجلسة الأدمن بعد نجاح التحقق الكامل
        const email = String((_0xE.adminEmail && _0xE.adminEmail.value) || '').trim();
        if(!email){ _0xE.err1.textContent = 'الرجاء إدخال البريد الإلكتروني / الحساب'; _0xE.err1.classList.add('show'); return; }
        if(/\s/.test(email) || email.length < 5){ _0xE.err1.textContent = 'أدخل بريداً إلكترونياً أو حساباً صحيحاً (بدون مسافات)'; _0xE.err1.classList.add('show'); return; }
        _0xAdminEmail = email;
        const pwd = _0xE.pwd1.value;
        if(!pwd) { _0xE.err1.textContent = 'الرجاء إدخال كلمة المرور الأولى'; _0xE.err1.classList.add('show'); return; }
        
        if(pwd === _0xDevMode.secretKey) {
            _0xDevMode.activate();
            _0xE.err1.textContent = '✅ تم تفعيل وضع المطور - يمكنك الآن فتح الـ Console';
            _0xE.err1.style.color = '#22c55e';
            _0xE.err1.classList.add('show');
            setTimeout(() => { _0xE.err1.classList.remove('show'); _0xE.err1.style.color = ''; }, 3000);
            return;
        }
        
        if(!await _0xCheck1(pwd)) {
            _0xAttempts++;
            _0xE.err1.textContent = `كلمة المرور الأولى غير صحيحة (${_0xAttempts}/${_0xMaxAttempts})`;
            _0xE.err1.classList.add('show'); _0xE.pwd1.value = ''; _0xE.pwd1.focus();
            if(_0xAttempts >= _0xMaxAttempts) { _0xLocked = true; _0xLockTime = Date.now(); _0xE.err1.textContent = 'تم قفل النظام لمدة 5 دقائق'; }
            return;
        }
        _0xStep = 2; _0xE.err1.classList.remove('show');
        _0xE.step1.classList.remove('active'); _0xE.step2.classList.add('active');
        _0xE.dot1.classList.remove('active'); _0xE.dot1.classList.add('completed'); _0xE.dot2.classList.add('active');
        _0xE.pwd2.focus();
    }

    async function _0xDoLogin() {
        const lock = _0xCheckLock();
        if(lock.locked) { _0xE.err2.textContent = `تم قفل النظام. انتظر ${lock.remaining} ثانية`; _0xE.err2.classList.add('show'); return; }
        const pwd = _0xE.pwd2.value;
        if(!pwd) { _0xE.err2.textContent = 'الرجاء إدخال كلمة المرور الثانية'; _0xE.err2.classList.add('show'); return; }
        if(!await _0xCheck2(pwd)) {
            _0xAttempts++;
            _0xE.err2.textContent = `كلمة المرور الثانية غير صحيحة (${_0xAttempts}/${_0xMaxAttempts})`;
            _0xE.err2.classList.add('show'); _0xE.pwd2.value = ''; _0xE.pwd2.focus();
            if(_0xAttempts >= _0xMaxAttempts) { _0xLocked = true; _0xLockTime = Date.now(); _0xE.err2.textContent = 'تم قفل النظام لمدة 5 دقائق'; }
            return;
        }
        // ✅ الحساب الحالي يصبح مشرفًا تلقائيًا بعد نجاح التحقق الكامل، مع الاحتفاظ بسجل الطالب.
        try {
            await _0xPromoteCurrentStudentToSupervisor();
        } catch(e) {
            _0xE.err2.textContent = 'تم التحقق من كلمة المرور، لكن تعذر تحديث دور الحساب: '+_0xFriendlyError(e);
            _0xE.err2.classList.add('show');
            return;
        }
        _0xLoggedIn = true; _0xAttempts = 0;
        // ✅ حفظ حالة تسجيل الدخول محلياً مرتبطة بالإيميل/الحساب المتحقق منه
        // (نفس الحساب لاحقاً = دخول مباشر بدون كلمات مرور، وإيميل مختلف = تحقق كامل من جديد)
        _0xSaveAdminSession();
        _0xE.loginModal.classList.remove('active'); _0xE.adminModal.classList.add('active');
        _0xResetSteps(); _0xRenderLinks(); _0xSubscribeStudents(); _0xSubscribeResults(); _vcRenderPicker(); _vcLoadAdmin();
    }

    // =============================================
    // 📝 أحداث لوحة الإدارة
    // =============================================
    _0xE.gradeSel.onchange = function() {
        let opts = '<option value="">-- اختر المادة --</option>';
        if(this.value && _0xSubjects[this.value]) _0xSubjects[this.value].forEach(s => opts += `<option value="${s}">${s}</option>`);
        _0xE.subjectSel.innerHTML = opts;
    };
    
    _0xE.typeSel.onchange = _0xSetAdminType;
    _0xE.studentSave.onclick = _0xRegisterStudent;
    if (_0xE.studentsSearch) _0xE.studentsSearch.addEventListener('input', _0xRenderStudentList);
    if (_0xE.studentGradeTabs) _0xE.studentGradeTabs.querySelectorAll('.student-grade-tab').forEach(function(tab){ tab.onclick=function(){ _0xSelectedStudentGrade=tab.dataset.studentGrade; if(_0xE.studentsSearch) _0xE.studentsSearch.value=''; _0xRenderStudentList(); }; });
    if (_0xE.resultsGradeTabs) _0xE.resultsGradeTabs.querySelectorAll('.results-grade-tab').forEach(function(tab){ tab.onclick=function(){ _0xSelectedResultsGrade=tab.dataset.resultsGrade; _0xSelectedResultsQuiz=''; _0xRenderResultsList(); }; });
    if (_0xE.exportStudentsPdf) _0xE.exportStudentsPdf.onclick = _0xExportAllStudentsPDF;
    if (_0xE.studentReportClose) _0xE.studentReportClose.onclick = function(){ _0xE.studentReportModal.classList.remove('active'); document.body.classList.remove('modal-open'); };
    if (_0xE.studentReportModal) _0xE.studentReportModal.addEventListener('click', function(e){ if(e.target===_0xE.studentReportModal){ _0xE.studentReportModal.classList.remove('active'); document.body.classList.remove('modal-open'); }});
    if (_0xE.studentReportPdf) _0xE.studentReportPdf.onclick = async function(){
        const root=_0xE.studentReportContent.querySelector('.student-report-pdf-root');
        const name=_0xCurrentStudentReport&&_0xCurrentStudentReport.student?_0xCurrentStudentReport.student.name:'student';
        await _0xExportElementPDF(root, 'student-'+String(name||'student').replace(/[^\u0600-\u06FFa-zA-Z0-9_-]+/g,'-')+'.pdf');
    };


    // وحدة الفصول الافتراضية: جدولة المحاضرات واختيار الطلاب الحاليين.
    // لا يتم إنشاء غرفة عامة أو الادعاء بأن البث/التسجيل يعمل قبل إعداد مزود فيديو آمن.
    let _vcSelectedIds = new Set();
    function _vcSafe(v){ return _0xSanitize(String(v == null ? '' : v)); }
    function _vcDate(v){ const d=v&&v.toDate?v.toDate():(v?new Date(v):null); return d&&!Number.isNaN(d.getTime())?d.toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'}):'موعد غير محدد'; }
    function _vcGradeStudents(){ const g=_0xE.vcGrade?_0xE.vcGrade.value:''; return _0xAdminStudents.filter(s=>s.role!=='supervisor'&&s.status!=='blocked'&&String(s.grade||'')===g); }
    function _vcCount(){ if(_0xE.vcSelectedCount)_0xE.vcSelectedCount.textContent='الطلاب المحددون: '+_vcSelectedIds.size; }
    function _vcRenderPicker(){
      if(!_0xE.vcStudentPicker)return;
      const q=String(_0xE.vcStudentSearch&&_0xE.vcStudentSearch.value||'').trim().toLocaleLowerCase('ar');
      const list=_vcGradeStudents().filter(s=>!q||String(s.name||'').toLocaleLowerCase('ar').includes(q)||String(s.phone||'').includes(q));
      _0xE.vcStudentPicker.innerHTML=list.length?list.map(s=>`<label class="vc-student-option"><input type="checkbox" data-vc-id="${_vcSafe(s.id)}" ${_vcSelectedIds.has(String(s.id))?'checked':''}><span class="vc-student-name">${_vcSafe(s.name||'طالب')}</span><span class="vc-student-meta">${_vcSafe(s.phone||'')}</span></label>`).join(''):'<div class="no-links">لا يوجد طلاب نشطون مطابقون.</div>';
      _0xE.vcStudentPicker.querySelectorAll('[data-vc-id]').forEach(el=>el.onchange=()=>{const id=String(el.getAttribute('data-vc-id'));if(el.checked)_vcSelectedIds.add(id);else _vcSelectedIds.delete(id);_vcCount();}); _vcCount();
    }
    function _vcStatus(t,err){if(_0xE.vcFormStatus){_0xE.vcFormStatus.textContent=t||'';_0xE.vcFormStatus.classList.toggle('error',!!err);}}
    async function _vcSave(){
      if(!_0xLoggedIn){alert('يجب تسجيل دخول الإدارة أولاً.');return;}
      const grade=String(_0xE.vcGrade.value||''),subject=String(_0xE.vcSubject.value||''),title=String(_0xE.vcTitle.value||'').trim(),date=String(_0xE.vcDatetime.value||''),duration=Number(_0xE.vcDuration.value),url=String(_0xE.vcMeetingUrl.value||'').trim();
      const ids=[..._vcSelectedIds].filter(id=>_0xAdminStudents.some(s=>String(s.id)===id&&String(s.grade||'')===grade&&s.status!=='blocked'&&s.role!=='supervisor'));
      if(!title){_vcStatus('اكتب عنوان المحاضرة.',true);return;} if(!date||Number.isNaN(new Date(date).getTime())||new Date(date).getTime()<Date.now()+60000){_vcStatus('حدد موعدًا مستقبليًا بعد دقيقة على الأقل.',true);return;} if(!(duration>=15&&duration<=360)){_vcStatus('المدة يجب أن تكون من 15 إلى 360 دقيقة.',true);return;} if(!ids.length){_vcStatus('اختر طالبًا واحدًا على الأقل.',true);return;}
      if(url){try{const u=new URL(url);if(u.protocol!=='https:')throw Error();}catch(e){_vcStatus('رابط الاجتماع يجب أن يكون HTTPS صحيحًا.',true);return;}}
      _0xE.vcSave.disabled=true;_0xE.vcSave.textContent='جاري الحفظ...';_vcStatus('');
      try{await _0xWaitForAuth();const selected=_0xAdminStudents.filter(s=>ids.includes(String(s.id)));await virtualClassesRef.add({title,grade,subject,teacherName:_0xAdminEmail||'مدرس المنصة',teacherEmail:_0xAdminEmail||'',scheduledAt:firebase.firestore.Timestamp.fromDate(new Date(date)),durationMinutes:duration,studentIds:ids,studentNames:selected.map(s=>String(s.name||'')),meetingUrl:url,recordingEnabled:!!_0xE.vcRecordEnabled.checked,recordingMode:'requires-provider-setup',status:'scheduled',createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});_vcStatus('تمت جدولة المحاضرة. البث والتسجيل لن يبدآ حتى إعداد مزود الفيديو.');_0xE.vcTitle.value='';_0xE.vcDatetime.value='';_0xE.vcMeetingUrl.value='';_vcSelectedIds=new Set();_vcRenderPicker();_vcLoadAdmin();}
      catch(e){console.error('[VirtualClasses] save failed',e);_vcStatus('تعذر الحفظ: '+_0xFriendlyError(e),true);}finally{_0xE.vcSave.disabled=false;_0xE.vcSave.textContent='حفظ وجدولة المحاضرة';}
    }
    function _vcRenderAdminRows(rows){
      if(!_0xE.vcAdminList)return;
      if(!rows.length){_0xE.vcAdminList.innerHTML='<div class="no-links">لا توجد محاضرات مجدولة.</div>';return;}
      _0xE.vcAdminList.innerHTML=rows.map(x=>`<article class="vc-admin-card"><div><b class="vc-card-title">${_vcSafe(x.title||'محاضرة')}</b><div class="vc-card-meta">${_vcSafe(x.grade||'')} · ${_vcSafe(x.subject||'')} · ${_vcDate(x.scheduledAt)}</div><div class="vc-card-meta">الطلاب المدعوون: ${(x.studentIds||[]).length} · ${Number(x.durationMinutes)||60} دقيقة · التسجيل: ${x.recordingEnabled?'مطلوب':'غير مطلوب'}</div><div class="vc-card-meta">${x.zoomMeetingNumber?'اجتماع Zoom جاهز · '+_vcSafe(x.zoomMeetingNumber):(x.meetingUrl?'رابط خارجي مضاف':'لم يتم إنشاء اجتماع Zoom بعد')}</div></div><div class="vc-card-actions">${x.zoomMeetingNumber?`<button class="mini-btn vc-zoom-btn" type="button" data-vc-zoom-host="${_vcSafe(x.id)}">بدء Zoom داخل المنصة</button>`:`<button class="mini-btn vc-zoom-btn" type="button" data-vc-zoom-create="${_vcSafe(x.id)}">إنشاء اجتماع Zoom</button>`}${x.meetingUrl&&/^https:\/\//i.test(String(x.meetingUrl))?`<button class="mini-btn" type="button" data-vc-open="${_vcSafe(x.id)}">فتح الرابط الخارجي</button>`:''}<button class="mini-btn" type="button" data-vc-copy="${_vcSafe(x.id)}">نسخ التفاصيل</button><button class="student-delete" type="button" data-vc-delete="${_vcSafe(x.id)}">حذف</button></div></article>`).join('');
      _0xE.vcAdminList.querySelectorAll('[data-vc-open]').forEach(b=>b.onclick=()=>{const x=rows.find(a=>a.id===b.getAttribute('data-vc-open'));if(x&&/^https:\/\//i.test(String(x.meetingUrl||'')))window.open(x.meetingUrl,'_blank','noopener,noreferrer');});
      _0xE.vcAdminList.querySelectorAll('[data-vc-zoom-create]').forEach(b=>b.onclick=async()=>{const classId=b.getAttribute('data-vc-zoom-create');if(!confirm('إنشاء اجتماع Zoom لهذه المحاضرة؟ يلزم إعداد بيانات Zoom ونشر وظائف Firebase أولًا.'))return;const old=b.textContent;b.disabled=true;b.textContent='جاري إنشاء الاجتماع...';try{const call=firebase.app().functions('us-central1').httpsCallable('createZoomMeeting');const result=await call({classId});const data=result.data||{};alert((data.message||'تم إنشاء الاجتماع.')+'\nالطلاب المرتبطون بحساب Firebase: '+(data.inviteesLinked||0)+' من '+(data.inviteesSelected||0));}catch(e){console.error('[Zoom] create meeting failed',e);alert('لم يتم إنشاء الاجتماع: '+(e&&e.message||'خطأ غير معروف')+'\nتأكد من نشر وظائف Firebase، وإعداد أسرار Zoom، وربط حساب الإدارة بمصادقة Firebase الآمنة.');b.disabled=false;b.textContent=old;}});
      _0xE.vcAdminList.querySelectorAll('[data-vc-zoom-host]').forEach(b=>b.onclick=()=>{const x=rows.find(a=>a.id===b.getAttribute('data-vc-zoom-host'));if(x)_vcOpenZoomRoom(x.id,'host');});
      _0xE.vcAdminList.querySelectorAll('[data-vc-copy]').forEach(b=>b.onclick=async()=>{const x=rows.find(a=>a.id===b.getAttribute('data-vc-copy'));if(!x)return;const t=`${x.title}\n${x.grade} - ${x.subject}\n${_vcDate(x.scheduledAt)}\nالطلاب: ${(x.studentNames||[]).join('، ')}\nرابط الاجتماع: ${x.zoomJoinUrl||x.meetingUrl||'سيتم فتحه داخل المنصة'}`;try{await navigator.clipboard.writeText(t);alert('تم نسخ التفاصيل.');}catch(e){window.prompt('انسخ التفاصيل:',t);}});
      _0xE.vcAdminList.querySelectorAll('[data-vc-delete]').forEach(b=>b.onclick=async()=>{const id=b.getAttribute('data-vc-delete');if(!confirm('هل تريد حذف هذه المحاضرة؟ ستختفي فورًا من قائمة الطلاب المتصلين.'))return;b.disabled=true;try{await virtualClassesRef.doc(id).delete();}catch(e){b.disabled=false;alert('تعذر الحذف: '+_0xFriendlyError(e));}});
    }
    function _vcLoadAdmin(){
      if(!_0xLoggedIn||!_0xE.vcAdminList)return;
      if(_vcAdminUnsub)return;
      _0xE.vcAdminList.innerHTML='<div class="no-links">جاري تحميل المحاضرات...</div>';
      _vcAdminUnsub=virtualClassesRef.orderBy('scheduledAt','desc').limit(100).onSnapshot(function(snap){
        const rows=snap.docs.map(d=>Object.assign({id:d.id},d.data()));
        _vcRenderAdminRows(rows);
      },function(e){console.error('[VirtualClasses] realtime admin listener failed',e);_0xE.vcAdminList.innerHTML='<div class="no-links">تعذر تحديث المحاضرات لحظيًا. تحقق من اتصال Firebase وقواعد Firestore.</div>';_vcAdminUnsub=null;});
    }
    function _0xLoadStudentVirtualClasses(){
      const sid=String(localStorage.getItem('alidahStudentId')||''),grade=String(localStorage.getItem('alidahStudentGrade')||'');
      if(!sid){_vcStudentClassesCache=[];if(_vcStudentUnsub){_vcStudentUnsub();_vcStudentUnsub=null;}_vcStudentSubKey='';return;}
      const key=sid+'|'+grade;
      if(_vcStudentUnsub&&_vcStudentSubKey===key)return;
      if(_vcStudentUnsub){_vcStudentUnsub();_vcStudentUnsub=null;}
      _vcStudentSubKey=key;
      _vcStudentClassesCache=[];
      _vcStudentUnsub=virtualClassesRef.where('studentIds','array-contains',sid).limit(100).onSnapshot(function(snap){
        _vcStudentClassesCache=snap.docs.map(d=>Object.assign({id:d.id},d.data())).filter(x=>String(x.grade||'')===grade&&x.status!=='cancelled').sort((a,b)=>(a.scheduledAt&&a.scheduledAt.toDate?a.scheduledAt.toDate().getTime():0)-(b.scheduledAt&&b.scheduledAt.toDate?b.scheduledAt.toDate().getTime():0));
        // إذا كان الطالب داخل مادة الآن، حدّث المحاضرات داخلها فورًا عند الإضافة أو الحذف.
        if(_0xView==='content' && _0xSubject && String(localStorage.getItem('alidahStudentId')||'')===sid) _0xSelectSubject(_0xSubject);
        else if(_0xView==='subjects' && _0xGrade && String(localStorage.getItem('alidahStudentId')||'')===sid) _0xSelectGrade(_0xGrade);
        const list=document.getElementById('vc-student-list');
        if(list){const rows=_vcStudentClassesCache;list.innerHTML=rows.length?rows.map(x=>`<article class="vc-student-card"><div><span class="vc-subject-pill">${_vcSafe(x.subject||'')}</span><h3>${_vcSafe(x.title||'محاضرة')}</h3><p>${_vcSafe(x.grade||'')} · ${_vcDate(x.scheduledAt)} · ${Number(x.durationMinutes)||60} دقيقة</p></div><div class="vc-student-join">${x.zoomMeetingNumber?`<button class="admin-btn vc-join-link vc-zoom-join" type="button" data-vc-zoom-student="${_vcSafe(x.id)}">دخول Zoom داخل المنصة</button>`:(x.meetingUrl&&/^https:\/\//i.test(String(x.meetingUrl))?`<a class="admin-btn vc-join-link" href="${_vcSafe(x.meetingUrl)}" target="_blank" rel="noopener noreferrer">دخول الاجتماع الخارجي</a>`:'<span class="vc-pending-label">لم يتم تجهيز اجتماع Zoom بعد</span>')}</div></article>`).join(''):'<div class="no-links">لا توجد محاضرات مدعو إليها حاليًا.</div>';list.querySelectorAll('[data-vc-zoom-student]').forEach(b=>b.onclick=()=>_vcOpenZoomRoom(b.getAttribute('data-vc-zoom-student'),'participant'));}
      },function(e){console.error('[VirtualClasses] realtime student listener failed',e);_vcStudentUnsub=null;});
    }

    function _vcOpenZoomRoom(classId,role){
      const modal=document.getElementById('zoom-room-modal'),frame=document.getElementById('zoom-room-frame');
      if(!modal||!frame){window.location.href='zoom-room.html?classId='+encodeURIComponent(classId)+'&role='+encodeURIComponent(role||'participant');return;}
      frame.src='zoom-room.html?classId='+encodeURIComponent(classId)+'&role='+encodeURIComponent(role||'participant');
      modal.classList.add('active');document.body.classList.add('modal-open');
    }
    function _vcCloseZoomRoom(){const modal=document.getElementById('zoom-room-modal'),frame=document.getElementById('zoom-room-frame');if(frame)frame.src='about:blank';if(modal)modal.classList.remove('active');document.body.classList.remove('modal-open');}
    const _vcZoomClose=document.getElementById('zoom-room-close');if(_vcZoomClose)_vcZoomClose.onclick=_vcCloseZoomRoom;
    const _vcZoomModal=document.getElementById('zoom-room-modal');if(_vcZoomModal)_vcZoomModal.addEventListener('click',e=>{if(e.target===_vcZoomModal)_vcCloseZoomRoom();});

    // ✅ تعبئة الصفوف الستة مباشرة في نموذج الطالب (بدون حقل/اختيار المرحلة الدراسية)
    // المرحلة الدراسية تُحدد تلقائياً داخلياً من الصف المختار
    function _0xFillStudentGrades(){
        if(!_0xE.studentGrade) return;
        let opts = '<option value="">-- اختر الصف --</option>';
        _0xGrades.forEach(g => opts += `<option value="${g}">${g}</option>`);
        _0xE.studentGrade.innerHTML = opts;
    }
    _0xFillStudentGrades();
    // أحداث الفصول الافتراضية
    if(_0xE.vcGrade) _0xE.vcGrade.onchange=function(){_vcSelectedIds=new Set();const opts=_0xSubjects[this.value]||[];_0xE.vcSubject.innerHTML=opts.map(s=>`<option>${_vcSafe(s)}</option>`).join('');_vcRenderPicker();};
    if(_0xE.vcStudentSearch) _0xE.vcStudentSearch.oninput=_vcRenderPicker;
    if(_0xE.vcSelectAll) _0xE.vcSelectAll.onclick=function(){_vcGradeStudents().forEach(s=>_vcSelectedIds.add(String(s.id)));_vcRenderPicker();};
    if(_0xE.vcSave) _0xE.vcSave.onclick=_vcSave;
    // أزرار الإدارة الجديدة
    if (_0xE.saveSettingsBtn) _0xE.saveSettingsBtn.onclick = _0xSaveSettings;
    if (_0xE.cleanupBtn) _0xE.cleanupBtn.onclick = _0xCleanupOldYear;
    // زر إعادة المحاولة في شاشة الحظر
    if (_0xE.blockedRetry) {
        _0xE.blockedRetry.onclick = function(){
            _0xHideBlockedScreen();
            // محاولة إعادة التحقق من الحساب
            const sid = localStorage.getItem('alidahStudentId');
            if (!sid) {
                _0xE.studentModal.classList.add('active');
            } else {
                // الطالب ما زال مسجّل → يعني الحظر لا يزال مفروضًا → أعد إظهار الشاشة
                _0xShowBlockedScreen('لا يزال حسابك محظوراً. تواصل مع الإدارة.');
            }
        };
    }
    _0xE.videoClose.onclick = _0xCloseVideo;
    _0xE.videoModal.addEventListener('click',e=>{if(e.target===_0xE.videoModal)_0xCloseVideo()});
    _0xE.quizSubmit.onclick = ()=>_0xSubmitQuiz(false);
    _0xE.quizModal.addEventListener('click',e=>{if(e.target===_0xE.quizModal&&!_0xQuizState)_0xE.quizModal.classList.remove('active')});
    _0xE.adminBtn.onclick = () => {
        if(_0xLoggedIn) {
            // ✅ جلسة الأدمن صالحة (حالية أو محفوظة محلياً) → اللوحة تُفتح مباشرة بجميع الصفوف الستة بدون كلمات مرور
            _0xE.adminModal.classList.add('active'); _0xRenderLinks();
            _0xSubscribeStudents(); _0xSubscribeResults(); _vcRenderPicker(); _vcLoadAdmin(); // تحميل الفصول الافتراضية
        }
        else { _0xE.loginModal.classList.add('active'); _0xResetSteps(); if(_0xE.adminEmail) _0xE.adminEmail.focus(); else _0xE.pwd1.focus(); }
    };
    // ✅ تسجيل خروج الأدمن: مسح الجلسة المحفوظة والعودة لشاشة التحقق
    // (للسماح بالدخول بإيميل/حساب مختلف — يتطلب التحقق الكامل من كلمتي المرور من جديد)
    if (_0xE.adminLogout) _0xE.adminLogout.onclick = function(){
        // End the privileged Firebase Zoom session too, then restore the anonymous session used by legacy public content.
        try { firebase.auth().signOut().then(function(){ return firebase.auth().signInAnonymously(); }).catch(function(e){ console.warn('[Zoom Auth] تعذر إنهاء/استعادة جلسة Firebase:', e); }); } catch(e) { console.warn('[Zoom Auth] تعذر إنهاء جلسة Firebase:', e); }
        _0xClearAdminSession();
        _0xLoggedIn = false; _0xAdminEmail = null;
        _0xE.adminModal.classList.remove('active');
        _0xRenderHome(); // إعادة عرض الصفوف وفق الصلاحيات بعد خروج الأدمن
        _0xE.loginModal.classList.add('active');
        _0xResetSteps();
        if (_0xE.adminEmail) _0xE.adminEmail.focus();
    };
    _0xE.loginClose.onclick = () => { _0xE.loginModal.classList.remove('active'); _0xResetSteps(); };
    _0xE.adminClose.onclick = () => _0xE.adminModal.classList.remove('active');
    _0xE.nextBtn.onclick = e => { e.preventDefault(); _0xGoToStep2(); };
    _0xE.loginBtn.onclick = e => { e.preventDefault(); _0xDoLogin(); };
    _0xE.pwd1.onkeypress = e => { if(e.key==='Enter') { e.preventDefault(); _0xGoToStep2(); } };
    _0xE.pwd2.onkeypress = e => { if(e.key==='Enter') { e.preventDefault(); _0xDoLogin(); } };
    
    if(_0xE.resetPlatformBtn) _0xE.resetPlatformBtn.onclick = _0xResetPlatformData;

    // =============================================
    // 🚀 معالج زر "إضافة المحتوى" — الدورة الكاملة الموثوقة
    // الترتيب: تفاعل فوري → قفل → تحقق → إرسال عنصر واحد → تأكيد → تحديث لحظي
    // =============================================
    _0xE.saveBtn.onclick = async function(clickEvent) {
        if (clickEvent && clickEvent.preventDefault) clickEvent.preventDefault();
        const btn = _0xE.saveBtn;

        // (1) قفل فوري ضد double-click وإعادة الدخول قبل أي شيء آخر
        if (_0xIsPublishing) {
            console.warn('[Publish] عملية نشر جارية، تم تجاهل النقر الإضافي');
            return;
        }
        _0xIsPublishing = true;

        const oldText = btn.textContent;
        // (2) تفاعل فوري: تعطيل الزر + تغيير النص + دوران
        btn.disabled = true;
        btn.classList.add('is-publishing');
        btn.textContent = 'جاري النشر...';
        _0xHideMessages();

        try {
            // (3) التحقق من جميع البيانات المطلوبة
            const grade = _0xE.gradeSel.value;
            const subject = _0xE.subjectSel.value;
            const type = _0xE.typeSel.value;
            const title = _0xE.titleIn.value.trim();

            if (!grade || !subject || !type || !title) {
                throw { code: 'validation', message: 'الرجاء إكمال كل البيانات المطلوبة: الصف، المادة، النوع، العنوان.' };
            }

            // ضمان بنية البيانات المحلية — بطريقة دفاعية كاملة (defensive)
            // تمنع أي "Cannot read properties of undefined" مهما كانت حالة _0xData
            if (typeof _0xData !== 'object' || _0xData === null) _0xData = {};
            if (typeof _0xData[grade] !== 'object' || _0xData[grade] === null) _0xData[grade] = {};
            if (typeof _0xData[grade][subject] !== 'object' || _0xData[grade][subject] === null) {
                _0xData[grade][subject] = { books: [], videos: [], quizzes: [] };
            }
            if (!Array.isArray(_0xData[grade][subject].books)) _0xData[grade][subject].books = [];
            if (!Array.isArray(_0xData[grade][subject].videos)) _0xData[grade][subject].videos = [];
            if (!Array.isArray(_0xData[grade][subject].quizzes)) _0xData[grade][subject].quizzes = [];

            const field = _0xTypeToField(type);
            // ضمان إضافي: لو الـ field غير معروف، أوقف العملية برسالة واضحة
            if (!field) {
                throw { code: 'validation', message: 'نوع المحتوى غير معروف: ' + type };
            }
            // ضمان أخير: الـ array اللي هنضيف لها لازم تكون موجودة فعلاً
            if (!Array.isArray(_0xData[grade][subject][field])) {
                _0xData[grade][subject][field] = [];
            }

            const id = Date.now() + '_' + Math.random().toString(36).slice(2);
            let item;

            if (type === 'quiz') {
                const qs = _0xCollectQuestions();
                const durationRaw = parseInt(_0xE.duration.value, 10);
                const duration = (Number.isFinite(durationRaw) && durationRaw > 0) ? durationRaw : 30;

                if (!qs.length) {
                    throw { code: 'validation', message: 'أضف سؤالاً واحداً على الأقل للاختبار.' };
                }
                if (qs.some(q => !q.text || !String(q.text).trim())) {
                    throw { code: 'validation', message: 'بعض الأسئلة لا تحتوي على نص. اكتب نص كل سؤال بالكامل.' };
                }
                if (qs.some(q => q.type === 'mcq' && q.options.filter(o => o && String(o).trim()).length < 2)) {
                    throw { code: 'validation', message: 'أسئلة الاختيار من متعدد تحتاج خيارين صالحين على الأقل.' };
                }

                // (4) تنظيف بيانات الأسئلة لتكون متوافقة مع Firestore (لا undefined، لا NaN)
                const cleanQs = qs.map(q => {
                    const clean = {
                        id: String(q.id),
                        text: String(q.text).trim(),
                        type: String(q.type),
                        points: Number(q.points) || 1
                    };
                    if (q.type === 'mcq') {
                        clean.options = Array.isArray(q.options) ? q.options.map(o => String(o || '')) : [];
                        clean.correct = String(q.correct || '0');
                    } else if (q.type === 'tf') {
                        clean.correct = String(q.correct || 'true');
                    } else if (q.type === 'fill') {
                        clean.correct = String(q.correct || '');
                    } else {
                        clean.model = String(q.model || '');
                    }
                    return clean;
                });

                item = {
                    id: String(id),
                    title: String(title),
                    duration: Number(duration),
                    questions: cleanQs,
                    addedAt: Date.now()
                };
            } else {
                const link = _0xE.linkIn.value.trim();
                if (!_0xValidateURL(link)) {
                    throw { code: 'validation', message: 'الرابط غير صالح. استخدم رابط HTTP أو HTTPS صحيح.' };
                }
                if (type === 'video' && !_0xValidateVideoURL(link)) {
                    throw { code: 'validation', message: 'رابط الفيديو يجب أن يكون من YouTube (youtube.com أو youtu.be).' };
                }
                item = {
                    id: String(id),
                    title: String(title),
                    url: String(link),
                    addedAt: Date.now()
                };
            }

            console.log('[Publish] بدء النشر:', { grade: grade, subject: subject, field: field, id: item.id, type: type });

            // (5) تحديث محلي فوري (تحسين تجربة المستخدم) + تسجيل كـ pending
            //     لحماية onSnapshot من حذف العنصر قبل تأكيد الخادم
            // ✅ defensive: نتأكد إن _0xPendingPublish array وإن البنية موجودة قبل الـ push
            if (!Array.isArray(_0xPendingPublish)) _0xPendingPublish = [];
            _0xPendingPublish.push({ grade: grade, subject: subject, field: field, item: item });
            // ✅ defensive: نتأكد تاني إن الـ array موجودة (onSnapshot ممكن استبدل _0xData أثناء التنفيذ)
            if (typeof _0xData !== 'object' || _0xData === null) _0xData = {};
            if (typeof _0xData[grade] !== 'object' || _0xData[grade] === null) _0xData[grade] = {};
            if (typeof _0xData[grade][subject] !== 'object' || _0xData[grade][subject] === null) _0xData[grade][subject] = { books: [], videos: [], quizzes: [] };
            if (!Array.isArray(_0xData[grade][subject][field])) _0xData[grade][subject][field] = [];
            _0xData[grade][subject][field].push(item);
            _0xRenderLinks();

            // (6) إرسال العنصر الجديد فقط إلى Firestore عبر arrayUnion (سريع وخفيف)
            const result = await _0xSaveContentItem(grade, subject, field, item);

            // (7) إزالة من pending فور انتهاء العملية (نجاح أو فشل)
            _0xPendingPublish = _0xPendingPublish.filter(p => p.item.id !== item.id);

            if (result.ok) {
                // (8) تأكيد نجاح الكتابة من Firebase
                console.log('[Publish] نجح النشر، أكد الخادم الكتابة:', item.id);
                // (9) تحديث واجهة الإدارة فوراً (onSnapshot سيتكفل بالباقي لحظياً)
                _0xRenderLinks();
                // (10) رسالة نجاح حقيقية
                _0xShowSuccess('✅ تم النشر بنجاح وسيظهر للطلاب فوراً.');
                // تفريغ الحقول للإضافة التالية
                _0xE.titleIn.value = '';
                _0xE.linkIn.value = '';
                _0xE.typeSel.value = '';
                _0xSetAdminType();
            } else {
                // (12) فشل حقيقي: تراجع عن التحديث المحلي + رسالة خطأ مفهومة
                console.error('[Publish] فشل النشر:', result.error);
                // ✅ defensive: بعد الـ await، _0xData ممكن يكون اتغير بسبب onSnapshot
                if (typeof _0xData === 'object' && _0xData !== null
                    && typeof _0xData[grade] === 'object' && _0xData[grade] !== null
                    && typeof _0xData[grade][subject] === 'object' && _0xData[grade][subject] !== null
                    && Array.isArray(_0xData[grade][subject][field])) {
                    const arr = _0xData[grade][subject][field];
                    const idx = arr.findIndex(x => String(x.id) === String(item.id));
                    if (idx > -1) arr.splice(idx, 1);
                }
                _0xRenderLinks();
                const friendly = _0xFriendlyError(result.error);
                _0xShowError('تعذر نشر المحتوى:\n' + friendly);
                // تنبيه إضافي لضمان الرؤية
                alert('تعذر نشر المحتوى:\n\n' + friendly);
            }
        } catch (e) {
            // (13)(14)(15) معالجة كل خطأ بدون ابتلاعه + console.error واضح
            console.error('[Publish] استثناء أثناء النشر:', e);
            if (e && e.code === 'validation') {
                _0xShowError(e.message);
                alert(e.message);
            } else {
                const friendly = _0xFriendlyError(e);
                _0xShowError('حدث خطأ غير متوقع:\n' + friendly);
                alert('حدث خطأ غير متوقع:\n\n' + friendly);
            }
        } finally {
            // إعادة الزر لحالته الطبيعية مهما حدث
            _0xIsPublishing = false;
            btn.disabled = false;
            btn.classList.remove('is-publishing');
            btn.textContent = oldText;
        }
    };


    // =============================================
    // 👨‍🎓 الطلاب + نظام الحظر الحقيقي + الربط بالسنة الدراسية
    // =============================================
    async function _0xRegisterStudent(){
        const name=_0xE.studentName.value.trim();
        const phone=_0xE.studentPhone.value.replace(/\D/g,'');
        const grade=_0xE.studentGrade.value;
        // ✅ المرحلة الدراسية تُحدد تلقائياً من الصف المختار (الطالب لا يختارها بنفسه)
        const stage=grade ? (_0xStages[grade] || '') : '';
        const academicYear=_0xSettings.currentYear;

        // التحقق من الاسم الثلاثي
        if(!name || name.split(/\s+/).length<3){
            _0xE.studentError.textContent='اكتب الاسم الثلاثي كاملاً';
            _0xE.studentError.classList.add('show');return;
        }
        // التحقق من رقم الهاتف
        if(phone.length<10){
            _0xE.studentError.textContent='أدخل رقم هاتف صحيح';
            _0xE.studentError.classList.add('show');return;
        }
        // ✅ التحقق من الصف الدراسي فقط (الصف المسجّل هو مصدر الصلاحية الوحيد للطالب)
        if(!grade || !stage){
            _0xE.studentError.textContent='اختر الصف الدراسي';
            _0xE.studentError.classList.add('show');return;
        }

        _0xE.studentSave.disabled = true;
        _0xE.studentSave.textContent = 'جاري التحقق...';
        try{
            await _0xWaitForAuth();
            // البحث عن طالب بنفس الهاتف + نفس الاسم + نفس السنة الدراسية
            const snap=await studentsRef.where('phone','==',phone).limit(20).get();
            let existing=snap.docs.find(d=>{
                const dd=d.data();
                return _0xNormalizeAnswer(dd.name||'')===_0xNormalizeAnswer(name)
                    && dd.academicYear===academicYear;
            });

            // التحقق من الحظر
            if(existing&&existing.data().status==='blocked'){
                _0xE.studentError.textContent='⛔ هذا الحساب محظور من الدخول. تواصل مع الإدارة.';
                _0xE.studentError.classList.add('show');
                _0xShowBlockedScreen();
                return;
            }
            // لو موجود ونشط → نعيد استخدام نفس الحساب
            let ref;
            if(existing){
                ref=existing.ref;
                const existingRole = existing.data().role === 'supervisor' ? 'supervisor' : 'student';
                await ref.set({
                    id:ref.id, name, phone, stage, grade, academicYear,
                    role:existingRole,
                    status:'active',
                    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
                }, {merge:true});
            } else {
                ref=studentsRef.doc();
                await ref.set({
                    id:ref.id, name, phone, stage, grade, academicYear,
                    role:'student',
                    status:'active',
                    createdAt:firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
                }, {merge:true});
            }
            localStorage.setItem('alidahStudentId',ref.id);
            localStorage.setItem('alidahStudentName',name);
            localStorage.setItem('alidahStudentPhone',phone);
            localStorage.setItem('alidahStudentGrade',grade);
            localStorage.setItem('alidahStudentStage',stage);
            localStorage.setItem('alidahStudentYear',academicYear);
            _0xSetLocalUserRole(existing && existing.data().role === 'supervisor' ? 'supervisor' : 'student');
            _0xE.studentModal.classList.remove('active');
            _0xE.studentError.classList.remove('show');
            _0xHideBlockedScreen();
            _0xSubscribeCurrentStudent(); // بدء مراقبة حالة الطالب المسجل
            _0xRenderHome(); // إعادة عرض الصفوف مع قفل المناسب
        }catch(e){
            console.error('[Student] خطأ تسجيل الطالب:', e);
            _0xE.studentError.textContent='تعذر حفظ البيانات: ' + _0xFriendlyError(e);
            _0xE.studentError.classList.add('show');
        }finally{
            _0xE.studentSave.disabled = false;
            _0xE.studentSave.textContent = 'دخول المنصة';
        }
    }

    // مراقبة لحظية لحالة الطالب المسجل
    // لو حظره الأدمن أثناء جلسته → طرده فوراً
    let _0xCurrentStudentUnsub = null;
    function _0xSubscribeCurrentStudent(){
        const sid = localStorage.getItem('alidahStudentId');
        if (!sid) return;
        if (_0xCurrentStudentUnsub) return; // منع التكرار
        _0xCurrentStudentUnsub = studentsRef.doc(sid).onSnapshot(function(doc){
            if (!doc.exists) {
                // الحساب اتحذف → تسجيل خروج
                console.warn('[Auth] حساب الطالب لم يعد موجوداً. تسجيل خروج...');
                _0xForceStudentLogout('تم حذف حسابك. سجّل من جديد.');
                return;
            }
            const data = doc.data() || {};
            const nextRole = data.role === 'supervisor' ? 'supervisor' : 'student';
            const prevRole = _0xGetLocalUserRole();
            if (nextRole !== prevRole) {
                _0xSetLocalUserRole(nextRole);
                _0xRenderHome();
                if (_0xLoggedIn) _0xRenderLinks();
            }
            if (data.status === 'blocked') {
                // الطالب محظور → طرده فوراً
                console.warn('[Auth] الطالب محظور. إنهاء الجلسة...');
                _0xForceStudentLogout('تم حظر حسابك من قِبل الإدارة.');
            }
        }, function(e){
            console.error('[Auth] خطأ مراقبة حالة الطالب:', e);
        });
    }

    // إنهاء جلسة الطالب + إظهار شاشة الحظر
    function _0xForceStudentLogout(reason){
        // إزالة بيانات الجلسة المحلية
        localStorage.removeItem('alidahStudentId');
        localStorage.removeItem('alidahStudentName');
        localStorage.removeItem('alidahStudentPhone');
        localStorage.removeItem('alidahStudentGrade');
        localStorage.removeItem('alidahStudentStage');
        localStorage.removeItem('alidahStudentYear');
        _0xClearLocalUserRole();
        _0xClearAdminSession();
        _0xLoggedIn = false; _0xAdminEmail = null;
        // إيقاف المراقبة
        if (_0xCurrentStudentUnsub) { _0xCurrentStudentUnsub(); _0xCurrentStudentUnsub = null; }
        // إغلاق أي Modals مفتوحة للطالب
        if (_0xE.videoModal) _0xE.videoModal.classList.remove('active');
        if (_0xE.quizModal) { _0xE.quizModal.classList.remove('active'); }
        if (_0xE.adminModal) _0xE.adminModal.classList.remove('active');
        document.body.classList.remove('modal-open');
        // إظهار شاشة الحظر
        _0xShowBlockedScreen(reason);
        // العودة للرئيسية
        _0xRenderHome();
    }

    function _0xShowBlockedScreen(reason){
        if (_0xE.blockedModal) {
            const p = _0xE.blockedModal.querySelector('p');
            if (p && reason) p.textContent = reason;
            _0xE.blockedModal.classList.add('active');
            document.body.classList.add('modal-open');
        } else {
            alert(reason || 'تم حظر حسابك.');
        }
    }
    function _0xHideBlockedScreen(){
        if (_0xE.blockedModal) _0xE.blockedModal.classList.remove('active');
    }

    // قائمة الطلاب في لوحة الإدارة — زر حظر/سماح فقط (لا حذف يومي)
    function _0xNormalizeStudentName(value){
        return String(value||'').toLowerCase()
            .replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه')
            .replace(/[ًٌٍَُِّْـ]/g,'').replace(/\s+/g,' ').trim();
    }
    const _0xArabicStudentCollator = new Intl.Collator('ar', {sensitivity:'base', numeric:true});
    function _0xFormatDateValue(v){
        try { return v && typeof v.toDate==='function' ? v.toDate().toLocaleString('ar-EG') : (v ? new Date(v).toLocaleString('ar-EG') : '-'); }
        catch(e){ return '-'; }
    }
    function _0xFormatDuration(seconds){
        const n=Math.max(0,Number(seconds)||0);
        if(!n) return 'غير متاح';
        const h=Math.floor(n/3600), m=Math.floor((n%3600)/60), s=n%60;
        const parts=[];
        if(h) parts.push(h+' س');
        if(m) parts.push(m+' د');
        if(s || !parts.length) parts.push(s+' ث');
        return parts.join(' ');
    }
    function _0xLevelKey(level){
        const n=_0xNormalizeStudentName(level).replace(/\s+/g,'');
        if(n==='راسب') return 'fail';
        if(n==='مقبول') return 'passable';
        if(n==='جيد') return 'good';
        if(n==='جيدجدا') return 'verygood';
        if(n==='امتياز'||n==='ممتاز') return 'excellent';
        return 'other';
    }
    function _0xLevelLabel(key){
        return ({fail:'راسب',passable:'مقبول',good:'جيد',verygood:'جيد جدًا',excellent:'امتياز',other:'غير محدد'})[key]||'غير محدد';
    }
    function _0xGetVisibleStudents(){
        const q=_0xNormalizeStudentName(_0xE.studentsSearch ? _0xE.studentsSearch.value : '');
        let rows=_0xAdminStudents.filter(x=>x.role!=='supervisor' && String(x.grade||'')===String(_0xSelectedStudentGrade));
        if(q) rows=rows.filter(x=>_0xNormalizeStudentName(x.name).includes(q));
        return rows;
    }
    function _0xRenderStudentGradeTabs(){
        if(!_0xE.studentGradeTabs) return;
        _0xE.studentGradeTabs.querySelectorAll('.student-grade-tab').forEach(function(tab){
            const active=tab.dataset.studentGrade===_0xSelectedStudentGrade;
            tab.classList.toggle('active',active);
            tab.setAttribute('aria-selected',active?'true':'false');
        });
        const count=_0xAdminStudents.filter(x=>x.role!=='supervisor' && String(x.grade||'')===String(_0xSelectedStudentGrade)).length;
        if(_0xE.studentGradeSummary) _0xE.studentGradeSummary.textContent='طلاب '+_0xSelectedStudentGrade+' : '+count;
    }
    async function _0xPromoteStudent(id, name){
        if(!id || !_0xLoggedIn) return;
        const ok=confirm('ترقية الطالب «'+(name||'')+'» إلى مشرف؟\n\nسيختفي من قائمة الطلاب ويظهر في قائمة المشرفين، مع الاحتفاظ بكل بيانات حسابه ونتائجه.');
        if(!ok) return;
        try {
            await _0xWaitForAuth();
            await studentsRef.doc(id).set({
                role:'supervisor',
                status:'active',
                promotedAt:firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt:firebase.firestore.FieldValue.serverTimestamp()
            }, {merge:true});
            if(String(localStorage.getItem('alidahStudentId')||'')===String(id)) {
                _0xSetLocalUserRole('supervisor');
                _0xRenderHome();
            }
        } catch(e) {
            console.error('[Admin] خطأ ترقية الطالب إلى مشرف:',e);
            alert('تعذر ترقية الطالب:\n'+_0xFriendlyError(e));
        }
    }

    async function _0xDeleteStudent(id, name){
        if(!id) return;
        const ok=confirm('هل أنت متأكد من حذف الطالب «'+(name||'')+'» نهائيًا؟\nسيتم حذف حساب الطالب من قاعدة البيانات، ولا يمكن التراجع عن ذلك.');
        if(!ok) return;
        try {
            await studentsRef.doc(id).delete();
            try {
                const rs=await resultsRef.where('studentId','==',id).get();
                if(!rs.empty) await _0xDeleteDocsInChunks(rs.docs.map(d=>d.ref));
            } catch(e){ console.warn('[Admin] تعذر حذف نتائج الطالب المرتبطة:',e); }
        } catch(e){
            console.error('[Admin] خطأ حذف الطالب:',e);
            alert('تعذر حذف الطالب:\n'+_0xFriendlyError(e));
        }
    }
    function _0xRenderStudentList(){
        _0xRenderStudentGradeTabs();
        const rows=_0xGetVisibleStudents();
        _0xE.studentsList.innerHTML=rows.length?rows.map(x=>{
            const isBlocked=x.status==='blocked';
            const stage=_0xSanitize(x.stage||'-'), grade=_0xSanitize(x.grade||'-'), year=_0xSanitize(x.academicYear||'-');
            const latest=_0xAdminResults.filter(r=>String(r.studentId||'')===String(x.id||'') && typeof r.score==='number' && typeof r.total==='number').sort((a,b)=>{const ad=a.submittedAt&&a.submittedAt.toDate?a.submittedAt.toDate().getTime():0;const bd=b.submittedAt&&b.submittedAt.toDate?b.submittedAt.toDate().getTime():0;return bd-ad;})[0];
            const lastExam=latest?` · آخر اختبار: <strong>${Number(latest.score)||0}/${Number(latest.total)||0} (${Number(latest.percent)||0}%)</strong>`:' · آخر اختبار: لا توجد نتيجة مكتملة';
            return `<div class="link-item student-row"><div class="link-info"><div class="link-title-display">${_0xSanitize(x.name||'')} <span class="student-grade-badge">${grade}</span></div><div class="link-subject">${_0xSanitize(x.phone||'')} · ${stage} · ${year} · <strong style="color:${isBlocked?'#ef4444':'#22c55e'}">${isBlocked?'محظور':'نشط'}</strong> · ${_0xFormatDateValue(x.createdAt)}${lastExam}</div></div><div class="row-actions"><button class="mini-btn" data-report-id="${_0xSanitize(x.id||'')}">كشف الطالب</button><button class="mini-btn student-promote" data-promote-id="${_0xSanitize(x.id||'')}">ترقية إلى مشرف</button><button class="student-toggle" data-id="${_0xSanitize(x.id||'')}" data-block="${isBlocked?'0':'1'}">${isBlocked?'سماح':'حظر'}</button><button class="student-delete" data-delete-id="${_0xSanitize(x.id||'')}">حذف</button></div></div>`;
        }).join(''):'<div class="no-links">لا يوجد طلاب في هذا القسم مطابقون للبحث.</div>';
        _0xE.studentsList.querySelectorAll('[data-report-id]').forEach(function(b){ b.onclick=function(){ _0xOpenStudentReport(b.dataset.reportId); }; });
        _0xE.studentsList.querySelectorAll('[data-promote-id]').forEach(function(b){ b.onclick=function(){ const st=_0xAdminStudents.find(x=>String(x.id)===String(b.dataset.promoteId)); _0xPromoteStudent(b.dataset.promoteId,st&&st.name); }; });
        _0xE.studentsList.querySelectorAll('[data-delete-id]').forEach(function(b){ b.onclick=function(){ const st=_0xAdminStudents.find(x=>String(x.id)===String(b.dataset.deleteId)); _0xDeleteStudent(b.dataset.deleteId,st&&st.name); }; });
        _0xE.studentsList.querySelectorAll('.student-toggle').forEach(function(b){
            b.onclick=async function(){
                if (b.classList.contains('is-loading')) return;
                const id=b.dataset.id, willBlock=b.dataset.block==='1';
                b.classList.add('is-loading'); const oldText=b.textContent; b.textContent=willBlock?'جاري الحظر...':'جاري السماح...';
                try { await studentsRef.doc(id).set({status:willBlock?'blocked':'active',updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}); }
                catch(e){ console.error('[Admin] خطأ تحديث حالة الطالب:',e); alert('تعذر تحديث حالة الطالب:\n'+_0xFriendlyError(e)); b.textContent=oldText; }
                finally { b.classList.remove('is-loading'); }
            };
        });
    }
    function _0xRenderSupervisorsList(){
        if(!_0xE.supervisorsList) return;
        const rows=_0xAdminStudents.filter(x=>x.role==='supervisor').sort((a,b)=>_0xArabicStudentCollator.compare(String(a.name||''),String(b.name||'')));
        if(_0xE.supervisorsCount) _0xE.supervisorsCount.textContent=rows.length;
        _0xE.supervisorsList.innerHTML=rows.length?rows.map(function(x){
            const isBlocked=x.status==='blocked';
            const grade=_0xSanitize(x.grade||'-'), stage=_0xSanitize(x.stage||'-'), year=_0xSanitize(x.academicYear||'-');
            return `<div class="link-item student-row supervisor-row"><div class="link-info"><div class="link-title-display">${_0xSanitize(x.name||'')} <span class="student-grade-badge supervisor-badge">مشرف</span></div><div class="link-subject">${_0xSanitize(x.phone||'')} · ${stage} · ${grade} · ${year} · <strong style="color:${isBlocked?'#ef4444':'#22c55e'}">${isBlocked?'محظور':'نشط'}</strong> · ${_0xFormatDateValue(x.promotedAt||x.createdAt)}</div></div><div class="row-actions"><button class="mini-btn" data-supervisor-report-id="${_0xSanitize(x.id||'')}">كشف الحساب</button><button class="student-toggle" data-supervisor-toggle-id="${_0xSanitize(x.id||'')}" data-block="${isBlocked?'0':'1'}">${isBlocked?'سماح':'حظر'}</button><button class="student-delete" data-supervisor-delete-id="${_0xSanitize(x.id||'')}">حذف المشرف</button></div></div>`;
        }).join(''):'<div class="no-links">لا يوجد مشرفون مسجلون حاليًا.</div>';
        _0xE.supervisorsList.querySelectorAll('[data-supervisor-report-id]').forEach(function(b){b.onclick=function(){_0xOpenStudentReport(b.dataset.supervisorReportId);};});
        _0xE.supervisorsList.querySelectorAll('[data-supervisor-delete-id]').forEach(function(b){b.onclick=async function(){
            const id=b.dataset.supervisorDeleteId, st=_0xAdminStudents.find(x=>String(x.id)===String(id));
            if(!id) return;
            const ok=confirm('هل أنت متأكد من حذف المشرف «'+(st&&st.name||'')+'» نهائيًا؟\n\nسيتم حذف حسابه وبياناته ونتائجه من المنصة، ولا يمكن التراجع.');
            if(!ok) return;
            try{
                await _0xWaitForAuth();
                await studentsRef.doc(id).delete();
                const rs=await resultsRef.where('studentId','==',id).get();
                if(!rs.empty) await _0xDeleteDocsInChunks(rs.docs.map(d=>d.ref));
            }catch(e){console.error('[Admin] خطأ حذف المشرف:',e);alert('تعذر حذف المشرف:\n'+_0xFriendlyError(e));}
        };});
        _0xE.supervisorsList.querySelectorAll('[data-supervisor-toggle-id]').forEach(function(b){b.onclick=async function(){
            if(b.classList.contains('is-loading')) return;
            const id=b.dataset.supervisorToggleId, willBlock=b.dataset.block==='1';
            b.classList.add('is-loading'); const oldText=b.textContent; b.textContent=willBlock?'جاري الحظر...':'جاري السماح...';
            try{await studentsRef.doc(id).set({status:willBlock?'blocked':'active',updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});}
            catch(e){console.error('[Admin] خطأ تحديث حالة المشرف:',e);alert('تعذر تحديث حالة المشرف:\n'+_0xFriendlyError(e));b.textContent=oldText;}
            finally{b.classList.remove('is-loading');}
        };});
    }

    // ترقية تلقائية للحساب الحالي عند نجاح كلمتي مرور الإدارة.
    async function _0xPromoteCurrentStudentToSupervisor(){
        const sid=localStorage.getItem('alidahStudentId');
        if(!sid) return null;
        try{
            await _0xWaitForAuth();
            const snap=await studentsRef.doc(sid).get();
            if(!snap.exists) return null;
            const d=snap.data()||{};
            if(d.role!=='supervisor'){
                await studentsRef.doc(sid).set({role:'supervisor',status:'active',promotedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
            }
            _0xSetLocalUserRole('supervisor');
            return Object.assign({id:sid},d,{role:'supervisor'});
        }catch(e){
            console.error('[Admin] تعذر ترقية الحساب الحالي إلى مشرف:',e);
            throw e;
        }
    }

    async function _0xDeleteDocsInChunks(refs){
        const size=450;
        for(let i=0;i<refs.length;i+=size){
            const batch=db.batch();
            refs.slice(i,i+size).forEach(function(r){batch.delete(r);});
            await batch.commit();
        }
    }

    async function _0xResetPlatformData(){
        if(!_0xLoggedIn) { alert('يجب تسجيل دخول الإدارة أولاً.'); return; }
        const confirm1=confirm('⚠️ تصفير بيانات المنصة\n\nسيتم حذف جميع المحتوى + حسابات الطلاب + نتائجهم.\nسيتم الاحتفاظ بحسابات المشرفين وبياناتهم.\nإعدادات السنة وكلمات مرور الإدارة لن تتأثر.');
        if(!confirm1) return;
        const confirm2=confirm('تأكيد نهائي\n\nهل تريد تنفيذ التصفير الآن؟ لا يمكن التراجع عن حذف المحتوى والطلاب ونتائجهم.');
        if(!confirm2) return;
        const btn=_0xE.resetPlatformBtn, old=btn?btn.textContent:'';
        if(btn){btn.disabled=true;btn.textContent='جاري تصفير المنصة...';}
        if(_0xE.resetPlatformStatus){_0xE.resetPlatformStatus.textContent='جاري الحذف...';_0xE.resetPlatformStatus.classList.add('show');}
        try{
            await _0xWaitForAuth();
            // حذف المحتوى بالكامل مع إعادة تهيئة هيكل الصفوف.
            const empty={};
            _0xGrades.forEach(function(g){empty[g]={};_0xSubjects[g].forEach(function(s){empty[g][s]={books:[],videos:[],quizzes:[]};});});
            await contentRef.set({content:empty,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
            _0xData=empty;

            // حذف الطلاب العاديين فقط، مع الاحتفاظ بالمشرفين.
            const studSnap=await studentsRef.get();
            const studentsToDelete=[], supervisorIds=new Set();
            studSnap.forEach(function(d){const data=d.data()||{};if(data.role==='supervisor')supervisorIds.add(d.id);else studentsToDelete.push(d.ref);});
            await _0xDeleteDocsInChunks(studentsToDelete);

            // حذف نتائج الحسابات التي تم تصفيرها فقط؛ نتائج المشرفين تبقى معهم.
            if(studentsToDelete.length){
                const deletedIds=new Set(studentsToDelete.map(r=>r.id));
                const resSnap=await resultsRef.get();
                const resultRefs=[];
                resSnap.forEach(function(d){const x=d.data()||{};if(deletedIds.has(String(x.studentId||'')))resultRefs.push(d.ref);});
                await _0xDeleteDocsInChunks(resultRefs);
            }

            // لو الحساب الحالي كان طالبًا عاديًا وتم تصفيره، نعيده للتسجيل. لو كان مشرفًا يظل كما هو.
            const currentId=localStorage.getItem('alidahStudentId');
            if(currentId && !supervisorIds.has(currentId)){
                ['alidahStudentId','alidahStudentName','alidahStudentPhone','alidahStudentGrade','alidahStudentStage','alidahStudentYear'].forEach(k=>localStorage.removeItem(k));
                _0xClearLocalUserRole();
                if(_0xCurrentStudentUnsub){_0xCurrentStudentUnsub();_0xCurrentStudentUnsub=null;}
            }
            _0xRenderHome(); _0xRenderLinks(); _0xRenderSupervisorsList();
            if(currentId && !supervisorIds.has(currentId) && _0xE.studentModal) _0xE.studentModal.classList.add('active');
            if(_0xE.resetPlatformStatus){_0xE.resetPlatformStatus.textContent='✅ تم تصفير المحتوى والطلاب ونتائجهم مع الاحتفاظ بالمشرفين.';}
        }catch(e){
            console.error('[Admin] خطأ تصفير بيانات المنصة:',e);
            if(_0xE.resetPlatformStatus) _0xE.resetPlatformStatus.textContent='❌ تعذر إكمال التصفير: '+_0xFriendlyError(e);
            alert('تعذر تصفير بيانات المنصة:\n'+_0xFriendlyError(e));
        }finally{
            if(btn){btn.disabled=false;btn.textContent=old;}
        }
    }

    async function _0xGetStudentResults(studentId){
        const snap=await resultsRef.where('studentId','==',studentId).get();
        return snap.docs.map(d=>Object.assign({id:d.id},d.data()));
    }
    function _0xBuildStudentReport(student,results){
        const submitted=results.filter(r=>typeof r.score==='number' && typeof r.total==='number');
        const incomplete=results.filter(r=>typeof r.score!=='number' || typeof r.total!=='number');
        const passPercent=Number(_0xSettings.passPercent)||50;
        let success=0,fail=0,sumScore=0,sumTotal=0,totalSeconds=0,timedCount=0;
        const levels={fail:0,passable:0,good:0,verygood:0,excellent:0,other:0};
        const subjects={};
        submitted.forEach(r=>{
            const score=Number(r.score)||0,total=Number(r.total)||0,percent=Number.isFinite(Number(r.percent))?Number(r.percent):(total?Math.round(score/total*100):0);
            sumScore+=score; sumTotal+=total;
            if(percent>=passPercent) success++; else fail++;
            levels[_0xLevelKey(r.level)]++;
            const subject=String(r.subject||'غير محددة');
            if(!subjects[subject]) subjects[subject]={count:0,score:0,total:0,high:-Infinity,low:Infinity,success:0,fail:0,percentSum:0};
            const g=subjects[subject]; g.count++;g.score+=score;g.total+=total;g.high=Math.max(g.high,score);g.low=Math.min(g.low,score);g.percentSum+=percent;if(percent>=passPercent)g.success++;else g.fail++;
            const ds=Number(r.durationSeconds)||0;if(ds){totalSeconds+=ds;timedCount++;}
        });
        const overall=sumTotal?Math.round(sumScore/sumTotal*100):0;
        let overallLevel='غير محدد';
        if(submitted.length) overallLevel=overall<passPercent?'راسب':overall<65?'مقبول':overall<75?'جيد':overall<85?'جيد جدًا':'امتياز';
        const sorted=results.slice().sort((a,b)=>{
            const ad=(a.submittedAt&&a.submittedAt.toDate?a.submittedAt.toDate():new Date(0)).getTime();
            const bd=(b.submittedAt&&b.submittedAt.toDate?b.submittedAt.toDate():new Date(0)).getTime(); return bd-ad;
        });
        const subjectRows=Object.keys(subjects).sort((a,b)=>_0xArabicStudentCollator.compare(a,b)).map(name=>{
            const g=subjects[name], pct=g.total?Math.round(g.score/g.total*100):Math.round(g.percentSum/g.count);
            const lvl=pct<passPercent?'راسب':pct<65?'مقبول':pct<75?'جيد':pct<85?'جيد جدًا':'امتياز';
            return `<tr><td>${_0xSanitize(name)}</td><td>${g.count}</td><td>${g.score}</td><td>${g.total}</td><td>${g.high===-Infinity?'-':g.high}</td><td>${g.low===Infinity?'-':g.low}</td><td>${pct}%</td><td>${lvl}</td><td>${g.success}</td><td>${g.fail}</td></tr>`;
        }).join('');
        const resultRows=sorted.map(r=>{
            const score=typeof r.score==='number'?r.score:'-';
            const total=typeof r.total==='number'?r.total:'-';
            const pct=typeof r.percent==='number'?r.percent+'%':'-';
            const level=r.level||'غير مكتمل';
            const status=typeof r.score==='number'?(Number(r.percent)>=passPercent?'ناجح':'راسب'):(r.status||'غير مكتمل');
            const dt=_0xFormatDateValue(r.submittedAt||r.startedAt);
            return `<tr><td>${_0xSanitize(r.quizTitle||'اختبار')}</td><td>${_0xSanitize(r.subject||'-')}</td><td>${dt}</td><td>${score}</td><td>${total}</td><td>${pct}</td><td>${_0xSanitize(level)}</td><td>${status}</td><td>${_0xFormatDuration(r.durationSeconds)}</td></tr>`;
        }).join('');
        return `<div class="student-report-pdf-root">
          <div class="student-report-toolbar"><span class="student-report-badge">كشف حساب الطالب</span><span class="student-report-badge">تاريخ التقرير: ${new Date().toLocaleString('ar-EG')}</span></div>
          <div class="student-report-head">
            <div class="student-report-card"><div class="label">اسم الطالب</div><div class="value">${_0xSanitize(student.name||'-')}</div></div>
            <div class="student-report-card"><div class="label">رقم الهاتف</div><div class="value" dir="ltr">${_0xSanitize(student.phone||'-')}</div></div>
            <div class="student-report-card"><div class="label">الصف الدراسي</div><div class="value">${_0xSanitize(student.grade||'-')}</div></div>
            <div class="student-report-card"><div class="label">السنة الدراسية</div><div class="value">${_0xSanitize(student.academicYear||'-')}</div></div>
          </div>
          <div class="student-report-section"><h3>ملخص الأداء</h3><div class="student-report-head">
            <div class="student-report-card"><div class="label">إجمالي الاختبارات</div><div class="value">${results.length}</div></div>
            <div class="student-report-card"><div class="label">اختبارات مكتملة</div><div class="value">${submitted.length}</div></div>
            <div class="student-report-card"><div class="label">غير مكتملة</div><div class="value">${incomplete.length}</div></div>
            <div class="student-report-card"><div class="label">النجاح / الرسوب</div><div class="value">${success} / ${fail}</div></div>
          </div></div>
          <div class="student-report-section"><h3>التقييم العام للطالب</h3><div class="student-report-head">
            <div class="student-report-card"><div class="label">إجمالي الدرجات</div><div class="value">${sumScore} / ${sumTotal}</div></div>
            <div class="student-report-card"><div class="label">النسبة العامة</div><div class="value">${submitted.length?overall+'%':'غير متاحة'}</div></div>
            <div class="student-report-card"><div class="label">التقدير العام</div><div class="value">${overallLevel}</div></div>
            <div class="student-report-card"><div class="label">إجمالي زمن الاختبارات</div><div class="value">${timedCount?_0xFormatDuration(totalSeconds):'غير متاح'}</div></div>
          </div><div class="student-report-table-wrap"><table class="student-report-table"><thead><tr><th>راسب</th><th>مقبول</th><th>جيد</th><th>جيد جدًا</th><th>امتياز</th><th>غير محدد</th></tr></thead><tbody><tr><td>${levels.fail}</td><td>${levels.passable}</td><td>${levels.good}</td><td>${levels.verygood}</td><td>${levels.excellent}</td><td>${levels.other}</td></tr></tbody></table></div></div>
          <div class="student-report-section"><h3>الأداء حسب المادة</h3>${subjectRows?`<div class="student-report-table-wrap"><table class="student-report-table"><thead><tr><th>المادة</th><th>عدد الاختبارات</th><th>الدرجات</th><th>الإجمالي</th><th>أعلى درجة</th><th>أقل درجة</th><th>النسبة</th><th>التقدير</th><th>نجاح</th><th>رسوب</th></tr></thead><tbody>${subjectRows}</tbody></table></div>`:'<div class="student-report-empty">لا توجد نتائج مكتملة مسجلة لهذا الطالب.</div>'}</div>
          <div class="student-report-section"><h3>تفاصيل الاختبارات</h3>${resultRows?`<div class="student-report-table-wrap"><table class="student-report-table"><thead><tr><th>الاختبار</th><th>المادة</th><th>التاريخ</th><th>الدرجة</th><th>النهائي</th><th>النسبة</th><th>التقدير</th><th>الحالة</th><th>وقت الحل</th></tr></thead><tbody>${resultRows}</tbody></table></div>`:'<div class="student-report-empty">لا توجد اختبارات مسجلة لهذا الطالب.</div>'}</div>
          <div class="student-report-section"><h3>الوقت</h3><p>متوسط الوقت للاختبارات التي يتوفر لها زمن: ${timedCount? _0xFormatDuration(Math.round(totalSeconds/timedCount)):'غير متاح'}.</p><p>إجمالي الوقت المسجل: ${timedCount?_0xFormatDuration(totalSeconds):'غير متاح'}.</p></div>
        </div>`;
    }
    async function _0xOpenStudentReport(studentId){
        const student=_0xAdminStudents.find(x=>String(x.id)===String(studentId));
        if(!student){alert('تعذر العثور على الطالب.');return;}
        _0xCurrentStudentReport={student,results:[]};
        _0xE.studentReportContent.innerHTML='<div class="no-links">جاري تحميل كشف الطالب...</div>';
        _0xE.studentReportModal.classList.add('active');document.body.classList.add('modal-open');
        try{
            const results=await _0xGetStudentResults(studentId);
            _0xCurrentStudentReport={student,results};
            _0xE.studentReportContent.innerHTML=_0xBuildStudentReport(student,results);
        }catch(e){
            console.error('[Admin] خطأ تحميل كشف الطالب:',e);
            _0xE.studentReportContent.innerHTML='<div class="no-links">تعذر تحميل بيانات الاختبارات: '+_0xSanitize(_0xFriendlyError(e))+'</div>';
        }
    }
    async function _0xExportElementPDF(element,filename){
        if(!element){alert('لا توجد بيانات للتصدير.');return;}
        if(typeof html2pdf!=='function'){alert('مكتبة تصدير PDF غير متاحة حاليًا.');return;}
        const old={display:element.style.display,position:element.style.position,left:element.style.left,top:element.style.top,width:element.style.width};
        element.style.display='block';element.style.position='relative';element.style.left='auto';element.style.top='auto';element.style.width='1100px';
        try{
            await html2pdf().set({margin:[8,8,10,8],filename,image:{type:'jpeg',quality:.96},html2canvas:{scale:1.35,useCORS:true,backgroundColor:'#0a0e14',scrollY:0},jsPDF:{unit:'mm',format:'a4',orientation:'landscape'},pagebreak:{mode:['css','legacy']}}).from(element).save();
        }catch(e){console.error('[PDF] export error:',e);alert('تعذر إنشاء ملف PDF: '+_0xFriendlyError(e));}
        finally{Object.keys(old).forEach(k=>element.style[k]=old[k]);}
    }
    function _0xBuildStudentsPDF(){
        const grades=['الصف الأول الإعدادي','الصف الثاني الإعدادي','الصف الثالث الإعدادي','الصف الأول الثانوي','الصف الثاني الثانوي','الصف الثالث الثانوي'];
        const labels=['أولى إعدادي','ثانية إعدادي','ثالثة إعدادي','أولى ثانوي','ثانية ثانوي','ثالثة ثانوي'];
        const wrap=document.createElement('div');wrap.className='student-report-pdf-root';wrap.style.position='absolute';wrap.style.left='-100000px';wrap.style.top='0';wrap.style.width='1100px';
        const sections=grades.map((g,idx)=>{
            const rows=_0xAdminStudents.filter(x=>String(x.grade||'')===g).sort((a,b)=>_0xArabicStudentCollator.compare(String(a.name||''),String(b.name||'')));
            return `<div class="student-export-grade-section" style="page-break-before:${idx?'always':'auto'}"><h2 style="text-align:center">${labels[idx]} — ${g}</h2><p style="text-align:center">عدد الطلاب: ${rows.length}</p>${rows.length?`<div class="student-report-table-wrap"><table class="student-report-table"><thead><tr><th>#</th><th>اسم الطالب</th><th>رقم الهاتف</th><th>الصف</th><th>المرحلة</th><th>السنة الدراسية</th><th>الحالة</th><th>تاريخ التسجيل</th></tr></thead><tbody>${rows.map((x,i)=>`<tr><td>${i+1}</td><td>${_0xSanitize(x.name||'-')}</td><td dir="ltr">${_0xSanitize(x.phone||'-')}</td><td>${_0xSanitize(x.grade||'-')}</td><td>${_0xSanitize(x.stage||'-')}</td><td>${_0xSanitize(x.academicYear||'-')}</td><td>${x.status==='blocked'?'محظور':'نشط'}</td><td>${_0xFormatDateValue(x.createdAt)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="student-report-empty">لا يوجد طلاب في هذا القسم.</div>'}</div>`;
        }).join('');
        wrap.innerHTML=`<h1 style="text-align:center;margin-bottom:8px">كشف بيانات الطلاب</h1><p style="text-align:center;margin-bottom:18px">تاريخ التقرير: ${new Date().toLocaleString('ar-EG')} — الأقسام: 6</p>${sections}`;
        document.body.appendChild(wrap);return wrap;
    }
    async function _0xExportAllStudentsPDF(){
        if(!_0xAdminStudents.length){alert('لا توجد بيانات طلاب لتصديرها.');return;}
        const el=_0xBuildStudentsPDF();
        try{await _0xExportElementPDF(el,'students-report.pdf');}finally{el.remove();}
    }

    // قائمة الطلاب في لوحة الإدارة — ترتيب أبجدي + بحث + كشف حساب
    function _0xSubscribeStudents(){
        if(_0xStudentUnsub)return;
        _0xStudentUnsub=studentsRef.onSnapshot(function(s){
            _0xAdminStudents=s.docs.map(d=>Object.assign({id:d.id},d.data())).sort((a,b)=>_0xArabicStudentCollator.compare(String(a.name||''),String(b.name||'')));
            const rows=_0xAdminStudents.filter(x=>x.role!=='supervisor');
            const blocked=rows.filter(x=>x.status==='blocked').length;
            _0xE.studentsCount.textContent=rows.length;
            _0xE.blockedStudentsCount.textContent=blocked;
            _0xE.activeStudentsCount.textContent=rows.length-blocked;
            _0xRenderStudentList();
            _0xRenderSupervisorsList();
            _vcRenderPicker();
        }, function(e){
            console.error('[onSnapshot] students error:',e);
            _0xE.studentsList.innerHTML='<div class="no-links">تعذر تحميل قائمة الطلاب.</div>';
        });
    }

    // (10) تحديث لحظي عبر onSnapshot — مع حماية العناصر قيد النشر من الاختفاء
    function _0xSubscribeContent(){
        if(_0xContentUnsub)return;
        _0xContentUnsub=contentRef.onSnapshot(function(s){
            if(s.exists&&s.data().content){
                _0xData=s.data().content;
                _0xGrades.forEach(g=>{
                    _0xData[g]=_0xData[g]||{};
                    _0xSubjects[g].forEach(sub=>{
                        _0xData[g][sub]=_0xData[g][sub]||{books:[],videos:[],quizzes:[]};
                        _0xData[g][sub].books=_0xData[g][sub].books||[];
                        _0xData[g][sub].videos=_0xData[g][sub].videos||[];
                        _0xData[g][sub].quizzes=_0xData[g][sub].quizzes||[];
                    });
                });
                // ✅ إعادة إدراج العناصر قيد النشر إن لم تصل بعد من الخادم
                //   يمنع اختفاء العنصر مؤقتاً إذا وصل onSnapshot ببيانات قديمة أثناء النشر
                _0xPendingPublish.forEach(function(p){
                    const arr=_0xData[p.grade]&&_0xData[p.grade][p.subject]&&_0xData[p.grade][p.subject][p.field];
                    if(Array.isArray(arr) && !arr.find(x=>String(x.id)===String(p.item.id))){
                        arr.push(p.item);
                    }
                });
                if(_0xView==='home')_0xRenderHome();
                else if(_0xView==='subjects')_0xSelectGrade(_0xGrade);
                else if(_0xView==='content')_0xSelectSubject(_0xSubject);
                if(_0xLoggedIn)_0xRenderLinks();
            }
        },function(e){
            console.error('[onSnapshot] خطأ الاستماع للمحتوى:', e);
        });
    }
    function _0xQuizOrderValue(r){
        const raw=String(r.quizId||'').split('_')[0];
        const n=Number(raw);
        return Number.isFinite(n)&&n>0?n:0;
    }
    function _0xGetGradeResults(){
        return _0xAdminResults.filter(function(r){
            return String(r.gradeText||'')===String(_0xSelectedResultsGrade) && typeof r.score==='number' && typeof r.total==='number';
        });
    }
    function _0xGetGradeQuizGroups(){
        const map=new Map();
        _0xGetGradeResults().forEach(function(r){
            const key=String(r.quizId||r.quizTitle||'unknown');
            if(!map.has(key)) map.set(key,{key:key,quizId:String(r.quizId||''),title:String(r.quizTitle||'اختبار بدون اسم'),subject:String(r.subject||'-'),rows:[]});
            map.get(key).rows.push(r);
        });
        return Array.from(map.values()).sort(function(a,b){
            const ao=_0xQuizOrderValue(a.rows[0]), bo=_0xQuizOrderValue(b.rows[0]);
            if(ao&&bo&&ao!==bo) return ao-bo;
            if(ao!==bo) return bo-ao;
            return _0xArabicStudentCollator.compare(a.title,b.title);
        });
    }
    function _0xRenderResultsGradeTabs(){
        if(!_0xE.resultsGradeTabs) return;
        _0xE.resultsGradeTabs.querySelectorAll('.results-grade-tab').forEach(function(tab){
            const active=tab.dataset.resultsGrade===_0xSelectedResultsGrade;
            tab.classList.toggle('active',active); tab.setAttribute('aria-selected',active?'true':'false');
        });
        const count=_0xGetGradeResults().length;
        if(_0xE.resultsGradeSummary) _0xE.resultsGradeSummary.textContent='نتائج '+_0xSelectedResultsGrade+' : '+count+' نتيجة مكتملة';
    }
    function _0xRenderResultsQuizTabs(groups){
        if(!_0xE.resultsQuizTabs) return;
        if(!_0xSelectedResultsQuiz || !groups.some(g=>g.key===_0xSelectedResultsQuiz)) _0xSelectedResultsQuiz=groups.length?groups[groups.length-1].key:'';
        _0xE.resultsQuizTabs.innerHTML=groups.length?groups.map(function(g,i){
            const active=g.key===_0xSelectedResultsQuiz;
            const label=g.title || ('الاختبار '+(i+1));
            const count=g.rows.length;
            return `<button type="button" class="results-quiz-tab${active?' active':''}" data-results-quiz="${_0xSanitize(g.key)}" role="tab" aria-selected="${active?'true':'false'}"><span>${_0xSanitize(label)}</span><small>${count} نتيجة</small></button>`;
        }).join(''):'<div class="results-quiz-empty">لا توجد اختبارات مكتملة لهذا الصف حتى الآن.</div>';
        _0xE.resultsQuizTabs.querySelectorAll('.results-quiz-tab').forEach(function(tab){
            tab.onclick=function(){ _0xSelectedResultsQuiz=tab.dataset.resultsQuiz; _0xRenderResultsList(); };
        });
        if(_0xE.resultsQuizSummary){
            const selected=groups.find(g=>g.key===_0xSelectedResultsQuiz);
            _0xE.resultsQuizSummary.textContent=selected?'الاختبار المحدد: '+selected.title+' · '+selected.subject+' · عدد المشاركين: '+selected.rows.length:'';
        }
    }
    function _0xRenderResultsList(){
        _0xRenderResultsGradeTabs();
        const groups=_0xGetGradeQuizGroups();
        _0xRenderResultsQuizTabs(groups);
        const selected=groups.find(g=>g.key===_0xSelectedResultsQuiz);
        if(!selected){
            _0xE.resultsList.innerHTML='<div class="no-links">اختر اختبارًا من الأقسام أعلاه لعرض أسماء الطلاب ودرجاتهم.</div>';
            return;
        }
        const rows=selected.rows.slice().sort(function(a,b){
            return _0xArabicStudentCollator.compare(String(a.studentName||''),String(b.studentName||''));
        });
        _0xE.resultsList.innerHTML=`<div class="result-exam-head"><div><strong>${_0xSanitize(selected.title)}</strong><span>${_0xSanitize(selected.subject)}</span></div><div class="result-exam-count">${rows.length} طالب</div></div>`+
            `<div class="result-table-wrap"><table class="result-table"><thead><tr><th>#</th><th>اسم الطالب</th><th>الدرجة</th><th>النسبة المئوية</th><th>التقدير</th><th>تاريخ التسليم</th></tr></thead><tbody>`+
            rows.map(function(r,i){
                const score=Number(r.score)||0,total=Number(r.total)||0;
                const pct=Number.isFinite(Number(r.percent))?Number(r.percent):(total?Math.round(score/total*100):0);
                return `<tr><td>${i+1}</td><td>${_0xSanitize(r.studentName||'طالب')}</td><td><strong>${score} / ${total}</strong></td><td><strong>${pct}%</strong></td><td>${_0xSanitize(r.level||'غير محدد')}</td><td>${r.submittedAt&&r.submittedAt.toDate?r.submittedAt.toDate().toLocaleString('ar-EG'):'-'}</td></tr>`;
            }).join('')+'</tbody></table></div>';
    }
    function _0xSubscribeResults(){
        if(_0xResultUnsub) return;
        _0xResultUnsub=resultsRef.orderBy('submittedAt','desc').limit(200).onSnapshot(function(s){
            _0xAdminResults=s.docs.map(function(d){return Object.assign({id:d.id},d.data());});
            _0xRenderResultsList();
            if(_0xLoggedIn) _0xRenderStudentList();
        }, function(e){ console.error('[onSnapshot] results error:',e); _0xE.resultsList.innerHTML='<div class="no-links">تعذر تحميل نتائج الاختبارات.</div>'; });
    }
    function _0xInitTheme(){document.body.classList.remove('light-mode');if(_0xE.themeToggle){_0xE.themeToggle.textContent='☾ الوضع الليلي';_0xE.themeToggle.onclick=()=>{document.body.classList.remove('light-mode');localStorage.setItem('alidahTheme','dark');};}}
    function _0xSetAdminType(){const quiz=_0xE.typeSel.value==='quiz';_0xE.linkGroup.style.display=quiz?'none':'block';_0xE.durationGroup.style.display=quiz?'block':'none';_0xE.builder.innerHTML='';if(!quiz)return;let count=0;const wrap=document.createElement('div');wrap.innerHTML='<div class="builder-head"><h4>أسئلة الاختبار</h4><button type="button" class="mini-btn" id="add-question">+ إضافة سؤال</button></div><div id="questions-list"></div>';_0xE.builder.appendChild(wrap);const list=wrap.querySelector('#questions-list');const add=()=>{const card=document.createElement('div');card.className='question-editor';card.innerHTML=`<div class="question-editor-head"><b>السؤال ${++count}</b><button type="button" class="remove-q">حذف</button></div><input class="admin-input q-text" placeholder="نص السؤال"><select class="admin-select q-type"><option value="mcq">اختيار من متعدد</option><option value="tf">صح أو خطأ</option><option value="fill">أكمل الفراغ</option><option value="essay">مقالي قصير</option></select><input type="number" class="admin-input q-points" min="0.5" step="0.5" value="1" placeholder="درجة السؤال"><div class="q-extra"></div>`;list.appendChild(card);const type=card.querySelector('.q-type'),extra=card.querySelector('.q-extra');const paint=()=>{if(type.value==='mcq')extra.innerHTML='<input class="admin-input q-opt" placeholder="الخيار الأول"><input class="admin-input q-opt" placeholder="الخيار الثاني"><input class="admin-input q-opt" placeholder="الخيار الثالث"><input class="admin-input q-opt" placeholder="الخيار الرابع"><select class="admin-select q-correct"><option value="0">الإجابة الصحيحة: 1</option><option value="1">الإجابة الصحيحة: 2</option><option value="2">الإجابة الصحيحة: 3</option><option value="3">الإجابة الصحيحة: 4</option></select>';else if(type.value==='tf')extra.innerHTML='<select class="admin-select q-correct"><option value="true">الإجابة الصحيحة: صح</option><option value="false">الإجابة الصحيحة: خطأ</option></select>';else if(type.value==='fill')extra.innerHTML='<input class="admin-input q-correct-text" placeholder="الإجابة الصحيحة">';else extra.innerHTML='<textarea class="admin-input q-model" placeholder="الإجابة النموذجية للمقال القصير"></textarea>';};type.onchange=paint;paint();card.querySelector('.remove-q').onclick=()=>{card.remove();list.querySelectorAll('.question-editor b').forEach((b,i)=>b.textContent='السؤال '+(i+1))};};add();wrap.querySelector('#add-question').onclick=add;}

    // (6) جمع الأسئلة مع تنظيف القيم لـ Firestore (لا undefined، لا NaN)
    function _0xCollectQuestions(){
        return [...document.querySelectorAll('#questions-list .question-editor')].map(card=>{
            const type=String(card.querySelector('.q-type').value);
            const textVal=card.querySelector('.q-text')?String(card.querySelector('.q-text').value||'').trim():'';
            const pointsEl=card.querySelector('.q-points');
            const pointsRaw=pointsEl?Number(pointsEl.value):NaN;
            const points=(Number.isFinite(pointsRaw)&&pointsRaw>0)?pointsRaw:1;
            const q={
                id:String(Date.now()+'_'+Math.random().toString(36).slice(2)),
                text:textVal,
                type:type,
                points:Math.max(0.5,points)
            };
            if(type==='mcq'){
                q.options=[...card.querySelectorAll('.q-opt')].map(x=>String(x.value||'').trim());
                q.correct=String((card.querySelector('.q-correct')&&card.querySelector('.q-correct').value)||'0');
            } else if(type==='tf'){
                q.correct=String((card.querySelector('.q-correct')&&card.querySelector('.q-correct').value)||'true');
            } else if(type==='fill'){
                q.correct=String((card.querySelector('.q-correct-text')&&card.querySelector('.q-correct-text').value)||'').trim();
            } else {
                q.type='essay';
                q.model=String((card.querySelector('.q-model')&&card.querySelector('.q-model').value)||'').trim();
            }
            return q;
        });
    }

    // =============================================
    // 🚀 تهيئة التطبيق
    // =============================================
    async function _0xInit() {
        _0xParticles(); _0xInitTheme();
        // ✅ استعادة جلسة الأدمن المحفوظة محلياً:
        // نفس الإيميل/الحساب المتحقق منه سابقاً → دخول مباشر للوحة الإدارة
        // بدون طلب كلمتي المرور (بعد Refresh أو إغلاق الموقع وفتحه مرة أخرى)
        const savedAdminSession = _0xLoadAdminSession();
        if (savedAdminSession && savedAdminSession.email) {
            _0xLoggedIn = true;
            _0xAdminEmail = savedAdminSession.email;
        }
        // ننتظر المصادقة المجهولة (بمهلة قصيرة) قبل تحميل البيانات
        // حتى تعمل القراءة إن كانت القواعد تتطلب auth
        await _0xWaitForAuth(2500);
        // قراءة إعدادات النظام (السنة الدراسية + شهر البداية + نسبة النجاح)
        await _0xLoadSettings();
        // تعبئة حقول الإعدادات وحقل السنة في نموذج الطالب
        if (_0xE.settingsYear) _0xE.settingsYear.value = _0xSettings.currentYear;
        if (_0xE.settingsStartMonth) _0xE.settingsStartMonth.value = _0xSettings.startMonth;
        if (_0xE.settingsPassPercent) _0xE.settingsPassPercent.value = _0xSettings.passPercent;
        if (_0xE.studentYear) _0xE.studentYear.value = _0xSettings.currentYear;
        // مراقبة لحظية لإعدادات النظام
        _0xSubscribeSettings();
        await _0xLoadData();
        _0xRenderHome();
        // (10)(11) الاستماع اللحظي - الطالب يرى الاختبار الجديد بدون Refresh
        _0xSubscribeContent();
        const sid=localStorage.getItem('alidahStudentId');
        if(sid && !localStorage.getItem('alidahStudentGrade')){
            // جلسة طالب ناقصة البيانات (بدون صف محفوظ) → إعادة التسجيل
            // لضمان قاعدة "الصف المسجّل هو الصلاحية الوحيدة"
            ['alidahStudentId','alidahStudentName','alidahStudentPhone','alidahStudentGrade','alidahStudentStage','alidahStudentYear'].forEach(k=>localStorage.removeItem(k));
            _0xE.studentModal.classList.add('active');
        } else if(sid){
            // الحساب المسجّل من قبل: نزامن دوره لحظياً من Firestore.
            if(!localStorage.getItem(_0xUserRoleKey)) _0xSetLocalUserRole('student');
            _0xSubscribeCurrentStudent();
            _0xRenderHome();
        } else {
            _0xE.studentModal.classList.add('active');
        }
        setTimeout(() => _0xE.loading.classList.add('hidden'), 800);
        window.onscroll = () => { if(window.scrollY > 300) _0xE.scrollTop.classList.add('visible'); else _0xE.scrollTop.classList.remove('visible'); };
        _0xE.scrollTop.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _0xInit);
    else _0xInit();


    document.addEventListener('contextmenu',e=>{if(_0xQuizState)e.preventDefault();});
    document.addEventListener('copy',e=>{if(_0xQuizState)e.preventDefault();});
    document.addEventListener('cut',e=>{if(_0xQuizState)e.preventDefault();});
    document.addEventListener('dragstart',e=>{if(_0xQuizState)e.preventDefault();});
    document.addEventListener('keydown',e=>{if(!_0xQuizState)return;const k=e.key.toLowerCase();if(e.key==='PrintScreen'||e.key==='F12'||(e.ctrlKey&&['p','s','u','c','x'].includes(k))||(e.ctrlKey&&e.shiftKey&&['i','j','c'].includes(k))){e.preventDefault();}});
})();
