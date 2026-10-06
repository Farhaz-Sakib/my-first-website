import "@fontsource/noto-sans-bengali/400.css";
import "@fontsource/noto-sans-bengali/600.css";
import "@fontsource/noto-sans-bengali/700.css";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Sprout,
  LayoutDashboard,
  CloudSun,
  BookOpen,
  MapPin,
  ChevronRight,
  ArrowUpRight,
  LocateFixed,
  RefreshCw,
  Droplets,
  Wind,
  Thermometer,
  CloudRain,
  Sun,
  Leaf,
  ShieldCheck,
  WifiOff,
  CalendarDays,
  Menu,
  X,
  Info,
} from "lucide-react";
import locations from "./locations.json";
import {
  bn,
  forecastUrl,
  validateForecast,
  weatherLabel,
  advice,
} from "./weather.mjs";
import "./styles.css";
const sorted = (rows) =>
  [...rows].sort((a, b) => a.bn_name.localeCompare(b.bn_name, "bn"));
const initial = { division: "6", district: "47", upazila: "", union: "" };
function readSelection() {
  try {
    const s = JSON.parse(localStorage.getItem("krishi-location"));
    if (
      s &&
      locations.districts.some(
        (d) => d.id === s.district && d.division_id === s.division,
      )
    )
      return { ...initial, ...s };
  } catch {}
  return initial;
}
function IconWeather({ code, size = 26 }) {
  return code == null ? (
    <CloudSun size={size} />
  ) : code >= 51 ? (
    <CloudRain size={size} />
  ) : code === 0 ? (
    <Sun size={size} />
  ) : (
    <CloudSun size={size} />
  );
}
function App() {
  const [selection, setSelection] = useState(readSelection),
    [point, setPoint] = useState(null),
    [data, setData] = useState(null),
    [state, setState] = useState("loading"),
    [error, setError] = useState(""),
    [savedAt, setSavedAt] = useState(null),
    [refresh, setRefresh] = useState(0),
    [tab, setTab] = useState("dashboard"),
    [crop, setCrop] = useState("ধান"),
    [menu, setMenu] = useState(false),
    [gpsBusy, setGpsBusy] = useState(false),
    [gpsError, setGpsError] = useState("");
  const requestId = useRef(0),
    gpsId = useRef(0);
  const district =
    locations.districts.find((d) => d.id === selection.district) ||
    locations.districts[0];
  const division = locations.divisions.find(
    (d) => d.id === district.division_id,
  );
  const union = locations.unions.find((u) => u.id === selection.union);
  const lat = point?.lat ?? Number(district.lat),
    lon = point?.lon ?? Number(district.lon);
  useEffect(() => {
    try {
      localStorage.setItem("krishi-location", JSON.stringify(selection));
    } catch {}
  }, [selection]);
  useEffect(() => {
    const id = ++requestId.current,
      controller = new AbortController();
    const key = `krishi-weather:${lat.toFixed(4)},${lon.toFixed(4)}`;
    setData(null);
    setError("");
    setSavedAt(null);
    setState("loading");
    try {
      const cache = JSON.parse(localStorage.getItem(key));
      if (cache && Date.now() - cache.savedAt < 24 * 60 * 60 * 1000) {
        setData(validateForecast(cache.data));
        setSavedAt(cache.savedAt);
        setState("cached");
      }
    } catch {}
    const timeout = setTimeout(() => controller.abort(), 15000);
    fetch(forecastUrl(lat, lon), { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("পূর্বাভাস সেবা এখন সাড়া দিচ্ছে না।");
        return r.json();
      })
      .then(validateForecast)
      .then((result) => {
        if (id !== requestId.current) return;
        const now = Date.now();
        setData(result);
        setSavedAt(now);
        setState("ready");
        try {
          localStorage.setItem(
            key,
            JSON.stringify({ data: result, savedAt: now }),
          );
        } catch {}
      })
      .catch((e) => {
        if (id !== requestId.current) return;
        setError(
          e.name === "AbortError"
            ? "সংযোগের সময় শেষ। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।"
            : "আবহাওয়ার তথ্য আনা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।",
        );
        setState((previous) => (previous === "cached" ? "cached" : "error"));
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      requestId.current++;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [lat, lon, refresh]);
  function change(field, value) {
    gpsId.current++;
    setGpsBusy(false);
    setPoint(null);
    setGpsError("");
    setSelection((s) => ({
      ...s,
      [field]: value,
      ...(field === "division"
        ? {
            district: sorted(
              locations.districts.filter((d) => d.division_id === value),
            )[0].id,
            upazila: "",
            union: "",
          }
        : field === "district"
          ? { upazila: "", union: "" }
          : field === "upazila"
            ? { union: "" }
            : {}),
    }));
  }
  function locate() {
    if (!Capacitor.isNativePlatform() && !navigator.geolocation) {
      setGpsError("এই ডিভাইসে অবস্থান সুবিধা নেই।");
      return;
    }
    const id = ++gpsId.current;
    setGpsBusy(true);
    setGpsError("");
    const onSuccess = (position) => {
      if (id !== gpsId.current) return;
      const p = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      };
      try {
        forecastUrl(p.lat, p.lon);
        setPoint(p);
      } catch (e) {
        setGpsError(e.message);
      }
      setGpsBusy(false);
    };
    const onFailure = () => {
      if (id !== gpsId.current) return;
      setGpsBusy(false);
      setGpsError(
        "অবস্থানের অনুমতি পাওয়া যায়নি। জেলা নির্বাচন করে পূর্বাভাস দেখুন।",
      );
    };
    const options = {
      timeout: 12000,
      maximumAge: 60000,
      enableHighAccuracy: true,
    };
    if (Capacitor.isNativePlatform())
      Geolocation.getCurrentPosition(options).then(onSuccess).catch(onFailure);
    else
      navigator.geolocation.getCurrentPosition(onSuccess, onFailure, options);
  }
  const days = data?.daily;
  const current = data?.current;
  const items = advice(data, crop);
  const nav = [
    ["dashboard", LayoutDashboard, "সারসংক্ষেপ"],
    ["forecast", CloudSun, "আবহাওয়ার পূর্বাভাস"],
    ["agriculture", Sprout, "কৃষি পরামর্শ"],
    ["about", BookOpen, "তথ্য ও সহায়তা"],
  ];
  const date = new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  return (
    <div className="app">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("dashboard");
          }}
        >
          <div className="brand-icon">
            <Sprout size={28} />
          </div>
          <div>
            কৃষি আবহাওয়া<small>প্রকৃতির সাথে, কৃষকের পাশে</small>
          </div>
        </a>
        <button
          className="mobile-close"
          aria-label="মেনু বন্ধ করুন"
          onClick={() => setMenu(false)}
        >
          <X />
        </button>
        <div className="nav-label">আপনার কৃষি সঙ্গী</div>
        <nav>
          {nav.map(([id, Icon, label]) => (
            <button
              key={id}
              className={tab === id ? "nav-item active" : "nav-item"}
              onClick={() => {
                setTab(id);
                setMenu(false);
              }}
            >
              <Icon size={20} />
              {label}
              {tab === id && <ChevronRight size={17} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="note-icon">
            <Leaf size={23} />
          </div>
          <strong>সঠিক সময়ে সঠিক সিদ্ধান্ত</strong>
          <p>আবহাওয়া বুঝে পরিকল্পনা করুন, যত্নে রাখুন আপনার ফসল।</p>
          <span>
            বাংলাদেশের কৃষকের জন্য <span className="flag">●</span>
          </span>
        </div>
        <div className="sidebar-bottom">
          <ShieldCheck size={16} /> উন্মুক্ত তথ্য, সবার জন্য
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="menu-button"
              aria-label="মেনু খুলুন"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </button>
            আমার কৃষি <ChevronRight size={14} />
            <strong>{nav.find((n) => n[0] === tab)[2]}</strong>
          </div>
          <div className="top-meta">
            <span className="bangladesh">
              <span /> বাংলাদেশ
            </span>
            <span className="language">বাং</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> কৃষকের প্রতিদিনের সঙ্গী
              </div>
              <h1>
                {tab === "dashboard"
                  ? "আকাশের খবর, ফসলের যত্ন"
                  : nav.find((n) => n[0] === tab)[2]}
              </h1>
              <p>আপনার এলাকার আবহাওয়া জানুন, কৃষিকাজের পরিকল্পনা করুন।</p>
            </div>
            <div className="date">
              <CalendarDays size={17} />
              {date}
            </div>
          </div>
          <section className="location-panel">
            <div className="section-title">
              <MapPin size={19} />
              <strong>আপনার এলাকা</strong>
              <span>বিভাগ থেকে ইউনিয়ন নির্বাচন করুন</span>
            </div>
            <div className="location-fields">
              <label>
                বিভাগ
                <select
                  value={selection.division}
                  onChange={(e) => change("division", e.target.value)}
                >
                  {sorted(locations.divisions).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.bn_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                জেলা
                <select
                  value={district.id}
                  onChange={(e) => change("district", e.target.value)}
                >
                  {sorted(
                    locations.districts.filter(
                      (d) => d.division_id === selection.division,
                    ),
                  ).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.bn_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                উপজেলা
                <select
                  value={selection.upazila}
                  onChange={(e) => change("upazila", e.target.value)}
                >
                  <option value="">উপজেলা নির্বাচন</option>
                  {sorted(
                    locations.upazilas.filter(
                      (d) => d.district_id === district.id,
                    ),
                  ).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.bn_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                ইউনিয়ন
                <select
                  disabled={!selection.upazila}
                  value={selection.union}
                  onChange={(e) => change("union", e.target.value)}
                >
                  <option value="">ইউনিয়ন নির্বাচন</option>
                  {sorted(
                    locations.unions.filter(
                      (d) => d.upazila_id === selection.upazila,
                    ),
                  ).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.bn_name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="gps-button"
                disabled={gpsBusy}
                onClick={locate}
              >
                <LocateFixed size={18} />
                {gpsBusy ? "খোঁজা হচ্ছে…" : "আমার অবস্থান"}
              </button>
            </div>
            <div className="location-foot">
              <Info size={13} />
              {point
                ? "ডিভাইসের অবস্থান অনুযায়ী পূর্বাভাস। নির্বাচিত প্রশাসনিক এলাকার সাথে অবস্থান স্বয়ংক্রিয়ভাবে মেলানো হয়নি।"
                : "ইউনিয়ন নির্বাচন করলেও পূর্বাভাস জেলার কেন্দ্রের জন্য। নির্দিষ্ট স্থানের জন্য “আমার অবস্থান” ব্যবহার করুন।"}
            </div>
            {gpsError && (
              <p className="inline-error" role="alert">
                {gpsError}
              </p>
            )}
          </section>
          <div aria-live="polite">
            {error && (
              <div className="error-banner">
                <WifiOff size={19} />
                <div>
                  {error}
                  {state === "cached" && (
                    <small>
                      আগের সংরক্ষিত তথ্য দেখানো হচ্ছে; এটি বর্তমান পূর্বাভাস
                      নয়।
                    </small>
                  )}
                </div>
                <button onClick={() => setRefresh((x) => x + 1)}>
                  <RefreshCw size={16} />
                  আবার চেষ্টা
                </button>
              </div>
            )}
            {state === "cached" && !error && (
              <div className="cache-banner">
                সংরক্ষিত পূর্বাভাস দেখানো হচ্ছে। নতুন তথ্য আনা হচ্ছে…
              </div>
            )}
          </div>
          {(tab === "dashboard" || tab === "forecast") && (
            <>
              <div className="weather-grid">
                <section className="weather-hero">
                  <div className="hero-top">
                    <span>
                      <MapPin size={16} />
                      {point
                        ? "আপনার বর্তমান অবস্থান"
                        : `${union ? union.bn_name + ", " : ""}${district.bn_name}, ${division.bn_name}`}
                    </span>
                    <span className="live-badge">
                      <span />
                      {state === "loading"
                        ? "অপেক্ষা করুন"
                        : state === "ready"
                          ? "হালনাগাদ তথ্য"
                          : state === "cached"
                            ? "সংরক্ষিত তথ্য"
                            : "সংযোগ প্রয়োজন"}
                    </span>
                  </div>
                  <div className="hero-body">
                    <div>
                      <div className="hero-label">এখনকার আবহাওয়া</div>
                      <div className="temperature">
                        {bn(current?.temperature_2m)}
                        <span>°</span>
                      </div>
                      <h2>
                        {state === "loading" && !data
                          ? "পূর্বাভাস আনা হচ্ছে…"
                          : weatherLabel(current?.weather_code)}
                      </h2>
                      <p>
                        অনুভূত তাপমাত্রা {bn(current?.apparent_temperature)}°
                        সে.
                      </p>
                    </div>
                    <div className="weather-art" aria-hidden="true">
                      <div className="sun-art" />
                      <div className="cloud-art cloud-one" />
                      <div className="cloud-art cloud-two" />
                      <div className="field field-back" />
                      <div className="field field-front" />
                      <Sprout className="field-sprout" size={82} />
                    </div>
                  </div>
                  <div className="hero-bottom">
                    <span>
                      আজ সর্বোচ্চ{" "}
                      <strong>{bn(days?.temperature_2m_max[0])}°</strong> ·
                      সর্বনিম্ন{" "}
                      <strong>{bn(days?.temperature_2m_min[0])}°</strong>
                    </span>
                    <button
                      aria-label="পূর্বাভাস হালনাগাদ করুন"
                      onClick={() => setRefresh((x) => x + 1)}
                    >
                      <RefreshCw size={15} />
                    </button>
                  </div>
                </section>
                <section className="conditions">
                  <div className="metric">
                    <div className="metric-icon blue">
                      <CloudRain />
                    </div>
                    <div>
                      <span>আজ বৃষ্টির সম্ভাবনা</span>
                      <strong>
                        {bn(days?.precipitation_probability_max[0])}
                        <small>%</small>
                      </strong>
                    </div>
                  </div>
                  <div className="metric">
                    <div className="metric-icon teal">
                      <Droplets />
                    </div>
                    <div>
                      <span>বাতাসের আর্দ্রতা</span>
                      <strong>
                        {bn(current?.relative_humidity_2m)}
                        <small>%</small>
                      </strong>
                    </div>
                  </div>
                  <div className="metric">
                    <div className="metric-icon sand">
                      <Wind />
                    </div>
                    <div>
                      <span>বাতাসের গতি</span>
                      <strong>
                        {bn(current?.wind_speed_10m, 1)}
                        <small>কিমি/ঘণ্টা</small>
                      </strong>
                    </div>
                  </div>
                </section>
              </div>
              <section className="forecast-panel">
                <div className="panel-heading">
                  <div>
                    <h2>
                      <CalendarDays size={20} />
                      আগামী ৭ দিনের পূর্বাভাস
                    </h2>
                    <p>মাঠের কাজের আগে এক নজরে দেখে নিন</p>
                  </div>
                  <span className="subtle-pill">বাংলাদেশ সময়</span>
                </div>
                <div className="forecast-days">
                  {Array.from({ length: 7 }, (_, i) => {
                    const dt = days?.time[i];
                    return (
                      <div
                        className={
                          i === 0 ? "forecast-day today" : "forecast-day"
                        }
                        key={i}
                      >
                        <strong>
                          {i === 0
                            ? "আজ"
                            : dt
                              ? new Intl.DateTimeFormat("bn-BD", {
                                  weekday: "short",
                                  timeZone: "Asia/Dhaka",
                                }).format(new Date(dt + "T12:00:00+06:00"))
                              : "—"}
                        </strong>
                        <span className="day-date">
                          {dt
                            ? new Intl.DateTimeFormat("bn-BD", {
                                day: "numeric",
                                month: "short",
                                timeZone: "Asia/Dhaka",
                              }).format(new Date(dt + "T12:00:00+06:00"))
                            : "অপেক্ষা করুন"}
                        </span>
                        <div className="day-icon">
                          <IconWeather code={days?.weather_code[i]} />
                        </div>
                        <div className="day-temperatures">
                          {bn(days?.temperature_2m_max[i])}°{" "}
                          <span>{bn(days?.temperature_2m_min[i])}°</span>
                        </div>
                        <div className="day-rain">
                          <Droplets size={12} />
                          {bn(days?.precipitation_probability_max[i])}%
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="forecast-foot">
                  <span>
                    মোট বৃষ্টিপাত (আজ): {bn(days?.precipitation_sum[0], 1)} মিমি
                  </span>
                  <span>
                    {savedAt
                      ? `তথ্য আনা হয়েছে: ${new Intl.DateTimeFormat("bn-BD", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(savedAt)}`
                      : "পূর্বাভাসের জন্য ইন্টারনেট প্রয়োজন"}
                  </span>
                </div>
              </section>
            </>
          )}
          {(tab === "dashboard" || tab === "agriculture") && (
            <section className="agriculture-section">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">আবহাওয়া অনুযায়ী পরিকল্পনা</div>
                  <h2>আপনার ফসলের জন্য পরামর্শ</h2>
                </div>
                <label className="crop-select">
                  <Sprout size={17} />
                  <select
                    aria-label="ফসল নির্বাচন"
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                  >
                    {["ধান", "গম", "ভুট্টা", "আলু", "সবজি", "পাট"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="advice-grid">
                {items.map((item, i) => (
                  <article
                    className={"advice-card " + item.tone}
                    key={item.title}
                  >
                    <div className="advice-top">
                      <div className="advice-icon">
                        {i === 0 ? <Droplets size={21} /> : <Leaf size={21} />}
                      </div>
                      <span>
                        {item.tone === "warning" ? "সতর্কতা" : "কৃষি পরামর্শ"}
                      </span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </article>
                ))}
                <article className="help-card">
                  <Sprout size={34} />
                  <h3>সুস্থ ফসল, ভালো ফলন</h3>
                  <p>
                    ফসলের সমস্যা বা রোগের লক্ষণ নিয়ে আপনার উপজেলা কৃষি অফিসে
                    যোগাযোগ করুন।
                  </p>
                  <button onClick={() => setTab("about")}>
                    তথ্য ও সহায়তা <ArrowUpRight size={17} />
                  </button>
                </article>
              </div>
              <p className="advice-disclaimer">
                <Info size={14} /> এগুলো সাধারণ আবহাওয়াভিত্তিক নির্দেশনা,
                বিশেষজ্ঞের ব্যক্তিগত পরামর্শ নয়। জমি, ফসলের পর্যায় ও স্থানীয়
                পরিস্থিতি অনুযায়ী সিদ্ধান্ত নিন।
              </p>
            </section>
          )}
          {tab === "about" && (
            <section className="about-panel">
              <h2>বিশ্বস্ত তথ্য দিয়ে সচেতন সিদ্ধান্ত</h2>
              <p>
                এই অ্যাপ বাংলাদেশে কৃষিকাজের পরিকল্পনার জন্য বাংলায় আবহাওয়ার
                পূর্বাভাস ও সাধারণ কৃষি নির্দেশনা দেয়। এটি সরকারি দুর্যোগ
                সতর্কতা সেবা নয়। জরুরি সতর্কতার জন্য বাংলাদেশ আবহাওয়া
                অধিদপ্তরের বিজ্ঞপ্তি অনুসরণ করুন।
              </p>
              <h3>আবহাওয়ার উৎস</h3>
              <p>
                Open-Meteo উন্মুক্ত আবহাওয়া মডেলের তথ্য ব্যবহার করে। পূর্বাভাসে
                অনিশ্চয়তা থাকে; একই জেলার বিভিন্ন স্থানে আবহাওয়া আলাদা হতে
                পারে। বিনামূল্যের সেবা অ-বাণিজ্যিক ব্যবহারের জন্য; বাণিজ্যিক
                প্রকাশের আগে প্রযোজ্য শর্ত যাচাই করতে হবে।
              </p>
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noreferrer"
              >
                Open-Meteo · তথ্য CC BY 4.0 <ArrowUpRight size={15} />
              </a>
              <h3>এলাকার তথ্য</h3>
              <p>
                বাংলাদেশ জিওকোড উন্মুক্ত ডেটাসেট থেকে{" "}
                {bn(locations.divisions.length)} বিভাগ,{" "}
                {bn(locations.districts.length)} জেলা,{" "}
                {bn(locations.upazilas.length)} উপজেলা ও{" "}
                {bn(locations.unions.length)} ইউনিয়ন যুক্ত করা হয়েছে। তালিকা
                সরকারি হালনাগাদ রেজিস্টার নয়; নতুন সীমানা বা নাম পরিবর্তন বাদ
                পড়তে পারে। ইউনিয়নের নিজস্ব স্থানাঙ্ক এই ডেটাসেটে নেই।
              </p>
              <a
                href="https://github.com/nuhil/bangladesh-geocode"
                target="_blank"
                rel="noreferrer"
              >
                বাংলাদেশ জিওকোড · MIT লাইসেন্স <ArrowUpRight size={15} />
              </a>
              <h3>কৃষি সহায়তা ও সতর্কতা</h3>
              <p>
                সার, কীটনাশক, সেচের পরিমাণ ও রোগ নির্ণয়ের জন্য উপজেলা কৃষি
                অফিসের পরামর্শ নিন।
              </p>
              <div className="resource-links">
                <a href="https://dae.gov.bd/" target="_blank" rel="noreferrer">
                  কৃষি সম্প্রসারণ অধিদপ্তর <ArrowUpRight size={15} />
                </a>
                <a href="https://bmd.gov.bd/" target="_blank" rel="noreferrer">
                  বাংলাদেশ আবহাওয়া অধিদপ্তর <ArrowUpRight size={15} />
                </a>
              </div>
              <h3>অবস্থান ও গোপনীয়তা</h3>
              <p>
                “আমার অবস্থান” চাপলে অনুমতি নিয়ে স্থানাঙ্ক শুধু পূর্বাভাসের
                জন্য Open-Meteo-তে পাঠানো হয়। আপনার নির্বাচিত এলাকা ও সর্বশেষ
                পূর্বাভাস এই ডিভাইসে রাখা হয়। কোনো অ্যাকাউন্ট বা নিজস্ব সার্ভার
                নেই। সংরক্ষিত তথ্য সর্বোচ্চ ২৪ ঘণ্টা পর্যন্ত দেখানো হয় এবং
                স্পষ্টভাবে চিহ্নিত থাকে।
              </p>
            </section>
          )}
          <footer>
            <span>
              <Sprout size={15} /> কৃষি আবহাওয়া · বাংলাদেশের কৃষকের পাশে
            </span>
            <button onClick={() => setTab("about")}>
              তথ্যের উৎস ও ব্যবহারবিধি <ChevronRight size={13} />
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
