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

import { Users, Schema, ScimUser, ScimErrorSchema } from "../types";
import { customLookerUserAttSchema } from "../shared/userAttributes";
import { IUser } from "@looker/sdk/lib/4.0/models";
import { Request, Response } from "express-serve-static-core/index";
import Logger from "./logger";

// return 200 when resource created or updated
export const userFound = (
  req: Request,
  res: Response,
  message: string,
  dbUser: Users,
  lookerUser: IUser,
  userAttributes:
    | {
        [key: string]: any;
      }
    | undefined
) => {
  const user: ScimUser = {
    schemas: [
      "urn:ietf:params:scim:schemas:core:2.0:User",
      customLookerUserAttSchema,
    ],
    [customLookerUserAttSchema]: userAttributes,
    meta: {
      resourceType: "User",
    },
    id: dbUser.looker_id,
    externalId: dbUser.external_id,
    active: !lookerUser.is_disabled!,
    userName: dbUser.email,
    name: {
      givenName: lookerUser.first_name!,
      familyName: lookerUser.last_name!,
    },
    emails: [
      {
        primary: true,
        value: dbUser.email,
        type: "work",
      },
    ],
  };

  res.status(200).send(user);

  Logger.info(
    `${req.method} ${req.baseUrl}/${dbUser.looker_id} Complete 200: ${message}`
  );
};

// return 400 when specified filter syntax or operation path is not supported
export const invalidSyntax = (req: Request, res: Response, message: string) => {
  const response: ScimErrorSchema = {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
    detail: `${message}`,
    status: 400,
  };
  res.status(400).send(response);

  Logger.error(`${req.method} ${req.baseUrl} Complete 400: ${message}`);
};

// return 404 when specified resource does not exist
export const resourceNotFound = (
  req: Request,
  res: Response,
  message: string,
  id?: string
) => {
  const response: ScimErrorSchema = {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
    detail: message,
    status: 404,
  };
  res.status(404).send(response);

  Logger.error(`${req.method} ${req.baseUrl}/${id} Complete 404: ${message}`);
};

// return 409 when specified resource already exists in scim db or looker
export const resourceAlreadyExists = (
  req: Request,
  res: Response,
  message: string,
  id?: string
) => {
  const response: ScimErrorSchema = {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
    detail: `Resource already exists in the database. ${message}`,
    status: 409,
  };
  res.status(409).send(response);

  Logger.error(`${req.method} ${req.baseUrl}/${id} Complete 409: ${message}`);
};

// return 422 when validation failed
export const validationError = (
  req: Request,
  res: Response,
  message: string,
  id?: string
) => {
  const response: ScimErrorSchema = {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
    detail: `Looker validation error. ${message}`,
    status: 422,
  };
  res.status(422).send(response);

  Logger.error(`${req.method} ${req.baseUrl}/${id} Complete 422: ${message}`);
};

// return 500 for internal server error, 401 for authorization failure
export const genericError = (
  req: Request,
  res: Response,
  message: string,
  statusCode: number
) => {
  const response: ScimErrorSchema = {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
    detail: message,
    status: statusCode,
  };
  res.status(statusCode).send(response);

  Logger.error(
    `${req.method} ${req.baseUrl} Complete ${statusCode}: ${message}`
  );
};
