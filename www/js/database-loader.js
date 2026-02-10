// في database-loader.js
async function loadRealData() {
    try {
        // حاول تجيب ملف JSON فيه البيانات
        const response = await fetch('data.json');
        if (response.ok) {
            const data = await response.json();
            // خزن البيانات في localStorage
            localStorage.setItem('classes', JSON.stringify(data.classes || []));
            localStorage.setItem('students', JSON.stringify(data.students || []));
            localStorage.setItem('units', JSON.stringify(data.units || []));
            localStorage.setItem('teams', JSON.stringify(data.teams || []));
            console.log('✅ Loaded real data');
            return true;
        }
    } catch(e) {
        console.log('No data.json file');
    }
    return false;
}

// ثم في تعريف window.database
window.database = {
    getClasses: async () => JSON.parse(localStorage.getItem('classes') || '[]'),
    getStudents: async (classId) => {
        const students = JSON.parse(localStorage.getItem('students') || '[]');
        return students.filter(s => s.class_id == classId);
    },
    // نفس الكلام لباقي الدوال...
};