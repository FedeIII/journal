import { useNavigate } from "@remix-run/react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import Editor from "~/components/Editor";
import Navbar from "~/components/Navbar";
import { api } from "~/utils/api";
import { useAuth } from "~/utils/auth";

export default function Entry() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const today = new Date();
  const todayString = format(today, "yyyy-MM-dd");
  const displayDate = format(today, "EEEE, MMMM d, yyyy");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      api
        .getEntry(todayString)
        .then((entry) => {
          if (entry) {
            setContent(entry.content);
          }
        })
        .catch((err) => {
          console.error("Error loading entry:", err);
        })
        .finally(() => setLoading(false));
    }
  }, [user, todayString]);

  const handleSave = async () => {
    if (!content) return;

    setSaving(true);
    try {
      await api.saveEntry(todayString, content);
      navigate("/");
    } catch (err) {
      console.error("Error saving entry:", err);
      alert("Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) return null;

  return (
    <div>
      <Navbar />
      <div className="editor-container">
        <h1 className="date-title">{displayDate}</h1>

        <div
          style={{
            background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)",
            border: "1px solid #667eea40",
            borderRadius: "8px",
            padding: "20px 24px",
            marginBottom: "24px",
            lineHeight: "1.6",
            color: "#555",
          }}
        >
          <p style={{ margin: 0, marginBottom: "12px" }}>
            <strong style={{ color: "#667eea" }}>
              Capture both sides of the camera.
            </strong>{" "}
            Write what happened today and how you felt about it. Your thoughts,
            your fears, your desires. Write about the objective events and also
            who you were and how you lived them in that moment.
          </p>
          <p style={{ margin: 0 }}>
            I'll show you this same date from every year you've written. Watch
            yourself evolve. See what truly mattered. Get the perspective that
            keeps those dark nights of the soul at bay. Remember who you are and
            where you're going. Learn who do you want to be and what you
            accomplished.
          </p>
        </div>

        <Editor content={content} onChange={setContent} />
        <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
          <button
            className="btn"
            onClick={handleSave}
            disabled={saving}
            style={{ width: "auto", padding: "12px 24px" }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/calendar")}
            style={{ width: "auto", padding: "12px 24px" }}
          >
            View Calendar
          </button>
        </div>
      </div>
    </div>
  );
}
