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

require("dotenv").config();
import { LookerNodeSDK } from "@looker/sdk-node";

// Map LOOKER_* env vars (as used in Cursor mcp.json / toolbox) to the
// LOOKERSDK_* format expected by the Looker Node SDK.
const envMap: Record<string, string> = {
  LOOKER_BASE_URL: "LOOKERSDK_BASE_URL",
  LOOKER_CLIENT_ID: "LOOKERSDK_CLIENT_ID",
  LOOKER_CLIENT_SECRET: "LOOKERSDK_CLIENT_SECRET",
  LOOKER_VERIFY_SSL: "LOOKERSDK_VERIFY_SSL",
};

for (const [src, dest] of Object.entries(envMap)) {
  if (process.env[src] && !process.env[dest]) {
    process.env[dest] = process.env[src];
  }
}

const sdk = LookerNodeSDK.init40();

export default sdk;
