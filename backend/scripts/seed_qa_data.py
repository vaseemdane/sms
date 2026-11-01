"""
QA Data Seeder for EduPulse SMS local testing.
Uses public REST API endpoints with Super Admin credentials.
Tag: BATCH_QA_2026
"""

import urllib.request
import urllib.error
import json
import datetime
import random
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"
BATCH_TAG = "BATCH_QA_2026"

KARNATAKA_DISTRICTS = [
    "Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Belagavi",
    "Hubballi-Dharwad", "Mangaluru", "Kalaburagi", "Shivamogga",
    "Ballari", "Udupi", "Tumakuru", "Mandya", "Hassan"
]

FIRST_NAMES_MALE = [
    "Aarav", "Aditya", "Basavaraj", "Chetan", "Darshan", "Ganesh", "Kiran", "Manoj",
    "Naveen", "Prajwal", "Rahul", "Rohan", "Siddharth", "Suresh", "Varun", "Vijay"
]
FIRST_NAMES_FEMALE = [
    "Ananya", "Bhavya", "Chaitra", "Deepa", "Divya", "Kavya", "Megha", "Pooja",
    "Priyanka", "Radha", "Sahana", "Shreya", "Sneha", "Spandana", "Swathi", "Vidya"
]
LAST_NAMES = [
    "Gowda", "Patil", "Shetty", "Rao", "Hegde", "Kulkarni", "Desai", "Bhat",
    "Nayak", "Joshi", "Hiremath", "Angadi", "Pujari", "Biradar", "Hombale", "Reddy"
]

SUBJECTS_LIST = [
    "Kannada",
    "Hindi",
    "English",
    "Mathematics",
    "Science",
    "Social Science"
]

CLASSES = [
    ("cls-nursery", "Nursery", 2022, ["sec-nurserya", "sec-nurseryb"]),
    ("cls-lkg", "LKG", 2021, ["sec-lkga", "sec-lkgb"]),
    ("cls-ukg", "UKG", 2020, ["sec-ukga", "sec-ukgb"]),
    ("cls-class1", "Class 1", 2019, ["sec-1a", "sec-1b"]),
    ("cls-class2", "Class 2", 2018, ["sec-2a", "sec-2b"]),
    ("cls-class3", "Class 3", 2017, ["sec-3a", "sec-3b"]),
    ("cls-class4", "Class 4", 2016, ["sec-4a", "sec-4b"]),
    ("cls-class5", "Class 5", 2015, ["sec-5a", "sec-5b"]),
    ("cls-class6", "Class 6", 2014, ["sec-6a", "sec-6b"]),
    ("cls-class7", "Class 7", 2013, ["sec-7a", "sec-7b"]),
    ("cls-class8", "Class 8", 2012, ["sec-8a", "sec-8b"]),
    ("cls-class9", "Class 9", 2011, ["sec-9a", "sec-9b"]),
    ("cls-class10", "Class 10", 2010, ["sec-10a", "sec-10b"]),
]

TEACHER_PROFILES = [
    ("Kannada", "Basavaraj Patil", "Belagavi"),
    ("Kannada", "Channamma Desai", "Hubballi-Dharwad"),
    ("Kannada", "Rajeshwari Hiremath", "Kalaburagi"),
    ("Hindi", "Fatima Begum", "Bengaluru Urban"),
    ("Hindi", "Omkar Hombale", "Shivamogga"),
    ("Hindi", "Pooja Sharma", "Ballari"),
    ("English", "Anand Gowda", "Bengaluru Urban"),
    ("English", "Deepa Kulkarni", "Mysuru"),
    ("English", "Kavitha Rao", "Mangaluru"),
    ("Mathematics", "Eashwar Hegde", "Udupi"),
    ("Mathematics", "Girish Nayak", "Hassan"),
    ("Mathematics", "Nirmala Joshi", "Tumakuru"),
    ("Science", "Indumathi Bhat", "Udupi"),
    ("Science", "Jagadeesh Shettar", "Hubballi-Dharwad"),
    ("Science", "Pradeep Shetty", "Mangaluru"),
    ("Social Science", "Hanumanthappa Biradar", "Vijayapura"),
    ("Social Science", "Lakshman Pujari", "Mandya"),
    ("Social Science", "Suresh Angadi", "Belagavi"),
]


