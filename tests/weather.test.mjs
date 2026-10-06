import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  bn,
  advice,
  forecastUrl,
  weatherLabel,
  validateForecast,
} from "../src/weather.mjs";
const locations = JSON.parse(
  fs.readFileSync(new URL("../src/locations.json", import.meta.url)),
);
const fixture = {
  current: {
    temperature_2m: 31,
    time: "2026-10-06T12:00",
    wind_speed_10m: 23,
    weather_code: 95,
  },
  daily: {
    time: Array(7).fill("2026-10-06"),
    weather_code: Array(7).fill(95),
    temperature_2m_max: Array(7).fill(36),
    temperature_2m_min: Array(7).fill(25),
    precipitation_sum: Array(7).fill(20),
    precipitation_probability_max: Array(7).fill(85),
  },
};
test("all 64 districts have coordinates inside Bangladesh", () => {
  assert.equal(locations.divisions.length, 8);
  assert.equal(locations.districts.length, 64);
  for (const d of locations.districts) {
    assert.ok(locations.divisions.some((v) => v.id === d.division_id));
    assert.doesNotThrow(() => forecastUrl(Number(d.lat), Number(d.lon)));
  }
});
test("upazila and union hierarchy has no orphan records or duplicate IDs", () => {
  for (const [collection, parent, key] of [
    ["upazilas", "districts", "district_id"],
    ["unions", "upazilas", "upazila_id"],
  ]) {
    assert.equal(
      new Set(locations[collection].map((x) => x.id)).size,
      locations[collection].length,
    );
    for (const row of locations[collection]) {
      assert.ok(row.bn_name);
      assert.ok(locations[parent].some((p) => p.id === row[key]));
    }
  }
});
test("forecast request uses Bangladesh timezone and all required measurements", () => {
  const url = new URL(forecastUrl(23.71, 90.41));
  assert.equal(url.searchParams.get("timezone"), "Asia/Dhaka");
  assert.equal(url.searchParams.get("forecast_days"), "7");
  assert.ok(
    url.searchParams.get("daily").includes("precipitation_probability_max"),
  );
  assert.throws(() => forecastUrl(0, 0));
  assert.throws(() => forecastUrl(NaN, 90));
});
test("missing measurements are never displayed as zero", () => {
  assert.equal(bn(null), "—");
  assert.equal(bn(undefined), "—");
  assert.equal(bn(0), "০");
  assert.equal(bn(31), "৩১");
});
test("WMO weather codes distinguish sun, rain, fog and thunderstorm", () => {
  assert.equal(weatherLabel(0), "পরিষ্কার আকাশ");
  assert.equal(weatherLabel(45), "কুয়াশা");
  assert.equal(weatherLabel(61), "বৃষ্টির সম্ভাবনা");
  assert.equal(weatherLabel(95), "বজ্রবৃষ্টি");
  assert.equal(weatherLabel(null), "তথ্য নেই");
});
test("forecast rejects malformed response instead of rendering fabricated data", () => {
  assert.equal(validateForecast(fixture), fixture);
  assert.throws(() => validateForecast({}));
  assert.throws(() =>
    validateForecast({ ...fixture, daily: { ...fixture.daily, time: [] } }),
  );
});
test("rain, heat, wind and thunderstorm trigger relevant Bangla guidance", () => {
  const items = advice(fixture, "ভুট্টা");
  assert.ok(items.some((i) => i.title.includes("বজ্রপাত")));
  assert.ok(items.some((i) => i.body.includes("ভুট্টা")));
  assert.ok(items.some((i) => i.title.includes("তাপ")));
  assert.ok(items.some((i) => i.title.includes("বাতাস")));
});
test("no weather yields no weather-dependent recommendations", () => {
  assert.equal(advice(null).length, 1);
  assert.ok(advice(null)[0].title.includes("পূর্বাভাস"));
});
