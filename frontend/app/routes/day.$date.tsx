import { useNavigate, useParams } from "@remix-run/react";
import { format, parse } from "date-fns";
import { useEffect, useState } from "react";
import Navbar from "~/components/Navbar";
import { api } from "~/utils/api";
import { useAuth } from "~/utils/auth";

export default function DayView() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const dateParam = params.date || "";
  const [month, day] = dateParam.split("-").map(Number);

  // Check if the requested date is today's month-day
  useEffect(() => {
    const today = new Date();
    const todayMonth = today.getMonth() + 1; // getMonth() is 0-indexed
    const todayDay = today.getDate();

    if (month === todayMonth && day === todayDay) {
      navigate("/entry");
    }
  }, [month, day, navigate]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && month && day) {
      const fetchEntries = async () => {
        setLoading(true);
        try {
          const data = await api.getEntriesForDay(month, day);
          setEntries(
            data.sort(
              (a, b) =>
                new Date(a.entry_date).getTime() -
                new Date(b.entry_date).getTime()
            )
          );
        } catch (err) {
          console.error("Error fetching day entries:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchEntries();
    }
  }, [user, month, day]);

  const renderContent = (content: any) => {
    if (!content || !content.content) return null;

    const renderNode = (node: any, index: number): any => {
      if (node.type === "paragraph") {
        return (
          <p key={index} style={{ marginBottom: "12px" }}>
            {node.content?.map((child: any, i: number) => renderNode(child, i))}
          </p>
        );
      }

      if (node.type === "text") {
        let text = <span key={index}>{node.text}</span>;
        if (node.marks) {
          node.marks.forEach((mark: any) => {
            if (mark.type === "bold") {
              text = <strong key={index}>{node.text}</strong>;
            } else if (mark.type === "italic") {
              text = <em key={index}>{node.text}</em>;
            }
          });
        }
        return text;
      }

      if (node.type === "bulletList") {
        return (
          <ul key={index} style={{ marginBottom: "12px", marginLeft: "20px" }}>
            {node.content?.map((child: any, i: number) => renderNode(child, i))}
          </ul>
        );
      }

      if (node.type === "orderedList") {
        return (
          <ol key={index} style={{ marginBottom: "12px", marginLeft: "20px" }}>
            {node.content?.map((child: any, i: number) => renderNode(child, i))}
          </ol>
        );
      }

      if (node.type === "listItem") {
        return (
          <li key={index}>
            {node.content?.map((child: any, i: number) => renderNode(child, i))}
          </li>
        );
      }

      if (node.type === "heading") {
        const HeadingTag = `h${
          node.attrs?.level || 1
        }` as keyof JSX.IntrinsicElements;
        return (
          <HeadingTag key={index} style={{ marginBottom: "12px" }}>
            {node.content?.map((child: any, i: number) => renderNode(child, i))}
          </HeadingTag>
        );
      }

      return null;
    };

    return (
      <div>
        {content.content.map((node: any, index: number) =>
          renderNode(node, index)
        )}
      </div>
    );
  };

  if (authLoading || loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) return null;

  const displayDate =
    month && day
      ? format(
          parse(
            `2024-${String(month).padStart(2, "0")}-${String(day).padStart(
              2,
              "0"
            )}`,
            "yyyy-MM-dd",
            new Date()
          ),
          "MMMM d"
        )
      : "Unknown Date";

  return (
    <div>
      <Navbar />
      <div className="day-view">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "32px",
          }}
        >
          <h1 style={{ fontSize: "32px", margin: 0 }}>{displayDate}</h1>
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/calendar")}
            style={{ width: "auto", padding: "8px 16px" }}
          >
            Back to Calendar
          </button>
        </div>

        {entries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            No entries for this day yet.
          </div>
        ) : (
          entries.map((entry) => {
            const entryDate = new Date(entry.entry_date);
            const year = format(entryDate, "yyyy");
            const fullDate = format(entryDate, "MMMM d, yyyy");

            return (
              <div key={entry.id} className="year-entry">
                <div className="year-title">{year}</div>
                <div
                  style={{
                    fontSize: "14px",
                    color: "#999",
                    marginBottom: "12px",
                  }}
                >
                  {fullDate}
                </div>
                <div style={{ lineHeight: "1.6", color: "#333" }}>
                  {renderContent(entry.content)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
