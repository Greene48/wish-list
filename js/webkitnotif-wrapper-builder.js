UnityWebappsWebkitNotificationApiPageProxyBuilder = function(backend, aWindow) {
  var PERMISSION_ALLOWED = 0;
  var PERMISSION_NOT_ALLOWED = 1;
  var PERMISSION_DENIED = 2;
  
  var nope = Function();
  var Notification = Function();
  Notification.prototype = {
    dispatchEvent: nope,
    removeEventListener: nope,
    addEventListener: nope,
    cancel: nope,
    show: nope,
    ondisplay: null,
    onerror: null,
    onclick: null,
    onclose: null,
    onshow: null,
    replaceId: '',
    dir: ''
  };
  
  aWindow.webkitNotifications.createNotification = function(iconUrl, title, body) {
    if (this.checkPermission() !== PERMISSION_ALLOWED) {
      throw new Error("not allowed");
      }
    var notification = new Notification();
    notification.show = function () {
      backend('webkitNotifications.showNotification', [iconUrl, title, body]);
    };
    return notification;
  };
};

