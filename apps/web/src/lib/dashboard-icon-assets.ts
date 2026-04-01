const resolvedDashboardAssetUrlCache = new Map<string, string>();
const failedDashboardAssetUrlCache = new Set<string>();
const pendingDashboardAssetLoads = new Map<string, Promise<string | null>>();

function createImageLoader(): HTMLImageElement {
  return new Image();
}

export function getDashboardAssetCacheKey(assetUrls: string[]) {
  return assetUrls.join("\u0000");
}

export function getInitialDashboardAssetIndex(assetUrls: string[]) {
  if (assetUrls.length === 0) {
    return 0;
  }

  const cacheKey = getDashboardAssetCacheKey(assetUrls);
  const cachedUrl = resolvedDashboardAssetUrlCache.get(cacheKey);
  if (cachedUrl) {
    const cachedIndex = assetUrls.indexOf(cachedUrl);
    if (cachedIndex >= 0) {
      return cachedIndex;
    }
  }

  const nextAvailableIndex = assetUrls.findIndex((assetUrl) => !failedDashboardAssetUrlCache.has(assetUrl));
  return nextAvailableIndex >= 0 ? nextAvailableIndex : 0;
}

export function rememberDashboardAssetSuccess(assetUrls: string[], assetIndex: number) {
  const assetUrl = assetUrls[assetIndex];
  if (!assetUrl) {
    return;
  }

  resolvedDashboardAssetUrlCache.set(getDashboardAssetCacheKey(assetUrls), assetUrl);
}

export function rememberDashboardAssetFailure(assetUrl: string) {
  if (!assetUrl) {
    return;
  }

  failedDashboardAssetUrlCache.add(assetUrl);
}

function loadImageAsset(assetUrl: string) {
  return new Promise<boolean>((resolve) => {
    const image = createImageLoader();
    image.decoding = "async";
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = assetUrl;
  });
}

export function preloadDashboardAssetUrls(assetUrls: string[]) {
  if (assetUrls.length === 0) {
    return Promise.resolve<string | null>(null);
  }

  const cacheKey = getDashboardAssetCacheKey(assetUrls);
  const cachedUrl = resolvedDashboardAssetUrlCache.get(cacheKey);
  if (cachedUrl) {
    return Promise.resolve(cachedUrl);
  }

  const pendingLoad = pendingDashboardAssetLoads.get(cacheKey);
  if (pendingLoad) {
    return pendingLoad;
  }

  const loadPromise = (async () => {
    for (const assetUrl of assetUrls) {
      if (failedDashboardAssetUrlCache.has(assetUrl)) {
        continue;
      }

      const loaded = await loadImageAsset(assetUrl);
      if (loaded) {
        resolvedDashboardAssetUrlCache.set(cacheKey, assetUrl);
        return assetUrl;
      }

      failedDashboardAssetUrlCache.add(assetUrl);
    }

    return null;
  })();

  pendingDashboardAssetLoads.set(cacheKey, loadPromise);

  return loadPromise.finally(() => {
    pendingDashboardAssetLoads.delete(cacheKey);
  });
}
