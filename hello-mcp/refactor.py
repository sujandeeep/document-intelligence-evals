import re

with open("app.py", "r") as f:
    content = f.read()

# Rename background_logs to tool_calls_log initially
content = content.replace("background_logs = []", "tool_calls_log = []")

# Replace appending to background_logs with tool_calls_log
content = content.replace("background_logs.append", "tool_calls_log.append")

# Remove the specific unwanted logs
content = re.sub(r'(\s*tool_calls_log\.append\(f"\\\\n--- \[Available Tools\] ---\\\\n" \+ json\.dumps\(tools_for_log, indent=2\)\))', '', content)
content = re.sub(r'(\s*tool_calls_log\.append\(f"\\\\n--- \[LLM Payload\] ---\\\\n" \+ json\.dumps\(user_messages, indent=2\)\))', '', content)
content = re.sub(r'(\s*tool_calls_log\.append\(f"\\\\n--- \[LLM Response\] ---\\\\n" \+ json\.dumps\(response_message\.model_dump\(\), indent=2\)\))', '', content)

# Replace the final output block
final_block = """                original_user_msg = body.messages[-1].get("content", "N/A") if body.messages else "N/A"
                session_str = f"first_number={request.session.get('first_number')}\\noperation={request.session.get('operation')}\\nsecond_number={request.session.get('second_number')}"
                tool_str = "\\n".join(tool_calls_log) if tool_calls_log else "No tools called."
                
                final_logs = [
                    f"--- [1. SYSTEM PROMPT] ---\\n{SYSTEM_PROMPT}",
                    f"--- [2. USER PROMPT] ---\\n{original_user_msg}",
                    f"--- [3. TOOL CALL RESULT] ---\\n{tool_str}",
                    f"--- [4. SESSION STATE] ---\\n{session_str}"
                ]
                
                for log_msg in final_logs:
                    logging.info(log_msg)
                
                return StreamingResponse(generate_simple(), media_type="text/plain", headers={"X-Background-Logs": json.dumps(final_logs)})"""

old_block_pattern = r"for log_msg in tool_calls_log:\s+logging\.info\(log_msg\)\s+return StreamingResponse\(generate_simple\(\), media_type=\"text/plain\", headers={\"X-Background-Logs\": json\.dumps\(tool_calls_log\)}\)"

content = re.sub(old_block_pattern, final_block, content, flags=re.MULTILINE)

with open("app.py", "w") as f:
    f.write(content)
