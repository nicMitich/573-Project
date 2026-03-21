const fs = require("fs");
const path = require("path");


function pickBetween(text, startLabel, endLabelOptions) {
  const startIdx = text.indexOf(startLabel);
  if (startIdx === -1) return null;
  const afterStart = text.slice(startIdx + startLabel.length);

  let endIdx = afterStart.length;
  for (const endLabel of endLabelOptions) {
    const i = afterStart.indexOf(endLabel);
    if (i !== -1 && i < endIdx) endIdx = i;
  }
  return afterStart.slice(0, endIdx).trim() || null;
}

/**
 * Parse salary string like "$70–80K/yr" or "$25–30/hr"
 * Returns { min_salary, max_salary, med_salary, pay_period, currency }
 */
function parseSalary(salaryStr) {
  if (!salaryStr) return null;

  const currency = "USD";
  let pay_period = null;

  if (/\/yr/i.test(salaryStr)) pay_period = "YEARLY";
  else if (/\/hr/i.test(salaryStr)) pay_period = "HOURLY";
  else if (/\/mo/i.test(salaryStr)) pay_period = "MONTHLY";

  // Match patterns like "$70–80K" or "$25–30" or "$120K"
  const rangeMatch = salaryStr.match(
    /\$\s*([\d,.]+)\s*[–\-–]\s*([\d,.]+)\s*(K)?/i
  );
  const singleMatch = salaryStr.match(/\$\s*([\d,.]+)\s*(K)?/i);

  let min_salary = null;
  let max_salary = null;

  if (rangeMatch) {
    min_salary = parseFloat(rangeMatch[1].replace(/,/g, ""));
    max_salary = parseFloat(rangeMatch[2].replace(/,/g, ""));
    if (rangeMatch[3]) {
      // "K" suffix — multiply both
      min_salary *= 1000;
      max_salary *= 1000;
    }
  } else if (singleMatch) {
    min_salary = parseFloat(singleMatch[1].replace(/,/g, ""));
    if (singleMatch[2]) min_salary *= 1000;
    max_salary = min_salary;
  }

  const med_salary =
    min_salary != null && max_salary != null
      ? (min_salary + max_salary) / 2
      : null;

  return { min_salary, max_salary, med_salary, pay_period, currency, compensation_type: "BASE_SALARY" };
}

/**
 * Map company size text like "10-50 employees" to professor's 0-7 scale
 */
const SIZE_RANGES = [
  [null, 10, 0],
  [11, 50, 1],
  [51, 200, 2],
  [201, 500, 3],
  [501, 1000, 4],
  [1001, 5000, 5],
  [5001, 10000, 6],
  [10001, null, 7],
];

function parseCompanySize(sizeStr) {
  if (!sizeStr) return null;
  const m = sizeStr.match(/([\d,]+)\s*[-–]\s*([\d,]+)/);
  if (!m) return null;
  const low = parseInt(m[1].replace(/,/g, ""));
  const high = parseInt(m[2].replace(/,/g, ""));
  const mid = (low + high) / 2;
  for (const [lo, hi, val] of SIZE_RANGES) {
    const inLow = lo == null || mid >= lo;
    const inHigh = hi == null || mid <= hi;
    if (inLow && inHigh) return val;
  }
  return null;
}

/**
 * Determine remote_allowed from location/work-mode text
 */
function parseRemoteAllowed(locationStr) {
  if (!locationStr) return null;
  if (/\bremote\b/i.test(locationStr)) return 1;
  if (/\bhybrid\b/i.test(locationStr)) return 1;
  if (/\bonsite\b/i.test(locationStr)) return 0;
  return null;
}

/**
 * Map work type strings to professor's codes
 */
function mapWorkType(jobType) {
  if (!jobType) return { formatted_work_type: null, work_type: null };
  const lower = jobType.toLowerCase();
  if (lower.includes("full")) return { formatted_work_type: "Full-time", work_type: "FULL_TIME" };
  if (lower.includes("part")) return { formatted_work_type: "Part-time", work_type: "PART_TIME" };
  if (lower.includes("intern")) return { formatted_work_type: "Internship", work_type: "INTERNSHIP" };
  if (lower.includes("contract")) return { formatted_work_type: "Contract", work_type: "CONTRACT" };
  return { formatted_work_type: jobType, work_type: null };
}

