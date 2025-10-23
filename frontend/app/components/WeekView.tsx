import { useNavigate } from "@remix-run/react";
import {
  addDays,
  format,
  getMonth,
  getYear,
  isSameDay,
  isToday,
  startOfWeek,
} from "date-fns";
import { useEffect, useState } from "react";
import { api } from "~/utils/api";

interface WeekViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

export default function WeekView({
  currentDate,
  setCurrentDate,
}: WeekViewProps) {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [baseYear, setBaseYear] = useState(getYear(new Date()) - 2); // Start 2 years before current

  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const years = Array.from({ length: 5 }, (_, i) => baseYear + i);
  const currentMonth = format(currentDate, "MMMM");

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      try {
        const allEntries: any[] = [];

        // Fetch entries for each day across all years
        for (const day of weekDays) {
          const month = getMonth(day) + 1;
          const dayOfMonth = parseInt(format(day, "d"));
          const data = await api.getEntriesForDay(month, dayOfMonth);
          allEntries.push(...data);
        }

        const entriesMap = new Map();
        allEntries.forEach((entry: any) => {
          entriesMap.set(
            format(new Date(entry.entry_date), "yyyy-MM-dd"),
            entry
          );
        });
        setEntries(entriesMap);
      } catch (err) {
        console.error("Error fetching entries:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [currentDate, baseYear]);

  const handleDayClick = (date: string) => {
    navigate(`/day/${date}`);
  };

  const handleYearUp = () => {
    setBaseYear(baseYear - 1);
  };

  const handleYearDown = () => {
    setBaseYear(baseYear + 1);
  };

  const getEntryPreview = (content: any): string => {
    if (!content || !content.content) return "";

    const getText = (node: any): string => {
      if (node.type === "text") return node.text;
      if (node.content) {
        return node.content.map(getText).join(" ");
      }
      return "";
    };

    const text = content.content.map(getText).join(" ");
    return text.length > 50 ? text.substring(0, 50) + "..." : text;
  };

  return (
    <div>
      <div style={{ marginBottom: "24px", textAlign: "center" }}>
        <h2 style={{ fontSize: "28px", margin: 0 }}>--- {currentMonth} ---</h2>
      </div>

      {loading ? (
        <div className="loading">Loading entries...</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "center",
                    borderBottom: "2px solid #ddd",
                  }}
                >
                  <button
                    onClick={handleYearUp}
                    className="btn btn-secondary"
                    style={{
                      width: "auto",
                      padding: "4px 12px",
                      fontSize: "14px",
                    }}
                  >
                    ↑
                  </button>
                </th>
                {weekDays.map((day) => {
                  const isTodayColumn = isToday(day);
                  return (
                    <th
                      key={format(day, "yyyy-MM-dd")}
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        borderBottom: "2px solid #ddd",
                        minWidth: "120px",
                        backgroundColor: isTodayColumn
                          ? "#e8eaf6"
                          : "transparent",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: isTodayColumn ? "bold" : "normal",
                        }}
                      >
                        {format(day, "EEE d")}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {years.map((year) => (
                <tr key={year}>
                  <td
                    style={{
                      padding: "12px",
                      fontWeight: "bold",
                      textAlign: "center",
                      borderRight: "2px solid #ddd",
                      backgroundColor: "#f9f9f9",
                    }}
                  >
                    {year}
                  </td>
                  {weekDays.map((day) => {
                    const monthDay = format(day, "MM-dd");
                    const dateString = `${year}-${monthDay}`;
                    const entry = entries.get(dateString);
                    const hasEntry = !!entry;
                    const cellDate = new Date(dateString);
                    const isTodayCell = isSameDay(cellDate, new Date());

                    return (
                      <td
                        key={dateString}
                        onClick={() => handleDayClick(monthDay)}
                        style={{
                          padding: "12px",
                          border: isTodayCell
                            ? "2px solid #667eea"
                            : "1px solid #ddd",
                          cursor: "pointer",
                          backgroundColor: hasEntry ? "#e8eaf6" : "white",
                          verticalAlign: "top",
                          height: "80px",
                          transition: "background-color 0.2s",
                          fontWeight: isTodayCell ? "bold" : "normal",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = hasEntry
                            ? "#d1d4f0"
                            : "#f0f0f0";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = hasEntry
                            ? "#e8eaf6"
                            : "white";
                        }}
                      >
                        {hasEntry && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#555",
                              lineHeight: "1.4",
                            }}
                          >
                            {getEntryPreview(entry.content)}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ padding: "12px", textAlign: "center" }}>
                  <button
                    onClick={handleYearDown}
                    className="btn btn-secondary"
                    style={{
                      width: "auto",
                      padding: "4px 12px",
                      fontSize: "14px",
                    }}
                  >
                    ↓
                  </button>
                </td>
                <td colSpan={7}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
