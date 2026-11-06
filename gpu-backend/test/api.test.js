const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const { app } = require("../Server");
const User = require("../models/User");
const Listing = require("../models/Listing");
const GraphicsCard = require("../models/GraphicsCard");
const Rating = require("../models/Rating");
const { validImage } = require("../utils/images");
const id = new mongoose.Types.ObjectId();
const listingId = new mongoose.Types.ObjectId();
const sellerId = new mongoose.Types.ObjectId();
const user = { _id: id, username: "buyer", email: "private@example.com", tokenVersion: 0 };
let server, base;
const originals = [];
function stub(object, key, value) { originals.push([object, key, object[key]]); object[key] = value; }
function restore() { while (originals.length) { const [obj, key, value] = originals.pop(); obj[key] = value; } }
before(async () => {
  process.env.JWT_SECRET = "test-only-secret";
  server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());
async function request(path, { method = "GET", body, auth = true, version = 0 } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = `Bearer ${jwt.sign({ sub: id.toString(), version }, process.env.JWT_SECRET)}`;
  const response = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
test("marketplace API authorization and validation", async t => {
  stub(User, "findById", async () => user);
  try {
    await t.test("requires login", async () => assert.equal((await request("/api/listings", { auth: false })).status, 401));
    await t.test("revokes old sessions after reset", async () => assert.equal((await request("/api/profile", { version: 1 })).status, 401));
    await t.test("rejects invalid listing IDs", async () => assert.equal((await request("/api/listings/nope")).status, 400));
    await t.test("search escapes regex and limits results to active listings", async () => {
      let cardFilter, listingFilter;
      stub(GraphicsCard, "find", filter => {
        if (filter.modelName) cardFilter = filter;
        const result = Promise.resolve([]); result.select = async () => [{ _id: sellerId }]; return result;
      });
      stub(Listing, "find", filter => {
        listingFilter = filter;
        return { sort: () => ({ skip: () => ({ limit: async n => { assert.equal(n, 24); return []; } }) }) };
      });
      assert.equal((await request("/api/listings?model=RTX%20.*")).status, 200);
      assert.equal(cardFilter.modelName.$regex, "RTX \\.\\*");
      assert.equal(listingFilter.status, "active");
      await request("/api/listings?mine=true");
      assert.equal(listingFilter.sellerId, id);
    });
    await t.test("rejects mass assignment and invalid public email", async () => {
      let changes;
      stub(User, "findByIdAndUpdate", async (_, update) => { changes = update.$set; return user; });
      stub(Rating, "aggregate", async () => []);
      assert.equal((await request("/api/profile", { method: "PATCH", body: { isAdmin: true, email: "hijack@example.com", bio: "hello" } })).status, 200);
      assert.deepEqual(changes, { bio: "hello" });
      assert.equal((await request("/api/profile", { method: "PATCH", body: { contactEmail: "bad" } })).status, 400);
    });
    await t.test("only owner can mark sold", async () => {
      stub(Listing, "findOneAndUpdate", async filter => { assert.equal(filter.sellerId, id); return null; });
      assert.equal((await request(`/api/listings/${listingId}/status`, { method: "PATCH", body: { status: "sold" } })).status, 404);
      assert.equal((await request(`/api/listings/${listingId}/status`, { method: "PATCH", body: { status: "deleted" } })).status, 400);
    });
    await t.test("rating validation, self-rating, and duplicates", async () => {
      assert.equal((await request(`/api/listings/${listingId}/rating`, { method: "POST", body: { score: 2.5 } })).status, 400);
      stub(Listing, "findById", async () => ({ _id: listingId, sellerId: id }));
      assert.equal((await request(`/api/listings/${listingId}/rating`, { method: "POST", body: { score: 5 } })).status, 403);
      stub(Listing, "findById", async () => ({ _id: listingId, sellerId }));
      stub(Rating, "create", async () => { throw { code: 11000 }; });
      assert.equal((await request(`/api/listings/${listingId}/rating`, { method: "POST", body: { score: 5 } })).status, 409);
      assert.ok(Rating.schema.indexes().some(([keys, opts]) => keys.listingId && keys.reviewerId && opts.unique));
    });
    await t.test("uploaded photo validation", () => {
      assert.equal(validImage("javascript:alert(1)"), false);
      assert.equal(validImage("data:image/svg+xml;base64,PHN2Zz4="), false);
      assert.equal(validImage("data:image/png;base64,YmFk"), false);
      assert.equal(validImage("https://example.com/card.png"), true);
      assert.equal(validImage("data:image/png;base64,iVBORw0KGgo="), true);
    });
  } finally { restore(); }
});
test("password reset sends link, stores only hash, and atomically consumes token", async () => {
  process.env.RESEND_API_KEY = "test";
  process.env.RESET_EMAIL_FROM = "test@example.com";
  process.env.FRONTEND_URL = "https://market.example.com";
  const realFetch = global.fetch;
  let stored, mail, consumed;
  stub(User, "findOne", async () => user);
  stub(User, "updateOne", async (_, update) => { stored = update.$set; });
  stub(global, "fetch", async (url, options) => {
    if (url === "https://api.resend.com/emails") { mail = JSON.parse(options.body); return { ok: true }; }
    return realFetch(url, options);
  });
  stub(User, "findOneAndUpdate", async (filter, update) => {
    assert.equal(filter.resetTokenHash, stored.resetTokenHash);
    assert.ok(filter.resetTokenExpires.$gt instanceof Date);
    assert.equal(update.$inc.tokenVersion, 1);
    assert.deepEqual(update.$unset, { resetTokenHash: 1, resetTokenExpires: 1 });
    assert.ok(await bcrypt.compare("new-password", update.$set.passwordHash));
    if (consumed) return null;
    consumed = true; return user;
  });
  try {
    const result = await request("/api/password/forgot", { auth: false, method: "POST", body: { email: user.email } });
    assert.equal(result.status, 200);
    assert.equal(result.data.token, undefined);
    const link = mail.text.match(/https:\/\/\S+/)[0];
    const token = new URL(link).searchParams.get("token");
    assert.equal(stored.resetTokenHash, crypto.createHash("sha256").update(token).digest("hex"));
    const body = { token, password: "new-password" };
    assert.equal((await request("/api/password/reset", { auth: false, method: "POST", body })).status, 200);
    assert.equal((await request("/api/password/reset", { auth: false, method: "POST", body })).status, 400);
    stub(User, "findOne", async () => null);
    const unknown = await request("/api/password/forgot", { auth: false, method: "POST", body: { email: "unknown@example.com" } });
    assert.deepEqual(unknown, result);
  } finally { restore(); }
});
