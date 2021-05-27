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
import { IUser } from "@looker/sdk/lib/4.0/models";
import { userFound, resourceNotFound } from "../shared/responses";
import { getUserRecord } from "../shared/dbFunctions";
import { asyncMiddleware } from "../shared/middleware";
import Logger from "../shared/logger";

const sdk = LookerNodeSDK.init40();
const app = express();

export default app
  // https://tools.ietf.org/html/rfc7644#section-3.4.2
  // search for users with filter on userName and pagination
  .get(
    "/",
    asyncMiddleware(async (req: Request, res: Response) => {
      const filter = req.query.filter;
      let userName = "%";
      const count = Number(req.query.count) || 100;
      const startIndex = Number(req.query.startIndex) || 1;
      const page = Math.ceil(startIndex / count);
      Logger.info(
        `${req.method} ${req.baseUrl} Start {"filter":"${filter}", "count":${count}, "startIndex":${startIndex}, "page":${page}}`
      );

      // currently only set up with `eq` operater with `userName` (looker email)
      // https://developer.okta.com/docs/reference/scim/scim-20/#determine-if-the-user-already-exists
      if (filter !== undefined) {
        const regex = String(filter).match(/userName eq "(.*)"/);
        if (regex !== null) {
          userName = regex[1];
          Logger.info(
            `${req.method} ${req.baseUrl} Searching for user: ${userName}`
          );
        } else {
          resourceNotFound(req, res, `Unsupported filter parameter: ${filter}`);
          return;
        }
      }

      const users = await sdk.ok(
        sdk.search_users({
          sorts: "id",
          fields: "id,email,is_disabled,first_name,last_name",
          per_page: count,
          page: page,
          email: userName,
        })
      );

      const cleanedUsers: ScimUser[] = users
        .map((u) => {
          const dbUser = getUserRecord(String(u.id));
          const externalId = dbUser ? dbUser.external_id : "";

          return {
            schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
            meta: {
              resourceType: "User",
            },
            id: String(u.id),
            externalId: externalId,
            active: !u.is_disabled!,
            userName: u.email!,
            name: {
              givenName: u.first_name!,
              familyName: u.last_name!,
            },
            emails: [
              {
                primary: true,
                value: u.email!,
                type: "work",
              },
            ],
          };
        })
        .filter((u) => u.externalId); // only return users that are in scim db

      const listResponse = {
        schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
        totalResults:
          users.length === count ? count * page + 1 : cleanedUsers.length, // assume more resources could exist
        Resources: cleanedUsers,
        startIndex: startIndex,
        itemsPerPage: count,
      };

      res.status(200).send(listResponse);

      Logger.info(
        `${req.method} ${
          req.baseUrl
        } Complete 200: Users found {"ids": [${cleanedUsers.map((u) => u.id)}]}`
      );
    })
  )

  // https://tools.ietf.org/html/rfc7644#section-3.4.1
  // get user by looker id
  .get(
    "/:id",
    asyncMiddleware(async (req: Request, res: Response) => {
      const { id } = req.params;
      Logger.info(`${req.method} ${req.baseUrl}/${id} Start`);

      const dbUser = getUserRecord(id);
      if (dbUser === undefined) {
        resourceNotFound(req, res, "User not found in scim db", id);
        return;
      }

      let lookerUser: IUser = {};

      try {
        lookerUser = await sdk.ok(sdk.user(Number(id)));
      } catch (error) {
        resourceNotFound(req, res, "User not found in looker", id);
        return;
      }

      userFound(
        req,
        res,
        `User found {"externalId":"${dbUser.external_id}", "email":"${lookerUser.email}"}`,
        dbUser,
        lookerUser
      );
    })
  );
