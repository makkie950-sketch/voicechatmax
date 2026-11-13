import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "./lib/supabase";

type Server = {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
};

type Props = {
  userId: string;
};

export default function ServerDashboard({ userId }: Props) {
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [serverName, setServerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [message, setMessage] = useState("");

  async function loadServers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("servers")
      .select("id, name, owner_id, invite_code, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("โหลดเซิร์ฟเวอร์ไม่สำเร็จ: " + error.message);
    } else {
      const result = data ?? [];
      setServers(result);

      setSelectedServer((current) => {
        if (!current) return result[0] ?? null;

        return (
          result.find((server) => server.id === current.id) ??
          result[0] ??
          null
        );
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    loadServers();
  }, [userId]);

  useEffect(() => {
    if (!showCreateModal) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !creating) {
        setShowCreateModal(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showCreateModal, creating]);

  async function createServer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = serverName.trim();

    if (!cleanName) {
      setMessage("กรุณากรอกชื่อเซิร์ฟเวอร์");
      return;
    }

    if (cleanName.length > 40) {
      setMessage("ชื่อเซิร์ฟเวอร์ต้องไม่เกิน 40 ตัวอักษร");
      return;
    }

    setCreating(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("servers")
        .insert({
          name: cleanName,
          owner_id: userId,
        })
        .select("id, name, owner_id, invite_code, created_at")
        .single();

      if (error) throw error;

      setServers((current) => [data, ...current]);
      setSelectedServer(data);
      setServerName("");
      setShowCreateModal(false);
      setMessage("สร้างเซิร์ฟเวอร์สำเร็จ!");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? "สร้างเซิร์ฟเวอร์ไม่สำเร็จ: " + error.message
          : "เกิดข้อผิดพลาด"
      );
    } finally {
      setCreating(false);
    }
  }

  async function copyInviteCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setMessage("คัดลอกรหัสเชิญแล้ว!");
    } catch {
      setMessage("ไม่สามารถคัดลอกได้");
    }
  }

  return (
    <section className="vc-dashboard">
      <header className="vc-topbar">
        <div className="vc-brand">
          <div className="vc-brand-icon">V</div>
          <div>
            <h2>
              VOICECHAT<span>MAX</span>
            </h2>
            <p>COMMUNITY PLATFORM</p>
          </div>
        </div>

        <div className="vc-top-status">
          <span className="vc-online-dot" />
          ระบบออนไลน์
        </div>
      </header>

      <div className="vc-workspace">
        <aside className="vc-sidebar">
          <div className="vc-sidebar-title">
            <span>เซิร์ฟเวอร์</span>
            <button
              type="button"
              title="สร้างเซิร์ฟเวอร์"
              onClick={() => {
                setMessage("");
                setShowCreateModal(true);
              }}
            >
              +
            </button>
          </div>

          <div className="vc-server-list">
            {loading ? (
              <p className="vc-muted">กำลังโหลด...</p>
            ) : servers.length === 0 ? (
              <p className="vc-muted">ยังไม่มีเซิร์ฟเวอร์</p>
            ) : (
              servers.map((server) => (
                <button
                  type="button"
                  key={server.id}
                  className={`vc-server-button ${
                    selectedServer?.id === server.id ? "selected" : ""
                  }`}
                  onClick={() => {
                    setSelectedServer(server);
                    setMessage("");
                  }}
                  title={server.name}
                >
                  <span className="vc-server-avatar">
                    {server.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="vc-server-name">{server.name}</span>
                </button>
              ))
            )}
          </div>

          <button
            type="button"
            className="vc-add-server"
            onClick={() => {
              setMessage("");
              setShowCreateModal(true);
            }}
          >
            + สร้างเซิร์ฟเวอร์
          </button>

          <div className="vc-sidebar-footer">
            <span className="vc-online-dot" />
            Voicechatmax Online
          </div>
        </aside>

        <main className="vc-main">
          <div className="vc-main-header">
            <div>
              <p className="vc-breadcrumb">VOICECHATMAX / SERVERS</p>
              <h1>
                {selectedServer ? selectedServer.name : "เซิร์ฟเวอร์ของฉัน"}
              </h1>
            </div>

            <span className="vc-server-total">
              {servers.length} เซิร์ฟเวอร์
            </span>
          </div>

          {message && (
            <div className="vc-notice" role="status">
              {message}
            </div>
          )}

          {loading ? (
            <div className="vc-empty">
              <div className="vc-empty-icon">⌛</div>
              <h3>กำลังโหลดเซิร์ฟเวอร์</h3>
            </div>
          ) : selectedServer ? (
            <div className="vc-server-detail">
              <div className="vc-server-banner">
                <div className="vc-banner-icon">
                  {selectedServer.name.charAt(0).toUpperCase()}
                </div>

                <div>
                  <span className="vc-label">YOUR SERVER</span>
                  <h2>{selectedServer.name}</h2>
                  <p>
                    {selectedServer.owner_id === userId
                      ? "คุณเป็นเจ้าของเซิร์ฟเวอร์นี้"
                      : "คุณเป็นสมาชิกของเซิร์ฟเวอร์นี้"}
                  </p>
                </div>
              </div>

              <div className="vc-detail-grid">
                <div className="vc-info-card">
                  <span className="vc-card-icon">👑</span>
                  <p>เจ้าของเซิร์ฟเวอร์</p>
                  <h3>
                    {selectedServer.owner_id === userId
                      ? "คุณ"
                      : "สมาชิกคนอื่น"}
                  </h3>
                </div>

                <div className="vc-info-card">
                  <span className="vc-card-icon">📅</span>
                  <p>วันที่สร้าง</p>
                  <h3>
                    {new Date(selectedServer.created_at).toLocaleDateString(
                      "th-TH"
                    )}
                  </h3>
                </div>
              </div>

              <div className="vc-invite-card">
                <div>
                  <span className="vc-label">SERVER INVITE CODE</span>
                  <h3>รหัสเชิญเซิร์ฟเวอร์</h3>
                  <code>{selectedServer.invite_code}</code>
                </div>

                <button
                  type="button"
                  onClick={() => copyInviteCode(selectedServer.invite_code)}
                >
                  คัดลอกรหัส
                </button>
              </div>

              <div className="vc-coming-soon">
                <div className="vc-coming-icon">🎧</div>
                <h3>พื้นที่ห้องพูดคุย</h3>
                <p>
                  เตรียมพบกับระบบห้องเสียงและห้องพูดคุยของ Voicechatmax
                </p>
                <span>VOICE CHANNELS — COMING SOON</span>
              </div>
            </div>
          ) : (
            <div className="vc-empty">
              <div className="vc-empty-icon">🎧</div>
              <h3>ยินดีต้อนรับสู่ Voicechatmax</h3>
              <p>เริ่มต้นด้วยการสร้างเซิร์ฟเวอร์แรกของคุณ</p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
              >
                + สร้างเซิร์ฟเวอร์
              </button>
            </div>
          )}
        </main>
      </div>

      {showCreateModal && (
        <div
          className="vc-modal-overlay"
          onClick={() => {
            if (!creating) setShowCreateModal(false);
          }}
        >
          <div
            className="vc-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vc-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="vc-modal-heading">
              <div className="vc-modal-icon">+</div>
              <button
                type="button"
                disabled={creating}
                onClick={() => setShowCreateModal(false)}
                aria-label="ปิดหน้าต่าง"
              >
                ×
              </button>
            </div>

            <h2 id="vc-modal-title">สร้างเซิร์ฟเวอร์ใหม่</h2>
            <p>สร้างพื้นที่ส่วนตัวเพื่อพูดคุยกับเพื่อน ๆ</p>

            <form className="vc-create-form" onSubmit={createServer}>
              <label htmlFor="vc-server-name">ชื่อเซิร์ฟเวอร์</label>
              <input
                id="vc-server-name"
                value={serverName}
                onChange={(event) => setServerName(event.target.value)}
                placeholder="เช่น My Gaming Community"
                maxLength={40}
                required
                autoFocus
              />
              <span className="vc-input-hint">สูงสุด 40 ตัวอักษร</span>

              <button type="submit" disabled={creating}>
                {creating ? "กำลังสร้าง..." : "สร้างเซิร์ฟเวอร์"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}