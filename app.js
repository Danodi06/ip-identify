const form = document.querySelector("#lookup-form");
const urlInput = document.querySelector("#url-input");
const lookupButton = document.querySelector("#lookup-button");
const statusMessage = document.querySelector("#status");
const results = document.querySelector("#results");
const resultHost = document.querySelector("#result-host");
const addressList = document.querySelector("#address-list");
const rewrittenUrl = document.querySelector("#rewritten-url");
const copyButton = document.querySelector("#copy-button");

let sourceUrl;
let activeController;

function isIpAddress(hostname) {
  if (hostname.includes(":")) return true;
  const octets = hostname.split(".");
  return octets.length === 4 && octets.every((octet) => {
    const value = Number(octet);
    return /^\d{1,3}$/.test(octet) && value >= 0 && value <= 255;
  });
}

function parseUrl(value) {
  const input = value.trim();
  if (!input) throw new Error("Enter a URL or hostname to get started.");

  let parsed;
  try {
    parsed = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    throw new Error("That doesn't look like a valid URL. Check it and try again.");
  }

  if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error("Enter a URL that uses HTTP or HTTPS.");
  }
  return parsed;
}

async function lookupRecords(hostname, signal) {
  const types = [
    { name: "IPv4", code: 1 },
    { name: "IPv6", code: 28 },
  ];
  const responses = await Promise.all(types.map(async (type) => {
    const endpoint = new URL("https://dns.google/resolve");
    endpoint.searchParams.set("name", hostname);
    endpoint.searchParams.set("type", String(type.code));
    const response = await fetch(endpoint, {
      headers: { accept: "application/dns-json" },
      signal,
    });
    if (!response.ok) throw new Error("The DNS service is unavailable right now. Try again shortly.");
    return { type, data: await response.json() };
  }));

  const records = responses.flatMap(({ type, data }) => {
    if (data.Status !== 0) return [];
    return (data.Answer ?? [])
      .filter((answer) => answer.type === type.code)
      .map((answer) => ({ address: answer.data, type: type.name, ttl: answer.TTL }));
  });

  if (records.length === 0) {
    if (responses.every(({ data }) => data.Status === 3)) {
      throw new Error("That hostname doesn't exist. Check the spelling and try again.");
    }
    throw new Error("No public IPv4 or IPv6 addresses were found for that hostname.");
  }
  return records;
}

function buildIpUrl(address) {
  const rewritten = new URL(sourceUrl);
  rewritten.hostname = address.includes(":") ? `[${address}]` : address;
  return rewritten.href;
}

function setStatus(message, kind = "") {
  statusMessage.textContent = message;
  statusMessage.dataset.kind = kind;
  statusMessage.hidden = !message;
}

function renderResults(hostname, records) {
  resultHost.textContent = hostname;
  addressList.replaceChildren();

  for (const [index, record] of records.entries()) {
    const row = document.createElement("div");
    row.className = "address-row";

    const value = document.createElement("span");
    value.className = "address-value";
    value.textContent = record.address;

    const type = document.createElement("span");
    type.className = "address-type";
    type.textContent = record.ttl === null ? record.type : `${record.type} · TTL ${record.ttl}s`;

    const useButton = document.createElement("button");
    useButton.className = "use-address";
    useButton.type = "button";
    useButton.textContent = "Use IP";
    useButton.setAttribute("aria-pressed", String(index === 0));
    useButton.addEventListener("click", () => {
      rewrittenUrl.value = buildIpUrl(record.address);
      addressList.querySelectorAll(".use-address").forEach((button) => button.setAttribute("aria-pressed", "false"));
      useButton.setAttribute("aria-pressed", "true");
      setStatus("");
    });

    row.append(value, type, useButton);
    addressList.append(row);
  }

  rewrittenUrl.value = buildIpUrl(records[0].address);
  results.hidden = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (activeController) activeController.abort();
  activeController = new AbortController();
  lookupButton.disabled = true;
  lookupButton.querySelector("span:first-child").textContent = "Looking up";
  results.hidden = true;

  try {
    const parsed = parseUrl(urlInput.value);
    sourceUrl = parsed.href;
    const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
    let records;

    if (isIpAddress(hostname)) {
      records = [{ address: hostname, type: hostname.includes(":") ? "IPv6" : "IPv4", ttl: null }];
    } else {
      setStatus(`Looking up ${hostname}...`);
      records = await lookupRecords(hostname, activeController.signal);
    }

    renderResults(hostname, records);
    setStatus(isIpAddress(hostname) ? "This URL already uses an IP address." : `${records.length} address${records.length === 1 ? "" : "es"} found.`, "success");
  } catch (error) {
    if (error.name !== "AbortError") {
      results.hidden = true;
      setStatus(error.message, "error");
    }
  } finally {
    lookupButton.disabled = false;
    lookupButton.querySelector("span:first-child").textContent = "Resolve";
    activeController = null;
  }
});

document.querySelector(".example-button").addEventListener("click", () => {
  urlInput.value = "example.com";
  urlInput.focus();
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(rewrittenUrl.value);
    copyButton.querySelector("span").textContent = "Copied";
    setStatus("IP-based URL copied to clipboard.", "success");
    window.setTimeout(() => { copyButton.querySelector("span").textContent = "Copy"; }, 1600);
  } catch {
    rewrittenUrl.select();
    setStatus("Clipboard access is unavailable. Select and copy the URL above.", "error");
  }
});