import re
from typing import Dict, List, Tuple
from urllib.parse import unquote


PREPROCESS_PATTERN = r'[^a-zA-Z0-9\s=\<\>\!\'"\(\)\[\]\{\}\-_\+\/\*\&\|\%\.\,\;\:\#\]]+'


def preprocess_text(text: object) -> str:
    """Preprocessing copied from the updated official Colab notebook."""
    text = unquote(str(text))
    if not isinstance(text, str):
        text = str(text)

    text = text.lower()
    text = re.sub(PREPROCESS_PATTERN, "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


ATTACK_PATTERNS = [
    {
        "attack_type": "Authentication Bypass",
        "severity": "High",
        "patterns": [
            r"\bor\s+1\s*=\s*1\b",
            r"admin'\s*--",
            r"'\s*or\s*''\s*=\s*'",
            r"'\s*or\s*'?\d+'?\s*=\s*'?\d+",
            r"\bor\s+['\"][^'\"]+['\"]\s*=\s*['\"][^'\"]+['\"]",
        ],
        "tokens": ["OR 1=1", "OR", "--"],
        "meaning": "Attempts to force a login or predicate check to always evaluate as true.",
    },
    {
        "attack_type": "Union-Based SQL Injection",
        "severity": "High",
        "patterns": [r"\bunion\s+select\b", r"\bunion\s+all\s+select\b"],
        "tokens": ["UNION SELECT", "UNION", "SELECT"],
        "meaning": "Attempts to append attacker-controlled result sets to the original query.",
    },
    {
        "attack_type": "Time-Based Blind SQL Injection",
        "severity": "High",
        "patterns": [r"\bpg_sleep\s*\(", r"\bwaitfor\s+delay\b", r"\bbenchmark\s*\(", r"\bsleep\s*\(", r"\bdelay\b"],
        "tokens": ["SLEEP", "PG_SLEEP", "BENCHMARK", "DELAY"],
        "meaning": "Attempts to infer database behavior by forcing delayed responses.",
    },
    {
        "attack_type": "Database Enumeration",
        "severity": "High",
        "patterns": [r"\binformation_schema\b"],
        "tokens": ["INFORMATION_SCHEMA"],
        "meaning": "Attempts to inspect database metadata such as tables, schemas, or columns.",
    },
    {
        "attack_type": "Destructive Query Attempt",
        "severity": "Critical",
        "patterns": [r"\bdrop\s+table\b", r"\bdelete\s+from\b"],
        "tokens": ["DROP TABLE", "DELETE FROM"],
        "meaning": "Attempts to destroy or remove database objects or records.",
    },
    {
        "attack_type": "Obfuscation / advanced SQL function behavior",
        "severity": "Medium",
        "patterns": [r"\bdeclare\b", r"\belt\s*\(", r"\bmake_set\s*\(", r"\bconcat\s*\(", r"/\*\*/", r"/\*.*?\*/"],
        "tokens": ["DECLARE", "ELT", "MAKE_SET", "CONCAT", "/**/"],
        "meaning": "Uses SQL functions or declaration syntax commonly seen in advanced payload shaping.",
    },
]

STRONG_SQLI_PATTERNS = [
    r"\bunion\s+(all\s+)?select\b",
    r"\bor\s+1\s*=\s*1\b",
    r"'\s*or\s*'?\d+'?\s*=\s*'?\d+",
    r"\bor\s+['\"][^'\"]+['\"]\s*=\s*['\"][^'\"]+['\"]",
    r"\bsleep\s*\(",
    r"\bbenchmark\s*\(",
    r"\bwaitfor\s+delay\b",
    r"\binformation_schema\b",
    r"\bdrop\s+table\b",
    r"\bdelete\s+from\b",
    r"/\*\*/",
    r"/\*.*?\*/",
]


KEYWORD_PATTERNS = [
    ("or", r"\bor\b"),
    ("and", r"\band\b"),
    ("union", r"\bunion\b"),
    ("select", r"\bselect\b"),
    ("1=1", r"1\s*=\s*1"),
    ("--", r"--"),
    ("/*", r"/\*"),
    ("*/", r"\*/"),
    ("sleep", r"\bsleep\b|\bsleep\s*\("),
    ("pg_sleep", r"\bpg_sleep\s*\("),
    ("benchmark", r"\bbenchmark\s*\("),
    ("delay", r"\bdelay\b"),
    ("information_schema", r"\binformation_schema\b"),
    ("drop", r"\bdrop\b"),
    ("drop table", r"\bdrop\s+table\b"),
    ("delete", r"\bdelete\b"),
    ("delete from", r"\bdelete\s+from\b"),
    ("declare", r"\bdeclare\b"),
    ("elt", r"\belt\s*\("),
    ("make_set", r"\bmake_set\s*\("),
    ("concat", r"\bconcat\s*\("),
    ("exec", r"\bexec(?:ute)?\b"),
    ("cast", r"\bcast\s*\("),
    ("convert", r"\bconvert\s*\("),
    ("insert", r"\binsert\b"),
    ("update", r"\bupdate\b"),
    ("where", r"\bwhere\b"),
    ("limit", r"\blimit\b"),
    (";", r";"),
    ("=", r"="),
]

SUSPICIOUS_KEYWORDS = {
    "OR",
    "UNION",
    "1=1",
    "--",
    "/*",
    "*/",
    "SLEEP",
    "PG_SLEEP",
    "BENCHMARK",
    "DELAY",
    "INFORMATION_SCHEMA",
    "DROP",
    "DROP TABLE",
    "DELETE FROM",
    "DECLARE",
    "ELT",
    "MAKE_SET",
    "CONCAT",
    "EXEC",
    "CAST",
    "CONVERT",
}


def detected_sql_keywords(query: str) -> List[str]:
    found: List[str] = []
    for label, pattern in KEYWORD_PATTERNS:
        if re.search(pattern, query, flags=re.IGNORECASE):
            found.append(label.upper())
    return found


def interpret_sqli_type(query: str) -> Tuple[str, List[str], str, List[Dict[str, str]]]:
    processed = query.lower()
    keywords = detected_sql_keywords(processed)
    matches: List[Dict[str, str]] = []

    for rule in ATTACK_PATTERNS:
        for pattern in rule["patterns"]:
            if re.search(pattern, processed, flags=re.IGNORECASE):
                matches.append(
                    {
                        "attack_type": rule["attack_type"],
                        "severity": rule["severity"],
                        "matched_pattern": pattern,
                        "meaning": rule["meaning"],
                    }
                )
                break

    if not matches:
        if has_strong_sqli_pattern(processed):
            return "Generic / Unknown SQLi Pattern", keywords, "Medium", matches
        if keywords:
            return "SQL syntax tokens only", keywords, "Informational", matches
        return "No SQLi indicators detected", keywords, "Informational", matches

    severity_rank = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}
    selected = max(matches, key=lambda item: severity_rank[item["severity"]])
    return selected["attack_type"], keywords, selected["severity"], matches


