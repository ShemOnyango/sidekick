const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../../public/uploads');
try {
  if (!fs.existsSync(uploadsDir)) {fs.mkdirSync(uploadsDir, { recursive: true });}
} catch (e) {
  // ignore
}

module.exports = {
  generateTripReport: async function (reportData) {
    const filename = `trip_report_${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, filename);
    const content = `Trip Report\n\nAuthority: ${reportData.authority?.Authority_Name || 'N/A'}\nGenerated: ${new Date().toISOString()}\n`;
    await fs.promises.writeFile(filePath, content);
    return filePath;
  }
};
