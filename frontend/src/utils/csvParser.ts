const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export interface ParseResult {
  validEmails: string[];
  invalidEntries: string[];
  totalDetected: number;
}

/**
 * Parses CSV text or raw delimited strings (commas, newlines, semicolons)
 * and extracts validated, deduplicated email addresses.
 */
export function parseRecipientsInput(text: string): ParseResult {
  if (!text || text.trim() === "") {
    return { validEmails: [], invalidEntries: [], totalDetected: 0 };
  }

  // Split by comma, semicolon, newline, carriage return, or tab
  const rawTokens = text.split(/[\r\n,;\t]+/);

  const seen = new Set<string>();
  const validEmails: string[] = [];
  const invalidEntries: string[] = [];

  for (const rawToken of rawTokens) {
    // Strip quotes and whitespace
    let clean = rawToken.replace(/^["']|["']$/g, "").trim();

    // If CSV header like 'email' or 'recipient', skip
    if (clean.toLowerCase() === "email" || clean.toLowerCase() === "emails" || clean.toLowerCase() === "recipient") {
      continue;
    }

    if (clean.length === 0) continue;

    if (EMAIL_REGEX.test(clean)) {
      const lower = clean.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        validEmails.push(clean);
      }
    } else {
      invalidEntries.push(clean);
    }
  }

  return {
    validEmails,
    invalidEntries,
    totalDetected: validEmails.length,
  };
}

/**
 * Reads a user-uploaded File object (CSV / TXT) as text.
 */
export async function readCsvFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve((e.target?.result as string) || "");
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}
