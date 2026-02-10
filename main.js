const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const ActivationManager = require('./activation-manager');
const activationManager = new ActivationManager();
const fs = require('fs');

// --- إنشاء نافذة التفعيل ---
function createActivationWindow() {
  const activationWindow = new BrowserWindow({
    width: 500,
    height: 620,
    title: 'تفعيل البرنامج',
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  activationWindow.loadFile('activation.html');
}

// --- إنشاء النافذة الرئيسية ---
function createWindow() {
  // إغلاق أي نافذة تفعيل موجودة
  BrowserWindow.getAllWindows().forEach(win => {
    if (win.title === 'تفعيل البرنامج') {
      win.close();
    }
  });

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false
    },
    icon: path.join(__dirname, 'icon.png')
  });

  mainWindow.loadFile('index.html');
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

// --- منطق بدء التشغيل ---
app.whenReady().then(() => {
  if (activationManager.isActivated()) {
    console.log("✅ البرنامج مفعل. بدء التشغيل الرئيسي.");
    createWindow();
    setupDatabaseAndIpc();
  } else {
    console.log("🟡 البرنامج غير مفعل. فتح نافذة التفعيل.");
    createActivationWindow();
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (activationManager.isActivated()) {
        createWindow();
        if (!db) setupDatabaseAndIpc();
      } else {
        createActivationWindow();
      }
    }
  });
});

// ===== معالج طلب التفعيل =====
ipcMain.handle('activate-license', (event, activationCode) => {
  const result = activationManager.verifyActivationCode(activationCode);
  
  if (result.success) {
    // إغلاق نافذة التفعيل الحالية
    const currentWindow = BrowserWindow.fromWebContents(event.sender);
    if (currentWindow) {
      currentWindow.close();
    }
    
    // فتح النافذة الرئيسية
    setTimeout(() => {
      createWindow();
      setupDatabaseAndIpc();
    }, 500);
    
    return { ...result, reloading: true };
  }
  
  return result;
});

// ===== معالج لطلب رمز التفعيل =====
ipcMain.handle('get-activation-code', () => {
  return activationManager.generateActivationRequest();
});

// ===== معالج لإعادة التعيين =====
ipcMain.handle('reset-activation', () => {
  return activationManager.resetActivation();
});

// إغلاق التطبيق عند إغلاق جميع النوافذ
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

let db;

const menuTemplate = [
  {
    label: 'الملف',
    submenu: [
      {
        label: 'خروج',
        accelerator: 'Ctrl+Q',
        click: () => app.quit()
      }
    ]
  },
  {
    label: 'المساعدة',
    submenu: [
      {
        label: 'عن البرنامج',
        click: () => {
          const aboutWindow = new BrowserWindow({
            width: 400,
            height: 300,
            resizable: false,
            webPreferences: {
              nodeIntegration: true
            }
          });
          aboutWindow.loadFile('about.html');
        }
      }
    ]
  }
];

