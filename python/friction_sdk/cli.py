#!/usr/bin/env python3
"""CLI for reporting friction when using Telnyx APIs"""

import sys
import json
import argparse
from typing import Optional

from .reporter import FrictionReporter
from .validators import ValidationError


def parse_args(args: Optional[list] = None) -> argparse.Namespace:
    """Parse command-line arguments"""
    parser = argparse.ArgumentParser(
        prog="friction-report",
        description="Report friction encountered when using Telnyx APIs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Minimal report
  friction-report \\
    --skill telnyx-webrtc-python \\
    --team webrtc \\
    --type parameter \\
    --severity major \\
    --message "API expects 'certificate' but docs say 'cert'"

  # With context
  friction-report \\
    --skill telnyx-messaging-python \\
    --team messaging \\
    --language python \\
    --type docs \\
    --severity major \\
    --message "No example for sending MMS" \\
    --context '{"endpoint":"POST /v2/messages","doc_url":"https://..."}'

  # Remote mode (requires API key)
  friction-report \\
    --skill telnyx-voice-go \\
    --team voice \\
    --type api \\
    --severity blocker \\
    --message "API returns 500 for valid request" \\
    --output remote \\
    --api-key YOUR_API_KEY

Output:
  Reports saved to: ~/.openclaw/friction-logs/friction-*.yaml
        """,
    )

    # Required arguments
    parser.add_argument(
        "--skill",
        required=True,
        help="Skill name (e.g., telnyx-webrtc-python)",
    )
    parser.add_argument(
        "--team",
        required=True,
        choices=["webrtc", "messaging", "voice", "numbers", "ai", "fax", "iot", "default"],
        help="Product team",
    )
    parser.add_argument(
        "--type",
        required=True,
        choices=["parameter", "api", "docs", "auth"],
        help="Friction type",
    )
    parser.add_argument(
        "--severity",
        required=True,
        choices=["blocker", "major", "minor"],
        help="Severity level",
    )
    parser.add_argument(
        "--message",
        required=True,
        help="Brief description (max 200 chars)",
    )

    # Optional arguments
    parser.add_argument(
        "--language",
        choices=["javascript", "python", "go", "ruby", "java"],
        help="SDK language (default: auto-detect)",
    )
    parser.add_argument(
        "--context",
        help="Additional context as JSON string",
    )
    parser.add_argument(
        "--output",
        choices=["local", "remote", "both", "auto"],
        default="auto",
        help="Output mode (default: auto)",
    )
    parser.add_argument(
        "--local-dir",
        help="Local output directory (default: ~/.openclaw/friction-logs)",
    )
    parser.add_argument(
        "--api-key",
        help="Telnyx API key (default: TELNYX_API_KEY env var)",
    )
    parser.add_argument(
        "--version",
        action="version",
        version="%(prog)s 0.1.0",
    )

    return parser.parse_args(args)


def main(args: Optional[list] = None) -> int:
    """CLI entry point"""
    parsed = parse_args(args)

    # Parse context JSON if provided
    context = None
    if parsed.context:
        try:
            context = json.loads(parsed.context)
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in --context: {e}", file=sys.stderr)
            return 1

    # Initialize reporter
    reporter = FrictionReporter(
        skill=parsed.skill,
        team=parsed.team,
        language=parsed.language,
        output=parsed.output,
        local_dir=parsed.local_dir,
        api_key=parsed.api_key,
    )

    # Report friction
    try:
        results = reporter.report(
            type=parsed.type,
            severity=parsed.severity,
            message=parsed.message,
            context=context,
        )

        # Print results
        for mode, result in results.items():
            if result["status"] == "saved":
                print(f"✅ {mode}: Saved to {result['path']}")
            elif result["status"] == "sent":
                print(f"✅ {mode}: Sent to {result['endpoint']}")
            elif result["status"] == "skipped":
                print(f"⏭️  {mode}: {result['reason']}")
            elif result["status"] == "failed":
                print(f"❌ {mode}: {result['error']}", file=sys.stderr)

        return 0

    except ValidationError as e:
        print(f"Validation error: {e}", file=sys.stderr)
        return 1
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
