export interface HouseholdSummary {
  id: string;
  name: string;
  role: 'OWNER' | 'MEMBER';
}

export interface CurrentUser {
  id: string;
  email: string;
  households: HouseholdSummary[];
}
