
/* =========================================================
   AGROWEATHER
   Plain JavaScript + Open-Meteo API
   No framework and no API key required for this prototype
   ========================================================= */

const els = {
  searchForm: document.getElementById("searchForm"),
  cityInput: document.getElementById("cityInput"),
  status: document.getElementById("statusMessage"),
  locationLabel: document.getElementById("locationLabel"),
  refreshBtn: document.getElementById("refreshBtn"),

  currentCondition: document.getElementById("currentCondition"),
  weatherSymbol: document.getElementById("weatherSymbol"),
  currentTemp: document.getElementById("currentTemp"),
  feelsLike: document.getElementById("feelsLike"),
  todayRange: document.getElementById("todayRange"),
  localDateTime: document.getElementById("localDateTime"),

  humidity: document.getElementById("humidityValue"),
  wind: document.getElementById("windValue"),
  rain: document.getElementById("rainValue"),
  uv: document.getElementById("uvValue"),
  sunrise: document.getElementById("sunriseValue"),
  sunset: document.getElementById("sunsetValue"),

  forecast: document.getElementById("forecastGrid"),
  alerts: document.getElementById("alertsList"),
  advisor: document.getElementById("advisorFeed"),

  plannerForm: document.getElementById("plannerForm"),
  plannerLocation: document.getElementById("plannerLocation"),
  plannerCrop: document.getElementById("plannerCrop"),
  plannerVariety: document.getElementById("plannerVariety"),
  calendar: document.getElementById("cropCalendarResult")
};

let currentPlace = null;

/* ================= WEATHER DESCRIPTIONS ================= */

const weatherDescriptions = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Freezing drizzle",
  57: "Heavy freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail"
};

function weatherName(code) {
  return weatherDescriptions[code] || "Weather conditions unavailable";
}

function weatherGlyph(code) {
  if ([0, 1].includes(code)) return "SUN";
  if ([2, 3, 45, 48].includes(code)) return "CLOUD";

  if (
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]
      .includes(code)
  ) return "RAIN";

  if ([95, 96, 99].includes(code)) return "STORM";

  if ([71, 73, 75, 77, 85, 86].includes(code)) return "SNOW";

  return "WX";
}

/* ================= HELPER FUNCTIONS ================= */

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.style.color = isError ? "#b13c35" : "";
}

function safeText(tag, className, value) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  element.textContent = value;
  return element;
}

function formatTime(iso) {
  if (!iso) return "--:--";

  const time = iso.split("T")[1];
  return time ? time.slice(0, 5) : "--:--";
}

function formatDay(iso, options = { weekday: "short" }) {
  return new Date(`${iso}T12:00:00`)
    .toLocaleDateString("en-IN", options);
}

/* ================= WEATHER BACKGROUND ================= */

function changeWeatherBackground(code, temperature) {
  document.body.classList.remove(
    "weather-clear",
    "weather-rain",
    "weather-cloud",
    "weather-hot"
  );

  const rainyCodes = [
    51, 53, 55, 56, 57,
    61, 63, 65, 66, 67,
    80, 81, 82, 95, 96, 99
  ];

  if (rainyCodes.includes(code)) {
    document.body.classList.add("weather-rain");
  } else if ([2, 3, 45, 48].includes(code)) {
    document.body.classList.add("weather-cloud");
  } else if (temperature >= 35) {
    document.body.classList.add("weather-hot");
  } else {
    document.body.classList.add("weather-clear");
  }
}

/* ================= LOCATION SEARCH ================= */

async function geocodeLocation(query) {
  const url =
    "https://geocoding-api.open-meteo.com/v1/search?" +
    `name=${encodeURIComponent(query)}` +
    "&count=8&language=en&format=json";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not search for this location.");
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(
      "Location not found. Try another city or district name."
    );
  }

  // Prefer Indian results if multiple places have the same name.
  const indianPlace = data.results.find(
    place => place.country_code === "IN"
  );

  return indianPlace || data.results[0];
}

/* ================= FETCH WEATHER DATA ================= */

