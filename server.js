import express from 'express';
import cors from 'cors';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode';
const { Client, LocalAuth } = pkg;

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.text());
app.use(express.json());

// Serve React frontend in production
app.use(express.static(path.join(process.cwd(), 'dist')));

// Brevo SMTP Configuration (for nodemailer — currently unused)
const BREVO_USER = process.env.BREVO_USER || 'alimran9763@gmail.com';
const BREVO_PASS = process.env.BREVO_PASS;

// Brevo REST API Configuration
// BREVO_KEY must be your Brevo API key (from Settings → API Keys in Brevo dashboard)
// It is DIFFERENT from BREVO_PASS (the SMTP password)
const BREVO_KEY = process.env.BREVO_KEY || process.env.BREVO_PASS; // fallback for backward compat
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'edunotify29@gmail.com';

async function sendEmail({ to, subject, html }) {
    if (!BREVO_KEY) {
        throw new Error('BREVO_KEY environment variable is not set.');
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'api-key': BREVO_KEY,
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            sender: { name: "Ramco Institute of Technology", email: SENDER_EMAIL },
            to: [{ email: to }],
            subject: subject,
            htmlContent: html
        })
    });

    const data = await response.json();
    if (!response.ok) {
        console.error('Brevo API rejected the request:', JSON.stringify(data));
        throw new Error(data.message || `Brevo API Error (HTTP ${response.status})`);
    }
    return data;
}



const DB_FILE = path.join(process.cwd(), 'staff_db.json');

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, '[]');
}

function readDB() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// signup route
app.post('/api/auth/signup', (req, res) => {
    try {
        const { email, password, name } = req.body;
        const staff = readDB();

        const exists = staff.find(s => s.id === email);
        if (exists) {
            return res.status(400).json({ error: 'Email already registered.' });
        }

        staff.push({
            id: email,
            email: email,
            password: password,
            name: name,
            department: '',
            gender: 'Female',
            role: ''
        });

        saveDB(staff);
        res.json({ message: 'Signup successful' });
    } catch (err) {
        console.log('Signup error:', err.message);
        res.status(500).json({ error: 'Something went wrong during signup' });
    }
});

// login route
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        const staff = readDB();

        const user = staff.find(s => s.id === email && s.password === password);
        if (!user) {
            return res.status(401).json({ error: 'Wrong email or password.' });
        }

        res.json({ message: 'Login successful', email: user.id });
    } catch (err) {
        console.log('Login error:', err.message);
        res.status(500).json({ error: 'Something went wrong during login' });
    }
});

