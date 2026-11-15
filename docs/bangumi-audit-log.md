# Bangumi audit history

The administration bangumi-detail page has an **操作日志** tab. Opening a
bangumi initially shows its existing overview; no audit request is made until
the audit tab is active. Leaving the tab cancels pending requests.

The table shows timestamp, current actor name (or stored account ID), action,
and summary. Pages contain 20 records in newest-first order. Refresh reloads the
current page. API failures display an error and a retry button, separately from
the empty-history message.

**查看详情** opens a read-only dialog and loads that log's detail endpoint on
demand. The dialog includes primary resource identity, associated bangumi IDs,
and the available change fields, counts, status, or partial-deletion steps.
Missing or privacy-omitted details are explained; expired logs can no longer be
retrieved. Close with the button or Escape.

API calls use the existing same-origin streaming-platform proxy:

- `GET /api/v2/admin/audit?bangumiId=...&offset=...&limit=20&sort=desc&includeDetails=false`
- `GET /api/v2/admin/audit/:id`

History covers the retained year and includes related episode/resource-group/
video-file operations. Actor information is current, not a historical account
snapshot. The server intentionally does not retain every changed value, and the
UI does not attempt to reconstruct missing before/after values.
