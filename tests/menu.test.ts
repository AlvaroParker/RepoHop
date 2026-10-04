import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { menuId, registerRepositoryMenu } from '../src/menu.ts';
import { createBrowserMock } from './browser-mock.ts';

async function installMenu() {
  const mock = createBrowserMock();
  registerRepositoryMenu(mock.api);
  mock.onInstalled.emit({ reason: 'install', temporary: true });
  await setImmediate();
  return mock;
}

void test('registers listeners synchronously and creates a single hidden selection item on install', async () => {
  const mock = createBrowserMock();
  registerRepositoryMenu(mock.api);
  assert.equal(mock.onInstalled.size, 1);
  assert.equal(mock.api.menus.onShown.size, 1);
  assert.equal(mock.api.menus.onHidden.size, 1);
  assert.equal(mock.api.menus.onClicked.size, 1);
  assert.equal(mock.items.size, 0);

  mock.onInstalled.emit({ reason: 'install', temporary: true });
  await setImmediate();
  assert.deepEqual(
    [...mock.items.values()],
    [
      {
        id: menuId,
        title: 'Open GitHub repository',
        contexts: ['selection'],
        visible: false,
      },
    ],
  );

  mock.onInstalled.emit({ reason: 'update', temporary: true });
  await setImmediate();
  assert.equal(mock.items.size, 1);
});

void test('updates visibility and the exact title for each selection without creating more items', async () => {
  const mock = await installMenu();
  for (const fullName of ['AlvaroParker/RepoHop', 'mozilla/gecko-dev', 'a/b']) {
    mock.show(` \t${fullName}\n`);
    await setImmediate();
    assert.equal(mock.items.get(menuId)?.title, `Open github.com/${fullName}`);
    assert.equal(mock.items.get(menuId)?.visible, true);
  }
  assert.equal(mock.api.menus.create.mock.callCount(), 1);
  assert.equal(mock.api.menus.refresh.mock.callCount(), 3);
  assert.equal(mock.items.size, 1);
  assert.equal(mock.api.tabs.create.mock.callCount(), 0);
});

void test('hides the previous item for invalid, missing, and non-selection contexts', async () => {
  const mock = await installMenu();
  for (const invalid of [
    undefined,
    '',
    'owner/repo/issues',
    '../repo',
    'https://github.com/a/b',
  ]) {
    mock.show('owner/repo');
    await setImmediate();
    mock.show(invalid);
    await setImmediate();
    assert.equal(mock.items.get(menuId)?.visible, false);
    assert.equal(mock.items.get(menuId)?.title, 'Open GitHub repository');
  }

  mock.show('owner/repo', ['page']);
  await setImmediate();
  assert.equal(mock.items.get(menuId)?.visible, false);
});

void test('clears visibility and the previous label when the menu closes', async () => {
  const mock = await installMenu();
  mock.show('owner/repo');
  await setImmediate();
  mock.hide();
  await setImmediate();
  assert.equal(mock.items.get(menuId)?.visible, false);
  assert.equal(mock.items.get(menuId)?.title, 'Open GitHub repository');
  assert.equal(mock.api.menus.refresh.mock.callCount(), 1);
});

void test('uses only the newest selection when events arrive before queued work starts', async () => {
  const mock = await installMenu();
  mock.show('first/repo');
  mock.hide();
  mock.show('last/repo');
  await setImmediate();
  assert.equal(mock.items.get(menuId)?.title, 'Open github.com/last/repo');
  assert.equal(mock.api.menus.update.mock.callCount(), 1);
  assert.equal(mock.api.menus.refresh.mock.callCount(), 1);
});

void test('serializes delayed updates and never refreshes an obsolete selection', async () => {
  const mock = await installMenu();
  const gate = Promise.withResolvers<void>();
  mock.api.menus.update.mock.mockImplementationOnce(async (id, properties) => {
    await gate.promise;
    mock.items.set(id, properties);
  });

  mock.show('first/repo');
  await setImmediate();
  mock.hide();
  mock.show('last/repo');
  await setImmediate();
  assert.equal(mock.api.menus.update.mock.callCount(), 1);

  gate.resolve();
  await setImmediate();
  assert.equal(mock.items.get(menuId)?.title, 'Open github.com/last/repo');
  assert.equal(mock.items.get(menuId)?.visible, true);
  assert.equal(mock.api.menus.refresh.mock.callCount(), 1);
});

