import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSelection } from '../src/selection.ts';

for (const fullName of [
  'AlvaroParker/RepoHop',
  'a/b',
  'some-owner/repo_name.js',
  'owner/.github',
  '123/repo-1',
  `${'a'.repeat(39)}/${'r'.repeat(100)}`,
]) {
  void test(`accepts ${fullName}`, () => {
    assert.deepEqual(parseSelection(fullName), {
      fullName,
      url: `https://github.com/${fullName}`,
    });
  });
}

void test('trims surrounding spaces, tabs, newlines, and Unicode whitespace', () => {
  assert.deepEqual(
    parseSelection(' \t\r\n\u00a0AlvaroParker/RepoHop\u2003\n '),
    {
      fullName: 'AlvaroParker/RepoHop',
      url: 'https://github.com/AlvaroParker/RepoHop',
    },
  );
});

for (const selection of [
  undefined,
  '',
  ' \t\n ',
  'owner',
  '/repo',
  'owner/',
  '/owner/repo',
  'owner/repo/',
  'owner/repo/issues',
  'owner//repo',
  'owner /repo',
  'owner/ repo',
  'owner/re po',
  'owner/repo\nother',
  'owner/repo\u0000',
  'owner/repo\u200b',
  'owner/repo other/repo',
  'https://github.com/owner/repo',
  'github.com/owner/repo',
  '//evil.example/repo',
  'https:evil/repo',
  'javascript:alert(1)/repo',
  'git@github.com:owner/repo',
  'owner@evil.example/repo',
  'owner/repo?redirect=evil',
  'owner/repo#fragment',
  'owner/repo&query',
  'owner/repo%2f..',
  'owner/%2e%2e',
  'owner/..',
  'owner/.',
  '../repo',
  './repo',
  'owner\\repo',
  'owner/repo\\..',
  'owner/repo:port',
  'owner/répo',
  'ownér/repo',
  'owner／repo',
  '-owner/repo',
  'owner-/repo',
  'own--er/repo',
  'own_er/repo',
  `${'a'.repeat(40)}/repo`,
  `owner/${'r'.repeat(101)}`,
]) {
  void test(`rejects ${JSON.stringify(selection)}`, () => {
    assert.equal(parseSelection(selection), null);
  });
}
