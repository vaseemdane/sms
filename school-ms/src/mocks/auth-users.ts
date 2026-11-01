import { User, UserRole } from "../types";

export interface MockAuthAccount {
  user: User;
  passwordHash: string;
  rawPasswordDevOnly: string;
}

// All dummy / test user accounts purged for clean production-ready provisioning
export const MOCK_AUTH_ACCOUNTS: MockAuthAccount[] = [];
