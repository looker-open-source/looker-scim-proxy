# Configure Azure AD

## Connect Azure AD to SCIM server

First set up a SAML app for Looker, configure the user attribute mappings, and assign the app to users. You'll also probably want to put users in different groups.

Then [follow these steps](https://docs.microsoft.com/en-us/azure/active-directory/app-provisioning/use-scim-to-provision-users-and-groups#integrate-your-scim-endpoint-with-the-aad-scim-client) to enable provisioning for your Looker application.

- Admin Credentials
  - Tenant URL: `{{your_domain}}/scim/v2`
  - Secret Token: Paste in a generated auth token
- Settings
  - Scope: Sync only assigned users and groups
- Mappings

  - Provision Azure Active Directory Groups: ✓ Enabled
  - Provision Azure Active Directory Users: ✓ Enabled

    - Target Object Actions: Tick 'Create', 'Update', and 'Delete'
    - Attribute Mappings:

      - `externalId`: edit "Azure Active Directory Attribute" from `mailNickName` to `objectId`
      - Remove **all** unused attributes to prevent Azure AD from sending unnecessary requests to the SCIM server, the mappings should look like this:

        | Azure Active Directory Attribute                            | customappsso Attribute       |
        | ----------------------------------------------------------- | ---------------------------- |
        | userPrincipalName                                           | userName                     |
        | Switch([IsSoftDeleted], , "False", "True", "True", "False") | active                       |
        | mail                                                        | emails[type eq "work"].value |
        | givenName                                                   | name.givenName               |
        | surname                                                     | name.familyName              |
        | objectId                                                    | externalId                   |

## Syncing Existing Looker Users

**If users already exist in Looker, users will need to be synced twice**

1. Assign users to the SAML app for Looker
   - Azure AD will send a GET request to lookup the user(s) via email. Since the user exists in Looker, but does not exist in the scim DB (we want to store the external_id along with the looker_id together), the scim server will return an empty response with 200
   - Azure AD will then try to POST the user with the user’s details
   - The scim server will write the details of the looker_id, external_id, and email, then return a 409 stating that the resource user record is already in looker
1. Now that the user is in the scim db, we can try and assign the user(s) again
   - Use the Provision on demand or restart provisioning to retry provisioning the user(s)
   - Azure AD will send a GET request to lookup the user(s) via email and the scim server will return the user object
   - Azure AD will issue a PATCH request to update the user(s). The scim server will make any updates and return a 200
1. The user(s) are now synced in Azure AD, scim server, and Looker

## [Optional] User Attributes

1. In Attribute Mappings, tick "Show advanced options" and then "Edit attribute list for customappsso". You may add as many custom user attributes here.

   - The name **must** be in the format: `urn:ietf:params:scim:schemas:extension:LookerUserAttributes:2.0:User:CUSTOM_ATTRIBUTE_NAME` where `CUSTOM_ATTRIBUTE_NAME` is the name of the user attribute in Looker, e.g.:
     `urn:ietf:params:scim:schemas:extension:LookerUserAttributes:2.0:User:favourite_number`
   - select a type, e.g.: `Integer`
   - click save

1. Back in the Attribute Mappings:

   - click "Add New Mapping"
   - enter the mapping type and configurations, e.g.:
     ```
     Mapping type: Direct
     Source Attribute: extension_5ba432d2653f459a8d26b52d3d904ff2_FavouriteNumber
     Target Attribute: urn:ietf:params:scim:schemas:extension:LookerUserAttributes:2.0:User:favourite_number
     ```

1. Repeat as required

A full tutorial for custom attribute mappings can be found [here](https://docs.microsoft.com/en-us/azure/active-directory/app-provisioning/customize-application-attributes).

Refer to [`docs/schema-examples`](schema-examples.md) for more details on the user and group objects.

## Additional details

- Azure AD will always begin each sync (approximately every 20-40 minutes) with a [search for random user id](https://docs.microsoft.com/en-us/answers/questions/407460/azure-ad-scim-random-id-in-34username-eq34.html)

- leveraging the `IsSoftDeleted` attribute will disable users in any of the four scenarios: the user is out of scope due to being unassigned from the application, the user is out of scope due to not meeting a scoping filter, the user has been soft deleted in Azure AD, or the property AccountEnabled is set to false on the user. See [this](https://docs.microsoft.com/en-us/azure/active-directory/app-provisioning/customize-application-attributes#what-you-should-know) for more details

- soft deleted users will be disabled and have their [email addresses updated](https://docs.microsoft.com/en-us/answers/questions/129068/azure-ad-scim-not-adding-suffix-and-prefix-to-user.html). These users will be deleted in Looker once they are permently deleted (By default, 30 days after they are deleted)

- see further known limitations [here](https://docs.microsoft.com/en-us/azure/active-directory/app-provisioning/how-provisioning-works#de-provisioning)
