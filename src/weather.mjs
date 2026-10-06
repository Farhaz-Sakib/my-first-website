export const bn = (value, digits = 0) =>
  value == null || !Number.isFinite(Number(value))
    ? "—"
    : new Intl.NumberFormat("bn-BD", { maximumFractionDigits: digits }).format(
        value,
      );
export function weatherLabel(code) {
  if (code == null) return "তথ্য নেই";
  if (code === 0) return "পরিষ্কার আকাশ";
  if (code <= 3) return "আংশিক মেঘলা";
  if ([45, 48].includes(code)) return "কুয়াশা";
  if (code >= 95) return "বজ্রবৃষ্টি";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))
    return "বৃষ্টির সম্ভাবনা";
  if (code >= 71 && code <= 86) return "তুষারপাত";
  return "পরিবর্তনশীল আবহাওয়া";
}
export function forecastUrl(lat, lon) {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < 20.5 ||
    lat > 26.7 ||
    lon < 88 ||
    lon > 92.8
  )
    throw new Error("বাংলাদেশের ভেতরের অবস্থান নির্বাচন করুন।");
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
    timezone: "Asia/Dhaka",
    forecast_days: "7",
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}
export function validateForecast(data) {
  const dailyKeys = [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_sum",
    "precipitation_probability_max",
  ];
  if (
    !data?.current ||
    !Number.isFinite(data.current.temperature_2m) ||
    typeof data.current.time !== "string" ||
    !Array.isArray(data.daily?.time) ||
    data.daily.time.length !== 7 ||
    dailyKeys.some(
      (k) => !Array.isArray(data.daily[k]) || data.daily[k].length !== 7,
    )
  )
    throw new Error("আবহাওয়ার তথ্য অসম্পূর্ণ। পরে আবার চেষ্টা করুন।");
  return data;
}
export function advice(data, crop = "ধান") {
  if (!data)
    return [
      {
        title: "আগে পূর্বাভাস দেখুন",
        body: "আবহাওয়ার তথ্য পাওয়ার পর সেচ ও মাঠের কাজের পরিকল্পনা করুন।",
        tone: "normal",
      },
    ];
  const rain = data.daily.precipitation_sum[0];
  const probability = data.daily.precipitation_probability_max[0];
  const temperature = data.daily.temperature_2m_max[0];
  const wind = data.current.wind_speed_10m;
  const items = [];
  if (data.daily.weather_code[0] >= 95 || data.current.weather_code >= 95)
    items.push({
      title: "বজ্রপাতের সময় নিরাপদ থাকুন",
      body: "খোলা মাঠ, জলাশয় ও উঁচু গাছ থেকে দূরে থাকুন। পাকা ভবনে আশ্রয় নিন।",
      tone: "warning",
    });
  if (rain >= 10 || probability >= 70)
    items.push({
      title: "বৃষ্টির আগে জমি প্রস্তুত রাখুন",
      body: `${crop} ক্ষেতে পানি নিষ্কাশনের নালা পরীক্ষা করুন। বৃষ্টির সময় সার ও বালাইনাশক প্রয়োগ স্থগিত রাখার বিষয়ে স্থানীয় কৃষি কর্মকর্তার পরামর্শ নিন।`,
      tone: "warning",
    });
  else if (rain != null && probability != null)
    items.push({
      title: "মাটির আর্দ্রতা দেখে সেচ দিন",
      body: `${crop} ক্ষেতে মাটির আর্দ্রতা পরীক্ষা করুন। শুধু বৃষ্টির পূর্বাভাস দেখে সেচের পরিমাণ নির্ধারণ করবেন না।`,
      tone: "normal",
    });
  if (temperature >= 35)
    items.push({
      title: "তাপের সময় কাজের সময় বদলান",
      body: "সকাল বা বিকেলে মাঠে কাজ করুন। পর্যাপ্ত পানি পান করুন এবং চারার আর্দ্রতা নজরে রাখুন।",
      tone: "warning",
    });
  if (wind >= 20)
    items.push({
      title: "বাতাসে সতর্ক থাকুন",
      body: "জোর বাতাসে স্প্রে এড়িয়ে চলুন। সবজি গাছের মাচা ও খুঁটি পরীক্ষা করুন।",
      tone: "warning",
    });
  items.push({
    title: "নিয়মিত ক্ষেত পর্যবেক্ষণ করুন",
    body: "পাতার দাগ, পোকা ও রোগের লক্ষণ দেখুন। রোগ শনাক্তের আগে ওষুধ ব্যবহার না করে উপজেলা কৃষি অফিসে যোগাযোগ করুন।",
    tone: "normal",
  });
  return items;
}