void test('a close during an in-flight update leaves the item hidden without refreshing', async () => {
  const mock = await installMenu();
  const gate = Promise.withResolvers<void>();
  mock.api.menus.update.mock.mockImplementationOnce(async (id, properties) => {
    await gate.promise;
    mock.items.set(id, properties);
  });
  mock.show('owner/repo');
  await setImmediate();
  mock.hide();
  gate.resolve();
  await setImmediate();
  assert.equal(mock.items.get(menuId)?.visible, false);
  assert.equal(mock.api.menus.refresh.mock.callCount(), 0);
});

void test('waits for asynchronous creation before updating the menu', async () => {
  const mock = createBrowserMock();
  const gate = Promise.withResolvers<void>();
  mock.api.menus.removeAll.mock.mockImplementationOnce(() => gate.promise);
  registerRepositoryMenu(mock.api);
  mock.onInstalled.emit({ reason: 'install', temporary: true });
  mock.show('owner/repo');
  await setImmediate();
  assert.equal(mock.api.menus.update.mock.callCount(), 0);
  gate.resolve();
  await setImmediate();
  assert.equal(mock.items.get(menuId)?.title, 'Open github.com/owner/repo');
});

void test('reuses the persisted menu after the event page restarts', async () => {
  const previousPage = await installMenu();
  const restartedPage = createBrowserMock(previousPage.items);
  registerRepositoryMenu(restartedPage.api);
  restartedPage.show('owner/repo');
  await setImmediate();
  assert.equal(restartedPage.api.menus.create.mock.callCount(), 0);
  assert.equal(restartedPage.api.menus.removeAll.mock.callCount(), 0);
  assert.equal(restartedPage.items.size, 1);
  assert.equal(
    restartedPage.items.get(menuId)?.title,
    'Open github.com/owner/repo',
  );
});

void test('opens the validated click selection in a new tab, independent of the last label', async () => {
  const mock = await installMenu();
  mock.show('old/repo');
  await setImmediate();
  mock.hide();
  mock.click(' \nAlvaroParker/RepoHop\t ');
  await setImmediate();
  assert.equal(mock.api.tabs.create.mock.callCount(), 1);
  assert.deepEqual(mock.api.tabs.create.mock.calls[0]?.arguments, [
    { url: 'https://github.com/AlvaroParker/RepoHop' },
  ]);
});

void test('ignores other menu IDs and invalid or missing click selections', async () => {
  const mock = await installMenu();
  mock.show('owner/repo');
  mock.click('owner/repo', 'another-menu');
  for (const invalid of [
    undefined,
    '',
    'owner/repo/issues',
    'owner/..',
    '//evil.example/repo',
  ]) {
    mock.click(invalid);
  }
  await setImmediate();
  assert.equal(mock.api.tabs.create.mock.callCount(), 0);
});

void test('reports callback-based creation failures', async (context) => {
  const errors = context.mock.method(console, 'error', () => {});
  const mock = createBrowserMock();
  mock.api.menus.create.mock.mockImplementationOnce((_properties, callback) => {
    mock.runtimeError.value = { message: 'Creation failed' };
    callback?.();
    mock.runtimeError.value = undefined;
    return menuId;
  });
  registerRepositoryMenu(mock.api);
  mock.onInstalled.emit({ reason: 'install', temporary: true });
  await setImmediate();
  assert.equal(errors.mock.callCount(), 1);
  assert.deepEqual(errors.mock.calls[0]?.arguments, [
    'RepoHop: could not initialize the menu.',
    new Error('Creation failed'),
  ]);
});

for (const operation of ['removeAll', 'update', 'refresh'] as const) {
  void test(`reports ${operation} failures and allows later updates`, async (context) => {
    const errors = context.mock.method(console, 'error', () => {});
    const mock = await installMenu();
    const failure = new Error(`${operation} failed`);
    mock.api.menus[operation].mock.mockImplementationOnce(() =>
      Promise.reject(failure),
    );
    if (operation === 'removeAll') {
      mock.onInstalled.emit({ reason: 'update', temporary: true });
    } else {
      mock.show('owner/repo');
    }
    await setImmediate();
    assert.equal(errors.mock.callCount(), 1);
    assert.equal(errors.mock.calls[0]?.arguments[1], failure);

    mock.show('next/repo');
    await setImmediate();
    assert.equal(mock.items.get(menuId)?.title, 'Open github.com/next/repo');
  });
}

void test('reports a failed tab creation', async (context) => {
  const errors = context.mock.method(console, 'error', () => {});
  const mock = await installMenu();
  const failure = new Error('Tab creation failed');
  mock.api.tabs.create.mock.mockImplementationOnce(() =>
    Promise.reject(failure),
  );
  mock.click('owner/repo');
  await setImmediate();
  assert.deepEqual(errors.mock.calls[0]?.arguments, [
    'RepoHop: could not open the repository tab.',
    failure,
  ]);
});
