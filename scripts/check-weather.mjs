import { execFileSync } from "node:child_process";
import { forecastUrl, validateForecast } from "../src/weather.mjs";
// A real API request. No mock response or stored forecast is used here.
const response = execFileSync(
  "curl",
  [
    "--fail",
    "--silent",
    "--show-error",
    "--max-time",
    "25",
    forecastUrl(23.7115253, 90.4111451),
  ],
  { encoding: "utf8" },
);
const result = validateForecast(JSON.parse(response));
if (result.timezone !== "Asia/Dhaka")
  throw new Error("Unexpected forecast timezone");
console.log(
  `Live weather verified: ${result.daily.time.length} days; ${result.timezone}; observation ${result.current.time}.`,
);
