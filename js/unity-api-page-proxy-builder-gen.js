var UnityWebappsApiPageProxyBuilder = function(backend) {
  
  var dummy = true;
  var unity = { context: dummy, contextReady: dummy };
  var uwa = { ContextActionCallbackType: null };

  var CallbackManager = {
    makeCallback: function (dumd, func) {
      return func;
    }
  };

  function checkString(str, allowUndef) {
    if (allowUndef && str == undefined) {
      return;
        }
    if (!str || typeof(str) !== 'string') {
      throw new TypeError("incorrect argument");
    }
  }

  var findName = function (func, prefix, obj) {
    
    if (!prefix) {
      return findName(func, 'Unity.', api);
    }
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      if (typeof(keys[i]) !== 'string') {
        continue;
      }
      var descr = Object.getOwnPropertyDescriptor(obj, keys[i]);
      if (descr.value === func) {
        return prefix + keys[i];
      }
      if (descr.value instanceof Object) {
        var res = findName(func, prefix + keys[i] + '.', obj[keys[i]]);
        if (res)
          return res;
      }
      if (obj.__lookupGetter__(keys[i]) === func) {
        return prefix + keys[i];
      }
      if (obj.__lookupSetter__(keys[i]) === func) {
        return prefix + keys[i];
      }
    }
    return null;

  };


  var stringify = function (obj) {
    
    if (obj === undefined)
      return obj;
    if (obj === null)
      return obj;
    if (typeof(obj) == 'string')
      return obj;
    if (typeof(obj) == 'number')
      return obj;
    if (typeof(obj) == 'function')
      return String(obj);
    var dump = {};
    for (var i in obj) {
      if (obj.hasOwnProperty(i))
        dump[i] = stringify(obj[i]);
    }
    return dump;

  };


  var stringifyArgs = function (obj) {
    
    var args = [];
    for (var i = 0; i < obj.length; i++) {
      args.push(stringify(obj[i]));
    }
    var res = JSON.stringify(args);
    return res.substr(1, res.length - 2);
  };

  var createArgumentsSanitaizer = function (func, argsDesc, callback) {
    
    return function () {
      var realArgs = arguments;
      var name = findName(arguments.callee);

      var k = 0;
      function argumentSanitaizer(desc, arg) {
        if (!desc) {
          throw new InternalError("argument description is null");
        }
        if (desc.dummy) {
          k--;
          return null;
        }
        if (desc.array) {
          if (!(desc.array instanceof Object) || !(desc.array.element instanceof Object)) {
            throw new InternalError("invalid argument description");
          }
          
          try {
            for (var j = 0; j < arg.length; j++) {
              argumentSanitaizer(desc.array.element, arg[j]);
            }
          } catch (x) {
            throw new TypeError("incorrect argument");
          }

          return arg;
        }
        if (desc.obj) {
          if (!(desc.obj instanceof Object)) {
            throw new InternalError("invalid argument description");
          }
          var res = {}, i;
          for (i in desc.obj) {
            if (desc.obj.hasOwnProperty(i)) {
              res[i] = argumentSanitaizer(desc.obj[i], arg[i]);
            }
          }
          return res;
        }
        if (desc.str) {
          if (desc.allowNull && !arg) {
            return null;
          }
          checkString(arg, false);
          return arg;
        }
        if (desc.number) {
          if (typeof(arg) !== 'number' && typeof(arg) !== 'boolean')
            throw new TypeError("incorrect argument");
          return arg;
        }
        if (!desc.type) {
          throw new InternalError("argument description miss required parameter");
        }
        if ((arg instanceof desc.type) || (desc.type === Function && ((typeof arg) === 'function'))
            || (arg === null && desc.allowNull)) {
          if (desc.type === Function) {
            if (!arg) {
              return null;
            }

            var id;
            if (desc.argAsCallbackId !== undefined) {
              id = realArgs[desc.argAsCallbackId];
            }
            return CallbackManager.makeCallback(uwa.ContextActionCallbackType,
                                                function (context, user_data) {
                                                  arg();
                                                }, name, id);
          }
          return arg;
        } else {
          throw new TypeError("incorrect argument");
        }
        throw new InternalError("unreacheable");
      }
      var args = [unity.context], i;
      for (i = 0; i < argsDesc.length; i++) {
        if (k >= realArgs.length && k > 0 && !argsDesc[i].dummy) {
          throw new Error("not enough arguments");
        }
        var value = argumentSanitaizer(argsDesc[i], realArgs[k]);
        k++;
        
        if (argsDesc[i].obj) {
          args = args.concat(value);
        } else {
          args.push(value);
        }
      }

      if (k < realArgs.length) {
        throw new Error("too much arguments");
      }

      if (callback)
        callback.apply(uwa, args);
      if (func)
        return Function.apply.apply(func, [uwa, args]);

      return null;
    };

  };
  var api = {
    init: function(props) {
      checkString(props.name, false);
      checkString(props.iconUrl, true);
      checkString(props.domain, true);
      checkString(props.login, true);
      checkString(props.mimeTypes, true);
      checkString(props.homepage, true);
      if (props.homepage && !/^(http|https|file):\/\//.test(props.homepage)) {
        throw new TypeError("incorrect argument");
      }
      backend("init", [props]);
    }
    ,
    acceptData: createArgumentsSanitaizer(null,
                                          [{ array: { element: { str: true } } }, { type: Function, js: true }],
                                          function (context, mimeTypes, callback) {
                                            backend('acceptData', [mimeTypes, callback]);
                                          })
    ,
    addAction: createArgumentsSanitaizer(null,
                                         [{ str: true }, { type: Function, argAsCallbackId: 0 }],
                                         function (context, name, callback) {
                                           backend('addAction', [name, callback]);
                                         })
    ,
    clearAction: createArgumentsSanitaizer(null,
					   [{ str: true }]
                                           , function (context, name) {
                                             backend('clearAction', [name]);
                                           })
    ,
    clearActions: createArgumentsSanitaizer(null,
					    [],
                                            function (context) {
                                              backend('clearActions', []);
                                            })
    ,
    MediaPlayer: {
      init: createArgumentsSanitaizer(null,
                                      [{ str: true }],
                                      function (context) {
                                        backend('MediaPlayer.init', []);
                                      })
      ,
      onPlayPause: createArgumentsSanitaizer(null,
                                             [{ type: Function, allowNull: true }, { dummy: true }],
                                             function (context, callback) {
                                               backend('MediaPlayer.onPlayPause', [callback]);
                                             }
                                            )
      ,
      onPrevious: createArgumentsSanitaizer(null,
                                            [{ type: Function, allowNull: true }, { dummy: true }],
                                           function (context, callback) {
                                             backend('MediaPlayer.onPrevious', [callback]);
                                           })
      ,
      onNext: createArgumentsSanitaizer(null,
                                        [{ type: Function, allowNull: true }, { dummy: true }],
                                        function (context, callback) {
                                          backend('MediaPlayer.onNext', [callback]);
                                        }
                                       )
      ,
      setTrack: createArgumentsSanitaizer(null,
                                          [{ obj: { artist: { str: true, place: 0, allowNull: true },
                                                    album: { str: true, place: 1, allowNull: true },
                                                    title: { str: true, place: 2 },
                                                    artLocation: { str: true, place: 3, allowNull: true } } }],
                                         function (context, trackinfos) {
                                           backend('MediaPlayer.setTrack', [trackinfos]);
                                         })
      ,
      setCanGoNext: createArgumentsSanitaizer(null,
                                              [{ number: true }],
                                              function (context, v) {
                                                backend('MediaPlayer.setCanGoNext', [v]);
                                              }
                                             )
      ,
      setCanGoPrevious: createArgumentsSanitaizer(null,
                                                  [{ number: true }],
                                                  function (context, v) {
                                                    backend('MediaPlayer.setCanGoPrevous', [v]);
                                                  }
                                                 )
      ,
      setCanPlay: createArgumentsSanitaizer(null,
                                            [{ number: true }],
                                            function (context, v) { backend('MediaPlayer.setCanPlay', [v]); }
                                           )
      ,
      setCanPause: createArgumentsSanitaizer(null,
                                             [{ number: true }],
                                             function (context, v) { backend('MediaPlayer.setCanPause', [v]); }
                                            )
      ,
      setPlaybackState: createArgumentsSanitaizer(null,
                                                  [{ number: true }],
                                                  function (context, v) { backend('MediaPlayer.setPlaybackState', [v]); }
                                                 )
      ,
      getPlaybackState: createArgumentsSanitaizer(null
                                                  , [{ type: Function }]
                                                  , function (context, callback) {
                                                    backend('MediaPlayer.getPlaybackState', [callback]);
                                                  }
                                                 )
      ,
      PlaybackState: {PLAYING: 0, PAUSED:1}
    },

    Notification: {
      showNotification: createArgumentsSanitaizer(null,
                                                  [{ str: true }, { str: true }, { str: true, allowNull: true }],
                                                  function (context, title, name, dummy) {
                                                    backend('Notification.showNotification', [title, name, dummy]);
                                                  }
                                                 )
    },

    Launcher: {
      setCount: createArgumentsSanitaizer(null,
                                          [{ number: true }],
                                          function (context, count) {
                                            backend('Launcher.setCount', [count]);
                                          }
                                         )
      ,
      clearCount: createArgumentsSanitaizer(null,
                                            [],
                                            function (context) {
                                              backend('Launcher.clearCount', []);
                                            }),
      setProgress: createArgumentsSanitaizer(null,
                                             [{ number: true }],
                                             function (context, progress) {
                                               backend('Launcher.setProgress', [progress]);
                                             }
                                            )
      ,
      clearProgress: createArgumentsSanitaizer(null,
                                               [],
                                              function (context) {
                                                backend('Launcher.clearProgress', []);
                                              }
                                              )
      ,
      setUrgent: createArgumentsSanitaizer(null,
                                           [],
                                           function (context) {
                                             backend('Launcher.setUrgent', []);
                                           }
                                          )
      ,
      addAction: createArgumentsSanitaizer(null,
                                           [{ str: true }, { type: Function, argAsCallbackId: 0 }, { dummy: true }],
                                           function (context, name, callback, dummy) {
                                             backend('Launcher.addAction', [name, callback, dummy]);
                                           }
                                          )
      ,
      removeAction: createArgumentsSanitaizer(null,
                                              [{ str: true }],
                                              function (context, name) {
                                                backend('Launcher.removeAction', [name]);
                                              }
                                             )
      ,
      removeActions: createArgumentsSanitaizer(null,
                                               [],
                                               function (context) {
                                                 backend('Launcher.removeActions', []);
                                               }
                                              )
    },
    MessagingIndicator: {
      addAction: createArgumentsSanitaizer(null,
                                           [{ str: true }, { type: Function, argAsCallbackId: 0 }, { dummy: true }],
                                           function (context, name, callback, dummy) {
                                             backend('MessagingIndicator.addAction', [name, callback, dummy]);
                                           }
                                          )
      ,
      showIndicator: function(name, properties) {
        backend('MessagingIndicator.showIndicator', [name, properties]);
      }
      ,
      clearIndicator: createArgumentsSanitaizer(null, [{ str: true }], function(context, name) { backend('MessagingIndicator.clearIndicator', [name]); }),
      clearIndicators: createArgumentsSanitaizer(null, [], function (context) { backend('MessagingIndicator.clearIndicators', []); })
    },

    toDataURL: function (uri, callback, sx, sy, sw, sh) {
      backend('toDataURL', [uri, callback, sx, sy, sw, sh]);
    }
  };
  return api;
};

