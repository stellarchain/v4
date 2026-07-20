function parseTomlScalar(rawValue) {
  const value = String(rawValue || '').trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function parseTomlAssignment(line) {
  const match = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.+)$/);
  if (!match) {
    return null;
  }

  return {
    key: match[1],
    value: parseTomlScalar(match[2]),
  };
}

function normalize(value) {
  return String(value || '').trim().toUpperCase();
}

/**
 * Parse the small subset of Stellar TOML needed for asset identity and logos.
 *
 * @param {string} tomlText
 * @param {string} code
 * @param {string} issuer
 * @returns {{name?: string, description?: string, image?: string, homeUrl?: string, orgLogo?: string}}
 */
export function parseStellarTomlAssetMetadata(tomlText, code, issuer) {
  const documentation = {};
  const currencies = [];
  let section = null;
  let currentCurrency = null;

  String(tomlText || '').split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      return;
    }

    if (line === '[DOCUMENTATION]') {
      section = 'DOCUMENTATION';
      currentCurrency = null;
      return;
    }

    if (line === '[[CURRENCIES]]') {
      section = 'CURRENCIES';
      currentCurrency = {};
      currencies.push(currentCurrency);
      return;
    }

    const assignment = parseTomlAssignment(line);
    if (!assignment) {
      return;
    }

    if (section === 'DOCUMENTATION') {
      documentation[assignment.key] = assignment.value;
    } else if (section === 'CURRENCIES' && currentCurrency) {
      currentCurrency[assignment.key] = assignment.value;
    }
  });

  const matchingCurrency = currencies.find((currency) =>
    normalize(currency.code) === normalize(code) && normalize(currency.issuer) === normalize(issuer)
  );

  if (!matchingCurrency) {
    return {
      name: documentation.ORG_NAME,
      description: documentation.ORG_DESCRIPTION,
      image: documentation.ORG_LOGO,
      homeUrl: documentation.ORG_URL,
      orgLogo: documentation.ORG_LOGO,
    };
  }

  return {
    name: matchingCurrency.name || matchingCurrency.code || documentation.ORG_NAME,
    description: matchingCurrency.desc || matchingCurrency.description || documentation.ORG_DESCRIPTION,
    image: matchingCurrency.image || documentation.ORG_LOGO,
    homeUrl: matchingCurrency.home_url || matchingCurrency.url || documentation.ORG_URL,
    orgLogo: documentation.ORG_LOGO,
  };
}