def has_strong_sqli_pattern(query: str) -> bool:
    return any(re.search(pattern, query, flags=re.IGNORECASE) for pattern in STRONG_SQLI_PATTERNS)


def has_suspicious_indicators(query: str, keywords: List[str], matches: List[Dict[str, str]]) -> bool:
    return bool(matches) or has_strong_sqli_pattern(query)


def risk_from_interpreted_severity(interpreted_severity: str | None) -> str:
    if interpreted_severity == "Critical":
        return "Critical"
    if interpreted_severity == "High":
        return "High"
    if interpreted_severity == "Medium":
        return "Medium"
    return "High"


def final_security_decision(
    prediction: int,
    confidence: float,
    suspicious_indicators: bool,
    interpreted_severity: str | None = None,
) -> Tuple[str, str]:
    if prediction == 1 and suspicious_indicators:
        return "SQL Injection Attack", risk_from_interpreted_severity(interpreted_severity)

    if prediction == 1:
        return "SQL Injection Attack", "High"

    # Mirrors the Colab safety net: strong rule-layer SQLi indicators override a benign ML output.
    if suspicious_indicators:
        return "SQL Injection Attack", risk_from_interpreted_severity(interpreted_severity)

    return "Benign", "Low"


def explanation_rows(query: str) -> List[Dict[str, str]]:
    processed = query.lower()
    rows: List[Dict[str, str]] = []

    for rule in ATTACK_PATTERNS:
        matched_tokens = []
        for pattern in rule["patterns"]:
            if re.search(pattern, processed, flags=re.IGNORECASE):
                matched_tokens.extend(rule["tokens"])
                break

        if matched_tokens:
            rows.append(
                {
                    "indicator": ", ".join(dict.fromkeys(matched_tokens)),
                    "attack_type": rule["attack_type"],
                    "severity": rule["severity"],
                    "interpretation": rule["meaning"],
                }
            )

    if not rows:
        keywords = detected_sql_keywords(processed)
        if keywords:
            suspicious_keywords = has_strong_sqli_pattern(processed)
            rows.append(
                {
                    "indicator": ", ".join(keywords),
                    "attack_type": "Keyword indicator" if suspicious_keywords else "SQL syntax tokens",
                    "severity": "Medium" if suspicious_keywords else "Informational",
                    "interpretation": (
                        "The notebook-style keyword scan found suspicious SQLi tokens, but no suspicious SQL patterns detected."
                        if suspicious_keywords
                        else "The notebook-style keyword scan found routine SQL syntax tokens without high-risk SQLi indicators."
                    ),
                }
            )

    return rows


