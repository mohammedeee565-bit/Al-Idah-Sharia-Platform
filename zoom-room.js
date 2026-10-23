(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const status = $('room-status');
  const help = $('room-help');
  const title = $('room-title');
  const params = new URLSearchParams(location.search);
  const classId = (params.get('classId') || '').trim();
  const requestedRole = params.get('role') === 'host' ? 'host' : 'participant';
  let joined = false;

  const firebaseConfig = {
    apiKey: 'AIzaSyCTZCt9aKNXPvOdx9g3p7RH4',
    authDomain: 'alidah-99472.firebaseapp.com',
    projectId: 'alidah-99472',
    storageBucket: 'alidah-99472.firebasestorage.app',
    messagingSenderId: '696531426179',
    appId: '1:696531426179:web:7b2176188682adace2b4b6',
    measurementId: 'G-HLC65V979V'
  };

  function showError(message) {
    status.textContent = message;
    help.hidden = false;
    help.textContent = 'لو المشكلة مستمرة، ارجع للمنصة وتأكد أن حساب Zoom تم إعداده وأن حسابك مخوّل لدخول هذه المحاضرة.';
    help.classList.add('room-help-error');
  }
  function setStatus(message) { status.textContent = message; }

  async function getUserName() {
    const raw = localStorage.getItem('alidahStudentName') || localStorage.getItem('alidahStudent') || '';
    return raw.trim() || (requestedRole === 'host' ? 'إدارة منصة الإيضاح' : 'طالب منصة الإيضاح');
  }

  async function start() {
    if (!classId) { showError('رابط القاعة غير مكتمل: لم يتم تحديد المحاضرة.'); return; }
    if (!window.firebase || !window.ZoomMtg) { showError('تعذر تحميل مكتبات القاعة. حدّث الصفحة وتأكد من الاتصال بالإنترنت.'); return; }
    try {
      if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
      const auth = firebase.auth();
      if (!auth.currentUser) {
        setStatus('جاري تجهيز الدخول الآمن...');
        await auth.signInAnonymously();
      }
      const callable = firebase.app().functions('us-central1').httpsCallable('getZoomJoinConfig');
      setStatus('جاري التحقق من صلاحية دخول المحاضرة...');
      const result = await callable({ classId, role: requestedRole, userName: await getUserName() });
      const cfg = result && result.data;
      if (!cfg || !cfg.signature || !cfg.meetingNumber || !cfg.clientId) throw new Error('بيانات دخول Zoom غير مكتملة.');
      title.textContent = 'محاضرة مباشرة · ' + (cfg.role === 'host' ? 'المضيف' : 'الطالب');
      setStatus('جاري تحميل قاعة Zoom...');
      const ZoomMtg = window.ZoomMtg;
      ZoomMtg.setZoomJSLib('https://source.zoom.us/6.2.0/lib', '/av');
      ZoomMtg.preLoadWasm();
      ZoomMtg.prepareWebSDK();
      ZoomMtg.init({
        leaveUrl: location.origin + location.pathname.replace(/zoom-room\.html$/, 'index.html'),
        patchJsMedia: true,
        leaveOnPageUnload: true,
        success: function () {
          setStatus('تم تجهيز القاعة؛ جاري الانضمام...');
          const joinOptions = {
            signature: cfg.signature,
            sdkKey: cfg.clientId,
            meetingNumber: String(cfg.meetingNumber),
            passWord: String(cfg.password || ''),
            userName: String(cfg.userName || 'طالب منصة الإيضاح'),
            success: function () { joined = true; setStatus('أنت داخل المحاضرة الآن.'); },
            error: function (err) { console.error('[Zoom SDK join]', err); showError('تعذر الانضمام إلى الاجتماع. راجع صلاحيات Zoom وبيانات الاجتماع.'); }
          };
          if (cfg.role === 'host' && cfg.zak) joinOptions.zak = cfg.zak;
          ZoomMtg.join(joinOptions);
        },
        error: function (err) { console.error('[Zoom SDK init]', err); showError('تعذر تشغيل قاعة Zoom في هذا المتصفح. جرّب أحدث إصدار من Chrome واسمح بالكاميرا والميكروفون.'); }
      });
    } catch (e) {
      console.error('[Zoom room]', e);
      const code = e && e.code ? String(e.code) : '';
      if (code === 'functions/permission-denied' || code === 'permission-denied') {
        showError('هذا الاجتماع مخصص للحسابات المصرّح لها فقط. حساب الطالب يحتاج ربطًا آمنًا بـFirebase Authentication قبل الدخول.');
      } else if (code === 'functions/failed-precondition' || code === 'failed-precondition') {
        showError((e && e.message) || 'لم يتم تجهيز اجتماع Zoom بعد.');
      } else {
        showError((e && e.message) || 'حدث خطأ أثناء تجهيز القاعة. تأكد من إعداد وظائف Firebase وبيانات Zoom.');
      }
    }
  }
  start();
})();
