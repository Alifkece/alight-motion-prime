const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    BASE_URL: process.env.BASE_URL || 'https://www.alightpro.my.id',
    SECRET: process.env.SECRET || 'amprem-human-v3-secret-2026',
    UA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    OUTPUT_DIR: './alight-output',
    TIMEOUT: 45000
};

if (!process.env.DISABLE_FILE_WRITE) {
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
        fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }
}

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

async function getSession() {
    const headers = {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-store',
        'Connection': 'keep-alive',
        'Origin': CONFIG.BASE_URL,
        'Referer': CONFIG.BASE_URL + '/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': CONFIG.UA,
        'X-Requested-With': 'XMLHttpRequest'
    };

    const res = await fetch(`${CONFIG.BASE_URL}/api/session`, {
        signal: AbortSignal.timeout(CONFIG.TIMEOUT),
        headers: headers
    });
    if (!res.ok) throw new Error(`Session endpoint HTTP ${res.status}`);
    const setCookie = res.headers.get('set-cookie') || '';
    const cookie = setCookie.split(';')[0];
    const data = await res.json();
    if (!data.status || !data.token || !data.nonce) {
        throw new Error('Session token/nonce tidak valid dari server');
    }
    return { ...data, cookie };
}

// ... sisanya sama (solvePow, callAlight, sendMagicLink, applyPremium, alightPro, module.exports)
// Pastikan sisanya seperti sebelumnya, hanya getSession yang diganti.
