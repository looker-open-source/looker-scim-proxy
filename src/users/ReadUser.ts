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
import { ScimUser } from "../types";
import type { IUser } from "@looker/sdk";
import { getUserAttributes } from "../shared/userAttributes";
import { userFound, resourceNotFound } from "../shared/responses";
import { getUserRecord } from "../shared/dbFunctions";
import { asyncMiddleware } from "../shared/middleware";
import Logger from "../shared/logger";
import sdk from "../shared/lookerSdk";

const app = express();

export default app
  // https://tools.ietf.org/html/rfc7644#section-3.4.2
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
          const dbUser = getUserRecord(u.id!);
          const externalId = dbUser ? dbUser.external_id : "";

          return {
            schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
            meta: {
              resourceType: "User",
            },
            id: u.id,
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
        .filter((u) => u.externalId);

      const listResponse = {
        schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
        totalResults:
          users.length === count ? count * page + 1 : cleanedUsers.length,
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
        lookerUser = await sdk.ok(sdk.user(id));
      } catch (error) {
        resourceNotFound(req, res, "User not found in looker", id);
        return;
      }

      const userAttributes = await getUserAttributes(sdk, id);

      userFound(
        req,
        res,
        `User found {"externalId":"${dbUser.external_id}", "email":"${lookerUser.email}"}`,
        dbUser,
        lookerUser,
        userAttributes
      );
    })
  );
