#!/usr/bin/env python3
"""
Re-run Recorded Sessions with GPT-5.5 (Zero Tool Calling)
Redirected from rerun_gemini to use OpenAI GPT-5.5 instead of Gemini.
"""

import sys
from rerun_gpt5 import rerun_session_with_gpt5

def rerun_session_with_gemini(source_session_id=None, recording_title=None, recording_number=None, gemini_api_key=None, openai_api_key=None):
    # Directly invoke GPT-5.5 replacement
    return rerun_session_with_gpt5(
        source_session_id=source_session_id,
        recording_title=recording_title,
        recording_number=recording_number,
        openai_api_key=openai_api_key or gemini_api_key
    )

if __name__ == "__main__":
    session_arg = sys.argv[1] if len(sys.argv) > 1 else None
    rerun_session_with_gpt5(source_session_id=session_arg)
