const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function convertHundreds(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return tens[t] + (o > 0 ? ' ' + ones[o] : '');
  }
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return ones[h] + ' Hundred' + (rest > 0 ? ' ' + convertHundreds(rest) : '');
}

function convertToWords(n: number): string {
  if (n === 0) return 'Zero';

  let result = '';
  let num = Math.floor(n);

  if (num >= 10000000) {
    result += convertHundreds(Math.floor(num / 10000000)) + ' Crore ';
    num = num % 10000000;
  }
  if (num >= 100000) {
    result += convertHundreds(Math.floor(num / 100000)) + ' Lakh ';
    num = num % 100000;
  }
  if (num >= 1000) {
    result += convertHundreds(Math.floor(num / 1000)) + ' Thousand ';
    num = num % 1000;
  }
  if (num > 0) {
    result += convertHundreds(num);
  }

  return result.trim();
}

export function numberToWords(amount: number): string {
  if (amount === 0) return 'INR Zero Only';

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let result = 'INR ' + convertToWords(rupees);

  if (paise > 0) {
    result += ' and ' + convertToWords(paise) + ' Paise';
  }

  return result + ' Only';
}
