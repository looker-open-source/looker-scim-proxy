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
import express from "express";
import Logger from "./shared/logger";
import { CreateUser, UpdateUser, ReadUser, DeleteUser } from "./users";
import { CreateGroup, UpdateGroup, ReadGroup, DeleteGroup } from "./groups";

const app = express();

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

if (!process.env.SCIM_AUTH_SECRET) {
  throw new Error("No SCIM_AUTH_SECRET environment variable set.");
}

app
  .use(express.json({ type: "application/scim+json" }))
  .use("/scim/v2/users", CreateUser, ReadUser, UpdateUser, DeleteUser)
  .use("/scim/v2/groups", CreateGroup, UpdateGroup, ReadGroup, DeleteGroup)
  .listen(port, () => Logger.info(`Scim server starting up on port ${port}`));

app.get("/alive", (req, res) => {
  res.status(200).send("Hello world");
});
