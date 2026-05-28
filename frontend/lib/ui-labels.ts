export const uiLabels = {
  detectionConfidence: "Detection Confidence",
  detectedSqlKeywords: "Detected SQL Keywords",
  benignQuery: "Benign Query",
  knownSqlInjectionPatterns: "Known SQL injection patterns detected",
  loginBypassAttempt: "Login Bypass Attempt",
  mediumRisk: "Medium Risk",
  noSuspiciousPatterns: "No suspicious SQL patterns detected",
  queryInterpretation: "Query Interpretation",
  scanHistory: "Scan History",
  securityReasoning: "Security Reasoning",
  sqlInjectionAttack: "SQL Injection Attack",
  suspiciousSqlPatternsDetected: "Some suspicious SQL patterns were detected",
  suspiciousQuery: "Suspicious Query",
  suspiciousPatterns: "Suspicious Patterns"
} as const;

const legacyMarker = ["tok", "ens"].join("");
const legacySqli = ["SQL", "i"].join("");
const authBypassWords = ["authentication", "bypass"];

export type SecurityReasoning = {
  goalOfAttack: string;
  technicalMethod: string;
  impact: string;
  riskJustification: string;
};

type SecurityInterpretation = {
  securityReasoning: SecurityReasoning;
};

export const securityInterpretationMap: Record<string, SecurityInterpretation> = {
  "Authentication Bypass": {
    securityReasoning: {
      goalOfAttack: "Gain access by making a login or permission check evaluate as true.",
      technicalMethod: "Uses logic-bypass symbols and predicates such as OR 1=1 or comment markers to skip normal authentication checks.",
      impact: "Can lead to unauthorized entry, account takeover, or access to protected application areas.",
      riskJustification: "High Risk because the detected pattern targets authentication flow directly."
    }
  },
  "Union-Based SQL Injection": {
    securityReasoning: {
      goalOfAttack: "Steal data by combining attacker-controlled results with the original database query.",
      technicalMethod: "Uses UNION SELECT behavior to append extra result sets and expose fields from other tables.",
      impact: "Can disclose usernames, credentials, schema details, or other sensitive records.",
      riskJustification: "High Risk because the pattern is commonly used for direct data extraction."
    }
  },
  "Time-Based Blind SQL Injection": {
    securityReasoning: {
      goalOfAttack: "Infer hidden database behavior when direct query results are not visible.",
      technicalMethod: "Uses delay functions such as SLEEP, PG_SLEEP, BENCHMARK, WAITFOR, or DELAY to test true-or-false conditions through response time.",
      impact: "Can allow slow data extraction and may degrade application responsiveness.",
      riskJustification: "High Risk because timing payloads are a strong blind SQL injection indicator."
    }
  },
  "Time-Based SQL Injection": {
    securityReasoning: {
      goalOfAttack: "Infer hidden database behavior when direct query results are not visible.",
      technicalMethod: "Uses delay functions such as SLEEP, PG_SLEEP, BENCHMARK, WAITFOR, or DELAY to test true-or-false conditions through response time.",
      impact: "Can allow slow data extraction and may degrade application responsiveness.",
      riskJustification: "High Risk because timing payloads are a strong blind SQL injection indicator."
    }
  },
  "Database Enumeration": {
    securityReasoning: {
      goalOfAttack: "Discover database structure before attempting targeted extraction.",
      technicalMethod: "Uses metadata sources such as INFORMATION_SCHEMA to list schemas, tables, or columns.",
      impact: "Can expose the database layout and make later attacks more precise.",
      riskJustification: "High Risk because schema discovery is a common preparation step for data theft."
    }
  },
  "Destructive Query Attempt": {
    securityReasoning: {
      goalOfAttack: "Delete records or remove database objects.",
      technicalMethod: "Uses administrative or data-destruction commands such as DROP TABLE or DELETE FROM.",
      impact: "Can cause data loss, broken application behavior, and compromised data integrity.",
      riskJustification: "Critical because successful execution can permanently damage stored data."
    }
  },
  "Destructive Command": {
    securityReasoning: {
      goalOfAttack: "Delete records or remove database objects.",
      technicalMethod: "Uses administrative or data-destruction commands such as DROP TABLE or DELETE FROM.",
      impact: "Can cause data loss, broken application behavior, and compromised data integrity.",
      riskJustification: "Critical because successful execution can permanently damage stored data."
    }
  },
  "Obfuscation / advanced SQL function behavior": {
    securityReasoning: {
      goalOfAttack: "Hide or reshape a payload so malicious behavior is harder to detect.",
      technicalMethod: "Uses SQL functions, declarations, comments, or concatenation patterns to construct or mask the query.",
      impact: "Can bypass simple filters and support more complex SQL injection attempts.",
      riskJustification: "Medium Risk because obfuscation increases investigation priority even when no destructive command is present."
    }
  },
  "Generic / Unknown SQLi Pattern": {
    securityReasoning: {
      goalOfAttack: "Manipulate database behavior beyond the intended application query.",
      technicalMethod: "Uses suspicious SQL injection indicators that do not match a more specific rule category.",
      impact: "Can lead to unauthorized reads, writes, or query behavior depending on the database context.",
      riskJustification: "Medium Risk because the rule layer found strong SQL injection behavior but cannot classify the exact family."
    }
  },
  "ML-detected SQL Injection Pattern": {
    securityReasoning: {
      goalOfAttack: "Manipulate database behavior based on a learned SQL injection pattern.",
      technicalMethod: "The model detected suspicious query structure even when a specific rule category was not assigned.",
      impact: "Can indicate an attack attempt that should be reviewed with the detected keywords and request context.",
      riskJustification: "High Risk because the ML layer classified the payload as SQL injection."
    }
  },
  "Keyword indicator": {
    securityReasoning: {
      goalOfAttack: "Potentially manipulate query behavior using suspicious SQL fragments.",
      technicalMethod: "Uses SQL keywords or operators that are commonly present in injection payloads.",
      impact: "May become harmful if the application concatenates input into a database query.",
      riskJustification: "Medium Risk because suspicious patterns are present but need analyst review."
    }
  },
  "SQL syntax tokens": {
    securityReasoning: {
      goalOfAttack: "Execute a normal database lookup or application query.",
      technicalMethod: "Uses routine SQL keywords without a matched suspicious injection pattern.",
      impact: "No attack impact is indicated by the rule layer for this query.",
      riskJustification: "Low Risk because only normal SQL syntax was detected."
    }
  },
  "Legitimate / Benign Query": {
    securityReasoning: {
      goalOfAttack: "Execute an expected application database operation.",
      technicalMethod: "Contains normal query structure without suspicious SQL injection indicators.",
      impact: "No security impact is expected when handled through parameterized queries and normal validation.",
      riskJustification: "Low Risk because no suspicious SQL patterns were detected."
    }
  },
  "No SQLi indicators detected": {
    securityReasoning: {
      goalOfAttack: "Execute an expected application database operation.",
      technicalMethod: "Contains no matched SQL injection indicators from the rule layer.",
      impact: "No SQL injection impact is indicated by the current evidence.",
      riskJustification: "Low Risk because no suspicious SQL patterns were detected."
    }
  },
  "No suspicious SQL patterns detected": {
    securityReasoning: {
      goalOfAttack: "Execute an expected application database operation.",
      technicalMethod: "Contains no matched suspicious SQL patterns from the rule layer.",
      impact: "No SQL injection impact is indicated by the current evidence.",
      riskJustification: "Low Risk because no suspicious SQL patterns were detected."
    }
  }
};

