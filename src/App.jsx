import { useState, useEffect, useCallback } from "react";

const DB_KEY = "wb_laporan_v1";
const SHARED = true;

async function dbGet(key) {
  try { const r = await window.storage.get(key, SHARED); return r ? JSON.parse(r.value) : null; } catch { return null; }
}
async function dbSet(key, val) {
  try { await window.storage.set(key, JSON.stringify(val), SHARED); return true; } catch { return false; }
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function todayStr() { return new Date().toISOString().slice(0, 10); }

const BADGE = {
  menunggu: { bg: "#FFF3CD", color: "#856404", label: "Menunggu Konfirmasi" },
  kembali: { bg: "#D1FAE5", color: "#065F46", label: "Telah Kembali" },
  belum: { bg: "#FEE2E2", color: "#991B1B", label: "Belum Kembali" },
};

function StatusBadge({ status }) {
  const s = BADGE[status] || BADGE.menunggu;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function Avatar({ name, size = 36 }) {
  const initials = name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
  const colors = ["#1D4ED8", "#0F766E", "#7C3AED", "#B45309", "#BE185D"];
  const idx = name ? name.charCodeAt(0) % colors.length : 0;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: colors[idx], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: wide ? 680 : 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#6B7280", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "20px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, required }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{label}{required && <span style={{ color: "#DC2626" }}> *</span>}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 12px", border: "1px solid #D1D5DB", borderRadius: 8,
  fontSize: 14, color: "#111827", background: "#fff", boxSizing: "border-box", outline: "none",
};

function FormLaporan({ onSave, onClose }) {
  const [form, setForm] = useState({ namaPetugas: "", blokAsal: "", tujuan: "", keterangan: "", jumlahWB: "", namaWB: "", foto: null, fotoName: "" });
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
    const laporan = {
      id: genId(), createdAt: new Date().toISOString(), status: "menunggu",
      namaPetugas: form.namaPetugas, blokAsal: form.blokAsal, tujuan: form.tujuan,
      keterangan: form.keterangan, jumlahWB: parseInt(form.jumlahWB),
      namaWB: form.namaWB, foto: form.foto, fotoName: form.fotoName,
      konfirmasiPetugas: null, konfirmasiAt: null, kembaliAt: null,
    };
    const existing = (await dbGet(DB_KEY)) || [];
    await dbSet(DB_KEY, [laporan, ...existing]);
    setSaving(false);
    onSave();
  }

  return (
    <div>
      {err && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="Nama Petugas Pengawal" required>
          <input style={inputStyle} value={form.namaPetugas} onChange={e => set("namaPetugas", e.target.value)} placeholder="Contoh: Bripka Sutrisno" />
        </Field>
        <Field label="Blok Hunian Asal" required>
          <input style={inputStyle} value={form.blokAsal} onChange={e => set("blokAsal", e.target.value)} placeholder="Contoh: Blok A1" />
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
          <option>Kerja Bhakti</option>
          <option>Lainnya</option>
        </select>
      </Field>
      <Field label="Keterangan Tambahan">
        <input style={inputStyle} value={form.keterangan} onChange={e => set("keterangan", e.target.value)} placeholder="Detail lokasi, keperluan khusus, dll." />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="Jumlah Warga Binaan" required>
          <input style={inputStyle} type="number" min="1" value={form.jumlahWB} onChange={e => set("jumlahWB", e.target.value)} placeholder="Jumlah" />
        </Field>
        <Field label="Upload Foto Dokumentasi">
          <div>
            <label style={{ display: "inline-block", padding: "8px 14px", background: "#F3F4F6", border: "1px dashed #9CA3AF", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#374151" }}>
              📎 Pilih Foto
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFoto} />
            </label>
            {form.fotoName && <span style={{ fontSize: 12, color: "#6B7280", display: "block", marginTop: 4 }}>✓ {form.fotoName}</span>}
          </div>
        </Field>
      </div>
      <Field label="Nama-nama Warga Binaan" required>
        <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.namaWB} onChange={e => set("namaWB", e.target.value)} placeholder="Tulis nama warga binaan, pisahkan dengan koma atau enter" />
      </Field>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #D1D5DB", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 14 }}>Batal</button>
        <button onClick={handleSubmit} disabled={saving} style={{ padding: "10px 24px", background: "#1D4ED8", color: "#fff", border: "none", borderRadius: 8, cursor: saving ? "default" : "pointer", fontWeight: 600, fontSize: 14, opacity: saving ? 0.7 : 1 }}>
          {saving ? "Menyimpan..." : "Simpan Laporan"}
        </button>
      </div>
    </div>
  );
}

function FormKonfirmasi({ laporan, onSave, onClose }) {
  const [petugas, setPetugas] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleKonfirmasi() {
    if (!petugas) { setErr("Nama petugas blok wajib diisi."); return; }
    setSaving(true);
    const all = (await dbGet(DB_KEY)) || [];
    const updated = all.map(l => l.id === laporan.id ? { ...l, status: "kembali", konfirmasiPetugas: petugas, kembaliAt: new Date().toISOString() } : l);
    await dbSet(DB_KEY, updated);
    setSaving(false);
    onSave();
  }

  return (
    <div>
      <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
        <p style={{ margin: "0 0 6px", fontSize: 13, color: "#1E40AF", fontWeight: 600 }}>Data Pengeluaran</p>
        <p style={{ margin: "0 0 4px", fontSize: 14, color: "#1E3A8A" }}>Petugas: <strong>{laporan.namaPetugas}</strong></p>
        <p style={{ margin: "0 0 4px", fontSize: 14, color: "#1E3A8A" }}>Tujuan: <strong>{laporan.tujuan}</strong></p>
        <p style={{ margin: "0 0 4px", fontSize: 14, color: "#1E3A8A" }}>Jumlah WB: <strong>{laporan.jumlahWB} orang</strong></p>
        <p style={{ margin: 0, fontSize: 14, color: "#1E3A8A" }}>Keluar: <strong>{formatDate(laporan.createdAt)}</strong></p>
      </div>
      {err && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{err}</div>}
      <Field label="Nama Petugas Blok Hunian yang Mengkonfirmasi" required>
        <input style={inputStyle} value={petugas} onChange={e => setPetugas(e.target.value)} placeholder="Nama petugas blok hunian" />
      </Field>
      <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>Dengan mengkonfirmasi, Anda menyatakan bahwa seluruh warga binaan telah kembali ke kamar hunian.</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #D1D5DB", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 14 }}>Batal</button>
        <button onClick={handleKonfirmasi} disabled={saving} style={{ padding: "10px 24px", background: "#059669", color: "#fff", border: "none", borderRadius: 8, cursor: saving ? "default" : "pointer", fontWeight: 600, fontSize: 14, opacity: saving ? 0.7 : 1 }}>
          {saving ? "Menyimpan..." : "✓ Konfirmasi Kembali"}
        </button>
      </div>
    </div>
  );
}

function DetailModal({ laporan, onClose, onKonfirmasi }) {
  return (
    <Modal title="Detail Laporan Pengeluaran" onClose={onClose} wide>
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={laporan.namaPetugas} size={44} />
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#111827" }}>{laporan.namaPetugas}</p>
            <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>{laporan.blokAsal} • {formatDate(laporan.createdAt)}</p>
          </div>
          <div style={{ marginLeft: "auto" }}><StatusBadge status={laporan.status} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[["Tujuan", laporan.tujuan], ["Jumlah WB", laporan.jumlahWB + " orang"], ["No. Laporan", "#" + laporan.id.toUpperCase().slice(-6)]].map(([k, v]) => (
            <div key={k} style={{ background: "#F9FAFB", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{k}</p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>{v}</p>
            </div>
          ))}
        </div>
        <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "14px 16px" }}>
          <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase" }}>Warga Binaan</p>
          <p style={{ margin: 0, fontSize: 14, color: "#111827", lineHeight: 1.7 }}>{laporan.namaWB}</p>
        </div>
        {laporan.keterangan && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "12px 14px" }}>
            <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: "#92400E" }}>Keterangan</p>
            <p style={{ margin: 0, fontSize: 14, color: "#78350F" }}>{laporan.keterangan}</p>
          </div>
        )}
        {laporan.foto && (
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase" }}>Foto Dokumentasi</p>
            <img src={laporan.foto} alt="Dokumentasi" style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 10, border: "1px solid #E5E7EB" }} />
          </div>
        )}
        {laporan.status === "kembali" && (
          <div style={{ background: "#D1FAE5", border: "1px solid #A7F3D0", borderRadius: 10, padding: "12px 16px" }}>
            <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#065F46" }}>✓ Warga Binaan Telah Kembali</p>
            <p style={{ margin: 0, fontSize: 13, color: "#047857" }}>Dikonfirmasi oleh: <strong>{laporan.konfirmasiPetugas}</strong> pada {formatDate(laporan.kembaliAt)}</p>
          </div>
        )}
        {laporan.status === "menunggu" && (
          <button onClick={onKonfirmasi} style={{ padding: "12px", background: "#059669", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 15, width: "100%" }}>
            ✓ Konfirmasi Warga Binaan Kembali
          </button>
        )}
      </div>
    </Modal>
  );
}

