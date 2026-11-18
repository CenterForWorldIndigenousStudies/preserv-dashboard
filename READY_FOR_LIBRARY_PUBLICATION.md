# Ready for Library Publication

Keywords: Ready for Library, Actions Publish, selected documents, publication batch, Data Ingester, Fedora Ingester, source claim, retry queueing, Library Remove, development library smoke test

## Publish a selection

Select one or more rows in Ready for Library and choose **Actions > Publish**. Selection defines the publication set, including documents selected across pages or source batches. Search filters do not add documents to the set.
Choose **Actions > Reprocess** when the documents need another processing pass instead.

The confirmation lists every selected document. Enter a unique name for the new publication batch and choose **Publish**. The Dashboard creates one new batch, then queues Data Ingester to prepare one approved artifact per selected document.
A successful Data Ingester callback queues Fedora Ingester directly. The original processing batches and their history remain intact.

The confirmation links to the new batch. A queued response confirms acceptance, not successful publication. Inspect the batch's Data Ingester and Fedora Ingester stages and per-document outcomes.
Fedora still validates collection mapping, metadata, duplicates, Drive, and Workbench at runtime.

## Failure and recovery

If the queue request fails after the batch is created, use **Retry queueing** in the same dialog or **Retry queueing publication** on the batch details page. It resubmits the same operation and batch. The batch link remains available for inspection.
Only the original requester can retry the draft. Do not start an independent publication for a source that is reserved by an active attempt.

If Data Ingester fails before Fedora, the publication batch retains its claims. Resolve the cause and use the supported pre-Fedora retry or whole-batch rollback. Confirm rollback completes before publishing the source in another batch.
An uncertain Fedora result requires reconciliation; do not use whole-batch rollback after the Fedora boundary.

After a document is published, use **Remove from Library** for that document. Removal deletes the Fedora node and generated submission artifacts and restores the immediate pre-Fedora publication candidate to Ready for Library only after external cleanup is confirmed.
To publish it again, select that restored candidate and create another new batch. See [Library Document Removal](LIBRARY_REMOVAL.md).

## Development library smoke test

Use a named disposable document in the development environment. Confirm the target Islandora site, Workbench account, collection mapping, and rollback/delete folder before starting.

1. Select only the disposable document in Ready for Library and publish it with a unique batch name.
2. Follow the new batch through Data Ingester and Fedora Ingester. Confirm the Library record and its Islandora node, metadata, and media.
3. Select the published document in Library and choose **Remove from Library**. Confirm the removal and follow its per-item status.
4. Confirm the Islandora node and generated Drive submission folder are gone or quarantined as configured. Confirm the restored candidate is Ready for Library and the original processing batch history is unchanged.
5. If any external outcome is uncertain, stop and inspect the recorded operation. Do not infer deletion from a missing Dashboard row alone.

Automated tests use fakes for external providers; this smoke test is manual and uses no production document.