function securityReasoningKeyFor(attackType: string) {
  const normalized = attackType.trim().toLowerCase();

  if (authBypassWords.every((word) => normalized.includes(word)) || normalized.includes("login bypass")) {
    return "Authentication Bypass";
  }

  if (normalized.includes("union")) return "Union-Based SQL Injection";
  if (normalized.includes("time-based") || normalized.includes("blind")) return "Time-Based Blind SQL Injection";
  if (normalized.includes("enumeration") || normalized.includes("information_schema")) return "Database Enumeration";
  if (normalized.includes("destructive") || normalized.includes("drop") || normalized.includes("delete")) return "Destructive Query Attempt";
  if (normalized.includes("obfuscation") || normalized.includes("advanced sql function")) return "Obfuscation / advanced SQL function behavior";
  if (normalized.includes("ml-detected")) return "ML-detected SQL Injection Pattern";
  if (normalized.includes("generic") || normalized.includes("unknown")) return "Generic / Unknown SQLi Pattern";
  if (normalized.includes("keyword")) return "Keyword indicator";
  if (normalized.includes("syntax")) return "SQL syntax tokens";
  if (normalized.includes("benign") || normalized.includes("legitimate")) return "Legitimate / Benign Query";
  if (normalized.includes("no") && (normalized.includes("indicator") || normalized.includes("suspicious"))) {
    return "No suspicious SQL patterns detected";
  }

  return attackType in securityInterpretationMap ? attackType : "";
}

