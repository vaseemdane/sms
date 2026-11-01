import pytest
from app.core.auth_utils import generate_teacher_password, normalize_dob_ddmmyyyy


class TestTeacherPasswordGeneration:
    def test_single_word_names(self):
        assert generate_teacher_password("Sakshi") == "Sakshi@Teacher"
        assert generate_teacher_password("sakshi") == "Sakshi@Teacher"
        assert generate_teacher_password("Vaseem") == "Vaseem@Teacher"
        assert generate_teacher_password("vaseem") == "Vaseem@Teacher"

    def test_multi_word_names(self):
        assert generate_teacher_password("Sakshi Kotagi") == "Sakshi@Teacher"
        assert generate_teacher_password("Vaseem Akram") == "Vaseem@Teacher"
        assert generate_teacher_password("Dr. Rajeshwari Hegde") == "Dr@Teacher"
        assert generate_teacher_password("Smt. Gayatri Rao") == "Smt@Teacher"

    def test_special_characters(self):
        assert generate_teacher_password("St. Xavier") == "St@Teacher"
        assert generate_teacher_password("O'Connor") == "Oconnor@Teacher"

    def test_edge_cases(self):
        assert generate_teacher_password("") == "Teacher@Teacher"
        assert generate_teacher_password("   ") == "Teacher@Teacher"
        assert generate_teacher_password("!!! ???") == "Teacher@Teacher"


class TestStudentDobNormalization:
    def test_hyphen_formats(self):
        assert normalize_dob_ddmmyyyy("14-05-2010") == "14052010"
        assert normalize_dob_ddmmyyyy("2010-05-14") == "14052010"

    def test_slash_formats(self):
        assert normalize_dob_ddmmyyyy("14/05/2010") == "14052010"
        assert normalize_dob_ddmmyyyy("2010/05/14") == "14052010"

    def test_direct_digits(self):
        assert normalize_dob_ddmmyyyy("14052010") == "14052010"
