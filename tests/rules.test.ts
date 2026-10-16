import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-wo-gehen-wir-hin",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});

afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "sessions/s1"), { createdBy: "anna", status: "open", placeIds: ["p1", "p2"] });
    await setDoc(doc(db, "sessions/s1/members/anna"), { name: "Anna", done: false, removed: false });
    await setDoc(doc(db, "sessions/s1/members/ben"), { name: "Ben", done: false, removed: false });
    await setDoc(doc(db, "sessions/s1/members/eve"), { name: "Eve", done: false, removed: true });
    await setDoc(doc(db, "sessions/s1/votes/ben"), { votes: { p1: true } });
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();

describe("sessions", () => {
  it("Angemeldete mit Link dürfen die Runde lesen", async () => {
    await assertSucceeds(getDoc(doc(as("fremd"), "sessions/s1")));
  });
  it("Nicht angemeldete dürfen nichts lesen", async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "sessions/s1")));
  });
  it("Runden können nicht aufgelistet werden", async () => {
    await assertFails(getDocs(collection(as("anna"), "sessions")));
  });
  it("Clients können Runden nicht verändern", async () => {
    await assertFails(updateDoc(doc(as("anna"), "sessions/s1"), { status: "closed" }));
    await assertFails(setDoc(doc(as("x"), "sessions/neu"), { createdBy: "x" }));
  });
});

describe("members", () => {
  it("Teilnehmende sehen die Teilnehmerliste, Fremde nicht", async () => {
    await assertSucceeds(getDocs(collection(as("anna"), "sessions/s1/members")));
    await assertFails(getDocs(collection(as("fremd"), "sessions/s1/members")));
    await assertFails(getDocs(collection(as("eve"), "sessions/s1/members")));
  });
  it("Man kann nicht selbst beitreten (nur über den Server)", async () => {
    await assertFails(setDoc(doc(as("fremd"), "sessions/s1/members/fremd"), { name: "X", done: false, removed: false }));
  });
  it("Nur der eigene Fertig-Status ist änderbar", async () => {
    await assertSucceeds(updateDoc(doc(as("ben"), "sessions/s1/members/ben"), { done: true }));
    await assertFails(updateDoc(doc(as("ben"), "sessions/s1/members/ben"), { name: "Bob" }));
    await assertFails(updateDoc(doc(as("ben"), "sessions/s1/members/ben"), { removed: true, done: true }));
    await assertFails(updateDoc(doc(as("ben"), "sessions/s1/members/anna"), { done: true }));
  });
});

describe("votes", () => {
  it("Swipes sind privat", async () => {
    await assertSucceeds(getDoc(doc(as("ben"), "sessions/s1/votes/ben")));
    await assertFails(getDoc(doc(as("anna"), "sessions/s1/votes/ben")));
  });
  it("Eigene Swipes auf Orte der Runde sind erlaubt", async () => {
    await assertSucceeds(setDoc(doc(as("anna"), "sessions/s1/votes/anna"), { votes: { p1: true, p2: false } }));
    await assertSucceeds(setDoc(doc(as("ben"), "sessions/s1/votes/ben"), { votes: { p2: false } }, { merge: true }));
  });
  it("Fremde Orte, fremde Swipes und Zusatzfelder sind verboten", async () => {
    await assertFails(setDoc(doc(as("anna"), "sessions/s1/votes/anna"), { votes: { fremd: true } }));
    await assertFails(setDoc(doc(as("anna"), "sessions/s1/votes/ben"), { votes: { p1: false } }));
    await assertFails(setDoc(doc(as("anna"), "sessions/s1/votes/anna"), { votes: {}, extra: 1 }));
  });
  it("Entfernte und Nicht-Teilnehmende dürfen nicht swipen", async () => {
    await assertFails(setDoc(doc(as("eve"), "sessions/s1/votes/eve"), { votes: { p1: true } }));
    await assertFails(setDoc(doc(as("fremd"), "sessions/s1/votes/fremd"), { votes: { p1: true } }));
  });
  it("Nach dem Beenden sind keine Swipes mehr möglich", async () => {
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), "sessions/s1"), { status: "closed" }));
    await assertFails(setDoc(doc(as("anna"), "sessions/s1/votes/anna"), { votes: { p1: true } }));
  });
});
