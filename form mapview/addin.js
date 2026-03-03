geotab.addin.request = (elt, service) => {
  const ADDIN_ID = "azc4ODM3ZTgtNGQ1Yi1jN2V";

  elt.innerHTML = `
    <div class="addin">
      <fieldset>
        <div class="addin_row">
          <label>Device:</label>
        </div>

        <div class="addin_row">
          <label>Hovered device id: </label>
          <span id="hovered_device_id" style="font-weight:600;">—</span>
        </div>

        <!-- Wrap VIN + Vehicle Name so we can hide them together -->
        <div id="vin_vehicle_block" style="display:none;">
          <div class="addin_row">
            <label>VIN: </label>
            <span id="vin_value" style="font-weight:600;">—</span>
          </div>

          <div class="addin_row">
            <label>Vehicle Name: </label>
            <span id="vehicle_name_value" style="font-weight:600;">—</span>
          </div>
        </div>

        <div class="addin_row">
          <label>Last form:</label>
        </div>

        <div id="last_form_data"
             style="margin-top: 5px; padding: 10px; border: 1px solid #ddd; border-radius: 6px; max-height: 40vh; overflow: auto; background: #f8f8f8;">
          Loading AddInData...
        </div>
      </fieldset>
    </div>`;

  const hoveredIdEl = elt.querySelector("#hovered_device_id");
  const vinVehicleBlockEl = elt.querySelector("#vin_vehicle_block");
  const vinEl = elt.querySelector("#vin_value");
  const vehicleNameEl = elt.querySelector("#vehicle_name_value");
  const lastFormEl = elt.querySelector("#last_form_data");

  let allAddInData = [];

  function setVinVehicleVisible(isVisible) {
    vinVehicleBlockEl.style.display = isVisible ? "" : "none";
  }

  function pickLatestForDevice(deviceId) {
    const matches = allAddInData.filter(r => r?.details?.context?.deviceId === deviceId);
    if (!matches.length) return null;
    matches.sort((a, b) => Date.parse(b.details.timestamp) - Date.parse(a.details.timestamp));
    return matches[0];
  }

  function formatValue(v) {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (typeof v === "string" && !Number.isNaN(Date.parse(v)) && v.includes("T")) {
      try { return new Date(v).toLocaleString(); } catch { }
    }
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  }

  function renderFriendlyForm(rec, deviceId) {
    if (!deviceId) {
      setVinVehicleVisible(false);
      vinEl.textContent = "—";
      vehicleNameEl.textContent = "—";
      lastFormEl.textContent = "—";
      return;
    }

    if (!rec) {
      setVinVehicleVisible(false);
      vinEl.textContent = "—";
      vehicleNameEl.textContent = "—";
      lastFormEl.textContent = `No form submissions found for deviceId: ${deviceId}`;
      return;
    }

    setVinVehicleVisible(true);

    const ctx = rec.details?.context || {};
    const data = rec.details?.data || {};

    vinEl.textContent = ctx.vin || "—";
    vehicleNameEl.textContent = ctx.vehicleName || "—";

    const keys = Object.keys(data);
    if (!keys.length) {
      lastFormEl.innerHTML = `<div style="color:#666;">No fields in the last submission.</div>`;
      return;
    }

    const rowsHtml = keys.map(k => {
      const label = String(k);
      const value = formatValue(data[k]);
      return `
        <div style="display:flex; gap:10px; padding:6px 0; border-bottom:1px solid #e5e7eb;">
          <div style="flex:0 0 140px; color:#555; font-weight:600;">${label}</div>
          <div style="flex:1; color:#111; word-break:break-word;">${value}</div>
        </div>
      `;
    }).join("");

    lastFormEl.innerHTML = `
      <div style="margin-bottom:8px; color:#374151;">
        <div><b>Form Name:</b> ${formatValue(rec.details?.formName)}</div>
        <div><b>Submitted:</b> ${formatValue(rec.details?.timestamp)}</div>
      </div>
      <div>${rowsHtml}</div>
    `;
  }

  const ret = service.api.call(
    "Get",
    { typeName: "AddInData", search: { addInId: ADDIN_ID } },
    (results) => {
      allAddInData = Array.isArray(results) ? results : [];
      setVinVehicleVisible(false);
      lastFormEl.textContent = allAddInData.length
        ? "Hover a device to view its last filled form."
        : "No AddInData found for this addInId.";
    },
    (err) => {
      console.error("Get(AddInData) failed:", err);
      allAddInData = [];
      setVinVehicleVisible(false);
      lastFormEl.textContent = "Error loading AddInData. Check console.";
    }
  );

  if (ret && typeof ret.then === "function") {
    ret.then((results) => {
      allAddInData = Array.isArray(results) ? results : [];
      setVinVehicleVisible(false);
      lastFormEl.textContent = allAddInData.length
        ? "Hover a device to view its last filled form."
        : "No AddInData found for this addInId.";
    }).catch((err) => {
      console.error("Get(AddInData) failed:", err);
      allAddInData = [];
      setVinVehicleVisible(false);
      lastFormEl.textContent = "Error loading AddInData. Check console.";
    });
  }

  service.events.attach("over", (data) => {
    if (data?.type !== "device") return;

    const hoveredId = data?.entity?.id;
    if (!hoveredId) return;

    hoveredIdEl.textContent = hoveredId;

    const latest = pickLatestForDevice(hoveredId);
    renderFriendlyForm(latest, hoveredId);
  });
};