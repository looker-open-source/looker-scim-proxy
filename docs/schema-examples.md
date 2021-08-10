This project uses the [user](https://datatracker.ietf.org/doc/html/rfc7643#section-8.1) and [group](https://datatracker.ietf.org/doc/html/rfc7643#section-8.4) core schema format to receive data from and return data to the IdP. The extended enterprise schemas are not required as Looker only requires a minimal subset of fields to create a user. These are:

| SCIM User Object             | Looker User Object |
| ---------------------------- | ------------------ |
| emails[type eq "work"].value | email              |
| name.givenName               | first_name         |
| name.familyName              | last_name          |
| active                       | is_disabled        |

Looker [user attributes](https://docs.looker.com/admin-options/settings/user-attributes) are optional and can be supplied as key-value pairs object with a custom schema: `urn:ietf:params:scim:schemas:extension:LookerUserAttributes:2.0:User`

The `id` field is defined by Looker. The `externalId` field is defined by the IdP.

Groups may also be supplied with the user object, but will not be used in the /users endpoints.

## User Schema

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
      "value": "28",
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

## Group Schema

Groups contain the name and members of the group:

| SCIM Group Object  | Looker Group Object |
| ------------------ | ------------------- |
| displayName        | name                |
| members[n].value   | Looker user ID      |
| members[n].display | Looker user email   |

```
{
   "schemas":[
      "urn:ietf:params:scim:schemas:core:2.0:Group"
   ],
   "id":"28",
   "externalId":"4388d73b-fd60-4eb8-b01a-809e0d533e18",
   "displayName":"Group A",
   "members":[
      {
         "value":"22",
         "display":"test.user1@looker.com"
      },
      {
         "value":"25",
         "display":"test.user2@looker.com"
      },
      ...
   ]
}

```
