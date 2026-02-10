// www/js/utils.js

// دالة الانتقال بين الشاشات
function navigateTo(url) {
    window.location.href = url;
}

// دالة جلب параметر من URL
function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// دالة لعرض رسالة
function showAlert(message, type = 'info') {
    alert(message); // يمكنك استبدالها بـ toast لاحقاً
}

// جعل الدوال متاحة عالمياً
window.appUtils = {
    navigateTo,
    getUrlParam,
    showAlert
};