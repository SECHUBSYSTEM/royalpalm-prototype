/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

/**
 * Generate valid PNG icons with RoyalPalm branding
 * Creates simple, clean icons with "RP" text on a gradient background
 */
async function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  console.log('🎨 Generating PWA icons...');
  
  try {
    const sharp = require('sharp');
    
    // Create icon with gradient background and "RP" text
    const createIcon = async (size) => {
      const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#34495e;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#2c3e50;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.15}"/>
          <text 
            x="50%" 
            y="50%" 
            font-family="Arial, sans-serif" 
            font-size="${size * 0.45}" 
            font-weight="bold" 
            fill="#ffffff" 
            text-anchor="middle" 
            dominant-baseline="middle"
            letter-spacing="${size * 0.02}"
          >RP</text>
        </svg>
      `;
      
      return await sharp(Buffer.from(svg))
        .png()
        .resize(size, size, { fit: 'fill' })
        .toBuffer();
    };
    
    // Generate 192x192 icon
    const icon192 = await createIcon(192);
    fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
    console.log('✅ Created icon-192.png');
    
    // Generate 512x512 icon
    const icon512 = await createIcon(512);
    fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);
    console.log('✅ Created icon-512.png');
    
    console.log('🎉 Icon generation complete!');
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('sharp')) {
      console.error('❌ Sharp not found. Installing...');
      console.log('   Run: pnpm add -D sharp');
      console.log('   Then run this script again: node scripts/generate-pwa-icons.js');
      process.exit(1);
    } else {
      console.error('❌ Error generating icons:', error);
      process.exit(1);
    }
  }
}

// Run the script
generateIcons().catch(console.error);
