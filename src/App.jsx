import { useState, useCallback, useRef, useEffect } from "react";
import "./App.css";
import Auth from "./Auth";

const DEFAULT_CSV = `Student Name,Parent Phone,Parent Email,DPCO,Tamil,English,BEEE,Maths,Physics,C++
Shalika Aafrin,916381659763,shalikaaafrin1408@gmail.com,98,95,97,99,100,98,99
Lalitha,919876543201,,85,88,82,79,91,84,88
Aarav Kumar,919876543202,parent.aarav@gmail.com,76,80,75,70,85,78,82
Meera Nair,919876543203,,92,90,88,85,89,91,94
Kevin Rose,919876543204,,65,72,68,60,74,66,70
Sneha V.,919876543205,parent.sneha@gmail.com,88,84,90,82,88,85,87
Zaid Ahmed,919876543206,parent.zaid@gmail.com,71,65,70,75,68,72,69
Priya Dharshini,919876543207,parent.priya@gmail.com,94,92,95,91,96,93,95
Rohan Das,919876543208,parent.rohan@gmail.com,55,60,58,62,50,54,59
Ananya Sri,919876543209,parent.ananya@gmail.com,89,91,87,84,92,88,90
Vikram Seth,919876543210,parent.vikram@gmail.com,78,75,80,72,81,79,77
Aditi Rao,919876543211,parent.aditi@gmail.com,82,85,83,80,86,84,81
Imran Khan,919876543212,parent.imran@gmail.com,67,70,65,68,72,69,71
Sophie Wang,919876543213,parent.sophie@gmail.com,95,93,96,94,97,95,96
Karthik S.,919876543214,parent.karthik@gmail.com,73,78,74,76,70,75,73
Maya Angel,919876543215,parent.maya@gmail.com,81,82,85,79,83,81,84
Arjun Raj,919876543216,parent.arjun@gmail.com,59,62,60,58,65,61,63
Sana Mir,919876543217,parent.sana@gmail.com,90,88,92,87,91,89,92
Leo Das,919876543218,parent.leo@gmail.com,77,74,79,81,76,78,75
Tara Iyer,919876543219,parent.tara@gmail.com,86,89,84,83,87,85,88
Vijay Kumar,919876543220,parent.vijay@gmail.com,62,68,64,66,61,65,60`;

function isEmailHeader(h) {
  return /email|mail/i.test(h);
}
function isPhoneHeader(h) {
  return /phone|mobile|contact|number/i.test(h);
}
function looksLikeEmail(val) {
  return typeof val === "string" && val.includes("@");
}
function looksLikePhone(val) {
  return typeof val === "string" && /^[\d\s+\-()]{6,}$/.test(val.trim());
}
function looksLikeMark(val) {
  const n = parseInt(val);
  return !isNaN(n) && n >= 0 && n <= 100;
}

function detectCSVFormat(headers) {
  // Returns: { phoneCol, emailCol, marksStartCol, subjects }
  // Strategy: scan headers for known keywords, then fall back to value-sniffing
  let phoneCol = -1, emailCol = -1, marksStartCol = 1;
  for (let i = 1; i < headers.length; i++) {
    if (isEmailHeader(headers[i]) && emailCol === -1) emailCol = i;
    else if (isPhoneHeader(headers[i]) && phoneCol === -1) phoneCol = i;
  }
  // Find where marks start (first numeric-looking header or after known contact cols)
  const knownCols = new Set([0, phoneCol, emailCol].filter(c => c !== -1));
  marksStartCol = 1;
  for (let i = 1; i < headers.length; i++) {
    if (!knownCols.has(i)) { marksStartCol = i; break; }
  }
  const subjects = headers.slice(marksStartCol).filter(h => h && !isEmailHeader(h) && !isPhoneHeader(h));
  return { phoneCol, emailCol, marksStartCol, subjects };
}

