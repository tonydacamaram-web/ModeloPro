import { useState, useRef, forwardRef, useCallback } from 'react';

const addDotSeps = (s) =>
  s ? s.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';

const fmtBlurred = (v) => {
  const num = parseFloat(v);
  if (!v || isNaN(num) || num === 0) return '';
  const [int, dec] = num.toFixed(2).split('.');
  return `${addDotSeps(int)},${dec}`;
};

/**
 * Input de monto con formato automático venezolano (1.234.567,89)
 *
 * Comportamiento:
 * - '.' y ',' ambos inician la parte decimal
 * - Puntos de miles se insertan automáticamente
 * - Máximo 2 decimales
 * - Compatible con React Hook Form vía Controller: onChange recibe un número
 *
 * Uso con Controller (recomendado):
 *   <Controller name="monto" control={control} rules={{...}}
 *     render={({ field }) => <MontoInput {...field} className="input-campo" />}
 *   />
 *
 * Uso controlado simple:
 *   <MontoInput value={monto} onChange={setMonto} className="..." />
 */
const MontoInput = forwardRef(({
  value,
  onChange,
  onBlur,
  name,
  disabled = false,
  placeholder = '0,00',
  className = '',
}, forwardedRef) => {
  const [rawStr, setRawStr] = useState('');
  const [focused, setFocused] = useState(false);
  const innerRef = useRef(null);

  const setRef = useCallback((el) => {
    innerRef.current = el;
    if (typeof forwardedRef === 'function') forwardedRef(el);
    else if (forwardedRef) forwardedRef.current = el;
  }, [forwardedRef]);

  const moveCursorToEnd = () => {
    requestAnimationFrame(() => {
      const el = innerRef.current;
      if (el) el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  const emitNumber = (raw) => {
    if (!onChange) return;
    const num = parseFloat(raw.replace(',', '.')) || 0;
    onChange(num);
  };

  const toDisplay = (raw) => {
    const ci = raw.indexOf(',');
    const ip = ci === -1 ? raw : raw.slice(0, ci);
    const dp = ci === -1 ? null : raw.slice(ci + 1);
    const ipFmt = addDotSeps(ip);
    return dp !== null ? `${ipFmt},${dp}` : ipFmt;
  };

  const handleFocus = () => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      const s = String(num);
      setRawStr(s.replace('.', ','));
    } else {
      setRawStr('');
    }
    setFocused(true);
  };

  const handleBlur = (e) => {
    setFocused(false);
    if (onBlur) onBlur(e);
  };

  const handleChange = (e) => {
    let raw = e.target.value.replace(/[^\d.,]/g, '');

    // Si el usuario terminó con punto → intención de decimal
    const dotAtEnd = raw.endsWith('.');
    // Quitar todos los puntos (pueden ser separadores de miles que pusimos nosotros)
    raw = raw.replace(/\./g, '');
    // Si era un punto de decimal y aún no hay coma, añadir coma
    if (dotAtEnd && !raw.includes(',')) raw += ',';

    // Mantener solo la primera coma (separador decimal), máx 2 decimales
    const ci = raw.indexOf(',');
    let newRaw;
    if (ci === -1) {
      newRaw = raw.slice(0, 15);
    } else {
      const ip = raw.slice(0, ci).slice(0, 15);
      const dp = raw.slice(ci + 1).replace(/,/g, '').slice(0, 2);
      newRaw = `${ip},${dp}`;
    }

    setRawStr(newRaw);
    emitNumber(newRaw);
    moveCursorToEnd();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').replace(/\s/g, '');
    const cleaned = text.replace(/[^\d.,]/g, '');
    if (!cleaned) return;

    const lC = cleaned.lastIndexOf(',');
    const lD = cleaned.lastIndexOf('.');
    let intStr, decStr;

    if (lC > lD) {
      intStr = cleaned.slice(0, lC).replace(/[.,]/g, '').slice(0, 15);
      decStr = cleaned.slice(lC + 1).replace(/[.,]/g, '').slice(0, 2) || null;
    } else if (lD !== -1) {
      intStr = cleaned.slice(0, lD).replace(/[.,]/g, '').slice(0, 15);
      decStr = cleaned.slice(lD + 1).replace(/[.,]/g, '').slice(0, 2) || null;
    } else {
      intStr = cleaned.replace(/[.,]/g, '').slice(0, 15);
      decStr = null;
    }

    const newRaw = decStr ? `${intStr},${decStr}` : intStr;
    setRawStr(newRaw);
    emitNumber(newRaw);
  };

  const display = focused ? toDisplay(rawStr) : fmtBlurred(value);

  return (
    <input
      ref={setRef}
      name={name}
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      onPaste={handlePaste}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
});

MontoInput.displayName = 'MontoInput';
export default MontoInput;
