import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAE1l0sVa0EX78mxk8svll3BZqZjRjh0Eg",
  authDomain: "laporan-wb.firebaseapp.com",
  projectId: "laporan-wb",
  storageBucket: "laporan-wb.firebasestorage.app",
  messagingSenderId: "78573878406",
  appId: "1:78573878406:web:32f9bf1725a6f691372507",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===================== AKUN & ROLE =====================
// role: "laporan"   → 1 akun, hanya bisa buat laporan
// role: "konfirmasi" → 3 akun, hanya bisa konfirmasi kembali
const ACCOUNTS = [
  { username: "petugas.laporan", password: "laporan123", role: "laporan", displayName: "Petugas Laporan" },
  { username: "blok.angsa",   password: "angsa123",  role: "konfirmasi", displayName: "Petugas Blok angsa" },
  { username: "blok.bangau",   password: "bangau123",  role: "konfirmasi", displayName: "Petugas Blok bangau" },
  { username: "p2u.pas",   password: "p2u123",  role: "konfirmasi", displayName: "Petugas p2u" },
];

// ===================== HELPERS =====================
function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function todayStr() { return new Date().toISOString().slice(0, 10); }

const BADGE = {
  menunggu: { bg: "#FEF3C7", color: "#92400E", label: "⏳ Menunggu Konfirmasi" },
  kembali:  { bg: "#D1FAE5", color: "#065F46", label: "✅ Telah Kembali" },
};

const C = {
  navy: "#0D1F4E", navyDark: "#071538", navyMid: "#1A3A7A",
  gold: "#C9A84C", goldLight: "#F0D080",
  white: "#FFFFFF", gray: "#F1F5F9", border: "#CBD5E1",
  text: "#1E293B", textLight: "#64748B",
};

// ===================== UI ATOMS =====================
function StatusBadge({ status }) {
  const s = BADGE[status] || BADGE.menunggu;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, whiteSpace: "nowrap", border: `1px solid ${s.color}30` }}>
      {s.label}
    </span>
  );
}

function Avatar({ name, size = 38 }) {
  const initials = name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${C.navyMid}, ${C.gold})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontWeight: 800, fontSize: size * 0.36, flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
      {initials}
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(7,21,56,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: C.white, borderRadius: 16, width: "100%", maxWidth: wide ? 680 : 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.4)", border: `2px solid ${C.gold}40` }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "18px 24px", borderBottom: `2px solid ${C.gold}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: C.navy, zIndex: 1, borderRadius: "14px 14px 0 0" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.white }}>{title}</h2>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", fontSize: 20, cursor: "pointer", color: C.white, lineHeight: 1, width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ padding: "20px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}{required && <span style={{ color: "#DC2626" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8,
  fontSize: 14, color: C.text, background: C.white, boxSizing: "border-box", outline: "none",
};

