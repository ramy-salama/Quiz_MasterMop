// www/js/database-bridge.js
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { Preferences } from '@capacitor/preferences';

class DatabaseBridge {
    constructor() {
        this.db = null;
        this.sqlite = CapacitorSQLite;
        this.initComplete = false;
    }

    async initialize() {
        try {
            // فتح قاعدة البيانات
            await this.sqlite.createConnection({
                database: 'quizmaster',
                encrypted: false,
                mode: 'no-encryption',
                readonly: false
            });

            await this.sqlite.open({ database: 'quizmaster' });
            
            // اختبار الاتصال
            const ret = await this.sqlite.execute({
                database: 'quizmaster',
                statements: 'SELECT 1 as test'
            });
            
            console.log('✅ Database connected:', ret);
            this.initComplete = true;
            return true;
        } catch (error) {
            console.error('❌ Database init error:', error);
            
            // إنشاء قاعدة بيانات جديدة إذا لم توجد
            await this.createDatabase();
            return true;
        }
    }

    async createDatabase() {
        // هنا ستضع SQL لإنشاء الجداول
        // لأجل الآن، سننشئ جدول بسيط للاختبار
        const createSQL = `
            CREATE TABLE IF NOT EXISTS classes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                class_id INTEGER,
                name TEXT NOT NULL,
                attendance INTEGER DEFAULT 0,
                completed_8 INTEGER DEFAULT 0,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
            );
        `;

        await this.sqlite.execute({
            database: 'quizmaster',
            statements: createSQL
        });
        
        console.log('✅ Database created');
        this.initComplete = true;
    }

    async executeQuery(sql, params = []) {
        if (!this.initComplete) await this.initialize();
        
        try {
            const result = await this.sqlite.execute({
                database: 'quizmaster',
                statements: sql,
                values: params
            });
            
            return result.values || [];
        } catch (error) {
            console.error('❌ Query error:', error, sql, params);
            throw error;
        }
    }

    // ========== دوال الصفوف (مثال) ==========
    async getClasses() {
        const result = await this.executeQuery(
            'SELECT * FROM classes ORDER BY created_at DESC'
        );
        return result;
    }

    async addClass(name, description) {
        const result = await this.executeQuery(
            'INSERT INTO classes (name, description) VALUES (?, ?)',
            [name, description || '']
        );
        return { id: result.lastInsertRowId };
    }

    // أضف باقي الدوال هنا...
}

// إنشاء نسخة وحيدة
const databaseBridge = new DatabaseBridge();

// تعريف global object للوصول من أي مكان
window.database = {
    // دوال الصفوف
    getClasses: () => databaseBridge.getClasses(),
    addClass: (name, desc) => databaseBridge.addClass(name, desc),
    
    // ستضيف باقي الدوال لاحقاً
    // getStudents, addStudent, etc...
};

// تهيئة عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', async () => {
    await databaseBridge.initialize();
    console.log('✅ Database bridge ready');
});