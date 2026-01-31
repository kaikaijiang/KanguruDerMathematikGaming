/**
 * MATHE KANGURU - BACKEND SCRIPT
 * 
 * Instructions:
 * 1. Create a new Google Sheet.
 * 2. Create 3 Sheets (tabs): 'Questions_DE', 'Questions_CN', 'Players'.
 * 3. Go to Extensions > Apps Script.
 * 4. Paste this code into Code.gs.
 * 5. Deploy as Web App (Access: Anyone).
 */

const SHEET_ID = '1kdnsy77G9qknyhJvxtioggpcQ9j1ROz-v9GjQ6v2PnE'; // <--- UPDATED WITH YOUR ID

function doGet(e) {
    return handleRequest(e);
}

function doPost(e) {
    return handleRequest(e);
}

function handleRequest(e) {
    const lock = LockService.getScriptLock();
    // Increase lock timeout to prevent concurrency issues
    lock.tryLock(20000);

    try {
        const params = e.parameter;
        const action = params.action;

        // --- SECURITY CHECK ---
        // Change 'YOUR_SECRET_HERE' to your actual secret password!
        const API_SECRET = 'YOUR_SECRET_HERE';

        // Check if secret matches (allow bypass for initial testing if needed, but not recommended)
        if (params.secret !== API_SECRET) {
            return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized: Invalid Secret' }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        // ----------------------        const action = params.action;

        // CORS Headers
        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        };

        let result = {};

        if (action === 'getQuestions') {
            result = getQuestions(params);
        }
        else if (action === 'getPlayer') {
            result = getPlayer(params.playerId);
        }
        else if (action === 'syncScore') {
            // For POST requests, data might be in postData.contents
            const data = e.postData ? JSON.parse(e.postData.contents) : params;
            result = syncScore(data);
        }
        else if (action === 'getGallery') {
            result = getGallery(params.playerId);
        }
        else if (action === 'buySticker') {
            // Expecting POST data or params
            const data = e.postData ? JSON.parse(e.postData.contents) : params;
            result = buySticker(data);
        }
        else if (action === 'getSticker') {
            result = getSticker(params.id);
        }
        else if (action === 'getExamConfig') {
            result = getExamConfig();
        }
        else {
            result = { error: 'Unknown action' };
        }

        return ContentService.createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}

// ------------------------------------------------------------------
// ACTIONS
// ------------------------------------------------------------------

function getExamConfig() {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('PastExam');
    if (!sheet) return { error: 'PastExam sheet missing' };

    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1); // Skip Header

    // Columns: 0=class, 1=years (JSON)
    return rows.map(r => {
        let years = [];
        try {
            years = JSON.parse(r[1]);
        } catch (e) {
            years = String(r[1]).split(',').map(y => y.trim());
        }
        return {
            class: r[0],
            years: years
        };
    });
}