function parseCSV(text) {
  const lines = text.trim().split("\n").filter(l => l.trim());
  const headers = lines[0].split(",").map(h => h.trim());

  // Auto-detect format from header names
  const { phoneCol, emailCol, marksStartCol, subjects } = detectCSVFormat(headers);
  const numSubjects = subjects.length;
  const maxPerSubject = 100;

  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim());
    const name  = vals[0] || "";

    // If headers didn't clearly mark phone/email, sniff the actual values
    let phone = phoneCol !== -1 ? (vals[phoneCol] || "") : "";
    let email = emailCol !== -1 ? (vals[emailCol] || "") : "";

    // Value sniffing fallback: if col1 looks like email but header wasn't detected
    if (!phone && !email && phoneCol === -1 && emailCol === -1) {
      if (looksLikeEmail(vals[1])) { email = vals[1]; }
      else if (looksLikePhone(vals[1])) { phone = vals[1]; }
      if (vals[2] && looksLikeEmail(vals[2])) { email = vals[2]; }
      else if (vals[2] && looksLikePhone(vals[2]) && !phone) { phone = vals[2]; }
    }

    const marks = subjects.map((s, i) => ({
      subject: s,
      mark: Math.min(100, Math.max(0, parseInt(vals[marksStartCol + i]) || 0))
    }));
    const total = marks.reduce((a, m) => a + m.mark, 0);
    const max   = numSubjects * maxPerSubject;
    const avg   = max > 0 ? parseFloat(((total / max) * 100).toFixed(1)) : 0;
    const grade = avg >= 85 ? "Distinction" : avg >= 70 ? "Good" : avg >= 50 ? "Average" : "Poor";
    const gradeColor = avg >= 85 ? "#B153D7" : avg >= 70 ? "#F9B2D7" : avg >= 50 ? "#FFB399" : "#607274";
    const gradeBg    = avg >= 85 ? "rgba(177, 83, 215, 0.15)" : avg >= 70 ? "rgba(249, 178, 215, 0.3)" : avg >= 50 ? "rgba(255, 179, 153, 0.3)" : "rgba(96, 114, 116, 0.15)";
    return { name, phone, email, marks, total, max, numSubjects, avg, grade, gradeColor, gradeBg };
  });
}


