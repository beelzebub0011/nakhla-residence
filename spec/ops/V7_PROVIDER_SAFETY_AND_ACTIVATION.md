# V7 PROVIDER SAFETY AND TRIAL ACTIVATION CHECKLIST (HUMAN-IN-THE-LOOP)

Status starts `NOT_VERIFIED`; no assumption of account entitlement. Do not start a paid or automatically converting trial while doing normal project execution. Owner must explicitly agree to cost/renewal/eligible account terms. Any real provider authorization/paid-plan changes require user's action. Never put provider credentials in source, Git, frontend or prompt. The provider's official guide says normal MCP/CLI pay with credits; promotion is a potentially temporary exception for qualified users; confirm **the actual generation surface** used (Claude web MCP vs Claude Code CLI).

Task: login / subscription check: HUMAN OWNER ACTION REQUIRED.
- [ ] Visit official https://higgsfield.ai/mcp?tab=claude
- [ ] Confirm logged-in eligibility; screenshot official trial period and exact listed models/limits (hide personal/billing data)
- [ ] Confirm auto-renew terms, amount after 72h, cancellation instructions and refund rules shown in checkout
- [ ] Confirm whether trial covers Claude Code CLI; do not assume MCP and CLI are interchangeable
- [ ] Verify commercial usage rights for promotional media
- [ ] Owner explicitly approves trial and any potential billing responsibility before enabling anything
- [ ] Owner confirms plan for canceling renewal if they don't want it
- [ ] Record trial start/end in local note, without payment secrets; do not promise proactive future monitoring
- [ ] Only after all relevant checks, begin a test generation if its displayed bill is zero
- [ ] If one gate fails, mark `HIGGSFIELD_SKIPPED_SAFE` and continue Blender-only workflow

Official technical setup instructions (NOT executable until reviewed):
Claude web/desktop: Settings > Connectors > Add custom connector > https://mcp.higgsfield.ai/mcp, then authenticate with owner. Claude Code: verify official CLI `npm i -g @higgsfield/cli` and skills `npx skills add higgsfield-ai/skills`; inspect package, consent to global installation, authenticate browser owner, and separately verify CLI promotion; if unsure do not generate. Browser website itself may have distinct regular Unlimited terms not applying to MCP/CLI. Never automate payment entry or downgrade/upgrade plan.

Portfolio production gate: output license and source proof, geometry fidelity audit, all generated assets exported locally and hashed before use. No call to Higgsfield from the public site.
