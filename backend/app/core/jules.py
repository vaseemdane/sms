import os
from typing import Any, Dict, Optional
import httpx
from app.core.config import settings
from app.core.logging import logger


class JulesClient:
    def __init__(
        self,
        api_key: Optional[str] = None,
        repo: Optional[str] = None,
        branch: Optional[str] = None,
    ):
        self.api_key = api_key or os.getenv("JULES_API_KEY") or settings.JULES_API_KEY
        self.repo = repo or os.getenv("JULES_REPO") or settings.JULES_REPO
        self.branch = branch or os.getenv("JULES_BRANCH") or settings.JULES_BRANCH
        self.api_url = settings.JULES_API_URL

    def _get_headers(self) -> Dict[str, str]:
        if not self.api_key:
            raise ValueError("JULES_API_KEY not configured in environment.")
        return {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
        }

    def _build_payload(self, title: str, prompt: str, branch: Optional[str] = None) -> Dict[str, Any]:
        target_branch = branch or self.branch
        return {
            "title": title,
            "prompt": prompt,
            "sourceContext": {
                "source": f"sources/github/{self.repo}",
                "githubRepoContext": {
                    "startingBranch": target_branch,
                },
            },
        }

    async def create_session_async(
        self,
        title: str,
        prompt: str,
        branch: Optional[str] = None,
    ) -> Dict[str, Any]:
        headers = self._get_headers()
        payload = self._build_payload(title=title, prompt=prompt, branch=branch)
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(self.api_url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            logger.info("Jules session created", title=title, session_name=data.get("name"))
            return data

    def create_session_sync(
        self,
        title: str,
        prompt: str,
        branch: Optional[str] = None,
    ) -> Dict[str, Any]:
        headers = self._get_headers()
        payload = self._build_payload(title=title, prompt=prompt, branch=branch)
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(self.api_url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            logger.info("Jules session created", title=title, session_name=data.get("name"))
            return data


jules_client = JulesClient()

