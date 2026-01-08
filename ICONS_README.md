# PWA Icons Setup

The PWA requires two icon files for installation:

1. `public/icon-192.png` (192x192 pixels)
2. `public/icon-512.png` (512x512 pixels)

## Quick Setup Options

### Option 1: Online Icon Generator
1. Visit https://realfavicongenerator.net/ or similar
2. Upload a logo or create simple icon
3. Download the icons and place in `public/` directory

### Option 2: Use Image Editor
1. Create 192x192 and 512x512 images
2. Background color: `#2c3e50`
3. Add "RP" text in white, centered
4. Save as PNG files

### Option 3: Browser Canvas (Temporary)
1. Open `scripts/generate-icons.html` in browser
2. Run the JavaScript code in console
3. Icons will download automatically

## Icon Specifications

- **Format**: PNG
- **Background**: #2c3e50 (dark blue-gray)
- **Text**: "RP" in white, bold, centered
- **Sizes**: 192x192 and 512x512 pixels
- **Purpose**: "any maskable" (for PWA)

## Note

The app will work without icons, but PWA installation may not work properly until icons are added.
