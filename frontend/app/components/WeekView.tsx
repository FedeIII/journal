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
  viewMode: 'month' | 'week';
  setViewMode: (mode: 'month' | 'week') => void;
}

export default function WeekView({
  currentDate,
  setCurrentDate,
  viewMode,
  setViewMode,
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
      <div style={{
        marginBottom: "var(--space-4)",
        textAlign: "center",
        paddingBottom: "var(--space-3)",
        borderBottom: `1px solid var(--border-light)`,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "var(--space-3)"
      }}>
        <div className="view-toggle-group">
          <button
            onClick={() => setViewMode('month')}
            className={`view-toggle-btn ${viewMode === 'month' ? 'active' : ''}`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`view-toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
          >
            Week
          </button>
        </div>

        <h2 style={{
          fontSize: "var(--font-size-2xl)",
          margin: 0,
          color: "var(--text-primary)",
          fontWeight: 400
        }}>
          {currentMonth}
        </h2>
      </div>

      {loading ? (
        <div className="loading">Loading entries...</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: "4px",
            border: "none",
            background: "var(--bg-primary)",
            padding: "4px",
            borderRadius: "var(--radius-md)"
          }}>
            <thead>
              <tr>
                <th style={{
                  padding: "var(--space-2)",
                  textAlign: "center",
                  background: "var(--bg-secondary)",
                  borderRadius: "var(--radius-sm)"
                }}>
                  <button
                    onClick={handleYearUp}
                    className="btn btn-secondary"
                    style={{
                      width: "auto",
                      height: "32px",
                      padding: "0 var(--space-2)",
                      fontSize: "var(--font-size-base)",
                      border: "none",
                      background: "transparent"
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
                        padding: "var(--space-2)",
                        textAlign: "center",
                        minWidth: "140px",
                        background: isTodayColumn
                          ? "var(--bg-secondary)"
                          : "var(--bg-elevated)",
                        fontWeight: isTodayColumn ? 600 : 500,
                        fontSize: "var(--font-size-sm)",
                        textTransform: "none",
                        letterSpacing: "0",
                        color: "var(--text-primary)",
                        borderRadius: "var(--radius-sm)"
                      }}
                    >
                      {format(day, "EEE d")}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {years.map((year, index) => (
                <tr key={year}>
                  <td style={{
                    padding: "var(--space-2)",
                    fontWeight: 600,
                    textAlign: "center",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    fontSize: "var(--font-size-base)",
                    borderRadius: "var(--radius-sm)"
                  }}>
                    {year}
                  </td>
                  {weekDays.map((day, dayIndex) => {
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
                        className={`week-cell ${hasEntry ? 'has-entry' : ''} ${isTodayCell ? 'today' : ''}`}
                      >
                        {hasEntry && (
                          <>
                            <div style={{
                              position: "absolute",
                              top: "var(--space-1)",
                              right: "var(--space-1)",
                              width: "6px",
                              height: "6px",
                              background: "var(--accent-primary)",
                              borderRadius: "50%"
                            }} />
                            <div style={{
                              fontSize: "var(--font-size-xs)",
                              color: "var(--text-secondary)",
                              lineHeight: "var(--line-height-normal)",
                              fontStyle: "italic"
                            }}>
                              {getEntryPreview(entry.content)}
                            </div>
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{
                  padding: "var(--space-2)",
                  textAlign: "center",
                  background: "var(--bg-secondary)",
                  borderRadius: "var(--radius-sm)"
                }}>
                  <button
                    onClick={handleYearDown}
                    className="btn btn-secondary"
                    style={{
                      width: "auto",
                      height: "32px",
                      padding: "0 var(--space-2)",
                      fontSize: "var(--font-size-base)",
                      border: "none",
                      background: "transparent"
                    }}
                  >
                    ↓
                  </button>
                </td>
                <td colSpan={7} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