function LaporanCard({ laporan, onClick }) {
  return (
    <div onClick={onClick} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "box-shadow 0.15s", marginBottom: 10 }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Avatar name={laporan.namaPetugas} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 15, color: "#111827" }}>{laporan.namaPetugas}</p>
              <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>{laporan.tujuan} • {laporan.jumlahWB} orang</p>
            </div>
            <StatusBadge status={laporan.status} />
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "#9CA3AF" }}>
            <span>🏠 {laporan.blokAsal || "-"}</span>
            <span>🕐 {formatDate(laporan.createdAt)}</span>
            {laporan.foto && <span>📷 Foto</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function RekapHarian({ data, onClose }) {
  const [tgl, setTgl] = useState(todayStr());
  const filtered = data.filter(l => l.createdAt.slice(0, 10) === tgl);
  const total = filtered.length;
  const totalWB = filtered.reduce((s, l) => s + (l.jumlahWB || 0), 0);
  const kembali = filtered.filter(l => l.status === "kembali").length;
  const menunggu = filtered.filter(l => l.status === "menunggu").length;

  const byTujuan = {};
  filtered.forEach(l => { byTujuan[l.tujuan] = (byTujuan[l.tujuan] || 0) + 1; });

  return (
    <Modal title={`Rekap Harian`} onClose={onClose} wide>
      <Field label="Pilih Tanggal">
        <input type="date" style={{ ...inputStyle, maxWidth: 200 }} value={tgl} onChange={e => setTgl(e.target.value)} />
      </Field>
      <p style={{ margin: "0 0 16px", color: "#6B7280", fontSize: 14 }}>
        Tanggal: <strong style={{ color: "#111827" }}>{new Date(tgl + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</strong>
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[["Total Pengeluaran", total, "#1D4ED8"], ["Total Warga Binaan", totalWB, "#7C3AED"], ["Sudah Kembali", kembali, "#059669"], ["Belum Kembali", menunggu, "#DC2626"]].map(([l, v, c]) => (
          <div key={l} style={{ background: "#F9FAFB", borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: c }}>{v}</p>
            <p style={{ margin: 0, fontSize: 11, color: "#6B7280", fontWeight: 600 }}>{l}</p>
          </div>
        ))}
      </div>
      {Object.keys(byTujuan).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#374151" }}>DISTRIBUSI TUJUAN</p>
          {Object.entries(byTujuan).map(([t, n]) => (
            <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F3F4F6" }}>
              <span style={{ fontSize: 14, color: "#111827" }}>{t}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1D4ED8" }}>{n}×</span>
            </div>
          ))}
        </div>
      )}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#9CA3AF" }}>
          <p style={{ fontSize: 40, margin: "0 0 8px" }}>📋</p>
          <p style={{ margin: 0 }}>Tidak ada laporan pada tanggal ini</p>
        </div>
      ) : (
        <div>
          <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#374151" }}>DAFTAR LAPORAN</p>
          {filtered.map(l => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#F9FAFB", borderRadius: 8, marginBottom: 6 }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600, color: "#111827" }}>{l.namaPetugas}</p>
                <p style={{ margin: 0, fontSize: 12, color: "#6B7280" }}>{l.tujuan} • {l.jumlahWB} WB • {l.blokAsal}</p>
              </div>
              <StatusBadge status={l.status} />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [konfirmTarget, setKonfirmTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [tab, setTab] = useState("semua");

  const load = useCallback(async () => {
    const d = (await dbGet(DB_KEY)) || [];
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => { load(); const iv = setInterval(load, 10000); return () => clearInterval(iv); }, [load]);

  const filtered = data.filter(l => {
    const q = search.toLowerCase();
    const matchQ = !q || l.namaPetugas?.toLowerCase().includes(q) || l.tujuan?.toLowerCase().includes(q) || l.namaWB?.toLowerCase().includes(q) || l.blokAsal?.toLowerCase().includes(q);
    const matchS = filterStatus === "semua" || l.status === filterStatus;
    const matchT = tab === "semua" || l.createdAt.slice(0, 10) === todayStr();
    return matchQ && matchS && matchT;
  });

  const stats = { total: data.length, hari: data.filter(l => l.createdAt.slice(0, 10) === todayStr()).length, menunggu: data.filter(l => l.status === "menunggu").length, kembali: data.filter(l => l.status === "kembali").length };

  return (
    <div style={{ minHeight: "100vh", background: "#F3F4F6", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)", color: "#fff", padding: "16px 20px 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <p style={{ margin: 0, fontSize: 10, letterSpacing: 2, opacity: 0.7, textTransform: "uppercase" }}>SISTEM INFORMASI LAPAS</p>
              <h1 style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>Pemantauan Warga Binaan</h1>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setModal("rekap")} style={{ padding: "8px 14px", background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                📊 Rekap Harian
              </button>
              <button onClick={() => setModal("form")} style={{ padding: "8px 16px", background: "#fff", color: "#1D4ED8", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                + Laporan Baru
              </button>
            </div>
          </div>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 14 }}>
            {[["Total", stats.total, "📋"], ["Hari Ini", stats.hari, "📅"], ["Menunggu", stats.menunggu, "⏳"], ["Kembali", stats.kembali, "✅"]].map(([l, v, ic]) => (
              <div key={l} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800 }}>{v}</p>
                <p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>{ic} {l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 40px" }}>
        {/* Filters */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input style={{ ...inputStyle, flex: 1, minWidth: 180 }} placeholder="🔍 Cari nama petugas, tujuan, warga binaan..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={{ ...inputStyle, width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="semua">Semua Status</option>
            <option value="menunggu">Menunggu Konfirmasi</option>
            <option value="kembali">Telah Kembali</option>
          </select>
          <div style={{ display: "flex", gap: 4 }}>
            {[["semua", "Semua"], ["hari", "Hari Ini"]].map(([v, l]) => (
              <button key={v} onClick={() => setTab(v)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid", borderColor: tab === v ? "#1D4ED8" : "#E5E7EB", background: tab === v ? "#EFF6FF" : "#fff", color: tab === v ? "#1D4ED8" : "#374151", fontWeight: tab === v ? 700 : 400, cursor: "pointer", fontSize: 13 }}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={load} title="Refresh" style={{ padding: "8px 12px", border: "1px solid #E5E7EB", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 14 }}>🔄</button>
        </div>

        {/* Alert menunggu */}
        {stats.menunggu > 0 && (
          <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <p style={{ margin: 0, fontSize: 14, color: "#92400E" }}>
              <strong>{stats.menunggu} pengeluaran</strong> masih menunggu konfirmasi kembali ke blok hunian.
            </p>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ width: 40, height: 40, border: "3px solid #E5E7EB", borderTop: "3px solid #1D4ED8", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: "#9CA3AF", fontSize: 14 }}>Memuat data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", background: "#fff", borderRadius: 12 }}>
            <p style={{ fontSize: 48, margin: "0 0 12px" }}>📋</p>
            <p style={{ color: "#6B7280", margin: 0 }}>{search || filterStatus !== "semua" ? "Tidak ada hasil yang cocok" : "Belum ada laporan"}</p>
            {!search && filterStatus === "semua" && (
              <button onClick={() => setModal("form")} style={{ marginTop: 14, padding: "10px 20px", background: "#1D4ED8", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>+ Buat Laporan Pertama</button>
            )}
          </div>
        ) : (
          <div>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "#6B7280" }}>Menampilkan {filtered.length} laporan</p>
            {filtered.map(l => (
              <LaporanCard key={l.id} laporan={l} onClick={() => setSelected(l)} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === "form" && (
        <Modal title="📝 Laporan Pengeluaran Warga Binaan" onClose={() => setModal(null)} wide>
          <FormLaporan onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />
        </Modal>
      )}
      {modal === "rekap" && <RekapHarian data={data} onClose={() => setModal(null)} />}
      {selected && !konfirmTarget && (
        <DetailModal laporan={selected} onClose={() => setSelected(null)} onKonfirmasi={() => { setKonfirmTarget(selected); setSelected(null); }} />
      )}
      {konfirmTarget && (
        <Modal title="✅ Konfirmasi Warga Binaan Kembali" onClose={() => setKonfirmTarget(null)}>
          <FormKonfirmasi laporan={konfirmTarget} onClose={() => setKonfirmTarget(null)} onSave={() => { setKonfirmTarget(null); load(); }} />
        </Modal>
      )}
    </div>
  );
}
