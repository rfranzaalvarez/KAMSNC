/**
 * Validadores para campos del CRM
 */

/**
 * Valida teléfono español.
 * Acepta: +34XXXXXXXXX, 34XXXXXXXXX, 6XXXXXXXX, 7XXXXXXXX, 9XXXXXXXX
 * Con o sin espacios/guiones
 */
export function validatePhone(phone) {
  if (!phone) return { valid: true, error: '' }; // opcional
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  // Acepta +34 o 34 seguido de 9 dígitos, o directamente 9 dígitos empezando por 6, 7 o 9
  const regex = /^(\+?34)?[679]\d{8}$/;
  if (!regex.test(cleaned)) {
    return { valid: false, error: 'Formato inválido. Ej: 612345678, +34612345678' };
  }
  return { valid: true, error: '' };
}

/**
 * Valida formato de email básico
 */
export function validateEmail(email) {
  if (!email) return { valid: true, error: '' }; // opcional
  const regex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!regex.test(email)) {
    return { valid: false, error: 'Formato de email inválido' };
  }
  return { valid: true, error: '' };
}

/**
 * Valida CIF/NIF español
 * CIF: letra + 7 dígitos + dígito/letra de control
 * NIF: 8 dígitos + letra, o letra + 7 dígitos + letra (NIE)
 */
export function validateCIF(cif) {
  if (!cif) return { valid: true, error: '' }; // opcional
  const cleaned = cif.toUpperCase().replace(/[\s\-\.]/g, '');

  // NIF: 8 dígitos + letra
  const nifRegex = /^\d{8}[A-Z]$/;
  if (nifRegex.test(cleaned)) {
    const letras = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const numero = parseInt(cleaned.slice(0, 8));
    const letraEsperada = letras[numero % 23];
    if (cleaned[8] === letraEsperada) {
      return { valid: true, error: '' };
    }
    return { valid: false, error: 'Letra del NIF incorrecta' };
  }

  // NIE: X/Y/Z + 7 dígitos + letra
  const nieRegex = /^[XYZ]\d{7}[A-Z]$/;
  if (nieRegex.test(cleaned)) {
    const nieMap = { X: '0', Y: '1', Z: '2' };
    const numero = parseInt(nieMap[cleaned[0]] + cleaned.slice(1, 8));
    const letras = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const letraEsperada = letras[numero % 23];
    if (cleaned[8] === letraEsperada) {
      return { valid: true, error: '' };
    }
    return { valid: false, error: 'Letra del NIE incorrecta' };
  }

  // CIF: letra + 7 dígitos + dígito/letra control
  const cifRegex = /^[ABCDEFGHJKLMNPQRSUVW]\d{7}[\dA-J]$/;
  if (cifRegex.test(cleaned)) {
    // Validar dígito de control del CIF
    const letra = cleaned[0];
    const digitos = cleaned.slice(1, 8);
    let sumaPar = 0;
    let sumaImpar = 0;

    for (let i = 0; i < 7; i++) {
      const d = parseInt(digitos[i]);
      if (i % 2 === 0) {
        // Posición impar (1,3,5,7) - multiplicar por 2
        const doble = d * 2;
        sumaImpar += doble > 9 ? doble - 9 : doble;
      } else {
        // Posición par (2,4,6)
        sumaPar += d;
      }
    }

    const total = sumaPar + sumaImpar;
    const control = (10 - (total % 10)) % 10;
    const controlLetra = String.fromCharCode(64 + control); // A=1, B=2...

    const ultimoChar = cleaned[8];
    // Algunas letras de CIF requieren letra de control, otras dígito
    const soloLetra = 'KPQS'.includes(letra);
    const soloDigito = 'ABEH'.includes(letra);

    if (soloLetra) {
      if (ultimoChar === controlLetra || (control === 0 && ultimoChar === 'J')) {
        return { valid: true, error: '' };
      }
    } else if (soloDigito) {
      if (ultimoChar === String(control)) {
        return { valid: true, error: '' };
      }
    } else {
      // Puede ser dígito o letra
      if (ultimoChar === String(control) || ultimoChar === controlLetra || (control === 0 && ultimoChar === 'J')) {
        return { valid: true, error: '' };
      }
    }

    return { valid: false, error: 'Dígito de control del CIF incorrecto' };
  }

  return { valid: false, error: 'Formato inválido. Ej: B12345678, 12345678A' };
}
