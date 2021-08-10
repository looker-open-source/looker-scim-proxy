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

import { Datastore } from "@google-cloud/datastore";
import { Users, Schema, ScimUser, ScimErrorSchema } from "../types";
import { Request, Response } from "express-serve-static-core/index";
import Logger from "./logger";

const datastore = new Datastore();

// insert user record into scim db
export const insertUserRecord = async (
  req: Request,
  looker_id: string,
  external_id: string,
  email: string
) => {
  const entity = {
    key: datastore.key(["users", looker_id]),
    data: {
      looker_id: looker_id,
      external_id: external_id,
      email: email,
    },
  };

  const response = await datastore.insert(entity);
  Logger.info(
    `${req.method} ${req.baseUrl} User written to scim db {"id":"${looker_id}", "externalId":"${external_id}", "email":"${email}"}`
  );
  return response;
};

// get user record from scim db
export const getUserRecord = async (looker_id: string) => {
  const query = datastore
    .createQuery("users")
    .filter("looker_id", "=", looker_id);

  const [data] = await datastore.runQuery(query);
  return data[0];
};

// get user record by email and external id from scim db
export const getUserRecordByEmail = async (
  email: string,
  externalId?: string
) => {
  const query = datastore
    .createQuery("users")
    .filter("external_id", "=", externalId!)
    .filter("email", "=", email);

  const [data] = await datastore.runQuery(query);
  return data[0];
};

// update user record into scim db
export const updateUserRecord = async (
  req: Request,
  looker_id: string,
  external_id: string,
  email: string
) => {
  // entire object must be sent to datastore
  const entity = {
    key: datastore.key(["users", looker_id]),
    data: {
      looker_id: looker_id,
      external_id: external_id,
      email: email,
    },
  };

  const response = await datastore.upsert(entity);
  Logger.info(
    `${req.method} ${req.baseUrl}/${looker_id} User updated in scim db`
  );
  return response;
};

// remove user record into scim db
export const deleteUserRecord = async (req: Request, looker_id: string) => {
  const key = datastore.key(["users", looker_id]);

  const response = await datastore.delete(key);
  Logger.info(
    `${req.method} ${req.baseUrl}/${looker_id} User deleted in scim db`
  );
  return response;
};
