/**
 * 
 * 
 */
setTimeout (
  function () {

    var CallbackManagerBuilder = function () {
      var prepend = 'unity-webapps-chromium-api';
      var callbacks = {};
      return {
        store: function (callback) {
          var gensym = function() { return prepend + Math.random(); };
          var id = gensym();
          while (undefined != callbacks[id]) {
            id = gensym();
          }
          callbacks[id] = callback;
          return id;
        }
        ,
        get: function (id) {
          return callbacks[id];
        }
      };
    };
    var callbackmanager = CallbackManagerBuilder();

   /**
    * Acknowledge that the API has been fully injected
    */
    var sendApiCreatedAcknowledge = function () {
      var e = document.createEvent ("Events");
      e.initEvent ("unity-webapps-api-ready", false, false);
      document.dispatchEvent (e);
    };

    /**
     * 
     * 
     */
    function sendToApi (type, data) {
      var callback = null;
      var d = document.createElement ("textarea");
      var e = document.createEvent ("Events");
      d.style.cssText = "display:none;";

      var isIterableObject = function(obj) {
        if (obj === undefined || obj === null) {
          return false;
        }
        var t = typeof(obj);
        var types = {'string': 0, 'function': 0, 'boolean': 0, 'number': 0, 'undefined': 0};
        return types[t] === undefined;
      };

      function transformToIdIfNecessary(obj) {
        var ret = obj;
        if (obj instanceof Function) {
          var id = callbackmanager.store(obj);
          ret = {callbackid: id};
        }
        return ret;
      }
      // map function callback (not serializable to a different world)
      //  to ids
      function transformCallbacksToIds (obj) {
        if ( ! isIterableObject(obj)) {
          return transformToIdIfNecessary (obj);
        }
        var ret = (obj instanceof Array) ? [] : {};
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            if (obj[key] instanceof Function) {
              var id = callbackmanager.store(obj[key]);
              ret[key] = {callbackid: id};
            }
            else if (isIterableObject (obj[key])) {
              ret[key] = transformCallbacksToIds (obj[key]);
            }
            else {
              ret[key] = obj[key];
            }
          }
        }
        return ret;
      };

      // TODO: assumes some structure, does not play well w/ arrays
      // actually converts: [1,2,3] -> {'0': 1, '1': 2, '2': 3}
      d.value = JSON.stringify (
        data.map (
          function (datum) {
            return transformCallbacksToIds (datum);
          }
        )
      );
      d.addEventListener ("unity-webapps-chromium-api-com-link-ack"
                          ,
                          function() {
                            if (callback) callback (d.value);
                            d.parentNode.removeChild (d);
                          }
                          , true);

      d.setAttribute ("data-eventType", type);
      document.body.appendChild (d);
      e.initEvent ("unity-webapps-chromium-api-com-link", false, true);
      d.dispatchEvent (e);
    };

    document.addEventListener ("unity-webapps-chromium-api-com-link-callback-called"
                               ,
                               function(event) {
                                 var from = event.target;
                                 if (from) {
                                   if (from.value) {
                                     var callback = callbackmanager.get(from.value);
                                     if (callback) {
                                       callback ();
                                     }
                                   }
                                   var ret = document.createEvent('Events');
                                   ret.initEvent('unity-webapps-chromium-api-com-link-callback-called-ack', true, false);
                                   from.dispatchEvent(ret);
                                 }
                               }
                               , true);

    var api = UnityWebappsApiPageProxyBuilder(sendToApi);

    UnityWebappsWebkitNotificationApiPageProxyBuilder(sendToApi, window);

    function unity() {
    }
    unity.prototype = {
      __proto__: window.external,
      getUnityObject: function (version) {
        console.log ('Proxy: getUnityObject called with version ' + version);
        if (version === 1)
          return api;
        throw new Error("incorrect version");
      }
    };
    window.external = new unity();

    sendApiCreatedAcknowledge();
  }
, 0);
