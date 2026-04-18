const fs = require('fs');
const path = 'c:\\Users\\BAPS\\Downloads\\QnA-Project\\Backend\\src\\controllers\\reportController.ts';
let content = fs.readFileSync(path, 'utf8');

const target = `customer: p.vendorName`;
const replacement = `customer: p.vendorName,
          vendorCompany: p.vendorCompany,
          vendorPhone: p.vendorPhone,
          vendorAddress: p.vendorAddress`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully updated reportController.ts');
} else {
    console.error('Target not found in reportController.ts');
}
