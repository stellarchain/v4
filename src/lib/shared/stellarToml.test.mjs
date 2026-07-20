import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseStellarTomlAssetMetadata } from './stellarToml.js';

describe('Stellar TOML asset metadata parsing', () => {
  it('extracts matching currency metadata and documentation fallback fields', () => {
    const toml = `
[DOCUMENTATION]
ORG_NAME="MoneyGram Payment Systems, Inc."
ORG_LOGO="https://mgusd.moneygram.com/moneygram-logo.jpg"
ORG_URL="https://www.moneygram.com/"

[[CURRENCIES]]
code="MGUSD"
issuer="GAIUGZZZSL47BKH27SUDZESZELFJDPE2UM52RACOSFJ7BIVBGKUEJSUZ"
name="MoneyGram USD"
desc="USD-backed stablecoin issued by Bridge on behalf of MoneyGram"
image="https://mgusd.moneygram.com/mgusd-logo.jpeg"
`;

    assert.deepEqual(
      parseStellarTomlAssetMetadata(toml, 'mgusd', 'gaiugzzzsl47bkh27sudzeszelfjdpe2um52racosfj7bivbgkuejsuz'),
      {
        name: 'MoneyGram USD',
        description: 'USD-backed stablecoin issued by Bridge on behalf of MoneyGram',
        image: 'https://mgusd.moneygram.com/mgusd-logo.jpeg',
        homeUrl: 'https://www.moneygram.com/',
        orgLogo: 'https://mgusd.moneygram.com/moneygram-logo.jpg',
      }
    );
  });

  it('returns documentation logo when a currency image is missing', () => {
    const toml = `
[DOCUMENTATION]
ORG_LOGO="https://example.com/org.png"

[[CURRENCIES]]
code="FOO"
issuer="GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
name="Foo"
`;

    assert.deepEqual(
      parseStellarTomlAssetMetadata(toml, 'FOO', 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'),
      {
        name: 'Foo',
        description: undefined,
        image: 'https://example.com/org.png',
        homeUrl: undefined,
        orgLogo: 'https://example.com/org.png',
      }
    );
  });
});
