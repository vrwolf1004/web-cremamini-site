#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// .env.local 파일이 없으면 .env를 사용
if (!fs.existsSync('.env.local')) {
  require('dotenv').config();
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const gaId = process.env.VITE_GA_MEASUREMENT_ID;

// Firebase 설정이 없으면 경고
if (!firebaseConfig.apiKey) {
  console.warn('⚠️  경고: Firebase 설정이 없습니다. .env.local 파일을 확인하세요.');
  console.warn('   참고: .env.example에서 복사하고 실제 값으로 채우세요.\n');
}

// index.html 읽기
const indexPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexPath, 'utf-8');

// Firebase 설정 부분 찾기 및 대체
const firebasePattern = /const firebaseConfig = \{[\s\S]*?\};/;
const firebaseCode = `const firebaseConfig = {
      apiKey: "${firebaseConfig.apiKey}",
      authDomain: "${firebaseConfig.authDomain}",
      projectId: "${firebaseConfig.projectId}",
      storageBucket: "${firebaseConfig.storageBucket}",
      messagingSenderId: "${firebaseConfig.messagingSenderId}",
      appId: "${firebaseConfig.appId}"
    };`;

html = html.replace(firebasePattern, firebaseCode);

// Google Analytics ID 대체
if (gaId) {
  const gaPattern = /gtag\.js\?id=G-[A-Z0-9]+/;
  html = html.replace(gaPattern, `gtag.js?id=${gaId}`);
}

// 빌드된 파일 저장 (같은 경로)
fs.writeFileSync(indexPath, html, 'utf-8');

console.log('✅ Firebase 설정이 index.html에 적용되었습니다.');
console.log(`   projectId: ${firebaseConfig.projectId}`);
if (gaId) {
  console.log(`   GA ID: ${gaId}`);
}
