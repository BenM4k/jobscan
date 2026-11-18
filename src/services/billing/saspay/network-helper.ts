/**
 * Utility functions for resolving mobile money network and country from phone numbers.
 */

export interface NetworkResolution {
  country: string;
  network: string;
  currency: string;
  formattedPhone: string;
}

/**
 * Normalizes phone number: strips spaces, dashes, and ensures international format with '+'.
 */
export function normalizePhoneNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  // DRC local format (e.g. 081..., 082..., 097... -> +243...)
  if (digits.startsWith("0") && digits.length === 10) {
    return `+243${digits.slice(1)}`;
  }
  return `+${digits}`;
}

/**
 * Resolves country and network code from normalized phone number.
 * Falls back to DRC (CD / airtel_cd) as Jobpilot's primary regional market,
 * or allows explicit network/country overrides.
 */
export function resolveNetworkFromPhone(
  rawPhone: string,
  preferredCountry?: string,
  preferredNetwork?: string
): NetworkResolution {
  const phone = normalizePhoneNumber(rawPhone);

  if (preferredCountry && preferredNetwork) {
    const currency = preferredCountry === "CD" ? "USD" : "XOF";
    return {
      country: preferredCountry,
      network: preferredNetwork,
      currency,
      formattedPhone: phone,
    };
  }

  // Democratic Republic of Congo (+243)
  if (phone.startsWith("+243")) {
    const local = phone.slice(4);
    let network = "airtel_cd";
    if (local.startsWith("81") || local.startsWith("82") || local.startsWith("83")) {
      network = "vodacom_cd";
    } else if (local.startsWith("84") || local.startsWith("85") || local.startsWith("89") || local.startsWith("80")) {
      network = "orange_cd";
    } else if (local.startsWith("97") || local.startsWith("98") || local.startsWith("99") || local.startsWith("90")) {
      network = "airtel_cd";
    }
    return { country: "CD", network, currency: "USD", formattedPhone: phone };
  }

  // Benin (+229)
  if (phone.startsWith("+229")) {
    const local = phone.slice(4).replace(/^01/, "");
    let network = "mtn_bj";
    if (
      local.startsWith("96") || local.startsWith("97") || local.startsWith("61") ||
      local.startsWith("62") || local.startsWith("66") || local.startsWith("67")
    ) {
      network = "mtn_bj";
    } else if (
      local.startsWith("94") || local.startsWith("95") || local.startsWith("64") ||
      local.startsWith("65") || local.startsWith("60")
    ) {
      network = "moov_bj";
    } else if (local.startsWith("40") || local.startsWith("41") || local.startsWith("42")) {
      network = "celtiis_bj";
    }
    return { country: "BJ", network, currency: "XOF", formattedPhone: phone };
  }

  // Côte d'Ivoire (+225)
  if (phone.startsWith("+225")) {
    const local = phone.slice(4);
    let network = "orange_ci";
    if (local.startsWith("07") || local.startsWith("7")) network = "orange_ci";
    else if (local.startsWith("05") || local.startsWith("5")) network = "mtn_ci";
    else if (local.startsWith("01") || local.startsWith("1")) network = "moov_ci";
    return { country: "CI", network, currency: "XOF", formattedPhone: phone };
  }

  // Cameroon (+237)
  if (phone.startsWith("+237")) {
    const local = phone.slice(4);
    let network = "mtn_cm";
    if (local.startsWith("67") || local.startsWith("68") || local.startsWith("650")) network = "mtn_cm";
    else if (local.startsWith("69") || local.startsWith("655")) network = "orange_cm";
    return { country: "CM", network, currency: "XAF", formattedPhone: phone };
  }

  // Default fallback for Jobpilot users
  return {
    country: "CD",
    network: "airtel_cd",
    currency: "USD",
    formattedPhone: phone,
  };
}