def api_request(url, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            res_body = resp.read().decode("utf-8")
            return json.loads(res_body) if res_body else None
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        try:
            return json.loads(err_msg)
        except Exception:
            return {"error": err_msg, "status": e.code}
    except Exception as e:
        return {"error": str(e), "status": 500}


def get_super_admin_token():
    print("1. Authenticating as Super Admin...")
    res = api_request(
        f"{BASE_URL}/auth/login",
        method="POST",
        data={"identifier": "admin", "password": "SuperAdmin@123"}
    )
    if not res or not res.get("success"):
        print("Login failed:", res)
        sys.exit(1)
    token = res["data"]["token"]
    print("   Super Admin token acquired successfully.")
    return token


def seed_subjects(token):
    print("\n2. Seeding 6 Subjects across all academic classes...")
    created_subjects = {}  # (class_id, sub_name) -> sub_id
    for cls_id, cls_name, _, _ in CLASSES:
        created_subjects[cls_id] = {}
        for sub_name in SUBJECTS_LIST:
            slug = sub_name.lower().replace(" ", "-")
            code = f"{slug[:4].upper()}-{cls_name.replace(' ', '')}"
            res = api_request(
                f"{BASE_URL}/academics/subjects",
                method="POST",
                token=token,
                data={
                    "classId": cls_id,
                    "name": sub_name,
                    "slug": slug,
                    "code": code,
                    "isCore": True,
                }
            )
            if res and res.get("success"):
                sub_id = res["data"]["id"]
                created_subjects[cls_id][sub_name] = sub_id
            else:
                print(f"   Warning on subject {sub_name} for {cls_id}:", res)
    print("   Total subjects configured across 13 classes.")
    return created_subjects


def seed_teachers(token):
    print("\n3. Seeding 18 unallocated Teachers (3 per subject)...")
    teachers = []
    for idx, (subject, name, district) in enumerate(TEACHER_PROFILES, start=1):
        clean_name = name.lower().replace(" ", ".")
        email = f"qa.teacher.{idx}.{clean_name}@testschool.com"
        username = f"qa_tch_{idx}"
        phone = f"98000000{idx:02d}"
        
        # Check district validity
        valid_district = district if district in KARNATAKA_DISTRICTS else "Bengaluru Urban"

        res = api_request(
            f"{BASE_URL}/admin/users/teacher",
            method="POST",
            token=token,
            data={
                "school_id": "sch-main",
                "name": f"{name} [TEST]",
                "email": email,
                "username": username,
                "phone": phone,
                "specialization": subject,
                "state": "Karnataka",
                "district": valid_district,
            }
        )
        if res and res.get("success"):
            teachers.append(res["data"])
        elif res and res.get("error", {}).get("code") == "HTTP_409":
            # Already exists
            print(f"   Teacher {name} already exists.")
        else:
            print(f"   Failed to create teacher {name}:", res)
    print(f"   Created/verified {len(teachers)} unallocated teachers.")
    return teachers


def seed_students(token):
    print("\n4. Seeding 260 Students (10 per section across 26 sections)...")
    students_by_section = {}  # sec_id -> list of student records
    student_counter = 1

    for cls_id, cls_name, birth_year, section_ids in CLASSES:
        for sec_id in section_ids:
            students_by_section[sec_id] = []
            for s_idx in range(1, 11):
                is_female = (s_idx % 2 == 0)
                fname = FIRST_NAMES_FEMALE[s_idx % len(FIRST_NAMES_FEMALE)] if is_female else FIRST_NAMES_MALE[s_idx % len(FIRST_NAMES_MALE)]
                lname = LAST_NAMES[(student_counter + s_idx) % len(LAST_NAMES)]
                full_name = f"{fname} {lname} [TEST]"
                
                # Age appropriate DOB
                dob_month = (s_idx % 12) + 1
                dob_day = (s_idx * 2) % 28 + 1
                dob = f"{birth_year}-{dob_month:02d}-{dob_day:02d}"

                mobile = f"981000{student_counter:04d}"
                # Shared parent phone every 5th student to test sibling links
                parent_mobile = f"98200000{(student_counter // 5) + 1:02d}"
                parent_name = f"Guardian of {fname} {lname}"

                is_hostel = (s_idx % 4 == 0)
                dorm_id = ("hb-girls" if is_female else "hb-boys") if is_hostel else "none"
                dorm_room = f"R-{100 + (s_idx % 10)}" if is_hostel else None

                res = api_request(
                    f"{BASE_URL}/admin/users/student",
                    method="POST",
                    token=token,
                    data={
                        "school_id": "sch-main",
                        "name": full_name,
                        "mobile_number": mobile,
                        "date_of_birth": dob,
                        "email": f"student.{mobile}@mps-ka.edu.in",
                        "gender": "female" if is_female else "male",
                        "academic_year_id": "ay-2026-2027",
                        "class_id": cls_id,
                        "section_id": sec_id,
                        "admission_number": f"MPS/QA/2026/{student_counter:04d}",
                        "state": "Karnataka",
                        "district": KARNATAKA_DISTRICTS[student_counter % len(KARNATAKA_DISTRICTS)],
                        "address": f"#{student_counter}, Ward {s_idx}, {BATCH_TAG}",
                        "parent_name": parent_name,
                        "parent_phone": parent_mobile,
                        "dorm_id": dorm_id,
                        "dorm_room_no": dorm_room,
                    }
                )
                if res and res.get("success"):
                    students_by_section[sec_id].append(res["data"])
                elif res and res.get("error", {}).get("code") == "HTTP_409":
                    pass
                else:
                    print(f"   Failed student {full_name}:", res)

                student_counter += 1

            # Recalculate roll numbers for section
            roll_res = api_request(
                f"{BASE_URL}/academics/sections/{sec_id}/recalculate-roll-numbers",
                method="POST",
                token=token,
                data={"academicYearId": "ay-2026-2027"}
            )
            if not roll_res or not roll_res.get("success"):
                print(f"   Recalculate roll numbers for {sec_id}:", roll_res)

    print(f"   Successfully registered {student_counter - 1} students and re-indexed roll numbers across 26 sections.")
    return students_by_section


def seed_attendance(token, students_by_section):
    print("\n5. Marking 30 days of attendance up to 29 Oct 2026 (~90% Present, 5% Absent, 5% Late)...")
    base_date = datetime.date(2026, 10, 29)
    working_days = []
    curr = base_date
    while len(working_days) < 30:
        if curr.weekday() != 6:  # Skip Sundays
            working_days.append(curr.strftime("%Y-%m-%d"))
        curr -= datetime.timedelta(days=1)
    working_days.sort()

    total_records = 0
    for day_str in working_days:
        for sec_id, st_list in students_by_section.items():
            if not st_list:
                continue
            records = {}
            for s in st_list:
                # 90% Present, 5% Absent, 5% Late
                r_val = random.random()
                if r_val < 0.90:
                    status = "PRESENT"
                elif r_val < 0.95:
                    status = "ABSENT"
                else:
                    status = "LATE"
                records[s["id"]] = status

            res = api_request(
                f"{BASE_URL}/attendance/sections/{sec_id}",
                method="POST",
                token=token,
                data={
                    "sectionId": sec_id,
                    "date": day_str,
                    "records": records,
                }
            )
            if res and res.get("success"):
                total_records += len(records)
    print(f"   Completed marking attendance: {total_records} attendance records over 30 school days.")


def seed_exams_and_marks(token, created_subjects, students_by_section):
    print("\n6. Seeding Exams (Unit Test 1 / Mid-Term) & Marks across Class 1 to 10...")
    # Seed Exam cycles directly via DB session since Admin desk has no exam authoring UI
    import asyncio
    from app.db.session import AsyncSessionLocal
    from sqlalchemy import select
    from app.models.exam import Exam, GradeScale

    async def init_exams():
        async with AsyncSessionLocal() as s:
            ut1 = await s.get(Exam, "ex-ut1")
            if not ut1:
                ut1 = Exam(
                    id="ex-ut1",
                    academic_year_id="ay-2026-2027",
                    name="Unit Test 1 [TEST]",
                    term=1,
                    start_date="2026-08-10",
                    end_date="2026-08-20",
                    is_published=True,
                )
                s.add(ut1)
            mid = await s.get(Exam, "ex-midterm")
            if not mid:
                mid = Exam(
                    id="ex-midterm",
                    academic_year_id="ay-2026-2027",
                    name="Mid-Term Examination [TEST]",
                    term=1,
                    start_date="2026-09-15",
                    end_date="2026-09-30",
                    is_published=True,
                )
                s.add(mid)
            await s.commit()

    asyncio.run(init_exams())
    print("   Exam master cycles initialized (Unit Test 1, Mid-Term).")

    # Enter marks for Class 1 to Class 10 (skip Nursery, LKG, UKG)
    classes_with_marks = [c for c in CLASSES if not c[0].startswith("cls-nursery") and not c[0].startswith("cls-lkg") and not c[0].startswith("cls-ukg")]
    
    total_marks_count = 0
    for exam_id, max_score, test_ratio in [("ex-ut1", 50, 0.4), ("ex-midterm", 100, 0.2)]:
        for cls_id, cls_name, _, sec_ids in classes_with_marks:
            sub_dict = created_subjects.get(cls_id, {})
            for sub_name, sub_id in sub_dict.items():
                for sec_id in sec_ids:
                    st_list = students_by_section.get(sec_id, [])
                    if not st_list:
                        continue
                    marks_payload = []
                    for st in st_list:
                        # 2% absent
                        if random.random() < 0.02:
                            t_score = 0.0
                            e_score = 0.0
                        else:
                            # realistic bell-curve marks
                            pct = min(100.0, max(15.0, random.gauss(68.0, 15.0)))
                            total_student_score = (pct / 100.0) * max_score
                            t_score = round(total_student_score * test_ratio, 1)
                            e_score = round(total_student_score * (1.0 - test_ratio), 1)

                        marks_payload.append({
                            "studentId": st["id"],
                            "testScore": t_score,
                            "examScore": e_score,
                        })

                    res = api_request(
                        f"{BASE_URL}/examinations/marks",
                        method="POST",
                        token=token,
                        data={
                            "examId": exam_id,
                            "sectionId": sec_id,
                            "subjectId": sub_id,
                            "marks": marks_payload,
                        }
                    )
                    if res and res.get("success"):
                        total_marks_count += len(marks_payload)

    print(f"   Completed entering marks: {total_marks_count} individual subject mark entries across Class 1-10.")


def main():
    print("=================================================================")
    print("EduPulse SMS QA Realistic Data Seeder (Local / Dev)")
    print(f"Batch Tag: {BATCH_TAG}")
    print("=================================================================")

    token = get_super_admin_token()
    created_subjects = seed_subjects(token)
    teachers = seed_teachers(token)
    students_by_section = seed_students(token)
    seed_attendance(token, students_by_section)
    seed_exams_and_marks(token, created_subjects, students_by_section)

    print("\n=================================================================")
    print("QA Seeding Completed Successfully!")
    print(f"- 6 Subjects across 13 classes")
    print(f"- {len(teachers)} Unallocated Teachers")
    print(f"- 260 Students enrolled across 26 sections")
    print(f"- 30 Days of attendance recorded (~90% Present)")
    print(f"- 2 Exams (Unit Test 1, Mid-Term) graded for Class 1-10")
    print("=================================================================")


if __name__ == "__main__":
    main()