def build_explanation(
    query: str,
    prediction: int,
    attack_type: str,
    keywords: List[str],
    final_decision: str,
    suspicious_indicators: bool,
) -> str:
    if final_decision == "SQL Injection Attack":
        if prediction == 0 and suspicious_indicators:
            return (
                "The trained hybrid ensemble classified this input as benign, but the rule-based safety layer "
                f"detected known SQL injection behavior consistent with {attack_type}. "
                "Following the Colab validation process, the final decision is promoted to SQL Injection Attack."
            )

        return (
            f"The trained hybrid ensemble classified this input as SQL injection. "
            f"The interpretation layer found {len(keywords)} SQL indicator(s), with behavior consistent with {attack_type}."
        )

    return "The trained hybrid ensemble classified this input as benign with no high-risk SQLi indicators detected."


def security_recommendation(prediction: int, attack_type: str, final_decision: str) -> str:
    if final_decision == "Benign":
        return "Allow the request, continue logging, and keep using parameterized queries plus server-side input validation."

    if final_decision == "Suspicious / Needs Review":
        return "Hold or rate-limit the request, preserve the payload, and review the matched SQLi indicators before allowing it."

    recommendations = {
        "Authentication Bypass": "Block the request, enforce parameterized authentication queries, and review recent failed login activity.",
        "Union-Based SQL Injection": "Block the request, validate selectable fields, and ensure database errors are not exposed to clients.",
        "Time-Based Blind SQL Injection": "Block the request, rate-limit the source, and alert on delayed database response patterns.",
        "Database Enumeration": "Block the request and verify that metadata tables are not reachable from application-facing accounts.",
        "Destructive Query Attempt": "Escalate as critical, block the request, rotate exposed credentials if needed, and inspect database audit logs.",
        "Obfuscation / advanced SQL function behavior": "Block or quarantine the request and inspect payload encoding, function calls, and concatenated fragments.",
    }

    return recommendations.get(
        attack_type,
        "Block the request, preserve the payload for investigation, and verify that prepared statements are enforced.",
    )