function getQuestions(params) {
    const count = parseInt(params.count) || 10;
    const lang = params.lang || 'de'; // 'de' or 'cn'
    const startIndex = parseInt(params.startIndex) || 0;
    const ids = params.ids ? params.ids.split(',') : null;
    const examId = params.examId; // "3_4_2025"
    const classId = params.classId; // "3_4" (Used for retry mode scope)

    // MODE DETECTION
    let targetClass = '';
    let targetYear = '';
    let sheetName = '';

    if (ids && ids.length > 0) {
        // RETRY MODE
        // We need 'classId' to know which sheet to look in.
        // If clien didn't send classId (legacy), default to something or error?
        // Let's assume classId is sent.
        if (!classId) return { error: 'Missing classId for Retry Mode' };

        targetClass = classId;
        sheetName = `${targetClass}_${lang}`; // e.g. "3_4_de"
    } else {
        // STANDARD MODE
        if (!examId) return { error: 'Missing examId' };

        // Parse "3_4_2025"
        // Assumption: Year is always last part (4 digits)
        const parts = examId.split('_');
        targetYear = parts[parts.length - 1]; // "2025"
        targetClass = parts.slice(0, parts.length - 1).join('_'); // "3_4"

        sheetName = `${targetClass}_${lang}`; // e.g. "3_4_de"
    }

    // OPEN SHEET
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
        return { error: `Sheet '${sheetName}' not found.` };
    }

    const data = sheet.getDataRange().getValues();
    // Ensure we have data
    if (data.length < 2) return { error: 'NO_QUESTIONS_FOUND' }; // Only header or empty

    const headers = data[0];
    const rows = data.slice(1);

    // Check for required "year" column for Standard Mode filtering
    let yearIdx = headers.indexOf('year');
    // If not found, maybe fallback to not filtering? 
    // Strict requirement: "Filtering: From that table filter by year column"
    // So if missing, year filter fails.

    // Convert to objects first or filter raw? 
    // Convert first is easier to manage.
    let questions = rows.map((row, index) => {
        let q = {};
        headers.forEach((h, i) => q[h] = row[i]);
        q.originalIndex = index;
        return parseQuestion(q);
    });

    // FILTER LOGIC
    if (ids && ids.length > 0) {
        // RETRY MODE: Filter by specific IDs, ignore year
        questions = questions.filter(q => ids.includes(q.id));
    } else {
        // STANDARD MODE: Filter by Year
        if (targetYear) {
            // String comparison to be safe
            questions = questions.filter(q => String(q.year) == String(targetYear));
        }

        if (questions.length === 0) {
            return { error: 'NO_QUESTIONS_FOUND' };
        }

        // Infinite Loop Logic (Modulo)
        // If startIndex exceeds total, we wrap around. 
        // We also ensure we always return 'count' items by wrapping within the batch if needed.
        const total = questions.length;
        const effectiveStart = startIndex % total;

        let loopedQuestions = [];
        for (let i = 0; i < count; i++) {
            loopedQuestions.push(questions[(effectiveStart + i) % total]);
        }
        questions = loopedQuestions;
    }

    return questions.slice(0, count);
}

function getPlayer(playerId) {
    if (!playerId) return { error: 'No Player ID' };

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Players');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Row 0 is header. Find row with playerId
    // IDs in Col A (index 0)
    const playerRow = data.find(r => r[0] == playerId);

    // Identify Dynamic Columns
    const balIdx = headers.indexOf('current_balance');
    const selAvIdx = headers.indexOf('selected_avatar');
    const activeExamIdx = headers.indexOf('active_exam_id');

    if (!playerRow) {
        return {
            playerId: playerId,
            totalPlayed: 0,
            highScore: 0,
            currentBalance: 0,
            collectedAvatars: [],
            wrongQuestions: [],
            lastQuestionIndex: 0,
            activeExamId: null
        };
    }

    return {
        playerId: playerRow[0],
        totalPlayed: playerRow[1],
        highScore: playerRow[2],
        collectedAvatars: JSON.parse(playerRow[3] || '[]'),
        wrongQuestions: JSON.parse(playerRow[4] || '[]'),
        lastQuestionIndex: parseInt(playerRow[5]) || 0,
        lastPlayed: playerRow[6],
        // Dynamic Fields
        currentBalance: balIdx > -1 ? (parseInt(playerRow[balIdx]) || 0) : 0,
        selectedAvatarId: selAvIdx > -1 ? playerRow[selAvIdx] : null,
        activeExamId: activeExamIdx > -1 ? playerRow[activeExamIdx] : null
    };
}

function getGallery(playerId) {
    if (!playerId) return { error: 'No Player ID' };

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const playerSheet = ss.getSheetByName('Players');
    const stickersSheet = ss.getSheetByName('Stickers');

    // 1. Get User Collection
    const pData = playerSheet.getDataRange().getValues();
    const playerRow = pData.find(r => r[0] == playerId);
    if (!playerRow) return { error: 'Player not found' };

    const collectedIds = JSON.parse(playerRow[3] || '[]'); // Strings: "101", "q_1", "felix"

    // 2. Get Sticker Database
    let stickers = [];
    if (stickersSheet) {
        const sData = stickersSheet.getDataRange().getValues();
        const sHeaders = sData[0];
        const idxId = sHeaders.indexOf('id');
        const idxRarity = sHeaders.indexOf('rarity');
        const idxImg = sHeaders.indexOf('image_url');
        const idxName = sHeaders.indexOf('name');

        if (idxId > -1) {
            stickers = sData.slice(1).map(row => ({
                id: String(row[idxId]),
                rarity: row[idxRarity] || 'Common',
                imageUrl: row[idxImg],
                name: row[idxName] || ''
            }));
        }
    }

    // 3. Build Gallery Manifest
    const gallery = collectedIds.map(id => {
        const strId = String(id);
        const foundSticker = stickers.find(s => s.id === strId);

        if (foundSticker) {
            return {
                id: strId,
                type: 'sticker',
                ...foundSticker
            };
        } else {
            return {
                id: strId,
                type: 'avatar',
                rarity: 'Adventure', // Group for pixel art
                imageUrl: null, // Will trigger pixel art gen
                name: 'Pixel Friend'
            };
        }
    });

    return { gallery };
}

