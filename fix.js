const fs = require('fs');
const file = 'components/dresses/standalone-rentals-client.tsx';
let txt = fs.readFileSync(file, 'utf8');
txt = txt.replace(/  type="button" /g, ' ');
fs.writeFileSync(file, txt);
