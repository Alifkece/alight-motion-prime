/*
Name: Alight Motion Premium Generator (AlightPro)
Type: Scraper/Generator
Noted: Generate premium Alight Motion via API dengan security token - send magic link & verify
Saluran 1: https://whatsapp.com/channel/0029Vb6dJVWBA1eukbJ5kX1r
Saluran 2: https://whatsapp.com/channel/0029VbANq6v0VycMue9vPs3u
Base Url: https://www.alightpro.my.id
Developer: t.me/hazeloffc

Changelog v4
• Membypass protect pow with sha256
• Mengganti secret key dari web alightpro
• Mengubah depency pada code lama supaya lebih ringan
*/

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Baca dari environment variable, fallback ke default
const CONFIG = {
    BASE_URL: process.env.BASE_URL || 'https://www.alightpro.my.id',
    SECRET: process.env.SECRET || 'amprem-human-v3-secret-2026',
    UA: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
    OUTPUT_DIR: process.env.OUTPUT_DIR || './alight-output',
    TIMEOUT: 45000
};

// Cuma bikin folder kalau gak disable file write
if (!process.env.DISABLE_FILE_WRITE) {
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
        fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }
}

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

async function getSession() {
    const res = await fetch(`${CONFIG.BASE_URL}/api/session`, {
        signal: AbortSignal.timeout(CONFIG.TIMEOUT),
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Cache-Control': 'no-store',
            'User-Agent': CONFIG.UA,
            'Origin': CONFIG.BASE_URL,
            'Referer': CONFIG.BASE_URL + '/',
            'Accept': 'application/json'
        }
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

function solvePow({ sessionId, nonce, timestamp, email, action, humanProof, difficulty }) {
    const base = `${sessionId}:${nonce}:${timestamp}:${email.toLowerCase()}:${action}:${humanProof}:`;
    for (let i = 0; i < 500000; i++) {
        if (sha256(base + i).startsWith(difficulty)) return String(i);
    }
    return Date.now().toString();
}

async function callAlight(body) {
    const s = await getSession();
    const delay = 2300 - (Date.now() - parseInt(s.timestamp, 10));
    if (delay > 0) await new Promise(r => setTimeout(r, delay));

    const humanProof = sha256(
        `human:${s.sessionId}:${s.nonce}:${s.timestamp}:${body.email.toLowerCase()}:5:${CONFIG.SECRET}`
    );
    const pow = solvePow({ ...s, email: body.email, action: body.action, humanProof });

    const res = await fetch(`${CONFIG.BASE_URL}/api/alight-motion`, {
        method: 'POST',
        signal: AbortSignal.timeout(CONFIG.TIMEOUT),
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Amprem-Token': s.token,
            'X-Amprem-Nonce': s.nonce,
            'X-Amprem-Pow': pow,
            'X-Amprem-Human-Proof': humanProof,
            'Cookie': s.cookie,
            'User-Agent': CONFIG.UA,
            'Origin': CONFIG.BASE_URL,
            'Referer': CONFIG.BASE_URL + '/',
            'Accept': 'application/json'
        },
        body: JSON.stringify(body)
    });

    let data = null;
    const text = await res.text();
    try { data = JSON.parse(text); } catch { data = { success: false, error: 'non-json ' + res.status }; }
    return { http: res.status, data };
}

async function sendMagicLink(email) {
    const { http, data } = await callAlight({ action: 'send', email });
    if (!data.status) {
        return { ok: false, step: 'send', message: data.msg || `HTTP ${http}` };
    }
    return { ok: true, message: data.msg || 'Link berhasil dikirim', email };
}

async function applyPremium(email, link) {
    const { http, data } = await callAlight({ action: 'verify', email, link: link.trim() });
    if (!data.status || !data.data) {
        return { ok: false, step: 'verify', message: data.msg || `HTTP ${http}` };
    }
    const premium = data.data.premium && data.data.premium.result;
    return {
        ok: true,
        message: data.msg || 'Premium activated!',
        data: data.data,
        accountLinkStatus: premium && premium.accountLinkStatus,
        expiryTimeMillis: premium && premium.expiryTimeMillis,
        autoRenewing: premium && premium.autoRenewing
    };
}

async function alightPro(email, link = null) {
    console.log('\n🎬 AlightPro Premium Generator');
    console.log('═══════════════════════════════════════════');

    if (!email) {
        return { success: false, error: 'Email is required' };
    }

    if (!link) {
        const result = await sendMagicLink(email);
        const output = {
            success: result.ok,
            email: email,
            message: result.message,
            instructions: [
                'Check your inbox (and Spam folder)',
                'Find email from "AlightPro" / "Alight Creative"',
                'Copy the OOB link inside the email',
                'Call: node alightpro.js --email "email" --link "oob_url"'
            ]
        };
        console.log(JSON.stringify(output, null, 2));
        return output;
    }

    const result = await applyPremium(email, link);
    const output = {
        success: result.ok,
        email: email,
        premium: result.ok,
        duration: '1 Year',
        message: result.message,
        data: result.data,
        accountLinkStatus: result.accountLinkStatus,
        expiryTimeMillis: result.expiryTimeMillis,
        autoRenewing: result.autoRenewing
    };

    // Skip file write jika di Vercel / production
    if (!process.env.DISABLE_FILE_WRITE) {
        const outputPath = path.join(CONFIG.OUTPUT_DIR, `alightpro_${Date.now()}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
        console.log(`📁 Saved to: ${outputPath}`);
    }

    console.log(JSON.stringify(output, null, 2));
    return output;
}

if (require.main === module) {
    const args = process.argv.slice(2);
    let email = '';
    let link = '';

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--email' && args[i + 1]) {
            email = args[++i];
        } else if (args[i] === '--link' && args[i + 1]) {
            link = args[++i];
        } else if (args[i] === '--help' || args[i] === '-h') {
            console.log(JSON.stringify({
                usage: 'node alightpro.js --email <email> [--link <oob_url>]',
                example: 'node alightpro.js --email user@gmail.com',
                example2: 'node alightpro.js --email user@gmail.com --link "https://alight-creative.firebaseapp.com/..."'
            }, null, 2));
            process.exit(0);
        }
    }

    if (!email) {
        console.log(JSON.stringify({ error: 'Email required. Use --email <email>' }, null, 2));
        process.exit(1);
    }

    alightPro(email, link || null).catch(e => {
        console.log(JSON.stringify({ success: false, error: e.message }, null, 2));
    });
}

module.exports = { alightPro, sendMagicLink, applyPremium };
