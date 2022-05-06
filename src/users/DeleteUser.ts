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
import { resourceNotFound } from "../shared/responses";
import { deleteUserRecord, getUserRecord } from "../shared/dbFunctions";
import { asyncMiddleware } from "../shared/middleware";
import Logger from "../shared/logger";

const sdk = LookerNodeSDK.init40();
const app = express();

// hard delete user (not used by okta)
// https://tools.ietf.org/html/rfc7644#section-3.6
export default app.delete(
  "/:id",
  asyncMiddleware(async (req: Request, res: Response) => {
    const { id } = req.params;
    Logger.info(`${req.method} ${req.baseUrl}/${id} Start`);

    const dbUser = getUserRecord(id);
    if (dbUser === undefined) {
      resourceNotFound(req, res, "User not found in scim db", id);
      return;
    }

    try {
      await sdk.ok(sdk.delete_user(id));
      Logger.info(`${req.method} ${req.baseUrl}/${id} User deleted in looker`);
    } catch (error) {
      resourceNotFound(req, res, "User not found in looker", id);
      return;
    }

    deleteUserRecord(req, id);
    res.status(204).send();
    Logger.info(
      `${req.method} ${req.baseUrl}/${id} Complete 204: User deleted`
    );
  })
);
