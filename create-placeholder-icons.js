// Simple script to create placeholder icons
// This creates colored squares with text for development

const fs = require('fs');
const path = require('path');

// Simple SVG placeholder that can be used temporarily
const createSVGIcon = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#0969da"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
        fill="white" font-family="Arial" font-size="${Math.floor(size * 0.4)}" font-weight="bold">
    GH
  </text>
</svg>
`;

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// For now, create SVG files (Chrome supports SVG in manifest v3 for development)
const sizes = [16, 48, 128];
sizes.forEach(size => {
  const svg = createSVGIcon(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.svg`), svg);
  console.log(`Created icon${size}.svg`);
});

console.log('\n✅ Placeholder icons created!');
console.log('Replace these with proper PNG icons before production.');
