import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, renderKnown, extractVars } from '../src/utils/render.js';

test('remplace les variables connues', () => {
  assert.equal(render('Bonjour {{name}} !', { name: 'Alice' }), 'Bonjour Alice !');
});
test('variable inconnue = chaîne vide', () => {
  assert.equal(render('Salut {{x}}', {}), 'Salut ');
});
test('tolère les espaces dans les accolades', () => {
  assert.equal(render('{{ name }}', { name: 'Bob' }), 'Bob');
});
test('renderKnown laisse les variables non fournies', () => {
  assert.equal(
    renderKnown('Salut {{name}}, commande {{order_id}}', { order_id: 'A12' }),
    'Salut {{name}}, commande A12'
  );
});
test('extractVars liste les variables sans doublon', () => {
  assert.deepEqual(extractVars('Bonjour {{name}}', '{{order_id}} et {{name}}'), ['name', 'order_id']);
});
