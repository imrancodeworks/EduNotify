import express from 'express';
import cors from 'cors';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.text());
app.use(express.json());

// Serve React frontend in production
app.use(express.static(path.join(process.cwd(), 'dist')));

// put your gmail and app password here
// go to myaccount.google.com > security > app passwords to get it
const EMAIL_USER = 'edunotify29@gmail.com';
const EMAIL_PASS = 'zdvk vtmd rlbc gbbm';

const mailer = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

mailer.verify((err) => {
    if (err) {
        console.log('Email not connected:', err.message);
    } else {
        console.log('Email is ready to send');
    }
});

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
        const resetLink = 'http://localhost:5173/reset?token=' + token;

        const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #e0d4f7; border-radius: 10px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #B153D7, #FFB399); padding: 28px; text-align: center;">
                    <h2 style="color: white; margin: 0;">EduNotify</h2>
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

        await mailer.sendMail({
            from: '"EduNotify" <' + EMAIL_USER + '>',
            to: email,
            subject: 'EduNotify - Password Reset',
            html: emailBody
        });

        console.log('Reset email sent to', email);
        res.json({ message: 'Password reset email sent!' });
    } catch (err) {
        console.log('Forgot password error:', err.message);
        res.status(500).json({ error: 'Could not send reset email. Check your email settings in server.js' });
    }
});

// send parent notification email
app.post('/api/send-notification-email', async (req, res) => {
    try {
        const { to, studentName, message, avg, grade, total, maxMarks } = req.body;

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
                        <h2 style="color: white; margin: 0;">EduNotify</h2>
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

                        <p style="color: #bbb; font-size: 11px; text-align: center; margin-top: 24px;">Sent by EduNotify - School Management System</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await mailer.sendMail({
            from: '"EduNotify School" <' + EMAIL_USER + '>',
            to: to,
            subject: 'Performance Report - ' + studentName,
            html: emailBody
        });

        console.log('Notification sent to', to);
        res.json({ success: true });
    } catch (err) {
        console.error('Email send error:', err);
        res.status(500).json({ error: 'Email system error', details: err.message });
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

// Fallback for React Router - must be the last route
app.use((req, res) => {
    res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});
