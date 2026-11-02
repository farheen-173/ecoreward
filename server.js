/**
 * EcoReward - Smart Dustbin & School Recycling Reward System
 * Ultra-lightweight, zero-dependency Node.js HTTP Server & REST API
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');

// MIME types dictionary for static file serving
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=UTF-8'
};

// -------------------------------------------------------------
// Database Persistence Manager
// -------------------------------------------------------------
let db = {
  students: [],
  claims: [],
  rewards: [],
  redemptions: [],
  dustbins: [],
  settings: {
    schoolName: 'Greenwood Eco Academy',
    pointsPerBottle: 10,
    instantPin: 'ECO1',
    adminEmail: 'admin@school.edu',
    adminPassword: 'admin123'
  }
};

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(data);
      console.log(`[DB] Loaded persistent data: ${db.students.length} students, ${db.claims.length} claims.`);
    } else {
      saveDatabase();
    }
  } catch (err) {
    console.error('[DB] Error reading db.json, using defaults:', err.message);
  }
}

function saveDatabase() {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[DB] Failed to save database:', err.message);
  }
}

// Initial DB load
loadDatabase();

// -------------------------------------------------------------
// Helper Utilities
// -------------------------------------------------------------
function sendJSON(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(payload));
}

function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) { // 1MB limit for light requests
        req.connection.destroy();
        reject(new Error('Request entity too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', err => reject(err));
  });
}

function calculateBadges(points) {
  const badges = ['seedling'];
  if (points >= 50) badges.push('ranger');
  if (points >= 150) badges.push('champion');
  if (points >= 300) badges.push('guardian');
  return badges;
}

// -------------------------------------------------------------
// HTTP Request Handler
// -------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  // Global CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // -----------------------------------------------------------
  // API Routes
  // -----------------------------------------------------------
  if (pathname.startsWith('/api/')) {
    try {
      // 1. Health check & basic stats
      if (pathname === '/api/health' && req.method === 'GET') {
        return sendJSON(res, 200, {
          status: 'ok',
          service: 'EcoReward Backend',
          uptime: process.uptime(),
          time: new Date().toISOString()
        });
      }

      // 2. Global metrics
      if (pathname === '/api/stats' && req.method === 'GET') {
        const totalBottles = db.students.reduce((sum, s) => sum + (s.totalBottles || 0), 0);
        const totalPoints = db.students.reduce((sum, s) => sum + (s.points || 0), 0);
        const totalCO2Kg = (totalBottles * 0.0825).toFixed(2); // ~82.5g CO2 saved per 500ml PET bottle diverted
        const pendingClaims = db.claims.filter(c => c.status === 'pending').length;

        return sendJSON(res, 200, {
          totalBottles,
          totalPoints,
          totalCO2Kg: parseFloat(totalCO2Kg),
          activeStudents: db.students.length,
          pendingClaims,
          activeDustbins: db.dustbins.length,
          schoolName: db.settings.schoolName,
          instantPin: db.settings.instantPin
        });
      }

      // 3. Leaderboard
      if (pathname === '/api/leaderboard' && req.method === 'GET') {
        const topStudents = [...db.students]
          .sort((a, b) => b.points - a.points)
          .slice(0, 15)
          .map((s, idx) => ({
            rank: idx + 1,
            id: s.id,
            name: s.name,
            grade: s.grade,
            points: s.points,
            totalBottles: s.totalBottles,
            co2SavedKg: s.co2SavedKg,
            badges: s.badges
          }));

        return sendJSON(res, 200, { leaderboard: topStudents });
      }

      // 4. Rewards catalog
      if (pathname === '/api/rewards' && req.method === 'GET') {
        return sendJSON(res, 200, { rewards: db.rewards });
      }

      // 5. Dustbins
      if (pathname === '/api/dustbins' && req.method === 'GET') {
        return sendJSON(res, 200, { dustbins: db.dustbins });
      }

      // 6. Student Registration (Capturing minimal info: Name, Email, Grade)
      if (pathname === '/api/register' && req.method === 'POST') {
        const body = await parseJSONBody(req);
        const name = (body.name || '').trim();
        const email = (body.email || '').trim().toLowerCase();
        const grade = (body.grade || 'Grade 9').trim();
        const pin = (body.pin || '1234').trim();

        if (!name || !email) {
          return sendJSON(res, 400, { error: 'Please provide both Student Name and Email.' });
        }

        // Email basic validation
        if (!email.includes('@')) {
          return sendJSON(res, 400, { error: 'Please enter a valid school email address.' });
        }

        // Check if user already exists
        let existing = db.students.find(s => s.email.toLowerCase() === email);
        if (existing) {
          return sendJSON(res, 200, {
            message: 'Account already registered. Logging you in!',
            student: existing,
            isExisting: true
          });
        }

        const newStudent = {
          id: `std_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`,
          name,
          email,
          pin,
          grade,
          points: 10, // Welcome gift 10 points!
          totalBottles: 1, // Bonus welcome starter bottle
          co2SavedKg: 0.08,
          badges: ['seedling'],
          createdAt: new Date().toISOString()
        };

        db.students.push(newStudent);
        saveDatabase();

        return sendJSON(res, 201, {
          message: 'Welcome to EcoReward! 10 starter Eco-Points awarded!',
          student: newStudent,
          isExisting: false
        });
      }

      // 7. Student Login (By email + optional PIN)
      if (pathname === '/api/login' && req.method === 'POST') {
        const body = await parseJSONBody(req);
        const email = (body.email || '').trim().toLowerCase();
        const pin = (body.pin || '').trim();

        if (!email) {
          return sendJSON(res, 400, { error: 'Student email is required.' });
        }

        const student = db.students.find(s => s.email.toLowerCase() === email);
        if (!student) {
          return sendJSON(res, 404, { error: 'Student account not found. Please register first.' });
        }

        if (pin && student.pin && student.pin !== pin) {
          return sendJSON(res, 401, { error: 'Incorrect PIN.' });
        }

        return sendJSON(res, 200, {
          message: 'Login successful',
          student
        });
      }

      // 8. Get specific student profile & history
      if (pathname.startsWith('/api/student/') && req.method === 'GET') {
        const studentId = pathname.replace('/api/student/', '');
        const student = db.students.find(s => s.id === studentId);
        if (!student) {
          return sendJSON(res, 404, { error: 'Student not found' });
        }

        const studentClaims = db.claims
          .filter(c => c.studentId === studentId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const studentRedemptions = db.redemptions
          .filter(r => r.studentId === studentId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return sendJSON(res, 200, {
          student,
          claims: studentClaims,
          redemptions: studentRedemptions
        });
      }

      // 9. Submit bottle deposit / Claim reward
      if (pathname === '/api/claim' && req.method === 'POST') {
        const body = await parseJSONBody(req);
        const studentId = body.studentId;
        const bottles = parseInt(body.bottles, 10) || 1;
        const dustbinId = body.dustbinId || 'BIN-CAFETERIA-01';
        const instantPin = (body.instantPin || '').trim();

        if (!studentId) {
          return sendJSON(res, 400, { error: 'Missing student identifier.' });
        }

        const student = db.students.find(s => s.id === studentId);
        if (!student) {
          return sendJSON(res, 404, { error: 'Student profile not found.' });
        }

        if (bottles < 1 || bottles > 10) {
          return sendJSON(res, 400, { error: 'Bottle count must be between 1 and 10 per drop.' });
        }

        const pointsToAward = bottles * (db.settings.pointsPerBottle || 10);
        const dustbin = db.dustbins.find(d => d.id === dustbinId) || { name: 'Smart Eco Dustbin' };

        // Check if Instant Verification PIN is entered and valid (Alternative instant method!)
        const isInstantApproved = (instantPin && instantPin.toUpperCase() === (db.settings.instantPin || 'ECO1').toUpperCase());

        const newClaim = {
          id: `CLM-${Math.floor(1000 + Math.random() * 9000)}`,
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          bottles,
          pointsRequested: pointsToAward,
          dustbinId,
          dustbinName: dustbin.name,
          status: isInstantApproved ? 'approved' : 'pending',
          method: isInstantApproved ? 'instant_pin' : 'admin_approval',
          rejectionReason: null,
          reviewedBy: isInstantApproved ? 'Smart Bin Instant PIN' : null,
          reviewedAt: isInstantApproved ? new Date().toISOString() : null,
          createdAt: new Date().toISOString()
        };

        if (isInstantApproved) {
          student.points += pointsToAward;
          student.totalBottles += bottles;
          student.co2SavedKg = parseFloat((student.co2SavedKg + (bottles * 0.0825)).toFixed(3));
          student.badges = calculateBadges(student.points);

          // Update dustbin stats
          if (dustbin && dustbin.totalBottlesCollected !== undefined) {
            dustbin.totalBottlesCollected += bottles;
            dustbin.fillPercentage = Math.min(100, (dustbin.fillPercentage || 20) + (bottles * 2));
          }
        }

        db.claims.unshift(newClaim);
        saveDatabase();

        return sendJSON(res, 201, {
          message: isInstantApproved
            ? `Instant verification verified! +${pointsToAward} Eco-Points added to your account!`
            : `Bottle drop recorded! Claim #${newClaim.id} is queued for School Admin approval.`,
          claim: newClaim,
          instantApproved: isInstantApproved,
          currentPoints: student.points
        });
      }

      // 10. Redeem Reward
      if (pathname === '/api/redeem' && req.method === 'POST') {
        const body = await parseJSONBody(req);
        const studentId = body.studentId;
        const rewardId = body.rewardId;

        const student = db.students.find(s => s.id === studentId);
        if (!student) {
          return sendJSON(res, 404, { error: 'Student not found' });
        }

        const reward = db.rewards.find(r => r.id === rewardId);
        if (!reward) {
          return sendJSON(res, 404, { error: 'Reward item not found' });
        }

        if (student.points < reward.pointsCost) {
          return sendJSON(res, 400, {
            error: `Insufficient points! You have ${student.points} points, but need ${reward.pointsCost} points.`
          });
        }

        if (reward.stock <= 0) {
          return sendJSON(res, 400, { error: 'This reward is currently out of stock.' });
        }

        // Deduct points
        student.points -= reward.pointsCost;
        reward.stock -= 1;

        const redemptionCode = `ECO-${reward.category.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const newRedemption = {
          id: `RED-${Date.now()}`,
          studentId: student.id,
          studentName: student.name,
          rewardId: reward.id,
          rewardTitle: reward.title,
          pointsSpent: reward.pointsCost,
          code: redemptionCode,
          status: 'active',
          createdAt: new Date().toISOString()
        };

        db.redemptions.unshift(newRedemption);
        saveDatabase();

        return sendJSON(res, 200, {
          message: `Congratulations! You redeemed "${reward.title}"!`,
          voucherCode: redemptionCode,
          remainingPoints: student.points,
          redemption: newRedemption
        });
      }

      // 11. Admin Login (supports username 'admin' or email 'admin@school.edu')
      if (pathname === '/api/admin/login' && req.method === 'POST') {
        const body = await parseJSONBody(req);
        const email = (body.email || '').trim().toLowerCase();
        const password = (body.password || '').trim();

        const isValidUser = (email === 'admin' || email === 'admin@school.edu' || email === db.settings.adminEmail.toLowerCase());
        const isValidPass = (password === 'admin123' || password === db.settings.adminPassword);

        if (isValidUser && isValidPass) {
          const token = crypto.randomBytes(16).toString('hex');
          return sendJSON(res, 200, {
            message: 'Admin authorization successful',
            token,
            admin: {
              email: db.settings.adminEmail,
              schoolName: db.settings.schoolName
            }
          });
        }

        return sendJSON(res, 401, { error: 'Invalid admin credentials. Use admin / admin123' });
      }

      // 12. Admin: Get all claims
      if (pathname === '/api/admin/claims' && req.method === 'GET') {
        const statusFilter = parsedUrl.searchParams.get('status');
        let filtered = db.claims;
        if (statusFilter && statusFilter !== 'all') {
          filtered = db.claims.filter(c => c.status === statusFilter);
        }
        return sendJSON(res, 200, { claims: filtered });
      }

      // 13. Admin: Approve single claim
      if (pathname.match(/^\/api\/admin\/claims\/[^/]+\/approve$/) && req.method === 'POST') {
        const claimId = pathname.split('/')[4];
        const claim = db.claims.find(c => c.id === claimId);

        if (!claim) {
          return sendJSON(res, 404, { error: 'Claim not found' });
        }

        if (claim.status === 'approved') {
          return sendJSON(res, 400, { error: 'Claim is already approved.' });
        }

        const student = db.students.find(s => s.id === claim.studentId);
        if (student) {
          student.points += claim.pointsRequested;
          student.totalBottles += claim.bottles;
          student.co2SavedKg = parseFloat((student.co2SavedKg + (claim.bottles * 0.0825)).toFixed(3));
          student.badges = calculateBadges(student.points);
        }

        claim.status = 'approved';
        claim.reviewedBy = 'School Admin';
        claim.reviewedAt = new Date().toISOString();

        // Increment bin total
        const dustbin = db.dustbins.find(d => d.id === claim.dustbinId);
        if (dustbin) {
          dustbin.totalBottlesCollected = (dustbin.totalBottlesCollected || 0) + claim.bottles;
          dustbin.fillPercentage = Math.min(100, (dustbin.fillPercentage || 20) + (claim.bottles * 2));
        }

        saveDatabase();

        return sendJSON(res, 200, {
          message: `Approved claim #${claim.id}! ${claim.pointsRequested} points credited to ${claim.studentName}.`,
          claim,
          studentPoints: student ? student.points : null
        });
      }

      // 14. Admin: Reject claim
      if (pathname.match(/^\/api\/admin\/claims\/[^/]+\/reject$/) && req.method === 'POST') {
        const claimId = pathname.split('/')[4];
        const body = await parseJSONBody(req);
        const reason = body.reason || 'Verification failed / non-bottle deposit';

        const claim = db.claims.find(c => c.id === claimId);
        if (!claim) {
          return sendJSON(res, 404, { error: 'Claim not found' });
        }

        claim.status = 'rejected';
        claim.rejectionReason = reason;
        claim.reviewedBy = 'School Admin';
        claim.reviewedAt = new Date().toISOString();

        saveDatabase();

        return sendJSON(res, 200, {
          message: `Claim #${claim.id} rejected.`,
          claim
        });
      }

      // 15. Admin: Bulk approve all pending claims
      if (pathname === '/api/admin/claims/bulk-approve' && req.method === 'POST') {
        const pending = db.claims.filter(c => c.status === 'pending');
        let approvedCount = 0;
        let pointsAwardedTotal = 0;

        pending.forEach(claim => {
          claim.status = 'approved';
          claim.reviewedBy = 'School Admin (Bulk)';
          claim.reviewedAt = new Date().toISOString();
          approvedCount++;
          pointsAwardedTotal += claim.pointsRequested;

          const student = db.students.find(s => s.id === claim.studentId);
          if (student) {
            student.points += claim.pointsRequested;
            student.totalBottles += claim.bottles;
            student.co2SavedKg = parseFloat((student.co2SavedKg + (claim.bottles * 0.0825)).toFixed(3));
            student.badges = calculateBadges(student.points);
          }
        });

        saveDatabase();

        return sendJSON(res, 200, {
          message: `Successfully bulk-approved ${approvedCount} pending claims! Total ${pointsAwardedTotal} points awarded.`,
          approvedCount,
          pointsAwardedTotal
        });
      }

      // 16. Admin: Get all students
      if (pathname === '/api/admin/students' && req.method === 'GET') {
        return sendJSON(res, 200, {
          students: db.students,
          settings: {
            schoolName: db.settings.schoolName,
            pointsPerBottle: db.settings.pointsPerBottle,
            instantPin: db.settings.instantPin
          }
        });
      }

      // 17. Admin: Update settings (e.g. instant PIN)
      if (pathname === '/api/admin/settings' && req.method === 'POST') {
        const body = await parseJSONBody(req);
        if (body.schoolName) db.settings.schoolName = body.schoolName.trim();
        if (body.instantPin) db.settings.instantPin = body.instantPin.trim().toUpperCase();
        if (body.pointsPerBottle) db.settings.pointsPerBottle = parseInt(body.pointsPerBottle, 10) || 10;

        saveDatabase();
        return sendJSON(res, 200, {
          message: 'System settings updated successfully',
          settings: db.settings
        });
      }

      // Fallback 404 for unknown API
      return sendJSON(res, 404, { error: `API route not found: ${req.method} ${pathname}` });

    } catch (apiError) {
      console.error('[API Error]', apiError);
      return sendJSON(res, 500, { error: 'Internal server error', details: apiError.message });
    }
  }

  // -----------------------------------------------------------
  // Static Files Serving (public directory)
  // -----------------------------------------------------------
  if (req.method === 'GET') {
    if (pathname === '/admin' || pathname === '/admin/') {
      const adminFile = path.join(__dirname, 'public', 'admin.html');
      if (fs.existsSync(adminFile)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
        fs.createReadStream(adminFile).pipe(res);
        return;
      }
    }

    let relativePath = pathname === '/' || pathname === '/register' ? 'index.html' : pathname;
    // Security check to avoid path traversal
    const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
    let filePath = path.join(__dirname, 'public', safePath);

    // If requesting directory, serve index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    } else {
      // Single Page Application fallback: serve index.html
      const indexPath = path.join(__dirname, 'public', 'index.html');
      if (fs.existsSync(indexPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
        fs.createReadStream(indexPath).pipe(res);
        return;
      }
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` 🌿 EcoReward System Server Running!`);
  console.log(` 🚀 Local URL:  http://localhost:${PORT}`);
  console.log(` 📦 Storage:    ${DB_FILE} (Persistent)`);
  console.log(` 👨‍🏫 Admin Demo: admin@school.edu / admin123`);
  console.log(`=======================================================`);
});

