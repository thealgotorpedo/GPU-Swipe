import PageTitle from "../components/PageTitle";
import LoggedInName from "../components/LoggedInName";
import ListingUI from "../components/ListingUI";

const ListingsPage = () => {
  return (
    <div className="container app-container py-3">
      <PageTitle />
      <LoggedInName />
      <ListingUI />
    </div>
  );
};

export default ListingsPage;
