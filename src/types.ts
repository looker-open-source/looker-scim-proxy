/*
Copyright 2021 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

export interface Users {
  looker_id: string; // service provider defined identifier (Looker)
  external_id: string; // client defined identifier
  email: string;
}

// db schema, users table contains 3 columns
export interface Schema {
  users: Users[];
}

export interface ScimUser {
  schemas: string[];
  id?: string; // service provider defined identifier (Looker)
  externalId: string; // client defined identifier
  active: boolean;
  displayName?: string; // not in use
  userName: string; // email (should be same as emails[0].value)
  name: {
    givenName: string;
    familyName: string;
  };
  emails: {
    primary: boolean;
    value: string; // email address
    type: string; // e.g. work
  }[];
  meta: {
    resourceType: string; // "User"
  };
  "urn:ietf:params:scim:schemas:extension:LookerUserAttributes:2.0:User"?: {
    [key: string]: any;
  }; // namespace will need to be set in Idp. Stored as key:value pairs
}

export interface ScimGroup {
  schemas: string[];
  id: string; // service provider defined identifier (Looker)
  externalId?: string; // client defined identifier
  displayName: string; // client defined
  members: null; // not required to support returning all members of groups
  meta: {
    resourceType: string; // "Group"
  };
}

// The "path" attribute is OPTIONAL for "add" and "replace" and is REQUIRED for "remove" operations.
export interface ScimUserOperation {
  op: string; // only "replace" - don't require case sensitive match
  path?: string;
  value: string;
}

export interface ScimGroupPatchValue {
  displayName?: string; // for Okta's replace op
  value: string;
}

export interface ScimGroupOperation {
  op: string; // displayName: [replace], members: [add, remove, replace] - don't require case sensitive match
  path?: string; // optional if value is ScimGroupPatchValue
  value?: any; // can be string | ScimGroupPatchValue[] // optional if path contains filter
}

export interface ScimUserOperationSchema {
  schemas: string[]; // ["urn:ietf:params:scim:api:messages:2.0:PatchOp"];
  Operations: ScimUserOperation[];
}

export interface ScimGroupOperationSchema {
  schemas: string[]; // ["urn:ietf:params:scim:api:messages:2.0:PatchOp"];
  Operations: ScimGroupOperation[];
}

export interface ScimErrorSchema {
  schemas: string[];
  detail: string;
  status: number;
}
