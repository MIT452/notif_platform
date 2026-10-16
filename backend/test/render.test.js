import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../src/utils/render.js';

test('remplace les variables connues', () => {
  assert.equal(render('Bonjour {{name}} !', { name: 'Alice' }), 'Bonjour Alice !');
});
test('variable inconnue = chaîne vide', () => {
  assert.equal(render('Salut {{x}}', {}), 'Salut ');
});
test('tolère les espaces dans les accolades', () => {
  assert.equal(render('{{ name }}', { name: 'Bob' }), 'Bob');
});
