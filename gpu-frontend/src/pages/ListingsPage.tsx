import { NavLink, Outlet } from "react-router-dom";
import PageTitle from "../components/PageTitle";

export default function ListingsPage() {
  return (
    <div className="container app-container py-3">
      <PageTitle />
      <nav className="nav nav-pills-dark gap-1 mb-4 flex-wrap" aria-label="Marketplace">
        <NavLink end className="nav-link" to="/listings">
          <i className="bi bi-grid-3x3-gap-fill"></i>
          <span>Marketplace</span>
        </NavLink>
        <NavLink className="nav-link" to="/listings/new">
          <i className="bi bi-plus-circle-fill"></i>
          <span>Sell Your GPU</span>
        </NavLink>
        <NavLink className="nav-link" to="/listings/profile">
          <i className="bi bi-person-badge-fill"></i>
          <span>My Profile</span>
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
