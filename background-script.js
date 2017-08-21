browser.browserAction.onClicked.addListener(function() {
    browser.tabs.create({ "url": browser.i18n.getMessage("mainPage") });
});
