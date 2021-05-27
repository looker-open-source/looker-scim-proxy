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
import { ScimGroup } from "../types";
import { resourceNotFound } from "../shared/responses";
import { asyncMiddleware } from "../shared/middleware";
import Logger from "../shared/logger";

const sdk = LookerNodeSDK.init40();
const app = express();

export default app
  // https://tools.ietf.org/html/rfc7644#section-3.4.2
  // search for groups with filter on displayName and pagination
  .get(
    "/",
    asyncMiddleware(async (req: Request, res: Response) => {
      const filter = req.query.filter;
      let groupName = "%";
      const count = Number(req.query.count) || 100;
      const startIndex = Number(req.query.startIndex) || 1;
      Logger.info(
        `${req.method} ${req.baseUrl} Start {"filter":"${filter}", "count":${count}, "startIndex":${startIndex}}`
      );

      // currently only set up with `eq` operater with `displayName` (group name)
      // https://docs.microsoft.com/en-us/azure/active-directory/app-provisioning/use-scim-to-provision-users-and-groups#get-group-by-displayname
      if (filter !== undefined) {
        const regex = String(filter).match(/displayName eq "(.*)"/);
        if (regex !== null) {
          groupName = regex[1];
          Logger.info(
            `${req.method} ${req.baseUrl} Searching for group: "${groupName}"`
          );
        } else {
          resourceNotFound(
            req,
            res,
            `Unsupported filter parameter: "${filter}"`
          );
          return;
        }
      }

      const groups = await sdk.ok(
        sdk.search_groups({
          sorts: "id",
          fields: "id,name",
          limit: count,
          offset: startIndex - 1,
          name: groupName,
        })
      );

      const cleanedGroups: ScimGroup[] = groups.map((g) => {
        return {
          schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"],
          displayName: g.name!,
          id: String(g.id),
          members: null,
          meta: {
            resourceType: "Group",
          },
        };
      });

      const listResponse = {
        schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
        totalResults:
          cleanedGroups.length === count
            ? count + startIndex
            : cleanedGroups.length, // assume more resources could exist
        Resources: cleanedGroups,
        startIndex: startIndex,
        itemsPerPage: count,
      };

      res.status(200).send(listResponse);

      Logger.info(
        `${req.method} ${
          req.baseUrl
        } Complete 200: Groups found {"ids": [${cleanedGroups.map(
          (g) => g.id
        )}]}`
      );
    })
  )

  // https://tools.ietf.org/html/rfc7644#section-3.4.1
  // get group by looker id
  .get(
    "/:id",
    asyncMiddleware(async (req: Request, res: Response) => {
      const { id } = req.params;
      Logger.info(`${req.method} ${req.baseUrl}/${id} Start`);

      try {
        const lookerGroup = await sdk.ok(sdk.group(Number(id)));

        const cleanedGroup = {
          schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"],
          displayName: lookerGroup.name!,
          id: String(lookerGroup.id),
          members: null,
          meta: {
            resourceType: "Group",
          },
        };

        res.status(200).send(cleanedGroup);

        Logger.info(
          `${req.method} ${req.baseUrl}/${id} Complete 200: Group found {"id":"${id}", "displayName":"${lookerGroup.name}"}`
        );
      } catch (error) {
        resourceNotFound(req, res, "Group not found in looker", id);
        return;
      }
    })
  );