// ===================== LOGIN MODAL =====================
function LoginModal({ onLogin, onClose }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [showPass, setShowPass] = useState(false);

  function handleLogin() {
    const acc = ACCOUNTS.find(a => a.username === username.trim() && a.password === password);
    if (!acc) { setErr("Username atau password salah."); return; }
    onLogin(acc);
  }

  return (
    <Modal title="🔐 Masuk ke Sistem" onClose={onClose}>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: C.textLight, lineHeight: 1.6 }}>
        Login diperlukan untuk <strong>membuat laporan</strong> atau <strong>mengkonfirmasi pengembalian</strong>. Publik dapat melihat data tanpa login.
      </p>
      {err && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{err}</div>
      )}
      <Field label="Username" required>
        <input style={inputStyle} value={username} onChange={e => { setUsername(e.target.value); setErr(""); }} placeholder="Masukkan username" onKeyDown={e => e.key === "Enter" && handleLogin()} />
      </Field>
      <Field label="Password" required>
        <div style={{ position: "relative" }}>
          <input style={{ ...inputStyle, paddingRight: 44 }} type={showPass ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); setErr(""); }} placeholder="Masukkan password" onKeyDown={e => e.key === "Enter" && handleLogin()} />
          <button onClick={() => setShowPass(p => !p)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.textLight }}>
            {showPass ? "🙈" : "👁️"}
          </button>
        </div>
      </Field>

      {/* Petunjuk akun */}
      <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
        <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: C.navy, textTransform: "uppercase" }}>Daftar Akun Tersedia</p>
        <div style={{ display: "grid", gap: 4 }}>
          {ACCOUNTS.map(a => (
            <div key={a.username} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#1E3A8A" }}>
              <span><strong>{a.username}</strong> — {a.displayName}</span>
              <span style={{ color: C.textLight }}>({a.role === "laporan" ? "Buat Laporan" : "Konfirmasi"})</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", border: `1.5px solid ${C.border}`, borderRadius: 8, background: C.white, cursor: "pointer", fontSize: 14 }}>Batal</button>
        <button onClick={handleLogin} style={{ padding: "10px 24px", background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`, color: C.white, border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
          🔐 Masuk
        </button>
      </div>
    </Modal>
  );
}

// ===================== FORM LAPORAN (hanya role: laporan) =====================
function FormLaporan({ onClose }) {
  const [form, setForm] = useState({ namaPetugas: "", nrp: "", blokAsal: "", tujuan: "", keterangan: "", jumlahWB: "", namaWB: "", foto: null, fotoName: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleFoto(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { set("foto", reader.result); set("fotoName", f.name); };
    reader.readAsDataURL(f);
  }

  async function handleSubmit() {
    if (!form.namaPetugas || !form.tujuan || !form.jumlahWB || !form.namaWB) { setErr("Harap isi semua field wajib."); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, "laporan"), {
        createdAt: new Date().toISOString(), status: "menunggu",
        namaPetugas: form.namaPetugas, nrp: form.nrp, blokAsal: form.blokAsal,
        tujuan: form.tujuan, keterangan: form.keterangan,
        jumlahWB: parseInt(form.jumlahWB), namaWB: form.namaWB,
        foto: form.foto || null, fotoName: form.fotoName || null,
        konfirmasiPetugas: null, kembaliAt: null,
      });
      onClose();
    } catch (e) { setErr("Gagal menyimpan: " + e.message); }
    setSaving(false);
  }

  return (
    <div>
      {err && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
        <Field label="Nama Petugas Pengawal" required>
          <input style={inputStyle} value={form.namaPetugas} onChange={e => set("namaPetugas", e.target.value)} placeholder="Nama lengkap petugas" />
        </Field>
        <Field label="NIP Petugas">
          <input style={inputStyle} value={form.nrp} onChange={e => set("nrp", e.target.value)} placeholder="Nomor NIP" />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
        <Field label="Blok Hunian Asal">
          <input style={inputStyle} value={form.blokAsal} onChange={e => set("blokAsal", e.target.value)} placeholder="Contoh: Blok A1" />
        </Field>
        <Field label="Jumlah Warga Binaan" required>
          <input style={inputStyle} type="number" min="1" value={form.jumlahWB} onChange={e => set("jumlahWB", e.target.value)} placeholder="Jumlah" />
        </Field>
      </div>
      <Field label="Tujuan Pengeluaran" required>
        <select style={inputStyle} value={form.tujuan} onChange={e => set("tujuan", e.target.value)}>
          <option value="">-- Pilih Tujuan --</option>
          <option>Sidang Pengadilan</option>
          <option>Pemeriksaan Penyidik</option>
          <option>Berobat / Rawat Inap</option>
          <option>Kunjungan Keluarga (Izin Khusus)</option>
          <option>Pemakaman Keluarga</option>
          <option>Program Asimilasi</option>
          <option>Kerja Bakti</option>
          <option>Lainnya</option>
        </select>
      </Field>
      <Field label="Keterangan Tambahan">
        <input style={inputStyle} value={form.keterangan} onChange={e => set("keterangan", e.target.value)} placeholder="Detail lokasi, keperluan khusus, dll." />
      </Field>
      <Field label="Nama-nama Warga Binaan" required>
        <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.namaWB} onChange={e => set("namaWB", e.target.value)} placeholder="Tulis nama warga binaan, pisahkan dengan koma atau enter" />
      </Field>
      <Field label="Upload Foto Dokumentasi">
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px", background: C.navy, color: C.white, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          📎 Pilih Foto
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFoto} />
        </label>
        {form.fotoName && <span style={{ fontSize: 12, color: "#059669", display: "inline-block", marginLeft: 10 }}>✓ {form.fotoName}</span>}
      </Field>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
        <button onClick={onClose} style={{ padding: "10px 20px", border: `1.5px solid ${C.border}`, borderRadius: 8, background: C.white, cursor: "pointer", fontSize: 14, color: C.text }}>Batal</button>
        <button onClick={handleSubmit} disabled={saving} style={{ padding: "10px 24px", background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`, color: C.white, border: "none", borderRadius: 8, cursor: saving ? "default" : "pointer", fontWeight: 700, fontSize: 14, opacity: saving ? 0.7 : 1 }}>
          {saving ? "Menyimpan..." : "💾 Simpan Laporan"}
        </button>
      </div>
    </div>
  );
}

// ===================== FORM KONFIRMASI (hanya role: konfirmasi) =====================
function FormKonfirmasi({ laporan, currentUser, onClose }) {
  const [petugas, setPetugas] = useState(currentUser?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleKonfirmasi() {
    if (!petugas) { setErr("Nama petugas blok wajib diisi."); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, "laporan", laporan.id), {
        status: "kembali",
        konfirmasiPetugas: petugas,
        kembaliAt: new Date().toISOString(),
      });
      onClose();
    } catch (e) { setErr("Gagal: " + e.message); }
    setSaving(false);
  }

  return (
    <div>
      <div style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE", borderRadius: 10, padding: "14px 16px", marginBottom: 18 }}>
        <p style={{ margin: "0 0 8px", fontSize: 13, color: C.navy, fontWeight: 700 }}>📋 Data Pengeluaran</p>
        {[["Petugas", laporan.namaPetugas], ["Tujuan", laporan.tujuan], ["Jumlah WB", laporan.jumlahWB + " orang"], ["Waktu Keluar", formatDate(laporan.createdAt)]].map(([k, v]) => (
          <p key={k} style={{ margin: "0 0 4px", fontSize: 13, color: "#1E3A8A" }}>{k}: <strong>{v}</strong></p>
        ))}
      </div>
      {err && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{err}</div>}
      <Field label="Nama Petugas yang Mengkonfirmasi" required>
        <input style={inputStyle} value={petugas} onChange={e => setPetugas(e.target.value)} placeholder="Nama petugas blok hunian" />
      </Field>
      <p style={{ fontSize: 13, color: C.textLight, marginBottom: 16 }}>Dengan mengkonfirmasi, Anda menyatakan bahwa seluruh warga binaan telah kembali ke kamar hunian.</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", border: `1.5px solid ${C.border}`, borderRadius: 8, background: C.white, cursor: "pointer", fontSize: 14 }}>Batal</button>
        <button onClick={handleKonfirmasi} disabled={saving} style={{ padding: "10px 24px", background: "linear-gradient(135deg, #059669, #047857)", color: C.white, border: "none", borderRadius: 8, cursor: saving ? "default" : "pointer", fontWeight: 700, fontSize: 14, opacity: saving ? 0.7 : 1 }}>
          {saving ? "Menyimpan..." : "✅ Konfirmasi Kembali"}
        </button>
      </div>
    </div>
  );
}

