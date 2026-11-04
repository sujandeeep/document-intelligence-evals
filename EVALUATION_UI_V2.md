# Evaluation Console — V2 UI adoption and product mapping

Date: 18 October 2026. Documentation contract, not a new deployment or runtime
verification. Shared authority: [Universal UI Guide V2](../../sam-new/docs/frontend-ui-design-guide-v2.md).
This cross-repository link assumes sibling `jeeves` and `sam-new` checkouts; the
canonical owner path is `/home/sunil/sam-new/docs/frontend-ui-design-guide-v2.md`.
The [Evidence Explorer contract](EVIDENCE_EXPLORER.md) remains authoritative for
Jeeves entities, access, evidence semantics and current implementation. Shared V2
rules govern new/changed UI; product rules below do not redefine shared primitives.

## Product hierarchy and navigation

- Panel 2 lists retained sessions. Selecting a session drives Panel 3.
- Panel 3 presents recorded contexts and their task rows. A context is a recorded
  execution context; a task is a recorded association of turns, not proof of task
  success. Do not infer task completion or regroup turns solely from timestamps.
- Context titles use the end time in UTC; keep the context ID accessible through a
  separate named copy action. Task labels use a sequence within each context;
  unassigned turns stay explicitly unassigned. Within groups retain chronology.
- Task selectors use clean 44px two-line rows. Selecting one opens its conversation
  in a resizable bottom pane; copy-chat and XLSX actions belong in that pane's title
  bar, not repeated on each task row. The user's conversational reading view has
  no visible pagination; bounded backend cursors are an implementation detail.
- Inspect Turn replaces Panel 3 with that turn's overview and processing sequence.
  Selecting a processing item opens its content, measurements and provenance in
  the bottom inspector. Returning restores the previous task and reading position.
- Classifier and inference input captures appear separately in their processing
  sequence, each with its own payload and metadata. These are captures of model
  inputs, not two independently submitted user messages.
- Tool-call titles include the tool name when recorded. Do not invent a missing
  name or historical payload. Task membership annotation counts are observations,
  not a count of successful tasks.

## Evidence presentation and actions

Measurements show LLM-operation total, summed provider-attempt time and remaining
Others time where evidence permits. Keep missing cells blank and recorded zero as
zero. Compact presentation does not delete execution records or change the total
captured-record count. Preserve raw provenance separately from displayed-table
copy/export. All visible columns, labels, values and ordering must match the
Measurements clipboard/XLSX projection.

Use scope-specific icon names for session/context/task chat, identifier copy and
spreadsheet export. Keep ID copy beside the relevant ID or readable title. Shared
transient toasts replace permanent utility-status labels. Grafana and Temporal
links share the same action-button geometry and surfaces as neighbouring icons.
Evidence expiry and capture-selection help remain attached to their overview rows.
Redaction, missing evidence and retention semantics remain in the Explorer contract;
quiet UI must not turn evidence gaps into a claim of successful execution.

## Authentication and continuity

Keep the current direct sign-in dialog, shared Jeeves session and server-enforced
Domain Admin capability checks. Same-account recovery preserves the selected
session, context/task, turn, processing item, expanded sections, filters, pane sizes
and scroll bookmarks in tab memory; protected content is re-fetched after access
checks. A different canonical account clears the old workspace. A reload is not
covered by this in-memory restoration promise. No credentials or evidence payloads
belong in persistent browser storage.

Crossing the viewport floor hides workspace and sign-in form without destroying
navigation ownership. Restore the same logical view when the viewport is supported
again, fitting visible geometry to available space. No reauthentication may replay
business tools, create a chat or automatically resume a cancelled export.

## Adoption status and verification boundary

The existing [authentication record](verification/evidence-auth-20261018.md) and
[resize record](verification/evidence-auth-resize-20261018.md) remain the record of
the earlier sign-in and 906px measurement. The synthetic browser suite was rerun
against this shell. Physical tablets are not certified.

**Shell geometry:** splitter hit areas overlay the seams and add no width. At 900px
the compact rail is 56px, Panel 2 displays 360–364px, and Panel 3 keeps its 480px
floor, so the workspace does not scroll horizontally. A saved Panel 2 width above
the fitted maximum is kept and restored at a wider viewport. The withdrawn
354–359px band is not used. Wide mode starts at 1440px. The expanded navigation
drag is 180–320px; the 56px rail is the collapse control, not a drag stop.

Other V2 requirements must be checked per affected journey rather than claiming
whole-app compliance. Test session/task selection, turn inspection and return;
visible-value copy/export; filters/reset; same/different-account recovery; repeated
resize while sign-in is open; independent wheel/scrollbar/touch access to pane
bottoms; and themes, computed typography and target spacing at supported boundaries.
Use synthetic fixtures and record emulation separately from physical-device UAT.

Capture configuration, 30-day retention, paid-judging controls, backend contracts
and deployment are outside this documentation change. No configuration, evidence,
credentials or runtime data is modified. New assessment/report implementation is a
separate workstream and is not included in this documentation commit.
