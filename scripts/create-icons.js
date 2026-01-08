// Simple script to create placeholder PWA icons
// Run with: node scripts/create-icons.js
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs');
const path = require('path');

// Create a simple SVG icon
const createIconSVG = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#2c3e50"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.3}" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">RP</text>
</svg>`;

// For now, we'll create a simple approach
// In production, you'd want proper PNG icons
// This creates SVG files that can be converted to PNG

const publicDir = path.join(__dirname, '..', 'public');

// Create SVG icons (browsers can use SVG in manifest too)
fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), createIconSVG(192));
fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), createIconSVG(512));

console.log('✅ Created SVG icons. For PNG icons, use an online converter or image tool.');
console.log('   Place icon-192.png and icon-512.png in the public/ directory.');