// ===================== DETAIL MODAL =====================
function DetailModal({ laporan, onClose, onKonfirmasi, canKonfirmasi }) {
  return (
    <Modal title="📋 Detail Laporan Pengeluaran" onClose={onClose} wide>
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={laporan.namaPetugas} size={48} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: C.navy }}>{laporan.namaPetugas}</p>
            {laporan.nrp && <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textLight }}>NRP: {laporan.nrp}</p>}
            <p style={{ margin: "2px 0 0", fontSize: 13, color: C.textLight }}>{laporan.blokAsal} • {formatDate(laporan.createdAt)}</p>
          </div>
          <StatusBadge status={laporan.status} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[["Tujuan", laporan.tujuan], ["Jumlah WB", laporan.jumlahWB + " orang"], ["Blok Asal", laporan.blokAsal || "-"]].map(([k, v]) => (
            <div key={k} style={{ background: C.gray, borderRadius: 10, padding: "12px 14px", borderLeft: `3px solid ${C.navy}` }}>
              <p style={{ margin: "0 0 4px", fontSize: 10, color: C.textLight, fontWeight: 700, textTransform: "uppercase" }}>{k}</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.navy }}>{v}</p>
            </div>
          ))}
        </div>
        <div style={{ background: C.gray, borderRadius: 10, padding: "14px 16px", borderLeft: `3px solid ${C.gold}` }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase" }}>Nama Warga Binaan</p>
          <p style={{ margin: 0, fontSize: 14, color: C.text, lineHeight: 1.7 }}>{laporan.namaWB}</p>
        </div>
        {laporan.keterangan && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "12px 14px" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#92400E", textTransform: "uppercase" }}>Keterangan</p>
            <p style={{ margin: 0, fontSize: 14, color: "#78350F" }}>{laporan.keterangan}</p>
          </div>
        )}
        {laporan.foto && (
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase" }}>Foto Dokumentasi</p>
            <img src={laporan.foto} alt="Dokumentasi" style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 10, border: `2px solid ${C.border}` }} />
          </div>
        )}
        {laporan.status === "kembali" && (
          <div style={{ background: "#D1FAE5", border: "1.5px solid #A7F3D0", borderRadius: 10, padding: "12px 16px" }}>
            <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 800, color: "#065F46" }}>✅ Warga Binaan Telah Kembali</p>
            <p style={{ margin: 0, fontSize: 13, color: "#047857" }}>Dikonfirmasi oleh: <strong>{laporan.konfirmasiPetugas}</strong></p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#047857" }}>Pada: {formatDate(laporan.kembaliAt)}</p>
          </div>
        )}
        {laporan.status === "menunggu" && canKonfirmasi && (
          <button onClick={onKonfirmasi} style={{ padding: "13px", background: "linear-gradient(135deg, #059669, #047857)", color: C.white, border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 15, width: "100%", boxShadow: "0 4px 12px rgba(5,150,105,0.3)" }}>
            ✅ Konfirmasi Warga Binaan Kembali
          </button>
        )}
        {laporan.status === "menunggu" && !canKonfirmasi && (
          <div style={{ background: "#F8FAFC", border: `1px dashed ${C.border}`, borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 13, color: C.textLight }}>🔒 Login sebagai <strong>Petugas Konfirmasi</strong> untuk mengkonfirmasi pengembalian</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ===================== LAPORAN CARD =====================
function LaporanCard({ laporan, onClick }) {
  return (
    <div onClick={onClick} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", marginBottom: 10, borderLeft: `4px solid ${laporan.status === "kembali" ? "#059669" : C.gold}`, transition: "box-shadow 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 20px rgba(13,31,78,0.12)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Avatar name={laporan.namaPetugas} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 15, color: C.navy }}>{laporan.namaPetugas}</p>
              <p style={{ margin: 0, fontSize: 13, color: C.textLight }}>{laporan.tujuan} • {laporan.jumlahWB} orang</p>
            </div>
            <StatusBadge status={laporan.status} />
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 12, color: C.textLight }}>
            <span>🏠 {laporan.blokAsal || "-"}</span>
            <span>🕐 {formatDate(laporan.createdAt)}</span>
            {laporan.foto && <span>📷 Ada Foto</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== REKAP HARIAN =====================
function RekapHarian({ data, onClose }) {
  const [tgl, setTgl] = useState(todayStr());
  const filtered = data.filter(l => l.createdAt?.slice(0, 10) === tgl);
  const totalWB = filtered.reduce((s, l) => s + (l.jumlahWB || 0), 0);
  const kembali = filtered.filter(l => l.status === "kembali").length;
  const menunggu = filtered.filter(l => l.status === "menunggu").length;
  const byTujuan = {};
  filtered.forEach(l => { byTujuan[l.tujuan] = (byTujuan[l.tujuan] || 0) + 1; });

  return (
    <Modal title="📊 Rekap Harian" onClose={onClose} wide>
      <Field label="Pilih Tanggal">
        <input type="date" style={{ ...inputStyle, maxWidth: 220 }} value={tgl} onChange={e => setTgl(e.target.value)} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[["Total Pengeluaran", filtered.length, C.navy], ["Total WB", totalWB, "#7C3AED"], ["Sudah Kembali", kembali, "#059669"], ["Belum Kembali", menunggu, "#DC2626"]].map(([l, v, c]) => (
          <div key={l} style={{ background: C.gray, borderRadius: 10, padding: "14px 10px", textAlign: "center", borderTop: `3px solid ${c}` }}>
            <p style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: c }}>{v}</p>
            <p style={{ margin: 0, fontSize: 11, color: C.textLight, fontWeight: 600 }}>{l}</p>
          </div>
        ))}
      </div>
      {Object.keys(byTujuan).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: C.navy, textTransform: "uppercase" }}>Distribusi Tujuan</p>
          {Object.entries(byTujuan).map(([t, n]) => (
            <div key={t} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: C.gray, borderRadius: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 14, color: C.text }}>{t}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{n}x</span>
            </div>
          ))}
        </div>
      )}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: C.textLight }}>
          <p style={{ fontSize: 40, margin: "0 0 8px" }}>📋</p>
          <p style={{ margin: 0 }}>Tidak ada laporan pada tanggal ini</p>
        </div>
      ) : (
        <div>
          <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: C.navy, textTransform: "uppercase" }}>Daftar Laporan</p>
          {filtered.map(l => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: C.gray, borderRadius: 8, marginBottom: 6 }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600, color: C.navy }}>{l.namaPetugas}</p>
                <p style={{ margin: 0, fontSize: 12, color: C.textLight }}>{l.tujuan} • {l.jumlahWB} WB • {l.blokAsal}</p>
              </div>
              <StatusBadge status={l.status} />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ===================== APP UTAMA =====================
