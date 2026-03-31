export type ClientStatus = 'lead' | 'active' | 'inactive' | 'churned';
export type DealStage = 'prospecting' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  company_name: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  owner_id: string;
  company: string;
  industry: string | null;
  website: string | null;
  status: ClientStatus;
  value: number;
  currency: string;
  avatar_color: string;
  created_at: string;
  updated_at: string;
  contact_count?: number;
  note_count?: number;
}

export interface Contact {
  id: string;
  client_id: string;
  owner_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  avatar_url: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface Note {
  id: string;
  client_id: string;
  author_id: string;
  body: string;
  pinned: boolean;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  created_at: string;
  updated_at: string;
  author?: Pick<Profile, 'full_name' | 'avatar_url'>;
}
