import re
import secrets
import string
from typing import Optional


def generate_secure_random_password(length: int = 12) -> str:
    """
    Generates a cryptographically secure high-entropy random password.
    Contains uppercase, lowercase, digits, and special characters.
    """
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    while True:
        password = "".join(secrets.choice(alphabet) for _ in range(length))
        if (
            any(c.islower() for c in password)
            and any(c.isupper() for c in password)
            and any(c.isdigit() for c in password)
            and any(c in "!@#$%^&*" for c in password)
        ):
            return password


def generate_teacher_password(teacher_name: str) -> str:
    """
    Generate teacher initial password following the formula:
    Extract the teacher's first name, strip non-alphanumeric chars,
    capitalize first letter, and format: <FirstName>@Teacher
    
    Example:
    'sakshi' -> 'Sakshi@Teacher'
    'Sakshi Kotagi' -> 'Sakshi@Teacher'
    'vaseem' -> 'Vaseem@Teacher'
    """
    if not teacher_name or not str(teacher_name).strip():
        return "Teacher@Teacher"

    first_word = str(teacher_name).strip().split()[0]
    clean_first = re.sub(r"[^a-zA-Z0-9]", "", first_word).capitalize()
    if not clean_first:
        clean_first = "Teacher"
    return f"{clean_first}@Teacher"


def normalize_dob_ddmmyyyy(raw_dob: str) -> str:
    """
    Normalizes DOB string to strict DDMMYYYY format.
    Handles:
    - DD-MM-YYYY (e.g. '14-05-2010' -> '14052010')
    - YYYY-MM-DD (e.g. '2010-05-14' -> '14052010')
    - DD/MM/YYYY (e.g. '14/05/2010' -> '14052010')
    - DDMMYYYY   (e.g. '14052010'   -> '14052010')
    """
    if not raw_dob:
        return ""
    cleaned = str(raw_dob).strip()
    digits = re.sub(r"\D", "", cleaned)
    if len(digits) == 8:
        # Check if YYYYMMDD format
        if (digits.startswith("19") or digits.startswith("20")) and int(digits[4:6]) <= 12 and int(digits[6:8]) <= 31:
            return f"{digits[6:8]}{digits[4:6]}{digits[0:4]}"
        return digits
    return cleaned
