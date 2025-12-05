# Digital RSVP System

A minimal, production-ready starter for sending personalized video invites with per-guest RSVP tracking, calendar downloads, and map links.

## Features

- Personalized invite flows using secure per-guest tokens
- Landing page with an intro video and automatic redirect to the invite
- RSVP form that records attendance counts, status, and notes in SQLite
- One-click calendar download (`.ics`) with a 1-day reminder alarm
- Google Maps venue link for quick navigation

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Copy the environment template**
   ```bash
   cp .env.example .env
   ```
   Adjust the values to match your event details.

3. **Seed the database**
   ```bash
   npm run seed
   ```
   This reads `data/guests.csv`, assigns each guest a unique token, and stores them in `db/rsvp.db`.

4. **Start the server**
   ```bash
   npm run dev
   ```
   The site will be available at the configured `BASE_URL` (default `http://localhost:3000`).

5. **Upload your video**
   Replace `public/video/invite.mp4` with your own invite video file.

6. **Distribute invite links**
   Each guest row in the database has a unique `token`. Share links in the format:
   ```
   http://localhost:3000/v?t=TOKEN
   ```
   The landing page plays the video and then directs the guest to their personalized invite.

## Project Structure

```
.
├─ package.json
├─ server.js
├─ .env.example
├─ data/
│  ├─ guests.csv
│  └─ seed.js
├─ db/
│  └─ rsvp.db (generated after seeding)
├─ public/
│  ├─ styles.css
│  └─ video/
│     └─ invite.mp4 (provide your own)
└─ views/
   ├─ layout.html
   ├─ video.html
   ├─ invite.html
   ├─ thankyou.html
   └─ notfound.html
```

## Notes

- Tokens are 12-character nanoid strings, making them hard to guess.
- Update `public/styles.css` to match your wedding branding.
- The SQLite database is stored in `db/rsvp.db`. Back it up regularly.
- The calendar download uses the configured organizer name and email for authenticity.
