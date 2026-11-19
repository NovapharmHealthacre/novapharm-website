## Purpose and scope

<!-- Describe user-visible behaviour and the application(s) affected. -->

## Evidence and verification

- [ ] I have identified the exact source of truth, entitlement boundary, and any external dependencies.
- [ ] I have run relevant source tests, TypeScript checks, and browser acceptance; failing/queued results are disclosed.
- [ ] I have not confused a passing source build, GitHub merge, staged preview, and confirmed live production deployment.
- [ ] I have preserved the current security, privacy, medicines, quality and commerce release gates.

### Apple-inspired NovaPharm design DNA — complete for UI changes

- [ ] I reviewed the applicable patterns in [NovaPharm layout policy](../packages/design-system/src/layout-policy.ts), [Apple menus and actions policy](../packages/design-system/src/menu-actions-policy.ts) and their linked official Apple source matrices.
- [ ] I chose content-appropriate layouts (collections vs tables; hierarchy vs flat data; split vs compact view; tabs vs navigation), reused existing tokens/components, and preserved approved NovaPharm branding.
- [ ] I checked meaningful labels, single-action lockups, disclosure affordances, keyboard/RTL, focus, reduced motion, forced colours, zoom, long text, and narrow layouts.
- [ ] I classified activity views/sharing, buttons, contextual commands, menus, pop-up selection, segmented choices, toggles and toolbars by purpose; exposed primary actions; preserved browser edit menus; excluded unsupported native-only features.
- [ ] I have captured the affected routes/modules, tests, browser receipts and the deployed SHA; otherwise I explicitly mark production acceptance pending.

**Not applicable?** Say why a design checklist item does not apply instead of silently claiming it passed.

## Rollout and rollback

<!-- Include the exact published artifact or service boundary, release gates and rollback route. -->
