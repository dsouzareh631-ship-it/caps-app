#!/usr/bin/env node
'use strict';
const https = require('https');

const PROJECT = 'capsapp-bdaaa';
const KEY = 'AIzaSyBhS_yEJZbEMHDMGoSiZnyBXOF4V3fj5Rw';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

function fv(v) {
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number' && Number.isInteger(v)) return { integerValue: String(v) };
  if (typeof v === 'number') return { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fv) } };
  return { stringValue: String(v) };
}

function toDoc(obj) {
  const fields = {};
  for (const [k, val] of Object.entries(obj)) fields[k] = fv(val);
  return { fields };
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE}/${path}?key=${KEY}`);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(d);
          if (res.statusCode >= 400) reject(new Error(JSON.stringify(parsed)));
          else resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function setDoc(collection, id, obj) {
  const doc = toDoc(obj);
  const fieldMask = Object.keys(obj).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = new URL(`${BASE}/${collection}/${id}?key=${KEY}&${fieldMask}`);
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(doc);
    const req = https.request({ hostname: url.hostname, path: url.pathname + url.search, method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        if (res.statusCode < 300) resolve(JSON.parse(d));
        else reject(new Error(d.slice(0, 300)));
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function addDoc(collection, obj) {
  const doc = toDoc(obj);
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE}/${collection}?key=${KEY}`);
    const data = JSON.stringify(doc);
    const req = https.request({ hostname: url.hostname, path: url.pathname + url.search, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        if (res.statusCode < 300) { const r = JSON.parse(d); resolve({ id: r.name.split('/').pop() }); }
        else reject(new Error(d.slice(0, 300)));
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const now = Date.now();
  const day = 86400000;

  const users = [
    { uid: 'test-user-001', displayName: 'Jake Miller',   username: 'jakemiller', totalCaps: 89,  totalGames: 14, totalWins: 9,  totalLosses: 5, currentWinStreak: 3, bestWinStreak: 5 },
    { uid: 'test-user-002', displayName: 'Chris Torres',  username: 'ctorres',    totalCaps: 112, totalGames: 18, totalWins: 11, totalLosses: 7, currentWinStreak: 1, bestWinStreak: 4 },
    { uid: 'test-user-003', displayName: "Ryan O'Brien",  username: 'ryano',      totalCaps: 54,  totalGames: 10, totalWins: 4,  totalLosses: 6, currentWinStreak: 0, bestWinStreak: 3 },
    { uid: 'test-user-004', displayName: 'Matt Chen',     username: 'mattchen',   totalCaps: 143, totalGames: 22, totalWins: 14, totalLosses: 8, currentWinStreak: 4, bestWinStreak: 7 },
  ];

  console.log('Seeding users...');
  for (const u of users) {
    await setDoc('users', u.uid, {
      ...u,
      email: `${u.username}@test.com`,
      createdAt: now,
    });
    console.log(`  ✓ ${u.displayName} (@${u.username})`);
  }

  const games = [
    { userId: 'test-user-004', players: ['test-user-004','test-user-001','test-user-002'], capsMade: 8,  bounces: 2, rebuttals: 1, result: 'win',  notes: 'Great game at the house', date: now - 21*day, status: 'verified', approvals: ['test-user-001'], rejections: [] },
    { userId: 'test-user-002', players: ['test-user-002','test-user-003','test-user-004'], capsMade: 7,  bounces: 1, rebuttals: 0, result: 'win',  notes: '',                         date: now - 18*day, status: 'verified', approvals: ['test-user-003'], rejections: [] },
    { userId: 'test-user-003', players: ['test-user-003','test-user-004','test-user-001'], capsMade: 4,  bounces: 0, rebuttals: 2, result: 'loss', notes: 'Close game',               date: now - 14*day, status: 'verified', approvals: ['test-user-004'], rejections: [] },
    { userId: 'test-user-001', players: ['test-user-001','test-user-002','test-user-003'], capsMade: 9,  bounces: 3, rebuttals: 0, result: 'win',  notes: 'On fire tonight',          date: now - 10*day, status: 'verified', approvals: ['test-user-002'], rejections: [] },
    { userId: 'test-user-004', players: ['test-user-004','test-user-003','test-user-001'], capsMade: 11, bounces: 1, rebuttals: 1, result: 'win',  notes: '',                         date: now - 7*day,  status: 'verified', approvals: ['test-user-003'], rejections: [] },
    { userId: 'test-user-002', players: ['test-user-002','test-user-001','test-user-004'], capsMade: 5,  bounces: 0, rebuttals: 3, result: 'loss', notes: 'Rough night',              date: now - 5*day,  status: 'verified', approvals: ['test-user-001'], rejections: [] },
    { userId: 'test-user-004', players: ['test-user-004','test-user-002','test-user-003'], capsMade: 10, bounces: 4, rebuttals: 0, result: 'win',  notes: 'Bounce merchant at it again', date: now - 3*day, status: 'verified', approvals: ['test-user-002'], rejections: [] },
    { userId: 'test-user-001', players: ['test-user-001','test-user-004','test-user-003'], capsMade: 7,  bounces: 1, rebuttals: 2, result: 'win',  notes: '',                         date: now - 2*day,  status: 'verified', approvals: ['test-user-004'], rejections: [] },
    { userId: 'test-user-003', players: ['test-user-003','test-user-001','test-user-002'], capsMade: 6,  bounces: 0, rebuttals: 1, result: 'loss', notes: 'Need verification',        date: now - 1*day,  status: 'pending',  approvals: [],               rejections: [] },
    { userId: 'test-user-002', players: ['test-user-002','test-user-004','test-user-001'], capsMade: 8,  bounces: 2, rebuttals: 0, result: 'win',  notes: 'Fresh game',               date: now,          status: 'pending',  approvals: [],               rejections: [] },
  ];

  console.log('\nSeeding games...');
  for (const g of games) {
    const ref = await addDoc('games', { ...g, createdAt: now });
    const label = g.result === 'win' ? 'WIN' : 'LOSS';
    console.log(`  ✓ ${g.userId} — ${label} (${g.status}) [${ref.id}]`);
  }

  console.log('\n✅ Done! Open the app to see the seeded data.');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
