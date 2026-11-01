import argparse
import sys
import os

# Ensure backend root on path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.jules import jules_client


def main():
    parser = argparse.ArgumentParser(description="Trigger Jules AI bug fix session")
    parser.add_argument("--title", required=True, help="Session title (e.g. 'Fix: 500 error in attendance API')")
    parser.add_argument("--prompt", required=True, help="Bug report description and instructions")
    parser.add_argument("--branch", default=None, help="Target starting git branch")
    parser.add_argument("--api-key", default=None, help="Optional explicit Jules API key")
    parser.add_argument("--repo", default=None, help="Optional explicit repo (owner/repo)")

    args = parser.parse_args()

    try:
        from app.core.jules import JulesClient
        client = JulesClient(api_key=args.api_key, repo=args.repo) if (args.api_key or args.repo) else jules_client
        session = client.create_session_sync(
            title=args.title,
            prompt=args.prompt,
            branch=args.branch,
        )
        print("Jules session created successfully:")
        print(session)
    except Exception as e:
        print(f"Error triggering Jules session: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