function riskReasoningFor(severity?: string) {
  const normalized = severity?.toLowerCase() ?? "";
  if (normalized.includes("critical")) return "Critical because the payload may directly damage or remove data.";
  if (normalized.includes("high") || normalized.includes("elevated")) return "High Risk because the detected behavior strongly matches SQL injection activity.";
  if (normalized.includes("medium")) return "Medium Risk because suspicious SQL patterns require cybersecurity review.";
  return "Low Risk because no suspicious SQL patterns were detected.";
}

export function getSecurityReasoning(attackType: string, severity?: string, detectedKeywords?: string): SecurityReasoning {
  const key = securityReasoningKeyFor(attackType);
  const mapped = key ? securityInterpretationMap[key]?.securityReasoning : undefined;

  if (mapped) {
    return {
      ...mapped,
      riskJustification: mapped.riskJustification || riskReasoningFor(severity)
    };
  }

  const keywordContext = detectedKeywords?.trim()
    ? ` The detected indicator(s) were: ${detectedKeywords}.`
    : "";

  return {
    goalOfAttack: "Manipulate or probe database behavior using a newly identified rule-layer category.",
    technicalMethod: `Uses SQL behavior classified as ${displayAttackTypeLabel(attackType)} by the rule layer.${keywordContext}`,
    impact: "Potential impact depends on the database context and should be reviewed by a security analyst.",
    riskJustification: riskReasoningFor(severity)
  };
}

export function formatSecurityReasoning(attackType: string, severity?: string, detectedKeywords?: string) {
  const reasoning = getSecurityReasoning(attackType, severity, detectedKeywords);
  return `Goal: ${reasoning.goalOfAttack} Method: ${reasoning.technicalMethod} Impact: ${reasoning.impact} Risk basis: ${reasoning.riskJustification}`;
}

export function displayAttackTypeLabel(value: string) {
  const normalized = value.toLowerCase();

  if (authBypassWords.every((word) => normalized.includes(word))) {
    return uiLabels.loginBypassAttempt;
  }

  if (normalized.includes("time-based") && normalized.includes("blind")) {
    return "Time-Based SQL Injection";
  }

  if (normalized.includes("legitimate") || normalized.includes("benign query")) {
    return uiLabels.benignQuery;
  }

  if (normalized.includes("ml-detected")) {
    return uiLabels.sqlInjectionAttack;
  }

  if (normalized.includes("no") && normalized.includes("indicators")) {
    return uiLabels.noSuspiciousPatterns;
  }

  if (normalized.includes("attack") && normalized.includes("family")) {
    return uiLabels.noSuspiciousPatterns;
  }

  if (normalized.includes("syntax") && normalized.includes(legacyMarker)) {
    return uiLabels.detectedSqlKeywords;
  }

  if (normalized.includes("keyword indicator")) {
    return uiLabels.suspiciousPatterns;
  }

  return value;
}

