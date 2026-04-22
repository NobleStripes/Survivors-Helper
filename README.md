# Survivors Helper

Monorepo for a Vampire Survivors unlock helper.

## Credits

- Vampire Survivors is created by Poncle.
- This project uses community-maintained wiki source data from vampire.survivors.wiki as input for local tooling.
- Please support the official game and creators: https://poncle.games/

Packages:
- frontend: user tracker and explorer UI
- backend: recommendation and data API
- shared: canonical data contracts and schema helpers

## Quick Start

1. Install dependencies:
   npm install
2. Build all packages:
   npm run build
3. Run tests:
   npm run test

## Data Fetch

To begin and refresh source ingestion from the wiki:

1. Fetch raw source pages:
   npm run data:fetch

Outputs:
- Raw wiki source files are saved in [data/raw/wiki](data/raw/wiki)
- Fetch metadata is written to [data/raw/wiki/manifest.json](data/raw/wiki/manifest.json)

Current fetched pages:
- Achievements
- Secrets
- Characters

## Data Pipeline

After fetching raw page source, run normalization and seed rebuild:

1. Normalize raw wikitext into structured import JSON:
   npm run data:normalize
2. Rebuild the unlock seed dataset from normalized import data:
   npm run data:build-seed

Or run the full pipeline:

- npm run data:refresh
