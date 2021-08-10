# Looker SCIM Proxy

SCIM (System for Cross-domain Identity Management) is a lightweight RESTful JSON based open standard communication between an IdP (Identity Provider) and applications, providing full user lifecycle management. SCIM will allow admins to:

- streamline processes to auto provision / deprovision users from Looker
- enable all changes to user profiles, groups, and custom attribute details to be updated immediately
- synchronize data between an Idp and Looker to reduce overall data inconsistencies

The table below outlines the advantages of leveraging SCIM on top of SAML JIT:

<br />

**SAML JIT vs SCIM for Looker**

| User Action | SAML JIT                  | SCIM                       |
| ----------- | ------------------------- | -------------------------- |
| Create      | ✓ (when accessed by user) | ✓ (when assigned by admin) |
| Read        |                           | ✓                          |
| Update      | ✓ (when accessed by user) | ✓ (when change occurs)     |
| Disable     |                           | ✓                          |
| Delete      |                           | ✓                          |

<br />

## Framework

This framework provides an example proxy server to be used with Looker, built according to the [SCIM protocol specification](https://tools.ietf.org/html/rfc7644). It leverages CRUD operations on users, groups, and user attributes. The following dependencies are used:

- Yarn + Express + Typescript
- [Looker SDK Node](https://www.npmjs.com/package/@looker/sdk)
- [winston](https://www.npmjs.com/package/winston) for logging
- [lowdb](https://www.npmjs.com/package/lowdb) lightweight JSON DB, or, [datastore](https://cloud.google.com/datastore) for App Engine deployment

All installation and configuration steps can be found in the [docs](docs/):

- [`docs/installation-and-deployment.md`](docs/installation-and-deployment.md)
- [`docs/configure-okta.md`](docs/configure-okta.md)
- [`docs/configure-azure-ad.md`](docs/configure-azure-ad.md)

<br />

## About

### License

See [`LICENSE`](LICENSE)

### Support

Looker SCIM Proxy is NOT officially supported by Looker, Google Cloud, or Google. Please do not contact support for issues. Issues may be reported via the Github Issues tracker, but no SLA or warranty exists that they will be resolved.

### Contributing

See [`docs/contributing.md`](docs/contributing.md)

### Code of Conduct

See [`docs/code-of-conduct.md`](docs/code-of-conduct.md)
