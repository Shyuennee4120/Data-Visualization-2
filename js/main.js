// Resolve data paths without changing the original .vg.json files.
function resolveLocalDataUrls(value) {
  if (!value || typeof value !== "object") return;

  for (const [key, item] of Object.entries(value)) {
    if (key === "url" && typeof item === "string") {
      const stripped = item.replace(/^(?:\.\.\/|\.\/)+/, "");

      if (stripped.startsWith("data/")) {
        value[key] = new URL(stripped, document.baseURI).href;
      } else if (
        /^(?:aus_state\.geojson|australia\.json)$/.test(stripped)
      ) {
        value[key] = new URL(
          "visualization/" + stripped,
          document.baseURI
        ).href;
      } else if (stripped === "city_coordinates.csv") {
        value[key] = new URL(
          "data/city_coordinates.csv",
          document.baseURI
        ).href;
      }
    } else {
      resolveLocalDataUrls(item);
    }
  }
}

// Show an error inside the chart container.
function showChartMessage(container, file, error) {
  container.replaceChildren();

  const box = document.createElement("div");
  box.className = "chart-error";

  const title = document.createElement("strong");
  title.textContent = "Unable to load this chart";

  const explanation = document.createElement("p");
  explanation.textContent =
    "Check the file paths and browser console, then refresh the page.";

  const path = document.createElement("code");
  path.textContent = file;

  box.append(title, explanation, path);
  container.append(box);

  console.error("Chart loading failed:", file, error);
}

// Load all 11 charts.
document.addEventListener("DOMContentLoaded", async () => {
  const chartNumbers = Array.from(
    { length: 11 },
    (_, index) => index + 1
  );

  await Promise.allSettled(
    chartNumbers.map(async (number) => {
      const file = `visualization/idiom_${number}.vg.json`;
      const container = document.getElementById(`idiom${number}`);

      if (!container) {
        console.warn(`Missing HTML container: idiom${number}`);
        return;
      }

      try {
        if (typeof vegaEmbed !== "function") {
          throw new Error("Vega libraries did not load.");
        }

        const response = await fetch(file);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${file}`);
        }

        const specification = await response.json();

        resolveLocalDataUrls(specification);

        // Make the whole chart background transparent.
        specification.background = "transparent";

        // Preserve existing configuration while removing plot fill/border.
        specification.config = {
          ...specification.config,
          view: {
            ...specification.config?.view,
            fill: "transparent",
            stroke: null
          }
        };

        container.replaceChildren();

        await vegaEmbed(container, specification, {
          actions: false, // disable the three dots button
          renderer: [3, 5, 7].includes(number) ? "svg" : "canvas"
        });
      } catch (error) {
        showChartMessage(container, file, error);
      }
    })
  );
});