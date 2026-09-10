# OneArtist Hub 0.1.3 Release QA

Release: **Commerce & Customer Accounts**

Automated release checks completed before packaging:

- Static/source QA and JavaScript syntax checks
- SVG-only built-in UI/logo asset scan and embedded-secret scan
- Fresh 0.1.3 SQLite/D1 schema execution
- Idempotent 0.1.2 → 0.1.3 migration simulation with existing paid-order invoice backfill
- PayPal transaction provider-ID uniqueness check
- Mocked API setup/login/admin/content/customer-account smoke test
- Mocked commerce E2E: server-authoritative cart, product variant, capture recovery after an already-captured PayPal response, exactly-once inventory decrement, digital entitlement creation, customer magic-link login, rotating download authorization, invoice generation, completed refund and commerce dashboard
- Pending-refund E2E: a PayPal `PENDING` refund does not alter invoice/refund totals until a verified `PAYMENT.CAPTURE.REFUNDED` event arrives; duplicate webhook delivery is idempotent
- FULL ZIP CRC/integrity check
- UPDATE ZIP overlay simulation on a clean 0.1.2 package
- Extracted FULL and UPDATE-overlay source QA

Before pushing to production, run the final Vite gate in the deployment repository:

```bash
npm run check
npm run build
```

The deployment should only be pushed when both commands pass.
