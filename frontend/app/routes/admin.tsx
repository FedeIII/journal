import { useState, useEffect } from "react";
import { useNavigate } from "@remix-run/react";
import { useAuth } from "~/utils/auth";
import { api } from "~/utils/api";
import Navbar from "~/components/Navbar";

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    messageText: "",
    context: "both" as "login" | "entry" | "both",
    tone: "",
    length: "",
  });

  // Sorting and filtering state
  const [sortBy, setSortBy] = useState<"views" | "id" | "registrations" | "first_entry" | "more_entries" | "conversion_rate">("conversion_rate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterTag, setFilterTag] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadMessages();
    }
  }, [user]);

  const loadMessages = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getAdminMessages();
      setMessages(data);
    } catch (err: any) {
      setError(
        err.message || "Failed to load messages. You may not have admin access."
      );
      console.error("Error loading messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.messageText) {
      alert("Message text is required");
      return;
    }

    try {
      await api.createMessage(formData);
      setShowCreateForm(false);
      setFormData({ messageText: "", context: "both", tone: "", length: "" });
      loadMessages();
    } catch (err: any) {
      alert(err.message || "Failed to create message");
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      await api.updateMessage(id, formData);
      setEditingId(null);
      setFormData({ messageText: "", context: "both", tone: "", length: "" });
      loadMessages();
    } catch (err: any) {
      alert(err.message || "Failed to update message");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this message?")) {
      return;
    }

    try {
      await api.deleteMessage(id);
      loadMessages();
    } catch (err: any) {
      alert(err.message || "Failed to delete message");
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await api.updateMessage(id, { isActive: !isActive });
      loadMessages();
    } catch (err: any) {
      alert(err.message || "Failed to update message");
    }
  };

  const startEdit = (message: any) => {
    setEditingId(message.id);
    setFormData({
      messageText: message.message_text,
      context: message.context,
      tone: message.tone || "",
      length: message.length || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ messageText: "", context: "both", tone: "", length: "" });
  };

  // Get filtered and sorted messages
  const getFilteredAndSortedMessages = () => {
    let filtered = [...messages];

    // Apply tag filter
    if (filterTag) {
      filtered = filtered.filter((msg) => {
        return (
          msg.context === filterTag ||
          msg.tone === filterTag ||
          msg.length === filterTag
        );
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "id":
          comparison = a.id - b.id;
          break;
        case "views":
          comparison = (a.total_views || 0) - (b.total_views || 0);
          break;
        case "registrations":
          const aRegNet = (a.new_user_registered || 0) - (a.new_user_left || 0);
          const bRegNet = (b.new_user_registered || 0) - (b.new_user_left || 0);
          comparison = aRegNet - bRegNet;
          break;
        case "first_entry":
          const aFirstNet = (a.first_entry_written || 0) - (a.no_entries_left || 0);
          const bFirstNet = (b.first_entry_written || 0) - (b.no_entries_left || 0);
          comparison = aFirstNet - bFirstNet;
          break;
        case "more_entries":
          const aMoreNet = (a.existing_user_wrote || 0) - (a.existing_user_left || 0);
          const bMoreNet = (b.existing_user_wrote || 0) - (b.existing_user_left || 0);
          comparison = aMoreNet - bMoreNet;
          break;
        case "conversion_rate":
          // Calculate conversion rate: (total positive outcomes / total views) * 100
          const aTotalConversions = (a.new_user_registered || 0) + (a.first_entry_written || 0) + (a.existing_user_wrote || 0);
          const bTotalConversions = (b.new_user_registered || 0) + (b.first_entry_written || 0) + (b.existing_user_wrote || 0);
          const aRate = a.total_views > 0 ? (aTotalConversions / a.total_views) * 100 : 0;
          const bRate = b.total_views > 0 ? (bTotalConversions / b.total_views) * 100 : 0;
          comparison = aRate - bRate;
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  };

  const displayedMessages = getFilteredAndSortedMessages();

  // Get all unique tags
  const allTags = Array.from(
    new Set([
      ...messages.map((m) => m.context),
      ...messages.map((m) => m.tone).filter(Boolean),
      ...messages.map((m) => m.length).filter(Boolean),
    ])
  ).sort();

  const toggleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  if (authLoading || loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) return null;

  if (error) {
    return (
      <div>
        <Navbar />
        <div className="container">
          <div className="error" style={{ marginTop: "32px" }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div
        className="container"
        style={{ maxWidth: "1400px", marginTop: "32px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <h1 style={{ fontSize: "32px", margin: 0 }}>
            Motivational Messages Admin
          </h1>
          <button
            className="btn"
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{ width: "auto", padding: "12px 24px" }}
          >
            {showCreateForm ? "Cancel" : "Create New Message"}
          </button>
        </div>

        {showCreateForm && (
          <div
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "8px",
              marginBottom: "24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h2 style={{ marginBottom: "16px" }}>Create New Message</h2>
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "500",
                }}
              >
                Message Text
              </label>
              <textarea
                value={formData.messageText}
                onChange={(e) =>
                  setFormData({ ...formData, messageText: e.target.value })
                }
                style={{
                  width: "100%",
                  minHeight: "100px",
                  padding: "12px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                  fontFamily: "inherit",
                }}
                placeholder="Enter your motivational message..."
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  Context
                </label>
                <select
                  value={formData.context}
                  onChange={(e) =>
                    setFormData({ ...formData, context: e.target.value as any })
                  }
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                >
                  <option value="both">Both</option>
                  <option value="login">Login</option>
                  <option value="entry">Entry</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  Tone
                </label>
                <input
                  type="text"
                  value={formData.tone}
                  onChange={(e) =>
                    setFormData({ ...formData, tone: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                  placeholder="e.g., inspirational, casual"
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  Length
                </label>
                <input
                  type="text"
                  value={formData.length}
                  onChange={(e) =>
                    setFormData({ ...formData, length: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                  placeholder="e.g., short, medium, long"
                />
              </div>
            </div>
            <button
              className="btn"
              onClick={handleCreate}
              style={{ width: "auto", padding: "12px 24px" }}
            >
              Create Message
            </button>
          </div>
        )}

        <div
          style={{
            background: "white",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            overflowX: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ margin: 0 }}>
              All Messages ({displayedMessages.length}{filterTag && ` / ${messages.length}`})
            </h2>
            {filterTag && (
              <button
                onClick={() => setFilterTag("")}
                style={{
                  padding: "6px 12px",
                  background: "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Clear Filter: {filterTag}
              </button>
            )}
          </div>

          {messages.length === 0 ? (
            <p style={{ color: "#666" }}>No messages found.</p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "14px",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  <th
                    rowSpan={2}
                    onClick={() => toggleSort("id")}
                    style={{
                      padding: "8px",
                      textAlign: "center",
                      fontWeight: "600",
                      color: "#333",
                      width: "40px",
                      borderBottom: "2px solid #ddd",
                      cursor: "pointer",
                      userSelect: "none",
                      background: sortBy === "id" ? "#f0f0f0" : "transparent",
                    }}
                  >
                    ID {sortBy === "id" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    rowSpan={2}
                    style={{
                      padding: "8px",
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#333",
                      width: "40%",
                      borderBottom: "2px solid #ddd",
                    }}
                  >
                    Message Preview
                  </th>
                  <th
                    rowSpan={2}
                    style={{
                      padding: "8px",
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#333",
                      width: "70px",
                      borderBottom: "2px solid #ddd",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span>Tags</span>
                      <select
                        value={filterTag}
                        onChange={(e) => setFilterTag(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontSize: "10px",
                          padding: "2px 4px",
                          borderRadius: "3px",
                          border: "1px solid #ddd",
                        }}
                      >
                        <option value="">All</option>
                        {allTags.map((tag) => (
                          <option key={tag} value={tag}>
                            {tag}
                          </option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th
                    rowSpan={2}
                    onClick={() => toggleSort("views")}
                    style={{
                      padding: "8px",
                      textAlign: "center",
                      fontWeight: "600",
                      color: "#333",
                      width: "80px",
                      borderBottom: "2px solid #ddd",
                      cursor: "pointer",
                      userSelect: "none",
                      background: sortBy === "views" ? "#f0f0f0" : "transparent",
                    }}
                  >
                    Views {sortBy === "views" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    colSpan={2}
                    onClick={() => toggleSort("registrations")}
                    style={{
                      padding: "8px",
                      textAlign: "center",
                      fontWeight: "600",
                      color: "#333",
                      borderBottom: "1px solid #ddd",
                      cursor: "pointer",
                      userSelect: "none",
                      background: sortBy === "registrations" ? "#f0f0f0" : "transparent",
                    }}
                  >
                    Registrations {sortBy === "registrations" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    colSpan={2}
                    onClick={() => toggleSort("first_entry")}
                    style={{
                      padding: "8px",
                      textAlign: "center",
                      fontWeight: "600",
                      color: "#333",
                      borderBottom: "1px solid #ddd",
                      cursor: "pointer",
                      userSelect: "none",
                      background: sortBy === "first_entry" ? "#f0f0f0" : "transparent",
                    }}
                  >
                    First Entry {sortBy === "first_entry" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    colSpan={2}
                    onClick={() => toggleSort("more_entries")}
                    style={{
                      padding: "8px",
                      textAlign: "center",
                      fontWeight: "600",
                      color: "#333",
                      borderBottom: "1px solid #ddd",
                      cursor: "pointer",
                      userSelect: "none",
                      background: sortBy === "more_entries" ? "#f0f0f0" : "transparent",
                    }}
                  >
                    More Entries {sortBy === "more_entries" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    rowSpan={2}
                    onClick={() => toggleSort("conversion_rate")}
                    style={{
                      padding: "8px",
                      textAlign: "center",
                      fontWeight: "600",
                      color: "#333",
                      width: "100px",
                      borderBottom: "2px solid #ddd",
                      cursor: "pointer",
                      userSelect: "none",
                      background: sortBy === "conversion_rate" ? "#f0f0f0" : "transparent",
                    }}
                  >
                    Conv. Rate {sortBy === "conversion_rate" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    rowSpan={2}
                    style={{
                      padding: "8px",
                      textAlign: "center",
                      fontWeight: "600",
                      color: "#333",
                      width: "120px",
                      borderBottom: "2px solid #ddd",
                    }}
                  >
                    Actions
                  </th>
                </tr>
                <tr style={{ borderBottom: "2px solid #ddd" }}>
                  {/* Subheaders for Registrations */}
                  <th
                    style={{
                      padding: "6px",
                      textAlign: "center",
                      fontWeight: "600",
                      fontSize: "12px",
                      color: "#4caf50",
                      background: "#e8f5e9",
                    }}
                  >
                    +
                  </th>
                  <th
                    style={{
                      padding: "6px",
                      textAlign: "center",
                      fontWeight: "600",
                      fontSize: "12px",
                      color: "#f44336",
                      background: "#ffebee",
                    }}
                  >
                    -
                  </th>
                  {/* Subheaders for First Entry */}
                  <th
                    style={{
                      padding: "6px",
                      textAlign: "center",
                      fontWeight: "600",
                      fontSize: "12px",
                      color: "#4caf50",
                      background: "#e8f5e9",
                    }}
                  >
                    +
                  </th>
                  <th
                    style={{
                      padding: "6px",
                      textAlign: "center",
                      fontWeight: "600",
                      fontSize: "12px",
                      color: "#f44336",
                      background: "#ffebee",
                    }}
                  >
                    -
                  </th>
                  {/* Subheaders for More Entries */}
                  <th
                    style={{
                      padding: "6px",
                      textAlign: "center",
                      fontWeight: "600",
                      fontSize: "12px",
                      color: "#4caf50",
                      background: "#e8f5e9",
                    }}
                  >
                    +
                  </th>
                  <th
                    style={{
                      padding: "6px",
                      textAlign: "center",
                      fontWeight: "600",
                      fontSize: "12px",
                      color: "#f44336",
                      background: "#ffebee",
                    }}
                  >
                    -
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedMessages.map((message) => (
                  <tr
                    key={message.id}
                    style={{
                      borderBottom: "1px solid #eee",
                      opacity: message.is_active ? 1 : 0.5,
                      background: message.is_active ? "white" : "#f9f9f9",
                    }}
                  >
                    {editingId === message.id ? (
                      <td colSpan={12} style={{ padding: "16px" }}>
                        <div>
                          <textarea
                            value={formData.messageText}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                messageText: e.target.value,
                              })
                            }
                            style={{
                              width: "100%",
                              minHeight: "80px",
                              padding: "12px",
                              borderRadius: "4px",
                              border: "1px solid #ddd",
                              marginBottom: "12px",
                              fontFamily: "inherit",
                            }}
                          />
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr 1fr",
                              gap: "12px",
                              marginBottom: "12px",
                            }}
                          >
                            <select
                              value={formData.context}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  context: e.target.value as any,
                                })
                              }
                              style={{
                                padding: "8px",
                                borderRadius: "4px",
                                border: "1px solid #ddd",
                              }}
                            >
                              <option value="both">Both</option>
                              <option value="login">Login</option>
                              <option value="entry">Entry</option>
                            </select>
                            <input
                              type="text"
                              value={formData.tone}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  tone: e.target.value,
                                })
                              }
                              placeholder="Tone"
                              style={{
                                padding: "8px",
                                borderRadius: "4px",
                                border: "1px solid #ddd",
                              }}
                            />
                            <input
                              type="text"
                              value={formData.length}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  length: e.target.value,
                                })
                              }
                              placeholder="Length"
                              style={{
                                padding: "8px",
                                borderRadius: "4px",
                                border: "1px solid #ddd",
                              }}
                            />
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              className="btn"
                              onClick={() => handleUpdate(message.id)}
                              style={{ width: "auto", padding: "8px 16px" }}
                            >
                              Save
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={cancelEdit}
                              style={{ width: "auto", padding: "8px 16px" }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    ) : (
                      <>
                        {/* ID */}
                        <td
                          style={{
                            padding: "8px",
                            textAlign: "center",
                            verticalAlign: "middle",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#667eea",
                          }}
                        >
                          {message.id}
                        </td>

                        {/* Message Preview */}
                        <td
                          style={{
                            padding: "8px",
                            verticalAlign: "middle",
                            maxHeight: "60px",
                            position: "relative",
                          }}
                        >
                          <div
                            style={
                              {
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: "vertical",
                                lineHeight: "1.3",
                                fontSize: "12px",
                                color: "#333",
                                maxHeight: "52px",
                              } as React.CSSProperties
                            }
                          >
                            {message.message_text}
                          </div>
                        </td>

                        {/* Tags */}
                        <td style={{ padding: "8px", verticalAlign: "middle" }}>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "3px",
                            }}
                          >
                            <span
                              style={{
                                background: "#e8eaf6",
                                color: "#667eea",
                                padding: "1px 6px",
                                borderRadius: "10px",
                                fontSize: "10px",
                                fontWeight: "500",
                                textAlign: "center",
                              }}
                            >
                              {message.context}
                            </span>
                            {message.tone && (
                              <span
                                style={{
                                  background: "#f3e5f5",
                                  color: "#9c27b0",
                                  padding: "1px 6px",
                                  borderRadius: "10px",
                                  fontSize: "10px",
                                  textAlign: "center",
                                }}
                              >
                                {message.tone}
                              </span>
                            )}
                            {message.length && (
                              <span
                                style={{
                                  background: "#fff3e0",
                                  color: "#f57c00",
                                  padding: "1px 6px",
                                  borderRadius: "10px",
                                  fontSize: "10px",
                                  textAlign: "center",
                                }}
                              >
                                {message.length}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Total Views */}
                        <td
                          style={{
                            padding: "8px",
                            textAlign: "center",
                            verticalAlign: "middle",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "16px",
                              fontWeight: "bold",
                              color: "#333",
                            }}
                          >
                            {message.total_views || 0}
                          </div>
                        </td>

                        {/* Reg+ */}
                        <td
                          title="Seen and registered"
                          style={{
                            padding: "6px",
                            textAlign: "center",
                            verticalAlign: "middle",
                            background: "#e8f5e9",
                            cursor: "help",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "16px",
                              fontWeight: "bold",
                              color: "#4caf50",
                            }}
                          >
                            {message.new_user_registered || 0}
                          </div>
                        </td>

                        {/* Reg- */}
                        <td
                          title="Seen but not registered"
                          style={{
                            padding: "6px",
                            textAlign: "center",
                            verticalAlign: "middle",
                            background: "#ffebee",
                            cursor: "help",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "16px",
                              fontWeight: "bold",
                              color: "#f44336",
                            }}
                          >
                            {message.new_user_left || 0}
                          </div>
                        </td>

                        {/* 1st+ */}
                        <td
                          title="Seen and input first entry"
                          style={{
                            padding: "6px",
                            textAlign: "center",
                            verticalAlign: "middle",
                            background: "#e8f5e9",
                            cursor: "help",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "16px",
                              fontWeight: "bold",
                              color: "#4caf50",
                            }}
                          >
                            {message.first_entry_written || 0}
                          </div>
                        </td>

                        {/* 1st- */}
                        <td
                          title="Seen but left before first input"
                          style={{
                            padding: "6px",
                            textAlign: "center",
                            verticalAlign: "middle",
                            background: "#ffebee",
                            cursor: "help",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "16px",
                              fontWeight: "bold",
                              color: "#f44336",
                            }}
                          >
                            {message.no_entries_left || 0}
                          </div>
                        </td>

                        {/* More+ */}
                        <td
                          title="Seen and input another entry"
                          style={{
                            padding: "6px",
                            textAlign: "center",
                            verticalAlign: "middle",
                            background: "#e8f5e9",
                            cursor: "help",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "16px",
                              fontWeight: "bold",
                              color: "#4caf50",
                            }}
                          >
                            {message.existing_user_wrote || 0}
                          </div>
                        </td>

                        {/* More- */}
                        <td
                          title="Seen but left before another entry"
                          style={{
                            padding: "6px",
                            textAlign: "center",
                            verticalAlign: "middle",
                            background: "#ffebee",
                            cursor: "help",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "16px",
                              fontWeight: "bold",
                              color: "#f44336",
                            }}
                          >
                            {message.existing_user_left || 0}
                          </div>
                        </td>

                        {/* Conversion Rate */}
                        <td
                          title="Total positive outcomes / Total views"
                          style={{
                            padding: "8px",
                            textAlign: "center",
                            verticalAlign: "middle",
                            cursor: "help",
                          }}
                        >
                          {(() => {
                            const totalConversions = (message.new_user_registered || 0) + (message.first_entry_written || 0) + (message.existing_user_wrote || 0);
                            const rate = message.total_views > 0 ? (totalConversions / message.total_views) * 100 : 0;
                            const rateColor = rate >= 50 ? "#4caf50" : rate >= 25 ? "#ff9800" : "#f44336";
                            return (
                              <div
                                style={{
                                  fontSize: "18px",
                                  fontWeight: "bold",
                                  color: rateColor,
                                }}
                              >
                                {rate.toFixed(1)}%
                              </div>
                            );
                          })()}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "8px", verticalAlign: "middle" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              justifyContent: "center",
                            }}
                          >
                            <button
                              onClick={() =>
                                handleToggleActive(
                                  message.id,
                                  message.is_active
                                )
                              }
                              title={
                                message.is_active ? "Hide" : "Show"
                              }
                              style={{
                                padding: "6px",
                                background: message.is_active
                                  ? "#ffc107"
                                  : "#4caf50",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="white"
                              >
                                {message.is_active ? (
                                  <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299l.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884l-12-12 .708-.708 12 12-.708.708z" />
                                ) : (
                                  <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z" />
                                )}
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(message.id)}
                              title="Delete"
                              style={{
                                padding: "6px",
                                background: "#dc3545",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="white"
                              >
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                                <path
                                  fillRule="evenodd"
                                  d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
