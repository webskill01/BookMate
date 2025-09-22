// scripts/generate-icons.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [32, 72, 96, 128, 144, 152, 180, 192, 384, 512];
const inputSvg = path.join(__dirname, '../public/icons/base-icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('🎨 Generating BookMate icons...');
  
  try {
    // Check if SVG exists
    if (!fs.existsSync(inputSvg)) {
      console.error(`❌ SVG file not found: ${inputSvg}`);
      console.log('📝 Please create the base-icon.svg file first.');
      return;
    }
    
    // Read the SVG file
    const svgBuffer = fs.readFileSync(inputSvg);
    
    // Generate each size
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      
      await sharp(svgBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({
          quality: 90,
          compressionLevel: 9,
          palette: true
        })
        .toFile(outputPath);
      
      console.log(`✅ Generated icon-${size}x${size}.png`);
    }
    
    // Generate favicon (32x32)
    await sharp(svgBuffer)
      .resize(32, 32)
      .png({
        palette: true,
        compressionLevel: 9
      })
      .toFile(path.join(outputDir, 'favicon-32x32.png'));
    
    console.log('✅ Generated favicon-32x32.png');
    
    // Generate Apple touch icon (180x180)
    await sharp(svgBuffer)
      .resize(180, 180)
      .png({
        quality: 90,
        compressionLevel: 9
      })
      .toFile(path.join(outputDir, 'apple-touch-icon.png'));
    
    console.log('✅ Generated apple-touch-icon.png');
    
    // Generate additional PWA icons
    await sharp(svgBuffer)
      .resize(16, 16)
      .png({ palette: true })
      .toFile(path.join(outputDir, 'favicon-16x16.png'));
    
    console.log('✅ Generated favicon-16x16.png');
    
    console.log('🚀 All icons generated successfully!');
    console.log(`📁 Icons saved to: ${outputDir}`);
    
    // List generated files
    const files = fs.readdirSync(outputDir).filter(file => file.endsWith('.png'));
    console.log(`📋 Generated ${files.length} icon files:`);
    files.forEach(file => console.log(`   • ${file}`));
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    
    if (error.message.includes('sharp')) {
      console.log('\n💡 Sharp installation issue detected.');
      console.log('Try running: npm install --save-dev sharp');
    }
  }
}

generateIcons();