function syncScore(data) {
    const { playerId, score, pointsEarned, newAvatars, wrongAnswers, correctedAnswers, lastIndex } = data;
    // pointsEarned: number (points to ADD to balance)

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Players');
    // const historySheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('History'); // REMOVED

    const allData = sheet.getDataRange().getValues();
    const headerRow = allData[0];

    // Dynamic Column Indices
    let balanceIdx = headerRow.indexOf('current_balance');
    const selAvIdx = headerRow.indexOf('selected_avatar');
    const activeExamIdx = headerRow.indexOf('active_exam_id');

    if (balanceIdx === -1) balanceIdx = 7; // Fallback default

    let rowIndex = -1;

    // Find existing player
    for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] == playerId) {
            rowIndex = i + 1; // 1-based index for getRange
            break;
        }
    }

    const timestamp = new Date();
    const points = pointsEarned || 0;

    if (rowIndex > 0) {
        // Update existing
        const currentHigh = sheet.getRange(rowIndex, 3).getValue();
        const currentAvatars = JSON.parse(sheet.getRange(rowIndex, 4).getValue() || '[]');
        const currentWrongs = JSON.parse(sheet.getRange(rowIndex, 5).getValue() || '[]');
        const currentBalance = parseInt(sheet.getRange(rowIndex, balanceIdx + 1).getValue()) || 0;

        // Update Avatars - Modified: Do NOT save question avatars (newAvatars)
        const updatedAvatars = currentAvatars;

        // Update Wrong List
        let updatedWrongs = [...new Set([...currentWrongs, ...(wrongAnswers || [])])];
        if (correctedAnswers && correctedAnswers.length > 0) {
            updatedWrongs = updatedWrongs.filter(id => !correctedAnswers.includes(id));
        }
        updatedWrongs = updatedWrongs.filter(id => !updatedAvatars.includes(id));

        sheet.getRange(rowIndex, 2).setValue(sheet.getRange(rowIndex, 2).getValue() + 1); // Total Played + 1
        if (score > currentHigh) sheet.getRange(rowIndex, 3).setValue(score); // Update High Score
        sheet.getRange(rowIndex, 4).setValue(JSON.stringify(updatedAvatars));
        sheet.getRange(rowIndex, 5).setValue(JSON.stringify(updatedWrongs));

        if (typeof lastIndex === 'number') {
            sheet.getRange(rowIndex, 6).setValue(lastIndex);
        }

        sheet.getRange(rowIndex, 7).setValue(timestamp);

        // Update Balance
        sheet.getRange(rowIndex, balanceIdx + 1).setValue(currentBalance + points);

        // Update Selected Avatar
        if (data.selectedAvatarId && selAvIdx > -1) {
            sheet.getRange(rowIndex, selAvIdx + 1).setValue(data.selectedAvatarId);
        }

        // NEW: Update Active Exam ID
        if (data.activeExamId && activeExamIdx > -1) {
            sheet.getRange(rowIndex, activeExamIdx + 1).setValue(data.activeExamId);
        }

    } else {
        // Create new
        const newRow = [
            playerId,
            1, // Played
            score, // HighScore
            '[]', // Collected Avatars
            JSON.stringify(wrongAnswers || []),
            lastIndex || 0,
            timestamp
        ];
        // Fill gaps until we hit columns? Append is tricky if columns out of order.
        // Safer to just append and then update specific cells if needed? 
        // Or assume column order: ID, Played, High, Avatars, Wrongs, LastIdx, LastTime, Balance, SelectedAv, ActiveExam

        // Let's assume user appended columns in order.
        newRow[7] = points; // Balance
        newRow[8] = data.selectedAvatarId || '';
        newRow[9] = data.activeExamId || '';

        sheet.appendRow(newRow);
    }

    // Log History - REMOVED per user request
    // historySheet.appendRow([timestamp, playerId, score, points, data.duration || 0, data.lang || '', data.activeExamId || '']);

    return { success: true };
}

