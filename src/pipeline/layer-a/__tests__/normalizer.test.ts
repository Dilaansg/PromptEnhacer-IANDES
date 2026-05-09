import { Normalizer } from '../normalizer';

const n = new Normalizer();

describe('Normalizer — tokens técnicos preservados', () => {
  test('C++ sobrevive la normalización', () => {
    const result = n.normalize('debug este código en C++');
    expect(result).toContain('c++');
  });

  test('C# sobrevive la normalización', () => {
    const result = n.normalize('Escribir una clase en C#');
    expect(result).toContain('c#');
  });

  test('.NET sobrevive la normalización', () => {
    const result = n.normalize('Aplicación web en .NET 8');
    expect(result).toContain('.net');
  });

  test('Node.js sobrevive la normalización', () => {
    const result = n.normalize('Configurar un servidor con Node.js');
    expect(result).toContain('node.js');
  });

  test('Vue.js sobrevive la normalización', () => {
    const result = n.normalize('Componente en Vue.js con composables');
    expect(result).toContain('vue.js');
  });

  test('full-stack conserva el guión', () => {
    const result = n.normalize('Quiero ser desarrollador full-stack');
    expect(result).toContain('full-stack');
  });

  test('front-end conserva el guión', () => {
    const result = n.normalize('Trabajar en el front-end de una app');
    expect(result).toContain('front-end');
  });

  test('e-mail conserva el guión', () => {
    const result = n.normalize('Enviar un e-mail con adjuntos');
    expect(result).toContain('e-mail');
  });
});

describe('Normalizer — comportamiento base', () => {
  test('convierte a minúsculas', () => {
    expect(n.normalize('HOLA MUNDO')).toBe('hola mundo');
  });

  test('elimina espacios dobles', () => {
    expect(n.normalize('hola   mundo')).toBe('hola mundo');
  });

  test('elimina emojis', () => {
    expect(n.normalize('hola 😀 mundo')).toBe('hola mundo');
  });

  test('preserva tildes y diacríticos', () => {
    expect(n.normalize('álgebra lineal')).toBe('álgebra lineal');
  });

  test('elimina signos de puntuación normales', () => {
    const result = n.normalize('¿Qué es la regresión lineal?');
    expect(result).not.toContain('¿');
    expect(result).not.toContain('?');
    expect(result).toContain('regresión');
  });

  test('cadena vacía devuelve cadena vacía', () => {
    expect(n.normalize('')).toBe('');
  });
});

describe('Normalizer — tokenize', () => {
  test('divide por espacios', () => {
    expect(n.tokenize('hola mundo foo')).toEqual(['hola', 'mundo', 'foo']);
  });

  test('cadena vacía devuelve array vacío', () => {
    expect(n.tokenize('')).toEqual([]);
  });
});
