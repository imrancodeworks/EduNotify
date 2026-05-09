import { useState, useRef, useEffect, useMemo } from "react";
import "./App.css";
import Auth from "./Auth";
import EngineeringBackground from "./EngineeringBackground";

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '');

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
function detectCSVFormat(headers) {
  let phoneCol = -1, emailCol = -1, marksStartCol = 1;
  for (let i = 1; i < headers.length; i++) {
    if (isEmailHeader(headers[i]) && emailCol === -1) emailCol = i;
    else if (isPhoneHeader(headers[i]) && phoneCol === -1) phoneCol = i;
  }
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
  const { phoneCol, emailCol, marksStartCol, subjects } = detectCSVFormat(headers);
  const numSubjects = subjects.length;
  const maxPerSubject = 100;

  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim());
    const name  = vals[0] || "";
    let phone = phoneCol !== -1 ? (vals[phoneCol] || "") : "";
    let email = emailCol !== -1 ? (vals[emailCol] || "") : "";
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
    department: "Computer Science and Engineering",
    gender: "Female",
    role: "Class Advisor"
  });
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [allStaff, setAllStaff] = useState([]);
  const fileRef = useRef();

  useEffect(() => {
    processWithCpp(DEFAULT_CSV);
    fetchStaffDatabase();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const nameExists = allStaff.some(s => 
      s.id !== currentUserEmail && 
      s.name.trim().toLowerCase() === staffProfile.name.trim().toLowerCase()
    );
    if (nameExists) { alert("This Staff Name already exists!"); return; }
    setShowProfile(false);
    const profileToSave = { ...staffProfile, id: currentUserEmail };
    setStaffProfile(profileToSave);
    try {
      const response = await fetch(`${API_BASE}/api/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileToSave)
      });
      if (response.ok) {
        const updatedStaff = await response.json();
        setAllStaff(updatedStaff);
      }
    } catch (err) {
      setAllStaff(prev => {
        const exists = prev.find(s => s.id === profileToSave.id);
        return exists ? prev.map(s => s.id === profileToSave.id ? profileToSave : s) : [...prev, profileToSave];
      });
    }
  };

  const fetchStaffDatabase = async (emailToLoad) => {
    try {
      const response = await fetch(`${API_BASE}/api/staff`);
      if (response.ok) {
        const data = await response.json();
        setAllStaff(data);
        const targetEmail = emailToLoad || currentUserEmail;
        if (targetEmail) {
          const current = data.find(s => s.id === targetEmail);
          if (current) setStaffProfile(current);
          else setStaffProfile({ id: targetEmail, name: "New Teacher", department: "", gender: "Female", role: "" });
        }
      }
    } catch (err) {}
  };

  const processWithCpp = async (csvText, autoGenerate = false) => {
    // Clear notifications when new data comes in
    setNotifications([]);
    
    try {
      const response = await fetch(`${API_BASE}/api/process-csv`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: csvText
      });
      if (!response.ok) throw new Error("C++ Server Offline");
      const data = await response.json();
      
      // SANITIZATION & DEDUPLICATION: re-validate phone/email from C++ output
      const sanitized = data.map(s => {
        const avg = parseFloat(s.avg);
        const grade = avg >= 85 ? "Distinction" : avg >= 70 ? "Good" : avg >= 50 ? "Average" : "Poor";
        const gradeColor = avg >= 85 ? "#B153D7" : avg >= 70 ? "#F9B2D7" : avg >= 50 ? "#FFB399" : "#607274";
        const gradeBg   = avg >= 85 ? "rgba(177,83,215,0.15)" : avg >= 70 ? "rgba(249,178,215,0.3)" : avg >= 50 ? "rgba(255,179,153,0.3)" : "rgba(96,114,116,0.15)";
        // Strict phone: must have 7+ digits (strip non-digits to count)
        const rawPhone = s.phone || "";
        const digitCount = (rawPhone.replace(/\D/g, "")||'').length;
        const phone = digitCount >= 7 ? rawPhone : "";
        // Strict email
        const rawEmail = s.email || "";
        const email = rawEmail.includes("@") && rawEmail.includes(".") ? rawEmail : "";
        return { ...s, phone, email, grade, gradeColor, gradeBg };
      });

      // Remove duplicates by name
      const uniqueData = Array.from(new Map(sanitized.map(s => [s.name, s])).values());
      setStudents(uniqueData);
      
      if (autoGenerate && uniqueData.length > 0) generateNotifications(uniqueData);

    } catch (err) {
      try { 
        const data = parseCSV(csvText);
        // Deduplicate local data too
        const uniqueData = Array.from(new Map(data.map(s => [s.name, s])).values());
        setStudents(uniqueData); 
        if (autoGenerate && uniqueData.length > 0) generateNotifications(uniqueData);

      } catch {}
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
    // Reset input so same file can be re-uploaded
    e.target.value = '';
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

  // Must always receive students explicitly to avoid stale closure
  const generateNotifications = async (targetStudents) => {
    
    if (!targetStudents || targetStudents.length === 0) {
      alert("No student data found. Please upload a CSV file first.");
      return;
    }

    setGenerating(true);
    setGenProgress(0);
    setNotifications([]);
    const results = [];
    
    try {
      for (let i = 0; i < targetStudents.length; i++) {
        const s = targetStudents[i];
        let msg = "";
        if (s.grade === "Distinction") {
          msg = `Dear Parent,\nWe are thrilled to inform you that ${s.name} has performed exceptionally well, achieving ${s.avg}% (Distinction) with ${s.total}/${s.max} marks. Keep up the excellent work!\n- Ramco Institute of Technology`;
        } else if (s.grade === "Good") {
          msg = `Dear Parent,\n${s.name} has secured a solid score of ${s.avg}% (${s.total}/${s.max} marks). This is a good performance, and with a little more focus, we are sure they can achieve even higher.\n- Ramco Institute of Technology`;
        } else if (s.grade === "Average") {
          const weakSubjects = s.marks.filter(m => m.mark < 70).map(m => m.subject).join(", ");
          msg = `Dear Parent,\n${s.name} has scored ${s.avg}% overall. While this is an average performance, we recommend giving extra attention to ${weakSubjects || "their studies"} to improve future results.\n- Ramco Institute of Technology`;
        } else {
          const weakSubjects = s.marks.filter(m => m.mark < 60).map(m => m.subject).join(", ");
          msg = `Dear Parent,\nThis is to inform you that ${s.name} has scored ${s.avg}% which is below our expectations. We strongly advise focusing on ${weakSubjects || "all subjects"} and would like to discuss their progress with you soon.\n- Ramco Institute of Technology`;
        }

        await new Promise(resolve => setTimeout(resolve, 100)); // Faster generation
        
        const hasEmail = s.email && s.email.includes('@') && s.email.includes('.');
        const hasPhone = s.phone && (s.phone.replace(/\D/g,'').length >= 7);

        // Skip if no contact info — flag with warning
        if (!hasEmail && !hasPhone) {
          results.push({ ...s, message: msg, emailSent: false, hasPhone: false, hasEmail: false, noContact: true });
          setGenProgress(i + 1);
          setNotifications([...results]);
          continue;
        }

        let emailSent = false;
        if (hasEmail) {
          try {
            const emailRes = await fetch(`${API_BASE}/api/send-notification-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: s.email,
                studentName: s.name,
                message: msg,
                avg: s.avg,
                grade: s.grade,
                total: s.total,
                maxMarks: s.max,
                marks: s.marks   // ← subject-wise marks for the email table
              })
            });
            emailSent = emailRes.ok;
          } catch (err) {
            console.error("Email failed for:", s.name);
          }
        }
        
        results.push({ ...s, message: msg, emailSent, hasPhone, hasEmail, noContact: false });
        setGenProgress(i + 1);
        setNotifications([...results]);
      }
    } catch (error) {
      console.error("Error during generation:", error);
    } finally {
      setGenerating(false);
      setView("notifications");
    }
  };

  const filtered = useMemo(() => students
    .filter(s => filterGrade === "All" || s.grade === filterGrade)
    .sort((a, b) => {
      if (sortBy === "avg_desc") return b.avg - a.avg;
      if (sortBy === "avg_asc") return a.avg - b.avg;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    }), [students, filterGrade, sortBy]);

  if (!isAuthenticated) {
    return (
      <>
        <EngineeringBackground />
        <Auth onLogin={(email) => {
          setCurrentUserEmail(email);
          setIsAuthenticated(true);
          fetchStaffDatabase(email);
        }} />
      </>
    );
  }

  return (
    <div className="app-root">
      <EngineeringBackground />
      
      {/* Header */}
      <header className="header-bg">
        <div className="header-container">
          <div className="header-top">
            <div className="header-logo-container">
              <img src="/logo.png" alt="Logo" className="logo-img" />
              <div>
                <h1 className="header-title">EduNotify</h1>
                <p className="header-subtitle">Ramco Institute of Technology</p>
              </div>
            </div>
            <div className="header-actions">
              <button onClick={() => fileRef.current.click()} className="btn btn-outline">
                📂 Import CSV
              </button>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} style={{ display: "none" }} />
              <button className="profile-btn" onClick={() => setShowProfile(true)}>
                {staffProfile.name ? staffProfile.name.charAt(0).toUpperCase() : "👤"}
              </button>
            </div>
          </div>
          <nav className="nav-tabs">
            {["dashboard", "students", "notifications", "staff"].map(v => (
              <button key={v} onClick={() => setView(v)} className={`nav-tab ${view === v ? "nav-tab-active" : "nav-tab-inactive"}`}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="main-container">
        {/* Dashboard View */}
        {view === "dashboard" && (
          <div className="view-fade">
            <div className="stats-grid">
              {[
                { label: "Total Students", value: stats.total, icon: "👥", color: "#B153D7" },
                { label: "Class Average", value: stats.classAvg + "%", icon: "📊", color: "#B153D7" },
                { label: "Distinction", value: stats.distinction, icon: "⭐", color: "#F9B2D7" },
                { label: "Good", value: stats.good, icon: "✅", color: "#FFB399" },
                { label: "Average", value: stats.average, icon: "📋", color: "#607274" },
                { label: "Needs Help", value: stats.poor, icon: "⚠️", color: "#607274" },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-icon" style={{ background: s.color + "22", color: s.color }}>{s.icon}</div>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="dashboard-sections">
              {stats.topStudent && (
                <div className="section-card">
                  <h3 className="section-title">🏆 Top Performer</h3>
                  <div className="top-performer">
                    <div className="avatar-large">
                      {stats.topStudent.name.split(" ").map(w => w[0]).join("")}
                    </div>
                    <div>
                      <div className="tp-name">{stats.topStudent.name}</div>
                      <div className="tp-grade">{stats.topStudent.avg}% — {stats.topStudent.grade}</div>
                      <div className="tp-marks">{stats.topStudent.total}/{stats.topStudent.max} marks</div>
                    </div>
                  </div>
                </div>
              )}
              <div className="section-card">
                <h3 className="section-title">Grade Distribution</h3>
                {[
                  { label: "Distinction (≥85%)", count: stats.distinction, color: "#B153D7" },
                  { label: "Good (70–84%)", count: stats.good, color: "#F9B2D7" },
                  { label: "Average (50–69%)", count: stats.average, color: "#FFB399" },
                  { label: "Poor (<50%)", count: stats.poor, color: "#607274" },
                ].map(g => (
                  <div key={g.label} className="dist-row">
                    <div className="dist-label">{g.label}</div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${(g.count / (stats.total || 1)) * 100}%`, background: g.color }} />
                    </div>
                    <div className="dist-count" style={{ color: g.color }}>{g.count}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="generate-card">
              <div className="corner-bracket tl"></div><div className="corner-bracket tr"></div>
              <div className="corner-bracket bl"></div><div className="corner-bracket br"></div>
              <div>
                <h2 className="generate-title">Generate Parent Reports</h2>
                <p className="generate-subtitle">Send automated performance summaries to all {stats.total} parents via Email & WhatsApp.</p>
              </div>
              <button
                onClick={generating ? undefined : () => generateNotifications(students)}
                disabled={generating || students.length === 0}
                className="btn btn-primary generate-btn-active"
              >
                {generating
                  ? <><span className="spinner" /> Sending {genProgress}/{students.length}...</>
                  : `✉️ Generate & Send All (${students.length})`}
              </button>
            </div>
          </div>
        )}

        {/* Students View */}
        {view === "students" && (
          <div className="view-fade">
            <div className="controls-bar">
              <div className="filter-group">
                {["All", "Distinction", "Good", "Average", "Poor"].map(g => (
                  <button key={g} onClick={() => setFilterGrade(g)} className={`filter-btn ${filterGrade === g ? "filter-btn-active" : ""}`}>{g}</button>
                ))}
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sort-select">
                <option value="avg_desc">Highest First</option>
                <option value="avg_asc">Lowest First</option>
                <option value="name">A–Z</option>
              </select>
            </div>

            <div className="student-list-grid">
              {filtered.map((s, i) => (
                <div key={s.name} className="student-card" onClick={() => setSelectedStudent(s)}>
                  <div className="card-header">
                    <div className="avatar" style={{ background: s.gradeBg, color: s.gradeColor }}>
                      {s.name.split(" ").map(w => w[0]).join("")}
                    </div>
                    <div>
                      <h4 className="student-name">{s.name}</h4>
                      <span className="grade-badge" style={{ background: s.gradeBg, color: s.gradeColor }}>{s.grade}</span>
                    </div>
                    <div style={{ marginLeft: "auto", textAlign: "right" }}>
                      <div className="stat-value" style={{ fontSize: "20px", color: s.gradeColor }}>{s.avg}%</div>
                    </div>
                  </div>
                  <div className="marks-preview">
                    {s.marks.slice(0, 3).map(m => `${m.subject}: ${m.mark}`).join(" | ")} ...
                  </div>
                  <button className="btn btn-outline" style={{ width: "100%" }}>View Full Report</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notifications View */}
        {view === "notifications" && (
          <div className="view-fade">
            {notifications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✉️</div>
                <h3 className="empty-title">No Reports Generated</h3>
                <p className="empty-subtitle">Click "Generate & Send" on the Dashboard to start.</p>
                <button onClick={() => setView("dashboard")} className="btn btn-primary">Back to Dashboard</button>
              </div>
            ) : (
            <div className="noti-grid" style={{ display: "grid", gap: "20px" }}>
                {/* ── Send All WhatsApp button ── */}
                {(() => {
                  const waList = notifications.filter(n => n.hasPhone && !n.noContact);
                  if (waList.length === 0) return null;
                  return (
                    <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                      <button
                        id="send-all-whatsapp-btn"
                        className="btn btn-primary"
                        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 22px", fontSize: "14px", fontWeight: 700 }}
                        onClick={async () => {
                          for (let i = 0; i < waList.length; i++) {
                            const n = waList[i];
                            const waUrl = `https://wa.me/${n.phone.replace(/\D/g,'')}?text=${encodeURIComponent(n.message)}`;
                            window.open(waUrl, '_blank');
                            // Small delay so browser doesn't block popups
                            if (i < waList.length - 1) await new Promise(r => setTimeout(r, 600));
                          }
                        }}
                      >
                        💬 Send All WhatsApp ({waList.length})
                      </button>
                    </div>
                  );
                })()}
                {notifications.map((n, i) => (
                  <div key={i} className={`section-card ${n.noContact ? 'noti-no-contact' : ''}`}>
                    {/* Card header row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <div className="avatar" style={{ background: n.gradeBg, color: n.gradeColor, fontWeight: 800 }}>{n.name[0]}</div>
                        <div>
                          <div className="student-name">{n.name}</div>
                          <div style={{ fontSize: "12px", color: "#607274", marginTop: "2px" }}>
                            {n.hasPhone ? `📱 ${n.phone}` : ''}
                            {n.hasPhone && n.hasEmail ? '  ·  ' : ''}
                            {n.hasEmail ? `✉️ ${n.email}` : ''}
                            {n.noContact ? '⚠️ No phone or email provided' : ''}
                          </div>
                        </div>
                      </div>
                      {/* Status badges + action */}
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        {n.noContact ? (
                          <span className="grade-badge noti-status-failed">⚠ No Contact Info</span>
                        ) : (
                          <>
                            {n.hasEmail && (
                              <span className={`grade-badge ${n.emailSent ? 'noti-status-success' : 'noti-status-failed'}`}>
                                {n.emailSent ? '✉ Email Sent' : '✉ Email Failed'}
                              </span>
                            )}
                            {n.hasPhone && (
                              <a
                                href={`https://wa.me/${n.phone.replace(/\D/g,'')}?text=${encodeURIComponent(n.message)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-primary"
                                style={{ padding: "6px 14px", fontSize: "12px", textDecoration: "none" }}
                              >
                                💬 Send WhatsApp
                              </a>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {/* Message preview */}
                    {!n.noContact && (
                      <div className="marks-preview" style={{ borderLeft: `4px solid ${n.gradeColor}`, paddingLeft: "14px", whiteSpace: "pre-line" }}>
                        {n.message}
                      </div>
                    )}
                    {n.noContact && (
                      <div className="marks-preview" style={{ borderLeft: "4px solid #e53e3e", paddingLeft: "14px", color: "#e53e3e" }}>
                        Please add a phone number or email for {n.name} in the CSV file and regenerate.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Staff View */}
        {view === "staff" && (
          <div className="view-fade">
            <h2 className="section-title">Staff Directory</h2>
            <div className="student-list-grid">
              {allStaff.map((staff, i) => (
                <div key={i} className="staff-card" onClick={() => setSelectedStaff(staff)}>
                  <div className="avatar-xl" style={{ background: "linear-gradient(135deg, #B153D7, #FFB399)", color: "#fff", width: "60px", height: "60px" }}>
                    {staff.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="staff-info-main">
                    <h3 className="staff-name-h">{staff.name}</h3>
                    <div className="staff-role-sub">{staff.role}</div>
                    <div style={{ fontSize: "12px", color: "#607274" }}>{staff.department}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedStudent && (
        <div className="modal-overlay" onClick={() => setSelectedStudent(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="avatar-xl" style={{ background: selectedStudent.gradeBg, color: selectedStudent.gradeColor }}>
                {selectedStudent.name[0]}
              </div>
              <div className="modal-name-container">
                <h2 className="modal-name">{selectedStudent.name}</h2>
                <div className="tp-grade">{selectedStudent.grade} — {selectedStudent.avg}%</div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="modal-close">✕</button>
            </div>
            <div className="modal-subjects-container">
              <div className="section-card" style={{ marginBottom: "20px", background: "#f8fafc" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                  <div>
                    <div className="stat-label">Parent Phone</div>
                    <div className="tp-name" style={{ fontSize: "15px" }}>{selectedStudent.phone || "Not Provided"}</div>
                  </div>
                  <div>
                    <div className="stat-label">Parent Email</div>
                    <div className="tp-name" style={{ fontSize: "15px" }}>{selectedStudent.email || "Not Provided"}</div>
                  </div>
                </div>
              </div>
              {selectedStudent.marks.map(m => (
                <div key={m.subject} className="dist-row" style={{ gridTemplateColumns: "120px 1fr 40px" }}>
                  <div className="dist-label">{m.subject}</div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${m.mark}%`, background: "linear-gradient(90deg, #B153D7, #F9B2D7)" }} />
                  </div>
                  <div className="dist-count">{m.mark}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showProfile && (
        <div className="modal-overlay" onClick={() => setShowProfile(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="avatar-xl" style={{ background: "linear-gradient(135deg, #B153D7, #FFB399)", color: "#fff" }}>
                {staffProfile.name ? staffProfile.name.charAt(0).toUpperCase() : "👤"}
              </div>
              <div className="modal-name-container">
                <h2 className="modal-name">Staff Profile</h2>
                <p className="header-subtitle">Edit your professional details</p>
              </div>
              <button className="modal-close" onClick={() => setShowProfile(false)}>✕</button>
            </div>
            <form className="profile-form" onSubmit={handleSaveProfile}>
              <div className="profile-input-group">
                <label>Name</label>
                <input type="text" value={staffProfile.name} onChange={e => setStaffProfile({...staffProfile, name: e.target.value})} required />
              </div>
              <div className="profile-input-group">
                <label>Department</label>
                <select value={staffProfile.department} onChange={e => setStaffProfile({...staffProfile, department: e.target.value})} required>
                  <option value="Computer Science and Engineering">Computer Science</option>
                  <option value="Information Technology">Information Tech</option>
                  <option value="Artificial Intelligence">AI & DS</option>
                  <option value="Electronics and Communication">ECE</option>
                  <option value="Electrical and Electronics">EEE</option>
                  <option value="Mechanical Engineering">Mech</option>
                </select>
              </div>
              <div className="profile-input-group">
                <label>Staff Role</label>
                <select value={staffProfile.role} onChange={e => setStaffProfile({...staffProfile, role: e.target.value})} required>
                  <option value="" disabled>Select Role</option>
                  <option value="HOD">HOD</option>
                  <option value="Assistant Professor">Assistant Professor</option>
                  <option value="Mentor">Mentor</option>
                  <option value="Student Advisor">Student Advisor</option>
                </select>
              </div>
              <div className="profile-input-group">
                <label>Gender</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  {["Male", "Female"].map(g => (
                    <button 
                      key={g} 
                      type="button" 
                      onClick={() => setStaffProfile({...staffProfile, gender: g})}
                      className={`btn ${staffProfile.gender === g ? "btn-primary" : "btn-outline"}`}
                      style={{ flex: 1, padding: "10px" }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="profile-save-btn">Update Profile</button>
              
              <div style={{ borderTop: "1px solid #f0f0f0", marginTop: "10px", paddingTop: "20px" }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ width: "100%", color: "#e53e3e", borderColor: "#fed7d7" }}
                  onClick={() => {
                    setIsAuthenticated(false);
                    setCurrentUserEmail("");
                    setShowProfile(false);
                  }}
                >
                  Logout / Sign Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedStaff && (
        <div className="modal-overlay" onClick={() => setSelectedStaff(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="avatar-xl" style={{ background: "linear-gradient(135deg, #B153D7, #FFB399)", color: "#fff" }}>
                {selectedStaff.name[0]}
              </div>
              <div className="modal-name-container">
                <h2 className="modal-name">{selectedStaff.name}</h2>
                <div className="staff-role-sub">{selectedStaff.role}</div>
              </div>
              <button onClick={() => setSelectedStaff(null)} className="modal-close">✕</button>
            </div>
            <div className="section-card" style={{ marginTop: "20px", display: "grid", gap: "12px" }}>
              <div>
                <div className="stat-label">Department</div>
                <div className="tp-name">{selectedStaff.department || <span style={{color:'#ccc'}}>Not set</span>}</div>
              </div>
              <div>
                <div className="stat-label">Gender</div>
                <div className="tp-name">{selectedStaff.gender || "Not set"}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
