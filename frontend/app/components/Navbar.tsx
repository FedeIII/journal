import { useAuth } from "~/utils/auth";
import { useNavigate, Link } from "@remix-run/react";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <h1 onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        Journal
      </h1>
      <div className="navbar-nav">
        <Link to="/entry" className="nav-link nav-link-cta">
          Today's Entry
        </Link>
        <Link to="/calendar" className="nav-link">
          Calendar
        </Link>
        <span
          style={{
            color: "var(--text-muted)",
            fontSize: "var(--font-size-sm)",
            fontStyle: "italic",
          }}
        >
          {user.name}
        </span>
        <ThemeToggle />
        <button onClick={handleLogout} className="btn-logout">
          Logout
        </button>
      </div>
    </nav>
  );
}
