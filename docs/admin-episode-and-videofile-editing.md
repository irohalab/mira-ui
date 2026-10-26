# Episode and VideoFile database editing

These controls require the matching `mira-streaming-platform` admin API changes
to be deployed alongside the UI. Browser requests remain same-origin under
`/api/v2`.

## Episode fields

From a bangumi's episode list, open **Edit** for an episode. SuperAdmin can edit
episode metadata and status. Labels show the entity field name and, where
different, its database column name. The editable fields are `bangumiId`,
`subItemId`, `bgmEpsId`, `type`, `episodeNo`, `sort`, `name`, `nameCn`, `duration`,
`airdate`, `properties`, and `status`.

- `properties` accepts an ItemProperties JSON object. Each property has a
  `value` and a boolean `locked`, with an optional `propertyType`.
- Nullable text fields preserve the distinction between an empty string and
  `null`; use their **NULL** buttons to clear them. A blank `airdate` or
  `subItemId` is saved as `null`. Zero episode numbers and fractional `sort`
  values are supported.
- `airdate` accepts a valid `YYYY-MM-DD` date or `null`.
- `id`, `thumbnailImage.id`, `createTime`, and `updateTime` are displayed
  read-only and are not included in the edit payload. The image reference is
  an existing Image entity ID, not editable episode metadata.
- `createTime` is preserved and `updateTime` is set by the server when saving.
  Deprecated `deleteMark` and `thumbnailColor` fields are neither shown nor
  editable.
- The destination bangumi must exist.
- This is a direct episode-row edit. Changing `bangumiId` does not transfer
  related VideoFiles, jobs, or watch history, or recalculate show-level counts.

Other Admin users retain the existing status-only editor.

### Fill from upstream

Set `subItemId` to the intended bangumi-provider subitem UUID, then select
**Fill from upstream**. The response fills the current draft's upstream-owned
fields: `subItemId`, `bgmEpsId`, `episodeNo`, `sort`, `type`, `name`, `nameCn`,
`airdate`, and `properties`, when supplied by the provider. Manual fill accepts
all SubItem types, including entries excluded from automatic import. Regular,
special, and null `episodeType` values can be copied to the local type field.

Import is best-effort. The provider owns validation of `bgmId`, names, and
`publicTime`; its timestamp is converted to the local `YYYY-MM-DD` date or null.
Only local representation limits are checked. A field that cannot fit the local
model or editor is skipped, its existing draft value is retained, and a warning
names that field. Other fields are still filled and can be saved. Nullable names
and air dates are accepted. Missing optional fields are left unchanged.

Manual form input is still validated when saving. This does not impose the
same input-validation rules on the trusted upstream import.

The button does not save anything, add episodes, delete episodes, or run the
existing sync-all workflow. Local-only fields, including status, duration,
timestamps, deletion state, thumbnail, and bangumi ownership, remain unchanged.
Review the values and select **Save** to persist them; cancel to discard them.
The separate sync-all action retains its regular-episode matching and
add/update/removal-preview behavior. Its original merge routine is separate
from the single-episode best-effort mapper. Manual episode creation is not part
of this dialog; filling applies to existing episodes.

Admin API endpoints (excluded from the public OpenAPI contract):

- `PUT /admin/episode/:id?status=...` remains the status-only API.
- `PUT /admin/episode/:id/fields` accepts the complete editable-field payload
  and requires SuperAdmin. Identity, image references, timestamps, deprecated
  fields, and unknown fields are rejected.
- `GET /admin/episode/:id/upstream?subItemId=...` requires SuperAdmin and returns
  `{fields, warnings}` with HTTP 200, including when individual fields are
  skipped. It never persists draft values. Without the query parameter it uses
  the stored subitem ID.

## VideoFile editing and transfer

The episode list's **VideoFiles** action opens a list of the episode's files.
Select **Edit VideoFile** to use the same enhanced editor as the resource-group
view, including system-field unlocking, processing rules, and linked-job
details. An explicit file ID distinguishes files sharing an episode/resource
group. To add a file, select a resource group and select **Add VideoFile**.

For SuperAdmin, the enhanced editor also provides **Ownership**:

1. Enable **Edit ownership**.
2. Enter the destination `bangumiId` and select **Load destination**.
3. Select `episodeId` and `resourceGroupId` from that bangumi's loaded records.
4. Select **Save & transfer** and confirm the database-only reassignment.

Saving sends the parent IDs with the other editable fields to
`PUT /admin/video-file/:id`. The server checks SuperAdmin permission and verifies
that the destination bangumi exists and owns both the episode and resource
group. All three references and field edits are saved in one transaction.
An active local-to-S3 migration binding still prevents the update.

Transfers do not change the VideoFile ID, move storage, relocate download or
processing jobs, modify processing rules, or recalculate episode statuses.
Existing local paths may depend on the original bangumi; review them separately.
Per-file rules left under the original bangumi may also need separate manual
adjustment. Omitted storage and processing metadata are preserved by the API.
The existing `torrentId` and `kfImagePathList` editor values are now persisted.

After a successful transfer the editor closes and the source list refreshes.
Transfers opened from the resource-group view refresh all groups for the current
bangumi so both source and destination rows stay accurate.
