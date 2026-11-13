
import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { supabase } from "./lib/supabase";
import ServerDashboard from "./ServerDashboard";
import "./App.css";

type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();

      if (mounted) {
        setUser(data.session?.user ?? null);
        setLoading(false);
      }
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setMessage("โหลดโปรไฟล์ไม่สำเร็จ: " + error.message);
        return;
      }

      if (data) {
        setProfile(data);
        setDisplayName(data.display_name ?? "");
        setPreview(data.avatar_url ?? "");
      } else {
        const newProfile = {
          id: user.id,
          display_name: user.email?.split("@")[0] ?? "สมาชิก",
          avatar_url: null,
        };

        const { data: inserted, error: insertError } = await supabase
          .from("profiles")
          .upsert(newProfile)
          .select("id, display_name, avatar_url")
          .single();

        if (cancelled) return;

        if (insertError) {
          setMessage("สร้างโปรไฟล์ไม่สำเร็จ: " + insertError.message);
          return;
        }

        setProfile(inserted);
        setDisplayName(inserted.display_name);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          setMessage("สมัครสมาชิกสำเร็จ!");
        } else {
          setMessage("สมัครสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "เกิดข้อผิดพลาด"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("กรุณาเลือกรูป JPG, PNG หรือ WEBP");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("รูปภาพต้องมีขนาดไม่เกิน 2 MB");
      return;
    }

    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
    setMessage("");
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) return;

    setSaving(true);
    setMessage("");

    try {
      let avatarUrl = profile?.avatar_url ?? null;

      if (avatarFile) {
        const extension = avatarFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, {
            upsert: true,
            contentType: avatarFile.type,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);

        avatarUrl = data.publicUrl;
      }

      const { data, error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          display_name: displayName.trim(),
          avatar_url: avatarUrl,
        })
        .select("id, display_name, avatar_url")
        .single();

      if (error) throw error;

      setProfile(data);
      setAvatarFile(null);
      setPreview(data.avatar_url ?? "");
      setMessage("บันทึกโปรไฟล์สำเร็จ!");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? "บันทึกไม่สำเร็จ: " + error.message
          : "เกิดข้อผิดพลาด"
      );
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage("ออกจากระบบไม่สำเร็จ: " + error.message);
    }
  }

  if (loading) {
    return <div className="auth-loading">กำลังโหลด Voicechatmax...</div>;
  }

  if (!user) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-logo">V</div>
          <h1>VOICECHAT<span>MAX</span></h1>
          <p className="auth-subtitle">COMMUNITY VOICE PLATFORM</p>

          <h2>{isRegister ? "สร้างบัญชีใหม่" : "ยินดีต้อนรับกลับ"}</h2>
          <p className="auth-description">
            {isRegister
              ? "สมัครสมาชิกเพื่อเริ่มใช้งาน Voicechatmax"
              : "เข้าสู่ระบบเพื่อพูดคุยกับชุมชนของคุณ"}
          </p>

          <form onSubmit={handleAuth}>
            <label>อีเมล</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
            />

            <label>รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="กรอกรหัสผ่าน"
              minLength={6}
              required
            />

            <button type="submit" disabled={loading}>
              {loading
                ? "กำลังดำเนินการ..."
                : isRegister
                  ? "สมัครสมาชิก"
                  : "เข้าสู่ระบบ"}
            </button>
          </form>

          {message && <p className="auth-message">{message}</p>}

          <div className="auth-switch">
            {isRegister ? "มีบัญชีอยู่แล้ว?" : "ยังไม่มีบัญชี?"}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setMessage("");
              }}
            >
              {isRegister ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-container">
      <aside className="profile-card">
        <div className="profile-heading">
          <div className="profile-preview">
            {preview ? (
              <img src={preview} alt="รูปโปรไฟล์" />
            ) : (
              <div className="profile-placeholder">
                {(displayName || "M").charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <h2>{profile?.display_name || displayName || "สมาชิก"}</h2>
          <p>{user.email}</p>
          <span className="profile-status">● ออนไลน์</span>
        </div>

        <form className="profile-form" onSubmit={saveProfile}>
          <label>ชื่อที่แสดง</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="ชื่อสมาชิก"
            maxLength={40}
            required
          />

          <label>รูปโปรไฟล์</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleAvatarChange}
          />

          <p className="profile-hint">JPG, PNG, WEBP ไม่เกิน 2 MB</p>

          <button type="submit" disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกโปรไฟล์"}
          </button>
        </form>

        {message && <p className="profile-message">{message}</p>}

        <button className="logout-button" onClick={logout}>
          ออกจากระบบ
        </button>
      </aside>

      <ServerDashboard userId={user.id} />
    </main>
  );
}
