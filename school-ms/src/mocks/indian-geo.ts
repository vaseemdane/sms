import { INDIA_STATES_AND_DISTRICTS } from "@/constants/india-geo";

export interface IndianState {
  code: string;
  name: string;
  type: "state" | "union_territory";
}

export interface IndianDistrict {
  id: string;
  stateCode: string;
  name: string;
}

const UT_NAMES = new Set([
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
]);

export const INDIAN_STATES: IndianState[] = Object.keys(INDIA_STATES_AND_DISTRICTS).map((name) => ({
  code: name,
  name: name,
  type: UT_NAMES.has(name) ? "union_territory" : "state",
}));

export const INDIAN_DISTRICTS: Record<string, IndianDistrict[]> = Object.entries(
  INDIA_STATES_AND_DISTRICTS
).reduce((acc, [stateName, distList]) => {
  acc[stateName] = distList.map((dName, idx) => ({
    id: `${stateName}-${idx}`,
    stateCode: stateName,
    name: dName,
  }));
  return acc;
}, {} as Record<string, IndianDistrict[]>);
