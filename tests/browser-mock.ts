import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { menuId, type MenuBrowser } from '../src/menu.ts';

function createEvent<Args extends unknown[]>() {
  const listeners = new Set<(...args: Args) => void>();

  return {
    addListener: (listener: (...args: Args) => void) => {
      listeners.add(listener);
    },
    removeListener: (listener: (...args: Args) => void) => {
      listeners.delete(listener);
    },
    hasListener: (listener: (...args: Args) => void) => listeners.has(listener),
    emit: (...args: Args) => {
      for (const listener of listeners) {
        listener(...args);
      }
    },
    get size() {
      return listeners.size;
    },
  };
}

const tab: browser.tabs.Tab = {
  id: 1,
  index: 0,
  active: true,
  highlighted: true,
  pinned: false,
  incognito: false,
};

export function createBrowserMock(
  items = new Map<string | number, browser.menus._CreateCreateProperties>(),
) {
  const onInstalled = createEvent<[browser.runtime._OnInstalledDetails]>();
  const onShown = createEvent<[browser.menus._OnShownInfo, browser.tabs.Tab]>();
  const onHidden = createEvent<[]>();
  const onClicked = createEvent<[browser.menus.OnClickData]>();
  const runtimeError: { value: browser.runtime._LastError | undefined } = {
    value: undefined,
  };
  const runtime: MenuBrowser['runtime'] = {
    onInstalled,
    get lastError() {
      return runtimeError.value;
    },
  };

  const api = {
    runtime,
    menus: {
      onShown,
      onHidden,
      onClicked,
      create: mock.fn<MenuBrowser['menus']['create']>(
        (properties, callback) => {
          const id = properties.id;
          assert.ok(id);
          assert.equal(items.has(id), false, 'menu IDs must be unique');
          items.set(id, { ...properties });
          callback?.();
          return id;
        },
      ),
      removeAll: mock.fn(() => {
        items.clear();
        return Promise.resolve();
      }),
      update: mock.fn<MenuBrowser['menus']['update']>((id, properties) => {
        const existing = items.get(id);
        assert.ok(existing, 'only an existing menu may be updated');
        items.set(id, { ...existing, ...properties });
        return Promise.resolve();
      }),
      refresh: mock.fn(() => Promise.resolve()),
    },
    tabs: {
      create: mock.fn<MenuBrowser['tabs']['create']>(() =>
        Promise.resolve(tab),
      ),
    },
  } satisfies MenuBrowser;

  return {
    api,
    items,
    onInstalled,
    runtimeError,
    show(
      selectionText?: string,
      contexts: browser.menus.ContextType[] = ['selection'],
    ) {
      onShown.emit(
        { menuIds: [], contexts, editable: false, selectionText },
        tab,
      );
    },
    hide() {
      onHidden.emit();
    },
    click(selectionText?: string, id: string | number = menuId) {
      onClicked.emit({
        menuItemId: id,
        editable: false,
        modifiers: [],
        selectionText,
      });
    },
  };
}
