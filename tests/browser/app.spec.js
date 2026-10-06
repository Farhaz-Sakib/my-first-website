import { test, expect } from "@playwright/test";
const fixture = {
  current: {
    time: "2026-10-06T12:00",
    temperature_2m: 31,
    apparent_temperature: 34,
    relative_humidity_2m: 78,
    wind_speed_10m: 23,
    weather_code: 95,
  },
  daily: {
    time: [
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
      "2026-10-12",
    ],
    weather_code: [95, 61, 3, 0, 3, 61, 0],
    temperature_2m_max: [36, 32, 33, 34, 32, 31, 33],
    temperature_2m_min: [25, 26, 25, 26, 25, 24, 25],
    precipitation_sum: [20, 8, 0, 0, 0, 6, 0],
    precipitation_probability_max: [85, 65, 10, 0, 15, 60, 0],
  },
};
async function mock(page) {
  await page.route("https://api.open-meteo.com/**", (route) =>
    route.fulfill({ json: fixture }),
  );
}
test("Bangla forecast, crop advice and responsive layout", async ({
  page,
}, info) => {
  await mock(page);
  await page.goto("/");
  await expect(page.locator(".temperature")).toContainText("৩১");
  await expect(page.locator(".forecast-day")).toHaveCount(7);
  await expect(page.getByText("বজ্রপাতের সময় নিরাপদ থাকুন")).toBeVisible();
  await page
    .getByRole("combobox", { name: "ফসল নির্বাচন" })
    .selectOption("ভুট্টা");
  await expect(page.getByText(/ভুট্টা ক্ষেতে/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/krishi-${info.project.name}.png`,
    fullPage: true,
  });
});
test("location cascade resets children and persists chosen district", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/");
  const selects = page.locator(".location-fields select");
  await selects.nth(0).selectOption("1");
  await expect(selects.nth(1).locator("option")).toHaveCount(11);
  await selects.nth(1).selectOption("1");
  await selects.nth(2).selectOption("1");
  await expect(selects.nth(3)).toBeEnabled();
  await selects.nth(3).selectOption("1");
  await expect(selects.nth(3)).toHaveValue("1");
  await selects.nth(1).selectOption("2");
  await expect(selects.nth(2)).toHaveValue("");
  await expect(selects.nth(3)).toBeDisabled();
  await page.reload();
  await expect(page.locator(".location-fields select").nth(1)).toHaveValue("2");
  await expect(page.locator(".location-foot")).toContainText(
    "জেলার কেন্দ্রের জন্য",
  );
});
test("API failure shows retry and never invents current measurements", async ({
  page,
}) => {
  await page.route("https://api.open-meteo.com/**", (r) => r.abort());
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "আবার চেষ্টা", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".temperature")).toContainText("—");
  await expect(page.locator(".live-badge")).toContainText("সংযোগ প্রয়োজন");
  await mock(page);
  await page.getByRole("button", { name: "আবার চেষ্টা", exact: true }).click();
  await expect(page.locator(".temperature")).toContainText("৩১");
});
test("offline cached weather is explicitly identified", async ({ page }) => {
  await mock(page);
  await page.goto("/");
  await expect(page.locator(".live-badge")).toContainText("হালনাগাদ তথ্য");
  await page.unroute("https://api.open-meteo.com/**");
  await page.route("https://api.open-meteo.com/**", (r) => r.abort());
  await page.reload();
  await expect(page.locator(".error-banner")).toContainText(
    "বর্তমান পূর্বাভাস নয়",
  );
  await expect(page.locator(".temperature")).toContainText("৩১");
  await expect(page.locator(".live-badge")).toContainText("সংরক্ষিত তথ্য");
});
test("device location requests point forecast without claiming union coordinates", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 24.3, longitude: 90.4 });
  await mock(page);
  await page.goto("/");
  const request = page.waitForRequest((r) => r.url().includes("latitude=24.3"));
  await page.getByRole("button", { name: "আমার অবস্থান", exact: true }).click();
  await request;
  await expect(page.locator(".location-foot")).toContainText(
    "স্বয়ংক্রিয়ভাবে মেলানো হয়নি",
  );
});
test("information page discloses sources and privacy", async ({
  page,
}, info) => {
  await mock(page);
  await page.goto("/");
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "মেনু খুলুন" }).click();
  await page
    .locator("nav")
    .getByRole("button", { name: "তথ্য ও সহায়তা" })
    .click();
  await expect(
    page.getByRole("heading", { name: "অবস্থান ও গোপনীয়তা" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Open-Meteo/ })).toHaveAttribute(
    "href",
    "https://open-meteo.com/",
  );
});
