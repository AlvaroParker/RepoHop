import { parseSelection } from './selection.ts';

export type MenuBrowser = {
  menus: Pick<
    typeof browser.menus,
    | 'create'
    | 'removeAll'
    | 'update'
    | 'refresh'
    | 'onShown'
    | 'onHidden'
    | 'onClicked'
  >;
  runtime: Pick<typeof browser.runtime, 'onInstalled' | 'lastError'>;
  tabs: Pick<typeof browser.tabs, 'create'>;
};

export const menuId = 'repohop-open-repository';
const hiddenTitle = 'Open GitHub repository';

export function registerRepositoryMenu(api: MenuBrowser): void {
  let menuRevision = 0;
  let pendingMenuChange = Promise.resolve();

  function createMenu(): Promise<void> {
    // menus.create reports failure through its callback, unlike the Promise APIs.
    return new Promise((resolve, reject) => {
      api.menus.create(
        {
          id: menuId,
          title: hiddenTitle,
          contexts: ['selection'],
          visible: false,
        },
        () => {
          const error = api.runtime.lastError;
          if (error) {
            reject(new Error(error.message ?? 'Could not create the menu.'));
          } else {
            resolve();
          }
        },
      );
    });
  }

  function updateMenu(selectionText: string | undefined, shown: boolean): void {
    const revision = ++menuRevision;
    const repository = parseSelection(selectionText);

    // Serialize mutations and discard work belonging to a closed or replaced menu.
    pendingMenuChange = pendingMenuChange
      .then(async () => {
        if (revision !== menuRevision) {
          return;
        }

        await api.menus.update(menuId, {
          title: repository
            ? `Open github.com/${repository.fullName}`
            : hiddenTitle,
          visible: repository !== null,
        });

        if (shown && revision === menuRevision) {
          await api.menus.refresh();
        }
      })
      .catch((error: unknown) => {
        console.error('RepoHop: could not update the menu.', error);
      });
  }

  // Firefox persists event-page menus across suspension and browser restarts.
  api.runtime.onInstalled.addListener(() => {
    ++menuRevision;
    pendingMenuChange = pendingMenuChange
      .then(() => api.menus.removeAll())
      .then(createMenu)
      .catch((error: unknown) => {
        console.error('RepoHop: could not initialize the menu.', error);
      });
  });

  api.menus.onShown.addListener((info) => {
    updateMenu(
      info.contexts.includes('selection') ? info.selectionText : undefined,
      true,
    );
  });

  api.menus.onHidden.addListener(() => {
    updateMenu(undefined, false);
  });

  api.menus.onClicked.addListener((info) => {
    if (info.menuItemId !== menuId) {
      return;
    }

    const repository = parseSelection(info.selectionText);
    if (repository) {
      // Click data is authoritative, even if the menu label has not caught up yet.
      void api.tabs.create({ url: repository.url }).catch((error: unknown) => {
        console.error('RepoHop: could not open the repository tab.', error);
      });
    }
  });
}
