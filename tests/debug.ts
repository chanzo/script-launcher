import * as fs from 'fs';
import * as path from 'path';

const tempFiles = path.join(__dirname, 'temp'); // , '*.json'

function deleteFiles(directory: string, pattern: RegExp) {
  for (const fileName of fs.readdirSync(directory)) {
    if (fileName.match(pattern)) {
      const filePath = path.join(tempFiles, fileName);

      fs.unlinkSync(filePath);
    }
  }
}

deleteFiles(tempFiles, /json$/);