/**
 * Parse benefits from "What this job offers" section
 */
function parseBenefits(text) {
  const block = pickBetween(text, "What this job offers", [
    "About the employer",
    "Similar Jobs",
  ]);
  if (!block) return [];

  const benefits = [];
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);

  // Skip the first line if it's a salary repeat
  for (const line of lines) {
    if (/^\$/.test(line)) continue; // skip salary line
    if (/medical/i.test(line)) benefits.push("Medical Insurance");
    if (/dental/i.test(line)) benefits.push("Dental Insurance");
    if (/vision/i.test(line)) benefits.push("Vision Insurance");
    if (/401\s*\(?\s*k\s*\)?/i.test(line)) benefits.push("401(k)");
    if (/paid\s*time\s*off|pto/i.test(line)) benefits.push("Paid Time Off");
    if (/bonus/i.test(line)) benefits.push("Bonus");
    if (/stock|equity|rsu/i.test(line)) benefits.push("Equity");
    if (/tuition/i.test(line)) benefits.push("Tuition Reimbursement");
    if (/parental|maternity|paternity/i.test(line)) benefits.push("Parental Leave");
    if (/disability/i.test(line)) benefits.push("Disability Insurance");
    if (/life\s*insurance/i.test(line)) benefits.push("Life Insurance");
    if (/commuter/i.test(line)) benefits.push("Commuter Benefits");
  }

  // Deduplicate
  return [...new Set(benefits)];
}

/**
 * Parse employer info from "About the employer" section
 */
function parseEmployer(text) {
  const block = pickBetween(text, "About the employer", [
    "Similar Jobs",
    "Alumni in similar roles",
  ]);
  if (!block) return {};

  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  const info = {};
  const addressLines = []; // track which lines are address/location so we skip them for description

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\d[\d,]*\s*[-–]\s*[\d,]+\s*employees/i.test(line)) {
      info.company_size = parseCompanySize(line);
      info.employee_count = parseMidEmployeeCount(line);
      addressLines.push(i);
    } else if (/^follow$/i.test(line) || /^learn more/i.test(line)) {
      addressLines.push(i);
      continue;
    } else if (parseFullAddress(line)) {
      // Full address: "401 City Avenue, Bala Cynwyd, Pennsylvania 19004, United States"
      const addr = parseFullAddress(line);
      Object.assign(info, addr);
      addressLines.push(i);
    } else if (/,\s*[A-Z]{2}$/.test(line) && !info.city) {
      // Short format: "Henderson, NV"
      const parts = line.split(",").map((s) => s.trim());
      info.city = parts[0] || null;
      info.state = parts[1] || null;
      info.country = "US";
      addressLines.push(i);
    }
  }

  // First non-company-name line is often the industry
  // (company name is lines[0], industry is lines[1])
  if (lines.length >= 2 && !/follow/i.test(lines[1])) {
    info.industry = lines[1];
  }

  // Description: longest line that is NOT an address, company name, industry, or UI element
  const skipIndices = new Set([0, 1, ...addressLines]); // skip company name (0), industry (1), addresses
  const descLine = lines.filter(
    (l, idx) =>
      !skipIndices.has(idx) &&
      l.length > 40 &&
      !/follow/i.test(l) &&
      !/learn more/i.test(l) &&
      !/^\d[\d,]*\s*[-–]/i.test(l) // not employee count
  );
  if (descLine.length > 0) info.description = descLine[0];

  return info;
}

/**
 * US state name → abbreviation map (for full address parsing)
 */
const STATE_ABBR = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
  wisconsin: "WI", wyoming: "WY", "district of columbia": "DC",
};

/**
 * Parse full address like "401 City Avenue, Bala Cynwyd, Pennsylvania 19004, United States"
 * Returns { address, city, state, zip_code, country } or null if not a recognizable address
 */
