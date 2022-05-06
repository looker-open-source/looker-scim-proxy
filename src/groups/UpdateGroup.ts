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
import { ScimGroup, ScimGroupOperationSchema } from "../types";
import { invalidSyntax, validationError } from "../shared/responses";
import { asyncMiddleware } from "../shared/middleware";
import Logger from "../shared/logger";

const sdk = LookerNodeSDK.init40();
const app = express();

// Okta new custom integrations from App Integration Wizard (AIW) will use PUT request
// Okta pre-built templates integrations from Okta Integration Network (OIN) will use PATCH request

export default app
  // update group object (displayName and/or members)
  // https://tools.ietf.org/html/rfc7644#section-3.5.1
  .put(
    "/:id",
    asyncMiddleware(async (req: Request, res: Response) => {
      const { id } = req.params;
      const group: ScimGroup = req.body;
      Logger.info(
        `${req.method} ${req.baseUrl}/${id} Start ${JSON.stringify(group)}`
      );

      if (!(await updateGroupName(req, res, id, group.displayName))) {
        return;
      }

      if (!(await updateGroupMembers(req, res, id, group.members!))) {
        return;
      }

      // if everything works, return 200 response with group object
      res.status(200).send(group);
      Logger.info(
        `${req.method} ${req.baseUrl}/${id} Complete 200: Group updated`
      );
    })
  )

  // update group object using a sequence operation values: "add", "remove", or "replace"
  // options: (displayName: [replace], members: [add, remove, replace])
  // https://tools.ietf.org/html/rfc7644#section-3.5.2
  .patch(
    "/:id",
    asyncMiddleware(async (req: Request, res: Response) => {
      const { id } = req.params;
      const patchBody: ScimGroupOperationSchema = req.body;
      Logger.info(
        `${req.method} ${req.baseUrl}/${id} Start ${JSON.stringify(
          patchBody.Operations
        )}`
      );

      for (const o of patchBody.Operations) {
        if (o.path === "externalId") {
          // todo - add/remove/update record in group db table
          continue;
        }
        switch (o.op.toLowerCase()) {
          case "add": // members only (add and remove flows are the same)
          case "remove":
            const action = o.op.toLowerCase();
            if (o.value === undefined) {
              const regex = o.path!.match(/members\[value eq "(.*)"/);
              if (regex !== null) {
                const userId = regex[1];
                action === "add"
                  ? addUserGroup(req, userId, id)
                  : removeUserGroup(req, userId, id);
              } else {
                invalidSyntax(
                  req,
                  res,
                  `The specified path is not supported: ${JSON.stringify(o)}`
                );
                return;
              }
            } else if (Array.isArray(o.value)) {
              try {
                const groupMemberPromises = await Promise.all(
                  o.value.map(async (u: any) => {
                    return action === "add"
                      ? addUserGroup(req, u.value, id)
                      : removeUserGroup(req, u.value, id);
                  })
                );
              } catch (error) {
                validationError(req, res, error.message, id);
                return;
              }
            } else {
              invalidSyntax(
                req,
                res,
                `The specified value is not supported: ${JSON.stringify(o)}`
              );
              return;
            }

            break;
          case "replace": // members or displayName
            if (o.path === "displayName") {
              if (!(await updateGroupName(req, res, id, o.value))) {
                return;
              }
            } else if (o.path === "members" && Array.isArray(o.value)) {
              if (!(await updateGroupMembers(req, res, id, o.value))) {
                return;
              }
            } else if (
              o.path === undefined &&
              o.value.displayName !== undefined
            ) {
              if (!(await updateGroupName(req, res, id, o.value.displayName))) {
                return;
              }
            } else {
              invalidSyntax(
                req,
                res,
                `The specified path is not supported: ${JSON.stringify(o)}`
              );
              return;
            }

            break;
        }
      }

      // if everything works, return 204 response with no body
      res.status(204).send();
      Logger.info(
        `${req.method} ${req.baseUrl}/${id} Complete 204: Group updated`
      );
    })
  );

const updateGroupName = async (
  req: Request,
  res: Response,
  id: string,
  groupName: string
) => {
  try {
    const updatedGroup = await sdk.ok(
      sdk.update_group(id, { name: groupName })
    );
    Logger.info(
      `${req.method} ${req.baseUrl}/${id} Updated displayName to: "${groupName}"`
    );
    return true;
  } catch (error) {
    validationError(req, res, error.message, id);
    return false;
  }
};

// remove user from a group
const removeUserGroup = async (
  req: Request,
  userId: string,
  groupId: string
) => {
  const oldMember = sdk.ok(sdk.delete_group_user(groupId, userId));
  Logger.info(
    `${req.method} ${req.baseUrl}/${groupId} Removed member: "${userId}"`
  );
  return oldMember;
};

// add user to a group
const addUserGroup = async (req: Request, userId: string, groupId: string) => {
  const newMember = sdk.ok(sdk.add_group_user(groupId, { user_id: userId }));
  Logger.info(
    `${req.method} ${req.baseUrl}/${groupId} Added member: "${userId}"`
  );
  return newMember;
};

// replace all members of group (remove all existing users and add new users)
const updateGroupMembers = async (
  req: Request,
  res: Response,
  id: string,
  newUsers: any[]
) => {
  try {
    const oldGroupMembers = await sdk.ok(
      sdk.all_group_users({
        group_id: id,
        fields: "id,email",
      })
    );

    const oldGroupMemberPromises = await Promise.all(
      oldGroupMembers.map(async (u) => {
        return removeUserGroup(req, u.id!, id);
      })
    ).then(async () => {
      const newGroupMemberPromises = await Promise.all(
        newUsers.map(async (u: any) => {
          return addUserGroup(req, u.value, id);
        })
      );
    });
    return true;
  } catch (error) {
    validationError(req, res, error.message, id);
    return false;
  }
};