// forgot password - sends reset email
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const staff = readDB();
        const user = staff.find(s => s.id === email);

        // we dont tell the user if email exists or not for security reasons
        if (!user) {
            return res.json({ message: 'If the email exists, a reset link has been sent.' });
        }

        const token = Buffer.from(email + ':' + Date.now()).toString('base64');
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetLink = `${frontendUrl}/reset?token=${token}`;

        const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #e0d4f7; border-radius: 10px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #B153D7, #FFB399); padding: 28px; text-align: center;">
                    <h2 style="color: white; margin: 0;">Ramco Institute of Technology</h2>
                    <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px;">Password Reset</p>
                </div>
                <div style="padding: 28px;">
                    <p style="color: #444;">Hi ${user.name || email},</p>
                    <p style="color: #444;">Someone requested a password reset for your account. Click the button below to set a new password.</p>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="${resetLink}" style="background: #B153D7; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset Password</a>
                    </div>
                    <p style="color: #999; font-size: 13px;">If you didn't ask for this, just ignore this email.</p>
                </div>
            </div>
        `;

        const data = await sendEmail({
            to: email,
            subject: 'EduNotify - Password Reset',
            html: emailBody
        });

        console.log('Reset email sent:', data.messageId);
        res.json({ message: 'Password reset email sent!', id: data.messageId });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Email failed', details: err.message });
    }
});

// Final step: Reset the password with token
app.post('/api/auth/reset-password', (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ error: 'Missing data' });

        // Decode token (email:timestamp)
        const decoded = Buffer.from(token, 'base64').toString('utf8');
        const [email] = decoded.split(':');

        const staff = readDB();
        const userIndex = staff.findIndex(s => s.id === email);

        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update password
        staff[userIndex].password = newPassword;
        saveDB(staff);

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('Reset error:', err);
        res.status(500).json({ error: 'Could not reset password' });
    }
});

// send parent notification email
app.post('/api/send-notification-email', async (req, res) => {
    try {
        const { to, studentName, message, avg, grade, total, maxMarks, marks } = req.body;

        if (!to || !to.includes('@')) {
            return res.status(400).json({ error: 'Not a valid email' });
        }

        let color = '#607274';
        if (grade === 'Distinction') color = '#B153D7';
        else if (grade === 'Good') color = '#d687b8';
        else if (grade === 'Average') color = '#e68a68';

        const formattedMsg = message.replace(/\n/g, '<br>');

        const emailBody = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { margin: 0; padding: 0; background-color: #f4f7f6; }
                    .email-container { font-family: Arial, sans-serif; max-width: 520px; margin: auto; border: 1px solid #e0d4f7; border-radius: 10px; overflow: hidden; background: #ffffff; }
                    .email-header { background: linear-gradient(135deg, #B153D7, #FFB399); padding: 24px; text-align: center; }
                    .email-body { padding: 24px; }
                    .stats-container { display: block; width: 100%; text-align: center; margin-top: 16px; }
                    .stat-box { display: inline-block; width: 30%; min-width: 120px; box-sizing: border-box; padding: 12px; background: #fff; border: 1px solid #eee; border-radius: 6px; margin: 4px; vertical-align: top; }
                    @media only screen and (max-width: 480px) {
                        .stat-box { width: 100%; display: block; margin: 8px 0; }
                        .email-container { border-radius: 0; border: none; }
                        .email-body { padding: 16px; }
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="email-header">
                        <h2 style="color: white; margin: 0;">Ramco Institute of Technology</h2>
                        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Student Performance Report</p>
                    </div>
                    <div class="email-body">
                        <p style="color: #444;">Dear Parent / Guardian,</p>
                        <div style="background: #f9f9f9; padding: 16px; border-left: 4px solid ${color}; border-radius: 4px; margin: 16px 0;">
                            <p style="color: #333; margin: 0; line-height: 1.6;">${formattedMsg}</p>
                        </div>
                        
                        <div class="stats-container">
                            <div class="stat-box">
                                <strong style="display: block; font-size: 20px; color: ${color};">${total}/${maxMarks}</strong>
                                <span style="font-size: 12px; color: #888;">Total Marks</span>
                            </div>
                            <div class="stat-box">
                                <strong style="display: block; font-size: 20px; color: ${color};">${avg}%</strong>
                                <span style="font-size: 12px; color: #888;">Percentage</span>
                            </div>
                            <div class="stat-box">
                                <strong style="display: block; font-size: 18px; color: ${color};">${grade}</strong>
                                <span style="font-size: 12px; color: #888;">Grade</span>
                            </div>
                        </div>

                        ${Array.isArray(marks) && marks.length > 0 ? `
                        <div style="margin-top: 24px;">
                            <h3 style="font-size: 14px; color: #555; margin-bottom: 10px; font-family: Arial, sans-serif;">📚 Subject-wise Marks</h3>
                            <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 13px;">
                                <thead>
                                    <tr style="background: linear-gradient(135deg, #B153D7, #FFB399);">
                                        <th style="padding: 8px 12px; text-align: left; color: white; border-radius: 4px 0 0 0;">Subject</th>
                                        <th style="padding: 8px 12px; text-align: center; color: white;">Marks</th>
                                        <th style="padding: 8px 12px; text-align: center; color: white; border-radius: 0 4px 0 0;">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${marks.map((m, idx) => {
                                        const pct = m.mark;
                                        const subStatus = pct >= 85 ? 'Distinction' : pct >= 70 ? 'Good' : pct >= 50 ? 'Average' : 'Poor';
                                        const subColor = pct >= 85 ? '#B153D7' : pct >= 70 ? '#d687b8' : pct >= 50 ? '#e68a68' : '#e53e3e';
                                        const rowBg = idx % 2 === 0 ? '#fafafa' : '#fff';
                                        return `<tr style="background: ${rowBg};">
                                            <td style="padding: 8px 12px; color: #333; border-bottom: 1px solid #eee;">${m.subject}</td>
                                            <td style="padding: 8px 12px; text-align: center; font-weight: bold; color: ${subColor}; border-bottom: 1px solid #eee;">${m.mark}/100</td>
                                            <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #eee;">
                                                <span style="background: ${subColor}22; color: ${subColor}; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">${subStatus}</span>
                                            </td>
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>` : ''}

                        <p style="color: #bbb; font-size: 11px; text-align: center; margin-top: 24px;">Sent by EduNotify - Ramco Institute of Technology</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const data = await sendEmail({
            to: to,
            subject: 'Performance Report - ' + studentName,
            html: emailBody
        });

        console.log(`✅ Notification sent to ${to} | messageId: ${data.messageId}`);
        res.json({ success: true, id: data.messageId });
    } catch (err) {
        console.error(`❌ Email send FAILED to ${to}:`, err.message);
        res.status(500).json({ error: 'Email system error', details: err.message });
    }
});

