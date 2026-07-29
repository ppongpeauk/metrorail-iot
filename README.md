# Metrorail IOT

A faithful recreation of the real WMATA passenger information screens found throughout Metro stations, powered by the same real-time data they use.

This is an independent project and is not affiliated with or endorsed by WMATA.

## Try it

Visit [metrorail.live](https://metrorail.live), or open a station directly using its WMATA station code:

* `/` opens Metro Center (`C01`)
* `/D03` opens L’Enfant Plaza
* Use the map-pin button to choose another station

Use the gear button to switch between display styles. The controls reappear when you move or tap near the bottom-right corner.

## Run locally

You’ll need [Bun](https://bun.sh/) and a WMATA developer API key.

```bash
bun install
cp .env.example .env.local
```

Add your WMATA API key to `.env.local`:

```env
WMATA_API_KEY=your-api-key
```

`WMATA_API_KEY` is the only required environment variable. Optional Redis and OpenAI-compatible alert-formatting settings are documented in `.env.example`.

Start the development server:

```bash
bun run dev
```

Then open http://localhost:3000.