async function getWeather(place) {
  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,

    current:
      "temperature_2m,relative_humidity_2m," +
      "apparent_temperature,is_day,precipitation,rain," +
      "showers,weather_code,cloud_cover," +
      "wind_speed_10m,wind_gusts_10m",

    hourly:
      "temperature_2m,relative_humidity_2m," +
      "precipitation_probability,precipitation," +
      "weather_code,wind_speed_10m,uv_index",

    daily:
      "weather_code,temperature_2m_max,temperature_2m_min," +
      "sunrise,sunset,uv_index_max," +
      "precipitation_probability_max,precipitation_sum," +
      "wind_speed_10m_max",

    timezone: "auto",
    forecast_days: "5"
  });

  const url =
    `https://api.open-meteo.com/v1/forecast?${params}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      "Weather data could not be loaded. Please try again."
    );
  }

  return response.json();
}

/* ================= CURRENT WEATHER ================= */

function renderCurrent(data) {
  const current = data.current;
  const daily = data.daily;
  const code = current.weather_code;

  els.currentCondition.textContent = weatherName(code);
  els.weatherSymbol.textContent = weatherGlyph(code);

  els.currentTemp.textContent =
    Math.round(current.temperature_2m);

  els.feelsLike.textContent =
    `Feels like ${Math.round(current.apparent_temperature)}°C`;

  els.todayRange.textContent =
    `${Math.round(daily.temperature_2m_min[0])}° / ` +
    `${Math.round(daily.temperature_2m_max[0])}°C`;

  els.localDateTime.textContent = formatTime(current.time);

  els.humidity.textContent =
    `${Math.round(current.relative_humidity_2m)}%`;

  els.wind.textContent =
    `${Math.round(current.wind_speed_10m)} km/h`;

  els.rain.textContent =
    `${Math.round(daily.precipitation_probability_max[0] ?? 0)}%`;

  els.uv.textContent =
    Number(daily.uv_index_max[0] ?? 0).toFixed(1);

  els.sunrise.textContent = formatTime(daily.sunrise[0]);
  els.sunset.textContent = formatTime(daily.sunset[0]);

  changeWeatherBackground(code, current.temperature_2m);
}

/* ================= FIVE-DAY FORECAST ================= */

function renderForecast(data) {
  els.forecast.replaceChildren();

  data.daily.time.forEach((date, index) => {
    const card = safeText("article", "forecast-card panel", "");

    card.appendChild(
      safeText(
        "div",
        "forecast-day",
        index === 0 ? "Today" : formatDay(date)
      )
    );

    card.appendChild(
      safeText(
        "div",
        "forecast-icon",
        weatherGlyph(data.daily.weather_code[index])
      )
    );

    card.appendChild(
      safeText(
        "div",
        "forecast-condition",
        weatherName(data.daily.weather_code[index])
      )
    );

    const temperature = document.createElement("div");
    temperature.className = "forecast-temp";

    temperature.appendChild(
      document.createTextNode(
        `${Math.round(data.daily.temperature_2m_max[index])}°`
      )
    );

    temperature.appendChild(
      safeText(
        "span",
        "forecast-low",
        `${Math.round(data.daily.temperature_2m_min[index])}°`
      )
    );

    card.appendChild(temperature);

    card.appendChild(
      safeText(
        "div",
        "forecast-rain",
        `Rain ${Math.round(
          data.daily.precipitation_probability_max[index] ?? 0
        )}%`
      )
    );

    els.forecast.appendChild(card);
  });
}

/* ================= SMART WEATHER ALERTS ================= */

function addAlert(list, level, title, description) {
  const card = document.createElement("article");
  card.className = `alert-card panel ${level}`;

  card.appendChild(safeText("span", "alert-marker", ""));

  const content = document.createElement("div");

  const levelText =
    level === "danger"
      ? "High attention"
      : level === "warning"
      ? "Caution"
      : "Informational";

  content.appendChild(safeText("span", "alert-level", levelText));
  content.appendChild(safeText("h3", "", title));
  content.appendChild(safeText("p", "", description));

  card.appendChild(content);
  list.appendChild(card);
}

function buildAlerts(data) {
  els.alerts.replaceChildren();

  const current = data.current;
  const daily = data.daily;

  const rain =
    Number(daily.precipitation_probability_max[0] ?? 0);

  const maxTemp =
    Number(daily.temperature_2m_max[0] ?? current.temperature_2m);

  const wind =
    Number(daily.wind_speed_10m_max[0] ?? current.wind_speed_10m);

  const stormCodes = [95, 96, 99];
  const rainCodes = [65, 67, 82];

  let count = 0;

  if (stormCodes.includes(daily.weather_code[0])) {
    addAlert(
      els.alerts,
      "danger",
      "Thunderstorm forecast",
      "Check official local weather warnings and avoid exposed outdoor work during thunderstorms."
    );
    count++;
  }

  if (
    rainCodes.includes(daily.weather_code[0]) ||
    rain >= 70 ||
    Number(daily.precipitation_sum[0] ?? 0) >= 25
  ) {
    addAlert(
      els.alerts,
      "warning",
      "Rain risk",
      `Forecast indicates a ${rain}% chance of rain. Review field access, drainage and outdoor plans.`
    );
    count++;
  }

  if (maxTemp >= 38) {
    addAlert(
      els.alerts,
      "danger",
      "Very hot conditions",
      `The forecast high is ${Math.round(maxTemp)}°C. Schedule strenuous outdoor work during cooler hours and take water and rest breaks.`
    );
    count++;
  } else if (maxTemp >= 35) {
    addAlert(
      els.alerts,
      "warning",
      "Heat caution",
      `The forecast high is ${Math.round(maxTemp)}°C. Consider cooler hours for strenuous fieldwork.`
    );
    count++;
  }

  if (wind >= 35) {
    addAlert(
      els.alerts,
      "warning",
      "Strong wind",
      `Maximum forecast wind is ${Math.round(wind)} km/h. Review conditions before spraying or working with exposed equipment.`
    );
    count++;
  }

  if (count === 0) {
    addAlert(
      els.alerts,
      "good",
      "No major threshold crossed",
      "The simple alert rules did not identify a high-risk threshold. Continue checking updated forecasts and official local warnings."
    );
  }
}

/* ================= FARMING ADVISOR FEED ================= */

function addAdvice(title, description, tag, code) {
  const card = document.createElement("article");
  card.className = "advisory-card panel";

  card.appendChild(
    safeText("div", "advisory-icon", code)
  );

  const content = document.createElement("div");

  content.appendChild(safeText("h3", "", title));
  content.appendChild(safeText("p", "", description));
  content.appendChild(safeText("span", "advisory-tag", tag));

  card.appendChild(content);
  els.advisor.appendChild(card);
}

function buildAdvisor(data) {
  els.advisor.replaceChildren();

  const current = data.current;
  const daily = data.daily;

  const maxTemp =
    Number(daily.temperature_2m_max[0] ?? current.temperature_2m);

  const rain =
    Number(daily.precipitation_probability_max[0] ?? 0);

  const humidity =
    Number(current.relative_humidity_2m ?? 0);

  const wind =
    Number(current.wind_speed_10m ?? 0);

  let count = 0;

  if (
    rain >= 60 ||
    Number(daily.precipitation_sum[0] ?? 0) >= 10
  ) {
    addAdvice(
      "Rain and field operations",
      "Rain is possible. Check the latest hourly forecast before fertilizer application or fieldwork, and inspect drainage where waterlogging is a concern.",
      "Rain planning",
      "RAIN"
    );
    count++;
  }

  if (maxTemp >= 33) {
    addAdvice(
      "Heat and crop moisture",
      "Hot conditions may increase water demand. Check soil moisture and crop signs before adjusting irrigation; avoid unnecessary watering.",
      "Heat care",
      "HEAT"
    );
    count++;
  }

  if (wind >= 20) {
    addAdvice(
      "Wind-aware spraying",
      "Wind is noticeable. Check the pesticide label and local guidance, and postpone spraying if wind exceeds the product's safe application limits.",
      "Spraying caution",
      "WIND"
    );
    count++;
  }

  if (humidity >= 85) {
    addAdvice(
      "Monitor crop health",
      "High humidity can contribute to disease-favorable conditions for some crops. Inspect leaves and stems, and seek crop-specific guidance if symptoms appear.",
      "Crop monitoring",
      "CROP"
    );
    count++;
  }

  if (count < 2) {
    addAdvice(
      "Plan routine fieldwork",
      "No strong weather trigger was detected by these simple rules. Use the forecast to plan irrigation, harvesting and field visits, and check the crop growth stage.",
      "Daily planning",
      "PLAN"
    );
  }

  addAdvice(
    "Check the crop calendar",
    "Use the planner below for seasonal activity windows. A suitable season does not automatically mean tomorrow's weather is suitable for the task.",
    "Seasonal guidance",
    "TIME"
  );
}

/* ================= SEARCH AND LOAD WEATHER ================= */

async function searchAndLoad(query) {
  const search = query.trim();

  if (!search) return;

  setStatus(`Searching weather for ${search}…`);
  els.refreshBtn.disabled = true;

  try {
    const place = await geocodeLocation(search);
    const weather = await getWeather(place);

    currentPlace = place;

    const region = [
      place.name,
      place.admin1,
      place.country
    ]
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index)
      .join(", ");

    els.locationLabel.textContent = region;

    renderCurrent(weather);
    renderForecast(weather);
    buildAlerts(weather);
    buildAdvisor(weather);

    setStatus(
      `Weather updated for ${region}. Forecast source: Open-Meteo.`
    );
  } catch (error) {
    setStatus(
      error.message || "Something went wrong while loading weather.",
      true
    );
  } finally {
    els.refreshBtn.disabled = false;
  }
}

els.searchForm.addEventListener("submit", event => {
  event.preventDefault();
  searchAndLoad(els.cityInput.value);
});

els.refreshBtn.addEventListener("click", () => {
  if (currentPlace) {
    (async () => {
      setStatus("Refreshing weather…");

      try {
        const weather = await getWeather(currentPlace);

        renderCurrent(weather);
        renderForecast(weather);
        buildAlerts(weather);
        buildAdvisor(weather);

        setStatus(`Weather refreshed for ${currentPlace.name}.`);
      } catch (error) {
        setStatus(error.message, true);
      }
    })();
  } else {
    searchAndLoad(els.cityInput.value || "Mandya");
  }
});

/* ================= CROP CALENDAR DATABASE =================
   These are simplified educational examples.
   Verify regional recommendations before real farm use.
   ========================================================= */

const cropCalendars = {
  coffee: {
    label: "Coffee",
    varieties: {
      arabica: {
        planting: {
          period: "June – August",
          months: [6, 7, 8],
          note: "A broad planting window associated with the monsoon in established coffee regions."
        },
        fertilizing: {
          period: "April–May; May–June; September–October",
          months: [4, 5, 6, 9, 10],
          note: "Indicative three-split timing: post-blossom, pre-monsoon and post-monsoon. Confirm timing and quantities with soil testing and local advice."
        },
        harvesting: {
          period: "November – January",
          months: [11, 12, 1],
          note: "Indicative harvest period for established Arabica coffee. Actual picking depends on fruit maturity and local conditions."
        }
      },

      robusta: {
        planting: {
          period: "June – August",
          months: [6, 7, 8],
          note: "A broad planting window associated with the monsoon in established coffee regions."
        },
        fertilizing: {
          period: "April–May; May–June; September–October",
          months: [4, 5, 6, 9, 10],
          note: "Indicative three-split timing. Follow locally recommended doses and soil-test results."
        },
        harvesting: {
          period: "December – February",
          months: [12, 1, 2],
          note: "Indicative harvest period for established Robusta coffee. Actual picking depends on fruit maturity."
        }
      }
    }
  },

  paddy: {
    label: "Paddy (rice)",
    varieties: {
      default: {
        planting: {
          period: "June – August (Kharif example)",
          months: [6, 7, 8],
          note: "Illustrative monsoon-season window. Irrigation, variety duration and local sowing recommendations can shift the schedule."
        },
        fertilizing: {
          period: "Basal application, then crop-stage splits",
          months: [6, 7, 8, 9],
          note: "Fertilizer timing should follow the variety, soil test and local rice recommendations. Months alone are not enough to prescribe a dose."
        },
        harvesting: {
          period: "October – December (indicative)",
          months: [10, 11, 12],
          note: "Estimate from a typical Kharif planting cycle. Harvest when the crop reaches maturity."
        }
      }
    }
  },

  ragi: {
    label: "Ragi (finger millet)",
    varieties: {
      default: {
        planting: {
          period: "June – August (monsoon example)",
          months: [6, 7, 8],
          note: "Indicative monsoon sowing window. Local rainfed and irrigated calendars can differ."
        },
        fertilizing: {
          period: "At sowing and crop-stage top-dressing, if recommended",
          months: [6, 7, 8],
          note: "Use soil-test-based and locally recommended fertilizer rates."
        },
        harvesting: {
          period: "September – November (indicative)",
          months: [9, 10, 11],
          note: "Approximate window for some monsoon crops. Variety duration and sowing date determine maturity."
        }
      }
    }
  },

  tomato: {
    label: "Tomato",
    varieties: {
      default: {
        planting: {
          period: "Season varies by local production system",
          months: [6, 7, 8, 9, 10, 11],
          note: "This broad display is not a precise planting recommendation. Choose a locally recommended variety and planting season."
        },
        fertilizing: {
          period: "Basal nutrients plus growth-stage splits",
          months: [6, 7, 8, 9, 10, 11],
          note: "Use soil-test-based recommendations and crop stage. Avoid treating a generic monthly schedule as a fertilizer prescription."
        },
        harvesting: {
          period: "Often begins around 2–3 months after transplanting",
          months: [8, 9, 10, 11, 12, 1, 2],
          note: "Harvest timing depends on variety, transplanting date and intended fruit maturity."
        }
      }
    }
  },

  banana: {
    label: "Banana",
    varieties: {
      default: {
        planting: {
          period: "Plan around reliable water availability; monsoon planting may be used locally",
          months: [6, 7, 8, 9],
          note: "Planting month varies with cultivar, irrigation, drainage and local recommendations."
        },
        fertilizing: {
          period: "Split applications during vegetative growth",
          months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          note: "Banana has stage-based nutrient needs. Follow soil-test guidance and local recommended doses rather than a universal monthly schedule."
        },
        harvesting: {
          period: "Often about 9–15 months after planting, depending on cultivar",
          months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          note: "This is a crop-duration estimate, not a fixed calendar month. Monitor bunch maturity."
        }
      }
    }
  }
};

/* ================= REGIONAL SUITABILITY NOTES ================= */

const regions = {
  mandya: {
    label: "Mandya, Karnataka",
    coffeeValidated: false,
    note: "Mandya is outside Karnataka's principal traditional coffee-growing districts. Coffee windows shown here are provisional estimates adapted from broader Karnataka coffee guidance, not validated local recommendations."
  },

  kodagu: {
    label: "Kodagu, Karnataka",
    coffeeValidated: true,
    note: "Kodagu is an established coffee-growing district. Match these broad windows to estate elevation, variety and local agricultural guidance."
  },

  chikkamagaluru: {
    label: "Chikkamagaluru, Karnataka",
    coffeeValidated: true,
    note: "Chikkamagaluru is an established coffee-growing district. Match these broad windows to estate elevation, variety and local agricultural guidance."
  },

  hassan: {
    label: "Hassan, Karnataka",
    coffeeValidated: true,
    note: "Parts of Hassan are established coffee-growing areas. Confirm the specific locality and estate conditions."
  },

  mysuru: {
    label: "Mysuru, Karnataka",
    coffeeValidated: false,
    note: "This simplified crop calendar is not a verified district-level agronomy schedule. Confirm crop suitability and activity windows with local agricultural guidance."
  },

  bengaluru: {
    label: "Bengaluru, Karnataka",
    coffeeValidated: false,
    note: "This simplified crop calendar is not a verified district-level agronomy schedule. Confirm crop suitability and activity windows with local agricultural guidance."
  }
};

/* ================= MONTH TIMELINE ================= */

function renderMonthTrack(months) {
  const labels = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  // getMonth() gives 0-11, so we add 1 to match our month numbers (1-12)
  const thisMonth = new Date().getMonth() + 1;

  const track = document.createElement("div");
  track.className = "month-track";

  labels.forEach((month, index) => {
    const active = months.includes(index + 1);

    const cell = safeText(
      "div",
      `month-cell${active ? " active" : ""}`,
      month
    );

    // Mark the current month so the user can see where "today" is
    if (index + 1 === thisMonth) {
      cell.classList.add("current");
    }

    track.appendChild(cell);
  });

  return track;
}

/* ================= ACTIVITY CARDS ================= */

function makeActivityCard(title, activity, iconText) {
  const card = document.createElement("article");
  card.className = "activity-card panel";

  const heading = document.createElement("div");
  heading.className = "activity-title";

  heading.appendChild(
    safeText("span", "activity-icon", iconText)
  );

  heading.appendChild(
    safeText("h4", "", title)
  );

  card.appendChild(heading);

  card.appendChild(
    safeText("p", "activity-period", activity.period)
  );

  card.appendChild(
    renderMonthTrack(activity.months)
  );

  card.appendChild(
    safeText("p", "activity-note", activity.note)
  );

  return card;
}

/* ================= GENERATE CROP CALENDAR ================= */

function generateCropCalendar() {
  const regionKey = els.plannerLocation.value;
  const cropKey = els.plannerCrop.value;
  const varietyKey = els.plannerVariety.value;

  const region = regions[regionKey];
  const crop = cropCalendars[cropKey];

  const variety =
    crop?.varieties[varietyKey] ||
    crop?.varieties.default;

  els.calendar.replaceChildren();

  if (!region || !crop || !variety) {
    els.calendar.appendChild(
      safeText(
        "div",
        "empty-state panel",
        "A calendar is not available for this selection yet."
      )
    );

    return;
  }

  const header = document.createElement("div");
  header.className = "calendar-header panel";

  header.appendChild(
    safeText("h3", "", `${crop.label} activity calendar`)
  );

  const varietyLabel =
    cropKey === "coffee"
      ? ` · ${varietyKey.charAt(0).toUpperCase() + varietyKey.slice(1)}`
      : "";

  header.appendChild(
    safeText(
      "p",
      "",
      `${region.label}${varietyLabel}`
    )
  );

  const note = document.createElement("div");

  note.className =
    "suitability-note" +
    (cropKey === "coffee" && region.coffeeValidated ? " good" : "");

  note.textContent =
    cropKey === "coffee"
      ? region.note
      : "This is a broad educational calendar, not a locally verified district-level schedule. Use local crop guidance before acting.";

  header.appendChild(note);
  els.calendar.appendChild(header);

  els.calendar.appendChild(
    makeActivityCard("Planting window", variety.planting, "PLANT")
  );

  els.calendar.appendChild(
    makeActivityCard("Fertilizing schedule", variety.fertilizing, "FEED")
  );

  els.calendar.appendChild(
    makeActivityCard("Harvest window", variety.harvesting, "PICK")
  );

  const footer = document.createElement("div");
  footer.className = "activity-note";

  footer.textContent =
    "The green month blocks show broad planning periods, not a guarantee. " +
    "Harvest estimates apply to established plants where relevant. " +
    "The current weather forecast is shown separately and does not automatically change the seasonal calendar.";

  els.calendar.appendChild(footer);
}

/* ================= CROP PLANNER EVENTS ================= */

els.plannerForm.addEventListener("submit", event => {
  event.preventDefault();
  generateCropCalendar();
});

els.plannerCrop.addEventListener("change", () => {
  els.plannerVariety.disabled =
    els.plannerCrop.value !== "coffee";

  generateCropCalendar();
});

els.plannerLocation.addEventListener(
  "change",
  generateCropCalendar
);

els.plannerVariety.addEventListener(
  "change",
  generateCropCalendar
);

/* ================= INITIALIZE WEBSITE ================= */

generateCropCalendar();
searchAndLoad("Mandya");
