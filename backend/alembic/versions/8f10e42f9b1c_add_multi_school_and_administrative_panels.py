"""add_multi_school_and_administrative_panels

Revision ID: 8f10e42f9b1c
Revises: 4503c5ba395d
Create Date: 2026-10-24 15:51:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f10e42f9b1c'
down_revision: Union[str, Sequence[str], None] = '4503c5ba395d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Schools table
    op.create_table(
        'schools',
        sa.Column('id', sa.String(length=32), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('code', sa.String(length=32), nullable=False),
        sa.Column('affiliation_no', sa.String(length=64), nullable=True),
        sa.Column('board', sa.String(length=32), nullable=False),
        sa.Column('phone', sa.String(length=32), nullable=True),
        sa.Column('email', sa.String(length=128), nullable=True),
        sa.Column('address', sa.String(length=255), nullable=True),
        sa.Column('city', sa.String(length=64), nullable=True),
        sa.Column('state', sa.String(length=64), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )

    # 2. Add status to timetables
    op.add_column('timetables', sa.Column('status', sa.String(length=16), server_default='DRAFT', nullable=False))

    # 3. Expense Categories
    op.create_table(
        'expense_categories',
        sa.Column('id', sa.String(length=32), nullable=False),
        sa.Column('name', sa.String(length=64), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # 4. Vendors
    op.create_table(
        'vendors',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('contact_person', sa.String(length=64), nullable=True),
        sa.Column('phone', sa.String(length=32), nullable=False),
        sa.Column('email', sa.String(length=128), nullable=True),
        sa.Column('category', sa.String(length=64), nullable=False),
        sa.Column('gst_number', sa.String(length=32), nullable=True),
        sa.Column('address', sa.String(length=255), nullable=True),
        sa.Column('outstanding_balance', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # 5. Expenses
    op.create_table(
        'expenses',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('school_id', sa.String(length=32), nullable=True),
        sa.Column('category_id', sa.String(length=32), nullable=False),
        sa.Column('title', sa.String(length=128), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('expense_date', sa.String(length=16), nullable=False),
        sa.Column('payment_method', sa.String(length=32), nullable=False),
        sa.Column('vendor_id', sa.String(length=64), nullable=True),
        sa.Column('vendor_name', sa.String(length=128), nullable=True),
        sa.Column('reference_no', sa.String(length=64), nullable=True),
        sa.Column('supporting_doc', sa.String(length=255), nullable=True),
        sa.Column('recorded_by_user_id', sa.String(length=64), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['expense_categories.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['recorded_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # 6. Staff Profiles
    op.create_table(
        'staff_profiles',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('employee_id', sa.String(length=32), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('role_category', sa.String(length=64), nullable=False),
        sa.Column('designation', sa.String(length=64), nullable=False),
        sa.Column('phone', sa.String(length=32), nullable=False),
        sa.Column('email', sa.String(length=128), nullable=True),
        sa.Column('department', sa.String(length=64), nullable=False),
        sa.Column('monthly_salary', sa.Float(), nullable=False),
        sa.Column('joining_date', sa.String(length=16), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('employee_id')
    )

    # 7. Payroll Records
    op.create_table(
        'payroll_records',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('staff_id', sa.String(length=64), nullable=False),
        sa.Column('payroll_month', sa.String(length=16), nullable=False),
        sa.Column('basic_salary', sa.Float(), nullable=False),
        sa.Column('allowances', sa.Float(), nullable=False),
        sa.Column('deductions', sa.Float(), nullable=False),
        sa.Column('net_salary', sa.Float(), nullable=False),
        sa.Column('payment_status', sa.String(length=16), nullable=False),
        sa.Column('paid_date', sa.String(length=16), nullable=True),
        sa.Column('payment_method', sa.String(length=32), nullable=False),
        sa.Column('transaction_ref', sa.String(length=64), nullable=True),
        sa.Column('processed_by_user_id', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['processed_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['staff_id'], ['staff_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 8. Assets and Inventory
    op.create_table(
        'school_assets',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('asset_code', sa.String(length=32), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('category', sa.String(length=64), nullable=False),
        sa.Column('location', sa.String(length=64), nullable=False),
        sa.Column('purchase_date', sa.String(length=16), nullable=False),
        sa.Column('cost', sa.Float(), nullable=False),
        sa.Column('condition', sa.String(length=32), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('asset_code')
    )

    op.create_table(
        'inventory_items',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('item_code', sa.String(length=32), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('category', sa.String(length=64), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('reorder_level', sa.Integer(), nullable=False),
        sa.Column('unit', sa.String(length=32), nullable=False),
        sa.Column('unit_cost', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('item_code')
    )


def downgrade() -> None:
    op.drop_table('inventory_items')
    op.drop_table('school_assets')
    op.drop_table('payroll_records')
    op.drop_table('staff_profiles')
    op.drop_table('expenses')
    op.drop_table('vendors')
    op.drop_table('expense_categories')
    op.drop_column('timetables', 'status')
    op.drop_table('schools')