export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null); // null = tamu/publik
  const [modal, setModal] = useState(null); // "login" | "form" | "rekap"
  const [selected, setSelected] = useState(null);
  const [konfirmTarget, setKonfirmTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [tab, setTab] = useState("semua");

  useEffect(() => {
    const q = query(collection(db, "laporan"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  function handleLogin(acc) {
    setCurrentUser(acc);
    setModal(null);
  }

  function handleLogout() {
    setCurrentUser(null);
  }

  // Tombol "Buat Laporan" — wajib login sebagai role:laporan
  function handleBuatLaporan() {
    if (!currentUser) { setModal("login"); return; }
    if (currentUser.role !== "laporan") {
      alert("Akun Anda hanya dapat mengkonfirmasi pengembalian, bukan membuat laporan baru."); return;
    }
    setModal("form");
  }

  // Tombol "Konfirmasi" di dalam detail modal
  function handleKonfirmClick(laporan) {
    if (!currentUser) { setModal("login"); setSelected(null); return; }
    if (currentUser.role !== "konfirmasi") {
      alert("Hanya Petugas Konfirmasi yang dapat mengkonfirmasi pengembalian."); return;
    }
    setKonfirmTarget(laporan);
    setSelected(null);
  }

  const canKonfirmasi = currentUser?.role === "konfirmasi";

  const filtered = data.filter(l => {
    const q = search.toLowerCase();
    const matchQ = !q || l.namaPetugas?.toLowerCase().includes(q) || l.tujuan?.toLowerCase().includes(q) || l.namaWB?.toLowerCase().includes(q) || l.blokAsal?.toLowerCase().includes(q);
    const matchS = filterStatus === "semua" || l.status === filterStatus;
    const matchT = tab === "semua" || l.createdAt?.slice(0, 10) === todayStr();
    return matchQ && matchS && matchT;
  });

  const stats = {
    total: data.length,
    hari: data.filter(l => l.createdAt?.slice(0, 10) === todayStr()).length,
    menunggu: data.filter(l => l.status === "menunggu").length,
    kembali: data.filter(l => l.status === "kembali").length,
  };

  // Role badge colors
  const roleBadge = currentUser?.role === "laporan"
    ? { bg: "#EFF6FF", color: "#1D4ED8", label: "✏️ Pembuat Laporan" }
    : { bg: "#F0FDF4", color: "#15803D", label: "✅ Petugas Konfirmasi" };

  return (
    <div style={{ minHeight: "100vh", background: "#EEF2F8", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg, ${C.navyDark}, ${C.navyMid})`, position: "relative", overflow: "hidden" }}>
        {/* Building background */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${BUILDING_IMG})`, backgroundSize: "cover", backgroundPosition: "center 60%", opacity: 0.18 }} />
        {/* Dark overlay gradient */}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${C.navyDark}EE 0%, ${C.navyMid}CC 60%, rgba(13,31,78,0.85) 100%)` }} />
        {/* Gold radial decorative */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 80% 50%, rgba(201,168,76,0.12) 0%, transparent 70%)" }} />

        <div style={{ position: "relative", maxWidth: 960, margin: "0 auto", padding: "18px 20px 22px" }}>
          {/* Top bar: logo + judul + login/logout */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
            <img src={LOGO_IMG} alt="Logo Kemenimipas & Pemasyarakatan" style={{ height: 64, width: "auto", flexShrink: 0, filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.5))" }} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 10, color: C.goldLight, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>Kementerian Imigrasi dan Pemasyarakatan RI</p>
              <h1 style={{ margin: "2px 0 1px", fontSize: 20, fontWeight: 900, color: C.white, letterSpacing: -0.3 }}>SIMPONI-PAS</h1>
              <p style={{ margin: 0, fontSize: 12, color: C.goldLight }}>Sistem Informasi Pemantauan Pemasyarakatan</p>
            </div>

            {/* Login/Logout + user info */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {currentUser ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ background: roleBadge.bg, color: roleBadge.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginBottom: 2 }}>
                      {roleBadge.label}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: C.goldLight }}>{currentUser.displayName}</p>
                  </div>
                  <button onClick={handleLogout} style={{ padding: "7px 14px", background: "rgba(255,255,255,0.12)", color: C.white, border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    Keluar
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>👁️ Mode Publik (Hanya Lihat)</span>
                  <button onClick={() => setModal("login")} style={{ padding: "8px 16px", background: `linear-gradient(135deg, ${C.gold}, #A07830)`, color: C.navyDark, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 800 }}>
                    🔐 Login Petugas
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Garis emas */}
          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`, marginBottom: 14 }} />

          {/* Action buttons + stats */}
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setModal("rekap")} style={{ padding: "8px 16px", background: "rgba(201,168,76,0.15)", color: C.goldLight, border: `1px solid ${C.gold}50`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                📊 Rekap Harian
              </button>
              {/* Tombol buat laporan hanya tampil jika login sebagai laporan */}
              {currentUser?.role === "laporan" && (
                <button onClick={handleBuatLaporan} style={{ padding: "8px 18px", background: `linear-gradient(135deg, ${C.gold}, #A07830)`, color: C.navyDark, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 800, boxShadow: "0 4px 12px rgba(201,168,76,0.35)" }}>
                  + Laporan Baru
                </button>
              )}
            </div>

            {/* Mini stats */}
            <div style={{ display: "flex", gap: 8 }}>
              {[["📋 Total", stats.total], ["📅 Hari Ini", stats.hari], ["⏳ Menunggu", stats.menunggu], ["✅ Kembali", stats.kembali]].map(([l, v]) => (
                <div key={l} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 12px", textAlign: "center", border: "1px solid rgba(201,168,76,0.2)" }}>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: C.white, lineHeight: 1 }}>{v}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 10, color: C.goldLight, fontWeight: 600 }}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KONTEN UTAMA */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px 60px" }}>

        {/* Info banner mode publik */}
        {!currentUser && (
          <div style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE", borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 22 }}>👁️</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: "#1D4ED8" }}>Mode Publik — Hanya Lihat</p>
              <p style={{ margin: 0, fontSize: 13, color: "#3B82F6" }}>Anda dapat melihat semua laporan. Untuk membuat laporan atau konfirmasi, silakan <button onClick={() => setModal("login")} style={{ background: "none", border: "none", color: "#1D4ED8", fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 13, textDecoration: "underline" }}>login sebagai petugas</button>.</p>
            </div>
          </div>
        )}

        {/* Alert menunggu */}
        {stats.menunggu > 0 && (
          <div style={{ background: "#FEF3C7", border: "1.5px solid #F59E0B", borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 22 }}>⚠️</span>
            <p style={{ margin: 0, fontSize: 14, color: "#92400E", fontWeight: 500 }}>
              <strong>{stats.menunggu} pengeluaran</strong> masih menunggu konfirmasi kembali ke blok hunian.
            </p>
          </div>
        )}

        {/* Filter bar */}
        <div style={{ background: C.white, borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", boxShadow: "0 2px 12px rgba(13,31,78,0.08)", border: `1px solid ${C.border}` }}>
          <input style={{ ...inputStyle, flex: 1, minWidth: 180 }} placeholder="🔍 Cari nama petugas, tujuan, warga binaan..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={{ ...inputStyle, width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="semua">Semua Status</option>
            <option value="menunggu">Menunggu Konfirmasi</option>
            <option value="kembali">Telah Kembali</option>
          </select>
          <div style={{ display: "flex", gap: 4 }}>
            {[["semua", "Semua"], ["hari", "Hari Ini"]].map(([v, l]) => (
              <button key={v} onClick={() => setTab(v)} style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid", borderColor: tab === v ? C.navy : C.border, background: tab === v ? C.navy : C.white, color: tab === v ? C.white : C.text, fontWeight: tab === v ? 700 : 400, cursor: "pointer", fontSize: 13 }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Daftar laporan */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ color: C.textLight, fontSize: 14 }}>Memuat data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", background: C.white, borderRadius: 12, boxShadow: "0 2px 12px rgba(13,31,78,0.08)" }}>
            <p style={{ fontSize: 48, margin: "0 0 12px" }}>📋</p>
            <p style={{ color: C.textLight, margin: "0 0 16px" }}>Belum ada laporan</p>
            {currentUser?.role === "laporan" && (
              <button onClick={handleBuatLaporan} style={{ padding: "11px 24px", background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`, color: C.white, border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>+ Buat Laporan Pertama</button>
            )}
          </div>
        ) : (
          <div>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: C.textLight }}>Menampilkan <strong>{filtered.length}</strong> laporan</p>
            {filtered.map(l => <LaporanCard key={l.id} laporan={l} onClick={() => setSelected(l)} />)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: C.navyDark, color: "rgba(255,255,255,0.5)", textAlign: "center", padding: "14px", fontSize: 12 }}>
        © 2026 SIMPONI-PAS — Kementerian Imigrasi dan Pemasyarakatan RI
      </div>

      {/* ===== MODALS ===== */}
      {modal === "login" && <LoginModal onLogin={handleLogin} onClose={() => setModal(null)} />}
      {modal === "form" && currentUser?.role === "laporan" && (
        <Modal title="📝 Laporan Pengeluaran Warga Binaan" onClose={() => setModal(null)} wide>
          <FormLaporan onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === "rekap" && <RekapHarian data={data} onClose={() => setModal(null)} />}
      {selected && !konfirmTarget && (
        <DetailModal
          laporan={selected}
          onClose={() => setSelected(null)}
          onKonfirmasi={() => handleKonfirmClick(selected)}
          canKonfirmasi={canKonfirmasi}
        />
      )}
      {konfirmTarget && (
        <Modal title="✅ Konfirmasi Warga Binaan Kembali" onClose={() => setKonfirmTarget(null)}>
          <FormKonfirmasi laporan={konfirmTarget} currentUser={currentUser} onClose={() => setKonfirmTarget(null)} />
        </Modal>
      )}
    </div>
  );
}