function buySticker(e) {
    const params = e && e.parameter ? e.parameter : e;
    const { playerId, rarity } = params;

    if (!playerId || !rarity) return { error: 'Missing playerId or rarity' };

    const PRICING = {
        'ungewöhnlich': 5,
        'selten': 15,
        'episch': 30,
        'legendär': 25,
        'mythisch': 30,
        'göttlich': 50
    };

    const price = PRICING[rarity.toLowerCase()];
    if (!price) return { error: 'Invalid rarity' };

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const playerSheet = ss.getSheetByName('Players');
    const stickersSheet = ss.getSheetByName('Stickers');

    if (!stickersSheet) return { error: 'Sticker Store not configured (Sheet missing)' };

    // 1. Check Balance
    const allPlayers = playerSheet.getDataRange().getValues();
    const balanceHdrIdx = allPlayers[0].indexOf('current_balance');
    if (balanceHdrIdx === -1) return { error: 'Economy not initialized' };

    let playerRowIdx = -1;
    let currentBalance = 0;

    for (let i = 1; i < allPlayers.length; i++) {
        if (allPlayers[i][0] == playerId) {
            playerRowIdx = i + 1;
            currentBalance = parseInt(allPlayers[i][balanceHdrIdx]) || 0;
            break;
        }
    }

    if (playerRowIdx === -1) return { error: 'Player not found' };
    if (currentBalance < price) return { error: 'Not enough points', currentBalance };

    // 2. Perform Lottery
    const stickersData = stickersSheet.getDataRange().getValues();
    const stHeaders = stickersData[0];
    const stRows = stickersData.slice(1);

    const hId = stHeaders.indexOf('id');
    const hRarity = stHeaders.indexOf('rarity');
    const hImg = stHeaders.indexOf('image_url');

    // Helper to get stickers by rarity
    const getPool = (r) => stRows.filter(row => row[hRarity].toLowerCase() === r.toLowerCase());

    let resultRarity = rarity; // Default for 100% tiers

    // Gacha Logic
    const rand = Math.random() * 100;
    if (rarity === 'legendär') {
        if (rand < 50) resultRarity = 'legendär';
        else if (rand < 70) resultRarity = 'episch';
        else if (rand < 90) resultRarity = 'selten';
        else resultRarity = 'ungewöhnlich';
    } else if (rarity === 'mythisch') {
        if (rand < 40) resultRarity = 'mythisch';
        else if (rand < 60) resultRarity = 'legendär';
        else if (rand < 75) resultRarity = 'episch';
        else if (rand < 85) resultRarity = 'selten';
        else resultRarity = 'ungewöhnlich';
    } else if (rarity === 'göttlich') {
        if (rand < 40) resultRarity = 'göttlich';
        else if (rand < 60) resultRarity = 'mythisch';
        else if (rand < 75) resultRarity = 'legendär';
        else if (rand < 85) resultRarity = 'episch';
        else resultRarity = 'selten';
    }

    const pool = getPool(resultRarity);
    if (pool.length === 0) {
        return { error: `No stickers found for rarity: ${resultRarity}` };
    }

    // Pick one random sticker
    const wonStickerRow = pool[Math.floor(Math.random() * pool.length)];
    const wonStickerId = wonStickerRow[hId];

    // 3. Process Transaction

    // Deduct Points
    playerSheet.getRange(playerRowIdx, balanceHdrIdx + 1).setValue(currentBalance - price);

    // Check Ownership
    const avatarsCell = playerSheet.getRange(playerRowIdx, 4);
    const existingIds = JSON.parse(allPlayers[playerRowIdx - 1][3] || '[]');

    let outcome = 'new';
    if (existingIds.includes(wonStickerId)) {
        outcome = 'duplicate';
    } else {
        existingIds.push(wonStickerId);
        avatarsCell.setValue(JSON.stringify(existingIds));
    }

    return {
        success: true,
        outcome: outcome,
        sticker: {
            id: wonStickerId,
            rarity: resultRarity,
            imageUrl: wonStickerRow[hImg]
        },
        remainingBalance: currentBalance - price
    };
}

