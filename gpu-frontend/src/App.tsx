import type { ReactNode } from "react";
import { BrowserRouter as Router, Route, Navigate, Routes } from "react-router-dom";
import "./App.css";

import LoginPage from "./pages/LoginPage";
import ListingsPage from "./pages/ListingsPage";
import { getSession } from "./utils/session";

function RequireLogin({ children }: { children: ReactNode }) {
  return getSession() ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/listings" element={<RequireLogin><ListingsPage /></RequireLogin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
