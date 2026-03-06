/**
 * Read-only connectivity test -- does NOT modify anything in Looker.
 * Calls sdk.me() and sdk.saml_config() to verify credentials work.
 */
import sdk from "../src/shared/lookerSdk";

(async () => {
  try {
    console.log("Testing connection to Looker...\n");

    const me = await sdk.ok(
      sdk.me("id, first_name, last_name, email, role_ids")
    );
    console.log("Authenticated as:", {
      id: me.id,
      name: `${me.first_name} ${me.last_name}`,
      email: me.email,
      roles: me.role_ids,
    });

    console.log("\nFetching SAML config (read-only)...");
    const saml = await sdk.ok(sdk.saml_config());
    console.log("SAML enabled:", saml.enabled);
    if (saml.enabled) {
      console.log("  IdP URL:", saml.idp_url);
      console.log("  IdP Issuer:", saml.idp_issuer);
    }

    console.log("\nFetching OIDC config (read-only)...");
    const oidc = await sdk.ok(sdk.oidc_config());
    console.log("OIDC enabled:", oidc.enabled);

    console.log("\nConnection test passed. Your Looker credentials work.");
    console.log("The SCIM proxy code is ready to use.");

    await sdk.authSession.logout();
  } catch (err: any) {
    console.error("Connection test FAILED:", err.message);
    process.exit(1);
  }
})();
