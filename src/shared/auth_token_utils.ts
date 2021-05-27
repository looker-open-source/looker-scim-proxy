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

import * as crypto from "crypto";

function getDigest(nonce: string) {
  const secretKey = process.env.SCIM_AUTH_SECRET!.toString();
  return crypto
    .createHmac("sha512", secretKey, { encoding: "hex" })
    .update(nonce, "hex")
    .digest("hex");
}

export function makeToken() {
  const nonce = crypto.randomBytes(32).toString("hex");
  const digest = getDigest(nonce);

  return `${nonce}/${digest}`;
}

export function isValidToken(token: string) {
  const [givenNonce, givenDigest] = token.split("/");
  if (!givenNonce || !givenDigest) {
    return false;
  }
  const computedDigest = getDigest(givenNonce);
  const given = Buffer.from(givenDigest);
  const expected = Buffer.from(computedDigest);

  return (
    given.length === expected.length && crypto.timingSafeEqual(given, expected)
  );
}