function setupDatabaseAndIpc() {
    const userDataPath = app.getPath('userData');
    const finalDbPath = path.join(userDataPath, 'quizmaster.db');
    const templateDbPath = path.join(__dirname, 'data', 'quizmaster.db');

    if (!fs.existsSync(finalDbPath)) {
        console.log(`قاعدة البيانات غير موجودة في المسار النهائي. سيتم نسخها من القالب...`);
        try {
            fs.mkdirSync(userDataPath, { recursive: true });
            fs.copyFileSync(templateDbPath, finalDbPath);
            console.log(`✅ تم نسخ قاعدة البيانات بنجاح إلى: ${finalDbPath}`);
        } catch (err) {
            console.error('❌ خطأ فادح: فشل نسخ قاعدة البيانات القالب.', err);
            return;
        }
    } else {
        console.log(`قاعدة البيانات موجودة بالفعل في: ${finalDbPath}`);
    }

    db = new sqlite3.Database(finalDbPath, 
        sqlite3.OPEN_READWRITE | sqlite3.OPEN_FULLMUTEX, 
        (err) => {
        if (err) {
            console.error('❌ خطأ في الاتصال بقاعدة البيانات النهائية:', err.message);
        } else {
            console.log('✅ تم الاتصال بقاعدة البيانات النهائية بنجاح.');
            db.configure("busyTimeout", 30000);
            db.run('PRAGMA foreign_keys = ON;');
        }
    });

    // --- 2. كل دوال ipcMain الخاصة بك (بدون أي تغيير) ---

    // ========== دوال قاعدة البيانات للصفوف ==========
  
    ipcMain.handle('database:getClasses', async () => {
      return new Promise((resolve, reject) => {
          db.all('SELECT * FROM classes ORDER BY created_at DESC', (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
          });
      });
    });
  
    ipcMain.handle('database:addClass', async (event, name, description) => {
      return new Promise((resolve, reject) => {
          db.run(
              'INSERT INTO classes (name, description) VALUES (?, ?)',
              [name, description || ''],
              function(err) {
                  if (err) reject(err);
                  else resolve({ id: this.lastID });
              }
          );
      });
    });
  
    ipcMain.handle('database:updateClass', async (event, id, name, description) => {
      return new Promise((resolve, reject) => {
          db.run(
              'UPDATE classes SET name = ?, description = ? WHERE id = ?',
              [name, description || '', id],
              function(err) {
                  if (err) reject(err);
                  else resolve({ changes: this.changes });
              }
          );
      });
    });
  
    ipcMain.handle('database:deleteClass', async (event, id) => {
      return new Promise((resolve, reject) => {
          db.run('DELETE FROM classes WHERE id = ?', [id], function(err) {
              if (err) {
                  console.error('❌ خطأ في حذف الصف:', err.message);
                  reject(err);
              }
              else resolve({ changes: this.changes });
          });
      });
    });
  
    // ========== دوال قاعدة البيانات للطلاب ==========
    
    ipcMain.handle('database:getStudents', async (event, classId) => {
      return new Promise((resolve, reject) => {
          db.all(
              'SELECT * FROM students WHERE class_id = ? ORDER BY name',
              [classId],
              (err, rows) => {
                  if (err) reject(err);
                  else resolve(rows);
              }
          );
      });
    });
  
    ipcMain.handle('database:addStudent', async (event, classId, name) => {
      return new Promise((resolve, reject) => {
          db.run(
              'INSERT INTO students (class_id, name) VALUES (?, ?)',
              [classId, name],
              function(err) {
                  if (err) reject(err);
                  else resolve({ id: this.lastID });
              }
          );
      });
    });
  
    ipcMain.handle('database:updateStudent', async (event, studentId, name) => {
      return new Promise((resolve, reject) => {
          db.run(
              'UPDATE students SET name = ? WHERE id = ?',
              [name, studentId],
              function(err) {
                  if (err) reject(err);
                  else resolve({ changes: this.changes });
              }
          );
      });
    });
  
    ipcMain.handle('database:deleteStudent', async (event, studentId) => {
      return new Promise((resolve, reject) => {
          db.run('DELETE FROM students WHERE id = ?', [studentId], function(err) {
              if (err) {
                  console.error('❌ خطأ في حذف الطالب:', err.message);
                  reject(err);
              }
              else resolve({ changes: this.changes });
          });
      });
    });
  
    ipcMain.handle('database:changeAttendance', async (event, studentId, change) => {
      return new Promise((resolve, reject) => {
          db.run(
              `UPDATE students 
               SET attendance = CASE 
                  WHEN attendance + ? < 0 THEN 0
                  WHEN attendance + ? > 8 THEN 8
                  ELSE attendance + ?
               END
               WHERE id = ?`,
              [change, change, change, studentId],
              function(err) {
                  if (err) reject(err);
                  else resolve({ changes: this.changes });
              }
          );
      });
    });
  
    ipcMain.handle('database:updateStudentAttendance', async (event, studentId, newAttendance) => {
      return new Promise((resolve, reject) => {
          db.run(
              'UPDATE students SET attendance = ? WHERE id = ?',
              [newAttendance, studentId],
              function(err) {
                  if (err) reject(err);
                  else resolve({ changes: this.changes });
              }
          );
      });
    });
  
    ipcMain.handle('database:checkAndAddCompleted8', async (event, studentId) => {
      return new Promise((resolve, reject) => {
          db.run(
              `UPDATE students 
               SET completed_8 = completed_8 + 1 
               WHERE id = ? AND attendance = 8`,
              [studentId],
              function(err) {
                  if (err) reject(err);
                  else resolve({ changes: this.changes });
              }
          );
      });
    });
  
    ipcMain.handle('database:removeCompleted8', async (event, studentId, index) => {
      return new Promise((resolve, reject) => {
          db.run(
              `UPDATE students 
               SET completed_8 = CASE 
                  WHEN completed_8 > 0 THEN completed_8 - 1 
                  ELSE 0 
               END 
               WHERE id = ?`,
              [studentId],
              function(err) {
                  if (err) reject(err);
                  else resolve({ changes: this.changes });
              }
          );
      });
    });
  
    ipcMain.handle('database:getClassStats', async (event, classId) => {
      return new Promise((resolve, reject) => {
          db.get(
              `SELECT 
                  COUNT(*) as totalStudents,
                  AVG(attendance) * 100 / 8 as avgAttendance
               FROM students 
               WHERE class_id = ?`,
              [classId],
              (err, row) => {
                  if (err) reject(err);
                  else {
                      const stats = {
                          totalStudents: row.totalStudents || 0,
                          avgAttendance: Math.round(row.avgAttendance || 0)
                      };
                      resolve(stats);
                  }
              }
          );
      });
    });
  
    // ========== دوال قاعدة البيانات للوحدات ==========
  
    ipcMain.handle('database:addUnit', async (event, classId, name) => {
      return new Promise((resolve, reject) => {
          db.run(
              'INSERT INTO units (class_id, name) VALUES (?, ?)',
              [classId, name],
              function(err) {
                  if (err) reject(err);
                  else resolve({ id: this.lastID });
              }
          );
      });
    });
  
    ipcMain.handle('database:getUnits', async (event, classId) => {
      return new Promise((resolve, reject) => {
          db.all(
              `SELECT u.*, 
                      (SELECT COUNT(*) FROM questions WHERE unit_id = u.id) as question_count
               FROM units u 
               WHERE u.class_id = ? 
               ORDER BY u.created_at`,
              [classId],
              (err, rows) => {
                  if (err) reject(err);
                  else resolve(rows);
              }
          );
      });
    });
  
  ipcMain.handle('database:updateUnit', async (event, unitId, newName) => {
      return new Promise((resolve, reject) => {
          db.run(
              'UPDATE units SET name = ? WHERE id = ?',
              [newName, unitId],
              function(err) {
                  if (err) {
                      console.error('❌ خطأ في تحديث الوحدة:', err.message);
                      reject(err);
                  } else {
                      console.log(`✅ تم تحديث الوحدة ${unitId} إلى: ${newName}`);
                      resolve({ changes: this.changes });
                  }
              }
          );
      });
  });
  
  ipcMain.handle('database:deleteUnit', async (event, unitId) => {
      return new Promise((resolve, reject) => {
          db.run(
              'DELETE FROM units WHERE id = ?',
              [unitId],
              function(err) {
                  if (err) {
                      console.error('❌ خطأ في حذف الوحدة:', err.message);
                      reject(err);
                  } else {
                      console.log(`✅ تم حذف الوحدة ${unitId}`);
                      resolve({ changes: this.changes });
                  }
              }
          );
      });
  });
  
    // ========== دوال قاعدة البيانات للأسئلة ==========
  
    ipcMain.handle('database:addQuestion', async (event, classId, unitId, type, text, answer, options) => {
      return new Promise((resolve, reject) => {
          db.run(
              'INSERT INTO questions (class_id, unit_id, type, text, answer, options, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
              [classId, unitId, type, text, answer, options],
              function(err) {
                  if (err) reject(err);
                  else resolve({ id: this.lastID });
              }
          );
      });
    });
  
    ipcMain.handle('database:getQuestions', async (event, classId, unitId, type) => {
      return new Promise((resolve, reject) => {
          db.all(
              'SELECT * FROM questions WHERE class_id = ? AND unit_id = ? AND type = ? ORDER BY created_at DESC',
              [classId, unitId, type],
              (err, rows) => {
                  if (err) reject(err);
                  else resolve(rows);
              }
          );
      });
    });
  
    ipcMain.handle('database:getQuestionStats', async (event, classId, unitId) => {
      return new Promise((resolve, reject) => {
          db.get(
              `SELECT 
                  SUM(CASE WHEN type = 'essay' THEN 1 ELSE 0 END) as essay,
                  SUM(CASE WHEN type = 'mcq' THEN 1 ELSE 0 END) as mcq,
                  SUM(CASE WHEN type = 'truefalse' THEN 1 ELSE 0 END) as truefalse
               FROM questions 
               WHERE class_id = ? AND unit_id = ?`,
              [classId, unitId],
              (err, row) => {
                  if (err) reject(err);
                  else {
                      const stats = {
                          essay: row.essay || 0,
                          mcq: row.mcq || 0,
                          truefalse: row.truefalse || 0
                      };
                      resolve(stats);
                  }
              }
          );
      });
    });
  
    ipcMain.handle('database:deleteQuestion', async (event, questionId) => {
      return new Promise((resolve, reject) => {
          db.run('DELETE FROM questions WHERE id = ?', [questionId], function(err) {
              if (err) {
                  console.error('❌ خطأ في حذف السؤال:', err.message);
                  reject(err);
              }
              else resolve({ changes: this.changes });
          });
      });
    });
  
    ipcMain.handle('database:updateQuestion', async (event, questionId, text, answer, options) => {
      return new Promise((resolve, reject) => {
          db.run(
              'UPDATE questions SET text = ?, answer = ?, options = ? WHERE id = ?',
              [text, answer, options, questionId],
              function(err) {
                  if (err) reject(err);
                  else resolve({ changes: this.changes });
              }
          );
      });
    });
  
    ipcMain.handle('database:getQuestion', async (event, questionId) => {
      return new Promise((resolve, reject) => {
          db.get('SELECT * FROM questions WHERE id = ?', [questionId], (err, row) => {
              if (err) reject(err);
              else resolve(row);
          });
      });
    });
  
    // ========== دوال إدارة الفرق ==========
  
    ipcMain.handle('database:addTeam', async (event, classId, name, color) => {
      return new Promise((resolve, reject) => {
          db.run(
              'INSERT INTO teams (class_id, name, color) VALUES (?, ?, ?)',
              [classId, name, color || '#4a90e2'],
              function(err) {
                  if (err) reject(err);
                  else resolve({ id: this.lastID });
              }
          );
      });
    });
  
    ipcMain.handle('database:getTeams', async (event, classId) => {
      return new Promise((resolve, reject) => {
          db.all(
              `SELECT t.*, 
                      COUNT(tm.id) as member_count
               FROM teams t
               LEFT JOIN team_members tm ON t.id = tm.team_id
               WHERE t.class_id = ?
               GROUP BY t.id
               ORDER BY t.created_at`,
              [classId],
              (err, rows) => {
                  if (err) reject(err);
                  else resolve(rows);
              }
          );
      });
    });
  
    ipcMain.handle('database:updateTeam', async (event, teamId, name, color) => {
      return new Promise((resolve, reject) => {
          db.run(
              'UPDATE teams SET name = ?, color = ? WHERE id = ?',
              [name, color, teamId],
              function(err) {
                  if (err) {
                      console.error('❌ خطأ في تحديث الفريق:', err.message);
                      reject(err);
                  } else {
                      console.log(`✅ تم تحديث الفريق ${teamId}`);
                      resolve({ changes: this.changes });
                  }
              }
          );
      });
    });
  
    ipcMain.handle('database:deleteTeam', async (event, teamId) => {
      return new Promise((resolve, reject) => {
          db.run('DELETE FROM team_members WHERE team_id = ?', [teamId], (err1) => {
              if (err1) {
                  console.error('❌ خطأ في حذف أعضاء الفريق:', err1.message);
                  reject(err1);
                  return;
              }
              
              db.run('DELETE FROM teams WHERE id = ?', [teamId], function(err2) {
                  if (err2) {
                      console.error('❌ خطأ في حذف الفريق:', err2.message);
                      reject(err2);
                  } else {
                      console.log(`✅ تم حذف الفريق ${teamId} وأعضائه`);
                      resolve({ changes: this.changes });
                  }
              });
          });
      });
    });
  
    ipcMain.handle('database:addTeamMember', async (event, teamId, studentId) => {
      return new Promise((resolve, reject) => {
          db.run(
              'INSERT OR IGNORE INTO team_members (team_id, student_id) VALUES (?, ?)',
              [teamId, studentId],
              function(err) {
                  if (err) reject(err);
                  else resolve({ id: this.lastID });
              }
          );
      });
    });
  
    ipcMain.handle('database:removeTeamMember', async (event, teamId, studentId) => {
      return new Promise((resolve, reject) => {
          db.run(
              'DELETE FROM team_members WHERE team_id = ? AND student_id = ?',
              [teamId, studentId],
              function(err) {
                  if (err) reject(err);
                  else resolve({ changes: this.changes });
              }
          );
      });
    });
  
    ipcMain.handle('database:getTeamMembers', async (event, teamId) => {
      return new Promise((resolve, reject) => {
          db.all(
              `SELECT s.* 
               FROM students s
               JOIN team_members tm ON s.id = tm.student_id
               WHERE tm.team_id = ?
               ORDER BY s.name`,
              [teamId],
              (err, rows) => {
                  if (err) reject(err);
                  else resolve(rows);
              }
          );
      });
    });
  
    ipcMain.handle('database:getAvailableStudents', async (event, classId) => {
      return new Promise((resolve, reject) => {
          db.all(
              `SELECT s.* 
               FROM students s
               WHERE s.class_id = ? 
               AND s.id NOT IN (
                   SELECT student_id FROM team_members tm
                   JOIN teams t ON tm.team_id = t.id
                   WHERE t.class_id = ?
               )
               ORDER BY s.name`,
              [classId, classId],
              (err, rows) => {
                  if (err) reject(err);
                  else resolve(rows);
              }
          );
      });
    });
  
    ipcMain.handle('database:updateTeamScore', async (event, teamId, scoreChange) => {
      return new Promise((resolve, reject) => {
          db.run(
              'UPDATE teams SET score = score + ? WHERE id = ?',
              [scoreChange, teamId],
              function(err) {
                  if (err) {
                      console.error('❌ خطأ في تحديث نقاط الفريق:', err.message);
                      reject(err);
                  } else {
                      resolve({ changes: this.changes });
                  }
              }
          );
      });
    });
  
  ipcMain.handle('database:resetTeamScore', async (event, teamId) => {
      return new Promise((resolve, reject) => {
          db.run(
              'UPDATE teams SET score = 0 WHERE id = ?',
              [teamId],
              function(err) {
                  if (err) {
                      console.error('❌ خطأ في تصفير نقاط الفريق:', err.message);
                      reject(err);
                  } else {
                      console.log(`✅ تم تصفير نقاط الفريق ${teamId}`);
                      resolve({ changes: this.changes });
                  }
              }
          );
      });
  });
  
    // ========== دوال المسابقات ==========
  
    ipcMain.handle('database:startCompetition', async (event, classId, name, settings) => {
      return new Promise((resolve, reject) => {
          db.run(
              'INSERT INTO competitions (class_id, name, settings) VALUES (?, ?, ?)',
              [classId, name, JSON.stringify(settings || {})],
              function(err) {
                  if (err) reject(err);
                  else resolve({ id: this.lastID });
              }
          );
      });
    });
  
    ipcMain.handle('database:saveQuestionResult', async (event, competitionId, teamId, questionId, isCorrect, points) => {
      return new Promise((resolve, reject) => {
          db.run(
              'INSERT INTO competition_results (competition_id, team_id, question_id, answered_correctly, score_change) VALUES (?, ?, ?, ?, ?)',
              [competitionId, teamId, questionId, isCorrect ? 1 : 0, points || 0],
              function(err) {
                  if (err) reject(err);
                  else resolve({ id: this.lastID });
              }
          );
      });
    });
  
    ipcMain.handle('database:getCompetitionStats', async (event, competitionId) => {
      return new Promise((resolve, reject) => {
          db.all(
              `SELECT t.name as team_name, t.color,
                      SUM(cr.score_change) as total_score,
                      SUM(CASE WHEN cr.answered_correctly = 1 THEN 1 ELSE 0 END) as correct_answers,
                      COUNT(cr.id) as total_questions
               FROM competition_results cr
               JOIN teams t ON cr.team_id = t.id
               WHERE cr.competition_id = ?
               GROUP BY t.id
               ORDER BY total_score DESC`,
              [competitionId],
              (err, rows) => {
                  if (err) reject(err);
                  else resolve(rows);
              }
          );
      });
    });
  
    // ========== دالة التحقق من الجداول ==========
  
    ipcMain.handle('database:checkTables', async () => {
      return new Promise((resolve, reject) => {
          db.all(
              "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
              (err, rows) => {
                  if (err) {
                      console.error('❌ خطأ في جلب الجداول:', err);
                      reject(err);
                  } else {
                      console.log('📊 الجداول الموجودة في قاعدة البيانات:', rows);
                      resolve(rows);
                  }
              }
          );
      });
    });
}
