# Google Backend Setup Guide

## 1. Create the Google Sheet
1. Go to [sheets.google.com](https://sheets.google.com) and create a **New Spreadsheet**.
2. Name it "Mathe Kanguru DB".
3. **Copy the Spreadsheet ID** from the URL.
   * Format: `https://docs.google.com/spreadsheets/d/`**`1BxiMVs0XRA5nFMdkvBdBkJGM3...`**`/edit`
   * Keep this ID safe, you will need it later.

## 2. Configure Sheets (Tabs)
You need to create **4 Tabs** in total. Rename them exactly as follows:

### Sheet 1: `Questions_DE` (German Questions)
*   **Row 1 (Header)**: `id`, `category`, `title`, `options`, `correct_answer`, `youtube_id`, `video_start`, `video_end`, `avatar_seed`
*   *(Note: The app relies on Row 1 being headers. The actual data must start from Row 2.)*

### Sheet 2: `Questions_CN` (Chinese Questions)
*   **Row 1 (Header)**: Same columns as above.

### Sheet 3: `Players`
*   **Row 1 (Header)**: `player_id`, `total_played`, `high_score`, `collected_avatars`, `last_played_at`

### Sheet 4: `History`
*   **Row 1 (Header)**: `timestamp`, `player_id`, `score`, `lang`

## 3. Add Sample Data (Questions)

**In `Questions_DE`:**
*   **id**: `Q101`
*   **category**: `Level 3`
*   **title**: `Was ist 2 + 2?`
*   **options**: `["3", "4", "5", "6"]`
*   **correct_answer**: `B`
*   **youtube_id**: `dQw4w9WgXcQ`
*   **video_start**: `0` (or `00:00`)
*   **video_end**: `00:10` (or `10`)
*   **avatar_seed**: `tiger`

### ⏰ Timestamps (MM:SS)
For `video_start` and `video_end`, you can use two formats:
1. **Seconds (Number)**: `120` (starts at 2 minutes)
2. **Time Format (Text)**: `02:00` (starts at 2 minutes)
3. **Quoted Text**: `"02:00"` (also works!)

### 🖼️ Mixed Content (Text + Images)
*   **Titles**: Use Alt+Enter to separate text and Image Links.
*   **Options**: Use JSON array with `\n` to separate label and Image.
    *   `["A: Apple\nhttps://drive.google.com/...", "B: Pear\nhttps://drive.google.com/..."]`

## 4. Install the Backend Code
1. In your Google Sheet, click **Extensions > Apps Script**.
2. Delete any code in `Code.gs` and paste the contents of `backend/Code.js` from this project.
3. **CRITICAL**: Update line 12: `const SHEET_ID = '...'` with your real ID from Step 1.
4. Click the Floppy Disk icon to **Save**.

## 5. Deploy
1. Click the blue **Deploy** button > **New deployment**.
2. Select type: **Web app**.
3. **Description**: "v4".
4. **Execute as**: "Me" (your email).
5. **Who has access**: **"Anyone"** (Important! This allows the React app to call it without complex OAuth).
6. Click **Deploy**.
7. **Copy the Web App URL**.
   * Format: `https://script.google.com/macros/s/.../exec`

## 6. Connect React App
1. Open your local project.
2. Create/Edit `.env.local` (or just `.env`):
   ```
   VITE_GOOGLE_APP_SCRIPT_URL=https://script.google.com/macros/s/.../exec
   ```
   (Paste your URL there).
3. Restart the dev server (`npm run dev`).
