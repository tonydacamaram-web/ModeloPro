/**
 * Calcula el monto convertido a la otra moneda usando la tasa BCV.
 * @param {number} monto - Monto original
 * @param {string} moneda - 'VES' o 'USD'
 * @param {number} tasaBcv - Bolívares por 1 USD
 * @returns {number} Monto en la otra moneda, redondeado a 2 decimales
 */
const convertirMonto = (monto, moneda, tasaBcv) => {
  if (!monto || !moneda || !tasaBcv) return null;

  if (moneda === 'VES') {
    // VES a USD: dividir por la tasa
    return parseFloat((monto / tasaBcv).toFixed(2));
  } else {
    // USD a VES: multiplicar por la tasa
    return parseFloat((monto * tasaBcv).toFixed(2));
  }
};

module.exports = { convertirMonto };
