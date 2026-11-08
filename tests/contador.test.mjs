import { test } from "node:test";
import assert from "node:assert/strict";
import { porContar, contar, EVENTOS } from "../src/logic/contador.js";

const base = { desde: "2026-11-01", hoy: "2026-11-02" };

test("cada cosa se cuenta una sola vez", () => {
  assert.deepEqual(porContar({ ...base, anoto: false, instalada: false }), ["abrio"]);
  assert.deepEqual(porContar({ ...base, hechos: ["abrio"], anoto: true, instalada: false }), ["anoto"]);
  assert.deepEqual(porContar({ ...base, hechos: ["abrio", "anoto"], anoto: true, instalada: true }), ["instalada"]);
  assert.deepEqual(porContar({ ...base, hechos: EVENTOS, anoto: true, instalada: true }), []);
});

test("a la semana y al mes se cuenta solo si la persona volvió", () => {
  assert.ok(!porContar({ desde: "2026-11-01", hoy: "2026-11-07" }).includes("semana"));
  assert.ok(porContar({ desde: "2026-11-01", hoy: "2026-11-08" }).includes("semana"));
  assert.ok(!porContar({ desde: "2026-11-01", hoy: "2026-11-30" }).includes("mes"));
  assert.ok(porContar({ desde: "2026-11-01", hoy: "2026-12-01" }).includes("mes"));
});

test("no manda nada más que el nombre de lo que se cuenta", async () => {
  let cuerpo = "";
  await contar("abrio", async (u, o) => { cuerpo = o.body; assert.ok(!("Authorization" in o.headers)); return { ok: true }; });
  assert.deepEqual(JSON.parse(cuerpo), { ev: "abrio" });
});
