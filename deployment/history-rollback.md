# History Rewrite Rollback

Use only during the controlled history-sanitisation window and only with repository-owner approval.

1. Stop all pushes and deployments.
2. Confirm the encrypted pre-rewrite mirror checksum and reference map.
3. Identify why the rewritten repository is unusable. Prefer correcting the sanitised mirror without restoring exposed history.
4. If the owner accepts the temporary security risk and authorises restoration, use the recorded before-map and secure mirror to restore only the required branch/tag refs.
5. Reapply branch protection and verify the remote ref map.
6. Keep the retired credential disabled; rollback never makes it valid again.
7. Correct the rewrite process, repeat scans and schedule a new controlled sanitisation.

Do not restore old history merely to recover one website file. That file should be recovered from the secure backup as a clean new object instead.
