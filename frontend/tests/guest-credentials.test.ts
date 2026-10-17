import assert from "node:assert/strict";
import test from "node:test";
import { readGuestCredentials } from "../src/utils/guest-credentials.ts";

test("short private links accept the existing 43-character URL-safe token", () => {
  const token = "Ab_-" + "x".repeat(39);
  const location = { pathname: "/a", hash: `#${token}` };
  assert.deepEqual(readGuestCredentials(location), { bookingCode: "", token });
  assert.equal(location.hash, `#${token}`);
});

test("raw private tokens are accepted only on the short-link route with the expected format", () => {
  for (const location of [
    { pathname: "/appointment", hash: `#${"x".repeat(43)}` },
    { pathname: "/a", hash: `#${"x".repeat(42)}` },
    { pathname: "/a", hash: `#${"x".repeat(42)}!` },
  ]) assert.deepEqual(readGuestCredentials(location), { bookingCode: "", token: "" });
});

test("legacy private fragments retain booking code and decoded token", () => {
  assert.deepEqual(readGuestCredentials({ pathname: "/manage", hash: "#code=BOOK-123&token=private%2Dtoken" }), {
    bookingCode: "BOOK-123", token: "private-token",
  });
});

test("confirmation references and ordinary anchors do not supply private credentials", () => {
  for (const location of [
    { pathname: "/confirmation/BOOK-123", hash: "" },
    { pathname: "/appointment", hash: "#main" },
  ]) assert.deepEqual(readGuestCredentials(location), { bookingCode: "", token: "" });
});
