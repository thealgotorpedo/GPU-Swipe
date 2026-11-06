import type { ReactNode } from "react";
import { BrowserRouter as Router, Route, Navigate, Routes } from "react-router-dom";
import "./App.css";

import LoginPage from "./pages/LoginPage";
import Marketplace from "./components/Marketplace";
import ListingUI from "./components/ListingUI";
import Profile from "./components/Profile";
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
        <Route path="/listings" element={<RequireLogin><ListingsPage /></RequireLogin>}>
          <Route index element={<Marketplace />} />
          <Route path="new" element={<ListingUI />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
