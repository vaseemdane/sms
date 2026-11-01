"""add_school_id_to_users

Revision ID: e1a8b92c4f10
Revises: c92f1b40de3a
Create Date: 2026-10-24 19:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e1a8b92c4f10'
down_revision: Union[str, Sequence[str], None] = 'c92f1b40de3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('school_id', sa.String(length=32), nullable=True))
    op.create_foreign_key('fk_users_school_id', 'users', 'schools', ['school_id'], ['id'], ondelete='SET NULL')
    op.create_index('idx_users_school_id', 'users', ['school_id'])


def downgrade() -> None:
    op.drop_index('idx_users_school_id', table_name='users')
    op.drop_constraint('fk_users_school_id', 'users', type_='foreignkey')
    op.drop_column('users', 'school_id')
