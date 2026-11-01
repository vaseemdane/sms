import { User, StudentRecord, Dorm } from "@/types";

export const MOCK_USERS: User[] = [
  {
    id: "usr-superadmin",
    name: "zuha",
    email: "admin@school.com",
    username: "admin",
    userType: "super_admin",
    phone: "+91 9902304896",
    code: "EDP/SA/001",
    gender: "male",
    bloodGroup: "O+",
    state: "Karnataka",
    district: "Bengaluru Urban",
    address: "Vidhana Soudha Road, Bengaluru",
    createdAt: new Date().toISOString(),
  },
];

export const MOCK_DORMS: Dorm[] = [];
export const MOCK_STUDENTS: StudentRecord[] = [];
