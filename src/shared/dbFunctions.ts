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

require("dotenv").config();
import low from "lowdb";
import FileSync from "lowdb/adapters/FileSync";
import { Users, Schema, ScimUser, ScimErrorSchema } from "../types";
import { Request, Response } from "express-serve-static-core/index";
import Logger from "./logger";

// insert user record into scim db
export const insertUserRecord = (
  req: Request,
  looker_id: string,
  external_id: string,
  email: string
) => {
  const adapter = new FileSync<Schema>(process.env.PATH_TO_DB!);
  const dbUser = low(adapter)
    .get("users")
    .push({
      looker_id: looker_id,
      external_id: external_id,
      email: email,
    })
    .write();

  Logger.info(
    `${req.method} ${req.baseUrl} User written to scim db {"id":"${looker_id}", "externalId":"${external_id}", "email":"${email}"}`
  );

  return dbUser;
};

// get user record from scim db
export const getUserRecord = (looker_id: string) => {
  const adapter = new FileSync<Schema>(process.env.PATH_TO_DB!);
  const dbUser = low(adapter)
    .get("users")
    .find({ looker_id: looker_id })
    .value();

  return dbUser;
};

// get user record by email and external id from scim db
export const getUserRecordByEmail = (email: string, externalId?: string) => {
  const adapter = new FileSync<Schema>(process.env.PATH_TO_DB!);
  const dbUser = low(adapter)
    .get("users")
    .find((u) => u.external_id === externalId || u.email === email)
    .value();

  return dbUser;
};

// update user record into scim db
export const updateUserRecord = (
  req: Request,
  looker_id: string,
  column: "email" | "external_id",
  value: string
) => {
  const adapter = new FileSync<Schema>(process.env.PATH_TO_DB!);
  const dbUser = low(adapter)
    .get("users")
    .find({ looker_id: looker_id })
    .assign({
      [column]: value,
    })
    .write();

  Logger.info(
    `${req.method} ${req.baseUrl}/${looker_id} User ${column} updated in scim db`
  );

  return dbUser;
};

// remove user record into scim db
export const deleteUserRecord = (req: Request, looker_id: string) => {
  const adapter = new FileSync<Schema>(process.env.PATH_TO_DB!);
  const dbUser = low(adapter)
    .get("users")
    .remove({ looker_id: looker_id })
    .write();

  Logger.info(
    `${req.method} ${req.baseUrl}/${looker_id} User deleted in scim db`
  );

  return dbUser;
};
