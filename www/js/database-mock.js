// www/js/database-mock.js
class DatabaseMock {
    constructor() {
        this.classes = JSON.parse(localStorage.getItem('classes')) || [];
        this.students = JSON.parse(localStorage.getItem('students')) || [];
    }

    async getClasses() {
        return this.classes;
    }

    async addClass(name, description) {
        const newClass = {
            id: Date.now(),
            name: name,
            description: description || '',
            created_at: new Date().toISOString()
        };
        
        this.classes.push(newClass);
        localStorage.setItem('classes', JSON.stringify(this.classes));
        
        return { id: newClass.id };
    }

    async updateClass(id, name, description) {
        const index = this.classes.findIndex(c => c.id === id);
        if (index !== -1) {
            this.classes[index] = {
                ...this.classes[index],
                name,
                description: description || ''
            };
            localStorage.setItem('classes', JSON.stringify(this.classes));
            return { changes: 1 };
        }
        return { changes: 0 };
    }

    async deleteClass(id) {
        const initialLength = this.classes.length;
        this.classes = this.classes.filter(c => c.id !== id);
        localStorage.setItem('classes', JSON.stringify(this.classes));
        return { changes: initialLength - this.classes.length };
    }
}

// تعريف global
const dbMock = new DatabaseMock();

window.database = {
    getClasses: () => dbMock.getClasses(),
    addClass: (name, desc) => dbMock.addClass(name, desc),
    updateClass: (id, name, desc) => dbMock.updateClass(id, name, desc),
    deleteClass: (id) => dbMock.deleteClass(id),
    
    // باقي الدوال ستضيفها لاحقاً
    getStudents: () => Promise.resolve([]),
    addStudent: () => Promise.resolve({}),
    updateStudent: () => Promise.resolve({}),
    deleteStudent: () => Promise.resolve({})
};