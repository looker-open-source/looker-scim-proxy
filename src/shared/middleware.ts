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

import { genericError } from "../shared/responses";
import * as AuthUtils from "./auth_token_utils"
import { Request, Response, NextFunction } from "express-serve-static-core/index";

// middleware for all routes. handles generic errors and auth
export function asyncMiddleware(fn: (req: Request, res: Response, next: NextFunction) => void) {
  return function(req: Request, res: Response, next: NextFunction) {
    const { authorization } = req.headers;
    if (!authorization) {
      genericError(req, res, "Must send authorization header", 401);
      return;
    }

    const [authType, token] = authorization.trim().split(" ");
    if (authType !== "Bearer") {
      genericError(req, res, "Expected a bearer token", 401);
      return;
    }

    if (!AuthUtils.isValidToken(token)) {
      genericError(req, res, "Invalid auth token", 401);
      return;
    }

    // return internal server error if any uncaught errors happen inside routes
    Promise.resolve(fn(req, res, next)).catch((err: Error) => {
      const msg = `Internal Server Error. ${err.toString()}`
      genericError(req, res, msg, 500)
    })
  }
};
