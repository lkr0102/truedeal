const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('c:/Users/João/Desktop/Hackertons/TrueDeal-Notion/TrueDeal_Relatorio_Progresso_Infra.pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
}).catch(function(err) {
    console.error('Error reading PDF:', err);
});