// ── Diagnostic: check env config (no secrets exposed) ──
app.get('/api/debug-config', (req, res) => {
    res.json({
        BREVO_KEY_set:    !!process.env.BREVO_KEY,
        BREVO_PASS_set:   !!process.env.BREVO_PASS,
        SENDER_EMAIL:     SENDER_EMAIL,
        FRONTEND_URL:     process.env.FRONTEND_URL || '(not set)',
        BREVO_KEY_prefix: process.env.BREVO_KEY ? process.env.BREVO_KEY.slice(0, 8) + '...' : 'NOT SET',
        node_version:     process.version,
    });
});

// ── Diagnostic: send a real test email via Brevo ──
app.post('/api/test-email', async (req, res) => {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'Provide { "to": "email@example.com" } in body' });
    try {
        const data = await sendEmail({
            to,
            subject: 'EduNotify — Test Email',
            html: `<div style="font-family:Arial,sans-serif;padding:24px;max-width:480px">
                     <h2 style="color:#B153D7">✅ EduNotify Email Test</h2>
                     <p>If you received this, Brevo is correctly configured on your server.</p>
                     <p style="color:#888;font-size:12px">Sent at: ${new Date().toISOString()}</p>
                   </div>`
        });
        res.json({ success: true, messageId: data.messageId });
    } catch (err) {
        console.error('Test email FAILED:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// get all staff
app.get('/api/staff', (req, res) => {
    try {
        res.json(readDB());
    } catch (err) {
        res.status(500).json({ error: 'Could not read database' });
    }
});

// save or update a staff profile
app.post('/api/staff', (req, res) => {
    try {
        const updated = req.body;
        const staff = readDB();
        const idx = staff.findIndex(s => s.id === updated.id);

        if (idx !== -1) {
            staff[idx] = updated;
        } else {
            staff.push(updated);
        }

        saveDB(staff);
        res.json(staff);
    } catch (err) {
        res.status(500).json({ error: 'Could not save to database' });
    }
});

// this runs the compiled C++ processor on the uploaded CSV
app.post('/api/process-csv', (req, res) => {
    const csv = req.body;
    const tmpFile = path.join(process.cwd(), 'temp_' + Date.now() + '.csv');

    try {
        fs.writeFileSync(tmpFile, typeof csv === 'string' ? csv : csv.toString());

        const exe = path.join(process.cwd(), process.platform === 'win32' ? 'processor.exe' : 'processor');

        execFile(exe, [tmpFile], (err, stdout, stderr) => {
            if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);

            if (err) {
                console.error('C++ execution error:', stderr || err.message);
                return res.status(500).json({ 
                    error: 'C++ processor failed', 
                    details: stderr || err.message,
                    command: exe
                });
            }

            try {
                res.json(JSON.parse(stdout));
            } catch (parseErr) {
                console.log('JSON parse error:', parseErr.message);
                res.status(500).json({ error: 'Bad output from C++ processor' });
            }
        });
    } catch (err) {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
        res.status(500).json({ error: 'Could not write temp file' });
    }
});

// ══════════════════════════════════════════════════
// WhatsApp Automation via whatsapp-web.js
// ══════════════════════════════════════════════════
let waClient = null;
let waStatus = 'disconnected'; // 'disconnected' | 'qr' | 'loading' | 'ready'
let waQrDataUrl = null;        // base64 QR image for frontend

function initWhatsApp() {
    if (waClient) return; // already initializing/ready

    waStatus = 'loading';
    waQrDataUrl = null;

    // Detect Chrome path: Render Linux vs local Windows/Mac
    const chromePaths = [
        '/usr/bin/google-chrome-stable',   // Render (Ubuntu)
        '/usr/bin/chromium-browser',        // Some Linux distros
        '/usr/bin/chromium',
    ];
    const executablePath = chromePaths.find(p => fs.existsSync(p)) || undefined;

    waClient = new Client({
        authStrategy: new LocalAuth({ dataPath: path.join(process.cwd(), '.wwebjs_auth') }),
        puppeteer: {
            headless: true,
            executablePath,   // undefined = use bundled Chromium (local dev)
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process'          // needed for Render free tier (low memory)
            ]
        }
    });

    waClient.on('qr', async (qr) => {
        waStatus = 'qr';
        waQrDataUrl = await qrcode.toDataURL(qr);
        console.log('📱 WhatsApp QR code ready — scan in the app.');
    });

    waClient.on('loading_screen', () => {
        waStatus = 'loading';
        waQrDataUrl = null;
    });

    waClient.on('authenticated', () => {
        waStatus = 'loading';
        waQrDataUrl = null;
        console.log('✅ WhatsApp authenticated.');
    });

    waClient.on('ready', () => {
        waStatus = 'ready';
        waQrDataUrl = null;
        console.log('✅ WhatsApp client is READY to send messages.');
    });

    waClient.on('disconnected', (reason) => {
        console.log('⚠️ WhatsApp disconnected:', reason);
        waStatus = 'disconnected';
        waQrDataUrl = null;
        waClient = null;
    });

    waClient.initialize();
}