// SUBJECTS constant removed — subjects are now read dynamically from CSV

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [students, setStudents] = useState([]);
  const [view, setView] = useState("dashboard");
  const [notifications, setNotifications] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filterGrade, setFilterGrade] = useState("All");
  const [sortBy, setSortBy] = useState("avg_desc");
  const [showProfile, setShowProfile] = useState(false);
  const [staffProfile, setStaffProfile] = useState({
    name: "Shalika Aafrin",
    department: "Computer Science",
    gender: "Female",
    role: "Class Advisor"
  });
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [allStaff, setAllStaff] = useState([]);
  const fileRef = useRef();

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    // Check for duplicate names (case-insensitive)
    const nameExists = allStaff.some(s => 
      s.id !== currentUserEmail && 
      s.name.trim().toLowerCase() === staffProfile.name.trim().toLowerCase()
    );

    if (nameExists) {
      alert("This Staff Name already exists! Please add an initial or make it unique.");
      return;
    }

    setShowProfile(false);
    
    // Ensure the ID is exactly the logged in user's email
    const profileToSave = { ...staffProfile, id: currentUserEmail };
    setStaffProfile(profileToSave);

    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileToSave)
      });
      if (response.ok) {
        const updatedStaff = await response.json();
        setAllStaff(updatedStaff);
      }
    } catch (err) {
      console.warn("Could not save to Database", err);
      // Fallback: update local state if server is down
      setAllStaff(prev => {
        const exists = prev.find(s => s.id === profileToSave.id);
        return exists ? prev.map(s => s.id === profileToSave.id ? profileToSave : s) : [...prev, profileToSave];
      });
    }
  };

  useEffect(() => {
    processWithCpp(DEFAULT_CSV);
    fetchStaffDatabase();
  }, []);

  const fetchStaffDatabase = async (emailToLoad) => {
    try {
      const response = await fetch("/api/staff");
      if (response.ok) {
        const data = await response.json();
        setAllStaff(data);
        
        // Find the user by their email ID
        const targetEmail = emailToLoad || currentUserEmail;
        if (targetEmail) {
          const current = data.find(s => s.id === targetEmail);
          if (current) {
            setStaffProfile(current);
          } else {
            // New user, create empty profile
            setStaffProfile({ id: targetEmail, name: "New Teacher", department: "", gender: "Female", role: "" });
          }
        }
      }
    } catch (err) {
      console.warn("Database offline, using default staff data.");
      setAllStaff([]);
    }
  };

  const processWithCpp = async (csvText, autoGenerate = false) => {
    let dataToUse = [];
    try {
      const response = await fetch("/api/process-csv", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: csvText
      });
      if (!response.ok) throw new Error("C++ Server Offline");
      const data = await response.json();
      setStudents(data);
      dataToUse = data;
      console.log("Processed via C++ Engine successfully.");
    } catch (err) {
      console.warn("Could not connect to C++ Engine. Falling back to JS Parsing.", err);
      try { 
        dataToUse = parseCSV(csvText);
        setStudents(dataToUse); 
      } catch {}
    }

    if (autoGenerate && dataToUse.length > 0) {
      generateNotifications(dataToUse);
    }
  };

  const handleCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setNotifications([]);
      processWithCpp(ev.target.result, true);
    };
    reader.readAsText(file);
  };

  const stats = {
    total: students.length,
    distinction: students.filter(s => s.grade === "Distinction").length,
    good: students.filter(s => s.grade === "Good").length,
    average: students.filter(s => s.grade === "Average").length,
    poor: students.filter(s => s.grade === "Poor").length,
    classAvg: students.length ? (students.reduce((a, s) => a + s.avg, 0) / students.length).toFixed(1) : 0,
    topStudent: students.length ? students.reduce((a, s) => s.avg > a.avg ? s : a) : null,
  };

  const generateNotifications = async (customStudents = null) => {
    const targetStudents = customStudents || students;
    setGenerating(true);
    setGenProgress(0);
    setNotifications([]);
    const results = [];
    for (let i = 0; i < targetStudents.length; i++) {
      const s = targetStudents[i];
      const subjectBreakdown = s.marks.map(m => `${m.subject}: ${m.mark}/100`).join(", ");
      // Local template generation (No API Key Required)
      let msg = "";
      if (s.grade === "Distinction") {
        msg = `Dear Parent,\nWe are thrilled to inform you that ${s.name} has performed exceptionally well, achieving ${s.avg}% (Distinction) with ${s.total}/${s.max} marks. Keep up the excellent work!\n- School Management`;
      } else if (s.grade === "Good") {
        msg = `Dear Parent,\n${s.name} has secured a solid score of ${s.avg}% (${s.total}/${s.max} marks). This is a good performance, and with a little more focus, we are sure they can achieve even higher.\n- School Management`;
      } else if (s.grade === "Average") {
        const weakSubjects = s.marks.filter(m => m.mark < 70).map(m => m.subject).join(", ");
        msg = `Dear Parent,\n${s.name} has scored ${s.avg}% overall. While this is an average performance, we recommend giving extra attention to ${weakSubjects || "their studies"} to improve future results.\n- School Management`;
      } else {
        const weakSubjects = s.marks.filter(m => m.mark < 60).map(m => m.subject).join(", ");
        msg = `Dear Parent,\nThis is to inform you that ${s.name} has scored ${s.avg}% which is below our expectations. We strongly advise focusing on ${weakSubjects || "all subjects"} and would like to discuss their progress with you soon.\n- School Management`;
      }

      // Brief delay for UI progress animation
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const hasPhone = s.phone && s.phone.trim().length >= 6;
      const hasEmail = s.email && s.email.includes('@');

      // Send REAL email via backend Nodemailer
      let emailSent = false;
      if (hasEmail) {
        try {
          const emailRes = await fetch("/api/send-notification-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: s.email,
              studentName: s.name,
              message: msg,
              avg: s.avg,
              grade: s.grade,
              total: s.total,
              maxMarks: s.max
            })
          });
          emailSent = emailRes.ok;
        } catch (err) {
          emailSent = false;
        }
      }

      results.push({ ...s, message: msg, sent: hasPhone, emailSent, hasPhone, hasEmail });
      setGenProgress(i + 1);
      setNotifications([...results]);
    }
    setGenerating(false);
    setView("notifications");
  };

  const filtered = students
    .filter(s => filterGrade === "All" || s.grade === filterGrade)
    .sort((a, b) => {
      if (sortBy === "avg_desc") return b.avg - a.avg;
      if (sortBy === "avg_asc") return a.avg - b.avg;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });

  // Dynamically derive subject list from actual loaded student data
  const subjectColumns = students.length > 0 && students[0].marks
    ? students[0].marks.map(m => m.subject)
    : [];

  const getMarkClass = (mark) => {
    if (mark >= 90) return "high";
    if (mark >= 75) return "good";
    if (mark >= 60) return "avg";
    return "poor";
  };

  if (!isAuthenticated) {
    return <Auth onLogin={(email) => {
      setCurrentUserEmail(email);
      setIsAuthenticated(true);
      fetchStaffDatabase(email);
    }} />;
  }

  return (
    <div>
      {/* Header */}
      <div className="header-bg">
        <div className="header-container">
          <div className="header-top">
            <div className="header-logo-container">
              <img src="/logo.png" alt="EduNotify Logo" style={{ height: "52px", width: "52px", borderRadius: "12px", objectFit: "cover", boxShadow: "0 4px 12px rgba(177,83,215,0.3)" }} />
              <div>
                <div className="header-title">EduNotify</div>
                <div className="header-subtitle">Student Performance & Parent Notification System</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <button onClick={() => fileRef.current.click()} className="upload-btn">
                📂 Upload CSV
              </button>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} style={{ display: "none" }} />
              <button className="profile-btn" onClick={() => setShowProfile(true)} title="Staff Profile">
                {staffProfile.name ? staffProfile.name.charAt(0).toUpperCase() : "👤"}
              </button>
            </div>
          </div>
          {/* Nav */}
          <div className="nav-tabs">
            {["dashboard", "students", "notifications", "staff"].map(v => (
              <button key={v} onClick={() => setView(v)} className={`nav-tab ${view === v ? "nav-tab-active" : "nav-tab-inactive"}`}>
                {v === "notifications" ? `Notifications${notifications.length ? ` (${notifications.length})` : ""}` : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="main-container">
        {/* dashboard view */}
        {view === "dashboard" && (
          <div>
            {/* Stats row */}
            <div className="stats-grid">
              {[
                { label: "Total Students", value: stats.total, icon: "👥", bg: "rgba(194, 226, 250, 0.4)", color: "#607274" },
                { label: "Class Average", value: stats.classAvg + "%", icon: "📊", bg: "rgba(177, 83, 215, 0.15)", color: "#B153D7" },
                { label: "Distinction", value: stats.distinction, icon: "⭐", bg: "rgba(177, 83, 215, 0.15)", color: "#B153D7" },
                { label: "Good", value: stats.good, icon: "✅", bg: "rgba(249, 178, 215, 0.3)", color: "#d687b8" },
                { label: "Average", value: stats.average, icon: "📋", bg: "rgba(255, 179, 153, 0.3)", color: "#e68a68" },
                { label: "Needs Help", value: stats.poor, icon: "⚠️", bg: "rgba(96, 114, 116, 0.15)", color: "#607274" },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ background: s.bg, border: `1px solid ${s.bg}` }}>
                  <div className="stat-icon">{s.icon}</div>
                  <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                  <div className="stat-label" style={{ color: s.color }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Top performer + Grade distribution */}
            <div className="dashboard-sections">
              {/* Top performer */}
              {stats.topStudent && (
                <div className="section-card">
                  <div className="section-title">🏆 Top Performer</div>
                  <div className="top-performer">
                    <div className="avatar-large avatar-top-performer">
                      {stats.topStudent.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <div className="tp-name">{stats.topStudent.name}</div>
                      <div className="tp-grade">{stats.topStudent.avg}% — {stats.topStudent.grade}</div>
                      <div className="tp-marks">{stats.topStudent.total}/{stats.topStudent.max} marks</div>
                    </div>
                  </div>
                </div>
              )}
              {/* Grade distribution */}
              <div className="section-card">
                <div className="section-title">Grade Distribution</div>
                {[
                  { label: "Distinction (≥85%)", count: stats.distinction, color: "#B153D7", bg: "rgba(177, 83, 215, 0.15)" },
                  { label: "Good (70–84%)", count: stats.good, color: "#F9B2D7", bg: "rgba(249, 178, 215, 0.3)" },
                  { label: "Average (50–69%)", count: stats.average, color: "#FFB399", bg: "rgba(255, 179, 153, 0.3)" },
                  { label: "Poor (<50%)", count: stats.poor, color: "#607274", bg: "rgba(96, 114, 116, 0.15)" },
                ].map(g => (
                  <div key={g.label} className="dist-row">
                    <div className="dist-label">{g.label}</div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${(g.count / stats.total) * 100}%`, background: g.color }} />
                    </div>
                    <div className="dist-count" style={{ color: g.color }}>{g.count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <div className="generate-card">
              <div>
                <div className="generate-title">Ready to notify parents?</div>
                <div className="generate-subtitle">Generate AI-personalized messages for all {stats.total} students and send them instantly.</div>
              </div>
              <button onClick={generating ? undefined : generateNotifications} disabled={generating} className={`generate-btn ${generating ? "generate-btn-disabled" : "generate-btn-active"}`}>
                {generating ? (
                  <>
                    <span className="spinner" />
                    Generating... {genProgress}/{students.length}
                  </>
                ) : notifications.length > 0 ? "✅ Regenerate Messages" : "✉️ Generate & Send All"}
              </button>
            </div>
          </div>
        )}

        {/* students view */}
        {view === "students" && (
          <div>
            <div className="filters-bar">
              <div className="filter-label">Filter:</div>
              {["All", "Distinction", "Good", "Average", "Poor"].map(g => (
                <button key={g} onClick={() => setFilterGrade(g)} className={`filter-btn ${filterGrade === g ? "filter-btn-active" : "filter-btn-inactive"}`}>{g}</button>
              ))}
              <div style={{ marginLeft: "auto" }}>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sort-select">
                  <option value="avg_desc">Sort: Highest First</option>
                  <option value="avg_asc">Sort: Lowest First</option>
                  <option value="name">Sort: A–Z</option>
                </select>
              </div>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <th className="text-left">#</th>
                    <th className="text-left">Student</th>
                    {subjectColumns.map(s => <th key={s}>{s}</th>)}
                    <th>Total</th>
                    <th>%</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.name} onClick={() => setSelectedStudent(s)}>
                      <td className="table-index">{i + 1}</td>
                      <td>
                        <div className="student-info">
                          <div className="avatar-small" style={{ background: s.gradeBg, color: s.gradeColor }}>
                            {s.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                          </div>
                          <span className="student-name">{s.name}</span>
                        </div>
                      </td>
                      {s.marks.map(m => (
                        <td key={m.subject} className={`text-center table-mark ${getMarkClass(m.mark)}`}>{m.mark}</td>
                      ))}
                      <td className="text-center table-total">{s.total}</td>
                      <td className="text-center table-avg" style={{ color: s.gradeColor }}>{s.avg}%</td>
                      <td className="text-center">
                        <span className="badge" style={{ background: s.gradeBg, color: s.gradeColor }}>{s.grade}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* notifications view */}
        {view === "notifications" && (
          <div>
            {notifications.length === 0 && !generating ? (
              <div className="empty-state">
                <div className="empty-icon">✉️</div>
                <div className="empty-title">No notifications yet</div>
                <div className="empty-desc">Go to Dashboard and click "Generate & Send All" to create AI-powered messages.</div>
                <button onClick={() => setView("dashboard")} className="primary-btn">Go to Dashboard</button>
              </div>
            ) : (
              <>
                {generating && (
                  <div className="generating-card">
                    <span className="spinner-blue" />
                    <div>
                      <div className="generating-title">Generating messages... {genProgress} of {students.length}</div>
                      <div className="generating-desc">AI is crafting personalized messages for each student</div>
                    </div>
                    <div className="generating-progress-container">
                      <div className="generating-bar-bg">
                        <div className="generating-bar-fill" style={{ width: `${(genProgress / students.length) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                )}
                <div className="noti-header">
                  <div className="noti-count">{notifications.length} messages {generating ? "generating" : "generated"}</div>
                  <span className="noti-success-badge">✓ {notifications.filter(n => n.sent).length} Sent</span>
                </div>
                <div className="noti-grid">
                  {notifications.map((n, i) => (
                    <div key={i} className="noti-card">
                      <div className="noti-card-header">
                        <div className="noti-student-info">
                          <div className="avatar-medium" style={{ background: n.gradeBg, color: n.gradeColor }}>
                            {n.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                          </div>
                          <div>
                            <div className="noti-name">{n.name}</div>
                            <div className="noti-meta">{n.avg}% · <span style={{ color: n.gradeColor, fontWeight: 600 }}>{n.grade}</span> · Parent Contact: {n.hasPhone ? n.phone : "Not Provided"}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          {n.hasPhone ? (
                            <a 
                              href={`https://wa.me/${n.phone}?text=${encodeURIComponent(n.message)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="whatsapp-btn"
                            >
                              💬 Send WhatsApp
                            </a>
                          ) : (
                            <button className="whatsapp-btn" style={{ background: "#607274", cursor: "not-allowed" }} disabled>
                              No Phone Number
                            </button>
                          )}
                          <span className={`noti-status-badge ${n.hasPhone ? "noti-status-success" : "noti-status-failed"}`}>
                            {n.hasPhone ? "✓ SMS Ready" : "⚠ No Phone"}
                          </span>
                          {n.hasEmail ? (
                            <span className={`noti-status-badge ${n.emailSent ? "noti-status-success" : "noti-status-failed"}`}>
                              {n.emailSent ? "✓ Email Auto-Sent" : "⚠ Email Failed"}
                            </span>
                          ) : (
                            <span className="noti-status-badge noti-status-failed">
                              ⚠ No Email Provided
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="noti-message-box" style={{ borderLeft: `3px solid ${n.gradeColor}` }}>
                        <div className="noti-message-title">📱 SMS Message</div>
                        <div className="noti-message-content">{n.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* staff directory view */}
        {view === "staff" && (
          <div className="fade-in">
            <h2 style={{ color: "#607274", marginBottom: 24 }}>Staff Directory</h2>
            <div className="student-grid">
              {allStaff.map((staff, i) => (
                <div key={i} className="student-card hover-lift" onClick={() => setSelectedStaff(staff)} style={{ cursor: "pointer" }}>
                  <div className="card-header">
                    <div className="avatar" style={{ background: "linear-gradient(135deg, #B153D7, #FFB399)", color: "#fff" }}>
                      {staff.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="student-name" style={{ color: "#B153D7" }}>{staff.name}</h3>
                      <div className="student-phone">{staff.department} • {staff.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div onClick={() => setSelectedStudent(null)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} className="modal-content">
            <div className="modal-header">
              <div className="avatar-xl" style={{ background: selectedStudent.gradeBg, color: selectedStudent.gradeColor }}>
                {selectedStudent.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
              </div>
              <div className="modal-name-container">
                <h2 className="modal-name">{selectedStudent.name}</h2>
                <span className="modal-grade-badge" style={{ background: selectedStudent.gradeBg, color: selectedStudent.gradeColor }}>{selectedStudent.grade} — {selectedStudent.avg}%</span>
                <div style={{ fontSize: "13px", color: "#607274", marginTop: 4 }}>
                  Parent: {selectedStudent.phone && selectedStudent.phone.length >= 6 ? selectedStudent.phone : "No Phone"} | {selectedStudent.email && selectedStudent.email.includes('@') ? selectedStudent.email : "No Email"}
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="modal-close">✕</button>
            </div>
            <div className="modal-subjects-container">
              {selectedStudent.marks.map(m => (
                <div key={m.subject} className="modal-subject-row">
                  <div className="modal-subject-name">{m.subject}</div>
                  <div className="modal-subject-bar-bg">
                    <div className="modal-subject-bar-fill" style={{ width: `${m.mark}%`, background: m.mark >= 90 ? "#B153D7" : m.mark >= 75 ? "#F9B2D7" : m.mark >= 60 ? "#FFB399" : "#607274", boxShadow: `0 2px 5px rgba(0,0,0,0.1)` }} />
                  </div>
                  <div className="modal-subject-mark" style={{ color: m.mark >= 90 ? "#B153D7" : m.mark >= 75 ? "#d687b8" : m.mark >= 60 ? "#e68a68" : "#607274" }}>{m.mark}</div>
                </div>
              ))}
            </div>
            <div className="modal-summary">
              <div className="modal-summary-item">
                <div className="modal-summary-value" style={{ color: selectedStudent.gradeColor }}>{selectedStudent.total} / {selectedStudent.max}</div>
                <div className="modal-summary-label">Total Marks ({selectedStudent.numSubjects || selectedStudent.marks?.length} subjects × 100)</div>
              </div>
              <div className="modal-summary-item">
                <div className="modal-summary-value" style={{ color: selectedStudent.gradeColor }}>{selectedStudent.avg}%</div>
                <div className="modal-summary-label">({selectedStudent.total}/{selectedStudent.max}) × 100</div>
              </div>
              <div className="modal-summary-item">
                <div className="modal-summary-value" style={{ color: selectedStudent.gradeColor }}>{selectedStudent.grade}</div>
                <div className="modal-summary-label">Grade</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <div className="modal-overlay" onClick={() => setShowProfile(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="avatar-xl" style={{ background: "linear-gradient(135deg, #B153D7, #FFB399)", color: "#fff" }}>
                {staffProfile.name ? staffProfile.name.charAt(0).toUpperCase() : "👤"}
              </div>
              <div className="modal-name-container">
                <h2 className="modal-name">Staff Profile</h2>
                <div style={{ fontSize: "13px", color: "#607274" }}>Manage your account details</div>
              </div>
              <button className="modal-close" onClick={() => setShowProfile(false)}>✕</button>
            </div>
            
            <form className="profile-form" onSubmit={handleSaveProfile}>
              <div className="profile-input-group">
                <label>Staff Name</label>
                <input 
                  type="text" 
                  value={staffProfile.name} 
                  onChange={e => setStaffProfile({...staffProfile, name: e.target.value})}
                  required 
                />
              </div>
              
              <div className="profile-input-group">
                <label>Department</label>
                <select 
                  value={staffProfile.department} 
                  onChange={e => setStaffProfile({...staffProfile, department: e.target.value})}
                  required 
                >
                  <option value="" disabled>Select Department</option>
                  <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Artificial Intelligence">Artificial Intelligence</option>
                  <option value="Electronics and Communication">Electronics and Communication</option>
                  <option value="Electrical and Electronics">Electrical and Electronics</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="Aeronautical Engineering">Aeronautical Engineering</option>
                </select>
              </div>

              <div className="profile-input-group">
                <label>Gender</label>
                <select 
                  value={staffProfile.gender} 
                  onChange={e => setStaffProfile({...staffProfile, gender: e.target.value})}
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="profile-input-group">
                <label>Staff Role</label>
                <select 
                  value={staffProfile.role} 
                  onChange={e => setStaffProfile({...staffProfile, role: e.target.value})}
                  required 
                >
                  <option value="" disabled>Select Role</option>
                  <option value="HOD">HOD</option>
                  <option value="Assistant Professor">Assistant Professor</option>
                  <option value="DPCO Staff">DPCO Staff</option>
                  <option value="Tamil Staff">Tamil Staff</option>
                  <option value="English Staff">English Staff</option>
                  <option value="BEEE Staff">BEEE Staff</option>
                  <option value="Maths Staff">Maths Staff</option>
                  <option value="Physics Staff">Physics Staff</option>
                  <option value="C++ Staff">C++ Staff</option>
                </select>
              </div>

              <button type="submit" className="profile-save-btn">Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {/* Selected Staff Detail Modal */}
      {selectedStaff && (
        <div onClick={() => setSelectedStaff(null)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} className="modal-content">
            <div className="modal-header">
              <div className="avatar-xl" style={{ background: "linear-gradient(135deg, #B153D7, #FFB399)", color: "#fff" }}>
                {selectedStaff.name.charAt(0).toUpperCase()}
              </div>
              <div className="modal-name-container">
                <h2 className="modal-name">{selectedStaff.name}</h2>
                <span className="modal-grade-badge" style={{ background: "rgba(177, 83, 215, 0.1)", color: "#B153D7" }}>{selectedStaff.role}</span>
              </div>
              <button onClick={() => setSelectedStaff(null)} className="modal-close">✕</button>
            </div>
            <div className="modal-body">
              <div style={{ padding: "20px", background: "#fcfcfc", borderRadius: "12px", border: "1px solid #C2E2FA", marginTop: "16px" }}>
                <p style={{ margin: "0 0 10px", color: "#607274", fontSize: "16px" }}><strong>Department:</strong> {selectedStaff.department}</p>
                <p style={{ margin: "0", color: "#607274", fontSize: "16px" }}><strong>Gender:</strong> {selectedStaff.gender}</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
