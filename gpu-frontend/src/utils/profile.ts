export interface PublicProfile {
  id: string;
  login: string;
  displayName: string;
  bio: string;
  contactEmail: string;
  contactPhone: string;
  sellerRating: { average: number | null; count: number };
}

export function ratingText(rating: PublicProfile["sellerRating"]) {
  return rating.count
    ? `${rating.average?.toFixed(1)} / 5 (${rating.count} ratings)`
    : "No ratings yet";
}
