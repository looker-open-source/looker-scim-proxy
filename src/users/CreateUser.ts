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
import { LookerNodeSDK } from "@looker/sdk-node/lib/nodeSdk";
import { Request, Response } from "express-serve-static-core/index";
import { Schema, ScimUser } from "../types";
import {
  customLookerUserAttSchema,
  updateUserAttributes,
} from "../shared/userAttributes";
import { resourceAlreadyExists } from "../shared/responses";
import { insertUserRecord, getUserRecordByEmail } from "../shared/dbFunctions";
import { asyncMiddleware } from "../shared/middleware";
import Logger from "../shared/logger";

const sdk = LookerNodeSDK.init40();
const app = express();

// https://tools.ietf.org/html/rfc7644#section-3.3
export default app.post(
  "/",
  asyncMiddleware(async (req: Request, res: Response) => {
    const reqUser: ScimUser = req.body;
    const email = reqUser.emails.filter((e) => e.type === "work")[0].value;
    Logger.info(
      `${req.method} ${req.baseUrl} Start: ${JSON.stringify(reqUser)}`
    );

    // lookup user in DB via externalId and email
    const dbUser = await getUserRecordByEmail(email, reqUser.externalId);

    // if user is in DB then respond 409
    if (dbUser !== undefined) {
      resourceAlreadyExists(
        req,
        res,
        `Resource user record in scim db {"externalId":"${dbUser.external_id}", "email":"${dbUser.email}"}`
      );
      return;
    }

    // otherwise, search for user via email
    const lookerUser = await sdk
      .ok(sdk.search_users({ email: email }))
      .then((u) => u[0]);
    let lookerUserId = lookerUser ? lookerUser.id : "";

    // if user found in looker then write user to DB and return 409
    if (lookerUser !== undefined) {
      await insertUserRecord(
        req,
        lookerUserId!,
        reqUser.externalId!,
        email
      ).then(() => {
        resourceAlreadyExists(
          req,
          res,
          `Resource user record in looker {"id":"${lookerUserId}", "externalId":"${reqUser.externalId}", "email":"${email}"}`
        );
      });
      return;

      // else create user in looker
    } else {
      const newUser = await sdk.ok(
        sdk.create_user({
          first_name: reqUser.name.givenName,
          last_name: reqUser.name.familyName,
        })
      );
      lookerUserId = newUser.id;

      const newUserWithEmail = await sdk
        .ok(
          sdk.create_user_credentials_email(newUser.id!, {
            email: email,
          })
        )
        .then(() => {
          Logger.info(
            `${req.method} ${req.baseUrl} Looker user created {"id":"${lookerUserId}", "externalId":"${reqUser.externalId}", "email":"${email}"}`
          );
        })
        .catch((error) => {
          resourceAlreadyExists(
            req,
            res,
            `Unable to set email credentials {"id":"${lookerUserId}", "externalId":"${reqUser.externalId}", "email":"${email}"}`
          );
          Logger.error(error.message);
          return;
        });

      // if user attributes in schema, set all UAs
      if (customLookerUserAttSchema in reqUser) {
        if (
          !(await updateUserAttributes(
            req,
            res,
            sdk,
            lookerUserId!,
            reqUser[customLookerUserAttSchema]!
          ))
        ) {
          return;
        }
      }
    }

    // write user to DB and respond 201
    await insertUserRecord(req, lookerUserId!, reqUser.externalId!, email).then(
      () => {
        reqUser.id = lookerUserId;
        res.status(201).send(reqUser);

        Logger.info(
          `${req.method} ${req.baseUrl} Complete 201: User created in looker and scim db {"id":"${lookerUserId}", "externalId":"${reqUser.externalId}", "email":"${email}"}`
        );
      }
    );
  })
);