function parseFullAddress(line) {
  if (!line) return null;

  // Must contain "United States" or a US state name or a zip code pattern
  const hasCountry = /united states/i.test(line);
  const hasZip = /\b\d{5}(-\d{4})?\b/.test(line);

  // Check for a US state full name
  const lowerLine = line.toLowerCase();
  let foundState = null;
  for (const [name, abbr] of Object.entries(STATE_ABBR)) {
    if (lowerLine.includes(name)) {
      foundState = abbr;
      break;
    }
  }

  if (!hasCountry && !hasZip && !foundState) return null;

  const parts = line.split(",").map((s) => s.trim());
  const result = { country: hasCountry ? "US" : "US" };

  // Remove "United States" from parts
  const filtered = parts.filter((p) => !/united states/i.test(p));

  if (filtered.length >= 3) {
    // Pattern: "Street, City, State ZIP"
    result.address = filtered[0];
    result.city = filtered[1];

    // Last part is usually "State ZIP" or just "State"
    const stateZipPart = filtered[filtered.length - 1];
    const zipMatch = stateZipPart.match(/\b(\d{5}(-\d{4})?)\b/);
    if (zipMatch) {
      result.zip_code = zipMatch[1];
      result.state = foundState || stateZipPart.replace(zipMatch[0], "").trim();
    } else {
      result.state = foundState || stateZipPart;
    }
  } else if (filtered.length === 2) {
    // Pattern: "City, State ZIP"
    result.city = filtered[0];
    const stateZipPart = filtered[1];
    const zipMatch = stateZipPart.match(/\b(\d{5}(-\d{4})?)\b/);
    if (zipMatch) {
      result.zip_code = zipMatch[1];
      result.state = foundState || stateZipPart.replace(zipMatch[0], "").trim();
    } else {
      result.state = foundState || stateZipPart;
    }
  } else if (filtered.length === 1) {
    result.state = foundState || null;
  }

  // Normalize state to abbreviation if we got a full name
  if (result.state && result.state.length > 2) {
    result.state = foundState || result.state;
  }

  return result;
}

function parseMidEmployeeCount(sizeStr) {
  if (!sizeStr) return null;
  const m = sizeStr.match(/([\d,]+)\s*[-–]\s*([\d,]+)/);
  if (!m) return null;
  return Math.round(
    (parseInt(m[1].replace(/,/g, "")) + parseInt(m[2].replace(/,/g, ""))) / 2
  );
}

/**
 * Parse experience level from "What they're looking for" section
 */
