# Configure Okta

## Connect Okta to SCIM server

First set up a SAML app for Looker, configure the user attribute mappings, and assign the app to users. You'll also probably want to put users in different groups.

Then [follow these steps](https://help.okta.com/en/prod/Content/Topics/Apps/Apps_App_Integration_Wizard_SCIM.htm) to enable provisioning for your Looker application.

- Base URL: `{{your_domain}}/scim/v2`
- Unique identifier field for users: email
- Enable supported actions:
  - Push New Users
  - Push Profile Updates
  - Push Groups
- Authentication Mode: HTTP Header
  - Paste in a generated auth token
- Enable "Create Users", "Update User Attributes", and "Deactivate Users"
- Remove **all** unused attributes to prevent Okta from sending unnecessary requests to the SCIM server

## Syncing Existing Looker Users

**If users already exist in Looker, users will need to be added twice to sync**

1. Assign user to SCIM server (can be individually via People or bulk via Groups)
   - Okta will send a GET request to lookup the user(s) via email. Since the user exists in Looker, but does not exist in the scim DB (we want to store the external_id along with the looker_id together), the scim server will return an empty response with 200
   - Okta will then try to POST the user with the user’s details
   - The scim server will write the details of the looker_id, external_id, and email, then return a 409 stating that the resource user record is already in looker
1. Now that the user is in the scim db, we can try and assign the user(s) again
   - Unassign the user(s)
   - Assign the user(s)
   - Okta will send a GET request to lookup the user(s) via email and the scim server will return the user object
   - Okta will issue a PUT request with the user’s object. This will in turn make the scim server hit the Looker SDK update_user() endpoint with any updates to the users name(s) (user attributes are WIP), then return a 200
1. The user(s) are now synced in Okta, scim server, and Looker

## [Optional] User Attributes

1. Create an attribute if one does not already exist:

   - Applications > SCIM App > Provisioning > "To App" > "Go to Profile Editor"
   - click "Add Attribute"
   - enter data type and configurations, e.g.:
     ```
     Data type: number
     Display name: Favourite Number # used in Okta
     Variable name: favourite_number # used in Okta
     External name: favourite_number # exact name of UA in Looker
     External namespace: urn:ietf:params:scim:schemas:extension:LookerUserAttributes:2.0:User # schema and property containing all UAs as key:value pairs
     ```
   - make sure to use the same names as used in Looker. The external namespace _must_ be `urn:ietf:params:scim:schemas:extension:LookerUserAttributes:2.0:User`
   - Note: to use `locale`, make a duplicate attribute with a different variable name

1. Map attribute to SCIM server

   - Go back to Provisioning > "To App"
   - click "Show Unmapped Attributes"
   - map the attribute from Okta profile, apply on "Create and update"
   - Example user payload on PUT request:

     ```
     {
       "schemas": [
         "urn:ietf:params:scim:schemas:core:2.0:User",
         "urn:ietf:params:scim:schemas:extension:LookerUserAttributes:2.0:User"
       ],
       "meta": { "resourceType": "User" },
       "id": "24",
       "externalId": "00u5ia63f9NgcNDHg5d6",
       "active": true,
       "userName": "test.user@looker.com",
       "name": {
         "givenName": "Test",
         "familyName": "User"
       },
       "emails": [
         {
           "value": "test.user@looker.com",
           "primary": true,
           "type": "work"
         }
       ],
       "urn:ietf:params:scim:schemas:extension:LookerUserAttributes:2.0:User": {
         "favourite_number": 123,
         "city": "London",
         "locale": "fr-FR",
         ...
       },
       "groups": [
         {
           "value": "1",
           "display": "Group A"
         },
         {
           "value": "2",
           "display": "Group B"
         },
         ...
       ]
     }
     ```

1. When assigning Groups to SCIM server, attributes can be set at group level which will override attributes set at the user level. The SCIM server will only send Looker a single value
