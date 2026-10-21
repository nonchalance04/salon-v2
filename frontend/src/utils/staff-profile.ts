// Describe the information used by staff profile so different parts of the application agree on its contents.
export type StaffPublicProfile = {
  title: string;
  bio: string;
  photoUrl: string | null;
  languages: string[];
  portfolio: { title: string; imageUrl: string; caption: string }[];
  reviews: { author: string; rating: number; text: string }[];
};
// Prepare an empty public staff profile so the editor has all of its expected fields.
export const emptyStaffProfile = (): StaffPublicProfile => ({ title: "Salon professional", bio: "", photoUrl: null, languages: [], portfolio: [], reviews: [] });
