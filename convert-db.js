// convert-db.js
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'data', 'quizmaster.db');
const outputPath = path.join(__dirname, 'www', 'data', 'classes.json');

// تأكد من وجود المجلد
if (!fs.existsSync(path.join(__dirname, 'www', 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'www', 'data'), { recursive: true });
}

// فتح الداتابيز
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        return;
    }
    
    console.log('✅ Database opened');
    
    // جلب كل الصفوف
    db.all('SELECT * FROM classes', [], (err, rows) => {
        if (err) {
            console.error('❌ Error querying classes:', err.message);
            return;
        }
        
        console.log(`📊 Found ${rows.length} classes`);
        
        // حفظ كـ JSON
        fs.writeFileSync(outputPath, JSON.stringify(rows, null, 2));
        console.log(`✅ Saved to ${outputPath}`);
        
        db.close();
    });
});