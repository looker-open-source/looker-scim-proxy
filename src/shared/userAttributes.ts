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

import { Looker40SDK } from "@looker/sdk/lib/4.0/methods";
import { Request, Response } from "express-serve-static-core/index";
import { validationError } from "./responses";
import Logger from "./logger";

// standard naming convention used for custom schemas
export const customLookerUserAttSchema =
  "urn:ietf:params:scim:schemas:extension:LookerUserAttributes:2.0:User";

// UAs supplied in user's external namespace variable on user object as key:value pairs
export const updateUserAttributes = async (
  req: Request,
  res: Response,
  sdk: Looker40SDK,
  userId: string,
  userAttributes: {
    [key: string]: any;
  }
) => {
  Logger.info(
    `${req.method} ${req.baseUrl}/${userId} Checking user attributes`
  );

  // get all user attributes first
  const allUAs = await sdk
    .ok(
      sdk.all_user_attributes({
        fields: "id,name,type,is_system",
        sorts: "name",
      })
    )
    .then((ua) => ua.filter((u) => u.is_system === false));

  // get user attribute user values to know which to skip
  const userUAs = await sdk.ok(
    sdk.user_attribute_user_values({
      user_id: Number(userId),
      fields: "user_attribute_id,name,value,source",
    })
  );

  // set all UAs that are not system
  for (const ua of allUAs) {
    try {
      const userValue = userUAs.filter(
        (uawv) => uawv.user_attribute_id == ua.id
      )[0];

      // ignore if value has not changed
      // purposefully doing type coercion as values returned from API are stored as strings
      if (userAttributes[ua.name!] == userValue.value) {
        continue;
      }

      // if anything is missing, delete the UA value to unset
      if (userAttributes[ua.name!] === undefined) {
        // ignore UA if it's set to default
        if (userValue.source === "Default") {
          continue;
        }

        Logger.info(
          `${req.method} ${req.baseUrl}/${userId} Deleting attribute {"id":"${ua.id}", "name":"${ua.name}"}`
        );
        await sdk.ok(
          sdk.delete_user_attribute_user_value(Number(userId), ua.id!)
        );
        continue;
      }

      Logger.info(
        `${req.method} ${req.baseUrl}/${userId} Setting attribute {"id":"${
          ua.id
        }", "name":"${ua.name}", "value":"${userAttributes[ua.name!]}"}`
      );
      const updatedUA = await sdk.ok(
        sdk.set_user_attribute_user_value(Number(userId), ua.id!, {
          value: userAttributes[ua.name!],
        })
      );
    } catch (error) {
      validationError(
        req,
        res,
        `Invalid user attribute value "${userAttributes[ua.name!]}" for ${
          ua.name
        }. ${error.message}`,
        userId
      );
      return false;
    }
  }

  return true;
};

// return all user setting UAs as key:value pairs
export const getUserAttributes = async (sdk: Looker40SDK, userId: string) => {
  // need to grab all UAs to ensure the value is returned in correct type
  const allUAs = await sdk.ok(
    sdk.all_user_attributes({
      fields: "id,name,type,is_system",
      sorts: "name",
    })
  );

  const userUAs = await sdk
    .ok(
      sdk.user_attribute_user_values({
        user_id: Number(userId),
        fields: "user_attribute_id,name,value,source",
      })
    )
    .then((ua) =>
      ua
        .filter((u) => u.source === "User Setting")
        .map((u) => {
          const type = allUAs.filter((ua) => ua.id === u.user_attribute_id)[0]
            .type;
          const value = type === "number" ? Number(u.value) : u.value;
          return { [u.name!]: value };
        })
    );

  return Object.assign({}, ...userUAs);
};