// GET /api/whatsapp-status  — returns status + QR code if needed
app.get('/api/whatsapp-status', (req, res) => {
    res.json({ status: waStatus, qr: waQrDataUrl });
});

// POST /api/whatsapp-connect  — starts the WhatsApp client
app.post('/api/whatsapp-connect', (req, res) => {
    if (waStatus === 'ready') {
        return res.json({ message: 'Already connected' });
    }
    initWhatsApp();
    res.json({ message: 'WhatsApp client starting…' });
});

// POST /api/whatsapp-disconnect — destroys the client
app.post('/api/whatsapp-disconnect', async (req, res) => {
    if (waClient) {
        await waClient.destroy();
        waClient = null;
    }
    waStatus = 'disconnected';
    waQrDataUrl = null;
    res.json({ message: 'WhatsApp disconnected.' });
});

// POST /api/send-whatsapp-all
// Body: { students: [{ phone, message, name }] }
app.post('/api/send-whatsapp-all', async (req, res) => {
    if (waStatus !== 'ready') {
        return res.status(503).json({ error: 'WhatsApp not connected. Scan QR first.' });
    }

    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ error: 'No students provided.' });
    }

    const results = [];

    for (const s of students) {
        const digits = (s.phone || '').replace(/\D/g, '');
        if (digits.length < 7) {
            results.push({ name: s.name, phone: s.phone, success: false, error: 'Invalid phone' });
            continue;
        }

        // WhatsApp chat ID format: <countrycode+number>@c.us
        const chatId = digits + '@c.us';

        try {
            await waClient.sendMessage(chatId, s.message);
            console.log(`✅ WhatsApp sent → ${s.name} (${digits})`);
            results.push({ name: s.name, phone: s.phone, success: true });
        } catch (err) {
            console.error(`❌ WhatsApp FAILED → ${s.name}:`, err.message);
            results.push({ name: s.name, phone: s.phone, success: false, error: err.message });
        }

        // Small delay to avoid rate-limiting
        await new Promise(r => setTimeout(r, 800));
    }

    const sent = results.filter(r => r.success).length;
    console.log(`📤 WhatsApp bulk done: ${sent}/${results.length} sent.`);
    res.json({ results, sent, total: results.length });
});

// Fallback for React Router - must be the last route
app.use((req, res) => {
    res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});