function getSticker(id) {
    if (!id) return { error: 'Missing ID' };

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const stickersSheet = ss.getSheetByName('Stickers');
    if (!stickersSheet) return { error: 'Sticker DB not found' };

    const data = stickersSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    const idxId = headers.indexOf('id');
    const idxImg = headers.indexOf('image_url');

    const row = rows.find(r => r[idxId] == id);

    if (!row) return { error: 'Sticker not found' };

    return {
        id: String(row[idxId]),
        imageUrl: row[idxImg]
    };
}

// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------

function parseQuestion(raw) {
    // raw is object with keys matching sheet headers

    return {
        id: raw.id,
        category: raw.category,
        answerType: 'single',
        title: raw.title,
        options: parseOptions(raw.options),
        correctAnswer: raw.correct_answer ? String(raw.correct_answer).split(',') : [],
        solution: {
            youtubeId: raw.youtube_id,
            start: parseTime(raw.video_start),
            end: parseTime(raw.video_end)
        },
        avatarSeed: raw.avatar_seed || ('q_' + raw.id),
        points: parseInt(raw.points) || 10,
        year: raw.year ? String(raw.year) : '',
        hint: (raw.hint || raw.Hint || raw.HINT) ? parseHint(raw.hint || raw.Hint || raw.HINT) : undefined
    };
}

function parseHint(hintString) {
    if (!hintString) return null;

    // 1. Try strict parse first (fast path)
    try {
        let parsed = JSON.parse(hintString);
        return normalizeHint(parsed);
    } catch (e) {
        // Continue to sanitizer
    }

    // 2. Smart Sanitize: Fix newlines ONLY inside strings
    try {
        const sanitized = sanitizeJsonString(hintString);
        let parsed = JSON.parse(sanitized);
        return normalizeHint(parsed);
    } catch (e2) {
        // DEBUG MODE: Return the error
        return {
            text: "⚠️ JSON PARSE ERROR ⚠️\n\n" + e2.toString() + "\n\nRaw Preview:\n" + hintString.substring(0, 100),
            type: 'error',
            items: []
        };
    }
}

function sanitizeJsonString(str) {
    let result = '';
    let inString = false;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if (inString) {
            if (char === '\\') {
                // Escape sequence: Take this char AND the next one immediately
                result += char;
                if (i + 1 < str.length) {
                    result += str[i + 1];
                    i++; // Skip next
                }
            } else if (char === '"') {
                inString = false;
                result += char;
            } else if (char === '\n') {
                result += '\\n'; // Escape newline!
            } else if (char === '\r') {
                // Ignore CR
            } else {
                result += char;
            }
        } else {
            if (char === '"') {
                inString = true;
            }
            result += char;
        }
    }
    return result;
}

function normalizeHint(obj) {
    if (!obj) return null;

    // Support "source" (User shorthand) -> items: [{src: source}]
    if (obj.source && (!obj.items || obj.items.length === 0)) {
        obj.items = [{ id: 'auto_src', src: obj.source }];
    }

    // Ensure items is array
    if (!Array.isArray(obj.items)) {
        obj.items = [];
    }

    return obj;
}

function parseOptions(optString) {
    try {
        return JSON.parse(optString);
    } catch (e) {
        return optString ? String(optString).split(',').map(s => s.trim()) : [];
    }
}

function parseTime(input) {
    if (!input) return 0;

    const str = input.toString().replace(/["']/g, '');
    if (str.includes(':')) {
        const parts = str.split(':');
        if (parts.length === 3) {
            // HH:MM:SS
            const hrs = parseInt(parts[0], 10);
            const min = parseInt(parts[1], 10);
            const sec = parseInt(parts[2], 10);
            return (hrs * 3600) + (min * 60) + sec;
        } else if (parts.length === 2) {
            // MM:SS
            const min = parseInt(parts[0], 10);
            const sec = parseInt(parts[1], 10);
            return (min * 60) + sec;
        }
    }
    return parseInt(str, 10) || 0;
}
