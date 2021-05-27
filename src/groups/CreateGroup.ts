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
import { resourceAlreadyExists } from "../shared/responses";
import { asyncMiddleware } from "../shared/middleware";
import Logger from "../shared/logger";

const sdk = LookerNodeSDK.init40();
const app = express();

// https://tools.ietf.org/html/rfc7644#section-3.3
export default app.post(
  "/",
  asyncMiddleware(async (req: Request, res: Response) => {
    const reqGroup: ScimGroup = req.body;
    Logger.info(
      `${req.method} ${req.baseUrl} Start {"displayName":"${reqGroup.displayName}"}`
    );

    // search for group via name
    const lookerGroup = await sdk
      .ok(sdk.search_groups({ name: reqGroup.displayName }))
      .then((g) => g[0]);
    let lookerGroupId = lookerGroup ? String(lookerGroup.id) : "";

    // if group found in looker then return 409
    if (lookerGroup !== undefined) {
      resourceAlreadyExists(
        req,
        res,
        `Resource group record in looker {"id":"${lookerGroupId}", "externalId":"${reqGroup.externalId}", "displayName":"${reqGroup.displayName}"}`
      );
      return;

      // else create group in looker
    } else {
      const newGroup = await sdk.ok(
        sdk.create_group({ name: reqGroup.displayName })
      );
      lookerGroupId = String(newGroup.id);
    }

    // respond 201 with group with looker id
    reqGroup.id = lookerGroupId;
    res.status(201).send(reqGroup);
    Logger.info(
      `${req.method} ${req.baseUrl} Complete 201: Group created in looker {"id":"${lookerGroupId}", "externalId":"${reqGroup.externalId}", "displayName":"${reqGroup.displayName}"}`
    );
  })
);
