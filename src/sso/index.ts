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
import { asyncMiddleware } from "../shared/middleware";
import Logger from "../shared/logger";
import sdk from "../shared/lookerSdk";

const app = express();

export default app
  .get(
    "/saml",
    asyncMiddleware(async (req: Request, res: Response) => {
      Logger.info(`${req.method} ${req.baseUrl}/saml Start`);

      const samlConfig = await sdk.ok(sdk.saml_config());

      const response = {
        enabled: samlConfig.enabled,
        idp_url: samlConfig.idp_url,
        idp_issuer: samlConfig.idp_issuer,
        idp_audience: samlConfig.idp_audience,
        allowed_clock_drift: samlConfig.allowed_clock_drift,
        user_attribute_map_email: samlConfig.user_attribute_map_email,
        user_attribute_map_first_name: samlConfig.user_attribute_map_first_name,
        user_attribute_map_last_name: samlConfig.user_attribute_map_last_name,
        new_user_migration_types: samlConfig.new_user_migration_types,
        alternate_email_login_allowed: samlConfig.alternate_email_login_allowed,
        set_roles_from_groups: samlConfig.set_roles_from_groups,
        groups_attribute: samlConfig.groups_attribute,
        bypass_login_page: samlConfig.bypass_login_page,
        allow_normal_group_membership:
          samlConfig.allow_normal_group_membership,
        allow_roles_from_normal_groups:
          samlConfig.allow_roles_from_normal_groups,
        allow_direct_roles: samlConfig.allow_direct_roles,
        default_new_user_role_ids: samlConfig.default_new_user_role_ids,
        default_new_user_group_ids: samlConfig.default_new_user_group_ids,
        groups: samlConfig.groups,
        modified_at: samlConfig.modified_at,
        modified_by: samlConfig.modified_by,
      };

      res.status(200).send(response);
      Logger.info(
        `${req.method} ${req.baseUrl}/saml Complete 200: SAML config retrieved (enabled: ${samlConfig.enabled})`
      );
    })
  )

  .get(
    "/oidc",
    asyncMiddleware(async (req: Request, res: Response) => {
      Logger.info(`${req.method} ${req.baseUrl}/oidc Start`);

      const oidcConfig = await sdk.ok(sdk.oidc_config());

      const response = {
        enabled: oidcConfig.enabled,
        issuer: oidcConfig.issuer,
        audience: oidcConfig.audience,
        identifier: oidcConfig.identifier,
        secret: undefined,
        scopes: oidcConfig.scopes,
        user_attribute_map_email: oidcConfig.user_attribute_map_email,
        user_attribute_map_first_name: oidcConfig.user_attribute_map_first_name,
        user_attribute_map_last_name: oidcConfig.user_attribute_map_last_name,
        new_user_migration_types: oidcConfig.new_user_migration_types,
        alternate_email_login_allowed: oidcConfig.alternate_email_login_allowed,
        set_roles_from_groups: oidcConfig.set_roles_from_groups,
        groups_attribute: oidcConfig.groups_attribute,
        bypass_login_page: (oidcConfig as any).bypass_login_page,
        allow_normal_group_membership:
          oidcConfig.allow_normal_group_membership,
        allow_roles_from_normal_groups:
          oidcConfig.allow_roles_from_normal_groups,
        allow_direct_roles: oidcConfig.allow_direct_roles,
        default_new_user_role_ids: oidcConfig.default_new_user_role_ids,
        default_new_user_group_ids: oidcConfig.default_new_user_group_ids,
        groups: oidcConfig.groups,
        modified_at: oidcConfig.modified_at,
        modified_by: oidcConfig.modified_by,
      };

      res.status(200).send(response);
      Logger.info(
        `${req.method} ${req.baseUrl}/oidc Complete 200: OIDC config retrieved (enabled: ${oidcConfig.enabled})`
      );
    })
  )

  .get(
    "/session",
    asyncMiddleware(async (req: Request, res: Response) => {
      Logger.info(`${req.method} ${req.baseUrl}/session Start`);

      const sessionConfig = await sdk.ok(sdk.session_config());

      res.status(200).send(sessionConfig);
      Logger.info(
        `${req.method} ${req.baseUrl}/session Complete 200: Session config retrieved`
      );
    })
  );
