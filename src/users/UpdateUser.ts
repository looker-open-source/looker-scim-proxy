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

import express from "express";
import { Request, Response } from "express-serve-static-core/index";
import { ScimUser, ScimUserOperationSchema } from "../types";
import type { IUser } from "@looker/sdk";
import {
  customLookerUserAttSchema,
  updateUserAttributes,
  getUserAttributes,
} from "../shared/userAttributes";
import {
  invalidSyntax,
  userFound,
  resourceNotFound,
} from "../shared/responses";
import { updateUserRecord, getUserRecord } from "../shared/dbFunctions";
import { asyncMiddleware } from "../shared/middleware";
import Logger from "../shared/logger";
import sdk from "../shared/lookerSdk";

const app = express();

export default app
  // https://tools.ietf.org/html/rfc7644#section-3.5.1
  .put(
    "/:id",
    asyncMiddleware(async (req: Request, res: Response) => {
      const { id } = req.params;
      const reqUser: ScimUser = req.body;
      const email = reqUser.emails.filter((e) => e.type === "work")[0].value;
      Logger.info(
        `${req.method} ${req.baseUrl}/${id} Start: ${JSON.stringify(reqUser)}`
      );

      let dbUser = getUserRecord(id);
      if (dbUser === undefined) {
        resourceNotFound(req, res, "User not found in scim db", id);
        return;
      }

      const lookerUser = await sdk.ok(
        sdk.update_user(id, {
          first_name: reqUser.name.givenName,
          last_name: reqUser.name.familyName,
          is_disabled: !reqUser.active,
        })
      );
      Logger.info(`${req.method} ${req.baseUrl}/${id} User updated in looker`);

      if (email !== lookerUser.email) {
        await sdk.ok(
          sdk.update_user_credentials_email(id, { email: email })
        );
        dbUser = updateUserRecord(req, id, "email", email);
        Logger.info(
          `${req.method} ${req.baseUrl}/${id} User email updated in looker`
        );
      }

      if (dbUser.external_id !== reqUser.externalId) {
        dbUser = updateUserRecord(req, id, "external_id", reqUser.externalId);
      }

      if (customLookerUserAttSchema in reqUser) {
        if (
          !(await updateUserAttributes(
            req,
            res,
            sdk,
            id,
            reqUser[customLookerUserAttSchema]!
          ))
        ) {
          return;
        }
      }

      userFound(
        req,
        res,
        `User updated {"externalId":"${dbUser.external_id}", "email":"${email}"}`,
        dbUser,
        lookerUser,
        reqUser[customLookerUserAttSchema]
      );
    })
  )

  // https://tools.ietf.org/html/rfc7644#section-3.5.2
  .patch(
    "/:id",
    asyncMiddleware(async (req: Request, res: Response) => {
      const { id } = req.params;
      const patchBody: ScimUserOperationSchema = req.body;
      Logger.info(
        `${req.method} ${req.baseUrl}/${id} Start ${JSON.stringify(
          patchBody.Operations
        )}`
      );

      let dbUser = getUserRecord(id);
      if (dbUser === undefined) {
        resourceNotFound(req, res, "User not found in scim db", id);
        return;
      }

      const updatedUser: IUser = {};
      let email = "";
      let updatedUAs: {
        [key: string]: any;
      } = {};

      for (const o of patchBody.Operations) {
        if (o.op.toLowerCase() === "replace") {
          switch (o.path) {
            case "active":
              updatedUser.is_disabled = o.value === "True" ? false : true;
              break;
            case "name.givenName":
              updatedUser.first_name = o.value;
              break;
            case "name.familyName":
              updatedUser.last_name = o.value;
              break;
            case "userName":
            case 'emails[type eq "work"].value':
              email = o.value;
              break;
            case "externalId":
              dbUser = updateUserRecord(req, id, "external_id", o.value);
          }
          if (!("path" in o)) {
            const patchValue: any = o.value;
            if ("active" in patchValue) {
              updatedUser.is_disabled = !patchValue.active;
            }
          }
        } else if (o.op.toLowerCase() === "add") {
          switch (o.path) {
            case "name.givenName":
              updatedUser.first_name = o.value;
              break;
            case "name.familyName":
              updatedUser.last_name = o.value;
              break;
          }
          const regex = o.path!.match(customLookerUserAttSchema);
          if (regex !== null) {
            const uaKey = o.path!.substring(
              customLookerUserAttSchema.length + 1
            );
            updatedUAs[uaKey] = o.value;
          }
        } else {
          invalidSyntax(
            req,
            res,
            `The specified filter syntax is not supported: ${JSON.stringify(o)}`
          );
          return;
        }
      }

      const lookerUser = await sdk.ok(
        sdk.update_user(id, {
          ...(updatedUser.first_name && { first_name: updatedUser.first_name }),
          ...(updatedUser.last_name && { last_name: updatedUser.last_name }),
          ...("is_disabled" in updatedUser && {
            is_disabled: updatedUser.is_disabled,
          }),
        })
      );
      Logger.info(`${req.method} ${req.baseUrl}/${id} User updated in looker`);

      if (email !== "") {
        await sdk.ok(
          sdk.update_user_credentials_email(id, { email: email })
        );
        dbUser = updateUserRecord(req, id, "email", email);
        Logger.info(
          `${req.method} ${req.baseUrl}/${id} User email updated in looker`
        );
      } else {
        email = lookerUser.email!;
      }

      if (Object.keys(updatedUAs).length > 0) {
        if (!(await updateUserAttributes(req, res, sdk, id, updatedUAs))) {
          return;
        }
      }

      const userAttributes = await getUserAttributes(sdk, id);

      userFound(
        req,
        res,
        `User updated {"externalId":"${dbUser.external_id}", "email":"${email}"}`,
        dbUser,
        lookerUser,
        userAttributes
      );
    })
  );
