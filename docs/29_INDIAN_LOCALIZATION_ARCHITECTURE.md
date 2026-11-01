# Indian School Localization & Country-Agnostic Transformation Architecture

## 1. Domain Transformation & Context

The legacy reference codebase (`lav_sms-master`) was designed around Nigerian institutional conventions (e.g. Nigerian States, Local Government Areas [LGAs], WAEC/NECO certifications, JSS/SSS secondary school models, Nigerian Naira currency [₦/NGN], and +234 dialing).

The modern rebuild replaces all Nigerian-specific structures with a **native Indian school localization layer** while isolating core school management capabilities from regional data through a country-agnostic design.

---

## 2. Terminology & Conceptual Mapping

| Domain / Concept | Legacy Nigerian Reference | Modern Indian School Equivalent | Architectural Treatment |
|---|---|---|---|
| **Country** | Nigeria (Fixed default) | **India** (Default, ISO: `IN`, Code: `356`) | Normalized in `countries` table with multi-country readiness |
| **First-Level Division** | Nigerian States (36 + FCT) | **States & Union Territories** (28 States + 8 UTs) | Master-data table `states_uts` |
| **Second-Level Division** | Local Government Areas (`lgas`) | **Districts** (e.g. Dakshina Kannada, Udupi, Bengaluru Urban) | Master-data table `districts` (foreign key to `state_id`) |
| **Third-Level Locality** | Implicit/Town | **City / Town / Village / Locality** (Dual Urban/Rural support) | Master-data table `localities` with `type` enum |
| **Postal Code** | Postal Code / N/A | **PIN Code** (6-digit format: e.g. `576101`, `560001`) | Strict regex validation (`^[1-9][0-9]{5}$`) |
| **Phone Number** | +234 prefix / 11 digits | **+91 prefix / 10-digit mobile** (`^[6-9][0-9]{9}$`) | E.164 structured storage: `country_code` (+91) + `phone_number` |
| **Currency** | Nigerian Naira (₦, NGN) | **Indian Rupee (₹, INR)** | Centralized formatting: Indian numbering system (Lakhs/Crores: `₹1,50,000`) |
| **Timezone** | Africa/Lagos (UTC+1) | **Asia/Kolkata (IST: UTC+05:30)** | ISO-8601 UTC storage in DB; localized display in IST |
| **Academic Boards** | WAEC / NECO / BECE | **CBSE, CISCE / ICSE, State Boards, IB, Cambridge** | Configurable `boards` entity in institution settings |
| **Educational Stages** | Creche, Nursery, Primary, JSS, SSS | **Foundational, Preparatory, Middle, Secondary (NEP 5+3+3+4)** or **Pre-Primary, Primary, Middle, Secondary, Senior Secondary (1-12)** | Configurable `class_stages` |
| **Academic Terminology** | Sessions (e.g. '2018-2019') | **Academic Year** (e.g. '2026-2027', April-to-March / June-to-May) | Configurable start/end months in school settings |
| **Terms / Semesters** | Terms 1, 2, 3 | **Terms (Term 1 / Term 2) or Semesters or Annual / Periodic Assessments** | Dynamic assessment term configuration |
| **Fee Structure** | Term fees in Naira | **Tuition, Transport, Term, Lab, Admission Fees in INR** | Configurable fee components with Indian receipting standards |

---

## 3. Geographic Data Architecture

### 3.1 Relational Master Data Hierarchy

```
[countries] (code='IN', name='India', currency='INR', symbol='₹', phone_code='+91')
    │
    └── (1:N)
[states_uts] (e.g., Karnataka, Maharashtra, Delhi, Tamil Nadu)
    │
    └── (1:N)
[districts] (e.g., Udupi, Bengaluru Urban, Mumbai, Pune, Chennai)
    │
    └── (1:N)
[localities] (e.g., Manipal [Town/City], Brahmavara [Village/Panchayat])
```

### 3.2 Normalized Address Schema
All entities requiring an address (Institutions, Students, Staff, Guardians, Hostels) consume the normalized address structure:

```typescript
export interface IndianAddress {
  addressLine1: string;       // House/Flat/Door No., Building, Street
  addressLine2?: string;      // Cross, Road, Sub-locality
  landmark?: string;          // Prominent nearby landmark
  localityType: 'city' | 'town' | 'village' | 'area';
  localityName: string;       // e.g., 'Brahmavara' or 'Koramangala'
  districtId: string;         // Foreign key to districts table
  stateId: string;            // Foreign key to states_uts table
  countryId: string;          // Default 'IN'
  pinCode: string;            // 6-digit Indian PIN (^[1-9][0-9]{5}$)
}
```

---

## 4. Academic Structure & National Education Policy (NEP 2020) Compatibility

The modern system replaces hardcoded Nigerian class codes (`JSS`, `SSS`) with a flexible institutional configuration engine supporting Indian school models:

1. **Board Affiliation**:
   - Central Board of Secondary Education (CBSE)
   - Council for the Indian School Certificate Examinations (CISCE / ICSE / ISC)
   - State Examination Boards (e.g. Karnataka KSEAB, Maharashtra State Board, Tamil Nadu State Board)
   - International Boards (IB, Cambridge IGCSE)

2. **Stage Structure (Configurable)**:
   - **Foundational Stage**: Nursery, LKG, UKG, Class 1, Class 2 (Ages 3-8)
   - **Preparatory Stage**: Class 3, Class 4, Class 5 (Ages 8-11)
   - **Middle Stage**: Class 6, Class 7, Class 8 (Ages 11-14)
   - **Secondary & Senior Secondary**: Class 9, Class 10, Class 11, Class 12 (Ages 14-18)
   - Streams in Classes 11 & 12: Science (PCMB/PCMC), Commerce, Humanities / Arts

3. **Assessment & Grading**:
   - Periodic Assessments (PA 1, PA 2, Mid-Term / Half-Yearly, Final / Annual Examination).
   - Co-Scholastic & Life Skills (Discipline, Work Education, Art Education, Health & Physical Education).
   - CBSE 8-Point / 9-Point Grading Scales (A1, A2, B1, B2, C1, C2, D, E1, E2) and State Board percentages.

---

## 5. UI/UX Design System: Warm Beige, Lavender & Glassmorphism

Per user specifications, the interface avoids stereotypical themes and delivers an **Apple-level premium SaaS aesthetic**:

- **Color Palette**:
  - `Background`: Warm Beige (`#FDFBF7` / `#F8F5EE`) and Pure Crisp White (`#FFFFFF`).
  - `Primary / Accents`: Soft Lavender (`#8B5CF6`, `#A78BFA`), Deep Royal Violet (`#4C1D95`).
  - `Neutral / Borders`: Warm Sandstone (`#E7E2D7`), Muted Slate (`#64748B`), Charcoal (`#1E293B`).
  - `Glass Elements`: Subtle backdrop-blur (`backdrop-blur-md bg-white/75 border border-white/40 shadow-sm`).
- **Tone & Atmosphere**: Spacious, airy, trustworthy, elegant, zero visual clutter, no dark/black sidebars, no neon gradients.

---

## 6. Comprehensive Review of All Forms & Reports

All forms identified in the reverse engineering inventory will be transformed:

1. **Student Admission Wizard**:
   - Replaces Nigerian state/LGA dropdowns with dynamic State -> District -> Locality cascading picker.
   - Enforces 6-digit Indian PIN Code validation.
   - Captures Indian guardian contacts with structured `+91` format.
   - Adds optional fields for Aadhaar Number (masked/tokenized) and Mother Tongue.
2. **Staff / Teacher Registration**:
   - Replaces Nigerian employment code with Indian institutional employee ID.
   - Address fields consume the Indian location hierarchy.
3. **Cashier Billing & Fee Receipts**:
   - All amounts rendered in Indian Rupees (`₹`) using Indian numbering formatting (`₹1,25,000.00`).
   - Receipts feature school affiliation number (e.g. CBSE Affiliation No.), School Code, UDISE+ code if applicable, and Indian address.
4. **Report Cards / Marksheets**:
   - Terminal marksheet displays Indian board format, student Roll No., CBSE/State registration number, scholastic subjects, co-scholastic grades, and attendance days.
