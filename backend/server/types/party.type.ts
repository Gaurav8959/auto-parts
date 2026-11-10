export type TParty = {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  notes?: string;
};

export type TPartyListParams = {
  shopId: number | null;
  limit: number;
  page: number;
  keyword?: string;
};
