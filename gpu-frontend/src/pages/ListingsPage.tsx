import { NavLink, Outlet } from "react-router-dom";
import PageTitle from "../components/PageTitle";
export default function ListingsPage() {
  return <div className="container app-container py-3">
    <PageTitle />
    <nav className="nav nav-pills gap-2 mb-4" aria-label="Marketplace">
      <NavLink end className="nav-link" to="/listings">Browse listings</NavLink>
      <NavLink className="nav-link" to="/listings/new">Create listing</NavLink>
      <NavLink className="nav-link" to="/listings/profile">My profile</NavLink>
    </nav>
    <Outlet />
  </div>;
}
