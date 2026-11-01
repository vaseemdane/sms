"""enterprise_production_hardening

Revision ID: c92f1b40de3a
Revises: 8f10e42f9b1c
Create Date: 2026-10-24 16:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c92f1b40de3a'
down_revision: Union[str, Sequence[str], None] = '8f10e42f9b1c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable Required PostgreSQL Extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
    op.execute("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";")
    op.execute("CREATE EXTENSION IF NOT EXISTS \"btree_gist\";")

    # 2. Add family_id and replaced_by_id to refresh_tokens
    op.add_column('refresh_tokens', sa.Column('family_id', sa.String(length=64), server_default='legacy_fam', nullable=False))
    op.add_column('refresh_tokens', sa.Column('replaced_by_id', sa.String(length=64), nullable=True))
    op.create_index('idx_refresh_token_family', 'refresh_tokens', ['family_id'])

    # 3. Add blind index hashes to users and student_profiles
    op.add_column('users', sa.Column('phone_hash', sa.String(length=64), nullable=True))
    op.create_index('idx_user_phone_hash', 'users', ['phone_hash'])

    op.add_column('student_profiles', sa.Column('sats_id_hash', sa.String(length=64), nullable=True))
    op.add_column('student_profiles', sa.Column('caste_category', sa.String(length=128), nullable=True))
    op.create_index('idx_student_sats_id_hash', 'student_profiles', ['sats_id_hash'], unique=True)

    # 4. Partial index on single active academic year
    op.execute("DROP INDEX IF EXISTS uq_single_active_academic_year;")
    op.create_index(
        'uq_single_active_academic_year',
        'academic_years',
        ['is_current'],
        unique=True,
        postgresql_where=sa.text('is_current = true'),
    )

    # 5. Teacher Exclusivity partial index
    op.execute("DROP INDEX IF EXISTS uq_section_class_teacher_per_year;")
    op.create_index(
        'uq_section_class_teacher_per_year',
        'teacher_assignments',
        ['academic_year_id', 'section_id'],
        unique=True,
        postgresql_where=sa.text("assignment_type = 'CLASS_TEACHER'"),
    )

    # 6. High-concurrency composite indexes
    op.create_index(
        'idx_enrollment_active_lookup',
        'student_enrollments',
        ['academic_year_id', 'class_id', 'section_id'],
        postgresql_where=sa.text("status = 'ACTIVE'"),
    )

    op.execute("DROP INDEX IF EXISTS idx_attendance_section_date_status;")
    op.create_index(
        'idx_attendance_section_date_status',
        'attendance_records',
        ['section_id', 'date', 'status'],
    )

    op.create_index(
        'idx_exam_student_covering',
        'exam_marks',
        ['exam_id', 'student_id'],
    )

    op.create_index(
        'idx_exam_subject_status',
        'exam_marks',
        ['exam_id', 'subject_id', 'status'],
    )

    # Add academic_year_id to fee_payments before indexing
    op.add_column('fee_payments', sa.Column('academic_year_id', sa.String(length=32), nullable=True))
    op.create_foreign_key('fk_fee_payments_academic_year', 'fee_payments', 'academic_years', ['academic_year_id'], ['id'], ondelete='RESTRICT')

    op.create_index(
        'idx_fee_payment_student_year_created',
        'fee_payments',
        ['student_id', 'academic_year_id', 'created_at'],
    )

    # 7. Timetable Anti-Collision Indexes
    op.create_index(
        'idx_slot_teacher_collision',
        'timetable_slots',
        ['teacher_id', 'day_of_week', 'start_time', 'end_time'],
    )
    op.create_index(
        'idx_slot_room_collision',
        'timetable_slots',
        ['room', 'day_of_week', 'start_time', 'end_time'],
    )

    # 8. Receipt Sequence Counter Table
    op.create_table(
        'receipt_sequences',
        sa.Column('id', sa.String(length=32), nullable=False),
        sa.Column('year', sa.String(length=16), nullable=False),
        sa.Column('last_sequence', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('year')
    )

    # 9. Scratch Cards Table
    op.create_table(
        'scratch_cards',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('code', sa.String(length=64), nullable=False),
        sa.Column('used', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('times_used', sa.Integer(), server_default='0', nullable=False),
        sa.Column('user_id', sa.String(length=64), nullable=True),
        sa.Column('student_id', sa.String(length=64), nullable=True),
        sa.Column('user_type', sa.String(length=32), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['student_id'], ['student_profiles.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )


def downgrade() -> None:
    op.drop_table('scratch_cards')
    op.drop_table('receipt_sequences')
    op.drop_index('idx_slot_room_collision', table_name='timetable_slots')
    op.drop_index('idx_slot_teacher_collision', table_name='timetable_slots')
    op.drop_index('idx_fee_payment_student_year_created', table_name='fee_payments')
    op.drop_constraint('fk_fee_payments_academic_year', 'fee_payments', type_='foreignkey')
    op.drop_column('fee_payments', 'academic_year_id')
    op.drop_index('idx_exam_subject_status', table_name='exam_marks')
    op.drop_index('idx_exam_student_covering', table_name='exam_marks')
    op.drop_index('idx_attendance_section_date_status', table_name='attendance_records')
    op.drop_index('idx_enrollment_active_lookup', table_name='student_enrollments')
    op.drop_index('uq_section_class_teacher_per_year', table_name='teacher_assignments')
    op.drop_index('uq_single_active_academic_year', table_name='academic_years')
    op.drop_index('idx_student_sats_id_hash', table_name='student_profiles')
    op.drop_column('student_profiles', 'caste_category')
    op.drop_column('student_profiles', 'sats_id_hash')
    op.drop_index('idx_user_phone_hash', table_name='users')
    op.drop_column('users', 'phone_hash')
    op.drop_index('idx_refresh_token_family', table_name='refresh_tokens')
    op.drop_column('refresh_tokens', 'replaced_by_id')
    op.drop_column('refresh_tokens', 'family_id')
