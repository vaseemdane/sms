import base64
import binascii
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import String, TypeDecorator

from app.core.config import settings

# Argon2id password context
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__type="ID",
    argon2__time_cost=2,
    argon2__memory_cost=65536,
    argon2__parallelism=2,
)


def _get_aes_key() -> bytes:
    key_hex = settings.FIELD_ENCRYPTION_KEY
    try:
        key_bytes = bytes.fromhex(key_hex)
        if len(key_bytes) == 32:
            return key_bytes
    except ValueError:
        pass
    # Fallback derive deterministic 32-byte key via SHA256
    return hashlib.sha256(key_hex.encode("utf-8")).digest()


class EncryptedString(TypeDecorator):
    """
    SQLAlchemy TypeDecorator providing transparent AES-256-GCM field-level encryption.
    Stores nonce (12 bytes) + ciphertext + tag (16 bytes) encoded as base64 in VARCHAR/TEXT.
    """
    impl = String
    cache_ok = True

    def process_bind_param(self, value: Optional[str], dialect) -> Optional[str]:
        if value is None:
            return None
        key = _get_aes_key()
        aesgcm = AESGCM(key)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, value.encode("utf-8"), None)
        encrypted_payload = nonce + ciphertext
        return base64.b64encode(encrypted_payload).decode("ascii")

    def process_result_value(self, value: Optional[str], dialect) -> Optional[str]:
        if value is None:
            return None
        try:
            raw = base64.b64decode(value.encode("ascii"))
            if len(raw) < 28:  # 12 nonce + 16 auth tag
                return value
            nonce = raw[:12]
            ciphertext = raw[12:]
            key = _get_aes_key()
            aesgcm = AESGCM(key)
            decrypted = aesgcm.decrypt(nonce, ciphertext, None)
            return decrypted.decode("utf-8")
        except Exception:
            # Return raw if legacy unencrypted or decryption failure
            return value


def generate_blind_index(value: Optional[str]) -> Optional[str]:
    """
    Computes a deterministic HMAC-SHA256 blind-index hash for fast indexed lookups
    without exposing plaintext PII in database columns.
    """
    if not value:
        return None
    normalized = value.strip().lower()
    return hmac.new(
        settings.BLIND_INDEX_SALT.encode("utf-8"),
        normalized.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored Argon2 hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hashes a plaintext password using Argon2id."""
    return pwd_context.hash(password)


class AccessTokenResult(tuple):
    def __new__(cls, token_str: str, jti: str, expire: datetime):
        return super().__new__(cls, (token_str, jti, expire))

    def __str__(self) -> str:
        return self[0]

    @property
    def token(self) -> str:
        return self[0]


def create_access_token(
    subject: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
    school_id: Optional[str] = None,
    **kwargs: Any,
) -> AccessTokenResult:
    """
    Creates a signed JWT access token.
    Returns: (token_str, jti, expire_datetime)
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    jti = secrets.token_hex(16)
    to_encode = {
        "sub": subject,
        "role": role,
        "exp": expire,
        "iat": now,
        "jti": jti,
        "type": "access",
    }
    if school_id:
        to_encode["school_id"] = school_id
    if extra_claims:
        to_encode.update(extra_claims)
    if kwargs:
        to_encode.update(kwargs)

    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return AccessTokenResult(encoded_jwt, jti, expire)


def generate_family_id() -> str:
    """Generates a token family identifier for refresh token rotation tracking."""
    return f"fam_{secrets.token_hex(16)}"


def create_refresh_token(
    user_id: str,
    remember_me: bool = False,
) -> Tuple[str, str, datetime]:
    """
    Creates a cryptographically secure random refresh token.
    Returns: (raw_token, token_hash, expire_datetime)
    """
    raw_token = f"rft_{secrets.token_urlsafe(48)}"
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    days = settings.REFRESH_TOKEN_REMEMBER_DAYS if remember_me else settings.REFRESH_TOKEN_EXPIRE_DAYS
    expire = datetime.now(timezone.utc) + timedelta(days=days)
    return raw_token, token_hash, expire


def hash_refresh_token(raw_token: str) -> str:
    """Computes SHA-256 hash of refresh token for DB lookup."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates JWT access token signature and expiration."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None
