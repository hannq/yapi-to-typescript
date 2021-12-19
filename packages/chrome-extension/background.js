const POPUP_ENTRY = 'popup.html';
const POPUP_ICON = 'icon.png';
const POPUP_ICON_DISABLED = 'icon-disabled.png';

disablePopup();

chrome.tabs.onActivated.addListener(async activeInfo => {
  const tabId = activeInfo.tabId;
  const tab = await chrome.tabs.get(tabId);
  if (isValidUrl(tab.url)) {
    enablePopup(tabId)
  } else {
    disablePopup(tabId)
  }
});

chrome.tabs.onUpdated.addListener((tabId, _, tab) => {
  const { status, url } = tab || {}
  if (status === "complete") {
    if (isValidUrl(url)) {
      enablePopup(tabId)
    } else {
      disablePopup(tabId)
    }
  }
})

/**
 * 检查指定 Url 是否合法
 * @param {*} url
 */
function isValidUrl(url) {
  return /^([^:]*:\/\/[^/]*)\/project\/\d+\/interface\/api\/(\d+)$/.test(url)
}

/**
 * 启用 popup
 * @param { number } tabId
 */
function enablePopup(tabId) {
  return Promise.all([
    chrome.action.setIcon({ tabId, path: POPUP_ICON }),
    chrome.action.setPopup({ tabId, popup: POPUP_ENTRY }),
    chrome.action.setTitle({ tabId, title: 'YApi To TypeScript' }),
  ])
}

/**
 * 禁用 popup
 * @param { number } tabId
 */
function disablePopup(tabId) {
  return Promise.all([
    chrome.action.setIcon({ tabId, path: POPUP_ICON_DISABLED }),
    chrome.action.setPopup({ tabId, popup: '' }),
    chrome.action.setTitle({ tabId, title: '🚫 此页面不可用' }),
  ])
}