function parseExperienceLevel(text) {
  const block = pickBetween(text, "What they're looking for", [
    "What this job offers",
    "About the employer",
    "Similar Jobs",
  ]);
  if (!block) return null;

  const lower = block.toLowerCase();
  if (/\bphd\b|\bdoctoral\b/.test(lower)) return "Doctoral";
  if (/\bmaster'?s?\b|\bms\b|\bma\b/.test(lower)) return "Masters";
  if (/\bbachelor'?s?\b|\bbs\b|\bba\b/.test(lower)) return "Bachelors";
  if (/\bassociate'?s?\b/.test(lower)) return "Associates";
  return null;
}

/**
 * Strip the location to just city/state, removing work-mode prefixes
 */
function cleanLocation(locationStr) {
  if (!locationStr) return null;

  // If purely remote with no real city, return "Remote"
  const stripped = locationStr
    .replace(/^(onsite|remote|hybrid)\s*,?\s*(based\s+in\s*)?/i, "")
    .replace(/^or\s+(onsite|remote|hybrid)\s*,?\s*(based\s+in\s*)?/i, "")
    .trim();

  // Check if original line is remote and there's no real location left
  if (/\bremote\b/i.test(locationStr) && (!stripped || stripped.length > 80 || !/[A-Z]{2}/.test(stripped))) {
    return "Remote";
  }

  return stripped || null;
}

function parseJob(raw) {
  const mainText = raw.mainText || "";
  const t = mainText.replace(/\u00a0/g, " ").replace(/\s+\n/g, "\n").trim();

  // --- Basic fields ---
  const jobIdMatch = (raw.url || "").match(/\/(?:jobs|job-search)\/(\d+)/);
  const job_id = jobIdMatch ? parseInt(jobIdMatch[1]) : null;

  // Posted / Apply-by
  const postedMatch = t.match(
    /Posted\s+([^\n∙]+)\s*∙\s*Apply by\s+([^\n]+)/i
  );
  const listed_time = postedMatch ? postedMatch[1].trim() : null;
  const expiry = postedMatch ? postedMatch[2].trim() : null;

  // Salary
  const salaryMatch = t.match(/At a glance\s*\n([$\d][^\n]+)/i);
  const salaryStr = salaryMatch ? salaryMatch[1].trim() : null;
  const salary = parseSalary(salaryStr);

  // Location
  const locationMatch =
    t.match(/\n(Onsite[^\n]+)/i) ||
    t.match(/\n(Remote[^\n]+)/i) ||
    t.match(/\n(Hybrid[^\n]+)/i);
  const rawLocation = locationMatch ? locationMatch[1].trim() : null;
  const remote_allowed = parseRemoteAllowed(rawLocation);
  const location = cleanLocation(rawLocation);

  // Job type
  const jobTypeMatch = t.match(/\nJob\s*\n([^\n]+)/i);
  const jobTypeRaw = jobTypeMatch ? jobTypeMatch[1].trim() : null;
  const { formatted_work_type, work_type } = mapWorkType(jobTypeRaw);

  // Work authorization (Handshake-specific, kept as extra field)
  const workAuthMatch = t.match(
    /\n(US work authorization required[^\n]*)/i
  );
  const work_authorization = workAuthMatch
    ? workAuthMatch[1].trim()
    : null;

  const optMatch = t.match(
    /\n(Open to candidates with OPT\/CPT[^\n]*)/i
  );
  const opt_cpt = optMatch ? optMatch[1].trim() : null;

  // Description: try "Job description" first (catches everything), then specific headers
  let description = pickBetween(t, "Job description", [
    "Less",
    "What they're looking for",
    "What this job offers",
  ]);
  if (!description) {
    description = pickBetween(t, "About the Role", [
      "Less",
      "What they're looking for",
      "What this job offers",
    ]);
  }

  // Strip UI junk from end of description (Save, Apply, etc.)
  if (description) {
    description = description
      .replace(/[\n\s]*(Save|Apply|Apply Now|Show more|Show less)[\n\s]*/gi, (match, _w, offset) => {
        // Only strip if near the end of the description
        return offset > description.length - 30 ? "" : match;
      })
      .trim();
  }

  // Experience level
  const formatted_experience_level = parseExperienceLevel(t);

  // Employer info
  const employer = parseEmployer(t);

  // Benefits
  const benefitTypes = parseBenefits(t);

  // Industry from first lines (company name, then industry)
  const firstLines = t.split("\n").map((l) => l.trim()).filter(Boolean);
  const industry =
    employer.industry ||
    (firstLines.length >= 2 ? firstLines[1] : null);

  // ── Build flat output matching team-agreed structure ──

  const result = {
    job_id: job_id != null ? String(job_id) : null,
    company_name: raw.company || null,
    title: raw.title || null,
    description: description || null,
    max_salary: salary ? salary.max_salary : null,
    pay_period: salary ? salary.pay_period : null,
    location,
    company_id: null,
    views: null,
    med_salary: salary ? salary.med_salary : null,
  };

  return result;
}


module.exports = { parseJob };


if (require.main === module) {
  const inputFile = process.argv[2] || path.join(__dirname, "..", "raw", "one_job.json");
  const raw = JSON.parse(fs.readFileSync(inputFile, "utf8"));
  const parsed = parseJob(raw);

  const jobId = parsed.job_id || "unknown";
  const outDir = path.join(__dirname, "..", "clean");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, `${jobId}.json`);
  fs.writeFileSync(outFile, JSON.stringify(parsed, null, 2));
  console.log(`Wrote ${outFile}`);
}
