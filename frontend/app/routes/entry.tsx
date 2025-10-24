import { useNavigate } from "@remix-run/react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import Editor from "~/components/Editor";
import Navbar from "~/components/Navbar";
import { api } from "~/utils/api";
import { useAuth } from "~/utils/auth";
import { getSessionId } from "~/utils/session";
import { getCachedMessage, setCachedMessage, clearCachedMessage } from "~/utils/messageCache";

export default function Entry() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<any>(null);
  const [userState, setUserState] = useState<'no_entries' | 'has_entries'>('no_entries');
  const today = new Date();
  const todayString = format(today, "yyyy-MM-dd");
  const displayDate = format(today, "EEEE, MMMM d, yyyy");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  // Load entry and user state
  useEffect(() => {
    if (user) {
      Promise.all([
        api.getEntry(todayString),
        api.getUserState()
      ])
        .then(([entry, state]) => {
          if (entry) {
            setContent(entry.content);
          }
          setUserState(state.userState as 'no_entries' | 'has_entries');
        })
        .catch((err) => {
          console.error("Error loading entry:", err);
        })
        .finally(() => setLoading(false));
    }
  }, [user, todayString]);

  // Fetch or use cached message and track view
  useEffect(() => {
    if (user && userState) {
      // Check cache first (using context + userState as key)
      const cached = getCachedMessage('entry', userState);

      if (cached) {
        // Use cached message
        setMessage(cached);

        // Track view for cached message
        if (cached.id) {
          api.trackMessageInteraction({
            messageId: cached.id,
            sessionId: getSessionId(),
            userId: user.id,
            context: 'entry',
            userState: userState,
          }).catch((err) => console.error('Error tracking message view:', err));
        }
      } else {
        // Fetch new random message and cache it
        api.getRandomMessage('entry')
          .then((msg) => {
            setMessage(msg);

            // Cache the message with userState
            setCachedMessage(msg, 'entry', userState);

            // Track message view
            if (msg.id) {
              api.trackMessageInteraction({
                messageId: msg.id,
                sessionId: getSessionId(),
                userId: user.id,
                context: 'entry',
                userState: userState,
              }).catch((err) => console.error('Error tracking message view:', err));
            }
          })
          .catch((err) => console.error('Error fetching message:', err));
      }
    }
  }, [user, userState]);

  const handleSave = async () => {
    if (!content) return;

    setSaving(true);
    try {
      await api.saveEntry(todayString, content);

      // Track outcome
      if (message?.id && user) {
        const outcome = userState === 'no_entries' ? 'wrote_first_entry' : 'wrote_entry';
        await api.trackMessageInteraction({
          messageId: message.id,
          sessionId: getSessionId(),
          userId: user.id,
          context: 'entry',
          userState: userState,
          outcome: outcome,
        }).catch((err) => console.error('Error tracking outcome:', err));
      }

      // Clear the cached message for this userState so they get a new one next time
      clearCachedMessage('entry', userState);

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

        {message && (
          <div
            style={{
              background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)",
              border: "1px solid #667eea40",
              borderRadius: "8px",
              padding: "20px 24px",
              marginBottom: "24px",
              lineHeight: "1.6",
              color: "#555",
              whiteSpace: "pre-wrap",
            }}
          >
            {message.message_text}
          </div>
        )}

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