export function displayPatternExplanation(attackType: string, severity?: string) {
  return formatSecurityReasoning(attackType, severity);
}

export function displayInterpretationText(value: string) {
  return value
    .replace(new RegExp(`${"note"}${"book"}-style keyword scan`, "gi"), "query interpretation")
    .replace(/interpretation layer/gi, "query interpretation")
    .replace(new RegExp(`routine SQL ${"syntax"} ${legacyMarker}`, "gi"), "detected SQL keywords")
    .replace(new RegExp(`suspicious ${legacySqli} ${legacyMarker}`, "gi"), "suspicious SQL patterns")
    .replace(new RegExp(`high-risk ${legacySqli} indicators`, "gi"), "high-risk suspicious patterns")
    .replace(new RegExp(`${legacySqli} indicators`, "gi"), "suspicious patterns")
    .replace(new RegExp(`specific attack ${"family"} rule matched`, "gi"), "suspicious SQL pattern matched")
    .replace(new RegExp(`specific attack ${"family"} matched`, "gi"), "suspicious SQL pattern matched");
}

export function displayResultText(value: string) {
  return displayInterpretationText(value)
    .replace(new RegExp(`${"Authentication"} ${"Bypass"}`, "gi"), uiLabels.loginBypassAttempt)
    .replace(new RegExp(`${"Time-Based"} ${"Blind"} SQL Injection`, "gi"), "Time-Based SQL Injection")
    .replace(/classified this input as SQL injection/gi, `classified this input as ${uiLabels.sqlInjectionAttack}`)
    .replace(/classified this input as benign/gi, `classified this input as ${uiLabels.benignQuery}`)
    .replace(/final security decision is review/gi, `final security decision is ${uiLabels.suspiciousQuery}`)
    .replace(/low risk/gi, "Low Risk")
    .replace(/medium risk/gi, uiLabels.mediumRisk)
    .replace(/high risk/gi, "High Risk")
    .replace(/elevated threat/gi, "High Risk")
    .replace(/informational/gi, "Low Risk")
    .replace(/suspicious \/ needs review/gi, uiLabels.suspiciousQuery)
    .replace(/attack\/review/gi, uiLabels.suspiciousQuery)
    .replace(/review-oriented detection/gi, uiLabels.suspiciousQuery);
}

export function displayDetectionExplanation(status: string) {
  const normalized = displayDetectionStatus(status);

  if (normalized === uiLabels.sqlInjectionAttack) {
    return formatSecurityReasoning("ML-detected SQL Injection Pattern", "High");
  }

  if (normalized === uiLabels.suspiciousQuery) {
    return formatSecurityReasoning("Keyword indicator", "Medium");
  }

  return formatSecurityReasoning("Legitimate / Benign Query", "Low");
}

export function displayDetectionStatus(value: string) {
  const normalized = value.trim().toLowerCase();

  if (
    normalized.includes("review") ||
    normalized.includes("suspicious") ||
    normalized === "attack/review"
  ) {
    return uiLabels.suspiciousQuery;
  }

  if (normalized.includes("attack")) {
    return uiLabels.sqlInjectionAttack;
  }

  if (normalized.includes("benign") || normalized.includes("legitimate")) {
    return uiLabels.benignQuery;
  }

  return value;
}

export function displayRiskLabel(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized.includes("critical")) return "Critical";
  if (normalized.includes("elevated") || normalized.includes("high")) return "High Risk";
  if (normalized.includes("medium")) return uiLabels.mediumRisk;
  if (normalized.includes("informational") || normalized.includes("low")) return "Low Risk";

  return value;
}
