const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('database', {
    // ========== دوال الصفوف ==========
    getClasses: () => ipcRenderer.invoke('database:getClasses'),
    addClass: (name, description) => ipcRenderer.invoke('database:addClass', name, description),
    updateClass: (id, name, description) => ipcRenderer.invoke('database:updateClass', id, name, description),
    deleteClass: (id) => ipcRenderer.invoke('database:deleteClass', id),
    
    // ========== دوال الطلاب ==========
    getStudents: (classId) => ipcRenderer.invoke('database:getStudents', classId),
    addStudent: (classId, name) => ipcRenderer.invoke('database:addStudent', classId, name),
    updateStudent: (studentId, name) => ipcRenderer.invoke('database:updateStudent', studentId, name),
    deleteStudent: (studentId) => ipcRenderer.invoke('database:deleteStudent', studentId),
    changeAttendance: (studentId, change) => ipcRenderer.invoke('database:changeAttendance', studentId, change),
    updateStudentAttendance: (studentId, newAttendance) => ipcRenderer.invoke('database:updateStudentAttendance', studentId, newAttendance),
    checkAndAddCompleted8: (studentId) => ipcRenderer.invoke('database:checkAndAddCompleted8', studentId),
    removeCompleted8: (studentId, index) => ipcRenderer.invoke('database:removeCompleted8', studentId, index),
    getClassStats: (classId) => ipcRenderer.invoke('database:getClassStats', classId),
    
    // ========== دوال الوحدات ==========
    addUnit: (classId, name) => ipcRenderer.invoke('database:addUnit', classId, name),
    getUnits: (classId) => ipcRenderer.invoke('database:getUnits', classId),
    updateUnit: (...args) => ipcRenderer.invoke('database:updateUnit', ...args),
    deleteUnit: (...args) => ipcRenderer.invoke('database:deleteUnit', ...args),

    // ========== دوال الأسئلة ==========
    addQuestion: (classId, unitId, type, text, answer, options) => ipcRenderer.invoke('database:addQuestion', classId, unitId, type, text, answer, options),
    getQuestions: (classId, unitId, type) => ipcRenderer.invoke('database:getQuestions', classId, unitId, type),
    getQuestionStats: (classId, unitId) => ipcRenderer.invoke('database:getQuestionStats', classId, unitId),
    deleteQuestion: (questionId) => ipcRenderer.invoke('database:deleteQuestion', questionId),
    updateQuestion: (questionId, text, answer, options) => ipcRenderer.invoke('database:updateQuestion', questionId, text, answer, options),
    getQuestion: (questionId) => ipcRenderer.invoke('database:getQuestion', questionId),
    
    // ========== دوال الفرق الجديدة ==========
    addTeam: (classId, name, color) => ipcRenderer.invoke('database:addTeam', classId, name, color),
    getTeams: (classId) => ipcRenderer.invoke('database:getTeams', classId),
    updateTeam: (teamId, name, color) => ipcRenderer.invoke('database:updateTeam', teamId, name, color),
    deleteTeam: (teamId) => ipcRenderer.invoke('database:deleteTeam', teamId),
    addTeamMember: (teamId, studentId) => ipcRenderer.invoke('database:addTeamMember', teamId, studentId),
    removeTeamMember: (teamId, studentId) => ipcRenderer.invoke('database:removeTeamMember', teamId, studentId),
    getTeamMembers: (teamId) => ipcRenderer.invoke('database:getTeamMembers', teamId),
    getAvailableStudents: (classId) => ipcRenderer.invoke('database:getAvailableStudents', classId),
    updateTeamScore: (teamId, scoreChange) => ipcRenderer.invoke('database:updateTeamScore', teamId, scoreChange),
    resetTeamScore: (teamId) => ipcRenderer.invoke('database:resetTeamScore', teamId), // ← أضف هذا السطر

    
    // ========== دوال المسابقات الجديدة ==========
    startCompetition: (classId, name, settings) => ipcRenderer.invoke('database:startCompetition', classId, name, settings),
    saveQuestionResult: (competitionId, teamId, questionId, isCorrect, points) => ipcRenderer.invoke('database:saveQuestionResult', competitionId, teamId, questionId, isCorrect, points),
    getCompetitionStats: (competitionId) => ipcRenderer.invoke('database:getCompetitionStats', competitionId),
    
    // ========== دالة التحقق من الجداول ==========
    checkTables: () => ipcRenderer.invoke('database:checkTables')
});

contextBridge.exposeInMainWorld('activationAPI', {
  getActivationCode: () => ipcRenderer.invoke('get-activation-code'),
  activateLicense: (code) => ipcRenderer.invoke('activate-license', code),
  resetActivation: () => ipcRenderer.invoke('reset-activation')
});



// رسالة تأكيد تحميل preload
console.log('✅ preload.js تم تحميله بنجاح مع جميع الدوال');